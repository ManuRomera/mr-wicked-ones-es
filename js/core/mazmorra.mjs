/**
 * Lógica pura del constructor de mazmorras (sin Foundry): mapa de celdas, salas, puertas, muros que Foundry necesita,
 * decoración que cambia con las dimensiones de la sala y plan de luces.
 *
 * Celdas del terreno:  `#` roca base (no se excava) · `e` tierra virgen (se excava) · `.` túnel · `r` sala.
 * Una sala es un rectángulo de celdas `r` con un tipo (santuario, tesoro, enclave, escondrijo, forja, fortaleza, templo).
 * Una puerta está en el borde de una celda: `{x, y, d}` con `d` = n | e | s | w.
 */

/**
 * Tipos de sala. `nivel` es el de las reglas del manual (pág. 197): 1 y 2 valen en cualquier mazmorra, 3 son de temática.
 * Santuario y tesoro son la base de toda mazmorra (nivel 0, gratis y únicos). `min` es el tamaño mínimo [a, b] en cualquier
 * orientación: el manual no fija medidas («dibujad como os plazca»), son límites del módulo para que la sala quepa con su decoración.
 */
export const TIPOS_SALA = {
  santuario: { nombre: "Santuario", importante: true, nivel: 0, min: [3, 3], unica: true, nota: "El corazón de la mazmorra: trono, estandartes y alfombra hasta el fondo." },
  tesoro: { nombre: "Tesoro", importante: true, nivel: 0, min: [2, 2], unica: true, nota: "Tu botín. Cuanto más alto es el nivel de la mazmorra, más oro se amontona." },
  menor: { nombre: "Sala menor", importante: false, nivel: 1, min: [2, 2], nota: "Comedor, letrinas, jardín… Sube la moral: +1d en tu siguiente tirada de desastre." },
  guarida: { nombre: "Guarida de esbirros", importante: false, nivel: 2, min: [3, 3], nota: "Una panda de esbirros vive aquí: +1d al defenderla de invasores." },
  prision: { nombre: "Prisión", importante: false, nivel: 2, min: [3, 3], nota: "Cuatro celdas para prisioneros." },
  enclave: { nombre: "Enclave", importante: false, nivel: 3, min: [3, 3], tema: "enclave", nota: "Sala de nivel 3 de la temática Enclave." },
  escondrijo: { nombre: "Escondrijo", importante: false, nivel: 3, min: [3, 2], tema: "escondrijo", nota: "Sala de nivel 3 de la temática Escondrijo." },
  forja: { nombre: "Forja", importante: true, nivel: 3, min: [4, 3], tema: "forja", nota: "Sala de nivel 3 de la temática Forja: hornos, yunques y armas." },
  fortaleza: { nombre: "Fortaleza", importante: false, nivel: 3, min: [4, 3], tema: "fortaleza", nota: "Sala de nivel 3 de la temática Fortaleza." },
  templo: { nombre: "Templo", importante: false, nivel: 3, min: [4, 3], tema: "templo", nota: "Sala de nivel 3 de la temática Templo: altar, pilares y estatuas." }
};

/** Nombre de una temática de mazmorra (en español o inglés, como viene en la ficha) → clave de tipo de sala. */
export function tipoDeTema(nombre) {
  const t = String(nombre ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const tabla = { enclave: ["enclave"], escondrijo: ["escondrijo", "hideout"], forja: ["forja", "forge"], fortaleza: ["fortaleza", "stronghold", "fortress"], templo: ["templo", "temple"] };
  return Object.keys(tabla).find(k => tabla[k].some(n => t.includes(n))) ?? null;
}

export const DIRS = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };

export const abierta = c => c === "." || c === "r";

/** Mapa nuevo: borde de roca y tierra virgen dentro. */
export function crearMapa(w = 40, h = 28) {
  const t = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => (x === 0 || y === 0 || x === w - 1 || y === h - 1 ? "#" : "e")).join(""));
  return { v: 2, w, h, t, salas: [], puertas: [], obra: { total: 3, gastadas: 0 }, actor: null };
}

export const celda = (m, x, y) => (x < 0 || y < 0 || x >= m.w || y >= m.h ? "#" : m.t[y][x]);
function poner(m, x, y, c) { if (x < 0 || y < 0 || x >= m.w || y >= m.h) return; m.t[y] = m.t[y].slice(0, x) + c + m.t[y].slice(x + 1); }

export const salaEn = (m, x, y) => m.salas.find(s => x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h) ?? null;

export function excavar(m, x, y) {
  if (celda(m, x, y) !== "e") return false;
  poner(m, x, y, "."); return true;
}

export function rellenar(m, x, y) {
  if (celda(m, x, y) !== ".") return false;
  poner(m, x, y, "e");
  m.puertas = m.puertas.filter(p => !(p.x === x && p.y === y) && !(p.x + DIRS[p.d][0] === x && p.y + DIRS[p.d][1] === y));
  return true;
}

/** ¿Se puede construir una sala en este rectángulo? Debe estar dentro del borde y sin pisar otra sala. */
export function validarSala(m, r) {
  const { x, y, w, h } = r;
  if (w < 1 || h < 1) return { ok: false, motivo: "Tamaño no válido." };
  if (x < 1 || y < 1 || x + w > m.w - 1 || y + h > m.h - 1) return { ok: false, motivo: "Se sale del mapa o toca la roca base." };
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (celda(m, i, j) === "r") return { ok: false, motivo: "Ya hay otra sala aquí." };
  return { ok: true };
}

/** ¿Cabe un `w`×`h` en el mínimo del tipo (en cualquier orientación)? */
export function cabe(tipo, w, h) {
  const [a, b] = TIPOS_SALA[tipo]?.min ?? [1, 1];
  return (w >= a && h >= b) || (w >= b && h >= a);
}

/**
 * La sala se adapta al espacio marcado: si el rectángulo es menor que el mínimo del tipo, crece hacia la derecha y abajo
 * (o a la izquierda y arriba si no hay sitio) hasta el mínimo, en la orientación que menos obliga a crecer.
 * Devuelve el rectángulo final (con `ajustada: true` si cambió) o `null` si no hay espacio.
 */
export function ajustarSala(m, r, tipo) {
  if (cabe(tipo, r.w, r.h)) return { x: r.x, y: r.y, w: r.w, h: r.h, ajustada: false };
  const [a, b] = TIPOS_SALA[tipo]?.min ?? [1, 1];
  const opciones = [[a, b], [b, a]].map(([mw, mh]) => [Math.max(r.w, mw), Math.max(r.h, mh)]).sort((p, q) => p[0] * p[1] - q[0] * q[1]);
  for (const [w, h] of opciones) {
    const cand = [];
    for (let dx = 0; dx <= w - r.w; dx++) for (let dy = 0; dy <= h - r.h; dy++) cand.push({ x: r.x - dx, y: r.y - dy, w, h, d: dx + dy });
    cand.sort((p, q) => p.d - q.d);
    const ok = cand.find(c => validarSala(m, c).ok);
    if (ok) return { x: ok.x, y: ok.y, w: ok.w, h: ok.h, ajustada: true };
  }
  return null;
}

/** Reglas de temática (manual, pág. 197): una sala de nivel 3 es de la temática o, como mucho, una única de otra. `ctx.materiales[tipo] === false` bloquea por falta de materiales. */
export function reglasSala(m, tipo, ctx = {}) {
  const t = TIPOS_SALA[tipo]; if (!t) return { ok: false, motivo: "Tipo de sala desconocido." };
  if (t.unica && m.salas.some(s => s.tipo === tipo)) return { ok: false, motivo: `Ya tienes un ${t.nombre.toLowerCase()}: es único.` };
  if (t.nivel === 3) {
    if (ctx.materiales && ctx.materiales[tipo] === false) return { ok: false, motivo: `Para una sala de nivel 3 hacen falta los materiales (ficha de la mazmorra: «${t.nombre}»).` };
    if (ctx.tema && tipo !== ctx.tema) {
      const otras = m.salas.filter(s => TIPOS_SALA[s.tipo]?.nivel === 3 && s.tipo !== ctx.tema).length;
      if (otras >= 1) return { ok: false, motivo: "Solo puedes construir una sala de nivel 3 de otra temática." };
    }
  }
  return { ok: true };
}

/** Acciones de descanso que cuesta cada cosa (manual, pág. 238): nivel 1 = 1 tirada, nivel 2 = reloj de 4, nivel 3 = reloj de 8. */
export const COSTE_NIVEL = { 0: 0, 1: 1, 2: 2, 3: 4 };
export const TRAMO = 8;   // celdas de túnel que cuentan como un «túnel largo» (nivel 1)
export const costeSala = tipo => COSTE_NIVEL[TIPOS_SALA[tipo]?.nivel ?? 1];
export const costeExcavar = n => (n > 0 ? Math.ceil(n / TRAMO) : 0);

/** Presupuesto de la fase de acecho: `m.obra = { total, gastadas }`. Sin `obra` no hay límite. */
export function puedeGastar(m, coste) {
  const o = m.obra; if (!o || coste <= 0) return { ok: true };
  const quedan = Math.max(0, o.total - o.gastadas);
  return coste <= quedan ? { ok: true } : { ok: false, motivo: `Esto cuesta ${coste} acción${coste > 1 ? "es" : ""} de descanso y te quedan ${quedan}.` };
}
export function gastar(m, coste) { if (m.obra && coste > 0) m.obra.gastadas = Math.min(m.obra.total, m.obra.gastadas + coste); }

export function construirSala(m, r, tipo) {
  const t = TIPOS_SALA[tipo];
  if (!t) return { ok: false, motivo: "Tipo de sala desconocido." };
  const aj = ajustarSala(m, r, tipo);
  if (!aj) return { ok: false, motivo: `${t.nombre} necesita al menos ${t.min[0]}×${t.min[1]} y aquí no hay sitio.` };
  const rect = { x: aj.x, y: aj.y, w: aj.w, h: aj.h };
  const v = validarSala(m, rect);
  if (!v.ok) return v;
  const id = `s${(m.salas.reduce((a, s) => Math.max(a, Number(s.id.slice(1)) || 0), 0)) + 1}`;
  for (let j = rect.y; j < rect.y + rect.h; j++) for (let i = rect.x; i < rect.x + rect.w; i++) poner(m, i, j, "r");
  m.salas.push({ id, tipo, ...rect });
  return { ok: true, id, rect, ajustada: aj.ajustada };
}

/** Zona de una celda abierta: el id de su sala o «tunel». Los muros se levantan entre zonas distintas. */
const zona = (m, x, y) => { const c = celda(m, x, y); return c === "r" ? (salaEn(m, x, y)?.id ?? "r") : c === "." ? "tunel" : null; };

/** ¿Puede haber una puerta en el borde `d` de la celda (x, y)? Une dos celdas abiertas de zonas distintas. */
export function bordePuertaValido(m, x, y, d) {
  const [dx, dy] = DIRS[d];
  const a = zona(m, x, y), b = zona(m, x + dx, y + dy);
  return Boolean(a && b && a !== b);
}

/** Forma canónica del borde (solo n y w) para no duplicar puertas. */
const canon = (x, y, d) => (d === "s" ? { x, y: y + 1, d: "n" } : d === "e" ? { x: x + 1, y, d: "w" } : { x, y, d });

export function alternarPuerta(m, x, y, d) {
  if (!bordePuertaValido(m, x, y, d)) return { ok: false, motivo: "Una puerta va entre dos zonas distintas (túnel y sala, o dos salas)." };
  const c = canon(x, y, d), i = m.puertas.findIndex(p => p.x === c.x && p.y === c.y && p.d === c.d);
  if (i >= 0) { m.puertas.splice(i, 1); return { ok: true, puesta: false }; }
  m.puertas.push(c);
  return { ok: true, puesta: true };
}

export const hayPuerta = (m, x, y, d) => { const c = canon(x, y, d); return m.puertas.some(p => p.x === c.x && p.y === c.y && p.d === c.d); };

/** Quita una sala; sus puertas que ya no unen dos zonas desaparecen. */
export function quitarSala(m, id) {
  const s = m.salas.find(z => z.id === id);
  if (!s) return false;
  for (let j = s.y; j < s.y + s.h; j++) for (let i = s.x; i < s.x + s.w; i++) poner(m, i, j, ".");
  m.salas = m.salas.filter(z => z.id !== id);
  m.puertas = m.puertas.filter(p => bordePuertaValido(m, p.x, p.y, p.d));
  return true;
}

/**
 * Muros que necesita Foundry: un segmento por cada borde entre celda abierta y sólida, y entre zonas abiertas distintas.
 * Las puertas son segmentos con `puerta: true`. Los segmentos contiguos y del mismo tipo se funden en uno.
 * Coordenadas en celdas (el cliente las multiplica por el tamaño de la rejilla).
 */
export function muros(m) {
  const h = new Map(), v = new Map(); // h: borde horizontal (y → x)  ·  v: borde vertical (x → y)
  const marca = (mapa, a, b, puerta) => { if (!mapa.has(a)) mapa.set(a, new Map()); mapa.get(a).set(b, puerta); };
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const c = celda(m, x, y), za = zona(m, x, y);
    const n = celda(m, x, y - 1), zn = zona(m, x, y - 1);
    if ((abierta(c) !== abierta(n)) || (za && zn && za !== zn)) marca(h, y, x, Boolean(za && zn && hayPuerta(m, x, y, "n")));
    const w = celda(m, x - 1, y), zw = zona(m, x - 1, y);
    if ((abierta(c) !== abierta(w)) || (za && zw && za !== zw)) marca(v, x, y, Boolean(za && zw && hayPuerta(m, x, y, "w")));
  }
  const out = [];
  const fundir = (mapa, horizontal) => {
    for (const [linea, fila] of mapa) {
      const pos = [...fila.keys()].sort((a, b) => a - b);
      let ini = null, prev = null, tipo = null;
      const cerrar = () => { if (ini === null) return; out.push(horizontal ? { x1: ini, y1: linea, x2: prev + 1, y2: linea, puerta: tipo } : { x1: linea, y1: ini, x2: linea, y2: prev + 1, puerta: tipo }); ini = null; };
      for (const p of pos) {
        const t = fila.get(p);
        if (ini !== null && p === prev + 1 && t === tipo && !t) { prev = p; continue; }
        cerrar(); ini = p; prev = p; tipo = t;
      }
      cerrar();
    }
  };
  fundir(h, true); fundir(v, false);
  return out;
}

const OPUESTO = { n: "s", s: "n", e: "w", w: "e" };

/** Puertas de una sala → `[{x, y, lado}]`: (x, y) es la celda de dentro y `lado` el borde de la sala por el que se entra. */
export function entradasDe(sala, puertas = []) {
  const dentro = (i, j) => i >= sala.x && i < sala.x + sala.w && j >= sala.y && j < sala.y + sala.h;
  const out = [];
  for (const p of puertas) {
    const [dx, dy] = DIRS[p.d], a = [p.x, p.y], b = [p.x + dx, p.y + dy], ia = dentro(...a), ib = dentro(...b);
    if (ia === ib) continue;
    out.push({ x: (ia ? a : b)[0], y: (ia ? a : b)[1], lado: ia ? p.d : OPUESTO[p.d] });
  }
  return out;
}

/**
 * Decoración de una sala. Se diseña con coordenadas locales (u a lo ancho, v en profundidad: v = 0 es el muro del fondo) y se
 * gira según por dónde se entra: el fondo es siempre el muro opuesto a la puerta (sin puerta, el norte, o el este si la sala es
 * más ancha que alta). Así la alfombra, el trono o el altar miran a la puerta y la sala «se compone sola» con cualquier forma.
 * Cada tipo tiene su plano; el tamaño decide cuántas piezas lleva (ver comentarios). `opts.nivel` = nivel de la mazmorra (más oro).
 * Posiciones en celdas (0.5 = centro). El primer elemento es siempre el emblema del centro.
 */
export function decorar(sala, puertas = [], opts = {}) {
  const { x, y, w, h, tipo } = sala, el = [];
  const entradas = entradasDe(sala, puertas);
  const fondo = entradas.length ? OPUESTO[entradas[0].lado] : (w > h ? "e" : "n");
  const vert = fondo === "n" || fondo === "s";
  const W = vert ? w : h, D = vert ? h : w;
  const f = (u, v) => (fondo === "n" ? [x + u, y + v] : fondo === "s" ? [x + w - 1 - u, y + h - 1 - v] : fondo === "e" ? [x + w - 1 - v, y + u] : [x + v, y + h - 1 - u]);
  const eje = vert ? "v" : "h";
  const lado = (izq) => ({ n: izq ? "w" : "e", s: izq ? "e" : "w", e: izq ? "n" : "s", w: izq ? "s" : "n" })[fondo];   // lado del mundo al que cae u = 0 (izq) o u = W-1
  const k = (i, j) => `${i},${j}`;
  const reservado = new Set(), ocupado = new Set();
  for (const e of entradas) { reservado.add(k(e.x, e.y)); const [dx, dy] = DIRS[OPUESTO[e.lado]]; reservado.add(k(e.x + dx, e.y + dy)); }
  const dentro = (u, v) => u >= 0 && u < W && v >= 0 && v < D;
  const libre = (u, v) => dentro(u, v) && !ocupado.has(k(...f(u, v))) && !reservado.has(k(...f(u, v)));
  const poner = (t, u, v, extra = {}) => { if (!libre(u, v)) return false; const [i, j] = f(u, v); ocupado.add(k(i, j)); el.push({ tipo: t, x: i + 0.5, y: j + 0.5, ...extra }); return true; };
  const u0 = Math.floor((W - 1) / 2), v0 = Math.floor((D - 1) / 2);
  { const [i, j] = f(u0, v0); el.push({ tipo: "emblema", x: i + 0.5, y: j + 0.5 }); ocupado.add(k(i, j)); }
  const area = W * D, med = W >= 3 && D >= 3, grande = area > 15 || Math.max(W, D) >= 6;

  /** Alfombra a lo largo del eje de la puerta, de la entrada (v = D-1) a `hasta`, dejando libre el emblema. */
  const alfombra = (hasta) => {
    if (!(med && D - 1 - hasta >= 1)) return;
    const tramos = []; let ini = null;
    for (let v = D - 1; v >= hasta; v--) { if (v === v0) { if (ini !== null) { tramos.push([ini, v + 1]); ini = null; } continue; } if (ini === null) ini = v; }
    if (ini !== null) tramos.push([ini, hasta]);
    for (const [va, vb] of tramos) {
      const [i1, j1] = f(u0, va), [i2, j2] = f(u0, vb);
      el.push({ tipo: "alfombra", eje, x: Math.min(i1, i2), y: Math.min(j1, j2), w: Math.abs(i1 - i2) + 1, h: Math.abs(j1 - j2) + 1 });
      for (let v = Math.min(va, vb); v <= Math.max(va, vb); v++) ocupado.add(k(...f(u0, v)));
    }
  };
  /** Antorchas en los muros laterales (a lo largo de la sala), de 4 en 4 celdas de profundidad. */
  const antorchas = () => {
    if (D < 4) return;
    for (let v = 1; v < D - 1; v += 3) for (const izq of [true, false]) {
      const [i, j] = f(izq ? 0 : W - 1, v), l = lado(izq);
      if (l === "s" || reservado.has(k(i, j))) continue;
      el.push({ tipo: "antorcha", x: i + 0.5, y: j + 0.5, lado: l });
    }
  };
  const esquinas = (t, lejos = true, cerca = true) => {
    if (!med) { if (t === "brasero" && area >= 2) poner(t, 0, 0); return; }
    if (lejos) { poner(t, 0, 0); poner(t, W - 1, 0); }
    if (cerca) { poner(t, 0, D - 1); poner(t, W - 1, D - 1); }
  };
  const pilares = () => {
    if (!grande) return;
    const cols = W >= 5 ? [1, W - 2] : [], filas = []; if (D >= 5) for (let v = 2; v <= D - 3; v += 3) filas.push(v); else filas.push(v0);
    for (const v of filas) for (const u of cols) poner("pilar", u, v);
  };
  const fila = (t, v, paso = 2, desde = 0, hasta = W - 1, extra = {}) => { for (let u = desde; u <= hasta; u += paso) poner(t, u, v, extra); };

  if (tipo === "santuario") {
    alfombra(1);
    poner("trono", u0, 0);
    esquinas("brasero");
    for (let u = 1; u <= W - 2; u += 2) if (u !== u0) poner("estandarte", u, 0);
    pilares();
    if (W >= 7) { poner("estatua", 1, 1); poner("estatua", W - 2, 1); }
    antorchas();
  } else if (tipo === "tesoro") {
    poner("cofre", 0, 0); if (W > 1) poner("cofre", W - 1, 0);
    const montones = Math.min(area - 1, 1 + (opts.nivel ?? 0) + Math.floor(area / 4));
    let hechos = 0;
    for (let v = 0; v < D && hechos < montones; v++) for (let u = 0; u < W && hechos < montones; u++) if ((u + v) % 2 === 1 && poner("oro", u, v)) hechos++;
    for (let v = 0; v < D && hechos < montones; v++) for (let u = 0; u < W && hechos < montones; u++) if (poner("oro", u, v)) hechos++;
    if (W >= 4 && D >= 3) { poner("brasero", 0, D - 1); poner("brasero", W - 1, D - 1); }
  } else if (tipo === "menor") {
    poner("mesa", u0, v0 === 0 && D > 1 ? 1 : v0 + (D > 2 ? 1 : 0)); poner("barril", W - 1, 0);
    if (area >= 6) poner("jergon", 0, 0);
    if (med) esquinas("brasero", false, true);
  } else if (tipo === "guarida") {
    for (let v = 0; v < D; v += 2) { poner("jergon", 0, v); poner("jergon", W - 1, v); }
    poner("barril", u0, 0);
    if (med) poner("brasero", u0, D - 1);
    antorchas();
  } else if (tipo === "prision") {
    fila("jaula", 0, 2);
    if (D >= 5) fila("jaula", D - 1, 2);
    else if (W >= 5) fila("jaula", D - 1, 2);
    if (med) { poner("brasero", u0, D - 1); }
    antorchas();
  } else if (tipo === "enclave") {
    fila("jergon", 0, 2, 0, Math.min(W - 1, 6));
    poner("barril", W - 1, D - 1); if (D >= 5) poner("barril", W - 1, D - 2);
    if (W >= 5) { poner("mesa", 1, v0); poner("mesa", W - 2, v0); } else if (D >= 4) poner("mesa", 0, v0 + 1);
    esquinas("brasero", false, true);
    antorchas();
  } else if (tipo === "escondrijo") {
    poner("cofre", 0, 0); poner("cofre", W - 1, 0);
    if (W >= 4) poner("estanteria", u0, 0);
    poner("barril", 0, D - 1); poner("barril", W - 1, D - 1);
    if (D >= 3) poner("mesa", u0, v0 + 1);
    if (med) poner("brasero", u0, D - 1);
  } else if (tipo === "forja") {
    poner("armero", 0, 0); poner("armero", W - 1, 0);
    for (let u = 1; u <= W - 2; u += (W >= 7 ? 2 : 3)) poner("horno", u, 0);
    if (W >= 5) { poner("yunque", 1, v0); poner("yunque", W - 2, v0); } else poner("yunque", W - 1, v0);
    esquinas("brasero", false, true);
    pilares();
    antorchas();
  } else if (tipo === "fortaleza") {
    alfombra(1);
    for (let u = 0; u <= W - 1; u++) poner(u % 2 === 0 ? "armero" : "estandarte", u, 0);
    esquinas("brasero", false, true);
    pilares();
    if (W >= 7) { poner("estatua", 1, 1); poner("estatua", W - 2, 1); }
    antorchas();
  } else if (tipo === "templo") {
    alfombra(1);
    poner("altar", u0, 0);
    if (W >= 5) { poner("brasero", u0 - 1, 0); poner("brasero", u0 + 1, 0); } else esquinas("brasero", true, false);
    esquinas("brasero", false, true);
    pilares();
    if (W >= 7) { poner("estatua", 0, 0); poner("estatua", W - 1, 0); }
    antorchas();
  } else {
    esquinas("brasero");
  }
  return el;
}

/**
 * Antorchas de los túneles: en cada tramo recto de 3 o más celdas, una cada 4 celdas. Si el pasillo es horizontal van en el
 * muro norte (de frente); si es vertical, en los muros laterales (alternando oeste y este, de perfil). Cada una lleva su luz.
 */
export function antorchasTunel(m) {
  const out = [], esT = (x, y) => celda(m, x, y) === ".";
  const sol = (x, y) => !abierta(celda(m, x, y));
  for (let y = 0; y < m.h; y++) {
    let run = [];
    const cerrar = () => { if (run.length >= 3) for (let i = 1; i < run.length - 1; i += 4) out.push({ tipo: "antorcha", x: run[i] + 0.5, y: y + 0.5, lado: "n", eje: "h", tunel: true }); run = []; };
    for (let x = 0; x <= m.w; x++) { if (x < m.w && esT(x, y) && sol(x, y - 1) && sol(x, y + 1)) run.push(x); else cerrar(); }
  }
  for (let x = 0; x < m.w; x++) {
    let run = [], par = 0;
    const cerrar = () => { if (run.length >= 3) for (let i = 1; i < run.length - 1; i += 4) out.push({ tipo: "antorcha", x: x + 0.5, y: run[i] + 0.5, lado: (par++ % 2 ? "e" : "w"), eje: "v", tunel: true }); run = []; };
    for (let y = 0; y <= m.h; y++) { if (y < m.h && esT(x, y) && sol(x - 1, y) && sol(x + 1, y)) run.push(y); else cerrar(); }
  }
  return out;
}

/**
 * Luces de una sala (radios en casillas). De 3×3 en adelante, o si es importante (santuario, tesoro, forja), hay luz central:
 * su radio cubre la sala (media diagonal más un margen) sin pasar de 10. Los braseros y los hornos dan un resplandor pequeño.
 * El parpadeo de antorcha lo pone Foundry en la propia luz; los dibujos no se mueven.
 */
export function lucesDe(sala, puertas = [], opts = {}) {
  const { x, y, w, h } = sala, luces = [];
  if ((w >= 3 && h >= 3) || TIPOS_SALA[sala.tipo]?.importante) {
    const dim = Math.min(10, Math.max(3, Math.ceil(Math.hypot(w, h) / 2) + 1));
    luces.push({ x: x + w / 2, y: y + h / 2, dim, bright: Math.max(1, Math.round(dim / 2)), color: "#ff8833", tipo: "sala" });
  }
  if (w >= 3 && h >= 3) for (const e of decorar(sala, puertas, opts)) {
    if (e.tipo === "brasero") luces.push({ x: e.x, y: e.y, dim: 2.5, bright: 1, color: "#ff9a3c", tipo: "brasero" });
    else if (e.tipo === "horno") luces.push({ x: e.x, y: e.y, dim: 3, bright: 1.5, color: "#ff6a1f", tipo: "horno" });
  }
  return luces;
}

/** Luces de las antorchas de los túneles (radio pequeño: solo alumbran su tramo). */
export const lucesTunel = m => antorchasTunel(m).map(a => ({ x: a.x, y: a.y, dim: 3.5, bright: 1, color: "#ff9a3c", tipo: "antorcha" }));

/** Recuento rápido para el panel del constructor. */
export function resumen(m) {
  let tunel = 0, tierra = 0, sala = 0;
  for (const f of m.t) for (const c of f) { if (c === ".") tunel++; else if (c === "e") tierra++; else if (c === "r") sala++; }
  return { tunel, tierra, sala, salas: m.salas.length, puertas: m.puertas.length };
}
