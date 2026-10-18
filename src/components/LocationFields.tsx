import { useEffect, useMemo, type CSSProperties } from 'react'
import { DEPARTMENTS, findDepartment, findMunicipality, municipalitiesOf } from '../lib/geo'

export interface LocationValue {
  department: string
  municipality: string
}

interface LocationFieldsProps extends LocationValue {
  onChange: (value: LocationValue) => void
  labelStyle?: CSSProperties
  inputStyle?: CSSProperties
  /** Estilo / clase del contenedor de cada campo (para encajar en la grilla del formulario) */
  fieldStyle?: CSSProperties
  fieldClassName?: string
  required?: boolean
  disabled?: boolean
}

// Departamento → municipio (soff-geo). Devuelve los dos campos como fragmento para que
// cada formulario los ubique en su propia grilla y con sus propios estilos.
export default function LocationFields({
  department,
  municipality,
  onChange,
  labelStyle,
  inputStyle,
  fieldStyle,
  fieldClassName,
  required = true,
  disabled = false,
}: LocationFieldsProps) {
  const canonicalDepartment = findDepartment(department)?.name ?? ''
  const municipalities = useMemo(() => municipalitiesOf(canonicalDepartment), [canonicalDepartment])
  const canonicalMunicipality = findMunicipality(canonicalDepartment, municipality)?.name

  // Datos guardados con otra escritura ("florencia", "Bogotá, D.C."): se normalizan al nombre oficial
  useEffect(() => {
    const nextDepartment = canonicalDepartment || department
    const nextMunicipality = canonicalMunicipality ?? municipality
    if (nextDepartment !== department || nextMunicipality !== municipality) {
      onChange({ department: nextDepartment, municipality: nextMunicipality })
    }
    // Solo cuando cambian los valores guardados
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [department, municipality, canonicalDepartment, canonicalMunicipality])

  // Un municipio antiguo que no está en la lista se muestra para no perderlo de vista
  const legacyMunicipality = municipality && !canonicalMunicipality ? municipality : null

  return (
    <>
      <div style={fieldStyle} className={fieldClassName}>
        <label style={labelStyle}>Departamento{required ? ' *' : ''}</label>
        <select
          value={canonicalDepartment}
          onChange={(e) => onChange({ department: e.target.value, municipality: '' })}
          style={inputStyle}
          required={required}
          disabled={disabled}
        >
          <option value="">Selecciona un departamento</option>
          {DEPARTMENTS.map((d) => (
            <option key={d.code} value={d.name}>{d.name}</option>
          ))}
        </select>
      </div>
      <div style={fieldStyle} className={fieldClassName}>
        <label style={labelStyle}>Ciudad / Municipio{required ? ' *' : ''}</label>
        <select
          value={canonicalMunicipality ?? legacyMunicipality ?? ''}
          onChange={(e) => onChange({ department: canonicalDepartment, municipality: e.target.value })}
          style={inputStyle}
          required={required}
          disabled={disabled || !canonicalDepartment}
        >
          <option value="">{canonicalDepartment ? 'Selecciona un municipio' : 'Primero elige el departamento'}</option>
          {legacyMunicipality && <option value={legacyMunicipality}>{legacyMunicipality} (actualízalo)</option>}
          {municipalities.map((m) => (
            <option key={m.code} value={m.name}>{m.name}</option>
          ))}
        </select>
      </div>
    </>
  )
}
