import { describe, expect, it, vi } from 'vitest'

// Los módulos de lib importan el cliente de Supabase; en pruebas no se conecta a nada
vi.mock('./supabase', () => ({ supabase: {} }))

import { onlyPhoneDigits } from './phone'
import { fromColombiaInputToISO, isAdvertisementActive, isDateRangeActiveInColombia, toColombiaInputString } from './dateColombia'
import { getNextStatuses, summarizeStatusesByItem, type OrderItemRow, type OrderStatus, type OrderStatusTransition } from './orders'
import { validationState, validateDocFile, type ProducerDocument } from './producerDocuments'
import { MAX_IMAGE_BYTES, validateImage } from './imageUpload'
import { TABS, isTab } from './types'
import { pathForTab, routeFromPath } from './routes'
import { documentColumns, normalizeDocumentNumber, validateDocument, validateOptionalDocument } from './identity'
import { DEPARTMENTS, findDepartment, findMunicipality, municipalitiesOf } from './geo'
import { gatewayFee } from './payments'

const fakeFile = (type: string, size: number, name = 'archivo') => ({ type, size, name }) as File

describe('phone', () => {
  it('deja solo dígitos y máximo 10', () => {
    expect(onlyPhoneDigits('+57 (300) 123-4567')).toBe('5730012345')
    expect(onlyPhoneDigits('300 123 4567')).toBe('3001234567')
    expect(onlyPhoneDigits('abc')).toBe('')
  })
})

describe('dateColombia', () => {
  it('convierte UTC a hora de Colombia (UTC-5) para datetime-local', () => {
    expect(toColombiaInputString('2026-10-18T15:30:00Z')).toBe('2026-10-18T10:30')
    expect(toColombiaInputString('2026-10-18T03:00:00Z')).toBe('2026-10-17T22:00')
    expect(toColombiaInputString(null)).toBe('')
    expect(toColombiaInputString('no es fecha')).toBe('')
  })

  it('agrega el offset de Colombia al guardar', () => {
    expect(fromColombiaInputToISO('2026-10-18T10:30')).toBe('2026-10-18T10:30:00-05:00')
  })

  it('evalúa la vigencia de un rango', () => {
    const past = new Date(Date.now() - 86_400_000).toISOString()
    const future = new Date(Date.now() + 86_400_000).toISOString()
    expect(isDateRangeActiveInColombia(past, future)).toBe(true)
    expect(isDateRangeActiveInColombia(future, null)).toBe(false)
    expect(isDateRangeActiveInColombia(null, past)).toBe(false)
    expect(isAdvertisementActive({ active: false, starts_at: past, ends_at: future })).toBe(false)
    expect(isAdvertisementActive({ active: true, starts_at: past, ends_at: future })).toBe(true)
  })
})

describe('orders', () => {
  const statuses: OrderStatus[] = [
    { id: 1, code: 'PendingPayment', name: 'Pendiente de pago' },
    { id: 2, code: 'Paid', name: 'Pagado' },
    { id: 3, code: 'Processing', name: 'En preparación' },
    { id: 4, code: 'Cancelled', name: 'Cancelado' },
  ] as OrderStatus[]

  const transitions: OrderStatusTransition[] = [
    { store: 'campo', from_status_id: 1, to_status_id: 4, sort_order: 1, suggested_for: [] },
    { store: 'campo', from_status_id: 1, to_status_id: 2, sort_order: 2, suggested_for: ['BankTransfer'] },
    { store: 'campo', from_status_id: 1, to_status_id: 3, sort_order: 3, suggested_for: ['CashOnDelivery'] },
    { store: 'amazonica', from_status_id: 1, to_status_id: 2, sort_order: 1, suggested_for: [] },
  ]

  it('ordena los siguientes estados con el sugerido primero y filtra por tienda', () => {
    const next = getNextStatuses(1, 'BankTransfer', transitions, statuses, 'campo')
    expect(next.map((n) => n.status.code)).toEqual(['Paid', 'Cancelled', 'Processing'])
    expect(next[0].suggested).toBe(true)
    expect(getNextStatuses(1, undefined, transitions, statuses, 'amazonica')).toHaveLength(1)
  })

  it('resume cantidades por producto y estado', () => {
    const items = [
      { product_id: 'p1', experience_id: null, status_id: 1, quantity: 2 },
      { product_id: 'p1', experience_id: null, status_id: 1, quantity: 3 },
      { product_id: null, experience_id: 'e1', status_id: 2, quantity: 1 },
      { product_id: null, experience_id: null, status_id: 2, quantity: 9 },
    ] as OrderItemRow[]
    const summary = summarizeStatusesByItem(items, statuses)
    expect(summary.p1).toEqual([{ status: statuses[0], count: 5 }])
    expect(summary.e1[0].count).toBe(1)
    expect(Object.keys(summary)).toHaveLength(2)
  })
})

describe('producerDocuments', () => {
  const doc = (doc_type: ProducerDocument['doc_type'], status: ProducerDocument['status']) => ({ doc_type, status }) as ProducerDocument

  it('solo valida con los dos documentos aprobados', () => {
    expect(validationState([doc('rut', 'aprobado'), doc('camara_comercio', 'aprobado')])).toBe('validado')
    expect(validationState([doc('rut', 'aprobado'), doc('camara_comercio', 'rechazado')])).toBe('rechazado')
    expect(validationState([doc('rut', 'aprobado')])).toBe('incompleto')
    expect(validationState([doc('rut', 'pendiente'), doc('camara_comercio', 'aprobado')])).toBe('pendiente')
  })

  it('valida tipo y tamaño del archivo', () => {
    expect(validateDocFile(fakeFile('application/pdf', 1000))).toBeNull()
    expect(validateDocFile(fakeFile('application/zip', 1000))).not.toBeNull()
    expect(validateDocFile(fakeFile('application/pdf', 6 * 1024 * 1024))).not.toBeNull()
  })
})

describe('imageUpload', () => {
  it('acepta JPG/PNG dentro del límite del bucket', () => {
    expect(validateImage(fakeFile('image/png', 1000))).toBeNull()
    expect(validateImage(fakeFile('image/webp', 1000))).toBe('Solo se permiten JPG y PNG')
    expect(validateImage(fakeFile('image/jpeg', MAX_IMAGE_BYTES + 1, 'foto.jpg'))).toContain('foto.jpg')
  })
})

describe('routes', () => {
  // Tiendas como vienen de store_settings (una aliada nueva no necesita código)
  const stores = [
    { store: 'campo', slug: null },
    { store: 'amazonica', slug: 'tienda-amazonica' },
    { store: 'licores', slug: 'tienda-licores' },
  ]

  it('ida y vuelta entre pestaña y ruta en la tienda principal', () => {
    for (const tab of TABS.filter((t) => t !== 'store')) {
      expect(routeFromPath(pathForTab(tab, 'campo', stores), stores)).toEqual({ tab, store: 'campo' })
    }
  })

  it('cada tienda aliada tiene su vitrina y sus páginas bajo /<slug>', () => {
    expect(pathForTab('store', 'licores', stores)).toBe('/tienda-licores')
    expect(pathForTab('home', 'amazonica', stores)).toBe('/tienda-amazonica')
    expect(pathForTab('profile', 'licores', stores)).toBe('/tienda-licores/mi-cuenta')
    expect(routeFromPath('/tienda-licores', stores)).toEqual({ tab: 'store', store: 'licores' })
    expect(routeFromPath('/tienda-licores/mi-cuenta', stores)).toEqual({ tab: 'profile', store: 'licores' })
    expect(routeFromPath('/tienda-amazonica/panel', stores)).toEqual({ tab: 'admin', store: 'amazonica' })
  })

  it('rutas desconocidas o con barra final', () => {
    expect(routeFromPath('/no-existe', stores)).toEqual({ tab: 'home', store: 'campo' })
    expect(routeFromPath('/productos/', stores)).toEqual({ tab: 'market', store: 'campo' })
    expect(routeFromPath('/tienda-amazonica/no-existe', stores)).toEqual({ tab: 'store', store: 'amazonica' })
    // Tienda que no existe (o se desactivó): inicio de la principal
    expect(routeFromPath('/tienda-cerrada', stores)).toEqual({ tab: 'home', store: 'campo' })
  })
})

describe('identity', () => {
  it('normaliza y valida según el tipo de documento', () => {
    expect(normalizeDocumentNumber(' 1.023.456 789 ')).toBe('1023456789')
    expect(validateDocument('CC', '1.023.456.789')).toBeNull()
    expect(validateDocument('CC', '12AB')).not.toBeNull()
    expect(validateDocument('NIT', '900123456-7')).toBeNull()
    expect(validateDocument('PAS', 'ab12345')).toBeNull()
    expect(validateDocument('', '123456')).toBe('Selecciona el tipo de documento.')
    expect(validateDocument('CC', '')).toBe('Ingresa el número de documento.')
  })

  it('al editar a otro usuario el documento puede quedar vacío', () => {
    expect(validateOptionalDocument('', '')).toBeNull()
    expect(validateOptionalDocument('CC', '')).not.toBeNull()
    expect(documentColumns('', '')).toEqual({ document_type: null, document_number: null })
    expect(documentColumns('CE', 'x-12 34')).toEqual({ document_type: 'CE', document_number: 'X-1234' })
  })
})

describe('geo', () => {
  it('lista los 33 departamentos y sus municipios', () => {
    expect(DEPARTMENTS).toHaveLength(33)
    expect(municipalitiesOf('Antioquia').some((m) => m.name === 'Medellín')).toBe(true)
    expect(municipalitiesOf('No existe')).toEqual([])
  })

  it('Bogotá D.C. usa su capital como único municipio', () => {
    expect(municipalitiesOf('Bogotá D.C.')).toEqual([{ code: '11001', name: 'Bogotá' }])
  })

  it('reconoce nombres guardados con otra escritura', () => {
    expect(findDepartment('bogota, d.c.')?.name).toBe('Bogotá D.C.')
    expect(findDepartment('CAQUETA')?.name).toBe('Caquetá')
    expect(findMunicipality('Caquetá', 'florencia')?.name).toBe('Florencia')
  })
})

describe('types', () => {
  it('reconoce pestañas válidas que llegan como texto', () => {
    expect(isTab('market')).toBe(true)
    expect(isTab('javascript:alert(1)')).toBe(false)
    expect(isTab(null)).toBe(false)
  })
})

describe('payments', () => {
  const mp = { percent_fee: 3.29, fixed_fee: 800, vat_rate: 19, extra_percent: 0, extra_fixed: 0, pass_fees_to_buyer: true }

  it('suma la tarifa para que el productor reciba el valor completo (igual que gateway_fee)', () => {
    expect(gatewayFee(50000, mp)).toBe(3029)
    expect(gatewayFee(10000, mp)).toBe(1399)
    // Lo que descuenta Mercado Pago del total nunca deja al productor por debajo de su precio
    const total = 50000 + gatewayFee(50000, mp)
    expect(total - (total * 0.0329 + 800) * 1.19).toBeGreaterThanOrEqual(50000)
  })

  it('incluye retenciones y cargos extra configurables', () => {
    expect(gatewayFee(50000, { ...mp, extra_percent: 1, extra_fixed: 100 })).toBeGreaterThan(gatewayFee(50000, mp))
  })

  it('no suma nada si el productor asume la tarifa o el monto es 0', () => {
    expect(gatewayFee(50000, { ...mp, pass_fees_to_buyer: false })).toBe(0)
    expect(gatewayFee(0, mp)).toBe(0)
  })
})
