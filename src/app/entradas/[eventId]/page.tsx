'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, AlertCircle, CheckCircle2, Upload, Copy } from 'lucide-react'

interface TicketType {
  id: string
  name: string
  price: number
  capacity: number | null
  available: number | null
  soldOut: boolean
}

interface EventData {
  id: string
  title: string
  description: string
  image?: string | null
  date?: string | null
  location?: string | null
  ticketTypes: TicketType[]
}

type Step = 'info' | 'form' | 'payment' | 'done'
type PayMethod = 'MANUAL' | 'CRYPTO'

const INPUT = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-purple-500/50 placeholder-white/20'
const LABEL = 'block text-xs text-white/40 mb-1.5 font-bold uppercase tracking-widest'

export default function PublicTicketPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const [event, setEvent] = useState<EventData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [step, setStep] = useState<Step>('info')
  const [selectedType, setSelectedType] = useState<TicketType | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [payMethod, setPayMethod] = useState<PayMethod>('MANUAL')
  const [proofUrl, setProofUrl] = useState('')
  const [txHash, setTxHash] = useState('')
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [ticketCode, setTicketCode] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [copied, setCopied] = useState(false)

  const [cryptoEnabled, setCryptoEnabled] = useState(false)
  const [manualEnabled, setManualEnabled] = useState(true)
  const [qrUrl, setQrUrl] = useState('')
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  useEffect(() => {
    fetch(`/api/entradas/${eventId}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setNotFound(true); setLoading(false); return }
        setEvent(d.event)
        // Auto-select if only one type
        if (d.event.ticketTypes?.length === 1) setSelectedType(d.event.ticketTypes[0])
        setLoading(false)
      })
      .catch(() => { setNotFound(true); setLoading(false) })

    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        const s = d.settings ?? {}
        const crypto = s['STORE_PAYMENT_CRYPTO'] === 'true'
        const manual = s['STORE_PAYMENT_MANUAL'] !== 'false'
        setCryptoEnabled(crypto)
        setManualEnabled(manual)
        setQrUrl(s['PAYMENT_QR_URL'] ?? '')
        setPayMethod(manual ? 'MANUAL' : 'CRYPTO')
        setSettingsLoaded(true)
      })
      .catch(() => { setManualEnabled(true); setSettingsLoaded(true) })
  }, [eventId])

  const uploadProof = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.url) setProofUrl(data.url)
      else setError('Error al subir imagen')
    } catch { setError('Error al subir imagen') }
    finally { setUploading(false) }
  }

  const submit = async () => {
    if (!event || !selectedType) return
    setError('')
    if (payMethod === 'MANUAL' && !proofUrl) { setError('Debes subir tu comprobante de pago'); return }
    if (payMethod === 'CRYPTO' && !txHash.trim()) { setError('Debes ingresar el hash de la transacción'); return }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/entradas/${eventId}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: name, customerEmail: email, customerPhone: phone,
          ticketTypeId: selectedType.id, quantity,
          paymentMethod: payMethod, proofUrl, txHash,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al procesar'); return }
      setTicketCode(data.order.ticketCode)
      setIsPending(data.order.status === 'PENDING')
      setStep('done')
    } catch { setError('Error de conexión. Intenta de nuevo.') }
    finally { setSubmitting(false) }
  }

  const maxQty = selectedType?.available != null ? selectedType.available : 99
  const totalPrice = selectedType ? selectedType.price * quantity : 0

  const formatDate = (d: string) => new Date(d).toLocaleString('es-ES', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#07080F' }}>
      <Loader2 size={28} className="animate-spin text-purple-400" />
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: '#07080F' }}>
      <AlertCircle size={40} className="text-red-400" />
      <p className="text-white/50 text-sm">Evento no encontrado o no disponible</p>
    </div>
  )

  if (!event) return null

  const allSoldOut = event.ticketTypes.every(t => t.soldOut)

  return (
    <div className="min-h-screen" style={{ background: '#07080F' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/5" style={{ background: 'rgba(7,8,15,0.95)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-white font-black text-sm tracking-widest uppercase">MY DIAMOND</span>
          <span className="ml-auto text-xs text-white/20">Entradas</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Event image */}
        {event.image && (
          <div className="rounded-2xl overflow-hidden" style={{ maxHeight: 220 }}>
            <img src={event.image} alt={event.title} className="w-full object-cover" style={{ maxHeight: 220 }} />
          </div>
        )}

        {/* Event info */}
        <div>
          <h1 className="text-2xl font-black text-white leading-tight">{event.title}</h1>
          <div className="flex flex-wrap gap-3 mt-2">
            {event.date && <span className="text-xs text-white/40">📅 {formatDate(event.date)}</span>}
            {event.location && <span className="text-xs text-white/40">📍 {event.location}</span>}
          </div>
          <p className="text-sm text-white/50 mt-3 leading-relaxed">{event.description}</p>
        </div>

        {allSoldOut ? (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
            <AlertCircle size={18} className="text-red-400 shrink-0" />
            <p className="text-sm text-red-400 font-bold">Entradas agotadas</p>
          </div>
        ) : step === 'info' ? (
          <div className="space-y-4">
            {/* Ticket type selector */}
            <h2 className="text-xs font-black text-white/40 uppercase tracking-widest">Elige tu tipo de entrada</h2>
            <div className="space-y-2">
              {event.ticketTypes.map(tt => (
                <button
                  key={tt.id}
                  disabled={tt.soldOut}
                  onClick={() => { setSelectedType(tt); setQuantity(1) }}
                  className="w-full text-left transition-all active:scale-[0.99]"
                  style={{
                    padding: '14px 16px', borderRadius: 14,
                    border: selectedType?.id === tt.id ? '2px solid rgba(210,3,221,0.6)' : '1px solid rgba(255,255,255,0.08)',
                    background: tt.soldOut ? 'rgba(255,255,255,0.02)' : selectedType?.id === tt.id ? 'rgba(210,3,221,0.08)' : 'rgba(255,255,255,0.03)',
                    opacity: tt.soldOut ? 0.5 : 1,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-black text-white text-sm">{tt.name}</p>
                      {tt.available != null && !tt.soldOut && tt.available <= 10 && (
                        <p className="text-xs text-orange-400 mt-0.5">Solo {tt.available} disponibles</p>
                      )}
                      {tt.soldOut && <p className="text-xs text-red-400 mt-0.5">Agotado</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-black text-white">${tt.price.toFixed(2)}</p>
                      <p className="text-xs text-white/30">USDT</p>
                    </div>
                  </div>
                  {selectedType?.id === tt.id && (
                    <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                      <span className="text-xs text-white/50">Cantidad</span>
                      <div className="flex items-center gap-3">
                        <button onClick={e => { e.stopPropagation(); setQuantity(q => Math.max(1, q - 1)) }} className="w-7 h-7 rounded-full bg-white/10 text-white font-bold flex items-center justify-center hover:bg-white/20 text-sm">−</button>
                        <span className="text-white font-black w-5 text-center">{quantity}</span>
                        <button onClick={e => { e.stopPropagation(); setQuantity(q => Math.min(maxQty, q + 1)) }} className="w-7 h-7 rounded-full bg-white/10 text-white font-bold flex items-center justify-center hover:bg-white/20 text-sm">+</button>
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {selectedType && (
              <>
                <div className="flex items-center justify-between px-1">
                  <span className="text-sm text-white/40">Total</span>
                  <span className="text-xl font-black text-white">${totalPrice.toFixed(2)} <span className="text-xs text-white/30">USDT</span></span>
                </div>
                <button
                  onClick={() => setStep('form')}
                  className="w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg,#D203DD,#0D1E79)', color: '#fff', boxShadow: '0 8px 32px rgba(210,3,221,0.3)' }}
                >
                  Comprar entrada →
                </button>
              </>
            )}
          </div>

        ) : step === 'form' ? (
          <div className="space-y-4">
            {/* Summary bar */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl border border-white/8" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <span className="text-xs text-white/40">{selectedType?.name} · x{quantity}</span>
              <span className="text-sm font-black text-white">${totalPrice.toFixed(2)} USDT</span>
            </div>

            <h2 className="text-xs font-black text-white/40 uppercase tracking-widest">Tus datos</h2>
            <div><label className={LABEL}>Nombre completo</label>
              <input className={INPUT} value={name} onChange={e => setName(e.target.value)} placeholder="Juan Pérez" />
            </div>
            <div><label className={LABEL}>Correo electrónico</label>
              <input className={INPUT} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="juan@correo.com" />
            </div>
            <div><label className={LABEL}>Teléfono / WhatsApp</label>
              <input className={INPUT} type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555 000 0000" />
            </div>

            {error && <p className="text-xs text-red-400 font-bold text-center">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => { setError(''); setStep('info') }} className="flex-1 py-3 rounded-2xl text-sm font-bold text-white/40 border border-white/10 hover:text-white/60">← Atrás</button>
              <button
                onClick={() => {
                  if (!name.trim() || !email.trim() || !phone.trim()) { setError('Completa todos los campos'); return }
                  if (!email.includes('@')) { setError('Email inválido'); return }
                  setError(''); setStep('payment')
                }}
                className="flex-[2] py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg,#D203DD,#0D1E79)', color: '#fff' }}
              >Continuar →</button>
            </div>
          </div>

        ) : step === 'payment' ? (
          <div className="space-y-4">
            {/* Summary bar */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl border border-white/8" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <span className="text-xs text-white/40">{selectedType?.name} · x{quantity}</span>
              <span className="text-sm font-black text-white">${totalPrice.toFixed(2)} USDT</span>
            </div>

            <h2 className="text-xs font-black text-white/40 uppercase tracking-widest">Método de pago</h2>

            {!settingsLoaded ? (
              <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-white/20" /></div>
            ) : !cryptoEnabled && !manualEnabled ? (
              <div className="flex items-center gap-3 p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl">
                <AlertCircle size={18} className="text-orange-400 shrink-0" />
                <p className="text-sm text-orange-400 font-bold">Métodos de pago no disponibles. Contacta al organizador.</p>
              </div>
            ) : (
              <>
                {(cryptoEnabled && manualEnabled) && (
                  <div className="flex gap-2 bg-white/[0.025] border border-white/8 rounded-2xl p-1.5">
                    <button onClick={() => setPayMethod('MANUAL')} className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${payMethod === 'MANUAL' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}>🏦 Transferencia</button>
                    <button onClick={() => setPayMethod('CRYPTO')} className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${payMethod === 'CRYPTO' ? 'bg-yellow-500 text-black' : 'text-white/40 hover:text-white/60'}`}>₮ USDT</button>
                  </div>
                )}

                {payMethod === 'MANUAL' && (
                  <div className="space-y-3">
                    {qrUrl && (
                      <div className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-white/8" style={{ background: 'rgba(255,255,255,0.025)' }}>
                        <p className="text-xs text-white/40">Escanea el QR para pagar</p>
                        <img src={qrUrl} alt="QR Pago" className="w-40 h-40 rounded-xl object-contain bg-white p-1" />
                      </div>
                    )}
                    <div>
                      <label className={LABEL}>Sube tu comprobante</label>
                      <label className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-dashed border-white/20 cursor-pointer hover:border-purple-500/40 transition-colors text-sm text-white/40">
                        {uploading ? <Loader2 size={16} className="animate-spin" /> : proofUrl ? <><CheckCircle2 size={16} className="text-green-400" /> Comprobante subido</> : <><Upload size={16} /> Seleccionar imagen</>}
                        <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadProof(f); e.target.value = '' }} />
                      </label>
                    </div>
                  </div>
                )}

                {payMethod === 'CRYPTO' && (
                  <div>
                    <label className={LABEL}>Hash de transacción USDT (BEP-20)</label>
                    <input className={INPUT} value={txHash} onChange={e => setTxHash(e.target.value)} placeholder="0x..." />
                  </div>
                )}
              </>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <AlertCircle size={14} className="text-red-400 shrink-0" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => { setError(''); setStep('form') }} className="flex-1 py-3 rounded-2xl text-sm font-bold text-white/40 border border-white/10 hover:text-white/60">← Atrás</button>
              {(cryptoEnabled || manualEnabled) && (
                <button
                  onClick={submit}
                  disabled={submitting || uploading}
                  className="flex-[2] py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#D203DD,#0D1E79)', color: '#fff', boxShadow: '0 8px 32px rgba(210,3,221,0.3)' }}
                >
                  {submitting ? <span className="flex items-center justify-center gap-2"><Loader2 size={15} className="animate-spin" /> Procesando...</span> : 'Confirmar compra'}
                </button>
              )}
            </div>
          </div>

        ) : (
          <div className="space-y-4 text-center py-4">
            <CheckCircle2 size={48} className="mx-auto text-green-400" />
            <div>
              <h2 className="text-xl font-black text-white">{isPending ? '¡Solicitud enviada!' : '¡Entrada confirmada!'}</h2>
              <p className="text-sm text-white/40 mt-1">
                {isPending
                  ? 'Tu comprobante está en revisión. Al ser aprobado recibirás tu código por correo.'
                  : `Revisa tu correo: ${email}`}
              </p>
            </div>

            {!isPending && (
              <div className="p-6 rounded-2xl border-2" style={{ borderColor: 'rgba(210,3,221,0.4)', background: 'rgba(210,3,221,0.06)' }}>
                <p className="text-xs text-white/30 mb-3 uppercase tracking-widest">Tu código de entrada</p>
                <p className="text-3xl font-black tracking-[0.2em] text-white" style={{ fontFamily: 'Courier New, monospace' }}>{ticketCode}</p>
                <button
                  onClick={() => { navigator.clipboard.writeText(ticketCode); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                  className="mt-3 flex items-center gap-1.5 mx-auto text-xs text-white/40 hover:text-white/70 transition-colors"
                >
                  <Copy size={12} /> {copied ? '¡Copiado!' : 'Copiar código'}
                </button>
              </div>
            )}

            <p className="text-xs text-white/20">
              {isPending ? <>Guarda tu código: <strong className="text-white/40">{ticketCode}</strong></> : <>Código también enviado a: <strong className="text-white/40">{email}</strong></>}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
