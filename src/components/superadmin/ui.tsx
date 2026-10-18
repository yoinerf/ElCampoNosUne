import { useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../../lib/supabase'
import { STORE_NAMES } from '../../lib/stores'

// Tokens de marca, helpers y piezas de interfaz del panel de superadmin
// ─── Brand Tokens — Manual de Identidad "Campo Contemporáneo" ─────────────────

export const B = {
  bg: '#FAF8F5',           // Crema cálido de lectura y fondo principal
  bgCard: '#FFFFFF',       // Superficie tarjetas blanca limpia
  bgCardAlt: '#F5EEE6',    // Crema suave secundario
  border: '#EDE5DA',       // Borde sutil contemporáneo
  borderStrong: '#D9CFBF', // Borde reforzado
  sidebarBg: 'linear-gradient(180deg, #143A63 0%, #0B2340 100%)', // Azul profundo: distingue el panel del superadmin
  green: '#205134',        // Verde profundo oficial
  greenHover: '#183E27',
  greenLight: '#6BAA3D',   // Verde acento
  greenSoft: '#EAF4ED',    // Píldora verde suave
  terra: '#BA5A30',        // Terracota marca
  terraDark: '#9B4728',    // Terracota digital para UI y contraste
  terraSoft: '#FDEEE9',    // Píldora terracota suave
  gold: '#E5AE30',         // Dorado marca
  goldSoft: '#FEF8E8',     // Píldora dorada suave
  text: '#1C2B22',         // Texto principal oscuro nítido
  textMuted: '#685F54',    // Texto secundario cálido
  textFaint: '#9E9384',    // Texto tenue / placeholder
  fontDisplay: "'Poppins', sans-serif",
  fontBody: "'Nunito Sans', sans-serif",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function fmt(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
}
export function ago(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000
  if (d < 60) return 'Ahora'
  if (d < 3600) return `${Math.floor(d / 60)} min`
  if (d < 86400) return `${Math.floor(d / 3600)} h`
  return `${Math.floor(d / 86400)} días`
}

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Super Admin',
  admin_tienda: 'Admin de tienda',
  asociacion: 'Asociación',
  turismo: 'Turismo',
  comprador: 'Comprador',
}

export const ROLE_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  admin: { bg: B.terraSoft, color: B.terraDark, border: 'rgba(155,71,40,0.25)' },
  asociacion: { bg: B.greenSoft, color: B.green, border: 'rgba(32,81,52,0.25)' },
  turismo: { bg: '#F0F8EC', color: '#3F7B25', border: 'rgba(63,123,37,0.25)' },
  comprador: { bg: B.goldSoft, color: '#9E740E', border: 'rgba(158,116,14,0.25)' },
  admin_tienda: { bg: '#E3F2FD', color: '#1B4D82', border: 'rgba(27,77,130,0.25)' },
}

// Roles que pertenecen a una tienda: productores y administradores de tienda
export const STORE_ROLES = ['asociacion', 'admin_tienda']

// Tienda del productor: los de la Tienda Amazónica solo venden allí y sus productos no salen en El Campo Nos Une
// Las tiendas salen de store_settings: una tienda nueva aparece aquí sin cambiar código
export function StorePicker({ value, onChange, label = 'Tienda del productor' }: { value: string; onChange: (store: string) => void; label?: string }) {
  const [stores, setStores] = useState<{ store: string; name: string }[]>([
    { store: 'campo', name: STORE_NAMES.campo },
    { store: 'amazonica', name: STORE_NAMES.amazonica },
  ])
  useEffect(() => {
    supabase.from('store_settings').select('store, name').order('store').then(({ data }) => {
      if (data && data.length > 0) setStores(data as { store: string; name: string }[])
    })
  }, [])
  return (
    <div style={{ marginTop: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: B.green, marginBottom: 6, letterSpacing: 0.3, fontFamily: B.fontBody }}>{label}</label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {stores.map(({ store: s, name }) => {
          const sel = value === s
          return (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              style={{
                flex: '1 1 140px',
                padding: '10px 8px',
                borderRadius: 10,
                border: sel ? `2px solid ${B.green}` : `1.5px solid ${B.border}`,
                background: sel ? B.greenSoft : '#FFFFFF',
                color: sel ? B.green : B.textMuted,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: B.fontBody,
              }}
            >
              {name}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export const PAGE = 12

// ─── Sub-components ───────────────────────────────────────────────────────────

export function SItem({ icon, label, active, count, onClick }: {
  icon: ReactNode; label: string; active: boolean; count?: number; onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        borderRadius: 12,
        border: 'none',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
        background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
        color: active ? '#FFFFFF' : 'rgba(255,255,255,0.72)',
        fontFamily: B.fontBody,
        fontSize: 14,
        fontWeight: active ? 700 : 600,
        transition: 'all 180ms ease',
        position: 'relative',
      }}
      className="hover:bg-white/10 hover:text-white"
    >
      <span style={{ opacity: active ? 1 : 0.8, flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {count !== undefined && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            background: active ? '#E5AE30' : 'rgba(255,255,255,0.15)',
            color: active ? '#153823' : '#FFFFFF',
            padding: '2px 8px',
            borderRadius: 20,
          }}
        >
          {count}
        </span>
      )}
      {active && (
        <span
          style={{
            position: 'absolute',
            left: 0,
            top: '20%',
            bottom: '20%',
            width: 3.5,
            borderRadius: '0 4px 4px 0',
            background: '#E5AE30',
          }}
        />
      )}
    </button>
  )
}

export function StatCard({ emoji, value, label, sub, accent }: { emoji: string; value: string | number; label: string; sub?: string; accent: string }) {
  return (
    <div
      style={{
        background: B.bgCard,
        border: `1px solid ${B.border}`,
        borderRadius: 18,
        padding: '20px 22px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(32,81,52,0.04)',
      }}
    >
      <div style={{ position: 'absolute', top: -16, right: -16, width: 80, height: 80, borderRadius: '50%', background: accent, opacity: 0.08 }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: accent + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
          {emoji}
        </div>
        {sub && (
          <span style={{ fontSize: 11, color: accent, fontWeight: 800, background: accent + '14', padding: '3px 8px', borderRadius: 12 }}>
            {sub}
          </span>
        )}
      </div>
      <div style={{ fontFamily: B.fontDisplay, fontSize: 26, fontWeight: 800, color: B.text, lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: 13, color: B.textMuted, marginTop: 4, fontWeight: 600 }}>
        {label}
      </div>
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

export const I = {
  dash: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>,
  users: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>,
  box: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" /></svg>,
  exp: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></svg>,
  ads: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>,
  cog: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>,
  logout: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>,
  trash: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>,
  edit: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>,
  plus: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  store: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" /></svg>,
  menu: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>,
}
