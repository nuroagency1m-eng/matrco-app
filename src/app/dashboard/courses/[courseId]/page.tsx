'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { PaymentGateway } from '@/components/PaymentGateway'

interface CourseVideo {
  id: string
  title: string
  youtubeUrl: string
  order: number
  unlocked: boolean
  percent: number
  completed: boolean
}

interface Enrollment {
  id: string
  status: 'PENDING' | 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED'
  proofUrl: string | null
  notes: string | null
}

interface Course {
  id: string
  title: string
  description: string
  coverUrl: string | null
  price: number
  freeForPlan: boolean
  videosCount: number
  videos: CourseVideo[]
  locked: boolean
  enrollment: Enrollment | null
}

function getVimeoEmbedUrl(url: string): string {
  const match = url.match(/vimeo\.com\/(\d+)/)
  if (match) return `https://player.vimeo.com/video/${match[1]}?badge=0&autopause=0&player_id=0&app_id=58479&dnt=1`
  return url
}

export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paymentQrUrl, setPaymentQrUrl] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => setPaymentQrUrl(d.settings?.PAYMENT_QR_URL || null)).catch(() => {})
  }, [])

  // Vimeo player refs and tracking
  const iframeRefs = useRef<Record<string, HTMLIFrameElement | null>>({})
  const vimeoPlayers = useRef<Record<string, any>>({})
  const reportedRef = useRef<Set<string>>(new Set())
  const [completedVideos, setCompletedVideos] = useState<Set<string>>(new Set())

  // Payment modal state
  const [showModal, setShowModal] = useState(false)
  const [payTab, setPayTab] = useState<'CRYPTO' | 'MANUAL'>('CRYPTO')

  // Manual proof state
  const [proofUrl, setProofUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const proofInputRef = useRef<HTMLInputElement>(null)

  async function uploadProof(file: File) {
    setUploading(true)
    setSubmitError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.url) setProofUrl(data.url)
      else setSubmitError('Error al subir la imagen. Inténtalo de nuevo.')
    } catch {
      setSubmitError('Error al subir la imagen. Inténtalo de nuevo.')
    } finally {
      setUploading(false)
    }
  }

  async function loadCourse() {
    setLoading(true)
    const res = await fetch(`/api/courses/${courseId}`)
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Error'); setLoading(false); return }
    setCourse(data.course)
    // Sync completed state from server
    const serverCompleted = new Set<string>(
      (data.course.videos as CourseVideo[]).filter(v => v.completed).map(v => v.id)
    )
    setCompletedVideos(serverCompleted)
    setLoading(false)
  }

  useEffect(() => { loadCourse() }, [courseId])

  // Block copy/inspect shortcuts
  useEffect(() => {
    const block = (e: Event) => e.preventDefault()
    const blockKeys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ['c', 'u', 's', 'a', 'p'].includes(e.key.toLowerCase())) e.preventDefault()
    }
    document.addEventListener('contextmenu', block)
    document.addEventListener('keydown', blockKeys)
    return () => {
      document.removeEventListener('contextmenu', block)
      document.removeEventListener('keydown', blockKeys)
    }
  }, [])

  // Load Vimeo SDK and init players when course is approved and loaded
  useEffect(() => {
    if (!course || course.enrollment?.status !== 'APPROVED') return
    if (course.videos.length === 0) return

    function initPlayers() {
      const Vimeo = (window as any).Vimeo
      if (!Vimeo) return

      for (const video of course!.videos) {
        if (!video.unlocked) continue
        const iframe = iframeRefs.current[video.id]
        if (!iframe || vimeoPlayers.current[video.id]) continue

        const player = new Vimeo.Player(iframe)
        vimeoPlayers.current[video.id] = player

        const vid = video // capture for closure
        player.on('timeupdate', (data: { percent: number }) => {
          const pct = Math.round(data.percent * 100)
          if (pct >= 95 && !reportedRef.current.has(vid.id)) {
            reportedRef.current.add(vid.id)
            reportProgress(vid.id, pct)
          }
        })
      }
    }

    if ((window as any).Vimeo) {
      initPlayers()
    } else {
      // Check if script already added
      if (!document.querySelector('script[data-vimeo-sdk]')) {
        const script = document.createElement('script')
        script.src = 'https://player.vimeo.com/api/player.js'
        script.setAttribute('data-vimeo-sdk', '1')
        script.onload = initPlayers
        document.head.appendChild(script)
      } else {
        // Script loading, retry after a moment
        const timer = setTimeout(initPlayers, 1500)
        return () => clearTimeout(timer)
      }
    }
  }, [course])

  async function reportProgress(videoId: string, percent: number) {
    try {
      const res = await fetch(`/api/courses/${courseId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, percent }),
      })
      if (res.ok) {
        setCompletedVideos(prev => new Set(prev).add(videoId))
        // Reload to unlock next video
        await loadCourse()
      }
    } catch {}
  }

  // Manual enroll submit
  async function handleManualEnroll() {
    if (!proofUrl.trim()) { setSubmitError('Sube el comprobante de pago primero'); return }
    setSubmitting(true)
    setSubmitError(null)
    const res = await fetch(`/api/courses/${courseId}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethod: 'MANUAL', proofUrl: proofUrl.trim() }),
    })
    const data = await res.json()
    if (!res.ok) { setSubmitError(data.error ?? 'Error al enviar'); setSubmitting(false); return }
    setShowModal(false)
    setProofUrl('')
    setSubmitting(false)
    loadCourse()
  }

  // Crypto payment submission
  async function handleCryptoPayment(txHash: string): Promise<'approved' | 'pending_verification'> {
    const res = await fetch(`/api/courses/${courseId}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethod: 'CRYPTO', txHash }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error al registrar el pago')
    return data.status === 'APPROVED' ? 'approved' : 'pending_verification'
  }

  // Free plan enroll
  async function handleFreeEnroll() {
    setSubmitting(true)
    setSubmitError(null)
    const res = await fetch(`/api/courses/${courseId}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethod: 'MANUAL', proofUrl: '' }),
    })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) { setSubmitError(data.error ?? 'Error'); return }
    loadCourse()
  }

  function closeModal() {
    setShowModal(false)
    setProofUrl('')
    setSubmitError(null)
    setPayTab('CRYPTO')
  }

  if (loading) {
    return (
      <div className="px-4 sm:px-6 pt-6 max-w-screen-2xl mx-auto min-h-[60vh] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#D203DD', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="px-4 sm:px-6 pt-6 max-w-screen-2xl mx-auto">
        <Link href="/dashboard/courses" style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>← Volver a cursos</Link>
        <p className="text-red-400 text-sm mt-4">{error ?? 'Curso no encontrado'}</p>
      </div>
    )
  }

  const { enrollment } = course
  const isApproved = enrollment?.status === 'APPROVED'
  const isPending = enrollment?.status === 'PENDING'
  const isPendingVerification = enrollment?.status === 'PENDING_VERIFICATION'
  const isRejected = enrollment?.status === 'REJECTED'
  const isLocked = course.locked

  return (
    <div className="px-4 sm:px-6 pt-6 pb-12 max-w-7xl mx-auto"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
      <Link href="/dashboard/courses" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.4)', textDecoration: 'none', marginBottom: 20 }}>
        ← Volver a cursos
      </Link>

      {course.coverUrl && !isApproved && (
        <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 24, maxHeight: 300 }}>
          <img src={course.coverUrl} alt={course.title} style={{ width: '100%', objectFit: 'cover' }} />
        </div>
      )}

      {/* Title & price */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 8 }}>{course.title}</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: 16 }}>{course.description}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 24, fontWeight: 900, color: course.freeForPlan ? '#00FF88' : '#F5A623' }}>
            {course.freeForPlan ? 'GRATIS' : `${course.price.toFixed(2)} USDT`}
          </span>
          {course.freeForPlan && (
            <span style={{ fontSize: 11, fontWeight: 600, color: '#00FF88', background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.2)', padding: '3px 8px', borderRadius: 6 }}>
              Incluido en tu plan
            </span>
          )}
          {!course.freeForPlan && (
            <span style={{ fontSize: 11, fontWeight: 600, color: '#F5A623', background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.2)', padding: '3px 8px', borderRadius: 6 }}>
              BEP-20 · BSC
            </span>
          )}
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>{course.videosCount} video{course.videosCount !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Locked — no plan */}
      {isLocked && (
        <div style={{ padding: '16px 18px', borderRadius: 14, marginBottom: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
          <p style={{ fontSize: 22, marginBottom: 8 }}>🔒</p>
          <p style={{ fontSize: 14, color: '#fff', fontWeight: 700, marginBottom: 6 }}>Curso no disponible</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 14 }}>Necesitas un plan activo para acceder a los cursos.</p>
          <Link href="/dashboard/planes" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, background: 'linear-gradient(135deg, #D203DD 0%, #00FF88 100%)', color: '#000', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
            Ver planes
          </Link>
        </div>
      )}

      {/* Status banners */}
      {!isLocked && isPending && (
        <div style={{ padding: '12px 16px', borderRadius: 12, marginBottom: 20, background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)' }}>
          <p style={{ fontSize: 13, color: '#f97316', fontWeight: 600 }}>⏳ Comprobante en revisión</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Tu comprobante está siendo verificado. Recibirás acceso una vez aprobado.</p>
        </div>
      )}

      {!isLocked && isPendingVerification && (
        <div style={{ padding: '12px 16px', borderRadius: 12, marginBottom: 20, background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.25)' }}>
          <p style={{ fontSize: 13, color: '#F5A623', fontWeight: 600 }}>⛓️ Verificando en blockchain...</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Tu transacción fue enviada. Estamos confirmando los bloques en la red BSC. Se activará en minutos.</p>
        </div>
      )}

      {!isLocked && isRejected && (
        <div style={{ padding: '12px 16px', borderRadius: 12, marginBottom: 20, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <p style={{ fontSize: 13, color: '#ef4444', fontWeight: 600 }}>✕ Solicitud rechazada</p>
          {enrollment.notes && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{enrollment.notes}</p>}
          <button onClick={() => setShowModal(true)} style={{ marginTop: 8, fontSize: 12, color: '#D203DD', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
            Volver a intentar
          </button>
        </div>
      )}

      {/* CTA buttons */}
      {!isLocked && !enrollment && (
        course.freeForPlan ? (
          <button
            onClick={handleFreeEnroll}
            disabled={submitting}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 12, fontWeight: 700, fontSize: 14, background: submitting ? 'rgba(0,255,136,0.3)' : 'linear-gradient(135deg, #00FF88 0%, #D203DD 100%)', color: '#000', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', marginBottom: 28 }}
          >
            {submitting ? 'Activando...' : '✓ Acceder gratis con mi plan'}
          </button>
        ) : (
          <button
            onClick={() => setShowModal(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 12, fontWeight: 700, fontSize: 14, background: 'linear-gradient(135deg, #F5A623 0%, #f97316 100%)', color: '#000', border: 'none', cursor: 'pointer', marginBottom: 28 }}
          >
            ₮ Comprar con USDT — {course.price.toFixed(2)} USDT
          </button>
        )
      )}
      {submitError && !showModal && <p style={{ fontSize: 12, color: '#ef4444', marginBottom: 16 }}>{submitError}</p>}

      {/* Videos */}
      {isApproved && course.videos.length > 0 && (
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 16, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Contenido del curso
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {course.videos.map((video, idx) => {
              const isUnlocked = video.unlocked
              const isDone = completedVideos.has(video.id) || video.completed

              return (
                <div key={video.id} style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${isUnlocked ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)'}`, opacity: isUnlocked ? 1 : 0.6 }}>
                  {/* Video header */}
                  <div style={{ background: isUnlocked ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.2)', padding: '10px 14px', borderBottom: `1px solid ${isUnlocked ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: isUnlocked ? '#fff' : 'rgba(255,255,255,0.4)', margin: 0 }}>
                      <span style={{ color: 'rgba(255,255,255,0.3)', marginRight: 6 }}>{idx + 1}.</span>
                      {video.title}
                    </p>
                    {isDone && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#00FF88', background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.2)', padding: '2px 8px', borderRadius: 6, whiteSpace: 'nowrap', marginLeft: 8 }}>
                        ✓ Completado
                      </span>
                    )}
                    {!isUnlocked && !isDone && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap', marginLeft: 8 }}>
                        🔒 Bloqueado
                      </span>
                    )}
                  </div>

                  {isUnlocked ? (
                    /* Unlocked: show Vimeo player */
                    <div style={{ position: 'relative', paddingBottom: '56.25%', background: '#000' }}>
                      <iframe
                        ref={el => { iframeRefs.current[video.id] = el }}
                        src={getVimeoEmbedUrl(video.youtubeUrl)}
                        title={video.title}
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                      />
                    </div>
                  ) : (
                    /* Locked: placeholder with message */
                    <div style={{ position: 'relative', paddingBottom: '56.25%', background: 'rgba(0,0,0,0.4)' }}>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                        <span style={{ fontSize: 32 }}>🔒</span>
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', textAlign: 'center', margin: 0, padding: '0 20px', lineHeight: 1.5 }}>
                          {idx === 0
                            ? 'Este video está bloqueado'
                            : `Completa el video ${idx} al 95% para desbloquear`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!isApproved && !isPending && !isPendingVerification && !isRejected && !isLocked && (
        <div style={{ padding: '24px', borderRadius: 14, textAlign: 'center', background: 'rgba(245,166,35,0.03)', border: '1px solid rgba(245,166,35,0.08)' }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Los videos están disponibles después de verificar tu pago.</p>
        </div>
      )}

      {/* Payment modal */}
      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '0 16px' }}
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div style={{ background: '#0d0d15', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 24, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>Comprar curso</h3>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <button
                onClick={() => setPayTab('CRYPTO')}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  background: payTab === 'CRYPTO' ? 'rgba(245,166,35,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${payTab === 'CRYPTO' ? 'rgba(245,166,35,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  color: payTab === 'CRYPTO' ? '#F5A623' : 'rgba(255,255,255,0.4)',
                }}
              >
                ₮ Cripto (USDT)
              </button>
              <button
                onClick={() => setPayTab('MANUAL')}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  background: payTab === 'MANUAL' ? 'rgba(210,3,221,0.1)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${payTab === 'MANUAL' ? 'rgba(210,3,221,0.3)' : 'rgba(255,255,255,0.08)'}`,
                  color: payTab === 'MANUAL' ? '#D203DD' : 'rgba(255,255,255,0.4)',
                }}
              >
                📎 Comprobante
              </button>
            </div>

            {/* CRYPTO tab */}
            {payTab === 'CRYPTO' && (
              <PaymentGateway
                plan={course.title}
                price={course.price}
                onSubmitPayment={handleCryptoPayment}
                onSuccess={() => { closeModal(); loadCourse() }}
                onCancel={closeModal}
              />
            )}

            {/* MANUAL tab */}
            {payTab === 'MANUAL' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, margin: 0 }}>
                  Escanea el QR y transfiere <strong style={{ color: '#D203DD' }}>{course.price.toFixed(2)} USDT</strong>, luego sube la captura del comprobante.
                </p>
                {paymentQrUrl && (
                  <div style={{ textAlign: 'center' }}>
                    <img src={paymentQrUrl} alt="QR de pago" style={{ width: 148, height: 148, borderRadius: 12, margin: '0 auto', display: 'block', border: '2px solid rgba(210,3,221,0.25)', background: '#fff', padding: 4 }} />
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 6 }}>QR de pago USDT</p>
                  </div>
                )}
                <div>
                  <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>Comprobante de pago</label>
                  <input ref={proofInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadProof(f) }} />
                  {proofUrl ? (
                    <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden' }}>
                      <img src={proofUrl} alt="comprobante" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 10 }} />
                      <button onClick={() => setProofUrl('')} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: 6, cursor: 'pointer', padding: '4px 6px', color: '#fff', fontSize: 12 }}>✕</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => proofInputRef.current?.click()}
                      disabled={uploading}
                      style={{ width: '100%', height: 80, borderRadius: 10, border: '1.5px dashed rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.03)', cursor: uploading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}
                    >
                      {uploading ? '⏳ Subiendo...' : '📎 Seleccionar imagen del comprobante'}
                    </button>
                  )}
                </div>
                {submitError && <p style={{ fontSize: 12, color: '#ef4444', margin: 0 }}>{submitError}</p>}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={closeModal} style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 600, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
                    Cancelar
                  </button>
                  <button
                    onClick={handleManualEnroll}
                    disabled={submitting}
                    style={{ flex: 2, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, background: submitting ? 'rgba(210,3,221,0.3)' : 'linear-gradient(135deg, #D203DD 0%, #00FF88 100%)', border: 'none', color: '#000', cursor: submitting ? 'not-allowed' : 'pointer' }}
                  >
                    {submitting ? 'Enviando...' : 'Enviar comprobante'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
