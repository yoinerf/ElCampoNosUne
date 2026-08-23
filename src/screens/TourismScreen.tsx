import { useState } from 'react'

const experiences = [
  {
    id: 1,
    title: 'Ruta del Café en el Eje Cafetero',
    host: 'Finca El Paraíso · Salento',
    duration: '2 días / 1 noche',
    price: '$320.000',
    rating: 4.9,
    reviews: 142,
    capacity: '8 personas',
    img: 'https://images.unsplash.com/photo-1599385108614-86b8fce547ef?w=700&h=400&fit=crop&auto=format',
    tags: ['Naturaleza', 'Gastronomía', 'Cultura'],
    featured: true,
  },
  {
    id: 2,
    title: 'Senderismo y Cosecha de Cacao',
    host: 'Comunidad Amazónica · Leticia',
    duration: '1 día',
    price: '$180.000',
    rating: 4.8,
    reviews: 89,
    capacity: '12 personas',
    img: 'https://images.unsplash.com/photo-1717201413724-5fc455228cfd?w=700&h=400&fit=crop&auto=format',
    tags: ['Senderismo', 'Comunidad'],
    featured: false,
  },
  {
    id: 3,
    title: 'Noche en Finca Orgánica con Taller de Cocina',
    host: 'Granja El Roble · Villa de Leyva',
    duration: '1 noche + desayuno',
    price: '$250.000',
    rating: 4.7,
    reviews: 67,
    capacity: '6 personas',
    img: 'https://images.unsplash.com/photo-1551679060-fc2822717fdc?w=700&h=400&fit=crop&auto=format',
    tags: ['Gastronomía', 'Alojamiento'],
    featured: false,
  },
]

const tagColors: Record<string, string> = {
  Naturaleza: '#3D7A28',
  Gastronomía: '#C4622D',
  Cultura: '#6B4C2A',
  Senderismo: '#2A5C1A',
  Comunidad: '#D4870A',
  Alojamiento: '#7FB069',
}

export default function TourismScreen() {
  const [selected, setSelected] = useState<number | null>(null)
  const [saved, setSaved] = useState<number[]>([])

  const toggleSave = (id: number) => {
    setSaved((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  if (selected !== null) {
    const exp = experiences.find((e) => e.id === selected)!
    return (
      <div className="h-full overflow-y-auto" style={{ background: '#FAF7EF' }}>
        <div style={{ position: 'relative', height: 240 }}>
          <img src={exp.img} alt={exp.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(28,63,16,0.7) 0%, transparent 50%)' }} />
          <button
            onClick={() => setSelected(null)}
            style={{
              position: 'absolute',
              top: 16,
              left: 16,
              width: 36,
              height: 36,
              borderRadius: 10,
              border: 'none',
              background: 'rgba(255,255,255,0.85)',
              fontSize: 18,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ←
          </button>
          <div style={{ position: 'absolute', bottom: 16, left: 20, right: 20 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {exp.tags.map((t) => (
                <span
                  key={t}
                  style={{
                    background: tagColors[t] || '#2A5C1A',
                    color: '#FAF7EF',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 20,
                    fontFamily: 'Nunito, sans-serif',
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding: '20px 20px 100px' }}>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 22, color: '#1C3F10', margin: '0 0 6px', fontWeight: 700, lineHeight: 1.3 }}>
            {exp.title}
          </h2>
          <p style={{ fontSize: 13, color: '#8A8070', fontFamily: 'Nunito, sans-serif', margin: '0 0 16px' }}>
            📍 {exp.host}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            {[
              { icon: '⏱️', label: 'Duración', val: exp.duration },
              { icon: '👥', label: 'Capacidad', val: exp.capacity },
              { icon: '⭐', label: 'Calificación', val: `${exp.rating} (${exp.reviews} reseñas)` },
              { icon: '💰', label: 'Precio por persona', val: exp.price },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  background: '#fff',
                  borderRadius: 14,
                  padding: '12px',
                  border: '1px solid #E8E0CF',
                }}
              >
                <div style={{ fontSize: 18, marginBottom: 4 }}>{item.icon}</div>
                <div style={{ fontSize: 10, color: '#8A8070', fontFamily: 'Nunito, sans-serif', marginBottom: 2 }}>{item.label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1C3F10', fontFamily: 'Nunito, sans-serif' }}>{item.val}</div>
              </div>
            ))}
          </div>

          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 17, color: '#1C3F10', margin: '0 0 10px', fontWeight: 700 }}>
            Descripción
          </h3>
          <p style={{ fontSize: 14, color: '#3D2B1A', fontFamily: 'Nunito, sans-serif', lineHeight: 1.6, margin: '0 0 20px' }}>
            Vive una experiencia auténtica en el corazón del campo colombiano. Aprende sobre los procesos
            agrícolas de la región, participa en actividades tradicionales con la comunidad local y disfruta
            de la gastronomía típica preparada con ingredientes frescos de la finca.
          </p>

          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 17, color: '#1C3F10', margin: '0 0 10px', fontWeight: 700 }}>
            ¿Qué incluye?
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {['Guía local bilingüe', 'Alimentación tradicional', 'Actividades culturales', 'Transporte desde el pueblo'].map((item) => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#2A5C1A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>
                </div>
                <span style={{ fontSize: 14, color: '#3D2B1A', fontFamily: 'Nunito, sans-serif' }}>{item}</span>
              </div>
            ))}
          </div>

          <button
            style={{
              width: '100%',
              padding: '15px',
              borderRadius: 16,
              border: 'none',
              background: 'linear-gradient(135deg, #2A5C1A, #3D7A28)',
              color: '#FAF7EF',
              fontSize: 16,
              fontWeight: 700,
              fontFamily: 'Nunito, sans-serif',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(42,92,26,0.35)',
            }}
          >
            Reservar experiencia — {exp.price}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col" style={{ background: '#FAF7EF' }}>
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(160deg, #1C3F10 0%, #2A5C1A 100%)',
          padding: '18px 20px 20px',
        }}
      >
        <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 22, color: '#FAF7EF', margin: '0 0 4px', fontWeight: 700 }}>
          Turismo Comunitario
        </h2>
        <p style={{ fontSize: 13, color: '#A8D48A', fontFamily: 'Nunito, sans-serif', margin: 0 }}>
          Experiencias auténticas con comunidades rurales
        </p>
      </div>

      {/* Banner hero */}
      <div style={{ position: 'relative', height: 160, flexShrink: 0 }}>
        <img
          src="https://images.unsplash.com/photo-1599385108614-86b8fce547ef?w=700&h=320&fit=crop&auto=format"
          alt="Comunidad rural"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to right, rgba(28,63,16,0.65) 0%, transparent 60%)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <p style={{ color: '#A8D48A', fontSize: 11, fontWeight: 700, fontFamily: 'Nunito, sans-serif', margin: 0 }}>
            MÁS DE 40 EXPERIENCIAS
          </p>
          <h3 style={{ color: '#FAF7EF', fontFamily: 'Fraunces, serif', fontSize: 19, margin: '4px 0 0', fontWeight: 700, lineHeight: 1.3 }}>
            Conecta con el<br />campo colombiano
          </h3>
        </div>
      </div>

      {/* Experiences list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 20px' }}>
        <p style={{ fontSize: 13, color: '#8A8070', fontFamily: 'Nunito, sans-serif', margin: '0 0 14px', fontWeight: 600 }}>
          Experiencias disponibles
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {experiences.map((exp) => (
            <div
              key={exp.id}
              onClick={() => setSelected(exp.id)}
              style={{
                background: '#fff',
                borderRadius: 20,
                overflow: 'hidden',
                border: exp.featured ? '2px solid #D4870A' : '1px solid #E8E0CF',
                boxShadow: '0 2px 16px rgba(42,92,26,0.07)',
                cursor: 'pointer',
              }}
            >
              <div style={{ position: 'relative', height: 140 }}>
                <img src={exp.img} alt={exp.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {exp.featured && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 10,
                      left: 10,
                      background: '#D4870A',
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: 20,
                      fontFamily: 'Nunito, sans-serif',
                    }}
                  >
                    ⭐ Más popular
                  </div>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleSave(exp.id) }}
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    border: 'none',
                    background: 'rgba(255,255,255,0.9)',
                    fontSize: 16,
                    cursor: 'pointer',
                  }}
                >
                  {saved.includes(exp.id) ? '❤️' : '🤍'}
                </button>
              </div>
              <div style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  {exp.tags.map((t) => (
                    <span
                      key={t}
                      style={{
                        background: (tagColors[t] || '#2A5C1A') + '18',
                        color: tagColors[t] || '#2A5C1A',
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 20,
                        fontFamily: 'Nunito, sans-serif',
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <h4 style={{ fontFamily: 'Fraunces, serif', fontSize: 16, color: '#1C3F10', margin: '0 0 4px', fontWeight: 700, lineHeight: 1.3 }}>
                  {exp.title}
                </h4>
                <p style={{ fontSize: 12, color: '#8A8070', fontFamily: 'Nunito, sans-serif', margin: '0 0 10px' }}>
                  📍 {exp.host}
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#2A5C1A', fontFamily: 'Fraunces, serif' }}>
                      {exp.price}
                    </span>
                    <span style={{ fontSize: 11, color: '#8A8070', fontFamily: 'Nunito, sans-serif' }}> /persona</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, color: '#3D2B1A', fontFamily: 'Nunito, sans-serif' }}>
                      ⭐ {exp.rating}
                    </span>
                    <span style={{ fontSize: 11, color: '#8A8070', fontFamily: 'Nunito, sans-serif' }}>
                      ({exp.reviews})
                    </span>
                    <span style={{ fontSize: 11, color: '#8A8070', fontFamily: 'Nunito, sans-serif' }}>
                      · {exp.duration}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Register service CTA */}
        <div
          style={{
            marginTop: 20,
            borderRadius: 20,
            background: 'linear-gradient(135deg, #2A5C1A, #3D7A28)',
            padding: '20px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>🏡</div>
          <h4 style={{ fontFamily: 'Fraunces, serif', fontSize: 17, color: '#FAF7EF', margin: '0 0 6px', fontWeight: 700 }}>
            ¿Tienes una experiencia para ofrecer?
          </h4>
          <p style={{ fontSize: 13, color: '#A8D48A', fontFamily: 'Nunito, sans-serif', margin: '0 0 14px' }}>
            Registra tu servicio de turismo comunitario y conecta con viajeros
          </p>
          <button
            style={{
              padding: '11px 24px',
              borderRadius: 12,
              border: 'none',
              background: '#D4870A',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              fontFamily: 'Nunito, sans-serif',
              cursor: 'pointer',
            }}
          >
            Registrar mi servicio
          </button>
        </div>
      </div>
    </div>
  )
}
