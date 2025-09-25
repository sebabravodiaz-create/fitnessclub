import { createClient } from '@supabase/supabase-js'

export const revalidate = 30

export default async function RoutinesPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anon) {
    console.warn('Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY para listar rutinas públicas')
    return (
      <main className="max-w-3xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-4">Rutinas</h1>
        <p className="text-sm opacity-70">
          Configura las variables de entorno de Supabase para mostrar esta página.
        </p>
      </main>
    )
  }

  const supabase = createClient(url, anon)

  const { data: routines, error } = await supabase
    .from('routines')
    .select('id, title, description, pdf_url')
    .eq('is_public', true)
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <main className="max-w-3xl mx-auto p-6">
        <p>Error: {error.message}</p>
      </main>
    )
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
}
