import React, { useState, useEffect } from 'react'

export interface ProductModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => Promise<void>
  initialData?: any
  title?: string
  categories?: { id: string; name: string }[]
}

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 12,
  border: '1.5px solid #EDE4D8',
  fontSize: 14,
  fontFamily: "'Nunito Sans', sans-serif",
  boxSizing: 'border-box' as const,
  background: '#fff',
  color: '#3D2B1A',
}

const labelStyle = {
  display: 'block',
  fontSize: 13,
  fontWeight: 700,
  color: '#205134',
  marginBottom: 6,
  fontFamily: "'Nunito Sans', sans-serif",
}

export default function ProductModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  title = 'Nuevo producto',
  categories = []
}: ProductModalProps) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    category_id: '',
    price: '',
    stockNum: '0',
    unit: 'kg',
    img: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&h=400&fit=crop&auto=format',
    description: '',
    certified: true,
  })

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setForm({
          title: initialData.title || '',
          category_id: initialData.category_id || initialData.category || '',
          price: initialData.price ? String(initialData.price) : '',
          stockNum: initialData.stockNum ? String(initialData.stockNum).replace(/\D/g, '') : (initialData.stock ? String(initialData.stock).replace(/\D/g, '') : '0'),
          unit: initialData.unit || 'kg',
          img: initialData.img || '',
          description: initialData.description || '',
          certified: initialData.certified ?? true,
        })
      } else {
        const defaultCatId = categories.length > 0 ? categories[0].id : ''
        setForm({
          title: '',
          category_id: defaultCatId,
          price: '',
          stockNum: '10',
          unit: 'kg',
          img: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&h=400&fit=crop&auto=format',
          description: '',
          certified: true,
        })
      }
    }
  }, [isOpen, initialData, categories])

  if (!isOpen) return null

  const handleSave = async () => {
    if (!form.title.trim() || !form.price) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 520, padding: 28, boxShadow: '0 20px 50px rgba(0,0,0,0.2)', boxSizing: 'border-box', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontFamily: "'Poppins', sans-serif", fontSize: 20, color: '#205134', margin: 0, fontWeight: 700 }}>
            {title}
          </h3>
          <button type="button" onClick={onClose} style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: '#F3ECE2', cursor: 'pointer', fontSize: 18, color: '#9B4728', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>x</button>
        </div>
        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <label style={labelStyle}>Nombre</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ej: Café Especial Nariño" style={inputStyle} />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: categories.length > 0 ? '1fr 1fr' : '1fr', gap: 10 }}>
            {categories.length > 0 && (
              <div>
                <label style={labelStyle}>Categoría</label>
                <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} style={inputStyle}>
                  <option value="">Seleccionar...</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label style={labelStyle}>Precio ($ COP)</label>
              <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="28000" style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Cantidad en Stock</label>
              <input type="number" value={form.stockNum} onChange={(e) => setForm({ ...form, stockNum: e.target.value })} placeholder="45" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Unidad de medida</label>
              <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="kg, lb, uds..." style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>URL de imagen</label>
            <input value={form.img} onChange={(e) => setForm({ ...form, img: e.target.value })} placeholder="https://..." style={inputStyle} />
            {form.img && <img src={form.img} alt="preview" style={{ marginTop: 8, width: '100%', height: 120, objectFit: 'cover', borderRadius: 12 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />}
          </div>
          <div>
            <label style={labelStyle}>Descripción</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripción detallada..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#3D2B1A', fontSize: 14 }}>
            <input type="checkbox" checked={form.certified} onChange={(e) => setForm({ ...form, certified: e.target.checked })} />
            Producto certificado orgánico o de calidad
          </label>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button type="button" onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 14, border: 'none', background: '#F3ECE2', color: '#205134', fontWeight: 700, cursor: 'pointer', fontFamily: "'Nunito Sans', sans-serif" }}>Cancelar</button>
          <button type="button" onClick={handleSave} disabled={saving} style={{ flex: 1, padding: 12, borderRadius: 14, border: 'none', background: '#205134', color: '#fff', fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito Sans', sans-serif", opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
