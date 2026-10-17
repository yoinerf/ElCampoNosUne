import React, { useState, useEffect, lazy, Suspense } from 'react'
import HomeScreen from './screens/HomeScreen'
import type { CartItem } from './screens/MarketplaceScreen'
import { supabase, authRedirectInfo } from './lib/supabase'
import { AMAZON_PATH, STORE_NAMES, cartKey, isAmazonPath, type StoreId } from './lib/stores'

// Pantallas cargadas bajo demanda: no se descargan hasta que se necesitan
// (los paneles de admin, por ejemplo, no llegan al navegador de un comprador)
const MarketplaceScreen = lazy(() => import('./screens/MarketplaceScreen'))
const CheckoutScreen = lazy(() => import('./screens/CheckoutScreen'))
const TourismScreen = lazy(() => import('./screens/TourismScreen'))
const ProfileScreen = lazy(() => import('./screens/ProfileScreen'))
const BuyerPanelScreen = lazy(() => import('./screens/BuyerPanelScreen'))
const RegisterScreen = lazy(() => import('./screens/RegisterScreen'))
const LoginScreen = lazy(() => import('./screens/LoginScreen'))
const AdminPanelScreen = lazy(() => import('./screens/AdminPanelScreen'))
const SuperAdminScreen = lazy(() => import('./screens/SuperAdminScreen'))
const SetNewPasswordScreen = lazy(() => import('./screens/SetNewPasswordScreen'))

function ScreenLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: '#F5EEE6', color: '#205134', fontFamily: "'Nunito Sans', sans-serif", fontSize: 15, fontWeight: 600 }}>
      Cargando...
    </div>
  )
}
import logoImg from './assets/logo-nofond.png'

type Tab = 'home' | 'market' | 'tourism' | 'profile' | 'admin' | 'superadmin' | 'amazon'
type UserRole = 'asociacion' | 'turismo' | 'comprador' | 'admin'
type AppFlow = 'auth' | 'login' | 'app'

const getVisibleTabs = (role?: UserRole, store: StoreId = 'campo'): Tab[] => {
  switch (role) {
    case 'admin':
      return ['superadmin', 'home', 'market', 'tourism', 'amazon', 'profile']
    case 'asociacion':
      // El productor solo ve la tienda a la que pertenece
      return store === 'amazonica' ? ['admin', 'amazon'] : ['admin', 'market']
    case 'turismo':
      return ['admin', 'tourism']
    case 'comprador':
    default:
      return ['home', 'market', 'tourism', 'amazon', 'profile']
  }
}

export default function App() {
  const [flow, setFlow] = useState<AppFlow>('app')
  const [activeTab, setActiveTab] = useState<Tab>(isAmazonPath() ? 'amazon' : 'home')
  const [checkingSession, setCheckingSession] = useState(true)
  const [userRole, setUserRole] = useState<UserRole | undefined>()
  // Tienda del usuario (profiles.store): define qué tienda gestiona un productor
  const [userStore, setUserStore] = useState<StoreId>('campo')
  // Tienda desde la que el comprador abrió su panel (para mantener la marca)
  const [panelStore, setPanelStore] = useState<StoreId>('campo')
  const [checkoutItems, setCheckoutItems] = useState<CartItem[]>([])
  const [checkoutConfirm, setCheckoutConfirm] = useState<((items: CartItem[]) => Promise<boolean>) | null>(null)
  const [initialProduct, setInitialProduct] = useState<string | null>(null)
  // recovery: llegó desde el enlace del correo · forced: entró con contraseña temporal del admin
  const [passwordMode, setPasswordMode] = useState<'recovery' | 'forced' | null>(authRedirectInfo.isRecovery ? 'recovery' : null)

  useEffect(() => {
    const loadRole = async (session: { user: { id: string; user_metadata?: Record<string, any> } } | null) => {
      if (!session) {
        setUserRole(undefined)
        setUserStore('campo')
        return
      }

      // Contraseña temporal asignada por el admin: obligar a cambiarla
      if (session.user.user_metadata?.must_change_password) {
        setPasswordMode((prev) => prev ?? 'forced')
      }

      const { data } = await supabase
        .from('profiles')
        .select('user_type, store')
        .eq('id', session.user.id)
        .single()

      const role = data?.user_type as UserRole | undefined
      const store: StoreId = data?.store === 'amazonica' ? 'amazonica' : 'campo'
      setUserRole(role)
      setUserStore(store)

      if (role === 'admin') {
        setActiveTab((prev) => {
          if (prev === 'market' || prev === 'tourism' || prev === 'profile' || prev === 'amazon') return prev
          return 'superadmin'
        })
      } else if (role === 'asociacion' || role === 'turismo') {
        setActiveTab((prev) => {
          if (role === 'asociacion' && store === 'campo' && prev === 'market') return 'market'
          if (role === 'asociacion' && store === 'amazonica' && prev === 'amazon') return 'amazon'
          if (role === 'turismo' && prev === 'tourism') return 'tourism'
          return 'admin'
        })
      }
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      // Enlace de recuperación vencido o inválido: mostrar el login con el aviso
      setFlow(!session && authRedirectInfo.error ? 'login' : 'app')
      await loadRole(session)
      setCheckingSession(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setPasswordMode('recovery')
      if (event === 'SIGNED_OUT') setPasswordMode(null)
      setFlow('app')
      loadRole(session)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const visibleTabs = getVisibleTabs(userRole, userStore)

  // Tienda que se está viendo: define la marca de login, registro, checkout y paneles.
  // Dentro de la Tienda Amazónica no se muestra nada de El Campo Nos Une.
  const viewStore: StoreId =
    activeTab === 'amazon'
    || (activeTab === 'admin' && userStore === 'amazonica')
    || (activeTab === 'profile' && panelStore === 'amazonica')
      ? 'amazonica'
      : 'campo'

  // La Tienda Amazónica tiene su propia ruta (se puede compartir y recargar)
  useEffect(() => {
    if (checkingSession) return
    const wantsAmazon = viewStore === 'amazonica'
    document.title = STORE_NAMES[viewStore]
    if (wantsAmazon === isAmazonPath()) return
    const path = wantsAmazon ? AMAZON_PATH : '/'
    window.history.replaceState(window.history.state, '', path + window.location.search + window.location.hash)
  }, [viewStore, checkingSession])

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
      setFlow('login')
    } else {
      if (activeTab !== 'profile') setPanelStore(viewStore)
      setActiveTab('profile')
    }
  }

  const returnToStore = () => {
    setFlow('app')
    if (viewStore === 'amazonica' || (userRole === 'asociacion' && userStore === 'amazonica')) {
      setActiveTab('amazon')
    } else if (userRole === 'turismo') {
      setActiveTab('tourism')
    } else {
      setActiveTab('market')
    }
  }

  const returnToHome = () => {
    setFlow('app')
    if (viewStore === 'amazonica' && userRole !== 'admin' && userRole !== 'turismo') {
      setActiveTab(userRole === 'asociacion' ? 'admin' : 'amazon')
    } else if (userRole === 'admin') {
      setActiveTab('superadmin')
    } else if (userRole === 'asociacion' || userRole === 'turismo') {
      setActiveTab('admin')
    } else {
      setActiveTab('home')
    }
  }

  const handleOpenCheckout = (products: CartItem[], onConfirm: (items: CartItem[]) => Promise<boolean>) => {
    window.history.pushState({ modal: 'checkout' }, '', window.location.href)
    setCheckoutItems(products)
    setCheckoutConfirm(() => onConfirm)
  }

  const handleCloseCheckout = () => {
    // Only go back in history; the popstate listener will clear checkoutConfirm
    window.history.back()
  }

  useEffect(() => {
    const handlePopState = () => {
      // If the browser goes back, close whatever modal is open
      if (checkoutConfirm) {
        setCheckoutConfirm(null)
      } else if (flow !== 'app') {
        setFlow('app')
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [checkoutConfirm, flow])

  const mainScreens: Record<Tab, React.ReactElement> = {
    home: (
      <HomeScreen onNavigate={(t) => setActiveTab(t as Tab)} activeNav={activeTab as any} onProfileClick={handleProfileClick} userRole={userRole as any} />
    ),
    admin: (
      <AdminPanelScreen onNavigate={(t) => setActiveTab(t as Tab)} activeNav={activeTab as any} onProfileClick={handleProfileClick} userRole={userRole} store={userStore} />
    ),
    superadmin: (
      <SuperAdminScreen onNavigate={(t) => setActiveTab(t as Tab)} activeNav={activeTab as any} onProfileClick={handleProfileClick} userRole={userRole} />
    ),
    market: (
      <MarketplaceScreen
        onNavigate={(t) => setActiveTab(t as Tab)}
        activeNav={activeTab as any}
        onProfileClick={handleProfileClick}
        userRole={userRole as any}
        onOpenCheckout={handleOpenCheckout}
      />
    ),
    amazon: (
      <MarketplaceScreen
        key="amazonica"
        store="amazonica"
        onNavigate={(t) => setActiveTab(t as Tab)}
        activeNav={activeTab as any}
        onProfileClick={handleProfileClick}
        userRole={userRole as any}
        onOpenCheckout={handleOpenCheckout}
      />
    ),
    tourism: <TourismScreen onRequireAuth={(mode) => setFlow(mode)} onNavigate={(t) => setActiveTab(t as Tab)} activeNav={activeTab as any} onProfileClick={handleProfileClick} userRole={userRole as any} />,
    // El comprador tiene su propio panel (pedidos, pagos, reseñas, favoritos, solicitudes, datos)
    profile: userRole === 'comprador' ? (
      <BuyerPanelScreen
        userRole={userRole}
        onNavigate={(t) => setActiveTab(t as Tab)}
        activeNav={activeTab}
        onProfileClick={handleProfileClick}
        store={panelStore}
        onViewProduct={(productId, store) => {
          setInitialProduct(productId)
          setActiveTab(store === 'amazonica' ? 'amazon' : 'market')
        }}
      />
    ) : (
      <ProfileScreen userRole={userRole as any} onNavigate={(t) => setActiveTab(t as Tab)} activeNav={activeTab as any} onProfileClick={handleProfileClick} />
    ),
  }

  if (checkingSession) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ background: '#F5EEE6', color: '#205134', fontFamily: "'Nunito Sans', sans-serif" }}
      >
        <div style={{ textAlign: 'center' }}>
          {isAmazonPath() ? (
            <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: 26, fontWeight: 800, margin: '0 0 12px' }}>{STORE_NAMES.amazonica}</p>
          ) : (
            <img
              src={logoImg}
              alt="El Campo Nos Une"
              style={{ height: 60, margin: '0 auto 16px', display: 'block' }}
            />
          )}
          <p style={{ fontSize: 15, fontWeight: 600 }}>Cargando...</p>
        </div>
      </div>
    )
  }

  // Crear nueva contraseña (enlace de recuperación o contraseña temporal) antes de usar la app
  if (passwordMode) {
    return (
      <Suspense fallback={<ScreenLoader />}>
        <SetNewPasswordScreen mode={passwordMode} onDone={() => setPasswordMode(null)} />
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<ScreenLoader />}>
    <div className="min-h-screen w-full" style={{ background: '#F5EEE6' }}>
      <div className="min-h-screen w-full flex flex-col">
        <div className="flex-1">
          {flow === 'auth' && (
            <div key="register-flow" className="auth-screen-enter w-full min-h-screen">
              <RegisterScreen
                store={viewStore}
                onComplete={() => setFlow('app')}
                onLogin={() => setFlow('login')}
                onBackToStore={returnToStore}
                onBackToHome={returnToHome}
              />
            </div>
          )}
          {flow === 'login' && (
            <div key="login-flow" className="auth-screen-enter w-full min-h-screen">
              <LoginScreen
                store={viewStore}
                onLogin={() => setFlow('app')}
                onRegister={() => setFlow('auth')}
                onBackToStore={returnToStore}
                onBackToHome={returnToHome}
              />
            </div>
          )}
          {flow === 'app' && (checkoutConfirm ? (
            <CheckoutScreen
              store={viewStore}
              items={checkoutItems}
              onItemsChange={(newItems) => {
                setCheckoutItems(newItems)
                const newCart = newItems.reduce((acc, item) => {
                  acc[item.product.id] = item.quantity
                  return acc
                }, {} as Record<string, number>)
                localStorage.setItem(cartKey(viewStore), JSON.stringify(newCart))
              }}
              onBack={handleCloseCheckout}
              onConfirm={checkoutConfirm}
              onRequireAuth={(mode) => setFlow(mode)}
              onViewProduct={(productId) => {
                setInitialProduct(productId)
                setCheckoutConfirm(null)
              }}
            />
          ) : activeTab === 'market' || activeTab === 'amazon' ? (
            <MarketplaceScreen
              key={viewStore}
              store={viewStore}
              onOpenCheckout={handleOpenCheckout}
              onNavigate={setActiveTab}
              activeNav={activeTab}
              onProfileClick={handleProfileClick}
              initialSelectedProduct={initialProduct}
              onClearInitialProduct={() => setInitialProduct(null)}
              userRole={userRole}
            />
          ) : mainScreens[activeTab])}
        </div>
      </div>
    </div>
    </Suspense>
  )
}
