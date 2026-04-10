'use client'

import { useState, useEffect } from 'react'
import {
  Cpu,
  Key,
  Sparkles,
  CheckCircle,
  XCircle,
  Trash2,
  Loader2,
  ShieldCheck,
  Eye,
  EyeOff,
  ToggleLeft,
  ToggleRight,
  Info,
} from 'lucide-react'

interface CreditsData {
  aiCredits: number
  preferOwnKey: boolean
  adminHasKey: boolean
  ownKey: {
    model: string
    isValid: boolean
    validatedAt: string | null
    apiKeyMasked: string
  } | null
}

export default function CreditsPage() {
  const [data, setData] = useState<CreditsData | null>(null)
  const [loading, setLoading] = useState(true)

  // API key form
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [model, setModel] = useState('gpt-4o')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [togglingPref, setTogglingPref] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/credits')
    const d = await res.json()
    setData(d)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function saveKey() {
    if (!apiKeyInput.trim()) return
    setMsg(null)
    setSaving(true)
    const res = await fetch('/api/credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: apiKeyInput.trim(), model }),
    })
    const d = await res.json()
    setSaving(false)
    if (res.ok) {
      setMsg({ type: 'ok', text: d.isValid ? '¡API Key guardada y validada correctamente!' : 'Key guardada pero no pudo validarse. Verifica que sea correcta.' })
      setApiKeyInput('')
      load()
    } else {
      setMsg({ type: 'err', text: d.error ?? 'Error al guardar' })
    }
  }

  async function deleteKey() {
    if (!confirm('¿Eliminar tu API Key?')) return
    setDeleting(true)
    await fetch('/api/credits', { method: 'DELETE' })
    setDeleting(false)
    load()
  }

  async function togglePreference() {
    if (!data) return
    setTogglingPref(true)
    await fetch('/api/credits', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferOwnKey: !data.preferOwnKey }),
    })
    setTogglingPref(false)
    load()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-2 rounded-full animate-spin"
          style={{ borderColor: 'rgba(255,255,255,0.1)', borderTopColor: '#a78bfa' }} />
      </div>
    )
  }

  const canUseAdminKey = data?.adminHasKey
  const hasOwnKey = !!data?.ownKey
  const usingAdmin = !data?.preferOwnKey

  return (
    <div className="px-4 sm:px-6 pt-6 max-w-2xl mx-auto pb-24 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, rgba(154,203,255,0.15), rgba(162,102,255,0.15))', border: '1px solid rgba(255,255,255,0.15)' }}>
          <Cpu className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h1 className="text-xl font-medium text-white tracking-widest uppercase">Créditos AI</h1>
          <p className="text-xs font-light tracking-widest mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Gestiona tu acceso a los servicios de inteligencia artificial
          </p>
        </div>
      </div>

      {/* Decorative line */}
      <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, rgba(162,102,255,0.4), rgba(154,203,255,0.2), transparent)' }} />

      {/* Credits Balance Card */}
      <div className="relative rounded-2xl p-6 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(154,203,255,0.12) 0%, rgba(255,125,224,0.12) 50%, rgba(162,102,255,0.12) 100%)',
          border: '1px solid rgba(255,255,255,0.15)',
          backdropFilter: 'blur(16px)',
        }}>
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(162,102,255,0.5), transparent)' }} />
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-15"
          style={{ background: 'radial-gradient(circle, #a78bfa, transparent)' }} />

        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Créditos AI asignados
          </span>
        </div>

        <div className="flex items-end gap-3 mb-4">
          <span className="text-5xl font-black text-white tabular-nums">{data?.aiCredits ?? 0}</span>
          <span className="text-sm font-light mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>créditos disponibles</span>
        </div>

        <p className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Los créditos son asignados por el administrador y se descuentan con cada uso de IA.
        </p>
      </div>

      {/* Key source preference */}
      <div className="relative rounded-2xl p-5 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(154,203,255,0.12) 0%, rgba(255,125,224,0.12) 50%, rgba(162,102,255,0.12) 100%)',
          border: '1px solid rgba(255,255,255,0.15)',
          backdropFilter: 'blur(16px)',
        }}>
        <p className="text-[10px] font-black uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Fuente de IA activa
        </p>

        <div className="space-y-3">
          {/* Admin key option */}
          <button
            onClick={() => data?.preferOwnKey && togglePreference()}
            disabled={!canUseAdminKey || togglingPref}
            className="w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200 text-left"
            style={{
              background: usingAdmin && canUseAdminKey ? 'rgba(162,102,255,0.15)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${usingAdmin && canUseAdminKey ? 'rgba(162,102,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
              opacity: !canUseAdminKey ? 0.5 : 1,
              cursor: !canUseAdminKey ? 'not-allowed' : 'pointer',
            }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(162,102,255,0.15)', border: '1px solid rgba(162,102,255,0.3)' }}>
              <ShieldCheck className="w-4 h-4 text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">Key del Administrador</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {canUseAdminKey
                  ? `Usa los créditos asignados (${data?.aiCredits ?? 0} disponibles)`
                  : 'El administrador aún no ha configurado una key'}
              </p>
            </div>
            <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${usingAdmin && canUseAdminKey ? 'border-violet-400 bg-violet-400' : 'border-white/20'}`} />
          </button>

          {/* Own key option */}
          <button
            onClick={() => !data?.preferOwnKey && togglePreference()}
            disabled={!hasOwnKey || togglingPref}
            className="w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200 text-left"
            style={{
              background: !usingAdmin && hasOwnKey ? 'rgba(154,203,255,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${!usingAdmin && hasOwnKey ? 'rgba(154,203,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
              opacity: !hasOwnKey ? 0.5 : 1,
              cursor: !hasOwnKey ? 'not-allowed' : 'pointer',
            }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(154,203,255,0.12)', border: '1px solid rgba(154,203,255,0.3)' }}>
              <Key className="w-4 h-4 text-sky-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">Mi Propia API Key</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {hasOwnKey
                  ? `${data?.ownKey?.apiKeyMasked} · ${data?.ownKey?.model}`
                  : 'Configura tu key de OpenAI abajo'}
              </p>
            </div>
            <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${!usingAdmin && hasOwnKey ? 'border-sky-400 bg-sky-400' : 'border-white/20'}`} />
          </button>
        </div>

        {togglingPref && (
          <div className="flex items-center gap-2 mt-3 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
            <Loader2 className="w-3 h-3 animate-spin" /> Guardando preferencia...
          </div>
        )}
      </div>

      {/* My OpenAI API Key */}
      <div className="relative rounded-2xl p-5 overflow-hidden space-y-4"
        style={{
          background: 'linear-gradient(135deg, rgba(154,203,255,0.12) 0%, rgba(255,125,224,0.12) 50%, rgba(162,102,255,0.12) 100%)',
          border: '1px solid rgba(255,255,255,0.15)',
          backdropFilter: 'blur(16px)',
        }}>
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(154,203,255,0.4), transparent)' }} />

        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-sky-400" />
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Mi API Key de OpenAI
          </p>
        </div>

        {/* Current key status */}
        {data?.ownKey && (
          <div className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: data.ownKey.isValid ? 'rgba(0,255,136,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${data.ownKey.isValid ? 'rgba(0,255,136,0.3)' : 'rgba(239,68,68,0.3)'}`,
              }}>
              {data.ownKey.isValid
                ? <CheckCircle className="w-4 h-4 text-green-400" />
                : <XCircle className="w-4 h-4 text-red-400" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-mono text-white">{data.ownKey.apiKeyMasked}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {data.ownKey.isValid ? `Válida · ${data.ownKey.model}` : 'No válida — actualiza la key'}
              </p>
            </div>
            <button onClick={deleteKey} disabled={deleting}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
              title="Eliminar key">
              {deleting ? <Loader2 className="w-3.5 h-3.5 text-red-400 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 text-red-400" />}
            </button>
          </div>
        )}

        {/* Add/Update key form */}
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest mb-1.5 block" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {data?.ownKey ? 'Actualizar API Key' : 'Agregar API Key de OpenAI'}
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                placeholder="sk-proj-..."
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
                className="w-full rounded-xl px-4 py-3 pr-11 text-sm font-mono text-white placeholder-white/20 outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(154,203,255,0.4)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
              />
              <button
                type="button"
                onClick={() => setShowKey(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'rgba(255,255,255,0.3)' }}>
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest mb-1.5 block" style={{ color: 'rgba(255,255,255,0.35)' }}>Modelo</label>
            <select
              value={model}
              onChange={e => setModel(e.target.value)}
              className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <option value="gpt-4o">GPT-4o (Recomendado)</option>
              <option value="gpt-4o-mini">GPT-4o Mini (Económico)</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            </select>
          </div>

          {msg && (
            <div className={`flex items-start gap-2 p-3 rounded-xl text-xs ${msg.type === 'ok' ? 'text-green-400' : 'text-red-400'}`}
              style={{
                background: msg.type === 'ok' ? 'rgba(0,255,136,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${msg.type === 'ok' ? 'rgba(0,255,136,0.2)' : 'rgba(239,68,68,0.2)'}`,
              }}>
              {msg.type === 'ok' ? <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
              {msg.text}
            </div>
          )}

          <button
            onClick={saveKey}
            disabled={saving || !apiKeyInput.trim()}
            className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, rgba(154,203,255,0.25), rgba(162,102,255,0.25))', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}>
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Validando y guardando...
              </span>
            ) : (
              data?.ownKey ? 'Actualizar API Key' : 'Guardar API Key'
            )}
          </button>
        </div>

        {/* Info note */}
        <div className="flex items-start gap-2 p-3 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }} />
          <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Tu API Key se guarda cifrada con AES-256. Consíguela en{' '}
            <span className="text-sky-400">platform.openai.com/api-keys</span>. Al usar tu propia key, los costos se cargan directamente a tu cuenta de OpenAI.
          </p>
        </div>
      </div>

    </div>
  )
}
