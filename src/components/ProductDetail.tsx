import React, { useRef, useState, useEffect } from 'react'
import FavoriteButton from './FavoriteButton'
import { supabase } from '../lib/supabase'
import { isMainStore, type StoreId } from '../lib/stores'
import type { Product } from '../lib/catalog'
import type { Database } from '../lib/database.types'

// Reseña con el nombre público del autor (vista public_profiles)
type ReviewWithAuthor = Pick<Database['public']['Tables']['product_reviews']['Row'], 'id' | 'rating' | 'comment' | 'created_at' | 'user_id'> & {
  profiles: Pick<Database['public']['Views']['public_profiles']['Row'], 'first_name' | 'last_name' | 'org_name'> | null
}

// Detalle de un producto del marketplace (galería, reseñas, carrito y relacionados)
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
  store?: StoreId
}

export default function ProductDetail({
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
  store = 'campo',
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
  const [reviewsList, setReviewsList] = useState<ReviewWithAuthor[]>([])
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
        .select('id, rating, comment, created_at, user_id, profiles:public_profiles(first_name, last_name, org_name)')
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
    ? product.images.map((i) => i.image_url)
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
                {product.description || (!isMainStore(store)
                  ? 'Producto seleccionado directamente de productores y comunidades locales que trabajan con prácticas sostenibles.'
                  : 'Producto del campo colombiano, seleccionado directamente de productores y comunidades locales que trabajan con prácticas sostenibles.')}
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

              {/* Guardar en favoritos (compradores) */}
              {!isProducer && !isExperience && <FavoriteButton productId={product.id} />}
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
