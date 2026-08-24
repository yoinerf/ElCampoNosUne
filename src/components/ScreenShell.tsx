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
}: ScreenShellProps) {
  const showSearch = !!searchPlaceholder || !!onSearchChange

  return (
    <div className="h-full overflow-y-auto" style={{ background: '#F6F2EA' }}>
      <div style={{ width: '100%', minHeight: '100vh' }}>
        <div
          style={{
            background: 'linear-gradient(180deg, #1E4F1A 0%, #2A5C1A 100%)',
            padding: '20px 18px 28px',
            borderRadius: '0 0 30px 30px',
            position: 'relative',
            boxShadow: '0 18px 30px rgba(28,63,16,0.18)',
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
                        color: '#A8D48A',
                        fontSize: 13,
                        fontFamily: 'Nunito, sans-serif',
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
                        fontFamily: 'Fraunces, serif',
                        fontSize: 22,
                        color: '#FAF7EF',
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

              {showSearch && (
                <div
                  style={{
                    marginTop: 16,
                    background: 'rgba(255,255,255,0.15)',
                    borderRadius: 16,
                    border: '1px solid rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '11px 14px',
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 16 }}>🔍</span>
                  <input
                    value={searchValue ?? ''}
                    onChange={(e) => onSearchChange?.(e.target.value)}
                    placeholder={searchPlaceholder}
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
