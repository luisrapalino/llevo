# Llevo · Web para trasteos

Landing page para captar clientes de trasteos, mudanzas pequeñas y acarreos.
Hecha con **Astro**, **Tailwind CSS v4** e iconos **Heroicons** (vía `astro-icon`).

## Qué incluye

- **Hero** con llamada a la acción y una tarjeta ilustrativa de una solicitud.
- **Servicios**, **Cómo funciona**, **El vehículo** y **Preguntas frecuentes**.
- **Formulario de cotización en 5 pasos**:
  1. Servicio (tipo y tamaño de la carga)
  2. Ruta (recogida y entrega, piso, ascensor y botón "usar mi ubicación")
  3. Carga (fotos con arrastrar y soltar, objetos comunes, descripción, ayudantes, desarme y embalaje)
  4. Fecha y hora (próximos días, franja horaria, hora exacta y flexibilidad)
  5. Contacto (nombre, celular/WhatsApp, correo, medio preferido, notas y autorización de datos)
- Botón flotante de WhatsApp.

## Personalizar

Edita `src/config.ts`: nombre, número de WhatsApp, teléfono, correo, ciudad, horario y datos del vehículo.

## ¿A dónde llegan las solicitudes?

- **Sin configurar nada:** al enviar, se abre WhatsApp con un resumen de la solicitud dirigido a tu número.
  El cliente adjunta las fotos en el chat.
- **Con endpoint (recomendado para recibir las fotos):** copia `.env.example` a `.env` y define
  `PUBLIC_FORM_ENDPOINT` con la URL de un servicio de formularios que acepte archivos
  (Formspree, Getform, Basin…) o tu propio backend. El formulario se envía como `multipart/form-data`,
  con las fotos comprimidas en el campo `fotos` y un campo `resumen` con todo el texto.

## Comandos

| Comando           | Acción                                     |
| :---------------- | :----------------------------------------- |
| `npm install`     | Instala dependencias                       |
| `npm run dev`     | Servidor local en `http://localhost:4321`  |
| `npm run build`   | Genera el sitio estático en `./dist/`      |
| `npm run preview` | Previsualiza el build                      |
