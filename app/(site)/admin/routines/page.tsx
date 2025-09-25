'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

type FileRow = { name: string; url: string; created_at?: string }

export default function RoutinesAdminPage() {
  const [status, setStatus] = useState('')
  const [files, setFiles] = useState<FileRow[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    listAllFiles()
  }, [])

  const listAllFiles = async () => {
    setStatus('Cargando todos los archivos…')

    const { data: folders, error } = await supabase.storage.from('routines-public').list('', {
      limit: 1000,
    })
    if (error) { setStatus(error.message); return }

    const rows: FileRow[] = []

    for (const f of folders || []) {
      if (f.name) {
        const { data: filesInFolder, error: e2 } = await supabase.storage.from('routines-public').list(f.name, {
          limit: 1000,
          sortBy: { column: 'name', order: 'desc' },
        })
        if (e2) { setStatus(e2.message); return }

        for (const obj of filesInFolder || []) {
          const path = `${f.name}/${obj.name}`
          const pub = supabase.storage.from('routines-public').getPublicUrl(path)
          rows.push({ name: path, url: pub.data.publicUrl })
        }
      }
    }

    setFiles(rows)
    setStatus(`Se encontraron ${rows.length} archivos ✔️`)
  }

  const upload = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) return setStatus('Selecciona un archivo PDF')
    if (file.type !== 'application/pdf') return setStatus('El archivo debe ser PDF')

    // Usamos carpeta "general" y mantenemos nombre del archivo original
    const path = `general/${file.name}`

    setStatus('Subiendo…')
    const { error } = await supabase.storage.from('routines-public').upload(path, file, {
      cacheControl: '3600',
      upsert: true, // permite reemplazar si ya existe
      contentType: 'application/pdf',
    })
    if (error) { setStatus(`Error: ${error.message}`); return }

    setStatus('Listo ✔️')
    // reset input file
    if (fileRef.current) fileRef.current.value = ''
    listAllFiles()
  }

  const removeFile = async (path: string) => {
    setStatus(`Eliminando ${path}…`)
    const { error } = await supabase.storage.from('routines-public').remove([path])
    if (error) { setStatus(`Error: ${error.message}`); return }
    setStatus('Archivo eliminado ✔️')
    listAllFiles()
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      {/* Header: volver + título */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="text-sm underline"
        >
          ← Volver
        </button>

        <h1 className="text-2xl font-bold flex-1 text-center">Rutinas</h1>
        <div className="w-[120px]" />
      </div>

      {/* Subida de archivos */}
      <div className="grid sm:grid-cols-[1fr_auto] gap-3 mb-4">
        <input ref={fileRef} type="file" accept="application/pdf" className="border rounded px-3 py-2" />
        <button onClick={upload} className="px-4 py-2 rounded bg-black text-white">Subir</button>
      </div>

      {!!status && <p className="text-sm opacity-80 mb-4">{status}</p>}

      {/* Tabla con TODOS los archivos */}
      <div className="rounded-xl bg-white shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left p-2">Archivo</th>
              <th className="text-left p-2">Enlace</th>
              <th className="text-left p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {files.map(f => (
              <tr key={f.url} className="border-t">
                <td className="p-2">{f.name}</td>
                <td className="p-2">
                  <a className="underline" href={f.url} target="_blank" rel="noopener noreferrer">
                    Abrir
                  </a>
                </td>
                <td className="p-2">
                  <button
                    onClick={() => removeFile(f.name)}
                    className="text-red-600 hover:underline"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {!files.length && (
              <tr><td className="p-2" colSpan={3}>Sin archivos.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  )
}
