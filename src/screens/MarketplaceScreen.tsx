import { useRef, useState, useEffect } from 'react'
import ScreenShell from '../components/ScreenShell'
import { supabase } from '../lib/supabase'

export interface Product {
  id: string
  title: string
  producer: string
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
}

export interface CartItem {
  product: Product
  quantity: number
}

interface MarketplaceScreenProps {
  onOpenCheckout?: (items: CartItem[], onConfirm: (items: CartItem[]) => Promise<boolean>) => void
  onNavigate?: (tab: 'home' | 'market' | 'tourism' | 'profile') => void
  activeNav?: 'home' | 'market' | 'tourism' | 'profile'
  onProfileClick?: () => void
}

export default function MarketplaceScreen({ onOpenCheckout, onNavigate, activeNav, onProfileClick }: MarketplaceScreenProps) {
  const [activeFilter, setActiveFilter] = useState('Todos')
  const [searchVal, setSearchVal] = useState('')
  const [cart, setCart] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('campoconecta_cart')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (typeof parsed === 'object' && parsed !== null) {
          const cleaned: Record<string, number> = {}
          for (const [key, val] of Object.entries(parsed)) {
            if (typeof val === 'number' && val > 0) {
              cleaned[key] = val
            }
          }
          return cleaned
        }
      }
    } catch (e) {
      console.error('Error cargando carrito desde localStorage', e)
    }
    return {}
  })

  useEffect(() => {
    try {
      localStorage.setItem('campoconecta_cart', JSON.stringify(cart))
    } catch (e) {
      console.error('Error guardando el carrito en localStorage', e)
    }
  }, [cart])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [addingProduct, setAddingProduct] = useState<{ id: string; phase: 'plusOne' | 'check' } | null>(null)
  const animationTimer = useRef<number | null>(null)
  const [userRole, setUserRole] = useState<'asociacion' | 'turismo' | 'comprador' | null>(null)
  const [form, setForm] = useState({
    title: '',
    producer: '',
    price: '',
    unit: 'kg',
    category: 'Cultivos',
    img: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=900&h=700&fit=crop&auto=format',
    stock: 'Disponible',
    certified: true,
  })

  const loadProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false })
    if (data) setProducts(data as Product[])
    setLoading(false)
  }

  useEffect(() => {
    loadProducts()

    const loadRole = async () => {
      const { data: userData } = await supabase.auth.getUser()
      const user = userData.user
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single()

      setUserRole((data?.user_type as 'asociacion' | 'turismo' | 'comprador' | null) ?? null)
    }

    loadRole()
  }, [])

  const canCreateProduct = userRole === 'asociacion'
  const filters = ['Todos', ...Array.from(new Set(products.map((product) => product.category?.trim()).filter(Boolean)))]
  const cartItems: CartItem[] = products.filter((product) => cart[product.id] > 0).map((product) => ({ product, quantity: cart[product.id] }))
  const cartCount = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0)

  const recordActivity = async ({
    userId,
    userRoleValue,
    type,
    title,
    description,
    entityType,
    entityId,
    metadata,
  }: {
    userId: string
    userRoleValue: 'asociacion' | 'turismo' | 'comprador'
    type: string
    title: string
    description: string
    entityType?: string
    entityId?: string | null
    metadata?: Record<string, unknown>
  }) => {
    try {
      const { error } = await supabase.from('activities').insert([
        {
          user_id: userId,
          user_role: userRoleValue,
          type,
          title,
          description,
          entity_type: entityType ?? null,
          entity_id: entityId ?? null,
          metadata: metadata ?? {},
        },
      ])

      if (error) {
        console.error('Error insertando en activities:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Excepción insertando en activities:', error)
      return false
    }
  }

  const filtered = products.filter((p) => {
    const matchesFilter = activeFilter === 'Todos' || p.category === activeFilter
    const q = searchVal.trim().toLowerCase()
    const matchesSearch = !q || p.title.toLowerCase().includes(q) || p.producer.toLowerCase().includes(q)
    return matchesFilter && matchesSearch
  })

  const addToCart = (id: string) => {
    setCart((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }))
  }

  const addFromCard = (id: string) => {
    addToCart(id)
    if (animationTimer.current) window.clearTimeout(animationTimer.current)
    setAddingProduct({ id, phase: 'plusOne' })
    animationTimer.current = window.setTimeout(() => {
      setAddingProduct({ id, phase: 'check' })
      animationTimer.current = window.setTimeout(() => setAddingProduct(null), 650)
    }, 350)
  }

  const removeFromCart = (id: string) => {
    setCart((current) => {
      const next = { ...current }
      if ((next[id] ?? 0) <= 1) delete next[id]
      else next[id] -= 1
      return next
    })
  }

  const handleCheckoutCart = () => {
    onOpenCheckout?.(cartItems, confirmCheckoutProducts)
  }

  const confirmCheckoutProducts = async (checkoutItems: CartItem[]) => {
    if (checkoutItems.length === 0) return false

    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user

    if (!user) {
      setSubmitMessage('Debes iniciar sesión para confirmar tu pedido')
      return false
    }

    try {
      await supabase.from('reservations').insert(
        checkoutItems.map(({ product, quantity }) => ({
          user_id: user.id,
          product_id: product.id,
          quantity,
          total: product.price * quantity,
          status: 'pendiente',
          created_at: new Date().toISOString(),
        }))
      )
    } catch {
      // La estructura real de reservations puede variar; el feed principal va en activities.
    }

    const activityResults = await Promise.all(
      checkoutItems.map(({ product, quantity }) =>
        recordActivity({
          userId: user.id,
          userRoleValue: 'comprador',
          type: 'purchase',
          title: 'Compra registrada',
          description: `Compraste ${quantity} ${product.title}`,
          entityType: 'products',
          entityId: product.id,
          metadata: { product_title: product.title, quantity, total: product.price * quantity },
        })
      )
    )

    setCart({})
    const confirmationMessage = activityResults.every(Boolean)
      ? 'Pedido confirmado correctamente'
      : 'Pedido guardado, pero no se pudo registrar la actividad en el feed.'

    setSubmitMessage(confirmationMessage)
    return activityResults.every(Boolean)
  }

  const formatPrice = (n: number) => `$${n.toLocaleString('es-CO')}`

  const handleCreateProduct = async () => {
    if (!canCreateProduct) {
      setSubmitMessage('Tu perfil no permite publicar productos')
      return
    }

    if (!form.title.trim() || !form.price) {
      setSubmitMessage('Completa el nombre y el precio del producto')
      return
    }

    setSaving(true)
    setSubmitMessage('')

    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user

    if (!user) {
      setSubmitMessage('Debes iniciar sesión para publicar un producto')
      setSaving(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, org_name')
      .eq('id', user.id)
      .single()

    const payload = {
      producer_id: user.id,
      title: form.title.trim(),
      producer: form.producer.trim() || profile?.org_name || `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || 'Productor',
      price: Number(form.price),
      unit: form.unit || 'kg',
      category: form.category || 'Cultivos',
      certified: form.certified,
      img: form.img || 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=900&h=700&fit=crop&auto=format',
      stock: form.stock || 'Disponible',
      rating: 5,
      reviews: 0,
    }

    const { data: insertedProduct, error } = await supabase.from('products').insert([payload]).select()

    if (error) {
      setSubmitMessage(error.message)
      setSaving(false)
      return
    }

    const activitySaved = await recordActivity({
      userId: user.id,
      userRoleValue: 'asociacion',
      type: 'product_created',
      title: 'Producto publicado',
      description: `${payload.title} quedó disponible en el marketplace`,
      entityType: 'products',
      entityId: insertedProduct?.[0]?.id ?? null,
      metadata: { product_title: payload.title, price: payload.price },
    })

    setForm({
      title: '',
      producer: '',
      price: '',
      unit: 'kg',
      category: 'Cultivos',
      img: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=900&h=700&fit=crop&auto=format',
      stock: 'Disponible',
      certified: true,
    })
    setShowForm(false)
    setSaving(false)
    setSubmitMessage(
      activitySaved
        ? 'Producto publicado correctamente'
        : 'Producto guardado, pero la actividad no se pudo registrar en el feed.'
    )
    loadProducts()
  }

  return (
    <>
      {selectedProduct && products.find((product) => product.id === selectedProduct) ? (() => {
        const product = products.find((item) => item.id === selectedProduct) as Product
        return (
          <div className="h-full overflow-y-auto" style={{ background: '#F5EEE6' }}>
            <div style={{ position: 'relative', height: 240 }}>
              <img src={product.img} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(28,63,16,0.7) 0%, transparent 50%)' }} />
              <button type="button" onClick={() => setSelectedProduct(null)} style={{ position: 'absolute', top: 16, left: 16, width: 36, height: 36, borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.85)', fontSize: 18, cursor: 'pointer' }}>←</button>
              <span style={{ position: 'absolute', bottom: 16, left: 20, background: product.type === 'experiencia' ? '#FFF3E8' : '#EAF3EC', color: product.type === 'experiencia' ? '#9B4728' : '#205134', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{product.type === 'experiencia' ? '📸 Experiencia' : '🌱 Producto'}</span>
            </div>
            <div style={{ padding: '20px 20px 100px' }}>
              <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: 22, color: '#205134', margin: '0 0 6px' }}>{product.title}</h2>
              <p style={{ fontSize: 13, color: '#666', margin: '0 0 18px' }}>📍 {product.producer}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                {[['⭐', 'Calificación', `${product.rating} (${product.reviews} reseñas)`], ['📦', 'Disponibilidad', product.stock], ['🌱', 'Categoría', product.category], ['💰', 'Precio', `${formatPrice(product.price)} ${product.unit}`]].map(([icon, label, value]) => (
                  <div key={label} style={{ background: '#fff', borderRadius: 14, padding: 12, border: '1px solid #E8DED0' }}><div style={{ fontSize: 18 }}>{icon}</div><div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>{label}</div><div style={{ fontSize: 13, fontWeight: 700, color: '#205134' }}>{value}</div></div>
                ))}
              </div>
              <h3 style={{ fontFamily: "'Poppins', sans-serif", fontSize: 17, color: '#205134', margin: '0 0 10px' }}>Sobre este {product.type === 'experiencia' ? 'servicio' : 'producto'}</h3>
              <p style={{ fontSize: 14, color: '#3D2B1A', lineHeight: 1.6, margin: '0 0 24px' }}>{product.description || 'Producto del campo colombiano seleccionado directamente de productores y comunidades locales.'}</p>
              {cart[product.id] ? (
                <div style={{ display: 'flex', gap: 10, width: '100%', minHeight: 52 }}>
                  {/* Botón Seguir comprando (solo cuando hay artículos agregados) */}
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(null)}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      height: 52,
                      borderRadius: 16,
                      border: '2px solid #205134',
                      background: '#FFFFFF',
                      color: '#205134',
                      fontSize: 13,
                      fontWeight: 800,
                      fontFamily: "'Nunito Sans', sans-serif",
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxSizing: 'border-box',
                    }}
                  >
                    Seguir comprando
                  </button>

                  {/* Contador con botones - y + de más alta cobertura */}
                  <div
                    style={{
                      flex: 1.1,
                      minWidth: 0,
                      height: 52,
                      borderRadius: 16,
                      background: '#205134',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      overflow: 'hidden',
                      padding: 0,
                      boxSizing: 'border-box',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => removeFromCart(product.id)}
                      aria-label="Quitar una unidad"
                      style={{
                        width: 58,
                        height: '100%',
                        border: 'none',
                        background: 'rgba(0, 0, 0, 0)',
                        color: '#fff',
                        fontSize: 24,
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'background 180ms ease',
                      }}
                      className="hover:bg-black/30"
                    >
                      −
                    </button>
                    <span
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        fontSize: 12,
                        fontWeight: 800,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        padding: '0 2px',
                      }}
                    >
                      {cart[product.id]} Añadido
                    </span>
                    <button
                      type="button"
                      onClick={() => addToCart(product.id)}
                      aria-label="Agregar una unidad"
                      style={{
                        width: 58,
                        height: '100%',
                        border: 'none',
                        background: 'rgba(0,0,0,0.15)',
                        color: '#fff',
                        fontSize: 24,
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'background 180ms ease',
                      }}
                      className="hover:bg-black/30"
                    >
                      +
                    </button>
                  </div>

                  {/* Ir al carrito */}
                  <button
                    type="button"
                    onClick={handleCheckoutCart}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      height: 52,
                      borderRadius: 16,
                      border: 'none',
                      background: '#9B4728',
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 800,
                      fontFamily: "'Nunito Sans', sans-serif",
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxSizing: 'border-box',
                    }}
                  >
                    Ir al carrito
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => addToCart(product.id)}
                  style={{
                    width: '100%',
                    height: 52,
                    borderRadius: 16,
                    border: 'none',
                    background: '#205134',
                    color: '#fff',
                    fontSize: 15,
                    fontWeight: 800,
                    fontFamily: "'Nunito Sans', sans-serif",
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxSizing: 'border-box',
                  }}
                >
                  Agregar al carrito
                </button>
              )}
            </div>
          </div>
        )
      })() : (
        <ScreenShell
          activeNav={activeNav ?? 'market'}
          onNavigate={onNavigate}
          onProfileClick={onProfileClick}
          contentStyle={{ paddingBottom: 20 }}
        >
          {/* ══ BANNER TIENDA ══ */}
          <div
            style={{
              background: 'linear-gradient(135deg, #205134 0%, #2E6B42 100%)',
              borderRadius: '0 0 28px 28px',
              padding: '22px 20px 28px',
              margin: '0 -18px 20px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(107,170,61,0.15)', pointerEvents: 'none' }} />
            <p style={{ margin: 0, color: '#6BAA3D', fontSize: 11, fontFamily: "'Nunito Sans', sans-serif", fontWeight: 800, letterSpacing: 0.5 }}>🌽 MERCADOS CAMPESINOS</p>
            <h1 style={{ fontFamily: "'Poppins', sans-serif", fontSize: 22, color: '#F5EEE6', margin: '4px 0 4px', fontWeight: 700, lineHeight: 1.2 }}>Productos del campo</h1>
            <p style={{ margin: 0, color: 'rgba(245,238,230,0.75)', fontSize: 12, fontFamily: "'Nunito Sans', sans-serif" }}>Frescos y directos de productores colombianos</p>
            {cartCount > 0 && (
              <button
                type="button"
                onClick={handleCheckoutCart}
                style={{
                  position: 'absolute',
                  top: 18,
                  right: 18,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#E5AE30',
                  border: 'none',
                  borderRadius: 12,
                  padding: '8px 14px',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#fff',
                  fontFamily: "'Nunito Sans', sans-serif",
                }}
              >
                🛒 {cartCount}
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '22px 0 14px' }}>
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                style={{
                  flexShrink: 0,
                  padding: '7px 16px',
                  borderRadius: 18,
                  border: activeFilter === f ? 'none' : '1.5px solid #E8DED0',
                  background: activeFilter === f ? '#205134' : '#F5EEE6',
                  color: activeFilter === f ? '#F5EEE6' : '#205134',
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: "'Nunito Sans', sans-serif",
                  cursor: 'pointer',
                }}
              >
                {f}
              </button>
            ))}
          </div>
          <div style={{ borderBottom: '1px solid #E8DED0', marginBottom: 14 }} />

          <div style={{ flex: 1, overflowY: 'auto' }}>
            <p style={{ fontSize: 13, color: '#666666', fontFamily: "'Nunito Sans', sans-serif", margin: '0 0 14px 5px' }}>
              {filtered.length} productos disponibles
            </p>

            {loading && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="animate-pulse"
                    style={{
                      background: '#eee5d7',
                      borderRadius: 18,
                      height: 190,
                      border: '1px solid #E8DED0',
                    }}
                  />
                ))}
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <p style={{ textAlign: 'center', color: '#666666', fontFamily: "'Nunito Sans', sans-serif", margin: '0 0 14px 5px' }}>
                Aún no hay productos publicados.
              </p>
            )}

            {showForm && (
              <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #E8DED0', padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#205134', fontFamily: "'Poppins', sans-serif", marginBottom: 12 }}>
                  Publicar producto
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Nombre del producto" style={{ border: '1px solid #E8DED0', borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
                  <input value={form.producer} onChange={(e) => setForm({ ...form, producer: e.target.value })} placeholder="Productor / asociación" style={{ border: '1px solid #E8DED0', borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Precio" type="number" style={{ border: '1px solid #E8DED0', borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
                    <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="Unidad" style={{ border: '1px solid #E8DED0', borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ border: '1px solid #E8DED0', borderRadius: 10, padding: '10px 12px', fontSize: 14 }}>
                      {filters.filter((f) => f !== 'Todos').map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                    <input value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="Stock" style={{ border: '1px solid #E8DED0', borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
                  </div>
                  <input value={form.img} onChange={(e) => setForm({ ...form, img: e.target.value })} placeholder="URL de la imagen" style={{ border: '1px solid #E8DED0', borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#205134', fontSize: 14 }}>
                    <input type="checkbox" checked={form.certified} onChange={(e) => setForm({ ...form, certified: e.target.checked })} />
                    Producto certificado
                  </label>
                  {submitMessage && <div style={{ color: '#9B4728', fontSize: 12, fontFamily: "'Nunito Sans', sans-serif", fontWeight: 600 }}>{submitMessage}</div>}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => setShowForm(false)} style={{ flex: 1, background: '#EFE8DD', color: '#205134', border: 'none', borderRadius: 12, padding: '10px 12px', fontWeight: 700 }}>Cancelar</button>
                    <button onClick={handleCreateProduct} disabled={saving} style={{ flex: 1, background: '#205134', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 12px', fontWeight: 700, cursor: 'pointer' }}>
                      {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
              {filtered.map((product) => (
                <div
                  key={product.id}
                  className="marketplace-card"
                  onClick={() => setSelectedProduct(product.id)}
                  style={{
                    background: '#fff',
                    borderRadius: 18,
                    overflow: 'hidden',
                    border: '1px solid #E8DED0',
                    boxShadow: '0 2px 12px rgba(42,92,26,0.06)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ position: 'relative', height: 110 }}>
                    <img
                      src={product.img}
                      alt={product.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <span style={{ position: 'absolute', top: 8, left: 8, background: product.type === 'experiencia' ? '#FFF3E8' : '#EAF3EC', color: product.type === 'experiencia' ? '#9B4728' : '#205134', fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 20 }}>{product.type === 'experiencia' ? '📸 Experiencia' : '🌱 Producto'}</span>
                    <span style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(255,255,255,0.92)', color: '#205134', fontSize: 11, fontWeight: 800, padding: '4px 8px', borderRadius: 20 }}>⭐ {product.rating}</span>
                  </div>
                  <div style={{ padding: '10px 11px 12px' }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#205134',
                        fontFamily: "'Poppins', sans-serif",
                        lineHeight: 1.3,
                        marginBottom: 3,
                      }}
                    >
                      {product.title}
                    </div>
                    <div style={{ fontSize: 10, color: '#666666', fontFamily: "'Nunito Sans', sans-serif", marginBottom: 8, lineHeight: 1.3 }}>
                      {product.producer}
                    </div>
                    <div style={{ fontSize: 10, color: '#666666', fontFamily: "'Nunito Sans', sans-serif", marginBottom: 8, lineHeight: 1.3 }}>
                      {product.description}
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#9B4728', fontFamily: "'Poppins', sans-serif", }}>
                          {formatPrice(product.price)}
                        </span>
                        <span style={{ fontSize: 10, color: '#666666', fontFamily: "'Nunito Sans', sans-serif" }}>
                          {product.unit}
                        </span>
                      </div>
                      <div style={{ width: 88, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={(event) => { event.stopPropagation(); addFromCard(product.id) }}
                          aria-label={addingProduct?.id === product.id ? 'Producto agregado' : 'Agregar al carrito'}
                          style={{
                            width: addingProduct?.id === product.id ? 34 : 88,
                            height: addingProduct?.id === product.id ? 34 : 30,
                            padding: 0,
                            background: '#205134',
                            color: '#fff',
                            border: 'none',
                            borderRadius: addingProduct?.id === product.id ? '50%' : 14,
                            fontSize: addingProduct?.id === product.id ? 13 : 11,
                            fontWeight: 800,
                            cursor: 'pointer',
                            transition: 'width 320ms cubic-bezier(0.22, 1, 0.36, 1), height 320ms cubic-bezier(0.22, 1, 0.36, 1), border-radius 320ms cubic-bezier(0.22, 1, 0.36, 1), font-size 180ms ease',
                          }}
                        >
                          {addingProduct?.id !== product.id ? '+ Carrito' : addingProduct.phase === 'plusOne' ? '+1' : '✓'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {canCreateProduct && (
            <div style={{ padding: '12px 20px 16px', background: '#F5EEE6', borderTop: '1px solid #E8DED0' }}>
              <button
                onClick={() => setShowForm((prev) => !prev)}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: 14,
                  border: '2px dashed #7FB069',
                  background: 'rgba(127,176,105,0.08)',
                  color: '#205134',
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: "'Nunito Sans', sans-serif",
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 18 }}>＋</span>
                Publicar mi producto
              </button>
            </div>
          )}
        </ScreenShell>
      )}
    </>
  )
}

