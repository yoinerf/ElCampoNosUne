import { useState, type CSSProperties } from 'react'
import { supabase } from '../../lib/supabase'
import { useStores } from '../../lib/storesContext'
import { MAIN_STORE, PAYMENT_METHOD_LABELS, type StorePaymentMethod, type StoreSettings, type TransferInfo } from '../../lib/stores'
import { B } from './ui'

// Tiendas de la plataforma (public.store_settings). Crear una tienda aquí le da vitrina en
// /<ruta>, su propia marca, carrito, métodos de pago y envío, sin tocar código. Para que
// alguien la administre, crea un usuario "Admin de tienda" asignado a ella.

const METHODS: StorePaymentMethod[] = ['CashOnDelivery', 'BankTransfer', 'Cash']
const RESERVED_SLUGS = ['productos', 'experiencias', 'nosotros', 'mi-cuenta', 'panel', 'superadmin', 'admin-tienda', 'assets']
const TRANSFER_FIELDS: { key: keyof TransferInfo; label: string; placeholder?: string }[] = [
  { key: 'bank', label: 'Banco', placeholder: 'Bancolombia' },
  { key: 'accountType', label: 'Tipo de cuenta', placeholder: 'Cuenta de Ahorros' },
  { key: 'accountNumber', label: 'Número de cuenta' },
  { key: 'accountHolder', label: 'Titular' },
  { key: 'nit', label: 'NIT' },
  { key: 'nequi', label: 'Nequi / Daviplata' },
  { key: 'whatsapp', label: 'WhatsApp para comprobantes', placeholder: '573001234567' },
  { key: 'instructions', label: 'Instrucciones adicionales' },
]

type StoreForm = {
  store: string
  name: string
  slug: string
  tagline: string
  description: string
  payment_methods: StorePaymentMethod[]
  shipping_fee: string
  payment_timeout_hours: string
  active: boolean
  sort_order: string
  transfer_info: TransferInfo
}

const toForm = (s: StoreSettings): StoreForm => ({
  store: s.store,
  name: s.name,
  slug: s.slug ?? '',
  tagline: s.tagline ?? '',
  description: s.description ?? '',
  payment_methods: s.payment_methods,
  shipping_fee: String(s.shipping_fee ?? 0),
  payment_timeout_hours: s.payment_timeout_hours != null ? String(s.payment_timeout_hours) : '',
  active: s.active,
  sort_order: String(s.sort_order ?? 0),
  transfer_info: { ...s.transfer_info },
})

const NEW_STORE: StoreForm = {
  store: '',
  name: '',
  slug: '',
  tagline: '',
  description: '',
  payment_methods: ['BankTransfer', 'Cash'],
  shipping_fee: '0',
  payment_timeout_hours: '',
  active: true,
  sort_order: '20',
  transfer_info: {},
}

/** "Tienda Licores" → "tienda-licores" */
const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

function validate(form: StoreForm, isNew: boolean, all: StoreSettings[]): string | null {
  const isMain = form.store === MAIN_STORE
  if (isNew) {
    if (!/^[a-z0-9_]{2,30}$/.test(form.store)) return 'El código de la tienda debe tener de 2 a 30 letras minúsculas, números o "_".'
    if (all.some((s) => s.store === form.store)) return 'Ya existe una tienda con ese código.'
  }
  if (!form.name.trim()) return 'El nombre es obligatorio.'
  if (!isMain) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.slug)) return 'La ruta solo puede tener letras minúsculas, números y guiones (ej: tienda-licores).'
    if (RESERVED_SLUGS.includes(form.slug)) return 'Esa ruta está reservada por la plataforma.'
    if (all.some((s) => s.slug === form.slug && s.store !== form.store)) return 'Otra tienda ya usa esa ruta.'
  }
  if (form.payment_methods.length === 0) return 'Elige al menos un método de pago.'
  if (!(Number(form.shipping_fee) >= 0)) return 'El costo de envío debe ser un número mayor o igual a 0.'
  if (form.payment_timeout_hours && !(Number(form.payment_timeout_hours) > 0)) return 'El plazo de pago debe ser un número de horas mayor a 0.'
  return null
}

const lbl: CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: B.green, marginBottom: 5, fontFamily: B.fontBody }
const inp: CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${B.border}`, fontSize: 14,
  fontFamily: B.fontBody, boxSizing: 'border-box', background: '#FFFFFF', color: B.text, outline: 'none',
}
const btn: CSSProperties = { border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: B.fontBody }

export default function StoresManager() {
  const { allStores, reload } = useStores()
  const [editing, setEditing] = useState<{ form: StoreForm; isNew: boolean } | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const set = (patch: Partial<StoreForm>) => setEditing((e) => (e ? { ...e, form: { ...e.form, ...patch } } : e))

  const save = async () => {
    if (!editing) return
    const { form, isNew } = editing
    const error = validate(form, isNew, allStores)
    if (error) { setMsg({ ok: false, text: error }); return }

    const transfer: TransferInfo = {}
    for (const { key } of TRANSFER_FIELDS) {
      const value = form.transfer_info[key]?.trim()
      if (value) transfer[key] = value
    }
    const row = {
      name: form.name.trim(),
      slug: form.store === MAIN_STORE ? null : form.slug,
      tagline: form.tagline.trim() || null,
      description: form.description.trim() || null,
      payment_methods: form.payment_methods,
      shipping_fee: Number(form.shipping_fee),
      payment_timeout_hours: form.payment_timeout_hours ? Number(form.payment_timeout_hours) : null,
      // La tienda principal no se puede desactivar
      active: form.store === MAIN_STORE ? true : form.active,
      sort_order: Number(form.sort_order) || 0,
      transfer_info: { ...transfer },
    }

    setSaving(true)
    const { error: dbError } = isNew
      ? await supabase.from('store_settings').insert({ store: form.store, ...row })
      : await supabase.from('store_settings').update(row).eq('store', form.store)
    setSaving(false)
    if (dbError) { setMsg({ ok: false, text: `No se pudo guardar la tienda: ${dbError.message}` }); return }
    await reload()
    setEditing(null)
    setMsg({ ok: true, text: isNew ? `Tienda "${row.name}" creada. Su vitrina está en /${row.slug}.` : 'Tienda actualizada.' })
  }

  return (
    <div style={{ background: '#FFFFFF', border: `1px solid ${B.border}`, borderRadius: 20, padding: 24, boxShadow: '0 4px 20px rgba(32,81,52,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
        <h3 style={{ fontFamily: B.fontDisplay, fontSize: 20, color: B.green, margin: 0, fontWeight: 700 }}>🏪 Tiendas</h3>
        {!editing && (
          <button type="button" onClick={() => { setMsg(null); setEditing({ form: { ...NEW_STORE, transfer_info: {} }, isNew: true }) }} style={{ ...btn, background: B.green, color: '#fff' }}>
            + Nueva tienda
          </button>
        )}
      </div>
      <p style={{ color: B.textMuted, fontSize: 13, margin: '0 0 18px' }}>
        Cada tienda tiene su vitrina, carrito, métodos de pago y envío. Para que alguien la administre, crea un usuario con rol "Admin de tienda" y asígnale la tienda.
      </p>

      {msg && (
        <div style={{ marginBottom: 14, background: msg.ok ? B.greenSoft : '#FDEDED', color: msg.ok ? B.green : '#C53030', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontWeight: 700 }}>{msg.text}</div>
      )}

      {!editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {allStores.map((s) => (
            <div key={s.store} style={{ background: '#FAF7F0', border: `1px solid ${B.border}`, borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: B.text }}>
                  {s.name}{' '}
                  {s.store === MAIN_STORE && <span style={{ fontSize: 11, color: B.green, background: B.greenSoft, padding: '2px 8px', borderRadius: 20, marginLeft: 4 }}>Principal</span>}
                  {!s.active && <span style={{ fontSize: 11, color: '#9E740E', background: B.goldSoft, padding: '2px 8px', borderRadius: 20, marginLeft: 4 }}>Inactiva</span>}
                </div>
                <div style={{ fontSize: 12, color: B.textMuted, marginTop: 2 }}>
                  {s.slug ? `/${s.slug}` : '/'} · {s.payment_methods.map((m) => PAYMENT_METHOD_LABELS[m] ?? m).join(', ')} · Envío ${s.shipping_fee.toLocaleString('es-CO')}
                </div>
              </div>
              <button type="button" onClick={() => { setMsg(null); setEditing({ form: toForm(s), isNew: false }) }} style={{ ...btn, background: '#FFFFFF', color: B.green, border: `1.5px solid ${B.border}` }}>
                ✏️ Editar
              </button>
            </div>
          ))}
        </div>
      ) : (
        <StoreFormFields editing={editing} set={set} />
      )}

      {editing && (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
          <button type="button" onClick={() => { setEditing(null); setMsg(null) }} style={{ ...btn, background: '#FFFFFF', color: B.textMuted, border: `1px solid ${B.borderStrong}` }}>
            Cancelar
          </button>
          <button type="button" onClick={save} disabled={saving} style={{ ...btn, background: B.green, color: '#fff', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Guardando...' : editing.isNew ? 'Crear tienda' : 'Guardar cambios'}
          </button>
        </div>
      )}
    </div>
  )
}

function StoreFormFields({ editing, set }: { editing: { form: StoreForm; isNew: boolean }; set: (patch: Partial<StoreForm>) => void }) {
  const { form, isNew } = editing
  const isMain = form.store === MAIN_STORE
  const grid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={grid}>
        <div>
          <label style={lbl}>Nombre *</label>
          <input
            style={inp}
            value={form.name}
            placeholder="Tienda Licores"
            onChange={(e) => {
              const name = e.target.value
              // Al crear, el código y la ruta se sugieren a partir del nombre
              set(isNew ? { name, slug: slugify(name), store: slugify(name).replace(/-/g, '_').replace(/^tienda_/, '') } : { name })
            }}
          />
        </div>
        <div>
          <label style={lbl}>Código interno {isNew ? '*' : ''}</label>
          <input style={{ ...inp, opacity: isNew ? 1 : 0.6 }} value={form.store} disabled={!isNew} placeholder="licores" onChange={(e) => set({ store: e.target.value.toLowerCase() })} title="Identifica la tienda en productos, pedidos y perfiles. No se puede cambiar después." />
        </div>
        {!isMain && (
          <div>
            <label style={lbl}>Ruta de la vitrina *</label>
            <input style={inp} value={form.slug} placeholder="tienda-licores" onChange={(e) => set({ slug: e.target.value.toLowerCase() })} />
            <div style={{ fontSize: 11, color: B.textFaint, marginTop: 4 }}>Se verá en {window.location.origin}/{form.slug || 'ruta'}</div>
          </div>
        )}
      </div>

      <div style={grid}>
        <div>
          <label style={lbl}>Lema (título de la vitrina)</label>
          <input style={inp} value={form.tagline} placeholder="Licores artesanales de nuestras regiones" onChange={(e) => set({ tagline: e.target.value })} />
        </div>
        <div>
          <label style={lbl}>Descripción corta</label>
          <input style={inp} value={form.description} placeholder="Directo de las destilerías locales" onChange={(e) => set({ description: e.target.value })} />
        </div>
      </div>

      <div>
        <label style={lbl}>Métodos de pago *</label>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {METHODS.map((m) => {
            const checked = form.payment_methods.includes(m)
            return (
              <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, border: `1.5px solid ${checked ? B.green : B.border}`, background: checked ? B.greenSoft : '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: checked ? B.green : B.textMuted }}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => set({ payment_methods: checked ? form.payment_methods.filter((x) => x !== m) : [...form.payment_methods, m] })}
                  style={{ accentColor: B.green }}
                />
                {PAYMENT_METHOD_LABELS[m]}
              </label>
            )
          })}
        </div>
        <div style={{ fontSize: 11, color: B.textFaint, marginTop: 4 }}>Con transferencia o efectivo, el productor solo prepara y envía después de confirmar el pago.</div>
      </div>

      <div style={grid}>
        <div>
          <label style={lbl}>Costo de envío (COP)</label>
          <input style={inp} inputMode="numeric" value={form.shipping_fee} onChange={(e) => set({ shipping_fee: e.target.value.replace(/\D/g, '') })} />
          <div style={{ fontSize: 11, color: B.textFaint, marginTop: 4 }}>0 = cada vendedor acuerda el envío con el comprador (no se suma al total).</div>
        </div>
        <div>
          <label style={lbl}>Plazo para pagar (horas)</label>
          <input style={inp} inputMode="numeric" value={form.payment_timeout_hours} placeholder="Sin plazo" onChange={(e) => set({ payment_timeout_hours: e.target.value.replace(/\D/g, '') })} />
        </div>
        <div>
          <label style={lbl}>Orden en el menú</label>
          <input style={inp} inputMode="numeric" value={form.sort_order} onChange={(e) => set({ sort_order: e.target.value.replace(/\D/g, '') })} />
        </div>
      </div>

      {!isMain && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: B.text, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.active} onChange={(e) => set({ active: e.target.checked })} style={{ accentColor: B.green, width: 16, height: 16 }} />
          Tienda activa (visible en el menú y con vitrina)
        </label>
      )}

      <div>
        <div style={{ fontFamily: B.fontDisplay, fontSize: 15, fontWeight: 700, color: B.green, marginBottom: 8 }}>🏦 Datos para transferencias</div>
        <div style={grid}>
          {TRANSFER_FIELDS.map(({ key, label, placeholder }) => (
            <div key={key}>
              <label style={lbl}>{label}</label>
              <input
                style={inp}
                value={form.transfer_info[key] ?? ''}
                placeholder={placeholder}
                onChange={(e) => set({ transfer_info: { ...form.transfer_info, [key]: e.target.value } })}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
