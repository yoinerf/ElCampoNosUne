import { useEffect, useState } from 'react'

interface SuccessToastProps {
  message: string
  visible: boolean
  kind?: 'success' | 'info'
}

export default function SuccessToast({ message, visible, kind = 'success' }: SuccessToastProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (visible) {
      setShow(true)
      const timer = window.setTimeout(() => setShow(false), 2600)
      return () => window.clearTimeout(timer)
    }
    setShow(false)
  }, [visible])

  const palette =
    kind === 'success'
      ? {
          bg: 'linear-gradient(135deg, #2A5C1A 0%, #3D7A28 100%)',
          glow: 'rgba(42, 92, 26, 0.22)',
          icon: '✓',
        }
      : {
          bg: 'linear-gradient(135deg, #1C3F10 0%, #2A5C1A 100%)',
          glow: 'rgba(28, 63, 16, 0.18)',
          icon: 'i',
        }

  return (
    <div
      style={{
        position: 'fixed',
        right: 20,
        bottom: 86,
        zIndex: 200,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          minWidth: 260,
          maxWidth: 'min(88vw, 420px)',
          background: palette.bg,
          color: '#FAF7EF',
          borderRadius: 18,
          padding: '14px 16px 14px 14px',
          boxShadow: `0 18px 38px ${palette.glow}`,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          border: '1px solid rgba(255,255,255,0.18)',
          opacity: show && visible ? 1 : 0,
          transform: show && visible ? 'translateY(0) scale(1)' : 'translateY(14px) scale(0.97)',
          transition: 'all 280ms ease',
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.16)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            fontWeight: 800,
            flexShrink: 0,
          }}
        >
          {palette.icon}
        </div>

        <div
          style={{
            fontFamily: 'Nunito, sans-serif',
            fontSize: 14,
            fontWeight: 700,
            lineHeight: 1.4,
          }}
        >
          {message}
        </div>
      </div>
    </div>
  )
}
