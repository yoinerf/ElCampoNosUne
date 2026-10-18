import { Component, type ErrorInfo, type ReactNode } from 'react'

// Captura errores de render y fallos al descargar pantallas perezosas (lazy) — por ejemplo,
// tras un despliegue nuevo que cambió los nombres de los archivos — para no dejar la página en blanco.
export default class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error no controlado en la interfaz:', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ background: '#F5EEE6', color: '#205134', fontFamily: "'Nunito Sans', sans-serif", padding: 16 }}
      >
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>Algo salió mal</p>
          <p style={{ fontSize: 15, margin: '0 0 20px', color: '#3D2B1A' }}>
            No pudimos cargar esta sección. Recarga la página para intentarlo de nuevo.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ background: '#205134', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 28px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
          >
            Recargar
          </button>
        </div>
      </div>
    )
  }
}
