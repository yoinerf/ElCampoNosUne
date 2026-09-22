import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { clearPromoSession } from '../lib/promoSession'
import {
  toColombiaInputString,
  fromColombiaInputToISO,
  isAdvertisementActive,
  formatColombiaDateTime,
  getColombiaNowForInput,
} from '../lib/dateColombia'
import logoSrc from '../assets/logo-nofond.png'
import ProductModal from '../components/ProductModal'
import ExperienceModal from '../components/ExperienceModal'

// ─── Types ────────────────────────────────────────────────────────────────────

type SuperSection = 'dashboard' | 'users' | 'products' | 'experiences' | 'ads' | 'settings'

interface UserRow {
  id: string
  first_name: string
  last_name: string
  org_name: string
  user_type: string
  department: string
  municipality: string
  created_at: string
}

interface ProductRow {
  id: string
  title: string
  producer: string
  producer_id: string
  price: number
  stock: string
  unit: string
  category: string
  category_id: string
  origin: string
  description: string
  img: string
  certified?: boolean
}

interface ExperienceRow {
  id: string
  title: string
  host: string
  host_id: string
  price: number
  capacity: string
  duration: string
  description: string
  img: string
  tags: string[]
}

interface AdRow {
  id: string
  type: 'product' | 'experience' | 'external'
  product_id: string | null
  experience_id: string | null
  title: string
  image_url: string | null
  link_url?: string | null
  starts_at: string
  ends_at: string
  active: boolean
  created_at: string
}

interface Props {
  onNavigate: (tab: any) => void
  activeNav?: string
  onProfileClick?: () => void
  userRole?: string
}

// ─── Brand Tokens — Manual de Identidad "Campo Contemporáneo" ─────────────────

const B = {
  bg: '#FAF8F5',           // Crema cálido de lectura y fondo principal
  bgCard: '#FFFFFF',       // Superficie tarjetas blanca limpia
  bgCardAlt: '#F5EEE6',    // Crema suave secundario
  border: '#EDE5DA',       // Borde sutil contemporáneo
  borderStrong: '#D9CFBF', // Borde reforzado
  sidebarBg: 'linear-gradient(180deg, #153823 0%, #0F2819 100%)', // Verde profundo institucional
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

function fmt(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
}
function ago(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000
  if (d < 60) return 'Ahora'
  if (d < 3600) return `${Math.floor(d / 60)} min`
  if (d < 86400) return `${Math.floor(d / 3600)} h`
  return `${Math.floor(d / 86400)} días`
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Super Admin',
  asociacion: 'Asociación',
  turismo: 'Turismo',
  comprador: 'Comprador',
}

const ROLE_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  admin: { bg: B.terraSoft, color: B.terraDark, border: 'rgba(155,71,40,0.25)' },
  asociacion: { bg: B.greenSoft, color: B.green, border: 'rgba(32,81,52,0.25)' },
  turismo: { bg: '#F0F8EC', color: '#3F7B25', border: 'rgba(63,123,37,0.25)' },
  comprador: { bg: B.goldSoft, color: '#9E740E', border: 'rgba(158,116,14,0.25)' },
}

const PAGE = 12

// ─── Sub-components ───────────────────────────────────────────────────────────

function SItem({ icon, label, active, count, onClick }: {
  icon: React.ReactNode; label: string; active: boolean; count?: number; onClick: () => void
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

function StatCard({ emoji, value, label, sub, accent }: { emoji: string; value: string | number; label: string; sub?: string; accent: string }) {
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

const I = {
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SuperAdminScreen({ onNavigate }: Props) {
  const [section, setSection] = useState<SuperSection>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const [users, setUsers] = useState<UserRow[]>([])
  const [products, setProducts] = useState<ProductRow[]>([])
  const [experiences, setExperiences] = useState<ExperienceRow[]>([])
  const [ads, setAds] = useState<AdRow[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string; business_type: string }[]>([])
  const [stats, setStats] = useState({ users: 0, products: 0, experiences: 0, reservations: 0, income: 0 })

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const [productModal, setProductModal] = useState<{ open: boolean; editId: string | null; initialData?: any }>({ open: false, editId: null })
  const [expModal, setExpModal] = useState<{ open: boolean; editId: string | null; initialData?: any }>({ open: false, editId: null })

  // Ad Modal State
  const [adModal, setAdModal] = useState<Partial<AdRow> | null>(null)
  const [adSaving, setAdSaving] = useState(false)
  const [adUploading, setAdUploading] = useState(false)
  const adFileInputRef = useRef<HTMLInputElement>(null)

  const [userEditModal, setUserEditModal] = useState<UserRow | null>(null)
  const [userSaving, setUserSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{ type: string; id: string; name: string } | null>(null)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500) }

  const loadAll = async () => {
    setLoading(true)
    try {
      const [
        { data: usersData },
        { data: prodsData },
        { data: expsData },
        { data: adsData },
        { data: catsData },
        { data: resData },
      ] = await Promise.all([
        supabase.from('profiles').select('id, first_name, last_name, org_name, user_type, department, municipality, created_at').order('created_at', { ascending: false }),
        supabase.from('products').select('*, images(*)').order('created_at', { ascending: false }),
        supabase.from('experiences').select('*, images(*)').order('created_at', { ascending: false }),
        supabase.from('advertisements').select('*').order('created_at', { ascending: false }),
        supabase.from('categories').select('id, name, business_type').eq('active', true),
        supabase.from('reservations').select('id, total'),
      ])

      setUsers((usersData || []) as UserRow[])

      const userMap = new Map((usersData || []).map((u: any) => [u.id, u]))

      const mappedProds = (prodsData || []).map((p: any) => {
        const u = userMap.get(p.producer_id)
        const producerName = u?.org_name?.trim() || `${u?.first_name ?? ''} ${u?.last_name ?? ''}`.trim() || p.producer || 'Productor'
        return {
          ...p,
          producer: producerName,
          img: p.images?.find((i: any) => i.is_primary)?.image_url || p.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&h=300&fit=crop',
        }
      }) as ProductRow[]
      setProducts(mappedProds)

      const mappedExps = (expsData || []).map((e: any) => {
        const u = userMap.get(e.host_id)
        const hostName = u?.org_name?.trim() || `${u?.first_name ?? ''} ${u?.last_name ?? ''}`.trim() || e.host || 'Comunidad local'
        return {
          ...e,
          host: hostName,
          img: e.images?.find((i: any) => i.is_primary)?.image_url || e.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=400&h=300&fit=crop',
        }
      }) as ExperienceRow[]
      setExperiences(mappedExps)

      setAds((adsData || []) as AdRow[])
      setCategories((catsData || []) as { id: string; name: string; business_type: string }[])

      const totalIncome = (resData || []).reduce((sum: number, r: any) => sum + (Number(r.total) || 0), 0)
      setStats({
        users: (usersData || []).length,
        products: mappedProds.length,
        experiences: mappedExps.length,
        reservations: resData?.length || 0,
        income: totalIncome,
      })
    } catch (e) {
      console.error('Error loading super admin data:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [])

  const switchSection = (s: SuperSection) => { setSection(s); setSidebarOpen(false); setPage(1); setSearch('') }

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return
    const { type, id } = confirmDelete
    let error: any = null
    if (type === 'product') ({ error } = await supabase.from('products').delete().eq('id', id))
    else if (type === 'experience') ({ error } = await supabase.from('experiences').delete().eq('id', id))
    else if (type === 'user') ({ error } = await supabase.from('profiles').delete().eq('id', id))
    else if (type === 'ad') ({ error } = await supabase.from('advertisements').delete().eq('id', id))
    if (!error) { showToast('✅ Eliminado correctamente'); setConfirmDelete(null); loadAll() }
    else showToast('❌ Error: ' + error.message)
  }

  const handleSaveProduct = async (formData: any) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const payload = {
      title: formData.title.trim(),
      price: Number(formData.price),
      unit: formData.unit || 'uds',
      category_id: formData.category_id || null,
      certified: formData.certified ?? true,
      stock: `${formData.stockNum || '0'}`,
      description: formData.description?.trim() || null,
    }
    if (productModal.editId) {
      await supabase.from('products').update(payload).eq('id', productModal.editId)
      if (formData.uploadedImages && formData.uploadedImages.length > 0) {
        if (formData.uploadedImages.some((i: any) => i.isPrimary)) {
          await supabase.from('images').update({ is_primary: false }).eq('product_id', productModal.editId)
        }
        const rows = formData.uploadedImages.map((img: any) => ({
          product_id: productModal.editId,
          experience_id: null,
          storage_path: img.storagePath,
          image_url: img.imageUrl,
          is_primary: img.isPrimary,
          sort_order: img.sortOrder,
        }))
        const { error: insErr } = await supabase.from('images').insert(rows)
        if (insErr) console.error('Error al registrar imágenes en SuperAdmin:', insErr.message)
      }
    } else {
      const { data: pd } = await supabase.from('profiles').select('org_name, first_name, last_name').eq('id', user.id).single()
      const orgName = pd?.org_name || `${pd?.first_name} ${pd?.last_name}`.trim() || 'Admin'
      const { data: newProd } = await supabase.from('products').insert([{ ...payload, producer_id: user.id, producer: orgName, rating: 5, reviews: 0 }]).select('id').single()
      if (newProd && formData.uploadedImages?.length > 0) {
        const rows = formData.uploadedImages.map((img: any) => ({ product_id: newProd.id, experience_id: null, storage_path: img.storagePath, image_url: img.imageUrl, is_primary: img.isPrimary, sort_order: img.sortOrder }))
        await supabase.from('images').insert(rows)
      }
    }
    setProductModal({ open: false, editId: null })
    showToast('✅ Producto guardado correctamente')
    loadAll()
  }

  const handleSaveExperience = async (formData: any) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const payload = {
      title: formData.title.trim(),
      price: Number(formData.price),
      capacity: `${formData.capacity || '10'} personas`,
      duration: formData.duration || '2 horas',
      description: formData.description?.trim() || null,
      tags: formData.tags ? formData.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : ['Experiencia'],
      featured: true,
    }
    if (expModal.editId) {
      await supabase.from('experiences').update(payload).eq('id', expModal.editId)
      if (formData.uploadedImages && formData.uploadedImages.length > 0) {
        if (formData.uploadedImages.some((i: any) => i.isPrimary)) {
          await supabase.from('images').update({ is_primary: false }).eq('experience_id', expModal.editId)
        }
        const rows = formData.uploadedImages.map((img: any) => ({
          product_id: null,
          experience_id: expModal.editId,
          storage_path: img.storagePath,
          image_url: img.imageUrl,
          is_primary: img.isPrimary,
          sort_order: img.sortOrder,
        }))
        const { error: insErr } = await supabase.from('images').insert(rows)
        if (insErr) console.error('Error al registrar imágenes de experiencia en SuperAdmin:', insErr.message)
      }
    } else {
      const { data: pd } = await supabase.from('profiles').select('org_name, first_name, last_name').eq('id', user.id).single()
      const orgName = pd?.org_name || `${pd?.first_name} ${pd?.last_name}`.trim() || 'Admin'
      const { data: newExp } = await supabase.from('experiences').insert([{ ...payload, host_id: user.id, host: orgName, rating: 5, reviews: 0 }]).select('id').single()
      if (newExp && formData.uploadedImages?.length > 0) {
        const rows = formData.uploadedImages.map((img: any) => ({ product_id: null, experience_id: newExp.id, storage_path: img.storagePath, image_url: img.imageUrl, is_primary: img.isPrimary, sort_order: img.sortOrder }))
        await supabase.from('images').insert(rows)
      }
    }
    setExpModal({ open: false, editId: null })
    showToast('✅ Experiencia guardada correctamente')
    loadAll()
  }

  const handleSaveUser = async () => {
    if (!userEditModal) return
    setUserSaving(true)
    const { error } = await supabase.from('profiles').update({
      first_name: userEditModal.first_name,
      last_name: userEditModal.last_name,
      org_name: userEditModal.org_name,
      user_type: userEditModal.user_type,
    }).eq('id', userEditModal.id)

    if (!error) {
      // Sincronizar nombre en productos y experiencias del usuario editado
      const displayName = userEditModal.org_name?.trim()
        || `${userEditModal.first_name ?? ''} ${userEditModal.last_name ?? ''}`.trim()
        || 'Productor'
      await Promise.all([
        supabase.from('products').update({ producer: displayName }).eq('producer_id', userEditModal.id),
        supabase.from('experiences').update({ host: displayName }).eq('host_id', userEditModal.id),
      ])
      showToast('✅ Usuario actualizado')
      setUserEditModal(null)
      loadAll()
    } else {
      showToast('❌ Error: ' + error.message)
    }
    setUserSaving(false)
  }

  // Subir imagen de anuncio a Supabase Storage
  const handleUploadAdImage = async (file: File) => {
    if (!file) return
    setAdUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const storagePath = `ads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from('product-images').upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      })
      if (upErr) {
        showToast('❌ Error al subir imagen: ' + upErr.message)
        return
      }
      const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(storagePath)
      setAdModal(prev => prev ? { ...prev, image_url: publicUrl } : null)
      showToast('✅ Imagen subida correctamente')
    } catch (err: any) {
      showToast('❌ Error: ' + err.message)
    } finally {
      setAdUploading(false)
    }
  }

  const handleSaveAd = async () => {
    if (!adModal) return
    setAdSaving(true)
    // Se excluye link_url: el anuncio redirige directamente al producto o experiencia
    // Se guardan las fechas siempre con la zona horaria de Colombia (-05:00)
    const payload: any = {
      type: adModal.type || 'product',
      title: adModal.title?.trim() || '',
      image_url: adModal.image_url || null,
      starts_at: fromColombiaInputToISO(adModal.starts_at || ''),
      ends_at: fromColombiaInputToISO(adModal.ends_at || ''),
      active: adModal.active ?? true,
      product_id: adModal.type === 'product' ? adModal.product_id || null : null,
      experience_id: adModal.type === 'experience' ? adModal.experience_id || null : null,
    }
    let error: any = null
    if (adModal.id) {
      ({ error } = await supabase.from('advertisements').update(payload).eq('id', adModal.id))
    } else {
      ({ error } = await supabase.from('advertisements').insert([payload]))
    }
    setAdSaving(false)
    if (!error) {
      clearPromoSession()
      showToast('✅ Anuncio guardado correctamente')
      setAdModal(null)
      loadAll()
    } else {
      showToast('❌ Error: ' + error.message)
    }
  }

  // Filtered data
  const q = search.trim().toLowerCase()
  const filteredUsers = users.filter(u => !q || `${u.first_name} ${u.last_name} ${u.org_name} ${u.user_type}`.toLowerCase().includes(q))
  const filteredProds = products.filter(p => !q || p.title.toLowerCase().includes(q) || p.producer.toLowerCase().includes(q))
  const filteredExps = experiences.filter(e => !q || e.title.toLowerCase().includes(q) || e.host.toLowerCase().includes(q))
  const filteredAds = ads.filter(a => !q || a.title.toLowerCase().includes(q))

  const getPagedData = (data: any[]) => {
    const total = Math.max(1, Math.ceil(data.length / PAGE))
    const pg = Math.min(page, total)
    return { items: data.slice((pg - 1) * PAGE, pg * PAGE), total, pg }
  }

  // Styles — Paleta moderna "El Campo Nos Une"
  const inp: React.CSSProperties = {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 12,
    boxSizing: 'border-box',
    border: `1.5px solid ${B.borderStrong}`,
    background: '#FFFFFF',
    color: B.text,
    fontSize: 14,
    outline: 'none',
    fontFamily: B.fontBody,
    transition: 'border-color 0.2s',
  }
  const lbl: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 700,
    color: B.green,
    marginBottom: 6,
    letterSpacing: 0.3,
    fontFamily: B.fontBody,
  }
  const btnPrimary: React.CSSProperties = {
    background: `linear-gradient(135deg, ${B.green} 0%, #153823 100%)`,
    color: '#FFFFFF',
    border: 'none',
    padding: '10px 20px',
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    boxShadow: '0 2px 10px rgba(32,81,52,0.2)',
    fontFamily: B.fontBody,
    transition: 'all 0.2s ease',
  }
  const btnDanger: React.CSSProperties = {
    background: B.terraSoft,
    color: B.terraDark,
    border: '1px solid rgba(155,71,40,0.25)',
    padding: '7px 12px',
    borderRadius: 9,
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontFamily: B.fontBody,
    transition: 'all 0.2s ease',
  }
  const btnEdit: React.CSSProperties = {
    background: B.greenSoft,
    color: B.green,
    border: `1px solid rgba(32,81,52,0.25)`,
    padding: '7px 12px',
    borderRadius: 9,
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontFamily: B.fontBody,
    transition: 'background 0.2s',
  }

  const sidebarNav = [
    { id: 'dashboard' as SuperSection, label: 'Dashboard', icon: I.dash },
    { id: 'users' as SuperSection, label: 'Usuarios', icon: I.users, count: stats.users },
    { id: 'products' as SuperSection, label: 'Productos', icon: I.box, count: stats.products },
    { id: 'experiences' as SuperSection, label: 'Experiencias', icon: I.exp, count: stats.experiences },
    { id: 'ads' as SuperSection, label: 'Anuncios', icon: I.ads, count: ads.length },
    { id: 'settings' as SuperSection, label: 'Configuración', icon: I.cog },
  ]

  const sectionLabels: Record<SuperSection, string> = {
    dashboard: 'Dashboard General',
    users: 'Gestión de Usuarios',
    products: 'Catálogo de Productos',
    experiences: 'Catálogo de Experiencias',
    ads: 'Gestión de Anuncios',
    settings: 'Configuración del Sistema',
  }

  // Pagination Bar
  const PagBar = ({ total, pg }: { total: number; pg: number }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0 6px', flexWrap: 'wrap', gap: 10 }}>
      <span style={{ fontSize: 13, color: B.textMuted, fontWeight: 600 }}>Página {pg} de {total}</span>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={pg === 1}
          style={{
            padding: '6px 14px',
            borderRadius: 9,
            border: `1px solid ${B.borderStrong}`,
            background: '#FFFFFF',
            color: pg === 1 ? B.textFaint : B.green,
            cursor: pg === 1 ? 'default' : 'pointer',
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          ← Anterior
        </button>
        {Array.from({ length: Math.min(total, 5) }, (_, i) => i + 1).map(n => (
          <button
            key={n}
            onClick={() => setPage(n)}
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              border: `1px solid ${pg === n ? B.green : B.border}`,
              background: pg === n ? B.green : '#FFFFFF',
              color: pg === n ? '#FFFFFF' : B.textMuted,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {n}
          </button>
        ))}
        <button
          onClick={() => setPage(p => Math.min(total, p + 1))}
          disabled={pg === total}
          style={{
            padding: '6px 14px',
            borderRadius: 9,
            border: `1px solid ${B.borderStrong}`,
            background: '#FFFFFF',
            color: pg === total ? B.textFaint : B.green,
            cursor: pg === total ? 'default' : 'pointer',
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          Siguiente →
        </button>
      </div>
    </div>
  )

  const TH = ({ children }: { children: React.ReactNode }) => (
    <th style={{ padding: '14px 18px', fontSize: 12, fontWeight: 700, color: B.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, whiteSpace: 'nowrap', borderBottom: `1.5px solid ${B.border}`, fontFamily: B.fontDisplay, background: '#FAF7F0' }}>
      {children}
    </th>
  )
  const TD = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
    <td style={{ padding: '14px 18px', fontSize: 13, color: B.text, borderBottom: `1px solid ${B.border}`, ...style }}>
      {children}
    </td>
  )

  const SearchBar = ({ placeholder }: { placeholder: string }) => (
    <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: 420 }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={B.textFaint} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}>
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="text"
        placeholder={placeholder}
        value={search}
        onChange={e => { setSearch(e.target.value); setPage(1) }}
        style={{ ...inp, paddingLeft: 40, width: '100%', background: '#FFFFFF' }}
      />
    </div>
  )

  // ─── RENDER ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: B.bg, fontFamily: B.fontBody, color: B.text }}>

      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 45, background: 'rgba(21,56,35,0.4)', backdropFilter: 'blur(4px)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── SIDEBAR (Verde Profundo Institucional) ── */}
      <aside
        className={sidebarOpen ? '!flex' : 'hidden md:flex'}
        style={{
          width: 250,
          flexShrink: 0,
          flexDirection: 'column',
          background: B.sidebarBg,
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 50,
          boxShadow: '4px 0 24px rgba(21,56,35,0.12)',
        }}
      >
        {/* Logo area */}
        <div style={{ padding: '24px 20px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <img
            src={logoSrc}
            alt="El Campo Nos Une"
            style={{
              height: 56,
              width: 'auto',
              display: 'block',
              filter: 'brightness(0) invert(1)',
            }}
          />
          <span
            style={{
              background: 'linear-gradient(135deg, #BA5A30 0%, #9B4728 100%)',
              color: '#FFFFFF',
              fontSize: 10,
              fontWeight: 800,
              padding: '4px 14px',
              borderRadius: 20,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              boxShadow: '0 2px 8px rgba(186,90,48,0.3)',
            }}
          >
            ⚡ Super Admin
          </span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
          {sidebarNav.map(item => (
            <SItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={section === item.id}
              count={'count' in item ? item.count : undefined}
              onClick={() => switchSection(item.id)}
            />
          ))}
        </nav>

        {/* User footer */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#BA5A30', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, flexShrink: 0 }}>
            ⚡
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Super Administrador
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
              El Campo Nos Une
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              clearPromoSession()
              await supabase.auth.signOut()
              window.location.href = '/'
            }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', padding: 6 }}
            className="hover:text-white"
            title="Cerrar sesión"
          >
            {I.logout}
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }} className="md:ml-[250px]">

        {/* Sticky Clean Topbar */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 30,
            background: '#FFFFFF',
            borderBottom: `1px solid ${B.border}`,
            padding: '0 28px',
            height: 70,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            boxShadow: '0 2px 10px rgba(32,81,52,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              className="flex md:hidden"
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                border: `1px solid ${B.borderStrong}`,
                background: '#FAF8F5',
                cursor: 'pointer',
                color: B.green,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {I.menu}
            </button>
            <div>
              <h1 style={{ margin: 0, fontFamily: B.fontDisplay, fontSize: 20, fontWeight: 700, color: B.green, lineHeight: 1.2 }}>
                {sectionLabels[section]}
              </h1>
              <p style={{ margin: 0, fontSize: 12, color: B.textMuted, fontWeight: 600 }}>
                Control y superpoderes sobre toda la plataforma
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              onClick={() => onNavigate('market')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#FAF7F0',
                color: B.green,
                border: `1px solid ${B.borderStrong}`,
                borderRadius: 10,
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              className="hover:bg-[#EAF4ED]"
              title="Abrir la tienda para ver cómo ven los usuarios"
            >
              {I.store}
              <span className="hidden sm:inline">Ver Tienda</span>
            </button>

            {section === 'products' && (
              <button type="button" onClick={() => setProductModal({ open: true, editId: null })} style={btnPrimary}>
                {I.plus} <span>Nuevo Producto</span>
              </button>
            )}
            {section === 'experiences' && (
              <button type="button" onClick={() => setExpModal({ open: true, editId: null })} style={btnPrimary}>
                {I.plus} <span>Nueva Experiencia</span>
              </button>
            )}
            {section === 'ads' && (
              <button
                type="button"
                onClick={() => setAdModal({
                  type: 'product',
                  active: true,
                  starts_at: getColombiaNowForInput(),
                  ends_at: getColombiaNowForInput(14),
                })}
                style={btnPrimary}
              >
                {I.plus} <span>Nuevo Anuncio</span>
              </button>
            )}
          </div>
        </header>

        {/* Content View */}
        <main style={{ flex: 1, padding: '28px', boxSizing: 'border-box' }}>
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse" style={{ background: '#FFFFFF', borderRadius: 18, height: 130, border: `1px solid ${B.border}` }} />
              ))}
            </div>
          ) : <>

            {/* ═══ 1. DASHBOARD OVERVIEW ═══ */}
            {section === 'dashboard' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                  <StatCard emoji="👥" value={stats.users} label="Usuarios registrados" accent={B.green} />
                  <StatCard emoji="📦" value={stats.products} label="Productos en catálogo" accent={B.gold} />
                  <StatCard emoji="🌄" value={stats.experiences} label="Experiencias vivas" accent={B.terra} />
                  <StatCard emoji="🛒" value={stats.reservations} label="Pedidos y reservas" accent={B.greenLight} />
                  <StatCard emoji="💰" value={fmt(stats.income)} label="Ingresos transaccionados" accent="#B8860B" />
                  <StatCard emoji="📢" value={`${ads.filter(a => a.active).length} / ${ads.length}`} label="Anuncios en rotación" accent={B.terraDark} />
                </div>

                {/* Acciones Rápidas */}
                <div>
                  <h3 style={{ fontFamily: B.fontDisplay, fontSize: 13, color: B.textMuted, margin: '0 0 14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    Módulos y Gestión Rápida
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14 }}>
                    {[
                      { s: 'users' as SuperSection, emoji: '👥', title: 'Usuarios', desc: 'Gestionar roles, datos y perfiles', color: B.green },
                      { s: 'products' as SuperSection, emoji: '📦', title: 'Productos', desc: 'Crear, editar o moderar inventario', color: B.gold },
                      { s: 'experiences' as SuperSection, emoji: '🌄', title: 'Experiencias', desc: 'Turismo, cupos y anfitriones', color: B.terra },
                      { s: 'ads' as SuperSection, emoji: '📢', title: 'Anuncios', desc: 'Destacar productos en la tienda', color: B.greenLight },
                    ].map(qa => (
                      <button
                        key={qa.s}
                        type="button"
                        onClick={() => switchSection(qa.s)}
                        style={{
                          background: B.bgCard,
                          border: `1px solid ${B.border}`,
                          borderRadius: 18,
                          padding: '18px 20px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 16,
                          boxShadow: '0 2px 10px rgba(32,81,52,0.03)',
                          transition: 'all 200ms ease',
                          fontFamily: B.fontBody,
                        }}
                        className="hover:border-[#205134] hover:shadow-md hover:scale-[1.01]"
                      >
                        <div style={{ width: 48, height: 48, borderRadius: 14, background: qa.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                          {qa.emoji}
                        </div>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: B.text, fontFamily: B.fontDisplay }}>{qa.title}</div>
                          <div style={{ fontSize: 12, color: B.textMuted, marginTop: 2 }}>{qa.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Distribución de Usuarios */}
                <div style={{ background: B.bgCard, border: `1px solid ${B.border}`, borderRadius: 20, padding: '24px 26px', boxShadow: '0 2px 12px rgba(32,81,52,0.03)' }}>
                  <h3 style={{ fontFamily: B.fontDisplay, fontSize: 16, color: B.green, margin: '0 0 16px', fontWeight: 700 }}>
                    Distribución de Usuarios por Rol
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
                    {['admin', 'asociacion', 'turismo', 'comprador'].map(role => {
                      const count = users.filter(u => u.user_type === role).length
                      const pct = stats.users > 0 ? Math.round((count / stats.users) * 100) : 0
                      const st = ROLE_STYLES[role] || { bg: '#F5F5F5', color: '#333', border: '#ddd' }
                      return (
                        <div key={role} style={{ background: st.bg, border: `1px solid ${st.border}`, borderRadius: 14, padding: '16px 18px' }}>
                          <div style={{ fontSize: 28, fontWeight: 800, color: st.color, fontFamily: B.fontDisplay }}>{count}</div>
                          <div style={{ fontSize: 13, color: B.textMuted, marginTop: 2, fontWeight: 600 }}>{ROLE_LABELS[role]}</div>
                          <div style={{ fontSize: 11, color: st.color, marginTop: 6, fontWeight: 800 }}>{pct}% del total</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ═══ 2. USERS MANAGEMENT ═══ */}
            {section === 'users' && (() => {
              const { items, total, pg } = getPagedData(filteredUsers)
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <SearchBar placeholder="Buscar por nombre, organización, rol..." />
                    <span style={{ fontSize: 13, color: B.textMuted, fontWeight: 600 }}>{filteredUsers.length} usuarios registrados</span>
                  </div>

                  <div style={{ background: B.bgCard, border: `1px solid ${B.border}`, borderRadius: 18, overflow: 'hidden', boxShadow: '0 2px 12px rgba(32,81,52,0.04)' }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr>
                            <TH>Usuario</TH>
                            <TH>Organización</TH>
                            <TH>Rol</TH>
                            <TH>Ubicación</TH>
                            <TH>Registro</TH>
                            <TH>Acciones</TH>
                          </tr>
                        </thead>
                        <tbody>
                          {items.length === 0 ? (
                            <tr><td colSpan={6} style={{ padding: 48, textAlign: 'center', color: B.textMuted, fontSize: 14 }}>No se encontraron usuarios</td></tr>
                          ) : (
                            items.map(u => {
                              const st = ROLE_STYLES[u.user_type] || { bg: '#eee', color: '#555', border: '#ddd' }
                              return (
                                <tr key={u.id} className="hover:bg-[#FAF8F5]">
                                  <TD>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: B.greenSoft, border: `1px solid rgba(32,81,52,0.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, color: B.green, fontWeight: 800 }}>
                                        {(u.first_name?.[0] || u.org_name?.[0] || '?').toUpperCase()}
                                      </div>
                                      <div>
                                        <div style={{ fontWeight: 700, color: B.text, fontSize: 14 }}>{u.first_name} {u.last_name}</div>
                                        <div style={{ fontSize: 11, color: B.textFaint }}>ID: {u.id.slice(0, 8)}…</div>
                                      </div>
                                    </div>
                                  </TD>
                                  <TD>{u.org_name || '—'}</TD>
                                  <TD>
                                    <span style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}`, fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20 }}>
                                      {ROLE_LABELS[u.user_type] || u.user_type}
                                    </span>
                                  </TD>
                                  <TD style={{ color: B.textMuted, fontSize: 13 }}>{[u.municipality, u.department].filter(Boolean).join(', ') || '—'}</TD>
                                  <TD style={{ color: B.textMuted, fontSize: 13 }}>{ago(u.created_at)}</TD>
                                  <TD>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                      <button type="button" style={btnEdit} onClick={() => setUserEditModal({ ...u })}>✏️ Editar</button>
                                      <button type="button" style={btnDanger} onClick={() => setConfirmDelete({ type: 'user', id: u.id, name: `${u.first_name} ${u.last_name}` })}>{I.trash}</button>
                                    </div>
                                  </TD>
                                </tr>
                              )
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <PagBar total={total} pg={pg} />
                </div>
              )
            })()}

            {/* ═══ 3. PRODUCTS MANAGEMENT ═══ */}
            {section === 'products' && (() => {
              const { items, total, pg } = getPagedData(filteredProds)
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <SearchBar placeholder="Buscar por nombre, productor..." />
                    <span style={{ fontSize: 13, color: B.textMuted, fontWeight: 600 }}>{filteredProds.length} productos en catálogo</span>
                  </div>

                  <div style={{ background: B.bgCard, border: `1px solid ${B.border}`, borderRadius: 18, overflow: 'hidden', boxShadow: '0 2px 12px rgba(32,81,52,0.04)' }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr>
                            <TH>Producto</TH>
                            <TH>Productor</TH>
                            <TH>Precio</TH>
                            <TH>Stock</TH>
                            <TH>Estado</TH>
                            <TH>Acciones</TH>
                          </tr>
                        </thead>
                        <tbody>
                          {items.length === 0 ? (
                            <tr><td colSpan={6} style={{ padding: 48, textAlign: 'center', color: B.textMuted, fontSize: 14 }}>Sin productos registrados</td></tr>
                          ) : (
                            items.map(p => {
                              const stock = parseInt(p.stock) || 0
                              const isOut = stock === 0
                              const isLow = stock > 0 && stock < 10
                              return (
                                <tr key={p.id} className="hover:bg-[#FAF8F5]">
                                  <TD>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                      <img src={p.img} alt={p.title} style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', flexShrink: 0, border: `1px solid ${B.border}` }} />
                                      <div>
                                        <div style={{ fontWeight: 700, color: B.text, fontSize: 14 }}>{p.title}</div>
                                        <div style={{ fontSize: 11, color: B.textFaint }}>Unidad: {p.unit || 'uds'}</div>
                                      </div>
                                    </div>
                                  </TD>
                                  <TD style={{ fontSize: 13, color: B.textMuted }}>{p.producer}</TD>
                                  <TD style={{ color: B.green, fontWeight: 800, fontFamily: B.fontDisplay }}>{fmt(p.price)}</TD>
                                  <TD style={{ fontWeight: 700, color: isOut ? '#C53030' : isLow ? '#B8860B' : B.green }}>
                                    {stock} uds.
                                  </TD>
                                  <TD>
                                    <span
                                      style={{
                                        background: isOut ? '#FFF1F0' : isLow ? B.goldSoft : B.greenSoft,
                                        color: isOut ? '#C53030' : isLow ? '#9E740E' : B.green,
                                        border: `1px solid ${isOut ? 'rgba(197,48,48,0.25)' : isLow ? 'rgba(158,116,14,0.25)' : 'rgba(32,81,52,0.25)'}`,
                                        fontSize: 11,
                                        fontWeight: 800,
                                        padding: '3px 10px',
                                        borderRadius: 20,
                                      }}
                                    >
                                      {isOut ? 'Agotado' : isLow ? 'Stock Bajo' : 'Activo'}
                                    </span>
                                  </TD>
                                  <TD>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                      <button
                                        type="button"
                                        style={btnEdit}
                                        onClick={() => setProductModal({
                                          open: true,
                                          editId: p.id,
                                          initialData: {
                                            title: p.title,
                                            category_id: p.category_id || '',
                                            price: String(p.price),
                                            unit: p.unit || 'uds',
                                            stockNum: String(parseInt(p.stock) || 0),
                                            description: p.description || '',
                                            img: p.img,
                                            certified: p.certified ?? true,
                                          },
                                        })}
                                      >
                                        ✏️
                                      </button>
                                      <button type="button" style={btnDanger} onClick={() => setConfirmDelete({ type: 'product', id: p.id, name: p.title })}>
                                        {I.trash}
                                      </button>
                                    </div>
                                  </TD>
                                </tr>
                              )
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <PagBar total={total} pg={pg} />
                </div>
              )
            })()}

            {/* ═══ 4. EXPERIENCES MANAGEMENT ═══ */}
            {section === 'experiences' && (() => {
              const { items, total, pg } = getPagedData(filteredExps)
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <SearchBar placeholder="Buscar por nombre, anfitrión..." />
                    <span style={{ fontSize: 13, color: B.textMuted, fontWeight: 600 }}>{filteredExps.length} experiencias vivas</span>
                  </div>

                  <div style={{ background: B.bgCard, border: `1px solid ${B.border}`, borderRadius: 18, overflow: 'hidden', boxShadow: '0 2px 12px rgba(32,81,52,0.04)' }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr>
                            <TH>Experiencia</TH>
                            <TH>Anfitrión</TH>
                            <TH>Precio</TH>
                            <TH>Cupos</TH>
                            <TH>Duración</TH>
                            <TH>Acciones</TH>
                          </tr>
                        </thead>
                        <tbody>
                          {items.length === 0 ? (
                            <tr><td colSpan={6} style={{ padding: 48, textAlign: 'center', color: B.textMuted, fontSize: 14 }}>Sin experiencias registradas</td></tr>
                          ) : (
                            items.map(e => {
                              const cupos = parseInt(e.capacity) || 0
                              return (
                                <tr key={e.id} className="hover:bg-[#FAF8F5]">
                                  <TD>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                      <img src={e.img} alt={e.title} style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', flexShrink: 0, border: `1px solid ${B.border}` }} />
                                      <div style={{ fontWeight: 700, color: B.text, fontSize: 14 }}>{e.title}</div>
                                    </div>
                                  </TD>
                                  <TD style={{ fontSize: 13, color: B.textMuted }}>{e.host}</TD>
                                  <TD style={{ color: B.green, fontWeight: 800, fontFamily: B.fontDisplay }}>{fmt(e.price)}</TD>
                                  <TD style={{ fontWeight: 700, color: cupos === 0 ? '#C53030' : B.green }}>
                                    {cupos === 0 ? 'Agotado' : `${cupos} cupos`}
                                  </TD>
                                  <TD style={{ fontSize: 13, color: B.textMuted }}>{e.duration}</TD>
                                  <TD>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                      <button
                                        type="button"
                                        style={btnEdit}
                                        onClick={() => setExpModal({
                                          open: true,
                                          editId: e.id,
                                          initialData: {
                                            title: e.title,
                                            price: String(e.price),
                                            capacity: String(parseInt(e.capacity) || 10),
                                            duration: e.duration,
                                            description: e.description || '',
                                            tags: (e.tags || []).join(', '),
                                          },
                                        })}
                                      >
                                        ✏️
                                      </button>
                                      <button type="button" style={btnDanger} onClick={() => setConfirmDelete({ type: 'experience', id: e.id, name: e.title })}>
                                        {I.trash}
                                      </button>
                                    </div>
                                  </TD>
                                </tr>
                              )
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <PagBar total={total} pg={pg} />
                </div>
              )
            })()}

            {/* ═══ 5. ADVERTISEMENTS MANAGEMENT ═══ */}
            {section === 'ads' && (() => {
              const { items, total, pg } = getPagedData(filteredAds)
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <SearchBar placeholder="Buscar por título de anuncio..." />
                    <span style={{ fontSize: 13, color: B.textMuted, fontWeight: 600 }}>
                      {filteredAds.length} anuncios registrados · {ads.filter(isAdvertisementActive).length} activos (Hora Colombia)
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18 }}>
                    {items.length === 0 ? (
                      <div style={{ gridColumn: '1/-1', background: '#FFFFFF', borderRadius: 18, border: `1px solid ${B.border}`, padding: 48, textAlign: 'center', color: B.textMuted, fontSize: 14 }}>
                        Aún no hay anuncios publicitarios configurados. Haz clic en <strong>+ Nuevo Anuncio</strong> para crear el primero.
                      </div>
                    ) : (
                      items.map(ad => {
                        const isActive = isAdvertisementActive(ad)
                        const relatedProd = ad.product_id ? products.find(p => p.id === ad.product_id) : null
                        const relatedExp = ad.experience_id ? experiences.find(e => e.id === ad.experience_id) : null
                        return (
                          <div
                            key={ad.id}
                            style={{
                              background: '#FFFFFF',
                              border: `1.5px solid ${isActive ? B.green : B.border}`,
                              borderRadius: 18,
                              overflow: 'hidden',
                              boxShadow: '0 4px 16px rgba(32,81,52,0.05)',
                              display: 'flex',
                              flexDirection: 'column',
                            }}
                          >
                            {ad.image_url ? (
                              <img src={ad.image_url} alt={ad.title} style={{ width: '100%', height: 140, objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '100%', height: 100, background: '#FAF7F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: B.textFaint, fontSize: 13 }}>
                                Sin imagen
                              </div>
                            )}
                            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                                  <div style={{ fontWeight: 800, color: B.text, fontSize: 15, lineHeight: 1.3 }}>
                                    {ad.title}
                                  </div>
                                  <span
                                    style={{
                                      background: isActive ? B.greenSoft : '#FFF1F0',
                                      color: isActive ? B.green : '#C53030',
                                      border: `1px solid ${isActive ? 'rgba(32,81,52,0.2)' : 'rgba(197,48,48,0.2)'}`,
                                      fontSize: 10,
                                      fontWeight: 800,
                                      padding: '2px 8px',
                                      borderRadius: 20,
                                      flexShrink: 0,
                                    }}
                                  >
                                    {isActive ? 'ACTIVO' : 'INACTIVO'}
                                  </span>
                                </div>

                                {/* Destino / Redirección clara */}
                                <div style={{ background: '#FAF7F0', border: `1px solid ${B.border}`, borderRadius: 10, padding: '8px 10px', marginBottom: 10, fontSize: 12 }}>
                                  <div style={{ color: B.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Redirige al producto / experiencia:</div>
                                  <div style={{ color: B.green, fontWeight: 700, marginTop: 2 }}>
                                    {relatedProd ? `📦 ${relatedProd.title}` : relatedExp ? `🌄 ${relatedExp.title}` : '— Sin destino asignado —'}
                                  </div>
                                </div>

                                <div style={{ fontSize: 12, color: B.textMuted, marginBottom: 14 }}>
                                  Vigencia: <strong>{formatColombiaDateTime(ad.starts_at)}</strong> al <strong>{formatColombiaDateTime(ad.ends_at)}</strong>
                                </div>
                              </div>

                              <div style={{ display: 'flex', gap: 8, paddingTop: 10, borderTop: `1px solid ${B.border}` }}>
                                <button
                                  type="button"
                                  style={{ ...btnEdit, flex: 1, justifyContent: 'center' } as any}
                                  onClick={() => setAdModal({ ...ad })}
                                >
                                  ✏️ Editar
                                </button>
                                <button
                                  type="button"
                                  style={{ ...btnDanger, flex: 1, justifyContent: 'center' } as any}
                                  onClick={() => setConfirmDelete({ type: 'ad', id: ad.id, name: ad.title })}
                                >
                                  {I.trash} Eliminar
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                  <PagBar total={total} pg={pg} />
                </div>
              )
            })()}

            {/* ═══ 6. SETTINGS ═══ */}
            {section === 'settings' && (
              <div style={{ maxWidth: 640, margin: '0 auto' }}>
                <div style={{ background: '#FFFFFF', border: `1px solid ${B.border}`, borderRadius: 20, padding: '36px', textAlign: 'center', boxShadow: '0 4px 20px rgba(32,81,52,0.04)' }}>
                  <div style={{ width: 64, height: 64, borderRadius: 20, background: B.greenSoft, color: B.green, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
                    ⚙️
                  </div>
                  <h3 style={{ fontFamily: B.fontDisplay, fontSize: 22, color: B.green, margin: '0 0 8px', fontWeight: 700 }}>
                    Configuración de Super Administrador
                  </h3>
                  <p style={{ color: B.textMuted, fontSize: 14, margin: '0 0 28px' }}>
                    Ajustes de infraestructura, pasarela de pagos y catálogo general.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
                    {[
                      { emoji: '🏷️', label: 'Gestión de Categorías', desc: 'Activar, pausar o crear categorías de mercado y turismo', coming: false, count: `${categories.length} activas` },
                      { emoji: '💳', label: 'Pasarela Wompi / Pagos', desc: 'Validación de webhook e integración segura en backend', coming: false, count: 'Conectado' },
                      { emoji: '📊', label: 'Reportes y Auditoría', desc: 'Exportación de reservas e historial financiero consolidado', coming: true },
                      { emoji: '🔔', label: 'Notificaciones y Alertas', desc: 'Alertas automáticas de stock agotado para asociaciones', coming: true },
                    ].map(item => (
                      <div key={item.label} style={{ background: '#FAF7F0', border: `1px solid ${B.border}`, borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                        <span style={{ fontSize: 26, flexShrink: 0 }}>{item.emoji}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: B.text }}>{item.label}</div>
                          <div style={{ fontSize: 12, color: B.textMuted, marginTop: 2 }}>{item.desc}</div>
                        </div>
                        {item.count && (
                          <span style={{ fontSize: 11, fontWeight: 800, background: B.greenSoft, color: B.green, padding: '4px 10px', borderRadius: 20 }}>
                            {item.count}
                          </span>
                        )}
                        {item.coming && (
                          <span style={{ fontSize: 11, fontWeight: 700, background: B.goldSoft, color: '#9E740E', padding: '4px 10px', borderRadius: 20 }}>
                            Próximamente
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>}
        </main>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          MODALES
      ══════════════════════════════════════════════════════════════════════════ */}

      {/* ── MODAL EDITAR USUARIO ── */}
      {userEditModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(21,56,35,0.45)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#FFFFFF', border: `1px solid ${B.borderStrong}`, borderRadius: 24, padding: 32, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <h3 style={{ fontFamily: B.fontDisplay, fontSize: 20, color: B.green, margin: '0 0 20px', fontWeight: 700 }}>
              ✏️ Editar Usuario
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={lbl}>Nombre</label>
                <input style={inp} value={userEditModal.first_name || ''} onChange={e => setUserEditModal({ ...userEditModal, first_name: e.target.value })} />
              </div>
              <div>
                <label style={lbl}>Apellido</label>
                <input style={inp} value={userEditModal.last_name || ''} onChange={e => setUserEditModal({ ...userEditModal, last_name: e.target.value })} />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Organización / Emprendimiento</label>
              <input style={inp} value={userEditModal.org_name || ''} onChange={e => setUserEditModal({ ...userEditModal, org_name: e.target.value })} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={lbl}>Rol en el ecosistema</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['admin', 'asociacion', 'turismo', 'comprador'].map(r => {
                  const sel = userEditModal.user_type === r
                  const st = ROLE_STYLES[r]
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setUserEditModal({ ...userEditModal, user_type: r })}
                      style={{
                        flex: '1 1 90px',
                        padding: '10px 8px',
                        borderRadius: 10,
                        border: sel ? `2px solid ${st.color}` : `1.5px solid ${B.border}`,
                        background: sel ? st.bg : '#FFFFFF',
                        color: sel ? st.color : B.textMuted,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: B.fontBody,
                      }}
                    >
                      {ROLE_LABELS[r]}
                    </button>
                  )
                })}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={() => setUserEditModal(null)}
                style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${B.borderStrong}`, background: '#FFFFFF', color: B.textMuted, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveUser}
                disabled={userSaving}
                style={{ ...btnPrimary, flex: 1, justifyContent: 'center', padding: 12, fontSize: 14, opacity: userSaving ? 0.7 : 1 }}
              >
                {userSaving ? 'Guardando…' : '✅ Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ANUNCIOS (Con subida de imágenes y redirección a producto) ── */}
      {adModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(21,56,35,0.45)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto' }}>
          <div style={{ background: '#FFFFFF', border: `1px solid ${B.borderStrong}`, borderRadius: 24, padding: 32, width: '100%', maxWidth: 540, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', margin: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontFamily: B.fontDisplay, fontSize: 20, color: B.green, margin: 0, fontWeight: 700 }}>
                📢 {adModal.id ? 'Editar Anuncio' : 'Nuevo Anuncio'}
              </h3>
              <button
                type="button"
                onClick={() => setAdModal(null)}
                style={{ background: 'none', border: 'none', fontSize: 22, color: B.textFaint, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Tipo de Anuncio */}
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Tipo de destino</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {(['product', 'experience'] as const).map(t => {
                  const sel = adModal.type === t
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAdModal({ ...adModal, type: t, product_id: undefined, experience_id: undefined })}
                      style={{
                        flex: 1,
                        padding: '11px',
                        borderRadius: 12,
                        border: sel ? `2px solid ${B.green}` : `1.5px solid ${B.border}`,
                        background: sel ? B.greenSoft : '#FFFFFF',
                        color: sel ? B.green : B.textMuted,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: B.fontBody,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      <span>{t === 'product' ? '📦 Producto de la Tienda' : '🌄 Experiencia'}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Selector de Producto o Experiencia (El anuncio debe redirigir aquí) */}
            {adModal.type === 'product' && (
              <div style={{ marginBottom: 16 }}>
                <label style={lbl}>Producto vinculado * (al dar clic el usuario irá directo a él)</label>
                <select
                  style={inp}
                  value={adModal.product_id || ''}
                  onChange={e => {
                    const selProd = products.find(p => p.id === e.target.value)
                    setAdModal({
                      ...adModal,
                      product_id: e.target.value,
                      // Si no tiene imagen asignada aún, usar por defecto la imagen del producto
                      image_url: adModal.image_url || selProd?.img || '',
                      title: adModal.title || (selProd ? `¡Disfruta de ${selProd.title}!` : ''),
                    })
                  }}
                >
                  <option value="">-- Seleccionar producto de la tienda --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.title} ({fmt(p.price)} - {p.producer})</option>
                  ))}
                </select>
              </div>
            )}

            {adModal.type === 'experience' && (
              <div style={{ marginBottom: 16 }}>
                <label style={lbl}>Experiencia vinculada * (al dar clic el usuario irá directo a ella)</label>
                <select
                  style={inp}
                  value={adModal.experience_id || ''}
                  onChange={e => {
                    const selExp = experiences.find(exp => exp.id === e.target.value)
                    setAdModal({
                      ...adModal,
                      experience_id: e.target.value,
                      image_url: adModal.image_url || selExp?.img || '',
                      title: adModal.title || (selExp ? `Vive la experiencia: ${selExp.title}` : ''),
                    })
                  }}
                >
                  <option value="">-- Seleccionar experiencia --</option>
                  {experiences.map(exp => (
                    <option key={exp.id} value={exp.id}>{exp.title} ({fmt(exp.price)} - {exp.host})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Título del anuncio */}
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Título del Anuncio *</label>
              <input
                style={inp}
                value={adModal.title || ''}
                placeholder="Ej: Cosecha fresca de la semana · Directo al hogar"
                onChange={e => setAdModal({ ...adModal, title: e.target.value })}
              />
            </div>

            {/* Subida de Imagen */}
            <div style={{ marginBottom: 18 }}>
              <label style={lbl}>Imagen del Anuncio *</label>

              <input
                type="file"
                ref={adFileInputRef}
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) handleUploadAdImage(file)
                }}
              />

              {adModal.image_url ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#FAF7F0', border: `1px solid ${B.border}`, borderRadius: 14, padding: 12 }}>
                  <img
                    src={adModal.image_url}
                    alt="Preview"
                    style={{ width: 80, height: 80, borderRadius: 10, objectFit: 'cover', border: `1px solid ${B.border}` }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: B.green, marginBottom: 4 }}>Imagen seleccionada</div>
                    <div style={{ fontSize: 11, color: B.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 8 }}>
                      {adModal.image_url}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => adFileInputRef.current?.click()}
                        disabled={adUploading}
                        style={{ background: '#FFFFFF', border: `1px solid ${B.borderStrong}`, padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, color: B.green, cursor: 'pointer' }}
                      >
                        {adUploading ? 'Subiendo…' : 'Cambiar imagen'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdModal({ ...adModal, image_url: '' })}
                        style={{ background: 'none', border: 'none', color: '#C53030', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => adFileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${B.borderStrong}`,
                    borderRadius: 14,
                    padding: '24px 16px',
                    textAlign: 'center',
                    background: '#FAF7F0',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s',
                  }}
                  className="hover:border-[#205134]"
                >
                  <div style={{ fontSize: 28, marginBottom: 6 }}>📷</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: B.green }}>
                    {adUploading ? 'Subiendo imagen a Supabase Storage…' : 'Haz clic aquí para seleccionar y subir una imagen'}
                  </div>
                  <div style={{ fontSize: 11, color: B.textMuted, marginTop: 4 }}>
                    Archivos JPG o PNG (máximo 6 MB)
                  </div>
                </div>
              )}
            </div>

            {/* Fechas de vigencia */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={lbl}>Fecha de Inicio *</label>
                  <input
                    type="datetime-local"
                    style={inp}
                    value={toColombiaInputString(adModal.starts_at)}
                    onChange={e => setAdModal({ ...adModal, starts_at: e.target.value })}
                  />
                </div>
                <div>
                  <label style={lbl}>Fecha de Finalización *</label>
                  <input
                    type="datetime-local"
                    style={inp}
                    value={toColombiaInputString(adModal.ends_at)}
                    onChange={e => setAdModal({ ...adModal, ends_at: e.target.value })}
                  />
                </div>
              </div>
              <span style={{ fontSize: 11, color: '#6A7D6E', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                🇨🇴 Horario oficial de Colombia (UTC-5)
              </span>
            </div>

            {/* Checkbox Activo */}
            <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10, background: '#FAF7F0', padding: '12px 14px', borderRadius: 12 }}>
              <input
                type="checkbox"
                id="ad-active"
                checked={adModal.active ?? true}
                onChange={e => setAdModal({ ...adModal, active: e.target.checked })}
                style={{ width: 18, height: 18, cursor: 'pointer', accentColor: B.green }}
              />
              <label htmlFor="ad-active" style={{ ...lbl, margin: 0, cursor: 'pointer', fontSize: 13, color: B.text }}>
                Anuncio activo en la tienda y pantallas principales
              </label>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={() => setAdModal(null)}
                style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${B.borderStrong}`, background: '#FFFFFF', color: B.textMuted, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveAd}
                disabled={adSaving || !adModal.title || !adModal.starts_at || !adModal.ends_at || (adModal.type === 'product' && !adModal.product_id)}
                style={{ ...btnPrimary, flex: 1, justifyContent: 'center', padding: 12, fontSize: 14, opacity: (adSaving || !adModal.title) ? 0.6 : 1 }}
              >
                {adSaving ? 'Guardando…' : '✅ Guardar Anuncio'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CONFIRM DELETE ── */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(21,56,35,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#FFFFFF', border: `1px solid ${B.borderStrong}`, borderRadius: 24, padding: 36, width: '100%', maxWidth: 440, textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: B.terraSoft, color: B.terraDark, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 16px', border: '1px solid rgba(155,71,40,0.2)' }}>
              ⚠️
            </div>
            <h3 style={{ fontFamily: B.fontDisplay, fontSize: 20, color: B.terraDark, margin: '0 0 8px', fontWeight: 700 }}>
              ¿Eliminar permanentemente?
            </h3>
            <p style={{ color: B.textMuted, fontSize: 14, margin: '0 0 6px' }}>
              Esta acción eliminará el registro de la base de datos de manera definitiva.
            </p>
            <p style={{ color: B.text, fontSize: 15, fontWeight: 800, margin: '0 0 26px', background: '#FAF7F0', padding: '8px 12px', borderRadius: 10, border: `1px solid ${B.border}` }}>
              "{confirmDelete.name}"
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                style={{ flex: 1, padding: 13, borderRadius: 12, border: `1px solid ${B.borderStrong}`, background: '#FFFFFF', color: B.textMuted, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                style={{ flex: 1, padding: 13, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #BA5A30 0%, #9B4728 100%)', color: '#FFFFFF', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(155,71,40,0.25)' }}
              >
                🗑️ Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST NOTIFICATION ── */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 26,
            right: 26,
            zIndex: 90,
            background: '#153823',
            border: `1px solid #205134`,
            color: '#FFFFFF',
            padding: '14px 22px',
            borderRadius: 14,
            fontSize: 14,
            fontWeight: 700,
            boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span>{toast}</span>
        </div>
      )}

      {/* ── MODAL PRODUCTO ── */}
      {productModal.open && (
        <ProductModal
          isOpen
          onClose={() => setProductModal({ open: false, editId: null })}
          onSave={handleSaveProduct}
          title={productModal.editId ? 'Editar Producto' : 'Nuevo Producto'}
          categories={categories.filter(c => c.business_type === 'asociacion')}
          initialData={productModal.initialData}
        />
      )}

      {/* ── MODAL EXPERIENCIA ── */}
      {expModal.open && (
        <ExperienceModal
          isOpen
          onClose={() => setExpModal({ open: false, editId: null })}
          onSave={handleSaveExperience}
          title={expModal.editId ? 'Editar Experiencia' : 'Nueva Experiencia'}
          categories={categories.filter(c => c.business_type === 'turismo')}
          initialData={expModal.initialData}
        />
      )}
    </div>
  )
}
