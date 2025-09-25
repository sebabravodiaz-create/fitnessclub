'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Athlete = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  rut: string | null
  created_at: string
}

type Plan = 'Mensual' | 'Anual'

type AccessLog = {
  id: string
  ts: string
  result: string // 'allowed' | 'denied' | 'expired' | 'unknown_card' (guardamos como string para evitar choques de tipos)
  card_uid: string | null
  note: string | null
}

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10)
}
function addMonths(date: Date, months: number) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

export default function AthleteEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [ath, setAth] = useState<Athlete | null>(null)

  // RFID (mostrar activo; al guardar: desactivar previos + crear uno nuevo)
  const [rfid, setRfid] = useState<string>('')

  // Membresía NUEVA (histórico)
  const [memPlan, setMemPlan] = useState<Plan>('Mensual')
  const [memStart, setMemStart] = useState<string>('') // YYYY-MM-DD
  const [memEnd, setMemEnd] = useState<string>('')     // YYYY-MM-DD

  // Vigente actual (solo lectura)
  const [currentStart, setCurrentStart] = useState<string>('')
  const [currentEnd, setCurrentEnd] = useState<string>('')

  // Historial de accesos
  const [access, setAccess] = useState<AccessLog[]>([])

  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Eliminar (acertijo)
  const [delWord, setDelWord] = useState<string>('')
  const [delInput, setDelInput] = useState<string>('')

  function makeChallengeWord() {
    const animals = ['puma','lince','condor','zorro','huemul','guanaco','pudu','jacana','monito','lechuza']
    const pick = animals[Math.floor(Math.random() * animals.length)]
    const token = Math.random().toString(36).slice(2,5).toUpperCase()
    return `${pick}-${token}`
  }

  async function loadAll() {
    setLoading(true)
    setMsg(null)

    // 1) Atleta
    const { data: a, error: aErr } = await supabase
      .from('athletes')
      .select('id, name, email, phone, rut, created_at')
      .eq('id', id)
      .maybeSingle()
    if (aErr) { setMsg(aErr.message); setLoading(false); return }
    setAth(a as Athlete)

    // 2) Tarjeta activa
    const { data: card } = await supabase
      .from('cards')
      .select('uid, active')
      .eq('athlete_id', id)
      .eq('active', true)
      .limit(1)
      .maybeSingle()
    setRfid((card as any)?.uid ?? '')

    // 3) Membresía vigente (para mostrar actual) + defaults para nueva
    const today = fmtDate(new Date())
    const { data: mem } = await supabase
      .from('memberships')
      .select('start_date, end_date, status, plan')
      .eq('athlete_id', id)
      .eq('status', 'active')
      .lte('start_date', today)
      .gte('end_date', today)
      .limit(1)
      .maybeSingle()

    const planFromMem = ((mem as any)?.plan as Plan) ?? 'Mensual'
    setCurrentStart((mem as any)?.start_date ?? '')
    setCurrentEnd((mem as any)?.end_date ?? '')
    setMemPlan(planFromMem)
    setMemStart(today)
    const base = new Date(today)
    setMemEnd(fmtDate(planFromMem === 'Anual' ? addMonths(base, 12) : addMonths(base, 1)))

    // 4) Historial de accesos (últimos 20)
    const { data: logs } = await supabase
      .from('access_logs')
      .select('id, ts, result, card_uid, note')
      .eq('athlete_id', id)
      .order('ts', { ascending: false })
      .limit(20)
    setAccess((logs as any[]) ?? [])

    setLoading(false)
  }

  useEffect(() => {
    setDelWord(makeChallengeWord())
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Recalcular fin al cambiar plan o start (para la NUEVA membresía)
  useEffect(() => {
    if (!memStart) return
    const base = new Date(memStart)
    const end = memPlan === 'Anual' ? addMonths(base, 12) : addMonths(base, 1)
    setMemEnd(fmtDate(end))
  }, [memPlan, memStart])

  // ---- Guardar datos básicos del atleta ----
  async function saveAthlete(e: React.FormEvent) {
    e.preventDefault()
    if (!ath) return
    setBusy(true); setMsg(null)

    const { error } = await supabase
      .from('athletes')
      .update({
        name: ath.name?.trim() || null,
        email: ath.email?.trim() || null,
        phone: ath.phone?.trim() || null,
        rut: ath.rut?.trim() || null,
      })
      .eq('id', ath.id)

    if (error) setMsg(error.message)
    else setMsg('Datos guardados.')
    setBusy(false)
  }

  // ---- Guardar/Asignar RFID con HISTÓRICO ----
  async function saveRFID() {
    if (!ath) return
    const uid = rfid.trim()
    if (!uid) { setMsg('RFID no puede estar vacío.'); return }

    setBusy(true); setMsg(null)

    // 1) Desactivar cualquier tarjeta activa anterior
    const { error: deactErr } = await supabase
      .from('cards')
      .update({ active: false })
      .eq('athlete_id', ath.id)
      .eq('active', true)
    if (deactErr) { setMsg(deactErr.message); setBusy(false); return }

    // 2) Crear nueva tarjeta activa con UID nuevo
    const { error: insErr } = await supabase
      .from('cards')
      .insert({ athlete_id: ath.id, uid, active: true })
    if (insErr) { setMsg(insErr.message); setBusy(false); return }

    setMsg('Nueva tarjeta asignada (histórico preservado).')
    setBusy(false)
  }

  // ---- Crear NUEVA membresía (histórico) ----
  async function createNewMembership() {
    if (!ath) return
    if (!memStart || !memEnd) { setMsg('Debes indicar fechas de inicio y fin.'); return }

    setBusy(true); setMsg(null)

    // 1) Expirar cualquier membresía activa
    const { error: expErr } = await supabase
      .from('memberships')
      .update({ status: 'expired' })
      .eq('athlete_id', ath.id)
      .eq('status', 'active')
    if (expErr) { setMsg(expErr.message); setBusy(false); return }

    // 2) Insertar la nueva
    const { error: insErr } = await supabase
      .from('memberships')
      .insert({
        athlete_id: ath.id,
        plan: memPlan,
        start_date: memStart,
        end_date: memEnd,
        status: 'active',
      })
    if (insErr) { setMsg(insErr.message); setBusy(false); return }

    setMsg('Nueva membresía creada (histórico preservado).')
    setCurrentStart(memStart)
    setCurrentEnd(memEnd)
    setBusy(false)
  }

  // ---- Eliminar atleta (asegurando FKs) ----
  async function handleDelete() {
    if (!ath) return
    if (delInput !== delWord) {
      setMsg('La palabra no coincide. Escríbela exactamente como aparece.')
      return
    }
    setBusy(true); setMsg(null)
    try {
      // 0) Quitar relación en access_logs (athlete_id es NULLABLE)
      const { error: logsNullErr } = await supabase
        .from('access_logs')
        .update({ athlete_id: null })
        .eq('athlete_id', ath.id)
      if (logsNullErr) throw logsNullErr

      // 1) Borrar tarjetas
      const { error: delCardsErr } = await supabase
        .from('cards')
        .delete()
        .eq('athlete_id', ath.id)
      if (delCardsErr) throw delCardsErr

      // 2) Borrar membresías
      const { error: delMembErr } = await supabase
        .from('memberships')
        .delete()
        .eq('athlete_id', ath.id)
      if (delMembErr) throw delMembErr

      // 3) Borrar atleta
      const { error: delAthErr } = await supabase
        .from('athletes')
        .delete()
        .eq('id', ath.id)
      if (delAthErr) throw delAthErr

      alert('Atleta eliminado correctamente.')
      router.replace('/admin/athletes')
    } catch (e: any) {
      setMsg(e?.message || 'Error al eliminar')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <main className="max-w-3xl mx-auto p-6">Cargando…</main>
  if (!ath) return <main className="max-w-3xl mx-auto p-6 text-red-600">No se encontró el atleta.</main>

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-8">
      <button onClick={() => router.back()} className="text-sm underline">← Volver</button>
      <h1 className="text-2xl font-bold">Editar Atleta</h1>

      {/* Datos del atleta */}
      <form onSubmit={saveAthlete} className="border rounded-xl p-4 bg-white space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-sm">
            Nombre completo
            <input
              className="border p-2 w-full rounded-lg"
              value={ath.name ?? ''}
              onChange={(e)=>setAth({...ath, name: e.target.value})}
            />
          </label>
          <label className="text-sm">
            RUT
            <input
              className="border p-2 w-full rounded-lg"
              value={ath.rut ?? ''}
              onChange={(e)=>setAth({...ath, rut: e.target.value})}
            />
          </label>
          <label className="text-sm">
            Email
            <input
              className="border p-2 w-full rounded-lg"
              value={ath.email ?? ''}
              onChange={(e)=>setAth({...ath, email: e.target.value})}
            />
          </label>
          <label className="text-sm">
            Teléfono
            <input
              className="border p-2 w-full rounded-lg"
              value={ath.phone ?? ''}
              onChange={(e)=>setAth({...ath, phone: e.target.value})}
            />
          </label>
        </div>
        <button disabled={busy} className="px-4 py-2 rounded-xl border shadow bg-white disabled:opacity-60">
          {busy ? 'Guardando…' : 'Guardar datos'}
        </button>
      </form>

      {/* Tarjeta RFID (histórico) */}
      <div className="border rounded-xl p-4 bg-white space-y-3">
        <h2 className="font-semibold">Tarjeta RFID</h2>
        <div className="flex gap-3 items-center">
          <input
            className="border p-2 rounded-lg"
            placeholder="UID de la tarjeta"
            value={rfid}
            onChange={(e)=>setRfid(e.target.value)}
          />
          <button disabled={busy} onClick={saveRFID} className="px-4 py-2 rounded-xl border shadow bg-white disabled:opacity-60">
            {busy ? 'Guardando…' : 'Asignar como nueva'}
          </button>
        </div>
        <p className="text-xs text-gray-500">
          Al guardar, se desactivan tarjetas anteriores y se crea una nueva activa con este UID.
        </p>
      </div>

      {/* Membresía (histórico) */}
      <div className="border rounded-xl p-4 bg-white space-y-3">
        <h2 className="font-semibold">Membresía</h2>

        {/* Actual vigente (solo lectura) */}
        <div className="text-sm text-gray-700">
          <div>Vigente actual: {currentStart ? `${new Date(currentStart).toLocaleDateString()} → ${new Date(currentEnd).toLocaleDateString()}` : '—'}</div>
        </div>

        {/* Nueva membresía */}
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="text-sm">
            Tipo de membresía
            <select
              className="border p-2 w-full rounded-lg"
              value={memPlan}
              onChange={(e)=>setMemPlan(e.target.value as Plan)}
            >
              <option value="Mensual">Mensual</option>
              <option value="Anual">Anual</option>
            </select>
          </label>
          <label className="text-sm">
            Fecha de inicio
            <input
              type="date"
              className="border p-2 w-full rounded-lg"
              value={memStart}
              onChange={(e)=>setMemStart(e.target.value)}
            />
          </label>
          <label className="text-sm">
            Fecha de vencimiento
            <input
              type="date"
              className="border p-2 w-full rounded-lg"
              value={memEnd}
              onChange={(e)=>setMemEnd(e.target.value)}
            />
          </label>
        </div>
        <div className="flex gap-3">
          <button disabled={busy} onClick={createNewMembership} className="px-4 py-2 rounded-xl border shadow bg-white disabled:opacity-60">
            {busy ? 'Guardando…' : 'Crear nueva membresía'}
          </button>
          <button
            disabled={busy}
            onClick={() => {
              const base = memStart ? new Date(memStart) : new Date()
              const end = memPlan === 'Anual' ? addMonths(base, 12) : addMonths(base, 1)
              setMemEnd(fmtDate(end))
            }}
            className="px-4 py-2 rounded-xl border shadow bg-white disabled:opacity-60"
          >
            Recalcular fin según plan
          </button>
        </div>
      </div>

      {/* Historial de accesos (últimos 20) */}
      <div className="border rounded-xl p-4 bg-white space-y-3">
        <h2 className="font-semibold">Historial de accesos (últimos 20)</h2>
        {access.length === 0 ? (
          <p className="text-sm text-gray-600">Sin registros.</p>
        ) : (
          <div className="overflow-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-3 py-2">Fecha y hora</th>
                  <th className="px-3 py-2">Resultado</th>
                  <th className="px-3 py-2">RFID</th>
                  <th className="px-3 py-2">Nota</th>
                </tr>
              </thead>
              <tbody>
                {access.map((l) => (
                  <tr key={l.id} className="border-t">
                    <td className="px-3 py-2">{new Date(l.ts).toLocaleString()}</td>
                    <td className="px-3 py-2">{l.result}</td>
                    <td className="px-3 py-2">{l.card_uid ?? '—'}</td>
                    <td className="px-3 py-2">{l.note ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Eliminar atleta (con acertijo) */}
      <div className="border rounded-xl p-4 bg-white space-y-3">
        <h2 className="font-semibold text-red-700">Eliminar atleta</h2>
        <p className="text-sm text-gray-700">
          Esta acción eliminará al atleta y sus datos relacionados (tarjetas y membresías).
          El historial de accesos se conserva con <code>athlete_id = NULL</code>.
        </p>

        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm">
          Para confirmar, escribe exactamente esta palabra:&nbsp;
          <span className="font-mono font-semibold">{delWord}</span>
        </div>

        <div className="flex gap-3 items-center">
          <input
            className="border p-2 rounded-lg"
            placeholder="Escribe aquí la palabra"
            value={delInput}
            onChange={(e)=>setDelInput(e.target.value)}
          />
          <button
            disabled={busy || delInput !== delWord}
            onClick={handleDelete}
            className="px-4 py-2 rounded-xl border shadow bg-white disabled:opacity-60 text-red-700"
            title={delInput !== delWord ? 'Escribe la palabra exactamente' : 'Eliminar atleta'}
          >
            {busy ? 'Eliminando…' : 'Eliminar'}
          </button>
          <button
            type="button"
            className="text-sm underline"
            onClick={() => { setDelWord(makeChallengeWord()); setDelInput(''); }}
            title="Generar otra palabra"
          >
            Cambiar palabra
          </button>
        </div>

        {msg && <p className="text-sm mt-2">{msg}</p>}
      </div>

      {msg && !msg.toLowerCase().includes('eliminar') && (
        <p className="text-sm text-green-700">{msg}</p>
      )}
    </main>
  )
}
