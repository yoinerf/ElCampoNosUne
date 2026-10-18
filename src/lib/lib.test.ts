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
  it('ida y vuelta entre pestaña y ruta', () => {
    for (const tab of TABS) {
      expect(routeFromPath(pathForTab(tab)).tab).toBe(tab)
    }
    expect(routeFromPath(pathForTab('profile', 'amazonica'))).toEqual({ tab: 'profile', store: 'amazonica' })
    expect(pathForTab('home', 'amazonica')).toBe('/tienda-amazonica')
  })

  it('rutas desconocidas o con barra final', () => {
    expect(routeFromPath('/no-existe')).toEqual({ tab: 'home', store: 'campo' })
    expect(routeFromPath('/productos/')).toEqual({ tab: 'market', store: 'campo' })
    expect(routeFromPath('/tienda-amazonica/no-existe')).toEqual({ tab: 'amazon', store: 'amazonica' })
  })
})

describe('types', () => {
  it('reconoce pestañas válidas que llegan como texto', () => {
    expect(isTab('market')).toBe(true)
    expect(isTab('javascript:alert(1)')).toBe(false)
    expect(isTab(null)).toBe(false)
  })
})
