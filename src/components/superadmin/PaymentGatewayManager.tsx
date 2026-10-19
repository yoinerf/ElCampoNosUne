import { useEffect, useState, type CSSProperties } from 'react'
import { supabase } from '../../lib/supabase'
import { fetchGatewaySettings, gatewayFee, type GatewaySettings } from '../../lib/payments'
import { B, fmt } from './ui'

// Pasarela Mercado Pago (public.payment_gateway_settings). La tarifa que se suma al
// comprador se calcula en la base con estos valores (gateway_fee); aquí solo se editan y
// se muestra una vista previa. Las credenciales de la app viven en secrets de Supabase.

type NumberField = 'percent_fee' | 'fixed_fee' | 'vat_rate' | 'extra_percent' | 'extra_fixed'

const FIELDS: { key: NumberField; label: string; hint: string }[] = [
  { key: 'percent_fee', label: 'Comisión de la pasarela (%)', hint: 'Porcentaje que cobra Mercado Pago por transacción.' },
  { key: 'fixed_fee', label: 'Valor fijo por transacción (COP)', hint: 'Cargo fijo de Mercado Pago por cada pago.' },
  { key: 'vat_rate', label: 'IVA sobre la comisión (%)', hint: 'IVA que se cobra sobre la comisión y el valor fijo.' },
  { key: 'extra_percent', label: 'Retenciones u otros cargos (%)', hint: 'ReteFuente, ReteICA u otros descuentos sobre el total.' },
  { key: 'extra_fixed', label: 'Otros cargos fijos (COP)', hint: 'Cargos fijos adicionales por transacción.' },
]

const EXAMPLE_BASE = 50000

const lbl: CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: B.green, marginBottom: 5, fontFamily: B.fontBody }
const inp: CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${B.border}`, fontSize: 14,
  fontFamily: B.fontBody, boxSizing: 'border-box', background: '#FFFFFF', color: B.text, outline: 'none',
}
const check: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: B.text, cursor: 'pointer' }

export default function PaymentGatewayManager() {
  const [settings, setSettings] = useState<GatewaySettings | null>(null)
  const [form, setForm] = useState<Record<NumberField, string>>({ percent_fee: '', fixed_fee: '', vat_rate: '', extra_percent: '', extra_fixed: '' })
  const [connected, setConnected] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    fetchGatewaySettings().then((s) => {
      if (!s) return
      setSettings(s)
      setForm({
        percent_fee: String(s.percent_fee),
        fixed_fee: String(s.fixed_fee),
        vat_rate: String(s.vat_rate),
        extra_percent: String(s.extra_percent),
        extra_fixed: String(s.extra_fixed),
      })
    })
    supabase
      .from('seller_payment_accounts')
      .select('seller_id', { count: 'exact', head: true })
      .eq('status', 'active')
      .then(({ count }) => setConnected(count ?? 0))
  }, [])

  if (!settings) {
    return (
      <div style={{ background: B.bgCard, border: `1px solid ${B.border}`, borderRadius: 20, padding: 24, color: B.textMuted, fontSize: 14 }}>
        💳 La configuración de Mercado Pago aparecerá cuando se aplique la migración de pagos en línea.
      </div>
    )
  }

  const numbers = Object.fromEntries(FIELDS.map(({ key }) => [key, Number(form[key].replace(',', '.'))])) as Record<NumberField, number>
  const invalid = FIELDS.some(({ key }) => !(numbers[key] >= 0))
    || numbers.percent_fee * (1 + numbers.vat_rate / 100) + numbers.extra_percent >= 50
  const preview = { ...settings, ...numbers }
  const exampleFee = invalid ? 0 : gatewayFee(EXAMPLE_BASE, preview)

  const save = async () => {
    if (invalid) { setMsg({ ok: false, text: 'Revisa los valores: deben ser números positivos y la tarifa total menor al 50 %.' }); return }
    setSaving(true)
    const { error } = await supabase
      .from('payment_gateway_settings')
      .update({
        ...numbers,
        enabled: settings.enabled,
        sandbox: settings.sandbox,
        pass_fees_to_buyer: settings.pass_fees_to_buyer,
      })
      .eq('gateway', 'mercadopago')
    setSaving(false)
    setMsg(error ? { ok: false, text: `No se pudo guardar: ${error.message}` } : { ok: true, text: 'Configuración de Mercado Pago guardada.' })
  }

  return (
    <div style={{ background: B.bgCard, border: `1px solid ${B.border}`, borderRadius: 20, padding: 24, boxShadow: '0 4px 20px rgba(32,81,52,0.04)', display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'left' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontFamily: B.fontDisplay, fontSize: 18, color: B.green, margin: 0, fontWeight: 700 }}>💳 Pasarela Mercado Pago</h3>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: B.textMuted }}>
            Cada productor recibe su pago directamente en su cuenta. La plataforma no cobra comisión.
          </p>
        </div>
        <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 20, background: settings.enabled ? B.greenSoft : B.goldSoft, color: settings.enabled ? B.green : '#9E740E' }}>
          {settings.enabled ? (settings.sandbox ? 'Activa · pruebas' : 'Activa') : 'Apagada'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={check}>
          <input type="checkbox" checked={settings.enabled} onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })} style={{ accentColor: B.green, width: 16, height: 16 }} />
          Pagos en línea activos
        </label>
        <label style={check}>
          <input type="checkbox" checked={settings.sandbox} onChange={(e) => setSettings({ ...settings, sandbox: e.target.checked })} style={{ accentColor: B.green, width: 16, height: 16 }} />
          Modo de pruebas (credenciales sandbox de Mercado Pago)
        </label>
        <label style={check}>
          <input type="checkbox" checked={settings.pass_fees_to_buyer} onChange={(e) => setSettings({ ...settings, pass_fees_to_buyer: e.target.checked })} style={{ accentColor: B.green, width: 16, height: 16 }} />
          Sumar la tarifa de la pasarela al pago del comprador
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {FIELDS.map(({ key, label, hint }) => (
          <div key={key}>
            <label style={lbl}>{label}</label>
            <input style={inp} inputMode="decimal" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value.replace(/[^\d.,]/g, '') })} />
            <div style={{ fontSize: 11, color: B.textFaint, marginTop: 4 }}>{hint}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#FAF7F0', border: `1px solid ${B.border}`, borderRadius: 12, padding: '12px 16px', fontSize: 13, color: B.text, lineHeight: 1.6 }}>
        <strong>Ejemplo:</strong> por una compra de {fmt(EXAMPLE_BASE)} a un productor, el comprador paga{' '}
        <strong>{fmt(EXAMPLE_BASE + exampleFee)}</strong> (tarifa {fmt(exampleFee)}) y el productor recibe{' '}
        {settings.pass_fees_to_buyer ? fmt(EXAMPLE_BASE) : 'el valor menos la tarifa'}.
        <div style={{ fontSize: 12, color: B.textMuted, marginTop: 4 }}>
          Productores con Mercado Pago conectado: <strong>{connected ?? '…'}</strong>
        </div>
      </div>

      {msg && (
        <div style={{ fontSize: 13, fontWeight: 700, color: msg.ok ? B.green : B.terraDark }}>{msg.text}</div>
      )}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        style={{ alignSelf: 'flex-start', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: B.fontBody, background: B.green, color: '#fff', opacity: saving ? 0.7 : 1 }}
      >
        {saving ? 'Guardando…' : 'Guardar configuración'}
      </button>
    </div>
  )
}
