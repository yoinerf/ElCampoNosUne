import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { AuthProvider } from './lib/auth'
import { StoresProvider } from './lib/storesContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <StoresProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </StoresProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
