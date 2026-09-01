import { useState, useEffect } from 'react'
import HomeScreen from './screens/HomeScreen'
import MarketplaceScreen from './screens/MarketplaceScreen'
import CheckoutScreen from './screens/CheckoutScreen'
import type { CartItem } from './screens/MarketplaceScreen'
import TourismScreen from './screens/TourismScreen'
import ProfileScreen from './screens/ProfileScreen'
import RegisterScreen from './screens/RegisterScreen'
import LoginScreen from './screens/LoginScreen'
import { supabase } from './lib/supabase'

type Tab = 'home' | 'market' | 'tourism' | 'profile'
type UserRole = 'asociacion' | 'turismo' | 'comprador'
type AppFlow = 'auth' | 'login' | 'app'

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
  const [flow, setFlow] = useState<AppFlow>('app')
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [checkingSession, setCheckingSession] = useState(true)
  const [userRole, setUserRole] = useState<UserRole | undefined>()
  const [checkoutItems, setCheckoutItems] = useState<CartItem[]>([])
  const [checkoutConfirm, setCheckoutConfirm] = useState<((items: CartItem[]) => Promise<boolean>) | null>(null)

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
      setFlow('app')
      loadRole(session)
      setCheckingSession(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setFlow('app')
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

  const statusBg = flow === 'app' ? '#205134' : '#205134'

  const mainScreens: Record<Tab, JSX.Element> = {
    home: <HomeScreen onNavigate={setActiveTab} />,
    market: (
        <MarketplaceScreen
          onNavigate={setActiveTab}
        onOpenCheckout={(products, onConfirm) => {
          setCheckoutItems(products)
          setCheckoutConfirm(() => onConfirm)
        }}
      />
    ),
    tourism: <TourismScreen onRequireAuth={(mode) => setFlow(mode)} onNavigate={setActiveTab} />,
    profile: <ProfileScreen />,
  }

  if (checkingSession) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ background: '#205134', color: '#F5EEE6', fontFamily: "'Nunito Sans', sans-serif" }}
      >
        Cargando...
      </div>
    )
}

  return (
    <div className="min-h-screen w-full" style={{ background: '#F5EEE6' }}>
      <div className="min-h-screen w-full" style={{ background: statusBg }}>
        <div className="min-h-screen w-full flex flex-col" style={{ background: '#F5EEE6' }}>
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
            {flow === 'app' && (checkoutConfirm ? (
              <CheckoutScreen
                items={checkoutItems}
                onItemsChange={setCheckoutItems}
                onBack={() => setCheckoutConfirm(null)}
                onConfirm={checkoutConfirm}
                onRequireAuth={(mode) => setFlow(mode)}
              />
            ) : mainScreens[activeTab])}
          </div>

        </div>
      </div>
    </div>
  )
}
