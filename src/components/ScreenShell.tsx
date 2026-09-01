import type { CSSProperties, ReactNode } from 'react'
import logoSrc from '../assets/logo-nofond.png'

type NavTab = 'home' | 'market' | 'tourism' | 'profile'

interface NavItem {
  id: NavTab
  label: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Inicio' },
  { id: 'market', label: 'Productos' },
  { id: 'tourism', label: 'Experiencias' },
  { id: 'profile', label: 'Nosotros' },
]

interface ScreenShellProps {
  activeNav?: NavTab
  onNavigate?: (tab: NavTab) => void
  /** Callback específico para el botón de perfil — permite verificar auth antes de navegar */
  onProfileClick?: () => void
  children: ReactNode
  contentStyle?: CSSProperties
  contentClassName?: string
  /** @deprecated ya no se usa — el header nuevo no incluye búsqueda */
  searchPlaceholder?: string
  /** @deprecated */
  searchValue?: string
  /** @deprecated */
  onSearchChange?: (value: string) => void
  /** @deprecated */
  topNavigation?: ReactNode
  /** @deprecated */
  title?: string
  /** @deprecated */
  subtitle?: string
  /** @deprecated */
  action?: ReactNode
  /** @deprecated */
  headerContent?: ReactNode
}

export default function ScreenShell({
  activeNav = 'home',
  onNavigate,
  onProfileClick,
  children,
  contentStyle,
  contentClassName,
}: ScreenShellProps) {
  const handleProfileClick = () => {
    if (onProfileClick) {
      onProfileClick()
    } else {
      onNavigate?.('profile')
    }
  }
  return (
    <div className="h-full overflow-y-auto" style={{ background: '#F5EEE6' }}>
      {/* ═══════════ HEADER STICKY ═══════════ */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: '#FAF7F0',
          borderBottom: '1px solid #EDE4D8',
          boxShadow: '0 2px 14px rgba(32,81,52,0.06)',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 1280,
            margin: '0 auto',
            padding: '0 24px',
            height: 76,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            boxSizing: 'border-box',
          }}
        >
          {/* Logo */}
          <div
            style={{
              flexShrink: 0,
              cursor: onNavigate ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
            }}
            onClick={() => onNavigate?.('home')}
            role={onNavigate ? 'button' : undefined}
            tabIndex={onNavigate ? 0 : undefined}
            onKeyDown={(e) => e.key === 'Enter' && onNavigate?.('home')}
            aria-label="Ir al inicio"
          >
            <img
              src={logoSrc}
              alt="El Campo Nos Une"
              style={{
                height: 88,
                width: 'auto',
                display: 'block',
              }}
            />
          </div>

          {/* Nav central */}
          <nav
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {NAV_ITEMS.map((item) => {
              const isActive = activeNav === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate?.(item.id)}
                  style={{
                    position: 'relative',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '8px 16px',
                    fontSize: 15,
                    fontFamily: "'Nunito Sans', sans-serif",
                    fontWeight: isActive ? 700 : 600,
                    color: isActive ? '#205134' : '#5A5248',
                    borderRadius: 10,
                    transition: 'all 180ms ease',
                  }}
                >
                  {item.label}
                  {isActive && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: -2,
                        left: 16,
                        right: 16,
                        height: 3,
                        borderRadius: 3,
                        background: '#9B4728',
                      }}
                    />
                  )}
                </button>
              )
            })}
          </nav>

          {/* Iconos derecha */}
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Perfil (Minimalista Premium) */}
            <button
              type="button"
              onClick={handleProfileClick}
              aria-label="Mi perfil"
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                border: 'none',
                background: activeNav === 'profile' ? '#EAF3EC' : 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: activeNav === 'profile' ? '#205134' : '#4A5248',
                transition: 'all 180ms ease',
              }}
              className="hover:bg-[#20513410]"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>

            {/* Menú hamburguesa (Minimalista Premium) */}
            <button
              type="button"
              aria-label="Menú"
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4A5248',
                transition: 'all 180ms ease',
              }}
              className="hover:bg-[#20513410]"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ═══════════ CONTENIDO ═══════════ */}
      <div
        style={{ minHeight: 'calc(100vh - 64px)', width: '100%' }}
      >
        <div
          className={contentClassName}
          style={{
            padding: '0 18px',
            ...contentStyle,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
