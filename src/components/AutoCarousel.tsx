import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'

interface AutoCarouselProps {
  children: ReactNode[]
  intervalMs?: number
  /** Tarjetas visibles a la vez en escritorio. En pantallas pequeñas se reduce (1 en móvil, 2 en tablet). */
  perView?: number
}

// Tarjetas visibles según el ancho de la pantalla, sin pasar de `max`
function useResponsivePerView(max: number) {
  const calc = () => {
    if (typeof window === 'undefined') return 1
    const byWidth = window.innerWidth < 640 ? 1 : window.innerWidth < 1024 ? 2 : 3
    return Math.max(1, Math.min(max, byWidth))
  }
  const [perView, setPerView] = useState(calc)

  useEffect(() => {
    const onResize = () => setPerView(calc())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [max])

  return perView
}

export default function AutoCarousel({ children, intervalMs = 4000, perView: maxPerView = 1 }: AutoCarouselProps) {
  const [index, setIndex] = useState(0)
  const total = children.length
  const perView = Math.min(useResponsivePerView(maxPerView), Math.max(total, 1))
  // Posiciones posibles: el carrusel avanza de a una tarjeta hasta mostrar la última
  const steps = Math.max(total - perView + 1, 1)

  useEffect(() => {
    if (index >= steps) setIndex(0)
  }, [index, steps])

  useEffect(() => {
    if (steps <= 1) return
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % steps)
    }, intervalMs)
    return () => clearInterval(timer)
  }, [steps, intervalMs])

  if (total === 0) return null

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ overflow: 'hidden', margin: '0 -6px' }}>
        <div
          style={{
            display: 'flex',
            transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: `translateX(-${(index * 100) / perView}%)`,
          }}
        >
          {children.map((child, i) => {
            const visible = i >= index && i < index + perView
            return (
              <div
                key={i}
                style={{
                  minWidth: `${100 / perView}%`,
                  padding: '0 6px',
                  boxSizing: 'border-box',
                  transition: 'transform 0.6s ease, opacity 0.6s ease',
                  transform: visible ? 'scale(1)' : 'scale(0.96)',
                  opacity: visible ? 1 : 0.6,
                }}
              >
                {child}
              </div>
            )
          })}
        </div>
      </div>

      {steps > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 14 }}>
          {Array.from({ length: steps }, (_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Ir a la diapositiva ${i + 1}`}
              style={{
                width: i === index ? 22 : 8,
                height: 8,
                borderRadius: 4,
                border: 'none',
                background: i === index ? '#205134' : '#D8CFC0',
                cursor: 'pointer',
                transition: 'all 0.35s ease',
                padding: 0,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
