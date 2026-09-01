import { useState } from 'react'
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
}

export default function CheckoutScreen({ items, onItemsChange, onBack, onConfirm, onRequireAuth }: CheckoutScreenProps) {
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [message, setMessage] = useState('')
  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const formatPrice = (value: number) => `$${value.toLocaleString('es-CO')}`

  const startPayment = async () => {
    const { data } = await supabase.auth.getUser()
    if (!data.user) {
      setAuthOpen(true)
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

  return (
    <>
      <AuthRequiredModal open={authOpen} onClose={() => setAuthOpen(false)} onRequireAuth={(mode) => onRequireAuth?.(mode)} />
      <PaymentModal
        open={paymentOpen}
        title="Finalizar pedido"
        subtitle="Completa tus datos para continuar con el pago seguro."
        confirmLabel="Pagar pedido"
        amount={total}
        onClose={() => setPaymentOpen(false)}
        onConfirm={confirmPayment}
      />
      <div className="h-full overflow-y-auto" style={{ background: '#F5EEE6' }}>
        <header style={{ background: 'linear-gradient(180deg, #1A3F28 0%, #205134 100%)', padding: '20px 18px 28px', borderRadius: '0 0 30px 30px', color: '#F5EEE6' }}>
          <button type="button" onClick={onBack} style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: 10, padding: '8px 12px', cursor: 'pointer', fontSize: 18 }}>←</button>
          <p style={{ color: '#6BAA3D', fontSize: 13, fontWeight: 700, margin: '18px 0 2px' }}>MERCADOS CAMPESINOS</p>
          <h1 style={{ fontFamily: "'Poppins', sans-serif", fontSize: 24, margin: 0 }}>Mi carrito</h1>
        </header>

        <main style={{ padding: '20px 18px 100px' }}>
          {items.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid #E8DED0', borderRadius: 18, padding: 28, textAlign: 'center' }}>
              <div style={{ fontSize: 42, marginBottom: 10 }}>🛒</div>
              <h2 style={{ color: '#205134', fontFamily: "'Poppins', sans-serif", fontSize: 19, margin: '0 0 6px' }}>Tu carrito está vacío</h2>
              <p style={{ color: '#666', fontSize: 14, margin: '0 0 18px' }}>Agrega productos o experiencias desde el marketplace.</p>
              <button type="button" onClick={onBack} style={{ background: '#205134', color: '#fff', border: 'none', borderRadius: 12, padding: '11px 18px', fontWeight: 700, cursor: 'pointer' }}>Volver al marketplace</button>
            </div>
          ) : (
            <>
              <p style={{ color: '#666', fontSize: 13, margin: '0 0 12px' }}>{items.reduce((sum, item) => sum + item.quantity, 0)} artículos seleccionados</p>
              <button type="button" onClick={onBack} style={{ alignSelf: 'flex-start', background: 'transparent', border: 'none', color: '#205134', padding: '0 0 12px', fontWeight: 800, cursor: 'pointer' }}>+ Seguir comprando</button>
              <div className="checkout-layout">
                <div style={{ display: 'grid', gap: 12 }}>
                  {items.map((item) => (
                  <article key={item.product.id} style={{ display: 'grid', gridTemplateColumns: '74px minmax(0, 1fr) auto', gap: 12, alignItems: 'start', background: '#fff', border: '1px solid #E8DED0', borderRadius: 16, padding: 10 }}>
                    <img src={item.product.img} alt={item.product.title} style={{ width: 74, height: 74, objectFit: 'cover', borderRadius: 12 }} />
                    <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
                      <h2 style={{ color: '#205134', fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 16, lineHeight: 1.2, margin: 0 }}>{item.product.title}</h2>
                      <span style={{ display: 'inline-block', color: item.product.type === 'experiencia' ? '#9B4728' : '#205134', background: item.product.type === 'experiencia' ? '#FFF3E8' : '#EAF3EC', borderRadius: 20, padding: '3px 8px', fontSize: 9, fontWeight: 700 }}>{item.product.type === 'experiencia' ? 'Experiencia' : 'Producto'}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button type="button" aria-label={`Quitar una unidad de ${item.product.title}`} onClick={() => onItemsChange(item.quantity === 1 ? items.filter((current) => current.product.id !== item.product.id) : items.map((current) => current.product.id === item.product.id ? { ...current, quantity: current.quantity - 1 } : current))} style={{ width: 24, height: 24, border: 'none', borderRadius: '50%', background: '#EAF3EC', color: '#205134', cursor: 'pointer', fontWeight: 800 }}>−</button>
                        <span style={{ minWidth: 14, textAlign: 'center', color: '#205134', fontWeight: 800 }}>{item.quantity}</span>
                        <button type="button" aria-label={`Agregar una unidad de ${item.product.title}`} onClick={() => onItemsChange(items.map((current) => current.product.id === item.product.id ? { ...current, quantity: current.quantity + 1 } : current))} style={{ width: 24, height: 24, border: 'none', borderRadius: '50%', background: '#205134', color: '#fff', cursor: 'pointer', fontWeight: 800 }}>+</button>
                      </div>
                    </div>
                    <div style={{ color: '#9B4728', fontFamily: "'Poppins', sans-serif", fontSize: 16, fontWeight: 700, whiteSpace: 'nowrap', paddingTop: 2 }}>{formatPrice(item.product.price * item.quantity)} <span style={{ color: '#666', fontSize: 11, fontWeight: 500 }}></span></div>
                  </article>
                  ))}   
                </div>
              <section style={{ background: '#fff', border: '1px solid #E8DED0', borderRadius: 16, padding: 20, alignSelf: 'start' }}>
                <h2 style={{ color: '#205134', fontFamily: "'Poppins', sans-serif", fontSize: 18, margin: '0 0 24px' }}>Resumen</h2>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#3D2B1A', fontSize: 14, marginBottom: 16 }}>
                  <span>Subtotal ({items.reduce((sum, item) => sum + item.quantity, 0)} items)</span>
                  <span>{formatPrice(total)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666', fontSize: 13, marginBottom: 8 }}><span>Envío</span><span>A calcular</span></div>
                <div style={{ height: 1, background: '#E8DED0', margin: '22px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#205134', fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 19 }}><span>Total</span><span>{formatPrice(total)}</span></div>
                {message && <p style={{ color: '#205134', fontWeight: 700, fontSize: 13 }}>{message}</p>}
                <button type="button" onClick={startPayment} style={{ width: '100%', marginTop: 16, padding: 14, border: 'none', borderRadius: 14, background: '#205134', color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>Proceder al pago</button>
                <p style={{ textAlign: 'center', color: '#86A493', fontSize: 12, margin: '16px 0 0' }}>Deberás iniciar sesión para pagar</p>
              </section>
              </div>
            </>
          )}
        </main>
      </div>
    </>
  )
}
