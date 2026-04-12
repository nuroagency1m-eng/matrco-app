'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Check,
  Upload,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  QrCode,
  AlertCircle,
  ExternalLink,
  Zap,
  Sparkles,
  Crown,
  ShieldCheck,
} from 'lucide-react'
import { PaymentGateway } from '@/components/PaymentGateway'

const PACK_INFO: Record<string, {
  name: string
  tagline: string
  color: string
  border: string
  bg: string
  icon: React.ElementType
  features: string[]
}> = {
  BASIC: {
    name: 'Pack Básico',
    tagline: 'Tu primer agente de ventas en WhatsApp',
    color: 'text-cyan-400',
    border: 'border-cyan-500/30',
    bg: 'bg-cyan-500/8',
    icon: Zap,
    features: ['1 agente AI de WhatsApp personalizado', 'Catálogo hasta 2 productos', '1 tienda virtual', '1 landing page con IA', 'Anuncios + Clipping'],
  },
  PRO: {
    name: 'Pack Pro',
    tagline: 'Vende, anuncia y escala sin límites',
    color: 'text-purple-400',
    border: 'border-purple-500/30',
    bg: 'bg-purple-500/8',
    icon: Sparkles,
    features: ['2 agentes AI de WhatsApp personalizados', 'Catálogo hasta 20 productos por agente', '2 tiendas virtuales', '3 landing pages con IA', 'Publicidad Meta / TikTok / Google'],
  },
  ELITE: {
    name: 'Pack Elite',
    tagline: 'El máximo poder para líderes de red',
    color: 'text-pink-400',
    border: 'border-pink-500/30',
    bg: 'bg-pink-500/8',
    icon: Crown,
    features: ['5 agentes AI de WhatsApp personalizados', 'Catálogo hasta 40 productos por agente', '5 tiendas virtuales', '6 landing pages con IA', 'Acceso exclusivo a nuevos lanzamientos'],
  },
}

function CheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const plan = (searchParams.get('plan') ?? '').toUpperCase()
  const isRenewal = searchParams.get('renewal') === 'true'
  const packInfo = PACK_INFO[plan]

  const [price, setPrice] = useState<number | null>(null)
  const [paymentQrUrl, setPaymentQrUrl] = useState<string | null>(null)
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [cryptoEnabled, setCryptoEnabled] = useState(true)
  const [manualEnabled, setManualEnabled] = useState(true)

  const [paymentMethod, setPaymentMethod] = useState<'MANUAL' | 'CRYPTO' | 'FASE_GLOBAL'>('CRYPTO')
  const [cryptoStatus, setCryptoStatus] = useState<'approved' | 'pending_verification' | null>(null)
  const [faseGlobalEnabled, setFaseGlobalEnabled] = useState(false)

  const [proofUrl, setProofUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Fase Global fields
  const [faseGlobalCode, setFaseGlobalCode] = useState('')
  const [faseGlobalNote, setFaseGlobalNote] = useState('')
  const faseProofInputRef = useRef<HTMLInputElement>(null)

  const proofInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        const s = d.settings ?? {}
        if (isRenewal) {
          // Renovación siempre $19 (configurable vía PRICE_RENEWAL)
          setPrice(parseFloat(s['PRICE_RENEWAL'] ?? '19'))
        } else {
          setPrice(parseFloat(s[`PRICE_${plan}`] ?? (plan === 'BASIC' ? '49' : plan === 'PRO' ? '99' : '199')))
        }
        setPaymentQrUrl(s['PAYMENT_QR_URL'] || null)
        const crypto = s['STORE_PAYMENT_CRYPTO'] !== 'false'
        const manual = s['STORE_PAYMENT_MANUAL'] !== 'false'
        const faseGlobal = s['STORE_PAYMENT_FASE_GLOBAL'] === 'true'
        setCryptoEnabled(crypto)
        setManualEnabled(manual)
        setFaseGlobalEnabled(faseGlobal)
        // Auto-select the only available method
        if (!crypto && manual && !faseGlobal) setPaymentMethod('MANUAL')
        if (crypto && !manual && !faseGlobal) setPaymentMethod('CRYPTO')
        if (!crypto && !manual && faseGlobal) setPaymentMethod('FASE_GLOBAL')
        setLoadingSettings(false)
      })
      .catch(() => setLoadingSettings(false))
  }, [plan, isRenewal])

  async function uploadProof(file: File) {
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.url) {
        setProofUrl(data.url)
      } else {
        setError(data.error ?? 'Error al subir el comprobante. Inténtalo de nuevo.')
      }
    } catch {
      setError('Error al subir el comprobante. Verifica tu conexión e inténtalo de nuevo.')
    } finally {
      setUploading(false)
    }
  }

  async function submit() {
    setError('')
    if (!proofUrl) {
      setError('Sube tu comprobante de pago antes de continuar.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/pack-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, paymentProofUrl: proofUrl }),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess(true)
      } else {
        setError(data.error ?? 'Error al enviar solicitud')
      }
    } catch {
      setError('Error al enviar la solicitud. Verifica tu conexión e inténtalo de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  async function submitFaseGlobal() {
    setError('')
    if (!proofUrl) { setError('Debes subir tu comprobante de Fase Global.'); return }
    if (!faseGlobalCode.trim()) { setError('Debes ingresar tu código de Fase Global.'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/pack-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: 'BASIC',
          paymentMethod: 'FASE_GLOBAL',
          paymentProofUrl: proofUrl,
          faseGlobalCode: faseGlobalCode.trim(),
          faseGlobalNote: faseGlobalNote.trim(),
        }),
      })
      const data = await res.json()
      if (res.ok) { setSuccess(true) }
      else { setError(data.error ?? 'Error al enviar solicitud') }
    } catch {
      setError('Error al enviar la solicitud. Verifica tu conexión e inténtalo de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!packInfo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <AlertCircle className="text-red-400" size={28} />
        <p className="text-white/50 text-sm">Plan no válido.</p>
        <button onClick={() => router.push('/dashboard/store')} className="text-xs text-purple-400 hover:text-purple-300">
          ← Volver a la tienda
        </button>
      </div>
    )
  }

  if (success || cryptoStatus) {
    const isInstant = cryptoStatus === 'approved'
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center px-4">
        <div className={`w-16 h-16 rounded-3xl ${isInstant ? 'bg-yellow-500/15 border border-yellow-500/30' : 'bg-green-500/15 border border-green-500/30'} flex items-center justify-center`}>
          <CheckCircle2 size={32} className={isInstant ? 'text-yellow-400' : 'text-green-400'} />
        </div>
        <div>
          <h2 className="text-xl font-black text-white">
            {isInstant ? (isRenewal ? '¡Plan renovado!' : '¡Plan activado!') : '¡Solicitud enviada!'}
          </h2>
          <p className="text-sm text-white/40 mt-2 max-w-xs mx-auto">
            {isInstant
              ? isRenewal
                ? 'Tu plan fue renovado por 30 días más. El pago fue verificado en la blockchain.'
                : `Tu ${packInfo.name} fue activado automáticamente. El pago fue verificado en la blockchain.`
              : cryptoStatus === 'pending_verification'
                ? 'Pago recibido. Tu plan se renovará en minutos una vez confirmado en la red.'
                : isRenewal
                  ? 'Recibimos tu comprobante. El equipo revisará y renovará tu plan en menos de 24 horas.'
                  : `Recibimos tu comprobante. El equipo revisará tu pago y activará tu ${packInfo.name} en menos de 24 horas.`}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/30 bg-white/5 border border-white/8 rounded-xl px-4 py-3">
          <ShieldCheck size={13} className={isInstant ? 'text-yellow-400' : 'text-green-400'} />
          {isInstant ? 'Plan activo · Verificado on-chain' : 'Tu solicitud está en revisión · Estado: Pendiente'}
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-sm font-bold text-purple-400 hover:text-purple-300 mt-2"
        >
          <ArrowLeft size={14} /> Ir al dashboard
        </button>
      </div>
    )
  }

  const Icon = packInfo.icon

  return (
    <div className="px-4 md:px-6 pt-6 max-w-3xl mx-auto pb-24 text-white space-y-6">

      {/* Back */}
      <button
        onClick={() => router.push('/dashboard/planes')}
        className="flex items-center gap-2 text-xs text-white/30 hover:text-white/60 transition-colors"
      >
        <ArrowLeft size={13} /> Volver a planes
      </button>

      {/* Header */}
      <div>
        <h1 className="text-xl font-black uppercase tracking-tighter">Checkout</h1>
        <p className="text-xs text-white/30 mt-0.5">Realiza tu pago y sube el comprobante</p>
      </div>

      {/* Order summary */}
      <div className={`rounded-2xl border ${packInfo.border} ${packInfo.bg} p-5`}>
        <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">Resumen del pedido</p>
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl border ${packInfo.border} ${packInfo.bg} flex items-center justify-center shrink-0`}>
            <Icon size={18} className={packInfo.color} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className={`text-base font-black ${packInfo.color}`}>{packInfo.name}</p>
              {isRenewal && (
                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/25 text-green-400">
                  Renovación
                </span>
              )}
            </div>
            <p className="text-xs text-white/30">{isRenewal ? 'Extender 30 días más tu plan actual' : packInfo.tagline}</p>
          </div>
        </div>
        <ul className="space-y-1.5 mb-4">
          {packInfo.features.map((f, i) => (
            <li key={i} className="flex items-start gap-2">
              <Check size={11} className={`${packInfo.color} shrink-0 mt-0.5`} />
              <span className="text-[11px] text-white/50">{f}</span>
            </li>
          ))}
        </ul>
        <div className={`pt-3 border-t ${packInfo.border} flex items-center justify-between`}>
          <span className="text-xs text-white/40 font-bold">Total a pagar</span>
          {loadingSettings ? (
            <Loader2 size={16} className="animate-spin text-white/30" />
          ) : (
            <span className="text-2xl font-black text-white">${price?.toFixed(2)} <span className="text-sm text-white/30">USD</span></span>
          )}
        </div>
      </div>

      {/* Tabs: método de pago — solo muestra los habilitados por el admin */}
      {!cryptoEnabled && !manualEnabled && !faseGlobalEnabled ? (
        <div className="flex items-center gap-3 py-4 px-4 bg-orange-500/8 border border-orange-500/20 rounded-2xl">
          <AlertCircle size={18} className="text-orange-400 shrink-0" />
          <p className="text-xs text-orange-400 font-bold">Los métodos de pago están temporalmente deshabilitados. Contacta al equipo.</p>
        </div>
      ) : (
        <div className="flex gap-2 bg-white/[0.025] border border-white/8 rounded-2xl p-1.5 flex-wrap">
          {cryptoEnabled && (
            <button
              onClick={() => { setPaymentMethod('CRYPTO'); setProofUrl(''); setError('') }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${paymentMethod === 'CRYPTO' ? 'bg-yellow-500 text-black' : 'text-white/40 hover:text-white/60'}`}
            >
              ₮ Pagar con USDT
            </button>
          )}
          {manualEnabled && (
            <button
              onClick={() => { setPaymentMethod('MANUAL'); setProofUrl(''); setError('') }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${paymentMethod === 'MANUAL' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
            >
              🏦 Transferencia
            </button>
          )}
          {faseGlobalEnabled && (
            <button
              onClick={() => { setPaymentMethod('FASE_GLOBAL'); setProofUrl(''); setError('') }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${paymentMethod === 'FASE_GLOBAL' ? 'bg-green-600 text-white' : 'text-white/40 hover:text-white/60'}`}
            >
              🌐 Fase Global
            </button>
          )}
        </div>
      )}

      {/* Pago CRYPTO */}
      {paymentMethod === 'CRYPTO' && cryptoEnabled && price !== null && (
        <div className="bg-white/[0.025] border border-white/8 rounded-2xl p-5">
          <PaymentGateway
            plan={plan}
            price={price}
            onSuccess={(status) => setCryptoStatus(status)}
            onCancel={() => setPaymentMethod('MANUAL')}
          />
        </div>
      )}

      {/* Pago MANUAL */}
      {paymentMethod === 'MANUAL' && manualEnabled && (
        <>
      {/* Aviso tipo de cambio */}
      <div className="flex items-start gap-3 bg-orange-500/8 border border-orange-500/25 rounded-2xl px-4 py-3">
        <span className="text-lg shrink-0">⚠️</span>
        <div>
          <p className="text-xs font-black text-orange-400">Tipo de cambio: Dólar paralelo Binance</p>
          <p className="text-[11px] text-orange-400/70 mt-0.5 leading-relaxed">
            Si pagas por transferencia bancaria o QR local, el monto en bolivianos se calcula según el <strong>dólar paralelo publicado en Binance P2P</strong> al momento del pago. Te recomendamos pagar con USDT para evitar diferencias de cambio.
          </p>
        </div>
      </div>

      {/* Step 1: QR de pago */}
      <div className="bg-white/[0.025] border border-white/8 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center text-[10px] font-black">1</div>
          <p className="text-sm font-black">Escanea el QR y realiza tu pago</p>
        </div>

        {loadingSettings ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-white/30" size={20} />
          </div>
        ) : paymentQrUrl ? (
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="w-40 h-40 rounded-2xl bg-white flex items-center justify-center border border-white/20 shrink-0 overflow-hidden">
              <img src={paymentQrUrl} alt="QR de pago" className="w-full h-full object-contain p-2" />
            </div>
            <div className="text-center sm:text-left space-y-2">
              <p className="text-xs text-white/50 leading-relaxed">
                Escanea el QR con tu app de billetera (Binance, Trust Wallet, MetaMask, etc.) y realiza el pago por exactamente:
              </p>
              <p className="text-2xl font-black text-yellow-400">${price?.toFixed(2)} USD</p>
              <a
                href={paymentQrUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300"
              >
                <ExternalLink size={11} /> Ver QR en pantalla completa
              </a>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 py-4 px-4 bg-orange-500/8 border border-orange-500/20 rounded-xl">
            <QrCode size={20} className="text-orange-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-orange-400">QR de pago no configurado</p>
              <p className="text-[11px] text-orange-400/60 mt-0.5">El administrador aún no ha subido el QR de pago. Comunícate con el equipo.</p>
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Upload proof */}
      <div className="bg-white/[0.025] border border-white/8 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center text-[10px] font-black">2</div>
          <p className="text-sm font-black">Sube tu comprobante de pago</p>
        </div>
        <p className="text-xs text-white/40">
          Después de realizar el pago, toma una captura de pantalla o foto del comprobante y súbela aquí.
        </p>

        <input
          ref={proofInputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) uploadProof(file)
          }}
        />

        {proofUrl ? (
          <div className="space-y-3">
            <div className="rounded-xl overflow-hidden border border-green-500/25 bg-green-500/5">
              <img src={proofUrl} alt="Comprobante" className="w-full max-h-48 object-contain bg-black/30" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-green-400" />
                <span className="text-xs text-green-400 font-bold">Comprobante subido</span>
              </div>
              <button
                onClick={() => { setProofUrl(''); if (proofInputRef.current) proofInputRef.current.value = '' }}
                className="text-xs text-white/30 hover:text-red-400 transition-colors"
              >
                Cambiar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => proofInputRef.current?.click()}
            disabled={uploading}
            className="w-full flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-white/10 rounded-xl text-white/30 hover:border-purple-500/40 hover:text-purple-400 transition-colors"
          >
            {uploading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span className="text-xs">Subiendo...</span>
              </>
            ) : (
              <>
                <Upload size={20} />
                <span className="text-xs font-bold">Subir comprobante de pago</span>
                <span className="text-[10px] text-white/20">PNG, JPG, PDF</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <AlertCircle size={13} className="text-red-400 shrink-0" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={submit}
        disabled={submitting || !proofUrl || uploading}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-sm transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <><Loader2 size={15} className="animate-spin" /> Enviando solicitud...</>
        ) : (
          <><CheckCircle2 size={15} /> Enviar solicitud de compra</>
        )}
      </button>

      <p className="text-center text-[11px] text-white/20">
        El equipo revisará tu comprobante y activará tu plan en menos de 24 horas.
      </p>
        </>
      )}

      {/* ── FASE GLOBAL ── */}
      {paymentMethod === 'FASE_GLOBAL' && faseGlobalEnabled && (
        <>
          {/* Aviso Pack Básico forzado */}
          <div className="flex items-start gap-3 bg-green-500/8 border border-green-500/25 rounded-2xl px-4 py-3">
            <span className="text-lg shrink-0">🌐</span>
            <div>
              <p className="text-xs font-black text-green-400">Recompra Fase Global · Pack Básico</p>
              <p className="text-[11px] text-green-400/70 mt-0.5 leading-relaxed">
                Con este método siempre se activa el <strong>Pack Básico</strong>, sin importar el plan seleccionado. Sube tu comprobante de recompra de Fase Global y completa los campos requeridos.
              </p>
            </div>
          </div>

          {/* Step 1: Comprobante */}
          <div className="bg-white/[0.025] border border-white/8 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center text-[10px] font-black">1</div>
              <p className="text-sm font-black">Sube tu comprobante de recompra</p>
            </div>
            <p className="text-xs text-white/40">
              Toma una foto o captura de pantalla de tu comprobante de recompra en Fase Global y súbela aquí.
            </p>

            <input
              ref={faseProofInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) uploadProof(file)
              }}
            />

            {proofUrl ? (
              <div className="space-y-3">
                <div className="rounded-xl overflow-hidden border border-green-500/25 bg-green-500/5">
                  <img src={proofUrl} alt="Comprobante" className="w-full max-h-48 object-contain bg-black/30" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-green-400" />
                    <span className="text-xs text-green-400 font-bold">Comprobante subido</span>
                  </div>
                  <button
                    onClick={() => { setProofUrl(''); if (faseProofInputRef.current) faseProofInputRef.current.value = '' }}
                    className="text-xs text-white/30 hover:text-red-400 transition-colors"
                  >
                    Cambiar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => faseProofInputRef.current?.click()}
                disabled={uploading}
                className="w-full flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-white/10 rounded-xl text-white/30 hover:border-green-500/40 hover:text-green-400 transition-colors"
              >
                {uploading ? (
                  <><Loader2 size={20} className="animate-spin" /><span className="text-xs">Subiendo...</span></>
                ) : (
                  <><Upload size={20} /><span className="text-xs font-bold">Subir comprobante</span><span className="text-[10px] text-white/20">PNG, JPG</span></>
                )}
              </button>
            )}
          </div>

          {/* Step 2: Código de Fase Global */}
          <div className="bg-white/[0.025] border border-white/8 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center text-[10px] font-black">2</div>
              <p className="text-sm font-black">Código de Fase Global <span className="text-red-400">*</span></p>
            </div>
            <p className="text-xs text-white/40">Ingresa tu código de miembro o usuario de Fase Global.</p>
            <input
              type="text"
              value={faseGlobalCode}
              onChange={e => setFaseGlobalCode(e.target.value)}
              placeholder="Ej: FG-123456"
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-green-500/50 transition-colors"
            />
          </div>

          {/* Step 3: Mensaje */}
          <div className="bg-white/[0.025] border border-white/8 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black">3</div>
              <p className="text-sm font-black">Mensaje / Nota <span className="text-white/30 text-xs font-normal">(opcional)</span></p>
            </div>
            <p className="text-xs text-white/40">¿Tienes algún mensaje o información adicional para el equipo?</p>
            <textarea
              value={faseGlobalNote}
              onChange={e => setFaseGlobalNote(e.target.value)}
              placeholder="Escribe tu mensaje aquí..."
              rows={3}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-green-500/50 transition-colors resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <AlertCircle size={13} className="text-red-400 shrink-0" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={submitFaseGlobal}
            disabled={submitting || !proofUrl || !faseGlobalCode.trim() || uploading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-green-600 hover:bg-green-500 text-white font-black text-sm transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <><Loader2 size={15} className="animate-spin" /> Enviando solicitud...</>
            ) : (
              <><CheckCircle2 size={15} /> Enviar solicitud Fase Global</>
            )}
          </button>

          <p className="text-center text-[11px] text-white/20">
            El equipo verificará tu recompra y activará tu Pack Básico en menos de 24 horas.
          </p>
        </>
      )}
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-purple-400" size={28} />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}
