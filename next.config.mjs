/** @type {import('next').NextConfig} */
const remotePatterns = []

if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
    remotePatterns.push({ protocol: 'https', hostname: supabaseHost })
  } catch (error) {
    console.warn('No se pudo analizar NEXT_PUBLIC_SUPABASE_URL para imágenes remotas.', error)
  }
}

const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns,
  },
}
export default nextConfig;
