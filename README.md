# Fitness Club Grulla Blanca – Starter Web App

Aplicación web construida con Next.js 14 y Supabase para la gestión integral del Fitness Club Grulla Blanca. Incluye un sitio público con información comercial, un flujo de autenticación para administradores y herramientas internas para administrar atletas, membresías y rutinas almacenadas en Supabase.

## Tabla de contenido
- [Características](#características)
- [Arquitectura y stack](#arquitectura-y-stack)
- [Requisitos previos](#requisitos-previos)
- [Configuración de Supabase](#configuración-de-supabase)
- [Variables de entorno](#variables-de-entorno)
- [Instalación y ejecución local](#instalación-y-ejecución-local)
- [Scripts disponibles](#scripts-disponibles)
- [Estructura relevante](#estructura-relevante)
- [Despliegue en Vercel](#despliegue-en-vercel)
- [Automatización CI](#automatización-ci)
- [Solución de problemas](#solución-de-problemas)

## Características

### Sitio público
- **Landing page** con hero, oferta de clases por nivel e integración con la cuadrícula de Instagram (`/`).
- **Hero y galería dinámicos** que consumen imágenes del bucket público `home-assets` de Supabase con degradados locales de respaldo.
- **Botón flotante de WhatsApp** disponible únicamente en el home para contacto directo con el club.
- **Página de rutinas públicas** (`/routines`) que lista las rutinas marcadas como públicas en la tabla `routines` de Supabase.

### Panel administrativo (`/admin`)
- **Inicio de sesión** con correo y contraseña usando Supabase Auth (`/login`), protegido para rutas administrativas.
- **Gestión de atletas**: búsqueda global por nombre, contacto, RFID o plan; creación, edición y eliminación con manejo automático de tarjetas y membresías.
- **Mantenedor de imágenes del home** (`/admin/home-images`): administra el hero y las 9 miniaturas `ig-1`…`ig-9` del bucket `home-assets` con vista previa y control individual.
- **Carga de rutinas en PDF**: interfaz para subir, listar y eliminar archivos en el bucket público `routines-public` de Supabase Storage.
- **Vista de asignaciones**: páginas auxiliares para crear y revisar información individual de atletas y sus membresías.

### APIs y herramientas internas
- Endpoint `/api/access/validate` para validar accesos por tarjeta utilizando la `SUPABASE_SERVICE_ROLE_KEY`.
- Ruta `/api/debug/cards` que ayuda a depurar tarjetas registradas.
- Cliente de Supabase diferenciado para entornos de servidor y navegador (`lib/supabase`).

## Arquitectura y stack
- **Framework**: Next.js 14 (App Router) con renderizado híbrido y soporte SSR/ISR.
- **Lenguaje**: TypeScript 5 + JSX.
- **UI**: Tailwind CSS para estilos utilitarios y componentes responsivos.
- **Base de datos y autenticación**: Supabase (PostgreSQL + Auth + Storage).
- **Métricas**: integración opcional con Vercel Speed Insights.

## Requisitos previos
- Node.js ≥ 20 y npm 10.
- Cuenta en [Supabase](https://supabase.com/) con un proyecto activo.
- (Opcional) API interna si planeas usar los helpers de `lib/api.ts`.

## Configuración de Supabase
1. Crea un proyecto en Supabase y obtén las llaves URL/Anon/Service.
2. Abre **SQL Editor** y ejecuta el contenido de [`supabase_schema.sql`](./supabase_schema.sql) para crear tablas, relaciones y políticas RLS.
3. En **Storage → Buckets** crea los buckets públicos `routines-public` (PDFs) y `home-assets` (imágenes del landing).
4. Dentro de `home-assets` genera dos carpetas: `hero` (con un archivo activo `hero-main.jpg`/`.png`, etc.) y `gallery` con los nueve archivos fijos `ig-1`…`ig-9` (por ejemplo `ig-1.png`, `ig-2.webp`). Cada slot se sobreescribe manteniendo el mismo nombre base cuando cargues una nueva imagen desde el mantenedor.
5. (Opcional) Registra el dominio de producción en **Authentication → URL Configuration** para permitir el flujo de login.

## Variables de entorno
Copia `.env.example` a `.env.local` y completa según el entorno.

| Variable | Descripción |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase (Project settings → API). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública para operaciones desde el cliente. |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave **service role** usada por APIs protegidas (solo servidor). |
| `NEXT_PUBLIC_SITE_URL` | URL base del sitio (ej. `http://localhost:3000`). |
| `NEXT_PUBLIC_API_BASE_URL` | (Opcional) Base URL de una API propia si utilizas `lib/api.ts`. |
| `API_PUBLIC_TOKEN` | (Opcional) Token Bearer público para las peticiones anteriores. |
| `API_ADMIN_TOKEN` | (Opcional) Token administrador para operaciones privilegiadas en la API. |
| `API_AUTH_MODE` | (Opcional) Modo de autenticación para la API (`supabase`, etc.). |

Guarda los valores sensibles únicamente en `.env.local` (local) o en los secret managers de tu proveedor en producción.

## Instalación y ejecución local
```bash
npm install
npm run dev
```

La aplicación se levanta en `http://localhost:3000`. Las rutas públicas (home, rutinas) están disponibles sin autenticación; las páginas dentro de `/admin` requieren haber iniciado sesión.

### Autenticación de prueba
- Crea manualmente un usuario administrador en **Authentication → Users** dentro de Supabase y asigna una contraseña.
- Utiliza esas credenciales en `/login` para acceder al panel.

## Scripts disponibles
| Comando | Descripción |
| --- | --- |
| `npm run dev` | Levanta el servidor de desarrollo de Next.js. |
| `npm run build` | Genera el build de producción (`.next`). |
| `npm run start` | Sirve el build generado. |
| `npm run lint` | Ejecuta el wrapper que intenta resolver `next lint`; si la dependencia `eslint-config-next` no está instalada localmente, el script finaliza sin error (el pipeline de CI la instala automáticamente). |

## Estructura relevante
```
app/
  (site)/          Páginas públicas y del panel administrativo.
    admin/         Secciones internas (atletas, rutinas, etc.).
  login/           Formulario de acceso para administradores.
  routines/        Listado público de rutinas (SSR).
components/        Componentes reutilizables (botón WhatsApp, grids, etc.).
lib/               Clientes de Supabase (browser/server) y helpers de API.
public/            Activos estáticos e imágenes del sitio.
scripts/           Utilidades ejecutables (lint wrapper).
```

## Despliegue en Vercel
1. Importa este repositorio desde tu cuenta de Vercel y selecciona el framework **Next.js**.
2. Configura las mismas variables de entorno que usas en `.env.local` dentro de **Settings → Environment Variables** (Production/Preview/Development).
3. Define `npm run build` como comando de build (Vercel detecta automáticamente Next.js).
4. Activa la integración de **Vercel Speed Insights** para habilitar la métrica incluida en `app/layout.tsx`.
5. Cada push a `main` o `work` desencadena un redeploy gracias al workflow de CI.

## Automatización CI
El repositorio incluye `.github/workflows/ci.yml`, el cual instala dependencias, ejecuta `npm run lint` y `npm run build` en cada push a `main`/`work` y en los pull requests. Configura cualquier secreto adicional (tokens, claves de API) desde **Settings → Secrets and variables → Actions**.

## Solución de problemas
- **Faltan variables de entorno**: Las rutas `/api` y la página `/routines` muestran mensajes descriptivos cuando no encuentran llaves de Supabase. Verifica la sección de variables.
- **Dependencias de ESLint**: Si el comando `npm run lint` se omite localmente, revisa la salida; en CI se instalará `eslint-config-next` y se ejecutará `next lint`.
- **Acceso a Storage**: Asegúrate de haber creado el bucket `routines-public` con acceso público. Las subidas desde `/admin/routines` fallarán si el bucket no existe.
- **Autenticación**: Para producción, habilita dominios permitidos en Supabase Auth y considera activar MFA o políticas adicionales antes de abrir el panel a terceros.

¡Listo! Con estos pasos puedes correr el starter, extenderlo con tus propias funcionalidades y desplegarlo de forma segura.
