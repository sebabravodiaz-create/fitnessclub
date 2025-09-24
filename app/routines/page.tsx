import { getSupabaseServerClient } from '@/lib/supabaseServerClient'

export const revalidate = 30
export const runtime = 'nodejs'

export default async function RoutinesPage() {
  try {
    const supabase = getSupabaseServerClient()
    const { data: routines, error } = await supabase
      .from('routines')
      .select('id, title, description, pdf_url')
      .eq('is_public', true)
      .order('created_at', { ascending: false })

    if (error) {
      return <main className="max-w-3xl mx-auto p-6"><p>Error: {error.message}</p></main>
    }

    return (
      <main className="max-w-3xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-4">Rutinas</h1>
        <ul className="space-y-4">
          {(routines ?? []).map((r) => (
            <li key={r.id} className="border rounded-xl p-4">
              <h2 className="text-xl font-semibold">{r.title}</h2>
              {r.description && <p className="text-sm opacity-80">{r.description}</p>}
              <a className="underline mt-2 inline-block" href={r.pdf_url} target="_blank" rel="noreferrer">
                Ver PDF
              </a>
            </li>
          ))}
        </ul>
      </main>
    )
  } catch (err: any) {
    return (
      <main className="max-w-3xl mx-auto p-6">
        <p>Error al cargar rutinas: {err?.message || 'configura las variables de entorno de Supabase.'}</p>
      </main>
    )
  }
}
