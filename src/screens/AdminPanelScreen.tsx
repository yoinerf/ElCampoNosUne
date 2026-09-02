import { useState, useEffect } from 'react'
import ScreenShell from '../components/ScreenShell'
import { supabase } from '../lib/supabase'

type AdminTab = 'dashboard' | 'products' | 'inventory'

interface ProductItem {
  id: string
  title: string
  producer: string
  producer_id?: string
  rating: number
  reviews: number
  price: number
  unit: string
  category: string
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

const CATEGORIES = ['Cultivos', 'Cafés', 'Cacao', 'Lácteos', 'Dulces', 'Mieles', 'Procesados', 'Ecoturismo']
const DEPARTMENTS = ['Nariño', 'Boyacá', 'Caldas', 'Antioquia', 'Cundinamarca', 'Cauca', 'Huila', 'Santander', 'Tolima', 'Valle del Cauca']

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

export default function AdminPanelScreen({ onNavigate, activeNav, onProfileClick, userRole }: Props) {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard')
  const [products, setProducts] = useState<ProductItem[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [orgName, setOrgName] = useState('')
  const [stats, setStats] = useState({ activeItems: 0, salesThisMonth: 12, totalIncome: 480000, lowStockCount: 0 })

  // Estado para el modal de Crear/Editar
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    category: 'Cafés',
    price: '',
    unit: 'kg',
    stockNum: '45',
    origin: 'Nariño',
    description: '',
    img: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&h=400&fit=crop&auto=format',
  })

  const isTurismo = userRole === 'turismo'

  const loadData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // Cargar perfil
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_name, first_name, last_name, user_type')
        .eq('id', user.id)
        .single()

      if (profile) {
        setOrgName(profile.org_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Asociación de productores')
      }

      // Cargar productos del productor
      const { data: userProducts } = await supabase
        .from('products')
        .select('*')
        .eq('producer_id', user.id)
        .order('created_at', { ascending: false })

      if (userProducts) {
        setProducts(userProducts as ProductItem[])
        const activeCount = userProducts.length
        const lowStock = userProducts.filter((p: any) => {
          const num = parseInt(p.stock) || 0
          return num < 20
        }).length

        setStats((prev) => ({
          ...prev,
          activeItems: activeCount,
          lowStockCount: lowStock,
        }))
      } else {
        // Mock inicial si no hay productos aún para visualización
        const mockProducts: ProductItem[] = [
          { id: '1', title: 'Café Especial Nariño', producer: 'Asociación Nariño', rating: 5, reviews: 12, price: 28000, unit: 'uds', category: 'Cafés', stock: '45 uds', origin: 'Nariño', type: 'producto', certified: true, img: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&h=400&fit=crop&auto=format' },
          { id: '2', title: 'Panela Artesanal Boyacá', producer: 'Asociación Boyacá', rating: 5, reviews: 8, price: 12000, unit: 'uds', category: 'Dulces', stock: '120 uds', origin: 'Boyacá', type: 'producto', certified: true, img: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&h=400&fit=crop&auto=format' },
          { id: '3', title: 'Miel de Montaña Caldas', producer: 'Asociación Caldas', rating: 5, reviews: 15, price: 35000, unit: 'uds', category: 'Mieles', stock: '30 uds', origin: 'Caldas', type: 'producto', certified: true, img: 'https://images.unsplash.com/photo-1587049352847-4a222e784d38?w=600&h=400&fit=crop&auto=format' },
          { id: '4', title: 'Cacao Fino Tumaco', producer: 'Asociación Nariño', rating: 5, reviews: 6, price: 42000, unit: 'uds', category: 'Cacao', stock: '18 uds', origin: 'Nariño', type: 'producto', certified: true, img: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=600&h=400&fit=crop&auto=format' },
        ]
        setProducts(mockProducts)
        setStats({ activeItems: 4, salesThisMonth: 12, totalIncome: 480000, lowStockCount: 1 })
      }

      // Cargar actividades recientes
      const { data: actData } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (actData && actData.length > 0) {
        setActivities(actData as ActivityItem[])
      } else {
        setActivities([
          { id: '1', type: 'sale', title: 'Nueva venta', description: 'Café Especial Nariño (2 uds)', created_at: new Date(Date.now() - 7200000).toISOString() },
          { id: '2', type: 'sale', title: 'Nueva venta', description: 'Panela Artesanal Boyacá (5 uds)', created_at: new Date(Date.now() - 18000000).toISOString() },
          { id: '3', type: 'product', title: 'Producto actualizado', description: 'Stock de Miel de Montaña actualizado', created_at: new Date(Date.now() - 86400000).toISOString() },
        ])
      }
    }

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenCreate = () => {
    setEditingId(null)
    setForm({
      title: '',
      category: isTurismo ? 'Ecoturismo' : 'Cafés',
      price: '',
      unit: 'uds',
      stockNum: '45',
      origin: 'Nariño',
      description: '',
      img: isTurismo
        ? 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=600&h=400&fit=crop&auto=format'
        : 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&h=400&fit=crop&auto=format',
    })
    setShowModal(true)
  }

  const handleOpenEdit = (product: ProductItem) => {
    setEditingId(product.id)
    setForm({
      title: product.title,
      category: product.category || 'Cafés',
      price: String(product.price),
      unit: product.unit || 'uds',
      stockNum: String(parseInt(product.stock) || 0),
      origin: product.origin || 'Nariño',
      description: product.description || '',
      img: product.img,
    })
    setShowModal(true)
  }

  const handleSaveProduct = async () => {
    if (!form.title.trim() || !form.price) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      return
    }

    const payload = {
      producer_id: user.id,
      title: form.title.trim(),
      producer: orgName || 'Asociación de productores',
      price: Number(form.price),
      unit: form.unit || 'uds',
      category: form.category || 'Cultivos',
      certified: true,
      img: form.img,
      stock: `${form.stockNum || '0'} uds`,
      rating: 5,
      reviews: 0,
      description: form.description.trim(),
      type: isTurismo ? 'experiencia' : 'producto',
    }

    if (editingId && !editingId.startsWith('mock')) {
      await supabase.from('products').update(payload).eq('id', editingId)
    } else {
      await supabase.from('products').insert([payload])
    }

    setSaving(false)
    setShowModal(false)
    loadData()
  }

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este ítem?')) return
    if (!id.startsWith('mock')) {
      await supabase.from('products').delete().eq('id', id)
    }
    setProducts((prev) => prev.filter((p) => p.id !== id))
  }

  const handleUpdateStock = async (id: string, delta: number) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const currentNum = parseInt(p.stock) || 0
          const newNum = Math.max(0, currentNum + delta)
          const updatedStock = `${newNum} uds`
          if (!id.startsWith('mock')) {
            supabase.from('products').update({ stock: updatedStock }).eq('id', id).then()
          }
          return { ...p, stock: updatedStock }
        }
        return p
      })
    )
  }

  const formatPrice = (n: number) => `$${n.toLocaleString('es-CO')}`

  return (
    <ScreenShell
      activeNav={activeNav ?? 'home'}
      onNavigate={onNavigate}
      onProfileClick={onProfileClick}
      contentStyle={{ paddingBottom: 40 }}
    >
      {/* ════════ HEADER PANEL DE CONTROL ════════ */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          margin: '12px 0 24px',
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: 26,
              color: '#205134',
              margin: 0,
              fontWeight: 700,
              lineHeight: 1.2,
            }}
          >
            Panel de administración
          </h1>
          <p
            style={{
              fontFamily: "'Nunito Sans', sans-serif",
              fontSize: 14,
              color: '#8A8070',
              margin: '4px 0 0',
              fontWeight: 600,
            }}
          >
            {orgName || (isTurismo ? 'Emprendimiento de turismo comunitario' : 'Asociación de productores')}
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          style={{
            background: '#205134',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 14,
            padding: '12px 20px',
            fontSize: 14,
            fontWeight: 800,
            fontFamily: "'Nunito Sans', sans-serif",
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 4px 16px rgba(32,81,52,0.20)',
            transition: 'all 180ms ease',
          }}
          className="hover:bg-[#2E6B42]"
        >
          <span>+</span>
          {isTurismo ? 'Nueva experiencia' : 'Nuevo producto'}
        </button>
      </div>

      {/* ════════ PÍLDORAS NAVEGACIÓN SUB-TABS ════════ */}
      <div
        style={{
          background: 'rgba(32,81,52,0.06)',
          borderRadius: 20,
          padding: 5,
          display: 'inline-flex',
          gap: 4,
          marginBottom: 26,
          border: '1px solid #EDE4D8',
        }}
      >
        {[
          { id: 'dashboard' as AdminTab, label: 'Dashboard', icon: '📊' },
          { id: 'products' as AdminTab, label: isTurismo ? 'Experiencias' : 'Productos', icon: isTurismo ? '📸' : '🌱' },
          { id: 'inventory' as AdminTab, label: 'Inventario', icon: '📦' },
        ].map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: isActive ? '#205134' : 'transparent',
                color: isActive ? '#FFFFFF' : '#205134',
                border: 'none',
                borderRadius: 16,
                padding: '8px 18px',
                fontSize: 14,
                fontWeight: isActive ? 700 : 600,
                fontFamily: "'Nunito Sans', sans-serif",
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 180ms ease',
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ════════ VISTA 1: DASHBOARD ════════ */}
      {activeTab === 'dashboard' && (
        <div>
          {/* Tarjetas de Métricas */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 16,
              marginBottom: 32,
            }}
          >
            {/* 1. Items activos */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 20,
                padding: '20px 22px',
                border: '1px solid #EDE4D8',
                boxShadow: '0 4px 20px rgba(32,81,52,0.05)',
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 12 }}>✅</div>
              <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: 28, fontWeight: 700, color: '#205134', lineHeight: 1.1 }}>
                {stats.activeItems}
              </div>
              <div style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 13, color: '#8A8070', marginTop: 4 }}>
                {isTurismo ? 'Experiencias activas' : 'Items activos'}
              </div>
            </div>

            {/* 2. Ventas este mes */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 20,
                padding: '20px 22px',
                border: '1px solid #EDE4D8',
                boxShadow: '0 4px 20px rgba(32,81,52,0.05)',
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 12 }}>📈</div>
              <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: 28, fontWeight: 700, color: '#205134', lineHeight: 1.1 }}>
                {stats.salesThisMonth}
              </div>
              <div style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 13, color: '#8A8070', marginTop: 4 }}>
                {isTurismo ? 'Reservas este mes' : 'Ventas este mes'}
              </div>
            </div>

            {/* 3. Ingresos */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 20,
                padding: '20px 22px',
                border: '1px solid #EDE4D8',
                boxShadow: '0 4px 20px rgba(32,81,52,0.05)',
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 12 }}>💰</div>
              <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: 28, fontWeight: 700, color: '#205134', lineHeight: 1.1 }}>
                {formatPrice(stats.totalIncome)}
              </div>
              <div style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 13, color: '#8A8070', marginTop: 4 }}>
                Ingresos
              </div>
            </div>

            {/* 4. Stock bajo */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 20,
                padding: '20px 22px',
                border: '1px solid #EDE4D8',
                boxShadow: '0 4px 20px rgba(32,81,52,0.05)',
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 12 }}>⚠️</div>
              <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: 28, fontWeight: 700, color: '#205134', lineHeight: 1.1 }}>
                {stats.lowStockCount}
              </div>
              <div style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 13, color: '#8A8070', marginTop: 4 }}>
                Stock bajo
              </div>
            </div>
          </div>

          {/* Sección Actividad Reciente */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 22,
              padding: '22px 24px',
              border: '1px solid #EDE4D8',
              boxShadow: '0 4px 20px rgba(32,81,52,0.05)',
            }}
          >
            <h3
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: 18,
                color: '#205134',
                margin: '0 0 18px',
                fontWeight: 700,
              }}
            >
              Actividad reciente
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {activities.map((act) => (
                <div
                  key={act.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: 12,
                    borderBottom: '1px solid #F3ECE2',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6BAA3D', display: 'inline-block' }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#205134', fontFamily: "'Nunito Sans', sans-serif" }}>
                      {act.title}
                    </span>
                    <span style={{ fontSize: 14, color: '#5A5248', fontFamily: "'Nunito Sans', sans-serif" }}>
                      · {act.description}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: '#8A8070', fontFamily: "'Nunito Sans', sans-serif" }}>
                    {timeAgo(act.created_at)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════════ VISTA 2: PRODUCTOS / EXPERIENCIAS ════════ */}
      {activeTab === 'products' && (
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 22,
            overflow: 'hidden',
            border: '1px solid #EDE4D8',
            boxShadow: '0 4px 20px rgba(32,81,52,0.05)',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#FAF7F0', borderBottom: '1px solid #EDE4D8' }}>
                  <th style={{ padding: '14px 18px', fontSize: 13, fontWeight: 700, color: '#205134', fontFamily: "'Poppins', sans-serif" }}>Imagen</th>
                  <th style={{ padding: '14px 18px', fontSize: 13, fontWeight: 700, color: '#205134', fontFamily: "'Poppins', sans-serif" }}>Nombre</th>
                  <th style={{ padding: '14px 18px', fontSize: 13, fontWeight: 700, color: '#205134', fontFamily: "'Poppins', sans-serif" }}>Categoría</th>
                  <th style={{ padding: '14px 18px', fontSize: 13, fontWeight: 700, color: '#205134', fontFamily: "'Poppins', sans-serif" }}>Precio</th>
                  <th style={{ padding: '14px 18px', fontSize: 13, fontWeight: 700, color: '#205134', fontFamily: "'Poppins', sans-serif" }}>Stock</th>
                  <th style={{ padding: '14px 18px', fontSize: 13, fontWeight: 700, color: '#205134', fontFamily: "'Poppins', sans-serif" }}>Origen</th>
                  <th style={{ padding: '14px 18px', fontSize: 13, fontWeight: 700, color: '#205134', fontFamily: "'Poppins', sans-serif", textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 28, textAlign: 'center', color: '#8A8070', fontFamily: "'Nunito Sans', sans-serif" }}>
                      Aún no tienes ítems registrados. Toca en "+ Nuevo producto" para crear el primero.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => {
                    const stockNum = parseInt(p.stock) || 0
                    const isLow = stockNum < 20
                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid #F3ECE2' }}>
                        <td style={{ padding: '12px 18px' }}>
                          <img
                            src={p.img}
                            alt={p.title}
                            style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover' }}
                          />
                        </td>
                        <td style={{ padding: '12px 18px', fontSize: 14, fontWeight: 700, color: '#205134', fontFamily: "'Nunito Sans', sans-serif" }}>
                          {p.title}
                        </td>
                        <td style={{ padding: '12px 18px', fontSize: 13, color: '#5A5248', fontFamily: "'Nunito Sans', sans-serif" }}>
                          {p.category}
                        </td>
                        <td style={{ padding: '12px 18px', fontSize: 14, fontWeight: 700, color: '#9B4728', fontFamily: "'Poppins', sans-serif" }}>
                          {formatPrice(p.price)}
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <span
                            style={{
                              background: isLow ? '#FEE9E1' : '#EAF3EC',
                              color: isLow ? '#C4622D' : '#205134',
                              fontSize: 12,
                              fontWeight: 700,
                              padding: '4px 10px',
                              borderRadius: 20,
                              fontFamily: "'Nunito Sans', sans-serif",
                            }}
                          >
                            {p.stock}
                          </span>
                        </td>
                        <td style={{ padding: '12px 18px', fontSize: 13, color: '#5A5248', fontFamily: "'Nunito Sans', sans-serif" }}>
                          {p.origin || 'Colombia'}
                        </td>
                        <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(p)}
                              style={{
                                background: '#EAF3EC',
                                color: '#205134',
                                border: 'none',
                                borderRadius: 10,
                                padding: '6px 14px',
                                fontSize: 13,
                                fontWeight: 700,
                                cursor: 'pointer',
                                fontFamily: "'Nunito Sans', sans-serif",
                              }}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(p.id)}
                              style={{
                                background: '#FEE9E1',
                                color: '#9B4728',
                                border: 'none',
                                borderRadius: 10,
                                padding: '6px 14px',
                                fontSize: 13,
                                fontWeight: 700,
                                cursor: 'pointer',
                                fontFamily: "'Nunito Sans', sans-serif",
                              }}
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════ VISTA 3: INVENTARIO ════════ */}
      {activeTab === 'inventory' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 18,
          }}
        >
          {products.map((p) => {
            const stockNum = parseInt(p.stock) || 0
            const isLow = stockNum < 20
            const percentage = Math.min(100, Math.max(5, (stockNum / 100) * 100))

            return (
              <div
                key={p.id}
                style={{
                  background: '#FFFFFF',
                  borderRadius: 20,
                  padding: 18,
                  border: '1px solid #EDE4D8',
                  boxShadow: '0 4px 20px rgba(32,81,52,0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                <img
                  src={p.img}
                  alt={p.title}
                  style={{ width: 64, height: 64, borderRadius: 14, objectFit: 'cover', flexShrink: 0 }}
                />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4
                    style={{
                      fontFamily: "'Poppins', sans-serif",
                      fontSize: 15,
                      fontWeight: 700,
                      color: '#205134',
                      margin: '0 0 6px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {p.title}
                  </h4>

                  {/* Barra de progreso de inventario */}
                  <div
                    style={{
                      height: 6,
                      borderRadius: 4,
                      background: '#F3ECE2',
                      overflow: 'hidden',
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${percentage}%`,
                        background: isLow ? '#C4622D' : '#205134',
                        borderRadius: 4,
                        transition: 'width 300ms ease',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: '#8A8070', fontFamily: "'Nunito Sans', sans-serif" }}>
                      {stockNum} disponibles
                    </span>

                    {isLow ? (
                      <span style={{ fontSize: 11, color: '#C4622D', fontWeight: 700, fontFamily: "'Nunito Sans', sans-serif" }}>
                        ⚠️ Stock bajo
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: '#205134', fontWeight: 700, fontFamily: "'Nunito Sans', sans-serif" }}>
                        ✅ OK
                      </span>
                    )}
                  </div>
                </div>

                {/* Control interactivo de stock */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <div
                    style={{
                      background: '#FAF7F0',
                      border: '1px solid #EDE4D8',
                      borderRadius: 12,
                      padding: '6px 12px',
                      fontSize: 14,
                      fontWeight: 700,
                      color: '#205134',
                      fontFamily: "'Nunito Sans', sans-serif",
                      minWidth: 44,
                      textAlign: 'center',
                    }}
                  >
                    {stockNum}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => handleUpdateStock(p.id, -5)}
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 8,
                        border: 'none',
                        background: '#FEE9E1',
                        color: '#9B4728',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateStock(p.id, 5)}
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 8,
                        border: 'none',
                        background: '#EAF3EC',
                        color: '#205134',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ════════ MODAL DE CREAR / EDITAR ════════ */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 24,
              width: '100%',
              maxWidth: 500,
              padding: 26,
              boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
              boxSizing: 'border-box',
            }}
          >
            <h3
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: 20,
                color: '#205134',
                margin: '0 0 18px',
                fontWeight: 700,
              }}
            >
              {editingId ? 'Editar ítem' : isTurismo ? 'Nueva experiencia' : 'Nuevo producto'}
            </h3>

            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#205134', fontFamily: "'Nunito Sans', sans-serif", marginBottom: 4 }}>
                  Nombre
                </label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ej: Café Especial Nariño"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid #EDE4D8', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#205134', fontFamily: "'Nunito Sans', sans-serif", marginBottom: 4 }}>
                    Categoría
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid #EDE4D8', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#205134', fontFamily: "'Nunito Sans', sans-serif", marginBottom: 4 }}>
                    Origen / Departamento
                  </label>
                  <select
                    value={form.origin}
                    onChange={(e) => setForm({ ...form, origin: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid #EDE4D8', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#205134', fontFamily: "'Nunito Sans', sans-serif", marginBottom: 4 }}>
                    Precio ($ COP)
                  </label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="28000"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid #EDE4D8', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#205134', fontFamily: "'Nunito Sans', sans-serif", marginBottom: 4 }}>
                    Cantidad en Stock
                  </label>
                  <input
                    type="number"
                    value={form.stockNum}
                    onChange={(e) => setForm({ ...form, stockNum: e.target.value })}
                    placeholder="45"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid #EDE4D8', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#205134', fontFamily: "'Nunito Sans', sans-serif", marginBottom: 4 }}>
                  URL de Imagen
                </label>
                <input
                  value={form.img}
                  onChange={(e) => setForm({ ...form, img: e.target.value })}
                  placeholder="https://..."
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid #EDE4D8', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#205134', fontFamily: "'Nunito Sans', sans-serif", marginBottom: 4 }}>
                  Descripción
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Descripción detallada..."
                  rows={3}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid #EDE4D8', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ flex: 1, padding: 12, borderRadius: 14, border: 'none', background: '#F3ECE2', color: '#205134', fontWeight: 700, cursor: 'pointer', fontFamily: "'Nunito Sans', sans-serif" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveProduct}
                disabled={saving}
                style={{ flex: 1, padding: 12, borderRadius: 14, border: 'none', background: '#205134', color: '#FFFFFF', fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito Sans', sans-serif" }}
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ScreenShell>
  )
}
