/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      // { protocol: "https", hostname: "<TU-PROYECTO>.supabase.co" },
      // { protocol: "https", hostname: "images.unsplash.com" }
    ]
  }
};
export default nextConfig;
