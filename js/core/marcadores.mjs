/**
 * Lógica pura de los marcadores de la partida (hitos y relojes). Mismo esquema y mismas reglas que MR- Dirección para que
 * los dos módulos puedan compartir datos: hitos (públicos o secretos al lograrse) y relojes de 2 a 12 segmentos
 * (del DJ, o públicos si se decide; con aviso opcional a la mesa y una frase de sabor por casilla).
 */
export const clampSeg = (v, max) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(max, Math.max(0, n)) : 0; };

export function milestonesState(defs, value) { const o = {}; for (const d of defs) o[d.id] = !!value?.[d.id]; return o; }
export function milestonesProgress(defs, value) { const s = milestonesState(defs, value); return { done: defs.filter(d => s[d.id]).length, total: defs.length }; }

/** Pulsar el segmento i: si ya está lleno y es el último, baja; si no, sube hasta él. */
export function clockAfterClick(current, index, segments) { const c = clampSeg(current, segments); return index + 1 === c ? index : index + 1; }
export const clockState = (defs, value) => Object.fromEntries(defs.map(d => [d.id, clampSeg(value?.[d.id], d.segments)]));

/** Hitos que ve la mesa: los que se revelan al lograrse (por defecto, todos). Los secretos solo los ve el DJ. */
export const publicMilestones = defs => defs.filter(d => d.public !== false);
/** Relojes que ve la mesa: solo los marcados como públicos. */
export const publicClocks = defs => defs.filter(d => d.public === true);

/** Frase de sabor al llegar a `to` casillas: una por casilla (la 1.ª al llegar a 1…); con una sola línea se usa siempre. */
export function phraseFor(phrases, to) {
  const p = Array.isArray(phrases) ? phrases.filter(x => typeof x === "string") : [];
  if (!p.length) return "";
  return (p.length === 1 ? p[0] : (p[to - 1] ?? "")).trim();
}

/** Aviso a la mesa al avanzar un reloj: solo si sube y el reloj avisa (o el DJ lo fuerza con una frase propia). null si no hay aviso. */
export function clockEvent(c, from, to, { phrase = null, force = false, now = Date.now() } = {}) {
  if (!(to > from) || !(c.announce === true || force)) return null;
  return { id: c.id, label: c.label, segments: c.segments, from, to, phrase: (typeof phrase === "string" && phrase.trim() ? phrase.trim() : phraseFor(c.phrases, to)), t: now };
}

/** Frases de un reloj: una por casilla, en orden; admite lista o texto con una por línea. */
export function normalizarFrases(v) {
  const a = Array.isArray(v) ? v : typeof v === "string" ? v.split(/\r?\n/) : [];
  const o = a.slice(0, 12).map(x => String(x ?? "").trim());
  while (o.length && !o[o.length - 1]) o.pop();
  return o;
}

const texto = (v, d = "") => (typeof v === "string" && v.trim() ? v.trim() : d);
export function normalizarHito(x) {
  return x && typeof x === "object" && x.id ? { id: String(x.id), label: texto(x.label, String(x.id)), public: x.public !== false } : null;
}
export function normalizarReloj(x) {
  if (!x || typeof x !== "object" || !x.id) return null;
  const seg = Math.round(Number(x.segments));
  return { id: String(x.id), label: texto(x.label, String(x.id)), segments: Number.isFinite(seg) ? Math.min(12, Math.max(2, seg)) : 6, public: x.public === true, announce: x.announce === true, phrases: normalizarFrases(x.phrases) };
}

/** Une listas por id: lo de `b` sustituye a lo de `a` con el mismo id y lo nuevo se añade al final. */
export function unirPorId(a, b) { const m = new Map(a.map(x => [x.id, x])); for (const x of b) m.set(x.id, x); return [...m.values()]; }

/** Normaliza `{milestones, clocks}` descartando lo inválido y los ids repetidos. */
export function normalizarMarcadores(raw) {
  const m = raw && typeof raw === "object" ? raw : {};
  const uniq = a => { const vistos = new Set(); return a.filter(x => x && !vistos.has(x.id) && vistos.add(x.id)); };
  return {
    milestones: uniq((Array.isArray(m.milestones) ? m.milestones : []).map(normalizarHito)),
    clocks: uniq((Array.isArray(m.clocks) ? m.clocks : []).map(normalizarReloj))
  };
}
