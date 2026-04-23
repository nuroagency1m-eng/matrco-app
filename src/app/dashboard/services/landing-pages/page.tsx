'use client'

import { useState, useEffect } from 'react'
import { Layout, Plus, Search, ExternalLink, Edit3, Trash2, Users, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { usePlanGuard } from '@/hooks/usePlanGuard'

interface LandingPage {
    id: string
    name: string
    slug: string
    templateId: string
    active: boolean
    updatedAt: string
    _count: {
        leads: number
    }
}

export default function LandingPagesPage() {
    usePlanGuard()
    const [pages, setPages] = useState<LandingPage[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchPages()
    }, [])

    const fetchPages = async () => {
        try {
            const res = await fetch('/api/landing-pages')
            const data = await res.json()
            if (data.pages) setPages(data.pages)
        } catch (error) {
            console.error('Error fetching pages:', error)
        } finally {
            setLoading(false)
        }
    }

    const deletePage = async (id: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar esta página?')) return
        try {
            await fetch(`/api/landing-pages/${id}`, { method: 'DELETE' })
            setPages(pages.filter(p => p.id !== id))
        } catch (error) {
            console.error('Error deleting page:', error)
        }
    }

    return (
        <div className="px-4 sm:px-6 pt-6 max-w-screen-xl mx-auto pb-20 font-inter">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#9B00FF]/10 flex items-center justify-center border border-[#9B00FF]/20 shadow-[0_0_20px_rgba(155,0,255,0.2)]">
                        <Layout className="w-6 h-6 text-[#9B00FF]" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Mis Landing Pages</h1>
                        <p className="text-dark-400 text-sm mt-1">Crea y gestiona tus embudos de venta de alta conversión</p>
                    </div>
                </div>

                <Link href="/dashboard/services/landing-pages/create" className="bg-[#9B00FF] hover:bg-[#9B00FF]/90 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-[0_4px_20px_rgba(155,0,255,0.3)] hover:scale-[1.02] active:scale-95">
                    <Plus size={20} />
                    Crear Nueva Landing
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full flex items-center justify-center py-20">
                        <Loader2 className="w-10 h-10 text-[#9B00FF] animate-spin" />
                    </div>
                ) : pages.length === 0 ? (
                    <div className="col-span-full border-2 border-dashed border-white/8 rounded-[32px] p-20 text-center" style={{ background: 'linear-gradient(135deg, rgba(154,203,255,0.06) 0%, rgba(255,125,224,0.06) 50%, rgba(162,102,255,0.06) 100%)' }}>
                        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <Layout className="w-10 h-10 text-white/20" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Aún no tienes Landing Pages</h2>
                        <p className="text-dark-400 mb-8 max-w-sm mx-auto">
                            Comienza creando tu primera página de aterrizaje profesional para capturar nuevos clientes.
                        </p>
                        <Link href="/dashboard/services/landing-pages/create" className="text-[#9B00FF] font-bold hover:underline">
                            Crea tu primera landing ahora
                        </Link>
                    </div>
                ) : (
                    pages.map((page) => (
                        <div key={page.id} className="border border-white/8 rounded-3xl p-6 hover:border-purple-500/30 transition-all group relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(154,203,255,0.12) 0%, rgba(255,125,224,0.12) 50%, rgba(162,102,255,0.12) 100%)', backdropFilter: 'blur(16px)' }}>
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-colors" style={{ background: 'rgba(155,0,255,0.08)', border: '1px solid rgba(155,0,255,0.2)' }}>
                                    <Layout className="w-6 h-6 text-purple-400" />
                                </div>
                                <div className="bg-[#00FF88]/10 text-[#00FF88] px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border border-[#00FF88]/20">
                                    {page.active ? 'Activa' : 'Pausada'}
                                </div>
                            </div>

                            <h2 className="text-xl font-bold text-white mb-1 truncate">{page.name}</h2>
                            <p className="text-dark-400 text-xs mb-6 font-mono">/lp/{page.slug}</p>

                            <div className="flex items-center gap-6 mb-8 text-sm">
                                <div className="flex flex-col">
                                    <span className="text-dark-500 text-[10px] uppercase font-bold tracking-widest">Leads</span>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <Users size={14} className="text-[#9B00FF]" />
                                        <span className="text-white font-bold">{page._count.leads}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-dark-500 text-[10px] uppercase font-bold tracking-widest">Template</span>
                                    <span className="text-white font-medium mt-0.5 capitalize">{page.templateId}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <Link href={`/dashboard/services/landing-pages/${page.id}/edit`} className="bg-white/8 hover:bg-white/12 text-white p-3 rounded-xl flex items-center justify-center gap-2 transition-all font-bold text-sm border border-white/8">
                                    <Edit3 size={16} />
                                    Editar
                                </Link>
                                <a href={`/lp/${page.slug}`} target="_blank" className="bg-white/8 hover:bg-white/12 text-white p-3 rounded-xl flex items-center justify-center gap-2 transition-all font-bold text-sm border border-white/8">
                                    <ExternalLink size={16} />
                                    Ver
                                </a>
                                <button onClick={() => deletePage(page.id)} className="col-span-2 text-dark-500 hover:text-red-400 transition-colors text-xs font-medium py-2 flex items-center justify-center gap-2">
                                    <Trash2 size={12} />
                                    Eliminar permanentemente
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
