import { useState } from 'react'

interface Props {
  onComplete: () => void
  onLogin: () => void
}

type UserType = 'asociacion' | 'turismo' | 'comprador' | null

const userTypes = [
  {
    id: 'asociacion' as UserType,
    icon: '🌽',
    label: 'Mercados Campesinos',
    desc: 'Produzco o comercializo alimentos como agricultor, asociación o cooperativa',
    color: '#D4870A',
  },
  {
    id: 'turismo' as UserType,
    icon: '🏞️',
    label: 'Turismo Comunitario',
    desc: 'Ofrezco experiencias de turismo rural, ecoturismo o vivencias en el campo',
    color: '#2A5C1A',
  },
  {
    id: 'comprador' as UserType,
    icon: '🛒',
    label: 'Visitante / Comprador',
    desc: 'Quiero comprar productos del campo o reservar experiencias comunitarias',
    color: '#7FB069',
  },
]

const departments = [
  'Antioquia', 'Boyacá', 'Caldas', 'Cauca', 'Cundinamarca',
  'Huila', 'Nariño', 'Putumayo', 'Quindío', 'Risaralda',
  'Santander', 'Tolima', 'Valle del Cauca', 'Otro',
]

const productCategories = [
  { icon: '🌽', label: 'Cultivos' },
  { icon: '☕', label: 'Café' },
  { icon: '🍫', label: 'Cacao' },
  { icon: '🥛', label: 'Lácteos' },
  { icon: '🍯', label: 'Procesados' },
  { icon: '🐓', label: 'Pecuario' },
  { icon: '🌿', label: 'Hierbas' },
  { icon: '🐟', label: 'Pesca' },
]

export default function RegisterScreen({ onComplete, onLogin }: Props) {
  const [step, setStep] = useState(0)
  const [userType, setUserType] = useState<UserType>(null)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    orgName: '',
    department: '',
    municipality: '',
    acceptTerms: false,
  })
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)

  const TOTAL_STEPS = 4

  const setField = (key: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => { const n = { ...prev }; delete n[key]; return n })
  }

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  const validateStep = () => {
    const newErrors: Record<string, string> = {}
    if (step === 1) {
      if (!userType) newErrors.userType = 'Selecciona un tipo de usuario'
    }
    if (step === 2) {
      if (!form.firstName.trim()) newErrors.firstName = 'Ingresa tu nombre'
      if (!form.lastName.trim()) newErrors.lastName = 'Ingresa tu apellido'
      if (!form.phone.trim()) newErrors.phone = 'Ingresa tu número de celular'
      else if (!/^\d{10}$/.test(form.phone.replace(/\s/g, ''))) newErrors.phone = 'Debe tener 10 dígitos'
      if (!form.email.trim()) newErrors.email = 'Ingresa tu correo'
      else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'Correo inválido'
      if (!form.password) newErrors.password = 'Crea una contraseña'
      else if (form.password.length < 6) newErrors.password = 'Mínimo 6 caracteres'
      if (form.password !== form.confirmPassword) newErrors.confirmPassword = 'Las contraseñas no coinciden'
    }
    if (step === 3) {
      if (!form.department) newErrors.department = 'Selecciona tu departamento'
      if (!form.municipality.trim()) newErrors.municipality = 'Ingresa tu municipio'
      if (userType === 'asociacion' && selectedCategories.length === 0) {
        newErrors.categories = 'Selecciona al menos un rubro'
      }
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const next = () => {
    if (validateStep()) setStep((s) => s + 1)
  }

  const back = () => setStep((s) => Math.max(0, s - 1))

  // Step 0: Splash / welcome
  if (step === 0) {
    return (
      <div className="h-full flex flex-col overflow-hidden" style={{ background: '#1C3F10' }}>
        <div
          style={{
            flex: 1,
            background: 'linear-gradient(180deg, #1C3F10 0%, #2A5C1A 60%, #3D7A28 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 32px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative circles */}
          <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(212,135,10,0.12)' }} />
          <div style={{ position: 'absolute', bottom: -40, left: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(127,176,105,0.1)' }} />

          {/* Logo */}
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 28,
              background: 'rgba(255,255,255,0.1)',
              border: '1.5px solid rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 52,
              marginBottom: 24,
              backdropFilter: 'blur(8px)',
            }}
          >
            🌿
          </div>

          <h1
            style={{
              fontFamily: 'Fraunces, serif',
              fontSize: 36,
              color: '#FAF7EF',
              textAlign: 'center',
              margin: '0 0 8px',
              fontWeight: 700,
              lineHeight: 1.15,
            }}
          >
            Campo<span style={{ color: '#F0A830' }}>Conecta</span>
          </h1>
          <p
            style={{
              fontFamily: 'Nunito, sans-serif',
              fontSize: 15,
              color: '#A8D48A',
              textAlign: 'center',
              margin: '0 0 48px',
              lineHeight: 1.5,
              maxWidth: 260,
            }}
          >
            La plataforma que conecta comunidades productivas con el mercado
          </p>

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              onClick={() => setStep(1)}
              style={{
                width: '100%',
                padding: '15px',
                borderRadius: 16,
                border: 'none',
                background: 'linear-gradient(135deg, #D4870A, #F0A830)',
                color: '#1C3F10',
                fontSize: 16,
                fontWeight: 800,
                fontFamily: 'Nunito, sans-serif',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(212,135,10,0.4)',
              }}
            >
              Crear cuenta gratis
            </button>
            <button
              onClick={onLogin}
              style={{
                width: '100%',
                padding: '15px',
                borderRadius: 16,
                border: '1.5px solid rgba(255,255,255,0.3)',
                background: 'transparent',
                color: '#FAF7EF',
                fontSize: 16,
                fontWeight: 700,
                fontFamily: 'Nunito, sans-serif',
                cursor: 'pointer',
              }}
            >
              Ya tengo cuenta
            </button>
          </div>

          <p
            style={{
              fontFamily: 'Nunito, sans-serif',
              fontSize: 12,
              color: 'rgba(168,212,138,0.7)',
              textAlign: 'center',
              marginTop: 28,
            }}
          >
            +2.400 productores y comunidades ya están conectados
          </p>
        </div>
      </div>
    )
  }

  // Step 4: Success
  if (step === 4) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center"
        style={{ background: '#FAF7EF', padding: '32px 28px', textAlign: 'center' }}
      >
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #2A5C1A, #3D7A28)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 52,
            marginBottom: 24,
            boxShadow: '0 8px 32px rgba(42,92,26,0.3)',
          }}
        >
          ✅
        </div>
        <h2
          style={{
            fontFamily: 'Fraunces, serif',
            fontSize: 28,
            color: '#1C3F10',
            margin: '0 0 10px',
            fontWeight: 700,
          }}
        >
          ¡Bienvenido a CampoConecta!
        </h2>
        <p
          style={{
            fontFamily: 'Nunito, sans-serif',
            fontSize: 15,
            color: '#6B4C2A',
            lineHeight: 1.6,
            margin: '0 0 32px',
            maxWidth: 280,
          }}
        >
          Tu cuenta fue creada exitosamente. Ahora haces parte de nuestra comunidad productiva.
        </p>

        <div
          style={{
            background: '#fff',
            borderRadius: 20,
            padding: '18px 20px',
            width: '100%',
            border: '1px solid #E8E0CF',
            marginBottom: 32,
            textAlign: 'left',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: '#2A5C1A', fontFamily: 'Fraunces, serif', marginBottom: 12 }}>
            Resumen de tu perfil
          </div>
          {[
            { label: 'Nombre', val: `${form.firstName} ${form.lastName}` },
            { label: 'Categoría', val: userTypes.find((u) => u.id === userType)?.label || '' },
            { label: 'Ubicación', val: `${form.municipality}, ${form.department}` },
            { label: 'Rubros', val: selectedCategories.join(', ') || 'Ninguno seleccionado' },
          ].map((row) => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, marginBottom: 8, borderBottom: '1px solid #F0EBE0' }}>
              <span style={{ fontSize: 12, color: '#8A8070', fontFamily: 'Nunito, sans-serif' }}>{row.label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#1C3F10', fontFamily: 'Nunito, sans-serif', maxWidth: 180, textAlign: 'right' }}>{row.val}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onComplete}
          style={{
            width: '100%',
            padding: '15px',
            borderRadius: 16,
            border: 'none',
            background: 'linear-gradient(135deg, #2A5C1A, #3D7A28)',
            color: '#FAF7EF',
            fontSize: 16,
            fontWeight: 800,
            fontFamily: 'Nunito, sans-serif',
            cursor: 'pointer',
            boxShadow: '0 6px 20px rgba(42,92,26,0.3)',
          }}
        >
          Ir a la app →
        </button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col" style={{ background: '#FAF7EF' }}>
      {/* Header with progress */}
      <div style={{ background: '#2A5C1A', padding: '16px 20px 20px' }}>
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={back}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: 'none',
              background: 'rgba(255,255,255,0.15)',
              color: '#FAF7EF',
              fontSize: 18,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            ←
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: '#A8D48A', fontFamily: 'Nunito, sans-serif', fontWeight: 700 }}>
                {step === 1 && 'Tipo de usuario'}
                {step === 2 && 'Información personal'}
                {step === 3 && 'Ubicación y rubros'}
              </span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: 'Nunito, sans-serif' }}>
                {step} / {TOTAL_STEPS - 1}
              </span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  borderRadius: 2,
                  background: 'linear-gradient(90deg, #F0A830, #D4870A)',
                  width: `${((step) / (TOTAL_STEPS - 1)) * 100}%`,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        </div>
        <h2
          style={{
            fontFamily: 'Fraunces, serif',
            fontSize: 22,
            color: '#FAF7EF',
            margin: 0,
            fontWeight: 700,
          }}
        >
          {step === 1 && '¿En qué categoría participas?'}
          {step === 2 && 'Cuéntanos sobre ti'}
          {step === 3 && 'Tu ubicación y actividad'}
        </h2>
      </div>

      {/* Step content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 0' }}>

        {/* STEP 1: User type */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {errors.userType && (
              <div style={{ background: '#FEE9E1', borderRadius: 10, padding: '10px 14px', color: '#C4622D', fontSize: 13, fontFamily: 'Nunito, sans-serif', fontWeight: 600 }}>
                ⚠️ {errors.userType}
              </div>
            )}
            {userTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setUserType(type.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '16px',
                  borderRadius: 18,
                  border: userType === type.id ? `2px solid ${type.color}` : '1.5px solid #E8E0CF',
                  background: userType === type.id ? type.color + '10' : '#fff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    background: type.color + '18',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 26,
                    flexShrink: 0,
                  }}
                >
                  {type.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: userType === type.id ? type.color : '#1C3F10',
                      fontFamily: 'Fraunces, serif',
                      marginBottom: 3,
                    }}
                  >
                    {type.label}
                  </div>
                  <div style={{ fontSize: 12, color: '#8A8070', fontFamily: 'Nunito, sans-serif', lineHeight: 1.4 }}>
                    {type.desc}
                  </div>
                </div>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    border: userType === type.id ? `none` : '1.5px solid #E8E0CF',
                    background: userType === type.id ? type.color : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {userType === type.id && <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>✓</span>}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* STEP 2: Personal info */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Nombre *" error={errors.firstName}>
                <input
                  placeholder="María"
                  value={form.firstName}
                  onChange={(e) => setField('firstName', e.target.value)}
                  style={inputStyle(!!errors.firstName)}
                />
              </Field>
              <Field label="Apellido *" error={errors.lastName}>
                <input
                  placeholder="Ospina"
                  value={form.lastName}
                  onChange={(e) => setField('lastName', e.target.value)}
                  style={inputStyle(!!errors.lastName)}
                />
              </Field>
            </div>

            {userType !== 'comprador' && (
              <Field label="Nombre de la organización">
                <input
                  placeholder={userType === 'turismo' ? 'Nombre de tu finca o emprendimiento' : 'Cooperativa / Asociación / Empresa'}
                  value={form.orgName}
                  onChange={(e) => setField('orgName', e.target.value)}
                  style={inputStyle(false)}
                />
              </Field>
            )}

            <Field label="Celular *" error={errors.phone}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: `1.5px solid ${errors.phone ? '#C4622D' : '#E8E0CF'}`, borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
                <div style={{ padding: '12px 12px', background: '#F5F2EA', borderRight: '1px solid #E8E0CF', fontSize: 13, fontFamily: 'Nunito, sans-serif', color: '#3D2B1A', fontWeight: 600, flexShrink: 0 }}>
                  🇨🇴 +57
                </div>
                <input
                  placeholder="300 123 4567"
                  value={form.phone}
                  onChange={(e) => setField('phone', e.target.value)}
                  type="tel"
                  style={{ flex: 1, border: 'none', outline: 'none', padding: '12px', fontSize: 14, fontFamily: 'Nunito, sans-serif', color: '#1C3F10', background: 'transparent' }}
                />
              </div>
            </Field>

            <Field label="Correo electrónico *" error={errors.email}>
              <input
                placeholder="correo@ejemplo.com"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                type="email"
                style={inputStyle(!!errors.email)}
              />
            </Field>

            <Field label="Contraseña *" error={errors.password}>
              <div style={{ position: 'relative' }}>
                <input
                  placeholder="Mínimo 6 caracteres"
                  value={form.password}
                  onChange={(e) => setField('password', e.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  style={{ ...inputStyle(!!errors.password), paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </Field>

            <Field label="Confirmar contraseña *" error={errors.confirmPassword}>
              <input
                placeholder="Repite tu contraseña"
                value={form.confirmPassword}
                onChange={(e) => setField('confirmPassword', e.target.value)}
                type="password"
                style={inputStyle(!!errors.confirmPassword)}
              />
            </Field>

            {/* Password strength */}
            {form.password.length > 0 && (
              <div>
                <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: 4,
                        borderRadius: 2,
                        background: getStrengthColor(form.password, i),
                      }}
                    />
                  ))}
                </div>
                <p style={{ fontSize: 11, color: '#8A8070', fontFamily: 'Nunito, sans-serif', margin: 0 }}>
                  Seguridad: <strong>{getStrengthLabel(form.password)}</strong>
                </p>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Location & categories */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Departamento *" error={errors.department}>
              <select
                value={form.department}
                onChange={(e) => setField('department', e.target.value)}
                style={{ ...inputStyle(!!errors.department), appearance: 'none', cursor: 'pointer' }}
              >
                <option value="">Selecciona tu departamento</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </Field>

            <Field label="Municipio *" error={errors.municipality}>
              <input
                placeholder="Ej: Salento, Pitalito, Popayán..."
                value={form.municipality}
                onChange={(e) => setField('municipality', e.target.value)}
                style={inputStyle(!!errors.municipality)}
              />
            </Field>

            {userType === 'asociacion' && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1C3F10', fontFamily: 'Nunito, sans-serif', marginBottom: 4 }}>
                  Productos que comercializas *
                </div>
                <div style={{ fontSize: 12, color: '#8A8070', fontFamily: 'Nunito, sans-serif', marginBottom: 10 }}>
                  Selecciona los rubros de tu Mercado Campesino
                </div>
                {errors.categories && (
                  <div style={{ background: '#FEE9E1', borderRadius: 10, padding: '8px 12px', color: '#C4622D', fontSize: 12, fontFamily: 'Nunito, sans-serif', fontWeight: 600, marginBottom: 10 }}>
                    ⚠️ {errors.categories}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {productCategories.map((cat) => {
                    const active = selectedCategories.includes(cat.label)
                    return (
                      <button
                        key={cat.label}
                        onClick={() => toggleCategory(cat.label)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '12px 14px',
                          borderRadius: 14,
                          border: active ? '2px solid #2A5C1A' : '1.5px solid #E8E0CF',
                          background: active ? '#2A5C1A10' : '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ fontSize: 20 }}>{cat.icon}</span>
                        <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? '#2A5C1A' : '#3D2B1A', fontFamily: 'Nunito, sans-serif' }}>
                          {cat.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Terms */}
            <button
              onClick={() => setField('acceptTerms', !form.acceptTerms)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 0',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  border: form.acceptTerms ? 'none' : '1.5px solid #E8E0CF',
                  background: form.acceptTerms ? '#2A5C1A' : '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                {form.acceptTerms && <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>✓</span>}
              </div>
              <span style={{ fontSize: 13, color: '#3D2B1A', fontFamily: 'Nunito, sans-serif', lineHeight: 1.5 }}>
                Acepto los{' '}
                <span style={{ color: '#2A5C1A', fontWeight: 700 }}>Términos y Condiciones</span>
                {' '}y la{' '}
                <span style={{ color: '#2A5C1A', fontWeight: 700 }}>Política de Privacidad</span>
                {' '}de CampoConecta
              </span>
            </button>
          </div>
        )}

        <div style={{ height: 20 }} />
      </div>

      {/* CTA button */}
      <div style={{ padding: '12px 20px 20px', background: '#FAF7EF', borderTop: '1px solid #E8E0CF' }}>
        {step === 3 && !form.acceptTerms ? (
          <button
            disabled
            style={{
              width: '100%',
              padding: '15px',
              borderRadius: 16,
              border: 'none',
              background: '#E8E0CF',
              color: '#8A8070',
              fontSize: 16,
              fontWeight: 700,
              fontFamily: 'Nunito, sans-serif',
              cursor: 'not-allowed',
            }}
          >
            Acepta los términos para continuar
          </button>
        ) : (
          <button
            onClick={step === 3 ? () => { if (validateStep()) setStep(4) } : next}
            style={{
              width: '100%',
              padding: '15px',
              borderRadius: 16,
              border: 'none',
              background: 'linear-gradient(135deg, #2A5C1A, #3D7A28)',
              color: '#FAF7EF',
              fontSize: 16,
              fontWeight: 800,
              fontFamily: 'Nunito, sans-serif',
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(42,92,26,0.3)',
            }}
          >
            {step === 3 ? 'Crear mi cuenta →' : 'Continuar →'}
          </button>
        )}
        {step === 1 && (
          <p style={{ textAlign: 'center', margin: '12px 0 0', fontSize: 13, color: '#8A8070', fontFamily: 'Nunito, sans-serif' }}>
            ¿Ya tienes cuenta?{' '}
            <span style={{ color: '#2A5C1A', fontWeight: 700, cursor: 'pointer' }} onClick={onLogin}>
              Inicia sesión
            </span>
          </p>
        )}
      </div>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#1C3F10', fontFamily: 'Nunito, sans-serif', marginBottom: 6 }}>
        {label}
      </div>
      {children}
      {error && (
        <div style={{ fontSize: 12, color: '#C4622D', fontFamily: 'Nunito, sans-serif', marginTop: 4, fontWeight: 600 }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  )
}

function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 12,
    border: `1.5px solid ${hasError ? '#C4622D' : '#E8E0CF'}`,
    background: hasError ? '#FEF9F7' : '#fff',
    fontSize: 14,
    fontFamily: 'Nunito, sans-serif',
    color: '#1C3F10',
    outline: 'none',
    boxSizing: 'border-box',
  }
}

function getStrength(pw: string): number {
  let s = 0
  if (pw.length >= 6) s++
  if (pw.length >= 10) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[0-9!@#$%^&*]/.test(pw)) s++
  return s
}

function getStrengthColor(pw: string, bar: number): string {
  const s = getStrength(pw)
  if (s < bar) return '#E8E0CF'
  if (s <= 1) return '#C4622D'
  if (s <= 2) return '#D4870A'
  if (s <= 3) return '#7FB069'
  return '#2A5C1A'
}

function getStrengthLabel(pw: string): string {
  const s = getStrength(pw)
  if (s <= 1) return 'Débil'
  if (s <= 2) return 'Regular'
  if (s <= 3) return 'Buena'
  return 'Muy segura'
}
