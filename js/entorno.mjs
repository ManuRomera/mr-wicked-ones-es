/**
 * Mapa del entorno de los monstruos (manual, cap. 6 «Entorno», págs. 276-297, y cap. 7 «Sesión 0», págs. 307-313).
 *
 * Es a la vez la herramienta de la sesión 0 y el mapa de juego:
 *  · Edición: sobre un pergamino viejo (a elegir) se pinta el terreno con sellos ilustrados, se trazan ríos, caminos y senderos,
 *    se colocan lugares y decorado (rosa de los vientos, cartela, monstruos…), rótulos y las facciones del mundo o del compendio
 *    del módulo, cada una con su imagen, su nivel y su territorio. Hay herramienta de mover/seleccionar y deshacer.
 *  · Check-list: sesión 0 (entorno, mazmorra, temática, vocaciones, seguridad), sesión 1 (atmósfera, incursión, mazmorra inicial)
 *    y creación del entorno (facciones por nivel y bando, distancias, preguntas), con lo que se puede comprobar marcado solo.
 *  · Juego: el DJ bloquea el mapa; entonces cada lugar abre su enlace (escena, diario o actor: la mazmorra abre su escena) y cada
 *    facción, su ficha con sus relojes.
 * El mapa vive en la bandera `entorno` de la escena; las órdenes de los jugadores viajan por socket al DJ, que guarda.
 */
const MOD = "mr-wicked-ones-es";
const FLAG = "entorno";
const ICONOS = `modules/${MOD}/assets/iconos`;
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
const ATMOSFERA = [["entrada", "¿Cómo se entra a la mazmorra desde el exterior?"], ["estructura", "¿De qué están hechos el suelo y las paredes?"], ["iluminacion", "¿Qué la ilumina y cómo de oscura es?"], ["ambiente", "¿Qué sonidos y olores perciben quienes entran?"], ["tesoro", "¿Qué compone vuestro tesoro?"]];
const PREGUNTAS = ["¿Por qué vive esta facción justo ahí y de qué vive?", "¿Quién manda en ella: un consejo o alguien poderoso?", "¿A qué otra facción odia más y qué le hizo?", "Estas dos facciones están enfrentadas: ¿por qué empezó y por qué sigue?", "¿Qué dejó en ruinas ese lugar?", "¿Qué dioses se adoraban aquí antes?"];
const TAMANO = { sello: 120, lugar: 130, mazmorra: 160, decor: 150, rosa: 260, cartela: 520 };

let contenedor = null, overlay = null, juego = null, texturas = {}, pendiente = null;
let pestana = "sesion", herramienta = null, terreno = "bosque", lugarSel = "mazmorra", decorSel = "rosa-1", trazoSel = "rio", radio = 80, densidad = 1;
let faccionPendiente = null, seleccion = null;   // { col, id }
const historial = [];   // deshacer (en el cliente del DJ)

export const entornoDe = escena => escena?.getFlag(MOD, FLAG) ?? null;
const nuevo = () => ({ v: 2, nombre: "Tierras por saquear", fondo: "viejo", bloqueado: false, sellos: [], trazos: [], lugares: [], facciones: [], rotulos: [], sesion: {}, atmosfera: {}, dias: 3 });
const id = () => foundry.utils.randomID(8);
const pxDia = (e, escena = canvas.scene) => (escena.dimensions.sceneRect.width / 2) / Math.max(1, e.dias || 3);
const permitido = () => game.user.isGM || game.settings.get(MOD, "entornoJugadores");
const soyDJ = () => game.user.isGM && game.users.activeGM?.id === game.user.id;
const panel = () => foundry.applications.instances?.get?.("mr-wo-entorno");
const api = () => game.modules.get(MOD)?.api ?? {};

/** Lo que el mapa sabe de una facción: si está enlazada a su ficha, manda la ficha (nombre, imagen, nivel, bando, relojes). */
function datosFaccion(f) {
  const a = f.actor ? game.actors.get(f.actor) : null;
  const cat = a?.system?.category ?? f.bando ?? "neutral";
  return { a, nombre: a?.name?.replace(/^\[[^\]]*\]\s*/, "") ?? f.nombre ?? "Facción", img: a?.img ?? f.img ?? null, nivel: Number(a?.system?.tier?.value ?? f.nivel ?? 0), bando: BANDOS[cat] ? cat : "neutral", relojes: a ? [a.system.clock1, a.system.clock2].filter(c => c?.text) : [] };
}

/* ------------------------------------------------------------------------------------------------ texturas */

async function cargarTexturas() {
  const cargar = foundry.canvas?.loadTexture ?? (src => PIXI.Assets.load(src));
  const claves = [...Object.values(TERRENO).flatMap(t => t[1]), ...Object.keys(LUGARES), ...Object.keys(DECORADO)].map(k => [k, `${ICONOS}/mapa-${k}.webp`]);
  const e = entornoDe(canvas.scene);
  for (const f of e?.facciones ?? []) { const d = datosFaccion(f); if (d.img) claves.push([d.img, d.img]); }
  await Promise.all(claves.map(async ([k, ruta]) => { if (k in texturas) return; try { texturas[k] = await cargar(ruta); } catch { texturas[k] = null; } }));
}

/* ------------------------------------------------------------------------------------------------ dibujo */

const textoMapa = (t, tam, color = 0x2a1c12, borde = 0xf1e2bd) => new PIXI.Text(t, { fontFamily: ["Blood Crow", "Bitter", "Georgia", "serif"], fontSize: tam, fill: color, stroke: borde, strokeThickness: Math.max(3, tam / 6), fontWeight: "700", align: "center", wordWrap: true, wordWrapWidth: 520 });

/** Contorno orgánico (siempre el mismo para la misma facción) para su territorio. */
function mancha(f) {
  let s = [...f.id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const azar = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
  const n = 26, fase = azar() * 6, pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, r = f.r * (0.86 + 0.13 * Math.sin(a * 3 + fase) + 0.06 * Math.sin(a * 7 + fase * 2) + 0.05 * (azar() - 0.5));
    pts.push(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r * 0.8);
  }
  return pts;
}

function sello(k, x, y, tam, flip = false, ancla = 0.85) {
  const tex = texturas[k]; if (!tex) return null;
  const sp = new PIXI.Sprite(tex); sp.anchor.set(0.5, ancla);
  const s = tam / Math.max(tex.width, tex.height); sp.scale.set(flip ? -s : s, s); sp.x = x; sp.y = y; sp.zIndex = 10 + y;
  return sp;
}

/** Medallón de facción: disco de pergamino, aro del color de su bando, su imagen, su nivel en calaveras y su nombre en una banda. */
function medallon(f, d) {
  const c = new PIXI.Container(), col = BANDOS[d.bando][1], R = 62;
  const g = new PIXI.Graphics();
  g.beginFill(0x1c120a, 0.35).drawCircle(f.x + 4, f.y + 6, R + 6).endFill();
  g.lineStyle(10, 0x1c120a, 1).beginFill(0xe9d8b0, 1).drawCircle(f.x, f.y, R).endFill();
  g.lineStyle(6, col, 1).drawCircle(f.x, f.y, R - 6);
  c.addChild(g);
  const tex = d.img && texturas[d.img];
  if (tex) { const sp = new PIXI.Sprite(tex); sp.anchor.set(0.5); const s = (R * 1.55) / Math.max(tex.width, tex.height); sp.scale.set(s); sp.x = f.x; sp.y = f.y; c.addChild(sp); }
  // nivel: tantas marcas como su nivel, en un arco bajo el medallón
  const p = new PIXI.Graphics();
  for (let i = 0; i < Math.max(0, d.nivel); i++) { const a = Math.PI / 2 + (i - (d.nivel - 1) / 2) * 0.32, x = f.x + Math.cos(a) * (R + 4), y = f.y + Math.sin(a) * (R + 4); p.lineStyle(3, 0x1c120a).beginFill(col).drawCircle(x, y, 9).endFill(); }
  c.addChild(p);
  const t = textoMapa(d.nombre, 30, 0x1c120a); t.anchor.set(0.5, 0); t.x = f.x; t.y = f.y + R + 16; c.addChild(t);
  c.zIndex = 8000 + f.y;
  return c;
}

export function dibujar() {
  if (contenedor) { contenedor.destroy({ children: true }); contenedor = null; }
  const e = entornoDe(canvas.scene); if (!e || !canvas.ready) return;
  contenedor = new PIXI.Container(); contenedor.sortableChildren = true; contenedor.name = "mr-wo-entorno"; contenedor.eventMode = "none";
  // territorios
  const terr = new PIXI.Graphics(); terr.zIndex = 1;
  for (const f of e.facciones) {
    const d = datosFaccion(f), col = BANDOS[d.bando][1], pts = mancha(f);
    terr.lineStyle(0).beginFill(col, 0.13).drawPolygon(pts).endFill();
    terr.lineStyle({ width: 6, color: col, alpha: 0.8, join: "round" }).drawPolygon(pts);
    terr.lineStyle({ width: 2, color: 0x1c120a, alpha: 0.5, join: "round" }).drawPolygon(pts);
  }
  contenedor.addChild(terr);
  // trazos
  const tr = new PIXI.Graphics(); tr.zIndex = 2;
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
    if (t.tipo === "rio") for (const [w, c] of [[22, 0x1f2a2c], [15, 0x3e7f86], [5, 0x8fc3be]]) { tr.lineStyle({ width: w, color: c, alpha: 1, join: "round", cap: "round" }).moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) tr.lineTo(p[i], p[i + 1]); }
    else if (t.tipo === "sendero") discontinua(p, 4, 0x7d1512, 6, 10);
    else discontinua(p, 7, 0x4a3018, 18, 9);
  }
  contenedor.addChild(tr);
  for (const s of e.sellos) {
    const decor = s.k in DECORADO, tam = s.k.startsWith("rosa") ? TAMANO.rosa : s.k === "cartela" ? TAMANO.cartela : decor ? TAMANO.decor : TAMANO.sello;
    const sp = sello(s.k, s.x, s.y, tam * (s.s || 1), s.f, s.k.startsWith("rosa") || s.k === "cartela" ? 0.5 : 0.85); if (!sp) continue;
    if (s.k.startsWith("rosa") || s.k === "cartela") sp.zIndex = 9500;
    contenedor.addChild(sp);
    if (s.k === "cartela" && e.nombre) { const t = textoMapa(e.nombre, Math.round(40 * (s.s || 1)), 0x2a1408, 0xe9d8b0); t.style.wordWrapWidth = 420 * (s.s || 1); t.anchor.set(0.5); t.x = s.x; t.y = s.y - 4; t.zIndex = 9501; contenedor.addChild(t); }
  }
  for (const l of e.lugares) {
    const sp = sello(l.k, l.x, l.y, l.k === "mazmorra" ? TAMANO.mazmorra : TAMANO.lugar); if (sp) contenedor.addChild(sp);
    if (l.nombre) { const t = textoMapa(l.nombre, l.k === "mazmorra" ? 34 : 28); t.anchor.set(0.5, 0); t.x = l.x; t.y = l.y + 24; t.zIndex = 5000 + l.y; contenedor.addChild(t); }
    if (l.enlace) { const g = new PIXI.Graphics(); g.lineStyle(3, 0x1c120a).beginFill(0xc8921f).drawCircle(l.x + 52, l.y - 92, 13).endFill(); g.zIndex = 5001 + l.y; contenedor.addChild(g); }
  }
  for (const r of e.rotulos ?? []) { const t = textoMapa(r.texto, r.tam || 44, r.color ?? 0x3a2414); t.anchor.set(0.5); t.x = r.x; t.y = r.y; t.alpha = 0.92; t.zIndex = 9200; contenedor.addChild(t); }
  for (const f of e.facciones) contenedor.addChild(medallon(f, datosFaccion(f)));
  if (seleccion && !e.bloqueado) {   // anillo de selección
    const o = buscar(e, seleccion); if (o) { const g = new PIXI.Graphics(); g.lineStyle(5, 0xc8921f, 1).drawCircle(o.x, o.y - (seleccion.col === "lugares" || seleccion.col === "sellos" ? 50 : 0), seleccion.col === "facciones" ? 82 : 70); g.zIndex = 99999; contenedor.addChild(g); }
  }
  (canvas.primary ?? canvas.stage).addChild(contenedor);
  prepararJuego(e);
}

/* ------------------------------------------------------------------------------------------------ modo de juego (mapa bloqueado) */

function quitarJuego() { if (juego) { juego.destroy({ children: true }); juego = null; } }

/** Con el mapa bloqueado, los lugares enlazados y las facciones se pueden pulsar; el resto del lienzo funciona como siempre. */
function prepararJuego(e) {
  quitarJuego();
  if (!e.bloqueado || !canvas.ready) return;
  juego = new PIXI.Container(); juego.eventMode = "static"; juego.zIndex = 9000;
  const etiqueta = textoMapa("", 28, 0xf1e2bd, 0x1c120a); etiqueta.visible = false; etiqueta.eventMode = "none";
  const zona = (x, y, r, texto, accion) => {
    const g = new PIXI.Graphics(); g.beginFill(0xffffff, 0.001).drawCircle(x, y, r).endFill(); g.eventMode = "static"; g.cursor = "pointer";
    g.on("pointerover", () => { etiqueta.text = texto; etiqueta.x = x + r * 0.6; etiqueta.y = y - r - 30; etiqueta.visible = true; });
    g.on("pointerout", () => { etiqueta.visible = false; });
    g.on("pointertap", ev => { ev.stopPropagation?.(); accion(); });
    juego.addChild(g);
  };
  for (const l of e.lugares) if (l.enlace) zona(l.x, l.y - 50, 70, `${l.nombre || LUGARES[l.k]} — abrir`, () => abrirEnlace(l.enlace));
  for (const f of e.facciones) { const d = datosFaccion(f); if (d.a) zona(f.x, f.y, 70, `${d.nombre} · nivel ${d.nivel}${d.relojes.length ? ` · ${d.relojes.map(c => `${c.text} ${c.value}/${c.max}`).join(" · ")}` : ""}`, () => d.a.sheet.render(true)); }
  juego.addChild(etiqueta);
  (canvas.interface ?? canvas.stage).addChild(juego);
}

async function abrirEnlace(uuid) {
  const doc = await fromUuid(uuid).catch(() => null);
  if (!doc) return ui.notifications.warn("Ese enlace ya no existe.");
  if (doc.documentName === "Scene") {
    if (!game.user.isGM && !doc.testUserPermission?.(game.user, "OBSERVER") && !doc.active) return ui.notifications.info("El DJ aún no os ha dejado ver esa escena.");
    return doc.view();
  }
  return doc.sheet?.render(true);
}

/* ------------------------------------------------------------------------------------------------ órdenes (las ejecuta el DJ) */

const COLS = ["sellos", "lugares", "facciones", "rotulos"];
function buscar(e, sel) { return sel && COLS.includes(sel.col) ? e[sel.col]?.find(o => o.id === sel.id) : null; }

async function ejecutar(escena, accion, d, usuario) {
  const prev = entornoDe(escena) ?? nuevo();
  if (accion === "deshacer") { const ant = historial.pop(); if (!ant) return { ok: false, motivo: "No hay nada que deshacer." }; await escena.setFlag(MOD, FLAG, ant); return { ok: true }; }
  const e = foundry.utils.mergeObject(nuevo(), foundry.utils.deepClone(prev));
  if (e.bloqueado && !["bloquear", "sesion", "atmosfera"].includes(accion)) return { ok: false, motivo: "El mapa está bloqueado: el DJ tiene que desbloquearlo para editarlo." };
  const quien = esc(usuario?.name ?? game.user.name);
  let aviso = "";
  if (accion === "sellos") e.sellos.push(...d.sellos.map(s => ({ id: id(), k: s.k, x: Math.round(s.x), y: Math.round(s.y), s: s.s ?? 1, f: Boolean(s.f) })));
  else if (accion === "trazo") e.trazos.push({ id: id(), tipo: TRAZOS[d.tipo] ? d.tipo : "camino", pts: d.pts.map(Math.round) });
  else if (accion === "lugar") {
    const l = d.id && e.lugares.find(z => z.id === d.id);
    if (d.quitar) e.lugares = e.lugares.filter(z => z.id !== d.id);
    else if (l) Object.assign(l, { nombre: String(d.nombre ?? "").slice(0, 60), enlace: d.enlace || null, nota: String(d.nota ?? "").slice(0, 300) });
    else { e.lugares.push({ id: id(), k: d.k, x: Math.round(d.x), y: Math.round(d.y), nombre: String(d.nombre ?? "").slice(0, 60), enlace: d.enlace || null, nota: String(d.nota ?? "").slice(0, 300) }); if (d.k === "mazmorra") aviso = `${quien} sitúa la mazmorra en el mapa.`; }
  } else if (accion === "faccion") {
    if (d.quitar) e.facciones = e.facciones.filter(f => f.id !== d.id);
    else if (d.id) Object.assign(e.facciones.find(f => f.id === d.id) ?? {}, { r: Math.min(700, Math.max(80, d.r | 0 || 240)) });
    else { e.facciones.push({ id: id(), actor: d.actor, x: Math.round(d.x), y: Math.round(d.y), r: Math.min(700, Math.max(80, d.r | 0 || 240)) }); const a = game.actors.get(d.actor); if (a) aviso = `${quien} añade al mapa <b>${esc(a.name)}</b> (nivel ${a.system?.tier?.value ?? 0}).`; }
  } else if (accion === "rotulo") {
    if (d.quitar) e.rotulos = e.rotulos.filter(r => r.id !== d.id);
    else if (d.id) Object.assign(e.rotulos.find(r => r.id === d.id) ?? {}, { texto: String(d.texto).slice(0, 80), tam: d.tam });
    else e.rotulos.push({ id: id(), x: Math.round(d.x), y: Math.round(d.y), texto: String(d.texto).slice(0, 80), tam: d.tam || 44 });
  } else if (accion === "mover") { const o = buscar(e, d); if (o) { o.x = Math.round(d.x); o.y = Math.round(d.y); } }
  else if (accion === "ajustar") { const o = buscar(e, d); if (o) { if ("s" in d) o.s = Math.min(3, Math.max(0.4, d.s)); if ("f" in d) o.f = d.f; if ("r" in d) o.r = Math.min(700, Math.max(80, d.r)); } }
  else if (accion === "quitar") { if (COLS.includes(d.col)) e[d.col] = e[d.col].filter(o => o.id !== d.id); }
  else if (accion === "borrar") {
    const { x, y, r } = d, cerca = (a, b) => Math.hypot(a - x, b - y) <= r;
    e.sellos = e.sellos.filter(s => !cerca(s.x, s.y)); e.lugares = e.lugares.filter(l => !cerca(l.x, l.y)); e.rotulos = e.rotulos.filter(l => !cerca(l.x, l.y));
    e.trazos = e.trazos.filter(t => { for (let i = 0; i < t.pts.length; i += 2) if (cerca(t.pts[i], t.pts[i + 1])) return false; return true; });
  } else if (accion === "dias") e.dias = Math.min(4, Math.max(2, Number(d.dias) || 3));
  else if (accion === "nombre") e.nombre = String(d.nombre ?? "").slice(0, 60);
  else if (accion === "fondo") { if (FONDOS[d.fondo]) { e.fondo = d.fondo; await escena.update({ "background.src": rutaFondo(d.fondo) }); } }
  else if (accion === "sesion") { if (!usuario?.isGM) return { ok: false, motivo: "Solo el DJ marca la lista." }; e.sesion = { ...e.sesion, [d.clave]: Boolean(d.valor) }; }
  else if (accion === "atmosfera") e.atmosfera = { ...e.atmosfera, [d.clave]: String(d.valor ?? "").slice(0, 300) };
  else if (accion === "bloquear") { if (!usuario?.isGM) return { ok: false, motivo: "Solo el DJ bloquea el mapa." }; e.bloqueado = Boolean(d.valor); aviso = e.bloqueado ? "<b>El mapa del entorno queda bloqueado</b>: ya es el mapa de juego. Pulsad un lugar enlazado o una facción para abrirlos." : "El DJ desbloquea el mapa del entorno para seguir editándolo."; }
  if (!["sesion", "atmosfera"].includes(accion)) { historial.push(prev); if (historial.length > 40) historial.shift(); }
  await escena.setFlag(MOD, FLAG, e);
  if (aviso) ChatMessage.create({ content: `<p>${aviso}</p>`, flags: { [MOD]: { tarjeta: true } } });
  return { ok: true };
}

export async function pedir(accion, datos = {}) {
  if (!permitido() && !["atmosfera"].includes(accion)) return ui.notifications.warn("El DJ no permite a los jugadores editar el mapa del entorno.");
  if (game.user.isGM) { const r = await ejecutar(canvas.scene, accion, datos, game.user); if (!r.ok && r.motivo) ui.notifications.warn(r.motivo); return r; }
  if (!game.users.activeGM) return ui.notifications.warn("No hay un DJ conectado que guarde el mapa.");
  game.socket.emit(`module.${MOD}`, { t: "entorno", accion, datos, escena: canvas.scene.id, usuario: game.user.id });
}

/* ------------------------------------------------------------------------------------------------ diálogos */

const opcionesDoc = (col, sel) => col.contents.slice().sort((a, b) => a.name.localeCompare(b.name, "es")).map(d => `<option value="${d.uuid}" ${sel === d.uuid ? "selected" : ""}>${esc(d.name)}</option>`).join("");

async function dialogoLugar(l) {
  const D = foundry.applications.api.DialogV2;
  if (!l.id && l.k === "mazmorra" && !l.enlace) l.enlace = game.scenes.find(s => s.getFlag(MOD, "mazmorra"))?.uuid ?? null;   // la mazmorra se enlaza sola a su escena
  const r = await D.wait({
    window: { title: l.id ? (l.nombre || LUGARES[l.k]) : `Nuevo lugar: ${LUGARES[l.k]}`, icon: "fa-solid fa-landmark" }, classes: ["mrg", "mrg-entorno-dlg"], position: { width: 440 },
    content: `<label class="mrg-campo"><span class="mrg-etiqueta">Nombre</span><input type="text" name="nombre" value="${esc(l.nombre ?? "")}" placeholder="${l.k === "mazmorra" ? "Nuestra guarida" : "Villafango, la Torre del Huraño…"}" autofocus></label>
      <label class="mrg-campo"><span class="mrg-etiqueta">Al pulsarlo en el mapa de juego, abre…</span><select name="enlace"><option value="">Nada</option>
        <optgroup label="Escenas">${opcionesDoc(game.scenes, l.enlace)}</optgroup><optgroup label="Diarios">${opcionesDoc(game.journal, l.enlace)}</optgroup><optgroup label="Actores">${opcionesDoc(game.actors, l.enlace)}</optgroup></select></label>
      <label class="mrg-campo"><span class="mrg-etiqueta">Nota (opcional)</span><input type="text" name="nota" value="${esc(l.nota ?? "")}" placeholder="Quién vive aquí, qué se puede saquear…"></label>`,
    buttons: [{ action: "ok", label: "Guardar", icon: "fa-solid fa-check", default: true, callback: (ev, b) => Object.fromEntries(new FormData(b.form)) },
      ...(l.k === "mazmorra" && game.user.isGM && !game.scenes.some(s => s.getFlag(MOD, "mazmorra")) ? [{ action: "crear", label: "Crear la escena de la mazmorra", icon: "fa-solid fa-trowel-bricks" }] : []),
      ...(l.id ? [{ action: "quitar", label: "Quitar", icon: "fa-solid fa-trash" }] : [])],
    rejectClose: false
  }).catch(() => null);
  if (!r) return;
  if (r === "quitar") return pedir("lugar", { id: l.id, quitar: true });
  if (r === "crear") {   // escena del constructor de mazmorras, enlazada a este lugar; se vuelve al mapa
    const vuelta = canvas.scene;
    const { nuevaEscena } = await import("./mazmorra.mjs");
    const s = await nuevaEscena(); await vuelta.view();
    return pedir("lugar", { ...l, nombre: l.nombre || "Nuestra mazmorra", enlace: s?.uuid ?? null });
  }
  return pedir("lugar", { ...l, nombre: r.nombre, enlace: r.enlace || null, nota: r.nota });
}

async function dialogoRotulo(r) {
  const D = foundry.applications.api.DialogV2;
  const v = await D.wait({
    window: { title: r.id ? "Rótulo" : "Nuevo rótulo", icon: "fa-solid fa-font" }, classes: ["mrg", "mrg-entorno-dlg"],
    content: `<label class="mrg-campo"><span class="mrg-etiqueta">Texto</span><input type="text" name="texto" value="${esc(r.texto ?? "")}" placeholder="Bosque de los Ahorcados, Mar de Hiel…" autofocus></label>
      <label class="mrg-campo"><span class="mrg-etiqueta">Tamaño</span><select name="tam">${[[32, "Pequeño"], [44, "Mediano"], [64, "Grande"], [88, "Enorme"]].map(([n, t]) => `<option value="${n}" ${Number(r.tam ?? 44) === n ? "selected" : ""}>${t}</option>`).join("")}</select></label>`,
    buttons: [{ action: "ok", label: "Guardar", icon: "fa-solid fa-check", default: true, callback: (ev, b) => Object.fromEntries(new FormData(b.form)) }, ...(r.id ? [{ action: "quitar", label: "Quitar", icon: "fa-solid fa-trash" }] : [])],
    rejectClose: false
  }).catch(() => null);
  if (!v) return;
  if (v === "quitar") return pedir("rotulo", { id: r.id, quitar: true });
  if (!v.texto.trim()) return;
  return pedir("rotulo", { ...r, texto: v.texto.trim(), tam: Number(v.tam) });
}

/** Elegir facción: las del mundo y las del compendio del módulo (por entorno), cada una con su imagen; o crear una nueva. */
class ElegirFaccion extends App {
  static DEFAULT_OPTIONS = { id: "mr-wo-elegir-faccion", tag: "div", classes: ["mrg", "mrg-ventana", "mrg-entorno"], window: { title: "Añadir una facción al mapa", icon: "fa-solid fa-flag" }, position: { width: 620, height: 680 } };
  constructor(alElegir) { super(); this.alElegir = alElegir; this.filtro = ""; this.fuente = "mundo"; this.docs = null; }
  async _renderHTML() {
    if (!this.docs) {
      const pack = game.packs.get(`${MOD}.facciones-es`);
      const comp = pack ? (await pack.getDocuments()).filter(d => d.type === "faction") : [];
      this.docs = { mundo: game.actors.filter(a => a.type === "faction"), compendio: comp };
    }
    const f = this.filtro.toLowerCase(), enMapa = new Set((entornoDe(canvas.scene)?.facciones ?? []).map(x => x.actor));
    const lista = this.docs[this.fuente].filter(d => !f || d.name.toLowerCase().includes(f));
    const grupos = {};
    for (const d of lista) (grupos[this.fuente === "compendio" ? (d.getFlag(MOD, "entorno") || "Otras") : "Facciones del mundo"] ??= []).push(d);
    const carta = d => { const c = d.system?.category, col = (BANDOS[c] ?? BANDOS.neutral)[1].toString(16).padStart(6, "0"); return `<button type="button" class="mrg-ent-carta ${enMapa.has(d.id) ? "en-mapa" : ""}" data-elegir="${d.uuid}" style="--ring:#${col}"><img src="${d.img}" alt=""><b>${esc(d.name.replace(/^\[[^\]]*\]\s*/, ""))}</b><small>${(BANDOS[c] ?? BANDOS.neutral)[0]} · nivel ${d.system?.tier?.value ?? 0}${enMapa.has(d.id) ? " · ya en el mapa" : ""}</small></button>`; };
    return `<div class="mrg-ent-elegir">
      <nav class="mrg-ent-tabs">${[["mundo", "En vuestro mundo", "fa-earth-europe"], ["compendio", "Del manual (por entorno)", "fa-book"], ["nueva", "Nueva", "fa-plus"]].map(([k, t, i]) => `<button type="button" data-fuente="${k}" class="${this.fuente === k ? "on" : ""}"><i class="fa-solid ${i}"></i> ${t}</button>`).join("")}</nav>
      ${this.fuente === "nueva" ? `<form class="mrg-ent-nueva"><p class="mrg-nota">Dadle uno o dos detalles y responded a las preguntas del DJ (pág. 294). Se crea su ficha de facción del sistema.</p>
          <label class="mrg-campo"><span class="mrg-etiqueta">Nombre</span><input type="text" name="nombre" placeholder="La guarnición del duque, los troles de las colinas…"></label>
          <label class="mrg-campo"><span class="mrg-etiqueta">Nivel</span><select name="nivel">${[4, 3, 2, 1, 0].map(n => `<option value="${n}" ${n === 2 ? "selected" : ""}>Nivel ${n}</option>`).join("")}</select></label>
          <label class="mrg-campo"><span class="mrg-etiqueta">Bando</span><select name="bando">${Object.entries(BANDOS).map(([k, b]) => `<option value="${k}">${b[0]}</option>`).join("")}</select></label>
          <button type="button" class="mrg-btn mrg-btn--sangre" data-crear><i class="fa-solid fa-flag"></i> Crear y colocar</button></form>`
        : `<input type="search" class="mrg-ent-buscar" placeholder="Buscar facción…" value="${esc(this.filtro)}">
        ${Object.entries(grupos).map(([g, ds]) => `<h4 class="mrg-seccion">${esc(g)}</h4><div class="mrg-ent-cartas">${ds.sort((a, b) => (b.system?.tier?.value ?? 0) - (a.system?.tier?.value ?? 0)).map(carta).join("")}</div>`).join("") || `<p class="mrg-nota">No hay facciones aquí.</p>`}`}
    </div>`;
  }
  _replaceHTML(res, cont) {
    cont.innerHTML = res;
    cont.querySelector(".mrg-ent-buscar")?.addEventListener("input", ev => { this.filtro = ev.target.value; clearTimeout(this._t); this._t = setTimeout(() => this.render().then(() => { const i = this.element.querySelector(".mrg-ent-buscar"); i?.focus(); i?.setSelectionRange(i.value.length, i.value.length); }), 200); });
    cont.onclick = async ev => {
      const b = ev.target.closest("button"); if (!b) return;
      if (b.dataset.fuente) { this.fuente = b.dataset.fuente; return this.render(); }
      if (b.dataset.elegir) {
        let a = await fromUuid(b.dataset.elegir);
        if (a?.pack) a = game.actors.find(x => x.getFlag("core", "sourceId") === a.uuid || x._stats?.compendiumSource === a.uuid) ?? await game.actors.importFromCompendium(game.packs.get(a.pack), a.id);
        if (a) { this.alElegir(a); this.close(); }
        return;
      }
      if ("crear" in b.dataset) {
        const fd = Object.fromEntries(new FormData(b.form));
        if (!fd.nombre.trim()) return ui.notifications.warn("Ponle nombre a la facción.");
        const a = await Actor.create({ name: fd.nombre.trim(), type: "faction", system: { category: fd.bando, tier: { value: Number(fd.nivel) } } });
        if (a) { this.alElegir(a); this.close(); }
      }
    };
  }
}

/* ------------------------------------------------------------------------------------------------ herramientas sobre el lienzo */

function quitarOverlay() { if (overlay) { overlay.destroy({ children: true }); overlay = null; } }

function activarHerramienta(h) {
  herramienta = h; quitarOverlay();
  const e = entornoDe(canvas.scene);
  if (!h || !canvas?.ready || !e || e.bloqueado) return;
  const d = canvas.dimensions.sceneRect;
  overlay = new PIXI.Container(); overlay.eventMode = "static"; overlay.zIndex = 99999;
  const zona = new PIXI.Graphics(); zona.beginFill(0xffffff, 0.001).drawRect(d.x, d.y, d.width, d.height).endFill(); zona.eventMode = "static"; zona.cursor = h === "mover" ? "pointer" : "crosshair";
  const previa = new PIXI.Graphics(), rotulo = textoMapa("", 34, 0x1c120a); previa.eventMode = "none"; rotulo.eventMode = "none";
  const fantasma = new PIXI.Container(); fantasma.eventMode = "none"; fantasma.alpha = 0.6;
  overlay.addChild(zona, previa, fantasma, rotulo); (canvas.interface ?? canvas.stage).addChild(overlay);
  let abajo = null, pts = [], sellos = [], ultimo = null, arrastre = null;
  const pos = ev => ev.getLocalPosition(overlay);
  const sellosDe = () => (herramienta === "pincel" ? TERRENO[terreno][1] : [decorSel]);
  const ponFantasma = () => {   // lo que vas a poner, bajo el cursor
    fantasma.removeChildren();
    const k = herramienta === "lugar" ? lugarSel : herramienta === "decorado" ? decorSel : herramienta === "pincel" ? TERRENO[terreno][1][0] : null;
    const tam = herramienta === "lugar" ? (k === "mazmorra" ? TAMANO.mazmorra : TAMANO.lugar) : herramienta === "decorado" ? (k.startsWith("rosa") ? TAMANO.rosa : k === "cartela" ? TAMANO.cartela : TAMANO.decor) : TAMANO.sello;
    const sp = k && sello(k, 0, 0, tam, false, k.startsWith("rosa") || k === "cartela" ? 0.5 : 0.85); if (sp) fantasma.addChild(sp);
    if (herramienta === "faccion" && faccionPendiente) { const t = textoMapa(`Pulsa para colocar: ${faccionPendiente.name}`, 30); t.anchor.set(0.5); fantasma.addChild(t); }
  };
  ponFantasma();
  const pinta = p => {   // densidad: cuántos sellos por paso; tamaño y variante al azar
    if (ultimo && Math.hypot(p.x - ultimo.x, p.y - ultimo.y) < radio * 0.55) return;
    ultimo = p;
    const vari = sellosDe();
    for (let i = 0; i < densidad; i++) {
      const ang = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * radio * 0.6;
      sellos.push({ k: vari[Math.floor(Math.random() * vari.length)], x: p.x + Math.cos(ang) * r, y: p.y + Math.sin(ang) * r * 0.75, s: +(0.75 + Math.random() * 0.5).toFixed(2), f: Math.random() < 0.5 });
    }
    previa.lineStyle(0).beginFill(0x4a6a2a, 0.3).drawCircle(p.x, p.y, radio * 0.4).endFill();
  };
  /** Lo que hay bajo el puntero (lo más «importante» primero). */
  const elegir = p => {
    const e2 = entornoDe(canvas.scene); if (!e2) return null;
    const f = e2.facciones.find(o => Math.hypot(o.x - p.x, o.y - p.y) < 70); if (f) return { col: "facciones", id: f.id, o: f };
    const l = e2.lugares.find(o => Math.hypot(o.x - p.x, o.y - 50 - p.y) < 70); if (l) return { col: "lugares", id: l.id, o: l };
    const r = (e2.rotulos ?? []).find(o => Math.hypot(o.x - p.x, o.y - p.y) < 60); if (r) return { col: "rotulos", id: r.id, o: r };
    let mejor = null, md = 1e9; for (const s of e2.sellos) { const dd = Math.hypot(s.x - p.x, s.y - 40 * (s.s || 1) - p.y); if (dd < md) { md = dd; mejor = s; } }
    return mejor && md < 70 * (mejor.s || 1) ? { col: "sellos", id: mejor.id, o: mejor } : null;
  };

  zona.on("pointerdown", ev => {
    const p = pos(ev); abajo = p; pts = [p.x, p.y]; sellos = []; ultimo = null; previa.clear();
    if (herramienta === "pincel") pinta(p);
    else if (herramienta === "decorado") { abajo = null; pedir("sellos", { sellos: [{ k: decorSel, x: p.x, y: p.y, s: 1, f: false }] }); }
    else if (herramienta === "lugar") { const hit = elegir(p); abajo = null; return dialogoLugar(hit?.col === "lugares" ? { ...hit.o } : { k: lugarSel, x: p.x, y: p.y + 50 }); }
    else if (herramienta === "rotulo") { const hit = elegir(p); abajo = null; return dialogoRotulo(hit?.col === "rotulos" ? { ...hit.o } : { x: p.x, y: p.y }); }
    else if (herramienta === "faccion") {
      abajo = null;
      if (faccionPendiente) { const a = faccionPendiente; faccionPendiente = null; ponFantasma(); panel()?.render(); return pedir("faccion", { actor: a.id, x: p.x, y: p.y, r: 240 }); }
      return abrirElegirFaccion();
    } else if (herramienta === "mover") {
      const hit = elegir(p); seleccion = hit ? { col: hit.col, id: hit.id } : null; arrastre = hit ? { dx: hit.o.x - p.x, dy: hit.o.y - p.y } : null;
      dibujar(); panel()?.render();
    }
  });
  zona.on("pointermove", ev => {
    const p = pos(ev);
    fantasma.x = p.x; fantasma.y = p.y;
    if (!abajo && (herramienta === "goma" || herramienta === "pincel")) { previa.clear().lineStyle(3, 0x4a3018, 0.8).drawCircle(p.x, p.y, radio * (herramienta === "goma" ? 0.8 : 0.6)); return; }
    if (!abajo) return;
    if (herramienta === "pincel") pinta(p);
    else if (herramienta === "trazo") {
      if (Math.hypot(p.x - pts.at(-2), p.y - pts.at(-1)) < 16) return;
      pts.push(p.x, p.y); previa.lineStyle(trazoSel === "rio" ? 14 : 6, trazoSel === "rio" ? 0x3e7f86 : trazoSel === "sendero" ? 0x7d1512 : 0x4a3018, 0.85).moveTo(pts.at(-4), pts.at(-3)).lineTo(p.x, p.y);
    } else if (herramienta === "goma") {
      previa.clear().beginFill(0x7d1512, 0.2).drawCircle(p.x, p.y, radio * 0.8).endFill();
      if (Math.hypot(p.x - (ultimo?.x ?? -1e9), p.y - (ultimo?.y ?? -1e9)) > radio * 0.4) { ultimo = p; pedir("borrar", { x: p.x, y: p.y, r: radio * 0.8 }); }
    } else if (herramienta === "medir") {
      const dias = Math.hypot(p.x - abajo.x, p.y - abajo.y) / pxDia(entornoDe(canvas.scene) ?? nuevo());
      previa.clear().lineStyle(6, 0x7d1512, 0.9).moveTo(abajo.x, abajo.y).lineTo(p.x, p.y).lineStyle(0).beginFill(0x7d1512).drawCircle(abajo.x, abajo.y, 8).drawCircle(p.x, p.y, 8).endFill();
      rotulo.text = `≈ ${dias.toLocaleString("es", { maximumFractionDigits: 1 })} ${Math.abs(dias - 1) < 0.05 ? "día" : "días"} de viaje`; rotulo.x = p.x + 16; rotulo.y = p.y - 46;
    } else if (herramienta === "mover" && arrastre && seleccion) {
      previa.clear().lineStyle(4, 0xc8921f, 0.9).drawCircle(p.x + arrastre.dx, p.y + arrastre.dy, 60);
    }
  });
  const soltar = async ev => {
    if (!abajo) return;
    const ini = abajo; abajo = null;
    if (herramienta === "pincel" && sellos.length) await pedir("sellos", { sellos });
    else if (herramienta === "trazo" && pts.length >= 4) await pedir("trazo", { tipo: trazoSel, pts });
    else if (herramienta === "mover" && arrastre && seleccion) {
      const p = ev?.getLocalPosition ? pos(ev) : ini;
      if (Math.hypot(p.x - ini.x, p.y - ini.y) > 6) await pedir("mover", { ...seleccion, x: p.x + arrastre.dx, y: p.y + arrastre.dy });
      arrastre = null;
    }
    previa.clear(); if (herramienta === "medir") setTimeout(() => { rotulo.text = ""; }, 3000);
  };
  zona.on("pointerup", soltar); zona.on("pointerupoutside", soltar);
}

function abrirElegirFaccion() {
  foundry.applications.instances?.get?.("mr-wo-elegir-faccion")?.close();
  new ElegirFaccion(async a => {
    faccionPendiente = a; await cargarTexturas(); if (a.img && !(a.img in texturas)) { try { texturas[a.img] = await (foundry.canvas?.loadTexture ?? PIXI.Assets.load)(a.img); } catch { /* sin imagen */ } }
    pestana = "facciones"; activarHerramienta("faccion"); panel()?.render(true);
    ui.notifications.info(`Pulsa en el mapa donde vive ${a.name}.`);
  }).render(true);
}

/* ------------------------------------------------------------------------------------------------ check-list de la sesión 0 */

function checklist(e) {
  const dung = game.actors.filter(a => a.type === "dungeon"), tema = dung.some(a => a.items.some(i => i.type === "dungeon_theme"));
  const pjs = game.actors.filter(a => a.type === "character" && a.hasPlayerOwner), conVoc = pjs.filter(a => a.items.some(i => i.type === "calling"));
  const mazEsc = game.scenes.filter(s => s.getFlag(MOD, "mazmorra")), mazHecha = mazEsc.some(s => !s.getFlag(MOD, "mazmorra").inicial && s.getFlag(MOD, "mazmorra").salas?.length);
  const atm = ATMOSFERA.every(([k]) => String(e.atmosfera?.[k] ?? "").trim());
  const fac = e.facciones.map(datosFaccion), nivel = k => fac.filter(f => f.nivel === k);
  const mezcla = (l, rec) => Object.entries(rec).map(([b, n]) => `${l.filter(f => f.bando === b).length}/${n} ${BANDOS[b][0].toLowerCase()}`).join(" · ");
  const m = (k) => Boolean(e.sesion?.[k]);
  return [
    ["Sesión 0 · pág. 307", [
      ["entorno", e.sellos.length > 5, "Elegid el entorno", "Pintad la región: pequeña y regional, de 2 a 4 días del centro al borde.", null],
      ["mazmorra", e.lugares.some(l => l.k === "mazmorra"), "¿Dónde estará la mazmorra?", "Pestaña Lugares → «Vuestra mazmorra». Cuanto más cerca del centro, mejor.", null],
      ["tematica", tema, "Elegid la temática de la mazmorra", tema ? "Ya está en la ficha de la mazmorra." : "Enclave, escondrijo, forja, fortaleza o templo: va en la ficha de la mazmorra.", dung[0] ? ["ficha", dung[0].id, "Abrir la ficha de la mazmorra"] : null],
      ["vocaciones", pjs.length > 0 && conVoc.length === pjs.length, `Elegid las vocaciones (${conVoc.length}/${pjs.length})`, "Con el entorno y la temática decididos, cada jugador crea su monstruo.", ["creador", "", "Abrir el creador"]],
      ["seguridad", m("seguridad"), "Herramientas de seguridad", "Tarjeta X, líneas y velos o la clasificación por edades: hablad de qué temas sí y cuáles no.", "manual"]
    ]],
    ["Sesión 1 · pág. 308", [
      ["atmosfera", atm, "La atmósfera de la mazmorra", "Cinco preguntas, respondidas por los monstruos (debajo). Si discrepan, lucha de poder.", null],
      ["incursion", m("incursion"), "La primera incursión: despejar la cueva", "Una cueva poco profunda ocupada por algunos «buenos»: será vuestro hogar.", "manual"],
      ["inicial", mazHecha, "Dibujad la mazmorra inicial", "Una de cada: salas de nivel 1, 2 y 3, guarida, portón, trampa, truco, santuario y escalera.", ["constructor", "", "Abrir el constructor de mazmorras"]]
    ]],
    ["Creación del entorno · pág. 294", [
      ...[4, 3, 2, 1].map(k => { const l = nivel(k), [min, max, rec] = PASOS_NIVEL[k]; return [`n${k}`, l.length >= min && l.length <= max, `${k === 4 ? "Dos o tres" : "Cuatro"} facciones de nivel ${k} (${l.length})`, `Reparto recomendado: ${mezcla(l, rec)}.`, null]; }),
      ["distancias", m("distancias"), "Calculad las distancias", `Del centro al borde: ${e.dias} días. Medid entre dos puntos: lo ideal es 1 o 2 días.`, "manual"],
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
    const e = entornoDe(canvas.scene), gm = game.user.isGM;
    if (!e) return `<div class="mrg-ent"><div class="mrg-ent-vacio"><img src="${ICONOS}/mapa-rosa-1.webp" alt=""><p>Esta escena aún no es el mapa del entorno.</p>${gm ? `<button type="button" class="mrg-btn mrg-btn--sangre" data-nuevo><i class="fa-solid fa-plus"></i> Nuevo mapa sobre pergamino</button><button type="button" class="mrg-btn" data-convertir><i class="fa-solid fa-wand-sparkles"></i> Usar esta escena</button>` : "<p>Pídele al DJ que lo prepare.</p>"}</div></div>`;
    const cab = `<header class="mrg-ent-cab">
        <input type="text" class="mrg-ent-nombre" value="${esc(e.nombre)}" ${e.bloqueado || !permitido() ? "disabled" : ""} aria-label="Nombre del mapa">
        ${gm ? `<button type="button" class="mrg-ent-candado ${e.bloqueado ? "on" : ""}" data-bloquear="${e.bloqueado ? 0 : 1}" data-ayuda="${e.bloqueado ? "Desbloquear||Vuelve a editar el mapa." : "Bloquear||Convierte el mapa en el mapa de juego: no se edita y lugares y facciones se abren al pulsarlos."}"><i class="fa-solid ${e.bloqueado ? "fa-lock" : "fa-lock-open"}"></i> ${e.bloqueado ? "Mapa de juego" : "Editando"}</button>` : `<span class="mrg-ent-candado ${e.bloqueado ? "on" : ""}"><i class="fa-solid ${e.bloqueado ? "fa-lock" : "fa-lock-open"}"></i></span>`}
      </header>`;
    if (e.bloqueado) return `<div class="mrg-ent">${cab}${this.#juego(e)}</div>`;
    const tabs = `<nav class="mrg-ent-tabs">${PESTANAS.map(([k, i, t]) => `<button type="button" data-pestana="${k}" class="${pestana === k ? "on" : ""}" aria-pressed="${pestana === k}"><i class="fa-solid ${i}"></i><span>${t}</span></button>`).join("")}</nav>`;
    const barra = `<div class="mrg-ent-barra">
        ${[["mover", "fa-arrows-up-down-left-right", "Mover y elegir"], ["goma", "fa-eraser", "Borrar"], ["medir", "fa-ruler", "Medir días"], ["rotulo", "fa-font", "Rótulo"]].map(([k, i, t]) => `<button type="button" data-herr="${k}" class="${herramienta === k ? "on" : ""}" aria-pressed="${herramienta === k}" data-ayuda="${t}"><i class="fa-solid ${i}"></i><span>${t}</span></button>`).join("")}
        <button type="button" data-deshacer data-ayuda="Deshacer||El último cambio del mapa."><i class="fa-solid fa-rotate-left"></i><span>Deshacer</span></button>
      </div>`;
    return `<div class="mrg-ent">${cab}${tabs}${barra}<div class="mrg-ent-cuerpo">${this.#seleccion(e)}${this.#pestana(e)}</div></div>`;
  }

  #pal(lista, sel, attr, img = k => k) {
    return `<div class="mrg-ent-paleta">${lista.map(([k, n]) => `<button type="button" class="mrg-ent-sello ${sel === k ? "on" : ""}" ${attr}="${k}" aria-pressed="${sel === k}"><img src="${ICONOS}/mapa-${img(k)}.webp" alt=""><span>${esc(n)}</span></button>`).join("")}</div>`;
  }

  #seleccion(e) {
    const o = buscar(e, seleccion); if (!o || herramienta !== "mover") return "";
    const nombre = seleccion.col === "facciones" ? datosFaccion(o).nombre : seleccion.col === "lugares" ? (o.nombre || LUGARES[o.k]) : seleccion.col === "rotulos" ? o.texto : (DECORADO[o.k] ?? Object.values(TERRENO).find(t => t[1].includes(o.k))?.[0] ?? o.k);
    const tam = seleccion.col === "facciones" ? `<label class="mrg-campo"><span class="mrg-etiqueta">Territorio</span><input type="range" min="80" max="700" step="10" value="${o.r}" data-ajustar="r"></label>`
      : seleccion.col === "sellos" ? `<label class="mrg-campo"><span class="mrg-etiqueta">Tamaño</span><input type="range" min="0.4" max="3" step="0.05" value="${o.s ?? 1}" data-ajustar="s"></label><button type="button" class="mrg-mini" data-voltear><i class="fa-solid fa-left-right"></i> Voltear</button>` : "";
    const editar = seleccion.col === "lugares" ? `<button type="button" class="mrg-btn" data-editar><i class="fa-solid fa-pen"></i> Nombre y enlace</button>` : seleccion.col === "rotulos" ? `<button type="button" class="mrg-btn" data-editar><i class="fa-solid fa-pen"></i> Texto</button>` : seleccion.col === "facciones" && datosFaccion(o).a ? `<button type="button" class="mrg-btn" data-ficha="${o.actor}"><i class="fa-solid fa-address-card"></i> Ficha</button>` : "";
    return `<section class="mrg-ent-sel"><b><i class="fa-solid fa-hand-pointer"></i> ${esc(nombre)}</b>${tam}<div class="mrg-ent-fila">${editar}<button type="button" class="mrg-btn" data-quitar><i class="fa-solid fa-trash"></i> Quitar</button></div><small>Arrastra en el mapa para moverlo.</small></section>`;
  }

  #pestana(e) {
    if (pestana === "pintar") return `<h4 class="mrg-seccion">Terreno</h4>${this.#pal(Object.entries(TERRENO).map(([k, [n]]) => [k, n]), herramienta === "pincel" ? terreno : null, "data-terreno", k => TERRENO[k][1][0])}
      <div class="mrg-ent-ajustes"><label>Tamaño del pincel<input type="range" min="40" max="260" step="10" value="${radio}" data-radio></label><label>Densidad<input type="range" min="1" max="4" step="1" value="${densidad}" data-densidad></label></div>
      <h4 class="mrg-seccion">Trazos</h4><div class="mrg-ent-trazos">${Object.entries(TRAZOS).map(([k, n]) => `<button type="button" class="${herramienta === "trazo" && trazoSel === k ? "on" : ""}" data-trazo="${k}"><i class="mrg-ent-linea mrg-ent-linea--${k}"></i>${n}</button>`).join("")}</div>`;
    if (pestana === "lugares") return `<p class="mrg-nota">Pulsa en el mapa para colocarlo. Cada lugar puede abrir una escena, un diario o un actor cuando el mapa esté bloqueado; la mazmorra se enlaza sola a la escena del constructor.</p>${this.#pal(Object.entries(LUGARES), herramienta === "lugar" ? lugarSel : null, "data-lugar")}`;
    if (pestana === "decorado") return `<p class="mrg-nota">Un mapa hecho por monstruos: rosa de los vientos, la cartela con el nombre del mapa, bestias y marcas. Pulsa en el mapa para colocarlo; con «Mover» lo agrandas, lo volteas o lo quitas.</p>${this.#pal(Object.entries(DECORADO), herramienta === "decorado" ? decorSel : null, "data-decor")}`;
    if (pestana === "fondo") return `<p class="mrg-nota">El pergamino del mapa. Puedes cambiarlo cuando quieras: lo dibujado se queda.</p><div class="mrg-ent-fondos">${Object.entries(FONDOS).map(([k, n]) => `<button type="button" class="${e.fondo === k ? "on" : ""}" data-fondo="${k}" aria-pressed="${e.fondo === k}"><img src="${rutaFondo(k)}" alt=""><span>${n}</span></button>`).join("")}</div>
      <label class="mrg-campo"><span class="mrg-etiqueta">Días de viaje del centro al borde: ${e.dias}</span><input type="range" min="2" max="4" step="1" value="${e.dias}" data-dias></label>`;
    if (pestana === "facciones") {
      const fac = e.facciones.map(f => ({ f, d: datosFaccion(f) })).sort((a, b) => b.d.nivel - a.d.nivel || a.d.nombre.localeCompare(b.d.nombre, "es"));
      return `<button type="button" class="mrg-btn mrg-btn--sangre mrg-ent-ancho" data-anadir-faccion><i class="fa-solid fa-flag"></i> ${faccionPendiente ? `Colocando: ${esc(faccionPendiente.name)}` : "Añadir una facción"}</button>
        <p class="mrg-nota">Del compendio del manual (las 62 de los cuatro entornos, con su imagen), de las que ya tengáis o una nueva. Todo lo que se ve en el mapa es de alguna facción.</p>
        <div class="mrg-ent-niveles">${[4, 3, 2, 1].map(k => { const n = fac.filter(x => x.d.nivel === k).length, [min, max] = PASOS_NIVEL[k]; return `<span class="${n >= min && n <= max ? "ok" : ""}"><b>${n} de ${min === max ? min : `${min}-${max}`}</b><small>nivel ${k}</small></span>`; }).join("")}</div>
        <ul class="mrg-ent-facs">${fac.map(({ f, d }) => `<li style="--ring:#${BANDOS[d.bando][1].toString(16).padStart(6, "0")}"><img src="${d.img ?? "icons/svg/mystery-man.svg"}" alt=""><div><b>${esc(d.nombre)}</b><small>${BANDOS[d.bando][0]} · nivel ${d.nivel}${d.relojes.length ? ` · ${d.relojes.map(c => esc(c.text)).join(" · ")}` : ""}</small></div>${d.a ? `<button type="button" class="mrg-mini" data-ficha="${d.a.id}" aria-label="Abrir la ficha"><i class="fa-solid fa-address-card"></i></button>` : ""}<button type="button" class="mrg-mini" data-ir="${f.x},${f.y}" aria-label="Ver en el mapa"><i class="fa-solid fa-location-crosshairs"></i></button></li>`).join("") || `<li class="mrg-nota">Aún no hay facciones en el mapa.</li>`}</ul>`;
    }
    // sesión 0
    const grupos = checklist(e).map(([titulo, items]) => `<section class="mrg-ent-check"><h4>${titulo}</h4><ul>${items.map(([k, ok, t, ex, accion]) => `<li class="${ok ? "ok" : ""}">
        ${accion === "manual" && game.user.isGM ? `<button type="button" class="mrg-ent-caja ${ok ? "on" : ""}" data-marcar="${k}" aria-pressed="${ok}" aria-label="Marcar"><i class="fa-solid ${ok ? "fa-check" : "fa-square"}"></i></button>` : `<span class="mrg-ent-caja ${ok ? "on" : ""}"><i class="fa-solid ${ok ? "fa-check" : "fa-circle"}"></i></span>`}
        <div><b>${esc(t)}</b><small>${esc(ex)}</small>${Array.isArray(accion) ? `<button type="button" class="mrg-mini" data-accion="${accion[0]}|${accion[1]}">${esc(accion[2])}</button>` : ""}</div></li>`).join("")}</ul></section>`).join("");
    const atm = `<details class="mrg-ent-det" ${ATMOSFERA.some(([k]) => !e.atmosfera?.[k]) ? "open" : ""}><summary>Atmósfera de la mazmorra (pág. 170)</summary>${ATMOSFERA.map(([k, q]) => `<label class="mrg-campo"><span class="mrg-etiqueta">${q}</span><input type="text" data-atm="${k}" value="${esc(e.atmosfera?.[k] ?? "")}"></label>`).join("")}</details>`;
    const preg = `<details class="mrg-ent-det"><summary>Preguntas del DJ, por ejemplo</summary><ul>${PREGUNTAS.map(q => `<li>${esc(q)}</li>`).join("")}</ul></details>`;
    return `${grupos}${atm}${preg}`;
  }

  #juego(e) {
    const lugares = e.lugares.filter(l => l.enlace || l.nombre);
    const fac = e.facciones.map(f => ({ f, d: datosFaccion(f) })).sort((a, b) => b.d.nivel - a.d.nivel);
    return `<div class="mrg-ent-cuerpo"><p class="mrg-nota">Mapa de juego: pulsa un lugar con <i class="fa-solid fa-circle" style="color:#c8921f"></i> para abrir lo que tiene enlazado, o una facción para ver su ficha y sus relojes.</p>
      <h4 class="mrg-seccion">Lugares</h4><ul class="mrg-ent-facs">${lugares.map(l => `<li><img src="${ICONOS}/mapa-${l.k}.webp" alt=""><div><b>${esc(l.nombre || LUGARES[l.k])}</b>${l.nota ? `<small>${esc(l.nota)}</small>` : ""}</div>${l.enlace ? `<button type="button" class="mrg-mini" data-abrir="${l.enlace}" aria-label="Abrir"><i class="fa-solid fa-door-open"></i></button>` : ""}<button type="button" class="mrg-mini" data-ir="${l.x},${l.y - 50}" aria-label="Ver en el mapa"><i class="fa-solid fa-location-crosshairs"></i></button></li>`).join("") || `<li class="mrg-nota">Sin lugares con nombre.</li>`}</ul>
      <h4 class="mrg-seccion">Facciones</h4><ul class="mrg-ent-facs">${fac.map(({ f, d }) => `<li style="--ring:#${BANDOS[d.bando][1].toString(16).padStart(6, "0")}"><img src="${d.img ?? "icons/svg/mystery-man.svg"}" alt=""><div><b>${esc(d.nombre)}</b><small>Nivel ${d.nivel}${d.relojes.map(c => ` · ${esc(c.text)} ${c.value}/${c.max}`).join("")}</small></div>${d.a ? `<button type="button" class="mrg-mini" data-ficha="${d.a.id}" aria-label="Abrir la ficha"><i class="fa-solid fa-address-card"></i></button>` : ""}<button type="button" class="mrg-mini" data-ir="${f.x},${f.y}" aria-label="Ver en el mapa"><i class="fa-solid fa-location-crosshairs"></i></button></li>`).join("")}</ul>
      ${game.user.isGM ? `<button type="button" class="mrg-btn mrg-ent-ancho" data-activar><i class="fa-solid fa-eye"></i> Mostrar el mapa a todos</button>` : ""}</div>`;
  }

  _replaceHTML(res, cont) {
    cont.innerHTML = res;
    cont.onclick = async ev => {
      const b = ev.target.closest("button"); if (!b) return;
      const d = b.dataset;
      if (d.pestana) { pestana = d.pestana; const h = { pintar: "pincel", lugares: "lugar", decorado: "decorado", facciones: "faccion" }[pestana]; activarHerramienta(h ?? null); return this.render(); }
      if (d.herr) { activarHerramienta(herramienta === d.herr ? null : d.herr); if (herramienta !== "mover") { seleccion = null; dibujar(); } return this.render(); }
      if (d.terreno) { terreno = d.terreno; activarHerramienta("pincel"); return this.render(); }
      if (d.trazo) { trazoSel = d.trazo; activarHerramienta("trazo"); return this.render(); }
      if (d.lugar) { lugarSel = d.lugar; activarHerramienta("lugar"); return this.render(); }
      if (d.decor) { decorSel = d.decor; activarHerramienta("decorado"); return this.render(); }
      if (d.fondo) return pedir("fondo", { fondo: d.fondo });
      if ("anadirFaccion" in d) return abrirElegirFaccion();
      if ("deshacer" in d) return pedir("deshacer");
      if (d.bloquear) { activarHerramienta(null); seleccion = null; return pedir("bloquear", { valor: d.bloquear === "1" }); }
      if (d.marcar) return pedir("sesion", { clave: d.marcar, valor: !entornoDe(canvas.scene)?.sesion?.[d.marcar] });
      if (d.ficha) return game.actors.get(d.ficha)?.sheet.render(true);
      if (d.abrir) return abrirEnlace(d.abrir);
      if (d.ir) { const [x, y] = d.ir.split(",").map(Number); return canvas.animatePan({ x, y, scale: Math.max(canvas.stage.scale.x, 0.6), duration: 500 }); }
      if (d.accion) { const [k, idA] = d.accion.split("|"); if (k === "ficha") return game.actors.get(idA)?.sheet.render(true); if (k === "creador") return api().abrirCreador?.(); if (k === "constructor") return api().abrirConstructor?.(); }
      if ("activar" in d) return canvas.scene.activate();
      if ("nuevo" in d) { await nuevoMapa(); return this.render(); }
      if ("convertir" in d) { await canvas.scene.setFlag(MOD, FLAG, nuevo()); return this.render(); }
      const e = entornoDe(canvas.scene), o = buscar(e, seleccion);
      if ("quitar" in d && o) { await pedir("quitar", seleccion); seleccion = null; return; }
      if ("voltear" in d && o) return pedir("ajustar", { ...seleccion, f: !o.f });
      if ("editar" in d && o) return seleccion.col === "lugares" ? dialogoLugar({ ...o }) : dialogoRotulo({ ...o });
    };
    cont.querySelector(".mrg-ent-nombre")?.addEventListener("change", ev => pedir("nombre", { nombre: ev.target.value }));
    cont.querySelector("[data-radio]")?.addEventListener("input", ev => { radio = Number(ev.target.value); });
    cont.querySelector("[data-densidad]")?.addEventListener("input", ev => { densidad = Number(ev.target.value); });
    cont.querySelector("[data-dias]")?.addEventListener("change", ev => pedir("dias", { dias: Number(ev.target.value) }));
    cont.querySelectorAll("[data-atm]").forEach(i => i.addEventListener("change", () => pedir("atmosfera", { clave: i.dataset.atm, valor: i.value })));
    cont.querySelectorAll("[data-ajustar]").forEach(i => i.addEventListener("change", () => pedir("ajustar", { ...seleccion, [i.dataset.ajustar]: Number(i.value) })));
  }

  async close(o) { activarHerramienta(null); seleccion = null; faccionPendiente = null; dibujar(); return super.close(o); }
}

export function abrirEntorno() {
  const prev = panel();
  if (prev) { prev.render(true); return prev; }
  const app = new EntornoMR(); app.render(true); return app;
}

/** Mapa nuevo: pergamino viejo, rosa de los vientos y cartela con el nombre ya puestas. */
export async function nuevoMapa() {
  if (!game.user.isGM) return;
  const e = nuevo();
  e.sellos.push({ id: id(), k: "rosa-1", x: 2650, y: 1650, s: 1, f: false }, { id: id(), k: "cartela", x: 1500, y: 190, s: 1, f: false });
  const escena = await Scene.create({
    name: "Mapa del entorno", width: 3000, height: 2000, padding: 0.05, backgroundColor: "#120d0a", grid: { type: 0, size: 100, distance: 1, units: "días" },
    background: { src: rutaFondo("viejo") }, tokenVision: false, environment: { globalLight: { enabled: true } }, flags: { [MOD]: { [FLAG]: e } }
  });
  await escena.view();
  return escena;
}

/* ------------------------------------------------------------------------------------------------ arranque */

export function registrarEntorno() {
  game.settings.register(MOD, "entornoJugadores", {
    name: "Los jugadores pueden dibujar el mapa del entorno", hint: "La creación del entorno es por turnos (pág. 294): con esto activo, cada jugador pinta, coloca lugares y facciones; el DJ guarda el mapa desde su cliente. Bloquear el mapa lo protege igualmente.",
    scope: "world", config: true, type: Boolean, default: true
  });
}

export function iniciarEntorno() {
  game.socket.on(`module.${MOD}`, async msg => {
    if (msg?.t !== "entorno" || !soyDJ()) return;
    if (!game.settings.get(MOD, "entornoJugadores") && msg.accion !== "atmosfera") return;
    const escena = game.scenes.get(msg.escena); if (!escena) return;
    await ejecutar(escena, msg.accion, msg.datos, game.users.get(msg.usuario));
  });
  const redibujar = () => { clearTimeout(pendiente); pendiente = setTimeout(async () => { await cargarTexturas(); dibujar(); }, 50); };
  Hooks.on("canvasReady", async () => { quitarOverlay(); quitarJuego(); contenedor = null; seleccion = null; if (entornoDe(canvas.scene)) { await cargarTexturas(); dibujar(); } });
  Hooks.on("canvasTearDown", () => { quitarOverlay(); quitarJuego(); contenedor = null; });
  Hooks.on("updateScene", (escena, cambios) => {
    if (escena.id !== canvas.scene?.id || !foundry.utils.hasProperty(cambios, `flags.${MOD}.${FLAG}`)) return;
    redibujar(); if (entornoDe(escena)?.bloqueado) activarHerramienta(null); panel()?.render();
  });
  // la ficha de una facción manda: si cambia su nombre, imagen, nivel o bando, el mapa se pone al día
  Hooks.on("updateActor", a => { if (a.type === "faction" && entornoDe(canvas.scene)?.facciones.some(f => f.actor === a.id)) { redibujar(); panel()?.render(); } });
  if (canvas?.ready && entornoDe(canvas.scene)) cargarTexturas().then(dibujar);
}
