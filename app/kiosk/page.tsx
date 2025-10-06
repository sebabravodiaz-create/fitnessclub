'use client'
import { useEffect, useRef, useState } from 'react'

type AccessResult = {
  name: string
  uid: string
  membership?: string
  endDate?: string
  status: 'allowed' | 'expired' | 'unknown_card'
  photoUrl?: string | null
}

function formatDate(dateStr?: string) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const PLACEHOLDER_PHOTO = '/images/athlete-placeholder.svg'

export default function KioskPage() {
  // 1) Hooks SIEMPRE arriba y en el mismo orden
  const [mounted, setMounted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<'idle' | 'ok' | 'fail'>('idle')
  const [message, setMessage] = useState<string>('Acerca la tarjeta...')
  const [lastUID, setLastUID] = useState<string>('')
  const [lastEndDate, setLastEndDate] = useState<string>('')
  const [lastPhotoUrl, setLastPhotoUrl] = useState<string>('')
  const [history, setHistory] = useState<AccessResult[]>([])
  const bufferRef = useRef<string>('')
  const timeoutRef = useRef<any>(null)

  // 2) Efecto de montaje (no acceder a window fuera de efectos)
  useEffect(() => {
    setMounted(true)
  }, [])

  // 3) Foco y listeners solo cuando ya hay window
  useEffect(() => {
    if (!mounted) return
    const focusInput = () => inputRef.current?.focus()
    focusInput()
    const onClick = () => focusInput()
    window.addEventListener('click', onClick)
    window.addEventListener('touchstart', onClick, { passive: true })
    return () => {
      window.removeEventListener('click', onClick)
      window.removeEventListener('touchstart', onClick)
    }
  }, [mounted])

  // 4) Lectura por teclado (solo tras montaje)
  useEffect(() => {
    if (!mounted) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const uid = bufferRef.current.trim()
        bufferRef.current = ''
        if (uid) validate(uid)
      } else {
        if (/^[A-Za-z0-9]$/.test(e.key)) {
          bufferRef.current += e.key
          clearTimeout(timeoutRef.current)
          timeoutRef.current = setTimeout(() => {
            const uid = bufferRef.current.trim()
            bufferRef.current = ''
            if (uid) validate(uid)
          }, 200)
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [mounted])

  async function validate(cardUID: string) {
    const cleanedUID = cardUID.replace(/^0+/, '')
    setLastUID(cleanedUID)
    setMessage('Validando...')
    setStatus('idle')
    setLastEndDate('')
    setLastPhotoUrl('')

    try {
      const res = await fetch('/api/access/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardUID: cleanedUID }),
      })
      const data = await res.json()

      if (data.ok && data.result === 'allowed') {
        setStatus('ok')
        setMessage(`✅ ACCESO PERMITIDO\n${data.athlete.name}`)
        setLastEndDate(data.membership?.end_date || '')
        setLastPhotoUrl(data.athlete?.photo_url || '')
        addToHistory({
          name: data.athlete.name,
          uid: data.uid,
          membership: 'Vigente',
          endDate: data.membership?.end_date,
          status: 'allowed',
          photoUrl: data.athlete?.photo_url || null,
        })
      } else if (data.result === 'expired' || data.result === 'denied') {
        const isSold = data.result === 'denied' || data.membership?.status === 'sold'
        setStatus('fail')
        setMessage(
          `${isSold ? '⚠️ SUSCRIPCIÓN VENCIDA' : '⚠️ MEMBRESÍA EXPIRADA'}\n${data.athlete?.name || ''}`,
        )
        setLastEndDate(data.membership?.end_date || '')
        setLastPhotoUrl(data.athlete?.photo_url || '')
        addToHistory({
          name: data.athlete?.name || 'Desconocido',
          uid: data.uid,
          membership: isSold ? 'Vencida' : 'Expirada',
          endDate: data.membership?.end_date,
          status: 'expired',
          photoUrl: data.athlete?.photo_url || null,
        })
      } else {
        setStatus('fail')
        setMessage(`❌ TARJETA DESCONOCIDA\nUID: ${data.uid}`)
        setLastEndDate('')
        setLastPhotoUrl('')
        addToHistory({
          name: 'Desconocido',
          uid: data.uid,
          membership: 'N/A',
          status: 'unknown_card',
          photoUrl: null,
        })
      }
    } catch {
      setStatus('fail')
      setMessage(`Error de validación\nUID: ${cleanedUID}`)
      setLastPhotoUrl('')
    } finally {
      setTimeout(() => {
        setStatus('idle')
        setMessage('Acerca la tarjeta...')
        setLastUID('')
        setLastEndDate('')
        setLastPhotoUrl('')
      }, 3000)
    }
  }

  function addToHistory(entry: AccessResult) {
    setHistory(prev => [entry, ...prev].slice(0, 20))
  }

  // 5) Render “placeholder” mientras montamos para evitar hydration mismatch
  if (!mounted) {
    return <div className="h-screen w-screen bg-gray-50" />
  }

  return (
    <div className="relative h-screen w-screen flex select-none bg-gray-50">
      <a
        href="/kiosk/manual"
        className="absolute left-6 top-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/80 text-2xl text-slate-700 shadow transition hover:bg-white"
        aria-label="Búsqueda manual"
      >
        🔍
      </a>

      {/* Panel central */}
      <div
        className={[
      'flex-1 flex items-center justify-center',
      status === 'ok' ? 'bg-green-200' : status === 'fail' ? 'bg-red-200' : 'bg-gray-50',
    ].join(' ')}
  >
    <div className="text-center px-6">
        <div className="flex justify-center mb-6">
          <img
            src={lastPhotoUrl || PLACEHOLDER_PHOTO}
            alt="Foto del deportista"
            className="w-40 h-40 rounded-full object-cover border-4 border-white shadow"
          />
        </div>
      <h1 className="text-5xl font-bold mb-6">Control de Acceso</h1>
      <p className="text-3xl font-semibold whitespace-pre-line">{message}</p>

          {lastUID && (
            <p className="text-xl text-gray-600 mt-4">
              UID leído: <b>{lastUID}</b>
            </p>
          )}
          {lastEndDate && (
            <p className="text-lg text-gray-700 mt-2">Vence: {formatDate(lastEndDate)}</p>
          )}
          <input
            ref={inputRef}
            className="opacity-0 absolute pointer-events-none"
            inputMode="none"
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Panel lateral derecho */}
      <div className="w-1/4 bg-white border-l overflow-y-auto p-4">
        <h2 className="text-xl font-bold mb-4">Últimos accesos</h2>
        <div className="space-y-3">
          {history.map((h, i) => (
            <div
              key={i}
              className={[
                'p-3 rounded-lg',
                h.status === 'allowed' ? 'bg-green-100' : 'bg-red-100',
              ].join(' ')}
            >
              <div className="flex items-center gap-3 mb-2">
                <img
                  src={h.photoUrl || PLACEHOLDER_PHOTO}
                  alt={h.name}
                  className="w-12 h-12 rounded-full object-cover border"
                />
                <div className="text-left">
                  <p className="font-semibold">{h.name}</p>
                  <p className="text-sm text-gray-700">Tarjeta: {h.uid}</p>
                </div>
              </div>
              <p className="text-sm text-gray-700">Membresía: {h.membership}</p>
              {h.endDate && (
                <p className="text-sm text-gray-500">Vence: {formatDate(h.endDate)}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
