// Documento de identidad (profiles.document_type / document_number).
// Las mismas reglas están en la BD (check) y en la edge function admin-users.

export const DOCUMENT_TYPES = [
  { value: 'CC', label: 'Cédula de ciudadanía' },
  { value: 'CE', label: 'Cédula de extranjería' },
  { value: 'TI', label: 'Tarjeta de identidad' },
  { value: 'PPT', label: 'Permiso por Protección Temporal' },
  { value: 'PAS', label: 'Pasaporte' },
  { value: 'NIT', label: 'NIT' },
] as const

export type DocumentType = (typeof DOCUMENT_TYPES)[number]['value']

export const isDocumentType = (value: string | null | undefined): value is DocumentType =>
  DOCUMENT_TYPES.some((t) => t.value === value)

/** Quita espacios y puntos y pasa a mayúsculas: "1.234.567" → "1234567" */
export const normalizeDocumentNumber = (value: string) => value.replace(/[\s.]/g, '').toUpperCase()

/**
 * Para cuando un admin edita a otro usuario: el documento puede quedar vacío
 * (usuarios antiguos), pero si se llena debe ser válido.
 */
export function validateOptionalDocument(type: string, rawNumber: string): string | null {
  if (!type && !normalizeDocumentNumber(rawNumber)) return null
  return validateDocument(type, rawNumber)
}

/** Valores para guardar en profiles (null si quedó vacío) */
export const documentColumns = (type: string, rawNumber: string) => {
  const number = normalizeDocumentNumber(rawNumber)
  return { document_type: type || null, document_number: number || null }
}

/** Mensaje de error, o null si el documento es válido */
export function validateDocument(type: string, rawNumber: string): string | null {
  if (!isDocumentType(type)) return 'Selecciona el tipo de documento.'
  const number = normalizeDocumentNumber(rawNumber)
  if (!number) return 'Ingresa el número de documento.'
  switch (type) {
    case 'CC':
    case 'TI':
      return /^\d{5,12}$/.test(number) ? null : 'El número de documento debe tener solo números (5 a 12 dígitos).'
    case 'NIT':
      return /^\d{8,12}(-\d)?$/.test(number) ? null : 'El NIT debe tener entre 8 y 12 dígitos y, si aplica, el dígito de verificación (ej: 900123456-7).'
    default:
      return /^[A-Z0-9]{4,20}$/.test(number) ? null : 'El número de documento debe tener entre 4 y 20 letras o números.'
  }
}
