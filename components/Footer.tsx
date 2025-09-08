export default function Footer() {
  return (
    <footer className="border-t">
      <div className="max-w-6xl mx-auto px-4 py-8 text-sm flex flex-col md:flex-row justify-between gap-3">
        <p>© {new Date().getFullYear()} Club Grulla Blanca</p>
        <p className="opacity-70">
          Síguenos: <a className="underline" href="https://www.instagram.com/club.grulla.blanca/" target="_blank">Instagram</a>
        </p>
      </div>
    </footer>
  )
}