# Llevo · Web para trasteos + panel de gestión

Landing para captar clientes de trasteos y acarreos, con un **panel de gestión** para atender las solicitudes.
Hecha con **Astro**, **Tailwind CSS v4**, **Heroicons** y **Supabase** (base de datos, fotos y login).

## Qué incluye

### Web pública (`/`)
- Portada, servicios, cómo funciona, vehículo, preguntas frecuentes y botón de WhatsApp.
- **Formulario de cotización en 5 pasos**: servicio, ruta (piso, ascensor, ubicación GPS), carga (hasta 10 fotos,
  objetos, ayudantes, desarme, embalaje), fecha y franja horaria, y contacto.
- Las fotos se comprimen en el navegador y se suben directo a Supabase Storage.
- Los días y horarios que bloquees en el panel no se pueden elegir.
- Opcional: muestra al cliente un **precio estimado** calculado con tus tarifas.

### Panel (`/panel`)
| Sección | Qué hace | Quién |
| --- | --- | --- |
| **Inicio** | Resumen: nuevas, por confirmar, agendadas, ingresos del mes y próximos 7 días | Todos |
| **Solicitudes** | Lista con filtros por estado y buscador. Detalle con fotos, ruta en Google Maps, cambio de estado, precio, fecha, responsable, notas internas y **mensajes rápidos de WhatsApp** (cotización, confirmación, “vamos en camino”, pedir fotos) | Todos |
| **Agenda** | Calendario mensual de servicios y **bloqueo de días u horarios** | Todos |
| **Configuración** | Datos del negocio, vehículo, servicios, preguntas frecuentes y **tarifas** | Administrador |
| **Usuarios** | Crear cuentas (Equipo o Administrador), cambiar rol o contraseña, eliminar | Administrador |
| **Mi cuenta** | Cambiar nombre y contraseña | Todos |

Estados de una solicitud: **Nueva → Cotizada → Agendada → Completada** (o Cancelada).

## Puesta en marcha

### 1. Supabase
Crea un proyecto gratis en [supabase.com](https://supabase.com) (o desde Vercel: **Storage → Connect Database → Supabase**).
No hace falta ejecutar SQL a mano: las migraciones se aplican solas al publicar.

### 2. Variables de entorno (Vercel → Settings → Environment Variables)

| Variable | Dónde se obtiene |
| --- | --- |
| `PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` (secreta) |
| `DATABASE_URL` | Supabase → botón **Connect** → **Session pooler** (reemplaza `[YOUR-PASSWORD]`) |

La integración de Supabase en Vercel también sirve: la web reconoce `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY` y `POSTGRES_URL`.

### 3. Publicar
1. Importa el repositorio en [vercel.com](https://vercel.com) y agrega las variables.
2. Despliega. Antes de compilar, `scripts/migrate.mjs` aplica las migraciones pendientes de `supabase/migrations/`.
3. Entra a `https://tu-dominio/panel`: la primera vez te pide **crear tu cuenta de administrador**.
4. Completa la **Configuración** (WhatsApp, ciudad, tarifas…) y crea las cuentas de tu equipo en **Usuarios**.

Solo las cuentas creadas desde el panel tienen acceso; un registro por fuera no recibe permisos.

> ¿Prefieres Netlify u otro hosting? Cambia el adaptador en `astro.config.mjs` (`@astrojs/netlify` o `@astrojs/node`).

Si las variables no están configuradas, la web sigue funcionando: el formulario envía la solicitud por WhatsApp.

## Migraciones

- Cada cambio de base de datos es un archivo nuevo en `supabase/migrations/` con el formato `AAAAMMDDHHMMSS_nombre.sql`.
- Se aplican en orden y una sola vez; el registro vive en `supabase_migrations.schema_migrations`
  (la misma tabla que usa la CLI de Supabase, así que `npx supabase db push` también es compatible).
- En Vercel solo corren en las publicaciones de **producción**; las vistas previas no tocan la base de datos.
- Para aplicarlas a mano: `DATABASE_URL=... npm run migrate`.
- Si una migración falla, la publicación se detiene y la versión anterior de la web sigue en línea.

## Desarrollo local

```bash
npm install
npm run dev
```

Para una base de datos local (requiere Docker):

```bash
npx supabase start
```

Usa la URL y las claves que imprime en tu `.env`.

| Comando | Acción |
| :-- | :-- |
| `npm run dev` | Servidor local en `http://localhost:4321` |
| `npm run build` | Compila para producción |
| `npx astro check` | Revisa tipos |

## Estructura

```
src/
  components/        Secciones de la web y del panel
  layouts/           Layout público y del panel
  lib/               Supabase, configuración por defecto, tarifas, constantes
  middleware.ts      Protege /panel (sesión y roles)
  pages/
    index.astro      Web pública
    api/solicitudes  Recibe el formulario
    panel/           Panel de gestión
supabase/migrations/ Esquema de la base de datos
```
