import { useState } from 'react'
import HomeScreen from './screens/HomeScreen'
import MarketplaceScreen from './screens/MarketplaceScreen'
import TourismScreen from './screens/TourismScreen'
import ProfileScreen from './screens/ProfileScreen'
import RegisterScreen from './screens/RegisterScreen'
import LoginScreen from './screens/LoginScreen'

type Tab = 'home' | 'market' | 'tourism' | 'profile'
type AppFlow = 'auth' | 'login' | 'app'

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: 'Inicio', icon: '🌿' },
  { id: 'market', label: 'Mercados', icon: '🌽' },
  { id: 'tourism', label: 'Turismo', icon: '🏞️' },
  { id: 'profile', label: 'Mi Perfil', icon: '👤' },
]

export default function App() {
  const [flow, setFlow] = useState<AppFlow>('auth')
  const [activeTab, setActiveTab] = useState<Tab>('home')

  const statusBg = flow === 'app' ? '#2A5C1A' : '#1C3F10'

  const mainScreens: Record<Tab, JSX.Element> = {
    home: <HomeScreen onNavigate={setActiveTab} />,
    market: <MarketplaceScreen />,
    tourism: <TourismScreen />,
    profile: <ProfileScreen />,
  }

  return (
    <div
      className="flex items-center justify-center min-h-screen"
      style={{ background: 'linear-gradient(160deg, #1C3F10 0%, #2A5C1A 60%, #6B4C2A 100%)' }}
    >
      {/* Phone frame */}
      <div
        className="relative flex flex-col overflow-hidden shadow-2xl"
        style={{
          width: 390,
          height: 844,
          borderRadius: 44,
          background: '#FAF7EF',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 2px #3D2B1A, inset 0 0 0 1px rgba(255,255,255,0.1)',
        }}
      >
        {/* Status bar */}
        <div
          className="flex items-center justify-between px-6 pt-3 pb-1 flex-shrink-0"
          style={{ background: statusBg, color: '#FAF7EF', fontSize: 13, fontWeight: 600, transition: 'background 0.3s' }}
        >
          <span>9:41</span>
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2"
            style={{ width: 120, height: 34, background: '#1C3F10', borderRadius: '0 0 20px 20px' }}
          />
          <div className="flex items-center gap-1">
            <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
              <rect x="0" y="4" width="3" height="8" rx="1" opacity="0.4" />
              <rect x="4" y="2.5" width="3" height="9.5" rx="1" opacity="0.6" />
              <rect x="8" y="1" width="3" height="11" rx="1" opacity="0.8" />
              <rect x="12" y="0" width="3" height="12" rx="1" />
            </svg>
            <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
              <path d="M8 2.4C10.5 2.4 12.7 3.4 14.3 5L15.7 3.6C13.7 1.7 11 0.5 8 0.5C5 0.5 2.3 1.7 0.3 3.6L1.7 5C3.3 3.4 5.5 2.4 8 2.4Z" />
              <path d="M8 6C9.7 6 11.2 6.7 12.3 7.8L13.7 6.4C12.2 4.9 10.2 4 8 4C5.8 4 3.8 4.9 2.3 6.4L3.7 7.8C4.8 6.7 6.3 6 8 6Z" />
              <circle cx="8" cy="10.5" r="1.5" />
            </svg>
            <div style={{ width: 22, height: 11, border: '1.5px solid currentColor', borderRadius: 3, padding: '1.5px', display: 'flex', alignItems: 'center' }}>
              <div style={{ width: '80%', height: '100%', background: 'currentColor', borderRadius: 1 }} />
            </div>
          </div>
        </div>

        {/* Screen content */}
        <div className="flex-1 overflow-hidden relative">
          {flow === 'auth' && (
            <RegisterScreen
              onComplete={() => setFlow('app')}
              onLogin={() => setFlow('login')}
            />
          )}
          {flow === 'login' && (
            <LoginScreen
              onLogin={() => setFlow('app')}
              onRegister={() => setFlow('auth')}
            />
          )}
          {flow === 'app' && mainScreens[activeTab]}
        </div>

        {/* Bottom navigation — only in app */}
        {flow === 'app' && (
          <div
            className="flex-shrink-0 pb-5"
            style={{
              background: '#FAF7EF',
              borderTop: '1px solid #E8E0CF',
              boxShadow: '0 -4px 20px rgba(42,92,26,0.08)',
            }}
          >
            <div className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex-1 flex flex-col items-center pt-3 pb-1 gap-0.5"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <span style={{ fontSize: 22 }}>{tab.icon}</span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: activeTab === tab.id ? 700 : 500,
                      color: activeTab === tab.id ? '#2A5C1A' : '#8A8070',
                      fontFamily: 'Nunito, sans-serif',
                      letterSpacing: 0.2,
                    }}
                  >
                    {tab.label}
                  </span>
                  {activeTab === tab.id && (
                    <div style={{ width: 20, height: 3, borderRadius: 2, background: '#2A5C1A', marginTop: 1 }} />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
