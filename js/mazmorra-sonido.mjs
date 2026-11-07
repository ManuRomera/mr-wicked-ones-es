/**
 * Sonidos del constructor de mazmorras y ambiente de la mazmorra. Se sintetizan con la Web Audio API (sin archivos: ruido filtrado
 * y tonos con envolvente), así que no pesan nada, no tienen huecos ni cortes y el volumen es el de Foundry por el ajuste del módulo.
 *  · Efectos (cavar, rellenar, construir, demoler, puertas, trampas, látigo…): ajuste de cliente «mazmorraSonido».
 *  · Ambiente (goteo, picos lejanos, antorchas, ecos y los duendes charlando): ajuste de cliente «mazmorraAmbiente».
 * Cada receta es `(contexto, destino, instante, opciones)` para poder renderizarla también sin conexión y comprobarla.
 */
const MOD = "mr-wicked-ones-es";
const ajuste = k => { try { return game.settings.get(MOD, k); } catch { return null; } };

let ctx = null, salida = null, ambiente = null;
const ruidos = new WeakMap();

function contexto() {
  if (!ctx) ctx = game.audio?.context ?? new (window.AudioContext || window.webkitAudioContext)();
  if (!salida || salida.context !== ctx) {   // un limitador evita que varios sonidos a la vez saturen
    salida = ctx.createGain();
    const lim = ctx.createDynamicsCompressor(); lim.threshold.value = -8; lim.knee.value = 6; lim.ratio.value = 14; lim.attack.value = 0.002; lim.release.value = 0.12;
    salida.connect(lim); lim.connect(ctx.destination);
  }
  const v = Number(ajuste("mazmorraVolumen") ?? 0.8);
  salida.gain.value = Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0.8));
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

const ruidoBuf = c => {
  let b = ruidos.get(c);
  if (!b) { b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; ruidos.set(c, b); }
  return b;
};

/** Ráfaga de ruido filtrado: golpes de piedra, tierra que cae, siseos, chasquidos. */
function ruido(c, d, { t, dur, tipo = "bandpass", f = 1000, f2 = null, q = 1, vol = 0.4, ataque = 0.003 }) {
  const src = c.createBufferSource(); src.buffer = ruidoBuf(c); src.loop = true;
  const fl = c.createBiquadFilter(); fl.type = tipo; fl.Q.value = q; fl.frequency.setValueAtTime(f, t);
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0002), t + ataque); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(fl); fl.connect(g); g.connect(d); src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.05);
}

/** Tono con envolvente (y barrido de frecuencia opcional): golpes graves, campanillas, chillidos. */
function tono(c, d, { t, dur, f, f2 = null, tipo = "sine", vol = 0.3, ataque = 0.004, vibrato = 0 }) {
  const o = c.createOscillator(); o.type = tipo; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  if (vibrato) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 9; lg.gain.value = f * vibrato; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.05); }
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0002), t + ataque); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(d); o.start(t); o.stop(t + dur + 0.05);
}

const azar = (a, b) => a + Math.random() * (b - a);

/** Golpe de pico contra la roca. */
const pico = (c, d, t, v = 1) => {
  ruido(c, d, { t, dur: 0.09, f: azar(1500, 2400), q: 1.3, vol: 0.5 * v });
  tono(c, d, { t, dur: 0.14, f: azar(140, 180), f2: 65, vol: 0.5 * v });
  tono(c, d, { t, dur: 0.04, f: azar(2000, 2800), tipo: "triangle", vol: 0.12 * v });
};
const chillido = (c, d, t, m = 1, v = 0.18) => {
  tono(c, d, { t, dur: 0.17, f: 700 * m, f2: 1250 * m, tipo: "triangle", vol: v, vibrato: 0.04 });
  tono(c, d, { t: t + 0.1, dur: 0.12, f: 1250 * m, f2: 800 * m, tipo: "triangle", vol: v * 0.8 });
};
/** Grito de duende azotado: voz áspera que sube y baja con vibrato, con dos resonancias (formantes) y un soplo de aire. */
const grito = (c, d, t, m = 1, v = 0.3, dur = 0.38) => {
  const o = c.createOscillator(); o.type = "sawtooth";
  o.frequency.setValueAtTime(420 * m, t); o.frequency.exponentialRampToValueAtTime(1150 * m, t + dur * 0.3); o.frequency.exponentialRampToValueAtTime(640 * m, t + dur);
  const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 13; lg.gain.value = 55 * m; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.05);
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.02); g.gain.setValueAtTime(v, t + dur * 0.55); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  for (const [f, q, x] of [[1250 * m, 4, 1], [2700 * m, 5, 0.55]]) { const b = c.createBiquadFilter(); b.type = "bandpass"; b.frequency.value = f; b.Q.value = q; const bg = c.createGain(); bg.gain.value = x; o.connect(b); b.connect(bg); bg.connect(g); }
  g.connect(d); o.start(t); o.stop(t + dur + 0.05);
  ruido(c, d, { t, dur: dur * 0.8, f: 3200, q: 0.8, vol: v * 0.22, ataque: 0.02 });
};
const clang = (c, d, t, v = 0.3) => { for (const [f, x] of [[330, 1], [497, 0.6], [733, 0.4]]) tono(c, d, { t, dur: 0.6, f, vol: v * x, tipo: "sine" }); ruido(c, d, { t, dur: 0.05, tipo: "highpass", f: 3000, vol: v * 0.8 }); };

export const RECETAS = {
  clic: (c, d, t) => { ruido(c, d, { t, dur: 0.03, f: 2200, q: 2, vol: 0.22 }); tono(c, d, { t, dur: 0.05, f: 900, f2: 700, vol: 0.12 }); },
  cavar: (c, d, t) => {
    for (let i = 0; i < 3; i++) pico(c, d, t + i * 0.17 + azar(0, 0.025), 1 - i * 0.08);
    ruido(c, d, { t: t + 0.4, dur: 0.3, tipo: "highpass", f: 3500, vol: 0.1 });   // gravilla que cae
  },
  rellenar: (c, d, t) => { ruido(c, d, { t, dur: 0.65, tipo: "lowpass", f: 1100, f2: 200, vol: 0.5, ataque: 0.04 }); tono(c, d, { t: t + 0.25, dur: 0.3, f: 90, f2: 50, vol: 0.4 }); },
  sala: (c, d, t) => {
    for (let i = 0; i < 4; i++) {
      const k = t + i * 0.2;
      tono(c, d, { t: k, dur: 0.12, f: i % 2 ? 620 : 520, f2: 380, tipo: "triangle", vol: 0.3 });
      ruido(c, d, { t: k, dur: 0.05, f: 3200, q: 1.5, vol: 0.35 });
    }
    tono(c, d, { t: t + 0.85, dur: 0.5, f: 75, f2: 40, vol: 0.55 });
    ruido(c, d, { t: t + 0.85, dur: 0.4, tipo: "lowpass", f: 900, f2: 150, vol: 0.4 });
    [523.25, 659.25, 783.99].forEach((f, i) => tono(c, d, { t: t + 1.0 + i * 0.11, dur: 0.55, f, vol: 0.16, tipo: "triangle" }));
  },
  demoler: (c, d, t) => {
    ruido(c, d, { t, dur: 1.0, tipo: "lowpass", f: 1500, f2: 140, vol: 0.6, ataque: 0.01 });
    tono(c, d, { t, dur: 0.9, f: 60, f2: 33, vol: 0.5 });
    for (let i = 0; i < 6; i++) ruido(c, d, { t: t + 0.1 + i * 0.12 + azar(0, 0.05), dur: 0.05, f: azar(900, 2500), q: 2, vol: 0.18 });   // cascotes
  },
  puerta: (c, d, t) => {
    tono(c, d, { t, dur: 0.5, f: 90, f2: 165, tipo: "sawtooth", vol: 0.16, vibrato: 0.06 });
    ruido(c, d, { t, dur: 0.5, f: 700, f2: 1400, q: 4, vol: 0.12 });
    tono(c, d, { t: t + 0.5, dur: 0.2, f: 85, f2: 50, vol: 0.45 });
    ruido(c, d, { t: t + 0.5, dur: 0.08, f: 1500, vol: 0.25 });
  },
  trampa: (c, d, t) => {   // se arma: clics de mecanismo
    [1500, 1750, 2050, 2350].forEach((f, i) => { tono(c, d, { t: t + i * 0.07, dur: 0.03, f, tipo: "square", vol: 0.1 }); ruido(c, d, { t: t + i * 0.07, dur: 0.03, tipo: "highpass", f: 5000, vol: 0.12 }); });
    tono(c, d, { t: t + 0.32, dur: 0.12, f: 210, f2: 120, vol: 0.4 });
    ruido(c, d, { t: t + 0.32, dur: 0.07, f: 1800, vol: 0.25 });
  },
  trampaActiva: (c, d, t) => {
    ruido(c, d, { t, dur: 0.24, f: 500, f2: 5200, q: 2, vol: 0.5, ataque: 0.05 });
    clang(c, d, t + 0.22, 0.32);
    tono(c, d, { t: t + 0.22, dur: 0.3, f: 100, f2: 45, vol: 0.5 });
  },
  descubierta: (c, d, t) => { tono(c, d, { t, dur: 0.16, f: 660, f2: 600, vol: 0.22, tipo: "triangle" }); tono(c, d, { t: t + 0.17, dur: 0.3, f: 440, f2: 330, vol: 0.22, tipo: "triangle" }); },
  error: (c, d, t) => { tono(c, d, { t, dur: 0.2, f: 130, f2: 90, tipo: "sawtooth", vol: 0.22 }); tono(c, d, { t: t + 0.16, dur: 0.26, f: 100, f2: 70, tipo: "sawtooth", vol: 0.22 }); },
  extra: (c, d, t) => {   // monedas
    [1318.5, 1568, 2093, 1568].forEach((f, i) => tono(c, d, { t: t + i * 0.075, dur: 0.3, f, tipo: "triangle", vol: 0.16 }));
    ruido(c, d, { t, dur: 0.35, tipo: "highpass", f: 6000, vol: 0.06 });
  },
  latigo: (c, d, t) => {
    ruido(c, d, { t, dur: 0.14, f: 700, f2: 5200, q: 1.5, vol: 0.5, ataque: 0.06 });   // el silbido del cuero en el aire
    ruido(c, d, { t: t + 0.13, dur: 0.09, tipo: "highpass", f: 2200, vol: 1, ataque: 0.001 });   // el restallido
    tono(c, d, { t: t + 0.13, dur: 0.07, f: 3400, f2: 800, tipo: "square", vol: 0.4, ataque: 0.001 });
    tono(c, d, { t: t + 0.13, dur: 0.18, f: 150, f2: 55, vol: 0.6, ataque: 0.001 });   // el golpe seco
    ruido(c, d, { t: t + 0.22, dur: 0.4, tipo: "highpass", f: 1800, vol: 0.16 });   // el eco entre las paredes
  },
  chillidos: (c, d, t, o = {}) => { const n = Math.min(6, Math.max(1, o.n ?? 2)); for (let i = 0; i < n; i++) grito(c, d, t + 0.16 + i * azar(0.04, 0.13), azar(0.75, 1.5), 0.26, azar(0.28, 0.46)); },
  // ambiente
  gota: (c, d, t) => { tono(c, d, { t, dur: 0.08, f: azar(1700, 2200), f2: 800, vol: 0.12 }); tono(c, d, { t: t + 0.13, dur: 0.07, f: azar(1300, 1600), f2: 700, vol: 0.05 }); },
  picoLejano: (c, d, t) => { ruido(c, d, { t, dur: 0.07, tipo: "lowpass", f: 1400, vol: 0.12 }); tono(c, d, { t, dur: 0.12, f: 130, f2: 70, vol: 0.14 }); },
  chisporroteo: (c, d, t) => { for (let i = 0; i < 4; i++) ruido(c, d, { t: t + azar(0, 0.35), dur: 0.015, tipo: "highpass", f: 4000, vol: 0.07, ataque: 0.001 }); },
  eco: (c, d, t) => { ruido(c, d, { t, dur: 2.8, tipo: "lowpass", f: 140, vol: 0.22, ataque: 0.9 }); tono(c, d, { t, dur: 2.6, f: 48, vol: 0.08, ataque: 0.8 }); },
  charla: (c, d, t) => { const n = Math.floor(azar(2, 4)); for (let i = 0; i < n; i++) chillido(c, d, t + i * azar(0.12, 0.25), azar(0.7, 1.3), 0.05); }
};

export const efectosOn = () => ajuste("mazmorraSonido") !== false;
export const ambienteOn = () => ajuste("mazmorraAmbiente") !== false;

/** Reproduce un efecto (si los efectos están activados en este navegador). */
export function sonar(nombre, opciones = {}) {
  if (!efectosOn() || !RECETAS[nombre]) return;
  try {
    const c = contexto();
    if (c.state !== "running") {   // el navegador aún no ha dado permiso de audio: se reanuda y, si llega a tiempo, suena; nunca se encolan varios
      c.resume().then(() => { if (c.state === "running") RECETAS[nombre](c, salida, c.currentTime + 0.01, opciones); }).catch(() => {});
      return;
    }
    RECETAS[nombre](c, salida, c.currentTime + 0.01, opciones);
  } catch (e) { console.warn(`${MOD} | sonido`, e); }
}

/** Para las pruebas: renderiza una receta sin conexión y devuelve su pico, su volumen medio y cuánto dura. */
export async function medir(nombre, segundos = 3, opciones = {}) {
  const off = new OfflineAudioContext(1, 44100 * segundos, 44100), out = off.createGain(); out.connect(off.destination);
  RECETAS[nombre](off, out, 0.01, opciones);
  const d = (await off.startRendering()).getChannelData(0);
  let pico = 0, suma = 0, ultimo = 0;
  for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > pico) pico = a; suma += d[i] * d[i]; if (a > 0.003) ultimo = i; }
  return { nombre, pico: +pico.toFixed(3), rms: +Math.sqrt(suma / d.length).toFixed(4), dura: +(ultimo / 44100).toFixed(2) };
}

/* ------------------------------------------------------------------------------------------------ ambiente */

/**
 * Ambiente de la mazmorra mientras se observa: un zumbido grave constante y, de vez en cuando, goteo, picos lejanos, antorchas
 * que chisporrotean, ecos y duendes charlando (más a menudo cuantos más hay). `duendes()` da cuántos hay ahora.
 */
export function iniciarAmbiente(duendes = () => 0) {
  pararAmbiente();
  if (!ambienteOn()) return;
  let c; try { c = contexto(); } catch { return; }
  const nodos = { c, temporizadores: new Set(), fuentes: [] };
  // zumbido de cueva: ruido muy grave, con una respiración lenta
  const src = c.createBufferSource(); src.buffer = ruidoBuf(c); src.loop = true;
  const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 170;
  const g = c.createGain(); g.gain.value = 0.045;
  const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.08; lg.gain.value = 0.02; lfo.connect(lg); lg.connect(g.gain);
  src.connect(lp); lp.connect(g); g.connect(salida); src.start(); lfo.start();
  nodos.fuentes.push(src, lfo);
  ambiente = nodos;
  const programa = (receta, min, max, conDuendes = false) => {
    const siguiente = () => {
      const n = duendes();
      const t = setTimeout(() => {
        nodos.temporizadores.delete(t);
        if (ambiente !== nodos) return;
        if (c.state === "running" && (!conDuendes || duendes() > 0)) { try { RECETAS[receta](c, salida, c.currentTime + 0.02); } catch { /* sin audio */ } }
        siguiente();
      }, azar(min, max) * 1000 / (conDuendes ? Math.max(0.5, Math.min(3, n / 6)) : 1));
      nodos.temporizadores.add(t);
    };
    siguiente();
  };
  programa("gota", 2.5, 8);
  programa("chisporroteo", 1.5, 5);
  programa("picoLejano", 5, 13, true);
  programa("charla", 6, 15, true);
  programa("eco", 20, 50);
}

export function pararAmbiente() {
  if (!ambiente) return;
  const a = ambiente; ambiente = null;
  a.temporizadores.forEach(t => clearTimeout(t));
  for (const f of a.fuentes) { try { f.stop(); } catch { /* ya parada */ } }
}
