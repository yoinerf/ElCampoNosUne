import type { CSSProperties } from 'react'
import { LEGAL_PATHS } from '../lib/legal'

const link: CSSProperties = { color: '#9B4728', fontWeight: 700, textDecoration: 'underline' }

/** Aviso con enlaces a las condiciones y la privacidad (en otra pestaña, para no perder el formulario) */
export default function LegalNotice({ action = 'continuar', style }: { action?: string; style?: CSSProperties }) {
  return (
    <p style={{ textAlign: 'center', fontSize: 12, lineHeight: 1.5, color: '#8A8070', fontFamily: "'Nunito Sans', sans-serif", margin: '16px 0 0', ...style }}>
      Al {action} aceptas las{' '}
      <a href={LEGAL_PATHS.terms} target="_blank" rel="noopener" style={link}>Condiciones del servicio</a> y la{' '}
      <a href={LEGAL_PATHS.privacy} target="_blank" rel="noopener" style={link}>Política de privacidad</a>.
    </p>
  )
}
