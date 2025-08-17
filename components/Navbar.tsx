// components/Navbar.tsx
'use client'

import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/app/providers'
import { useState } from 'react'

export default function Navbar() {
  const { session } = useAuth()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const handleGoogle = async () => {
    setBusy(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      alert(error.message)
      setBusy(false)
    const handleGoogle = async () => {
      setBusy(true)
      setMessage('')
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) {
        setMessage(error.message)
        setBusy(false)
      }
    }
  }

  const handleLogout = async () => {
    setBusy(true)
    const { error } = await supabase.auth.signOut()
    if (error) alert(error.message)
    setBusy(false)
  }
    const handleLogout = async () => {
      setBusy(true)
      setMessage('')
      const { error } = await supabase.auth.signOut()
      if (error) setMessage(error.message)
      setBusy(false)
    }

  return (
    <header className="sticky top-0 z-50 border-b border-fuchsia-500/40 bg-black/70 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
      <header className="sticky top-0 z-50 border-b border-fuchsia-500/40 bg-black/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-xl font-black tracking-wider">
          <span className="[text-shadow:_0_0_10px_#f0f,0_0_20px_#0ff]">the</span>
          <span className="text-fuchsia-400">MEMES</span>
          <span className="text-cyan-300">.net</span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link href="/upload" className="rounded-2xl border border-cyan-400/60 px-3 py-1 text-sm hover:bg-cyan-500/10">
            Upload
          </Link>
          {session ? (
            <button
              onClick={handleLogout}
              disabled={busy}
              className="rounded-2xl border border-fuchsia-400/60 px-3 py-1 text-sm hover:bg-fuchsia-500/10 disabled:opacity-50"
            >
              {busy ? '…' : 'Logout'}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-2xl border border-fuchsia-400/60 px-3 py-1 text-sm hover:bg-fuchsia-500/10"
              >
                Login
              </Link>
              <button
                onClick={handleGoogle}
                disabled={busy}
                className="rounded-2xl border border-cyan-400/60 px-3 py-1 text-sm hover:bg-cyan-500/10 disabled:opacity-50"
              >
                {busy ? '…' : 'Google'}
              </button>
            </div>
          )}
        </nav>
      </div>
      {/* neon zigzag border */}
      <div className="h-1 w-full bg-[repeating-linear-gradient(45deg,_#f0f_0_10px,_#0ff_10px_20px)]" />
    </header>
  )
}
        </div>
        {message && <p className="px-4 pb-2 text-sm text-red-400">{message}</p>}
        {/* neon zigzag border */}
        <div className="h-1 w-full bg-[repeating-linear-gradient(45deg,_#f0f_0_10px,_#0ff_10px_20px)]" />
      </header>
    )
  }
