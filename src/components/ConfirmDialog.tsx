import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'

// Diálogo de confirmación con el diseño de la página. Reemplaza window.confirm / window.alert:
//   if (await confirmDialog({ title: '¿Eliminar?', message: '...', tone: 'danger' })) { ... }
//   await alertDialog({ title: 'Aviso', message: '...' })

type Tone = 'default' | 'danger' | 'warning'

export interface ConfirmDialogOptions {
  title: string
  message?: string
  confirmText?: string
  /** null oculta el botón de cancelar (modo aviso) */
  cancelText?: string | null
  tone?: Tone
}

const TONES: Record<Tone, { icon: string; iconBg: string; button: string; shadow: string }> = {
  default: { icon: '✓', iconBg: '#EAF3EC', button: 'linear-gradient(135deg, #205134 0%, #2A6542 100%)', shadow: 'rgba(32,81,52,0.28)' },
  warning: { icon: '!', iconBg: '#FFF1E0', button: 'linear-gradient(135deg, #205134 0%, #2A6542 100%)', shadow: 'rgba(32,81,52,0.28)' },
  danger: { icon: '!', iconBg: '#FEE9E1', button: 'linear-gradient(135deg, #C53030 0%, #D06050 100%)', shadow: 'rgba(197,48,48,0.28)' },
}

const ICON_COLOR: Record<Tone, string> = { default: '#205134', warning: '#C4622D', danger: '#C53030' }

function Dialog({ options, onClose }: { options: ConfirmDialogOptions; onClose: (result: boolean) => void }) {
  const [visible, setVisible] = useState(false)
  const tone = options.tone ?? 'default'
  const t = TONES[tone]
  const cancelText = options.cancelText === undefined ? 'Cancelar' : options.cancelText

  const close = (result: boolean) => {
    setVisible(false)
    window.setTimeout(() => onClose(result), 160)
  }

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true))
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <div
      role="presentation"
      onClick={() => close(false)}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: visible ? 'rgba(28,58,20,0.45)' : 'rgba(28,58,20,0)',
        backdropFilter: 'blur(3px)',
        transition: 'background 160ms ease',
        fontFamily: "'Nunito Sans', sans-serif",
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#FAF7F0',
          borderRadius: 24,
          border: '1px solid #EDE4D8',
          boxShadow: '0 24px 60px rgba(28,58,20,0.25)',
          padding: '28px 26px 22px',
          textAlign: 'center',
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.96)',
          opacity: visible ? 1 : 0,
          transition: 'transform 180ms cubic-bezier(0.4, 0, 0.2, 1), opacity 160ms ease',
        }}
      >
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: t.iconBg, color: ICON_COLOR[tone], display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 26, fontWeight: 800, fontFamily: "'Poppins', sans-serif" }}>
          {t.icon}
        </div>
        <h2 id="confirm-dialog-title" style={{ margin: '0 0 8px', fontFamily: "'Poppins', sans-serif", fontSize: 19, fontWeight: 700, color: '#1C3A14', lineHeight: 1.3 }}>
          {options.title}
        </h2>
        {options.message && (
          <p style={{ margin: 0, fontSize: 14, color: '#5A5248', lineHeight: 1.55, whiteSpace: 'pre-line' }}>{options.message}</p>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 24, flexDirection: 'row-reverse', flexWrap: 'wrap' }}>
          <button
            type="button"
            autoFocus
            onClick={() => close(true)}
            style={{ flex: '1 1 140px', padding: '12px 16px', borderRadius: 14, border: 'none', background: t.button, color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 6px 18px ${t.shadow}` }}
          >
            {options.confirmText ?? 'Aceptar'}
          </button>
          {cancelText !== null && (
            <button
              type="button"
              onClick={() => close(false)}
              style={{ flex: '1 1 140px', padding: '12px 16px', borderRadius: 14, border: '1.5px solid #E2D8C9', background: '#fff', color: '#205134', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {cancelText}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function confirmDialog(options: ConfirmDialogOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    root.render(
      <Dialog
        options={options}
        onClose={(result) => {
          root.unmount()
          host.remove()
          resolve(result)
        }}
      />
    )
  })
}

export function alertDialog(options: Omit<ConfirmDialogOptions, 'cancelText'>): Promise<void> {
  return confirmDialog({ ...options, cancelText: null }).then(() => undefined)
}
