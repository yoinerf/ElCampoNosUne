import { useState, useEffect } from 'react'
import PaymentModal from '../components/PaymentModal'
import type { CartItem } from './MarketplaceScreen'
import { supabase } from '../lib/supabase'
import AuthRequiredModal from '../components/AuthRequiredModal'

interface CheckoutScreenProps {
  items: CartItem[]
  onItemsChange: (items: CartItem[]) => void
  onBack: () => void
  onConfirm: (items: CartItem[]) => Promise<boolean>
  onRequireAuth?: (mode: 'login' | 'auth') => void
  onViewProduct?: (productId: string) => void
}

export default function CheckoutScreen({ items, onItemsChange, onBack, onConfirm, onRequireAuth, onViewProduct }: CheckoutScreenProps) {
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [isLogged, setIsLogged] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setIsLogged(!!data.user)
    })
  }, [])

  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const shipping = items.length > 0 ? 9000 : 0
  const formatPrice = (value: number) => `$${value.toLocaleString('es-CO')} COP`

  const startPayment = async () => {
    const { data } = await supabase.auth.getUser()
    if (!data.user) {
      onRequireAuth?.('auth')
      return
    }
    setPaymentOpen(true)
  }

  const confirmPayment = async () => {
    const confirmed = await onConfirm(items)
    setPaymentOpen(false)
    setMessage(confirmed ? 'Pedido confirmado correctamente' : 'No pudimos confirmar el pedido')
    if (confirmed) onItemsChange([])
    return confirmed
  }

  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      onItemsChange(items.filter((item) => item.product.id !== id))
    } else {
      onItemsChange(items.map((item) => item.product.id === id ? { ...item, quantity: newQuantity } : item))
    }
  }

  return (
    <>
      <AuthRequiredModal open={authOpen} onClose={() => setAuthOpen(false)} onRequireAuth={(mode) => onRequireAuth?.(mode)} />
      <PaymentModal
        open={paymentOpen}
        title="Finalizar pedido"
        subtitle="Completa tus datos para continuar con el pago seguro."
        confirmLabel="Pagar pedido"
        amount={total + shipping}
        onClose={() => setPaymentOpen(false)}
        onConfirm={confirmPayment}
      />

      <div className="h-full overflow-y-auto" style={{ background: '#F9F6F0', fontFamily: "'Nunito Sans', sans-serif" }}>

        {/* Banner superior si no está logueado */}
        {isLogged === false && items.length > 0 && (
          <div style={{ background: '#D06050', color: '#fff', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, fontWeight: 600 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>🛡️</span> Necesitas una cuenta para completar tu compra
            </div>
            <button type="button" onClick={() => onRequireAuth?.('auth')} style={{ background: 'none', border: 'none', color: '#fff', fontWeight: 800, textDecoration: 'underline', cursor: 'pointer' }}>
              Crear cuenta ahora
            </button>
          </div>
        )}

        <main className="max-w-[1300px] mx-auto px-6 md:px-12 py-8">
          {items.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid #E8DED0', borderRadius: 18, padding: '48px 24px', textAlign: 'center', maxWidth: 480, margin: '40px auto', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>🛒</div>
              <h2 style={{ color: '#205134', fontFamily: "'Poppins', sans-serif", fontSize: 24, margin: '0 0 10px', fontWeight: 700 }}>Tu carrito está vacío</h2>
              <p style={{ color: '#666', fontSize: 15, margin: '0 0 28px', lineHeight: 1.5 }}>Agrega productos o experiencias desde el marketplace para continuar.</p>
              <button
                type="button"
                onClick={onBack}
                style={{
                  background: '#205134',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 12,
                  padding: '12px 28px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: 15,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                ← Volver al marketplace
              </button>
            </div>
          ) : (
            <>
              {/* Botón superior de volver */}
              <button
                type="button"
                onClick={onBack}
                className="mb-6 flex items-center gap-2 text-[#205134] font-bold text-sm bg-transparent border-none cursor-pointer hover:opacity-80 p-0 transition-opacity"
              >
                ← Seguir explorando el campo
              </button>

              {/* Encabezado */}
              <div className="flex justify-between items-end mb-8">
                <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, color: '#3D2B1A', margin: 0, fontWeight: 500 }}>
                  Tu Carrito <span style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 18, color: '#666', fontWeight: 400 }}>({items.reduce((sum, item) => sum + item.quantity, 0)} items)</span>
                </h1>
                <button
                  type="button"
                  onClick={() => onItemsChange([])}
                  style={{ background: 'none', border: 'none', color: '#D06050', fontSize: 14, textDecoration: 'underline', cursor: 'pointer' }}
                >
                  Limpiar carrito
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12 xl:gap-16">
                {/* Columna Izquierda: Lista de productos */}
                <div>
                  <div className="flex flex-col gap-4">
                    {items.map((item) => (
                      <article key={item.product.id} className="bg-white rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 border border-[#E8DED0]">
                        <img
                          src={item.product.img}
                          alt={item.product.title}
                          className="w-20 h-20 shrink-0 object-cover rounded-xl bg-[#F5EEE6] cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => onViewProduct?.(item.product.id)}
                        />

                        <div className="flex-1 min-w-0 text-center sm:text-left w-full sm:w-auto">
                          <div className="text-[10px] font-bold text-[#205134] uppercase tracking-wider mb-1">
                            {item.product.producer}
                          </div>
                          <h3
                            className="font-['Poppins'] font-bold text-[#1C3A14] text-base m-0 leading-tight truncate cursor-pointer hover:text-[#9B4728] transition-colors"
                            onClick={() => onViewProduct?.(item.product.id)}
                          >
                            {item.product.title}
                          </h3>
                          <div className="text-[#888] text-xs mt-1">
                            {formatPrice(item.product.price)}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto justify-between sm:justify-end mt-4 sm:mt-0 shrink-0">
                          <div className="flex items-center bg-[#F5EEE6] rounded-full h-9 px-1 w-[104px] shrink-0 justify-between">
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                              className="w-7 h-7 flex items-center justify-center rounded-full bg-transparent border-none text-[#205134] font-bold text-base cursor-pointer hover:bg-[#E8DED0]"
                            >
                              -
                            </button>
                            <span className="w-8 text-center font-bold text-sm text-[#205134]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              className="w-7 h-7 flex items-center justify-center rounded-full bg-transparent border-none text-[#205134] font-bold text-base cursor-pointer hover:bg-[#E8DED0]"
                            >
                              +
                            </button>
                          </div>

                          <div className="font-['Poppins'] font-bold text-[#9B4728] text-base w-[135px] shrink-0 text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {formatPrice(item.product.price * item.quantity)}
                          </div>

                          <button
                            onClick={() => updateQuantity(item.product.id, 0)}
                            className="w-8 h-8 shrink-0 flex items-center justify-center border-none bg-transparent text-[#D06050] cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
                            title="Eliminar"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                {/* Columna Derecha: Resumen */}
                <div>
                  <div className="bg-white rounded-2xl p-6 md:p-8 border border-[#E8DED0] shadow-sm sticky top-6">
                    <h2 className="font-['Playfair_Display',serif] text-2xl text-[#1C3A14] m-0 mb-6 font-medium">Resumen del pedido</h2>

                    <div className="flex justify-between text-sm text-[#555] mb-4">
                      <span>Subtotal productos</span>
                      <span className="font-bold text-[#1C3A14]">{formatPrice(total)}</span>
                    </div>

                    <div className="flex justify-between text-sm text-[#555] mb-6">
                      <span>Envío estimado</span>
                      <span className="font-bold text-[#205134]">{formatPrice(shipping)}</span>
                    </div>

                    <div className="h-px bg-[#E8DED0] w-full mb-6"></div>

                    <div className="flex justify-between items-center mb-8">
                      <span className="font-['Poppins'] text-lg font-bold text-[#1C3A14]">Total estimado</span>
                      <span className="font-['Poppins'] text-2xl font-bold text-[#D06050]">{formatPrice(total + shipping)}</span>
                    </div>

                    <button
                      onClick={startPayment}
                      className="w-full bg-[#D06050] hover:bg-[#ba5546] text-white font-bold py-3.5 rounded-xl border-none cursor-pointer transition-colors text-sm mb-4"
                    >
                      {isLogged ? 'Proceder al pago' : 'Crear cuenta para comprar'}
                    </button>

                    {isLogged === false && (
                      <div className="text-center text-xs text-[#666] mb-8">
                        ¿Ya tienes cuenta? <button onClick={() => onRequireAuth?.('login')} className="bg-transparent border-none font-bold text-[#1C3A14] cursor-pointer underline">Iniciar sesión</button>
                      </div>
                    )}

                    <div className="h-px bg-[#E8DED0] w-full mb-6 mt-4"></div>

                    <div className="flex gap-3 text-xs text-[#666] leading-relaxed">
                      <span className="text-[#205134] text-lg">🔒</span>
                      <p className="m-0">Compra respaldada por nuestra política de comercio justo y directo con el agricultor.</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </>
  )
}

