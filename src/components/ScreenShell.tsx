import { useState, useEffect, type CSSProperties, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
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
  onProfileClick?: () => void
  userRole?: 'asociacion' | 'turismo' | 'comprador' | null
  children: ReactNode
  contentStyle?: CSSProperties
  contentClassName?: string
  cartCount?: number
  onCartClick?: () => void
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
  userRole,
  children,
  contentStyle,
  contentClassName,
  cartCount,
  onCartClick,
}: ScreenShellProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [sessionUser, setSessionUser] = useState<any>(null)
  const [showScrollTop, setShowScrollTop] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessionUser(data.session?.user ?? null))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSessionUser(sess?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navItems: NavItem[] = (userRole === 'asociacion' || userRole === 'turismo')
    ? [
        { id: 'home', label: 'Panel de administración' },
      ]
    : NAV_ITEMS
  const handleProfileClick = () => {
    if (onProfileClick) {
      onProfileClick()
    } else {
      onNavigate?.('profile')
    }
    setIsMenuOpen(false)
  }
  return (
    <div className="h-full flex flex-col" style={{ background: '#F5EEE6' }}>
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
            onClick={() => { onNavigate?.('home'); setIsMenuOpen(false); }}
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

          {/* Nav central (Desktop) */}
          <nav
            className="hidden md:flex"
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {navItems.map((item) => {
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

          {/* Spacer para Mobile (para mantener centrado/distribuido) */}
          <div className="md:hidden" style={{ flex: 1 }} />

          {/* Iconos derecha */}
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Perfil o Login */}
            {!sessionUser ? (
              <button
                type="button"
                onClick={handleProfileClick}
                style={{
                  background: '#205134',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '8px 20px',
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: "'Nunito Sans', sans-serif",
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                className="hover:bg-[#2A6542]"
              >
                Login
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {(userRole === 'asociacion' || userRole === 'turismo') && (
                  <button
                    type="button"
                    onClick={() => onNavigate?.('home')}
                    style={{
                      background: '#1C3A14',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 10,
                      padding: '8px 20px',
                      fontSize: 14,
                      fontWeight: 700,
                      fontFamily: "'Nunito Sans', sans-serif",
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                    className="hover:bg-[#2A6542]"
                  >
                    Admin
                  </button>
                )}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  aria-label="Mi perfil"
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    border: 'none',
                    background: activeNav === 'profile' || isProfileMenuOpen ? '#EAF3EC' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: activeNav === 'profile' || isProfileMenuOpen ? '#205134' : '#4A5248',
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

                {isProfileMenuOpen && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setIsProfileMenuOpen(false)} />
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: 8,
                        background: '#fff',
                        borderRadius: 16,
                        boxShadow: '0 8px 30px rgba(32,81,52,0.12)',
                        border: '1px solid #EDE4D8',
                        padding: 8,
                        minWidth: 180,
                        zIndex: 100,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                      }}
                    >
                      <button
                        onClick={() => { setIsProfileMenuOpen(false); handleProfileClick(); }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '10px 14px',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          borderRadius: 8,
                          fontSize: 14,
                          fontWeight: 600,
                          fontFamily: "'Nunito Sans', sans-serif",
                          color: '#205134',
                        }}
                        className="hover:bg-[#F5EEE6]"
                      >
                        Mi Perfil
                      </button>
                      <div style={{ height: 1, background: '#EDE4D8', margin: '4px 0' }} />
                      <button
                        onClick={async () => { await supabase.auth.signOut(); setIsProfileMenuOpen(false); }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '10px 14px',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          borderRadius: 8,
                          fontSize: 14,
                          fontWeight: 700,
                          fontFamily: "'Nunito Sans', sans-serif",
                          color: '#D06050',
                        }}
                        className="hover:bg-[#FFF5F3]"
                      >
                        Cerrar sesión
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Botón Carrito - Oculto en Experiencias */}
            {activeNav !== 'tourism' && (
              <button
                type="button"
                onClick={onCartClick}
                aria-label="Ver carrito"
                style={{
                  position: 'relative',
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
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
                {cartCount !== undefined && cartCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 2,
                      right: 0,
                      background: '#D06050',
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 800,
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {cartCount}
                  </span>
                )}
              </button>
            )}

            {/* Menu Hamburger (Mobile) */}
            <button
              className="flex md:hidden items-center justify-center"
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Abrir menú"
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: '#205134',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {isMenuOpen ? (
                  <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
                ) : (
                  <><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></>
                )}
              </svg>
            </button>
          </div>
        </div>
        
        {/* Mobile Menu Dropdown */}
        {isMenuOpen && (
          <div className="md:hidden" style={{ background: '#FAF7F0', borderTop: '1px solid #EDE4D8', padding: '8px 24px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {navItems.map((item) => {
              const isActive = activeNav === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { onNavigate?.(item.id); setIsMenuOpen(false); }}
                  style={{
                    background: isActive ? '#EAF3EC' : 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    padding: '12px 16px',
                    fontSize: 15,
                    fontFamily: "'Nunito Sans', sans-serif",
                    fontWeight: isActive ? 700 : 600,
                    color: isActive ? '#205134' : '#5A5248',
                    borderRadius: 12,
                    cursor: 'pointer',
                  }}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
        )}
      </header>

      {/* Botón Volver Arriba */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Volver arriba"
        style={{
          position: 'fixed',
          top: 90,
          left: '50%',
          transform: `translateX(-50%) translateY(${showScrollTop ? '0' : '-20px'})`,
          opacity: showScrollTop ? 1 : 0,
          pointerEvents: showScrollTop ? 'auto' : 'none',
          zIndex: 40,
          background: 'rgba(32, 81, 52, 0.85)',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 20,
          padding: '6px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          fontWeight: 700,
          fontFamily: "'Nunito Sans', sans-serif",
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 12px rgba(32,81,52,0.15)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        className="hover:bg-[#1a422a]"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
        Inicio
      </button>

      {/* ═══════════ CONTENIDO ═══════════ */}
      <div
        className="flex-1"
        style={{ width: '100%' }}
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
