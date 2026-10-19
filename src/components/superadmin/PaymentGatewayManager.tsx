import { useEffect, useState, type CSSProperties } from 'react'
import { supabase } from '../../lib/supabase'
import { GATEWAY_LABELS, fetchGatewaySettings, gatewayFee, type Gateway, type GatewaySettings } from '../../lib/payments'
import { B, fmt } from './ui'

// Pasarelas de pago en línea (public.payment_gateway_settings): activación, modo de pruebas
// y tarifas. El recargo que se suma al comprador se calcula en la base con estos valores
// (gateway_fee); aquí solo se editan y se muestra una vista previa. Las llaves de cada
// pasarela viven en secrets de Supabase (ver docs/pagos).

type NumberField = 'percent_fee' | 'fixed_fee' | 'vat_rate' | 'extra_percent' | 'extra_fixed'

const FIELDS: { key: NumberField; label: string; hint: string }[] = [
  { key: 'percent_fee', label: 'Comisión de la pasarela (%)', hint: 'Porcentaje que cobra la pasarela por transacción.' },
  { key: 'fixed_fee', label: 'Valor fijo por transacción (COP)', hint: 'Cargo fijo por cada pago.' },
  { key: 'vat_rate', label: 'IVA sobre la comisión (%)', hint: 'IVA que se cobra sobre la comisión y el valor fijo.' },
  { key: 'extra_percent', label: 'Retenciones u otros cargos (%)', hint: 'ReteFuente, ReteICA u otros descuentos sobre el total.' },
  { key: 'extra_fixed', label: 'Otros cargos fijos (COP)', hint: 'Cargos fijos adicionales por transacción.' },
]

// Cómo reparte cada pasarela un pedido con varios productores
const SPLIT_TEXT: Record<Gateway, string> = {
  mercadopago: 'Un pago por productor: cada productor conecta su cuenta con Mercado Pago y recibe su pago directo.',
  epayco: 'Un solo pago por pedido que ePayco reparte entre los productores (Pagos Divididos). Activa a cada productor como receptor abajo.',
}

const EXAMPLE_BASE = 50000

const lbl: CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: B.green, marginBottom: 5, fontFamily: B.fontBody }
const inp: CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${B.border}`, fontSize: 14,
  fontFamily: B.fontBody, boxSizing: 'border-box', background: '#FFFFFF', color: B.text, outline: 'none',
}
const check: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: B.text, cursor: 'pointer' }

export default function PaymentGatewayManager() {
  const [gateways, setGateways] = useState<GatewaySettings[] | null>(null)

  useEffect(() => {
    fetchGatewaySettings().then(setGateways)
  }, [])

  if (gateways === null) return null
  if (gateways.length === 0) {
    return (
      <div style={{ background: B.bgCard, border: `1px solid ${B.border}`, borderRadius: 20, padding: 24, color: B.textMuted, fontSize: 14 }}>
        💳 La configuración de pagos en línea aparecerá cuando se aplique la migración
        <code> 20261019120000_online_payments_split.sql</code> (ver docs/pagos).
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {gateways.map((g) => <GatewayCard key={g.gateway} initial={g} />)}
    </div>
  )
}

function GatewayCard({ initial }: { initial: GatewaySettings }) {
  const [settings, setSettings] = useState(initial)
  const [form, setForm] = useState<Record<NumberField, string>>(() =>
    Object.fromEntries(FIELDS.map(({ key }) => [key, String(initial[key])])) as Record<NumberField, string>)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const label = GATEWAY_LABELS[settings.gateway]

  const numbers = Object.fromEntries(FIELDS.map(({ key }) => [key, Number(form[key].replace(',', '.'))])) as Record<NumberField, number>
  const invalid = FIELDS.some(({ key }) => !(numbers[key] >= 0))
    || numbers.percent_fee * (1 + numbers.vat_rate / 100) + numbers.extra_percent >= 50
  const exampleFee = invalid ? 0 : gatewayFee(EXAMPLE_BASE, { ...settings, ...numbers })

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
      .eq('gateway', settings.gateway)
    setSaving(false)
    setMsg(error ? { ok: false, text: `No se pudo guardar: ${error.message}` } : { ok: true, text: `Configuración de ${label} guardada.` })
  }

  return (
    <div style={{ background: B.bgCard, border: `1px solid ${B.border}`, borderRadius: 20, padding: 24, boxShadow: '0 4px 20px rgba(32,81,52,0.04)', display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'left' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontFamily: B.fontDisplay, fontSize: 18, color: B.green, margin: 0, fontWeight: 700 }}>💳 {label}</h3>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: B.textMuted }}>{SPLIT_TEXT[settings.gateway]} La plataforma no cobra comisión.</p>
        </div>
        <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 20, background: initial.enabled ? B.greenSoft : B.goldSoft, color: initial.enabled ? B.green : '#9E740E' }}>
          {initial.enabled ? (initial.sandbox ? 'Activa · pruebas' : 'Activa') : 'Apagada'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={check}>
          <input type="checkbox" checked={settings.enabled} onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })} style={{ accentColor: B.green, width: 16, height: 16 }} />
          Pagos con {label} activos
        </label>
        <label style={check}>
          <input type="checkbox" checked={settings.sandbox} onChange={(e) => setSettings({ ...settings, sandbox: e.target.checked })} style={{ accentColor: B.green, width: 16, height: 16 }} />
          Modo de pruebas (sandbox)
        </label>
        <label style={check}>
          <input type="checkbox" checked={settings.pass_fees_to_buyer} onChange={(e) => setSettings({ ...settings, pass_fees_to_buyer: e.target.checked })} style={{ accentColor: B.green, width: 16, height: 16 }} />
          Sumar la tarifa de la pasarela al pago del comprador
        </label>
        <div style={{ fontSize: 11, color: B.textFaint }}>
          Además de activarla aquí, agrega {label} a los métodos de pago de cada tienda (menú Tiendas, con envío en 0).
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {FIELDS.map(({ key, label: fieldLabel, hint }) => (
          <div key={key}>
            <label style={lbl}>{fieldLabel}</label>
            <input style={inp} inputMode="decimal" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value.replace(/[^\d.,]/g, '') })} />
            <div style={{ fontSize: 11, color: B.textFaint, marginTop: 4 }}>{hint}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#FAF7F0', border: `1px solid ${B.border}`, borderRadius: 12, padding: '12px 16px', fontSize: 13, color: B.text, lineHeight: 1.6 }}>
        <strong>Ejemplo:</strong> por un pago de {fmt(EXAMPLE_BASE)}, el comprador paga{' '}
        <strong>{fmt(EXAMPLE_BASE + exampleFee)}</strong> (tarifa {fmt(exampleFee)}) y el productor recibe{' '}
        {settings.pass_fees_to_buyer ? fmt(EXAMPLE_BASE) : 'el valor menos la tarifa'}.
      </div>

      {msg && <div style={{ fontSize: 13, fontWeight: 700, color: msg.ok ? B.green : B.terraDark }}>{msg.text}</div>}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        style={{ alignSelf: 'flex-start', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: B.fontBody, background: B.green, color: '#fff', opacity: saving ? 0.7 : 1 }}
      >
        {saving ? 'Guardando…' : `Guardar ${label}`}
      </button>
    </div>
  )
}
