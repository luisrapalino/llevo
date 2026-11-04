/**
 * Microinteracciones con Motion (antes Framer Motion), en su versión de JavaScript
 * para no cargar React en cada botón. GSAP sigue a cargo de las entradas y el scroll.
 * Reglas: respuestas cortas con resortes, solo transform y opacidad, nada que moleste.
 * Con "reducir movimiento" activado no se ejecuta nada.
 */
import { animate, hover, press } from 'motion';

const SNAP = { type: 'spring', stiffness: 600, damping: 30 } as const; // al presionar
const SOFT = { type: 'spring', stiffness: 380, damping: 24 } as const; // al soltar o pasar el mouse
const POP = { type: 'spring', stiffness: 500, damping: 18 } as const; // selección

const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const once = (el: Element, key: string) => {
  const flag = `micro${key}`;
  if ((el as HTMLElement).dataset[flag]) return false;
  (el as HTMLElement).dataset[flag] = '1';
  return true;
};

/** Botones: se hunden un poco al presionarlos y la flecha se asoma al pasar el mouse. */
function buttons(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('.btn, .btn-primary, .btn-ghost, .btn-dark').forEach((el) => {
    if (!once(el, 'Btn')) return;
    press(el, (target) => {
      animate(target, { scale: 0.96 }, SNAP);
      return () => animate(target, { scale: 1 }, SOFT);
    });
    const arrow = el.querySelector('[data-icon="heroicons:arrow-right"]');
    if (arrow) {
      hover(el, () => {
        animate(arrow, { x: 3 }, SOFT);
        return () => animate(arrow, { x: 0 }, SOFT);
      });
    }
  });
}

/** El sticker del logo se "despega" un poco al pasar el mouse. */
function logo(root: ParentNode) {
  root.querySelectorAll<HTMLImageElement>('img[src^="/brand/llevo-logo"]').forEach((img) => {
    if (!once(img, 'Logo')) return;
    const host = img.closest('a') ?? img;
    hover(host, () => {
      animate(img, { rotate: 5, y: -2 }, SOFT);
      return () => animate(img, { rotate: 0, y: 0 }, SOFT);
    });
    press(host, () => {
      animate(img, { scale: 0.94 }, SNAP);
      return () => animate(img, { scale: 1 }, SOFT);
    });
  });
}

/** Botón flotante de WhatsApp: se levanta y se inclina como saludando. */
function whatsapp(root: ParentNode) {
  const fab = root.querySelector<HTMLElement>('[data-fab]');
  if (!fab || !once(fab, 'Fab')) return;
  hover(fab, () => {
    animate(fab, { y: -3, rotate: -8 }, SOFT);
    return () => animate(fab, { y: 0, rotate: 0 }, SOFT);
  });
  press(fab, () => {
    animate(fab, { scale: 0.92 }, SNAP);
    return () => animate(fab, { scale: 1 }, SOFT);
  });
}

/** Tarjetas y chips seleccionables: un pequeño rebote al elegirlos. */
function selections() {
  document.addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement;
    if (!(input instanceof HTMLInputElement) || !['radio', 'checkbox'].includes(input.type)) return;
    const box = input.closest('.choice, .chip');
    if (!box || !input.checked) return;
    animate(box, { scale: [0.96, 1] }, POP);
    // Las barras de "¿Qué tanto vas a llevar?" crecen al elegir el tamaño
    const bars = box.querySelectorAll('[data-bar]');
    if (bars.length) animate(bars, { scaleY: [0.3, 1] }, { ...POP, delay: (i: number) => i * 0.05 });
  });

  // Días del formulario (botones que se crean con JavaScript)
  document.addEventListener('click', (e) => {
    const day = (e.target as Element).closest?.('[data-days] button');
    if (day && !(day as HTMLButtonElement).disabled) animate(day, { scale: [0.9, 1] }, POP);
  });
}

/** Campos con error: un "no" suave con la cabeza para que se note dónde corregir. */
function invalidShake() {
  document.addEventListener('llevo:invalid', (e) => {
    const el = e.target as Element;
    const box = el.closest('.choice, .chip') ?? el;
    animate(box, { x: [0, -6, 6, -4, 4, 0] }, { duration: 0.4, ease: 'easeOut' });
  });
}

/** Fotos del formulario: cada miniatura nueva aparece con un pequeño rebote. */
function photos() {
  const list = document.querySelector('[data-previews]');
  if (!list) return;
  let known = 0;
  new MutationObserver(() => {
    const items = Array.from(list.children);
    const fresh = items.slice(Math.min(known, items.length));
    if (items.length > known && fresh.length) animate(fresh, { scale: [0.8, 1], opacity: [0, 1] }, POP);
    known = items.length;
  }).observe(list, { childList: true });
}

/** Preguntas frecuentes: la respuesta aparece suave al abrir. */
function faq() {
  document.querySelectorAll<HTMLDetailsElement>('details[name="faq"]').forEach((d) => {
    d.addEventListener('toggle', () => {
      if (!d.open) return;
      const answer = d.querySelector('p');
      if (answer) animate(answer, { opacity: [0, 1], y: [-4, 0] }, { duration: 0.25, ease: 'easeOut' });
    });
  });
}

/** Panel: las flechas de los enlaces se asoman y las tarjetas se levantan un poco. */
function panel(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('a').forEach((a) => {
    const icon = a.querySelector('[data-icon="heroicons:arrow-up-right"], [data-icon="heroicons:arrow-right"]');
    if (!icon || a.matches('.btn, .btn-primary, .btn-ghost, .btn-dark') || !once(a, 'Link')) return;
    const up = icon.getAttribute('data-icon')?.endsWith('up-right');
    hover(a, () => {
      animate(icon, up ? { x: 2, y: -2 } : { x: 3 }, SOFT);
      return () => animate(icon, { x: 0, y: 0 }, SOFT);
    });
  });
  root.querySelectorAll<HTMLElement>('[data-lift]').forEach((card) => {
    if (!once(card, 'Lift')) return;
    hover(card, () => {
      animate(card, { y: -2 }, SOFT);
      return () => animate(card, { y: 0 }, SOFT);
    });
  });
  root.querySelectorAll<HTMLElement>('[data-menu] nav a').forEach((a) => {
    if (!once(a, 'Nav')) return;
    press(a, () => {
      animate(a, { scale: 0.97 }, SNAP);
      return () => animate(a, { scale: 1 }, SOFT);
    });
  });
}

if (!reduce()) {
  buttons(document);
  logo(document);
  whatsapp(document);
  selections();
  invalidShake();
  photos();
  faq();
  panel(document);
}
