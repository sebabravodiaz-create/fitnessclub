'use client'
import { useEffect, useRef, useState } from 'react'

type AccessResult = {
  uid: string
  membershipEndsAt?: string | null
  status: 'allowed' | 'expired' | 'unknown_card'
}

function formatDate(dateStr?: string) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

export default function KioskPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<'idle'|'ok'|'fail'>('idle')
  const [message, setMessage] = useState<string>('Acerca la tarjeta...')
  const [lastUID, setLastUID] = useState<string>('')   
  const [lastEndDate, setLastEndDate] = useState<string>('')   
  const [history, setHistory] = useState<AccessResult[]>([])
  const bufferRef = useRef<string>('') 
  const timeoutRef = useRef<any>(null)  

  useEffect(() => {
    const focusInput = () => inputRef.current?.focus()
    focusInput()
    const onClick = () => focusInput()
    window.addEventListener('click', onClick)
    window.addEventListener('touchstart', onClick, { passive: true })
    return () => {
      window.removeEventListener('click', onClick)
      window.removeEventListener('touchstart', onClick)
    }
  }, [])

  useEffect(() => {
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
  }, [])

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
        setMessage('✅ ACCESO PERMITIDO')
        setLastEndDate(data.membership?.end_date || '')
        addToHistory({
          uid: data.uid,
          membershipEndsAt: data.membership?.end_date,
          status: 'allowed'
        })
      } else if (data.result === 'expired') {
        setStatus('fail')
        setMessage('⚠️ MEMBRESÍA EXPIRADA')
        setLastEndDate(data.membership?.end_date || '')
        addToHistory({
          uid: data.uid,
          membershipEndsAt: data.membership?.end_date,
          status: 'expired'
        })
      } else {
        setStatus('fail')
        setMessage(`❌ TARJETA DESCONOCIDA\nUID: ${data.uid}`)
        setLastEndDate('')
        addToHistory({
          uid: data.uid,
          status: 'unknown_card'
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
            <p className="text-xl text-gray-600 mt-4">UID leído: <b>{lastUID}</b></p>
          )}
          {lastEndDate && (
            <p className="text-lg text-gray-700 mt-2">
              Vence: {formatDate(lastEndDate)}
            </p>
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
                h.status === 'allowed' ? 'bg-green-100' : 'bg-red-100'
              ].join(' ')}
            >
              <p className="font-semibold">UID: {h.uid}</p>
              <p className="text-sm text-gray-700 capitalize">Estado: {h.status.replace('_', ' ')}</p>
              {h.membershipEndsAt && (
                <p className="text-sm text-gray-500">
                  Vence: {formatDate(h.membershipEndsAt)}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
