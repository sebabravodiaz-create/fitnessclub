// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: "Aplicación GYM",
  description: "App con métricas de rendimiento (Vercel Speed Insights)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        {children}
        {/* 👇 Este componente envía las métricas a Vercel */}
        <SpeedInsights />
      </body>
    </html>
  );
}
