
import ScreenShell from '../components/ScreenShell'
import bannerImg from '../assets/banner-campo.webp'

type Tab = 'home' | 'market' | 'tourism' | 'profile' | 'admin' | 'about'

interface Props {
  onNavigate: (tab: Tab) => void
  activeNav?: Tab
  onProfileClick?: () => void
  userRole?: string | null
}

export default function AboutScreen({ onNavigate, activeNav, onProfileClick, userRole }: Props) {
  return (
  <ScreenShell
    activeNav={activeNav ?? 'about'}
    onNavigate={onNavigate}
    onProfileClick={onProfileClick}
    userRole={userRole as any}
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
            EL CAMPO NOS UNE
          </p>
          <h1 style={{ fontFamily: "'Poppins', sans-serif", fontSize: 30, color: '#F5EEE6', margin: '0 0 14px', fontWeight: 800, lineHeight: 1.25 }}>
            Conectamos el campo con<br />nuevas oportunidades
          </h1>
          <p style={{ margin: '0 auto 28px', maxWidth: 420, color: 'rgba(245,238,230,0.85)', fontSize: 14, lineHeight: 1.6, fontFamily: "'Nunito Sans', sans-serif" }}>
            Una plataforma territorial que visibiliza productos, emprendimientos y experiencias turísticas de nuestra región.
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
          ¿Qué es El Campo Nos Une?
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
              { icon: '📱', text: 'El Campo Nos Une' },
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
              { icon: '📱', text: 'El Campo Nos Une' },
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
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ textAlign: 'center', fontFamily: "'Poppins', sans-serif", fontSize: 22, color: '#205134', margin: '0 0 24px', fontWeight: 800 }}>
          Descubre nuestro territorio
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
          {[
            {
              img: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=500&h=500&fit=crop&auto=format',
              icon: '🌿',
              title: 'Naturaleza',
              desc: 'Descubre lugares y personas que hacen único nuestro territorio.',
            },
            {
              img: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=500&h=500&fit=crop&auto=format',
              icon: '🍽️',
              title: 'Gastronomía',
              desc: 'Sabores auténticos que cuentan la historia de nuestra tierra.',
            },
            {
              img: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=500&h=500&fit=crop&auto=format',
              icon: '🏞️',
              title: 'Turismo',
              desc: 'Experiencias que conectan visitantes con comunidades rurales.',
            },
            {
              img: 'https://images.unsplash.com/photo-1533669955142-6a73332af4db?w=500&h=500&fit=crop&auto=format',
              icon: '🎭',
              title: 'Cultura',
              desc: 'Tradiciones y saberes que se transmiten de generación en generación.',
            },
            {
              img: 'https://images.unsplash.com/photo-1523805009345-7448845a9e53?w=500&h=500&fit=crop&auto=format',
              icon: '🧳',
              title: 'Experiencias',
              desc: 'Vive el territorio de primera mano, junto a quienes lo habitan.',
            },
            {
              img: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&h=500&fit=crop&auto=format',
              icon: '🌽',
              title: 'Productos',
              desc: 'Lo mejor del campo, directo de las manos que lo cultivan.',
            },
          ].map((tile) => (
            <div
              key={tile.title}
              style={{
                position: 'relative',
                borderRadius: 18,
                overflow: 'hidden',
                height: 160,
                cursor: 'pointer',
              }}
            >
              <img
                src={tile.img}
                alt={tile.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.15) 40%, rgba(20,45,25,0.85) 100%)',
                }}
              />
              <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12 }}>
                <div style={{ fontSize: 20, marginBottom: 2 }}>{tile.icon}</div>
                <div style={{ fontWeight: 800, fontSize: 13, color: '#F5EEE6', fontFamily: "'Poppins', sans-serif", marginBottom: 2 }}>
                  {tile.title}
                </div>
                <div style={{ fontSize: 10.5, color: 'rgba(245,238,230,0.8)', fontFamily: "'Nunito Sans', sans-serif", lineHeight: 1.35 }}>
                  {tile.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      

    </ScreenShell>
  )
}
