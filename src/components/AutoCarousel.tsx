import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'

interface AutoCarouselProps {
  children: ReactNode[]
  intervalMs?: number
}

export default function AutoCarousel({ children, intervalMs = 4000 }: AutoCarouselProps) {
  const [index, setIndex] = useState(0)
  const total = children.length

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
      <div style={{ overflow: 'hidden', margin: '0 -6px' }}>
        <div
          style={{
            display: 'flex',
            transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: `translateX(-${index * 100}%)`,
          }}
        >
          {children.map((child, i) => (
            <div
              key={i}
              style={{
                minWidth: '100%',
                padding: '0 6px',
                boxSizing: 'border-box',
                transition: 'transform 0.6s ease, opacity 0.6s ease',
                transform: i === index ? 'scale(1)' : 'scale(0.96)',
                opacity: i === index ? 1 : 0.6,
              }}
            >
              {child}
            </div>
          ))}
        </div>
      </div>

      {total > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 14 }}>
          {children.map((_, i) => (
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