import type { CSSProperties } from 'react'
import { DOCUMENT_TYPES } from '../lib/identity'

export interface DocumentValue {
  documentType: string
  documentNumber: string
}

interface DocumentFieldsProps extends DocumentValue {
  onChange: (value: DocumentValue) => void
  labelStyle?: CSSProperties
  inputStyle?: CSSProperties
  /** Estilo / clase del contenedor de cada campo (para encajar en la grilla del formulario) */
  fieldStyle?: CSSProperties
  fieldClassName?: string
  required?: boolean
}

// Tipo y número de documento de identidad. Devuelve los dos campos como fragmento.
export default function DocumentFields({
  documentType,
  documentNumber,
  onChange,
  labelStyle,
  inputStyle,
  fieldStyle,
  fieldClassName,
  required = true,
}: DocumentFieldsProps) {
  const numeric = documentType === 'CC' || documentType === 'TI' || documentType === 'NIT'
  return (
    <>
      <div style={fieldStyle} className={fieldClassName}>
        <label style={labelStyle}>Tipo de documento{required ? ' *' : ''}</label>
        <select
          value={documentType}
          onChange={(e) => onChange({ documentType: e.target.value, documentNumber })}
          style={inputStyle}
          required={required}
        >
          <option value="">Selecciona el tipo</option>
          {DOCUMENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>
      <div style={fieldStyle} className={fieldClassName}>
        <label style={labelStyle}>Número de documento{required ? ' *' : ''}</label>
        <input
          value={documentNumber}
          onChange={(e) => onChange({ documentType, documentNumber: e.target.value })}
          inputMode={numeric ? 'numeric' : 'text'}
          maxLength={20}
          autoComplete="off"
          placeholder={documentType === 'NIT' ? 'Ej: 900123456-7' : 'Ej: 1023456789'}
          style={inputStyle}
          required={required}
        />
      </div>
    </>
  )
}
