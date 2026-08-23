import { useState } from 'react'

const menuItems = [
  { icon: '📦', label: 'Mis Productos', sublabel: '12 publicados', color: '#2A5C1A' },
  { icon: '🏞️', label: 'Mis Experiencias', sublabel: '3 activas', color: '#D4870A' },
  { icon: '📊', label: 'Estadísticas', sublabel: 'Ver ventas e ingresos', color: '#C4622D' },
  { icon: '💬', label: 'Mensajes', sublabel: '2 sin leer', color: '#7FB069' },
  { icon: '⭐', label: 'Reseñas', sublabel: '4.8 promedio', color: '#6B4C2A' },
  { icon: '📋', label: 'Mis Pedidos', sublabel: '4 activos', color: '#3D7A28' },
]

const certifications = [
  { label: 'Productor Orgánico', icon: '🌱', active: true },
  { label: 'Comercio Justo', icon: '🤝', active: true },
  { label: 'Artesano Certificado', icon: '🎨', active: false },
]

export default function ProfileScreen() {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('María Fernanda Ospina')
  const [org, setOrg] = useState('Cooperativa Agrícola del Sur')

  return (
    <div className="h-full overflow-y-auto" style={{ background: '#FAF7EF' }}>
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(160deg, #1C3F10 0%, #2A5C1A 60%, #3D7A28 100%)',
          padding: '20px 20px 60px',
          position: 'relative',
        }}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 22, color: '#FAF7EF', margin: 0, fontWeight: 700 }}>
            Mi Perfil
          </h2>
          <button
            onClick={() => setEditing(!editing)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: '1.5px solid rgba(255,255,255,0.4)',
              background: 'transparent',
              color: '#FAF7EF',
              fontSize: 12,
              fontWeight: 700,
              fontFamily: 'Nunito, sans-serif',
              cursor: 'pointer',
            }}
          >
            {editing ? '✓ Guardar' : '✏️ Editar'}
          </button>
        </div>
      </div>

      <div style={{ padding: '0 20px', marginTop: -44 }}>
        {/* Profile card */}
        <div
          style={{
            background: '#fff',
            borderRadius: 24,
            padding: '20px',
            marginBottom: 20,
            boxShadow: '0 4px 24px rgba(42,92,26,0.12)',
            border: '1px solid #E8E0CF',
          }}
        >
          <div className="flex items-center gap-4 mb-4">
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                overflow: 'hidden',
                border: '3px solid #2A5C1A',
                flexShrink: 0,
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1509099381441-ea3c0cf98b94?w=120&h=120&fit=crop&auto=format"
                alt="Perfil"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              {editing ? (
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    fontFamily: 'Fraunces, serif',
                    color: '#1C3F10',
                    border: '1.5px solid #2A5C1A',
                    borderRadius: 8,
                    padding: '4px 8px',
                    width: '100%',
                    outline: 'none',
                    marginBottom: 4,
                  }}
                />
              ) : (
                <div style={{ fontSize: 17, fontWeight: 700, fontFamily: 'Fraunces, serif', color: '#1C3F10', marginBottom: 3 }}>
                  {name}
                </div>
              )}
              {editing ? (
                <input
                  value={org}
                  onChange={(e) => setOrg(e.target.value)}
                  style={{
                    fontSize: 12,
                    fontFamily: 'Nunito, sans-serif',
                    color: '#8A8070',
                    border: '1.5px solid #E8E0CF',
                    borderRadius: 8,
                    padding: '4px 8px',
                    width: '100%',
                    outline: 'none',
                  }}
                />
              ) : (
                <div style={{ fontSize: 12, color: '#8A8070', fontFamily: 'Nunito, sans-serif' }}>
                  🏢 {org}
                </div>
              )}
              <div style={{ fontSize: 12, color: '#7FB069', fontFamily: 'Nunito, sans-serif', marginTop: 3, fontWeight: 600 }}>
                📍 Huila, Colombia
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 0,
              background: '#F5F2EA',
              borderRadius: 14,
              overflow: 'hidden',
            }}
          >
            {[
              { value: '12', label: 'Productos', icon: '📦' },
              { value: '4.8⭐', label: 'Calificación', icon: '' },
              { value: '$2.4M', label: 'Ventas', icon: '💰' },
            ].map((s, i) => (
              <div
                key={s.label}
                style={{
                  padding: '12px 8px',
                  textAlign: 'center',
                  borderRight: i < 2 ? '1px solid #E8E0CF' : 'none',
                }}
              >
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#2A5C1A',
                    fontFamily: 'Fraunces, serif',
                  }}
                >
                  {s.value}
                </div>
                <div style={{ fontSize: 10, color: '#8A8070', fontFamily: 'Nunito, sans-serif' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Certifications */}
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 17, color: '#1C3F10', margin: '0 0 12px', fontWeight: 700 }}>
            Certificaciones
          </h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {certifications.map((cert) => (
              <div
                key={cert.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 20,
                  background: cert.active ? '#2A5C1A' : '#F5F2EA',
                  border: cert.active ? 'none' : '1.5px dashed #C8BFA8',
                  opacity: cert.active ? 1 : 0.6,
                }}
              >
                <span style={{ fontSize: 16 }}>{cert.icon}</span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: cert.active ? '#FAF7EF' : '#8A8070',
                    fontFamily: 'Nunito, sans-serif',
                  }}
                >
                  {cert.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Menu items */}
        <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 17, color: '#1C3F10', margin: '0 0 12px', fontWeight: 700 }}>
          Mi cuenta
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {menuItems.map((item) => (
            <div
              key={item.label}
              style={{
                background: '#fff',
                borderRadius: 16,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                border: '1px solid #E8E0CF',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: item.color + '18',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1C3F10', fontFamily: 'Nunito, sans-serif' }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 12, color: '#8A8070', fontFamily: 'Nunito, sans-serif' }}>
                  {item.sublabel}
                </div>
              </div>
              <span style={{ fontSize: 18, color: '#C8BFA8' }}>›</span>
            </div>
          ))}
        </div>

        {/* Help section */}
        <div
          style={{
            background: 'linear-gradient(135deg, #EEE9DC, #FAF7EF)',
            borderRadius: 20,
            padding: '18px 20px',
            marginBottom: 20,
            border: '1px solid #E8E0CF',
            display: 'flex',
            gap: 14,
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: 32 }}>🤝</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1C3F10', fontFamily: 'Fraunces, serif', marginBottom: 4 }}>
              ¿Necesitas ayuda?
            </div>
            <div style={{ fontSize: 12, color: '#8A8070', fontFamily: 'Nunito, sans-serif' }}>
              Nuestro equipo de soporte está disponible de lunes a sábado
            </div>
          </div>
        </div>

        {/* Logout */}
        <button
          style={{
            width: '100%',
            padding: '13px',
            borderRadius: 14,
            border: '1.5px solid #E8E0CF',
            background: 'transparent',
            color: '#C4622D',
            fontSize: 14,
            fontWeight: 700,
            fontFamily: 'Nunito, sans-serif',
            cursor: 'pointer',
            marginBottom: 16,
          }}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
