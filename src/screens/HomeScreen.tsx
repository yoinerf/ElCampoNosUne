import { useState, useEffect } from 'react'
import ScreenShell from '../components/ScreenShell'
import { supabase } from '../lib/supabase'
import { isAdvertisementActive } from '../lib/dateColombia'
import bannerImg from '../assets/banner-campo.webp'
import AutoCarousel from '../components/AutoCarousel'
import type { Tab, UserRole } from '../lib/types'
import { primaryImageUrl } from '../lib/catalog'
import { fetchSellerSales } from '../lib/orders'


interface Props {
  onNavigate: (tab: Tab) => void
  activeNav?: Tab
  onProfileClick?: () => void
  userRole?: UserRole | null
  onSelectProduct?: (productId: string) => void
}

interface FeaturedProduct {
  id: string
  title: string
  producer: string
  rating: number
  price: number
  img: string
}

interface TourismPreview {
  id: string
  title: string
  host: string
  price: number
  img: string
  tags: string[]
}

interface ActivityItem {
  id: string
  icon: string
  text: string
  color: string
  created_at: string
}

const getActivityTypeMeta = (type: string) => {
  switch (type) {
    case 'product_created':
      return { icon: '📦', color: '#E5AE30', label: 'Producto publicado' }
    case 'experience_created':
      return { icon: '🏞️', color: '#6BAA3D', label: 'Experiencia publicada' }
    case 'purchase':
      return { icon: '🛒', color: '#9B4728', label: 'Compra registrada' }
    case 'reservation':
      return { icon: '✅', color: '#6BAA3D', label: 'Reserva creada' }
    case 'message':
      return { icon: '💬', color: '#5A7BCA', label: 'Mensaje nuevo' }
    default:
      return { icon: '✨', color: '#6BAA3D', label: 'Actividad' }
  }
}

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

function getColombianGreeting(): { text: string; icon: string } {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Bogota',
      hour: '2-digit',
      hour12: false,
    }).format(new Date())
  )

  if (hour < 12) return { text: 'Buenos días', icon: '☀️' }
  if (hour < 19) return { text: 'Buenas tardes', icon: '🌤️' }
  return { text: 'Buenas noches', icon: '🌙' }
}

const PLACEHOLDER_PRODUCT_IMG = 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=900&h=700&fit=crop&auto=format'
const PLACEHOLDER_EXPERIENCE_IMG = 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&h=700&fit=crop&auto=format'

export default function HomeScreen({ onNavigate, activeNav, onProfileClick, userRole: propUserRole, onSelectProduct }: Props) {
  const [firstName, setFirstName] = useState('')
  const [featured, setFeatured] = useState<FeaturedProduct[]>([])
  const [tourism, setTourism] = useState<TourismPreview[]>([])
  const [notifications, setNotifications] = useState<ActivityItem[]>([])
  const [stats, setStats] = useState({ productos: 0, pedidos: 0, ingresos: 0 })
  const [userRole, setUserRole] = useState<'asociacion' | 'turismo' | 'comprador' | null>(null)
  const [loading, setLoading] = useState(true)
  const isBuyer = userRole === 'comprador'

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, user_type')
          .eq('id', user.id)
          .single()
        if (profile) {
          setFirstName(profile.first_name)
          setUserRole((profile.user_type as 'asociacion' | 'turismo' | 'comprador') ?? null)
        }

        if (profile) {
          const role = profile.user_type as 'asociacion' | 'turismo' | 'comprador'

          if (role !== 'comprador') {
            // Publicados y ventas del vendedor (antes se leían sus propias reservas como si fueran ventas)
            const [{ count: productosCount }, sales] = await Promise.all([
              role === 'turismo'
                ? supabase.from('experiences').select('id', { count: 'exact', head: true }).eq('host_id', user.id)
                : supabase.from('products').select('id', { count: 'exact', head: true }).eq('producer_id', user.id),
              fetchSellerSales(user.id),
            ])

            setStats({
              productos: productosCount ?? 0,
              pedidos: sales.count,
              ingresos: sales.income,
            })
          } else {
            const { count: pedidosCount } = await supabase
              .from('activities')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .in('type', ['purchase', 'reservation'])

            setStats({
              productos: 0,
              pedidos: pedidosCount ?? 0,
              ingresos: 0,
            })
          }
        }

        const { data: activities, error: activitiesError } = await supabase
          .from('activities')
          .select('id, type, title, description, created_at, user_role')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5)

        if (!activitiesError && activities) {
          setNotifications(
            activities.map((item) => {
              const meta = getActivityTypeMeta(item.type ?? 'activity')
              const text = item.description || item.title || meta.label
              return {
                id: item.id,
                icon: meta.icon,
                text,
                color: meta.color,
                created_at: item.created_at,
              }
            })
          )
        }
      }

      // ══════ PRODUCTOS PATROCINADOS (via advertisements) ══════
      try {
        const [{ data: products }, { data: reviewsData }, { data: adsData }] = await Promise.all([
          // Solo productos de El Campo Nos Une (los de la Tienda Amazónica no salen aquí)
          supabase.from('products').select('id, title, producer, rating, price, outstanding, images(*), profiles:public_profiles(org_name, first_name, last_name)').eq('store', 'campo').order('created_at', { ascending: false }).limit(30),
          supabase.from('product_reviews').select('product_id, rating'),
          supabase.from('advertisements').select('*').order('created_at', { ascending: false }),
        ])

        const reviewsMap: Record<string, number[]> = {}
        if (reviewsData) {
          for (const r of reviewsData) {
            if (r.product_id) {
              if (!reviewsMap[r.product_id]) reviewsMap[r.product_id] = []
              reviewsMap[r.product_id].push(r.rating)
            }
          }
        }

        // Filtrar anuncios activos según la hora oficial de Colombia
        const activeProductAds = (adsData || []).filter(ad => ad.type === 'product' && isAdvertisementActive(ad))

        const processed = (products ?? []).map((p) => {
          const ratings = reviewsMap[p.id] || []
          const avg = ratings.length > 0
            ? Number((ratings.reduce((sum, val) => sum + val, 0) / ratings.length).toFixed(1))
            : (p.rating ?? 5)
          const primaryImg = primaryImageUrl(p.images, PLACEHOLDER_PRODUCT_IMG)

          const matchingAd = activeProductAds.find((ad) => ad.product_id === p.id)
          const isAdFeatured = !!matchingAd

          const existingAd = (adsData || []).find((ad) => ad.product_id === p.id)
          const isAdExpiredOrInactive = existingAd ? !isAdvertisementActive(existingAd) : false

          const isOutstandingValid = p.outstanding === true && !isAdExpiredOrInactive

          const profile = p.profiles
          const producerName = profile
            ? (profile.org_name?.trim() || `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || p.producer || 'Productor')
            : (p.producer || 'Productor')

          return {
            ...p,
            producer: producerName,
            title: matchingAd?.title || p.title,
            img: matchingAd?.image_url || primaryImg,
            rating: avg,
            isAdFeatured,
            isOutstandingValid,
          }
        })

        const existingIds = new Set(processed.map((p) => p.id))
        for (const ad of activeProductAds) {
          if (ad.product_id && !existingIds.has(ad.product_id)) {
            const { data: missingProd } = await supabase
              .from('products')
              .select('id, title, producer, rating, price, outstanding, images(*), profiles:public_profiles(org_name, first_name, last_name)')
              .eq('id', ad.product_id)
              .eq('store', 'campo')
              .maybeSingle()
            if (missingProd) {
              const primaryImg = primaryImageUrl(missingProd.images, PLACEHOLDER_PRODUCT_IMG)
              const profile = missingProd.profiles
              const producerName = profile
                ? (profile.org_name?.trim() || `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || missingProd.producer || 'Productor')
                : (missingProd.producer || 'Productor')

              processed.unshift({
                ...missingProd,
                producer: producerName,
                title: ad.title || missingProd.title,
                img: ad.image_url || primaryImg,
                rating: missingProd.rating ?? 5,
                isAdFeatured: true,
                isOutstandingValid: true,
              })
              existingIds.add(missingProd.id)
            }
          }
        }

        processed.sort((a, b) => {
          if (a.isAdFeatured && !b.isAdFeatured) return -1
          if (!a.isAdFeatured && b.isAdFeatured) return 1
          if (a.isOutstandingValid && !b.isOutstandingValid) return -1
          if (!a.isOutstandingValid && b.isOutstandingValid) return 1
          return b.rating - a.rating
        })

        setFeatured(processed.slice(0, 9))
      } catch (e) {
        console.error('Error cargando productos patrocinados en HomeScreen:', e)
      }

      // ══════ EXPERIENCIAS PATROCINADAS (via advertisements) ══════
      try {
        const { data: experienceAds } = await supabase
          .from('advertisements')
          .select('id, experiences (id, title, host, price, tags, images (image_url, is_primary))')
          .eq('type', 'experience')
          .eq('active', true)
          .lte('starts_at', new Date().toISOString())
          .gte('ends_at', new Date().toISOString())
          .order('starts_at', { ascending: false })
          .limit(6)

        const featuredExperiences: TourismPreview[] = (experienceAds || []).flatMap((ad) => {
          const experience = ad.experiences
          if (!experience) return []
          const primaryImage = experience.images?.find((img) => img.is_primary) || experience.images?.[0]
          return [{
            id: experience.id,
            title: experience.title,
            host: experience.host ?? '',
            price: experience.price,
            tags: experience.tags ?? [],
            img: primaryImage?.image_url || PLACEHOLDER_EXPERIENCE_IMG,
          }]
        })

        setTourism(featuredExperiences)
      } catch (e) {
        console.error('Error cargando experiencias patrocinadas en HomeScreen:', e)
      }

      setLoading(false)
    }

    loadData()
  }, [])

  const greeting = getColombianGreeting()

  const formatPrice = (n: number) => `$${n.toLocaleString('es-CO')}`
  const formatCompact = (n: number) => {
    if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `$${Math.round(n / 1000)}K`
    return `$${n}`
  }

  return (
    <ScreenShell
      activeNav={activeNav ?? 'home'}
      onNavigate={onNavigate}
      onProfileClick={onProfileClick}
      userRole={userRole || propUserRole}
      contentStyle={{ paddingBottom: 32 }}
    >
      {/* ══════ BANNER SIEMPRE VISIBLE ══════ */}
      <div style={{ margin: '0 -18px 0', animation: 'fadeInBanner 0.8s ease-out' }}>
        <img
          src={bannerImg}
          alt="El Campo Nos Une — Conectamos con lo mejor del campo con las personas"
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
      </div>

      {/* ══════ HERO — saludo si está logueado ══════ */}
      {firstName && (
        <div
          style={{
            background: 'linear-gradient(135deg, #205134 0%, #2E6B42 100%)',
            borderRadius: '0 0 28px 28px',
            padding: '28px 20px 32px',
            margin: '0 -18px 24px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(107,170,61,0.15)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -20, right: 40, width: 80, height: 80, borderRadius: '50%', background: 'rgba(229,174,48,0.12)', pointerEvents: 'none' }} />
          <p style={{ margin: 0, color: '#6BAA3D', fontSize: 13, fontFamily: "'Nunito Sans', sans-serif", fontWeight: 700, letterSpacing: 0.3 }}>
            {greeting.icon} {greeting.text}
          </p>
          <h1 style={{ fontFamily: "'Poppins', sans-serif", fontSize: 26, color: '#F5EEE6', margin: '4px 0 6px', fontWeight: 700, lineHeight: 1.2 }}>
            Hola, {firstName}
          </h1>
          <p style={{ margin: 0, color: 'rgba(245,238,230,0.75)', fontSize: 13, fontFamily: "'Nunito Sans', sans-serif" }}>
            Conecta con productos, experiencias y comunidades del territorio.
          </p>
        </div>
      )}

      {/* Espaciado cuando no hay saludo */}
      {!firstName && <div style={{ height: 24 }} />}

      {/* ══════ STATS (solo productores) ══════ */}
      {!isBuyer && firstName && (
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 20,
            boxShadow: '0 4px 24px rgba(32,81,52,0.09)',
            padding: '14px 16px',
            display: 'flex',
            gap: 0,
            marginBottom: 24,
            border: '1px solid #EDE4D8',
          }}
        >
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse" style={{ flex: 1, textAlign: 'center', borderRight: i < 2 ? '1px solid #E8DED0' : 'none', padding: '10px 8px 6px' }}>
                  <div style={{ width: 24, height: 24, margin: '0 auto 8px', borderRadius: 8, background: '#E9E2D9' }} />
                  <div style={{ height: 18, margin: '0 auto 6px', width: '60%', borderRadius: 8, background: '#E9E2D9' }} />
                  <div style={{ height: 11, width: '68%', margin: '0 auto', borderRadius: 8, background: '#F0E9E0' }} />
                </div>
              ))
            : [
                { label: 'Productos', value: String(stats.productos), icon: '📦' },
                { label: 'Pedidos', value: String(stats.pedidos), icon: '🛒' },
                { label: 'Ingresos', value: formatCompact(stats.ingresos), icon: '💰' },
              ].map((s, i) => (
                <div key={s.label} style={{ flex: 1, textAlign: 'center', borderRight: i < 2 ? '1px solid #E8DED0' : 'none', padding: '8px 6px' }}>
                  <div style={{ fontSize: 20 }}>{s.icon}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#205134', fontFamily: "'Poppins', sans-serif", lineHeight: 1.2 }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: 11, color: '#8A8070', fontFamily: "'Nunito Sans', sans-serif" }}>
                    {s.label}
                  </div>
                </div>
              ))}
        </div>
      )}

      {/* ══════ EXPLORA — tarjetas de sección ══════ */}
      <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
        <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: 18, color: '#205134', margin: 0, fontWeight: 700 }}>
          Explora
        </h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 28 }}>
        {/* Productos — Dorado según manual de identidad */}
        <div
          onClick={() => onNavigate('market')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate('market')}
          style={{
            borderRadius: 20,
            background: 'linear-gradient(135deg, #C8860A 0%, #E5AE30 100%)',
            padding: '20px 18px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 10,
            cursor: 'pointer',
            boxShadow: '0 6px 20px rgba(200,134,10,0.25)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: -20, right: -20, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />
          <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
            🌽
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1C2700', fontFamily: "'Poppins', sans-serif", lineHeight: 1.2 }}>
              Productos
            </div>
            <div style={{ fontSize: 11, color: 'rgba(28,39,0,0.65)', fontFamily: "'Nunito Sans', sans-serif", marginTop: 2 }}>
              Mercados campesinos
            </div>
          </div>
        </div>

        {/* Experiencias — Verde según manual de identidad */}
        <div
          onClick={() => onNavigate('tourism')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate('tourism')}
          style={{
            borderRadius: 20,
            background: 'linear-gradient(135deg, #205134 0%, #6BAA3D 100%)',
            padding: '20px 18px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 10,
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: -20, right: -20, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }} />
          <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
            🏞️
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#F5EEE6', fontFamily: "'Poppins', sans-serif", lineHeight: 1.2 }}>
              Experiencias
            </div>
            <div style={{ fontSize: 11, color: 'rgba(245,238,230,0.75)', fontFamily: "'Nunito Sans', sans-serif", marginTop: 2 }}>
              Turismo comunitario
            </div>
          </div>
        </div>
      </div>

      {/* ══════ PRODUCTOS DESTACADOS ══════ */}
      <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
        <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: 18, color: '#205134', margin: 0, fontWeight: 700 }}>
          Productos destacados
        </h2>
        <span
          style={{ fontSize: 12, color: '#C8860A', fontWeight: 700, fontFamily: "'Nunito Sans', sans-serif", cursor: 'pointer' }}
          onClick={() => onNavigate('market')}
        >
          Ver todos →
        </span>
      </div>
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="animate-pulse" style={{ background: '#f2eae0', borderRadius: 18, height: 200, border: '1px solid #E8E0CF', overflow: 'hidden' }}>
              <div style={{ height: 120, background: '#E9E2D9' }} />
              <div style={{ padding: '10px 12px 12px' }}>
                <div style={{ height: 13, width: '75%', borderRadius: 8, background: '#E9E2D9', marginBottom: 8 }} />
                <div style={{ height: 10, width: '55%', borderRadius: 8, background: '#F0E9E0' }} />
              </div>
            </div>
          ))}
        </div>
      ) : featured.length === 0 ? (
        <p style={{ fontSize: 13, color: '#8A8070', fontFamily: "'Nunito Sans', sans-serif", marginBottom: 28 }}>
          Aún no hay productos destacados.
        </p>
      ) : (
        <div style={{ marginBottom: 28 }}>
          <AutoCarousel perView={3}>
            {featured.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectProduct ? onSelectProduct(item.id) : onNavigate('market')}
                style={{
                  background: '#fff',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: '1px solid #E8E0CF',
                  borderRadius: 20,
                  boxShadow: '0 4px 20px rgba(42,92,26,0.10)',
                  transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 8px 28px rgba(42,92,26,0.18)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(42,92,26,0.10)'
                }}
              >
                <div style={{ position: 'relative', height: 280 }}>
                  <img src={item.img} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(180deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0) 45%, rgba(20,45,25,0.4) 100%)',
                      pointerEvents: 'none',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 10,
                      left: 10,
                      background: '#E5AE30',
                      color: '#1C2700',
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: "'Nunito Sans', sans-serif",
                      padding: '3px 10px',
                      borderRadius: 20,
                      letterSpacing: 0.3,
                    }}
                  >
                    PATROCINADO
                  </div>
                </div>
                <div style={{ padding: '12px 14px 14px' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#205134', fontFamily: "'Poppins', sans-serif", marginBottom: 4 }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 12, color: '#8A8070', fontFamily: "'Nunito Sans', sans-serif", marginBottom: 8 }}>
                    {item.producer}
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#C8860A', fontFamily: "'Nunito Sans', sans-serif" }}>
                      {formatPrice(item.price)}
                    </span>
                    <span style={{ fontSize: 12, color: '#3D7A28', fontFamily: "'Nunito Sans', sans-serif" }}>
                      ⭐ {item.rating}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </AutoCarousel>
        </div>
      )}

      {/* ══════ BANNER EXPERIENCIAS ══════ */}
      <div
        style={{ borderRadius: 20, overflow: 'hidden', position: 'relative', height: 130, marginBottom: 28, cursor: 'pointer' }}
        onClick={() => onNavigate('tourism')}
      >
        <img
          src="https://images.unsplash.com/photo-1717201413771-faa0210c5dae?w=700&h=240&fit=crop&auto=format"
          alt="Turismo comunitario"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, rgba(28,63,16,0.88) 0%, rgba(28,63,16,0.25) 100%)',
            padding: '18px 22px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <p style={{ color: '#6BAA3D', fontSize: 11, margin: 0, fontFamily: "'Nunito Sans', sans-serif", fontWeight: 800, letterSpacing: 0.5 }}>
            TURISMO COMUNITARIO
          </p>
          <h3 style={{ color: '#F5EEE6', fontSize: 17, margin: '5px 0 0', fontFamily: "'Poppins', sans-serif", fontWeight: 700, lineHeight: 1.3 }}>
            Descubre experiencias únicas en el campo →
          </h3>
        </div>
      </div>

      {/* ══════ EXPERIENCIAS DESTACADAS ══════ */}
      {tourism.length > 0 && (
        <>
          <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
            <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: 18, color: '#205134', margin: 0, fontWeight: 700 }}>
              Experiencias
            </h2>
            <span
              style={{ fontSize: 12, color: '#205134', fontWeight: 700, fontFamily: "'Nunito Sans', sans-serif", cursor: 'pointer' }}
              onClick={() => onNavigate('tourism')}
            >
              Ver todas →
            </span>
          </div>
          <div style={{ marginBottom: 28 }}>
            <AutoCarousel>
              {tourism.map((exp) => (
                <div
                  key={exp.id}
                  onClick={() => onNavigate('tourism')}
                  style={{ background: '#fff', overflow: 'hidden', cursor: 'pointer', border: '1px solid #E8E0CF', borderRadius: 20, boxShadow: '0 4px 20px rgba(42,92,26,0.10)' }}
                >
                  <div style={{ position: 'relative', height: 220 }}>
                    <img src={exp.img} alt={exp.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(180deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0) 45%, rgba(20,45,25,0.4) 100%)',
                        pointerEvents: 'none',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: 10,
                        left: 10,
                        background: '#E5AE30',
                        color: '#1C2700',
                        fontSize: 10,
                        fontWeight: 700,
                        fontFamily: "'Nunito Sans', sans-serif",
                        padding: '3px 10px',
                        borderRadius: 20,
                        letterSpacing: 0.3,
                      }}
                    >
                      PATROCINADO
                    </div>
                  </div>
                  <div style={{ padding: '12px 14px 14px' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#205134', fontFamily: "'Poppins', sans-serif", marginBottom: 4 }}>
                      {exp.title}
                    </div>
                    <div style={{ fontSize: 12, color: '#8A8070', fontFamily: "'Nunito Sans', sans-serif", marginBottom: 8 }}>
                      {exp.host}
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#205134', fontFamily: "'Nunito Sans', sans-serif" }}>
                      {formatPrice(exp.price)}
                    </span>
                  </div>
                </div>
              ))}
            </AutoCarousel>
          </div>
        </>
      )}

      {/* ══════ ACTIVIDAD RECIENTE ══════ */}
      <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: 18, color: '#205134', margin: '0 0 14px', fontWeight: 700 }}>
        Actividad reciente
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="animate-pulse" style={{ background: '#fff', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, border: '1px solid #E8E0CF', height: 68 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: '#E9E2D9' }} />
              <div style={{ flex: 1, display: 'grid', gap: 8 }}>
                <div style={{ height: 12, width: '75%', borderRadius: 8, background: '#E9E2D9' }} />
                <div style={{ height: 10, width: '35%', borderRadius: 8, background: '#F0E9E0' }} />
              </div>
            </div>
          ))
        ) : notifications.length === 0 ? (
          <p style={{ fontSize: 13, color: '#8A8070', fontFamily: "'Nunito Sans', sans-serif" }}>
            No tienes actividad reciente.
          </p>
        ) : (
          notifications.map((a) => (
            <div key={a.id} style={{ background: '#fff', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, border: '1px solid #E8E0CF' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: a.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                {a.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#205134', fontFamily: "'Nunito Sans', sans-serif" }}>
                  {a.text}
                </div>
                <div style={{ fontSize: 11, color: '#8A8070', fontFamily: "'Nunito Sans', sans-serif", marginTop: 2 }}>
                  {timeAgo(a.created_at)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </ScreenShell>
  )
}