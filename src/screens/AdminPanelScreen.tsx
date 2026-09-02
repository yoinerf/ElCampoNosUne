import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import logoSrc from '../assets/logo-nofond.png'

type AdminSection = 'dashboard' | 'products' | 'experiences' | 'inventory' | 'reports' | 'settings'

interface ProductItem {
  id: string
  title: string
  producer: string
  producer_id?: string
  rating: number
  reviews: number
  price: number
  unit: string
  category_id?: string
  category?: string
  description?: string
  type: 'producto' | 'experiencia'
  certified: boolean
  img: string
  stock: string
  origin?: string
  created_at?: string
}

interface ActivityItem {
  id: string
  type: string
  title: string
  description: string
  created_at: string
}

interface Props {
  onNavigate: (tab: 'home' | 'market' | 'tourism' | 'profile') => void
  activeNav?: 'home' | 'market' | 'tourism' | 'profile'
  onProfileClick?: () => void
  userRole?: 'asociacion' | 'turismo' | 'comprador' | null
}

interface ProfileData {
  id: string
  first_name: string
  last_name: string
  org_name: string
  department: string
  municipality: string
  user_type: string
}

const PAGE_SIZE = 8

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `Hace ${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Hace ${hours}h`
  const days = Math.floor(hours / 24)
  return `Hace ${days}d`
}

function formatPrice(n: number) {
  return `$${n.toLocaleString('es-CO')}`
}

interface SidebarItemProps {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
}
function SidebarItem({ icon, label, active, onClick }: SidebarItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '11px 16px',
        borderRadius: 12,
        border: 'none',
        background: active ? '#205134' : 'transparent',
        color: active ? '#fff' : '#5A5248',
        fontFamily: "'Nunito Sans', sans-serif",
        fontSize: 14,
        fontWeight: active ? 700 : 600,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 180ms ease',
      }}
      className={!active ? 'hover:bg-[#20513410]' : ''}
    >
      <span style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }}>{icon}</span>
      {label}
    </button>
  )
}

export default function AdminPanelScreen({ onNavigate, userRole }: Props) {
  const [section, setSection] = useState<AdminSection>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [products, setProducts] = useState<ProductItem[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<ProfileData>({ id: '', first_name: '', last_name: '', org_name: '', department: '', municipality: '', user_type: userRole ?? 'asociacion' })
  const [stats, setStats] = useState({ activeItems: 0, salesThisMonth: 0, totalIncome: 0, lowStockCount: 0 })

  const [searchVal, setSearchVal] = useState('')
  const [catFilter, setCatFilter] = useState('Todas')
  const [page, setPage] = useState(1)

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', category_id: '', price: '', unit: 'uds', stockNum: '45', origin: '', description: '', img: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&h=400&fit=crop&auto=format' })

  const [profileForm, setProfileForm] = useState({ first_name: '', last_name: '', org_name: '', department: '', municipality: '', user_type: 'asociacion' })
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')

  // Datos dinámicos desde Supabase
  const [categories, setCategories] = useState<{ id: string; name: string; business_type: string }[]>([])
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([])

  const isTurismo = userRole === 'turismo'

  const loadData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const [{ data: profileData }, { data: userProducts }, { data: actData }, { data: catsData }, { data: deptsData }] = await Promise.all([
      supabase.from('profiles').select('id, first_name, last_name, org_name, department, municipality, user_type').eq('id', user.id).single(),
      supabase.from('products').select('*').eq('producer_id', user.id).order('created_at', { ascending: false }),
      supabase.from('activities').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(8),
      supabase.from('categories').select('id, name, business_type').eq('active', true).eq('business_type', userRole === 'turismo' ? 'turismo' : 'asociacion'),
      supabase.from('departments').select('id, name').order('name', { ascending: true }),
    ])

    if (profileData) {
      setProfile(profileData as ProfileData)
      setProfileForm({ first_name: profileData.first_name ?? '', last_name: profileData.last_name ?? '', org_name: profileData.org_name ?? '', department: profileData.department ?? '', municipality: profileData.municipality ?? '', user_type: profileData.user_type ?? 'asociacion' })
    }

    if (catsData && catsData.length > 0) setCategories(catsData as { id: string; name: string; business_type: string }[])
    if (deptsData && deptsData.length > 0) setDepartments(deptsData as { id: string; name: string }[])

    const prods = (userProducts ?? []) as ProductItem[]
    setProducts(prods)
    const lowStock = prods.filter((p) => { const n = parseInt(p.stock) || 0; return n < 20 }).length
    setStats({ activeItems: prods.length, salesThisMonth: 0, totalIncome: 0, lowStockCount: lowStock })

    if (actData && actData.length > 0) setActivities(actData as ActivityItem[])
    else setActivities([
      { id: '1', type: 'sale', title: 'Nueva venta', description: 'Productos', created_at: new Date(Date.now() - 7200000).toISOString() },
      { id: '2', type: 'product', title: 'Producto actualizado', description: 'Stock actualizado', created_at: new Date(Date.now() - 86400000).toISOString() },
    ])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const filtered = products.filter((p) => {
    const q = searchVal.trim().toLowerCase()
    const matchSearch = !q || p.title.toLowerCase().includes(q) || (p.producer || '').toLowerCase().includes(q)
    const categoryName = categories.find(c => c.id === p.category_id)?.name || p.category || ''
    const matchCat = catFilter === 'Todas' || categoryName === catFilter
    const matchSection = section === 'experiences' ? p.type === 'experiencia' : p.type !== 'experiencia'
    return matchSearch && matchCat && matchSection
  })
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleOpenCreate = () => {
    setEditingId(null)
    const defaultCatId = categories.length > 0 ? categories[0].id : ''
    const defaultDept = departments.length > 0 ? departments[0].name : ''
    setForm({ title: '', category_id: defaultCatId, price: '', unit: isTurismo ? 'pers' : 'uds', stockNum: '45', origin: defaultDept, description: '', img: isTurismo ? 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=600&h=400&fit=crop&auto=format' : 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&h=400&fit=crop&auto=format' })
    setShowModal(true)
  }

  const handleOpenEdit = (p: ProductItem) => {
    setEditingId(p.id)
    setForm({ title: p.title, category_id: p.category_id || '', price: String(p.price), unit: p.unit || 'uds', stockNum: String(parseInt(p.stock) || 0), origin: p.origin || '', description: p.description || '', img: p.img })
    setShowModal(true)
  }

  const handleSaveProduct = async () => {
    if (!form.title.trim() || !form.price) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const orgName = profile.org_name || `${profile.first_name} ${profile.last_name}`.trim() || 'Asociacion'
    // Payload compartido sin producer_id (RLS lo requiere solo en insert)
    const commonPayload = {
      title: form.title.trim(),
      producer: orgName,
      price: Number(form.price),
      unit: form.unit || 'uds',
      category_id: form.category_id || null,
      certified: true,
      img: form.img,
      stock: `${form.stockNum || '0'}`,
      description: form.description.trim(),
    }
    if (editingId) {
      const { error } = await supabase.from('products').update(commonPayload).eq('id', editingId)
      if (error) console.error('Error al actualizar:', error.message)
    } else {
      const { error } = await supabase.from('products').insert([{ ...commonPayload, producer_id: user.id, rating: 5, reviews: 0 }])
      if (error) console.error('Error al insertar:', error.message)
    }
    setSaving(false)
    setShowModal(false)
    loadData()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Seguro que quieres eliminar este elemento?')) return
    await supabase.from('products').delete().eq('id', id)
    setProducts((prev) => prev.filter((p) => p.id !== id))
  }

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    setProfileMsg('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSavingProfile(false); return }
    const { error } = await supabase.from('profiles').update({ first_name: profileForm.first_name, last_name: profileForm.last_name, org_name: profileForm.org_name, department: profileForm.department, municipality: profileForm.municipality, user_type: profileForm.user_type }).eq('id', user.id)
    setSavingProfile(false)
    if (error) { setProfileMsg('Error al guardar: ' + error.message) }
    else { setProfileMsg('Perfil actualizado. Recarga la app para aplicar cambios de rol.'); setProfile((prev) => ({ ...prev, ...profileForm })) }
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid #EDE4D8', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: "'Nunito Sans', sans-serif", background: '#FDFAF6', color: '#1C3A14' }
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: '#205134', fontFamily: "'Nunito Sans', sans-serif", marginBottom: 5 }

  const DashIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
  const ProdIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" /></svg>
  const ExpIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></svg>
  const InvIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /></svg>
  const RepIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
  const CogIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>

  const orgName = profile.org_name || `${profile.first_name} ${profile.last_name}`.trim() || 'Asociacion'
  const sidebarNav = [
    { id: 'dashboard' as AdminSection, label: 'Panel Principal', icon: <DashIcon /> },
    // Productores ven Productos; turismo ve Experiencias
    ...(!isTurismo ? [{ id: 'products' as AdminSection, label: 'Productos', icon: <ProdIcon /> }] : []),
    ...(isTurismo ? [{ id: 'experiences' as AdminSection, label: 'Experiencias', icon: <ExpIcon /> }] : []),
    { id: 'inventory' as AdminSection, label: 'Inventario', icon: <InvIcon /> },
    { id: 'reports' as AdminSection, label: 'Reportes y Ventas', icon: <RepIcon /> },
    { id: 'settings' as AdminSection, label: 'Configuracion', icon: <CogIcon /> },
  ]
  const sectionLabel: Record<AdminSection, string> = { dashboard: 'Panel Principal', products: 'Productos', experiences: 'Experiencias', inventory: 'Inventario', reports: 'Reportes y Ventas', settings: 'Configuracion de Perfil' }
  const isTableSection = section === 'products' || section === 'experiences'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F5EEE6', fontFamily: "'Nunito Sans', sans-serif" }}>

      {sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 30, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }} onClick={() => setSidebarOpen(false)} />
      )}

      {/* SIDEBAR */}
      <aside
        className={sidebarOpen ? '!flex' : 'hidden md:flex'}
        style={{ width: 240, flexShrink: 0, background: '#FDFAF6', borderRight: '1px solid #EDE4D8', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 40, boxShadow: '2px 0 16px rgba(32,81,52,0.06)' }}
      >
        <div style={{ padding: '24px 20px 16px', display: 'flex', justifyContent: 'center' }}>
          <img src={logoSrc} alt="Logo" style={{ height: 90, width: 'auto', display: 'block' }} />
        </div>

        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
          {sidebarNav.map((item) => (
            <SidebarItem key={item.id} icon={item.icon} label={item.label} active={section === item.id} onClick={() => { setSection(item.id); setSidebarOpen(false); setPage(1); setSearchVal(''); setCatFilter('Todas') }} />
          ))}
        </nav>

        <div style={{ padding: '14px 16px', borderTop: '1px solid #EDE4D8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#EAF3EC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#205134" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1C3A14', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {`${profile.first_name} ${profile.last_name}`.trim() || 'Administrador'}
              </div>
              <div style={{ fontSize: 11, color: '#8A8070' }}>{isTurismo ? 'Turismo' : 'Asociacion'}</div>
            </div>
            <button type="button" onClick={() => supabase.auth.signOut().then(() => onNavigate('home'))} title="Cerrar sesion" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C4622D', padding: 4 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }} className="md:ml-[240px]">
        <header style={{ position: 'sticky', top: 0, zIndex: 20, background: '#FDFAF6', borderBottom: '1px solid #EDE4D8', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, boxShadow: '0 2px 10px rgba(32,81,52,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button className="flex md:hidden items-center justify-center" type="button" onClick={() => setSidebarOpen(!sidebarOpen)} style={{ width: 38, height: 38, borderRadius: 10, border: 'none', background: '#EAF3EC', cursor: 'pointer', color: '#205134' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div>
              <h1 style={{ margin: 0, fontFamily: "'Poppins', sans-serif", fontSize: 20, fontWeight: 700, color: '#1C3A14', lineHeight: 1.2 }}>{sectionLabel[section]}</h1>
              <p style={{ margin: 0, fontSize: 12, color: '#8A8070', fontWeight: 600 }}>{isTurismo ? 'Gestiona tus experiencias' : 'Administra tu catalogo de productos'}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button type="button" onClick={() => onNavigate('market')} style={{ height: 38, padding: '0 16px', borderRadius: 10, border: '1px solid #EDE4D8', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, color: '#1C3A14', fontWeight: 700, fontSize: 14 }} className="hover:bg-[#F5EEE6]" title="Ir a la tienda">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" /></svg>
              Tienda
            </button>
            <button style={{ width: 38, height: 38, borderRadius: 10, border: '1px solid #EDE4D8', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5A5248' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
            </button>
            {isTableSection && (
              <button type="button" onClick={handleOpenCreate} style={{ display: 'flex', alignItems: 'center', gap: 8, background: section === 'experiences' ? '#9B4728' : '#205134', color: '#fff', border: 'none', borderRadius: 12, padding: '9px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'Nunito Sans', sans-serif", boxShadow: '0 4px 14px rgba(32,81,52,0.25)' }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
                {section === 'experiences' ? 'Nueva Experiencia' : 'Nuevo Producto'}
              </button>
            )}
          </div>
        </header>

        <main style={{ flex: 1, padding: '24px', boxSizing: 'border-box' }}>
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="animate-pulse" style={{ background: '#fff', borderRadius: 20, height: 100, border: '1px solid #EDE4D8' }} />)}
            </div>
          ) : (
            <>
              {/* DASHBOARD */}
              {section === 'dashboard' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                    {[
                      { emoji: '✅', value: stats.activeItems, label: 'Items activos', bg: '#EAF3EC', color: '#205134' },
                      { emoji: '📈', value: stats.salesThisMonth, label: isTurismo ? 'Reservas este mes' : 'Ventas este mes', bg: '#EAF3EC', color: '#205134' },
                      { emoji: '💰', value: formatPrice(stats.totalIncome), label: 'Ingresos totales', bg: '#FFF7E8', color: '#9B4728' },
                      { emoji: '⚠️', value: stats.lowStockCount, label: 'Stock bajo', bg: '#FEE9E1', color: '#C4622D' },
                    ].map((card) => (
                      <div key={card.label} style={{ background: '#fff', borderRadius: 20, padding: '20px 22px', border: '1px solid #EDE4D8', boxShadow: '0 4px 16px rgba(32,81,52,0.05)' }}>
                        <div style={{ width: 44, height: 44, borderRadius: 14, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 14 }}>{card.emoji}</div>
                        <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: 28, fontWeight: 700, color: card.color, lineHeight: 1.1 }}>{card.value}</div>
                        <div style={{ fontSize: 13, color: '#8A8070', marginTop: 4 }}>{card.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: '#fff', borderRadius: 22, padding: '22px 24px', border: '1px solid #EDE4D8', boxShadow: '0 4px 16px rgba(32,81,52,0.04)' }}>
                    <h3 style={{ fontFamily: "'Poppins', sans-serif", fontSize: 17, color: '#205134', margin: '0 0 18px', fontWeight: 700 }}>Actividad reciente</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {activities.map((act) => (
                        <div key={act.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid #F3ECE2' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6BAA3D', display: 'inline-block', flexShrink: 0 }} />
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#205134' }}>{act.title}</span>
                            <span style={{ fontSize: 13, color: '#5A5248' }}>· {act.description}</span>
                          </div>
                          <span style={{ fontSize: 12, color: '#8A8070', flexShrink: 0 }}>{timeAgo(act.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                    {[
                      isTurismo
                        ? { section: 'experiences' as AdminSection, label: 'Gestionar Experiencias', emoji: '🌄', desc: 'Edita tus paquetes y rutas', grad: 'linear-gradient(135deg, #FFEFDB, #FDE6D1)', text: '#9B4728' }
                        : { section: 'products' as AdminSection, label: 'Gestionar Productos', emoji: '📦', desc: 'Añade y edita tus productos', grad: 'linear-gradient(135deg, #E8F5E9, #C8E6C9)', text: '#205134' },
                      { section: 'reports' as AdminSection, label: 'Reportes y Ventas', emoji: '📈', desc: 'Consulta tus ingresos', grad: 'linear-gradient(135deg, #E3F2FD, #BBDEFB)', text: '#1B4D82' },
                      { section: 'inventory' as AdminSection, label: 'Ver Inventario', emoji: '📋', desc: 'Controla tu stock', grad: 'linear-gradient(135deg, #F1F8E9, #DCEDC8)', text: '#3D7A28' },
                    ].map((q) => (
                      <button key={q.section} type="button" onClick={() => setSection(q.section)} style={{ background: '#fff', border: '1px solid rgba(237,228,216,0.6)', borderRadius: 20, padding: 20, cursor: 'pointer', textAlign: 'left', transition: 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }} className="hover:shadow-lg hover:-translate-y-1 hover:border-[#D1C7B7]">
                        <div style={{ background: q.grad, width: 60, height: 60, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>{q.emoji}</div>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: '#1C3A14', fontFamily: "'Poppins', sans-serif", marginBottom: 2 }}>{q.label}</div>
                          <div style={{ fontSize: 13, color: '#6A7863', fontWeight: 500, fontFamily: "'Nunito Sans', sans-serif" }}>{q.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TABLA PRODUCTOS / EXPERIENCIAS */}
              {isTableSection && (
                <div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 18, alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: '1 1 240px' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#205134" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      <input type="text" placeholder="Buscar productos, tours..." value={searchVal} onChange={(e) => { setSearchVal(e.target.value); setPage(1) }} style={{ ...inputStyle, paddingLeft: 38, borderRadius: 12 }} />
                    </div>
                    <select value={catFilter} onChange={(e) => { setCatFilter(e.target.value); setPage(1) }} style={{ ...inputStyle, width: 'auto', flex: '0 1 180px', borderRadius: 12 }}>
                      <option value="Todas">Todas las categorias</option>
                      {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>

                  <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #EDE4D8', boxShadow: '0 4px 20px rgba(32,81,52,0.05)', overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ background: '#FDFAF6', borderBottom: '1px solid #EDE4D8' }}>
                            {['Miniatura', 'Nombre / Descripcion', 'Categoria', 'Precio', 'Stock / Cupos', 'Estado', 'Acciones'].map((h) => (
                              <th key={h} style={{ padding: '14px 18px', fontSize: 12, fontWeight: 700, color: '#8A8070', fontFamily: "'Poppins', sans-serif", whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: 0.4 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {paginated.length === 0 ? (
                            <tr><td colSpan={7} style={{ padding: 36, textAlign: 'center', color: '#8A8070', fontFamily: "'Nunito Sans', sans-serif", fontSize: 14 }}>
                              {searchVal || catFilter !== 'Todas' ? 'Sin resultados para la busqueda.' : `Aun no tienes ${section === 'experiences' ? 'experiencias' : 'productos'} registrados.`}
                            </td></tr>
                          ) : paginated.map((p) => {
                            const stockNum = parseInt(p.stock) || 0
                            const isLow = stockNum < 10
                            const none = stockNum === 0
                            return (
                              <tr key={p.id} style={{ borderBottom: '1px solid #F3ECE2' }} className="hover:bg-[#FDFAF6]">
                                <td style={{ padding: '12px 18px' }}>
                                  <img src={p.img} alt={p.title} style={{ width: 52, height: 52, borderRadius: 12, objectFit: 'cover' }} />
                                </td>
                                <td style={{ padding: '12px 18px', maxWidth: 220 }}>
                                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1C3A14', fontFamily: "'Nunito Sans', sans-serif" }}>{p.title}</div>
                                  <div style={{ fontSize: 12, color: '#8A8070', marginTop: 2 }}>{p.producer} · Colombia</div>
                                </td>
                                <td style={{ padding: '12px 18px' }}>
                                  <span style={{ background: p.type === 'experiencia' ? '#FEE9E1' : '#EAF3EC', color: p.type === 'experiencia' ? '#9B4728' : '#205134', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20 }}>
                                    {p.type === 'experiencia' ? 'Experiencia' : (categories.find(c => c.id === p.category_id)?.name || p.category || 'Sin categoría')}
                                  </span>
                                </td>
                                <td style={{ padding: '12px 18px', fontSize: 14, fontWeight: 700, color: '#9B4728', fontFamily: "'Poppins', sans-serif", whiteSpace: 'nowrap' }}>
                                  {formatPrice(p.price)}{p.unit && p.unit !== 'uds' ? ` / ${p.unit}` : ''}
                                </td>
                                <td style={{ padding: '12px 18px', fontSize: 13, color: '#5A5248', whiteSpace: 'nowrap' }}>
                                  {stockNum} {p.type === 'experiencia' ? 'cupos libres' : 'unidades'}
                                </td>
                                <td style={{ padding: '12px 18px' }}>
                                  <span style={{ background: stockNum === 0 ? '#fac0aaff' : isLow ? '#ffcd2871' : '#EAF3EC', color: stockNum === 0 ? '#C4622D' : isLow ? '#D06050' : '#205134', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>
                                    {stockNum === 0 ? 'Agotado' : isLow ? 'Bajo stock' : 'Activo'}
                                  </span>
                                </td>
                                <td style={{ padding: '12px 18px' }}>
                                  <div style={{ display: 'flex', gap: 6 }}>
                                    <button type="button" onClick={() => handleOpenEdit(p)} title="Editar" style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: '#EAF3EC', color: '#205134', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                    </button>
                                    <button type="button" onClick={() => handleDelete(p.id)} title="Eliminar" style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: '#FEE9E1', color: '#C4622D', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid #F3ECE2', flexWrap: 'wrap', gap: 10 }}>
                      <span style={{ fontSize: 13, color: '#8A8070' }}>Mostrando {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}-{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length} elementos</span>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '6px 14px', borderRadius: 10, border: '1px solid #EDE4D8', background: page === 1 ? '#F3ECE2' : '#fff', color: page === 1 ? '#C8BFA8' : '#205134', cursor: page === 1 ? 'default' : 'pointer', fontSize: 13, fontWeight: 700 }}>Anterior</button>
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((pg) => (
                          <button key={pg} onClick={() => setPage(pg)} style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: page === pg ? '#205134' : '#fff', color: page === pg ? '#fff' : '#205134', cursor: 'pointer', fontSize: 13, fontWeight: 700, boxShadow: page === pg ? '0 2px 8px rgba(32,81,52,0.2)' : 'none' }}>{pg}</button>
                        ))}
                        <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '6px 14px', borderRadius: 10, border: '1px solid #EDE4D8', background: page === totalPages ? '#F3ECE2' : '#fff', color: page === totalPages ? '#C8BFA8' : '#205134', cursor: page === totalPages ? 'default' : 'pointer', fontSize: 13, fontWeight: 700 }}>Siguiente</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* INVENTARIO */}
              {section === 'inventory' && (
                <div>
                  {products.filter(p => (parseInt(p.stock) || 0) < 20).length > 0 && (
                    <div style={{ background: '#FDF1E6', border: '1px solid #F3C38B', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, color: '#C4622D', fontSize: 14 }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                      <strong>Alerta:</strong> Hay productos por debajo del nivel de stock mínimo.
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
                    <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #EDE4D8', boxShadow: '0 4px 16px rgba(32,81,52,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#8A8070', letterSpacing: 0.5, marginBottom: 4 }}>TOTAL {isTurismo ? 'EXPERIENCIAS' : 'PRODUCTOS'}</div>
                        <div style={{ fontSize: 32, fontWeight: 800, color: '#1C3A14', lineHeight: 1 }}>{products.length}</div>
                      </div>
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#F5EEE6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{isTurismo ? '🌄' : '📦'}</div>
                    </div>
                    {!isTurismo && (
                      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #EDE4D8', boxShadow: '0 4px 16px rgba(32,81,52,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#8A8070', letterSpacing: 0.5, marginBottom: 4 }}>STOCK BAJO</div>
                          <div style={{ fontSize: 32, fontWeight: 800, color: '#1C3A14', lineHeight: 1 }}>{products.filter(p => (parseInt(p.stock) || 0) < 20 && (parseInt(p.stock) || 0) > 0).length}</div>
                        </div>
                        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#FDF1E6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>⚠️</div>
                      </div>
                    )}
                    <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #EDE4D8', boxShadow: '0 4px 16px rgba(32,81,52,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#8A8070', letterSpacing: 0.5, marginBottom: 4 }}>AGOTADOS</div>
                        <div style={{ fontSize: 32, fontWeight: 800, color: '#1C3A14', lineHeight: 1 }}>{products.filter(p => (parseInt(p.stock) || 0) === 0).length}</div>
                      </div>
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#FEE9E1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>❌</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                    {products.map((p) => {
                      const stockNum = parseInt(p.stock) || 0
                      const isLow = stockNum < 20
                      const none = stockNum === 0
                      const pct = Math.min(100, Math.max(5, (stockNum / 100) * 100))
                      return (
                        <div key={p.id} style={{ background: '#fff', borderRadius: 20, padding: 18, border: '1px solid #EDE4D8', boxShadow: '0 4px 16px rgba(32,81,52,0.05)', display: 'flex', alignItems: 'center', gap: 16 }}>
                          <img src={p.img} alt={p.title} style={{ width: 60, height: 60, borderRadius: 14, objectFit: 'cover', flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#1C3A14', marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
                            <div style={{ height: 6, borderRadius: 4, background: '#F3ECE2', overflow: 'hidden', marginBottom: 6 }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: none ? '#c42d2dff' : isLow ? '#fcb721ff' : '#205134', borderRadius: 4, transition: 'width 300ms' }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                              <span style={{ color: '#8A8070' }}>{stockNum} disponibles</span>
                              <span style={{ color: isLow ? '#f7b62cff' : none ? '#c42d2dff' : '#205134', fontWeight: 700 }}>
                                {isLow ? 'Bajo' : none ? 'Agotado' : 'OK'}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* REPORTES */}
              {section === 'reports' && (
                <div style={{ background: '#fff', borderRadius: 20, padding: 32, border: '1px solid #EDE4D8', textAlign: 'center' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
                  <h3 style={{ fontFamily: "'Poppins', sans-serif", fontSize: 20, color: '#205134', margin: '0 0 8px' }}>Reportes proximamente</h3>
                  <p style={{ color: '#8A8070', fontSize: 14 }}>Estamos construyendo los reportes de ventas e ingresos.</p>
                </div>
              )}

              {/* CONFIGURACION */}
              {section === 'settings' && (
                <div style={{ maxWidth: 700, margin: '0 auto' }}>
                  <div style={{ background: '#fff', borderRadius: 24, padding: 36, border: '1px solid rgba(237,228,216,0.5)', boxShadow: '0 8px 32px rgba(32,81,52,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid #F0E8DD' }}>
                      <div style={{ background: 'linear-gradient(135deg, #F5EEE6, #E8DED0)', width: 72, height: 72, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, color: '#205134' }}>
                        👤
                      </div>
                      <div>
                        <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: 26, color: '#1C3A14', margin: 0, fontWeight: 800 }}>Configuración de Perfil</h2>
                        <p style={{ margin: '6px 0 0', color: '#8A8070', fontSize: 15 }}>Actualiza tus datos personales y de organización.</p>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                      <div>
                        <label style={labelStyle}>Nombre</label>
                        <input value={profileForm.first_name} onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })} placeholder="Nombre" style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Apellido</label>
                        <input value={profileForm.last_name} onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })} placeholder="Apellido" style={inputStyle} />
                      </div>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <label style={labelStyle}>Nombre de organizacion / asociacion</label>
                      <input value={profileForm.org_name} onChange={(e) => setProfileForm({ ...profileForm, org_name: e.target.value })} placeholder="Ej: Cooperativa El Roble" style={inputStyle} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                      <div>
                        <label style={labelStyle}>Departamento</label>
                        <select value={profileForm.department} onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })} style={inputStyle}>
                          <option value="">Seleccionar...</option>
                          {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Municipio</label>
                        <input value={profileForm.municipality} onChange={(e) => setProfileForm({ ...profileForm, municipality: e.target.value })} placeholder="Municipio" style={inputStyle} />
                      </div>
                    </div>
                    <div style={{ marginBottom: 24 }}>
                      <label style={labelStyle}>Tipo de cuenta (Rol)</label>
                      <div style={{ background: '#FFF7E8', border: '1px solid #F0D099', borderRadius: 12, padding: '10px 14px', fontSize: 12, color: '#9B4728', fontWeight: 600, marginBottom: 10 }}>
                        Cambiar el rol afecta el tipo de contenido que puedes publicar. Requiere recargar la aplicacion.
                      </div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {[
                          { value: 'asociacion', label: 'Productos / Asociacion' },
                          { value: 'turismo', label: 'Turismo / Experiencias' },
                          { value: 'comprador', label: 'Comprador' },
                        ].map((opt) => (
                          <button key={opt.value} type="button" onClick={() => setProfileForm({ ...profileForm, user_type: opt.value })} style={{ flex: '1 1 140px', padding: '10px 8px', borderRadius: 12, border: profileForm.user_type === opt.value ? '2px solid #205134' : '1.5px solid #EDE4D8', background: profileForm.user_type === opt.value ? '#EAF3EC' : '#FDFAF6', color: profileForm.user_type === opt.value ? '#205134' : '#5A5248', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Nunito Sans', sans-serif", textAlign: 'center', transition: 'all 180ms' }}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {profileMsg && (
                      <div style={{ background: profileMsg.includes('Error') ? '#FEE9E1' : '#EAF3EC', color: profileMsg.includes('Error') ? '#C4622D' : '#205134', borderRadius: 12, padding: '10px 16px', fontSize: 13, fontWeight: 700, marginBottom: 16 }}>{profileMsg}</div>
                    )}
                    <button type="button" onClick={handleSaveProfile} disabled={savingProfile} style={{ width: '100%', padding: '13px', borderRadius: 14, border: 'none', background: '#205134', color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito Sans', sans-serif", opacity: savingProfile ? 0.7 : 1 }}>
                      {savingProfile ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* MODAL CREAR / EDITAR */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 520, padding: 28, boxShadow: '0 20px 50px rgba(0,0,0,0.2)', boxSizing: 'border-box', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontFamily: "'Poppins', sans-serif", fontSize: 20, color: '#205134', margin: 0, fontWeight: 700 }}>
                {editingId ? 'Editar item' : isTurismo ? 'Nueva experiencia' : 'Nuevo producto'}
              </h3>
              <button type="button" onClick={() => setShowModal(false)} style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: '#F3ECE2', cursor: 'pointer', fontSize: 18, color: '#9B4728', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>x</button>
            </div>
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={labelStyle}>Nombre</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ej: Cafe Especial Narino" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Categoria</label>
                <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} style={inputStyle}>
                  <option value="">Seleccionar...</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={labelStyle}>Precio ($ COP)</label>
                  <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="28000" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>{isTurismo ? 'Cupos disponibles' : 'Cantidad en Stock'}</label>
                  <input type="number" value={form.stockNum} onChange={(e) => setForm({ ...form, stockNum: e.target.value })} placeholder="45" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>URL de imagen</label>
                <input value={form.img} onChange={(e) => setForm({ ...form, img: e.target.value })} placeholder="https://..." style={inputStyle} />
                {form.img && <img src={form.img} alt="preview" style={{ marginTop: 8, width: '100%', height: 120, objectFit: 'cover', borderRadius: 12 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />}
              </div>
              <div>
                <label style={labelStyle}>Descripcion</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripcion detallada..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: 12, borderRadius: 14, border: 'none', background: '#F3ECE2', color: '#205134', fontWeight: 700, cursor: 'pointer', fontFamily: "'Nunito Sans', sans-serif" }}>Cancelar</button>
              <button type="button" onClick={handleSaveProduct} disabled={saving} style={{ flex: 1, padding: 12, borderRadius: 14, border: 'none', background: '#205134', color: '#fff', fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito Sans', sans-serif", opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

