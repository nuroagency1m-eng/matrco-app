'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function usePlanGuard() {
  const router = useRouter()

  useEffect(() => {
    fetch('/api/plan-status')
      .then(r => r.json())
      .then(d => {
        if ((d.plan ?? 'NONE') === 'NONE' || d.expired) {
          router.replace('/dashboard/services')
        }
      })
      .catch(() => {})
  }, [])
}
