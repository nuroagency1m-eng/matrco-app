'use client'

import { useEffect, useState, useRef } from 'react'
import { Mic, Plus, Edit2, Trash2, Check, X, Loader2, Upload } from 'lucide-react'

interface Podcast {
  id: string
  title: string
  description: string | null
  coverUrl: string | null
  embedUrl: string
  active: boolean
  order: number
  createdAt: string
}

interface PodcastModalData {
  id?: string
  title: string
  description: string
  coverUrl: string
  embedUrl: string
  order: string
  active: boolean
}

const EMPTY: PodcastModalData = { title: '', description: '', coverUrl: '', embedUrl: '', order: '0', active: true }

export default function AdminPodcastsPage() {
  const [podcasts, setPodcasts] = useState<Podcast[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; data: PodcastModalData } | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const coverInputRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    const r = await fetch('/api/admin/podcasts')
    const d = await r.json()
    setPodcasts(d.podcasts ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function uploadCover(file: File) {
    setUploadingCover(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const data = await res.json()
    setUploadingCover(false)
    if (data.url && modal) {
      setModal({ ...modal, data: { ...modal.data, coverUrl: data.url } })
    } else {
      setSaveError('Error al subir la imagen.')
    }
  }

  async function handleSave() {
    if (!modal) return
    const { data, mode } = modal
    if (!data.title.trim() || !data.embedUrl.trim()) { setSaveError('Título y URL son obligatorios'); return }
    setSaving(true); setSaveError(null)
    const body = {
      title: data.title.trim(),
      description: data.description.trim() || null,
      coverUrl: data.coverUrl.trim() || null,
      embedUrl: data.embedUrl.trim(),
      order: Number(data.order) || 0,
      active: data.active,
    }
    const url = mode === 'edit' ? `/api/admin/podcasts/${data.id}` : '/api/admin/podcasts'
    const res = await fetch(url, { method: mode === 'edit' ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const json = await res.json()
    if (!res.ok) { setSaveError(json.error ?? 'Error'); setSaving(false); return }
    setSaving(false); setModal(null); load()
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    await fetch(`/api/admin/podcasts/${deleteId}`, { method: 'DELETE' })
    setDeleting(false); setDeleteId(null); load()
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 className="text-xl font-bold text-white uppercase tracking-widest">MY DIAMOND Podcasts</h1>
        <div className="h-px w-16 mt-2 rounded-full" style={{ background: 'linear-gradient(90deg, transparent, #D203DD, #FF2DF7, transparent)' }} />
      </div>

      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>{podcasts.length} episodio{podcasts.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => { setSaveError(null); setModal({ mode: 'create', data: EMPTY }) }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700,
            background: 'linear-gradient(135deg, #D203DD 0%, #00FF88 100%)', color: '#000', border: 'none', cursor: 'pointer' }}
        >
          <Plus size={14} /> Nuevo episodio
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={20} className="animate-spin text-white/30" /></div>
      ) : podcasts.length === 0 ? (
        <div className="text-center py-16 text-white/30 text-sm">No hay episodios aún.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {podcasts.map(p => (
            <div key={p.id} style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Cover */}
                <div style={{ width: 48, height: 48, borderRadius: 10, flexShrink: 0, overflow: 'hidden', background: 'rgba(210,3,221,0.06)', border: '1px solid rgba(210,3,221,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {p.coverUrl ? <img src={p.coverUrl} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Mic size={16} className="text-white/20" />}
                </div>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.embedUrl} · {p.active ? 'Activo' : 'Oculto'}
                  </p>
                </div>
                {/* Actions */}
                <button onClick={() => { setSaveError(null); setModal({ mode: 'edit', data: { id: p.id, title: p.title, description: p.description ?? '', coverUrl: p.coverUrl ?? '', embedUrl: p.embedUrl, order: String(p.order), active: p.active } }) }}
                  style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}>
                  <Edit2 size={13} className="text-white/50" />
                </button>
                <button onClick={() => setDeleteId(p.id)}
                  style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer' }}>
                  <Trash2 size={13} className="text-red-400/70" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
          <div style={{ background: '#0d0d15', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 24, width: '100%', maxWidth: 360 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 8 }}>¿Eliminar episodio?</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>Esta acción no se puede deshacer.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteId(null)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 600, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, background: deleting ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.8)', border: 'none', color: '#fff', cursor: deleting ? 'not-allowed' : 'pointer' }}>
                {deleting ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div style={{ background: '#0d0d15', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 24, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>{modal.mode === 'create' ? 'Nuevo episodio' : 'Editar episodio'}</h3>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 18 }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Cover upload */}
              <div>
                <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>Portada</label>
                <input ref={coverInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadCover(f) }} />
                {modal.data.coverUrl ? (
                  <div style={{ position: 'relative', width: 80, height: 80, borderRadius: 10, overflow: 'hidden' }}>
                    <img src={modal.data.coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button onClick={() => setModal({ ...modal, data: { ...modal.data, coverUrl: '' } })}
                      style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: 6, cursor: 'pointer', padding: '2px 5px', color: '#fff', fontSize: 11 }}>✕</button>
                  </div>
                ) : (
                  <button onClick={() => coverInputRef.current?.click()} disabled={uploadingCover}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, fontSize: 12, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)', cursor: uploadingCover ? 'wait' : 'pointer' }}>
                    {uploadingCover ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                    {uploadingCover ? 'Subiendo...' : 'Subir imagen'}
                  </button>
                )}
              </div>

              {/* Title */}
              <div>
                <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>Título *</label>
                <input type="text" value={modal.data.title} onChange={e => setModal({ ...modal, data: { ...modal.data, title: e.target.value } })}
                  placeholder="Ep. 1 — Cómo escalar tu negocio"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 13, color: '#fff', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              {/* Description */}
              <div>
                <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>Descripción</label>
                <textarea value={modal.data.description} onChange={e => setModal({ ...modal, data: { ...modal.data, description: e.target.value } })}
                  placeholder="De qué trata este episodio..." rows={3}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 13, color: '#fff', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
              </div>

              {/* Embed URL */}
              <div>
                <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>URL del episodio (YouTube, Vimeo, Spotify) *</label>
                <input type="text" value={modal.data.embedUrl} onChange={e => setModal({ ...modal, data: { ...modal.data, embedUrl: e.target.value } })}
                  placeholder="https://youtube.com/watch?v=..."
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 13, color: '#fff', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              {/* Order */}
              <div>
                <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>Orden</label>
                <input type="number" value={modal.data.order} onChange={e => setModal({ ...modal, data: { ...modal.data, order: e.target.value } })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 13, color: '#fff', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              {/* Active toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Visible para usuarios</label>
                <button onClick={() => setModal({ ...modal, data: { ...modal.data, active: !modal.data.active } })}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: modal.data.active ? 'rgba(0,255,136,0.1)' : 'rgba(255,255,255,0.05)', border: `1px solid ${modal.data.active ? 'rgba(0,255,136,0.25)' : 'rgba(255,255,255,0.08)'}`, color: modal.data.active ? '#00FF88' : 'rgba(255,255,255,0.35)' }}>
                  {modal.data.active ? <><Check size={12} /> Activo</> : <><X size={12} /> Oculto</>}
                </button>
              </div>

              {saveError && <p style={{ fontSize: 12, color: '#ef4444' }}>{saveError}</p>}

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={() => setModal(null)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 600, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>Cancelar</button>
                <button onClick={handleSave} disabled={saving}
                  style={{ flex: 2, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, background: saving ? 'rgba(210,3,221,0.3)' : 'linear-gradient(135deg, #D203DD 0%, #00FF88 100%)', border: 'none', color: '#000', cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Guardando...' : modal.mode === 'create' ? 'Crear episodio' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
