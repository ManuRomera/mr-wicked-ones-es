/**
 * Mapa de los monstruos (manual, cap. 6 «Entorno», págs. 276-297, y cap. 7 «Sesión 0», págs. 307-313).
 *
 * Herramienta de la sesión 0 y mapa de juego a la vez:
 *  · Edición colaborativa: todos los jugadores pintan, colocan y tocan lo de los demás a la vez. Cada orden viaja al DJ, que la
 *    aplica en cola (una tras otra, sin pisarse) y guarda. Cada cual deshace lo suyo, sin tocar lo de los demás.
 *  · Capas: lo último que se pone queda encima; cada elemento se puede traer al frente o mandar al fondo, agrandar, voltear,
 *    renombrar o quitar desde su menú (clic con «Seleccionar», o clic derecho con cualquier herramienta).
 *  · Escala: los días de viaje del centro al borde (2-4, pág. 276) fijan el tamaño de todo; la barra de escala se dibuja en el mapa.
 *  · Facciones del sistema, con su imagen; se arrastran desde su ventana al mapa sin cerrarla.
 *  · Enlaces (escena, diario o actor) solo los pone el DJ, desde su propio menú: los jugadores no ven sus escenas.
 *  · Check-list de las sesiones 0 y 1: la atmósfera y los duendes se escriben en la ficha de la mazmorra, como pide el sistema.
 *  · Bloqueado, es el mapa de juego: los lugares abren su enlace (la mazmorra, su escena) y las facciones, su ficha.
 */
const MOD = "mr-wicked-ones-es";
const FLAG = "entorno";
const ICONOS = `modules/${MOD}/assets/iconos`;
const IMG_FACCION = `${ICONOS}/mapa-estandarte.webp`;   // imagen genérica de una facción nueva
const FONDOS = { viejo: "Pergamino viejo", roto: "Desgarrado", ahumado: "Ahumado", sangre: "Manchado de sangre", piel: "Piel de bestia" };
const rutaFondo = k => `modules/${MOD}/assets/escenas/entorno-fondo-${k}.webp`;
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const App = foundry.applications?.api?.ApplicationV2;

export const TERRENO = {
  bosque: ["Bosque", ["bosque-1", "bosque-2", "bosque-3"]], pinar: ["Pinar", ["pinar-1", "pinar-2"]], montana: ["Montañas", ["montana-1", "montana-2", "montana-3"]],
  colina: ["Colinas", ["colina-1", "colina-2"]], pantano: ["Pantano", ["pantano"]], campos: ["Campos", ["campos"]], lago: ["Lago", ["lago-1", "lago-2"]],
  mar: ["Mar", ["olas-1", "olas-2"]], acantilado: ["Acantilado", ["acantilado"]], grieta: ["Grieta", ["grieta"]], yermo: ["Yermo", ["yermo"]], volcan: ["Volcán", ["volcan"]]
};
export const LUGARES = {
  mazmorra: "Vuestra mazmorra", ciudad: "Ciudad amurallada", pueblo: "Pueblo", aldea: "Aldea", castillo: "Castillo", torre: "Torre", abadia: "Abadía",
  ruinas: "Ruinas", cueva: "Cueva", puente: "Puente", mina: "Mina", campamento: "Campamento", granja: "Granja", molino: "Molino", puerto: "Puerto", faro: "Faro",
  menhires: "Menhires", cementerio: "Cementerio", horca: "Horca", aventureros: "Campamento de aventureros", dragon: "Cubil de dragón", nido: "Nido", hito: "Mojón"
};
export const DECORADO = {
  "rosa-1": "Rosa de los vientos", "rosa-2": "Rosa-escudo", cartela: "Cartela del título", serpiente: "Serpiente marina", barco: "Barco",
  calavera: "Calavera", huesos: "Huesos", garra: "Zarpazo", estandarte: "Estandarte"
};
export const BANDOS = { light: ["De la luz", 0xd9b44a], dark: ["Oscura", 0x9a2f8f], neutral: ["Neutral", 0x3f8f7e] };
const TRAZOS = { rio: "Río", camino: "Camino", sendero: "Sendero" };
/** Creación del entorno (pág. 294): cuántas facciones de cada nivel y su reparto recomendado. */
export const PASOS_NIVEL = { 4: [2, 3, { light: 2, neutral: 1 }], 3: [4, 4, { light: 2, dark: 1, neutral: 1 }], 2: [4, 4, { light: 2, dark: 1, neutral: 1 }], 1: [4, 4, { light: 2, dark: 1, neutral: 1 }] };
/** La atmósfera de la mazmorra (págs. 170 y 309) y los duendes (pág. 171) son campos de la ficha de la mazmorra del sistema. */
const ATMOSFERA = [["entrance", "¿Cómo se entra a la mazmorra desde el exterior?"], ["structure", "¿De qué están hechos el suelo y las paredes?"], ["lighting", "¿Qué la ilumina y cómo de oscura es?"], ["atmospherics", "¿Qué sonidos y olores perciben quienes entran?"], ["hoard", "¿Qué compone vuestro tesoro?"], ["imps", "Vuestros duendes: dos rasgos (ariscos, chalados, cobardes, crueles, estúpidos, ingeniosos, problemáticos, ruidosos)"]];
const PREGUNTAS = ["¿Por qué vive esta facción justo ahí y de qué vive?", "¿Quién manda en ella: un consejo o alguien poderoso?", "¿A qué otra facción odia más y qué le hizo?", "Estas dos facciones están enfrentadas: ¿por qué empezó y por qué sigue?", "¿Qué dejó en ruinas ese lugar?", "¿Qué dioses se adoraban aquí antes?"];
const BASE = { sello: 120, lugar: 130, mazmorra: 160, decor: 150, rosa: 260, cartela: 520, medallon: 62 };
const COLS = ["sellos", "lugares", "facciones", "rotulos", "trazos"];

let contenedor = null, overlay = null, juego = null, menu = null, texturas = {}, pendiente = null;
let pestana = "sesion", herramienta = null, terreno = "bosque", lugarSel = "mazmorra", decorSel = "rosa-1", trazoSel = "rio", radio = 80, densidad = 1;
let faccionPendiente = null, seleccion = null;   // { col, id }
let cola = Promise.resolve();                    // órdenes del DJ, una tras otra
const deshacer = new Map();                      // usuario → pilas de parches (en el cliente del DJ)

export const entornoDe = escena => escena?.getFlag(MOD, FLAG) ?? null;
const nuevo = () => ({ v: 3, nombre: "Tierras por saquear", fondo: "viejo", bloqueado: false, sellos: [], trazos: [], lugares: [], facciones: [], rotulos: [], sesion: {}, dias: 3, barra: { x: 380, y: 1820, ver: true }, zSig: 0 });
const id = () => foundry.utils.randomID(8);
/** Escala: días de viaje del centro al borde. Más días = región más grande en el mismo pergamino = todo más pequeño. */
const factor = e => 3 / Math.max(1.5, Number(e?.dias) || 3);
const pxDia = (e, escena = canvas.scene) => (escena.dimensions.sceneRect.width / 2) / Math.max(1.5, e.dias || 3);
const permitido = () => game.user.isGM || game.settings.get(MOD, "entornoJugadores");
const soyDJ = () => game.user.isGM && game.users.activeGM?.id === game.user.id;
const panel = () => foundry.applications.instances?.get?.("mr-wo-entorno");
const api = () => game.modules.get(MOD)?.api ?? {};
const mazmorraActor = () => game.actors.find(a => a.type === "dungeon");

/** Normaliza un mapa antiguo: orden de capas (`z`) según el orden en que se pusieron las cosas, barra de escala, etc. */
function normalizar(e0) {
  const e = foundry.utils.mergeObject(nuevo(), foundry.utils.deepClone(e0 ?? {}), { inplace: false });
  let z = 0;
  for (const s of e.sellos) if (typeof s.z !== "number") s.z = ++z; else z = Math.max(z, s.z);
  for (const l of e.lugares) if (typeof l.z !== "number") l.z = ++z; else z = Math.max(z, l.z);
  e.zSig = Math.max(e.zSig || 0, z);
  return e;
}

/** Lo que el mapa sabe de una facción: si está enlazada a su ficha, manda la ficha (nombre, imagen, nivel, bando, relojes). */
function datosFaccion(f) {
  const a = f.actor ? game.actors.get(f.actor) : null;
  const cat = a?.system?.category ?? f.bando ?? "neutral";
  const img = a?.img && !a.img.startsWith("icons/svg") ? a.img : IMG_FACCION;
  return { a, nombre: a?.name?.replace(/^\[[^\]]*\]\s*/, "") ?? f.nombre ?? "Facción", img, nivel: Number(a?.system?.tier?.value ?? f.nivel ?? 0), bando: BANDOS[cat] ? cat : "neutral", relojes: a ? [a.system.clock1, a.system.clock2].filter(c => c?.text) : [] };
}

/* ------------------------------------------------------------------------------------------------ texturas */

async function cargarTexturas() {
  const cargar = foundry.canvas?.loadTexture ?? (src => PIXI.Assets.load(src));
  const claves = [...Object.values(TERRENO).flatMap(t => t[1]), ...Object.keys(LUGARES), ...Object.keys(DECORADO)].map(k => [k, `${ICONOS}/mapa-${k}.webp`]);
  claves.push([IMG_FACCION, IMG_FACCION]);
  for (const f of entornoDe(canvas.scene)?.facciones ?? []) { const d = datosFaccion(f); claves.push([d.img, d.img]); }
  await Promise.all(claves.map(async ([k, ruta]) => { if (texturas[k]) return; try { texturas[k] = await cargar(ruta); } catch { texturas[k] = null; } }));
}

/* ------------------------------------------------------------------------------------------------ dibujo */

const textoMapa = (t, tam, color = 0x2a1c12, borde = 0xf1e2bd) => new PIXI.Text(t, { fontFamily: ["Blood Crow", "Bitter", "Georgia", "serif"], fontSize: Math.max(8, Math.round(tam)), fill: color, stroke: borde, strokeThickness: Math.max(3, tam / 6), fontWeight: "700", align: "center", wordWrap: true, wordWrapWidth: 560 });

function mancha(f) {   // contorno orgánico, siempre el mismo para la misma facción
  let s = [...f.id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const azar = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
  const n = 26, fase = azar() * 6, pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, r = f.r * (0.86 + 0.13 * Math.sin(a * 3 + fase) + 0.06 * Math.sin(a * 7 + fase * 2) + 0.05 * (azar() - 0.5));
    pts.push(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r * 0.8);
  }
  return pts;
}

const centrado = k => k.startsWith("rosa") || k === "cartela";
const tamBase = k => (k in LUGARES ? (k === "mazmorra" ? BASE.mazmorra : BASE.lugar) : k.startsWith("rosa") ? BASE.rosa : k === "cartela" ? BASE.cartela : k in DECORADO ? BASE.decor : BASE.sello);
/** Caja aproximada de un elemento en el lienzo (para elegirlo con el puntero). */
function caja(e, col, o) {
  const F = factor(e);
  if (col === "facciones") return { x: o.x, y: o.y, r: BASE.medallon * F + 10 };
  if (col === "rotulos") return { x: o.x, y: o.y, r: (o.tam || 44) * F * 1.4 };
  const t = tamBase(o.k) * F * (o.s || 1);
  return centrado(o.k) ? { x: o.x, y: o.y, r: t * 0.42 } : { x: o.x, y: o.y - t * 0.38, r: t * 0.42 };
}

function sello(k, x, y, tam, flip = false) {
  const tex = texturas[k]; if (!tex) return null;
  const sp = new PIXI.Sprite(tex); sp.anchor.set(0.5, centrado(k) ? 0.5 : 0.85);
  const s = tam / Math.max(tex.width, tex.height); sp.scale.set(flip ? -s : s, s); sp.x = x; sp.y = y;
  return sp;
}

function medallon(f, d, F) {   // disco de pergamino, aro del color de su bando, su imagen, su nivel y su nombre
  const c = new PIXI.Container(), col = BANDOS[d.bando][1], R = BASE.medallon * F;
  const g = new PIXI.Graphics();
  g.beginFill(0x1c120a, 0.35).drawCircle(f.x + 4 * F, f.y + 6 * F, R + 6 * F).endFill();
  g.lineStyle(10 * F, 0x1c120a, 1).beginFill(0xe9d8b0, 1).drawCircle(f.x, f.y, R).endFill();
  g.lineStyle(6 * F, col, 1).drawCircle(f.x, f.y, R - 6 * F);
  c.addChild(g);
  const tex = texturas[d.img];
  if (tex) { const sp = new PIXI.Sprite(tex); sp.anchor.set(0.5); sp.scale.set((R * 1.55) / Math.max(tex.width, tex.height)); sp.x = f.x; sp.y = f.y; c.addChild(sp); }
  const p = new PIXI.Graphics();
  for (let i = 0; i < Math.max(0, d.nivel); i++) { const a = Math.PI / 2 + (i - (d.nivel - 1) / 2) * 0.32, x = f.x + Math.cos(a) * (R + 4 * F), y = f.y + Math.sin(a) * (R + 4 * F); p.lineStyle(3 * F, 0x1c120a).beginFill(col).drawCircle(x, y, 9 * F).endFill(); }
  c.addChild(p);
  const t = textoMapa(d.nombre, 30 * F, 0x1c120a); t.anchor.set(0.5, 0); t.x = f.x; t.y = f.y + R + 16 * F; c.addChild(t);
  return c;
}

/** Barra de escala «como en los mapas reales», con aire de monstruo: tramos de hueso y sangre y las marcas en días. */
function barraEscala(e) {
  const c = new PIXI.Container(), d = pxDia(e), { x, y } = e.barra;
  const largo = d * (e.dias >= 3.5 ? 1 : 2), tramos = 4, paso = largo / tramos, alto = 18;
  const g = new PIXI.Graphics();
  g.beginFill(0x1c120a, 0.9).drawRoundedRect(x - 14, y - 52, largo + 28, 96, 10).endFill();
  for (let i = 0; i < tramos; i++) g.lineStyle(3, 0x1c120a).beginFill(i % 2 ? 0xe9d8b0 : 0x8a0f0b).drawRect(x + i * paso, y, paso, alto).endFill();
  c.addChild(g);
  const etiquetas = e.dias >= 3.5 ? ["0", "¼", "½", "¾", "1 día"] : ["0", "½", "1", "1½", "2 días"];
  etiquetas.forEach((t, i) => { const tx = textoMapa(t, 22, 0xf1e2bd, 0x1c120a); tx.anchor.set(0.5, 1); tx.x = x + i * paso; tx.y = y - 4; c.addChild(tx); });
  const ti = textoMapa("Escala de los monstruos", 18, 0xc8921f, 0x1c120a); ti.anchor.set(0, 0); ti.x = x; ti.y = y + alto + 4; c.addChild(ti);
  return c;
}

export function dibujar() {
  if (contenedor && !contenedor.destroyed) contenedor.destroy({ children: true });
  for (const c of [...(canvas.primary ?? canvas.stage)?.children ?? []]) if (c.name === "mr-wo-entorno") c.destroy({ children: true });
  contenedor = null;
  const e0 = entornoDe(canvas.scene); if (!e0 || !canvas.ready) return;
  const e = normalizar(e0), F = factor(e);
  contenedor = new PIXI.Container(); contenedor.sortableChildren = true; contenedor.name = "mr-wo-entorno"; contenedor.eventMode = "none";
  const terr = new PIXI.Graphics(); terr.zIndex = 0;
  for (const f of e.facciones) {
    const d = datosFaccion(f), col = BANDOS[d.bando][1], pts = mancha(f);
    terr.lineStyle(0).beginFill(col, 0.13).drawPolygon(pts).endFill();
    terr.lineStyle({ width: 6, color: col, alpha: 0.8, join: "round" }).drawPolygon(pts);
    terr.lineStyle({ width: 2, color: 0x1c120a, alpha: 0.5, join: "round" }).drawPolygon(pts);
  }
  contenedor.addChild(terr);
  const tr = new PIXI.Graphics(); tr.zIndex = 1;
  const discontinua = (p, ancho, color, paso, hueco) => {
    tr.lineStyle({ width: ancho, color, alpha: 0.95, cap: "round" });
    let dib = true, acum = 0;
    for (let i = 2; i < p.length; i += 2) {
      const [x0, y0, x1, y1] = [p[i - 2], p[i - 1], p[i], p[i + 1]], L = Math.hypot(x1 - x0, y1 - y0);
      for (let d = 0; d < L; d += 4) { const a = d / L, b = Math.min(1, (d + 4) / L); if (dib) tr.moveTo(x0 + (x1 - x0) * a, y0 + (y1 - y0) * a).lineTo(x0 + (x1 - x0) * b, y0 + (y1 - y0) * b); if ((acum += 4) >= (dib ? paso : hueco)) { dib = !dib; acum = 0; } }
    }
  };
  for (const t of e.trazos) {
    const p = t.pts; if (p.length < 4) continue;
    if (t.tipo === "rio") for (const [w, c] of [[22, 0x1f2a2c], [15, 0x3e7f86], [5, 0x8fc3be]]) { tr.lineStyle({ width: w * F, color: c, alpha: 1, join: "round", cap: "round" }).moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) tr.lineTo(p[i], p[i + 1]); }
    else if (t.tipo === "sendero") discontinua(p, 4 * F, 0x7d1512, 6, 10);
    else discontinua(p, 7 * F, 0x4a3018, 18, 9);
  }
  contenedor.addChild(tr);
  // sellos y lugares en el orden en que se pusieron (z): lo último, encima
  for (const s of e.sellos) {
    const sp = sello(s.k, s.x, s.y, tamBase(s.k) * F * (s.s || 1), s.f); if (!sp) continue;
    sp.zIndex = 10 + s.z; contenedor.addChild(sp);
    if (s.k === "cartela" && e.nombre) { const t = textoMapa(e.nombre, 40 * F * (s.s || 1), 0x2a1408, 0xe9d8b0); t.style.wordWrapWidth = 420 * F * (s.s || 1); t.anchor.set(0.5); t.x = s.x; t.y = s.y - 4; t.zIndex = 10.5 + s.z; contenedor.addChild(t); }
  }
  for (const l of e.lugares) {
    const sp = sello(l.k, l.x, l.y, tamBase(l.k) * F * (l.s || 1), l.f); if (sp) { sp.zIndex = 10 + l.z; contenedor.addChild(sp); }
    if (l.nombre) { const t = textoMapa(l.nombre, (l.k === "mazmorra" ? 34 : 28) * F, 0x2a1c12); t.anchor.set(0.5, 0); t.x = l.x; t.y = l.y + 22 * F; t.zIndex = 1e6 + l.z; contenedor.addChild(t); }
    if (l.enlace) { const g = new PIXI.Graphics(); g.lineStyle(3, 0x1c120a).beginFill(0xc8921f).drawCircle(l.x + 52 * F, l.y - 92 * F, 13 * F).endFill(); g.zIndex = 1e6 + l.z; contenedor.addChild(g); }
  }
  for (const r of e.rotulos) { const t = textoMapa(r.texto, (r.tam || 44) * F, r.color ?? 0x3a2414); t.anchor.set(0.5); t.x = r.x; t.y = r.y; t.alpha = 0.92; t.zIndex = 2e6; contenedor.addChild(t); }
  for (const f of e.facciones) { const m = medallon(f, datosFaccion(f), F); m.zIndex = 3e6 + f.y; contenedor.addChild(m); }
  if (e.barra?.ver !== false) { const b = barraEscala(e); b.zIndex = 4e6; contenedor.addChild(b); }
  if (seleccion && !e.bloqueado) { const o = buscar(e, seleccion); if (o) { const k = seleccion.col === "barra" ? { x: o.x + 60, y: o.y, r: 90 } : caja(e, seleccion.col, o), g = new PIXI.Graphics(); g.lineStyle(5, 0xc8921f, 1).drawCircle(k.x, k.y, k.r); g.zIndex = 5e6; contenedor.addChild(g); } }
  (canvas.primary ?? canvas.stage).addChild(contenedor);
  prepararJuego(e);
}

/* ------------------------------------------------------------------------------------------------ modo de juego (mapa bloqueado) */

function quitarJuego() { if (juego && !juego.destroyed) juego.destroy({ children: true }); juego = null; }

function prepararJuego(e) {
  quitarJuego();
  if (!e.bloqueado || !canvas.ready) return;
  juego = new PIXI.Container(); juego.eventMode = "static"; juego.zIndex = 9000;
  const etiqueta = textoMapa("", 28, 0xf1e2bd, 0x1c120a); etiqueta.visible = false; etiqueta.eventMode = "none";
  const zona = (k, texto, accion) => {
    const g = new PIXI.Graphics(); g.beginFill(0xffffff, 0.001).drawCircle(k.x, k.y, k.r).endFill(); g.eventMode = "static"; g.cursor = "pointer";
    g.on("pointerover", () => { etiqueta.text = texto; etiqueta.x = k.x + k.r * 0.6; etiqueta.y = k.y - k.r - 30; etiqueta.visible = true; });
    g.on("pointerout", () => { etiqueta.visible = false; });
    g.on("pointertap", ev => { ev.stopPropagation?.(); accion(); });
    juego.addChild(g);
  };
  for (const l of e.lugares) if (l.enlace) zona(caja(e, "lugares", l), `${l.nombre || LUGARES[l.k]} — abrir`, () => abrirEnlace(l.enlace));
  for (const f of e.facciones) { const d = datosFaccion(f); if (d.a) zona(caja(e, "facciones", f), `${d.nombre} · nivel ${d.nivel}${d.relojes.map(c => ` · ${c.text} ${c.value}/${c.max}`).join("")}`, () => d.a.sheet.render(true)); }
  juego.addChild(etiqueta);
  (canvas.interface ?? canvas.stage).addChild(juego);
}

async function abrirEnlace(uuid) {
  const doc = await fromUuid(uuid).catch(() => null);
  if (!doc) return ui.notifications.warn("Ese enlace ya no existe.");
  if (doc.documentName === "Scene") {
    if (!game.user.isGM && !doc.testUserPermission?.(game.user, "OBSERVER") && !doc.active) return ui.notifications.info("El DJ aún no os deja ver ese lugar.");
    return doc.view();
  }
  if (!doc.testUserPermission?.(game.user, "LIMITED")) return ui.notifications.info("El DJ aún no os deja ver eso.");
  return doc.sheet?.render(true);
}

/* ------------------------------------------------------------------------------------------------ órdenes (las aplica el DJ, en cola) */

function buscar(e, sel) {
  if (!sel) return null;
  if (sel.col === "barra") return e.barra;
  return COLS.includes(sel.col) ? e[sel.col]?.find(o => o.id === sel.id) : null;
}

/** Parches de una orden: lo que cambió, elemento a elemento, para que su autor (y solo él) lo pueda deshacer. */
function parches(antes, despues) {
  const out = [];
  for (const col of COLS) {
    const A = new Map(antes[col].map(o => [o.id, o])), D = new Map(despues[col].map(o => [o.id, o]));
    for (const [k, o] of D) if (!A.has(k) || JSON.stringify(A.get(k)) !== JSON.stringify(o)) out.push({ col, id: k, antes: A.get(k) ?? null });
    for (const [k, o] of A) if (!D.has(k)) out.push({ col, id: k, antes: o });
  }
  for (const k of ["nombre", "dias", "barra", "fondo"]) if (JSON.stringify(antes[k]) !== JSON.stringify(despues[k])) out.push({ campo: k, antes: antes[k] });
  return out;
}
function aplicarDeshacer(e, lote) {
  for (const p of lote.slice().reverse()) {
    if (p.campo) { e[p.campo] = p.antes; continue; }
    const i = e[p.col].findIndex(o => o.id === p.id);
    if (!p.antes) { if (i >= 0) e[p.col].splice(i, 1); }
    else if (i >= 0) e[p.col][i] = p.antes; else e[p.col].push(p.antes);
  }
}

const nz = e => ++e.zSig;

async function aplicar(escena, accion, d, usuario) {
  const prev = normalizar(entornoDe(escena) ?? nuevo());
  const e = foundry.utils.deepClone(prev);
  const esDJ = Boolean(usuario?.isGM), uid = usuario?.id ?? game.user.id, quien = esc(usuario?.name ?? game.user.name);
  if (accion === "deshacer") {
    const pila = deshacer.get(uid) ?? []; const lote = pila.pop();
    if (!lote) return { ok: false, motivo: "No tienes nada que deshacer." };
    aplicarDeshacer(e, lote);
    if (lote.some(p => p.campo === "fondo")) await escena.update({ "background.src": rutaFondo(e.fondo) });
    await escena.setFlag(MOD, FLAG, e); return { ok: true };
  }
  if (e.bloqueado && !["bloquear", "sesion", "atmosfera"].includes(accion)) return { ok: false, motivo: "El mapa está bloqueado: el DJ tiene que desbloquearlo para editarlo." };
  let aviso = "";
  if (accion === "sellos") for (const s of [...d.sellos].sort((a, b) => a.y - b.y)) e.sellos.push({ id: id(), k: s.k, x: Math.round(s.x), y: Math.round(s.y), s: s.s ?? 1, f: Boolean(s.f), z: nz(e) });
  else if (accion === "trazo") e.trazos.push({ id: id(), tipo: TRAZOS[d.tipo] ? d.tipo : "camino", pts: d.pts.map(Math.round) });
  else if (accion === "lugar") {
    const l = d.id && e.lugares.find(z => z.id === d.id);
    if (l) Object.assign(l, { nombre: String(d.nombre ?? "").slice(0, 60), nota: String(d.nota ?? "").slice(0, 300) });
    else { e.lugares.push({ id: id(), k: d.k, x: Math.round(d.x), y: Math.round(d.y), nombre: String(d.nombre ?? "").slice(0, 60), nota: String(d.nota ?? "").slice(0, 300), enlace: null, z: nz(e) }); if (d.k === "mazmorra") aviso = `${quien} sitúa la mazmorra en el mapa.`; }
  } else if (accion === "enlace") {   // solo el DJ vincula escenas, diarios o actores
    if (!esDJ) return { ok: false, motivo: "Solo el DJ vincula lugares." };
    const l = e.lugares.find(z => z.id === d.id); if (l) l.enlace = d.enlace || null;
  } else if (accion === "faccion") {
    e.facciones.push({ id: id(), actor: d.actor, x: Math.round(d.x), y: Math.round(d.y), r: Math.round(260 * factor(e)) });
    const a = game.actors.get(d.actor); if (a) aviso = `${quien} añade al mapa <b>${esc(a.name)}</b> (nivel ${a.system?.tier?.value ?? 0}).`;
  } else if (accion === "rotulo") {
    const r = d.id && e.rotulos.find(z => z.id === d.id);
    if (r) Object.assign(r, { texto: String(d.texto).slice(0, 80), tam: d.tam }); else e.rotulos.push({ id: id(), x: Math.round(d.x), y: Math.round(d.y), texto: String(d.texto).slice(0, 80), tam: d.tam || 44 });
  } else if (accion === "mover") { const o = buscar(e, d); if (o) { o.x = Math.round(d.x); o.y = Math.round(d.y); } }
  else if (accion === "ajustar") {
    const o = buscar(e, d); if (!o) return { ok: false };
    if ("s" in d) o.s = Math.min(4, Math.max(0.3, +Number(d.s).toFixed(2)));
    if ("f" in d) o.f = Boolean(d.f);
    if ("r" in d) o.r = Math.min(900, Math.max(60, Math.round(d.r)));
    if (d.capa === "frente") o.z = nz(e);
    if (d.capa === "fondo") o.z = Math.min(0, ...e.sellos.map(s => s.z), ...e.lugares.map(l => l.z)) - 1;
    if ("ver" in d) o.ver = Boolean(d.ver);
  } else if (accion === "quitar") { if (COLS.includes(d.col)) e[d.col] = e[d.col].filter(o => o.id !== d.id); }
  else if (accion === "borrar") {
    const { x, y, r } = d, cerca = (a, b) => Math.hypot(a - x, b - y) <= r;
    e.sellos = e.sellos.filter(s => !cerca(s.x, s.y)); e.lugares = e.lugares.filter(l => !cerca(l.x, l.y)); e.rotulos = e.rotulos.filter(l => !cerca(l.x, l.y));
    e.trazos = e.trazos.filter(t => { for (let i = 0; i < t.pts.length; i += 2) if (cerca(t.pts[i], t.pts[i + 1])) return false; return true; });
  } else if (accion === "dias") e.dias = Math.min(6, Math.max(1.5, Math.round((Number(d.dias) || 3) * 2) / 2));
  else if (accion === "nombre") e.nombre = String(d.nombre ?? "").slice(0, 60);
  else if (accion === "fondo") { if (FONDOS[d.fondo]) { e.fondo = d.fondo; await escena.update({ "background.src": rutaFondo(d.fondo) }); } }
  else if (accion === "sesion") { if (!esDJ) return { ok: false, motivo: "Solo el DJ marca la lista." }; e.sesion = { ...e.sesion, [d.clave]: Boolean(d.valor) }; }
  else if (accion === "atmosfera") { const a = mazmorraActor(); if (a && ATMOSFERA.some(([k]) => k === d.clave)) await a.update({ [`system.${d.clave}`]: String(d.valor ?? "").slice(0, 400) }); return { ok: true }; }
  else if (accion === "bloquear") { if (!esDJ) return { ok: false, motivo: "Solo el DJ bloquea el mapa." }; e.bloqueado = Boolean(d.valor); aviso = e.bloqueado ? "<b>El mapa queda bloqueado</b>: ya es el mapa de juego. Pulsad un lugar enlazado o una facción para abrirlos." : "El DJ desbloquea el mapa para seguir editándolo."; }
  const lote = parches(prev, e);
  if (lote.length && !["sesion", "bloquear"].includes(accion)) { const pila = deshacer.get(uid) ?? []; pila.push(lote); if (pila.length > 60) pila.shift(); deshacer.set(uid, pila); }
  await escena.setFlag(MOD, FLAG, e);
  if (aviso) aviso2(aviso);
  return { ok: true };
}

async function aviso2(texto) {   // tarjeta del módulo: se lee en claro y en oscuro
  try { const { htmlTarjetaSimple } = await import("./tirada.mjs"); await ChatMessage.create({ flags: { [MOD]: { tarjeta: true } }, content: htmlTarjetaSimple({ tipo: "Mapa", titulo: "Mapa de los monstruos", neutro: "azul", cuerpo: texto }) }); }
  catch { await ChatMessage.create({ content: `<p>${texto}</p>` }); }
}

/** Las órdenes del DJ se aplican de una en una: aunque todos dibujen a la vez, ninguna pisa a otra. */
const ejecutar = (escena, accion, datos, usuario) => (cola = cola.then(() => aplicar(escena, accion, datos, usuario)).catch(err => { console.error(`${MOD} | entorno`, err); return { ok: false }; }));

export async function pedir(accion, datos = {}) {
  if (!permitido() && accion !== "atmosfera") return ui.notifications.warn("El DJ no permite a los jugadores editar el mapa del entorno.");
  if (game.user.isGM) { const r = await ejecutar(canvas.scene, accion, datos, game.user); if (r && !r.ok && r.motivo) ui.notifications.warn(r.motivo); return r; }
  if (!game.users.activeGM) return ui.notifications.warn("No hay un DJ conectado que guarde el mapa.");
  game.socket.emit(`module.${MOD}`, { t: "entorno", accion, datos, escena: canvas.scene.id, usuario: game.user.id });
}

/* ------------------------------------------------------------------------------------------------ diálogos */

async function dialogoLugar(l) {
  const r = await foundry.applications.api.DialogV2.wait({
    window: { title: l.id ? (l.nombre || LUGARES[l.k]) : `Nuevo lugar: ${LUGARES[l.k]}`, icon: "fa-solid fa-landmark" }, classes: ["mrg", "mrg-entorno-dlg"], position: { width: 420 },
    content: `<label class="mrg-campo"><span class="mrg-etiqueta">Nombre</span><input type="text" name="nombre" value="${esc(l.nombre ?? "")}" placeholder="${l.k === "mazmorra" ? "Nuestra guarida" : "Villafango, la Torre del Huraño…"}" autofocus></label>
      <label class="mrg-campo"><span class="mrg-etiqueta">Nota (opcional)</span><input type="text" name="nota" value="${esc(l.nota ?? "")}" placeholder="Quién vive aquí, qué se puede saquear…"></label>`,
    buttons: [{ action: "ok", label: "Guardar", icon: "fa-solid fa-check", default: true, callback: (ev, b) => Object.fromEntries(new FormData(b.form)) }], rejectClose: false
  }).catch(() => null);
  if (!r || typeof r !== "object") return;
  return pedir("lugar", { ...l, nombre: r.nombre, nota: r.nota });
}

/** Solo el DJ: qué abre un lugar en el mapa de juego. Los jugadores nunca ven esta lista. */
async function dialogoEnlace(l) {
  if (!game.user.isGM) return;
  const opciones = (col, sel) => col.contents.slice().sort((a, b) => a.name.localeCompare(b.name, "es")).map(d => `<option value="${d.uuid}" ${sel === d.uuid ? "selected" : ""}>${esc(d.name)}</option>`).join("");
  const sinMazmorra = l.k === "mazmorra" && !game.scenes.some(s => s.getFlag(MOD, "mazmorra"));
  const r = await foundry.applications.api.DialogV2.wait({
    window: { title: `Vincular: ${l.nombre || LUGARES[l.k]}`, icon: "fa-solid fa-link" }, classes: ["mrg", "mrg-entorno-dlg"], position: { width: 440 },
    content: `<p class="mrg-nota">Solo lo ves tú. Con el mapa bloqueado, pulsar este lugar abrirá lo que elijas (a los jugadores, si tienen permiso para verlo).</p>
      <label class="mrg-campo"><span class="mrg-etiqueta">Abre…</span><select name="enlace"><option value="">Nada</option><optgroup label="Escenas">${opciones(game.scenes, l.enlace)}</optgroup><optgroup label="Diarios">${opciones(game.journal, l.enlace)}</optgroup><optgroup label="Actores">${opciones(game.actors, l.enlace)}</optgroup></select></label>`,
    buttons: [{ action: "ok", label: "Vincular", icon: "fa-solid fa-link", default: true, callback: (ev, b) => b.form.elements.enlace.value }, ...(sinMazmorra ? [{ action: "crear", label: "Crear la escena de la mazmorra", icon: "fa-solid fa-trowel-bricks" }] : [])],
    rejectClose: false
  }).catch(() => null);
  if (r === null || r === undefined) return;
  if (r === "crear") { const vuelta = canvas.scene, { nuevaEscena } = await import("./mazmorra.mjs"); const s = await nuevaEscena(); await vuelta.view(); return pedir("enlace", { id: l.id, enlace: s?.uuid ?? null }); }
  return pedir("enlace", { id: l.id, enlace: r || null });
}

async function dialogoRotulo(r) {
  const v = await foundry.applications.api.DialogV2.wait({
    window: { title: r.id ? "Rótulo" : "Nuevo rótulo", icon: "fa-solid fa-font" }, classes: ["mrg", "mrg-entorno-dlg"],
    content: `<label class="mrg-campo"><span class="mrg-etiqueta">Texto</span><input type="text" name="texto" value="${esc(r.texto ?? "")}" placeholder="Bosque de los Ahorcados, Mar de Hiel…" autofocus></label>
      <label class="mrg-campo"><span class="mrg-etiqueta">Tamaño</span><select name="tam">${[[32, "Pequeño"], [44, "Mediano"], [64, "Grande"], [88, "Enorme"]].map(([n, t]) => `<option value="${n}" ${Number(r.tam ?? 44) === n ? "selected" : ""}>${t}</option>`).join("")}</select></label>`,
    buttons: [{ action: "ok", label: "Guardar", icon: "fa-solid fa-check", default: true, callback: (ev, b) => Object.fromEntries(new FormData(b.form)) }], rejectClose: false
  }).catch(() => null);
  if (!v || typeof v !== "object" || !v.texto.trim()) return;
  return pedir("rotulo", { ...r, texto: v.texto.trim(), tam: Number(v.tam) });
}

/** Facciones: las vuestras, las del manual (filtrables por entorno) o una nueva. Se arrastran al mapa sin cerrar la ventana. */
class ElegirFaccion extends App {
  static DEFAULT_OPTIONS = { id: "mr-wo-elegir-faccion", tag: "div", classes: ["mrg", "mrg-ventana", "mrg-entorno"], window: { title: "Facciones: arrástralas al mapa", icon: "fa-solid fa-flag", resizable: true }, position: { width: 640, height: 700 } };
  constructor() { super(); this.filtro = ""; this.fuente = "compendio"; this.grupo = ""; this.docs = null; }
  async _renderHTML() {
    if (!this.docs) {
      const pack = game.packs.get(`${MOD}.facciones-es`);
      this.docs = { compendio: pack ? (await pack.getDocuments()).filter(d => d.type === "faction") : [] };
    }
    this.docs.mundo = game.actors.filter(a => a.type === "faction");
    const f = this.filtro.toLowerCase(), enMapa = new Set((entornoDe(canvas.scene)?.facciones ?? []).map(x => x.actor));
    const grupoDe = d => (this.fuente === "compendio" ? (d.getFlag(MOD, "entorno") || "Otras") : d.folder?.name ?? "Facciones del mundo");
    const todos = this.docs[this.fuente] ?? [];
    const grupos = [...new Set(todos.map(grupoDe))].sort((a, b) => a.localeCompare(b, "es"));
    const lista = todos.filter(d => (!f || d.name.toLowerCase().includes(f)) && (!this.grupo || grupoDe(d) === this.grupo));
    const porGrupo = {}; for (const d of lista) (porGrupo[grupoDe(d)] ??= []).push(d);
    const enMundoDe = d => (d.pack ? game.actors.find(x => x._stats?.compendiumSource === d.uuid || x.getFlag("core", "sourceId") === d.uuid) : d);
    const carta = d => {
      const c = d.system?.category, col = (BANDOS[c] ?? BANDOS.neutral)[1].toString(16).padStart(6, "0"), w = enMundoDe(d), ya = w && enMapa.has(w.id);
      const img = d.img && !d.img.startsWith("icons/svg") ? d.img : IMG_FACCION;
      return `<button type="button" draggable="true" class="mrg-ent-carta ${ya ? "en-mapa" : ""}" data-elegir="${d.uuid}" style="--ring:#${col}"><img src="${img}" alt="" draggable="false"><b>${esc(d.name.replace(/^\[[^\]]*\]\s*/, ""))}</b><small>${(BANDOS[c] ?? BANDOS.neutral)[0]} · nivel ${d.system?.tier?.value ?? 0}${ya ? " · ya en el mapa" : ""}</small></button>`;
    };
    const filtros = this.fuente === "nueva" ? "" : `<div class="mrg-ent-filtros"><input type="search" class="mrg-ent-buscar" placeholder="Buscar facción…" value="${esc(this.filtro)}">
        <select class="mrg-ent-grupo" aria-label="Solo un grupo"><option value="">Todos los grupos</option>${grupos.map(g => `<option ${this.grupo === g ? "selected" : ""}>${esc(g)}</option>`).join("")}</select></div>
        <p class="mrg-nota"><i class="fa-solid fa-hand"></i> Arrastra una facción al mapa (o púlsala y luego pulsa en el mapa). La ventana sigue abierta para ir poniendo más.</p>`;
    return `<div class="mrg-ent-elegir">
      <nav class="mrg-ent-tabs">${[["compendio", "Del manual", "fa-book"], ["mundo", "Las vuestras", "fa-earth-europe"], ["nueva", "Nueva", "fa-plus"]].map(([k, t, i]) => `<button type="button" data-fuente="${k}" class="${this.fuente === k ? "on" : ""}"><i class="fa-solid ${i}"></i> ${t}</button>`).join("")}</nav>
      ${filtros}
      ${this.fuente === "nueva" ? `<div class="mrg-ent-nueva"><p class="mrg-nota">Dadle uno o dos detalles y responded a las preguntas del DJ (pág. 294). Se crea su ficha de facción con una imagen genérica que podéis cambiar luego en la ficha.</p>
          <label class="mrg-campo"><span class="mrg-etiqueta">Nombre</span><input type="text" data-n="nombre" placeholder="La guarnición del duque, los troles de las colinas…"></label>
          <label class="mrg-campo"><span class="mrg-etiqueta">Nivel</span><select data-n="nivel">${[4, 3, 2, 1, 0].map(n => `<option value="${n}" ${n === 2 ? "selected" : ""}>Nivel ${n}</option>`).join("")}</select></label>
          <label class="mrg-campo"><span class="mrg-etiqueta">Bando</span><select data-n="bando">${Object.entries(BANDOS).map(([k, b]) => `<option value="${k}">${b[0]}</option>`).join("")}</select></label>
          <button type="button" class="mrg-btn mrg-btn--sangre" data-crear><i class="fa-solid fa-flag"></i> Crear y colocarla</button></div>`
        : (Object.entries(porGrupo).map(([g, ds]) => `<h4 class="mrg-seccion">${esc(g)}</h4><div class="mrg-ent-cartas">${ds.sort((a, b) => (b.system?.tier?.value ?? 0) - (a.system?.tier?.value ?? 0)).map(carta).join("")}</div>`).join("") || `<p class="mrg-nota">No hay facciones aquí.</p>`)}
    </div>`;
  }
  _replaceHTML(res, cont) {
    cont.innerHTML = res;
    cont.querySelector(".mrg-ent-buscar")?.addEventListener("input", ev => { this.filtro = ev.target.value; clearTimeout(this._t); this._t = setTimeout(() => this.render().then(() => { const i = this.element.querySelector(".mrg-ent-buscar"); i?.focus(); i?.setSelectionRange(i.value.length, i.value.length); }), 220); });
    cont.querySelector(".mrg-ent-grupo")?.addEventListener("change", ev => { this.grupo = ev.target.value; this.render(); });
    cont.querySelectorAll("[data-elegir]").forEach(b => b.addEventListener("dragstart", ev => { ev.dataTransfer.setData("text/plain", JSON.stringify({ type: "MREntornoFaccion", uuid: b.dataset.elegir })); }));
    cont.onclick = async ev => {
      const b = ev.target.closest("button"); if (!b) return;
      if (b.dataset.fuente) { this.fuente = b.dataset.fuente; this.grupo = ""; return this.render(); }
      if (b.dataset.elegir) { const a = await actorDeFaccion(b.dataset.elegir); if (a) prepararColocar(a); return; }
      if ("crear" in b.dataset) {
        const v = k => cont.querySelector(`[data-n="${k}"]`)?.value ?? "";
        if (!v("nombre").trim()) return ui.notifications.warn("Ponle nombre a la facción.");
        if (!game.user.isGM && !game.user.can("ACTOR_CREATE")) return ui.notifications.warn("Pide al DJ que cree la facción (no puedes crear actores).");
        const a = await Actor.create({ name: v("nombre").trim(), type: "faction", img: IMG_FACCION, system: { category: v("bando"), tier: { value: Number(v("nivel")) } } });
        if (a) { this.fuente = "mundo"; this.render(); prepararColocar(a); }
      }
    };
  }
}

/** La ficha de una facción en el mundo (si viene del compendio y aún no está, se importa). */
async function actorDeFaccion(uuid) {
  let a = await fromUuid(uuid).catch(() => null);
  if (!a) return null;
  if (a.pack) {
    const ya = game.actors.find(x => x._stats?.compendiumSource === a.uuid || x.getFlag("core", "sourceId") === a.uuid);
    if (ya) return ya;
    if (!game.user.isGM && !game.user.can("ACTOR_CREATE")) { ui.notifications.warn("Pide al DJ que importe esa facción (no puedes crear actores)."); return null; }
    a = await game.actors.importFromCompendium(game.packs.get(a.pack), a.id);
  }
  return a;
}

async function prepararColocar(a) {
  faccionPendiente = a;
  const img = datosFaccion({ actor: a.id }).img;
  if (!texturas[img]) { try { texturas[img] = await (foundry.canvas?.loadTexture ?? PIXI.Assets.load)(img); } catch { /* sin imagen */ } }
  pestana = "facciones"; activarHerramienta("faccion"); panel()?.render(true);
  ui.notifications.info(`Pulsa en el mapa donde vive ${a.name}.`);
}

/* ------------------------------------------------------------------------------------------------ menú de un elemento */

function cerrarMenu() { menu?.remove(); menu = null; }

/** Menú junto al puntero con lo que se puede hacer con ese elemento. Se queda abierto para ir agrandando o achicando. */
function abrirMenu(sel, cx, cy) {
  cerrarMenu();
  const e = normalizar(entornoDe(canvas.scene)), o = buscar(e, sel); if (!o) return;
  seleccion = sel; dibujar();
  const titulo = sel.col === "facciones" ? datosFaccion(o).nombre : sel.col === "lugares" ? (o.nombre || LUGARES[o.k]) : sel.col === "rotulos" ? o.texto : sel.col === "barra" ? "Barra de escala" : sel.col === "trazos" ? TRAZOS[o.tipo] : (DECORADO[o.k] ?? Object.values(TERRENO).find(t => t[1].includes(o.k))?.[0] ?? o.k);
  const op = (k, ic, t) => `<button type="button" data-op="${k}"><i class="fa-solid ${ic}"></i> ${t}</button>`;
  const ops = [
    ...(["sellos", "lugares"].includes(sel.col) ? [op("frente", "fa-arrow-up", "Al frente"), op("fondo", "fa-arrow-down", "Al fondo"), op("mas", "fa-plus", "Más grande"), op("menos", "fa-minus", "Más pequeño"), op("voltear", "fa-left-right", "Voltear")] : []),
    ...(sel.col === "facciones" ? [op("mas", "fa-plus", "Territorio mayor"), op("menos", "fa-minus", "Territorio menor"), op("ficha", "fa-address-card", "Abrir su ficha")] : []),
    ...(sel.col === "lugares" ? [op("editar", "fa-pen", "Nombre y nota"), ...(game.user.isGM ? [op("vincular", "fa-link", o.enlace ? "Cambiar el vínculo (DJ)" : "Vincular escena… (DJ)")] : [])] : []),
    ...(sel.col === "rotulos" ? [op("editar", "fa-pen", "Texto y tamaño")] : []),
    ...(sel.col === "barra" ? [op("ocultar", "fa-eye-slash", "Ocultar la barra")] : []),
    ...(sel.col !== "barra" ? [op("quitar", "fa-trash", "Quitar")] : [])
  ];
  menu = document.createElement("div");
  menu.className = "mrg mrg-ent-menu";
  menu.innerHTML = `<header>${esc(titulo)}<button type="button" data-op="cerrar" aria-label="Cerrar"><i class="fa-solid fa-xmark"></i></button></header>${ops.join("")}<small>Arrastra con «Seleccionar» para moverlo.</small>`;
  document.body.append(menu);
  const r = menu.getBoundingClientRect();
  menu.style.left = `${Math.min(cx + 12, innerWidth - r.width - 8)}px`; menu.style.top = `${Math.min(cy + 12, innerHeight - r.height - 8)}px`;
  menu.addEventListener("click", async ev => {
    const k = ev.target.closest("[data-op]")?.dataset.op; if (!k) return;
    const actual = buscar(normalizar(entornoDe(canvas.scene)), sel); if (!actual) return cerrarMenu();
    if (k === "cerrar") { cerrarMenu(); seleccion = null; return dibujar(); }
    if (k === "frente" || k === "fondo") return pedir("ajustar", { ...sel, capa: k });
    if (k === "mas" || k === "menos") return sel.col === "facciones" ? pedir("ajustar", { ...sel, r: actual.r * (k === "mas" ? 1.15 : 0.87) }) : pedir("ajustar", { ...sel, s: (actual.s || 1) * (k === "mas" ? 1.15 : 0.87) });
    if (k === "voltear") return pedir("ajustar", { ...sel, f: !actual.f });
    if (k === "ficha") { cerrarMenu(); return game.actors.get(actual.actor)?.sheet.render(true); }
    if (k === "editar") { cerrarMenu(); return sel.col === "lugares" ? dialogoLugar({ ...actual }) : dialogoRotulo({ ...actual }); }
    if (k === "vincular") { cerrarMenu(); return dialogoEnlace({ ...actual }); }
    if (k === "ocultar") { cerrarMenu(); return pedir("ajustar", { col: "barra", ver: false }); }
    if (k === "quitar") { cerrarMenu(); seleccion = null; return pedir("quitar", sel); }
  });
}

/* ------------------------------------------------------------------------------------------------ herramientas sobre el lienzo */

function quitarOverlay() { if (overlay && !overlay.destroyed) overlay.destroy({ children: true }); overlay = null; }

/** Lo que hay bajo el puntero: lo que se ve encima es lo que se elige. */
function elegir(e, p) {
  const cands = [];
  for (const f of e.facciones) { const k = caja(e, "facciones", f); if (Math.hypot(k.x - p.x, k.y - p.y) < k.r) cands.push({ col: "facciones", id: f.id, o: f, z: 3e6 }); }
  for (const r of e.rotulos) { const k = caja(e, "rotulos", r); if (Math.hypot(k.x - p.x, k.y - p.y) < k.r) cands.push({ col: "rotulos", id: r.id, o: r, z: 2e6 }); }
  for (const [col, lista] of [["lugares", e.lugares], ["sellos", e.sellos]]) for (const o of lista) { const k = caja(e, col, o); if (Math.hypot(k.x - p.x, k.y - p.y) < k.r) cands.push({ col, id: o.id, o, z: o.z }); }
  if (e.barra?.ver !== false && p.x > e.barra.x - 14 && p.x < e.barra.x + pxDia(e) * 2 + 14 && Math.abs(p.y - e.barra.y) < 50) cands.push({ col: "barra", id: "barra", o: e.barra, z: 4e6 });
  return cands.sort((a, b) => b.z - a.z)[0] ?? null;
}

function activarHerramienta(h) {
  herramienta = h; quitarOverlay();
  const e0 = entornoDe(canvas.scene);
  if (!h || !canvas?.ready || !e0 || e0.bloqueado) return;
  const d = canvas.dimensions.sceneRect;
  overlay = new PIXI.Container(); overlay.eventMode = "static"; overlay.zIndex = 99999;
  const zona = new PIXI.Graphics(); zona.beginFill(0xffffff, 0.001).drawRect(d.x, d.y, d.width, d.height).endFill(); zona.eventMode = "static"; zona.cursor = h === "mover" ? "pointer" : "crosshair";
  const previa = new PIXI.Graphics(), rotulo = textoMapa("", 34, 0x1c120a); previa.eventMode = "none"; rotulo.eventMode = "none";
  const fantasma = new PIXI.Container(); fantasma.eventMode = "none"; fantasma.alpha = 0.6;
  overlay.addChild(zona, previa, fantasma, rotulo); (canvas.interface ?? canvas.stage).addChild(overlay);
  let abajo = null, pts = [], sellos = [], ultimo = null, arrastre = null, movido = false;
  const pos = ev => ev.getLocalPosition(overlay);
  const F = () => factor(entornoDe(canvas.scene));
  const ponFantasma = () => {
    fantasma.removeChildren();
    const k = h === "lugar" ? lugarSel : h === "decorado" ? decorSel : h === "pincel" ? TERRENO[terreno][1][0] : null;
    const sp = k && sello(k, 0, 0, tamBase(k) * F()); if (sp) fantasma.addChild(sp);
    if (h === "faccion" && faccionPendiente) { const t = textoMapa(`Pulsa para colocar: ${faccionPendiente.name}`, 30); t.anchor.set(0.5); fantasma.addChild(t); }
  };
  ponFantasma();
  const pinta = p => {
    if (ultimo && Math.hypot(p.x - ultimo.x, p.y - ultimo.y) < radio * 0.55) return;
    ultimo = p;
    const vari = TERRENO[terreno][1];
    for (let i = 0; i < densidad; i++) {
      const ang = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * radio * 0.6;
      sellos.push({ k: vari[Math.floor(Math.random() * vari.length)], x: p.x + Math.cos(ang) * r, y: p.y + Math.sin(ang) * r * 0.75, s: +(0.75 + Math.random() * 0.5).toFixed(2), f: Math.random() < 0.5 });
    }
    previa.lineStyle(0).beginFill(0x4a6a2a, 0.3).drawCircle(p.x, p.y, radio * 0.4).endFill();
  };
  // clic derecho sobre un elemento, con cualquier herramienta: su menú
  zona.on("rightdown", ev => {
    const p = pos(ev), hit = elegir(normalizar(entornoDe(canvas.scene)), p);
    if (hit) { ev.stopPropagation?.(); abrirMenu({ col: hit.col, id: hit.id }, ev.client?.x ?? ev.clientX ?? 200, ev.client?.y ?? ev.clientY ?? 200); }
  });
  zona.on("pointerdown", ev => {
    if (ev.button === 2) return;
    cerrarMenu();
    const p = pos(ev), e = normalizar(entornoDe(canvas.scene)); abajo = p; pts = [p.x, p.y]; sellos = []; ultimo = null; movido = false; previa.clear();
    if (h === "pincel") pinta(p);
    else if (h === "decorado") { abajo = null; pedir("sellos", { sellos: [{ k: decorSel, x: p.x, y: p.y, s: 1, f: false }] }); }
    else if (h === "lugar") { abajo = null; return dialogoLugar({ k: lugarSel, x: p.x, y: p.y + 50 * F() }); }
    else if (h === "rotulo") { abajo = null; return dialogoRotulo({ x: p.x, y: p.y }); }
    else if (h === "faccion") {
      abajo = null;
      if (faccionPendiente) { const a = faccionPendiente; faccionPendiente = null; ponFantasma(); panel()?.render(); return pedir("faccion", { actor: a.id, x: p.x, y: p.y }); }
      return abrirElegirFaccion();
    } else if (h === "mover") {
      const hit = elegir(e, p); seleccion = hit ? { col: hit.col, id: hit.id } : null; arrastre = hit ? { dx: hit.o.x - p.x, dy: hit.o.y - p.y, cx: ev.client?.x ?? ev.clientX, cy: ev.client?.y ?? ev.clientY } : null;
      dibujar();
    }
  });
  zona.on("pointermove", ev => {
    const p = pos(ev);
    fantasma.x = p.x; fantasma.y = p.y;
    if (!abajo && (h === "goma" || h === "pincel")) { previa.clear().lineStyle(3, 0x4a3018, 0.8).drawCircle(p.x, p.y, radio * (h === "goma" ? 0.8 : 0.6)); return; }
    if (!abajo) return;
    if (h === "pincel") pinta(p);
    else if (h === "trazo") {
      if (Math.hypot(p.x - pts.at(-2), p.y - pts.at(-1)) < 16) return;
      pts.push(p.x, p.y); previa.lineStyle(trazoSel === "rio" ? 14 : 6, trazoSel === "rio" ? 0x3e7f86 : trazoSel === "sendero" ? 0x7d1512 : 0x4a3018, 0.85).moveTo(pts.at(-4), pts.at(-3)).lineTo(p.x, p.y);
    } else if (h === "goma") {
      previa.clear().beginFill(0x7d1512, 0.2).drawCircle(p.x, p.y, radio * 0.8).endFill();
      if (Math.hypot(p.x - (ultimo?.x ?? -1e9), p.y - (ultimo?.y ?? -1e9)) > radio * 0.4) { ultimo = p; pedir("borrar", { x: p.x, y: p.y, r: radio * 0.8 }); }
    } else if (h === "medir") {
      const dias = Math.hypot(p.x - abajo.x, p.y - abajo.y) / pxDia(entornoDe(canvas.scene) ?? nuevo());
      previa.clear().lineStyle(6, 0x7d1512, 0.9).moveTo(abajo.x, abajo.y).lineTo(p.x, p.y).lineStyle(0).beginFill(0x7d1512).drawCircle(abajo.x, abajo.y, 8).drawCircle(p.x, p.y, 8).endFill();
      rotulo.text = `≈ ${dias.toLocaleString("es", { maximumFractionDigits: 1 })} ${Math.abs(dias - 1) < 0.05 ? "día" : "días"} de viaje`; rotulo.x = p.x + 16; rotulo.y = p.y - 46;
    } else if (h === "mover" && arrastre && seleccion) {
      if (Math.hypot(p.x - abajo.x, p.y - abajo.y) > 6) movido = true;
      if (movido) previa.clear().lineStyle(4, 0xc8921f, 0.9).drawCircle(p.x + arrastre.dx, p.y + arrastre.dy, 60);
    }
  });
  const soltar = async ev => {
    if (!abajo) return;
    const ini = abajo; abajo = null;
    if (h === "pincel" && sellos.length) await pedir("sellos", { sellos });
    else if (h === "trazo" && pts.length >= 4) await pedir("trazo", { tipo: trazoSel, pts });
    else if (h === "mover" && arrastre && seleccion) {
      const p = ev?.getLocalPosition ? pos(ev) : ini;
      if (movido) await pedir("mover", { ...seleccion, x: p.x + arrastre.dx, y: p.y + arrastre.dy });
      else abrirMenu(seleccion, arrastre.cx ?? 300, arrastre.cy ?? 300);   // un clic sin arrastrar: su menú
      arrastre = null;
    }
    previa.clear(); if (h === "medir") setTimeout(() => { rotulo.text = ""; }, 3000);
  };
  zona.on("pointerup", soltar); zona.on("pointerupoutside", soltar);
}

function abrirElegirFaccion() {
  const prev = foundry.applications.instances?.get?.("mr-wo-elegir-faccion");
  if (prev) return prev.render(true);
  new ElegirFaccion().render(true);
}

/* ------------------------------------------------------------------------------------------------ check-list de las sesiones 0 y 1 */

function checklist(e) {
  const dung = mazmorraActor(), tema = Boolean(dung?.items.some(i => i.type === "dungeon_theme"));
  const pjs = game.actors.filter(a => a.type === "character" && a.hasPlayerOwner), conVoc = pjs.filter(a => a.items.some(i => i.type === "calling"));
  const mazHecha = game.scenes.some(s => { const m = s.getFlag(MOD, "mazmorra"); return m && !m.inicial && m.salas?.length; });
  const atm = Boolean(dung) && ATMOSFERA.every(([k]) => String(dung.system?.[k] ?? "").trim());
  const fac = e.facciones.map(datosFaccion), nivel = k => fac.filter(f => f.nivel === k);
  const mezcla = (l, rec) => Object.entries(rec).map(([b, n]) => `${l.filter(f => f.bando === b).length}/${n} ${BANDOS[b][0].toLowerCase()}`).join(" · ");
  const m = k => Boolean(e.sesion?.[k]);
  return [
    ["Sesión 0 · pág. 307", [
      ["entorno", e.sellos.length > 5, "Elegid el entorno", "Pintad la región: pequeña y regional, de 2 a 4 días del centro al borde.", null],
      ["mazmorra", e.lugares.some(l => l.k === "mazmorra"), "¿Dónde estará la mazmorra?", "Pestaña Lugares → «Vuestra mazmorra». Cuanto más cerca del centro, mejor.", null],
      ["tematica", tema, "Elegid la temática de la mazmorra", tema ? "Ya está en la ficha de la mazmorra." : "Enclave, escondrijo, forja, fortaleza o templo: va en la ficha de la mazmorra.", dung ? ["ficha", dung.id, "Abrir la ficha de la mazmorra"] : null],
      ["vocaciones", pjs.length > 0 && conVoc.length === pjs.length, `Elegid las vocaciones (${conVoc.length}/${pjs.length})`, "Con el entorno y la temática decididos, cada jugador crea su monstruo.", ["creador", "", "Abrir el creador"]],
      ["seguridad", m("seguridad"), "Herramientas de seguridad", "Tarjeta X, líneas y velos o la clasificación por edades: hablad de qué temas sí y cuáles no.", "manual"]
    ]],
    ["Sesión 1 · pág. 308", [
      ["atmosfera", atm, "La atmósfera de la mazmorra y los duendes", dung ? "Se escriben en la ficha de la mazmorra (debajo). Si discrepan, lucha de poder." : "Crea antes la ficha de la mazmorra (actor «Mazmorra»).", null],
      ["incursion", m("incursion"), "La primera incursión: despejar la cueva", "Una cueva poco profunda ocupada por algunos «buenos»: será vuestro hogar.", "manual"],
      ["inicial", mazHecha, "Dibujad la mazmorra inicial", "Una de cada: salas de nivel 1, 2 y 3, guarida, portón, trampa, truco, santuario y escalera.", ["constructor", "", "Abrir el constructor de mazmorras"]]
    ]],
    ["Creación del entorno · pág. 294", [
      ...[4, 3, 2, 1].map(k => { const l = nivel(k), [min, max, rec] = PASOS_NIVEL[k]; return [`n${k}`, l.length >= min && l.length <= max, `${k === 4 ? "Dos o tres" : "Cuatro"} facciones de nivel ${k} (${l.length})`, `Reparto recomendado: ${mezcla(l, rec)}.`, null]; }),
      ["distancias", m("distancias"), "Calculad las distancias", `Escala: ${e.dias} días del centro al borde. Medid entre dos puntos: lo ideal es 1 o 2 días.`, "manual"],
      ["preguntas", m("preguntas"), "Preguntas del DJ sobre el mundo", "Para dar profundidad y semillas de aventura (ejemplos debajo).", "manual"],
      ["bloqueo", e.bloqueado, "Bloquead el mapa para jugar", "Ya es el mapa de juego: lugares y facciones se abren al pulsarlos.", null]
    ]]
  ];
}

/* ------------------------------------------------------------------------------------------------ panel */

const PESTANAS = [["sesion", "fa-list-check", "Sesión 0"], ["pintar", "fa-paintbrush", "Pintar"], ["lugares", "fa-landmark", "Lugares"], ["facciones", "fa-flag", "Facciones"], ["decorado", "fa-compass", "Decorado"], ["fondo", "fa-scroll", "Pergamino"]];

export class EntornoMR extends App {
  static DEFAULT_OPTIONS = {
    id: "mr-wo-entorno", tag: "div", classes: ["mrg", "mrg-ventana", "mrg-entorno"],
    window: { title: "Mapa de los monstruos", icon: "fa-solid fa-map", resizable: true }, position: { width: 470, height: 820 }
  };

  async _renderHTML() {
    const e0 = entornoDe(canvas.scene), gm = game.user.isGM;
    if (!e0) return `<div class="mrg-ent"><div class="mrg-ent-vacio"><img src="${ICONOS}/mapa-rosa-1.webp" alt=""><p>Esta escena aún no es el mapa del entorno.</p>${gm ? `<button type="button" class="mrg-btn mrg-btn--sangre" data-nuevo><i class="fa-solid fa-plus"></i> Nuevo mapa sobre pergamino</button><button type="button" class="mrg-btn" data-convertir><i class="fa-solid fa-wand-sparkles"></i> Usar esta escena</button>` : "<p>Pídele al DJ que lo prepare.</p>"}</div></div>`;
    const e = normalizar(e0);
    const cab = `<header class="mrg-ent-cab">
        <input type="text" class="mrg-ent-nombre" value="${esc(e.nombre)}" ${e.bloqueado || !permitido() ? "disabled" : ""} aria-label="Nombre del mapa">
        ${gm ? `<button type="button" class="mrg-ent-candado ${e.bloqueado ? "on" : ""}" data-bloquear="${e.bloqueado ? 0 : 1}" data-ayuda="${e.bloqueado ? "Desbloquear||Vuelve a editar el mapa." : "Bloquear||Convierte el mapa en el mapa de juego: no se edita y lugares y facciones se abren al pulsarlos."}"><i class="fa-solid ${e.bloqueado ? "fa-lock" : "fa-lock-open"}"></i> ${e.bloqueado ? "Mapa de juego" : "Editando"}</button>` : `<span class="mrg-ent-candado ${e.bloqueado ? "on" : ""}"><i class="fa-solid ${e.bloqueado ? "fa-lock" : "fa-lock-open"}"></i></span>`}
      </header>`;
    if (e.bloqueado) return `<div class="mrg-ent">${cab}${this.#juego(e)}</div>`;
    const tabs = `<nav class="mrg-ent-tabs">${PESTANAS.map(([k, i, t]) => `<button type="button" data-pestana="${k}" class="${pestana === k ? "on" : ""}" aria-pressed="${pestana === k}"><i class="fa-solid ${i}"></i><span>${t}</span></button>`).join("")}</nav>`;
    const barra = `<div class="mrg-ent-barra">
        ${[["mover", "fa-hand-pointer", "Seleccionar"], ["goma", "fa-eraser", "Borrar"], ["medir", "fa-ruler", "Medir días"], ["rotulo", "fa-font", "Rótulo"]].map(([k, i, t]) => `<button type="button" data-herr="${k}" class="${herramienta === k ? "on" : ""}" aria-pressed="${herramienta === k}"><i class="fa-solid ${i}"></i><span>${t}</span></button>`).join("")}
        <button type="button" data-deshacer data-ayuda="Deshacer||Deshace tu último cambio (solo los tuyos, no los de los demás)."><i class="fa-solid fa-rotate-left"></i><span>Deshacer</span></button>
      </div>
      <div class="mrg-ent-escala"><label><span><i class="fa-solid fa-ruler-horizontal"></i> Escala: <b>${String(e.dias).replace(".", ",")} días</b> del centro al borde</span><input type="range" min="1.5" max="6" step="0.5" value="${e.dias}" data-dias aria-label="Escala del mapa"></label>
        <small>Todo se ajusta a la escala; cada cosa, además, con su menú (clic derecho, o clic con «Seleccionar»).${e.barra?.ver === false ? ` <a data-barra>Mostrar la barra de escala</a>` : ""}</small></div>`;
    return `<div class="mrg-ent">${cab}${tabs}${barra}<div class="mrg-ent-cuerpo">${this.#pestana(e)}</div></div>`;
  }

  #pal(lista, sel, attr, img = k => k) {
    return `<div class="mrg-ent-paleta">${lista.map(([k, n]) => `<button type="button" class="mrg-ent-sello ${sel === k ? "on" : ""}" ${attr}="${k}" aria-pressed="${sel === k}"><img src="${ICONOS}/mapa-${img(k)}.webp" alt=""><span>${esc(n)}</span></button>`).join("")}</div>`;
  }

  #pestana(e) {
    if (pestana === "pintar") return `<h4 class="mrg-seccion">Terreno</h4>${this.#pal(Object.entries(TERRENO).map(([k, [n]]) => [k, n]), herramienta === "pincel" ? terreno : null, "data-terreno", k => TERRENO[k][1][0])}
      <div class="mrg-ent-ajustes"><label>Tamaño del pincel<input type="range" min="40" max="260" step="10" value="${radio}" data-radio></label><label>Densidad<input type="range" min="1" max="4" step="1" value="${densidad}" data-densidad></label></div>
      <h4 class="mrg-seccion">Trazos</h4><div class="mrg-ent-trazos">${Object.entries(TRAZOS).map(([k, n]) => `<button type="button" class="${herramienta === "trazo" && trazoSel === k ? "on" : ""}" data-trazo="${k}"><i class="mrg-ent-linea mrg-ent-linea--${k}"></i>${n}</button>`).join("")}</div>`;
    if (pestana === "lugares") return `<p class="mrg-nota">Pulsa en el mapa para colocarlo. ${game.user.isGM ? "Para que abra una escena, un diario o un actor en el mapa de juego, usa «Vincular…» en su menú (solo lo ves tú)." : "El DJ decide qué abre cada lugar en el mapa de juego."}</p>${this.#pal(Object.entries(LUGARES), herramienta === "lugar" ? lugarSel : null, "data-lugar")}`;
    if (pestana === "decorado") return `<p class="mrg-nota">Un mapa hecho por monstruos: rosas de los vientos, la cartela con el nombre del mapa, bestias y marcas. Lo último que pones queda encima.</p>${this.#pal(Object.entries(DECORADO), herramienta === "decorado" ? decorSel : null, "data-decor")}`;
    if (pestana === "fondo") return `<p class="mrg-nota">El pergamino del mapa. Cámbialo cuando quieras: lo dibujado se queda.</p><div class="mrg-ent-fondos">${Object.entries(FONDOS).map(([k, n]) => `<button type="button" class="${e.fondo === k ? "on" : ""}" data-fondo="${k}" aria-pressed="${e.fondo === k}"><img src="${rutaFondo(k)}" alt=""><span>${n}</span></button>`).join("")}</div>`;
    if (pestana === "facciones") {
      const fac = e.facciones.map(f => ({ f, d: datosFaccion(f) })).sort((a, b) => b.d.nivel - a.d.nivel || a.d.nombre.localeCompare(b.d.nombre, "es"));
      return `<button type="button" class="mrg-btn mrg-btn--sangre mrg-ent-ancho" data-anadir-faccion><i class="fa-solid fa-flag"></i> ${faccionPendiente ? `Colocando: ${esc(faccionPendiente.name)}` : "Elegir facciones para el mapa"}</button>
        <p class="mrg-nota">Del manual (las 62 de los cuatro entornos, con su imagen, filtrables por entorno), las vuestras o una nueva. Arrástralas al mapa: la ventana sigue abierta.</p>
        <div class="mrg-ent-niveles">${[4, 3, 2, 1].map(k => { const n = fac.filter(x => x.d.nivel === k).length, [min, max] = PASOS_NIVEL[k]; return `<span class="${n >= min && n <= max ? "ok" : ""}"><b>${n} de ${min === max ? min : `${min}-${max}`}</b><small>nivel ${k}</small></span>`; }).join("")}</div>
        <ul class="mrg-ent-facs">${fac.map(({ f, d }) => `<li style="--ring:#${BANDOS[d.bando][1].toString(16).padStart(6, "0")}"><img src="${d.img}" alt=""><div><b>${esc(d.nombre)}</b><small>${BANDOS[d.bando][0]} · nivel ${d.nivel}${d.relojes.length ? ` · ${d.relojes.map(c => esc(c.text)).join(" · ")}` : ""}</small></div>${d.a ? `<button type="button" class="mrg-mini" data-ficha="${d.a.id}" aria-label="Abrir la ficha"><i class="fa-solid fa-address-card"></i></button>` : ""}<button type="button" class="mrg-mini" data-ir="${f.x},${f.y}" aria-label="Ver en el mapa"><i class="fa-solid fa-location-crosshairs"></i></button></li>`).join("") || `<li class="mrg-nota">Aún no hay facciones en el mapa.</li>`}</ul>`;
    }
    const dung = mazmorraActor();
    const grupos = checklist(e).map(([titulo, items]) => `<section class="mrg-ent-check"><h4>${titulo}</h4><ul>${items.map(([k, ok, t, ex, accion]) => `<li class="${ok ? "ok" : ""}">
        ${accion === "manual" && game.user.isGM ? `<button type="button" class="mrg-ent-caja ${ok ? "on" : ""}" data-marcar="${k}" aria-pressed="${ok}" aria-label="Marcar"><i class="fa-solid ${ok ? "fa-check" : "fa-square"}"></i></button>` : `<span class="mrg-ent-caja ${ok ? "on" : ""}"><i class="fa-solid ${ok ? "fa-check" : "fa-circle"}"></i></span>`}
        <div><b>${esc(t)}</b><small>${esc(ex)}</small>${Array.isArray(accion) ? `<button type="button" class="mrg-mini" data-accion="${accion[0]}|${accion[1]}">${esc(accion[2])}</button>` : ""}</div></li>`).join("")}</ul></section>`).join("");
    const atm = dung ? `<details class="mrg-ent-det" ${ATMOSFERA.some(([k]) => !String(dung.system?.[k] ?? "").trim()) ? "open" : ""}><summary>Atmósfera y duendes (ficha de «${esc(dung.name)}»)</summary>${ATMOSFERA.map(([k, q]) => `<label class="mrg-campo"><span class="mrg-etiqueta">${q}</span><input type="text" data-atm="${k}" value="${esc(dung.system?.[k] ?? "")}"></label>`).join("")}</details>` : "";
    const preg = `<details class="mrg-ent-det"><summary>Preguntas del DJ, por ejemplo</summary><ul>${PREGUNTAS.map(q => `<li>${esc(q)}</li>`).join("")}</ul></details>`;
    return `${grupos}${atm}${preg}`;
  }

  #juego(e) {
    const lugares = e.lugares.filter(l => l.enlace || l.nombre);
    const fac = e.facciones.map(f => ({ f, d: datosFaccion(f) })).sort((a, b) => b.d.nivel - a.d.nivel);
    return `<div class="mrg-ent-cuerpo"><p class="mrg-nota">Mapa de juego: pulsa un lugar con <i class="fa-solid fa-circle" style="color:#c8921f"></i> para abrir lo que tiene vinculado, o una facción para ver su ficha y sus relojes.</p>
      <h4 class="mrg-seccion">Lugares</h4><ul class="mrg-ent-facs">${lugares.map(l => `<li><img src="${ICONOS}/mapa-${l.k}.webp" alt=""><div><b>${esc(l.nombre || LUGARES[l.k])}</b>${l.nota ? `<small>${esc(l.nota)}</small>` : ""}</div>${l.enlace ? `<button type="button" class="mrg-mini" data-abrir="${l.enlace}" aria-label="Abrir"><i class="fa-solid fa-door-open"></i></button>` : ""}<button type="button" class="mrg-mini" data-ir="${l.x},${l.y - 50}" aria-label="Ver en el mapa"><i class="fa-solid fa-location-crosshairs"></i></button></li>`).join("") || `<li class="mrg-nota">Sin lugares con nombre.</li>`}</ul>
      <h4 class="mrg-seccion">Facciones</h4><ul class="mrg-ent-facs">${fac.map(({ f, d }) => `<li style="--ring:#${BANDOS[d.bando][1].toString(16).padStart(6, "0")}"><img src="${d.img}" alt=""><div><b>${esc(d.nombre)}</b><small>Nivel ${d.nivel}${d.relojes.map(c => ` · ${esc(c.text)} ${c.value}/${c.max}`).join("")}</small></div>${d.a ? `<button type="button" class="mrg-mini" data-ficha="${d.a.id}" aria-label="Abrir la ficha"><i class="fa-solid fa-address-card"></i></button>` : ""}<button type="button" class="mrg-mini" data-ir="${f.x},${f.y}" aria-label="Ver en el mapa"><i class="fa-solid fa-location-crosshairs"></i></button></li>`).join("")}</ul>
      ${game.user.isGM ? `<button type="button" class="mrg-btn mrg-ent-ancho" data-activar><i class="fa-solid fa-eye"></i> Mostrar el mapa a todos</button>` : ""}</div>`;
  }

  _replaceHTML(res, cont) {
    cont.innerHTML = res;
    cont.onclick = async ev => {
      if (ev.target.closest("[data-barra]")) return pedir("ajustar", { col: "barra", ver: true });
      const b = ev.target.closest("button"); if (!b) return;
      const d = b.dataset;
      if (d.pestana) { pestana = d.pestana; const h = { pintar: "pincel", lugares: "lugar", decorado: "decorado", facciones: "faccion" }[pestana]; activarHerramienta(h ?? null); return this.render(); }
      if (d.herr) { activarHerramienta(herramienta === d.herr ? null : d.herr); cerrarMenu(); if (herramienta !== "mover") { seleccion = null; dibujar(); } return this.render(); }
      if (d.terreno) { terreno = d.terreno; activarHerramienta("pincel"); return this.render(); }
      if (d.trazo) { trazoSel = d.trazo; activarHerramienta("trazo"); return this.render(); }
      if (d.lugar) { lugarSel = d.lugar; activarHerramienta("lugar"); return this.render(); }
      if (d.decor) { decorSel = d.decor; activarHerramienta("decorado"); return this.render(); }
      if (d.fondo) return pedir("fondo", { fondo: d.fondo });
      if ("anadirFaccion" in d) { activarHerramienta("faccion"); return abrirElegirFaccion(); }
      if ("deshacer" in d) return pedir("deshacer");
      if (d.bloquear) { activarHerramienta(null); seleccion = null; cerrarMenu(); return pedir("bloquear", { valor: d.bloquear === "1" }); }
      if (d.marcar) return pedir("sesion", { clave: d.marcar, valor: !entornoDe(canvas.scene)?.sesion?.[d.marcar] });
      if (d.ficha) return game.actors.get(d.ficha)?.sheet.render(true);
      if (d.abrir) return abrirEnlace(d.abrir);
      if (d.ir) { const [x, y] = d.ir.split(",").map(Number); return canvas.animatePan({ x, y, scale: Math.max(canvas.stage.scale.x, 0.6), duration: 500 }); }
      if (d.accion) { const [k, idA] = d.accion.split("|"); if (k === "ficha") return game.actors.get(idA)?.sheet.render(true); if (k === "creador") return api().abrirCreador?.(); if (k === "constructor") return api().abrirConstructor?.(); }
      if ("activar" in d) return canvas.scene.activate();
      if ("nuevo" in d) { await nuevoMapa(); return this.render(); }
      if ("convertir" in d) { await canvas.scene.setFlag(MOD, FLAG, nuevo()); return this.render(); }
    };
    cont.querySelector(".mrg-ent-nombre")?.addEventListener("change", ev => pedir("nombre", { nombre: ev.target.value }));
    cont.querySelector("[data-radio]")?.addEventListener("input", ev => { radio = Number(ev.target.value); });
    cont.querySelector("[data-densidad]")?.addEventListener("input", ev => { densidad = Number(ev.target.value); });
    cont.querySelector("[data-dias]")?.addEventListener("change", ev => pedir("dias", { dias: Number(ev.target.value) }));
    cont.querySelectorAll("[data-atm]").forEach(i => i.addEventListener("change", () => pedir("atmosfera", { clave: i.dataset.atm, valor: i.value })));
  }

  async close(o) { activarHerramienta(null); seleccion = null; faccionPendiente = null; cerrarMenu(); dibujar(); return super.close(o); }
}

export function abrirEntorno() {
  const prev = panel();
  if (prev) { prev.render(true); return prev; }
  const app = new EntornoMR(); app.render(true); return app;
}

/** Mapa nuevo: pergamino viejo, rosa de los vientos, cartela con el nombre y barra de escala ya puestas. */
export async function nuevoMapa() {
  if (!game.user.isGM) return;
  const e = nuevo();
  e.sellos.push({ id: id(), k: "rosa-1", x: 2650, y: 1650, s: 1, f: false, z: ++e.zSig }, { id: id(), k: "cartela", x: 1500, y: 190, s: 1, f: false, z: ++e.zSig });
  const escena = await Scene.create({
    name: "Mapa del entorno", width: 3000, height: 2000, padding: 0.05, backgroundColor: "#120d0a", grid: { type: 0, size: 100, distance: 1, units: "días" },
    background: { src: rutaFondo("viejo") }, tokenVision: false, environment: { globalLight: { enabled: true } }, ownership: { default: 2 }, flags: { [MOD]: { [FLAG]: e } }
  });
  await escena.view();
  return escena;
}

/* ------------------------------------------------------------------------------------------------ arranque */

export function registrarEntorno() {
  game.settings.register(MOD, "entornoJugadores", {
    name: "Los jugadores pueden dibujar el mapa del entorno", hint: "La creación del entorno es en grupo (pág. 294): con esto activo, todos pintan, colocan y mueven a la vez; el DJ guarda el mapa desde su cliente. Bloquear el mapa lo protege igualmente.",
    scope: "world", config: true, type: Boolean, default: true
  });
}

/** Tras redibujarse el lienzo (cambio de pergamino, F5…), el mapa y la herramienta en uso vuelven solos. */
async function rehacer() {
  quitarOverlay(); quitarJuego();
  if (!entornoDe(canvas.scene)) { if (contenedor && !contenedor.destroyed) contenedor.destroy({ children: true }); contenedor = null; return; }
  await cargarTexturas(); dibujar();
  if (herramienta && panel()) activarHerramienta(herramienta);
}

export function iniciarEntorno() {
  game.socket.on(`module.${MOD}`, async msg => {
    if (msg?.t !== "entorno" || !soyDJ()) return;
    if (!game.settings.get(MOD, "entornoJugadores") && msg.accion !== "atmosfera") return;
    const escena = game.scenes.get(msg.escena); if (!escena) return;
    await ejecutar(escena, msg.accion, msg.datos, game.users.get(msg.usuario));
  });
  const redibujar = () => { clearTimeout(pendiente); pendiente = setTimeout(async () => { if (!canvas.ready) return redibujar(); await cargarTexturas(); dibujar(); }, 60); };
  Hooks.on("canvasReady", rehacer);
  Hooks.on("canvasTearDown", () => { quitarOverlay(); quitarJuego(); cerrarMenu(); contenedor = null; });
  Hooks.on("updateScene", (escena, cambios) => {
    if (escena.id !== canvas.scene?.id) return;
    if (foundry.utils.hasProperty(cambios, "background")) { setTimeout(() => { if (canvas.ready) rehacer(); }, 400); return; }   // nuevo pergamino: el lienzo se rehace y el mapa vuelve
    if (!foundry.utils.hasProperty(cambios, `flags.${MOD}.${FLAG}`)) return;
    redibujar(); if (entornoDe(escena)?.bloqueado) activarHerramienta(null); panel()?.render();
  });
  // la ficha de una facción o de la mazmorra manda: si cambia, el mapa y la lista se ponen al día
  Hooks.on("updateActor", a => { if (["faction", "dungeon", "character"].includes(a.type) && entornoDe(canvas.scene)) { if (a.type === "faction") redibujar(); panel()?.render(); } });
  // facciones arrastradas desde su ventana
  Hooks.on("dropCanvasData", (cv, data) => {
    if (data?.type !== "MREntornoFaccion" || !entornoDe(canvas.scene)) return;
    actorDeFaccion(data.uuid).then(a => { if (a) pedir("faccion", { actor: a.id, x: data.x, y: data.y }); });
    return false;
  });
  document.addEventListener("keydown", ev => { if (ev.key === "Escape") cerrarMenu(); });
  if (canvas?.ready && entornoDe(canvas.scene)) rehacer();
}
