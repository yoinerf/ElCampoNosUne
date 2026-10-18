import { useState, useEffect, useMemo, useRef, lazy, Suspense, type JSX } from 'react'
import HomeScreen from './screens/HomeScreen'
import ScreenShell from './components/ScreenShell'
import type { CartItem } from './lib/catalog'
import { supabase, authRedirectInfo } from './lib/supabase'
import { STORE_NAMES, cartKey, isAmazonPath, type StoreId } from './lib/stores'
import { pathForTab, routeFromPath } from './lib/routes'

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
const StoreAdminScreen = lazy(() => import('./screens/StoreAdminScreen'))
const AboutScreen = lazy(() => import('./screens/AboutScreen'))

function ScreenLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: '#F5EEE6', color: '#205134', fontFamily: "'Nunito Sans', sans-serif", fontSize: 15, fontWeight: 600 }}>
      Cargando...
    </div>
  )
}
import logoImg from './assets/logo-nofond.png'

import type { Tab, UserRole } from './lib/types'
import { useAuth } from './lib/auth'

type AppFlow = 'auth' | 'login' | 'app'

// Pantalla y tienda de la URL con la que se abrió la app
const initialRoute = routeFromPath(window.location.pathname)

const getVisibleTabs = (role?: UserRole, store: StoreId = 'campo'): Tab[] => {
  switch (role) {
    case 'admin':
      return ['superadmin', 'home', 'market', 'tourism', 'amazon', 'profile', 'about']
    case 'asociacion':
      // El productor solo ve la tienda a la que pertenece (el amazónico no ve páginas de El Campo Nos Une)
      return store === 'amazonica' ? ['admin', 'amazon'] : ['admin', 'market', 'about']
    case 'turismo':
      return ['admin', 'tourism', 'about']
    case 'admin_tienda':
      // Solo su panel: productores y revisión de perfiles de su tienda
      return ['storeadmin']
    case 'comprador':
    default:
      return ['home', 'market', 'tourism', 'amazon', 'profile', 'about']
  }
}

export default function App() {
  const [flow, setFlow] = useState<AppFlow>('app')
  const [activeTab, setActiveTab] = useState<Tab>(initialRoute.tab)
  // Redirecciones automáticas (rol, permisos, URL inicial) reemplazan la entrada del
  // historial en vez de agregar una: así el botón atrás no vuelve a una ruta que redirige.
  // Guarda la pestaña destino de la redirección ('initial' = normalizar la URL de entrada).
  const redirectTarget = useRef<Tab | 'initial' | null>('initial')
  const redirectTo = (tab: Tab) => {
    redirectTarget.current = tab
    setActiveTab(tab)
  }
  // Sesión y perfil (rol y tienda del usuario) los carga AuthProvider
  const { session, role: userRole, store: userStore, storeId: userStoreId, loading: checkingSession, profileLoadId } = useAuth()
  // Tienda desde la que el comprador abrió su panel (para mantener la marca)
  const [panelStore, setPanelStore] = useState<StoreId>(initialRoute.store)
  const [checkoutItems, setCheckoutItems] = useState<CartItem[]>([])
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [initialProduct, setInitialProduct] = useState<string | null>(null)
  // recovery: llegó desde el enlace del correo · forced: entró con contraseña temporal del admin
  const [passwordMode, setPasswordMode] = useState<'recovery' | 'forced' | null>(authRedirectInfo.isRecovery ? 'recovery' : null)

  // Eventos de autenticación que solo afectan la interfaz (los datos los maneja AuthProvider)
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') return
      if (event === 'PASSWORD_RECOVERY') setPasswordMode('recovery')
      if (event === 'SIGNED_OUT') setPasswordMode(null)
      setFlow('app')
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  // Sesión inicial: enlace de recuperación vencido o inválido → mostrar el login con el aviso
  useEffect(() => {
    if (!checkingSession && !session && authRedirectInfo.error) setFlow('login')
    // Solo al terminar la carga inicial
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkingSession])

  // Contraseña temporal asignada por el admin: obligar a cambiarla
  const mustChangePassword = !!session?.user.user_metadata?.must_change_password
  useEffect(() => {
    if (mustChangePassword) setPasswordMode((prev) => prev ?? 'forced')
  }, [mustChangePassword])

  // Cada vez que se carga un perfil, llevar al usuario a la pestaña de su rol
  useEffect(() => {
    if (profileLoadId === 0) return
    // Primera carga: si la URL apunta a una pantalla permitida para el rol (y no es el
    // inicio genérico), se respeta el enlace directo
    if (profileLoadId === 1 && initialRoute.tab !== 'home' && getVisibleTabs(userRole, userStore).includes(initialRoute.tab)) {
      return
    }
    const prev = activeTab
    let next = prev
    if (userRole === 'admin') {
      next = prev === 'market' || prev === 'tourism' || prev === 'profile' || prev === 'amazon' ? prev : 'superadmin'
    } else if (userRole === 'admin_tienda') {
      next = 'storeadmin'
    } else if (userRole === 'asociacion' || userRole === 'turismo') {
      if (userRole === 'asociacion' && userStore === 'campo' && prev === 'market') next = 'market'
      else if (userRole === 'asociacion' && userStore === 'amazonica' && prev === 'amazon') next = 'amazon'
      else if (userRole === 'turismo' && prev === 'tourism') next = 'tourism'
      else next = 'admin'
    }
    if (next !== prev) redirectTo(next)
    // Solo cuando termina una carga de perfil, no en cada cambio de rol/tienda intermedio
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileLoadId])

  const visibleTabs = useMemo(() => getVisibleTabs(userRole, userStore), [userRole, userStore])

  // Tienda que se está viendo: define la marca de login, registro, checkout y paneles.
  // Dentro de la Tienda Amazónica no se muestra nada de El Campo Nos Une.
  const viewStore: StoreId =
    activeTab === 'amazon'
    || ((activeTab === 'admin' || activeTab === 'storeadmin') && userStore === 'amazonica')
    || (activeTab === 'profile' && panelStore === 'amazonica')
      ? 'amazonica'
      : 'campo'

  useEffect(() => {
    if (!checkingSession) document.title = STORE_NAMES[viewStore]
  }, [viewStore, checkingSession])

  // La pestaña actual queda en la URL (ver lib/routes)
  useEffect(() => {
    if (checkingSession || flow !== 'app') return
    const path = pathForTab(activeTab, viewStore)
    const target = redirectTarget.current
    // Si hay una redirección hacia otra pestaña aún no aplicada, se conserva para cuando llegue
    const replace = target === 'initial' || target === activeTab
    if (replace) redirectTarget.current = null
    if (path === window.location.pathname) return
    const url = path + window.location.search + window.location.hash
    if (replace) window.history.replaceState(window.history.state, '', url)
    else window.history.pushState({ tab: activeTab }, '', url)
  }, [activeTab, viewStore, checkingSession, flow])

  useEffect(() => {
    // Mientras carga la sesión aún no se sabe el rol: no redirigir los enlaces directos
    if (flow !== 'app' || checkingSession) return
    if (!visibleTabs.includes(activeTab)) redirectTo(visibleTabs[0] ?? 'home')
  }, [flow, visibleTabs, activeTab, checkingSession])

  /** Verifica si el usuario está autenticado antes de mostrar el perfil */
  const handleProfileClick = () => {
    if (!session) {
      setFlow('login')
    } else if (userRole === 'admin_tienda') {
      setActiveTab('storeadmin')
    } else {
      if (activeTab !== 'profile') setPanelStore(viewStore)
      setActiveTab('profile')
    }
  }

  const returnToStore = () => {
    setFlow('app')
    if (userRole === 'admin_tienda') {
      setActiveTab('storeadmin')
    } else if (viewStore === 'amazonica' || (userRole === 'asociacion' && userStore === 'amazonica')) {
      setActiveTab('amazon')
    } else if (userRole === 'turismo') {
      setActiveTab('tourism')
    } else {
      setActiveTab('market')
    }
  }

  const goToProduct = (productId: string) => {
  setInitialProduct(productId)
  setActiveTab('market')
}

  const returnToHome = () => {
    setFlow('app')
    if (userRole === 'admin_tienda') {
      setActiveTab('storeadmin')
    } else if (viewStore === 'amazonica' && userRole !== 'admin' && userRole !== 'turismo') {
      setActiveTab(userRole === 'asociacion' ? 'admin' : 'amazon')
    } else if (userRole === 'admin') {
      setActiveTab('superadmin')
    } else if (userRole === 'asociacion' || userRole === 'turismo') {
      setActiveTab('admin')
    } else {
      setActiveTab('home')
    }
  }

  const handleOpenCheckout = (products: CartItem[]) => {
    window.history.pushState({ modal: 'checkout' }, '', window.location.href)
    setCheckoutItems(products)
    setCheckoutOpen(true)
  }

  const handleCloseCheckout = () => {
    // Solo se vuelve atrás en el historial: el listener de popstate cierra el checkout
    window.history.back()
  }

  useEffect(() => {
    const handlePopState = () => {
      // Atrás/adelante del navegador: primero cierra lo que esté abierto encima
      if (checkoutOpen) {
        setCheckoutOpen(false)
        return
      }
      if (flow !== 'app') setFlow('app')
      // Si no, vuelve a la pestaña de la URL
      const route = routeFromPath(window.location.pathname)
      if (route.tab === 'profile') setPanelStore(route.store)
      setActiveTab(route.tab)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [checkoutOpen, flow])

  const mainScreens: Record<Tab, JSX.Element> = {
    home: (
      <HomeScreen onNavigate={setActiveTab} activeNav={activeTab} onProfileClick={handleProfileClick} userRole={userRole} onSelectProduct={goToProduct} />
    ),


    admin: (
      <AdminPanelScreen onNavigate={setActiveTab} activeNav={activeTab} onProfileClick={handleProfileClick} userRole={userRole} store={userStore} />
    ),
    storeadmin: (
      <StoreAdminScreen onNavigate={setActiveTab} activeNav={activeTab} onProfileClick={handleProfileClick} userRole={userRole} store={userStoreId} />
    ),
    superadmin: (
      <SuperAdminScreen onNavigate={setActiveTab} activeNav={activeTab} onProfileClick={handleProfileClick} userRole={userRole} />
    ),
    market: (
      <MarketplaceScreen
        onNavigate={setActiveTab}
        activeNav={activeTab}
        onProfileClick={handleProfileClick}
        userRole={userRole}
        onOpenCheckout={handleOpenCheckout}
      />
    ),
    amazon: (
      <MarketplaceScreen
        key="amazonica"
        store="amazonica"
        onNavigate={setActiveTab}
        activeNav={activeTab}
        onProfileClick={handleProfileClick}
        userRole={userRole}
        onOpenCheckout={handleOpenCheckout}
      />
    ),
    tourism: <TourismScreen onRequireAuth={(mode) => setFlow(mode)} onNavigate={setActiveTab} activeNav={activeTab} onProfileClick={handleProfileClick} userRole={userRole} />,
    // El comprador tiene su propio panel (pedidos, pagos, reseñas, favoritos, solicitudes, datos)
    profile: userRole === 'comprador' ? (
      <BuyerPanelScreen
        userRole={userRole}
        onNavigate={setActiveTab}
        activeNav={activeTab}
        onProfileClick={handleProfileClick}
        store={panelStore}
        onViewProduct={(productId, store) => {
          setInitialProduct(productId)
          setActiveTab(store === 'amazonica' ? 'amazon' : 'market')
        }}
      />
    ) : (
      <ProfileScreen userRole={userRole} onNavigate={setActiveTab} activeNav={activeTab} onProfileClick={handleProfileClick} />
    ),
    about: (
      <AboutScreen onNavigate={setActiveTab} activeNav={activeTab} onProfileClick={handleProfileClick} userRole={userRole} />
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
                onLogin={() => setFlow('app')}
                onRegister={() => setFlow('auth')}
                onBackToStore={returnToStore}
                onBackToHome={returnToHome}
              />
            </div>
          )}
          {flow === 'app' && (checkoutOpen ? (
            // El carrito conserva el header: navegar desde él cierra el checkout
            <ScreenShell
              store={viewStore}
              activeNav={activeTab}
              userRole={userRole}
              onNavigate={(t) => {
                setCheckoutOpen(false)
                setActiveTab(t as Tab)
              }}
              onProfileClick={() => {
                setCheckoutOpen(false)
                handleProfileClick()
              }}
              cartCount={checkoutItems.reduce((sum, item) => sum + item.quantity, 0)}
              contentStyle={{ padding: 0 }}
            >
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
              onRequireAuth={(mode) => setFlow(mode)}
              onViewProduct={(productId) => {
                setInitialProduct(productId)
                setCheckoutOpen(false)
              }}
            />
            </ScreenShell>
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
