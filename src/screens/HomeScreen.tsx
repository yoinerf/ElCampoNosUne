import { useState, useEffect } from 'react'
import ScreenShell from '../components/ScreenShell'
import { supabase } from '../lib/supabase'

type Tab = 'home' | 'market' | 'tourism' | 'profile'

interface Props {
  onNavigate: (tab: Tab) => void
}

interface FeaturedProduct {
  id: string
  title: string
  producer: string
  rating: number
  price: number
  img: string
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
      return { icon: '🏞️', color: '#205134', label: 'Experiencia publicada' }
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

const categories = [
  { icon: '🌽', label: 'Mercados\nCampesinos', color: '#E5AE30', tab: 'market' as Tab },
  { icon: '🏞️', label: 'Turismo\nComunitario', color: '#205134', tab: 'tourism' as Tab },
]

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

  if (hour < 12) return { text: 'Buenos días', icon: '👋' }
  if (hour < 19) return { text: 'Buenas tardes', icon: '☀️' }
  return { text: 'Buenas noches', icon: '🌙' }
}

export default function HomeScreen({ onNavigate }: Props) {
  const [searchVal, setSearchVal] = useState('')
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
            const { count: productosCount } = await supabase
              .from('products')
              .select('*', { count: 'exact', head: true })
              .eq('producer_id', user.id)

            const { data: reservations, count: pedidosCount } = await supabase
              .from('reservations')
              .select('*, products(price), experiences(price)', { count: 'exact' })
              .eq('user_id', user.id)

            const ingresos = (reservations || []).reduce((sum, r: any) => {
              const price = r.products?.price ?? r.experiences?.price ?? 0
              return sum + price * (r.quantity ?? 1)
            }, 0)

            setStats({
              productos: productosCount ?? 0,
              pedidos: pedidosCount ?? 0,
              ingresos,
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

      const { data: products } = await supabase
        .from('products')
        .select('id, title, producer, rating, price, img')
        .order('rating', { ascending: false })
        .limit(3)
      if (products) setFeatured(products)

      setLoading(false)
    }

    loadData()
  }, [])

  const greeting = getColombianGreeting()
  const normalizedQuery = searchVal.trim().toLowerCase()
  const filteredFeatured = normalizedQuery
    ? featured.filter((item) =>
        item.title.toLowerCase().includes(normalizedQuery) ||
        item.producer.toLowerCase().includes(normalizedQuery)
      )
    : featured

  const formatPrice = (n: number) => `$${n.toLocaleString('es-CO')}`
  const formatCompact = (n: number) => {
    if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `$${Math.round(n / 1000)}K`
    return `$${n}`
  }

  return (
    <ScreenShell
      subtitle={`${greeting.text} 👋 `}
      title={firstName || 'Bienvenido'}
      action={
        <div className="relative">
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: '#F5EEE6',
              overflow: 'hidden',
              border: '2px solid #6BAA3D',
            }}
          >
            <img
              src="https://images.unsplash.com/photo-1509099381441-ea3c0cf98b94?w=80&h=80&fit=crop&auto=format"
              alt="Perfil"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: '#E5AE30',
              border: '2px solid #205134',
            }}
          />
        </div>
      }
      searchPlaceholder="Buscar productos, servicios..."
      searchValue={searchVal}
      onSearchChange={(value) => setSearchVal(value)}
      contentStyle={{ paddingBottom: 20 }}
    >
        {!isBuyer && (
          <div
            style={{
              background: '#F5EEE6',
              borderRadius: 20,
              boxShadow: '0 4px 24px rgba(32,81,52,0.12)',
              padding: '12px 16px',
              display: 'flex',
              gap: 0,
              marginBottom: 18,
            }}
          >
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse"
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      borderRight: i < 2 ? '1px solid #E8DED0' : 'none',
                      padding: '10px 8px 6px',
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        margin: '0 auto 8px',
                        borderRadius: 8,
                        background: '#E9E2D9',
                      }}
                    />
                    <div style={{ height: 18, margin: '0 auto 6px', width: '60%', borderRadius: 8, background: '#E9E2D9' }} />
                    <div style={{ height: 11, width: '68%', margin: '0 auto', borderRadius: 8, background: '#F0E9E0' }} />
                  </div>
                ))
              : [
                  { label: 'Productos', value: String(stats.productos), icon: '📦' },
                  { label: 'Pedidos', value: String(stats.pedidos), icon: '🛒' },
                  { label: 'Ingresos', value: formatCompact(stats.ingresos), icon: '💰' },
                ].map((s, i) => (
                  <div
                    key={s.label}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      borderRight: i < 2 ? '1px solid #E8DED0' : 'none',
                    }}
                  >
                    <div style={{ fontSize: 20 }}>{s.icon}</div>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: '#205134',
                        fontFamily: "'Poppins', sans-serif",
                        lineHeight: 1.2,
                      }}
                    >
                      {s.value}
                    </div>
                    <div style={{ fontSize: 11, color: '#666666', fontFamily: "'Nunito Sans', sans-serif" }}>
                      {s.label}
                    </div>
                  </div>
                ))}
          </div>
        )}

        {/* Categories */}
        <h3 style={{ fontFamily: "'Poppins', sans-serif", fontSize: 17, color: '#205134', margin: '20px 0 12px', fontWeight: 700 }}>
          Explora
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 18 }}>
          {categories.map((cat) => (
            <div
              key={cat.label}
              onClick={() => onNavigate(cat.tab)}
              style={{
                borderRadius: 20,
                background: cat.color + '12',
                border: `2px solid ${cat.color}30`,
                padding: '18px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 20,
                  background: cat.color + '20',
                  border: `1.5px solid ${cat.color}50`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 32,
                }}
              >
                {cat.icon}
              </div>
              <span
                style={{
                  fontSize: 13,
                  color: cat.color,
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 700,
                  textAlign: 'center',
                  lineHeight: 1.3,
                  whiteSpace: 'pre-line',
                }}
              >
                {cat.label}
              </span>
            </div>
          ))}
        </div>

        {/* Featured products */}
        <div className="flex items-center justify-between mb-3">
          <h3 style={{ fontFamily: "'Poppins', sans-serif", fontSize: 17, color: '#205134', margin: 0, fontWeight: 700 }}>
            {normalizedQuery ? 'Resultados en mercados' : 'Mercados Campesinos'}
          </h3>
          <span
            style={{ fontSize: 12, color: '#E5AE30', fontWeight: 600, fontFamily: "'Nunito Sans', sans-serif", cursor: 'pointer' }}
            onClick={() => onNavigate('market')}
          >
            Ver más
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, paddingBottom: 4, marginBottom: 18 }}>
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse"
                style={{
                  background: '#f2eae0',
                  borderRadius: 18,
                  height: 190,
                  border: '1px solid #E8E0CF',
                  overflow: 'hidden',
                }}
              >
                <div style={{ height: 110, background: '#E9E2D9' }} />
                <div style={{ padding: '10px 12px 12px' }}>
                  <div style={{ height: 13, width: '75%', borderRadius: 8, background: '#E9E2D9', marginBottom: 8 }} />
                  <div style={{ height: 10, width: '55%', borderRadius: 8, background: '#F0E9E0', marginBottom: 12 }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ height: 12, width: '30%', borderRadius: 8, background: '#E9E2D9' }} />
                    <div style={{ height: 12, width: '22%', borderRadius: 8, background: '#F0E9E0' }} />
                  </div>
                </div>
              </div>
            ))
          ) : filteredFeatured.length === 0 ? (
            <p style={{ fontSize: 13, color: '#666666', fontFamily: "'Nunito Sans', sans-serif", gridColumn: '1 / -1' }}>
              {normalizedQuery ? 'No encontramos productos con esa búsqueda.' : 'Aún no hay productos destacados.'}
            </p>
          ) : (
            filteredFeatured.map((item) => (
              <div
                key={item.id}
                style={{
                  background: '#fff',
                  borderRadius: 18,
                  overflow: 'hidden',
                  boxShadow: '0 2px 16px rgba(42,92,26,0.08)',
                  border: '1px solid #E8E0CF',
                }}
              >
                <div style={{ position: 'relative', height: 110 }}>
                  <img
                    src={item.img}
                    alt={item.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      background: '#D4870A',
                      color: '#F5EEE6',
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: "'Nunito Sans', sans-serif",
                      padding: '2px 8px',
                      borderRadius: 20,
                    }}
                  >
                    Destacado
                  </div>
                </div>
                <div style={{ padding: '10px 12px 12px' }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#205134',
                      fontFamily: "'Poppins', sans-serif",
                      lineHeight: 1.3,
                      marginBottom: 4,
                    }}
                  >
                    {item.title}
                  </div>
                  <div style={{ fontSize: 11, color: '#8A8070', fontFamily: "'Nunito Sans', sans-serif", marginBottom: 8 }}>
                    {item.producer}
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#D4870A', fontFamily: "'Nunito Sans', sans-serif" }}>
                      {formatPrice(item.price)}
                    </span>
                    <span style={{ fontSize: 11, color: '#3D7A28', fontFamily: "'Nunito Sans', sans-serif" }}>
                      ⭐ {item.rating}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div
          style={{
            borderRadius: 20,
            overflow: 'hidden',
            position: 'relative',
            height: 120,
            marginBottom: 18,
            cursor: 'pointer',
          }}
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
              background: 'linear-gradient(90deg, rgba(28,63,16,0.85) 0%, rgba(28,63,16,0.3) 100%)',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <p style={{ color: '#6BAA3D', fontSize: 11, margin: 0, fontFamily: "'Nunito Sans', sans-serif", fontWeight: 700 }}>
              TURISMO COMUNITARIO
            </p>
            <h4 style={{ color: '#F5EEE6', fontSize: 17, margin: '4px 0 0', fontFamily: "'Poppins', sans-serif", fontWeight: 700 }}>
              Descubre experiencias únicas en el campo →
            </h4>
          </div>
        </div>

        {/* Notifications */}
        <h3 style={{ fontFamily: "'Poppins', sans-serif", fontSize: 17, color: '#205134', margin: '0 0 12px', fontWeight: 700 }}>
          Actividad reciente
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse"
                style={{
                  background: '#f4efe8',
                  borderRadius: 14,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  border: '1px solid #E8E0CF',
                  height: 68,
                }}
              >
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
              <div
                key={a.id}
                style={{
                  background: '#fff',
                  borderRadius: 14,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  border: '1px solid #E8E0CF',
                }}
              >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: a.color + '18',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  flexShrink: 0,
                }}
              >
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

