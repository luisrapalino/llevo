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
1. Crea un proyecto gratis en [supabase.com](https://supabase.com).
2. En **SQL Editor**, pega y ejecuta el contenido de `supabase/migrations/20261103000000_init.sql`.
   Crea las tablas, la seguridad (RLS) y el almacenamiento de fotos.
3. En **Authentication → Sign In / Providers**, desactiva *Allow new users to sign up* (las cuentas las creas tú desde el panel).
4. En **Authentication → Users → Add user**, crea tu usuario con correo y contraseña (marca *Auto Confirm User*).
   **El primer usuario que se crea queda como administrador.**

> **Atajo:** en Vercel puedes instalar la integración **Supabase** (Storage → Connect Database → Supabase).
> Crea el proyecto y agrega las claves automáticamente; la web reconoce sus nombres
> (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). Igual debes correr el SQL (punto 2 de arriba) y crear tu usuario.

### 2. Variables de entorno
Copia `.env.example` a `.env` y llena los valores de **Project Settings → API**:

```
PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # secreta, solo en el servidor
```

### 3. Publicar en Vercel
1. Importa el repositorio en [vercel.com](https://vercel.com).
2. Agrega las 3 variables de entorno.
3. Despliega. Entra a `https://tu-dominio/panel` con tu usuario y completa la **Configuración** (WhatsApp, ciudad, tarifas…).

> ¿Prefieres Netlify u otro hosting? Cambia el adaptador en `astro.config.mjs` (`@astrojs/netlify` o `@astrojs/node`).

Si las variables no están configuradas, la web sigue funcionando: el formulario envía la solicitud por WhatsApp.

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
