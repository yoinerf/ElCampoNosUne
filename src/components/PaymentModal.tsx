import { useEffect, useMemo, useState } from 'react'

interface PaymentModalProps {
  open: boolean
  title: string
  subtitle: string
  confirmLabel: string
  amount?: number
  onClose: () => void
  onConfirm: () => Promise<boolean> | boolean
}

export default function PaymentModal({
  open,
  title,
  subtitle,
  confirmLabel,
  amount,
  onClose,
  onConfirm,
}: PaymentModalProps) {
  const [form, setForm] = useState({
    name: '',
    card: '',
    expiry: '',
    cvv: '',
    address: '',
  })
  const [touched, setTouched] = useState<Record<string, boolean>>({
    name: false,
    card: false,
    expiry: false,
    cvv: false,
    address: false,
  })
  const [phase, setPhase] = useState<'idle' | 'processing' | 'success'>('idle')
  const [result, setResult] = useState<'success' | 'error' | null>(null)

  useEffect(() => {
    if (!open) {
      setForm({ name: '', card: '', expiry: '', cvv: '', address: '' })
      setTouched({ name: false, card: false, expiry: false, cvv: false, address: false })
      setPhase('idle')
      setResult(null)
    }
  }, [open])

  const amountLabel = useMemo(() => {
    if (typeof amount === 'number') {
      return `$${amount.toLocaleString('es-CO')}`
    }

    return 'Total'
  }, [amount])

  const isValidCard = /^\d{4} \d{4} \d{4} \d{4}$/
  const isValidExpiry = /^(0[1-9]|1[0-2])\/\d{2}$/
  const isValidCvv = /^\d{3,4}$/

  const getValidationErrors = () => ({
    name: form.name.trim().length === 0 ? 'Nombre requerido' : '',
    card: !isValidCard.test(form.card) ? 'Tarjeta incompleta' : '',
    expiry: !isValidExpiry.test(form.expiry) ? 'MM/YY inválido' : '',
    cvv: !isValidCvv.test(form.cvv) ? 'CVV inválido' : '',
    address: form.address.trim().length === 0 ? 'Dirección requerida' : '',
  })

  const validateForm = () => {
    const errors = getValidationErrors()
    return Object.values(errors).every((value) => value === '')
  }

  const handleExpiryChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4)
    let formatted = digits

    if (digits.length > 2) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}`
    }

    setForm((prev) => ({ ...prev, expiry: formatted }))
  }

  const handleCardChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16)
    const groups: string[] = []

    for (let index = 0; index < digits.length; index += 4) {
      groups.push(digits.slice(index, index + 4))
    }

    setForm((prev) => ({ ...prev, card: groups.join(' ') }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (phase !== 'idle') return

    const errors = getValidationErrors()
    setTouched({
      name: true,
      card: true,
      expiry: true,
      cvv: true,
      address: true,
    })

    if (!validateForm()) {
      return
    }

    setPhase('processing')

    window.setTimeout(async () => {
      try {
        const success = await onConfirm()
        setResult(success ? 'success' : 'error')
        setPhase('success')
      } catch {
        setResult('error')
        setPhase('success')
      }
    }, 3000)
  }

  const renderFieldState = (field: keyof typeof form) => {
    const error = getValidationErrors()[field]
    const showError = touched[field] && Boolean(error)

    return {
      border: showError ? '1.5px solid #D32F2F' : '1px solid #E8DED0',
      background: showError ? '#FFF5F5' : '#fff',
      boxShadow: showError ? '0 0 0 3px rgba(211,47,47,0.08)' : 'none',
    }
  }

  const closeResult = () => {
    setResult(null)
    setPhase('idle')
    onClose()
  }

  if (!open && !result) return null

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(19, 30, 18, 0.58)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          zIndex: 300,
        }}
        onClick={onClose}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 440,
            background: '#fff',
            borderRadius: 28,
            boxShadow: '0 30px 60px rgba(28,63,16,0.24)',
            border: '1px solid rgba(232,224,207,0.9)',
            overflow: 'hidden',
            transform: open ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.98)',
            opacity: open ? 1 : 0,
            transition: 'all 220ms ease',
            animation: 'popIn 260ms cubic-bezier(0.18, 0.89, 0.32, 1.18)',
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #205134 0%, #2A6340 100%)',
              color: '#F5EEE6',
              padding: '18px 20px 16px',
              position: 'relative',
            }}
          >
            <button
              onClick={(event) => {
                event.stopPropagation()
                onClose()
              }}
              type="button"
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                width: 30,
                height: 30,
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(255,255,255,0.16)',
                color: '#fff',
                fontSize: 18,
                cursor: 'pointer',
              }}
            >
              ×
            </button>
            <div style={{ fontSize: 11, letterSpacing: 1, opacity: 0.8, fontWeight: 700, fontFamily: "'Nunito Sans', sans-serif", textTransform: 'uppercase' }}>
              Pago seguro
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Poppins', sans-serif", marginTop: 6 }}>{title}</div>
            <div style={{ fontSize: 13, opacity: 0.9, marginTop: 3, fontFamily: "'Nunito Sans', sans-serif" }}>{subtitle}</div>
            <div style={{ marginTop: 14, fontSize: 12, opacity: 0.9, fontFamily: "'Nunito Sans', sans-serif" }}>Total</div>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: 0.2, fontFamily: "'Nunito Sans', sans-serif" }}>{amountLabel}</div>
          </div>

          <form noValidate onSubmit={handleSubmit} style={{ padding: 20, display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gap: 8 }}>
                <label style={{ fontSize: 12, color: '#205134', fontWeight: 700, fontFamily: "'Nunito Sans', sans-serif" }}>Nombre del titular</label>
              <input
                value={form.name}
                onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
                onChange={(event) => {
                  setTouched((prev) => ({ ...prev, name: true }))
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }}
                placeholder="Nombre completo"
                style={{
                  ...renderFieldState('name'),
                  borderRadius: 12,
                  padding: '11px 12px',
                  fontSize: 14,
                  fontFamily: "'Nunito Sans', sans-serif",
                  outline: 'none',
                }}
              />
              {touched.name && getValidationErrors().name && (
                <span style={{ fontSize: 11, color: '#D32F2F', fontFamily: "'Nunito Sans', sans-serif", fontWeight: 700 }}>{getValidationErrors().name}</span>
              )}
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              <label style={{ fontSize: 12, color: '#205134', fontWeight: 700, fontFamily: "'Nunito Sans', sans-serif" }}>Número de tarjeta</label>
              <input
                value={form.card}
                onBlur={() => setTouched((prev) => ({ ...prev, card: true }))}
                onChange={(event) => {
                  setTouched((prev) => ({ ...prev, card: true }))
                  handleCardChange(event.target.value)
                }}
                placeholder="1234 5678 9012 3456"
                maxLength={19}
                inputMode="numeric"
                style={{
                  ...renderFieldState('card'),
                  borderRadius: 12,
                  padding: '11px 12px',
                  fontSize: 14,
                  fontFamily: "'Nunito Sans', sans-serif",
                  outline: 'none',
                }}
              />
              {touched.card && getValidationErrors().card && (
                <span style={{ fontSize: 11, color: '#D32F2F', fontFamily: "'Nunito Sans', sans-serif", fontWeight: 700 }}>{getValidationErrors().card}</span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ display: 'grid', gap: 8 }}>
                <label style={{ fontSize: 12, color: '#205134', fontWeight: 700, fontFamily: "'Nunito Sans', sans-serif" }}>Vencimiento</label>
                <input
                  value={form.expiry}
                  onBlur={() => setTouched((prev) => ({ ...prev, expiry: true }))}
                  onChange={(event) => {
                    setTouched((prev) => ({ ...prev, expiry: true }))
                    handleExpiryChange(event.target.value)
                  }}
                  placeholder="MM/YY"
                  maxLength={5}
                  inputMode="numeric"
                  style={{
                    ...renderFieldState('expiry'),
                    borderRadius: 12,
                    padding: '11px 12px',
                    fontSize: 14,
                    fontFamily: "'Nunito Sans', sans-serif",
                    outline: 'none',
                  }}
                />
                {touched.expiry && getValidationErrors().expiry && (
                  <span style={{ fontSize: 11, color: '#D32F2F', fontFamily: "'Nunito Sans', sans-serif", fontWeight: 700 }}>{getValidationErrors().expiry}</span>
                )}
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                <label style={{ fontSize: 12, color: '#205134', fontWeight: 700, fontFamily: "'Nunito Sans', sans-serif" }}>CVV</label>
                <input
                  value={form.cvv}
                  onBlur={() => setTouched((prev) => ({ ...prev, cvv: true }))}
                  onChange={(event) => {
                    setTouched((prev) => ({ ...prev, cvv: true }))
                    setForm((prev) => ({ ...prev, cvv: event.target.value.replace(/\D/g, '').slice(0, 4) }))
                  }}
                  placeholder="123"
                  maxLength={4}
                  inputMode="numeric"
                  style={{
                    ...renderFieldState('cvv'),
                    borderRadius: 12,
                    padding: '11px 12px',
                    fontSize: 14,
                    fontFamily: "'Nunito Sans', sans-serif",
                    outline: 'none',
                  }}
                />
                {touched.cvv && getValidationErrors().cvv && (
                  <span style={{ fontSize: 11, color: '#D32F2F', fontFamily: "'Nunito Sans', sans-serif", fontWeight: 700 }}>{getValidationErrors().cvv}</span>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              <label style={{ fontSize: 12, color: '#205134', fontWeight: 700, fontFamily: "'Nunito Sans', sans-serif" }}>Dirección de entrega</label>
              <input
                value={form.address}
                onBlur={() => setTouched((prev) => ({ ...prev, address: true }))}
                onChange={(event) => {
                  setTouched((prev) => ({ ...prev, address: true }))
                  setForm((prev) => ({ ...prev, address: event.target.value }))
                }}
                placeholder="Calle / barrio / municipio"
                style={{
                  ...renderFieldState('address'),
                  borderRadius: 12,
                  padding: '11px 12px',
                  fontSize: 14,
                  fontFamily: "'Nunito Sans', sans-serif",
                  outline: 'none',
                }}
              />
              {touched.address && getValidationErrors().address && (
                <span style={{ fontSize: 11, color: '#D32F2F', fontFamily: "'Nunito Sans', sans-serif", fontWeight: 700 }}>{getValidationErrors().address}</span>
              )}
            </div>

            <button
              type="submit"
              disabled={phase !== 'idle'}
              style={{
                marginTop: 6,
                border: 'none',
                borderRadius: 14,
                background: phase === 'success' ? '#205134' : phase === 'processing' ? '#6BAA3D' : 'linear-gradient(135deg, #E5AE30 0%, #9B4728 100%)',
                color: '#fff',
                fontSize: 15,
                fontWeight: 800,
                fontFamily: "'Nunito Sans', sans-serif",
                cursor: phase !== 'idle' ? 'default' : 'pointer',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                minHeight: 52,
              }}
            >
              {phase === 'processing' ? (
                <>
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.5)',
                      borderTopColor: '#fff',
                      display: 'inline-block',
                      animation: 'spin 0.9s linear infinite',
                    }}
                  />
                  Confirmando...
                </>
              ) : phase === 'success' ? (
                <>
                  <span style={{ fontSize: 18 }}>✓</span>
                  Pedido realizado
                </>
              ) : (
                confirmLabel
              )}
            </button>
          </form>
        </div>
      </div>

      {result && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 350,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 320,
              background: result === 'success' ? 'linear-gradient(135deg, #205134 0%, #2A6340 100%)' : 'linear-gradient(135deg, #B91C1C 0%, #D32F2F 100%)',
              border: 'none',
              borderRadius: 24,
              boxShadow: '0 28px 50px rgba(31, 54, 39, 0.22)',
              padding: '26px 20px 20px',
              display: 'grid',
              justifyItems: 'center',
              textAlign: 'center',
              gap: 12,
              animation: 'popIn 240ms cubic-bezier(0.18, 0.89, 0.32, 1.18)',
              color: '#fff',
              pointerEvents: 'auto',
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: result === 'success' ? '#205134' : '#C62828',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 34,
                fontWeight: 800,
                animation: result === 'success' ? 'pulseSuccess 550ms ease-out' : 'pulseError 550ms ease-out',
              }}
            >
              {result === 'success' ? '✓' : '✕'}
            </div>
            <div
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: 22,
                color: '#fff',
                fontWeight: 700,
              }}
            >
              {result === 'success' ? '¡Listo!' : 'No se pudo completar'}
            </div>
            <div
              style={{
                fontFamily: "'Nunito Sans', sans-serif",
                fontSize: 14,
                color: '#F5F7F1',
                lineHeight: 1.5,
              }}
            >
              {result === 'success'
                ? 'La reserva o compra se realizó correctamente, Pronto recibirás mensajes de confirmación y detalles de tu pedido.'
                : 'Hubo un problema al procesar tu solicitud. Intenta nuevamente.'}
            </div>

            <button
              type="button"
              onClick={closeResult}
              style={{
                border: 'none',
                borderRadius: 12,
                background: '#fff',
                color: result === 'success' ? '#205134' : '#B91C1C',
                fontSize: 14,
                fontWeight: 800,
                fontFamily: "'Nunito Sans', sans-serif",
                padding: '10px 16px',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  )
}


