import React, { useRef, useState, useEffect } from 'react'
import ScreenShell from '../components/ScreenShell'
import ProductModal from '../components/ProductModal'
import { supabase } from '../lib/supabase'
import { hasSeenPromoInSession, markPromoAsSeenInSession } from '../lib/promoSession'
import { isAdvertisementActive } from '../lib/dateColombia'

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
  images?: any[]
  stock: string
  outstanding?: boolean
}

export interface CartItem {
  product: Product
  quantity: number
}

interface MarketplaceScreenProps {
  onOpenCheckout?: (items: CartItem[], onConfirm: (items: CartItem[]) => Promise<boolean>) => void
  onNavigate?: (tab: 'home' | 'market' | 'tourism' | 'profile' | 'superadmin' | any) => void
  activeNav?: string
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
  isProducer?: boolean
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
  isProducer,
}: ProductDetailProps) {
  const isExperience = product.type === 'experiencia' || product.unit === 'pers'
  const isOutOfStock = (() => {
    if (product.stock === undefined || product.stock === null || product.stock === '') return false
    const p = parseInt(String(product.stock).replace(/\D/g, ''), 10)
    return !isNaN(p) && p <= 0
  })()
  const [activeTab, setActiveTab] = useState<'descripcion' | 'origen' | 'impacto' | 'resenas'>('descripcion')
  const [mainImg, setMainImg] = useState(product.img)
  const carouselRef = useRef<HTMLDivElement>(null)

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }
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

  const thumbs = (product.images && product.images.length > 0)
    ? product.images.map((i: any) => i.image_url)
    : [product.img]

  return (
    <div
      className="h-full overflow-y-auto"
      style={{ background: '#F5F0E8', fontFamily: "'Nunito Sans', sans-serif" }}
    >
      {/* ── Breadcrumb ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #EDE4D8' }}>
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-2 text-xs text-[#888]">
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
          <span className="font-bold text-[#3D2B1A] truncate max-w-[200px]">
            {product.title}
          </span>
        </div>
      </div>

      {/* ── Hero: imagen izquierda + detalles derecha ── */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="bg-white p-4 sm:p-6 lg:p-10 rounded-2xl sm:rounded-3xl border border-[#EDE4D8] shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-12 items-start">
            {/* Columna imagen */}
            <div className="lg:col-span-6 w-full flex flex-col items-center lg:items-start">
              <div
                className="w-full max-h-[320px] lg:max-h-none aspect-square rounded-2xl sm:rounded-3xl overflow-hidden border border-[#E8E2D9] bg-[#F5EEE6] mb-3 sm:mb-4 relative shadow-sm"
              >
                <img
                  src={mainImg}
                  alt={product.title}
                  className="w-full h-full object-cover block"
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(20,45,25,0.38) 100%)',
                    pointerEvents: 'none',
                  }}
                />
              </div>
              {/* Miniaturas */}
              <div className="flex gap-2.5 sm:gap-3 overflow-x-auto w-full pb-1 scrollbar-none">
                {thumbs.map((src, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setMainImg(src)}
                    className={`w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-xl sm:rounded-2xl overflow-hidden p-0 cursor-pointer transition-all ${mainImg === src ? 'ring-2 ring-[#205134] border-transparent' : 'border border-[#E8E2D9] opacity-80 hover:opacity-100'
                      }`}
                    style={{ background: 'none' }}
                  >
                    <img src={src} alt="" className="w-full h-full object-cover block" />
                  </button>
                ))}
              </div>
            </div>

            {/* Columna detalles */}
            <div className="lg:col-span-6 w-full flex flex-col justify-start lg:pl-2">
              {/* Badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span
                  style={{
                    background: product.type === 'experiencia' ? '#EAF3EC' : '#FFF6E5',
                    color: product.type === 'experiencia' ? '#205134' : '#A86B05',
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '5px 12px',
                    borderRadius: 20,
                    letterSpacing: 0.5,
                  }}
                >
                  {product.certified ? '✓ CERTIFICADO' : product.type === 'experiencia' ? '🏞️ EXPERIENCIA' : '🌾 PRODUCTO'}
                </span>
                {product.reviews > 0 ? (
                  <span style={{ fontSize: 13, color: '#E5AE30', fontWeight: 700 }}>
                    ★ {product.rating}
                    <span style={{ color: '#888', fontWeight: 500, fontSize: 12 }}> ({product.reviews} {product.reviews === 1 ? 'reseña' : 'reseñas'})</span>
                  </span>
                ) : (
                  <span style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>Sin reseñas aún</span>
                )}
              </div>

              {/* Título */}
              <h1 className="font-['Poppins'] text-2xl sm:text-3xl md:text-[32px] text-[#1C3A14] font-bold leading-tight mb-1.5 sm:mb-2 tracking-tight">
                {product.title}
              </h1>

              {/* Productor */}
              <p className="text-xs sm:text-sm text-[#666] mb-2 sm:mb-3">
                Producido por:{' '}
                <span className="text-[#205134] font-bold text-sm sm:text-base">{product.producer}</span>
              </p>

              <hr style={{ border: 'none', borderTop: '1px solid #E8E2D9', margin: '0 0 12px' }} />

              {/* Precio */}
              <div style={{ marginBottom: 12, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span
                  className={`font-['Poppins'] text-2xl sm:text-3xl font-extrabold tracking-tight ${isExperience ? 'text-[#205134]' : 'text-[#C8860A]'
                    }`}
                >
                  {formatPrice(product.price)}
                </span>
                <span className="text-xs sm:text-sm text-[#7A6E62] font-semibold">/ {product.unit}</span>
              </div>

              {/* Descripción */}
              <p className="text-sm sm:text-[15px] text-[#4A4036] leading-relaxed mb-3 sm:mb-4 font-['Nunito_Sans']">
                {product.description || 'Producto del campo colombiano, seleccionado directamente de productores y comunidades locales que trabajan con prácticas sostenibles.'}
              </p>

              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  alignSelf: 'flex-start',
                  gap: 6,
                  background: isOutOfStock ? '#FFF3EB' : '#F0F7EC',
                  border: isOutOfStock ? '1px solid #F3D2C4' : '1px solid #C8E0BC',
                  borderRadius: 20,
                  padding: '6px 14px',
                  fontSize: 13,
                  color: isOutOfStock ? '#9B4728' : '#205134',
                  fontWeight: 600,
                  marginBottom: '1.25rem',
                }}
              >
                {isOutOfStock
                  ? (isExperience ? 'Sin cupos disponibles' : '0 unidades disponibles')
                  : (!isNaN(Number(product.stock)) && product.stock !== ''
                    ? <><strong>{product.stock}</strong> {isExperience ? 'cupos disponibles.' : 'unidades disponibles.'}</>
                    : product.stock)}
              </span>

              {/* Personas para experiencias */}
              {isExperience && !isOutOfStock && (
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#1C3A14', marginBottom: 8 }}>Número de personas</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, border: '1.5px solid #E8E2D9', borderRadius: 14, overflow: 'hidden', height: 48, width: '60%' }}>
                    <button type="button" onClick={() => { const cur = cart[product.id] || 1; if (cur > 1) onRemoveFromCart(product.id) }} style={{ width: 48, height: '100%', border: 'none', background: '#f5f0ea33', color: '#205134', fontSize: 22, fontWeight: 800, cursor: 'pointer' }}>−</button>
                    <span style={{ flex: 1, textAlign: 'center', fontWeight: 800, fontSize: 16, color: '#205134' }}>{cart[product.id] || 1}</span>
                    <button type="button" onClick={() => onAddToCart(product.id)} style={{ width: 48, height: '100%', border: 'none', background: '#f5f0ea33', color: '#205134', fontSize: 22, fontWeight: 800, cursor: 'pointer' }}>+</button>
                  </div>
                  <span style={{ fontSize: 13, color: '#8A8070', marginTop: 6, display: 'block', fontWeight: 600 }}>Total: {formatPrice(product.price * (cart[product.id] || 1))}</span>
                </div>
              )}

              {/* Cantidad + CTA */}
              {isOutOfStock ? (
                <div
                  style={{
                    padding: '14px 18px',
                    background: '#FFF3EB',
                    borderRadius: 14,
                    color: '#9B4728',
                    fontSize: 14,
                    fontWeight: 700,
                    textAlign: 'center',
                    marginBottom: 16,
                    border: '1px solid #F3D2C4',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <span>🚫</span>
                  <span>
                    {isExperience
                      ? 'Experiencia sin cupos disponibles, pronto se abriran nuevos cupos'
                      : 'Producto agotado, pronto tendremos disponibilidad.'}
                  </span>
                </div>
              ) : isProducer ? (
                <div style={{ padding: '14px 18px', background: '#F5EEE6', borderRadius: 14, color: '#205134', fontSize: 14, fontWeight: 700, textAlign: 'center', marginBottom: 16, border: '1px solid #EDE4D8' }}>
                  Vista previa de producto (Modo asociación / productor)
                </div>
              ) : cart[product.id] && !isExperience ? (
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      border: '1.5px solid #E8E2D9',
                      borderRadius: 14,
                      overflow: 'hidden',
                      height: 50,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => onRemoveFromCart(product.id)}
                      style={{ width: 48, height: '100%', border: 'none', background: '#eee9e913', color: '#205134', fontSize: 22, fontWeight: 800, cursor: 'pointer' }}
                    >
                      −
                    </button>
                    <span style={{ width: 48, textAlign: 'center', fontWeight: 800, fontSize: 16, color: '#205134' }}>
                      {cart[product.id]}
                    </span>
                    <button
                      type="button"
                      onClick={() => onAddToCart(product.id)}
                      style={{ width: 48, height: '100%', border: 'none', background: '#eee9e913', color: '#205134', fontSize: 22, fontWeight: 800, cursor: 'pointer' }}
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={onCheckout}
                    style={{
                      flex: 1,
                      height: 50,
                      borderRadius: 14,
                      border: 'none',
                      background: '#205134',
                      color: '#fff',
                      fontSize: 15,
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      boxShadow: '0 4px 14px rgba(32,81,52,0.2)',
                    }}
                  >
                    🛒 Ir al carrito
                  </button>
                </div>
              ) : !isExperience ? (
                <button
                  type="button"
                  onClick={() => onAddToCart(product.id)}
                  style={{
                    width: '100%',
                    height: 52,
                    borderRadius: 14,
                    border: 'none',
                    background: '#205134',
                    color: '#fff',
                    fontSize: 16,
                    fontWeight: 800,
                    cursor: 'pointer',
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: '0 4px 14px rgba(32,81,52,0.2)',
                  }}
                >
                  🛒 Agregar al carrito
                </button>
              ) : null}

              {/* Boton reservar experiencia */}
              {isExperience && !isProducer && !isOutOfStock && (
                <button
                  type="button"
                  onClick={() => { if (!cart[product.id]) { onAddToCart(product.id) } onCheckout() }}
                  style={{ width: '100%', height: 52, borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #205134, #2E6B42)', color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 14px rgba(32,81,52,0.25)', letterSpacing: 0.3 }}
                >
                  🌄 Reservar experiencia &middot; {cart[product.id] || 1} persona{(cart[product.id] || 1) > 1 ? 's' : ''}
                </button>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {[
                  { icon: '📍', text: product.category, isRed: false },
                  {
                    icon: isOutOfStock ? '' : '📦',
                    text: isOutOfStock ? (isExperience ? 'Sin cupos' : 'Agotado') : 'Disponible',
                    isRed: isOutOfStock,
                  },
                  ...(!isExperience && !isOutOfStock ? [{ icon: '🚚', text: 'Envío en 48h', isRed: false }] : []),
                ].map((chip) => (
                  <span
                    key={chip.text}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: chip.isRed ? '#FDF2F2' : '#F0F7EC',
                      border: chip.isRed ? '1px solid #F8B4B4' : '1px solid #C8E0BC',
                      borderRadius: 20,
                      padding: '6px 14px',
                      fontSize: 12,
                      color: chip.isRed ? '#9B1C1C' : '#205134',
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
      </div>

      {/* ── Tabs de información ── */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #EDE4D8', overflow: 'hidden' }}>
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
                  color: activeTab === tab.key ? '#205134' : '#666',
                  borderBottom: activeTab === tab.key ? '2.5px solid #205134' : '2.5px solid transparent',
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
      </div>

      {
        related.length > 0 && (
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
            <div className="p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl bg-white border border-[#EDE4D8] shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h2
                  style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: 19,
                    color: '#1C3A14',
                    margin: 0,
                    fontWeight: 700,
                  }}
                >
                  Te podría interesar
                </h2>
                {related.length > 2 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => scrollCarousel('left')}
                      aria-label="Anterior"
                      className="w-8 h-8 rounded-full border border-[#EDE4D8] bg-white text-[#205134] hover:bg-[#F2EFE9] flex items-center justify-center transition-colors shadow-xs cursor-pointer text-base font-bold select-none"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollCarousel('right')}
                      aria-label="Siguiente"
                      className="w-8 h-8 rounded-full border border-[#EDE4D8] bg-white text-[#205134] hover:bg-[#F2EFE9] flex items-center justify-center transition-colors shadow-xs cursor-pointer text-base font-bold select-none"
                    >
                      ›
                    </button>
                  </div>
                )}
              </div>
              {/* Carrusel horizontal — scroll en mobile, navegación en desktop */}
              <div
                ref={carouselRef}
                style={{
                  display: 'flex',
                  gap: 14,
                  overflowX: 'auto',
                  paddingBottom: 8,
                  scrollSnapType: 'x mandatory',
                  WebkitOverflowScrolling: 'touch',
                  msOverflowStyle: 'none',
                  scrollbarWidth: 'none',
                }}
              >
                {related.map((rel) => {
                  const isRelOutOfStock = (() => {
                    if (rel.stock === undefined || rel.stock === null || rel.stock === '') return false
                    const p = parseInt(String(rel.stock).replace(/\D/g, ''), 10)
                    return !isNaN(p) && p <= 0
                  })()

                  return (
                    <div
                      key={rel.id}
                      onClick={() => onSelectRelated(rel.id)}
                      style={{
                        minWidth: 'min(220px, 72vw)',
                        maxWidth: 260,
                        flex: '0 0 auto',
                        background: '#fff',
                        borderRadius: 18,
                        overflow: 'hidden',
                        border: '1px solid #E8E2D9',
                        cursor: 'pointer',
                        boxShadow: '0 2px 12px rgba(42,92,26,0.06)',
                        transition: 'transform 180ms ease, box-shadow 180ms ease',
                        scrollSnapAlign: 'start',
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
                        {isRelOutOfStock && (
                          <span
                            style={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              background: '#FFF3EB',
                              color: '#9B4728',
                              border: '1px solid #F3D2C4',
                              fontSize: 9,
                              fontWeight: 800,
                              padding: '3px 7px',
                              borderRadius: 20,
                            }}
                          >
                            {rel.type === 'experiencia' ? 'SIN CUPOS' : 'AGOTADO'}
                          </span>
                        )}
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
                        {!isProducer && (
                          isRelOutOfStock ? (
                            <div
                              style={{
                                width: '100%',
                                padding: '8px',
                                borderRadius: 10,
                                border: '1px solid #F3D2C4',
                                background: '#FFF3EB',
                                color: '#9B4728',
                                fontSize: 12,
                                fontWeight: 700,
                                textAlign: 'center',
                              }}
                            >
                              {rel.type === 'experiencia' ? 'Sin cupos' : 'Agotado'}
                            </div>
                          ) : (cart[rel.id] ?? 0) > 0 && addingProduct?.id !== rel.id ? (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); addFromCard(rel.id) }}
                              style={{
                                width: '100%',
                                padding: '8px',
                                borderRadius: 10,
                                border: '1px solid #B8E2AE',
                                background: '#EAF6E3',
                                color: '#205134',
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 4,
                              }}
                              className="hover:bg-[#DCF0D4]"
                            >
                              <span>✓ Agregado</span>
                              {cart[rel.id] > 1 && (
                                <span
                                  style={{
                                    background: '#205134',
                                    color: '#fff',
                                    fontSize: 10,
                                    borderRadius: 999,
                                    padding: '1px 5px',
                                    fontWeight: 800,
                                  }}
                                >
                                  {cart[rel.id]}
                                </span>
                              )}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); addFromCard(rel.id) }}
                              style={{
                                width: '100%',
                                padding: '8px',
                                borderRadius: 10,
                                border: '1.5px solid #E8E2D9',
                                background: addingProduct?.id === rel.id ? '#205134' : '#fff',
                                color: addingProduct?.id === rel.id ? '#fff' : '#205134',
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
                                : '+ Agregar'}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      }
    </div >
  )
}

// ─── MarketplaceScreen ────────────────────────────────────────────────────────
export default function MarketplaceScreen({
  onOpenCheckout,
  onNavigate,
  activeNav,
  onProfileClick,
  initialSelectedProduct,
  onClearInitialProduct,
  userRole: propUserRole,
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

  const handleSelectProduct = (productId: string) => {
    window.history.pushState({ modal: 'product', id: productId }, '', window.location.href)
    setSelectedProduct(productId)
  }

  const handleBackFromProduct = () => {
    // Only go back in history; the popstate listener will clear selectedProduct
    window.history.back()
  }

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      // If the new state has a product modal, show it; otherwise close detail view
      if (e.state?.modal === 'product' && e.state.id) {
        setSelectedProduct(e.state.id)
      } else {
        setSelectedProduct(null)
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (initialSelectedProduct) {
      handleSelectProduct(initialSelectedProduct)
      onClearInitialProduct?.()
    }
  }, [initialSelectedProduct, onClearInitialProduct])
  const [addingProduct, setAddingProduct] = useState<{ id: string; phase: 'plusOne' | 'check' } | null>(null)
  const animationTimer = useRef<number | null>(null)
  const [userRole, setUserRole] = useState<'asociacion' | 'turismo' | 'comprador' | null>(null)
  const loadProducts = async () => {
    try {
      const [{ data: productsData, error: prodErr }, { data: reviewsData }, { data: categoriesData }] = await Promise.all([
        supabase.from('products').select('*, images(*), profiles(org_name, first_name, last_name)').order('created_at', { ascending: false }),
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

      const processed: Product[] = (productsData || []).map((p: any) => {
        const ratings = reviewsMap[p.id] || []
        const count = ratings.length
        const avgRating = count > 0
          ? Number((ratings.reduce((sum, val) => sum + val, 0) / count).toFixed(1))
          : (p.rating ?? 5)

        const catName = categoriesData?.find((c) => c.id === p.category_id)?.name || 'Sin categoría'
        const primaryImg = p.images?.find((i: any) => i.is_primary)?.image_url
          || p.images?.[0]?.image_url
          || 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=900&h=700&fit=crop&auto=format'

        // Usar el nombre actual del perfil si está disponible (para reflejar cambios de organización)
        const profile = p.profiles as { org_name?: string; first_name?: string; last_name?: string } | null
        const producerName = profile
          ? (profile.org_name?.trim() || `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || p.producer || 'Productor')
          : (p.producer || 'Productor')

        return {
          ...p,
          producer: producerName,
          img: primaryImg,
          images: p.images || [],
          description: p.description || '',
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


  const [allAds, setAllAds] = useState<any[]>([])
  const [activeAds, setActiveAds] = useState<any[]>([])

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

      setUserRole((data?.user_type as any) ?? null)
    }

    const loadAds = async () => {
      try {
        const { data } = await supabase
          .from('advertisements')
          .select('*')
          .order('created_at', { ascending: false })
        if (data) {
          setAllAds(data)
          const validAds = data.filter(isAdvertisementActive)
          setActiveAds(validAds)
        }
      } catch (err) {
        console.error('Error loading ads:', err)
      }
    }

    loadRole()
    loadAds()
  }, [])

  const [dismissedCategories, setDismissedCategories] = useState<Record<string, boolean>>({})
  const [featuredIndex, setFeaturedIndex] = useState(0)
  const [featuredSlideDir, setFeaturedSlideDir] = useState<'left' | 'right' | null>(null)
  const [featuredAnimating, setFeaturedAnimating] = useState(false)



  // Obtener TODOS los destacados de la categoría actual (o Todos)
  // La ventana flotante promocional SOLO debe aparecer si existe un anuncio activo y vigente en la tabla advertisements
  // Valida que no se haya visto en la sesión y valida estrictamente fechas de activación con hora Colombia
  const categoryFeaturedList = (() => {
    if (loading || selectedProduct || dismissedCategories[activeFilter]) return []

    const validAds = activeAds.filter((ad) => {
      if (ad.type !== 'product' || !ad.product_id) return false
      if (!isAdvertisementActive(ad)) return false
      const p = products.find((prod) => prod.id === ad.product_id)
      if (!p) return false
      if (hasSeenPromoInSession(ad.id)) return false
      return activeFilter === 'Todos' || p.category === activeFilter
    })

    return validAds.flatMap((ad) => {
      const p = products.find((prod) => prod.id === ad.product_id)
      if (!p) return []
      return [{ adId: ad.id, product: p, title: ad.title || p.title, img: ad.image_url || p.img }]
    })
  })()

  const categoryFeatured = categoryFeaturedList.length > 0 ? categoryFeaturedList[Math.min(featuredIndex, categoryFeaturedList.length - 1)] : null

  const categoryFeaturedListRef = useRef<typeof categoryFeaturedList>([])
  categoryFeaturedListRef.current = categoryFeaturedList

  // Auto-avance cada 5 segundos — dependencias estables, sin riesgo de bucle
  useEffect(() => {
    const interval = setInterval(() => {
      const list = categoryFeaturedListRef.current
      if (list.length <= 1) return
      setFeaturedSlideDir('left')
      setFeaturedAnimating(true)
      setTimeout(() => {
        setFeaturedIndex((prev) => (prev + 1) % list.length)
        setFeaturedSlideDir(null)
        setFeaturedAnimating(false)
      }, 320)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const navigateFeatured = (dir: 'prev' | 'next') => {
    if (featuredAnimating || categoryFeaturedListRef.current.length <= 1) return
    setFeaturedSlideDir(dir === 'next' ? 'left' : 'right')
    setFeaturedAnimating(true)
    setTimeout(() => {
      const len = categoryFeaturedListRef.current.length
      setFeaturedIndex((prev) => {
        if (dir === 'next') return (prev + 1) % len
        return (prev - 1 + len) % len
      })
      setFeaturedSlideDir(null)
      setFeaturedAnimating(false)
    }, 320)
  }




  const isAdmin = (userRole || propUserRole) === 'admin'
  const isProducer = (userRole || propUserRole) === 'asociacion'
  const canCreateProduct = isProducer
  const filters = ['Todos', ...Array.from(new Set(products.map((product) => product.category?.trim()).filter(Boolean)))]
  const cartItems: CartItem[] = products.filter((product) => cart[product.id] > 0).map((product) => ({ product, quantity: cart[product.id] }))
  const cartCount = isProducer ? 0 : Object.values(cart).reduce((sum, quantity) => sum + quantity, 0)

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
    // Ocultar productos/experiencias sin stock (stock = 0)
    if (p.stock !== undefined && p.stock !== null && p.stock !== '') {
      const stockNum = parseInt(String(p.stock).replace(/\D/g, ''), 10)
      if (!isNaN(stockNum) && stockNum <= 0) return false
    }
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

    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'

    try {
      // 1. Enviar datos al backend para validación de precios, stock y creación de reserva en DB
      const checkoutResponse = await fetch(`${backendUrl}/api/payments/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          customer_email: user.email,
          items: checkoutItems.map(({ product, quantity }) => ({
            id: product.id,
            type: product.type || 'producto',
            quantity,
            price: product.price,
          })),
        }),
      })

      const checkoutData = await checkoutResponse.json()

      if (!checkoutResponse.ok || !checkoutData.success) {
        const errorMsg = checkoutData.errors?.join(' ') || checkoutData.message || 'Error en la validación del checkout'
        setSubmitMessage(`❌ No se pudo procesar la compra: ${errorMsg}`)
        return false
      }

      console.log('✅ Checkout validado por Backend:', checkoutData)
      console.log('💳 Referencia Wompi:', checkoutData.reference)
      console.log('🔒 Payload Wompi para integración:', checkoutData.wompi)

      // 2. Confirmar el pago (simulado o tras confirmación de Wompi) para descontar inventario y marcar completado
      const confirmResponse = await fetch(`${backendUrl}/api/payments/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: checkoutData.reference,
          status: 'APPROVED',
          transactionId: `wompi_sim_${Date.now()}`,
          customerEmail: user.email,
        }),
      })

      const confirmData = await confirmResponse.json()

      if (!confirmResponse.ok || !confirmData.success) {
        setSubmitMessage('Reserva guardada en backend, pero hubo un detalle al confirmar el pago.')
        return false
      }

      setCart({})
      setSubmitMessage('¡Pedido confirmado correctamente a través del backend! Inventario actualizado.')
      return true
    } catch (err: any) {
      console.error('Error al comunicarse con el backend de pagos:', err)
      setSubmitMessage(`Error al conectar con el backend de pagos (${backendUrl}).`)
      return false
    }
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
      stock: formData.stockNum ? `${formData.stockNum}` : '0',
      description: formData.description ? formData.description.trim() : null,
      rating: 5,
      reviews: 0,
    }

    const { data: insertedProduct, error } = await supabase.from('products').insert([payload]).select()

    if (error) {
      setSubmitMessage(error.message)
      setSaving(false)
      return
    }

    if (insertedProduct?.[0]?.id && formData.uploadedImages && formData.uploadedImages.length > 0) {
      const imageRows = formData.uploadedImages.map((img: any) => ({
        product_id: insertedProduct[0].id,
        experience_id: null,
        storage_path: img.storagePath,
        image_url: img.imageUrl,
        is_primary: img.isPrimary,
        sort_order: img.sortOrder,
      }))
      const { error: imgErr } = await supabase.from('images').insert(imageRows)
      if (imgErr) console.error('Error al registrar imágenes en public.images:', imgErr.message)
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

  const renderProductCard = (product: Product) => {
    const isOutOfStock = (() => {
      if (product.stock === undefined || product.stock === null || product.stock === '') return false
      const p = parseInt(String(product.stock).replace(/\D/g, ''), 10)
      return !isNaN(p) && p <= 0
    })()

    return (
      <div
        key={product.id}
        className="marketplace-card group"
        onClick={() => handleSelectProduct(product.id)}
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
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0) 45%, rgba(20,45,25,0.42) 100%)',
              pointerEvents: 'none',
            }}
          />
          <span style={{ position: 'absolute', top: 8, left: 8, background: product.type === 'experiencia' ? '#EAF3EC' : '#FFF6E5', color: product.type === 'experiencia' ? '#205134' : '#A86B05', fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 20, letterSpacing: 0.5 }}>
            {product.type === 'experiencia' ? '🏞️ EXPERIENCIA' : product.category ? `🌽 ${product.category.toUpperCase()}` : '🌾 PRODUCTO'}
          </span>
          {isOutOfStock ? (
            <span style={{ position: 'absolute', top: 8, right: 8, background: '#FFF3EB', color: '#9B4728', border: '1px solid #F3D2C4', fontSize: 9, fontWeight: 800, padding: '3px 7px', borderRadius: 20 }}>
              {product.type === 'experiencia' ? 'SIN CUPOS' : 'AGOTADO'}
            </span>
          ) : product.reviews > 0 ? (
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
            <div style={{ fontSize: 16, fontWeight: 800, color: product.type === 'experiencia' ? '#205134' : '#C8860A', marginBottom: 14 }}>
              {formatPrice(product.price)}
              <span style={{ fontSize: 11, color: '#888', fontWeight: 500, marginLeft: 4 }}>/ {product.unit}</span>
            </div>
          </div>

          {!isProducer && (
            isOutOfStock ? (
              <div
                style={{
                  width: '100%',
                  height: 36,
                  background: '#FFF3EB',
                  color: '#9B4728',
                  border: '1px solid #F3D2C4',
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                }}
              >
                <span>{product.type === 'experiencia' ? 'Sin cupos' : 'Agotado'}</span>
              </div>
            ) : (cart[product.id] ?? 0) > 0 && addingProduct?.id !== product.id ? (
              <button
                type="button"
                onClick={(event) => { event.stopPropagation(); addFromCard(product.id) }}
                aria-label="Producto agregado al carrito. Clic para agregar otra unidad"
                title="Clic para agregar otra unidad"
                style={{
                  width: '100%',
                  height: 36,
                  background: '#EAF6E3',
                  color: '#205134',
                  border: '1px solid #B8E2AE',
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  transition: 'all 0.2s ease',
                }}
                className="hover:bg-[#DCF0D4]"
              >
                <span>✓ Agregado</span>
                {cart[product.id] > 1 && (
                  <span
                    style={{
                      background: '#205134',
                      color: '#fff',
                      fontSize: 10,
                      borderRadius: 999,
                      padding: '1px 6px',
                      fontWeight: 800,
                    }}
                  >
                    {cart[product.id]}
                  </span>
                )}
              </button>
            ) : (
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
            )
          )}
        </div>
      </div>
    )
  }

  const outstandingProducts = products.filter((p) => {
    const ad = allAds.find((a) => a.product_id === p.id)
    return ad ? isAdvertisementActive(ad) : false
  })

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
        const sameCategory = products.filter((p) => p.id !== product.id && p.category === product.category)
        const otherProducts = products.filter((p) => p.id !== product.id && p.category !== product.category)
        const allRelated = [...sameCategory, ...otherProducts].slice(0, 10)
        return (
          <ProductDetail
            product={product}
            cart={cart}
            formatPrice={formatPrice}
            onBack={handleBackFromProduct}
            onAddToCart={addToCart}
            onRemoveFromCart={removeFromCart}
            onCheckout={handleCheckoutCart}
            related={allRelated}
            onSelectRelated={handleSelectProduct}
            addFromCard={addFromCard}
            addingProduct={addingProduct}
            onReloadProducts={loadProducts}
            isProducer={isProducer}
          />
        )
      })() : (
        <>
          {/* ══ VENTANA FLOTANTE CENTRADA: CARRUSEL DE PRODUCTOS DESTACADOS ══ */}
          {categoryFeatured && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 20,
                background: 'rgba(21, 56, 35, 0.5)',
                backdropFilter: 'blur(8px)',
              }}
              onClick={() => {
                categoryFeaturedList.forEach((f) => markPromoAsSeenInSession(f.adId))
                setDismissedCategories((prev) => ({ ...prev, [activeFilter]: true }))
              }}
            >
              {/* ── Flecha Izquierda ── */}
              {categoryFeaturedList.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); navigateFeatured('prev') }}
                  style={{
                    position: 'absolute',
                    left: 'max(12px, calc(50% - 222px))',
                    zIndex: 110,
                    width: 44,
                    height: 44,
                    background: 'none',
                    border: 'none',
                    color: '#FFF',
                    fontSize: 32,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textShadow: '0 2px 8px rgba(0,0,0,0.6)',
                    transition: 'transform 0.15s',
                  }}
                  className="hover:scale-125"
                  aria-label="Producto anterior"
                >
                  ‹
                </button>
              )}

              {/* ── Tarjeta del producto ── */}
              <div
                style={{
                  width: '100%',
                  maxWidth: 380,
                  height: 520,
                  maxHeight: '85vh',
                  borderRadius: 28,
                  overflow: 'hidden',
                  position: 'relative',
                  boxShadow: '0 25px 60px rgba(0, 0, 0, 0.45)',
                  cursor: 'pointer',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  animation: 'popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  markPromoAsSeenInSession(categoryFeatured.adId)
                  handleSelectProduct(categoryFeatured.product.id)
                }}
              >
                {/* Imagen de fondo con transición de deslizamiento */}
                <img
                  key={categoryFeatured.adId}
                  src={categoryFeatured.img}
                  alt={categoryFeatured.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    position: 'absolute',
                    inset: 0,
                    animation: featuredSlideDir
                      ? `slideOut${featuredSlideDir === 'left' ? 'Left' : 'Right'} 0.32s cubic-bezier(0.4,0,0.2,1) forwards`
                      : 'slideInFade 0.32s cubic-bezier(0.4,0,0.2,1) forwards',
                  }}
                />

                {/* Gradiente */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.05) 35%, rgba(0,0,0,0.2) 55%, rgba(0,0,0,0.92) 100%)',
                    pointerEvents: 'none',
                  }}
                />

                {/* Tag destacado */}
                <div
                  style={{
                    position: 'absolute',
                    top: 20,
                    left: 20,
                    background: 'linear-gradient(135deg, #E5AE30 0%, #BA5A30 100%)',
                    color: '#FFFFFF',
                    fontSize: 12,
                    fontWeight: 800,
                    padding: '7px 15px',
                    borderRadius: 20,
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
                    fontFamily: "'Nunito Sans', sans-serif",
                    zIndex: 5,
                  }}
                >
                  <span>⭐</span>
                  <span>Destacado</span>
                </div>

                {/* Contador de anuncios (ej: 2 / 3) — solo si hay más de uno */}
                {categoryFeaturedList.length > 1 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 20,
                      right: 66,
                      background: 'rgba(0,0,0,0.5)',
                      backdropFilter: 'blur(6px)',
                      color: '#FFF',
                      fontSize: 12,
                      fontWeight: 700,
                      padding: '5px 12px',
                      borderRadius: 20,
                      zIndex: 10,
                      border: '1px solid rgba(255,255,255,0.2)',
                    }}
                  >
                    {Math.min(featuredIndex, categoryFeaturedList.length - 1) + 1} / {categoryFeaturedList.length}
                  </div>
                )}

                {/* Botón cerrar */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    categoryFeaturedList.forEach((f) => markPromoAsSeenInSession(f.adId))
                    setDismissedCategories((prev) => ({ ...prev, [activeFilter]: true }))
                  }}
                  style={{
                    position: 'absolute',
                    top: 18,
                    right: 18,
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: 'rgba(0, 0, 0, 0.55)',
                    color: '#FFFFFF',
                    border: '1.5px solid rgba(255, 255, 255, 0.3)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    fontWeight: 800,
                    backdropFilter: 'blur(8px)',
                    zIndex: 10,
                    transition: 'all 0.2s ease',
                  }}
                  className="hover:scale-110"
                  aria-label="Cerrar producto destacado"
                >
                  ✕
                </button>

                {/* Contenido inferior */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '24px 22px 22px',
                    zIndex: 5,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        background: 'rgba(255, 255, 255, 0.22)',
                        backdropFilter: 'blur(6px)',
                        color: '#FFF8EE',
                        fontSize: 11,
                        fontWeight: 800,
                        padding: '3px 10px',
                        borderRadius: 12,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      }}
                    >
                      {categoryFeatured.product.category}
                    </span>
                    <span style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 12, fontWeight: 600 }}>
                      {categoryFeatured.product.producer}
                    </span>
                  </div>

                  <h2
                    style={{
                      margin: 0,
                      fontFamily: "'Poppins', sans-serif",
                      fontSize: 24,
                      fontWeight: 800,
                      color: '#FFFFFF',
                      lineHeight: 1.25,
                      textShadow: '0 2px 10px rgba(0,0,0,0.6)',
                    }}
                  >
                    {categoryFeatured.title}
                  </h2>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ color: '#E5AE30', fontSize: 20, fontWeight: 800, fontFamily: "'Poppins', sans-serif" }}>
                      {formatPrice(categoryFeatured.product.price)}
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600, marginLeft: 4 }}>
                        / {categoryFeatured.product.unit || 'ud'}
                      </span>
                    </span>

                    <span
                      style={{
                        background: 'linear-gradient(135deg, #205134 0%, #2A6542 100%)',
                        color: '#FFFFFF',
                        padding: '8px 16px',
                        borderRadius: 12,
                        fontSize: 13,
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.2)',
                      }}
                    >
                      Ver producto →
                    </span>
                  </div>

                  {/* Puntos indicadores */}
                  {categoryFeaturedList.length > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10 }}>
                      {categoryFeaturedList.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (!featuredAnimating) {
                              setFeaturedSlideDir(i > featuredIndex ? 'left' : 'right')
                              setFeaturedAnimating(true)
                              setTimeout(() => {
                                setFeaturedIndex(i)
                                setFeaturedSlideDir(null)
                                setFeaturedAnimating(false)
                              }, 320)
                            }
                          }}
                          style={{
                            width: i === featuredIndex ? 20 : 8,
                            height: 8,
                            borderRadius: 4,
                            background: i === featuredIndex ? '#E5AE30' : 'rgba(255,255,255,0.45)',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            transition: 'width 0.3s ease, background 0.3s ease',
                          }}
                          aria-label={`Ir al anuncio ${i + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Flecha Derecha ── */}
              {categoryFeaturedList.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); navigateFeatured('next') }}
                  style={{
                    position: 'absolute',
                    right: 'max(12px, calc(50% - 222px))',
                    zIndex: 110,
                    width: 44,
                    height: 44,
                    background: 'none',
                    border: 'none',
                    color: '#FFF',
                    fontSize: 32,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textShadow: '0 2px 8px rgba(0,0,0,0.6)',
                    transition: 'transform 0.15s',
                  }}
                  className="hover:scale-125"
                  aria-label="Producto siguiente"
                >
                  ›
                </button>
              )}
            </div>
          )}

          {/* ══ BARRA SUPER ADMIN (Si el usuario es admin) ══ */}
          {isAdmin && (
            <div
              style={{
                background: 'linear-gradient(90deg, #183B27 0%, #205134 100%)',
                color: '#fff',
                padding: '10px 18px',
                margin: '0 -18px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 4px 12px rgba(32,81,52,0.2)',
                borderRadius: '0 0 14px 14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>⚡</span>
                <div>
                  <span style={{ fontWeight: 800, fontSize: 13, fontFamily: "'Poppins', sans-serif" }}>Modo Super Administrador</span>
                  <span style={{ opacity: 0.85, fontSize: 12, marginLeft: 8, display: 'inline-block' }}>Vista previa de la tienda</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate?.('superadmin')}
                style={{
                  background: '#E5AE30',
                  color: '#153823',
                  border: 'none',
                  borderRadius: 10,
                  padding: '7px 16px',
                  fontSize: 12,
                  fontWeight: 800,
                  fontFamily: "'Nunito Sans', sans-serif",
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  transition: 'all 0.2s ease',
                }}
                className="hover:scale-105"
              >
                <span>← Volver al Dashboard</span>
              </button>
            </div>
          )}

          {/* ══ BANNER TIENDA ══ */}
          <div
            style={{
              background: 'linear-gradient(135deg, #A86B05 0%, #D4870A 60%, #E5AE30 100%)',
              borderRadius: '0 0 28px 28px',
              padding: '22px 20px 28px',
              margin: '0 -18px 20px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -20, left: 20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.10)', pointerEvents: 'none' }} />
            <p style={{ margin: 0, color: '#FFF8EE', fontSize: 11, fontFamily: "'Nunito Sans', sans-serif", fontWeight: 800, letterSpacing: 0.5 }}>🌽 MERCADOS CAMPESINOS</p>
            <h1 style={{ fontFamily: "'Poppins', sans-serif", fontSize: 22, color: '#FFFFFF', margin: '4px 0 4px', fontWeight: 700, lineHeight: 1.2 }}>Productos del campo</h1>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: 12, fontFamily: "'Nunito Sans', sans-serif" }}>Frescos y directos de productores colombianos</p>
          </div>

          {/* ══ ANUNCIOS DESTACADOS ACTIVOS (Valida fechas de activación y tipo producto) ══ */}
          {activeAds.filter(isAdvertisementActive).filter((a) => a.type === 'product' && a.product_id).length > 0 && (
            <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {activeAds.filter(isAdvertisementActive).filter((a) => a.type === 'product' && a.product_id).map((ad) => (
                <div
                  key={ad.id}
                  onClick={() => {
                    if (ad.product_id) {
                      handleSelectProduct(ad.product_id)
                    }
                  }}
                  style={{
                    cursor: ad.product_id ? 'pointer' : 'default',
                    borderRadius: 18,
                    overflow: 'hidden',
                    background: '#FFFFFF',
                    border: '1.5px solid #EDE6DD',
                    boxShadow: '0 4px 18px rgba(32,81,52,0.06)',
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 16,
                    padding: 14,
                    position: 'relative',
                    transition: 'all 0.2s ease',
                  }}
                  className="hover:border-[#205134] hover:shadow-md"
                >
                  {ad.image_url && (
                    <img
                      src={ad.image_url}
                      alt={ad.title}
                      style={{
                        width: 84,
                        height: 84,
                        borderRadius: 14,
                        objectFit: 'cover',
                        flexShrink: 0,
                        border: '1px solid #E8DED0',
                      }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span
                        style={{
                          background: '#EAF4ED',
                          color: '#205134',
                          fontSize: 10,
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 20,
                          textTransform: 'uppercase',
                        }}
                      >
                        📢 Destacado
                      </span>
                      <span style={{ fontSize: 11, color: '#8C827A', fontWeight: 600 }}>El Campo Nos Une</span>
                    </div>
                    <h3
                      style={{
                        margin: '0 0 6px 0',
                        fontSize: 15,
                        fontWeight: 700,
                        color: '#205134',
                        fontFamily: "'Poppins', sans-serif",
                        lineHeight: 1.3,
                      }}
                    >
                      {ad.title}
                    </h3>
                    {ad.product_id && (
                      <p style={{ margin: 0, fontSize: 12, color: '#BA5A30', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>Ver producto en catálogo</span>
                        <span>→</span>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

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
                <p style={{ margin: 0, color: '#C8860A', fontSize: 11, fontFamily: "'Poppins', sans-serif", fontWeight: 800, letterSpacing: 0.2 }}>
                  PRODUCTOS GENUINOS.
                </p>

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


