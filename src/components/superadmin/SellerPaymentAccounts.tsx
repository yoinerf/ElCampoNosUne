import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { GATEWAY_LABELS, setSellerPaymentStatus, type Gateway, type SellerPaymentAccount } from '../../lib/payments'
import { confirmDialog } from '../ConfirmDialog'
import { B } from './ui'

// Cuentas de cobro de los productores (public.seller_payment_accounts).
//   - ePayco: el productor registra su ID de cliente ("En revisión"). Antes de activarlo,
//     agrégalo como receptor en el Dashboard de ePayco (Pagos Divididos → Receptores).
//   - Mercado Pago: se activa solo con OAuth; aquí únicamente se puede desactivar.

type Row = SellerPaymentAccount & { seller_name: string; store: string | null }

const STATUS: Record<string, { label: string; bg: string; color: string }> = {
  active: { label: 'Activa', bg: B.greenSoft, color: B.green },
  pending: { label: 'En revisión', bg: B.goldSoft, color: '#9E740E' },
  revoked: { label: 'Desactivada', bg: B.terraSoft, color: B.terraDark },
}

const btn = { border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: B.fontBody }

export default function SellerPaymentAccounts() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [filter, setFilter] = useState<'pending' | 'all'>('pending')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const load = async () => {
    const { data: accounts, error } = await supabase
      .from('seller_payment_accounts')
      .select('seller_id, gateway, provider_user_id, status, connected_at')
      .order('connected_at', { ascending: false })
    if (error) { setRows([]); return }
    const ids = [...new Set((accounts ?? []).map((a) => a.seller_id))]
    const { data: profiles } = ids.length
      ? await supabase.from('profiles').select('id, org_name, first_name, last_name, store').in('id', ids)
      : { data: [] }
    setRows((accounts ?? []).map((a) => {
      const p = profiles?.find((x) => x.id === a.seller_id)
      return {
        ...(a as SellerPaymentAccount),
        seller_name: p?.org_name || `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.trim() || 'Productor',
        store: p?.store ?? null,
      }
    }))
  }

  useEffect(() => { load() }, [])

  const change = async (row: Row, status: 'active' | 'revoked') => {
    if (status === 'active' && row.gateway === 'epayco' && !(await confirmDialog({
      title: 'Activar receptor de ePayco',
      message: `Confirma que ya registraste el ID ${row.provider_user_id} de ${row.seller_name} como receptor en el Dashboard de ePayco (Pagos Divididos → Receptores). Si no, los pagos de sus productos fallarán.`,
      confirmText: 'Activar',
    }))) return
    const error = await setSellerPaymentStatus(row.seller_id, row.gateway as Gateway, status)
    setMsg(error ? { ok: false, text: error } : { ok: true, text: `Cuenta de ${row.seller_name} ${status === 'active' ? 'activada' : 'desactivada'}.` })
    if (!error) load()
  }

  const visible = (rows ?? []).filter((r) => filter === 'all' || r.status === 'pending')

  return (
    <div style={{ background: B.bgCard, border: `1px solid ${B.border}`, borderRadius: 20, padding: 24, boxShadow: '0 4px 20px rgba(32,81,52,0.04)', textAlign: 'left' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div>
          <h3 style={{ fontFamily: B.fontDisplay, fontSize: 18, color: B.green, margin: 0, fontWeight: 700 }}>👩‍🌾 Cuentas de cobro de productores</h3>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: B.textMuted }}>
            Activa los receptores de ePayco después de registrarlos en el Dashboard de ePayco.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['pending', 'all'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              style={{ ...btn, background: filter === f ? B.green : B.bgCardAlt, color: filter === f ? '#fff' : B.textMuted }}
            >
              {f === 'pending' ? `Por activar (${(rows ?? []).filter((r) => r.status === 'pending').length})` : 'Todas'}
            </button>
          ))}
        </div>
      </div>

      {msg && <div style={{ fontSize: 13, fontWeight: 700, color: msg.ok ? B.green : B.terraDark, marginBottom: 10 }}>{msg.text}</div>}

      {rows === null ? (
        <div style={{ fontSize: 13, color: B.textMuted }}>Cargando…</div>
      ) : visible.length === 0 ? (
        <div style={{ fontSize: 13, color: B.textMuted }}>{filter === 'pending' ? 'No hay cuentas por activar.' : 'Ningún productor ha registrado cuentas de cobro.'}</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ color: B.textMuted, textAlign: 'left' }}>
                <th style={{ padding: '8px 6px' }}>Productor</th>
                <th style={{ padding: '8px 6px' }}>Pasarela</th>
                <th style={{ padding: '8px 6px' }}>ID en la pasarela</th>
                <th style={{ padding: '8px 6px' }}>Estado</th>
                <th style={{ padding: '8px 6px' }} />
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const s = STATUS[r.status]
                return (
                  <tr key={`${r.seller_id}-${r.gateway}`} style={{ borderTop: `1px solid ${B.border}` }}>
                    <td style={{ padding: '10px 6px', fontWeight: 700, color: B.text }}>
                      {r.seller_name}
                      {r.store && <div style={{ fontSize: 11, color: B.textFaint, fontWeight: 600 }}>{r.store}</div>}
                    </td>
                    <td style={{ padding: '10px 6px' }}>{GATEWAY_LABELS[r.gateway as Gateway] ?? r.gateway}</td>
                    <td style={{ padding: '10px 6px', fontFamily: 'monospace' }}>{r.provider_user_id}</td>
                    <td style={{ padding: '10px 6px' }}>
                      <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 20, background: s.bg, color: s.color }}>{s.label}</span>
                    </td>
                    <td style={{ padding: '10px 6px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {r.gateway === 'epayco' && r.status !== 'active' && (
                        <button type="button" onClick={() => change(r, 'active')} style={{ ...btn, background: B.green, color: '#fff', marginRight: 6 }}>Activar</button>
                      )}
                      {r.status !== 'revoked' && (
                        <button type="button" onClick={() => change(r, 'revoked')} style={{ ...btn, background: B.terraSoft, color: B.terraDark }}>Desactivar</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
