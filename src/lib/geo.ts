import { getDepartments, getDepartmentMunicipalities } from 'soff-geo/co'

// Departamentos y municipios de Colombia (DANE) desde soff-geo.
// En profiles se guardan los nombres (department, municipality), no los códigos.

export interface GeoOption {
  code: string
  name: string
}

const collator = new Intl.Collator('es', { sensitivity: 'base' })

export const DEPARTMENTS: GeoOption[] = getDepartments()
  .map(({ code, name }) => ({ code, name }))
  .sort((a, b) => collator.compare(a.name, b.name))

/** Compara sin tildes ni mayúsculas ("bogota, d.c." ≈ "Bogotá D.C.") */
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase()

/** Departamento a partir del nombre guardado (tolera tildes, mayúsculas y puntuación) */
export function findDepartment(name: string | null | undefined): GeoOption | undefined {
  if (!name) return undefined
  const key = normalize(name)
  return DEPARTMENTS.find((d) => normalize(d.name) === key)
}

/** Municipios del departamento. Bogotá D.C. no trae municipios en soff-geo: se usa su capital. */
export function municipalitiesOf(departmentName: string | null | undefined): GeoOption[] {
  const department = findDepartment(departmentName)
  if (!department) return []
  const list = getDepartmentMunicipalities(department.code).map(({ code, name }) => ({ code, name }))
  if (list.length > 0) return list.sort((a, b) => collator.compare(a.name, b.name))
  const info = getDepartments().find((d) => d.code === department.code)
  return info?.capital ? [{ code: info.capitalCode ?? department.code, name: info.capital }] : []
}

/** Nombre canónico del municipio dentro del departamento (p. ej. "florencia" → "Florencia") */
export function findMunicipality(departmentName: string | null | undefined, name: string | null | undefined): GeoOption | undefined {
  if (!name) return undefined
  const key = normalize(name)
  return municipalitiesOf(departmentName).find((m) => normalize(m.name) === key)
}
