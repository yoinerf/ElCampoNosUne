import type { CSSProperties, ReactNode } from 'react'

interface ScreenShellProps {
  title?: string
  subtitle?: string
  action?: ReactNode
  headerContent?: ReactNode
  children: ReactNode
  contentStyle?: CSSProperties
  contentClassName?: string
  searchPlaceholder?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  topNavigation?: ReactNode
}

export default function ScreenShell({
  title,
  subtitle,
  action,
  headerContent,
  children,
  contentStyle,
  contentClassName,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  topNavigation,
}: ScreenShellProps) {
  const showSearch = !!searchPlaceholder || !!onSearchChange

  return (
    <div className="h-full overflow-y-auto" style={{ background: '#F5EEE6' }}>
      <div style={{ width: '100%', minHeight: '100vh' }}>
        <div
          style={{
            background: 'linear-gradient(180deg, #1A3F28 0%, #205134 100%)',
            padding: '20px 18px 28px',
            borderRadius: '0 0 30px 30px',
            position: 'relative',
            boxShadow: '0 18px 30px rgba(32,81,52,0.18)',
          }}
        >
          {headerContent ?? (
            <>
              <div className="flex items-center justify-between gap-3">
                <div>
                  {subtitle && (
                    <p
                      style={{
                        margin: 0,
                        color: '#6BAA3D',
                        fontSize: 13,
                        fontFamily: "'Nunito Sans', sans-serif",
                        fontWeight: 600,
                        lineHeight: 1.2,
                      }}
                    >
                      {subtitle}
                    </p>
                  )}
                  {title && (
                    <h2
                      style={{
                        fontFamily: "'Poppins', sans-serif",
                        fontSize: 22,
                        color: '#F5EEE6',
                        margin: '2px 0 0',
                        fontWeight: 700,
                        lineHeight: 1.2,
                      }}
                    >
                      {title}
                    </h2>
                  )}
                </div>
                {action}
              </div>

              {(showSearch || topNavigation) && (
                <div className="shell-toolbar">
                  {showSearch && (
                    <div
                      className="shell-search"
                      style={{
                        flex: '0 0 70%',
                        minWidth: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 16 }}>🔍</span>
                      <input
                        value={searchValue ?? ''}
                        onChange={(e) => onSearchChange?.(e.target.value)}
                        placeholder={searchPlaceholder}
                        style={{ background: 'none', border: 'none', outline: 'none', color: '#FAF7EF', fontSize: 14, fontFamily: 'Nunito, sans-serif', width: '100%', minWidth: 0 }}
                      />
                    </div>
                  )}
                  {topNavigation}
                </div>
              )}
            </>
          )}
        </div>

        <div
          className={contentClassName}
          style={{
            padding: '0 18px',
            marginTop: -12,
            position: 'relative',
            zIndex: 2,
            ...contentStyle,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

