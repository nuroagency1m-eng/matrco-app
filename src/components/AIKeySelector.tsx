'use client'

import { useState, useEffect } from 'react'
import { ShieldCheck, Key, Cpu, ChevronDown, Loader2, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface AIConfig {
  aiCredits: number
  preferOwnKey: boolean
  adminHasKey: boolean
  ownKey: { model: string; isValid: boolean; apiKeyMasked: string } | null
}

interface Props {
  /** Called when config changes (parent can re-fetch after toggle) */
  onChange?: (preferOwnKey: boolean) => void
  /** Compact mode — no description text, smaller */
  compact?: boolean
}

export default function AIKeySelector({ onChange, compact = false }: Props) {
  const [config, setConfig] = useState<AIConfig | null>(null)
  const [open, setOpen] = useState(false)
  const [toggling, setToggling] = useState(false)

  async function load() {
    const res = await fetch('/api/credits')
    if (res.ok) setConfig(await res.json())
  }

  useEffect(() => { load() }, [])

  async function toggle(preferOwn: boolean) {
    setToggling(true)
    await fetch('/api/credits', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferOwnKey: preferOwn }),
    })
    setToggling(false)
    setOpen(false)
    await load()
    onChange?.(preferOwn)
  }

  if (!config) return null

  const usingOwn = config.preferOwnKey && !!config.ownKey
  const usingAdmin = !usingOwn && config.adminHasKey
  const noSource = !usingOwn && !usingAdmin

  const label = usingOwn
    ? `Mi Key · ${config.ownKey?.model}`
    : usingAdmin
    ? `Admin AI · ${config.aiCredits} créditos`
    : 'Sin key configurada'

  const dotColor = usingOwn ? '#60a5fa' : usingAdmin ? '#a78bfa' : '#ef4444'

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 rounded-xl transition-all"
        style={{
          padding: compact ? '5px 10px' : '7px 14px',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          color: 'rgba(255,255,255,0.7)',
          fontSize: compact ? 11 : 12,
          fontWeight: 600,
        }}>
        <Cpu style={{ width: compact ? 12 : 14, height: compact ? 12 : 14 }} />
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: dotColor, boxShadow: `0 0 6px ${dotColor}` }}
        />
        <span>{label}</span>
        {toggling
          ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" />
          : <ChevronDown style={{ width: 12, height: 12, opacity: 0.5 }} />
        }
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div className="absolute right-0 mt-1.5 z-50 rounded-2xl overflow-hidden shadow-2xl"
            style={{
              width: 240,
              background: 'rgba(28,25,44,0.97)',
              border: '1px solid rgba(255,255,255,0.15)',
              backdropFilter: 'blur(20px)',
            }}>
            <div className="p-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Fuente de IA
              </p>
            </div>

            {/* Admin key option */}
            <button
              onClick={() => config.adminHasKey && toggle(false)}
              disabled={!config.adminHasKey || toggling}
              className="w-full flex items-center gap-3 p-3 transition-colors text-left"
              style={{
                background: usingAdmin ? 'rgba(162,102,255,0.12)' : 'transparent',
                opacity: !config.adminHasKey ? 0.4 : 1,
                cursor: !config.adminHasKey ? 'not-allowed' : 'pointer',
              }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(162,102,255,0.15)', border: '1px solid rgba(162,102,255,0.3)' }}>
                <ShieldCheck style={{ width: 13, height: 13, color: '#a78bfa' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white">Key del Admin</p>
                <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {config.adminHasKey ? `${config.aiCredits} créditos` : 'No configurada'}
                </p>
              </div>
              {usingAdmin && <div className="w-3 h-3 rounded-full bg-violet-400" />}
            </button>

            {/* Own key option */}
            <button
              onClick={() => config.ownKey?.isValid && toggle(true)}
              disabled={!config.ownKey?.isValid || toggling}
              className="w-full flex items-center gap-3 p-3 transition-colors text-left"
              style={{
                background: usingOwn ? 'rgba(154,203,255,0.1)' : 'transparent',
                opacity: !config.ownKey?.isValid ? 0.4 : 1,
                cursor: !config.ownKey?.isValid ? 'not-allowed' : 'pointer',
              }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(154,203,255,0.12)', border: '1px solid rgba(154,203,255,0.3)' }}>
                <Key style={{ width: 13, height: 13, color: '#7dd3fc' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white">Mi API Key</p>
                <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {config.ownKey?.isValid ? config.ownKey.apiKeyMasked : 'No configurada'}
                </p>
              </div>
              {usingOwn && <div className="w-3 h-3 rounded-full bg-sky-400" />}
            </button>

            {noSource && (
              <div className="px-3 pb-3">
                <Link href="/dashboard/wallet"
                  className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-bold"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
                  onClick={() => setOpen(false)}>
                  <ExternalLink style={{ width: 11, height: 11 }} />
                  Configurar key
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
