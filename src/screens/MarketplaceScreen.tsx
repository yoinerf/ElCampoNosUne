import { useState } from 'react'

const filters = ['Todos', 'Cultivos', 'Lácteos', 'Procesados', 'Pecuario', 'Hierbas']

const products = [
  {
    id: 1,
    title: 'Café Especial Tostado',
    producer: 'Asoc. Cafeteros del Sur · Huila',
    rating: 4.9,
    reviews: 87,
    price: '$28.000',
    unit: '/kg',
    category: 'Procesados',
    certified: true,
    img: 'https://images.unsplash.com/photo-1781453640199-b37c09897dd0?w=400&h=300&fit=crop&auto=format',
    stock: 'Disponible',
  },
  {
    id: 2,
    title: 'Cacao Fermentado Orgánico',
    producer: 'Cooperativa Amazónica · Putumayo',
    rating: 4.8,
    reviews: 54,
    price: '$35.000',
    unit: '/kg',
    category: 'Cultivos',
    certified: true,
    img: 'https://images.unsplash.com/photo-1781453642062-03591a84efe6?w=400&h=300&fit=crop&auto=format',
    stock: 'Disponible',
  },
  {
    id: 3,
    title: 'Verduras de Temporada',
    producer: 'Finca La Esperanza · Boyacá',
    rating: 4.7,
    reviews: 32,
    price: '$15.000',
    unit: '/bolsa 5kg',
    category: 'Cultivos',
    certified: false,
    img: 'https://images.unsplash.com/photo-1687199129802-3e4cc27baac0?w=400&h=300&fit=crop&auto=format',
    stock: 'Disponible',
  },
  {
    id: 4,
    title: 'Miel de Abejas Nativas',
    producer: 'Apicultores del Magdalena',
    rating: 4.9,
    reviews: 61,
    price: '$42.000',
    unit: '/500ml',
    category: 'Procesados',
    certified: true,
    img: 'https://images.unsplash.com/photo-1627904199684-fe1fbafabdee?w=400&h=300&fit=crop&auto=format',
    stock: 'Últimas unidades',
  },
  {
    id: 5,
    title: 'Queso Campesino Artesanal',
    producer: 'Asociación Lácteos Nariño',
    rating: 4.6,
    reviews: 43,
    price: '$18.000',
    unit: '/500g',
    category: 'Lácteos',
    certified: false,
    img: 'https://images.unsplash.com/photo-1783309239938-a618c29f78fb?w=400&h=300&fit=crop&auto=format',
    stock: 'Disponible',
  },
  {
    id: 6,
    title: 'Mora Castilla Fresca',
    producer: 'Fruticultores de Cundinamarca',
    rating: 4.5,
    reviews: 28,
    price: '$8.000',
    unit: '/kg',
    category: 'Cultivos',
    certified: false,
    img: 'https://images.unsplash.com/photo-1550825488-17306e3f30c2?w=400&h=300&fit=crop&auto=format',
    stock: 'Disponible',
  },
]

export default function MarketplaceScreen() {
  const [activeFilter, setActiveFilter] = useState('Todos')
  const [cart, setCart] = useState<number[]>([])

  const filtered = activeFilter === 'Todos' ? products : products.filter((p) => p.category === activeFilter)

  const toggleCart = (id: number) => {
    setCart((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  return (
    <div className="h-full flex flex-col" style={{ background: '#FAF7EF' }}>
      {/* Header */}
      <div style={{ background: '#2A5C1A', padding: '18px 20px 16px' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 22, color: '#FAF7EF', margin: 0, fontWeight: 700 }}>
            Mercados Campesinos
          </h2>
          <div style={{ position: 'relative' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
              }}
            >
              🛒
            </div>
            {cart.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: '#D4870A',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'Nunito, sans-serif',
                }}
              >
                {cart.length}
              </div>
            )}
          </div>
        </div>
        {/* Search bar */}
        <div
          style={{
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            padding: '9px 12px',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 16 }}>🔍</span>
          <span style={{ fontSize: 13, color: 'rgba(250,247,239,0.6)', fontFamily: 'Nunito, sans-serif' }}>
            Buscar productos del campo...
          </span>
        </div>
      </div>

      {/* Filters */}
      <div style={{ padding: '12px 0 0', background: '#FAF7EF' }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 20px 12px' }}>
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              style={{
                flexShrink: 0,
                padding: '6px 16px',
                borderRadius: 20,
                border: activeFilter === f ? 'none' : '1.5px solid #E8E0CF',
                background: activeFilter === f ? '#2A5C1A' : '#fff',
                color: activeFilter === f ? '#FAF7EF' : '#3D2B1A',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'Nunito, sans-serif',
                cursor: 'pointer',
              }}
            >
              {f}
            </button>
          ))}
        </div>
        <div style={{ borderBottom: '1px solid #E8E0CF' }} />
      </div>

      {/* Products grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 20px' }}>
        <p style={{ fontSize: 13, color: '#8A8070', fontFamily: 'Nunito, sans-serif', margin: '0 0 14px' }}>
          {filtered.length} productos disponibles
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {filtered.map((product) => (
            <div
              key={product.id}
              style={{
                background: '#fff',
                borderRadius: 18,
                overflow: 'hidden',
                border: '1px solid #E8E0CF',
                boxShadow: '0 2px 12px rgba(42,92,26,0.06)',
              }}
            >
              <div style={{ position: 'relative', height: 110 }}>
                <img
                  src={product.img}
                  alt={product.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {product.certified && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 7,
                      left: 7,
                      background: '#2A5C1A',
                      color: '#fff',
                      fontSize: 9,
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 20,
                      fontFamily: 'Nunito, sans-serif',
                    }}
                  >
                    ✓ Certificado
                  </div>
                )}
                <button
                  onClick={() => toggleCart(product.id)}
                  style={{
                    position: 'absolute',
                    top: 7,
                    right: 7,
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    border: 'none',
                    background: cart.includes(product.id) ? '#D4870A' : 'rgba(255,255,255,0.9)',
                    color: cart.includes(product.id) ? '#fff' : '#3D2B1A',
                    fontSize: 14,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {cart.includes(product.id) ? '✓' : '+'}
                </button>
                {product.stock !== 'Disponible' && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: 'rgba(196,98,45,0.85)',
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '3px 0',
                      textAlign: 'center',
                      fontFamily: 'Nunito, sans-serif',
                    }}
                  >
                    {product.stock}
                  </div>
                )}
              </div>
              <div style={{ padding: '10px 11px 12px' }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#1C3F10',
                    fontFamily: 'Fraunces, serif',
                    lineHeight: 1.3,
                    marginBottom: 3,
                  }}
                >
                  {product.title}
                </div>
                <div style={{ fontSize: 10, color: '#8A8070', fontFamily: 'Nunito, sans-serif', marginBottom: 8, lineHeight: 1.3 }}>
                  {product.producer}
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#D4870A', fontFamily: 'Nunito, sans-serif' }}>
                      {product.price}
                    </span>
                    <span style={{ fontSize: 10, color: '#8A8070', fontFamily: 'Nunito, sans-serif' }}>
                      {product.unit}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: '#3D7A28', fontFamily: 'Nunito, sans-serif' }}>
                    ⭐ {product.rating}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add product CTA */}
      <div style={{ padding: '12px 20px 16px', background: '#FAF7EF', borderTop: '1px solid #E8E0CF' }}>
        <button
          style={{
            width: '100%',
            padding: '13px',
            borderRadius: 14,
            border: '2px dashed #7FB069',
            background: 'rgba(127,176,105,0.08)',
            color: '#2A5C1A',
            fontSize: 14,
            fontWeight: 700,
            fontFamily: 'Nunito, sans-serif',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 18 }}>＋</span>
          Publicar mi producto
        </button>
      </div>
    </div>
  )
}
