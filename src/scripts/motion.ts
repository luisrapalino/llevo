/**
 * Movimiento de la web pública con GSAP.
 * Entradas al cargar y al hacer scroll.
 * Con "reducir movimiento" no se anima nada.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText);
gsap.defaults({ ease: 'power3.out', duration: 0.5 });

const root = document.documentElement;
const ANIMATED = '[data-hero-title], [data-hero-fade], [data-hero-art], [data-reveal]';

function hero() {
  const title = document.querySelector<HTMLElement>('[data-hero-title]');
  const art = document.querySelector<HTMLElement>('[data-hero-art]');
  if (!title || !art) return;

  const split = SplitText.create(title, { type: 'words', mask: 'words' });
  const pin = art.querySelector('[data-hero-pin]');

  const tl = gsap.timeline();
  tl.set(title, { autoAlpha: 1 })
    .from(split.words, { yPercent: 110, duration: 0.7, stagger: 0.06 })
    .fromTo('[data-hero-fade]', { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, stagger: 0.08 }, '-=0.45')
    .fromTo(art, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.65 }, 0.15);
  if (pin) tl.from(pin, { y: -16, autoAlpha: 0, duration: 0.45, ease: 'back.out(2)' }, '-=0.2');
}

function reveals() {
  gsap.set('[data-reveal]', { autoAlpha: 0, y: 16 });
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 88%',
    once: true,
    onEnter: (els) => gsap.to(els, { autoAlpha: 1, y: 0, stagger: 0.06, overwrite: true }),
  });

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
    return;
  }
  document.fonts.ready.then(() => {
    hero();
    reveals();
    root.classList.remove('motion');
    ScrollTrigger.refresh();
  });
});
