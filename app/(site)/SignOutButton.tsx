'use client'
import { useRouter } from 'next/navigation'

export default function SignOutButton() {
  const router = useRouter()

  const onClick = async () => {
    try {
      await fetch('/signout', { method: 'POST' }) // usa tu route existente app/(site)/signout/route.ts
    } finally {
      router.replace('/login')
    }
  }

  return (
    <button
      onClick={onClick}
      className="rounded-full px-4 py-2 bg-black text-white hover:opacity-90"
    >
      Salir
    </button>
  )
}
