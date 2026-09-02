import { useState, useEffect } from 'react'
import HomeScreen from './screens/HomeScreen'
import MarketplaceScreen from './screens/MarketplaceScreen'
import CheckoutScreen from './screens/CheckoutScreen'
import type { CartItem } from './screens/MarketplaceScreen'
import TourismScreen from './screens/TourismScreen'
import ProfileScreen from './screens/ProfileScreen'
import RegisterScreen from './screens/RegisterScreen'
import LoginScreen from './screens/LoginScreen'
import AdminPanelScreen from './screens/AdminPanelScreen'
import { supabase } from './lib/supabase'

type Tab = 'home' | 'market' | 'tourism' | 'profile'
type UserRole = 'asociacion' | 'turismo' | 'comprador'
type AppFlow = 'auth' | 'login' | 'app'

const getVisibleTabs = (role?: UserRole) => {
  switch (role) {
    case 'asociacion':
    case 'turismo':
      return ['home', 'profile'] as Tab[]
    case 'comprador':
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
  const [initialProduct, setInitialProduct] = useState<string | null>(null)

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

  /** Verifica si el usuario está autenticado antes de mostrar el perfil */
  const handleProfileClick = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setFlow('auth')
    } else {
      setActiveTab('profile')
    }
  }

  const returnToStore = () => {
    setFlow('app')
    setActiveTab('market')
  }

  const returnToHome = () => {
    setFlow('app')
    setActiveTab('home')
  }

  const isProducer = userRole === 'asociacion' || userRole === 'turismo'

  const mainScreens: Record<Tab, JSX.Element> = {
    home: isProducer ? (
      <AdminPanelScreen onNavigate={setActiveTab} activeNav={activeTab} onProfileClick={handleProfileClick} userRole={userRole} />
    ) : (
      <HomeScreen onNavigate={setActiveTab} activeNav={activeTab} onProfileClick={handleProfileClick} userRole={userRole} />
    ),
    market: (
      <MarketplaceScreen
        onNavigate={setActiveTab}
        activeNav={activeTab}
        onProfileClick={handleProfileClick}
        userRole={userRole}
        onOpenCheckout={(products, onConfirm) => {
          setCheckoutItems(products)
          setCheckoutConfirm(() => onConfirm)
        }}
      />
    ),
    tourism: <TourismScreen onRequireAuth={(mode) => setFlow(mode)} onNavigate={setActiveTab} activeNav={activeTab} onProfileClick={handleProfileClick} userRole={userRole} />,
    profile: <ProfileScreen userRole={userRole} onNavigate={setActiveTab} activeNav={activeTab} onProfileClick={handleProfileClick} />,
  }

  if (checkingSession) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ background: '#F5EEE6', color: '#205134', fontFamily: "'Nunito Sans', sans-serif" }}
      >
        <div style={{ textAlign: 'center' }}>
          <img
            src="/src/assets/logo-nofond.png"
            alt="El Campo Nos Une"
            style={{ height: 60, margin: '0 auto 16px', display: 'block' }}
          />
          <p style={{ fontSize: 15, fontWeight: 600 }}>Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full" style={{ background: '#F5EEE6' }}>
      <div className="min-h-screen w-full flex flex-col">
        <div className="flex-1">
          {flow === 'auth' && (
            <RegisterScreen
              onComplete={() => setFlow('app')}
              onLogin={() => setFlow('login')}
              onBackToStore={returnToStore}
              onBackToHome={returnToHome}
            />
          )}
          {flow === 'login' && (
            <LoginScreen
              onLogin={() => setFlow('app')}
              onRegister={() => setFlow('auth')}
              onBackToStore={returnToStore}
              onBackToHome={returnToHome}
            />
          )}
          {flow === 'app' && (checkoutConfirm ? (
            <CheckoutScreen
              items={checkoutItems}
              onItemsChange={(newItems) => {
                setCheckoutItems(newItems)
                const newCart = newItems.reduce((acc, item) => {
                  acc[item.product.id] = item.quantity
                  return acc
                }, {} as Record<string, number>)
                localStorage.setItem('campoconecta_cart', JSON.stringify(newCart))
              }}
              onBack={() => setCheckoutConfirm(null)}
              onConfirm={checkoutConfirm}
              onRequireAuth={(mode) => setFlow(mode)}
              onViewProduct={(productId) => {
                setInitialProduct(productId)
                setCheckoutConfirm(null)
              }}
            />
          ) : activeTab === 'market' ? (
            <MarketplaceScreen
              onOpenCheckout={(items, confirmFn) => {
                setCheckoutItems(items)
                setCheckoutConfirm(() => confirmFn)
              }}
              onNavigate={setActiveTab}
              activeNav={activeTab}
              onProfileClick={() => setActiveTab('profile')}
              initialSelectedProduct={initialProduct}
              onClearInitialProduct={() => setInitialProduct(null)}
            />
          ) : mainScreens[activeTab])}
        </div>
      </div>
    </div>
  )
}
