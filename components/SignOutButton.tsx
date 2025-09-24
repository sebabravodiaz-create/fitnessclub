'use client'
import { getSupabaseBrowserClient } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function SignOutButton() {
  const router = useRouter()

  const onClick = async () => {
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push('/') // 👈 envía a home después de cerrar sesión
  }

  return (
    <button
      onClick={onClick}
      className="px-3 py-2 rounded border hover:bg-gray-100"
    >
      Salir
    </button>
  )
}
