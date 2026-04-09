'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Podcast {
  id: string
  title: string
  description: string | null
  coverUrl: string | null
  embedUrl: string
  order: number
  createdAt: string
}

export default function PodcastsPage() {
  const [podcasts, setPodcasts] = useState<Podcast[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/podcasts')
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setPodcasts(d.podcasts ?? [])
        setLoading(false)
      })
      .catch(() => { setError('Error al cargar podcasts'); setLoading(false) })
  }, [])

  const filtered = podcasts.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="px-4 sm:px-6 pt-6 max-w-screen-xl mx-auto min-h-[60vh] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#D203DD', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-4 sm:px-6 pt-6 max-w-screen-xl mx-auto">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 pt-6 pb-24 max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-white uppercase tracking-widest">MY DIAMOND Podcasts</h1>
          <div className="h-px w-20 mt-2 rounded-full" style={{ background: 'linear-gradient(90deg, transparent, #D203DD, #FF2DF7, transparent)' }} />
          <p className="text-xs text-white/30 mt-2">Episodios exclusivos de MY DIAMOND.</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar episodio por nombre..."
          style={{
            width: '100%', paddingLeft: 36, paddingRight: 16, paddingTop: 10, paddingBottom: 10,
            borderRadius: 12, fontSize: 13, color: '#fff', outline: 'none',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
            boxSizing: 'border-box',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = 'rgba(210,3,221,0.35)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
        />
        {search && (
          <button onClick={() => setSearch('')}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: 16, lineHeight: 1 }}>✕</button>
        )}
      </div>

      {podcasts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'rgba(210,3,221,0.06)', border: '1px solid rgba(210,3,221,0.15)' }}>
            <i className="fa-solid fa-microphone" style={{ fontSize: 24, color: '#D203DD', opacity: 0.5 }} />
          </div>
          <p className="text-sm text-white/40">No hay episodios disponibles aún.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm text-white/30">Sin resultados para <span className="text-white/60">"{search}"</span></p>
          <button onClick={() => setSearch('')} className="mt-3 text-xs text-cyan-400 hover:underline">Limpiar búsqueda</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filtered.map(podcast => (
            <Link key={podcast.id} href={`/dashboard/podcasts/${podcast.id}`} style={{ textDecoration: 'none', display: 'block', height: '100%' }}
              className="hover:scale-[1.01] transition-transform">
              <div style={{
                borderRadius: 16, overflow: 'hidden',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                cursor: 'pointer', display: 'flex', flexDirection: 'column', height: '100%',
              }}>
                {/* Cover */}
                <div style={{ aspectRatio: '16/9', background: 'rgba(210,3,221,0.05)', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                  {podcast.coverUrl ? (
                    <img src={podcast.coverUrl} alt={podcast.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="fa-solid fa-microphone" style={{ fontSize: 32, color: '#D203DD', opacity: 0.2 }} />
                    </div>
                  )}
                  {/* Play badge */}
                  <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(210,3,221,0.85)', borderRadius: 20, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>Escuchar</span>
                  </div>
                </div>

                {/* Content */}
                <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <p style={{ fontWeight: 700, fontSize: 13, color: '#fff', marginBottom: 6, lineHeight: 1.35 }}>
                    {podcast.title}
                  </p>
                  <p style={{
                    color: 'rgba(255,255,255,0.3)', fontSize: 11, lineHeight: 1.5, marginBottom: 12, flex: 1,
                    display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {podcast.description ?? 'Episodio exclusivo de MY DIAMOND.'}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 'auto' }}>
                    <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>
                      <i className="fa-solid fa-microphone" style={{ marginRight: 4 }} />Podcast
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
