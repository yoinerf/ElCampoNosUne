
import ScreenShell from '../components/ScreenShell'
import { useState } from 'react'
import bannerImg from '../assets/banner-principal.webp'
import type { Tab, UserRole } from '../lib/types'



interface Props {
  onNavigate: (tab: Tab) => void
  activeNav?: Tab
  onProfileClick?: () => void
  userRole?: UserRole | null
}


interface Service {
  key: string
  icon: string
  title: string
  desc: string
  detail: string
  includes: string[]
  grad: string
  img?: string // opcional: si pones una foto real aquí, reemplaza el degradado
}

const SERVICES: Service[] = [
  {
    key: 'digitalizacion',
    icon: '📱',
    title: 'Digitalización',
    desc: 'Llevamos emprendimientos y servicios al entorno digital.',
    detail: 'Acompañamos a productores y emprendedores para que su oferta tenga presencia en línea, sin que necesiten conocimientos técnicos.',
    includes: ['Creación del perfil en la plataforma', 'Carga de productos con fotos y descripciones', 'Acompañamiento en el uso del panel'],
    grad: 'linear-gradient(135deg, #205134 0%, #6BAA3D 100%)',
  },
  {
    key: 'promocion',
    icon: '📣',
    title: 'Promoción',
    desc: 'Creamos estrategias para aumentar su visibilidad.',
    detail: 'Diseñamos acciones para que más personas conozcan lo que produces u ofreces, dentro y fuera de la plataforma.',
    includes: ['Espacios destacados en la página de inicio', 'Difusión en redes sociales', 'Campañas por temporada'],
    grad: 'linear-gradient(135deg, #C8860A 0%, #E5AE30 100%)',
  },
  {
    key: 'contenidos',
    icon: '🎥',
    title: 'Contenidos',
    desc: 'Fotografía, video, reels y narrativas digitales.',
    detail: 'Producimos material visual que cuenta la historia detrás de cada producto y de cada persona.',
    includes: ['Fotografía de producto', 'Video corto y reels', 'Historias de productores y comunidades'],
    grad: 'linear-gradient(135deg, #9B4728 0%, #C4622D 100%)',
  },
  {
    key: 'innovacion',
    icon: '💡',
    title: 'Innovación',
    desc: 'Talleres de creatividad, tecnología e inteligencia artificial.',
    detail: 'Espacios de formación práctica para que las comunidades aprovechen nuevas herramientas en su día a día.',
    includes: ['Talleres presenciales', 'Introducción práctica a la inteligencia artificial', 'Ideas para mejorar presentación y empaque'],
    grad: 'linear-gradient(135deg, #3D2B6B 0%, #7A5BC4 100%)',
  },
  {
    key: 'turismo',
    icon: '🏞️',
    title: 'Turismo',
    desc: 'Fortalecimiento y promoción de experiencias territoriales.',
    detail: 'Apoyamos a quienes ofrecen turismo comunitario para estructurar, mostrar y comercializar sus experiencias.',
    includes: ['Diseño de la experiencia', 'Publicación y gestión de reservas', 'Promoción ante nuevos visitantes'],
    grad: 'linear-gradient(135deg, #1B5E6B 0%, #3FA7A0 100%)',
  },
  {
    key: 'programas',
    icon: '🤝',
    title: 'Programas territoriales',
    desc: 'Diseñamos proyectos para entidades, empresas y organizaciones.',
    detail: 'Construimos junto a aliados programas de desarrollo rural que conectan recursos con comunidades.',
    includes: ['Diseño y formulación de proyectos', 'Implementación en el territorio', 'Seguimiento y reporte de resultados'],
    grad: 'linear-gradient(135deg, #5A5248 0%, #8A8070 100%)',
  },
]


export default function AboutScreen({ onNavigate, activeNav, onProfileClick, userRole }: Props) {
  const [openService, setOpenService] = useState<Service | null>(null)
  return (
  <ScreenShell
    activeNav={activeNav ?? 'about'}
    onNavigate={onNavigate}
    onProfileClick={onProfileClick}
    userRole={userRole}
    contentStyle={{ paddingBottom: 32 }}
  >
     {/* ══════ 1. HERO ══════ */}
      <div
        style={{
          position: 'relative',
          borderRadius: '0 0 32px 32px',
          padding: '48px 24px 56px',
          margin: '0 -18px 32px',
          overflow: 'hidden',
          textAlign: 'center',
        }}
      >
        {/* Imagen de fondo */}
        <img
          src={bannerImg}
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '135%',
            objectFit: 'cover',
            opacity: 0.6,
          }}
        />
        {/* Degradado verde encima, para contraste del texto */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(32,81,52,0.75) 0%, rgba(46,107,66,0.75) 100%)',
          }}
        />
        <div style={{ position: 'absolute', top: -60, right: -40, width: 220, height: 220, borderRadius: '50%', background: 'rgba(107,170,61,0.15)' }} />
        <div style={{ position: 'absolute', bottom: -40, left: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(229,174,48,0.12)' }} />

        {/* Contenido — necesita position relative para quedar por encima de las capas de fondo */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ margin: '0 0 8px', color: '#A8D48A', fontSize: 12, fontWeight: 800, letterSpacing: 1.5, fontFamily: "'Nunito Sans', sans-serif" }}>
            SAKI5
          </p>
          <h1 style={{ fontFamily: "'Poppins', sans-serif", fontSize: 30, color: '#F5EEE6', margin: '0 0 14px', fontWeight: 800, lineHeight: 1.25 }}>
            Lo mejor del campo<br />está mas cerca de ti
          </h1>
          <p style={{ margin: '0 auto 28px', maxWidth: 420, color: 'rgba(245,238,230,0.85)', fontSize: 14, lineHeight: 1.6, fontFamily: "'Nunito Sans', sans-serif" }}>
            Una plataforma territorial de la amazonía que visibiliza productos, emprendimientos y experiencias turísticas de nuestra región.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => onNavigate('market')}
              style={{
                padding: '13px 26px',
                borderRadius: 14,
                border: 'none',
                background: '#E5AE30',
                color: '#1C2700',
                fontWeight: 800,
                fontSize: 14,
                cursor: 'pointer',
                fontFamily: "'Nunito Sans', sans-serif",
              }}
            >
            Explorar productos
          </button>
          <button
            onClick={() => onNavigate('tourism')}
            style={{
              padding: '13px 26px',
              borderRadius: 14,
              border: '1.5px solid rgba(245,238,230,0.4)',
              background: 'rgba(255,255,255,0.1)',
              color: '#F5EEE6',
              fontWeight: 800,
              fontSize: 14,
              cursor: 'pointer',
              fontFamily: "'Nunito Sans', sans-serif",
            }}
          >
            Descubrir experiencias
          </button>
        </div>
      </div>
      </div>

      {/* ══════ 2. ¿QUÉ ES? ══════ */}
      <div style={{ marginBottom: 40 }}>
        <h2 style={{ textAlign: 'center', fontFamily: "'Poppins', sans-serif", fontSize: 22, color: '#205134', margin: '0 0 24px', fontWeight: 800 }}>
          ¿Qué es Saki5?
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14, marginBottom: 20 }}>
          {[
            { icon: '👨‍🌾', title: 'Campo', desc: 'Productores y emprendimientos rurales', bg: '#E5AE30', text: '#1C2700' },
            { icon: '🏞️', title: 'Territorio', desc: 'Naturaleza, cultura y turismo', bg: '#205134', text: '#F5EEE6' },
            { icon: '📱', title: 'Tecnología', desc: 'Conexión, promoción y comercialización', bg: '#9B4728', text: '#FFF3E8' },
          ].map((item) => (
            <div
              key={item.title}
              style={{
                background: item.bg,
                color: item.text,
                borderRadius: 20,
                padding: '22px 16px',
                textAlign: 'center',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>{item.icon}</div>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4, fontFamily: "'Poppins', sans-serif" }}>{item.title}</div>
              <div style={{ fontSize: 12, opacity: 0.9, fontFamily: "'Nunito Sans', sans-serif" }}>{item.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: '#5A5248', fontStyle: 'italic', fontFamily: "'Nunito Sans', sans-serif" }}>
            Tecnología al servicio de las personas y los territorios.
          </p>
        </div>
      </div>

      {/* ══════ 3. UNIMOS TRES MUNDOS ══════ */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ textAlign: 'center', fontFamily: "'Poppins', sans-serif", fontSize: 22, color: '#205134', margin: '0 0 24px', fontWeight: 800 }}>
          Unimos tres mundos
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {/* Flujo productos */}
          <div style={{ background: '#fff', borderRadius: 20, padding: '24px 20px', border: '1px solid #EDE4D8', textAlign: 'center' }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: '#C8860A', letterSpacing: 0.5, margin: '0 0 16px' }}>PRODUCTOS</p>
            {[
              { icon: '👨‍🌾', text: 'Yo produzco' },
              { icon: '📱', text: 'SAKI5' },
              { icon: '🛒', text: 'Yo encuentro y compro' },
            ].map((step, i, arr) => (
              <div key={step.text}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 26 }}>{step.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1C3A14', fontFamily: "'Nunito Sans', sans-serif" }}>{step.text}</span>
                </div>
                {i < arr.length - 1 && <div style={{ fontSize: 18, color: '#C8BFA8', margin: '6px 0' }}>↓</div>}
              </div>
            ))}
          </div>

          {/* Flujo turismo */}
          <div style={{ background: '#fff', borderRadius: 20, padding: '24px 20px', border: '1px solid #EDE4D8', textAlign: 'center' }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: '#205134', letterSpacing: 0.5, margin: '0 0 16px' }}>TURISMO</p>
            {[
              { icon: '🏞️', text: 'Yo ofrezco una experiencia' },
              { icon: '📱', text: 'SAKI5' },
              { icon: '🧳', text: 'Yo descubro y visito' },
            ].map((step, i, arr) => (
              <div key={step.text}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 26 }}>{step.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1C3A14', fontFamily: "'Nunito Sans', sans-serif" }}>{step.text}</span>
                </div>
                {i < arr.length - 1 && <div style={{ fontSize: 18, color: '#C8BFA8', margin: '6px 0' }}>↓</div>}
              </div>
            ))}
          </div>
        </div>
      </div>


          {/* ══════ 4. IMPACTO (en construcción) ══════ */}
      <div
        style={{
          background: 'linear-gradient(135deg, #F5EEE6 0%, #EDE4D8 100%)',
          borderRadius: 24,
          padding: '32px 24px',
          marginBottom: 32,
          textAlign: 'center',
          border: '1px solid #E8DED0',
        }}
      >
        <div style={{ fontSize: 36, marginBottom: 10 }}>🌱</div>
        <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: 20, color: '#205134', margin: '0 0 8px', fontWeight: 800 }}>
          Nuestro impacto
        </h2>
        <p style={{ fontSize: 14, color: '#5A5248', fontFamily: "'Nunito Sans', sans-serif", maxWidth: 380, margin: '0 auto' }}>
          Estamos construyendo esta comunidad contigo.
        </p>
      </div>

      {/* ══════ 5. ¿QUÉ GANA EL PRODUCTOR? ══════ */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ textAlign: 'center', fontFamily: "'Poppins', sans-serif", fontSize: 22, color: '#205134', margin: '0 0 24px', fontWeight: 800 }}>
          ¿Qué gana el productor?
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          {[
            { icon: '📱', title: 'Presencia digital', desc: 'Tu emprendimiento en un espacio pensado para visibilizar la oferta local.' },
            { icon: '📣', title: 'Mayor visibilidad', desc: 'Haz que más personas conozcan lo que produces.' },
            { icon: '🛒', title: 'Comercialización', desc: 'Facilita el contacto con potenciales compradores.' },
            { icon: '🤝', title: 'Nuevas conexiones', desc: 'Conecta con clientes, organizaciones y aliados.' },
            { icon: '💡', title: 'Capacitación', desc: 'Accede a oportunidades para fortalecer tus competencias digitales.' },
            { icon: '🌎', title: 'Identidad', desc: 'Visibiliza el conocimiento, la cultura y el trabajo detrás de cada producto.' },
          ].map((item) => (
            <div
              key={item.title}
              style={{
                background: '#fff',
                borderRadius: 18,
                padding: '20px 18px',
                border: '1px solid #EDE4D8',
                boxShadow: '0 2px 12px rgba(42,92,26,0.05)',
              }}
            >
              <div style={{ fontSize: 26, marginBottom: 10 }}>{item.icon}</div>
              <div style={{ fontWeight: 800, fontSize: 14, color: '#1C3A14', marginBottom: 6, fontFamily: "'Poppins', sans-serif" }}>
                {item.title}
              </div>
              <div style={{ fontSize: 12.5, color: '#5A5248', lineHeight: 1.5, fontFamily: "'Nunito Sans', sans-serif" }}>
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
            {/* ══════ 6. DESCUBRE NUESTRO TERRITORIO (mosaico) ══════ */}
      <style>{`
        .territory-tile { transition: transform .25s ease, box-shadow .25s ease; }
        .territory-tile:hover { transform: translateY(-5px); box-shadow: 0 14px 28px rgba(32,81,52,.28); }
        .territory-tile:hover .territory-mark { transform: rotate(-6deg) scale(1.12); }
        .territory-mark { transition: transform .35s ease; }
      `}</style>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ textAlign: 'center', fontFamily: "'Poppins', sans-serif", fontSize: 22, color: '#205134', margin: '0 0 24px', fontWeight: 800 }}>
          Descubre nuestro territorio
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
          {[
            { icon: '🌿', title: 'Naturaleza',   desc: 'Descubre lugares y personas que hacen único nuestro territorio.',            grad: 'linear-gradient(135deg, #205134 0%, #6BAA3D 100%)' },
            { icon: '🍽️', title: 'Gastronomía',  desc: 'Sabores auténticos que cuentan la historia de nuestra tierra.',               grad: 'linear-gradient(135deg, #8E3F1D 0%, #D9803F 100%)' },
            { icon: '🏞️', title: 'Turismo',      desc: 'Experiencias que conectan visitantes con comunidades rurales.',               grad: 'linear-gradient(135deg, #2E6B42 0%, #E5AE30 100%)' },
            { icon: '🎭', title: 'Cultura',      desc: 'Tradiciones y saberes que se transmiten de generación en generación.',        grad: 'linear-gradient(135deg, #5A3E22 0%, #C8860A 100%)' },
            { icon: '🧳', title: 'Experiencias', desc: 'Vive el territorio de primera mano, junto a quienes lo habitan.',             grad: 'linear-gradient(135deg, #B4532A 0%, #E5AE30 100%)' },
            { icon: '🌽', title: 'Productos',    desc: 'Lo mejor del campo, directo de las manos que lo cultivan.',                   grad: 'linear-gradient(135deg, #8C5A0A 0%, #D99A1E 100%)' },
          ].map((tile) => (
            <div
              key={tile.title}
              className="territory-tile"
              style={{
                position: 'relative',
                borderRadius: 18,
                overflow: 'hidden',
                height: 170,
                cursor: 'pointer',
                background: tile.grad,
                boxShadow: '0 4px 14px rgba(32,81,52,0.14)',
              }}
            >
              {/* Círculos decorativos */}
              <div style={{ position: 'absolute', top: -34, right: -34, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }} />
              <div style={{ position: 'absolute', bottom: 38, right: -26, width: 76, height: 76, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />

              {/* Emoji grande de marca de agua */}
              <div
                className="territory-mark"
                aria-hidden="true"
                style={{ position: 'absolute', top: 6, right: 10, fontSize: 76, lineHeight: 1, opacity: 0.22, transform: 'rotate(-10deg)', pointerEvents: 'none' }}
              >
                {tile.icon}
              </div>

              {/* Oscurecido suave abajo para que se lea el texto */}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(20,40,25,0.55) 100%)' }} />

              {/* Insignia con el emoji */}
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute', top: 12, left: 12, width: 38, height: 38, borderRadius: 12,
                  background: 'rgba(255,255,255,0.22)', border: '1px solid rgba(255,255,255,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                  backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
                }}
              >
                {tile.icon}
              </div>

              <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#F5EEE6', fontFamily: "'Poppins', sans-serif", marginBottom: 3 }}>
                  {tile.title}
                </div>
                <div style={{ fontSize: 10.5, color: 'rgba(245,238,230,0.88)', fontFamily: "'Nunito Sans', sans-serif", lineHeight: 1.35 }}>
                  {tile.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════ 7. PORTAFOLIO DE SERVICIOS ══════ */}
      <div style={{ marginBottom: 40 }}>
        <h2 style={{ textAlign: 'center', fontFamily: "'Poppins', sans-serif", fontSize: 22, color: '#205134', margin: '0 0 8px', fontWeight: 800 }}>
          ¿Cómo podemos ayudarte a transformar tu territorio?
        </h2>
        <p style={{ textAlign: 'center', fontSize: 13, color: '#5A5248', margin: '0 auto 24px', maxWidth: 460, fontFamily: "'Nunito Sans', sans-serif" }}>
          Elige un servicio para conocer cómo trabajamos.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {SERVICES.map((s) => (
            <div
              key={s.key}
              onClick={() => setOpenService(s)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setOpenService(s)}
              style={{
                background: '#fff',
                borderRadius: 20,
                overflow: 'hidden',
                border: '1px solid #EDE4D8',
                boxShadow: '0 2px 14px rgba(42,92,26,0.06)',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 8px 26px rgba(42,92,26,0.14)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 14px rgba(42,92,26,0.06)'
              }}
            >
              <div
                style={{
                  height: 120,
                  background: s.img ? `url(${s.img}) center/cover` : s.grad,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 44,
                }}
              >
                {!s.img && s.icon}
              </div>
              <div style={{ padding: '16px 18px 18px' }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#1C3A14', fontFamily: "'Poppins', sans-serif", marginBottom: 6 }}>
                  {s.icon} {s.title}
                </div>
                <p style={{ margin: '0 0 12px', fontSize: 13, color: '#5A5248', lineHeight: 1.5, fontFamily: "'Nunito Sans', sans-serif" }}>
                  {s.desc}
                </p>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#C8860A', fontFamily: "'Nunito Sans', sans-serif" }}>
                  Conocer servicio →
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detalle del servicio (ventana emergente) */}
      {openService && (
        <div
          onClick={() => setOpenService(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(21,56,35,0.55)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 24,
              width: '100%',
              maxWidth: 460,
              maxHeight: '88vh',
              overflowY: 'auto',
              boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
            }}
          >
            <div
              style={{
                height: 130,
                background: openService.img ? `url(${openService.img}) center/cover` : openService.grad,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 54,
                position: 'relative',
              }}
            >
              {!openService.img && openService.icon}
              <button
                type="button"
                onClick={() => setOpenService(null)}
                aria-label="Cerrar"
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  border: 'none',
                  background: 'rgba(0,0,0,0.45)',
                  color: '#fff',
                  fontSize: 15,
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: '22px 24px 26px' }}>
              <h3 style={{ margin: '0 0 8px', fontFamily: "'Poppins', sans-serif", fontSize: 20, color: '#205134', fontWeight: 800 }}>
                {openService.title}
              </h3>
              <p style={{ margin: '0 0 16px', fontSize: 14, color: '#4A4036', lineHeight: 1.6, fontFamily: "'Nunito Sans', sans-serif" }}>
                {openService.detail}
              </p>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#C8860A', letterSpacing: 0.8, marginBottom: 8 }}>QUÉ INCLUYE</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {openService.includes.map((item) => (
                  <div key={item} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ color: '#205134', fontWeight: 800 }}>✓</span>
                    <span style={{ fontSize: 13, color: '#3D2B1A', fontFamily: "'Nunito Sans', sans-serif" }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}











      

    </ScreenShell>
  )
}
