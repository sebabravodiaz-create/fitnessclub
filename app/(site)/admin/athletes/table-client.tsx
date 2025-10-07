'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

type EmbeddedCard = { uid: string | null; active?: boolean | null; created_at?: string | null }
type EmbeddedMembership = { plan: string | null; start_date: string | null; end_date: string | null; status: string | null }

type AthleteRow = {
  id: string
  name: string
  email: string | null
  phone: string | null
  cards: EmbeddedCard[] | null
  memberships: EmbeddedMembership[] | null
}

export default function AthletesClient({ reloadSignal = 0 }: { reloadSignal?: number }) {
  const [rows, setRows] = useState<AthleteRow[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)

  const fmtDate = (v?: string | null) => v ?? '—'

  const load = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('athletes')
        .select(`
          id,
          name,
          email,
          phone,
          cards:cards(uid, active, created_at),
          memberships:memberships(plan, start_date, end_date, status)
        `)
        .order('name', { ascending: true })
        .order('created_at', { foreignTable: 'cards', ascending: false })
        .limit(1, { foreignTable: 'cards' })
        .order('start_date', { foreignTable: 'memberships', ascending: false })
        .limit(1, { foreignTable: 'memberships' })

      const needle = q.trim()
      if (needle) {
        query = query.or(`name.ilike.%${needle}%,email.ilike.%${needle}%,phone.ilike.%${needle}%`)
      }

      const { data, error } = await query
      if (error) throw error

      let out = (data as AthleteRow[]) || []
      if (needle) {
        const n = needle.toLowerCase()
        out = out.filter((r) => {
          const card = r.cards?.[0]
          const memb = r.memberships?.[0]
          const bag = [
            r.name || '',
            r.email || '',
            r.phone || '',
            card?.uid || '',
            memb?.plan || '',
            memb?.status || '',
          ].join(' ').toLowerCase()
          return bag.includes(n)
        })
      }

      setRows(out)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [reloadSignal])

  return (
    <div className="grid gap-4">
      {/* Buscador global */}
      <div className="flex gap-2 flex-wrap">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          placeholder="Buscar por nombre, email, teléfono, RFID, plan, estado…"
          className="border rounded px-3 py-2 min-w-[260px] flex-1"
        />
        <button onClick={load} className="px-3 py-2 rounded border">Buscar</button>
      </div>

      {/* Tabla */}
      <div className="rounded-xl bg-white shadow">
        <table className="min-w-full text-sm table-fixed">
          <thead className="bg-gray-100 text-left">
            <tr className="[&>th]:p-2 [&>th]:whitespace-nowrap">
              <th className="w-[48px]">#</th>
              <th className="w-[120px]">RFID</th>
              <th className="w-[220px]">NOMBRE</th>
              <th className="w-[260px]">EMAIL</th>
              <th className="w-[160px]">TELEFONO</th>
              <th className="w-[120px]">INICIO</th>
              <th className="w-[120px]">PLAN</th>
              <th className="w-[140px]">VENCIMIENTO</th>
              <th className="w-[100px]">ESTADO</th>
              <th className="w-[80px]">ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-2" colSpan={10}>Cargando…</td></tr>
            ) : rows.map((r, idx) => {
              const card = r.cards?.[0]
              const memb = r.memberships?.[0]
              return (
                <tr key={r.id} className="border-t [&>td]:p-2 [&>td]:whitespace-nowrap">
                  <td>{idx + 1}</td>
                  <td className="font-mono">{card?.uid ?? '—'}</td>
                  <td className="truncate">{r.name}</td>
                  <td className="truncate">{r.email ?? '—'}</td>
                  <td className="truncate">{r.phone ?? '—'}</td>
                  <td>{fmtDate(memb?.start_date)}</td>
                  <td className="capitalize">{memb?.plan ?? '—'}</td>
                  <td>{fmtDate(memb?.end_date)}</td>
                  <td className="capitalize">{memb?.status ?? '—'}</td>
                  <td>
                    <Link
                      href={`/admin/athletes/${r.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      Editar
                    </Link>
                  </td>
                </tr>
              )
            })}
            {!loading && !rows.length && (
              <tr><td className="p-2" colSpan={10}>Sin atletas.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
