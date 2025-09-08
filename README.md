# Gym Web Starter (Next.js + Supabase + Cloudflare Pages)

## Pasos

1. Crea un proyecto en Supabase y pega `supabase_schema.sql` en el SQL Editor.
2. Crea un bucket de Storage llamado `routines-public` y marca visibilidad **pública**.
3. Copia `.env.example` a `.env.local` y completa `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - Para producción, define también `SUPABASE_SERVICE_ROLE_KEY` como **variable de entorno de servidor** (Cloudflare Pages).
4. Instala dependencias:
   ```bash
   npm i
   npm run dev
   ```
5. Prueba:
   - `/routines` para ver rutinas públicas (vacío al inicio).
   - `/admin/routines` para subir PDFs (usa el anon key; en producción protege con Auth).
   - `/kiosk` para validar tarjeta. Simula tipeando un UID y Enter.

## Despliegue en Cloudflare Pages

- Conecta el repo. En **Settings → Environment variables** agrega:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (server)
- Build command: `npm run build`
- Build output: `.next` (Cloudflare detecta Next.js automáticamente)

## Notas de seguridad
- El endpoint `/api/access/validate` usa `SUPABASE_SERVICE_ROLE_KEY`. Nunca lo expongas en el cliente.
- Para Admin real, integra Supabase Auth y protege las rutas `/admin/*`.

## TODOs
- CRUD de atletas y membresías (UI).
- Reportes de accesos.
- Auth de administradores.
