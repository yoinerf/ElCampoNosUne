import { useState } from 'react'

type Tab = 'home' | 'market' | 'tourism' | 'profile'

interface Props {
  onNavigate: (tab: Tab) => void
}

const categories = [
  { icon: '🌽', label: 'Mercados\nCampesinos', color: '#D4870A', tab: 'market' as Tab },
  { icon: '🏞️', label: 'Turismo\nComunitario', color: '#2A5C1A', tab: 'tourism' as Tab },
]

const featured = [
  {
    title: 'Café Especial del Huila',
    producer: 'Asoc. Cafeteros del Sur',
    rating: 4.9,
    price: '$28.000/kg',
    img: 'https://images.unsplash.com/photo-1781453640199-b37c09897dd0?w=400&h=300&fit=crop&auto=format',
    badge: 'Destacado',
    badgeColor: '#D4870A',
  },
  {
    title: 'Cacao Orgánico Premium',
    producer: 'Cooperativa Amazónica',
    rating: 4.8,
    price: '$35.000/kg',
    img: 'https://images.unsplash.com/photo-1781453642062-03591a84efe6?w=400&h=300&fit=crop&auto=format',
    badge: 'Orgánico',
    badgeColor: '#2A5C1A',
  },
  {
    title: 'Verduras de Temporada',
    producer: 'Finca La Esperanza',
    rating: 4.7,
    price: '$15.000/bolsa',
    img: 'https://images.unsplash.com/photo-1687199129802-3e4cc27baac0?w=400&h=300&fit=crop&auto=format',
    badge: 'Fresco',
    badgeColor: '#7FB069',
  },
]

const alerts = [
  { icon: '📦', text: 'Tu pedido de Café fue enviado', time: 'Hace 2h', color: '#D4870A' },
  { icon: '⭐', text: 'Nueva reseña en tu producto', time: 'Hace 5h', color: '#2A5C1A' },
]

export default function HomeScreen({ onNavigate }: Props) {
  const [searchVal, setSearchVal] = useState('')

  return (
    <div className="h-full overflow-y-auto" style={{ background: '#FAF7EF' }}>
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(160deg, #2A5C1A 0%, #3D7A28 100%)',
          padding: '20px 20px 40px',
          borderRadius: '0 0 32px 32px',
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <p style={{ color: '#A8D48A', fontSize: 13, fontFamily: 'Nunito, sans-serif', margin: 0, fontWeight: 600 }}>
              Buenos días 👋
            </p>
            <h2
              style={{
                color: '#FAF7EF',
                fontSize: 22,
                fontFamily: 'Fraunces, serif',
                margin: '2px 0 0',
                fontWeight: 700,
              }}
            >
              María Fernanda
            </h2>
          </div>
          <div className="relative">
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: '#FAF7EF',
                overflow: 'hidden',
                border: '2px solid #A8D48A',
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
                background: '#F0A830',
                border: '2px solid #2A5C1A',
              }}
            />
          </div>
        </div>

        {/* Search */}
        <div
          style={{
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.25)',
            display: 'flex',
            alignItems: 'center',
            padding: '10px 14px',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 18 }}>🔍</span>
          <input
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder="Buscar productos, servicios..."
            style={{
              background: 'none',
              border: 'none',
              outline: 'none',
              color: '#FAF7EF',
              fontSize: 14,
              fontFamily: 'Nunito, sans-serif',
              width: '100%',
            }}
          />
        </div>
      </div>

      <div style={{ padding: '0 20px 100px', marginTop: -16 }}>
        {/* Quick stats */}
        <div
          style={{
            background: '#FAF7EF',
            borderRadius: 20,
            boxShadow: '0 4px 24px rgba(42,92,26,0.12)',
            padding: '16px 20px',
            display: 'flex',
            gap: 0,
            marginBottom: 24,
          }}
        >
          {[
            { label: 'Productos', value: '12', icon: '📦' },
            { label: 'Pedidos', value: '4', icon: '🛒' },
            { label: 'Ingresos', value: '$348K', icon: '💰' },
          ].map((s, i) => (
            <div
              key={s.label}
              style={{
                flex: 1,
                textAlign: 'center',
                borderRight: i < 2 ? '1px solid #E8E0CF' : 'none',
              }}
            >
              <div style={{ fontSize: 20 }}>{s.icon}</div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#2A5C1A',
                  fontFamily: 'Fraunces, serif',
                  lineHeight: 1.2,
                }}
              >
                {s.value}
              </div>
              <div style={{ fontSize: 11, color: '#8A8070', fontFamily: 'Nunito, sans-serif' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Categories */}
        <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, color: '#1C3F10', margin: '0 0 12px', fontWeight: 700 }}>
          Explora
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
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
                  fontFamily: 'Fraunces, serif',
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
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, color: '#1C3F10', margin: 0, fontWeight: 700 }}>
            Mercados Campesinos
          </h3>
          <span
            style={{ fontSize: 12, color: '#D4870A', fontWeight: 600, fontFamily: 'Nunito, sans-serif', cursor: 'pointer' }}
            onClick={() => onNavigate('market')}
          >
            Ver más
          </span>
        </div>
        <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 4, marginBottom: 24 }}>
          {featured.map((item) => (
            <div
              key={item.title}
              style={{
                flexShrink: 0,
                width: 180,
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
                    background: item.badgeColor,
                    color: '#FAF7EF',
                    fontSize: 10,
                    fontWeight: 700,
                    fontFamily: 'Nunito, sans-serif',
                    padding: '2px 8px',
                    borderRadius: 20,
                  }}
                >
                  {item.badge}
                </div>
              </div>
              <div style={{ padding: '10px 12px 12px' }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#1C3F10',
                    fontFamily: 'Fraunces, serif',
                    lineHeight: 1.3,
                    marginBottom: 4,
                  }}
                >
                  {item.title}
                </div>
                <div style={{ fontSize: 11, color: '#8A8070', fontFamily: 'Nunito, sans-serif', marginBottom: 8 }}>
                  {item.producer}
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#D4870A', fontFamily: 'Nunito, sans-serif' }}>
                    {item.price}
                  </span>
                  <span style={{ fontSize: 11, color: '#3D7A28', fontFamily: 'Nunito, sans-serif' }}>
                    ⭐ {item.rating}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Banner turismo */}
        <div
          style={{
            borderRadius: 20,
            overflow: 'hidden',
            position: 'relative',
            height: 120,
            marginBottom: 24,
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
            <p style={{ color: '#A8D48A', fontSize: 11, margin: 0, fontFamily: 'Nunito, sans-serif', fontWeight: 700 }}>
              TURISMO COMUNITARIO
            </p>
            <h4 style={{ color: '#FAF7EF', fontSize: 17, margin: '4px 0 0', fontFamily: 'Fraunces, serif', fontWeight: 700 }}>
              Descubre experiencias únicas en el campo →
            </h4>
          </div>
        </div>

        {/* Notifications */}
        <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, color: '#1C3F10', margin: '0 0 12px', fontWeight: 700 }}>
          Actividad reciente
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {alerts.map((a) => (
            <div
              key={a.text}
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
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1C3F10', fontFamily: 'Nunito, sans-serif' }}>
                  {a.text}
                </div>
                <div style={{ fontSize: 11, color: '#8A8070', fontFamily: 'Nunito, sans-serif', marginTop: 2 }}>
                  {a.time}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
