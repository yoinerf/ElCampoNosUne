import { useRef, useState, useEffect } from 'react'
import ScreenShell from '../components/ScreenShell'
import ProductModal from '../components/ProductModal'
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
  outstanding?: boolean
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
  initialSelectedProduct?: string | null
  onClearInitialProduct?: () => void
  userRole?: string | null
}

// ─── ProductDetail Component ─────────────────────────────────────────────────
interface ProductDetailProps {
  product: Product
  cart: Record<string, number>
  formatPrice: (n: number) => string
  onBack: () => void
  onAddToCart: (id: string) => void
  onRemoveFromCart: (id: string) => void
  onCheckout: () => void
  related: Product[]
  onSelectRelated: (id: string) => void
  addFromCard: (id: string) => void
  addingProduct: { id: string; phase: 'plusOne' | 'check' } | null
  onReloadProducts?: () => void
}

function ProductDetail({
  product,
  cart,
  formatPrice,
  onBack,
  onAddToCart,
  onRemoveFromCart,
  onCheckout,
  related,
  onSelectRelated,
  addFromCard,
  addingProduct,
  onReloadProducts,
}: ProductDetailProps) {
  const isExperience = product.type === 'experiencia' || product.unit === 'pers'
  const [activeTab, setActiveTab] = useState<'descripcion' | 'origen' | 'impacto' | 'resenas'>('descripcion')
  const [mainImg, setMainImg] = useState(product.img)
  const [reviewsList, setReviewsList] = useState<any[]>([])
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [newRating, setNewRating] = useState(5)
  const [newComment, setNewComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewMsg, setReviewMsg] = useState('')

  const loadProductReviews = async () => {
    setLoadingReviews(true)
    try {
      const { data, error } = await supabase
        .from('product_reviews')
        .select('id, rating, comment, created_at, user_id, profiles(first_name, last_name, org_name)')
        .eq('product_id', product.id)
        .order('created_at', { ascending: false })
      if (!error && data) {
        setReviewsList(data)
      }
    } catch (e) {
      console.error('Error cargando reseñas del producto:', e)
    } finally {
      setLoadingReviews(false)
    }
  }

  // Reset when product changes
  useEffect(() => {
    setMainImg(product.img)
    setActiveTab('descripcion')
    loadProductReviews()
  }, [product.id])

  const handleSendReview = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setReviewMsg('Debes iniciar sesión para calificar este producto.')
      return
    }
    setSubmittingReview(true)
    setReviewMsg('')
    try {
      const { error } = await supabase.from('product_reviews').upsert(
        {
          product_id: product.id,
          user_id: user.id,
          rating: newRating,
          comment: newComment.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'product_id,user_id' }
      )

      if (error) {
        setReviewMsg('No se pudo guardar la calificación: ' + error.message)
      } else {
        setReviewMsg('¡Gracias por tu calificación!')
        setNewComment('')
        loadProductReviews()
        onReloadProducts?.()
      }
    } catch {
      setReviewMsg('Error inesperado al enviar la reseña.')
    } finally {
      setSubmittingReview(false)
    }
  }

  const thumbs = [
    product.img,
    `https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=300&h=220&fit=crop&auto=format`,
    `https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=300&h=220&fit=crop&auto=format`,
  ]

  return (
    <div
      className="h-full overflow-y-auto"
      style={{ background: '#F5F0E8', fontFamily: "'Nunito Sans', sans-serif" }}
    >
      {/* ── Breadcrumb ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #EDE4D8' }} className="flex items-center gap-2 px-5 py-3 text-xs text-[#888]">
        <button
          type="button"
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: '#205134', cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: 0 }}
        >
          ← Tienda
        </button>
        <span>›</span>
        <span>{product.category}</span>
        <span>›</span>
        <span className="font-bold text-[#3D2B1A] truncate max-w-[160px]">
          {product.title}
        </span>
      </div>

      {/* ── Hero: imagen izquierda + detalles derecha ── */}
      <div style={{ background: '#fff', padding: '24px 20px 20px', borderTopLeftRadius: 0, borderTopRightRadius: 0, borderEndEndRadius: 16, borderEndStartRadius: 16, margin: '0 0 12px' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8" style={{ width: '95%', margin: '0 auto' }}>
          {/* Columna imagen */}
          <div className="w-full">
            <div
              style={{
                borderRadius: 16,
                overflow: 'hidden',
                border: '1px solid #E8E2D9',
                width: '100%',
                aspectRatio: '16/9',
                background: '#F5EEE6',
                marginBottom: 10,
              }}
            >
              <img
                src={mainImg}
                alt={product.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
            {/* Miniaturas — tamaño fijo, no crecen con la columna */}
            <div className="flex gap-2">
              {thumbs.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setMainImg(src)}
                  style={{
                    width: 90,
                    height: 74,
                    flexShrink: 0,
                    borderRadius: 10,
                    overflow: 'hidden',
                    border: mainImg === src ? '2.5px solid #205134' : '2px solid #E8E2D9',
                    padding: 0,
                    cursor: 'pointer',
                    background: 'none',
                  }}
                >
                  <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </button>
              ))}
            </div>
          </div>

          {/* Columna detalles */}
          <div style={{ background: '#fff', border: '1px solid #fff', borderRadius: 20, padding: '22px 22px 18px', display: 'flex', flexDirection: 'column', gap: 0 }}>
            {/* Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span
                style={{
                  background: product.certified ? '#FFF3E8' : '#FFF3E8',
                  color: product.certified ? '#205134' : '#9B4728',
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderRadius: 20,
                  letterSpacing: 0.5,
                }}
              >
                {product.certified ? '✓ CERTIFICADO' : product.type === 'experiencia' ? '📸 EXPERIENCIA' : '🌱 PRODUCTO'}
              </span>
              {product.reviews > 0 ? (
                <span style={{ fontSize: 12, color: '#E5AE30', fontWeight: 700 }}>
                  ★ {product.rating}
                  <span style={{ color: '#999', fontWeight: 400 }}> ({product.reviews} {product.reviews === 1 ? 'reseña' : 'reseñas'})</span>
                </span>
              ) : (
                <span style={{ fontSize: 11, color: '#888', fontWeight: 500 }}>Sin reseñas aún</span>
              )}
            </div>

            {/* Título */}
            <h1
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: 24,
                color: '#1C3A14',
                margin: '12px 0 6px ',
                lineHeight: 1.25,
                fontWeight: 700,
              }}
            >
              {product.title}
            </h1>

            {/* Productor */}
            <p style={{ fontSize: 12, color: '#666', margin: '0 0 16px' }}>
              Producido por:{' '}
              <span style={{ color: '#205134', fontWeight: 700 }}>{product.producer}</span>
            </p>

            <hr style={{ border: 'none', borderTop: '1px solid #E8E2D9', margin: '0 0 16px' }} />

            {/* Precio */}
            <div style={{ marginBottom: 10 }}>
              <span
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: 26,
                  fontWeight: 800,
                  color: '#9B4728',
                }}
              >
                {formatPrice(product.price)}
              </span>
              <span style={{ fontSize: 12, color: '#888', marginLeft: 6 }}>/ {product.unit}</span>
            </div>

            {/* Descripción corta */}
            <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6, margin: '0 0 20px' }}>
              {product.description || 'Producto del campo colombiano, seleccionado directamente de productores y comunidades locales que trabajan con prácticas sostenibles.'}
            </p>

            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: '#F0F7EC',
                border: '1px solid #C8E0BC',
                borderRadius: 20,
                padding: '5px 12px',
                fontSize: 12,
                color: '#205134',
                fontWeight: 600,
                marginBottom: '1rem',
              }}
            >
              {!isNaN(Number(product.stock)) && product.stock !== ''
                ? <><strong>{product.stock}</strong> {isExperience ? 'cupos disponibles.' : 'unidades disponibles.'}</>
                : product.stock}
            </span>

            {/* Personas para experiencias */}
            {isExperience && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1C3A14', marginBottom: 8 }}>Número de personas</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, border: '1.5px solid #E8E2D9', borderRadius: 14, overflow: 'hidden', height: 46, width: '60%' }}>
                  <button type="button" onClick={() => { const cur = cart[product.id] || 1; if (cur > 1) onRemoveFromCart(product.id) }} style={{ width: 46, height: '100%', border: 'none', background: '#f5f0ea33', color: '#205134', fontSize: 20, fontWeight: 800, cursor: 'pointer' }}>−</button>
                  <span style={{ flex: 1, textAlign: 'center', fontWeight: 800, fontSize: 15, color: '#205134' }}>{cart[product.id] || 1}</span>
                  <button type="button" onClick={() => onAddToCart(product.id)} style={{ width: 46, height: '100%', border: 'none', background: '#f5f0ea33', color: '#205134', fontSize: 20, fontWeight: 800, cursor: 'pointer' }}>+</button>
                </div>
                <span style={{ fontSize: 12, color: '#8A8070', marginTop: 4, display: 'block' }}>Total: {formatPrice(product.price * (cart[product.id] || 1))}</span>
              </div>
            )}

            {/* Cantidad + CTA */}
            {cart[product.id] && !isExperience ? (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    border: '1.5px solid #E8E2D9',
                    borderRadius: 14,
                    overflow: 'hidden',
                    height: 46,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onRemoveFromCart(product.id)}
                    style={{ width: 46, height: '100%', border: 'none', background: '#eee9e913', color: '#205134', fontSize: 20, fontWeight: 800, cursor: 'pointer' }}
                  >
                    −
                  </button>
                  <span style={{ width: 46, textAlign: 'center', fontWeight: 800, fontSize: 15, color: '#205134' }}>
                    {cart[product.id]}
                  </span>
                  <button
                    type="button"
                    onClick={() => onAddToCart(product.id)}
                    style={{ width: 46, height: '100%', border: 'none', background: '#eee9e913', color: '#205134', fontSize: 20, fontWeight: 800, cursor: 'pointer' }}
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  onClick={onCheckout}
                  style={{
                    flex: 1,
                    height: 46,
                    borderRadius: 14,
                    border: 'none',
                    background: '#9B4728',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  🛒 Ir al carrito
                </button>
              </div>
            ) : !
            isExperience ? (
              <button
                type="button"
                onClick={() => onAddToCart(product.id)}
                style={{
                  width: '100%',
                  height: 48,
                  borderRadius: 14,
                  border: 'none',
                  background: '#9B4728',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: 'pointer',
                  marginBottom: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                🛒 Agregar al carrito
              </button>
            ) : null}

            {/* Boton reservar experiencia */}
            {isExperience && (
              <button
                type="button"
                onClick={() => { if (!cart[product.id]) { onAddToCart(product.id) } onCheckout() }}
                style={{ width: '100%', height: 50, borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #9B4728, #C4622D)', color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 14px rgba(155,71,40,0.35)', letterSpacing: 0.3 }}
              >
                🌄 Reservar experiencia &middot; {cart[product.id] || 1} persona{(cart[product.id] || 1) > 1 ? 's' : ''}
              </button>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[
                { icon: '📍', text: product.category },
                { icon: '📦', text: 'Disponible' },
                { icon: '🚚', text: 'Envío en 48h' },
              ].map((chip) => (
                <span
                  key={chip.text}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    background: '#F0F7EC',
                    border: '1px solid #C8E0BC',
                    borderRadius: 20,
                    padding: '5px 12px',
                    fontSize: 11,
                    color: '#205134',
                    fontWeight: 600,
                  }}
                >
                  {chip.icon} {chip.text}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs de información ── */}
      <div style={{ background: '#fff', borderRadius: 16, margin: '0 0 12px', overflow: 'hidden' }}>
        {/* Tab headers */}
        <div className="flex border-b border-[#E8E2D9] px-6 md:px-12 overflow-x-auto">
          {(
            [
              { key: 'descripcion', label: 'Descripción' },
              { key: 'origen', label: 'Origen y Productor' },
              { key: 'impacto', label: 'Envío e Impacto' },
              { key: 'resenas', label: `Reseñas (${product.reviews})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '14px 18px',
                border: 'none',
                background: 'none',
                fontFamily: "'Nunito Sans', sans-serif",
                fontSize: 13,
                fontWeight: activeTab === tab.key ? 800 : 600,
                color: activeTab === tab.key ? '#9B4728' : '#666',
                borderBottom: activeTab === tab.key ? '2.5px solid #9B4728' : '2.5px solid transparent',
                cursor: 'pointer',
                transition: 'all 200ms',
                marginBottom: -1,
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-6 md:px-12 py-6" style={{ minHeight: 250, alignContent: 'start' }}>
          {activeTab === 'descripcion' && (
            <>
              <div >
                <h2
                  style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: 17,
                    color: '#205134',
                    margin: '0 0 10px',
                    fontWeight: 700,
                  }}
                >
                  El saber hacer de {product.producer}
                </h2>
                <p style={{ fontSize: 13, color: '#555', lineHeight: 1.75, margin: 0 }}>
                  {product.description ||
                    'Nuestro producto pasa por un proceso artesanal que respeta los ciclos naturales de la tierra. Cultivado con técnicas ancestrales y prácticas modernas de agricultura sostenible, cada unidad refleja el trabajo y dedicación de los campesinos colombianos que lo producen con orgullo.'}
                </p>
              </div>
              <div
                style={{
                  background: '#F0F7EC',
                  border: '1px solid #C8E0BC',
                  borderRadius: 16,
                  padding: 18,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: '#205134',
                    letterSpacing: 1,
                    marginBottom: 8,
                  }}
                >
                  IMPACTO SOCIAL
                </div>
                <p style={{ fontSize: 13, color: '#3D5C35', lineHeight: 1.65, margin: 0 }}>
                  El 75% del precio de venta final va directamente al productor <strong>{product.producer}</strong> y su familia.
                  Esto es un 40% por encima de las tasas de comercio justo internacionales.
                </p>
              </div>
            </>
          )}
          {activeTab === 'origen' && (
            <>
              <div>
                <h2
                  style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: 17,
                    color: '#205134',
                    margin: '0 0 10px',
                    fontWeight: 700,
                  }}
                >
                  Productor
                </h2>
                <p style={{ fontSize: 13, color: '#555', lineHeight: 1.75, margin: '0 0 14px' }}>
                  <strong>{product.producer}</strong> trabaja desde hace años en las tierras colombianas,
                  preservando variedades nativas y técnicas de cultivo que pasan de generación en generación.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: 'Categoría', value: product.category },
                    { label: 'Certificado', value: product.certified ? 'Sí ✓' : 'No' },
                    { label: 'Disponibilidad', value: product.stock },
                  ].map((item) => (
                    <div key={item.label} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#888', minWidth: 100 }}>{item.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#205134' }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div
                style={{
                  background: '#FFF8F0',
                  border: '1px solid #F5D8C0',
                  borderRadius: 16,
                  padding: 18,
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 800, color: '#9B4728', letterSpacing: 1, marginBottom: 8 }}>
                  ORIGEN DEL PRODUCTO
                </div>
                <p style={{ fontSize: 13, color: '#6B3E26', lineHeight: 1.65, margin: 0 }}>
                  Proveniente de las regiones agrícolas de Colombia, este {product.type === 'experiencia' ? 'servicio' : 'producto'} fue
                  elaborado con el mayor cuidado y dedicación, respetando las tradiciones locales y el medioambiente.
                </p>
              </div>
            </>
          )}
          {activeTab === 'impacto' && (
            <>
              <div>
                <h2
                  style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: 17,
                    color: '#205134',
                    margin: '0 0 10px',
                    fontWeight: 700,
                  }}
                >
                  Envío y Logística
                </h2>
                <p style={{ fontSize: 13, color: '#555', lineHeight: 1.75, margin: 0 }}>
                  Realizamos envíos en 48 horas hábiles a todo el país. Los productos frescos son empacados cuidadosamente
                  para preservar su calidad. Trabajamos con operadores logísticos locales para reducir la huella de carbono.
                </p>
              </div>
              <div
                style={{
                  background: '#F0F7EC',
                  border: '1px solid #C8E0BC',
                  borderRadius: 16,
                  padding: 18,
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 800, color: '#205134', letterSpacing: 1, marginBottom: 8 }}>
                  IMPACTO AMBIENTAL
                </div>
                <p style={{ fontSize: 13, color: '#3D5C35', lineHeight: 1.65, margin: 0 }}>
                  Empaques 100% biodegradables. Por cada compra contribuyes a la reforestación de 1m² en zonas de
                  amortiguación de reservas naturales colombianas.
                </p>
              </div>
            </>
          )}
          {activeTab === 'resenas' && (
            <>
              {/* Formulario para calificar */}
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #E8DED0',
                  borderRadius: 16,
                  padding: 10,
                }}
              >

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1C3A14', fontFamily: "'Poppins', sans-serif" }}>
                    Califica este producto
                  </h3>
                  <button
                    type="button"
                    onClick={handleSendReview}
                    disabled={submittingReview}
                    style={{
                      background: '#205134',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 10,
                      padding: '8px 18px',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {submittingReview ? 'Enviando...' : 'Publicar reseña'}
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 12, color: '#666' }}>Tu calificación:</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewRating(star)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 22,
                          color: star <= newRating ? '#E5AE30' : '#D0C8B8',
                          padding: 0,
                          lineHeight: 1,
                        }}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Escribe tu opinión sobre la calidad, sabor o presentación..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid #E8DED0',
                    fontSize: 13,
                    fontFamily: "'Nunito Sans', sans-serif",
                    boxSizing: 'border-box',
                    marginBottom: 10,
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />

                {reviewMsg && (
                  <div style={{ fontSize: 12, fontWeight: 600, color: reviewMsg.includes('No se pudo') || reviewMsg.includes('Debes') ? '#D06050' : '#205134', marginBottom: 10 }}>
                    {reviewMsg}
                  </div>
                )}


              </div>

              {/* Lista de Reseñas */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320, overflowY: 'auto' }}>
                {loadingReviews ? (
                  <p style={{ color: '#888', fontSize: 13, margin: 0 }}>Cargando opiniones...</p>
                ) : reviewsList.length === 0 ? (
                  <div style={{ background: '#FAF7F2', border: '1px solid #E8DED0', borderRadius: 14, padding: 18, textAlign: 'center' }}>
                    <p style={{ color: '#666', fontSize: 13, margin: 0, fontStyle: 'italic' }}>
                      Este producto aún no tiene opiniones escritas. ¡Sé el primero en calificarlo!
                    </p>
                  </div>
                ) : (
                  reviewsList.map((rev) => {
                    const authorName = rev.profiles?.first_name
                      ? `${rev.profiles.first_name} ${rev.profiles.last_name || ''}`.trim()
                      : rev.profiles?.org_name || 'Comprador verificado'
                    const dateStr = rev.created_at
                      ? new Date(rev.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })
                      : ''
                    return (
                      <div
                        key={rev.id}
                        style={{
                          background: '#fff',
                          border: '1px solid #EDE4D8',
                          borderRadius: 14,
                          padding: '12px 14px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#1C3A14' }}>{authorName}</span>
                          <span style={{ fontSize: 10, color: '#999' }}>{dateStr}</span>
                        </div>
                        <div style={{ color: '#E5AE30', fontSize: 12, marginBottom: 4 }}>
                          {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                        </div>
                        {rev.comment && (
                          <p style={{ margin: 0, fontSize: 12, color: '#555', lineHeight: 1.45 }}>
                            {rev.comment}
                          </p>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <div className="px-6 md:px-12 pt-6 pb-10" style={{ borderRadius: 16, background: '#fafafa' }}>
          <h2
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: 19,
              color: '#1C3A14',
              margin: '0 0 18px',
              fontWeight: 700,
            }}
          >
            Te podría interesar
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {related.map((rel) => (
              <div
                key={rel.id}
                onClick={() => onSelectRelated(rel.id)}
                style={{
                  background: '#fff',
                  borderRadius: 18,
                  overflow: 'hidden',
                  border: '1px solid #E8E2D9',
                  cursor: 'pointer',
                  boxShadow: '0 2px 12px rgba(42,92,26,0.06)',
                  transition: 'transform 180ms ease, box-shadow 180ms ease',
                }}
                className="hover:scale-[1.02] hover:shadow-md"
              >
                <div style={{ position: 'relative', height: 140 }}>
                  <img
                    src={rel.img}
                    alt={rel.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      background: rel.type === 'experiencia' ? '#FFF3E8' : '#EAF6E3',
                      color: rel.type === 'experiencia' ? '#9B4728' : '#205134',
                      fontSize: 9,
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: 20,
                      letterSpacing: 0.5,
                    }}
                  >
                    {rel.producer.toUpperCase()}
                  </span>
                </div>
                <div style={{ padding: '12px 14px 14px' }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#1C3A14',
                      fontFamily: "'Poppins', sans-serif",
                      marginBottom: 6,
                      lineHeight: 1.3,
                    }}
                  >
                    {rel.title}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#9B4728', marginBottom: 10 }}>
                    {formatPrice(rel.price)}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); addFromCard(rel.id) }}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: 10,
                      border: '1.5px solid #E8E2D9',
                      background: '#fff',
                      color: '#205134',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                    }}
                  >
                    {addingProduct?.id === rel.id
                      ? addingProduct.phase === 'plusOne' ? '+1' : '✓'
                      : '+ Agregar al carrito'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── MarketplaceScreen ────────────────────────────────────────────────────────
export default function MarketplaceScreen({
  onOpenCheckout,
  onNavigate,
  activeNav,
  onProfileClick,
  initialSelectedProduct,
  onClearInitialProduct
}: MarketplaceScreenProps) {
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
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<string | null>(initialSelectedProduct || null)

  useEffect(() => {
    if (initialSelectedProduct) {
      setSelectedProduct(initialSelectedProduct)
      onClearInitialProduct?.()
    }
  }, [initialSelectedProduct, onClearInitialProduct])
  const [addingProduct, setAddingProduct] = useState<{ id: string; phase: 'plusOne' | 'check' } | null>(null)
  const animationTimer = useRef<number | null>(null)
  const [userRole, setUserRole] = useState<'asociacion' | 'turismo' | 'comprador' | null>(null)
  const loadProducts = async () => {
    try {
      const [{ data: productsData, error: prodErr }, { data: reviewsData }, { data: categoriesData }] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('product_reviews').select('product_id, rating'),
        supabase.from('categories').select('id, name')
      ])

      if (prodErr) {
        console.error('Error cargando productos:', prodErr)
        setLoading(false)
        return
      }

      const reviewsMap: Record<string, number[]> = {}
      if (reviewsData && Array.isArray(reviewsData)) {
        for (const r of reviewsData) {
          if (r.product_id) {
            if (!reviewsMap[r.product_id]) reviewsMap[r.product_id] = []
            reviewsMap[r.product_id].push(r.rating)
          }
        }
      }

      const processed: Product[] = (productsData || []).map((p) => {
        const ratings = reviewsMap[p.id] || []
        const count = ratings.length
        const avgRating = count > 0
          ? Number((ratings.reduce((sum, val) => sum + val, 0) / count).toFixed(1))
          : (p.rating ?? 5)

        const catName = categoriesData?.find((c) => c.id === p.category_id)?.name || 'Sin categoría'

        return {
          ...p,
          rating: avgRating,
          reviews: count,
          category: catName,
        }
      })

      if (categoriesData && categoriesData.length > 0) {
        setCategories(categoriesData as { id: string; name: string }[])
      }

      setProducts(processed)
    } catch (e) {
      console.error('Error en loadProducts:', e)
    } finally {
      setLoading(false)
    }
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

  const handleCreateProduct = async (formData: any) => {
    if (!canCreateProduct) {
      setSubmitMessage('Tu perfil no permite publicar productos')
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
      title: formData.title.trim(),
      producer: profile?.org_name || `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || 'Productor',
      price: Number(formData.price),
      unit: formData.unit || 'kg',
      category_id: formData.category_id || null,
      certified: formData.certified,
      img: formData.img || 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=900&h=700&fit=crop&auto=format',
      stock: formData.stockNum ? `${formData.stockNum}` : '0',
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

    setShowForm(false)
    setSaving(false)
    setSubmitMessage(
      activitySaved
        ? 'Producto publicado correctamente'
        : 'Producto guardado, pero la actividad no se pudo registrar en el feed.'
    )
    loadProducts()
  }

  const renderProductCard = (product: Product) => (
    <div
      key={product.id}
      className="marketplace-card group"
      onClick={() => setSelectedProduct(product.id)}
      style={{
        background: '#fff',
        borderRadius: 18,
        overflow: 'hidden',
        border: '1px solid #E8DED0',
        boxShadow: '0 2px 10px rgba(42,92,26,0.05)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
      }}
    >
      <div style={{ position: 'relative', height: 165, width: '100%', background: '#F5EEE6', overflow: 'hidden' }}>
        <img
          src={product.img}
          alt={product.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          className="transition-transform duration-500 ease-out group-hover:scale-105"
        />
        <span style={{ position: 'absolute', top: 8, left: 8, background: product.type === 'experiencia' ? '#FFF3E8' : '#EAF3EC', color: product.type === 'experiencia' ? '#9B4728' : '#205134', fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 20, letterSpacing: 0.5 }}>
          {product.type === 'experiencia' ? '📸 EXPERIENCIA' : product.category ? `🌱 ${product.category.toUpperCase()}` : '🌱 PRODUCTO'}
        </span>
        {product.reviews > 0 ? (
          <span style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(255,255,255,0.92)', color: '#205134', fontSize: 10, fontWeight: 800, padding: '3px 7px', borderRadius: 20 }}>
            ⭐ {product.rating} <span style={{ fontWeight: 500, color: '#666' }}>({product.reviews})</span>
          </span>
        ) : (
          <span style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(255,255,255,0.85)', color: '#888', fontSize: 9, fontWeight: 700, padding: '3px 7px', borderRadius: 20 }}>
            NUEVO
          </span>
        )}
      </div>
      <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#205134', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
            {product.producer}
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#1C3A14',
              fontFamily: "'Poppins', sans-serif",
              lineHeight: 1.3,
              marginBottom: 6,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {product.title}
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#9B4728', marginBottom: 14 }}>
            {formatPrice(product.price)}
            <span style={{ fontSize: 11, color: '#888', fontWeight: 500, marginLeft: 4 }}>/ {product.unit}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); addFromCard(product.id) }}
          aria-label={addingProduct?.id === product.id ? 'Producto agregado' : 'Agregar al carrito'}
          style={{
            width: '100%',
            height: 36,
            background: addingProduct?.id === product.id ? '#205134' : '#F5EEE6',
            color: addingProduct?.id === product.id ? '#fff' : '#205134',
            border: '1px solid #E8DED0',
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            transition: 'all 0.2s ease',
          }}
          className="hover:bg-[#205134] hover:text-white"
        >
          {addingProduct?.id === product.id
            ? addingProduct.phase === 'plusOne' ? '+1' : '✓ Agregado'
            : '+ Agregar al carrito'}
        </button>
      </div>
    </div>
  )

  const outstandingProducts = products.filter(p => p.outstanding)

  return (
    <ScreenShell
      activeNav={activeNav ?? 'market'}
      onNavigate={onNavigate}
      onProfileClick={onProfileClick}
      userRole={userRole}
      contentStyle={{ paddingBottom: 20 }}
      cartCount={cartCount}
      onCartClick={handleCheckoutCart}
    >
      {selectedProduct && products.find((product) => product.id === selectedProduct) ? (() => {
        const product = products.find((item) => item.id === selectedProduct) as Product
        const related = products.filter((p) => p.id !== product.id && p.category === product.category).slice(0, 3)
        const allRelated = related.length > 0 ? related : products.filter((p) => p.id !== product.id).slice(0, 3)
        return (
          <ProductDetail
            product={product}
            cart={cart}
            formatPrice={formatPrice}
            onBack={() => setSelectedProduct(null)}
            onAddToCart={addToCart}
            onRemoveFromCart={removeFromCart}
            onCheckout={handleCheckoutCart}
            related={allRelated}
            onSelectRelated={setSelectedProduct}
            addFromCard={addFromCard}
            addingProduct={addingProduct}
            onReloadProducts={loadProducts}
          />
        )
      })() : (
        <>
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
          </div>

          {/* ══ BARRA DE BÚSQUEDA ══ */}
          <div style={{ position: 'relative', marginBottom: 4 }}>
            <svg
              width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#205134" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Buscar productos y productores..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              style={{
                width: '100%',
                background: '#fff',
                border: '1px solid #E8DED0',
                borderRadius: 16,
                padding: '12px 16px 12px 42px',
                fontSize: 14,
                fontFamily: "'Nunito Sans', sans-serif",
                color: '#3D2B1A',
                boxShadow: '0 2px 10px rgba(32,81,52,0.03)',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
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
            {!loading && outstandingProducts.length > 0 && activeFilter === 'Todos' && searchVal === '' && (
              <div style={{ marginBottom: 32 }}>
                <p style={{ margin: 0, color: '#9B4728', fontSize: 11, fontFamily: "'Poppins', sans-serif", fontWeight: 800, letterSpacing: 0.2 }}>
                  PRODUCTOS GENUINOS.
                </p>
                <h2 style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 22, color: '#3D2B1A', margin: '0 0 16px', fontWeight: 700 }}>
                  Los favoritos del mes
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
                  {outstandingProducts.slice(0, 6).map(renderProductCard)}
                </div>
              </div>
            )}

            <p style={{ fontSize: 13, color: '#666666', fontFamily: "'Nunito Sans', sans-serif", margin: '0 0 14px 0' }}>
              {filtered.length} productos disponibles
            </p>

            {loading && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="animate-pulse"
                    style={{
                      background: '#eee5d7',
                      borderRadius: 18,
                      height: 270,
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
              <ProductModal
                isOpen={showForm}
                onClose={() => setShowForm(false)}
                onSave={handleCreateProduct}
                categories={categories}
              />
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
              {filtered.map(renderProductCard)}
            </div>
          </div>

          {canCreateProduct && (
            <div style={{ padding: '24px 20px', background: 'linear-gradient(180deg, #F5EEE6 0%, #E8DED0 100%)', borderTop: '1px solid #E8DED0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <p style={{ margin: 0, fontSize: 13, color: '#205134', fontFamily: "'Nunito Sans', sans-serif", fontWeight: 700, textAlign: 'center' }}>¿Tienes un nuevo producto del campo?</p>
              <button
                onClick={() => setShowForm((prev) => !prev)}
                className="hover:scale-105 transition-transform"
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: 16,
                  border: 'none',
                  background: 'linear-gradient(135deg, #205134 0%, #2A6542 100%)',
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 800,
                  fontFamily: "'Nunito Sans', sans-serif",
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  boxShadow: '0 8px 24px rgba(32,81,52,0.25)',
                }}
              >
                <div style={{ background: 'rgba(255,255,255,0.2)', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 16 }}>＋</span>
                </div>
                Publicar mi producto
              </button>
            </div>
          )}
        </>
      )}
    </ScreenShell>
  )
}


