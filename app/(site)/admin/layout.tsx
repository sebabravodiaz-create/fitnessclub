import type { ReactNode } from 'react'

export default function AdminLayout({ children }: { children: ReactNode }) {
  // 👉 mismo ancho interno que el header: max-w-6xl + px-4
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {children}
    </div>
  )
}
