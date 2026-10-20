import React, { useRef, useState } from 'react'
import { uploadPublicImage } from '../lib/imageUpload'
import { UNITS, UNIT_GROUPS, formatMeasure, isMeasureAmount } from '../lib/units'
import {
  ATTRIBUTE_SUGGESTIONS,
  MAX_ATTRIBUTE_OPTIONS,
  MAX_VARIANT_ATTRIBUTES,
  MAX_VARIANT_COMBINATIONS,
  MEASURE_ATTRIBUTE,
  draftAttributes,
  isMeasureAttribute,
  optionsKey,
  variantLabel,
  type VariantAttribute,
  type VariantDraftRow,
  type VariantOptions,
} from '../lib/variants'

// Editor de variantes del formulario de producto. El vendedor las agrega una a una:
//   1. el valor del atributo (Sabor: Fresa),
//   2. la medida: primero la unidad y luego la cantidad (250 ml, 1 lb) — opcional,
//   3. el stock y el precio de esa variante.
// Cada variante agregada queda en la lista, donde se puede corregir su stock, precio y foto.
interface VariantEditorProps {
  attributes: VariantAttribute[]
  rows: VariantDraftRow[]
  onChange: (attributes: VariantAttribute[], rows: VariantDraftRow[]) => void
  /** true mientras se sube alguna foto */
  onBusyChange?: (busy: boolean) => void
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  minWidth: 0,
  padding: '8px 10px',
  borderRadius: 10,
  border: '1.5px solid #EDE4D8',
  fontSize: 13,
  fontFamily: "'Nunito Sans', sans-serif",
  boxSizing: 'border-box',
  background: '#fff',
  color: '#3D2B1A',
  outline: 'none',
}

const smallBtn: React.CSSProperties = {
  border: '1px solid #EDE4D8',
  background: '#F5EEE6',
  color: '#205134',
  borderRadius: 10,
  padding: '7px 12px',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: "'Nunito Sans', sans-serif",
  whiteSpace: 'nowrap',
}

const fieldLabel = "block text-[11px] font-bold text-[#205134] mb-1 font-['Nunito_Sans']"
const hint = "text-[11px] text-[#9B7D5A] m-0 font-['Nunito_Sans']"

const emptyForm = { values: {} as Record<string, string>, unit: '', amount: '', stock: '', price: '' }

export default function VariantEditor({ attributes, rows, onChange, onBusyChange }: VariantEditorProps) {
  // Atributos de texto (Sabor, Color...); la medida va aparte
  const textNames = attributes.filter((a) => !isMeasureAttribute(a.name)).map((a) => a.name)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [uploading, setUploading] = useState<string[]>([])
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})
  // Lo último recibido: la foto termina de subir después de otros cambios del formulario
  const latest = useRef({ attributes, rows })
  latest.current = { attributes, rows }

  const keyOf = (row: VariantDraftRow) => optionsKey(row.options, attributes)
  const emit = (names: string[], nextRows: VariantDraftRow[]) => onChange(draftAttributes(names, nextRows), nextRows)
  const rowsHaveMeasure = rows.length > 0 && !!rows[0].options[MEASURE_ATTRIBUTE]

  // ── Nombres de los atributos ──
  const renameAttribute = (index: number, name: string) => {
    const old = textNames[index]
    const names = textNames.map((n, i) => (i === index ? name : n))
    // Las variantes ya agregadas pasan al nuevo nombre
    const nextRows = rows.map((r) => {
      const options: VariantOptions = {}
      for (const [k, v] of Object.entries(r.options)) options[k === old ? name : k] = v
      return { ...r, options }
    })
    setForm((f) => {
      const values = { ...f.values, [name]: f.values[old] ?? '' }
      if (old !== name) delete values[old]
      return { ...f, values }
    })
    emit(names, nextRows)
  }

  const addAttributeName = () => {
    if (textNames.length >= MAX_VARIANT_ATTRIBUTES - 1) return
    const used = new Set(textNames.map((n) => n.trim().toLowerCase()))
    emit([...textNames, ATTRIBUTE_SUGGESTIONS.find((s) => !used.has(s.toLowerCase())) ?? ''], rows)
  }

  const removeAttributeName = (index: number) => {
    emit(textNames.filter((_, i) => i !== index), rows)
  }

  const nameError = (name: string) => {
    const n = name.trim().toLowerCase()
    if (!n) return 'Escribe el nombre del atributo (ej: Sabor).'
    if (isMeasureAttribute(n)) return 'La medida se agrega abajo con su unidad.'
    if (textNames.filter((x) => x.trim().toLowerCase() === n).length > 1) return 'Ya hay un atributo con este nombre.'
    return ''
  }

  // ── Agregar una variante ──
  const addVariant = () => {
    const names = textNames.map((n) => n.trim())
    const badName = textNames.map(nameError).find(Boolean)
    if (badName) return setFormError(badName)

    const options: VariantOptions = {}
    for (const [index, name] of names.entries()) {
      const value = (form.values[textNames[index]] ?? '').trim()
      if (!value) return setFormError(`Escribe ${name.toLowerCase()} (ej: Fresa).`)
      if (value.length > 60) return setFormError(`«${value}» es muy largo (máximo 60 caracteres).`)
      options[name] = value
    }

    const hasMeasure = !!form.unit || !!form.amount.trim()
    if (hasMeasure) {
      if (!form.unit) return setFormError('Elige la unidad de medida.')
      if (!isMeasureAmount(form.amount)) return setFormError(`Escribe la cantidad en ${form.unit} (ej: 250 o 1,5).`)
      options[MEASURE_ATTRIBUTE] = formatMeasure(form.amount, form.unit)
    }
    if (Object.keys(options).length === 0) return setFormError('Escribe el valor del atributo o una medida.')
    if (rows.length > 0 && hasMeasure !== rowsHaveMeasure) {
      return setFormError(
        rowsHaveMeasure ? 'Las demás variantes tienen medida: elige unidad y cantidad.' : 'Las demás variantes no tienen medida: deja «Sin medida».'
      )
    }

    const stock = form.stock.trim() || '0'
    if (!/^\d{1,7}$/.test(stock)) return setFormError('El stock debe ser un número entero (0 o más).')
    // Cada variante tiene su precio (el producto con variantes no tiene precio general)
    const price = form.price.trim()
    if (!price) return setFormError('Escribe el precio de esta variante.')
    if (!(/^\d{1,12}(\.\d{1,2})?$/.test(price) && Number(price) > 0)) return setFormError('Precio inválido.')

    const newRow: VariantDraftRow = { options, stock, price, image_url: null, image_storage_path: null, active: true }
    const nextAttributes = draftAttributes(names, [...rows, newRow])
    const key = optionsKey(options, nextAttributes)
    if (rows.some((r) => optionsKey(r.options, nextAttributes) === key)) return setFormError('Esa variante ya está en la lista.')
    if (rows.length >= MAX_VARIANT_COMBINATIONS) return setFormError(`Máximo ${MAX_VARIANT_COMBINATIONS} variantes.`)
    const tooMany = nextAttributes.find((a) => a.options.length > MAX_ATTRIBUTE_OPTIONS)
    if (tooMany) return setFormError(`«${tooMany.name}» puede tener máximo ${MAX_ATTRIBUTE_OPTIONS} valores distintos.`)

    setFormError('')
    emit(names, [...rows, newRow])
    // Se conservan el valor y la unidad para agregar rápido otra medida del mismo sabor
    setForm((f) => ({ ...f, amount: '', stock: '', price: '' }))
  }

  // ── Lista de variantes ──
  const setRow = (key: string, changes: Partial<VariantDraftRow>) => {
    onChange(attributes, rows.map((r) => (keyOf(r) === key ? { ...r, ...changes } : r)))
  }

  const removeRow = (key: string) => {
    emit(textNames, rows.filter((r) => keyOf(r) !== key))
  }

  const uploadRowImage = async (key: string, file: File) => {
    setUploading((prev) => [...prev, key])
    onBusyChange?.(true)
    setRowErrors((prev) => ({ ...prev, [key]: '' }))
    const result = await uploadPublicImage('product-images', file)
    setUploading((prev) => {
      const next = prev.filter((k) => k !== key)
      onBusyChange?.(next.length > 0)
      return next
    })
    if (result.error !== undefined) {
      setRowErrors((prev) => ({ ...prev, [key]: result.error }))
      return
    }
    const current = latest.current
    onChange(
      current.attributes,
      current.rows.map((r) =>
        optionsKey(r.options, current.attributes) === key ? { ...r, image_url: result.publicUrl, image_storage_path: result.storagePath } : r
      )
    )
  }

  const totalStock = rows.reduce((sum, r) => sum + (parseInt(r.stock, 10) || 0), 0)
  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addVariant()
    }
  }

  return (
    <div className="space-y-3">
      {/* ── Atributo(s) ── */}
      <div>
        <span className={fieldLabel}>Atributo</span>
        <div className="space-y-2">
          {textNames.map((name, index) => {
            const error = nameError(name)
            return (
              <div key={index}>
                <div className="flex items-center gap-2">
                  <input
                    value={name}
                    onChange={(e) => renameAttribute(index, e.target.value)}
                    placeholder="Ej: Sabor, Color, Talla"
                    list="variant-attribute-suggestions"
                    maxLength={40}
                    style={{ ...inputStyle, fontWeight: 700, borderColor: error && name ? '#E74C3C' : '#EDE4D8' }}
                    aria-label={`Atributo ${index + 1}`}
                  />
                  {rows.length === 0 && (
                    <button type="button" onClick={() => removeAttributeName(index)} style={{ ...smallBtn, color: '#9B4728' }} aria-label="Quitar atributo">
                      ✕
                    </button>
                  )}
                </div>
                {error && name && <p className="text-[#C0392B] text-[11px] mt-1 mb-0 font-['Nunito_Sans']">{error}</p>}
              </div>
            )
          })}
        </div>
        <datalist id="variant-attribute-suggestions">
          {ATTRIBUTE_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
        </datalist>
        {rows.length === 0 && textNames.length < MAX_VARIANT_ATTRIBUTES - 1 && (
          <button type="button" onClick={addAttributeName} style={{ ...smallBtn, marginTop: 8 }}>
            + Otro atributo
          </button>
        )}
        {textNames.length === 0 && <p className={`${hint} mt-1`}>Sin atributo: las variantes se diferencian solo por su medida.</p>}
      </div>

      {/* ── Nueva variante ── */}
      <div className="rounded-xl border border-[#C8E0BC] bg-[#F4F9F1] p-3 space-y-2.5">
        <p className="text-[13px] font-extrabold text-[#205134] m-0 font-['Nunito_Sans']">Nueva variante</p>

        {textNames.length > 0 && (
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(textNames.length, 2)}, minmax(0, 1fr))` }}>
            {textNames.map((name, index) => (
              <div key={index} className="min-w-0">
                <label className={fieldLabel}>{name.trim() || 'Valor'}</label>
                <input
                  value={form.values[name] ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, values: { ...f.values, [name]: e.target.value } }))}
                  onKeyDown={onEnter}
                  placeholder={`Ej: ${['Fresa', 'Roja', 'M'][index] ?? 'valor'}`}
                  maxLength={60}
                  list={`variant-values-${index}`}
                  style={inputStyle}
                />
                {/* Valores ya usados, para no escribirlos de nuevo */}
                <datalist id={`variant-values-${index}`}>
                  {(attributes.find((a) => a.name === name)?.options ?? []).map((o) => <option key={o} value={o} />)}
                </datalist>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div className="min-w-0">
            <label className={fieldLabel}>
              Unidad de medida {rows.length === 0 && <span className="font-normal text-[#9B7D5A]">(opcional)</span>}
            </label>
            <select value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} style={inputStyle}>
              <option value="">Sin medida</option>
              {UNIT_GROUPS.map((group) => (
                <optgroup key={group} label={group}>
                  {UNITS.filter((u) => u.group === group).map((u) => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <label className={fieldLabel}>Cantidad</label>
            <input
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              onKeyDown={onEnter}
              disabled={!form.unit}
              inputMode="decimal"
              placeholder={form.unit ? `Ej: 250 ${form.unit}` : 'Elige la unidad'}
              maxLength={12}
              style={{ ...inputStyle, background: form.unit ? '#fff' : '#F3ECE2' }}
            />
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 items-end">
          <div className="min-w-0">
            <label className={fieldLabel}>Stock</label>
            <input
              type="number"
              min={0}
              value={form.stock}
              onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
              onKeyDown={onEnter}
              placeholder="Ej: 20"
              style={inputStyle}
            />
          </div>
          <div className="min-w-0">
            <label className={fieldLabel}>Precio</label>
            <input
              type="number"
              min={0}
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              onKeyDown={onEnter}
              placeholder="Ej: 8000"
              style={inputStyle}
            />
          </div>
          <button type="button" onClick={addVariant} style={{ ...smallBtn, background: '#205134', color: '#fff', border: 'none', padding: '9px 14px' }}>
            + Agregar
          </button>
        </div>
        {formError && <p className="text-[#C0392B] text-xs m-0 font-['Nunito_Sans']">{formError}</p>}
      </div>

      {/* ── Variantes agregadas ── */}
      {rows.length > 0 ? (
        <div className="rounded-xl border border-[#EDE4D8] overflow-hidden">
          <div className="px-3 py-2 bg-[#F5EEE6] text-xs font-bold text-[#205134] font-['Nunito_Sans']">
            {rows.length} {rows.length === 1 ? 'variante' : 'variantes'} · {totalStock} unidades
          </div>
          <div className="divide-y divide-[#F0EAE1] max-h-[360px] overflow-y-auto">
            {rows.map((row) => {
              const key = keyOf(row)
              const label = variantLabel(row.options, attributes)
              const isUploading = uploading.includes(key)
              const soldOut = (parseInt(row.stock, 10) || 0) === 0
              return (
                <div key={key} className="px-3 py-2.5 bg-white">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[13px] font-bold text-[#1C3A14] font-['Nunito_Sans'] min-w-0 truncate">
                      {attributes.map((a) => row.options[a.name]).filter(Boolean).join(' · ')}
                      {soldOut && (
                        <span className="ml-2 text-[10px] font-extrabold text-[#9B4728] bg-[#FFF3EB] border border-[#F3D2C4] rounded-full px-2 py-0.5">AGOTADO</span>
                      )}
                    </span>
                    <button type="button" onClick={() => removeRow(key)} style={{ ...smallBtn, padding: '4px 8px', color: '#9B4728' }} aria-label={`Quitar ${label}`}>
                      ✕
                    </button>
                  </div>
                  <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                    <input
                      type="number"
                      min={0}
                      value={row.stock}
                      onChange={(e) => setRow(key, { stock: e.target.value })}
                      placeholder="Stock"
                      style={inputStyle}
                      aria-label={`Stock de ${label}`}
                      title="Stock"
                    />
                    <input
                      type="number"
                      min={0}
                      value={row.price}
                      onChange={(e) => setRow(key, { price: e.target.value })}
                      placeholder="Precio"
                      style={inputStyle}
                      aria-label={`Precio de ${label}`}
                      title="Precio"
                    />
                    <div className="flex items-center gap-1.5">
                      {row.image_url ? (
                        <>
                          <img src={row.image_url} alt="" className="w-9 h-9 rounded-lg object-cover border border-[#EDE4D8]" />
                          <button
                            type="button"
                            onClick={() => setRow(key, { image_url: null, image_storage_path: null })}
                            style={{ ...smallBtn, padding: '6px 8px', color: '#9B4728' }}
                            aria-label="Quitar foto de la variante"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <label style={{ ...smallBtn, padding: '6px 10px', opacity: isUploading ? 0.6 : 1 }} title="Foto de esta variante (opcional)">
                          {isUploading ? 'Subiendo…' : '📷 Foto'}
                          <input
                            type="file"
                            accept=".jpg,.jpeg,.png"
                            style={{ display: 'none' }}
                            disabled={isUploading}
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              e.target.value = ''
                              if (file) uploadRowImage(key, file)
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                  {rowErrors[key] && <p className="text-[#C0392B] text-[11px] mt-1 mb-0 font-['Nunito_Sans']">{rowErrors[key]}</p>}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <p className={hint}>
          Aún no hay variantes. Completa los datos de arriba y pulsa «+ Agregar» por cada una (ej.: Fresa · 250 ml, luego Mora · 250 ml y Mora · 500 ml).
        </p>
      )}

      {rows.length > 0 && <p className={hint}>Las variantes con stock 0 aparecen como «Agotado».</p>}
    </div>
  )
}
