# Marca Llevo

Amable y cercana. Un servicio de trasteos que se siente de barrio, cumplido y sin complicaciones.

## Logo

La palabra **llevo** en la misma tipografía de los títulos, con la **vuelta** al lado: una línea azul doblada una vez, extremos redondos. Sin pin, sin placa y sin cinta.
El componente está en `src/components/Logo.astro`. El ícono (favicon y app) es la vuelta en blanco sobre azul.

| Archivo | Uso |
| --- | --- |
| `llevo-icono.svg` / `favicon.svg` | Ícono: vuelta blanca sobre azul |
| `llevo-icono-app.svg`, `apple-touch-icon.png`, `icons/` | Ícono de app: vuelta blanca sobre azul |
| `llevo-icono-panel.svg`, `icons/panel-*` | Ícono del Panel: la misma vuelta sobre tinta |
| `llevo-logo.svg` | Palabra con la vuelta, para la página sin conexión |
| `og-image.png` | Imagen al compartir la web en redes y WhatsApp |

**Reglas**
- Espacio libre alrededor: al menos la altura de la vuelta.
- En claro la vuelta es azul cielo y la palabra es tinta. Sobre tinta, las dos van en blanco.
- No la inclines, no le pongas cinta ni una placa de color detrás de la palabra.
- Tamaño mínimo de la palabra: 24 px de alto; por debajo usa solo la vuelta.

## Paleta: cielo y mantequilla

| Nombre | HEX | Uso |
| --- | --- | --- |
| Azul cielo | `#2F5BEA` | Logo, botones, enlaces, selección |
| Mantequilla | `#FFD166` | Acentos puntuales: destacados, cinta de una caja |
| Azul noche | `#14213D` | Textos y fondos oscuros |
| Cielo suave | `#E7EDFF` | Fondos de apoyo, botones secundarios |
| Crema | `#FFFAF1` | Fondo de la web |
| Gris texto | `#4A5470` / `#6B7489` | Texto secundario y tenue |

- Texto blanco sobre azul cielo: contraste 5.5:1 (cumple AA). Sobre mantequilla usa siempre azul noche.
- El azul domina; el mantequilla se usa poco (5–10 % de una pieza) para que destaque.
- Se evitan a propósito el naranja y el coral, que usan Lalamove, DiDi y Rappi.

## Tipografía

- **Plus Jakarta Sans** (600) para el logo, títulos y frases cortas. Es más seca que una tipografía redonda, y se lleva con los objetos 3D.
- **Nunito** (400 a 700) para textos, botones, formularios, números y el panel.
- Ambas son gratuitas y se cargan desde `@fontsource-variable`.

## Tono

Cercano y directo, de tú. Frases cortas, sin exclamaciones ni promesas que no podamos cumplir.
Ejemplo: "Si cabe en la camioneta, te lo llevo".

No es una empresa de envíos ni una flota de furgones. Es una camioneta pequeña en Valledupar: nevera, lavadora, somier, sofá, un cartel, el sonido de un evento. Como pedírselo al vecino que tiene el carro.

## Movimiento (GSAP)

Animaciones con [GSAP](https://gsap.com) siguiendo las guías oficiales de
[greensock/gsap-skills](https://github.com/greensock/gsap-skills). El código está en `src/scripts/motion.ts`.

- **Una sola entrada al cargar:** el título sube palabra por palabra y la escena del hero aparece.
- **Ilustraciones:** renders 3D sobrios, sin recuadro. En el inicio, la escena quieta de la calle.
- **Al hacer scroll:** cada bloque aparece una sola vez; en "Cómo funciona" una línea une los pasos.
- **Formulario:** el paso nuevo entra desde la dirección en la que avanzas; la barra de progreso se anima.
- **Panel:** las cifras del resumen cuentan desde cero.
- Solo se animan `transform` y opacidad, con curvas suaves (`power3.out`).
- Si el sistema tiene **reducir movimiento** activado, todo aparece de inmediato sin animación.

## Microinteracciones (Motion)

Con [Motion](https://motion.dev) (antes Framer Motion), en su versión de JavaScript para no cargar React
en cada botón. Código en `src/scripts/micro.ts`. GSAP se encarga de las entradas y el scroll; Motion, de
las respuestas al tocar.

- Botones: se hunden un poco al presionarlos; la flecha se asoma al pasar el mouse.
- Logo: se levanta un poco al pasar el mouse.
- WhatsApp: el botón se levanta y se inclina como saludando.
- Formulario: rebote al elegir una opción, las barras de tamaño crecen, los días responden al tocarlos,
  las fotos nuevas aparecen con un pequeño rebote y los campos con error hacen una sacudida suave.
- Preguntas frecuentes: la respuesta aparece suave.
- Panel: las tarjetas del resumen se levantan y las flechas de los enlaces se asoman.
- Todo con resortes cortos sobre `transform` y opacidad; con "reducir movimiento" no se ejecuta nada.

## Zona de servicio

Por ahora **solo Valledupar**. La ciudad sale de **Configuración → Negocio → Ciudad** y se muestra en la
portada, el paso de ruta del formulario, la sección del vehículo y las preguntas frecuentes.

## Mapa

[MapLibre](https://maplibre.org) con los mapas gratuitos de [OpenFreeMap](https://openfreemap.org) (estilo Positron,
teñido con la paleta) y la búsqueda de direcciones de [Photon](https://photon.komoot.io) (OpenStreetMap).
No necesitan claves ni tienen costo. Código en `src/lib/map.ts` y `src/scripts/route-map.ts`.

- Pines propios: un aro para la recogida y una bandera azul para la entrega, unidos por la línea de ruta punteada.
- La línea sale por las calles. No se dibuja una recta mientras se calcula; la recta solo queda si el servicio de rutas no responde. La misma pareja de puntos se reutiliza en la pestaña, sin volver a calcularla.
- El mapa se limita a Valledupar y solo se descarga cuando el cliente llega al paso de ruta.
- Al tocar el mapa o arrastrar un pin se llena la dirección aproximada; al escribir aparecen sugerencias de Valledupar.
- La ubicación de cada punto se guarda con la solicitud y el panel la muestra en un mapa de solo lectura.
- Los servicios gratuitos piden un uso justo; si el volumen crece mucho, conviene alojar Photon propio.

## App instalable (PWA)

La web se instala como app desde el navegador, sin tiendas de aplicaciones:

- **Llevo** (`/manifest.webmanifest`): para clientes, abre la portada; atajo directo a "Cotizar".
- **Llevo Panel** (`/panel.webmanifest`): para el equipo, abre el panel; atajos a Solicitudes y Agenda.
- Íconos en `public/icons/` (azul para clientes, azul noche para el panel; versiones "maskable" para Android).
- `public/sw.js` acelera la carga y muestra `offline.html` sin conexión. Nunca guarda el panel ni la API.
- Botón "Instalar": en el pie de la web y en el menú del panel. En Android y computador abre el aviso del
  navegador; en iPhone explica cómo usar "Compartir → Agregar a inicio".
- Si cambias archivos del service worker, sube la versión (`VERSION`) en `public/sw.js`.

## Notificaciones y sonidos

- **Push al equipo**: cuando entra una solicitud, cada persona del panel que activó los avisos recibe una notificación ("Nueva solicitud · Servicio", con nombre, día y franja). Al tocarla se abre esa solicitud. Se activan por dispositivo con el botón **Avisos** del menú del panel; al activarlos llega una notificación de prueba.
- **iPhone**: los avisos solo funcionan con el panel instalado como app (Safari → Compartir → Agregar a inicio, y activarlos desde la app).
- **Panel abierto**: cada 30 s revisa si hay solicitudes nuevas; muestra un aviso con el botón "Ver", suena una campanita y actualiza el contador amarillo de "Solicitudes" y el número del ícono de la app.
- **Sonidos** (Web Audio, sin archivos): campanita de dos notas en el panel (se apaga con el botón **Sonido**, se recuerda por dispositivo) y un arpegio corto y alegre cuando el cliente envía su solicitud. Volumen bajo, nada estridente.
- Las claves de envío (VAPID) se crean solas la primera vez y se guardan en Supabase, en una tabla que solo lee el servidor. No hay que configurar nada en Vercel.
