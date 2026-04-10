'use client'

import { useState, useEffect } from 'react'
import { ShoppingCart, MessageCircle, Layout, ArrowRight, Megaphone, Play, Lock, AlertTriangle, Send, Zap } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type UserPlan = 'NONE' | 'BASIC' | 'PRO' | 'ELITE'

const PLAN_RANK: Record<UserPlan, number> = { NONE: 0, BASIC: 1, PRO: 2, ELITE: 3 }
const PLAN_NAMES: Record<UserPlan, string> = { NONE: 'Sin Plan', BASIC: 'Pack Básico', PRO: 'Pack Pro', ELITE: 'Pack Elite' }

const services = [
  {
    id: 1,
    title: 'Tienda Virtual',
    description: 'Tu propia tienda online lista para vender. Recibe pedidos por WhatsApp sin comisiones.',
    icon: ShoppingCart,
    from: '#D203DD', to: '#0066FF',
    features: ['Catálogo profesional', 'Pedidos por WhatsApp', 'Sin comisiones'],
    link: '/dashboard/services/virtual-store',
    requiredPlan: 'BASIC' as UserPlan,
  },
  {
    id: 2,
    title: 'Agentes AI de Ventas',
    description: 'Tu agente AI vende, responde y fideliza clientes las 24 horas sin levantar un dedo.',
    icon: MessageCircle,
    from: '#00FF88', to: '#00C2FF',
    features: ['Disponible 24/7', 'Respuestas automáticas', 'Cierre de ventas'],
    link: '/dashboard/services/whatsapp',
    requiredPlan: 'BASIC' as UserPlan,
  },
  {
    id: 3,
    title: 'Landing Pages IA',
    description: 'Genera páginas de venta profesionales en segundos con inteligencia artificial.',
    icon: Layout,
    from: '#9B00FF', to: '#FF2DF7',
    features: ['Generación con IA', 'Editor HTML', 'Publicación 1 clic'],
    link: '/dashboard/services/landing-pages',
    requiredPlan: 'BASIC' as UserPlan,
  },
  {
    id: 4,
    title: 'Anuncios con IA',
    description: 'Campañas en Meta, Google y TikTok. Copy, creativos y estrategia generados por IA.',
    icon: Megaphone,
    from: '#FF8800', to: '#FFCC00',
    features: ['Meta · Google · TikTok', 'Creativos con IA', 'Métricas en tiempo real'],
    link: '/dashboard/services/ads',
    requiredPlan: 'BASIC' as UserPlan,
  },
  {
    id: 5,
    title: 'Clipping — Gana por Vistas',
    description: 'Sube clips a YouTube y TikTok y genera ingresos reales por cada mil vistas.',
    icon: Play,
    from: '#FF2D55', to: '#FF6B00',
    features: ['Ingresos por CPM', 'YouTube & TikTok', 'Retiros a wallet'],
    link: '/dashboard/services/clipping',
    requiredPlan: null,
    free: true,
  },
  {
    id: 7,
    title: 'Publicador Social',
    description: 'Publica en todas tus redes desde un solo lugar. Programa, genera contenido con IA y analiza.',
    icon: Send,
    from: '#FF2DF7', to: '#FF8800',
    features: ['4 redes sociales', 'Contenido con IA', 'Programación'],
    link: '/dashboard/services/social',
    requiredPlan: 'BASIC' as UserPlan,
  },
]

function SkeletonCard() {
  return (
    <div className="rounded-3xl p-6 animate-pulse" style={{ background: '#2B2644', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="flex items-start justify-between mb-6">
        <div className="w-14 h-14 rounded-2xl bg-white/5" />
        <div className="w-16 h-6 rounded-full bg-white/5" />
      </div>
      <div className="w-3/4 h-5 rounded-lg bg-white/5 mb-3" />
      <div className="w-full h-3 rounded bg-white/5 mb-2" />
      <div className="w-5/6 h-3 rounded bg-white/5 mb-6" />
      <div className="flex gap-2 mb-6">
        {[1, 2, 3].map(i => <div key={i} className="h-6 w-24 rounded-full bg-white/5" />)}
      </div>
      <div className="w-full h-12 rounded-2xl bg-white/5" />
    </div>
  )
}

export default function ServicesPage() {
  const router = useRouter()
  const [plan, setPlan] = useState<UserPlan>('NONE')
  const [expired, setExpired] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/plan-status')
      .then(r => r.json())
      .then(d => {
        setPlan((d.plan ?? 'NONE') as UserPlan)
        setExpired(!!d.expired)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function isUnlocked(requiredPlan: UserPlan | null) {
    if (requiredPlan === null) return true
    if (expired) return false
    return PLAN_RANK[plan] >= PLAN_RANK[requiredPlan]
  }

  return (
    <div className="px-4 sm:px-6 pt-6 max-w-screen-xl mx-auto pb-20">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #D203DD, #0D1E79)', boxShadow: '0 0 16px rgba(210,3,221,0.35)' }}>
            <Zap className="w-4 h-4 text-white" fill="white" />
          </div>
          <h1 className="text-xl font-black text-white uppercase tracking-widest">Servicios</h1>
        </div>
        <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, rgba(210,3,221,0.5), rgba(13,30,121,0.3), transparent)' }} />
        <p className="text-xs mt-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {!loading && plan !== 'NONE' && !expired
            ? `${PLAN_NAMES[plan]} activo · ${services.filter(s => isUnlocked(s.requiredPlan ?? null)).length} servicios desbloqueados`
            : 'Activa tu plan y desbloquea todas las herramientas'}
        </p>
      </div>

      {/* Banners de estado */}
      {!loading && expired && (
        <div className="mb-6 flex items-start gap-3 px-4 py-4 rounded-2xl"
          style={{ background: 'rgba(255,100,0,0.08)', border: '1px solid rgba(255,100,0,0.25)' }}>
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#FF6400' }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: '#FF6400' }}>Tu plan ha vencido</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,100,0,0.7)' }}>Renueva tu plan para seguir usando todas las herramientas.</p>
          </div>
          <button onClick={() => router.push('/dashboard/planes')}
            className="shrink-0 text-xs font-black px-3 py-1.5 rounded-xl"
            style={{ background: 'rgba(255,100,0,0.15)', border: '1px solid rgba(255,100,0,0.3)', color: '#FF6400' }}>
            Renovar
          </button>
        </div>
      )}

      {!loading && !expired && plan === 'NONE' && (
        <div className="mb-6 flex items-start gap-3 px-4 py-4 rounded-2xl"
          style={{ background: 'rgba(210,3,221,0.07)', border: '1px solid rgba(210,3,221,0.2)' }}>
          <Lock className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#D203DD' }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Activa tu plan para desbloquear los servicios</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Pack Básico desde $49 USD — agentes AI, tienda, landing pages y más.
            </p>
          </div>
          <button onClick={() => router.push('/dashboard/planes')}
            className="shrink-0 text-xs font-black px-3 py-1.5 rounded-xl"
            style={{ background: 'linear-gradient(135deg, #D203DD, #0D1E79)', color: '#fff' }}>
            Ver Planes
          </button>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : services.map((service) => {
              const unlocked = isUnlocked(service.requiredPlan ?? null)
              const isFree = (service as any).free === true

              return (
                <div key={service.id}
                  className={`relative rounded-3xl overflow-hidden transition-all duration-500 group ${unlocked ? 'hover:-translate-y-2' : 'opacity-60'}`}
                  style={{
                    background: unlocked ? 'linear-gradient(135deg, rgba(154, 203, 255, 0.12) 0%, rgba(255, 125, 224, 0.12) 50%, rgba(162, 102, 255, 0.12) 100%)' : '#2B2644',
                    backdropFilter: unlocked ? 'blur(16px)' : 'none',
                    WebkitBackdropFilter: unlocked ? 'blur(16px)' : 'none',
                    border: `1px solid ${unlocked ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)'}`,
                    boxShadow: unlocked ? `0 8px 32px rgba(0,0,0,0.35), 0 0 0 0 ${service.from}00` : 'none',
                  }}
                  onMouseEnter={e => {
                    if (!unlocked) return
                    e.currentTarget.style.boxShadow = `inset 0 0 16px rgba(255,255,255,0.5), 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(255, 125, 224, 0.3)`
                    e.currentTarget.style.borderColor = `rgba(255,255,255,0.7)`
                  }}
                  onMouseLeave={e => {
                    if (!unlocked) return
                    e.currentTarget.style.boxShadow = `inset 0 0 10px rgba(255,255,255,0.3), 0 8px 32px rgba(0,0,0,0.35)`
                    e.currentTarget.style.borderColor = `rgba(255,255,255,0.4)`
                  }}>

                  {/* Neon top bar */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] transition-opacity duration-500"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${service.from}, ${service.to}, transparent)`,
                      opacity: unlocked ? 1 : 0.2,
                    }} />

                  {/* Background number watermark */}
                  <div className="absolute -bottom-3 -right-2 font-black select-none pointer-events-none leading-none"
                    style={{ fontSize: 96, color: service.from + '07' }}>
                    {service.id}
                  </div>

                  {/* Glow orb on hover */}
                  <div className="absolute top-0 left-0 w-48 h-48 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-20 transition-opacity duration-700 pointer-events-none"
                    style={{ background: service.from }} />

                  <div className="relative z-10 p-6 flex flex-col h-full">

                    {/* Icon row */}
                    <div className="flex items-start justify-between mb-5">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300"
                          style={{
                            background: unlocked
                              ? `linear-gradient(135deg, ${service.from}22, ${service.to}12)`
                              : 'rgba(255,255,255,0.04)',
                            border: `1.5px solid ${unlocked ? service.from + '40' : 'rgba(255,255,255,0.08)'}`,
                            boxShadow: unlocked ? `0 0 20px ${service.from}18` : 'none',
                          }}>
                          <service.icon className="w-7 h-7 transition-transform duration-300 group-hover:scale-110"
                            style={{ color: unlocked ? service.from : 'rgba(255,255,255,0.2)' }} />
                        </div>
                        {/* Live dot */}
                        {unlocked && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#0D1E79]"
                            style={{ background: service.from, boxShadow: `0 0 8px ${service.from}` }} />
                        )}
                      </div>

                      {/* Badge */}
                      <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                        style={
                          isFree
                            ? { background: 'rgba(210,3,221,0.15)', color: '#FF2DF7', border: '1px solid rgba(210,3,221,0.3)' }
                            : unlocked
                              ? { background: `${service.from}18`, color: service.from, border: `1px solid ${service.from}35` }
                              : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.08)' }
                        }>
                        {isFree ? '✦ GRATIS' : unlocked ? '● ACTIVO' : expired ? 'VENCIDO' : '🔒 BLOQ.'}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-black mb-2 leading-tight"
                      style={{ color: '#fff' }}>
                      {service.title}
                    </h3>

                    {/* Description */}
                    <p className="text-xs leading-relaxed mb-5 flex-1"
                      style={{ color: unlocked ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)' }}>
                      {service.description}
                    </p>

                    {/* Feature pills */}
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {service.features.map((f, i) => (
                        <span key={i} className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
                          style={{
                            background: unlocked ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${unlocked ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.06)'}`,
                            color: unlocked ? '#fff' : 'rgba(255,255,255,0.18)',
                          }}>
                          {f}
                        </span>
                      ))}
                    </div>

                    {/* CTA */}
                    {unlocked ? (
                      <Link href={service.link}
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-black text-sm text-white transition-all duration-300 group-hover:gap-3"
                        style={{
                          background: 'rgba(255,255,255,0.2)',
                          border: '1px solid rgba(255,255,255,0.3)',
                          boxShadow: `0 4px 24px rgba(0,0,0,0.15)`,
                        }}>
                        Abrir Servicio
                        <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                      </Link>
                    ) : (
                      <button onClick={() => router.push('/dashboard/planes')}
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-black text-sm transition-all duration-300"
                        style={{
                          background: 'rgba(210,3,221,0.07)',
                          border: '1px solid rgba(210,3,221,0.2)',
                          color: 'rgba(210,3,221,0.5)',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'rgba(210,3,221,0.14)'
                          e.currentTarget.style.borderColor = 'rgba(210,3,221,0.4)'
                          e.currentTarget.style.color = '#D203DD'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'rgba(210,3,221,0.07)'
                          e.currentTarget.style.borderColor = 'rgba(210,3,221,0.2)'
                          e.currentTarget.style.color = 'rgba(210,3,221,0.5)'
                        }}>
                        <Lock className="w-4 h-4" />
                        {expired ? 'Renovar Plan' : 'Ver Planes'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
      </div>
    </div>
  )
}
