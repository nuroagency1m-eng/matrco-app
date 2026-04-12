'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface Podcast {
  id: string
  title: string
  description: string | null
  coverUrl: string | null
  embedUrl: string
}

const AUDIO_EXTS = ['.mp3', '.wav', '.ogg', '.aac', '.m4a']
function isDirectAudio(url: string) {
  return AUDIO_EXTS.some(ext => url.toLowerCase().includes(ext))
}

function getEmbedUrl(url: string): string {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0`
  const vm = url.match(/vimeo\.com\/(\d+)/)
  if (vm) return `https://player.vimeo.com/video/${vm[1]}?badge=0&autopause=0`
  if (url.includes('open.spotify.com')) return url.replace('open.spotify.com/', 'open.spotify.com/embed/')
  return url
}

export default function PodcastDetailPage() {
  const { podcastId } = useParams<{ podcastId: string }>()
  const [podcast, setPodcast] = useState<Podcast | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/podcasts/${podcastId}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setPodcast(d.podcast)
        setLoading(false)
      })
      .catch(() => { setError('Error al cargar el episodio'); setLoading(false) })
  }, [podcastId])

  if (loading) return (
    <div className="px-4 sm:px-6 pt-6 max-w-screen-xl mx-auto min-h-[60vh] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#D203DD', borderTopColor: 'transparent' }} />
    </div>
  )

  if (error || !podcast) return (
    <div className="px-4 sm:px-6 pt-6 max-w-screen-xl mx-auto">
      <Link href="/dashboard/podcasts" style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>← Volver a Podcasts</Link>
      <p className="text-red-400 text-sm mt-4">{error ?? 'Episodio no encontrado'}</p>
    </div>
  )

  return (
    <div className="px-4 sm:px-6 pt-6 pb-12 max-w-4xl mx-auto">
      <Link href="/dashboard/podcasts" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.4)', textDecoration: 'none', marginBottom: 20 }}>
        ← Volver a Podcasts
      </Link>

      {/* Player */}
      <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)', marginBottom: 20 }}>
        <div style={{ background: 'rgba(210,3,221,0.08)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="fa-solid fa-microphone" style={{ fontSize: 14, color: '#D203DD' }} />
          <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>{podcast.title}</p>
        </div>
        {isDirectAudio(podcast.embedUrl) ? (
          <div style={{ background: 'linear-gradient(135deg, rgba(210,3,221,0.08), rgba(13,11,26,1))', padding: '28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            {podcast.coverUrl && (
              <img src={podcast.coverUrl} alt={podcast.title} style={{ width: 100, height: 100, borderRadius: 12, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} />
            )}
            <audio
              controls
              src={podcast.embedUrl}
              style={{ width: '100%', maxWidth: 480, accentColor: '#D203DD' }}
            >
              Tu navegador no soporta reproducción de audio.
            </audio>
          </div>
        ) : (
          <div style={{ position: 'relative', paddingBottom: '56.25%', background: '#000' }}>
            <iframe
              src={getEmbedUrl(podcast.embedUrl)}
              title={podcast.title}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
            />
          </div>
        )}
      </div>

      {/* Info */}
      {podcast.description && (
        <div style={{ padding: '16px', borderRadius: 12, background: 'linear-gradient(135deg, rgba(154,203,255,0.12) 0%, rgba(255,125,224,0.12) 50%, rgba(162,102,255,0.12) 100%)', border: '1px solid rgba(255,255,255,0.15)' }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, margin: 0 }}>{podcast.description}</p>
        </div>
      )}
    </div>
  )
}
