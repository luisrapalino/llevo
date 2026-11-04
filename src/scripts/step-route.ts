/**
 * Ruta con curvas entre puntos (pasos del formulario), con el pin del logo viajando por ella.
 * - Punteada gris: lo que falta. Azul con estela: lo recorrido.
 * - El pin sigue la punta de la ruta, se eleva un poco mientras viaja y "aterriza" con un rebote.
 * Se usa en el stepper de escritorio (vertical), en el progreso del celular (horizontal) y en la pantalla de éxito.
 */
import { gsap } from 'gsap';

const PIN = 'M17 41c-1-6-14-14-14-25a14 14 0 1 1 28 0c0 11-13 19-14 25z';
const NS = 'http://www.w3.org/2000/svg';
let uid = 0;

type Pt = [number, number];

export interface StepRouteOptions {
  wrap: HTMLElement;
  /** Puntos de la ruta, relativos a `wrap`. */
  points: () => Pt[];
  /** Cuánto se curva cada tramo (px, hacia un lado y otro alternando). */
  bend: number;
  /** Distancia antes del punto donde queda la punta del pin (0 = encima del punto). */
  gap?: number;
  /** Alto del pin en px. */
  pinSize?: number;
  /** Dibuja los puntos de cada paso (si no, ya existen en la página). */
  dots?: boolean;
  /** Duración del viaje entre dos pasos. */
  duration?: number;
  reduce: () => boolean;
  onLand?: (i: number) => void;
}

export function stepRoute(o: StepRouteOptions) {
  const id = `ruta-${uid++}`;
  const gap = o.gap ?? 0;
  const h = o.pinSize ?? 26;
  const w = (h * 34) / 42;

  o.wrap.classList.add('relative');
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'pointer-events-none absolute inset-0 size-full overflow-visible');
  svg.innerHTML = `<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#2F5BEA" stop-opacity="0.3"/><stop offset="0.4" stop-color="#2F5BEA"/></linearGradient></defs>
    <path data-base fill="none" stroke="#D9D2C4" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="0 9"/>
    <path data-done fill="none" stroke="url(#${id})" stroke-width="4" stroke-linecap="round"/><g data-dots></g>`;
  o.wrap.prepend(svg);
  const base = svg.querySelector<SVGPathElement>('[data-base]')!;
  const done = svg.querySelector<SVGPathElement>('[data-done]')!;
  const grad = svg.querySelector<SVGLinearGradientElement>('linearGradient')!;
  const dotsG = svg.querySelector<SVGGElement>('[data-dots]')!;

  // El pin del logo (azul con borde blanco); `body` rebota sin mover la posición
  const pin = document.createElement('div');
  pin.setAttribute('aria-hidden', 'true');
  pin.className = 'pointer-events-none absolute left-0 top-0 z-10';
  pin.innerHTML = `<div data-body style="transform-origin:50% 100%"><svg width="${w}" height="${h}" viewBox="0 0 34 42" style="display:block;overflow:visible;filter:drop-shadow(0 2px 3px rgba(20,33,61,.25))"><path d="${PIN}" fill="#2F5BEA" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><circle cx="17" cy="16" r="5.5" fill="#fff"/></svg></div>`;
  o.wrap.append(pin);
  const body = pin.firstElementChild as HTMLElement;

  let pts: Pt[] = [];
  let stops: number[] = [0];
  let total = 1;
  let shown = 0;
  let index = 0;
  let ready = false;

  function build() {
    if (!o.wrap.offsetParent && getComputedStyle(o.wrap).position !== 'fixed') return (ready = false);
    pts = o.points();
    if (pts.length < 2) return (ready = false);
    const tmp = document.createElementNS(NS, 'path');
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    stops = [0];
    pts.slice(1).forEach((p, i) => {
      const p0 = pts[i];
      const dx = p[0] - p0[0], dy = p[1] - p0[1], len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len, s = (i % 2 === 0 ? 1 : -1) * o.bend;
      d += ` C${p0[0] + dx / 3 + nx * s} ${p0[1] + dy / 3 + ny * s} ${p[0] - dx / 3 - nx * s} ${p[1] - dy / 3 - ny * s} ${p[0]} ${p[1]}`;
      tmp.setAttribute('d', d);
      stops.push(tmp.getTotalLength());
    });
    base.setAttribute('d', d);
    done.setAttribute('d', d);
    total = stops[stops.length - 1] || 1;
    done.style.strokeDasharray = `${total} ${total}`;
    const [a, b] = [pts[0], pts[pts.length - 1]];
    grad.setAttribute('x1', String(a[0]));
    grad.setAttribute('y1', String(a[1]));
    grad.setAttribute('x2', String(b[0]));
    grad.setAttribute('y2', String(b[1]));
    if (o.dots) {
      dotsG.innerHTML = pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5"/>`).join('');
      paintDots();
    }
    ready = true;
    place(shown);
    return true;
  }

  function paintDots() {
    if (!o.dots) return;
    dotsG.querySelectorAll('circle').forEach((c, i) => {
      c.setAttribute('fill', i < index ? '#14213D' : i === index ? '#2F5BEA' : '#FFFFFF');
      c.setAttribute('stroke', i <= index ? 'none' : '#D9D2C4');
      c.setAttribute('stroke-width', '2');
    });
  }

  /** Pone la ruta azul y el pin en un largo dado. */
  function place(v: number) {
    shown = v;
    done.style.strokeDashoffset = String(total - v);
    const at = v - gap;
    let x: number, y: number;
    if (at >= 0) {
      ({ x, y } = done.getPointAtLength(at));
    } else {
      // antes del primer punto: sigue la dirección del primer tramo hacia atrás
      const p0 = done.getPointAtLength(0), p1 = done.getPointAtLength(Math.min(4, total));
      const l = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1;
      x = p0.x + ((p1.x - p0.x) / l) * at;
      y = p0.y + ((p1.y - p0.y) / l) * at;
    }
    gsap.set(pin, { x: x - w / 2, y: y - h * (41 / 42) });
  }

  /** Lleva la ruta y el pin hasta el paso `i`. */
  function go(i: number, { instant = false, duration = o.duration ?? 0.9 } = {}) {
    index = i;
    if (!ready && !build()) return;
    paintDots();
    const target = stops[Math.max(0, Math.min(i, stops.length - 1))];
    const still = instant || o.reduce() || Math.abs(target - shown) < 0.5;
    const state = { v: shown };
    gsap.killTweensOf(body);
    if (!still) gsap.to(body, { y: -6, scale: 1.08, duration: 0.2, ease: 'power2.out' });
    gsap.to(state, {
      v: target,
      duration: still ? 0 : duration,
      ease: 'power2.inOut',
      overwrite: true,
      onUpdate: () => place(state.v),
      onComplete: () => {
        if (!still) {
          gsap.to(body, { y: 0, scale: 1, duration: 0.55, ease: 'bounce.out' });
          o.onLand?.(i);
        }
      },
    });
  }

  new ResizeObserver(() => build() && place(stops[Math.min(index, stops.length - 1)])).observe(o.wrap);

  return { build, go, pin };
}
