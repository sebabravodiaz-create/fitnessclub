import Link from 'next/link'

export default function AccessButtons() {
  return (
    <div className="flex gap-4 justify-center mt-6">
      <Link
        href="/rutinas"
        className="px-6 py-3 rounded-full border hover:bg-white"
      >
        Ver mis rutinas
      </Link>
    </div>
  )
}
