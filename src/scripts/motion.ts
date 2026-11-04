/**
 * Movimiento de la web pública con GSAP.
 * Siguiendo las guías oficiales de GreenSock (gsap-skills) y la regla de unslop:
 * una sola entrada al cargar, movimiento que explica algo y nada en bucle.
 * Con "reducir movimiento" activado en el sistema, todo aparece sin animación.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText);
gsap.defaults({ ease: 'power3.out', duration: 0.5 });

const root = document.documentElement;
const ANIMATED = '[data-hero-title], [data-hero-fade], [data-guide], [data-reveal]';
const cop = (n: number) => `$${(Math.round(n / 1000) * 1000).toLocaleString('es-CO')}`;

function hero() {
  const title = document.querySelector<HTMLElement>('[data-hero-title]');
  const guide = document.querySelector<HTMLElement>('[data-guide]');
  if (!title || !guide) return;

  const split = SplitText.create(title, { type: 'words', mask: 'words' });
  const total = guide.querySelector<HTMLElement>('[data-guide-total]');
  const counter = { v: 0 };

  if (total) total.textContent = cop(0);

  const tl = gsap.timeline();
  tl.set(title, { autoAlpha: 1 })
    .from(split.words, { yPercent: 110, duration: 0.7, stagger: 0.06 })
    .fromTo('[data-hero-fade]', { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, stagger: 0.08 }, '-=0.45')
    // La guía de despacho se arma: llega la caja, se pega la etiqueta, la cinta, la ruta y el sello
    .fromTo(guide, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 0.15)
    .from('[data-guide-label]', { y: -36, rotation: -5, autoAlpha: 0, duration: 0.7, ease: 'power4.out' }, '<0.15')
    .from('[data-guide-tape]', { scaleX: 0, transformOrigin: 'left center', duration: 0.35, stagger: 0.08 }, '-=0.25')
    .from('[data-guide-route]', { scaleY: 0, transformOrigin: 'top center', duration: 0.5 }, '<')
    .from('[data-guide-item]', { autoAlpha: 0, x: -8, duration: 0.3, stagger: 0.05 }, '<')
    .to(counter, {
      v: Number(total?.dataset.value ?? 0),
      duration: 0.9,
      ease: 'power2.out',
      onUpdate: () => {
        if (total) total.textContent = cop(counter.v);
      },
    }, '<0.1')
    .fromTo('[data-guide-stamp]', { scale: 1.8, rotation: -24, autoAlpha: 0 }, { scale: 1, rotation: -9, autoAlpha: 1, duration: 0.35, ease: 'back.out(2.2)' }, '>-0.1');
}

function reveals() {
  // Cada bloque aparece una sola vez cuando entra en pantalla
  gsap.set('[data-reveal]', { autoAlpha: 0, y: 16 });
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 88%',
    once: true,
    onEnter: (els) => gsap.to(els, { autoAlpha: 1, y: 0, stagger: 0.06, overwrite: true }),
  });

  // "Cómo funciona": una línea avanza y une los tres pasos mientras bajas
  const line = document.querySelector('[data-steps-line]');
  if (line) {
    gsap.fromTo(line, { scaleX: 0 }, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: { trigger: '[data-steps]', start: 'top 80%', end: 'bottom 55%', scrub: 0.6 },
    });
  }
}

const mm = gsap.matchMedia();
mm.add({ reduce: '(prefers-reduced-motion: reduce)', motion: '(prefers-reduced-motion: no-preference)' }, (context) => {
  if (context.conditions?.reduce) {
    gsap.set(ANIMATED, { autoAlpha: 1, clearProps: 'all' });
    gsap.set('[data-guide-stamp]', { rotation: -9 });
    return;
  }
  // Esperar las fuentes evita que SplitText corte mal las palabras
  document.fonts.ready.then(() => {
    hero();
    reveals();
    root.classList.remove('motion');
    ScrollTrigger.refresh();
  });
});
