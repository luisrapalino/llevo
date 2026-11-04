/**
 * Sonidos de Llevo, creados con Web Audio (sin archivos que descargar).
 * Tonos suaves tipo campanita: notas cortas con un ataque rápido y una cola que se apaga.
 * Los navegadores solo dejan sonar audio después de que la persona toca la página,
 * así que el contexto de audio se "despierta" en el primer toque o tecla.
 */
type Note = { f: number; at: number; dur: number; gain?: number };

let ctx: AudioContext | null = null;
const MUTE_KEY = 'llevo:sonido';

function audio() {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  return ctx;
}

// Despertar el audio con la primera interacción
if (typeof window !== 'undefined') {
  const wake = () => {
    const a = audio();
    if (a?.state === 'suspended') a.resume().catch(() => {});
  };
  window.addEventListener('pointerdown', wake, { once: true, capture: true });
  window.addEventListener('keydown', wake, { once: true, capture: true });
}

export function soundEnabled() {
  try {
    return localStorage.getItem(MUTE_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setSoundEnabled(on: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, on ? 'on' : 'off');
  } catch {
    /* sin almacenamiento: queda como estaba */
  }
}

function play(notes: Note[], volume = 0.18) {
  const a = audio();
  if (!a || a.state !== 'running') return false;
  const out = a.createGain();
  out.gain.value = volume;
  out.connect(a.destination);
  const t0 = a.currentTime + 0.01;
  for (const n of notes) {
    // Seno + un armónico suave: suena a campanita, no a pitido
    for (const [mult, level] of [
      [1, 1],
      [2, 0.18],
    ] as const) {
      const osc = a.createOscillator();
      const g = a.createGain();
      osc.type = 'sine';
      osc.frequency.value = n.f * mult;
      const start = t0 + n.at;
      const peak = (n.gain ?? 1) * level;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(peak, start + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, start + n.dur);
      osc.connect(g).connect(out);
      osc.start(start);
      osc.stop(start + n.dur + 0.05);
    }
  }
  return true;
}

/** Panel: llegó una solicitud nueva (dos notas que suben, "ding-ding"). */
export function chimeNew(force = false) {
  if (!force && !soundEnabled()) return false;
  return play([
    { f: 784, at: 0, dur: 0.45 }, // sol
    { f: 1175, at: 0.13, dur: 0.7 }, // re agudo
  ]);
}

/** Formulario: la solicitud se envió (arpegio alegre y corto). */
export function chimeSuccess() {
  return play(
    [
      { f: 523, at: 0, dur: 0.35, gain: 0.8 }, // do
      { f: 659, at: 0.09, dur: 0.35, gain: 0.8 }, // mi
      { f: 784, at: 0.18, dur: 0.4, gain: 0.9 }, // sol
      { f: 1047, at: 0.29, dur: 0.75 }, // do agudo
    ],
    0.14,
  );
}
