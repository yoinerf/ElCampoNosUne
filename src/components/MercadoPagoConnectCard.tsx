import { useEffect, useState, type CSSProperties } from 'react'
import { supabase } from '../lib/supabase'
import { disconnectMercadoPago, fetchGatewaySettings, startMercadoPagoConnect } from '../lib/payments'
import { confirmDialog } from './ConfirmDialog'

interface MercadoPagoConnectCardProps {
  userId: string
  style?: CSSProperties
}

// Resultado del regreso desde Mercado Pago (mp-oauth redirige a /panel?mp=...)
const RETURN_MESSAGES: Record<string, { type: 'ok' | 'error'; text: string }> = {
  connected: { type: 'ok', text: '¡Listo! Tu cuenta de Mercado Pago quedó conectada.' },
  expired: { type: 'error', text: 'La conexión tardó demasiado. Intenta de nuevo.' },
  error: { type: 'error', text: 'No se pudo conectar tu cuenta de Mercado Pago. Intenta de nuevo.' },
}

// Conexión de la cuenta de Mercado Pago del productor: los pagos en línea de sus ventas
// llegan directo a esa cuenta (la plataforma no cobra comisión).
export default function MercadoPagoConnectCard({ userId, style }: MercadoPagoConnectCardProps) {
  const [available, setAvailable] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [account, setAccount] = useState<{ provider_user_id: string; connected_at: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  const load = async () => {
    const { data } = await supabase
      .from('seller_payment_accounts')
      .select('provider_user_id, connected_at')
      .eq('seller_id', userId)
      .eq('gateway', 'mercadopago')
      .eq('status', 'active')
      .maybeSingle()
    setAccount(data)
  }

  useEffect(() => {
    fetchGatewaySettings().then((s) => {
      setAvailable(!!s)
      setEnabled(!!s?.enabled)
    })
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
  if (!available) return null

  const connect = async () => {
    setBusy(true)
    setMessage(null)
    const result = await startMercadoPagoConnect()
    if ('error' in result) {
      setBusy(false)
      setMessage({ type: 'error', text: result.error })
      return
    }
    window.location.href = result.url
  }

  const disconnect = async () => {
    if (!(await confirmDialog({
      title: 'Desconectar Mercado Pago',
      message: 'Tus clientes ya no podrán pagarte en línea hasta que vuelvas a conectar tu cuenta.',
      confirmText: 'Desconectar',
      tone: 'warning',
    }))) return
    setBusy(true)
    const error = await disconnectMercadoPago()
    setBusy(false)
    if (error) {
      setMessage({ type: 'error', text: error })
      return
    }
    setMessage({ type: 'ok', text: 'Cuenta de Mercado Pago desconectada.' })
    load()
  }

  const button: CSSProperties = {
    border: 'none', borderRadius: 12, padding: '11px 18px', fontSize: 14, fontWeight: 700,
    cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.7 : 1, fontFamily: "'Nunito Sans', sans-serif",
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #EDE4D8', borderRadius: 24, padding: 28, fontFamily: "'Nunito Sans', sans-serif", ...style }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0, fontFamily: "'Poppins', sans-serif", fontSize: 18, fontWeight: 700, color: '#1C3A14' }}>💳 Pagos en línea con Mercado Pago</h3>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#8A8070', lineHeight: 1.5 }}>
            Conecta tu cuenta y el dinero de tus ventas en línea llegará directo a tu Mercado Pago. La plataforma no cobra comisión;
            la tarifa de la pasarela la paga el comprador.
          </p>
        </div>
        <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 20, background: account ? '#EAF4ED' : '#FEF8E8', color: account ? '#205134' : '#9E740E' }}>
          {account ? 'Conectada' : enabled ? 'Sin conectar' : 'Próximamente'}
        </span>
      </div>

      {account && (
        <p style={{ margin: '0 0 12px', fontSize: 13, color: '#555' }}>
          Cuenta de Mercado Pago #{account.provider_user_id} · conectada el {new Date(account.connected_at).toLocaleDateString('es-CO')}
        </p>
      )}

      {message && (
        <div style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: message.type === 'ok' ? '#205134' : '#9B4728' }}>{message.text}</div>
      )}

      {account ? (
        <button type="button" disabled={busy} onClick={disconnect} style={{ ...button, background: '#FDEEE9', color: '#9B4728' }}>
          Desconectar cuenta
        </button>
      ) : (
        <button type="button" disabled={busy} onClick={connect} style={{ ...button, background: '#205134', color: '#fff' }}>
          {busy ? 'Abriendo Mercado Pago…' : 'Conectar Mercado Pago'}
        </button>
      )}
    </div>
  )
}
