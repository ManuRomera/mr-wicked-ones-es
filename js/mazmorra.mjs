/**
 * Constructor de mazmorras al estilo Dungeon Keeper. El mapa vive en una bandera de la escena (ver core/mazmorra.mjs) y
 * cada cliente lo dibuja en 3/4: bloques de roca y tierra con cara frontal, suelos por tipo de sala y decoración que se
 * compone sola con la forma de la sala y por dónde se entra. Lo que Foundry ya sabe hacer lo hace Foundry: los muros y las
 * puertas son documentos `Wall` (visión, colisión y puertas que se abren) y las luces son `AmbientLight` con animación de antorcha.
 * Cualquier jugador (si el DJ lo permite) puede construir: sus acciones viajan por socket al DJ, que es quien edita la escena.
 * Reglas del manual (págs. 171, 190, 196-201 y 238-239): dibujar es libre; lo que hace real cada cosa nueva es su proyecto de descanso
 * (nivel 1 una tirada, nivel 2 un reloj de 4, nivel 3 un reloj de 8 y materiales), que se llena con las tiradas de los PJ, de los
 * esbirros pagados y de los duendes. La mazmorra inicial se dibuja gratis. El DJ puede apagar los relojes en los ajustes.
 */
import {
  TIPOS_SALA, FORMAS, MECANISMOS, crearMapa, celda, salaEn, excavar, rellenar, construirSala, quitarSala, alternarPuerta,
  validarCeldas, ajustarSala, celdasForma, reglasSala, tipoDeTema, muros, decorar, relojSala,
  antorchasTunel, lucesDe, lucesTunel, ponerTrampa, editarTrampa, quitarTrampa, numDuendes, esProyectoDeObra, obrasEnCurso, avanzarObra, enObra, AVANCE_RESULTADO, resumen, abierta, DIRS,
  ACCIONES_DUENDES, accionesDuendesPosibles, tunelDeDuendes, huecoParaSala
} from "./core/mazmorra.mjs";
import { evaluarTirada } from "./core/reglas.mjs";
import { abrirTrampa } from "./mazmorra-trampas.mjs";
import { sonar, iniciarAmbiente, pararAmbiente, efectosOn, ambienteOn } from "./mazmorra-sonido.mjs";

const MOD = "mr-wicked-ones-es";
const FLAG = "mazmorra";
const RUTA = `modules/${MOD}/assets/wicked-isometric`;
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const App = foundry.applications?.api?.ApplicationV2;
const ALTO = 0.34;   // altura de los bloques, en celdas

let contenedor = null, overlay = null, texturas = {}, herramienta = null, tipoSala = "santuario", forma = "rect", giro = 0, salaN3 = "";
let pendiente = null, ticker = null, vasallos = [], vasalloMemoria = [], efectos = [], ultimoLatigo = 0, quienTira = "pj";
const RADIO_LATIGO = 2.5;   // celdas

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
  const tex = texturas[t.tipo === "truco" ? "truco_marca" : t.tipo === "porton" ? "puerta_cerrada" : t.tipo === "estructura" ? "" : i >= 0 ? `trampa_${TRAMPA_CLAVES[i]}` : ""];
  if (tex) { const sp = new PIXI.Sprite(tex); sp.anchor.set(0.5); sp.scale.set(Math.min(S * 0.62 / tex.width, S * 0.62 / tex.height)); sp.x = cx; sp.y = cy; c.addChild(sp); }
  else if (t.tipo === "estructura") {   // conducto, construcción, túnel largo, pasaje secreto o ventana: una placa con su inicial
    const g = new PIXI.Graphics(); g.beginFill(0x2a221b, 0.9).lineStyle(3, 0xc9a45a, 1).drawRoundedRect(cx - S * 0.26, cy - S * 0.2, S * 0.52, S * 0.4, S * 0.08).endFill(); c.addChild(g);
    const l = new PIXI.Text(String(t.mecanismo || "?").slice(0, 2), { fontSize: Math.round(S * 0.2), fill: 0xf2e2b8, fontWeight: "800" }); l.anchor.set(0.5); l.x = cx; l.y = cy; c.addChild(l);
  } else {
    const g = new PIXI.Graphics(); g.beginFill(0x1c1612, 0.9).lineStyle(3, COLOR_NIVEL[t.nivel], 1).drawCircle(cx, cy, S * 0.26).endFill();
    g.lineStyle(0).beginFill(COLOR_NIVEL[t.nivel]).drawPolygon([cx, cy - S * 0.15, cx + S * 0.15, cy + S * 0.11, cx - S * 0.15, cy + S * 0.11]).endFill(); c.addChild(g);
  }
  const ins = new PIXI.Graphics(); ins.beginFill(COLOR_NIVEL[t.nivel]).lineStyle(2, 0x000000, 0.9).drawCircle(cx + S * 0.25, cy + S * 0.24, S * 0.1).endFill(); c.addChild(ins);
  const n = new PIXI.Text(String(t.nivel), { fontSize: Math.round(S * 0.13), fill: 0xffffff, stroke: 0x000000, strokeThickness: 3, fontWeight: "800" }); n.anchor.set(0.5); n.x = cx + S * 0.25; n.y = cy + S * 0.24; c.addChild(n);
  if (t.revelada) { c.alpha = 0.55; const r = new PIXI.Graphics(); r.lineStyle(2, 0xe0503a, 0.9).drawCircle(cx, cy, S * 0.34); c.addChild(r); }
  if (enObra(t)) {   // aún fabricándose: su reloj de proyecto
    c.alpha = 0.45;
    const o = new PIXI.Text(`${t.obra.hecho}/${t.obra.seg}`, { fontSize: Math.round(S * 0.16), fill: 0xffe39a, stroke: 0x1c1612, strokeThickness: 4, fontWeight: "900" });
    o.anchor.set(0.5); o.x = cx; o.y = cy - S * 0.3; c.addChild(o);
  }
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
    const v = { cont, esc: esc0, tipo, x: i + 0.5, y: j + 0.5, vel: 0.45 + Math.random() * 0.5, fase: Math.random() * 6, ruta: [], estado: "trabaja", t: Math.random() * 2, jx: 0, jy: 0, azote: 0 };
    vasallos.push(v);
  }
}

/** Latigazo: los duendes en un radio de 2,5 celdas trabajan y corren más deprisa unos segundos. Cada navegador mueve sus propios duendes. */
export function aplicarLatigo(px, py) {
  if (!contenedor || !canvas?.ready) return;
  const { S, ox, oy } = geo(), cx = (px - ox) / S, cy = (py - oy) / S, m = mapaDe(canvas.scene);
  let n = 0;
  const golpeados = [];
  for (const v of vasallos) if (Math.hypot(v.x - cx, v.y - cy) <= RADIO_LATIGO) { v.azote = 9; if (v.estado === "trabaja" && m) objetivo(m, v); n++; golpeados.push(v); }
  sonar("latigo"); if (n) sonar("chillidos", { n });
  // cada duende azotado suelta su grito en una burbuja que sube
  const GRITOS = ["¡Iiik!", "¡Ay!", "¡Aaah!", "¡Yiii!", "¡Piedad!", "¡Ya voy!"];
  golpeados.slice(0, 6).forEach((v, i) => {
    const t = new PIXI.Text(GRITOS[Math.floor(Math.random() * GRITOS.length)], { fontSize: Math.round(S * 0.17), fill: 0xffffff, stroke: 0x3a0d08, strokeThickness: 4, fontWeight: "800" });
    t.anchor.set(0.5); t.alpha = 0; t.zIndex = 1e7; contenedor.addChild(t);
    const x0 = ox + v.x * S, y0 = oy + v.y * S - S * 0.2, retraso = 0.12 + i * 0.06;
    efectos.push({ c: t, t: 0, dur: 1.1, upd(tt) { const q = Math.max(0, tt - retraso) / (1.1 - retraso); t.x = x0; t.y = y0 - S * 0.5 * q; t.alpha = tt < retraso ? 0 : Math.min(1, q * 8) * (1 - q * q); } });
  });
  // el restallido: la tira del látigo, el estallido, el aro de la zona y el «¡ZAS!»
  const c = new PIXI.Container(), g = new PIXI.Graphics(), aro = new PIXI.Graphics();
  const lado = Math.random() < 0.5 ? -1 : 1, x0 = px + lado * S * 1.5, y0 = py - S * (0.9 + Math.random() * 0.5), kx = px + lado * S * 0.4, ky = py - S * 1.9;
  const texto = new PIXI.Text("¡ZAS!", { fontSize: Math.round(S * 0.3), fill: 0xffe39a, stroke: 0x5a1409, strokeThickness: 5, fontWeight: "900" });
  texto.anchor.set(0.5); texto.x = px; texto.y = py - S * 0.45; texto.alpha = 0;
  c.addChild(aro, g, texto); c.zIndex = 1e7; contenedor.addChild(c);
  const bez = t => [(1 - t) ** 2 * x0 + 2 * (1 - t) * t * kx + t * t * px, (1 - t) ** 2 * y0 + 2 * (1 - t) * t * ky + t * t * py];
  const rayos = Array.from({ length: 9 }, (_, i) => [i / 9 * Math.PI * 2 + Math.random() * 0.3, S * (0.18 + Math.random() * 0.2)]);
  efectos.push({ c, t: 0, dur: 0.75, upd(t) {
    g.clear();
    const p = Math.min(1, t / 0.16);
    if (t < 0.34) {                                                              // la tira se extiende y se recoge
      const fin = t < 0.16 ? p : 1, ini = t < 0.2 ? 0 : (t - 0.2) / 0.14;
      g.lineStyle(Math.max(1.5, S * 0.035 * (1 - ini)), 0x6b4a2a, 1 - ini * 0.6);
      for (let k = ini; k <= fin; k += 0.04) { const [x, y] = bez(k); k === ini ? g.moveTo(x, y) : g.lineTo(x, y); }
      g.lineStyle(0).beginFill(0xffd36b, 1 - ini).drawCircle(...bez(fin), S * 0.03).endFill();
    }
    if (t >= 0.14) {                                                             // el estallido y el aro
      const q = (t - 0.14) / 0.61;
      g.lineStyle(2.5, 0xfff2c0, 1 - q); for (const [an, lg] of rayos) g.moveTo(px + Math.cos(an) * lg * 0.3, py + Math.sin(an) * lg * 0.3).lineTo(px + Math.cos(an) * lg * (0.6 + q), py + Math.sin(an) * lg * (0.6 + q));
      aro.clear().lineStyle(3, 0xffd36b, 0.55 * (1 - q)).drawCircle(px, py, S * RADIO_LATIGO * (0.15 + 0.85 * Math.min(1, q * 1.6)));
      texto.alpha = Math.max(0, Math.min(1, (t - 0.14) / 0.08) * (1 - q * q)); texto.y = py - S * (0.45 + 0.35 * q);
    }
  } });
  arrancarTicker();
}

function pasoVasallos(dt) {
  efectos = efectos.filter(e => { e.t += dt; if (e.t >= e.dur) { e.c.destroy({ children: true }); return false; } e.upd(e.t); return true; });
  const m = mapaDe(canvas.scene); if (!m || !contenedor) return;
  const { S, ox, oy } = geo(), ahora = performance.now() / 1000;
  for (const v of vasallos) {
    const k = v.azote > 0 ? 2.4 : 1, dtv = dt * k;                                // azotados: todo el doble de deprisa
    if (v.azote > 0) v.azote = Math.max(0, v.azote - dt);
    const tinte = v.azote > 0 ? 0xff9a88 : 0xffffff;
    for (const h of v.cont.children) h.tint = tinte;
    if (v.estado === "trabaja") {
      v.t -= dtv; v.cont.pico.rotation = 0.35 + Math.sin(ahora * 11 * k + v.fase) * 0.9; v.cont.rotation = 0;
      if (v.t <= 0) objetivo(m, v);
    } else {
      const sig = v.ruta[0];
      if (!sig) { v.estado = "trabaja"; v.t = 2 + Math.random() * 3; }
      else {
        const tx = sig[0] + 0.5 + v.jx, ty = sig[1] + 0.5 + v.jy, dx = tx - v.x, dy = ty - v.y, d = Math.hypot(dx, dy), paso = v.vel * dtv;
        if (d <= paso) { v.x = tx; v.y = ty; v.ruta.shift(); } else { v.x += dx / d * paso; v.y += dy / d * paso; }
        if (Math.abs(dx) > 0.02) v.cont.scale.x = Math.sign(dx) * v.esc;
        v.cont.pico.rotation = 0.35; v.cont.rotation = Math.sin(ahora * 14 * k + v.fase) * 0.13;
      }
    }
    const salto = v.estado === "camina" ? Math.abs(Math.sin(ahora * 14 * k + v.fase)) * S * 0.015 : 0;
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
    const s = sprite(clave, px, py, S, S); if (s) { s.zIndex = -100000 + y; if (c === "r" && enObra(salaEn(m, x, y))) s.alpha = 0.5; contenedor.addChild(s); }
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
  // salas en obras: andamio rayado y su reloj; sin mobiliario ni luz hasta que se terminan
  for (const sala of m.salas.filter(enObra)) {
    const g = new PIXI.Graphics();
    g.lineStyle(3, 0xc8921f, 0.55);
    for (const [i, j] of (sala.celdas ?? Array.from({ length: sala.w * sala.h }, (_, k) => [sala.x + (k % sala.w), sala.y + Math.floor(k / sala.w)]))) { const px = ox + i * S, py = oy + j * S; g.moveTo(px, py + S).lineTo(px + S, py); }
    g.zIndex = -99850; contenedor.addChild(g);
    const t = new PIXI.Text(`🔨 ${sala.obra.hecho}/${sala.obra.seg}`, { fontSize: Math.round(S * 0.32), fill: 0xffe39a, stroke: 0x1c1612, strokeThickness: 5, fontWeight: "900" });
    t.anchor.set(0.5); t.x = ox + (sala.x + sala.w / 2) * S; t.y = oy + (sala.y + sala.h / 2) * S; t.zIndex = 1e6; contenedor.addChild(t);
  }
  for (const sala of m.salas) for (const e of (enObra(sala) ? [] : decor.get(sala.id))) {
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
  arrancarTicker();
}

function quitarContenedor() { pararTicker(); vasallos = []; efectos = []; if (contenedor) { contenedor.destroy({ children: true }); contenedor = null; } }

function limpiar() { quitarContenedor(); quitarOverlay(); pararAmbiente(); }

/** El ambiente suena solo mientras se mira una escena de mazmorra. */
function arrancarAmbiente() { if (canvas?.ready && mapaDe(canvas.scene)) iniciarAmbiente(() => vasallos.length); else pararAmbiente(); }

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

/** Mensajes a los demás navegadores por el socket del módulo (sonidos, latigazos, rechazos). */
const emitir = msg => { try { game.socket.emit(`module.${MOD}`, { escena: canvas.scene?.id, ...msg }); } catch { /* sin conexión */ } };
/** Suena aquí y en todos los navegadores que miran esta escena. */
const sonarATodos = (nombre, opciones) => { sonar(nombre, opciones); emitir({ t: "sonido", s: nombre, o: opciones }); };

/** Proyectos de descanso de las fichas de los PJ: con el reloj lleno terminan una obra en curso del mapa. */
function proyectosDeObra() {
  const out = [];
  for (const a of game.actors ?? []) {
    if (a.type !== "character") continue;
    for (const it of a.items) {
      if (it.type !== "project") continue;
      const tam = Number(it.system.clock_size) || 4, prog = Math.min(tam, Number(it.system.clock_progress) || 0);
      out.push({ actor: a.id, item: it.id, quien: a.name, nombre: it.name, tam, prog, completo: prog >= tam, cobrado: Boolean(it.getFlag(MOD, "cobrado")), deObra: esProyectoDeObra(it.name) });
    }
  }
  return out.sort((x, y) => Number(y.completo && !y.cobrado) - Number(x.completo && !x.cobrado) || x.quien.localeCompare(y.quien));
}

/** El DJ elige qué hacen los duendes en su acción de descanso, o lo deja al azar entre lo que tiene sentido ahora. */
async function elegirAccionDuendes() {
  const m = mapaDe(canvas.scene); if (!m) return;
  const posibles = new Set(accionesDuendesPosibles(m, contextoReglas(m).tema));
  const botones = [["azar", "Que decida el azar", "fa-dice"], ...Object.entries(ACCIONES_DUENDES).map(([k, t]) => [k, t, { tunel: "fa-person-digging", obra: "fa-hammer", sala3: "fa-dungeon", suya: "fa-comment-dots" }[k]])]
    .filter(([k]) => k === "azar" || posibles.has(k));
  const que = await foundry.applications.api.DialogV2.wait({
    window: { title: "Acción de descanso de los duendes", icon: "fa-solid fa-hammer" }, classes: ["mrg"],
    content: `<p class="mrg-nota">Tiran tantos dados como el nivel de la mazmorra (pág. 239). Elige qué hacen; el resultado se aplica solo.</p>`,
    buttons: botones.map(([k, t, ic], i) => ({ action: k, label: t, icon: `fa-solid ${ic}`, default: i === 0 })), rejectClose: false
  }).catch(() => null);
  if (que) await accionDuendes(que);
}

/** Al empezar la fase de acecho, un recordatorio (págs. 238-239). No hay bolsa común: cada cual tira su acción de descanso. */
function avisoAcecho() {
  const pj = game.actors?.filter(a => a.type === "character" && a.hasPlayerOwner).length ?? 0;
  aviso(`<b>Fase de acecho.</b> Cada PJ tiene su acción de descanso${pj ? ` (${pj} en total)` : ""}; cada panda de esbirros, otra si le pagáis 1 de oro; y los duendes, la suya (constructor → «Acción de los duendes»). Las obras en curso avanzan con esas tiradas.`);
}

/** Acción de descanso de los duendes (pág. 239): tantos dados como el nivel de la mazmorra; el DJ elige qué hacen o lo deja al azar. */
async function accionDuendes(eleccion) {
  const escena = canvas.scene, m0 = mapaDe(escena); if (!m0 || !game.user.isGM) return;
  const ctx = contextoReglas(m0), n = ctx.nivel ?? 0;
  const roll = await new Roll(n > 0 ? `${n}d6` : "2d6kl").evaluate();
  game.dice3d?.showForRoll(roll, game.user, true);
  const caras = roll.dice.flatMap(d => d.results.map(x => x.result)), ev = evaluarTirada(caras, n), seg = AVANCE_RESULTADO[ev.estado] ?? 0;
  const posibles = accionesDuendesPosibles(m0, ctx.tema), que = eleccion === "azar" ? posibles[Math.floor(Math.random() * posibles.length)] : eleccion;
  const m = foundry.utils.deepClone(m0);
  let texto = `<b>Los duendes</b> tiran ${n > 0 ? `${n}d` : "0d (el peor de 2d)"}: ${caras.join(", ")} → ${esc(ev.etiqueta)}.<br>${ACCIONES_DUENDES[que]}`;
  if (que === "tunel") {
    const camino = tunelDeDuendes(m);
    if (!camino.length) texto += ", pero ya está todo conectado.";
    else if (!seg) texto += ", pero el túnel se les derrumba: esta vez no avanzan.";
    else { for (const [x, y] of camino) excavar(m, x, y); texto += `: ${camino.length} celdas de túnel nuevas${ev.estado === "mixed" ? " (con un precio que dice el DJ)" : ""}.`; }
  } else if (que === "obra") {
    const o = obrasEnCurso(m)[0];
    if (!o) texto += ", pero no hay ninguna obra en curso.";
    else { const r = avanzarObra(m, o.clase, o.id, seg); texto += `: ${esc(o.nombre.toLowerCase())} +${seg} (${r.hecho}/${r.seg})${r.completa ? ". ¡Terminada!" : "."}`; }
  } else if (que === "sala3") {
    const t = TIPOS_SALA[ctx.tema], h = t && huecoParaSala(m, ctx.tema);
    if (!h) texto += ", pero no encuentran sitio (o la ficha de la mazmorra no tiene temática).";
    else {
      const nombre = t.salas?.[Math.floor(Math.random() * t.salas.length)] ?? "";
      const r = construirSala(m, h.rect, ctx.tema, { obra: true, nombre });
      if (r.ok) { alternarPuerta(m, h.puerta.x, h.puerta.y, h.puerta.d); if (seg) avanzarObra(m, "sala", r.id, seg); texto += `: ${esc((nombre || t.nombre).toLowerCase())}, con su reloj de 8 (+${seg}). Para terminarla harán falta los materiales.`; }
      else texto += `: ${esc(r.motivo)}`;
    }
  } else texto += ". El DJ narra en qué andan (quizá se note en el próximo desastre).";
  await escena.setFlag(MOD, FLAG, m); await sincronizarEntorno(escena);
  sonarATodos(seg ? "cavar" : "error");
  await aviso(texto);
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

/** Tamaño de los tokens en las escenas de mazmorra: media casilla (o el normal). Se aplica a su ancho y alto, no solo al dibujo. */
const tamanoTokens = () => (Number(game.settings.get(MOD, "mazmorraTamanoTokens")) >= 1 ? 1 : 0.5);
const aMedias = v => Math.max(0.5, Math.round(v * 2) / 2);

/**
 * Deja los tokens de la escena al tamaño elegido: una casilla es un túnel entero y los personajes han de ser más pequeños que las
 * salas. Los tokens que reducía la versión 2.6-2.8 solo por el dibujo (`texture.scale`) se devuelven a su escala y se achican de verdad.
 */
export async function reescalarTokens(escena = canvas.scene) {
  if (!game.user.isGM || !escena || !mapaDe(escena)) return;
  const f = tamanoTokens(), cambios = [];
  for (const t of escena.tokens) {
    const antes = Number(t.getFlag(MOD, "escala")) || 1, nuevo = Number(t.getFlag(MOD, "escalaV")) === 2;
    if (nuevo && Math.abs(antes - f) < 0.001) continue;
    const base = nuevo ? antes : 1;   // en la versión antigua el ancho y el alto no se habían tocado
    const c = { _id: t.id, width: aMedias(t.width / base * f), height: aMedias(t.height / base * f), [`flags.${MOD}.escala`]: f, [`flags.${MOD}.escalaV`]: 2 };
    if (!nuevo && antes !== 1) { c["texture.scaleX"] = (t.texture.scaleX ?? 1) / antes; c["texture.scaleY"] = (t.texture.scaleY ?? 1) / antes; }
    cambios.push(c);
  }
  if (cambios.length) await escena.updateEmbeddedDocuments("Token", cambios);
}

/* ------------------------------------------------------------------------------------------------ acciones (las ejecuta el DJ) */

const SOLO_DJ = new Set(["inicial", "actor", "duendes", "proyecto"]);   // «avanzar» lo puede pedir cualquiera que construya

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
  const inicial = Boolean(m.inicial);
  const proyecto = n => (n === 1 ? "su proyecto se completa con una tirada de acción de descanso (con un parcial, pagando el precio)" : `su proyecto es un reloj de ${n} segmentos que llenan las tiradas de acción de descanso`);

  if (accion === "celdas") {
    // excavar es libre: cada cosa construida se une al resto con un túnel corto sin coste (pág. 196); el túnel largo es una estructura
    let n = 0;
    for (const [x, y] of datos.celdas) n += (datos.modo === "excavar" ? excavar(m, x, y) : rellenar(m, x, y)) ? 1 : 0;
    r = { ok: n > 0, motivo: n ? "" : "Nada que cambiar ahí." };
  } else if (accion === "sala") {
    const t = TIPOS_SALA[datos.tipo], ctx = contextoReglas(m);
    // la mazmorra inicial tiene su sala de nivel 3 aunque falten materiales (pág. 171)
    if (reglas && t) { const rg = reglasSala(m, datos.tipo, { tema: ctx.tema, materiales: inicial ? null : ctx.materiales }); if (!rg.ok) return rg; }
    r = construirSala(m, datos.rect, datos.tipo, { forma: datos.forma, giro: datos.giro, celdas: datos.celdas, obra: reglas && !inicial, nombre: datos.nombre });
    if (r.ok) {
      const sala = m.salas.find(s => s.id === r.id);
      if (t.guarida) sala.nivel = inicial ? 1 : Math.max(1, ctx.nivel || 0);   // la guarida atrae criaturas del nivel que tenía la mazmorra
      const medida = r.forma === "rect" ? `${r.rect.w}×${r.rect.h}` : `${FORMAS[r.forma].toLowerCase()}, ${r.celdas} celdas`;
      const nombre = esc((datos.nombre || t.nombre).toLowerCase());
      texto = r.obra ? `${quien} empieza la obra de ${nombre} (${medida}): ${proyecto(r.obra)}.`
        : t.guarida ? `${quien} dibuja una guarida de criatura de nivel ${sala.nivel} (${medida}).`
          : `${quien} ${inicial ? "dibuja" : "construye"} ${nombre} (${medida}).`;
    }
  } else if (accion === "quitarSala") r = { ok: quitarSala(m, datos.id) };
  else if (accion === "puerta") r = alternarPuerta(m, datos.x, datos.y, datos.d);
  else if (accion === "trampa") {
    if (datos.op === "poner") {
      r = ponerTrampa(m, { ...datos, obra: reglas && !inicial });
      if (r.ok) {
        const que = { truco: "un truco", porton: "un portón", estructura: esc(String(datos.mecanismo || "una estructura").toLowerCase()) }[datos.tipo] ?? "una trampa";
        texto = r.obra ? `${quien} empieza ${que}${datos.tipo === "estructura" ? "" : ` de nivel ${r.nivel}`}: ${proyecto(r.obra)}.` : `${quien} coloca ${que}${datos.tipo === "estructura" ? "" : ` de nivel ${r.nivel}`}.`;
      }
    } else if (datos.op === "editar") {
      if (!m.trampas?.some(z => z.id === datos.id)) return { ok: false, motivo: "Eso ya no existe." };
      r = editarTrampa(m, datos.id, datos.cambios);
    } else if (datos.op === "quitar") r = { ok: quitarTrampa(m, datos.id) };
    else if (datos.op === "descubrir") {
      r = editarTrampa(m, datos.id, { revelada: datos.valor });
      const t = m.trampas?.find(z => z.id === datos.id);
      if (r.ok && t) texto = `${t.tipo === "truco" ? "Un truco" : "Una trampa"} (${esc(t.mecanismo)}) ${datos.valor ? "ha sido descubierta por los aventureros" : "vuelve a estar armada"}.`;
    }
  } else if (accion === "inicial") {
    m.inicial = Boolean(datos.valor);
    texto = m.inicial ? "El DJ vuelve a abrir la mazmorra inicial: lo que se dibuje ahora no es un proyecto." : "<b>La mazmorra inicial está lista.</b> Desde ahora, cada cosa nueva es un proyecto de descanso con su tirada o su reloj.";
  } else if (accion === "avanzar") {
    if (datos.ajuste && !usuario?.isGM) return { ok: false, motivo: "Solo el DJ ajusta un reloj sin tirada." };
    // págs. 238 y 66: cada acción de descanso es una tirada que avanza el reloj (fracaso 0, parcial 1, éxito 2, crítico 3)
    r = avanzarObra(m, datos.clase, datos.id, Math.trunc(datos.segmentos ?? 0));
    if (r.ok) {
      const o = obrasEnCurso(foundry.utils.deepClone(actual)).find(z => z.clase === datos.clase && z.id === datos.id);
      const nombre = esc((o?.nombre ?? "la obra").toLowerCase());
      const por = { esbirros: "Los esbirros (1 de oro)", duendes: "Los duendes" }[datos.quien] ?? quien;
      texto = datos.ajuste ? `El DJ ajusta el reloj de ${nombre}: ${r.hecho}/${r.seg}.` : `${por} trabaja${datos.quien === "esbirros" || datos.quien === "duendes" ? "n" : ""} en ${nombre}: +${Math.max(0, datos.segmentos)} (${r.hecho}/${r.seg}).${r.completa ? ` <b>¡Terminada!</b>` : ""}`;
    }
  } else if (accion === "proyecto") {
    // un proyecto de la hoja de un PJ con el reloj lleno termina una obra en curso
    const a = game.actors.get(datos.actor), it = a?.items.get(datos.item);
    if (!it) return { ok: false, motivo: "Ese proyecto ya no existe." };
    if (it.getFlag(MOD, "cobrado")) return { ok: false, motivo: "Ese proyecto ya se aplicó a una obra." };
    const obra = datos.id ? obrasEnCurso(m).find(o => o.clase === datos.clase && o.id === datos.id) : obrasEnCurso(m)[0];
    if (!obra) return { ok: false, motivo: "No hay ninguna obra en curso a la que aplicar este proyecto." };
    const tam = Number(it.system.clock_size) || 4, hecho = (Number(it.system.clock_progress) || 0) >= tam;
    r = avanzarObra(m, obra.clase, obra.id, obra.seg);
    if (r.ok) {
      await it.setFlag(MOD, "cobrado", true);
      texto = hecho ? `${esc(a.name)} termina «${esc(it.name)}»: queda terminada la obra de ${esc(obra.nombre.toLowerCase())}.` : `El DJ da por hecho «${esc(it.name)}» de ${esc(a.name)}: queda terminada la obra de ${esc(obra.nombre.toLowerCase())}.`;
    }
  } else if (accion === "duendes") m.duendes = { densidad: Math.min(2, Math.max(0, Number(datos.densidad) || 0)) };
  else if (accion === "actor") m.actor = datos.id || null;
  if (!r.ok) return r;
  await escena.setFlag(MOD, FLAG, m);
  await sincronizarEntorno(escena);
  const SONIDO = { celdas: datos?.modo === "excavar" ? "cavar" : "rellenar", sala: "sala", quitarSala: "demoler", puerta: "puerta", proyecto: "sala", avanzar: r.completa ? "sala" : "cavar", inicial: "extra" };
  const sn = accion === "trampa" ? ({ poner: "trampa", descubrir: "descubierta" }[datos.op] ?? "clic") : SONIDO[accion];
  if (sn) sonarATodos(sn);
  if (texto) aviso(texto);
  return r;
}

const permitido = () => game.user.isGM || game.settings.get(MOD, "mazmorraJugadores");

export async function pedir(accion, datos) {
  const escena = canvas.scene;
  if (SOLO_DJ.has(accion) && !game.user.isGM) return;
  if (!permitido()) return ui.notifications.warn("El DJ no permite construir a los jugadores.");
  if (game.user.isGM) {
    const r = await ejecutar(escena, accion, datos, game.user);
    if (!r.ok && r.motivo) { ui.notifications.warn(r.motivo); sonar("error"); }
    return r;
  }
  if (!game.users.activeGM) return ui.notifications.warn("No hay un DJ conectado que pueda levantar la obra.");
  game.socket.emit(`module.${MOD}`, { t: "mazmorra", accion, datos, escena: escena.id, usuario: game.user.id });
}

/* ------------------------------------------------------------------------------------------------ herramientas sobre el lienzo */

function quitarOverlay() { if (overlay) { overlay.destroy({ children: true }); overlay = null; } }

const aCelda = p => { const { S, ox, oy } = geo(), u = (p.x - ox) / S, v = (p.y - oy) / S; return { i: Math.floor(u), j: Math.floor(v), fx: u - Math.floor(u), fy: v - Math.floor(v) }; };

/** Un latigazo en el punto (px, py) del lienzo: suena y azota aquí y en todos los navegadores. */
function latigazo(px, py) {
  const ahora = performance.now(); if (ahora - ultimoLatigo < 350) return;
  ultimoLatigo = ahora;
  aplicarLatigo(px, py);
  emitir({ t: "latigo", x: px, y: py });
}

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
  if (!t && !abierta(celda(m, i, j))) return ui.notifications.info("Las trampas, los trucos, los portones y las estructuras van en un túnel o en una sala.");
  abrirTrampa({
    trampa: t, gm: game.user.isGM, reglas: reglasOn() && !m.inicial,
    activar: async tr => {
      if (!game.user.isGM) return ui.notifications.info("Solo el DJ tira las trampas; el jugador al cargo narra el resultado.");
      sonarATodos("trampaActiva");
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
  previa.eventMode = "none"; rotulo.eventMode = "none";   // la vista previa nunca debe tragarse los pulsos (el círculo del látigo los capturaba)
  overlay.addChild(zona, previa, rotulo);
  (canvas.interface ?? canvas.stage).addChild(overlay);
  const mapa = () => mapaDe(canvas.scene);
  let ini = null, ultima = null, pintadas = new Set(), punto = null;
  const pinta = (c) => { for (const [i, j] of (ultima ? linea(ultima, c) : [[c.i, c.j]])) pintadas.add(`${i},${j}`); ultima = c; };
  const libre = () => forma === "libre" && herramienta === "sala";
  const celdillas = (lista, color, alfa) => { for (const [i, j] of lista) previa.beginFill(color, alfa).drawRect(ox + i * S, oy + j * S, S, S).endFill(); };

  const dibujarPrevia = (b) => {
    previa.clear(); rotulo.text = "";
    const m = mapa(); if (!m) return;
    if (herramienta === "sala" && !libre()) {
      const a = ini ?? b, x = Math.min(a.i, b.i), y = Math.min(a.j, b.j), w = Math.abs(a.i - b.i) + 1, hh = Math.abs(a.j - b.j) + 1;
      const aj = ajustarSala(m, { x, y, w, h: hh }, tipoSala, { forma, giro }), t = TIPOS_SALA[tipoSala];
      const seg = reglasOn() && !m.inicial ? relojSala(tipoSala) : 0;
      const color = aj ? 0x6fe08a : 0xe0503a;
      if (aj) {
        celdillas(aj.celdas ?? celdasForma(aj, forma, giro), color, 0.28);
        previa.lineStyle(3, color, 1).drawRect(ox + aj.x * S, oy + aj.y * S, aj.w * S, aj.h * S);
        if (aj.ajustada) previa.lineStyle(2, 0xffd36b, 0.9).drawRect(ox + x * S, oy + y * S, w * S, hh * S);   // lo que marcaste, dentro de la sala ya ajustada
      }
      const info = !aj ? `${t.nombre} necesita ${t.min[0]}×${t.min[1]} como mínimo y aquí no cabe.` : `${t.nombre}${aj.recortada ? " · recortada por lo que ya hay" : aj.ajustada ? " · ajustada al mínimo" : ""}${seg === 1 ? " · 1 tirada" : seg ? ` · reloj de ${seg}` : ""}`;
      const r = aj ?? { x, y, w, h: hh }; rotulo.text = `${r.w}×${r.h} · ${info}`; rotulo.x = ox + r.x * S + 6; rotulo.y = oy + r.y * S + 4;
    } else if (libre()) {
      const lista = ini ? [...pintadas].map(k => k.split(",").map(Number)) : [[b.i, b.j]], t = TIPOS_SALA[tipoSala];
      if (ini) {
        const v = validarCeldas(m, lista), minimo = t.min[0] * t.min[1], ok = v.ok && lista.length >= minimo, color = ok ? 0x6fe08a : 0xe0503a;
        celdillas(lista, color, 0.3);
        rotulo.text = `${lista.length} celdas (mín. ${minimo}) · ${v.ok ? (ok ? t.nombre : `faltan ${minimo - lista.length}`) : v.motivo}`;
        rotulo.x = ox + b.i * S + 6; rotulo.y = oy + b.j * S - S * 0.4;
      } else previa.lineStyle(2, 0xffd36b, 0.9).drawRect(ox + b.i * S, oy + b.j * S, S, S);
    } else if (herramienta === "latigo") {
      if (punto) { previa.lineStyle(2, 0xffd36b, 0.75).drawCircle(punto.x, punto.y, S * RADIO_LATIGO).lineStyle(0).beginFill(0xffd36b, 0.12).drawCircle(punto.x, punto.y, S * RADIO_LATIGO).endFill(); }
    } else if (herramienta === "trampa") {
      previa.lineStyle(2, 0xe0503a, 0.9).drawRect(ox + b.i * S, oy + b.j * S, S, S);
      const t = (m.trampas ?? []).find(z => z.x === b.i && z.y === b.j);
      if (t) { rotulo.text = `${t.mecanismo}${t.detonador ? ` · ${t.detonador}` : ""} (nivel ${t.nivel})`; rotulo.x = ox + b.i * S + 6; rotulo.y = oy + b.j * S - S * 0.4; }
    } else {
      previa.lineStyle(2, 0xffd36b, 0.9).drawRect(ox + b.i * S, oy + b.j * S, S, S);
      celdillas([...pintadas].map(k => k.split(",").map(Number)), herramienta === "excavar" ? 0xc8921f : 0x7d1512, 0.4);
      if (herramienta === "excavar" && pintadas.size) {
        const n = [...pintadas].filter(k => { const [i, j] = k.split(",").map(Number); return celda(m, i, j) === "e"; }).length;
        rotulo.text = `${n} celdas`; rotulo.x = ox + b.i * S + 6; rotulo.y = oy + b.j * S - S * 0.4;
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
    else if (herramienta === "latigo") { punto = ev.getLocalPosition(overlay); latigazo(punto.x, punto.y); }
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
    const c = lugar(ev); punto = ev.getLocalPosition(overlay);
    if (ini && (libre() || herramienta === "excavar" || herramienta === "rellenar")) pinta(c);
    dibujarPrevia(c);
  });
  const soltar = ev => {
    if (!ini) return;
    const c = lugar(ev);
    const nombre = TIPOS_SALA[tipoSala]?.salas ? (TIPOS_SALA[tipoSala].salas.includes(salaN3) ? salaN3 : TIPOS_SALA[tipoSala].salas[0]) : undefined;
    if (libre()) pedir("sala", { forma: "libre", celdas: [...pintadas].map(k => k.split(",").map(Number)), tipo: tipoSala, nombre });
    else if (herramienta === "sala") pedir("sala", { rect: { x: Math.min(ini.i, c.i), y: Math.min(ini.j, c.j), w: Math.abs(ini.i - c.i) + 1, h: Math.abs(ini.j - c.j) + 1 }, tipo: tipoSala, forma, giro, nombre });
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
  ["trampa", "fa-skull-crossbones", "Defensas", "Pulsa una celda para colocar una trampa, un truco, un portón o una estructura de nivel 1 (conducto, puente, túnel largo, pasaje secreto, ventana), o para gestionar lo que hay."],
  ["latigo", "fa-burst", "Látigo", "Pulsa para dar un latigazo: los duendes en 2,5 celdas a la redonda trabajan y corren más deprisa unos segundos. Suena en todas las mesas."],
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

    // sonido (ajustes de este navegador)
    const volumen = Number(game.settings.get(MOD, "mazmorraVolumen") ?? 0.8);
    const snd = `<div class="mrg-cons-sonido" role="group" aria-label="Sonido de este navegador">${[["mazmorraSonido", efectosOn(), "fa-volume-high", "fa-volume-xmark", "Efectos", "Efectos de sonido del constructor: cavar, construir, puertas, trampas, látigo…"], ["mazmorraAmbiente", ambienteOn(), "fa-wind", "fa-wind", "Ambiente", "Ambiente de la mazmorra mientras la miras: goteo, picos lejanos, antorchas y duendes."]].map(([k, on, i1, i0, t, ay]) => `<button type="button" class="mrg-cons-snd ${on ? "on" : ""}" data-snd="${k}" aria-pressed="${on}" data-ayuda="${esc(t)}||${esc(ay + " Pulsa para " + (on ? "silenciarlos." : "activarlos."))}"><i class="fa-solid ${on ? i1 : i0}"></i> ${t}: ${on ? "sí" : "no"}</button>`).join("")}<input type="range" min="0" max="1" step="0.05" value="${volumen}" data-vol aria-label="Volumen de los sonidos del constructor"></div>`;

    // forma de la sala
    const formas = herramienta === "sala" ? `<h4 class="mrg-seccion">Forma de la sala</h4><div class="mrg-cons-formas" role="group" aria-label="Forma de la sala">${Object.entries(FORMAS).map(([k, t]) => `<button type="button" class="mrg-cons-f ${forma === k ? "on" : ""}" data-forma="${k}" aria-pressed="${forma === k}" data-ayuda="${esc(t)}||${esc(k === "libre" ? "Pinta las celdas de la sala una a una, con la forma que quieras: tiene que ser de una sola pieza." : "Arrastra una caja y la sala toma esta forma dentro de ella.")}"><b aria-hidden="true">${ICONO_FORMA[k]}</b><span>${t}</span></button>`).join("")}${forma === "ele" ? `<button type="button" class="mrg-cons-f" data-girar data-ayuda="Girar||Gira la L un cuarto de vuelta."><b aria-hidden="true"><i class="fa-solid fa-rotate-right"></i></b><span>Girar</span></button>` : ""}</div>` : "";

    // tipos de sala: el de la temática primero; los que las reglas ahora mismo no permiten salen marcados con el motivo
    const orden = Object.entries(TIPOS_SALA).sort(([ka, a], [kb, b]) => (kb === ctx.tema) - (ka === ctx.tema) || a.nivel - b.nivel);
    const tipos = orden.map(([k, v]) => {
      const rg = reglas ? reglasSala(m, k, { tema: ctx.tema, materiales: m.inicial ? null : ctx.materiales }) : { ok: true };
      const seg = reglas && !m.inicial ? relojSala(k) : 0;
      const sub = `${v.guarida ? "Guarida" : NIVELES[v.nivel]} · ${v.min[0]}×${v.min[1]}${seg === 1 ? " · 1 tirada" : seg ? ` · reloj ${seg}` : ""}`;
      return `<button type="button" class="mrg-cons-t ${tipoSala === k ? "on" : ""} ${rg.ok ? "" : "mrg-cons-t--no"}" data-tipo="${k}" aria-pressed="${tipoSala === k}" data-ayuda="${esc(v.nombre)}||${esc(v.nota + (rg.ok ? "" : " — " + rg.motivo))}"><img src="${RUTA}/rooms/room_${k}_iso.webp" alt="">${k === ctx.tema ? `<em class="mrg-cons-tema" title="Temática de tu mazmorra">★</em>` : ""}${rg.ok ? "" : `<em class="mrg-cons-cand" title="${esc(rg.motivo)}"><i class="fa-solid fa-lock"></i></em>`}<span>${v.nombre}</span><small>${sub}</small></button>`;
    }).join("");
    const actual = TIPOS_SALA[tipoSala], rgActual = reglas ? reglasSala(m, tipoSala, { tema: ctx.tema, materiales: m.inicial ? null : ctx.materiales }) : { ok: true };

    // mazmorra inicial (pág. 171): una de cada, dibujadas sin proyecto
    const hay = (f) => m.salas.some(f), hayT = (tipo, n = 1) => (m.trampas ?? []).some(t => t.tipo === tipo && t.nivel === n);
    const lista0 = [
      ["Sala de nivel 1", hay(s => TIPOS_SALA[s.tipo]?.nivel === 1)], ["Sala de nivel 2", hay(s => TIPOS_SALA[s.tipo]?.nivel === 2)],
      ["Sala de nivel 3 (sin materiales)", hay(s => TIPOS_SALA[s.tipo]?.nivel === 3)], ["Guarida de criatura de nivel 1", hay(s => s.tipo === "criatura")],
      ["Portón de nivel 1", hayT("porton")], ["Trampa de nivel 1", hayT("trampa")], ["Truco de nivel 1", hayT("truco")],
      ["Santuario", hay(s => s.tipo === "santuario")], ["Escalera al santuario", hay(s => s.tipo === "escalera")]
    ];
    const inicial = m.inicial ? `<section class="mrg-cons-obra"><div class="mrg-cons-obra-t"><b>Mazmorra inicial</b><span>${lista0.filter(x => x[1]).length}/${lista0.length}</span></div>
      <p class="mrg-nota">Por turnos, dibujad una de cada (pág. 171). El DJ dibuja el exterior y la entrada y tira un descubrimiento. Aquí nada es un proyecto: no hay tiradas ni relojes.</p>
      <ul class="mrg-cons-l3">${lista0.map(([t, ok]) => `<li class="${ok ? "ok" : "falta"}"><i class="fa-solid ${ok ? "fa-check" : "fa-circle"}"></i> ${t}</li>`).join("")}</ul>
      ${gm ? `<div class="mrg-cons-col"><button type="button" class="mrg-btn mrg-btn--sangre" data-inicial="0" data-ayuda="Terminar la mazmorra inicial||Desde ahora, cada cosa nueva será un proyecto de descanso con su tirada o su reloj."><i class="fa-solid fa-flag-checkered"></i> Terminar la mazmorra inicial</button></div>` : `<p class="mrg-nota">El DJ la da por terminada cuando esté todo.</p>`}</section>` : "";
    const guaridas = m.salas.filter(s => s.tipo === "criatura");

    const proys = proyectosDeObra(), obras = obrasEnCurso(m);
    const filaProy = p => `<li class="${p.cobrado ? "hecho" : p.completo ? "listo" : ""}"><span class="mrg-cons-pq">${esc(p.quien)}</span> <b>${esc(p.nombre)}</b> <span class="mrg-xp-mini oro" role="img" aria-label="${p.prog} de ${p.tam}">${Array.from({ length: p.tam }, (_, i) => `<i class="${i < p.prog ? "on" : ""}"></i>`).join("")}</span>
        ${p.cobrado ? `<em class="mrg-chip"><i class="fa-solid fa-check"></i> aplicado</em>` : gm && obras.length ? `<button type="button" class="mrg-mini mrg-cons-aplicar" data-proy="${p.actor}|${p.item}" data-ayuda="${p.completo ? "Terminar una obra" : "Dar por hecho"}||${esc(`${p.completo ? "El reloj está lleno: termina" : "El reloj aún no está lleno; lo das por hecho igualmente y terminas"} la primera obra en curso (${obras[0].nombre}).`)}">${p.completo ? "Terminar obra" : "Dar por hecho"}</button>` : ""}</li>`;
    const RES = [["failure", "Fracaso", 0], ["mixed", "Parcial", 1], ["success", "Éxito", 2], ["critical", "Crítico", 3]];
    const QUIEN = [["pj", "Un PJ", "fa-user"], ["esbirros", "Esbirros (1 oro)", "fa-people-group"], ["duendes", "Duendes", "fa-hammer"]];
    const quienes = `<div class="mrg-cons-res-obra" role="group" aria-label="Quién tira"><b>Tira:</b> ${QUIEN.map(([k, t, ic]) => `<button type="button" class="mrg-chipbtn ${quienTira === k ? "mrg-sel" : ""}" data-quien="${k}" aria-pressed="${quienTira === k}"><i class="fa-solid ${ic}"></i> ${t}</button>`).join("")}</div>`;
    const filaObra = ob => `<li><b>${esc(ob.nombre)}</b> <span class="mrg-xp-mini oro" role="img" aria-label="${ob.hecho} de ${ob.seg} segmentos">${Array.from({ length: ob.seg }, (_, i) => `<i class="${i < ob.hecho ? "on" : ""}"></i>`).join("")}</span> <small>${ob.seg === 1 ? "una tirada" : `${ob.hecho}/${ob.seg}`}</small>
        <span class="mrg-cons-res-obra" role="group" aria-label="Resultado de la tirada">${RES.map(([k, t, n]) => `<button type="button" class="mrg-chipbtn" data-avanzar="${ob.clase}|${ob.id}|${n}" data-ayuda="${t}||Apunta una acción de descanso con este resultado: el reloj avanza ${n} segmento${n === 1 ? "" : "s"}.">${t} +${n}</button>`).join("")}
        ${gm ? `<button type="button" class="mrg-mini" data-ajustar="${ob.clase}|${ob.id}|-1" aria-label="Retrasar un segmento" data-ayuda="Ajustar||Efecto débil o un desastre: el reloj retrocede un segmento (sin gastar acción)."><i class="fa-solid fa-minus"></i></button><button type="button" class="mrg-mini" data-ajustar="${ob.clase}|${ob.id}|1" aria-label="Avanzar un segmento" data-ayuda="Ajustar||Efecto potente: el reloj avanza un segmento más (sin gastar acción)."><i class="fa-solid fa-plus"></i></button>` : ""}</span></li>`;
    // obras en curso: cada cosa nueva es un proyecto de descanso; lo llenan las tiradas de PJ, esbirros pagados y duendes
    const obra = reglas && !m.inicial ? `<section class="mrg-cons-obra"><div class="mrg-cons-obra-t"><b>Obras (proyectos de descanso)</b><span>${obras.length}</span></div>
      <p class="mrg-nota">Dibujar es libre. Lo nuevo queda en obras hasta completar su proyecto: nivel 1, una tirada; nivel 2, un reloj de 4; nivel 3, uno de 8 y los materiales. Cada PJ tiene una acción de descanso por fase de acecho, los esbirros otra por 1 de oro y los duendes la suya.</p>
      ${obras.length ? `<div class="mrg-cons-proys">${quienes}<ul>${obras.map(filaObra).join("")}</ul><p class="mrg-nota">Elige quién tira y marca el resultado de su tirada de acción (situación ventajosa, pág. 238): fracaso 0, parcial 1, éxito 2, crítico 3 (efecto potente +1, débil −1).</p></div>` : `<p class="mrg-nota">No hay obras en curso.</p>`}
      <details class="mrg-cons-proys" ${proys.some(p => p.completo && !p.cobrado) ? "open" : ""}><summary><i class="fa-solid fa-hourglass-half"></i> Proyectos de las fichas (${proys.filter(p => p.completo && !p.cobrado).length} listos)</summary>${proys.length ? `<ul>${proys.map(filaProy).join("")}</ul>` : `<p class="mrg-nota">Ningún PJ tiene proyectos todavía. Un proyecto con el reloj lleno termina una obra en curso; los que hablan de construir, excavar, salas o trampas lo hacen solos al llenarse.</p>`}</details>
      ${gm ? `<div class="mrg-cons-obra-b"><button type="button" class="mrg-btn mrg-btn--sangre" data-duendes-accion data-ayuda="Acción de los duendes||Pág. 239: tiran tantos dados como el nivel de la mazmorra. Elige qué hacen o déjalo al azar; el resultado se aplica solo."><i class="fa-solid fa-dice"></i> Acción de los duendes</button><button type="button" class="mrg-btn" data-inicial="1" data-ayuda="Volver a la mazmorra inicial||Lo que se dibuje no será un proyecto (para rehacer la mazmorra inicial)."><i class="fa-solid fa-rotate-left"></i> Mazmorra inicial</button></div>` : ""}</section>` : "";
    const lairs = guaridas.length ? `<p class="mrg-nota"><i class="fa-solid fa-paw"></i> Guaridas de criatura: ${guaridas.map(s => `nivel ${s.nivel ?? 1}`).join(", ")}. Se suma una cada vez que sube el nivel de la mazmorra; las demás, por descubrimientos (pág. 190).</p>` : "";

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
        <li><b>La mazmorra inicial</b> (pág. 171) se dibuja por turnos con una de cada: sala de nivel 1, 2 y 3 (sin materiales), guarida de criatura de nivel 1, portón, trampa y truco de nivel 1, santuario y escalera. No son proyectos.</li>
        <li><b>Dibujar es libre</b> (pág. 196): sin medidas y cada cosa nueva se une al resto con un túnel corto gratis. Lo que la hace real es su <b>proyecto de descanso</b> (pág. 238): nivel 1, una tirada (con un parcial, pagando el precio); nivel 2, un reloj de 4; nivel 3, un reloj de 8 y los materiales de una incursión.</li>
        <li><b>Quién tira:</b> cada PJ tiene una acción de descanso por fase de acecho (más las de su vocación); los esbirros hacen otra si les pagáis 1 de oro; los duendes tienen la suya, con tantos dados como el nivel de la mazmorra, y el DJ decide qué hacen (cavar túneles, empezar una sala de nivel 3, ayudar en una obra). El límite es ese, no el dibujo.</li>
        <li><b>Guaridas de criatura:</b> no se construyen; se suma una cada vez que sube el nivel de la mazmorra y otras llegan por descubrimientos (pág. 190). <b>Portones</b> (pág. 201): material y cierre, de nivel 1 a 3. <b>Estructuras de nivel 1</b>: conducto, construcción, túnel largo, pasaje secreto y ventana.</li>
        <li>Las salas de nivel 3 son de la temática de tu mazmorra; solo puedes construir <b>una</b> de otra temática. Mover la escalera del santuario no gasta acción.</li>
        <li>El manual no fija medidas («dibujad como os plazca»; el santuario suele ser de 5×5 o más): los mínimos de cada sala son del módulo y puedes darles la forma que quieras.</li>
        ${gm ? `<li class="mrg-nota">Apaga los relojes de obra en Ajustes → «El constructor lleva las obras con relojes».</li>` : ""}
      </ul></details>`;

    return `<div class="mrg-cons">
      <div class="mrg-cons-herr">${herr}</div>
      ${snd}
      ${inicial}
      ${obra}
      ${lairs}
      ${formas}
      <h4 class="mrg-seccion">Tipo de sala</h4><div class="mrg-cons-tipos">${tipos}</div>
      ${actual.salas ? `<label class="mrg-campo"><span class="mrg-etiqueta">¿Qué sala de nivel 3? (pág. 196)</span><select data-n3>${actual.salas.map(n => `<option ${n === salaN3 ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label>` : ""}
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
      if (b.dataset.snd) { const k = b.dataset.snd, on = !game.settings.get(MOD, k); await game.settings.set(MOD, k, on); if (on) sonar("clic"); return this.render(); }
      if (b.dataset.proy) { const [actor, item] = b.dataset.proy.split("|"); await pedir("proyecto", { actor, item }); return this.render(); }
      if (b.dataset.avanzar || b.dataset.ajustar) { const [clase, id, n] = (b.dataset.avanzar || b.dataset.ajustar).split("|"); await pedir("avanzar", { clase, id, segmentos: Number(n), ajuste: Boolean(b.dataset.ajustar), quien: quienTira }); return this.render(); }
      if (b.dataset.herr) { sonar("clic"); activarHerramienta(herramienta === b.dataset.herr ? null : b.dataset.herr); return this.render(); }
      if (b.dataset.tipo) { tipoSala = b.dataset.tipo; if (herramienta !== "sala") activarHerramienta("sala"); return this.render(); }
      if (b.dataset.forma) { forma = b.dataset.forma; activarHerramienta("sala"); return this.render(); }
      if ("girar" in b.dataset) { giro = (giro + 1) % 4; return this.render(); }
      if (b.dataset.quien) { quienTira = b.dataset.quien; return this.render(); }
      if (b.dataset.inicial) { await pedir("inicial", { valor: b.dataset.inicial === "1" }); return this.render(); }
      if ("duendesAccion" in b.dataset) return elegirAccionDuendes();
      if ("nueva" in b.dataset) { await nuevaEscena(); return this.render(); }
      if ("convertir" in b.dataset) { await convertirEscena(); return this.render(); }
      if ("rehacer" in b.dataset) { await sincronizarEntorno(); ui.notifications.info("Muros, puertas y luces rehechos."); }
    };
    cont.querySelector("[data-actor]")?.addEventListener("change", async ev => { await pedir("actor", { id: ev.target.value }); this.render(); });
    cont.querySelector("[data-n3]")?.addEventListener("change", ev => { salaN3 = ev.target.value; });
    cont.querySelector("[data-vol]")?.addEventListener("change", async ev => { await game.settings.set(MOD, "mazmorraVolumen", Number(ev.target.value)); sonar("clic"); });
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

const mapaNuevo = (w, h) => crearMapa(w, h);   // empieza como mazmorra inicial (pág. 171)

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
    name: "El constructor lleva las obras con relojes", hint: "Tras la mazmorra inicial, cada cosa nueva queda en obras hasta completar su proyecto de descanso (nivel 1 una tirada, nivel 2 un reloj de 4, nivel 3 uno de 8 y materiales), y las salas de nivel 3 piden la temática de la ficha. Apagado, todo se construye al instante.",
    scope: "world", config: true, type: Boolean, default: true, onChange: () => foundry.applications.instances?.get?.("mr-wo-constructor")?.render()
  });
  game.settings.register(MOD, "mazmorraVasallos", {
    name: "Vasallos constructores en la mazmorra", hint: "Diminutos esbirros recorren las salas y túneles de tu mazmorra, cavando y trabajando. Solo es un adorno de este navegador.",
    scope: "client", config: true, type: Boolean, default: true, onChange: () => dibujar()
  });
  game.settings.register(MOD, "mazmorraSonido", {
    name: "Efectos de sonido del constructor", hint: "Cavar, construir, demoler, puertas, trampas, látigo y avisos. Cada navegador decide si los oye.",
    scope: "client", config: true, type: Boolean, default: true
  });
  game.settings.register(MOD, "mazmorraAmbiente", {
    name: "Ambiente sonoro de la mazmorra", hint: "Mientras miras una escena de mazmorra: zumbido de cueva, goteo, picos lejanos, antorchas y duendes charlando.",
    scope: "client", config: true, type: Boolean, default: true, onChange: () => arrancarAmbiente()
  });
  game.settings.register(MOD, "mazmorraVolumen", {
    name: "Volumen de los sonidos de la mazmorra", hint: "Volumen propio de los efectos y el ambiente del constructor, independiente del de interfaz de Foundry.",
    scope: "client", config: true, type: Number, range: { min: 0, max: 1, step: 0.05 }, default: 0.8, onChange: () => arrancarAmbiente()
  });
  game.settings.register(MOD, "mazmorraTamanoTokens", {
    name: "Tamaño de los tokens en la mazmorra", hint: "En las escenas de mazmorra los tokens miden media casilla para no llenar un túnel entero y quedar a la escala de las salas. Los tokens grandes se reducen a la mitad.",
    scope: "world", config: true, type: Number, choices: { 0.5: "Media casilla (recomendado)", 1: "Normal (una casilla)" }, default: 0.5, onChange: () => { if (soyDJ()) reescalarTokens(canvas.scene); }
  });
}

export function iniciarMazmorra() {
  game.socket.on(`module.${MOD}`, async msg => {
    if (msg?.t === "sonido") { if (msg.escena === canvas.scene?.id) sonar(msg.s, msg.o); return; }
    if (msg?.t === "latigo") { if (msg.escena === canvas.scene?.id) aplicarLatigo(msg.x, msg.y); return; }
    if (msg?.t === "rechazo") { if (msg.usuario === game.user.id) { ui.notifications.warn(msg.motivo); sonar("error"); } return; }
    if (msg?.t !== "mazmorra" || !soyDJ()) return;
    if (!game.settings.get(MOD, "mazmorraJugadores")) return;
    const usuario = game.users.get(msg.usuario);
    if (SOLO_DJ.has(msg.accion) && !usuario?.isGM) return;
    const escena = game.scenes.get(msg.escena); if (!escena) return;
    const r = await ejecutar(escena, msg.accion, msg.datos, usuario);
    if (!r.ok && r.motivo) { ui.notifications.warn(`${usuario?.name ?? "Un jugador"}: ${r.motivo}`); emitir({ t: "rechazo", usuario: msg.usuario, motivo: r.motivo }); }
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
    const f = tamanoTokens();
    if (!doc.parent || !mapaDe(doc.parent) || Number(doc.getFlag(MOD, "escalaV")) === 2) return;
    doc.updateSource({ width: aMedias(doc.width * f), height: aMedias(doc.height * f), [`flags.${MOD}.escala`]: f, [`flags.${MOD}.escalaV`]: 2 });
  });
  // la ficha de la mazmorra manda: si cambia su nivel o sus salas, el panel y las piezas (oro del tesoro, vasallos) se ponen al día
  const alCambiarFicha = doc => {
    const a = doc.parent ?? doc;
    if (a?.type === "dungeon") { foundry.applications.instances?.get?.("mr-wo-constructor")?.render(); if (mapaDe(canvas.scene)) redibujar(); }
  };
  Hooks.on("updateActor", (actor, cambios) => {
    alCambiarFicha(actor);
    // el panel del DJ pasa a la fase 1: empieza una fase de acecho; se recuerda quién tiene acciones de descanso
    if (soyDJ() && actor.type === "gm_sheet" && foundry.utils.getProperty(cambios, "system.current_phase.value") === 1 && reglasOn() && mapaDe(canvas.scene) && !mapaDe(canvas.scene).inicial) avisoAcecho();
  });
  for (const h of ["createItem", "updateItem", "deleteItem"]) Hooks.on(h, alCambiarFicha);
  Hooks.on("updateItem", (item, cambios) => {   // un reloj de proyecto que se llena y habla de obras se cobra solo
    if (!soyDJ() || item.type !== "project" || !foundry.utils.hasProperty(cambios, "system.clock_progress")) return;
    const tam = Number(item.system.clock_size) || 4;
    if ((Number(item.system.clock_progress) || 0) < tam || item.getFlag(MOD, "cobrado") || !esProyectoDeObra(item.name)) return;
    const m = mapaDe(canvas.scene); if (!m || !reglasOn() || !obrasEnCurso(m).length) return;
    ejecutar(canvas.scene, "proyecto", { actor: item.parent.id, item: item.id }, game.user).catch(e => console.warn(`${MOD} | proyecto`, e));
  });
  const alCargar = () => {
    dibujar(); arrancarAmbiente();
    if (soyDJ() && mapaDe(canvas.scene)) { sincronizarEntorno(canvas.scene).catch(e => console.warn(`${MOD} | sincronizar`, e)); reescalarTokens(canvas.scene).catch(e => console.warn(`${MOD} | escala`, e)); }
  };
  if (canvas?.ready) cargarTexturas().then(alCargar);
}
