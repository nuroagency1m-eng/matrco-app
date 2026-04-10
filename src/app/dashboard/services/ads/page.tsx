'use client'

import { useState, useEffect, Suspense } from 'react'
import {
    Megaphone, Plus, ArrowRight, CheckCircle2,
    Sparkles, FileText, Zap, BarChart3, Settings2,
    AlertCircle, Loader2, Brain, Rocket, TrendingUp,
    Play, Pause, Clock, XCircle, RefreshCw, Target, ChevronRight,
    Flame, Activity
} from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import AIKeySelector from '@/components/AIKeySelector'

const PLATFORMS = [
    { id: 'META', label: 'Meta Ads', sub: 'Facebook & Instagram', color: '#0081FB', letter: 'f', textColor: 'text-blue-400', glow: 'rgba(0,129,251,0.15)', comingSoon: false },
    { id: 'TIKTOK', label: 'TikTok Ads', sub: 'TikTok for Business', color: '#EE1D52', letter: 'T', textColor: 'text-rose-400', glow: 'rgba(238,29,82,0.15)', comingSoon: true },
    { id: 'GOOGLE_ADS', label: 'Google Ads', sub: 'Search & Display', color: '#4285F4', letter: 'G', textColor: 'text-yellow-400', glow: 'rgba(66,133,244,0.12)', comingSoon: true },
]

const STATUS_LABELS: Record<string, { label: string; color: string; dot: string; bg: string }> = {
    DRAFT:      { label: 'Borrador',   color: 'text-white/40',   dot: 'bg-white/25',              bg: 'bg-white/5 border-white/10' },
    READY:      { label: 'Listo',      color: 'text-blue-400',   dot: 'bg-blue-400',              bg: 'bg-blue-500/10 border-blue-500/20' },
    PUBLISHING: { label: 'Publicando', color: 'text-yellow-400', dot: 'bg-yellow-400 animate-pulse', bg: 'bg-yellow-500/10 border-yellow-500/20' },
    PUBLISHED:  { label: 'Publicado',  color: 'text-emerald-400',dot: 'bg-emerald-400',           bg: 'bg-emerald-500/10 border-emerald-500/20' },
    FAILED:     { label: 'Fallido',    color: 'text-red-400',    dot: 'bg-red-400',               bg: 'bg-red-500/10 border-red-500/20' },
    PAUSED:     { label: 'Pausado',    color: 'text-orange-400', dot: 'bg-orange-400',            bg: 'bg-orange-500/10 border-orange-500/20' },
}

export default function AdsDashboard() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-8 h-8 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
            </div>
        }>
            <AdsDashboardInner />
        </Suspense>
    )
}

function AdsDashboardInner() {
    const [integrations, setIntegrations] = useState<any[]>([])
    const [campaigns, setCampaigns] = useState<any[]>([])
    const [brief, setBrief] = useState<any>(null)
    const [allBriefs, setAllBriefs] = useState<any[]>([])
    const [openaiConfig, setOpenaiConfig] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const searchParams = useSearchParams()

    useEffect(() => {
        const err = searchParams.get('error')
        if (err) setError(decodeURIComponent(err))
        fetchAll()
    }, [searchParams])

    async function fetchAll() {
        setLoading(true)
        try {
            const [intRes, campaignRes, briefRes, oaiRes] = await Promise.all([
                fetch('/api/ads/integrations/status'),
                fetch('/api/ads/campaign'),
                fetch('/api/ads/brief'),
                fetch('/api/ads/config/openai')
            ])
            const [iData, cData, bData, oData] = await Promise.all([
                intRes.json(), campaignRes.json(), briefRes.json(), oaiRes.json()
            ])
            setIntegrations(iData.integrations || [])
            setCampaigns(cData.campaigns || [])
            setBrief(bData.brief || null)
            setAllBriefs(bData.briefs || [])
            setOpenaiConfig(oData.config || null)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const handleConnect = async (platformId: string) => {
        try {
            const res = await fetch(`/api/ads/integrations/${platformId.toLowerCase()}/connect/start`, { method: 'POST' })
            const { authUrl } = await res.json()
            if (authUrl) window.location.href = authUrl
        } catch { alert('Error al conectar plataforma') }
    }

    const handlePause = async (campaignId: string) => {
        setActionLoading(campaignId + '-pause')
        try {
            const res = await fetch(`/api/ads/campaign/${campaignId}/pause`, { method: 'POST' })
            const data = await res.json()
            if (!res.ok) { setError(data.error || 'Error al pausar'); return }
            setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, status: 'PAUSED' } : c))
        } catch { setError('Error al pausar campaña') }
        finally { setActionLoading(null) }
    }

    const handleResume = async (campaignId: string) => {
        setActionLoading(campaignId + '-resume')
        try {
            const res = await fetch(`/api/ads/campaign/${campaignId}/resume`, { method: 'POST' })
            const data = await res.json()
            if (!res.ok) { setError(data.error || 'Error al reanudar'); return }
            setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, status: 'PUBLISHED' } : c))
        } catch { setError('Error al reanudar campaña') }
        finally { setActionLoading(null) }
    }

    const hasOpenAI = openaiConfig?.isValid
    const hasBrief = !!brief
    const hasIntegration = integrations.some(i => i.status === 'CONNECTED')
    const allReady = hasOpenAI && hasBrief && hasIntegration
    const stepsCompleted = [hasOpenAI, hasBrief, hasIntegration].filter(Boolean).length

    const published = campaigns.filter(c => c.status === 'PUBLISHED').length
    const drafts = campaigns.filter(c => ['DRAFT', 'READY'].includes(c.status)).length
    const failed = campaigns.filter(c => c.status === 'FAILED').length

    return (
        <div className="px-4 md:px-6 xl:px-10 pt-6 pb-28 max-w-screen-2xl mx-auto text-white">

            {/* ── HEADER ─────────────────────────────── */}
            <div className="relative rounded-3xl overflow-hidden mb-7 p-6 md:p-8"
                style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(59,130,246,0.06) 50%, rgba(0,0,0,0) 100%)', border: '1px solid rgba(139,92,246,0.2)' }}>

                {/* glow orbs */}
                <div className="pointer-events-none absolute -top-10 -left-10 w-56 h-56 rounded-full blur-[80px]" style={{ background: 'rgba(139,92,246,0.18)' }} />
                <div className="pointer-events-none absolute -bottom-10 right-20 w-40 h-40 rounded-full blur-[70px]" style={{ background: 'rgba(59,130,246,0.12)' }} />

                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                    <div className="flex items-center gap-4">
                        <div className="w-13 h-13 rounded-2xl flex items-center justify-center shrink-0"
                            style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(59,130,246,0.2))', border: '1px solid rgba(139,92,246,0.35)', width: 52, height: 52 }}>
                            <Megaphone className="text-purple-300" size={22} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-0.5">
                                <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-none">
                                    Ads Maestro
                                </h1>
                                <span className="text-2xl md:text-3xl font-black tracking-tight leading-none text-transparent bg-clip-text"
                                    style={{ backgroundImage: 'linear-gradient(90deg, #a78bfa, #60a5fa)' }}>
                                    AI
                                </span>
                            </div>
                            <p className="text-xs text-white/35 font-medium">Publicidad inteligente · Impulsado por IA</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <AIKeySelector compact />
                        <Link href="/dashboard/services/ads/wizard"
                            className="flex items-center gap-2 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all active:scale-[0.97] shadow-[0_0_30px_rgba(139,92,246,0.35)]"
                            style={{ background: 'linear-gradient(135deg, #D203DD, #3b82f6)' }}>
                            <Plus size={15} />
                            Nueva Campaña
                        </Link>
                        <Link href="/dashboard/services/ads/analytics"
                            className="flex items-center gap-2 text-white/60 text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-white/10 transition-all"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <Activity size={14} />
                            <span className="hidden sm:inline">Analytics</span>
                        </Link>
                        <Link href="/dashboard/services/ads/history"
                            className="flex items-center gap-2 text-white/60 text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-white/10 transition-all"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <BarChart3 size={14} />
                            <span className="hidden sm:inline">Historial</span>
                        </Link>
                        <button onClick={fetchAll}
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white/40 hover:text-white transition-all"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <RefreshCw size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* error */}
            {error && (
                <div className="mb-5 p-4 rounded-2xl flex items-start gap-3 text-red-400 text-sm"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <p className="flex-1 text-xs"><b>Error:</b> {error}</p>
                    <button onClick={() => setError(null)} className="text-xs hover:underline shrink-0">✕</button>
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center py-36 gap-4">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-full border-2 border-purple-500/20 border-t-purple-400 animate-spin" />
                        <div className="absolute inset-0 rounded-full blur-md" style={{ background: 'rgba(139,92,246,0.1)' }} />
                    </div>
                    <p className="text-white/25 text-xs font-medium tracking-widest uppercase">Cargando</p>
                </div>
            ) : (
                <div className="space-y-6">

                    {/* ── SETUP ───────────────────────────── */}
                    {!allReady && (
                        <div className="rounded-3xl p-5 md:p-6" style={{ background: 'linear-gradient(135deg, rgba(154,203,255,0.12) 0%, rgba(255,125,224,0.12) 50%, rgba(162,102,255,0.12) 100%)', border: '1px solid rgba(255,255,255,0.15)' }}>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2.5">
                                    <Rocket size={15} className="text-purple-400" />
                                    <span className="font-bold text-sm">Configura para empezar</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-1">
                                        {[0,1,2].map(i => (
                                            <div key={i} className={`h-1 w-8 rounded-full transition-all duration-500 ${i < stepsCompleted ? 'bg-purple-400' : 'bg-white/8'}`} />
                                        ))}
                                    </div>
                                    <span className="text-[10px] text-white/30 font-bold tabular-nums">{stepsCompleted}/3</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                {[
                                    { label: 'API Key de OpenAI', done: hasOpenAI, href: '/dashboard/services/ads/setup', icon: Brain, desc: 'Genera copies con IA' },
                                    { label: 'Perfil de Negocio', done: hasBrief, href: '/dashboard/services/ads/brief', icon: FileText, desc: 'Info de tu negocio' },
                                    { label: 'Plataforma', done: hasIntegration, href: '/dashboard/services/ads/setup', icon: Zap, desc: 'Conecta Meta Ads' },
                                ].map((step, idx) => {
                                    const Icon = step.icon
                                    return (
                                        <Link key={idx} href={step.href}
                                            className={`group flex items-center gap-3 p-3.5 rounded-2xl border transition-all active:scale-[0.98] ${step.done
                                                ? 'bg-emerald-500/5 border-emerald-500/15'
                                                : 'bg-white/2 border-white/6 hover:border-purple-500/30 hover:bg-purple-500/5'}`}>
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${step.done ? 'bg-emerald-500/15' : 'bg-white/4 group-hover:bg-purple-500/12'}`}>
                                                {step.done
                                                    ? <CheckCircle2 size={15} className="text-emerald-400" />
                                                    : <Icon size={15} className="text-white/35 group-hover:text-purple-400 transition-colors" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold truncate">{step.label}</p>
                                                <p className="text-[10px] text-white/25 truncate">{step.done ? '✓ Completado' : step.desc}</p>
                                            </div>
                                            {!step.done && <ChevronRight size={12} className="text-white/15 group-hover:text-purple-400 shrink-0 transition-colors" />}
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── STATS ───────────────────────────── */}
                    {campaigns.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                                { label: 'Total', value: campaigns.length, icon: Target, color: 'text-white', accent: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.2)', iconColor: 'text-purple-400' },
                                { label: 'Publicadas', value: published, icon: Flame, color: 'text-emerald-400', accent: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.18)', iconColor: 'text-emerald-400' },
                                { label: 'Borradores', value: drafts, icon: Clock, color: 'text-blue-400', accent: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.18)', iconColor: 'text-blue-400' },
                                { label: 'Fallidas', value: failed, icon: XCircle, color: 'text-red-400', accent: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.18)', iconColor: 'text-red-400' },
                            ].map(stat => {
                                const Icon = stat.icon
                                return (
                                    <div key={stat.label} className="relative overflow-hidden rounded-2xl p-4 flex items-center gap-3"
                                        style={{ background: stat.accent, border: `1px solid ${stat.border}` }}>
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                            style={{ background: 'rgba(255,255,255,0.04)' }}>
                                            <Icon size={17} className={stat.iconColor} />
                                        </div>
                                        <div>
                                            <p className={`text-2xl font-black leading-none tabular-nums ${stat.color}`}>{stat.value}</p>
                                            <p className="text-[10px] text-white/30 font-medium mt-0.5">{stat.label}</p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* ── PLATAFORMAS + NEGOCIOS ──────────── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-5">

                        {/* Plataformas */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-white/25">Plataformas</span>
                                <Link href="/dashboard/services/ads/setup" className="flex items-center gap-1 text-[10px] text-purple-400 hover:underline">
                                    <Settings2 size={10} /> Configurar
                                </Link>
                            </div>
                            <div className="space-y-2">
                                {PLATFORMS.map(platform => {
                                    const integration = integrations.find(i => i.platform === platform.id)
                                    const isConnected = integration?.status === 'CONNECTED'
                                    return (
                                        <div key={platform.id}
                                            className="relative overflow-hidden rounded-2xl flex items-center gap-3 p-3.5"
                                            style={{
                                                background: platform.comingSoon ? 'rgba(13,30,121,0.2)' : isConnected ? 'linear-gradient(135deg, rgba(154,203,255,0.12) 0%, rgba(255,125,224,0.12) 50%, rgba(162,102,255,0.12) 100%)' : 'linear-gradient(135deg, rgba(154,203,255,0.12) 0%, rgba(255,125,224,0.12) 50%, rgba(162,102,255,0.12) 100%)',
                                                border: platform.comingSoon ? '1px dashed rgba(210,3,221,0.1)' : isConnected ? '1px solid rgba(255,255,255,0.15)' : '1px dashed rgba(255,255,255,0.15)',
                                                opacity: platform.comingSoon ? 0.5 : 1,
                                            }}>
                                            <div className="pointer-events-none absolute -top-6 -right-6 w-20 h-20 rounded-full blur-[40px]"
                                                style={{ background: isConnected && !platform.comingSoon ? platform.glow : 'transparent' }} />

                                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                                                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                <span className={`font-black text-sm ${platform.textColor}`}>{platform.letter}</span>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-xs leading-tight">{platform.label}</p>
                                                {isConnected && !platform.comingSoon && integration?.connectedAccount
                                                    ? <p className="text-[10px] text-white/30 truncate">↳ {integration.connectedAccount.displayName}</p>
                                                    : <p className="text-[10px] text-white/20 truncate">{platform.sub}</p>
                                                }
                                            </div>

                                            {platform.comingSoon
                                                ? <span className="flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-full shrink-0"
                                                    style={{ background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.25)', color: '#fb923c' }}>
                                                    PRÓXIMAMENTE
                                                  </span>
                                                : isConnected
                                                    ? <span className="flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-full shrink-0"
                                                        style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399' }}>
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                                                        ACTIVA
                                                      </span>
                                                    : null
                                            }

                                            {platform.comingSoon
                                                ? <span className="text-[10px] font-bold py-1.5 px-3 rounded-xl shrink-0 cursor-not-allowed"
                                                    style={{ background: 'linear-gradient(135deg, rgba(154,203,255,0.12) 0%, rgba(255,125,224,0.12) 50%, rgba(162,102,255,0.12) 100%)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.2)' }}>
                                                    Próximamente
                                                  </span>
                                                : <button onClick={() => handleConnect(platform.id)}
                                                    className="text-[10px] font-bold py-1.5 px-3 rounded-xl shrink-0 transition-all active:scale-[0.97]"
                                                    style={{
                                                        background: isConnected ? 'rgba(255,255,255,0.05)' : 'rgba(139,92,246,0.15)',
                                                        border: isConnected ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(139,92,246,0.3)',
                                                        color: isConnected ? 'rgba(255,255,255,0.4)' : '#c4b5fd'
                                                    }}>
                                                    {isConnected ? 'Reconf.' : '+ Conectar'}
                                                  </button>
                                            }
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Mis Negocios */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-white/25">Mis Negocios</span>
                                <Link href="/dashboard/services/ads/brief" className="flex items-center gap-1 text-[10px] text-purple-400 hover:underline">
                                    Gestionar <ArrowRight size={10} />
                                </Link>
                            </div>

                            {allBriefs.length === 0 ? (
                                <Link href="/dashboard/services/ads/brief"
                                    className="flex flex-col items-center justify-center rounded-2xl py-10 gap-3 group transition-all"
                                    style={{ background: 'rgba(255,255,255,0.015)', border: '1px dashed rgba(255,255,255,0.07)' }}>
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                                        style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
                                        <FileText size={16} className="text-purple-400" />
                                    </div>
                                    <p className="text-xs text-white/30 font-medium">Crear perfil de negocio</p>
                                </Link>
                            ) : (
                                <div className="space-y-2">
                                    {allBriefs.slice(0, 3).map((b: any) => (
                                        <div key={b.id}
                                            className="flex items-center gap-3 rounded-2xl px-3.5 py-3 group"
                                            style={{ background: 'linear-gradient(135deg, rgba(154,203,255,0.12) 0%, rgba(255,125,224,0.12) 50%, rgba(162,102,255,0.12) 100%)', border: '1px solid rgba(255,255,255,0.15)' }}>
                                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                                                style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)' }}>
                                                <FileText size={13} className="text-purple-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold truncate">{b.name}</p>
                                                <p className="text-[10px] text-white/25 truncate">{b.industry}</p>
                                            </div>
                                            <Link href={`/dashboard/services/ads/wizard?briefId=${b.id}`}
                                                className="flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-xl shrink-0 transition-all active:scale-[0.97]"
                                                style={{ background: 'rgba(210,3,221,0.7)', color: '#e9d5ff', border: '1px solid rgba(139,92,246,0.4)' }}>
                                                Campaña <ArrowRight size={9} />
                                            </Link>
                                        </div>
                                    ))}
                                    {allBriefs.length > 3 && (
                                        <Link href="/dashboard/services/ads/brief"
                                            className="flex items-center justify-center py-2 text-[10px] text-white/25 hover:text-white/50 transition-all font-medium">
                                            +{allBriefs.length - 3} más
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>

                    {/* ── CAMPAÑAS RECIENTES — 3rd col on 2xl ── */}
                    <div className="lg:col-span-2 2xl:col-span-1">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <TrendingUp size={12} className="text-white/30" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-white/25">Campañas recientes</span>
                            </div>
                            {campaigns.length > 0 && (
                                <Link href="/dashboard/services/ads/history" className="text-[10px] text-purple-400 hover:underline">Ver todas →</Link>
                            )}
                        </div>

                        {campaigns.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4 rounded-3xl text-center px-4"
                                style={{ background: 'rgba(255,255,255,0.015)', border: '1px dashed rgba(255,255,255,0.07)' }}>
                                <div className="w-14 h-14 rounded-full flex items-center justify-center"
                                    style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
                                    <Sparkles className="text-purple-400" size={22} />
                                </div>
                                <div>
                                    <p className="text-white/40 text-sm font-bold mb-1">Sin campañas todavía</p>
                                    <p className="text-white/20 text-xs">Crea tu primera campaña impulsada por IA</p>
                                </div>
                                <Link href="/dashboard/services/ads/wizard"
                                    className="flex items-center gap-2 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all"
                                    style={{ background: 'linear-gradient(135deg, #D203DD, #3b82f6)' }}>
                                    <Plus size={14} /> Crear campaña
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {campaigns.slice(0, 5).map((campaign: any) => {
                                    const status = STATUS_LABELS[campaign.status] || STATUS_LABELS['DRAFT']
                                    const platform = PLATFORMS.find(p => p.id === campaign.platform)
                                    return (
                                        <div key={campaign.id}
                                            className="group rounded-2xl p-4 flex items-center gap-3 transition-all"
                                            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}
                                            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
                                            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}>

                                            {/* platform icon */}
                                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                {platform && <span className={`font-black text-sm ${platform.textColor}`}>{platform.letter}</span>}
                                            </div>

                                            {/* info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm leading-tight truncate">{campaign.name}</p>
                                                <p className="text-[10px] text-white/25 truncate mt-0.5">{campaign.strategy?.name || campaign.brief?.name}</p>
                                            </div>

                                            {/* status + action */}
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className={`flex items-center gap-1 text-[9px] font-black uppercase px-2 py-1 rounded-full border ${status.bg} ${status.color}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                                                    {status.label}
                                                </span>
                                                {campaign.status === 'READY' && (
                                                    <Link href={`/dashboard/services/ads/preview/${campaign.id}`}
                                                        className="text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all"
                                                        style={{ background: 'rgba(210,3,221,0.7)', color: '#e9d5ff', border: '1px solid rgba(139,92,246,0.4)' }}>
                                                        Publicar →
                                                    </Link>
                                                )}
                                                {campaign.status === 'DRAFT' && (
                                                    <Link href={`/dashboard/services/ads/campaign/${campaign.strategyId}?edit=${campaign.id}`}
                                                        className="text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all"
                                                        style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                        Continuar
                                                    </Link>
                                                )}
                                                {campaign.status === 'FAILED' && (
                                                    <Link href={`/dashboard/services/ads/preview/${campaign.id}`}
                                                        className="text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all"
                                                        style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}>
                                                        Reintentar
                                                    </Link>
                                                )}
                                                {campaign.status === 'PUBLISHED' && (
                                                    <button
                                                        onClick={() => handlePause(campaign.id)}
                                                        disabled={actionLoading === campaign.id + '-pause'}
                                                        className="flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all disabled:opacity-40"
                                                        style={{ background: 'rgba(251,146,60,0.1)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.25)' }}>
                                                        {actionLoading === campaign.id + '-pause' ? <Loader2 size={10} className="animate-spin" /> : <Pause size={10} />}
                                                        Pausar
                                                    </button>
                                                )}
                                                {campaign.status === 'PAUSED' && (
                                                    <button
                                                        onClick={() => handleResume(campaign.id)}
                                                        disabled={actionLoading === campaign.id + '-resume'}
                                                        className="flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all disabled:opacity-40"
                                                        style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }}>
                                                        {actionLoading === campaign.id + '-resume' ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />}
                                                        Reanudar
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}

                                <Link href="/dashboard/services/ads/history"
                                    className="flex items-center justify-center gap-2 py-3 rounded-2xl text-xs text-white/30 font-bold hover:text-white/60 transition-all"
                                    style={{ background: 'linear-gradient(135deg, rgba(154,203,255,0.12) 0%, rgba(255,125,224,0.12) 50%, rgba(162,102,255,0.12) 100%)', border: '1px solid rgba(255,255,255,0.15)' }}>
                                    Ver todas las campañas <ArrowRight size={11} />
                                </Link>
                            </div>
                        )}
                    </div>
                    {/* end grid */}
                </div>

                </div>
            )}
        </div>
    )
}
