import { useState, useEffect } from 'react'
import ScreenShell from '../components/ScreenShell'
import { supabase } from '../lib/supabase'

type Tab = 'home' | 'market' | 'tourism' | 'profile'

interface Props {
  onNavigate: (tab: Tab) => void
  activeNav?: Tab
  onProfileClick?: () => void
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

export default function HomeScreen({ onNavigate, activeNav, onProfileClick }: Props) {
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

      const { data: tourismData } = await supabase
        .from('experiences')
        .select('id, title, host, price, img, tags')
        .order('created_at', { ascending: false })
        .limit(3)
      if (tourismData) setTourism(tourismData as TourismPreview[])

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
      contentStyle={{ paddingBottom: 32 }}
    >
      {/* ══════ HERO / SALUDO ══════ */}
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
        {/* Decoración orgánica */}
        <div
          style={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 180,
            height: 180,
            borderRadius: '50%',
            background: 'rgba(107,170,61,0.15)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -20,
            right: 40,
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'rgba(229,174,48,0.12)',
            pointerEvents: 'none',
          }}
        />

        <p
          style={{
            margin: 0,
            color: '#6BAA3D',
            fontSize: 13,
            fontFamily: "'Nunito Sans', sans-serif",
            fontWeight: 700,
            letterSpacing: 0.3,
          }}
        >
          {greeting.icon} {greeting.text}
        </p>
        <h1
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: 26,
            color: '#F5EEE6',
            margin: '4px 0 6px',
            fontWeight: 700,
            lineHeight: 1.2,
          }}
        >
          {firstName ? `Hola, ${firstName}` : 'Bienvenido al campo'}
        </h1>
        <p
          style={{
            margin: 0,
            color: 'rgba(245,238,230,0.75)',
            fontSize: 13,
            fontFamily: "'Nunito Sans', sans-serif",
          }}
        >
          Conecta con productos, experiencias y comunidades del territorio.
        </p>
      </div>

      {/* ══════ STATS (solo productores) ══════ */}
      {!isBuyer && (
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
                <div
                  key={s.label}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    borderRight: i < 2 ? '1px solid #E8DED0' : 'none',
                    padding: '8px 6px',
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
                  <div style={{ fontSize: 11, color: '#8A8070', fontFamily: "'Nunito Sans', sans-serif" }}>
                    {s.label}
                  </div>
                </div>
              ))}
        </div>
      )}

      {/* ══════ EXPLORA — tarjetas de sección ══════ */}
      <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
        <h2
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: 18,
            color: '#205134',
            margin: 0,
            fontWeight: 700,
          }}
        >
          Explora
        </h2>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 14,
          marginBottom: 28,
        }}
      >
        {/* Productos */}
        <div
          onClick={() => onNavigate('market')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate('market')}
          style={{
            borderRadius: 20,
            background: 'linear-gradient(135deg, #205134 0%, #2E6B42 100%)',
            padding: '20px 18px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 10,
            cursor: 'pointer',
            boxShadow: '0 6px 20px rgba(32,81,52,0.20)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -20,
              right: -20,
              width: 90,
              height: 90,
              borderRadius: '50%',
              background: 'rgba(107,170,61,0.18)',
            }}
          />
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: 'rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
            }}
          >
            🌽
          </div>
          <div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: '#F5EEE6',
                fontFamily: "'Poppins', sans-serif",
                lineHeight: 1.2,
              }}
            >
              Productos
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'rgba(245,238,230,0.7)',
                fontFamily: "'Nunito Sans', sans-serif",
                marginTop: 2,
              }}
            >
              Mercados campesinos
            </div>
          </div>
        </div>

        {/* Experiencias */}
        <div
          onClick={() => onNavigate('tourism')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate('tourism')}
          style={{
            borderRadius: 20,
            background: '#FFF8EE',
            border: '2px solid #E5AE3040',
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
          <div
            style={{
              position: 'absolute',
              top: -20,
              right: -20,
              width: 90,
              height: 90,
              borderRadius: '50%',
              background: 'rgba(229,174,48,0.12)',
            }}
          />
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: '#E5AE3018',
              border: '1.5px solid #E5AE3030',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
            }}
          >
            🏞️
          </div>
          <div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: '#205134',
                fontFamily: "'Poppins', sans-serif",
                lineHeight: 1.2,
              }}
            >
              Experiencias
            </div>
            <div
              style={{
                fontSize: 11,
                color: '#8A8070',
                fontFamily: "'Nunito Sans', sans-serif",
                marginTop: 2,
              }}
            >
              Turismo comunitario
            </div>
          </div>
        </div>
      </div>

      {/* ══════ PRODUCTOS DESTACADOS ══════ */}
      <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
        <h2
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: 18,
            color: '#205134',
            margin: 0,
            fontWeight: 700,
          }}
        >
          Productos destacados
        </h2>
        <span
          style={{
            fontSize: 12,
            color: '#9B4728',
            fontWeight: 700,
            fontFamily: "'Nunito Sans', sans-serif",
            cursor: 'pointer',
          }}
          onClick={() => onNavigate('market')}
        >
          Ver todos →
        </span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 14,
          marginBottom: 28,
        }}
      >
        {loading
          ? Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse"
                style={{
                  background: '#f2eae0',
                  borderRadius: 18,
                  height: 200,
                  border: '1px solid #E8E0CF',
                  overflow: 'hidden',
                }}
              >
                <div style={{ height: 120, background: '#E9E2D9' }} />
                <div style={{ padding: '10px 12px 12px' }}>
                  <div style={{ height: 13, width: '75%', borderRadius: 8, background: '#E9E2D9', marginBottom: 8 }} />
                  <div style={{ height: 10, width: '55%', borderRadius: 8, background: '#F0E9E0' }} />
                </div>
              </div>
            ))
          : featured.length === 0
          ? (
            <p style={{ fontSize: 13, color: '#8A8070', fontFamily: "'Nunito Sans', sans-serif", gridColumn: '1 / -1' }}>
              Aún no hay productos destacados.
            </p>
          )
          : featured.map((item) => (
              <div
                key={item.id}
                onClick={() => onNavigate('market')}
                style={{
                  background: '#fff',
                  borderRadius: 18,
                  overflow: 'hidden',
                  boxShadow: '0 2px 16px rgba(42,92,26,0.08)',
                  border: '1px solid #E8E0CF',
                  cursor: 'pointer',
                }}
              >
                <div style={{ position: 'relative', height: 120 }}>
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
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#D4870A', fontFamily: "'Nunito Sans', sans-serif" }}>
                      {formatPrice(item.price)}
                    </span>
                    <span style={{ fontSize: 11, color: '#3D7A28', fontFamily: "'Nunito Sans', sans-serif" }}>
                      ⭐ {item.rating}
                    </span>
                  </div>
                </div>
              </div>
            ))}
      </div>

      {/* ══════ BANNER EXPERIENCIAS ══════ */}
      <div
        style={{
          borderRadius: 20,
          overflow: 'hidden',
          position: 'relative',
          height: 130,
          marginBottom: 28,
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
          <h3
            style={{
              color: '#F5EEE6',
              fontSize: 17,
              margin: '5px 0 0',
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              lineHeight: 1.3,
            }}
          >
            Descubre experiencias únicas en el campo →
          </h3>
        </div>
      </div>

      {/* ══════ EXPERIENCIAS DESTACADAS ══════ */}
      {tourism.length > 0 && (
        <>
          <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
            <h2
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: 18,
                color: '#205134',
                margin: 0,
                fontWeight: 700,
              }}
            >
              Experiencias
            </h2>
            <span
              style={{
                fontSize: 12,
                color: '#9B4728',
                fontWeight: 700,
                fontFamily: "'Nunito Sans', sans-serif",
                cursor: 'pointer',
              }}
              onClick={() => onNavigate('tourism')}
            >
              Ver todas →
            </span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 14,
              marginBottom: 28,
            }}
          >
            {tourism.map((exp) => (
              <div
                key={exp.id}
                onClick={() => onNavigate('tourism')}
                style={{
                  background: '#fff',
                  borderRadius: 18,
                  overflow: 'hidden',
                  boxShadow: '0 2px 16px rgba(42,92,26,0.08)',
                  border: '1px solid #E8E0CF',
                  cursor: 'pointer',
                }}
              >
                <div style={{ position: 'relative', height: 110 }}>
                  <img
                    src={exp.img}
                    alt={exp.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
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
                    {exp.title}
                  </div>
                  <div style={{ fontSize: 11, color: '#8A8070', fontFamily: "'Nunito Sans', sans-serif", marginBottom: 8 }}>
                    {exp.host}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#D4870A', fontFamily: "'Nunito Sans', sans-serif" }}>
                    {formatPrice(exp.price)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ══════ ACTIVIDAD RECIENTE ══════ */}
      <h2
        style={{
          fontFamily: "'Poppins', sans-serif",
          fontSize: 18,
          color: '#205134',
          margin: '0 0 14px',
          fontWeight: 700,
        }}
      >
        Actividad reciente
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading
          ? Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse"
                style={{
                  background: '#fff',
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
          : notifications.length === 0
          ? (
            <p style={{ fontSize: 13, color: '#8A8070', fontFamily: "'Nunito Sans', sans-serif" }}>
              No tienes actividad reciente.
            </p>
          )
          : notifications.map((a) => (
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
            ))}
      </div>
    </ScreenShell>
  )
}
