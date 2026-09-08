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

export type PaymentMethodType = 'contraentrega' | 'wompi'

export interface ShippingAddressForm {
  fullName: string
  phone: string
  department: string
  municipality: string
  address: string
  deliveryNotes: string
}

export default function CheckoutScreen({ items, onItemsChange, onBack, onConfirm, onRequireAuth, onViewProduct }: CheckoutScreenProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loadingPayment, setLoadingPayment] = useState(false)
  const [isLogged, setIsLogged] = useState<boolean | null>(null)
  const [userEmail, setUserEmail] = useState<string>('')
  const [userId, setUserId] = useState<string>('')

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('contraentrega')
  const [addressForm, setAddressForm] = useState<ShippingAddressForm>({
    fullName: '',
    phone: '',
    department: 'Cundinamarca',
    municipality: 'Bogotá',
    address: '',
    deliveryNotes: '',
  })

  // Cargar usuario y perfil de Supabase si existe
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setIsLogged(true)
        setUserEmail(data.user.email || '')
        setUserId(data.user.id)

        // Cargar perfil para autodiligenciar formulario de envío
        supabase
          .from('profiles')
          .select('first_name, last_name, phone, department, municipality')
          .eq('id', data.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile) {
              setAddressForm((prev) => ({
                ...prev,
                fullName: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
                phone: profile.phone || prev.phone,
                department: profile.department || prev.department,
                municipality: profile.municipality || prev.municipality,
              }))
            }
          })
      } else {
        setIsLogged(false)
      }
    })
  }, [])

  // Cálculos dinámicos
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const shippingFee = items.length > 0 ? 9000 : 0
  const wompiFee = paymentMethod === 'wompi' ? Math.round((subtotal + shippingFee) * 0.029) : 0
  const grandTotal = subtotal + shippingFee + wompiFee

  const formatPrice = (value: number) => `$${value.toLocaleString('es-CO')} COP`

  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      onItemsChange(items.filter((item) => item.product.id !== id))
    } else {
      onItemsChange(items.map((item) => item.product.id === id ? { ...item, quantity: newQuantity } : item))
    }
  }

  // Avanzar entre pasos o Finalizar
  const handleMainAction = async () => {
    if (isLogged === false) {
      onRequireAuth?.('auth')
      return
    }

    setErrorMessage('')

    if (currentStep === 1) {
      // Paso 1 -> Avanzar a datos de entrega
      setCurrentStep(2)
    } else if (currentStep === 2) {
      // Paso 2 -> Validar campos de entrega antes de avanzar a método de pago
      if (!addressForm.fullName.trim() || !addressForm.phone.trim() || !addressForm.address.trim()) {
        setErrorMessage('Por favor completa los campos obligatorios: Nombre, Teléfono y Dirección de entrega.')
        return
      }
      setCurrentStep(3)
    } else if (currentStep === 3) {
      // Paso 3 -> Finalizar pedido / Proceder al pago
      await executePaymentFlow()
    }
  }

  const executePaymentFlow = async () => {
    setLoadingPayment(true)
    setErrorMessage('')
    setMessage('')

    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'

    try {
      const checkoutRes = await fetch(`${backendUrl}/api/payments/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          payment_method: paymentMethod,
          customer_email: userEmail,
          customer_name: addressForm.fullName,
          customer_phone: addressForm.phone,
          shipping_address: addressForm,
          shipping_fee: shippingFee,
          items: items.map(({ product, quantity }) => ({
            id: product.id,
            type: product.type || 'producto',
            quantity,
            price: product.price,
          })),
        }),
      })

      const checkoutData = await checkoutRes.json()

      if (!checkoutRes.ok || !checkoutData.success) {
        const errorText = checkoutData.errors?.join(' ') || checkoutData.message || 'No se pudo procesar la orden en el servidor'
        setErrorMessage(`❌ Error en la orden: ${errorText}`)
        setLoadingPayment(false)
        return
      }

      if (paymentMethod === 'contraentrega') {
        setMessage('🎉 ¡Pedido contraentrega registrado exitosamente! El campesino/vendedor preparará tu envío.')
        onItemsChange([])
        setLoadingPayment(false)
      } else if (paymentMethod === 'wompi') {
        setPaymentOpen(true)
        setLoadingPayment(false)
      }
    } catch (err: any) {
      console.error('Error en el flujo de pagos:', err)
      setErrorMessage(`❌ Error al conectar con el backend de pagos (${backendUrl}).`)
      setLoadingPayment(false)
    }
  }

  const confirmWompiPayment = async () => {
    const confirmed = await onConfirm(items)
    setPaymentOpen(false)
    if (confirmed) {
      setMessage('🎉 ¡Pago por Wompi confirmado exitosamente! Tu compra fue registrada.')
      onItemsChange([])
    } else {
      setErrorMessage('No pudimos confirmar la transacción con Wompi.')
    }
    return confirmed
  }

  return (
    <>
      <AuthRequiredModal open={authOpen} onClose={() => setAuthOpen(false)} onRequireAuth={(mode) => onRequireAuth?.(mode)} />
      
      <PaymentModal
        open={paymentOpen}
        title="Finalizar pago con Wompi"
        subtitle="Confirma la transacción segura de Wompi Bancolombia."
        confirmLabel="Pagar con Wompi"
        amount={grandTotal}
        onClose={() => setPaymentOpen(false)}
        onConfirm={confirmWompiPayment}
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
          {items.length === 0 && !message ? (
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
          ) : message ? (
            /* Pantalla de Éxito */
            <div style={{ background: '#fff', border: '1px solid #E8DED0', borderRadius: 18, padding: '48px 24px', textAlign: 'center', maxWidth: 540, margin: '40px auto', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: 60, marginBottom: 16 }}>✅</div>
              <h2 style={{ color: '#205134', fontFamily: "'Poppins', sans-serif", fontSize: 26, margin: '0 0 12px', fontWeight: 700 }}>¡Gracias por tu compra!</h2>
              <p style={{ color: '#444', fontSize: 16, margin: '0 0 28px', lineHeight: 1.6 }}>{message}</p>
              <button
                type="button"
                onClick={onBack}
                style={{
                  background: '#205134',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 12,
                  padding: '14px 32px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: 15,
                }}
              >
                Seguir explorando la tienda
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

              {/* Indicador de Pasos / Stepper */}
              <div className="bg-white rounded-2xl p-4 mb-8 border border-[#E8DED0] flex flex-wrap items-center justify-between gap-4">
                <div
                  onClick={() => setCurrentStep(1)}
                  className={`flex items-center gap-2 text-sm font-bold cursor-pointer ${currentStep === 1 ? 'text-[#205134]' : 'text-[#888]'}`}
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${currentStep === 1 ? 'bg-[#205134] text-white' : 'bg-[#E8DED0] text-[#555]'}`}>1</span>
                  <span>1. Carrito de Compras</span>
                </div>

                <span className="text-[#CCC] hidden sm:inline">›</span>

                <div
                  onClick={() => currentStep > 1 && setCurrentStep(2)}
                  className={`flex items-center gap-2 text-sm font-bold ${currentStep >= 2 ? 'text-[#205134] cursor-pointer' : 'text-[#AAA] cursor-not-allowed'}`}
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${currentStep === 2 ? 'bg-[#205134] text-white' : currentStep > 2 ? 'bg-[#205134] text-white' : 'bg-[#E8DED0] text-[#555]'}`}>2</span>
                  <span>2. Datos de Entrega</span>
                </div>

                <span className="text-[#CCC] hidden sm:inline">›</span>

                <div
                  onClick={() => currentStep > 2 && setCurrentStep(3)}
                  className={`flex items-center gap-2 text-sm font-bold ${currentStep === 3 ? 'text-[#205134] cursor-pointer' : 'text-[#AAA] cursor-not-allowed'}`}
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${currentStep === 3 ? 'bg-[#205134] text-white' : 'bg-[#E8DED0] text-[#555]'}`}>3</span>
                  <span>3. Método de Pago</span>
                </div>
              </div>

              {/* Banner de mensaje de error si aplica */}
              {errorMessage && (
                <div className="bg-[#FDEDED] text-[#D06050] border border-[#F5C2C2] p-4 rounded-xl mb-6 text-sm font-bold flex items-center gap-2">
                  ⚠️ {errorMessage}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12 xl:gap-16">
                
                {/* Columna Izquierda: Contenido del paso actual */}
                <div>
                  
                  {/* PASO 1: ÚNICAMENTE Carrito de productos */}
                  {currentStep === 1 && (
                    <div className="flex flex-col gap-6">
                      <div className="flex justify-between items-center mb-2">
                        <h2 className="font-['Playfair_Display',serif] text-2xl text-[#1C3A14] m-0 font-medium">
                          1. Productos en tu carrito ({items.reduce((sum, item) => sum + item.quantity, 0)})
                        </h2>
                        <button
                          type="button"
                          onClick={() => onItemsChange([])}
                          className="bg-transparent border-none text-[#D06050] text-xs font-bold underline cursor-pointer"
                        >
                          Limpiar carrito
                        </button>
                      </div>

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
                                ✕
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* PASO 2: ÚNICAMENTE Formulario de Dirección de Entrega */}
                  {currentStep === 2 && (
                    <div className="bg-white rounded-2xl p-6 md:p-8 border border-[#E8DED0]">
                      <div className="flex justify-between items-center mb-6">
                        <h2 className="font-['Playfair_Display',serif] text-2xl text-[#1C3A14] m-0 font-medium">
                          2. Datos de entrega y envío
                        </h2>
                        <button
                          type="button"
                          onClick={() => setCurrentStep(1)}
                          className="bg-transparent border-none text-[#205134] text-xs font-bold underline cursor-pointer"
                        >
                          ← Volver al carrito
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-[#444] mb-1">Nombre completo *</label>
                          <input
                            type="text"
                            value={addressForm.fullName}
                            onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })}
                            placeholder="Ej: Juan Pérez"
                            className="w-full bg-[#F9F6F0] border border-[#E8DED0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#205134]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#444] mb-1">Teléfono celular *</label>
                          <input
                            type="tel"
                            value={addressForm.phone}
                            onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                            placeholder="Ej: 3101234567"
                            className="w-full bg-[#F9F6F0] border border-[#E8DED0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#205134]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#444] mb-1">Departamento *</label>
                          <input
                            type="text"
                            value={addressForm.department}
                            onChange={(e) => setAddressForm({ ...addressForm, department: e.target.value })}
                            placeholder="Ej: Cundinamarca"
                            className="w-full bg-[#F9F6F0] border border-[#E8DED0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#205134]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#444] mb-1">Municipio / Ciudad *</label>
                          <input
                            type="text"
                            value={addressForm.municipality}
                            onChange={(e) => setAddressForm({ ...addressForm, municipality: e.target.value })}
                            placeholder="Ej: Fusagasugá"
                            className="w-full bg-[#F9F6F0] border border-[#E8DED0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#205134]"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-[#444] mb-1">Dirección de entrega *</label>
                          <input
                            type="text"
                            value={addressForm.address}
                            onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
                            placeholder="Ej: Calle 10 # 4-15 Finca La Esperanza"
                            className="w-full bg-[#F9F6F0] border border-[#E8DED0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#205134]"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-[#444] mb-1">Notas o instrucciones para el repartidor (Opcional)</label>
                          <textarea
                            rows={3}
                            value={addressForm.deliveryNotes}
                            onChange={(e) => setAddressForm({ ...addressForm, deliveryNotes: e.target.value })}
                            placeholder="Ej: Dejar en la portería o llamar al llegar."
                            className="w-full bg-[#F9F6F0] border border-[#E8DED0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#205134]"
                          ></textarea>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PASO 3: Método de Pago y Confirmación */}
                  {currentStep === 3 && (
                    <div className="flex flex-col gap-6">
                      <div className="bg-white rounded-2xl p-6 md:p-8 border border-[#E8DED0]">
                        <div className="flex justify-between items-center mb-6">
                          <h2 className="font-['Playfair_Display',serif] text-2xl text-[#1C3A14] m-0 font-medium">
                            3. Método de pago y confirmación
                          </h2>
                          <button
                            type="button"
                            onClick={() => setCurrentStep(2)}
                            className="bg-transparent border-none text-[#205134] text-xs font-bold underline cursor-pointer"
                          >
                            ← Modificar dirección
                          </button>
                        </div>

                        {/* Opciones de Método de Pago */}
                        <div className="flex flex-col gap-4 mb-8">
                          {/* Opción 1: Contraentrega */}
                          <div
                            onClick={() => setPaymentMethod('contraentrega')}
                            className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                              paymentMethod === 'contraentrega'
                                ? 'border-[#205134] bg-[#F2F7F4]'
                                : 'border-[#E8DED0] hover:border-[#CCC] bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <input
                                type="radio"
                                name="paymentMethod"
                                checked={paymentMethod === 'contraentrega'}
                                onChange={() => setPaymentMethod('contraentrega')}
                                className="accent-[#205134] w-5 h-5 cursor-pointer"
                              />
                              <div className="font-bold text-[#1C3A14] text-lg">💵 Pago Contraentrega (Efectivo)</div>
                            </div>
                            <p className="text-sm text-[#555] ml-8 m-0 leading-relaxed">
                              Le pagas en efectivo directamente al transportista o campesino al momento de recibir tu producto en la dirección especificada. <strong>Sin recargo por procesamiento.</strong>
                            </p>
                          </div>

                          {/* Opción 2: Wompi */}
                          <div
                            onClick={() => setPaymentMethod('wompi')}
                            className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                              paymentMethod === 'wompi'
                                ? 'border-[#205134] bg-[#F2F7F4]'
                                : 'border-[#E8DED0] hover:border-[#CCC] bg-white'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <div className="flex items-center gap-3">
                                <input
                                  type="radio"
                                  name="paymentMethod"
                                  checked={paymentMethod === 'wompi'}
                                  onChange={() => setPaymentMethod('wompi')}
                                  className="accent-[#205134] w-5 h-5 cursor-pointer"
                                />
                                <div className="font-bold text-[#1C3A14] text-lg">💳 Tarjeta de Crédito / Débito / PSE / Nequi (Wompi)</div>
                              </div>
                              <span className="bg-[#205134] text-white text-[10px] uppercase tracking-wider px-2 py-1 rounded font-bold">Wompi</span>
                            </div>
                            <p className="text-sm text-[#555] ml-8 m-0 leading-relaxed">
                              Pago en línea 100% seguro procesado por la pasarela oficial Wompi (Bancolombia). Incluye tarifa de procesamiento digital (+2.9%).
                            </p>
                          </div>
                        </div>

                        {/* Tarjeta Resumen de Entrega */}
                        <div className="bg-[#F9F6F0] p-4 rounded-xl border border-[#E8DED0]">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-xs uppercase text-[#205134] tracking-wider">Dirección de Entrega Confirmada</span>
                            <button onClick={() => setCurrentStep(2)} className="text-xs text-[#D06050] font-bold border-none bg-transparent cursor-pointer underline">Editar</button>
                          </div>
                          <div className="font-bold text-[#1C3A14]">{addressForm.fullName} ({addressForm.phone})</div>
                          <div className="text-sm text-[#555]">{addressForm.address}, {addressForm.municipality}, {addressForm.department}</div>
                          {addressForm.deliveryNotes && <div className="text-xs text-[#777] mt-1">Notas: {addressForm.deliveryNotes}</div>}
                        </div>

                      </div>
                    </div>
                  )}

                </div>

                {/* Columna Derecha: Resumen de Pedido y Botón Dinámico */}
                <div>
                  <div className="bg-white rounded-2xl p-6 md:p-8 border border-[#E8DED0] shadow-sm sticky top-6">
                    <h2 className="font-['Playfair_Display',serif] text-2xl text-[#1C3A14] m-0 mb-6 font-medium">Resumen del pedido</h2>

                    <div className="flex justify-between text-sm text-[#555] mb-4">
                      <span>Subtotal productos</span>
                      <span className="font-bold text-[#1C3A14]">{formatPrice(subtotal)}</span>
                    </div>

                    <div className="flex justify-between text-sm text-[#555] mb-4">
                      <span>Envío estimado</span>
                      <span className="font-bold text-[#205134]">{formatPrice(shippingFee)}</span>
                    </div>

                    {paymentMethod === 'wompi' && currentStep === 3 && (
                      <div className="flex justify-between text-sm text-[#555] mb-4">
                        <span>Comisión procesamiento (Wompi)</span>
                        <span className="font-bold text-[#D06050]">{formatPrice(wompiFee)}</span>
                      </div>
                    )}

                    <div className="h-px bg-[#E8DED0] w-full mb-6"></div>

                    <div className="flex justify-between items-center mb-8">
                      <span className="font-['Poppins'] text-lg font-bold text-[#1C3A14]">Total estimado</span>
                      <span className="font-['Poppins'] text-2xl font-bold text-[#D06050]">{formatPrice(grandTotal)}</span>
                    </div>

                    {/* BOTÓN PRINCIPAL: "Continuar" vs "Proceder al pago" */}
                    <button
                      type="button"
                      disabled={loadingPayment}
                      onClick={handleMainAction}
                      className="w-full bg-[#D06050] hover:bg-[#ba5546] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl border-none cursor-pointer transition-colors text-sm mb-4"
                    >
                      {loadingPayment
                        ? 'Procesando...'
                        : isLogged === false
                        ? 'Crear cuenta para comprar'
                        : currentStep === 3
                        ? 'Proceder al pago'
                        : 'Continuar →'}
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
