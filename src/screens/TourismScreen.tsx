import { useState, useEffect } from 'react'
import ScreenShell from '../components/ScreenShell'
import PaymentModal from '../components/PaymentModal'
import { supabase } from '../lib/supabase'

const tagColors: Record<string, string> = {
  Naturaleza: '#3D7A28',
  Gastronomía: '#C4622D',
  Cultura: '#6B4C2A',
  Senderismo: '#2A5C1A',
  Comunidad: '#D4870A',
  Alojamiento: '#7FB069',
}

interface Experience {
  id: string
  title: string
  host: string
  duration: string
  price: number
  rating: number
  reviews: number
  capacity: string
  img: string
  tags: string[]
  featured: boolean
}

export default function TourismScreen() {
  const [selected, setSelected] = useState<string | null>(null)
  const [saved, setSaved] = useState<string[]>([])
  const [experiences, setExperiences] = useState<Experience[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [reservingExperienceId, setReservingExperienceId] = useState<string | null>(null)
  const [submitMessage, setSubmitMessage] = useState('')
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [pendingReservation, setPendingReservation] = useState<Experience | null>(null)
  const [userRole, setUserRole] = useState<'asociacion' | 'turismo' | 'comprador' | null>(null)
  const [form, setForm] = useState({
    title: '',
    host: '',
    duration: '2 horas',
    price: '',
    capacity: '10 personas',
    img: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&h=700&fit=crop&auto=format',
    tags: 'Naturaleza, Comunidad',
    featured: true,
  })

  const loadExperiences = async () => {
    const { data } = await supabase.from('experiences').select('*').order('created_at', { ascending: false })
    if (data) setExperiences(data as Experience[])
    setLoading(false)
  }

  useEffect(() => {
    loadExperiences()

    const loadRole = async () => {
      const { data: userData } = await supabase.auth.getUser()
      const user = userData.user
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single()

      setUserRole((data?.user_type as 'asociacion' | 'turismo' | 'comprador' | null) ?? null)
    }

    loadRole()
  }, [])

  const canCreateExperience = userRole === 'turismo'

  const recordActivity = async ({
    userId,
    userRoleValue,
    type,
    title,
    description,
    entityType,
    entityId,
    metadata,
  }: {
    userId: string
    userRoleValue: 'asociacion' | 'turismo' | 'comprador'
    type: string
    title: string
    description: string
    entityType?: string
    entityId?: string | null
    metadata?: Record<string, unknown>
  }) => {
    try {
      const { error } = await supabase.from('activities').insert([
        {
          user_id: userId,
          user_role: userRoleValue,
          type,
          title,
          description,
          entity_type: entityType ?? null,
          entity_id: entityId ?? null,
          metadata: metadata ?? {},
        },
      ])

      if (error) {
        console.error('Error insertando en activities:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Excepción insertando en activities:', error)
      return false
    }
  }

  const toggleSave = (id: string) => {
    setSaved((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const formatPrice = (n: number) => `$${n.toLocaleString('es-CO')}`

  const openReserveModal = (exp: Experience) => {
    setPendingReservation(exp)
    setPaymentModalOpen(true)
  }

  const handleReserveExperience = async (exp: Experience) => {
    if (reservingExperienceId === exp.id) return false

    setReservingExperienceId(exp.id)
    setSubmitMessage('')

    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user

    if (!user) {
      setSubmitMessage('Debes iniciar sesión para reservar una experiencia')
      setReservingExperienceId(null)
      return false
    }

    const { error } = await supabase.from('reservations').insert([
      {
        user_id: user.id,
        experience_id: exp.id,
        quantity: 1,
        status: 'pendiente',
      },
    ])

    if (error) {
      setSubmitMessage(error.message)
      setReservingExperienceId(null)
      return false
    }

    const activitySaved = await recordActivity({
      userId: user.id,
      userRoleValue: 'comprador',
      type: 'reservation',
      title: 'Reserva creada',
      description: `Reservaste ${exp.title}`,
      entityType: 'experiences',
      entityId: exp.id,
      metadata: { experience_title: exp.title, price: exp.price },
    })

    const confirmationMessage = activitySaved
      ? `Reserva creada para ${exp.title}`
      : `Reserva creada para ${exp.title}, pero no se pudo registrar la actividad.`

    setSubmitMessage(confirmationMessage)
    setReservingExperienceId(null)
    setSelected(null)
    return activitySaved
  }

  const handleCreateExperience = async () => {
    if (!canCreateExperience) {
      setSubmitMessage('Tu perfil no permite registrar experiencias')
      return
    }

    if (!form.title.trim() || !form.price) {
      setSubmitMessage('Completa el nombre y el precio de la experiencia')
      return
    }

    setSaving(true)
    setSubmitMessage('')

    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user

    if (!user) {
      setSubmitMessage('Debes iniciar sesión para registrar tu servicio')
      setSaving(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, org_name')
      .eq('id', user.id)
      .single()

    const payload = {
      host_id: user.id,
      title: form.title.trim(),
      host: form.host.trim() || profile?.org_name || `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || 'Comunidad local',
      duration: form.duration || '2 horas',
      price: Number(form.price),
      capacity: form.capacity || '10 personas',
      img: form.img || 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&h=700&fit=crop&auto=format',
      tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      featured: form.featured,
      rating: 5,
      reviews: 0,
    }

    const { data: insertedExperience, error } = await supabase.from('experiences').insert([payload]).select()

    if (error) {
      setSubmitMessage(error.message)
      setSaving(false)
      return
    }

    const activitySaved = await recordActivity({
      userId: user.id,
      userRoleValue: 'turismo',
      type: 'experience_created',
      title: 'Experiencia publicada',
      description: `${payload.title} ya está disponible para reservas`,
      entityType: 'experiences',
      entityId: insertedExperience?.[0]?.id ?? null,
      metadata: { experience_title: payload.title, price: payload.price },
    })

    setForm({
      title: '',
      host: '',
      duration: '2 horas',
      price: '',
      capacity: '10 personas',
      img: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&h=700&fit=crop&auto=format',
      tags: 'Naturaleza, Comunidad',
      featured: true,
    })
    setShowForm(false)
    setSubmitMessage(
      activitySaved
        ? 'Experiencia registrada correctamente'
        : 'Experiencia guardada, pero la actividad no se pudo registrar en el feed.'
    )
    setSaving(false)
    loadExperiences()
  }

  const selectedExperience = selected !== null ? experiences.find((e) => e.id === selected) : null

  return (
    <>
      <PaymentModal
        open={paymentModalOpen}
        title="Reservar experiencia"
        subtitle="Paga con seguridad para confirmar tu visita."
        confirmLabel="Reservar ahora"
        amount={pendingReservation?.price}
        onClose={() => {
          setPaymentModalOpen(false)
          setPendingReservation(null)
        }}
        onConfirm={() => {
          if (pendingReservation) {
            return handleReserveExperience(pendingReservation)
          }
          return Promise.resolve(false)
        }}
      />

      {selectedExperience ? (
        <div className="h-full overflow-y-auto" style={{ background: '#FAF7EF' }}>
          <div style={{ position: 'relative', height: 240 }}>
            <img src={selectedExperience.img} alt={selectedExperience.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(28,63,16,0.7) 0%, transparent 50%)' }} />
            <button
              onClick={() => setSelected(null)}
              style={{
                position: 'absolute',
                top: 16,
                left: 16,
                width: 36,
                height: 36,
                borderRadius: 10,
                border: 'none',
                background: 'rgba(255,255,255,0.85)',
                fontSize: 18,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ←
            </button>
            <div style={{ position: 'absolute', bottom: 16, left: 20, right: 20 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {selectedExperience.tags.map((t) => (
                  <span
                    key={t}
                    style={{
                      background: tagColors[t] || '#2A5C1A',
                      color: '#FAF7EF',
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: 20,
                      fontFamily: 'Nunito, sans-serif',
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div style={{ padding: '20px 20px 100px' }}>
            <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 22, color: '#1C3F10', margin: '0 0 6px', fontWeight: 700, lineHeight: 1.3 }}>
              {selectedExperience.title}
            </h2>
            <p style={{ fontSize: 13, color: '#8A8070', fontFamily: 'Nunito, sans-serif', margin: '0 0 16px' }}>
              📍 {selectedExperience.host}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                { icon: '⏱️', label: 'Duración', val: selectedExperience.duration },
                { icon: '👥', label: 'Capacidad', val: selectedExperience.capacity },
                { icon: '⭐', label: 'Calificación', val: `${selectedExperience.rating} (${selectedExperience.reviews} reseñas)` },
                { icon: '💰', label: 'Precio por persona', val: formatPrice(selectedExperience.price) },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    background: '#fff',
                    borderRadius: 14,
                    padding: '12px',
                    border: '1px solid #E8E0CF',
                  }}
                >
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{item.icon}</div>
                  <div style={{ fontSize: 10, color: '#8A8070', fontFamily: 'Nunito, sans-serif', marginBottom: 2 }}>{item.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1C3F10', fontFamily: 'Nunito, sans-serif' }}>{item.val}</div>
                </div>
              ))}
            </div>

            <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 17, color: '#1C3F10', margin: '0 0 10px', fontWeight: 700 }}>
              Descripción
            </h3>
            <p style={{ fontSize: 14, color: '#3D2B1A', fontFamily: 'Nunito, sans-serif', lineHeight: 1.6, margin: '0 0 20px' }}>
              Vive una experiencia auténtica en el corazón del campo colombiano. Aprende sobre los procesos
              agrícolas de la región, participa en actividades tradicionales con la comunidad local y disfruta
              de la gastronomía típica preparada con ingredientes frescos de la finca.
            </p>

            <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 17, color: '#1C3F10', margin: '0 0 10px', fontWeight: 700 }}>
              ¿Qué incluye?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
              {['Guía local bilingüe', 'Alimentación tradicional', 'Actividades culturales', 'Transporte desde el pueblo'].map((item) => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#2A5C1A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>
                  </div>
                  <span style={{ fontSize: 14, color: '#3D2B1A', fontFamily: 'Nunito, sans-serif' }}>{item}</span>
                </div>
              ))}
            </div>

            {submitMessage && <div style={{ marginBottom: 12, color: '#2A5C1A', fontSize: 12, fontWeight: 700, fontFamily: 'Nunito, sans-serif' }}>{submitMessage}</div>}

            <button
              onClick={() => openReserveModal(selectedExperience)}
              disabled={reservingExperienceId === selectedExperience.id}
              style={{
                width: '100%',
                padding: '15px',
                borderRadius: 16,
                border: 'none',
                background: reservingExperienceId === selectedExperience.id
                  ? '#7FB069'
                  : 'linear-gradient(135deg, #2A5C1A, #3D7A28)',
                color: '#FAF7EF',
                fontSize: 16,
                fontWeight: 700,
                fontFamily: 'Nunito, sans-serif',
                cursor: reservingExperienceId === selectedExperience.id ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 16px rgba(42,92,26,0.35)',
                opacity: reservingExperienceId === selectedExperience.id ? 0.8 : 1,
              }}
            >
              {reservingExperienceId === selectedExperience.id ? 'Reservando...' : `Reservar experiencia — ${formatPrice(selectedExperience.price)}`}
            </button>
          </div>
        </div>
      ) : (
        <ScreenShell
          title="Turismo Comunitario"
          subtitle="Experiencias auténticas con comunidades rurales"
          contentStyle={{ paddingBottom: 20 }}
        >
          <div style={{ position: 'relative', height: 170, flexShrink: 0, marginBottom: 18 }}>
            <div style={{ borderRadius: 24, overflow: 'hidden', height: '100%', boxShadow: '0 10px 25px rgba(42,92,26,0.12)' }}>
              <img
                src="https://images.unsplash.com/photo-1599385108614-86b8fce547ef?w=700&h=320&fit=crop&auto=format"
                alt="Comunidad rural"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to right, rgba(28,63,16,0.65) 0%, transparent 60%)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                borderRadius: 24,
              }}
            >
              <p style={{ color: '#A8D48A', fontSize: 11, fontWeight: 700, fontFamily: 'Nunito, sans-serif', margin: 0 }}>
                MÁS DE 40 EXPERIENCIAS
              </p>
              <h3 style={{ color: '#FAF7EF', fontFamily: 'Fraunces, serif', fontSize: 19, margin: '4px 0 0', fontWeight: 700, lineHeight: 1.3 }}>
                Conecta con el<br />campo colombiano
              </h3>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            <p style={{ fontSize: 13, color: '#8A8070', fontFamily: 'Nunito, sans-serif', margin: '0 0 14px', fontWeight: 600 }}>
              Experiencias disponibles
            </p>

            {loading && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="animate-pulse"
                    style={{
                      background: '#eee5d7',
                      borderRadius: 20,
                      height: 230,
                      border: '1px solid #E8E0CF',
                    }}
                  />
                ))}
              </div>
            )}
            {!loading && experiences.length === 0 && (
              <p style={{ textAlign: 'center', color: '#8A8070', fontFamily: 'Nunito, sans-serif' }}>
                Aún no hay experiencias publicadas.
              </p>
            )}

            {showForm && (
              <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #E8E0CF', padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1C3F10', fontFamily: 'Fraunces, serif', marginBottom: 12 }}>
                  Registrar experiencia
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Título de la experiencia" style={{ border: '1px solid #E8E0CF', borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
                  <input value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} placeholder="Nombre de la finca / comunidad" style={{ border: '1px solid #E8E0CF', borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="Duración" style={{ border: '1px solid #E8E0CF', borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
                    <input value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} placeholder="Capacidad" style={{ border: '1px solid #E8E0CF', borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Precio" type="number" style={{ border: '1px solid #E8E0CF', borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
                    <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="Etiquetas" style={{ border: '1px solid #E8E0CF', borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
                  </div>
                  <input value={form.img} onChange={(e) => setForm({ ...form, img: e.target.value })} placeholder="URL de la imagen" style={{ border: '1px solid #E8E0CF', borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#3D2B1A', fontSize: 14 }}>
                    <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
                    Destacar experiencia
                  </label>
                  {submitMessage && <div style={{ color: '#C4622D', fontSize: 12, fontFamily: 'Nunito, sans-serif', fontWeight: 600 }}>{submitMessage}</div>}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => setShowForm(false)} style={{ flex: 1, background: '#EFE8DD', color: '#3D2B1A', border: 'none', borderRadius: 12, padding: '10px 12px', fontWeight: 700 }}>Cancelar</button>
                    <button onClick={handleCreateExperience} disabled={saving} style={{ flex: 1, background: '#2A5C1A', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 12px', fontWeight: 700, cursor: 'pointer' }}>
                      {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
              {experiences.map((exp) => (
                <div
                  key={exp.id}
                  onClick={() => setSelected(exp.id)}
                  style={{
                    background: '#fff',
                    borderRadius: 20,
                    overflow: 'hidden',
                    border: exp.featured ? '2px solid #D4870A' : '1px solid #E8E0CF',
                    boxShadow: '0 2px 16px rgba(42,92,26,0.07)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ position: 'relative', height: 140 }}>
                    <img src={exp.img} alt={exp.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {exp.featured && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 10,
                          left: 10,
                          background: '#D4870A',
                          color: '#fff',
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: 20,
                          fontFamily: 'Nunito, sans-serif',
                        }}
                      >
                        ⭐ Más popular
                      </div>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSave(exp.id) }}
                      style={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        border: 'none',
                        background: 'rgba(255,255,255,0.9)',
                        fontSize: 16,
                        cursor: 'pointer',
                      }}
                    >
                      {saved.includes(exp.id) ? '❤️' : '🤍'}
                    </button>
                  </div>
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                      {exp.tags.map((t) => (
                        <span
                          key={t}
                          style={{
                            background: (tagColors[t] || '#2A5C1A') + '18',
                            color: tagColors[t] || '#2A5C1A',
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 20,
                            fontFamily: 'Nunito, sans-serif',
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <h4 style={{ fontFamily: 'Fraunces, serif', fontSize: 16, color: '#1C3F10', margin: '0 0 4px', fontWeight: 700, lineHeight: 1.3 }}>
                      {exp.title}
                    </h4>
                    <p style={{ fontSize: 12, color: '#8A8070', fontFamily: 'Nunito, sans-serif', margin: '0 0 10px' }}>
                      📍 {exp.host}
                    </p>
                    <div className="flex items-center justify-between">
                      <div>
                        <span style={{ fontSize: 16, fontWeight: 700, color: '#2A5C1A', fontFamily: 'Fraunces, serif' }}>
                          {formatPrice(exp.price)}
                        </span>
                        <span style={{ fontSize: 11, color: '#8A8070', fontFamily: 'Nunito, sans-serif' }}> /persona</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, color: '#3D2B1A', fontFamily: 'Nunito, sans-serif' }}>
                          ⭐ {exp.rating}
                        </span>
                        <span style={{ fontSize: 11, color: '#8A8070', fontFamily: 'Nunito, sans-serif' }}>
                          ({exp.reviews})
                        </span>
                        <span style={{ fontSize: 11, color: '#8A8070', fontFamily: 'Nunito, sans-serif' }}>
                          · {exp.duration}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {canCreateExperience && (
              <div
                style={{
                  marginTop: 20,
                  borderRadius: 20,
                  background: 'linear-gradient(135deg, #2A5C1A, #3D7A28)',
                  padding: '20px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>🏡</div>
                <h4 style={{ fontFamily: 'Fraunces, serif', fontSize: 17, color: '#FAF7EF', margin: '0 0 6px', fontWeight: 700 }}>
                  ¿Tienes una experiencia para ofrecer?
                </h4>
                <p style={{ fontSize: 13, color: '#A8D48A', fontFamily: 'Nunito, sans-serif', margin: '0 0 14px' }}>
                  Registra tu servicio de turismo comunitario y conecta con viajeros
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  style={{
                    padding: '11px 24px',
                    borderRadius: 12,
                    border: 'none',
                    background: '#D4870A',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 700,
                    fontFamily: 'Nunito, sans-serif',
                    cursor: 'pointer',
                  }}
                >
                  Registrar mi servicio
                </button>
              </div>
            )}
          </div>
        </ScreenShell>
      )}
    </>
  )
}