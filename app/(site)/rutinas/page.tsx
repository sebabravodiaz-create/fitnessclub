'use client'
import { useEffect, useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabaseClient'

type Row = { name: string; url: string }

export default function RutinasPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string>('')
  const [step, setStep] = useState<'signin'|'list'>('signin')
  const [files, setFiles] = useState<Row[]>([])
  const [userId, setUserId] = useState<string>('')

  // Si ya hay sesión, salta directo a la lista
  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user
      if (u?.id) {
        setUserId(u.id)
        setStep('list')
        listFiles(u.id)
      }
    })
  }, [])

  const signInWithEmailOtp = async () => {
    setMessage('')
    if (!email) return setMessage('Escribe tu correo')
    const supabase = getSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + '/rutinas' }
    })
    if (error) return setMessage(error.message)
    setMessage('Te enviamos un enlace a tu correo. Revisa tu bandeja y vuelve aquí.')
  }

  const listFiles = async (uid: string) => {
    const supabase = getSupabaseBrowserClient()
    const { data, error } = await supabase.storage.from('rutinas').list(uid, {
      limit: 100, offset: 0, sortBy: { column: 'name', order: 'desc' }
    })
    if (error) { setMessage(error.message); return }
    const rows: Row[] = []
    for (const obj of data || []) {
      const path = `${uid}/${obj.name}`
      // PUBLIC
      const pub = supabase.storage.from('rutinas').getPublicUrl(path)
      let url = pub.data.publicUrl
      // PRIVADO (descomenta si tu bucket es Private)
//      const signed = await supabase.storage.from('rutinas').createSignedUrl(path, 60 * 60)
//      url = signed.data?.signedUrl || url

      rows.push({ name: obj.name, url })
    }
    setFiles(rows)
  }

  if (step === 'signin') {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-2xl shadow">
        <h1 className="text-2xl font-semibold">Mis Rutinas</h1>
        <p className="text-sm opacity-80 mt-1">Ingresa tu correo y te enviaremos un enlace de acceso.</p>
        <div className="grid gap-3 mt-4">
          <input type="email" placeholder="tu@correo.com" className="border rounded px-3 py-2" value={email} onChange={e=>setEmail(e.target.value)} />
          <button onClick={signInWithEmailOtp} className="px-4 py-2 rounded bg-black text-white">Recibir enlace</button>
          {!!message && <p className="text-sm mt-1">{message}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-2xl shadow">
      <h1 className="text-2xl font-semibold">Mis Rutinas</h1>
      <p className="text-xs opacity-60 mt-1">ID usuario: {userId}</p>

      <div className="mt-4 grid gap-2">
        {!files.length && <p className="opacity-70">Aún no tienes rutinas.</p>}
        {files.map((f) => (
          <a key={f.url} href={f.url} target="_blank" className="underline">{f.name}</a>
        ))}
      </div>
    </div>
  )
}
