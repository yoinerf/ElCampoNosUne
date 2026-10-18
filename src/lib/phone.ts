// Número de WhatsApp de los usuarios (profiles.phone): solo dígitos, máximo 10 (celular de Colombia)
export const PHONE_MAX_DIGITS = 10

export function onlyPhoneDigits(value: string) {
  return value.replace(/\D/g, '').slice(0, PHONE_MAX_DIGITS)
}

// Props comunes para los inputs de WhatsApp
export const phoneInputProps = {
  inputMode: 'numeric' as const,
  maxLength: PHONE_MAX_DIGITS,
  placeholder: 'Ej: 3001234567',
}
