# Gym Web Starter (Next.js + Supabase + Vercel)

## Pasos

1. Crea un proyecto en Supabase y pega `supabase_schema.sql` en el SQL Editor.
2. Crea un bucket de Storage llamado `routines-public` y marca visibilidad **pública**.
3. Copia `.env.example` a `.env.local` y completa:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (solo para servidor)
   - `NEXT_PUBLIC_SITE_URL` (ej. `http://localhost:3000` en local)
4. Instala dependencias:
   ```bash
   npm i
   npm run dev
   ```
5. Prueba:
   - `/routines` para ver rutinas públicas (vacío al inicio).
   - `/admin/routines` para subir PDFs (usa el anon key; en producción protege con Auth).
   - `/kiosk` para validar tarjeta. Simula tipeando un UID y Enter.

## Despliegue en Vercel

1. Importa este repositorio en Vercel y selecciona el framework **Next.js**.
2. En **Settings → Environment Variables** agrega:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (marca como `Encrypted` y disponible en `Production`/`Preview`/`Development`).
   - `NEXT_PUBLIC_SITE_URL` (ej. `https://tu-app.vercel.app`).
   - Si usas las APIs opcionales, agrega también `NEXT_PUBLIC_API_BASE_URL`, `API_PUBLIC_TOKEN`, `API_ADMIN_TOKEN` y `API_AUTH_MODE`.
3. Configura **Build & Output Settings** con `npm run build` como comando de build (Vercel detecta automáticamente Next.js).
4. Activa la aplicación de **Vercel Speed Insights** en el dashboard para recibir métricas; el proyecto ya incluye `<SpeedInsights />` en `app/layout.tsx`.
5. Despliega. Cada commit en `main`/`work` generará un redeploy automático.

> ¿Sigues desplegando en Cloudflare Pages? Las instrucciones anteriores siguen siendo válidas: replica las mismas variables y conserva `npm run build` como comando de build.

## Automatización en GitHub

El repositorio incluye un workflow en `.github/workflows/ci.yml` que ejecuta `npm run lint` y `npm run build` en cada push a `main`/`work` y en los _pull requests_. De esta forma, GitHub valida que la app continúe compilando antes de desplegar en Vercel. Si necesitas variables adicionales para las pruebas, configúralas como _secrets_ en los **Settings** del repositorio.

## Notas de seguridad
- El endpoint `/api/access/validate` usa `SUPABASE_SERVICE_ROLE_KEY`. Nunca lo expongas en el cliente.
- Para Admin real, integra Supabase Auth y protege las rutas `/admin/*`.

## TODOs
- CRUD de atletas y membresías (UI).
- Reportes de accesos.
- Auth de administradores.
