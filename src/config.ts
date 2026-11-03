// ⚙️ Datos del negocio — edítalos aquí y se actualizan en toda la web.
export const site = {
  name: 'Llevo',
  tagline: 'Trasteos y acarreos sin complicaciones',
  description:
    'Trasteos, mudanzas pequeñas y acarreos en tu ciudad. Cuéntanos qué llevas, sube fotos y recibe tu cotización por WhatsApp.',
  // Número en formato internacional, sin "+" ni espacios (ej. Colombia: 57 + número).
  whatsapp: '573000000000',
  phoneDisplay: '+57 300 000 0000',
  email: 'hola@llevo.co',
  city: 'Tu ciudad',
  hours: 'Lun a Sáb · 6:00 a.m. – 8:00 p.m.',
  vehicle: {
    name: 'Furgón / camioneta de carga',
    capacity: 'Hasta 1.5 toneladas',
    size: 'Platón de 3 × 1.8 m aprox.',
  },
};

export const whatsappLink = (text = '¡Hola! Quiero cotizar un trasteo 🚚') =>
  `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;
