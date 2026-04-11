'use client'

import { useState, useEffect, useCallback } from 'react'
import { Shield, CheckCircle2, Loader2, RefreshCw } from 'lucide-react'

const STORAGE_KEY = 'jd_permissions_granted'

type PermState = 'idle' | 'loading' | 'granted' | 'denied'

export default function PermissionsModal() {
  const [visible, setVisible] = useState(false)
  const [notifState, setNotifState] = useState<PermState>('idle')
  const [requesting, setRequesting] = useState(false)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    const alreadyGranted = localStorage.getItem(STORAGE_KEY) === '1'
    if (!alreadyGranted) setVisible(true)
  }, [])

  const granted = notifState === 'granted'

  useEffect(() => {
    if (!granted) return
    localStorage.setItem(STORAGE_KEY, '1')
    setTimeout(() => setVisible(false), 800)
  }, [granted])

  const requestAll = useCallback(async () => {
    setRequesting(true)
    setDenied(false)
    setNotifState('loading')

    let notifOk = false
    try {
      if (typeof Notification === 'undefined') {
        notifOk = true // iOS Safari — not supported, skip
      } else if (Notification.permission === 'granted') {
        notifOk = true
      } else if (Notification.permission === 'denied') {
        notifOk = false
      } else {
        const p = await Notification.requestPermission()
        notifOk = p === 'granted'
      }
    } catch { notifOk = false }

    setNotifState(notifOk ? 'granted' : 'denied')
    setDenied(!notifOk)
    setRequesting(false)
  }, [])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(7,8,15,0.97)', backdropFilter: 'blur(12px)' }}>

      {/* Glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-purple-600/8 blur-[100px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-cyan-500/6 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-xs flex flex-col items-center text-center gap-6">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg" style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
            <img src="/logo.png" alt="JD" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-base font-black tracking-[0.18em] text-white uppercase">MY DIAMOND</h1>
        </div>

        {/* Message */}
        {granted ? (
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-green-400" />
            <p className="text-sm font-bold text-green-400">¡Todo listo! Entrando...</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <p className="text-sm font-black text-white">
                {denied ? 'Permiso denegado' : 'Permiso de notificaciones'}
              </p>
              <p className="text-[12px] text-white/35 leading-relaxed">
                {denied
                  ? 'Debes activar las notificaciones en la configuración de tu navegador. Haz clic en el ícono 🔒 en la barra de direcciones → Notificaciones → Permitir → recarga la página.'
                  : 'Acepta las notificaciones para recibir alertas importantes de la plataforma.'}
              </p>
            </div>

            <button
              onClick={requestAll}
              disabled={requesting}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-black uppercase tracking-[0.12em] transition-all active:scale-[0.98] disabled:opacity-60"
              style={{
                background: denied
                  ? 'linear-gradient(135deg, #7f1d1d, #581c87)'
                  : 'linear-gradient(135deg, #D203DD, #0D1E79)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 8px 32px rgba(210,3,221,0.35)',
              }}
            >
              {requesting
                ? <><Loader2 size={16} className="animate-spin" /> Solicitando...</>
                : denied
                ? <><RefreshCw size={15} /> Reintentar</>
                : <><Shield size={15} /> Activar notificaciones</>
              }
            </button>
          </>
        )}
      </div>
    </div>
  )
}
