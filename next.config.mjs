/** @type {import('next').NextConfig} */
const remotePatterns = []

if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
    remotePatterns.push({ protocol: 'https', hostname: supabaseHost })
  } catch (error) {
    console.warn('NEXT_PUBLIC_SUPABASE_URL inválida para remotePatterns', error)
  }
}

const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns,
  },
}
export default nextConfig;
