import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'

interface AutoCarouselProps {
  children: ReactNode[]
  intervalMs?: number
  itemsPerView?: number
}

export default function AutoCarousel({ children, intervalMs = 4500, itemsPerView = 2 }: AutoCarouselProps) {
  const [index, setIndex] = useState(0)

  // Agrupa las tarjetas en "páginas" de N elementos
  const pages: ReactNode[][] = []
  for (let i = 0; i < children.length; i += itemsPerView) {
    pages.push(children.slice(i, i + itemsPerView))
  }
  const total = pages.length

  useEffect(() => {
    if (total <= 1) return
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % total)
    }, intervalMs)
    return () => clearInterval(timer)
  }, [total, intervalMs])

  if (total === 0) return null

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            transition: 'transform 0.5s ease',
            transform: `translateX(-${index * 100}%)`,
          }}
        >
          {pages.map((page, pageIndex) => (
            <div
              key={pageIndex}
              style={{
                minWidth: '100%',
                display: 'grid',
                gridTemplateColumns: `repeat(${itemsPerView}, 1fr)`,
                gap: 14,
              }}
            >
              {page}
            </div>
          ))}
        </div>
      </div>

      {total > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 }}>
          {pages.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Ir a la página ${i + 1}`}
              style={{
                width: i === index ? 18 : 8,
                height: 8,
                borderRadius: 4,
                border: 'none',
                background: i === index ? '#205134' : '#D8CFC0',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                padding: 0,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}