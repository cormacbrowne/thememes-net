// app/login/page.tsx
'use client'

import { FormEvent, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  const signIn = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMessage('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) return alert(error.message)
    if (error) {
      setMessage(error.message)
      return
    }
    router.push('/')
  }

  const signUp = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMessage('')
    const { error } = await supabase.auth.signUp({ email, password })
    setBusy(false)
    if (error) return alert(error.message)
    alert('Check your email to confirm your account, then log in!')
    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Check your email to confirm your account, then log in!')
    }
  }

  const signInGoogle = async () => {
    setBusy(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      alert(error.message)
      setBusy(false)
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

  return (
    <div className="mx-auto max-w-sm rounded-2xl border border-white/10 p-6 shadow-lg">
      <h1 className="mb-4 text-2xl font-bold">Login</h1>
      <button
        onClick={signInGoogle}
        disabled={busy}
        className="mb-4 w-full rounded-xl border border-cyan-400/60 px-3 py-2 hover:bg-cyan-500/10 disabled:opacity-50"
      >
      <div className="mx-auto max-w-sm rounded-2xl border border-white/10 p-6 shadow-lg">
        <h1 className="mb-4 text-2xl font-bold">Login</h1>
        {message && <p className="mb-4 text-sm text-red-400">{message}</p>}
        <button
          onClick={signInGoogle}
          disabled={busy}
          className="mb-4 w-full rounded-xl border border-cyan-400/60 px-3 py-2 hover:bg-cyan-500/10 disabled:opacity-50"
        >
        {busy ? '…' : 'Continue with Google'}
      </button>
      <div className="my-4 h-px bg-white/10" />
      <form className="space-y-3" onSubmit={signIn}>
        <input
          type="email"
          placeholder="email"
          className="w-full rounded-xl border border-white/10 bg-black px-3 py-2 outline-none focus:border-fuchsia-400"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="password"
          className="w-full rounded-xl border border-white/10 bg-black px-3 py-2 outline-none focus:border-fuchsia-400"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="flex-1 rounded-xl border border-fuchsia-400/60 px-3 py-2 hover:bg-fuchsia-500/10 disabled:opacity-50"
          >
            {busy ? '…' : 'Sign in'}
