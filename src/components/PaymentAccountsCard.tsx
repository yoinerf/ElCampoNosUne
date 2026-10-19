import { useEffect, useState, type CSSProperties } from 'react'
import {
  disconnectPaymentAccount,
  fetchGatewaySettings,
  fetchMyPaymentAccounts,
  requestEpaycoReceiver,
  startMercadoPagoConnect,
  type Gateway,
  type GatewaySettings,
  type SellerPaymentAccount,
} from '../lib/payments'
import { confirmDialog } from './ConfirmDialog'

interface PaymentAccountsCardProps {
  userId: string
  style?: CSSProperties
}

// Resultado del regreso desde Mercado Pago (mp-oauth redirige a /panel?mp=...)
const RETURN_MESSAGES: Record<string, { type: 'ok' | 'error'; text: string }> = {
  connected: { type: 'ok', text: '¡Listo! Tu cuenta de Mercado Pago quedó conectada.' },
  expired: { type: 'error', text: 'La conexión con Mercado Pago tardó demasiado. Intenta de nuevo.' },
  error: { type: 'error', text: 'No se pudo conectar tu cuenta de Mercado Pago. Intenta de nuevo.' },
}

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  active: { label: 'Activa', bg: '#EAF4ED', color: '#205134' },
  pending: { label: 'En revisión', bg: '#FEF8E8', color: '#9E740E' },
  revoked: { label: 'Desactivada', bg: '#FDEEE9', color: '#9B4728' },
  none: { label: 'Sin conectar', bg: '#F5EEE6', color: '#685F54' },
  soon: { label: 'Próximamente', bg: '#FEF8E8', color: '#9E740E' },
}

const button: CSSProperties = {
  border: 'none', borderRadius: 12, padding: '10px 16px', fontSize: 13, fontWeight: 700,
  cursor: 'pointer', fontFamily: "'Nunito Sans', sans-serif",
}

// Cuentas de cobro del productor para pagos en línea: el dinero de sus ventas llega directo
// a su cuenta (la plataforma no cobra comisión; la tarifa de la pasarela la paga el comprador).
//   - Mercado Pago: se conecta con OAuth.
//   - ePayco: el productor registra su ID de cliente y la plataforma lo activa como receptor.
export default function PaymentAccountsCard({ userId, style }: PaymentAccountsCardProps) {
  const [gateways, setGateways] = useState<GatewaySettings[]>([])
  const [accounts, setAccounts] = useState<SellerPaymentAccount[]>([])
  const [epaycoId, setEpaycoId] = useState('')
  const [busy, setBusy] = useState<Gateway | null>(null)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  const load = async () => {
    const list = await fetchMyPaymentAccounts(userId)
    setAccounts(list)
    setEpaycoId(list.find((a) => a.gateway === 'epayco')?.provider_user_id ?? '')
  }

  useEffect(() => {
    fetchGatewaySettings().then(setGateways)
    if (userId) load()

    const params = new URLSearchParams(window.location.search)
    const result = params.get('mp')
    if (result && RETURN_MESSAGES[result]) {
      setMessage(RETURN_MESSAGES[result])
      params.delete('mp')
      const query = params.toString()
      window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
    }
  }, [userId])

  // Sin la migración de pagos en línea no se muestra nada
  if (gateways.length === 0) return null

  const account = (g: Gateway) => accounts.find((a) => a.gateway === g)
  const enabled = (g: Gateway) => gateways.some((s) => s.gateway === g && s.enabled)
  const badge = (g: Gateway) => STATUS_BADGE[account(g)?.status ?? (enabled(g) ? 'none' : 'soon')]

  const connectMercadoPago = async () => {
    setBusy('mercadopago')
    setMessage(null)
    const result = await startMercadoPagoConnect()
    if ('error' in result) {
      setBusy(null)
      setMessage({ type: 'error', text: result.error })
      return
    }
    window.location.href = result.url
  }

  const saveEpayco = async () => {
    setBusy('epayco')
    setMessage(null)
    const error = await requestEpaycoReceiver(epaycoId)
    setBusy(null)
    if (error) {
      setMessage({ type: 'error', text: error })
      return
    }
    setMessage({ type: 'ok', text: 'ID de ePayco guardado. La plataforma lo activará cuando te registre como receptor.' })
    load()
  }

  const disconnect = async (g: Gateway, label: string) => {
    if (!(await confirmDialog({
      title: `Desconectar ${label}`,
      message: `Tus clientes ya no podrán pagarte con ${label} hasta que vuelvas a conectar tu cuenta.`,
      confirmText: 'Desconectar',
      tone: 'warning',
    }))) return
    setBusy(g)
    const error = await disconnectPaymentAccount(g)
    setBusy(null)
    if (error) {
      setMessage({ type: 'error', text: error })
      return
    }
    setMessage({ type: 'ok', text: `Cuenta de ${label} desconectada.` })
    load()
  }

  const Badge = ({ g }: { g: Gateway }) => {
    const b = badge(g)
    return <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 20, background: b.bg, color: b.color }}>{b.label}</span>
  }

  const mp = account('mercadopago')
  const ep = account('epayco')
  const section: CSSProperties = { border: '1px solid #EDE4D8', borderRadius: 16, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }

  return (
    <div style={{ background: '#fff', border: '1px solid #EDE4D8', borderRadius: 24, padding: 28, fontFamily: "'Nunito Sans', sans-serif", ...style }}>
      <h3 style={{ margin: 0, fontFamily: "'Poppins', sans-serif", fontSize: 18, fontWeight: 700, color: '#1C3A14' }}>💳 Cobros en línea</h3>
      <p style={{ margin: '4px 0 16px', fontSize: 13, color: '#8A8070', lineHeight: 1.5 }}>
        Conecta tu cuenta y el dinero de tus ventas en línea llegará directo a ti. La plataforma no cobra comisión;
        la tarifa de la pasarela la paga el comprador.
      </p>

      {message && (
        <div style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: message.type === 'ok' ? '#205134' : '#9B4728' }}>{message.text}</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Mercado Pago */}
        <div style={section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <strong style={{ color: '#1C3A14' }}>Mercado Pago</strong>
            <Badge g="mercadopago" />
          </div>
          {mp ? (
            <>
              <span style={{ fontSize: 13, color: '#555' }}>
                Cuenta #{mp.provider_user_id} · conectada el {new Date(mp.connected_at).toLocaleDateString('es-CO')}
              </span>
              <button type="button" disabled={busy !== null} onClick={() => disconnect('mercadopago', 'Mercado Pago')} style={{ ...button, alignSelf: 'flex-start', background: '#FDEEE9', color: '#9B4728' }}>
                Desconectar
              </button>
            </>
          ) : (
            <button type="button" disabled={busy !== null} onClick={connectMercadoPago} style={{ ...button, alignSelf: 'flex-start', background: '#205134', color: '#fff', opacity: busy ? 0.7 : 1 }}>
              {busy === 'mercadopago' ? 'Abriendo Mercado Pago…' : 'Conectar Mercado Pago'}
            </button>
          )}
        </div>

        {/* ePayco */}
        <div style={section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <strong style={{ color: '#1C3A14' }}>ePayco</strong>
            <Badge g="epayco" />
          </div>
          <span style={{ fontSize: 12, color: '#8A8070', lineHeight: 1.5 }}>
            Crea tu cuenta en ePayco y escribe tu <strong>ID de cliente</strong> (P_CUST_ID_CLIENTE, en Integraciones → Llaves API).
            La plataforma te registra como receptor y activa tu cuenta.
          </span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              value={epaycoId}
              inputMode="numeric"
              placeholder="ID de cliente ePayco"
              onChange={(e) => setEpaycoId(e.target.value.replace(/\D/g, ''))}
              style={{ flex: '1 1 180px', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #EDE4D8', fontSize: 14, fontFamily: 'inherit' }}
            />
            <button
              type="button"
              disabled={busy !== null || !epaycoId || epaycoId === ep?.provider_user_id}
              onClick={saveEpayco}
              style={{ ...button, background: '#205134', color: '#fff', opacity: busy !== null || !epaycoId || epaycoId === ep?.provider_user_id ? 0.6 : 1 }}
            >
              {busy === 'epayco' ? 'Guardando…' : ep ? 'Actualizar ID' : 'Guardar ID'}
            </button>
            {ep && (
              <button type="button" disabled={busy !== null} onClick={() => disconnect('epayco', 'ePayco')} style={{ ...button, background: '#FDEEE9', color: '#9B4728' }}>
                Quitar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
