// app/(site)/admin/athletes/new/page.tsx
'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { uploadAthletePhoto } from '@/lib/athletePhotos'

type Plan = 'Mensual' | 'Anual'

function toISO(d: Date) {
  return d.toISOString().slice(0,10)
}
function addMonths(date: Date, months: number) {
  const d = new Date(date); d.setMonth(d.getMonth() + months); return d
}

export default function AthleteNewPage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [rfid, setRfid] = useState('')

  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  const [plan, setPlan] = useState<Plan>('Mensual')
  const [start, setStart] = useState<string>(toISO(new Date()))
  const [end, setEnd] = useState<string>(toISO(addMonths(new Date(), 1)))

  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const onChangeStart = (v: string) => {
    setStart(v)
    const base = v ? new Date(v) : new Date()
    setEnd(toISO(addMonths(base, plan === 'Anual' ? 12 : 1)))
  }
  const onChangePlan = (p: Plan) => {
    setPlan(p)
    const base = start ? new Date(start) : new Date()
    setEnd(toISO(addMonths(base, p === 'Anual' ? 12 : 1)))
  }

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

  const onPhotoChange = (file: File | null) => {
    setPhotoFile(file)
    setPhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return file ? URL.createObjectURL(file) : null
    })
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setMsg(null)

    try {
      if (!name.trim()) throw new Error('Nombre es obligatorio')
      if (!rfid.trim()) throw new Error('RFID es obligatorio')

      // Verificar RFID único (usa maybeSingle ✅)
      const { data: existing, error: checkErr } = await supabase
        .from('cards')
        .select('id, athlete_id')
        .eq('uid', rfid.trim())
        .maybeSingle()
      if (checkErr) throw checkErr
      if (existing) throw new Error('Este RFID ya está asignado a otro atleta')

      // 1) Crear atleta
      const { data: created, error: aErr } = await supabase
        .from('athletes')
        .insert({ name: name.trim(), email: email.trim() || null, phone: phone.trim() || null })
        .select('id')
        .single()
      if (aErr) throw aErr
      const athleteId = created!.id as string

      // 1.1) Subir foto opcional
      if (photoFile) {
        const path = await uploadAthletePhoto(supabase, athleteId, photoFile)
        const { error: photoErr } = await supabase
          .from('athletes')
          .update({ photo_path: path })
          .eq('id', athleteId)
        if (photoErr) throw photoErr
      }

      // 2) Tarjeta activa
      const { error: cErr } = await supabase
        .from('cards')
        .insert({ athlete_id: athleteId, uid: rfid.trim(), active: true })
      if (cErr) throw cErr

      // 3) Membresía
      const { error: mErr } = await supabase
        .from('memberships')
        .insert({
          athlete_id: athleteId,
          plan,
          start_date: start,
          end_date: end,
          status: 'activo'
        })
      if (mErr) throw mErr

      setMsg('Atleta creado con éxito.')
      router.replace('/admin/athletes')
    } catch (e: any) {
      setMsg(e?.message || 'Error al crear atleta')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <button onClick={() => router.back()} className="text-sm underline">← Volver</button>
      <h1 className="text-2xl font-bold">Crear atleta</h1>

      <form onSubmit={handleCreate} className="border rounded-xl p-4 bg-white space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-sm">
            Nombre *
            <input className="border p-2 w-full rounded-lg" value={name} onChange={e=>setName(e.target.value)} required />
          </label>
          <label className="text-sm">
            RFID *
            <input className="border p-2 w-full rounded-lg" value={rfid} onChange={e=>setRfid(e.target.value)} required />
          </label>
          <label className="text-sm">
            Email
            <input type="email" className="border p-2 w-full rounded-lg" value={email} onChange={e=>setEmail(e.target.value)} />
          </label>
          <label className="text-sm">
            Teléfono
            <input className="border p-2 w-full rounded-lg" value={phone} onChange={e=>setPhone(e.target.value)} />
          </label>
        </div>

        <div className="space-y-2">
          <label className="text-sm block">
            Foto (opcional)
            <input
              type="file"
              accept="image/*"
              className="mt-1 text-sm"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null
                onPhotoChange(file)
                event.target.value = ''
              }}
            />
          </label>
          {photoPreview && (
            <div className="flex items-center gap-3">
              <img src={photoPreview} alt="Vista previa de la foto" className="w-24 h-24 rounded-full object-cover border" />
              <button
                type="button"
                onClick={() => onPhotoChange(null)}
                className="text-sm text-red-600 underline"
              >
                Quitar foto
              </button>
            </div>
          )}
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <label className="text-sm">
            Plan
            <select className="border p-2 w-full rounded-lg" value={plan} onChange={e=>onChangePlan(e.target.value as Plan)}>
              <option value="Mensual">Mensual</option>
              <option value="Anual">Anual</option>
            </select>
          </label>
          <label className="text-sm">
            Inicio
            <input
              type="date"
              className="border p-2 w-full rounded-lg"
              value={start}
              onChange={(e) => onChangeStart(e.target.value)}
            />
          </label>
          <label className="text-sm">
            Vencimiento
            <input type="date" className="border p-2 w-full rounded-lg" value={end} onChange={e=>setEnd(e.target.value)} />
          </label>
        </div>

        <button disabled={busy} className="px-4 py-2 rounded-xl border shadow bg-white disabled:opacity-60">
          {busy ? 'Creando…' : 'Crear atleta'}
        </button>
        {msg && <p className="text-sm mt-2">{msg}</p>}
      </form>
    </main>
  )
}
