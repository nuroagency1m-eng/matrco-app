'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, Loader2, Trash2, Edit2, X, Search, ChevronLeft, ChevronRight, Play, Image as ImageIcon } from 'lucide-react'

interface Product {
  id: string
  name: string
  category: string | null
  benefits: string | null
  usage: string | null
  warnings: string | null
  priceUnit: number | null
  pricePromo2: number | null
  priceSuper6: number | null
  currency: string
  welcomeMessage: string | null
  firstMessage: string | null
  shippingInfo: string | null
  coverage: string | null
  active: boolean
  createdAt: string
  imageMainUrls: string[]
  imagePriceUnitUrl: string | null
  imagePricePromoUrl: string | null
  imagePriceSuperUrl: string | null
  productVideoUrls: string[]
  testimonialsVideoUrls: string[]
  user: { id: string; username: string; fullName: string }
  bots: { bot: { id: string; name: string } }[]
}

const INPUT = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none'
const LABEL = 'block text-[11px] text-white/40 mb-1'

const EMPTY_FORM = {
  name: '', category: '', benefits: '', usage: '', warnings: '',
  priceUnit: '', pricePromo2: '', priceSuper6: '', currency: 'USD',
  welcomeMessage: '', firstMessage: '', shippingInfo: '', coverage: '', active: true,
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const [editModal, setEditModal] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [deleteConfirm, setDeleteConfirm] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchProducts = useCallback(() => {
    setLoading(true)
    const qs = new URLSearchParams()
    if (search) qs.set('q', search)
    qs.set('page', String(page))
    fetch(`/api/admin/products?${qs}`)
      .then(r => r.json())
      .then(d => {
        setProducts(d.products ?? [])
        setTotal(d.total ?? 0)
        setTotalPages(d.totalPages ?? 1)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [search, page])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const handleSearch = () => { setSearch(searchInput); setPage(1) }

  const openEdit = (p: Product) => {
    setEditing(p)
    setForm({
      name: p.name,
      category: p.category ?? '',
      benefits: p.benefits ?? '',
      usage: p.usage ?? '',
      warnings: p.warnings ?? '',
      priceUnit: p.priceUnit != null ? String(p.priceUnit) : '',
      pricePromo2: p.pricePromo2 != null ? String(p.pricePromo2) : '',
      priceSuper6: p.priceSuper6 != null ? String(p.priceSuper6) : '',
      currency: p.currency,
      welcomeMessage: p.welcomeMessage ?? '',
      firstMessage: p.firstMessage ?? '',
      shippingInfo: p.shippingInfo ?? '',
      coverage: p.coverage ?? '',
      active: p.active,
    })
    setError('')
    setEditModal(true)
  }

  const setF = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }))

  const saveEdit = async () => {
    if (!editing) return
    if (!form.name.trim()) { setError('El nombre es requerido'); return }
    setSaving(true); setError('')
    try {
      const body: any = {
        name: form.name, category: form.category || null,
        benefits: form.benefits || null, usage: form.usage || null, warnings: form.warnings || null,
        priceUnit: form.priceUnit !== '' ? form.priceUnit : null,
        pricePromo2: form.pricePromo2 !== '' ? form.pricePromo2 : null,
        priceSuper6: form.priceSuper6 !== '' ? form.priceSuper6 : null,
        currency: form.currency,
        welcomeMessage: form.welcomeMessage || null,
        firstMessage: form.firstMessage || null,
        shippingInfo: form.shippingInfo || null,
        coverage: form.coverage || null,
        active: form.active,
      }
      const res = await fetch(`/api/admin/products/${editing.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al guardar'); return }
      setEditModal(false); fetchProducts()
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const doDelete = async () => {
    if (!deleteConfirm) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/products/${deleteConfirm.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error ?? 'Error al eliminar')
        return
      }
      setDeleteConfirm(null); fetchProducts()
    } catch {
      alert('Error de conexión. Intenta de nuevo.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="px-4 sm:px-6 pt-6 pb-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white uppercase tracking-widest">Productos de Bots</h1>
        <div className="h-px w-20 mt-2 rounded-full" style={{ background: 'linear-gradient(90deg, transparent, #D203DD, #FF2DF7, transparent)' }} />
        <p className="text-xs text-white/30 mt-1">Todos los productos añadidos por usuarios para sus agentes AI</p>
      </div>

      {/* Search + refresh */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        <div style={{ flex: 1, display: 'flex', gap: 6 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Buscar por nombre, categoría, usuario..."
              style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 9, padding: '8px 10px 8px 32px', color: '#fff', fontSize: 13, outline: 'none' }}
            />
          </div>
          <button onClick={handleSearch} style={{ padding: '0 14px', borderRadius: 9, background: 'rgba(210,3,221,0.12)', border: '1px solid rgba(210,3,221,0.25)', color: '#D203DD', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            Buscar
          </button>
        </div>
        <button onClick={fetchProducts} style={{ padding: '0 10px', borderRadius: 9, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}>
          <RefreshCw size={13} className="text-white/40" />
        </button>
      </div>

      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginBottom: 12 }}>{total} producto{total !== 1 ? 's' : ''} en total</p>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={20} className="animate-spin text-white/30" /></div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 text-white/30 text-sm">No se encontraron productos.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {products.map(p => (
            <div key={p.id} style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 13 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>{p.name}</span>
                    {p.category && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.05)', padding: '2px 7px', borderRadius: 5 }}>{p.category}</span>}
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, border: '1px solid', ...(p.active ? { color: '#00FF88', borderColor: 'rgba(0,255,136,0.2)', background: 'rgba(0,255,136,0.06)' } : { color: 'rgba(255,255,255,0.25)', borderColor: 'rgba(255,255,255,0.08)', background: 'transparent' }) }}>
                      {p.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
                    Usuario: <span style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>{p.user.fullName}</span>
                    <span style={{ color: 'rgba(255,255,255,0.25)' }}> · @{p.user.username}</span>
                  </p>
                  {p.bots.length > 0 && (
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
                      Bots: {p.bots.map(b => b.bot.name).join(', ')}
                    </p>
                  )}
                  {(p.priceUnit != null || p.pricePromo2 != null || p.priceSuper6 != null) && (
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>
                      {[
                        p.priceUnit != null && `Unit: ${p.priceUnit} ${p.currency}`,
                        p.pricePromo2 != null && `2x: ${p.pricePromo2} ${p.currency}`,
                        p.priceSuper6 != null && `6x: ${p.priceSuper6} ${p.currency}`,
                      ].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => openEdit(p)} style={{ padding: '6px 8px', borderRadius: 7, background: 'rgba(210,3,221,0.07)', border: '1px solid rgba(210,3,221,0.15)', cursor: 'pointer', color: '#D203DD' }}>
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => setDeleteConfirm(p)} style={{ padding: '6px 8px', borderRadius: 7, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', color: '#ef4444' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Media: images + videos */}
              {(() => {
                const allImages = [
                  ...(p.imageMainUrls ?? []),
                  ...(p.imagePriceUnitUrl ? [p.imagePriceUnitUrl] : []),
                  ...(p.imagePricePromoUrl ? [p.imagePricePromoUrl] : []),
                  ...(p.imagePriceSuperUrl ? [p.imagePriceSuperUrl] : []),
                ]
                const allVideos = [
                  ...(p.productVideoUrls ?? []),
                  ...(p.testimonialsVideoUrls ?? []),
                ]
                if (allImages.length === 0 && allVideos.length === 0) return null
                return (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                    {allImages.slice(0, 6).map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer"
                        style={{ width: 52, height: 52, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0, display: 'block' }}>
                        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </a>
                    ))}
                    {allImages.length > 6 && (
                      <div style={{ width: 52, height: 52, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                        <ImageIcon size={13} style={{ color: 'rgba(255,255,255,0.3)' }} />
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 700 }}>+{allImages.length - 6}</span>
                      </div>
                    )}
                    {allVideos.slice(0, 4).map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer"
                        style={{ width: 52, height: 52, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(0,200,255,0.2)', flexShrink: 0, position: 'relative', display: 'block', background: '#000' }}>
                        <video src={url} muted style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Play size={16} style={{ color: '#fff', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.8))' }} />
                        </div>
                      </a>
                    ))}
                    {allVideos.length > 4 && (
                      <div style={{ width: 52, height: 52, borderRadius: 8, background: 'rgba(0,200,255,0.05)', border: '1px solid rgba(0,200,255,0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                        <Play size={13} style={{ color: 'rgba(0,200,255,0.6)' }} />
                        <span style={{ fontSize: 10, color: 'rgba(0,200,255,0.5)', fontWeight: 700 }}>+{allVideos.length - 4}</span>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 20 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1 }}>
            <ChevronLeft size={14} className="text-white/50" />
          </button>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Página {page} de {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.4 : 1 }}>
            <ChevronRight size={14} className="text-white/50" />
          </button>
        </div>
      )}

      {/* ═══ EDIT MODAL ═══ */}
      {editModal && editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '40px 16px' }}>
          <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 18, width: '100%', maxWidth: 580, padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Editar producto</h2>
              <button onClick={() => setEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 20 }}>
              Usuario: <span style={{ color: 'rgba(255,255,255,0.5)' }}>{editing.user.fullName} (@{editing.user.username})</span>
            </p>

            {error && <p style={{ fontSize: 12, color: '#ef4444', marginBottom: 14, background: 'rgba(239,68,68,0.08)', borderRadius: 8, padding: '7px 12px' }}>{error}</p>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label className={LABEL}>Nombre *</label><input className={INPUT} value={form.name} onChange={e => setF('name', e.target.value)} /></div>
              <div><label className={LABEL}>Categoría</label><input className={INPUT} value={form.category} onChange={e => setF('category', e.target.value)} /></div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div><label className={LABEL}>Precio unitario</label><input className={INPUT} type="number" step="0.01" value={form.priceUnit} onChange={e => setF('priceUnit', e.target.value)} /></div>
                <div><label className={LABEL}>Precio promo x2</label><input className={INPUT} type="number" step="0.01" value={form.pricePromo2} onChange={e => setF('pricePromo2', e.target.value)} /></div>
                <div><label className={LABEL}>Precio super x6</label><input className={INPUT} type="number" step="0.01" value={form.priceSuper6} onChange={e => setF('priceSuper6', e.target.value)} /></div>
              </div>

              <div><label className={LABEL}>Moneda</label><input className={INPUT} value={form.currency} onChange={e => setF('currency', e.target.value)} /></div>

              <div><label className={LABEL}>Beneficios</label><textarea className={INPUT} rows={3} style={{ resize: 'none' }} value={form.benefits} onChange={e => setF('benefits', e.target.value)} /></div>
              <div><label className={LABEL}>Modo de uso</label><textarea className={INPUT} rows={3} style={{ resize: 'none' }} value={form.usage} onChange={e => setF('usage', e.target.value)} /></div>
              <div><label className={LABEL}>Advertencias</label><textarea className={INPUT} rows={2} style={{ resize: 'none' }} value={form.warnings} onChange={e => setF('warnings', e.target.value)} /></div>
              <div><label className={LABEL}>Mensaje de bienvenida</label><textarea className={INPUT} rows={2} style={{ resize: 'none' }} value={form.welcomeMessage} onChange={e => setF('welcomeMessage', e.target.value)} /></div>
              <div><label className={LABEL}>Primer mensaje del bot</label><textarea className={INPUT} rows={2} style={{ resize: 'none' }} value={form.firstMessage} onChange={e => setF('firstMessage', e.target.value)} /></div>
              <div><label className={LABEL}>Info de envío</label><textarea className={INPUT} rows={2} style={{ resize: 'none' }} value={form.shippingInfo} onChange={e => setF('shippingInfo', e.target.value)} /></div>
              <div><label className={LABEL}>Cobertura</label><input className={INPUT} value={form.coverage} onChange={e => setF('coverage', e.target.value)} /></div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="prod-active" checked={form.active} onChange={e => setF('active', e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                <label htmlFor="prod-active" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>Producto activo</label>
              </div>

              <button onClick={saveEdit} disabled={saving}
                style={{ padding: '12px 0', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer', border: 'none',
                  background: saving ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #D203DD, #00FF88)', color: saving ? 'rgba(255,255,255,0.3)' : '#000' }}>
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ DELETE CONFIRM ═══ */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 28, maxWidth: 380, width: '100%' }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>¿Eliminar producto?</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
              <span style={{ color: '#fff', fontWeight: 600 }}>{deleteConfirm.name}</span>
            </p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 20 }}>
              Esta acción no se puede deshacer. El producto será eliminado del sistema.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Cancelar</button>
              <button onClick={doDelete} disabled={deleting} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
