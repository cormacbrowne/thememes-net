// app/upload/page.tsx
'use client'

import { useAuth } from '@/app/providers'

export default function UploadPage() {
  const { session, loading } = useAuth()
  if (loading) return <p>Loading…</p>
  if (!session) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Login to upload</h1>
        <p>Only authenticated users can upload memes. Hit the Login button above.</p>
      </div>
    )
  }
  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">Upload Meme</h1>
      <p>Upload form coming next — this page is now protected ✅</p>
    </div>
  )
}
