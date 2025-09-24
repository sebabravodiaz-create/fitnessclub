import { Suspense } from 'react'
import LoginForm from './LoginForm'

export const runtime = 'nodejs'

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-md mx-auto p-6">Cargando…</div>}>
      <LoginForm />
    </Suspense>
  )
}

