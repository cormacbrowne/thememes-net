// app/auth/callback/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function AuthCallback() {
  const [msg, setMsg] = useState('Finishing sign‑in…')
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    const go = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (error) setMsg(error.message)
      if (!cancelled) {
        if (data.session) router.replace('/')
        else setMsg('No active session. Try logging in again.')
      }
    }
    go()
    // allow time for hash parsing
    const t = setTimeout(go, 600)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [router])

  return <p>{msg}</p>
}
