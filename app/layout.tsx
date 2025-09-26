// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { loadAndApplyAppSettings } from '@/lib/appSettings.server'

export const metadata: Metadata = {
  title: "FitnessClub Grulla Blanca",
  description: "App con métricas de rendimiento (Vercel Speed Insights)",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let offset: number | null = null
  try {
    const settings = await loadAndApplyAppSettings()
    offset = settings.timezoneOffsetMinutes ?? null
  } catch (err) {
    console.error('Failed to load app settings', err)
    offset = null
  }
  const offsetScript = `window.__CHILE_TIME_OFFSET__ = ${offset ?? 'null'};`
  return (
    <html lang="es">
      <body>
        <script
          id="chile-time-offset"
          dangerouslySetInnerHTML={{ __html: offsetScript }}
        />
        {children}
        {/* 👇 Este componente envía las métricas a Vercel */}
        <SpeedInsights />
      </body>
    </html>
  );
}
