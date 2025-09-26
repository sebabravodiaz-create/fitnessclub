'use client'
import { useEffect, useRef, useState } from 'react'

type AccessResult = {
  name: string
  uid: string
  membership?: string
  endDate?: string
  status: 'allowed' | 'expired' | 'unknown_card'
}

function formatDate(dateStr?: string) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function KioskPage() {
  // 1) Hooks SIEMPRE arriba y en el mismo orden
  const [mounted, setMounted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<'idle' | 'ok' | 'fail'>('idle')
  const [message, setMessage] = useState<string>('Acerca la tarjeta...')
  const [lastUID, setLastUID] = useState<string>('')
  const [lastEndDate, setLastEndDate] = useState<string>('')
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
        addToHistory({
          name: data.athlete.name,
          uid: data.uid,
          membership: 'Vigente',
          endDate: data.membership?.end_date,
          status: 'allowed',
        })
      } else if (data.result === 'expired') {
        setStatus('fail')
        setMessage(`⚠️ MEMBRESÍA EXPIRADA\n${data.athlete?.name || ''}`)
        setLastEndDate(data.membership?.end_date || '')
        addToHistory({
          name: data.athlete?.name || 'Desconocido',
          uid: data.uid,
          membership: 'Expirada',
          endDate: data.membership?.end_date,
          status: 'expired',
        })
      } else {
        setStatus('fail')
        setMessage(`❌ TARJETA DESCONOCIDA\nUID: ${data.uid}`)
        setLastEndDate('')
        addToHistory({
          name: 'Desconocido',
          uid: data.uid,
          membership: 'N/A',
          status: 'unknown_card',
        })
      }
    } catch {
      setStatus('fail')
      setMessage(`Error de validación\nUID: ${cleanedUID}`)
    } finally {
      setTimeout(() => {
        setStatus('idle')
        setMessage('Acerca la tarjeta...')
        setLastUID('')
        setLastEndDate('')
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
    <div className="h-screen w-screen flex select-none bg-gray-50">
      {/* Panel central */}
      <div
        className={[
          'flex-1 flex items-center justify-center',
          status === 'ok' ? 'bg-green-200' : status === 'fail' ? 'bg-red-200' : 'bg-gray-50',
        ].join(' ')}
      >
        <div className="text-center px-6">
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
              <p className="font-semibold">{h.name}</p>
              <p className="text-sm text-gray-700">Tarjeta: {h.uid}</p>
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
