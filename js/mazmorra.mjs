/**
 * Constructor de mazmorras al estilo Dungeon Keeper. El mapa vive en una bandera de la escena (ver core/mazmorra.mjs) y
 * cada cliente lo dibuja en 3/4: bloques de roca y tierra con cara frontal, suelos por tipo de sala y decoración que se
 * compone sola con la forma de la sala y por dónde se entra. Lo que Foundry ya sabe hacer lo hace Foundry: los muros y las
 * puertas son documentos `Wall` (visión, colisión y puertas que se abren) y las luces son `AmbientLight` con animación de antorcha.
 * Cualquier jugador (si el DJ lo permite) puede construir: sus acciones viajan por socket al DJ, que es quien edita la escena.
 * Las reglas del manual (acciones de descanso por fase de acecho, salas de nivel 3 con temática y materiales) se aplican desde
 * aquí y se explican en el panel; el DJ puede apagarlas en los ajustes del módulo.
 */
import {
  TIPOS_SALA, COSTE_NIVEL, TRAMO, FORMAS, MECANISMOS, crearMapa, celda, salaEn, excavar, rellenar, construirSala, quitarSala, alternarPuerta,
  validarCeldas, ajustarSala, celdasForma, reglasSala, costeSala, costeExcavar, costeTrampa, puedeGastar, gastar, tipoDeTema, muros, decorar,
  antorchasTunel, lucesDe, lucesTunel, ponerTrampa, editarTrampa, quitarTrampa, numDuendes, resumen, abierta, DIRS
} from "./core/mazmorra.mjs";
import { abrirTrampa, abrirExtra } from "./mazmorra-trampas.mjs";

const MOD = "mr-wicked-ones-es";
const FLAG = "mazmorra";
const RUTA = `modules/${MOD}/assets/wicked-isometric`;
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const App = foundry.applications?.api?.ApplicationV2;
const ALTO = 0.34;   // altura de los bloques, en celdas

let contenedor = null, overlay = null, texturas = {}, herramienta = null, tipoSala = "santuario", forma = "rect", giro = 0;
let pendiente = null, ticker = null, vasallos = [], vasalloMemoria = [];

export const mapaDe = escena => escena?.getFlag(MOD, FLAG) ?? null;
const geo = () => ({ S: canvas.grid.size, ox: canvas.dimensions.sceneRect.x, oy: canvas.dimensions.sceneRect.y });
const soyDJ = () => game.user.isGM && game.users.activeGM?.id === game.user.id;
const reglasOn = () => game.settings.get(MOD, "mazmorraReglas");

/* ------------------------------------------------------------------------------------------------ texturas */

const PROPS = ["brasero", "pilar", "estandarte", "estatua", "cofre", "oro", "yunque", "horno", "altar", "trono", "estanteria", "mesa", "jergon", "armero", "barril", "jaula"];
const TRAMPA_CLAVES = ["muro", "dardos", "pinchos", "roca", "sierra", "pendulo", "gas", "calambre", "mangual", "barril", "pozo", "cuchillas"];   // en el orden de MECANISMOS
const TEX = {
  ...Object.fromEntries([...TRAMPA_CLAVES.map(k => [`trampa_${k}`, `objetos/trampa_${k}_iso.webp`]), ["truco_marca", "objetos/truco_marca_iso.webp"]]),
  roca: "terrain/bedrock_iso.webp", tierra: "terrain/earth_iso.webp", tunel: "terrain/tunnel_iso.webp",
  puerta_cerrada: "objetos/puerta_cerrada_iso.webp", puerta_abierta: "objetos/puerta_abierta_iso.webp",
  ...Object.fromEntries(PROPS.map(p => [p, `objetos/${p}_iso.webp`])),
  ...Object.fromEntries(Object.keys(TIPOS_SALA).flatMap(t => [[`suelo_${t}`, `rooms/floor_${t}_iso.webp`], [`sala_${t}`, `rooms/room_${t}_iso.webp`]]))
};

async function cargarTexturas() {
  const cargar = foundry.canvas?.loadTexture ?? (src => PIXI.Assets.load(src));
  await Promise.all(Object.entries(TEX).map(async ([k, ruta]) => {
    if (texturas[k]) return;
    try { texturas[k] = await cargar(`${RUTA}/${ruta}`); } catch { texturas[k] = null; }   // si falta una pieza, se omite
  }));
}

/* ------------------------------------------------------------------------------------------------ dibujo */

function sprite(clave, x, y, ancho, alto) {
  const t = texturas[clave]; if (!t) return null;
  const s = new PIXI.Sprite(t); s.x = x; s.y = y; s.width = ancho; s.height = alto;
  return s;
}

/** Objeto vertical con la proporción de su imagen: `alto` en píxeles (sin pasar de `ancho`), anclado por los pies. */
function objeto(clave, cx, pies, alto, ancho = Infinity) {
  const t = texturas[clave]; if (!t) return null;
  const s = new PIXI.Sprite(t); s.scale.set(Math.min(alto / t.height, ancho / t.width)); s.anchor.set(0.5, 1); s.x = cx; s.y = pies;
  return s;
}

/** [alto, ancho máximo] de cada pieza, en celdas. Discretas: ninguna llena una celda entera salvo el pilar. */
const PIEZA = {
  brasero: [0.46, 0.5], pilar: [0.95, 0.55], estatua: [0.8, 0.7], estandarte: [0.9, 0.5], cofre: [0.5, 0.8], oro: [0.5, 0.9], yunque: [0.5, 0.8],
  horno: [0.85, 0.9], altar: [0.72, 0.95], trono: [0.95, 0.85], estanteria: [0.9, 0.9], mesa: [0.5, 0.95], jergon: [0.42, 0.95], armero: [0.8, 0.9],
  barril: [0.5, 0.7], jaula: [0.72, 0.85]
};

/** ¿Está abierta la puerta? Se mira el muro de Foundry que la implementa. */
function puertaAbierta(escena, p, S, ox, oy) {
  const x1 = ox + p.x * S, y1 = oy + p.y * S;
  const w = escena.walls.find(w => w.door && w.getFlag(MOD, "auto") && (
    (p.d === "n" && w.c[1] === y1 && w.c[3] === y1 && w.c[0] <= x1 + S / 2 && w.c[2] >= x1 + S / 2) ||
    (p.d === "w" && w.c[0] === x1 && w.c[2] === x1 && w.c[1] <= y1 + S / 2 && w.c[3] >= y1 + S / 2)));
  return w?.ds === 1;
}

/** Alfombra orientada: el dibujo (borde, rombos y flecos) corre a lo largo de su eje, horizontal o vertical. */
function dibujarAlfombra(e, S, ox, oy) {
  const g = new PIXI.Graphics(), horiz = e.eje === "h";
  const x0 = ox + e.x * S, y0 = oy + e.y * S, L = (horiz ? e.w : e.h) * S;
  const m = S * 0.17, ex = S * 0.05;                                                   // margen a los lados y holgura en los extremos
  const P = (a, b) => (horiz ? [x0 + a, y0 + b] : [x0 + b, y0 + a]);                    // (a: a lo largo, b: a lo ancho) → píxeles
  const rect = (a0, b0, a1, b1, fn) => { const [x, y] = P(a0, b0), [x2, y2] = P(a1, b1); fn(Math.min(x, x2), Math.min(y, y2), Math.abs(x2 - x), Math.abs(y2 - y)); };
  g.beginFill(0x7d1512, 0.96); rect(ex, m, L - ex, S - m, (x, y, w, h) => g.drawRect(x, y, w, h)); g.endFill();
  g.lineStyle(2, 0xc8921f, 0.9); rect(ex + 4, m + 4, L - ex - 4, S - m - 4, (x, y, w, h) => g.drawRect(x, y, w, h));
  g.lineStyle(0);
  const d = S * 0.13;
  for (let a = S * 0.5; a < L - S * 0.2; a += S) {
    const pts = [P(a, S / 2 - d), P(a + d, S / 2), P(a, S / 2 + d), P(a - d, S / 2)].flat();
    g.beginFill(0xc8921f, 0.85).drawPolygon(pts).endFill();
  }
  g.lineStyle(2, 0xe8c070, 0.9);                                                        // flecos en los dos extremos
  for (const a of [ex, L - ex]) for (let b = m + 5; b < S - m - 4; b += S * 0.1) { const s = a === ex ? -S * 0.035 : S * 0.035, [x1, y1] = P(a, b), [x2, y2] = P(a + s, b); g.moveTo(x1, y1).lineTo(x2, y2); }
  g.zIndex = -99900;
  return g;
}

/** Antorcha de muro. De frente (lado n) cuelga de la cara visible del muro norte; de perfil (w, e) sale de un muro lateral. */
function dibujarAntorcha(e, S, ox, oy, H) {
  const cx = ox + e.x * S, cy = oy + e.y * S, g = new PIXI.Graphics();
  const llama = (x, y) => {
    g.beginFill(0xff8a1f, 0.28).drawCircle(x, y, S * 0.13).endFill();
    g.beginFill(0xff8a1f, 0.95).drawEllipse(x, y, S * 0.04, S * 0.07).endFill();
    g.beginFill(0xffd36b, 0.95).drawEllipse(x, y + S * 0.01, S * 0.018, S * 0.04).endFill();
  };
  if (e.lado === "n") {                                                                 // pasillo o sala vistos de frente
    const y = cy - S * 0.5 - H * 0.62;
    g.beginFill(0x2a211c).drawRect(cx - 2, y, 4, H * 0.42).endFill(); g.beginFill(0x4a3a30).drawRect(cx - S * 0.04, y - 1, S * 0.08, 3).endFill();
    llama(cx, y - S * 0.045);
    g.zIndex = cy - S * 0.5 + 1;
  } else {                                                                              // de perfil, pegada al muro de un lado
    const dir = e.lado === "w" ? -1 : 1, borde = cx + dir * S * 0.5, x = borde - dir * S * 0.1, y = cy - S * 0.02;
    g.beginFill(0x2a211c).drawRect(Math.min(borde, x) - 1, y + S * 0.04, Math.abs(borde - x) + 2, 3).endFill();        // la escuadra que lo sujeta al muro
    g.beginFill(0x2a211c).drawRect(x - 2, y, 4, S * 0.13).endFill();
    llama(x, y - S * 0.035);
    g.zIndex = cy + S * 0.5;
  }
  return g;
}

/** Trampa o truco: su dibujo del manual (o un aviso genérico si el mecanismo es otro) y una insignia con el nivel. */
const COLOR_NIVEL = [0, 0x6f9a3e, 0xe0a02a, 0xc83a2a];
function dibujarTrampa(t, S, ox, oy, sube = 0) {
  const c = new PIXI.Container(), cx = ox + (t.x + 0.5) * S, cy = oy + (t.y + 0.5) * S - sube;
  const i = MECANISMOS.findIndex(n => n.toLowerCase() === String(t.mecanismo).toLowerCase());
  const tex = texturas[t.tipo === "truco" ? "truco_marca" : i >= 0 ? `trampa_${TRAMPA_CLAVES[i]}` : ""];
  if (tex) { const sp = new PIXI.Sprite(tex); sp.anchor.set(0.5); sp.scale.set(Math.min(S * 0.62 / tex.width, S * 0.62 / tex.height)); sp.x = cx; sp.y = cy; c.addChild(sp); }
  else {
    const g = new PIXI.Graphics(); g.beginFill(0x1c1612, 0.9).lineStyle(3, COLOR_NIVEL[t.nivel], 1).drawCircle(cx, cy, S * 0.26).endFill();
    g.lineStyle(0).beginFill(COLOR_NIVEL[t.nivel]).drawPolygon([cx, cy - S * 0.15, cx + S * 0.15, cy + S * 0.11, cx - S * 0.15, cy + S * 0.11]).endFill(); c.addChild(g);
  }
  const ins = new PIXI.Graphics(); ins.beginFill(COLOR_NIVEL[t.nivel]).lineStyle(2, 0x000000, 0.9).drawCircle(cx + S * 0.25, cy + S * 0.24, S * 0.1).endFill(); c.addChild(ins);
  const n = new PIXI.Text(String(t.nivel), { fontSize: Math.round(S * 0.13), fill: 0xffffff, stroke: 0x000000, strokeThickness: 3, fontWeight: "800" }); n.anchor.set(0.5); n.x = cx + S * 0.25; n.y = cy + S * 0.24; c.addChild(n);
  if (t.revelada) { c.alpha = 0.55; const r = new PIXI.Graphics(); r.lineStyle(2, 0xe0503a, 0.9).drawCircle(cx, cy, S * 0.34); c.addChild(r); }
  c.zIndex = cy + S * 0.3;
  return c;
}

/* ------------------------------------------------------------------------------------------------ vasallos constructores */

const TIPOS_VASALLO = [
  { cuerpo: 0x6f9a3e, ropa: 0x4a3426, ojos: 0xffe08a },   // goblin
  { cuerpo: 0xb8402f, ropa: 0x2b1a1a, ojos: 0xffd34e },   // diablillo
  { cuerpo: 0xc69a4e, ropa: 0x5a3a22, ojos: 0xffffff },   // kobold
  { cuerpo: 0x8696a4, ropa: 0x3a3f49, ojos: 0xff6a4a }    // duende gris
];

/** Figura diminuta dibujada con vectores (24 px de alto): cuerpo, cabeza con orejas, ojos y un pico en la mano. */
function figuraVasallo(t) {
  const c = new PIXI.Container(), g = new PIXI.Graphics(), pico = new PIXI.Graphics();
  g.beginFill(0x000000, 0.35).drawEllipse(0, 11, 7, 2.2).endFill();                                   // sombra en el suelo
  g.beginFill(t.ropa).drawRoundedRect(-4.5, 1, 9, 10, 3).endFill();                                    // cuerpo
  g.beginFill(t.cuerpo).drawRect(-4, 9.5, 3, 3).drawRect(1, 9.5, 3, 3).endFill();                      // pies
  g.beginFill(t.cuerpo).drawEllipse(0, -3, 5.5, 5).endFill();                                          // cabeza
  g.beginFill(t.cuerpo).drawPolygon([-5, -4, -10, -7, -5, -1]).drawPolygon([5, -4, 10, -7, 5, -1]).endFill();   // orejas
  g.beginFill(0x000000).drawCircle(-2.2, -3.5, 1.5).drawCircle(2.2, -3.5, 1.5).endFill();
  g.beginFill(t.ojos).drawCircle(-2.2, -3.6, 0.8).drawCircle(2.2, -3.6, 0.8).endFill();
  pico.lineStyle(1.6, 0x6b4a2a).moveTo(0, 0).lineTo(0, -9); pico.lineStyle(0);
  pico.beginFill(0x9aa0a8).drawPolygon([-4, -9, 4, -9, 0, -12]).endFill();
  pico.x = 5.5; pico.y = 4; pico.rotation = 0.35;
  c.addChild(g, pico); c.pico = pico;
  return c;
}

const abiertas = m => { const l = []; for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) if (abierta(celda(m, i, j))) l.push([i, j]); return l; };

/** Camino más corto entre dos celdas abiertas (anchura primero). */
function camino(m, a, b) {
  const k = (i, j) => j * m.w + i, prev = new Map([[k(...a), null]]), cola = [a];
  while (cola.length) {
    const [i, j] = cola.shift();
    if (i === b[0] && j === b[1]) break;
    for (const [dx, dy] of Object.values(DIRS)) {
      const ni = i + dx, nj = j + dy;
      if (!abierta(celda(m, ni, nj)) || prev.has(k(ni, nj))) continue;
      prev.set(k(ni, nj), [i, j]); cola.push([ni, nj]);
    }
  }
  if (!prev.has(k(...b))) return null;
  const ruta = []; for (let c = b; c; c = prev.get(k(...c))) ruta.unshift(c);
  return ruta.slice(1);
}

function objetivo(m, v) {
  const salas = m.salas;
  let destino;
  if (salas.length && Math.random() < 0.6) { const s = salas[Math.floor(Math.random() * salas.length)]; destino = [s.x + Math.floor(Math.random() * s.w), s.y + Math.floor(Math.random() * s.h)]; }
  else { const l = abiertas(m); destino = l[Math.floor(Math.random() * l.length)]; }
  const ruta = destino && camino(m, [Math.floor(v.x), Math.floor(v.y)], destino);
  v.ruta = ruta ?? []; v.jx = (Math.random() - 0.5) * 0.45; v.jy = (Math.random() - 0.5) * 0.35;
  v.estado = v.ruta.length ? "camina" : "trabaja"; v.t = 1 + Math.random() * 2;
}

function crearVasallos(m, S, ox, oy) {
  vasallos = [];
  if (!game.settings.get(MOD, "mazmorraVasallos")) return;
  const libres = abiertas(m); if (!libres.length) return;
  const n = numDuendes(m, Number(actorDe(m)?.system.tier?.value) || 0);
  const lienzo = new PIXI.Container(); lienzo.sortableChildren = true; contenedor.addChild(lienzo);
  for (let k = 0; k < n; k++) {
    const mem = vasalloMemoria[k];
    const [i, j] = mem && abierta(celda(m, mem.i, mem.j)) ? [mem.i, mem.j] : libres[Math.floor(Math.random() * libres.length)];
    const tipo = mem?.tipo ?? k % TIPOS_VASALLO.length, cont = figuraVasallo(TIPOS_VASALLO[tipo]);
    const esc0 = (S * 0.19) / 24; cont.scale.set(esc0); lienzo.addChild(cont);
    const v = { cont, esc: esc0, tipo, x: i + 0.5, y: j + 0.5, vel: 0.45 + Math.random() * 0.5, fase: Math.random() * 6, ruta: [], estado: "trabaja", t: Math.random() * 2, jx: 0, jy: 0 };
    vasallos.push(v);
  }
}

function pasoVasallos(dt) {
  const m = mapaDe(canvas.scene); if (!m || !contenedor) return;
  const { S, ox, oy } = geo(), ahora = performance.now() / 1000;
  for (const v of vasallos) {
    if (v.estado === "trabaja") {
      v.t -= dt; v.cont.pico.rotation = 0.35 + Math.sin(ahora * 11 + v.fase) * 0.9; v.cont.rotation = 0;
      if (v.t <= 0) objetivo(m, v);
    } else {
      const sig = v.ruta[0];
      if (!sig) { v.estado = "trabaja"; v.t = 2 + Math.random() * 3; }
      else {
        const tx = sig[0] + 0.5 + v.jx, ty = sig[1] + 0.5 + v.jy, dx = tx - v.x, dy = ty - v.y, d = Math.hypot(dx, dy), paso = v.vel * dt;
        if (d <= paso) { v.x = tx; v.y = ty; v.ruta.shift(); } else { v.x += dx / d * paso; v.y += dy / d * paso; }
        if (Math.abs(dx) > 0.02) v.cont.scale.x = Math.sign(dx) * v.esc;
        v.cont.pico.rotation = 0.35; v.cont.rotation = Math.sin(ahora * 14 + v.fase) * 0.13;
      }
    }
    const salto = v.estado === "camina" ? Math.abs(Math.sin(ahora * 14 + v.fase)) * S * 0.015 : 0;
    v.cont.x = ox + v.x * S; v.cont.y = oy + v.y * S - salto; v.cont.zIndex = v.cont.y + S * 0.2;
  }
  vasalloMemoria = vasallos.map(v => ({ i: Math.floor(v.x), j: Math.floor(v.y), tipo: v.tipo }));
}

function arrancarTicker() {
  if (ticker || !canvas?.app?.ticker) return;
  ticker = () => { try { pasoVasallos(canvas.app.ticker.deltaMS / 1000); } catch (e) { console.warn(`${MOD} | vasallos`, e); } };
  canvas.app.ticker.add(ticker);
}
function pararTicker() { if (ticker) { canvas?.app?.ticker?.remove(ticker); ticker = null; } }

/* ------------------------------------------------------------------------------------------------ dibujo del mapa */

export function dibujar() {
  if (!canvas?.ready || !canvas.scene) return;
  const m = mapaDe(canvas.scene);
  quitarContenedor();
  if (!m) return;
  const { S, ox, oy } = geo(), H = ALTO * S, nivel = Number(actorDe(m)?.system.tier?.value) || 0;
  contenedor = new PIXI.Container(); contenedor.sortableChildren = true; contenedor.name = "mr-wo-mazmorra";
  contenedor.elevation = 0; contenedor.sortLayer = 100; contenedor.sort = 0; contenedor.zIndex = 0;
  const lineas = new PIXI.Graphics(), sombras = new PIXI.Graphics();
  contenedor.addChild(sombras);
  const decor = new Map(m.salas.map(s => [s.id, decorar(s, m.puertas, { nivel })]));

  // 1) suelos
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const c = celda(m, x, y); if (!abierta(c)) continue;
    const px = ox + x * S, py = oy + y * S;
    let clave = "tunel";
    if (c === "r") {
      const sala = salaEn(m, x, y), centro = decor.get(sala.id)[0];
      clave = (Math.floor(centro.x) === x && Math.floor(centro.y) === y && texturas[`sala_${sala.tipo}`]) ? `sala_${sala.tipo}` : `suelo_${sala.tipo}`;
    }
    const s = sprite(clave, px, py, S, S); if (s) { s.zIndex = -100000 + y; contenedor.addChild(s); }
    // sombra bajo la cara frontal de la roca (norte) y junto a los muros laterales
    if (!abierta(celda(m, x, y - 1))) { sombras.beginFill(0x000000, 0.42).drawRect(px, py, S, S * 0.32).endFill(); sombras.beginFill(0x000000, 0.22).drawRect(px, py + S * 0.32, S, S * 0.2).endFill(); }
    if (!abierta(celda(m, x - 1, y))) sombras.beginFill(0x000000, 0.28).drawRect(px, py, S * 0.18, S).endFill();
    if (!abierta(celda(m, x + 1, y))) sombras.beginFill(0x000000, 0.2).drawRect(px + S * 0.84, py, S * 0.16, S).endFill();
  }
  sombras.zIndex = -99990;

  // 2) bloques de roca y tierra con su cara frontal
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const c = celda(m, x, y); if (abierta(c)) continue;
    const px = ox + x * S, py = oy + y * S, clave = c === "#" ? "roca" : "tierra";
    const cima = sprite(clave, px, py - H, S, S); if (cima) { cima.zIndex = py + S; contenedor.addChild(cima); }
    if (abierta(celda(m, x, y + 1))) {
      const cara = sprite(clave, px, py + S - H, S, H); if (cara) { cara.tint = 0x6a6a6a; cara.zIndex = py + S; contenedor.addChild(cara); }
      lineas.lineStyle(2, 0x000000, 0.55).moveTo(px, py + S - H).lineTo(px + S, py + S - H);
    }
    lineas.lineStyle(1, 0x000000, 0.25).drawRect(px, py - H, S, S);
  }
  lineas.zIndex = 99990; contenedor.addChild(lineas);

  // 3) decoración de las salas: cada tipo tiene su plano y se orienta hacia la puerta (ver decorar())
  const pieza = (e) => {
    const [alto, ancho] = PIEZA[e.tipo] ?? [0.5, 0.6], cx = ox + e.x * S, cy = oy + e.y * S, j = Math.floor(e.y);
    let pies = cy + S * 0.34;
    if (!abierta(celda(m, Math.floor(e.x), j + 1))) pies = Math.min(pies, cy + S * 0.5 - H + S * 0.02);   // junto al muro sur el bloque tapa los pies: se sube un poco
    const o = objeto(e.tipo, cx, pies, alto * S, ancho * S); if (o) o.zIndex = pies;
    return o;
  };
  for (const sala of m.salas) for (const e of decor.get(sala.id)) {
    if (e.tipo === "emblema") continue;
    if (e.tipo === "alfombra") { contenedor.addChild(dibujarAlfombra(e, S, ox, oy)); continue; }
    if (e.tipo === "antorcha") { contenedor.addChild(dibujarAntorcha(e, S, ox, oy, H)); continue; }
    const o = pieza(e); if (o) contenedor.addChild(o);
  }
  // 3b) antorchas de los pasillos: de frente en los horizontales, de perfil en los verticales
  for (const e of antorchasTunel(m)) contenedor.addChild(dibujarAntorcha(e, S, ox, oy, H));

  // 3c) trampas y trucos: las ven todos; las descubiertas se dibujan apagadas
  for (const t of m.trampas ?? []) contenedor.addChild(dibujarTrampa(t, S, ox, oy, abierta(celda(m, t.x, t.y + 1)) ? 0 : S * 0.16));   // junto al muro sur el bloque tapa la parte baja: se sube

  // 4) puertas (los muros los pone Foundry; aquí solo el dibujo)
  for (const p of m.puertas) {
    const clave = puertaAbierta(canvas.scene, p, S, ox, oy) ? "puerta_abierta" : "puerta_cerrada";
    if (p.d === "n") {
      const o = objeto(clave, ox + p.x * S + S / 2, oy + p.y * S + S * 0.1, S * 0.95);
      if (o) { o.zIndex = oy + p.y * S + S * 0.4; contenedor.addChild(o); }
    } else {
      const g = new PIXI.Graphics(), x0 = ox + p.x * S, y0 = oy + p.y * S + S * 0.1;
      const abierta = clave === "puerta_abierta";
      g.beginFill(0x4a4a44).drawRect(x0 - 9, y0 - 6, 18, S * 0.8 + 12).endFill();                                      // jamba de piedra
      g.beginFill(abierta ? 0x120d0b : 0x8a3a1c).drawRect(x0 - 5, y0, 10, S * 0.8).endFill();
      if (!abierta) { g.beginFill(0x2a2420).drawRect(x0 - 5, y0 + S * 0.2, 10, 5).drawRect(x0 - 5, y0 + S * 0.55, 10, 5).endFill(); }
      g.lineStyle(2, 0x1c1612).drawRect(x0 - 9, y0 - 6, 18, S * 0.8 + 12); g.zIndex = oy + p.y * S + S; contenedor.addChild(g);
    }
  }

  (canvas.primary ?? canvas.stage).addChild(contenedor);
  crearVasallos(m, S, ox, oy);
  if (vasallos.length) arrancarTicker(); else pararTicker();
}

function quitarContenedor() { pararTicker(); vasallos = []; if (contenedor) { contenedor.destroy({ children: true }); contenedor = null; } }

function limpiar() { quitarContenedor(); quitarOverlay(); }

/* ------------------------------------------------------------------------------------------------ ficha de la mazmorra (reglas) */

/** La ficha de mazmorra que alimenta las reglas: la elegida en el panel o, si solo hay una, esa. */
function actorDe(m) {
  return (m?.actor && game.actors?.get(m.actor)) || game.actors?.find(a => a.type === "dungeon") || null;
}

/** Nivel, temática y salas de nivel 3 de la ficha, en la forma que usa `reglasSala`. */
function contextoReglas(m) {
  const a = actorDe(m); if (!a) return { actor: null, materiales: null, tema: null };
  const tema = a.items.find(i => i.type === "dungeon_theme"), salas3 = a.items.filter(i => i.type === "tier3room"), materiales = {};
  for (const [k, t] of Object.entries(TIPOS_SALA)) if (t.nivel === 3) materiales[k] = salas3.some(i => tipoDeTema(i.system.theme) === k && !i.system.missing_materials);
  return { actor: a, nivel: Number(a.system.tier?.value) || 0, tema: tipoDeTema(tema?.name), temaNombre: tema?.name ?? "", materiales, salas3 };
}

/** Acciones de descanso de una fase de acecho: una por cada PJ más la de los duendes (los esbirros pagados suman más a mano). */
const accionesPorDefecto = () => Math.max(2, (game.actors?.filter(a => a.type === "character" && a.hasPlayerOwner).length ?? 0) + 1);

async function reiniciarObra(escena) {
  const m = foundry.utils.deepClone(mapaDe(escena)); if (!m) return;
  m.obra = { total: accionesPorDefecto(), gastadas: 0, extra: 0 };
  await escena.setFlag(MOD, FLAG, m);
  ChatMessage.create({ content: `<p><strong>Nueva fase de acecho.</strong> La mazmorra tiene ${m.obra.total} acciones de descanso para excavar y construir.</p>`, flags: { [MOD]: { tarjeta: true } } });
}

/* ------------------------------------------------------------------------------------------------ muros y luces nativos */

const claveMuro = (w, puerta) => `${w.join(",")}|${puerta ? 1 : 0}`;

/** Deja los `Wall` y `AmbientLight` de la escena como pide el mapa (solo el DJ). Lo que no lleva la bandera `auto` no se toca. */
export async function sincronizarEntorno(escena = canvas.scene) {
  if (!game.user.isGM || !escena) return;
  const m = mapaDe(escena); if (!m) return;
  const S = escena.grid.size, ox = escena.dimensions.sceneRect.x, oy = escena.dimensions.sceneRect.y, dist = escena.grid.distance || 1;

  // muros y puertas
  const deseados = new Map();
  for (const s of muros(m)) { const c = [ox + s.x1 * S, oy + s.y1 * S, ox + s.x2 * S, oy + s.y2 * S]; deseados.set(claveMuro(c, s.puerta), { c, puerta: s.puerta }); }
  const actuales = new Map(escena.walls.filter(w => w.getFlag(MOD, "auto")).map(w => [claveMuro(w.c, w.door === 1), w]));
  const borrar = [...actuales].filter(([k]) => !deseados.has(k)).map(([, w]) => w.id);
  const crear = [...deseados].filter(([k]) => !actuales.has(k)).map(([, d]) => ({ c: d.c, door: d.puerta ? 1 : 0, ds: 0, move: 20, sense: 20, sound: 20, light: 20, flags: { [MOD]: { auto: true } } }));
  if (borrar.length) await escena.deleteEmbeddedDocuments("Wall", borrar);
  if (crear.length) await escena.createEmbeddedDocuments("Wall", crear);

  // luces con animación de antorcha: salas (centro, braseros, hornos) y antorchas de los pasillos
  const nivel = Number(actorDe(m)?.system.tier?.value) || 0, luces = new Map();
  for (const sala of m.salas) for (const l of lucesDe(sala, m.puertas, { nivel })) luces.set(`${sala.id}|${l.tipo}|${l.x}|${l.y}|${l.dim}`, l);
  for (const l of lucesTunel(m)) luces.set(`tunel|${l.x}|${l.y}|${l.dim}`, l);
  const luzActual = new Map(escena.lights.filter(l => l.getFlag(MOD, "auto")).map(l => [l.getFlag(MOD, "clave"), l]));
  const quitar = [...luzActual].filter(([k]) => !luces.has(k)).map(([, l]) => l.id);
  const nuevas = [...luces].filter(([k]) => !luzActual.has(k)).map(([k, l]) => ({
    x: ox + l.x * S, y: oy + l.y * S, rotation: 0,
    config: { dim: l.dim * dist, bright: l.bright * dist, angle: 360, color: l.color, alpha: 0.32, luminosity: 0.3, animation: { type: "torch", speed: 4, intensity: 4 } },
    flags: { [MOD]: { auto: true, clave: k } }
  }));
  if (quitar.length) await escena.deleteEmbeddedDocuments("AmbientLight", quitar);
  if (nuevas.length) await escena.createEmbeddedDocuments("AmbientLight", nuevas);
}

/* ------------------------------------------------------------------------------------------------ tokens a la escala de la mazmorra */

/** Reduce el dibujo de los tokens de la escena (una casilla es un túnel entero; el personaje ha de ser más pequeño que las salas). */
export async function reescalarTokens(escena = canvas.scene) {
  if (!game.user.isGM || !escena || !mapaDe(escena)) return;
  const f = Number(game.settings.get(MOD, "mazmorraEscalaTokens")) || 1;
  const cambios = [];
  for (const t of escena.tokens) {
    const antes = Number(t.getFlag(MOD, "escala")) || 1;
    if (Math.abs(antes - f) < 0.001) continue;
    cambios.push({ _id: t.id, "texture.scaleX": (t.texture.scaleX ?? 1) / antes * f, "texture.scaleY": (t.texture.scaleY ?? 1) / antes * f, [`flags.${MOD}.escala`]: f });
  }
  if (cambios.length) await escena.updateEmbeddedDocuments("Token", cambios);
}

/* ------------------------------------------------------------------------------------------------ acciones (las ejecuta el DJ) */

const SOLO_DJ = new Set(["obra", "actor", "duendes"]);

async function aviso(texto) {
  try {
    const { htmlTarjetaSimple } = await import("./tirada.mjs");
    await ChatMessage.create({ flags: { [MOD]: { tarjeta: true } }, content: htmlTarjetaSimple({ tipo: "Obra", titulo: "Constructor de mazmorras", subtitulo: "", neutro: "azul", cuerpo: texto }) });
  } catch { await ChatMessage.create({ content: `<p>${texto}</p>` }); }
}

const plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;

async function ejecutar(escena, accion, datos, usuario) {
  const actual = mapaDe(escena); if (!actual) return { ok: false, motivo: "Esta escena no tiene mazmorra." };
  const m = foundry.utils.deepClone(actual), reglas = reglasOn();
  const quien = esc(usuario?.name ?? game.user.name);
  let r = { ok: true }, texto = "";
  const cobrar = coste => { if (!reglas) return { ok: true }; const p = puedeGastar(m, coste); if (p.ok) gastar(m, coste); return p; };

  if (accion === "celdas") {
    let n = 0;
    for (const [x, y] of datos.celdas) n += (datos.modo === "excavar" ? excavar(m, x, y) : rellenar(m, x, y)) ? 1 : 0;
    r = { ok: n > 0, motivo: n ? "" : "Nada que cambiar ahí." };
    if (r.ok && datos.modo === "excavar") {
      const coste = costeExcavar(n), p = cobrar(coste); if (!p.ok) return p;
      texto = `${quien} excava ${plural(n, "celda", "celdas")} de túnel${reglas ? ` (${plural(coste, "acción", "acciones")} de descanso)` : ""}.`;
    }
  } else if (accion === "sala") {
    const t = TIPOS_SALA[datos.tipo];
    if (reglas && t) { const ctx = contextoReglas(m), rg = reglasSala(m, datos.tipo, { tema: ctx.tema, materiales: ctx.materiales }); if (!rg.ok) return rg; }
    r = construirSala(m, datos.rect, datos.tipo, { forma: datos.forma, giro: datos.giro, celdas: datos.celdas });
    if (r.ok) {
      const coste = costeSala(datos.tipo), p = cobrar(coste); if (!p.ok) return p;
      texto = `${quien} construye ${t.nombre.toLowerCase()} (${r.forma === "rect" ? `${r.rect.w}×${r.rect.h}` : `${FORMAS[r.forma].toLowerCase()}, ${r.celdas} celdas`})${reglas && coste ? `: ${plural(coste, "acción", "acciones")} de descanso` : ""}.`;
    }
  } else if (accion === "quitarSala") r = { ok: quitarSala(m, datos.id) };
  else if (accion === "puerta") r = alternarPuerta(m, datos.x, datos.y, datos.d);
  else if (accion === "trampa") {
    if (datos.op === "poner") {
      r = ponerTrampa(m, datos);
      if (r.ok) { const p = cobrar(r.coste); if (!p.ok) return p; texto = `${quien} prepara ${datos.tipo === "truco" ? "un truco" : "una trampa"} de nivel ${r.nivel}${reglas && r.coste ? ` (${plural(r.coste, "acción", "acciones")} de descanso)` : ""}.`; }
    } else if (datos.op === "editar") {
      const t = m.trampas?.find(z => z.id === datos.id);
      if (!t) return { ok: false, motivo: "Esa trampa ya no existe." };
      const sube = "nivel" in datos.cambios ? Math.max(0, costeTrampa(datos.cambios.nivel) - costeTrampa(t.nivel)) : 0;
      const p = cobrar(sube); if (!p.ok) return p;
      r = editarTrampa(m, datos.id, datos.cambios);
    } else if (datos.op === "quitar") r = { ok: quitarTrampa(m, datos.id) };
    else if (datos.op === "descubrir") {
      r = editarTrampa(m, datos.id, { revelada: datos.valor });
      const t = m.trampas?.find(z => z.id === datos.id);
      if (r.ok && t) texto = `${t.tipo === "truco" ? "Un truco" : "Una trampa"} (${esc(t.mecanismo)}) ${datos.valor ? "ha sido descubierta por los aventureros" : "vuelve a estar armada"}.`;
    }
  } else if (accion === "obra") {
    m.obra = m.obra ?? { total: accionesPorDefecto(), gastadas: 0, extra: 0 };
    if (datos.reiniciar) { await reiniciarObra(escena); return { ok: true }; }
    const d = Math.trunc(datos.delta ?? 0);
    m.obra.total = Math.max(0, m.obra.total + d);
    m.obra.gastadas = Math.min(m.obra.gastadas, m.obra.total);
    if (datos.extra && d > 0) { m.obra.extra = (m.obra.extra ?? 0) + d; texto = `El DJ concede <strong>+${d}</strong> ${d === 1 ? "acción" : "acciones"} de descanso extra${datos.motivo ? `: ${esc(datos.motivo)}` : ""}.`; }
  } else if (accion === "duendes") m.duendes = { densidad: Math.min(2, Math.max(0, Number(datos.densidad) || 0)) };
  else if (accion === "actor") m.actor = datos.id || null;
  if (!r.ok) return r;
  await escena.setFlag(MOD, FLAG, m);
  await sincronizarEntorno(escena);
  if (texto) {
    const cuenta = reglas && m.obra && (["celdas", "sala", "obra"].includes(accion) || (accion === "trampa" && datos.op === "poner"));
    const resto = cuenta ? ` Quedan ${Math.max(0, m.obra.total - m.obra.gastadas)} de ${m.obra.total}.` : "";
    aviso(texto + resto);
  }
  return r;
}

const permitido = () => game.user.isGM || game.settings.get(MOD, "mazmorraJugadores");

export async function pedir(accion, datos) {
  const escena = canvas.scene;
  if (SOLO_DJ.has(accion) && !game.user.isGM) return;
  if (!permitido()) return ui.notifications.warn("El DJ no permite construir a los jugadores.");
  if (game.user.isGM) {
    const r = await ejecutar(escena, accion, datos, game.user);
    if (!r.ok && r.motivo) ui.notifications.warn(r.motivo);
    return r;
  }
  if (!game.users.activeGM) return ui.notifications.warn("No hay un DJ conectado que pueda levantar la obra.");
  game.socket.emit(`module.${MOD}`, { t: "mazmorra", accion, datos, escena: escena.id, usuario: game.user.id });
}

/* ------------------------------------------------------------------------------------------------ herramientas sobre el lienzo */

function quitarOverlay() { if (overlay) { overlay.destroy({ children: true }); overlay = null; } }

const aCelda = p => { const { S, ox, oy } = geo(), u = (p.x - ox) / S, v = (p.y - oy) / S; return { i: Math.floor(u), j: Math.floor(v), fx: u - Math.floor(u), fy: v - Math.floor(v) }; };

/** Celdas por las que pasa una línea entre dos celdas (para que pintar rápido no deje huecos). */
function linea(a, b) {
  const out = []; let x = a.i, y = a.j;
  const dx = Math.abs(b.i - a.i), dy = Math.abs(b.j - a.j), sx = a.i < b.i ? 1 : -1, sy = a.j < b.j ? 1 : -1; let err = dx - dy;
  for (;;) { out.push([x, y]); if (x === b.i && y === b.j) break; const e2 = 2 * err; if (e2 > -dy) { err -= dy; x += sx; } if (e2 < dx) { err += dx; y += sy; } }
  return out;
}

/** Pulsar una celda con la herramienta de trampas: preparar una nueva o gestionar la que hay. */
function gestionarTrampa(i, j) {
  const m = mapaDe(canvas.scene); if (!m) return;
  const t = (m.trampas ?? []).find(z => z.x === i && z.y === j);
  if (!t && !abierta(celda(m, i, j))) return ui.notifications.info("Las trampas y los trucos van en un túnel o en una sala.");
  const o = m.obra, quedan = o ? Math.max(0, o.total - o.gastadas) : null;
  abrirTrampa({
    trampa: t, gm: game.user.isGM, reglas: reglasOn(), quedan,
    activar: async tr => {
      if (!game.user.isGM) return ui.notifications.info("Solo el DJ tira las trampas; el jugador al cargo narra el resultado.");
      game.modules.get(MOD).api.ejecutarTiradaCiclo(tr.tipo === "truco" ? "trick" : "trap", tr.nivel, `${tr.mecanismo}${tr.detonador ? ` · ${tr.detonador}` : ""}`);
    },
    alElegir: async (op, d, tr) => {
      if (op === "poner") return pedir("trampa", { op, x: i, y: j, tipo: d.tipo, mecanismo: d.mecanismo, detonador: d.detonador, intencion: d.intencion, nota: d.nota, nivel: d.nivel });
      if (op === "editar") return pedir("trampa", { op, id: tr.id, cambios: { mecanismo: d.mecanismo, detonador: d.detonador, intencion: d.intencion, nota: d.nota, nivel: d.nivel } });
      if (op === "quitar") return pedir("trampa", { op, id: tr.id });
      if (op === "descubrir") return pedir("trampa", { op, id: tr.id, valor: !tr.revelada });
    }
  });
}

function activarHerramienta(h) {
  herramienta = h;
  quitarOverlay();
  if (!h || !canvas?.ready) return;
  const { S, ox, oy } = geo(), d = canvas.dimensions.sceneRect;
  overlay = new PIXI.Container(); overlay.eventMode = "static"; overlay.zIndex = 99999;
  const zona = new PIXI.Graphics(); zona.beginFill(0xffffff, 0.001).drawRect(d.x, d.y, d.width, d.height).endFill(); zona.eventMode = "static"; zona.cursor = "crosshair";
  const previa = new PIXI.Graphics(), rotulo = new PIXI.Text("", { fontSize: Math.round(S * 0.3), fill: 0xffffff, stroke: 0x000000, strokeThickness: 4, fontWeight: "800" });
  overlay.addChild(zona, previa, rotulo);
  (canvas.interface ?? canvas.stage).addChild(overlay);
  const mapa = () => mapaDe(canvas.scene);
  let ini = null, ultima = null, pintadas = new Set();
  const pinta = (c) => { for (const [i, j] of (ultima ? linea(ultima, c) : [[c.i, c.j]])) pintadas.add(`${i},${j}`); ultima = c; };
  const libre = () => forma === "libre" && herramienta === "sala";
  const celdillas = (lista, color, alfa) => { for (const [i, j] of lista) previa.beginFill(color, alfa).drawRect(ox + i * S, oy + j * S, S, S).endFill(); };

  const dibujarPrevia = (b) => {
    previa.clear(); rotulo.text = "";
    const m = mapa(); if (!m) return;
    if (herramienta === "sala" && !libre()) {
      const a = ini ?? b, x = Math.min(a.i, b.i), y = Math.min(a.j, b.j), w = Math.abs(a.i - b.i) + 1, hh = Math.abs(a.j - b.j) + 1;
      const aj = ajustarSala(m, { x, y, w, h: hh }, tipoSala, { forma, giro }), t = TIPOS_SALA[tipoSala];
      const coste = costeSala(tipoSala), q = m.obra ? Math.max(0, m.obra.total - m.obra.gastadas) : null;
      const falta = reglasOn() && q !== null && coste > q;
      const color = aj && !falta ? 0x6fe08a : 0xe0503a;
      if (aj) {
        celdillas(celdasForma(aj, forma, giro), color, 0.28);
        previa.lineStyle(3, color, 1).drawRect(ox + aj.x * S, oy + aj.y * S, aj.w * S, aj.h * S);
        if (aj.ajustada) previa.lineStyle(2, 0xffd36b, 0.9).drawRect(ox + x * S, oy + y * S, w * S, hh * S);   // lo que marcaste, dentro de la sala ya ajustada
      }
      const info = !aj ? `${t.nombre} necesita ${t.min[0]}×${t.min[1]} como mínimo y aquí no cabe.` : falta ? `faltan acciones (cuesta ${coste}, quedan ${q})` : `${t.nombre}${aj.ajustada ? " · ajustada al mínimo" : ""}${reglasOn() && coste ? ` · ${coste} acc.` : ""}`;
      const r = aj ?? { x, y, w, h: hh }; rotulo.text = `${r.w}×${r.h} · ${info}`; rotulo.x = ox + r.x * S + 6; rotulo.y = oy + r.y * S + 4;
    } else if (libre()) {
      const lista = ini ? [...pintadas].map(k => k.split(",").map(Number)) : [[b.i, b.j]], t = TIPOS_SALA[tipoSala];
      if (ini) {
        const v = validarCeldas(m, lista), minimo = t.min[0] * t.min[1], ok = v.ok && lista.length >= minimo, color = ok ? 0x6fe08a : 0xe0503a;
        celdillas(lista, color, 0.3);
        rotulo.text = `${lista.length} celdas (mín. ${minimo}) · ${v.ok ? (ok ? t.nombre : `faltan ${minimo - lista.length}`) : v.motivo}`;
        rotulo.x = ox + b.i * S + 6; rotulo.y = oy + b.j * S - S * 0.4;
      } else previa.lineStyle(2, 0xffd36b, 0.9).drawRect(ox + b.i * S, oy + b.j * S, S, S);
    } else if (herramienta === "trampa") {
      previa.lineStyle(2, 0xe0503a, 0.9).drawRect(ox + b.i * S, oy + b.j * S, S, S);
      const t = (m.trampas ?? []).find(z => z.x === b.i && z.y === b.j);
      if (t) { rotulo.text = `${t.mecanismo}${t.detonador ? ` · ${t.detonador}` : ""} (nivel ${t.nivel})`; rotulo.x = ox + b.i * S + 6; rotulo.y = oy + b.j * S - S * 0.4; }
    } else {
      previa.lineStyle(2, 0xffd36b, 0.9).drawRect(ox + b.i * S, oy + b.j * S, S, S);
      celdillas([...pintadas].map(k => k.split(",").map(Number)), herramienta === "excavar" ? 0xc8921f : 0x7d1512, 0.4);
      if (herramienta === "excavar" && pintadas.size) {
        const n = [...pintadas].filter(k => { const [i, j] = k.split(",").map(Number); return celda(m, i, j) === "e"; }).length, coste = costeExcavar(n);
        rotulo.text = `${n} celdas${reglasOn() ? ` · ${coste} acc.` : ""}`; rotulo.x = ox + b.i * S + 6; rotulo.y = oy + b.j * S - S * 0.4;
      }
    }
  };
  const lugar = ev => aCelda(ev.getLocalPosition(overlay));

  zona.on("pointerdown", ev => {
    const c = lugar(ev);
    if (libre()) { ini = c; ultima = null; pintadas = new Set(); pinta(c); }
    else if (herramienta === "sala") ini = c;
    else if (herramienta === "excavar" || herramienta === "rellenar") { ini = c; ultima = null; pintadas = new Set(); pinta(c); }
    else if (herramienta === "trampa") gestionarTrampa(c.i, c.j);
    else if (herramienta === "puerta") {
      // borde más cercano del punto pulsado; si es un muro, se prueba desde la celda abierta de al lado
      const cand = [["n", c.fy], ["s", 1 - c.fy], ["w", c.fx], ["e", 1 - c.fx]].sort((a, b) => a[1] - b[1]);
      const dir = cand[0][0], [dx, dy] = DIRS[dir], op = { n: "s", s: "n", e: "w", w: "e" }[dir], m = mapa();
      const desde = abierta(celda(m, c.i, c.j)) ? { x: c.i, y: c.j, d: dir } : { x: c.i + dx, y: c.j + dy, d: op };
      pedir("puerta", desde);
    } else if (herramienta === "quitarSala") {
      const s = salaEn(mapa(), c.i, c.j);
      if (s) pedir("quitarSala", { id: s.id }); else ui.notifications.info("Pulsa dentro de una sala para quitarla.");
    }
    dibujarPrevia(c);
  });
  zona.on("pointermove", ev => {
    const c = lugar(ev);
    if (ini && (libre() || herramienta === "excavar" || herramienta === "rellenar")) pinta(c);
    dibujarPrevia(c);
  });
  const soltar = ev => {
    if (!ini) return;
    const c = lugar(ev);
    if (libre()) pedir("sala", { forma: "libre", celdas: [...pintadas].map(k => k.split(",").map(Number)), tipo: tipoSala });
    else if (herramienta === "sala") pedir("sala", { rect: { x: Math.min(ini.i, c.i), y: Math.min(ini.j, c.j), w: Math.abs(ini.i - c.i) + 1, h: Math.abs(ini.j - c.j) + 1 }, tipo: tipoSala, forma, giro });
    else if (pintadas.size) pedir("celdas", { modo: herramienta, celdas: [...pintadas].map(k => k.split(",").map(Number)) });
    ini = null; ultima = null; pintadas = new Set(); previa.clear(); rotulo.text = "";
  };
  zona.on("pointerup", soltar); zona.on("pointerupoutside", soltar);
}

/* ------------------------------------------------------------------------------------------------ paleta */

const HERR = [
  ["excavar", "fa-hammer", "Excavar", "Arrastra sobre la tierra para abrir túneles. Un túnel largo (hasta 8 celdas) es un proyecto de nivel 1: cuesta 1 acción de descanso."],
  ["rellenar", "fa-fill-drip", "Rellenar", "Vuelve a cubrir de tierra un túnel. No cuesta acciones."],
  ["sala", "fa-vector-square", "Sala", "Arrastra (o pulsa una celda) y la sala se construye sola, ajustada al espacio y con la forma elegida; con «Libre» la pintas celda a celda. Los muebles se colocan hacia la puerta."],
  ["puerta", "fa-door-closed", "Puerta", "Pulsa en el borde entre un túnel y una sala (o dos salas) para poner o quitar una puerta. Las salas se recolocan para mirar a la entrada."],
  ["trampa", "fa-skull-crossbones", "Trampa", "Pulsa una celda para preparar una trampa o un truco (mecanismo, detonador y nivel del manual) o para gestionar la que hay."],
  ["quitarSala", "fa-eraser", "Quitar sala", "Pulsa dentro de una sala para demolerla. No devuelve acciones."]
];
const NIVELES = { 0: "Base", 1: "Nivel 1", 2: "Nivel 2", 3: "Nivel 3" };
const ICONO_FORMA = { rect: "▭", ovalo: "⬬", ele: "◣", cruz: "✚", libre: "✎" };

export class ConstructorMR extends App {
  static DEFAULT_OPTIONS = {
    id: "mr-wo-constructor", tag: "div", classes: ["mrg", "mrg-ventana", "mrg-cons-app"],
    window: { title: "Constructor de mazmorras", icon: "fa-solid fa-trowel-bricks", resizable: false }, position: { width: 380, height: "auto" }
  };

  async _renderHTML() {
    const m = mapaDe(canvas.scene), gm = game.user.isGM;
    if (!m) {
      return `<div class="mrg-cons"><p class="mrg-asist-intro">Esta escena aún no es una mazmorra. ${gm ? "Conviértela o crea una escena nueva lista para excavar." : "Pídele al DJ que prepare la mazmorra."}</p>${gm ? `<div class="mrg-cons-col"><button type="button" class="mrg-btn mrg-btn--sangre" data-nueva><i class="fa-solid fa-plus"></i> Nueva escena de mazmorra</button><button type="button" class="mrg-btn" data-convertir><i class="fa-solid fa-wand-sparkles"></i> Usar esta escena</button></div>` : ""}</div>`;
    }
    const r = resumen(m), reglas = reglasOn(), ctx = contextoReglas(m);
    const herr = HERR.map(([k, ic, t, ayuda]) => `<button type="button" class="mrg-cons-h ${herramienta === k ? "on" : ""}" data-herr="${k}" aria-pressed="${herramienta === k}" data-ayuda="${esc(t)}||${esc(ayuda)}"><i class="fa-solid ${ic}"></i><span>${t}</span></button>`).join("");

    // forma de la sala
    const formas = herramienta === "sala" ? `<h4 class="mrg-seccion">Forma de la sala</h4><div class="mrg-cons-formas" role="group" aria-label="Forma de la sala">${Object.entries(FORMAS).map(([k, t]) => `<button type="button" class="mrg-cons-f ${forma === k ? "on" : ""}" data-forma="${k}" aria-pressed="${forma === k}" data-ayuda="${esc(t)}||${esc(k === "libre" ? "Pinta las celdas de la sala una a una, con la forma que quieras: tiene que ser de una sola pieza." : "Arrastra una caja y la sala toma esta forma dentro de ella.")}"><b aria-hidden="true">${ICONO_FORMA[k]}</b><span>${t}</span></button>`).join("")}${forma === "ele" ? `<button type="button" class="mrg-cons-f" data-girar data-ayuda="Girar||Gira la L un cuarto de vuelta."><b aria-hidden="true"><i class="fa-solid fa-rotate-right"></i></b><span>Girar</span></button>` : ""}</div>` : "";

    // tipos de sala: el de la temática primero; los que las reglas ahora mismo no permiten salen marcados con el motivo
    const orden = Object.entries(TIPOS_SALA).sort(([ka, a], [kb, b]) => (kb === ctx.tema) - (ka === ctx.tema) || a.nivel - b.nivel);
    const tipos = orden.map(([k, v]) => {
      const rg = reglas ? reglasSala(m, k, { tema: ctx.tema, materiales: ctx.materiales }) : { ok: true };
      const coste = costeSala(k);
      const sub = `${NIVELES[v.nivel]} · ${v.min[0]}×${v.min[1]}${reglas && coste ? ` · ${coste} acc.` : ""}`;
      return `<button type="button" class="mrg-cons-t ${tipoSala === k ? "on" : ""} ${rg.ok ? "" : "mrg-cons-t--no"}" data-tipo="${k}" aria-pressed="${tipoSala === k}" data-ayuda="${esc(v.nombre)}||${esc(v.nota + (rg.ok ? "" : " — " + rg.motivo))}"><img src="${RUTA}/rooms/room_${k}_iso.webp" alt="">${k === ctx.tema ? `<em class="mrg-cons-tema" title="Temática de tu mazmorra">★</em>` : ""}${rg.ok ? "" : `<em class="mrg-cons-cand" title="${esc(rg.motivo)}"><i class="fa-solid fa-lock"></i></em>`}<span>${v.nombre}</span><small>${sub}</small></button>`;
    }).join("");
    const actual = TIPOS_SALA[tipoSala], rgActual = reglas ? reglasSala(m, tipoSala, { tema: ctx.tema, materiales: ctx.materiales }) : { ok: true };

    // presupuesto de la fase de acecho
    const o = m.obra, quedan = o ? Math.max(0, o.total - o.gastadas) : 0;
    const pips = o ? Array.from({ length: Math.min(o.total, 14) }, (_, i) => `<i class="${i < o.total - o.gastadas ? "on" : ""}"></i>`).join("") : "";
    const obra = reglas && o ? `<section class="mrg-cons-obra"><div class="mrg-cons-obra-t"><b>Acciones de descanso</b><span>${quedan}/${o.total}</span></div><div class="mrg-xp-mini oro" role="img" aria-label="${quedan} de ${o.total}">${pips}</div>
      ${o.extra ? `<p class="mrg-nota">Incluye +${o.extra} extra concedidas por el DJ.</p>` : ""}
      ${gm ? `<div class="mrg-cons-obra-b"><button type="button" class="mrg-mini" data-obra="-1" aria-label="Quitar una acción"><i class="fa-solid fa-minus"></i></button><button type="button" class="mrg-mini" data-obra="1" aria-label="Sumar una acción"><i class="fa-solid fa-plus"></i></button><button type="button" class="mrg-btn" data-extra data-ayuda="Conceder acciones||Da acciones de descanso extra al grupo (esbirros pagados, una capacidad, una gracia…) y avisa en el chat."><i class="fa-solid fa-gift"></i> Conceder</button><button type="button" class="mrg-btn" data-obra-nueva data-ayuda="Nueva fase de acecho||Repone las acciones de descanso: una por PJ más la de los duendes. Se hace sola al pasar el panel del DJ a la fase 1."><i class="fa-solid fa-rotate"></i> Nueva fase</button></div>` : ""}</section>` : "";

    // duendes constructores
    const dens = m.duendes?.densidad ?? 1, nD = numDuendes(m, ctx.nivel);
    const duendes = `<section class="mrg-cons-duendes"><div class="mrg-cons-obra-t"><b>Duendes constructores</b><span>≈ ${nD}</span></div>
      <input type="range" min="0" max="2" step="0.25" value="${dens}" data-dens ${gm ? "" : "disabled"} aria-label="Densidad de duendes: ${dens} veces lo normal" ${gm ? "" : `title="Solo el DJ la regula"`}>
      <p class="mrg-nota">Crecen con el nivel de la mazmorra (${ctx.nivel}), sus salas y túneles. Densidad ×${dens}.${gm ? "" : " La regula el DJ."} Cada navegador puede apagarlos en Ajustes.</p></section>`;

    // ficha de la mazmorra
    const dungeons = game.actors?.filter(a => a.type === "dungeon") ?? [];
    const ficha = ctx.actor ? `<section class="mrg-cons-ficha"><div><i class="fa-solid fa-dungeon"></i> <a data-ficha="${ctx.actor.id}" data-ayuda="Abrir la ficha||Abre la ficha de la mazmorra: nivel, temática y salas de nivel 3."><b>${esc(ctx.actor.name)}</b></a> · nivel ${ctx.nivel}/4${ctx.temaNombre ? ` · ${esc(ctx.temaNombre)}` : " · sin temática"}</div>
      ${gm && dungeons.length > 1 ? `<select data-actor aria-label="Ficha de la mazmorra">${dungeons.map(a => `<option value="${a.id}" ${a.id === ctx.actor.id ? "selected" : ""}>${esc(a.name)}</option>`).join("")}</select>` : ""}
      <ul class="mrg-cons-l3">${[...Object.entries(TIPOS_SALA)].filter(([, t]) => t.nivel === 3).map(([k, t]) => {
        const its = ctx.salas3.filter(i => tipoDeTema(i.system.theme) === k);
        return its.length ? `<li class="${ctx.materiales[k] ? "ok" : "falta"}"><i class="fa-solid ${ctx.materiales[k] ? "fa-check" : "fa-hourglass-half"}"></i> ${t.nombre}: ${its.map(i => esc(i.name)).join(", ")}${ctx.materiales[k] ? "" : " (faltan materiales)"}</li>` : "";
      }).join("") || `<li class="falta"><i class="fa-solid fa-circle-info"></i> Sin salas de nivel 3 en la ficha. Añádelas allí y marca cuándo tienes los materiales.</li>`}</ul></section>`
      : `<p class="mrg-nota">No hay ninguna ficha de mazmorra: el constructor no comprobará temática ni materiales. Crea una (actor «Mazmorra») para integrarlo.</p>`;

    const guia = `<details class="mrg-cons-reglas"><summary><i class="fa-solid fa-scroll"></i> Reglas de construcción</summary>
      <ul>
        <li><b>Todo es un proyecto de descanso</b> de la fase de acecho (manual, pág. 238): cada PJ tiene una acción; los duendes, otra; y pagando 1 de oro, cada panda de esbirros hace una más. El DJ puede conceder acciones extra.</li>
        <li><b>Nivel 1</b> = 1 tirada (túnel largo, sala menor). <b>Nivel 2</b> = reloj de 4 (guarida, prisión). <b>Nivel 3</b> = reloj de 8 y materiales de una incursión.</li>
        <li>En el módulo: túnel de hasta ${TRAMO} celdas = ${COSTE_NIVEL[1]}; sala de nivel 1 = ${COSTE_NIVEL[1]}; nivel 2 = ${COSTE_NIVEL[2]}; nivel 3 = ${COSTE_NIVEL[3]}; trampas y trucos, según su nivel (1, 2 o 4). Santuario y tesoro son la base: gratis y únicos.</li>
        <li>Las salas de nivel 3 son de la temática de tu mazmorra; solo puedes construir <b>una</b> de otra temática.</li>
        <li>El manual no fija medidas («dibujad como os plazca»; el santuario suele ser de 5×5 o más): los mínimos de cada sala son del módulo y puedes darles la forma que quieras.</li>
        ${gm ? `<li class="mrg-nota">Apaga estas reglas en Ajustes → «El constructor sigue las reglas de obra».</li>` : ""}
      </ul></details>`;

    return `<div class="mrg-cons">
      <div class="mrg-cons-herr">${herr}</div>
      ${obra}
      ${formas}
      <h4 class="mrg-seccion">Tipo de sala</h4><div class="mrg-cons-tipos">${tipos}</div>
      <p class="mrg-nota"><b>${actual.nombre}</b> — ${actual.nota} Mínimo ${actual.min[0]}×${actual.min[1]}${forma === "libre" ? ` (${actual.min[0] * actual.min[1]} celdas)` : ""}. ${rgActual.ok ? "" : `<span class="mrg-cons-no">${esc(rgActual.motivo)}</span>`}</p>
      ${duendes}
      ${ficha}
      ${guia}
      <p class="mrg-cons-res"><b>${r.salas}</b> salas · <b>${r.tunel}</b> túneles · <b>${r.puertas}</b> puertas · <b>${(m.trampas ?? []).length}</b> trampas</p>
      ${gm ? `<div class="mrg-cons-col"><button type="button" class="mrg-btn" data-rehacer data-ayuda="Rehacer muros y luces||Vuelve a crear los muros, las puertas y las luces automáticos a partir del mapa."><i class="fa-solid fa-rotate"></i> Rehacer muros y luces</button></div>` : ""}
    </div>`;
  }

  _replaceHTML(res, cont) {
    cont.innerHTML = res;
    cont.onclick = async ev => {
      const fi = ev.target.closest("[data-ficha]"); if (fi) return game.actors.get(fi.dataset.ficha)?.sheet.render(true);
      const b = ev.target.closest("button"); if (!b) return;
      if (b.dataset.herr) { activarHerramienta(herramienta === b.dataset.herr ? null : b.dataset.herr); return this.render(); }
      if (b.dataset.tipo) { tipoSala = b.dataset.tipo; if (herramienta !== "sala") activarHerramienta("sala"); return this.render(); }
      if (b.dataset.forma) { forma = b.dataset.forma; activarHerramienta("sala"); return this.render(); }
      if ("girar" in b.dataset) { giro = (giro + 1) % 4; return this.render(); }
      if (b.dataset.obra) { await pedir("obra", { delta: Number(b.dataset.obra) }); return this.render(); }
      if ("obraNueva" in b.dataset) { await pedir("obra", { reiniciar: true }); return this.render(); }
      if ("extra" in b.dataset) return abrirExtra((n, motivo) => pedir("obra", { delta: n, extra: true, motivo }));
      if ("nueva" in b.dataset) { await nuevaEscena(); return this.render(); }
      if ("convertir" in b.dataset) { await convertirEscena(); return this.render(); }
      if ("rehacer" in b.dataset) { await sincronizarEntorno(); ui.notifications.info("Muros, puertas y luces rehechos."); }
    };
    cont.querySelector("[data-actor]")?.addEventListener("change", async ev => { await pedir("actor", { id: ev.target.value }); this.render(); });
    cont.querySelector("[data-dens]")?.addEventListener("change", async ev => { await pedir("duendes", { densidad: Number(ev.target.value) }); });
  }

  async close(opts) { activarHerramienta(null); return super.close(opts); }
}

export function abrirConstructor() {
  const prev = foundry.applications.instances?.get?.("mr-wo-constructor");
  if (prev) { prev.render(true); return prev; }
  const app = new ConstructorMR(); app.render(true); return app;
}

/* ------------------------------------------------------------------------------------------------ escenas */

function mapaNuevo(w, h) { const m = crearMapa(w, h); m.obra.total = accionesPorDefecto(); return m; }

export async function convertirEscena(w, h) {
  const escena = canvas.scene; if (!escena || !game.user.isGM) return;
  const { S } = geo(), d = canvas.dimensions.sceneRect;
  const ancho = w ?? Math.max(10, Math.floor(d.width / S)), alto = h ?? Math.max(10, Math.floor(d.height / S));
  await escena.update({ tokenVision: true, fog: { exploration: true }, environment: { globalLight: { enabled: false }, darknessLevel: 0.55 }, [`flags.${MOD}.${FLAG}`]: mapaNuevo(ancho, alto) });
  await reescalarTokens(escena);
  ui.notifications.info(`Mazmorra de ${ancho}×${alto} lista. Elige una herramienta y excava.`);
}

export async function nuevaEscena(w = 40, h = 28) {
  if (!game.user.isGM) return;
  const S = 100;
  const escena = await Scene.create({
    name: "Mazmorra", width: w * S, height: h * S, padding: 0, grid: { type: 1, size: S, distance: 1, units: "casillas" }, background: { color: "#0b0807" },
    tokenVision: true, fog: { exploration: true }, environment: { globalLight: { enabled: false }, darknessLevel: 0.55 }, flags: { [MOD]: { [FLAG]: mapaNuevo(w, h) } }
  });
  await escena.view();
  return escena;
}

/* ------------------------------------------------------------------------------------------------ arranque */

export function registrarMazmorra() {
  game.settings.register(MOD, "mazmorraJugadores", {
    name: "Los jugadores pueden construir la mazmorra", hint: "Si está activo, cualquier jugador usa el constructor; el DJ levanta la obra desde su cliente.",
    scope: "world", config: true, type: Boolean, default: true
  });
  game.settings.register(MOD, "mazmorraReglas", {
    name: "El constructor sigue las reglas de obra", hint: "Excavar y construir cuesta acciones de descanso de la fase de acecho; las salas de nivel 3 piden la temática y los materiales de la ficha de la mazmorra. Apagado, se construye sin límites.",
    scope: "world", config: true, type: Boolean, default: true, onChange: () => foundry.applications.instances?.get?.("mr-wo-constructor")?.render()
  });
  game.settings.register(MOD, "mazmorraVasallos", {
    name: "Vasallos constructores en la mazmorra", hint: "Diminutos esbirros recorren las salas y túneles de tu mazmorra, cavando y trabajando. Solo es un adorno de este navegador.",
    scope: "client", config: true, type: Boolean, default: true, onChange: () => dibujar()
  });
  game.settings.register(MOD, "mazmorraEscalaTokens", {
    name: "Escala de los tokens en la mazmorra", hint: "Reduce el dibujo de los tokens en las escenas de mazmorra para que no tapen túneles ni salas. 1 = tamaño normal.",
    scope: "world", config: true, type: Number, range: { min: 0.3, max: 1, step: 0.05 }, default: 0.6, onChange: () => { if (soyDJ()) reescalarTokens(canvas.scene); }
  });
}

export function iniciarMazmorra() {
  game.socket.on(`module.${MOD}`, async msg => {
    if (msg?.t !== "mazmorra" || !soyDJ()) return;
    if (!game.settings.get(MOD, "mazmorraJugadores")) return;
    const usuario = game.users.get(msg.usuario);
    if (SOLO_DJ.has(msg.accion) && !usuario?.isGM) return;
    const escena = game.scenes.get(msg.escena); if (!escena) return;
    const r = await ejecutar(escena, msg.accion, msg.datos, usuario);
    if (!r.ok && r.motivo) ui.notifications.warn(`${usuario?.name ?? "Un jugador"}: ${r.motivo}`);
  });
  const redibujar = () => { clearTimeout(pendiente); pendiente = setTimeout(() => dibujar(), 60); };
  Hooks.on("canvasReady", async () => { limpiar(); await cargarTexturas(); alCargar(); });
  Hooks.on("canvasTearDown", limpiar);
  Hooks.on("updateScene", (escena, cambios) => {
    if (escena.id !== canvas.scene?.id || !foundry.utils.hasProperty(cambios, `flags.${MOD}.${FLAG}`)) return;
    redibujar(); foundry.applications.instances?.get?.("mr-wo-constructor")?.render();
  });
  for (const h of ["updateWall", "createWall", "deleteWall"]) Hooks.on(h, w => { if (w.parent?.id === canvas.scene?.id && w.getFlag?.(MOD, "auto")) redibujar(); });
  // tokens nuevos en una mazmorra: nacen a escala
  Hooks.on("preCreateToken", (doc) => {
    const f = Number(game.settings.get(MOD, "mazmorraEscalaTokens")) || 1;
    if (f >= 1 || !doc.parent || !mapaDe(doc.parent) || doc.getFlag(MOD, "escala")) return;
    doc.updateSource({ "texture.scaleX": (doc.texture.scaleX ?? 1) * f, "texture.scaleY": (doc.texture.scaleY ?? 1) * f, [`flags.${MOD}.escala`]: f });
  });
  // la ficha de la mazmorra manda: si cambia su nivel o sus salas, el panel y las piezas (oro del tesoro, vasallos) se ponen al día
  const alCambiarFicha = doc => {
    const a = doc.parent ?? doc;
    if (a?.type === "dungeon") { foundry.applications.instances?.get?.("mr-wo-constructor")?.render(); if (mapaDe(canvas.scene)) redibujar(); }
  };
  Hooks.on("updateActor", (actor, cambios) => {
    alCambiarFicha(actor);
    // el panel del DJ pasa a la fase 1 (recuperación): empieza una nueva fase de acecho, con acciones de descanso nuevas
    if (soyDJ() && actor.type === "gm_sheet" && foundry.utils.getProperty(cambios, "system.current_phase.value") === 1 && reglasOn() && mapaDe(canvas.scene)?.obra) reiniciarObra(canvas.scene);
  });
  for (const h of ["createItem", "updateItem", "deleteItem"]) Hooks.on(h, alCambiarFicha);
  const alCargar = () => {
    dibujar();
    if (soyDJ() && mapaDe(canvas.scene)) { sincronizarEntorno(canvas.scene).catch(e => console.warn(`${MOD} | sincronizar`, e)); reescalarTokens(canvas.scene).catch(e => console.warn(`${MOD} | escala`, e)); }
  };
  if (canvas?.ready) cargarTexturas().then(alCargar);
}
