# Marca Llevo

Amable y cercana. Un servicio de trasteos que se siente de barrio, cumplido y sin complicaciones.

## Logo: el sticker

La palabra **llevo** como un sticker pegado con cinta: lo que pones en una caja para saber a dónde va.
Los archivos están en `public/brand/` (vectores, sin depender de fuentes instaladas).

| Archivo | Uso |
| --- | --- |
| `llevo-logo.svg` | Principal, sobre fondos claros (crema o blanco) |
| `llevo-logo-inverso.svg` | Sobre azul o fondos oscuros |
| `llevo-logo-tinta.svg` | A una tinta (impresión económica, sellos) |
| `llevo-logo-recto.svg` | Sin inclinación, para espacios muy estrechos |
| `llevo-wordmark.svg` | Solo la palabra, cuando el sticker se ve pesado |
| `llevo-icono.svg` / `favicon.svg` | Ícono con "ll" (favicon, avatares) |
| `llevo-icono-app.svg`, `apple-touch-icon.png` | Ícono de app sobre azul |
| `og-image.png` | Imagen al compartir la web en redes y WhatsApp |

**Reglas**
- Espacio libre alrededor: al menos la altura de la letra "o".
- Tamaño mínimo: 24 px de alto en pantalla; por debajo usa el ícono "ll".
- No cambies la inclinación (−6°), los colores ni la tipografía. No le agregues sombras, degradados ni contornos.
- La cinta siempre es amarilla mantequilla y va en la esquina superior izquierda.

## Paleta: cielo y mantequilla

| Nombre | HEX | Uso |
| --- | --- | --- |
| Azul cielo | `#2F5BEA` | Logo, botones, enlaces, selección |
| Mantequilla | `#FFD166` | Acentos puntuales: cinta, destacados |
| Azul noche | `#14213D` | Textos y fondos oscuros |
| Cielo suave | `#E7EDFF` | Fondos de apoyo, botones secundarios |
| Crema | `#FFFAF1` | Fondo de la web |
| Gris texto | `#4A5470` / `#6B7489` | Texto secundario y tenue |

- Texto blanco sobre azul cielo: contraste 5.5:1 (cumple AA). Sobre mantequilla usa siempre azul noche.
- El azul domina; el mantequilla se usa poco (5–10 % de una pieza) para que destaque.
- Se evitan a propósito el naranja y el coral, que usan Lalamove, DiDi y Rappi.

## Tipografía

- **Fredoka** (600) para el logo, títulos y frases cortas grandes.
- **Nunito** (400 a 700) para textos, botones, formularios, números y el panel.
- Ambas son gratuitas (Google Fonts) y se cargan desde `@fontsource-variable`.

## Tono

Cercano y directo, de tú. Frases cortas, sin exclamaciones ni promesas que no podamos cumplir.
Ejemplo: "Tú lo empacas, nosotros lo llevamos".

## Movimiento (GSAP)

Animaciones con [GSAP](https://gsap.com) siguiendo las guías oficiales de
[greensock/gsap-skills](https://github.com/greensock/gsap-skills). El código está en `src/scripts/motion.ts`.

- **Una sola entrada al cargar:** el título sube palabra por palabra y la guía de despacho se arma
  (etiqueta, cinta, ruta, total que cuenta y el sello "Agendado").
- **Al hacer scroll:** cada bloque aparece una sola vez; en "Cómo funciona" una línea une los pasos.
- **Formulario:** el paso nuevo entra desde la dirección en la que avanzas; la barra de progreso se anima.
- **Panel:** las cifras del resumen cuentan desde cero.
- Solo se animan `transform` y opacidad, con curvas suaves (`power3.out`); nada en bucle.
- Si el sistema tiene **reducir movimiento** activado, todo aparece de inmediato sin animación.

## Microinteracciones (Motion)

Con [Motion](https://motion.dev) (antes Framer Motion), en su versión de JavaScript para no cargar React
en cada botón. Código en `src/scripts/micro.ts`. GSAP se encarga de las entradas y el scroll; Motion, de
las respuestas al tocar.

- Botones: se hunden un poco al presionarlos; la flecha se asoma al pasar el mouse.
- Logo: el sticker se despega un poco al pasar el mouse.
- WhatsApp: el botón se levanta y se inclina como saludando.
- Formulario: rebote al elegir una opción, las barras de tamaño crecen, los días responden al tocarlos,
  las fotos nuevas aparecen con un pequeño rebote y los campos con error hacen una sacudida suave.
- Preguntas frecuentes: la respuesta aparece suave.
- Panel: las tarjetas del resumen se levantan y las flechas de los enlaces se asoman.
- Todo con resortes cortos sobre `transform` y opacidad; con "reducir movimiento" no se ejecuta nada.

## Zona de servicio

Por ahora **solo Valledupar**. La ciudad sale de **Configuración → Negocio → Ciudad** y se muestra en la
portada, el paso de ruta del formulario, la sección del vehículo y las preguntas frecuentes.
