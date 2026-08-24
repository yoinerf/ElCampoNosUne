import { useState, useEffect } from 'react'
import HomeScreen from './screens/HomeScreen'
import MarketplaceScreen from './screens/MarketplaceScreen'
import TourismScreen from './screens/TourismScreen'
import ProfileScreen from './screens/ProfileScreen'
import RegisterScreen from './screens/RegisterScreen'
import LoginScreen from './screens/LoginScreen'
import { supabase } from './lib/supabase'

type Tab = 'home' | 'market' | 'tourism' | 'profile'
type UserRole = 'asociacion' | 'turismo' | 'comprador'
type AppFlow = 'auth' | 'login' | 'app'

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: 'Inicio', icon: '🌿' },
  { id: 'market', label: 'Mercados', icon: '🌽' },
  { id: 'tourism', label: 'Turismo', icon: '🏞️' },
  { id: 'profile', label: 'Mi Perfil', icon: '👤' },
]

const getVisibleTabs = (role?: UserRole) => {
  switch (role) {
    case 'asociacion':
      return ['market', 'profile'] as Tab[]
    case 'turismo':
      return ['tourism', 'profile'] as Tab[]
    case 'comprador':
      return ['home', 'market', 'tourism', 'profile'] as Tab[]
    default:
      return ['home', 'market', 'tourism', 'profile'] as Tab[]
  }
}

export default function App() {
  const [flow, setFlow] = useState<AppFlow>('auth')
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [checkingSession, setCheckingSession] = useState(true)
  const [userRole, setUserRole] = useState<UserRole | undefined>()

  useEffect(() => {
    const loadRole = async (session: { user: { id: string } } | null) => {
      if (!session) {
        setUserRole(undefined)
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', session.user.id)
        .single()

      const role = data?.user_type as UserRole | undefined
      setUserRole(role)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setFlow(session ? 'app' : 'auth')
      loadRole(session)
      setCheckingSession(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setFlow(session ? 'app' : 'auth')
      loadRole(session)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const visibleTabs = getVisibleTabs(userRole)

  useEffect(() => {
    if (flow !== 'app') return
    if (!visibleTabs.includes(activeTab)) {
      setActiveTab(visibleTabs[0] ?? 'home')
    }
  }, [flow, visibleTabs, activeTab])

  const statusBg = flow === 'app' ? '#2A5C1A' : '#1C3F10'

  const mainScreens: Record<Tab, JSX.Element> = {
    home: <HomeScreen onNavigate={setActiveTab} />,
    market: <MarketplaceScreen />,
    tourism: <TourismScreen />,
    profile: <ProfileScreen />,
  }

  if (checkingSession) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ background: '#1C3F10', color: '#FAF7EF', fontFamily: 'Nunito, sans-serif' }}
      >
        Cargando...
      </div>
    )
}

  return (
    <div className="min-h-screen w-full" style={{ background: '#FAF7EF' }}>
      <div className="min-h-screen w-full" style={{ background: statusBg }}>
        <div className="min-h-screen w-full flex flex-col" style={{ background: '#FAF7EF' }}>
          <div className="flex-1 overflow-y-auto">
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

          {flow === 'app' && (
            <div
              className="w-full sticky bottom-0"
              style={{
                background: '#FAF7EF',
                borderTop: '1px solid #E8E0CF',
                boxShadow: '0 -4px 20px rgba(42,92,26,0.08)',
                zIndex: 10,
              }}
            >
              <div className="flex w-full">
                {tabs.filter((tab) => visibleTabs.includes(tab.id)).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="flex-1 flex flex-col items-center pt-3 pb-2 gap-1"
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
    </div>
  )
}
