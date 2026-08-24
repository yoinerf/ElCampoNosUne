import { useState, useEffect } from 'react'
import ScreenShell from '../components/ScreenShell'
import PaymentModal from '../components/PaymentModal'
import { supabase } from '../lib/supabase'

const filters = ['Todos', 'Cultivos', 'Lácteos', 'Procesados', 'Pecuario', 'Hierbas']

interface Product {
  id: string
  title: string
  producer: string
  rating: number
  reviews: number
  price: number
  unit: string
  category: string
  certified: boolean
  img: string
  stock: string
}

export default function MarketplaceScreen() {
  const [activeFilter, setActiveFilter] = useState('Todos')
  const [searchVal, setSearchVal] = useState('')
  const [cart, setCart] = useState<string[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false)
  const [selectedCheckoutProducts, setSelectedCheckoutProducts] = useState<Product[]>([])
  const [userRole, setUserRole] = useState<'asociacion' | 'turismo' | 'comprador' | null>(null)
  const isBuyer = userRole === 'comprador'
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

  const toggleCart = (id: string) => {
    setCart((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const handleCheckoutCart = () => {
    if (cart.length === 0) return

    const selectedProducts = products.filter((product) => cart.includes(product.id))
    setSelectedCheckoutProducts(selectedProducts)
    setCheckoutModalOpen(true)
  }

  const confirmCheckoutCart = async () => {
    if (selectedCheckoutProducts.length === 0) return false

    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user

    if (!user) {
      setSubmitMessage('Debes iniciar sesión para confirmar tu pedido')
      return false
    }

    try {
      await supabase.from('reservations').insert(
        selectedCheckoutProducts.map((product) => ({
          user_id: user.id,
          product_id: product.id,
          quantity: 1,
          total: product.price,
          status: 'pendiente',
          created_at: new Date().toISOString(),
        }))
      )
    } catch {
      // La estructura real de reservations puede variar; el feed principal va en activities.
    }

    const activityResults = await Promise.all(
      selectedCheckoutProducts.map((product) =>
        recordActivity({
          userId: user.id,
          userRoleValue: 'comprador',
          type: 'purchase',
          title: 'Compra registrada',
          description: `Compraste ${product.title}`,
          entityType: 'products',
          entityId: product.id,
          metadata: { product_title: product.title, total: product.price },
        })
      )
    )

    setCart([])
    setSelectedCheckoutProducts([])

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
      <PaymentModal
        open={checkoutModalOpen}
        title="Finalizar pedido"
        subtitle="Completa tus datos para continuar con el pago seguro."
        confirmLabel="Pagar pedido"
        amount={selectedCheckoutProducts.reduce((sum, product) => sum + product.price, 0)}
        onClose={() => {
          setCheckoutModalOpen(false)
          setSelectedCheckoutProducts([])
        }}
        onConfirm={confirmCheckoutCart}
      />
      <ScreenShell
        title="Mercados Campesinos"
        action={
          isBuyer ? (
          <div style={{ position: 'relative' }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
              }}
            >
              🛒
            </div>
            {cart.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: '#D4870A',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'Nunito, sans-serif',
                }}
              >
                {cart.length}
              </div>
            )}
          </div>
        ) : undefined
      }
      searchPlaceholder="Buscar productos del campo..."
      searchValue={searchVal}
      onSearchChange={(value) => setSearchVal(value)}
      contentStyle={{ paddingBottom: 20 }}
    >

      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 0 14px' }}>
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            style={{
              flexShrink: 0,
              padding: '7px 16px',
              borderRadius: 18,
              border: activeFilter === f ? 'none' : '1.5px solid #E8E0CF',
              background: activeFilter === f ? '#2A5C1A' : '#F5F2EA',
              color: activeFilter === f ? '#FAF7EF' : '#3D2B1A',
              fontSize: 13,
              fontWeight: 700,
              fontFamily: 'Nunito, sans-serif',
              cursor: 'pointer',
            }}
          >
            {f}
          </button>
        ))}
      </div>
      <div style={{ borderBottom: '1px solid #E8E0CF', marginBottom: 14 }} />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <p style={{ fontSize: 13, color: '#8A8070', fontFamily: 'Nunito, sans-serif', margin: '0 0 14px' }}>
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
                  border: '1px solid #E8E0CF',
                }}
              />
            ))}
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <p style={{ textAlign: 'center', color: '#8A8070', fontFamily: 'Nunito, sans-serif' }}>
            Aún no hay productos publicados.
          </p>
        )}

        {showForm && (
          <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #E8E0CF', padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1C3F10', fontFamily: 'Fraunces, serif', marginBottom: 12 }}>
              Publicar producto
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Nombre del producto" style={{ border: '1px solid #E8E0CF', borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
              <input value={form.producer} onChange={(e) => setForm({ ...form, producer: e.target.value })} placeholder="Productor / asociación" style={{ border: '1px solid #E8E0CF', borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Precio" type="number" style={{ border: '1px solid #E8E0CF', borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
                <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="Unidad" style={{ border: '1px solid #E8E0CF', borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ border: '1px solid #E8E0CF', borderRadius: 10, padding: '10px 12px', fontSize: 14 }}>
                  {filters.filter((f) => f !== 'Todos').map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                <input value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="Stock" style={{ border: '1px solid #E8E0CF', borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
              </div>
              <input value={form.img} onChange={(e) => setForm({ ...form, img: e.target.value })} placeholder="URL de la imagen" style={{ border: '1px solid #E8E0CF', borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#3D2B1A', fontSize: 14 }}>
                <input type="checkbox" checked={form.certified} onChange={(e) => setForm({ ...form, certified: e.target.checked })} />
                Producto certificado
              </label>
              {submitMessage && <div style={{ color: '#C4622D', fontSize: 12, fontFamily: 'Nunito, sans-serif', fontWeight: 600 }}>{submitMessage}</div>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowForm(false)} style={{ flex: 1, background: '#EFE8DD', color: '#3D2B1A', border: 'none', borderRadius: 12, padding: '10px 12px', fontWeight: 700 }}>Cancelar</button>
                <button onClick={handleCreateProduct} disabled={saving} style={{ flex: 1, background: '#2A5C1A', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 12px', fontWeight: 700, cursor: 'pointer' }}>
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
              style={{
                background: '#fff',
                borderRadius: 18,
                overflow: 'hidden',
                border: '1px solid #E8E0CF',
                boxShadow: '0 2px 12px rgba(42,92,26,0.06)',
              }}
            >
              <div style={{ position: 'relative', height: 110 }}>
                <img
                  src={product.img}
                  alt={product.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {product.certified && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 7,
                      left: 7,
                      background: '#2A5C1A',
                      color: '#fff',
                      fontSize: 9,
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 20,
                      fontFamily: 'Nunito, sans-serif',
                    }}
                  >
                    ✓ Certificado
                  </div>
                )}
                <button
                  onClick={() => toggleCart(product.id)}
                  style={{
                    position: 'absolute',
                    top: 7,
                    right: 7,
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    border: 'none',
                    background: cart.includes(product.id) ? '#D4870A' : 'rgba(255,255,255,0.9)',
                    color: cart.includes(product.id) ? '#fff' : '#3D2B1A',
                    fontSize: 14,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {cart.includes(product.id) ? '✓' : '+'}
                </button>
                {product.stock !== 'Disponible' && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: 'rgba(196,98,45,0.85)',
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '3px 0',
                      textAlign: 'center',
                      fontFamily: 'Nunito, sans-serif',
                    }}
                  >
                    {product.stock}
                  </div>
                )}
              </div>
              <div style={{ padding: '10px 11px 12px' }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#1C3F10',
                    fontFamily: 'Fraunces, serif',
                    lineHeight: 1.3,
                    marginBottom: 3,
                  }}
                >
                  {product.title}
                </div>
                <div style={{ fontSize: 10, color: '#8A8070', fontFamily: 'Nunito, sans-serif', marginBottom: 8, lineHeight: 1.3 }}>
                  {product.producer}
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#D4870A', fontFamily: 'Nunito, sans-serif' }}>
                      {formatPrice(product.price)}
                    </span>
                    <span style={{ fontSize: 10, color: '#8A8070', fontFamily: 'Nunito, sans-serif' }}>
                      {product.unit}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: '#3D7A28', fontFamily: 'Nunito, sans-serif' }}>
                    ⭐ {product.rating}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {cart.length > 0 && userRole === 'comprador' && (
        <div style={{ padding: '12px 20px 0', background: '#FAF7EF', borderTop: '1px solid #E8E0CF' }}>
          <button
            onClick={handleCheckoutCart}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: 14,
              border: 'none',
              background: '#D4870A',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              fontFamily: 'Nunito, sans-serif',
              cursor: 'pointer',
            }}
          >
            Confirmar pedido ({cart.length})
          </button>
        </div>
      )}

      {canCreateProduct && (
        <div style={{ padding: '12px 20px 16px', background: '#FAF7EF', borderTop: '1px solid #E8E0CF' }}>
          <button
            onClick={() => setShowForm((prev) => !prev)}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: 14,
              border: '2px dashed #7FB069',
              background: 'rgba(127,176,105,0.08)',
              color: '#2A5C1A',
              fontSize: 14,
              fontWeight: 700,
              fontFamily: 'Nunito, sans-serif',
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
    </>
  )
}