/**
 * Libretos de Wicked Ones: vocaciones y razas explicadas para que cada jugador sepa qué opciones tiene, cómo
 * interpretar a su monstruo y qué objetos puede llevar. Une el texto del manual (content/libretos.json) con las
 * capacidades reales de los compendios del sistema (traducidas por Babele), de modo que se pueden añadir a la hoja.
 * La vista es la misma en la pestaña «Libreto» de la hoja y en la ventana independiente de Libretos.
 */
const MOD = "mr-wicked-ones-es";
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
export const sinAcentos = s => String(s ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

const ALIAS_VOC = { crafter: "artesano", marauder: "bandido", brute: "bruto", hunter: "cazador", shaman: "chaman", conniver: "confabulador", zealot: "fanatico", warlock: "hechicero", shadow: "sombra" };
const ALIAS_RAZA = { goblin: "goblin", demon: "demonio", kobold: "kobold", slissik: "serpido", bugbear: "osgo", orc: "orco" };
export const claveVoc = nombre => { const k = sinAcentos(nombre); return ALIAS_VOC[k] ?? k; };
export const claveRaza = nombre => { const k = sinAcentos(nombre); return ALIAS_RAZA[k] ?? k; };

let _libro = null;
const _docs = {};

export async function cargarLibretos() {
  if (_libro) return _libro;
  try {
    const r = await fetch(`modules/${MOD}/content/libretos.json`);
    _libro = r.ok ? await r.json() : { vocaciones: [], razas: [] };
  } catch { _libro = { vocaciones: [], razas: [] }; }
  return _libro;
}

/** Datos del documento ya traducidos por Babele (si está activo); el sistema entrega los compendios en inglés. */
function traducido(doc) {
  const o = doc.toObject();
  try { return game.babele?.packs?.get(doc.pack)?.translate?.(o) ?? o; } catch { return o; }
}

/** Documentos de un compendio del sistema como objetos ligeros: { name, system, img, uuid, datos } (datos = lo que se crea en la hoja). */
export async function docsDe(pack) {
  if (_docs[pack]) return _docs[pack];
  const p = game.packs.get(`wicked-ones.${pack}`);
  _docs[pack] = p ? (await p.getDocuments()).map(d => { const o = traducido(d); return { name: o.name, system: o.system ?? {}, img: o.img, uuid: d.uuid, datos: o }; }) : [];
  return _docs[pack];
}
const buscarUuid = uuid => Object.values(_docs).flat().find(d => d.uuid === uuid);
export const olvidarCache = () => { for (const k of Object.keys(_docs)) delete _docs[k]; };

/** Todas las vocaciones: las 9 del manual, enriquecidas con los compendios, y las demás del sistema. */
export async function vocaciones() {
  const libro = await cargarLibretos();
  const callings = await docsDe("calling");
  const habs = await docsDe("specialability");
  const porClave = new Map();
  for (const v of libro.vocaciones) porClave.set(v.id, { ...v, libro: true, capacidades: [], principal: { ...v.principal } });
  for (const c of callings) {
    const id = claveVoc(c.name);
    const v = porClave.get(id) ?? { id, nombre: c.name, lema: "", intro: "", principal: { nombre: "", texto: "" }, flashback: "", objetos: [], libro: false, capacidades: [] };
    if (!v.lema) v.lema = c.system?.description ?? "";
    if (!v.flashback && c.system?.flashback_clues) v.flashback = c.system.flashback_clues;
    v.docCalling = c;
    porClave.set(id, v);
  }
  for (const h of habs) {
    const v = porClave.get(claveVoc(h.system?.source));
    if (v) v.capacidades.push(h);
  }
  for (const v of porClave.values()) {
    v.capacidades.sort((a, b) => (b.system?.ability_group === "group_core") - (a.system?.ability_group === "group_core") || a.name.localeCompare(b.name, "es"));
    const nucleo = v.capacidades.find(h => h.system?.ability_group === "group_core");
    if (nucleo && !v.principal.nombre) v.principal = { nombre: nucleo.name, texto: nucleo.system?.description ?? "" };
  }
  const orden = libro.vocaciones.map(v => v.id);
  return [...porClave.values()].sort((a, b) => (orden.indexOf(a.id) + 1 || 99) - (orden.indexOf(b.id) + 1 || 99) || a.nombre.localeCompare(b.nombre, "es"));
}

/** Todas las razas: las del manual y las del sistema. */
export async function razas() {
  const libro = await cargarLibretos();
  const docs = await docsDe("monster_race");
  const mapa = new Map(libro.razas.map(r => [r.id, { ...r, libro: true }]));
  for (const d of docs) {
    const id = claveRaza(d.name);
    const r = mapa.get(id) ?? { id, nombre: d.name, texto: d.system?.description ?? "", dice: [], nombres: [], libro: false };
    r.doc = d;
    if (!r.texto) r.texto = d.system?.description ?? "";
    if (d.system?.primal) r.primal = true;
    mapa.set(id, r);
  }
  const orden = libro.razas.map(r => r.id);
  return [...mapa.values()].sort((a, b) => (orden.indexOf(a.id) + 1 || 99) - (orden.indexOf(b.id) + 1 || 99));
}

const tieneItem = (actor, tipo, nombre) => actor?.items?.some(i => i.type === tipo && sinAcentos(i.name) === sinAcentos(nombre));
export const vocacionDe = actor => actor?.items?.find(i => i.type === "calling");
export const razaDe = actor => actor?.items?.find(i => i.type === "monster_race");

/* -------------------------------------------------------------------------- */
/*  Vista                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * @param {object} e { modo: "voc"|"raza"|"otros", voc, raza }
 * @param {Actor|null} actor
 */
export async function htmlLibreto(e, actor = null) {
  const [vs, rs] = [await vocaciones(), await razas()];
  const propiaV = actor ? claveVoc(vocacionDe(actor)?.name) : null;
  const propiaR = actor ? claveRaza(razaDe(actor)?.name) : null;
  const modo = e.modo ?? "voc";
  const edita = Boolean(actor?.isOwner);
  // Con la hoja en modo normal, raza, vocación e impulsos quedan fijados; solo se tocan al evolucionar (o si aún no hay nada elegido)
  const evo = e.evolucion ?? true;
  const xpA = actor?.system?.wickedxp;
  const puede = e.puedeAprender ?? (!actor || evo || actor.items.filter(i => i.type === "specialability").length < 2 || Number(xpA?.value ?? 0) >= Number(xpA?.max ?? 9));
  const aprende = edita && puede;
  const puedeCambiar = (tipo) => edita && (evo || !actor.items.some(i => i.type === tipo));
  const candado = `<span class="mrg-chip" data-ayuda="Fijado||Para cambiarlo activa el modo evolución en la hoja (icono de la barra superior)."><i class="fa-solid fa-lock"></i> Fijado</span>`;

  const tabs = [["voc", "Vocación", "fa-hat-wizard"], ["raza", "Raza", "fa-dragon"], ["otros", "Impulsos y juergas", "fa-masks-theater"]]
    .map(([k, t, i]) => `<button type="button" class="mrg-btn ${modo === k ? "mrg-activo" : ""}" data-lib="modo" data-valor="${k}" aria-pressed="${modo === k}"><i class="fa-solid ${i}"></i> ${t}</button>`).join("");

  let cuerpo = "";
  if (modo === "voc") {
    const v = vs.find(x => x.id === e.voc) ?? vs.find(x => x.id === propiaV) ?? vs[0];
    const chips = vs.filter(x => x.libro).map(x => `<button type="button" class="mrg-chipbtn ${x.id === v?.id ? "mrg-sel" : ""}" data-lib="voc" data-valor="${esc(x.id)}" aria-pressed="${x.id === v?.id}">${x.id === propiaV ? "★ " : ""}${esc(x.nombre)}</button>`).join("");
    const extras = vs.filter(x => !x.libro);
    const cabExtra = extras.length ? `<details class="mrg-lib-extra"><summary>Otras vocaciones del sistema (${extras.length})</summary><div class="mrg-lib-chips">${extras.map(x => `<button type="button" class="mrg-chipbtn ${x.id === v?.id ? "mrg-sel" : ""}" data-lib="voc" data-valor="${esc(x.id)}">${esc(x.nombre)}</button>`).join("")}</div></details>` : "";
    if (v) {
      const caps = v.capacidades.filter(h => h.system?.ability_group !== "group_core").map(h => {
        const tiene = tieneItem(actor, "specialability", h.name);
        return `<article class="mrg-cap ${tiene ? "mrg-tiene" : ""}"><header><h5>${esc(h.name)}</h5>${tiene ? `<span class="mrg-chip mrg-chip--verde"><i class="fa-solid fa-check"></i> La tienes</span>` : aprende ? `<button type="button" class="mrg-btn" data-lib="anadir" data-uuid="${esc(h.uuid)}"><i class="fa-solid fa-plus"></i> Aprender</button>` : edita ? `<span class="mrg-chip" data-ayuda="Aún no toca||Empiezas con una capacidad de vocación y ganas otra cuando llenas la EXP malvada (9 casillas). También puedes activar el modo evolución."><i class="fa-solid fa-lock"></i> Cuando llenes la EXP</span>` : ""}</header><p>${esc(h.system?.description ?? "")}</p></article>`;
      }).join("");
      const nucleo = v.capacidades.find(h => h.system?.ability_group === "group_core");
      const tieneNucleo = nucleo && tieneItem(actor, "specialability", nucleo.name);
      cuerpo = `<nav class="mrg-lib-chips" aria-label="Vocaciones">${chips}</nav>${cabExtra}
      <article class="mrg-lib-ficha">
        <header class="mrg-lib-cab"><h3 class="mrg-titulo">${esc(v.nombre)}</h3>${v.lema ? `<p class="mrg-lib-lema">${esc(v.lema)}</p>` : ""}
          ${puedeCambiar("calling") && v.docCalling && v.id !== propiaV ? `<button type="button" class="mrg-btn mrg-btn--sangre" data-lib="elegir-voc" data-id="${esc(v.id)}"><i class="fa-solid fa-crown"></i> Ser ${esc(v.nombre.toLowerCase())}</button>` : edita && v.id !== propiaV && propiaV ? candado : v.id === propiaV ? `<span class="mrg-chip mrg-chip--oro"><i class="fa-solid fa-star"></i> Tu vocación</span>` : ""}</header>
        ${v.intro ? `<p class="mrg-lib-intro">${esc(v.intro)}</p>` : ""}
        ${v.principal?.nombre ? `<section class="mrg-lib-principal"><h4>Capacidad principal · ${esc(v.principal.nombre)}</h4><p>${esc(v.principal.texto)}</p>${nucleo && aprende && !tieneNucleo ? `<button type="button" class="mrg-btn" data-lib="anadir" data-uuid="${esc(nucleo.uuid)}"><i class="fa-solid fa-plus"></i> Tenerla en mi hoja</button>` : tieneNucleo ? `<span class="mrg-chip mrg-chip--verde"><i class="fa-solid fa-check"></i> La tienes</span>` : ""}</section>` : ""}
        ${v.flashback ? `<p class="mrg-lib-flash"><i class="fa-solid fa-clock-rotate-left"></i> ${esc(v.flashback)}</p>` : ""}
        ${caps ? `<h4 class="mrg-seccion">Capacidades de vocación <small>empiezas con una y ganas otra al completar la EXP malvada</small></h4><div class="mrg-caps">${caps}</div>` : ""}
        ${v.objetos?.length ? `<h4 class="mrg-seccion">Objetos de ejemplo <small>cuatro de equipo y tres de suministro</small></h4><ul class="mrg-lib-objetos">${v.objetos.map(o => `<li>${esc(o)}</li>`).join("")}</ul>` : ""}
      </article>`;
    }
  } else if (modo === "raza") {
    const r = rs.find(x => x.id === e.raza) ?? rs.find(x => x.id === propiaR) ?? rs[0];
    const chips = rs.map(x => `<button type="button" class="mrg-chipbtn ${x.id === r?.id ? "mrg-sel" : ""}" data-lib="raza" data-valor="${esc(x.id)}" aria-pressed="${x.id === r?.id}">${x.id === propiaR ? "★ " : ""}${esc(x.nombre)}${x.primal ? " ✦" : ""}</button>`).join("");
    if (r) cuerpo = `<nav class="mrg-lib-chips" aria-label="Razas">${chips}</nav>
      <article class="mrg-lib-ficha"><header class="mrg-lib-cab"><h3 class="mrg-titulo">${esc(r.nombre)}</h3>
        ${puedeCambiar("monster_race") && r.doc && r.id !== propiaR ? `<button type="button" class="mrg-btn mrg-btn--sangre" data-lib="elegir-raza" data-id="${esc(r.id)}"><i class="fa-solid fa-crown"></i> Ser ${esc(r.nombre.toLowerCase())}</button>` : edita && r.id !== propiaR && propiaR ? candado : r.id === propiaR ? `<span class="mrg-chip mrg-chip--oro"><i class="fa-solid fa-star"></i> Tu raza</span>` : ""}</header>
        <p class="mrg-lib-intro">${esc(r.texto)}</p>
        ${r.dice?.length ? `<h4 class="mrg-seccion">Así habla <small>para interpretarlo</small></h4><ul class="mrg-lib-frases">${r.dice.map(f => `<li>«${esc(f)}»</li>`).join("")}</ul>` : ""}
        ${r.nombres?.length ? `<h4 class="mrg-seccion">Nombres habituales</h4><p class="mrg-lib-nombres">${r.nombres.map(nm => `<span class="mrg-chip">${esc(nm)}</span>`).join(" ")}</p>` : ""}
        <p class="mrg-nota">La raza apenas cambia las reglas: modifica la situación y el efecto en casos extremos. ¡Elige la que te divierta! Si quieres una capacidad ancestral, habla con tu DJ.</p>
      </article>`;
  } else {
    const imp = await docsDe("wickedimpulse");
    const jue = await docsDe("revelry");
    const fila = (d, tipo) => {
      const tiene = tieneItem(actor, tipo, d.name);
      return `<article class="mrg-cap ${tiene ? "mrg-tiene" : ""}"><header><h5>${esc(d.name)}</h5>${tiene ? `<span class="mrg-chip mrg-chip--verde"><i class="fa-solid fa-check"></i> Elegido</span>` : puedeCambiar(tipo) ? `<button type="button" class="mrg-btn" data-lib="${tipo === "wickedimpulse" ? "anadir-unico-imp" : "anadir-unico-jue"}" data-uuid="${esc(d.uuid)}"><i class="fa-solid fa-check"></i> Elegir</button>` : ""}</header><p>${esc(d.system?.description ?? "")}</p></article>`;
    };
    cuerpo = `<article class="mrg-lib-ficha">
      <h4 class="mrg-seccion">Impulsos oscuros <small>elegir uno da un corazón oscuro; satisfacerlo, otro</small></h4>
      <div class="mrg-caps">${imp.filter(d => !d.system?.is_for_ua).map(d => fila(d, "wickedimpulse")).join("")}</div>
      <h4 class="mrg-seccion">Juergas <small>cómo libera estrés tu personaje</small></h4>
      <div class="mrg-caps">${jue.map(d => fila(d, "revelry")).join("")}</div></article>`;
  }
  return `<div class="mrg-libreto"><nav class="mrg-lib-tabs">${tabs}</nav>${cuerpo}</div>`;
}

/* -------------------------------------------------------------------------- */
/*  Acciones                                                                  */
/* -------------------------------------------------------------------------- */

async function reemplazar(actor, tipo, w) {
  const previos = actor.items.filter(i => i.type === tipo).map(i => i.id);
  if (previos.length) await actor.deleteEmbeddedDocuments("Item", previos);
  await actor.createEmbeddedDocuments("Item", [foundry.utils.deepClone(w.datos)]);
}

/** Procesa un clic en un elemento [data-lib]. `estado` es el objeto mutable de la vista; `refrescar` redibuja. */
export async function clicLibreto(ev, actor, estado, refrescar) {
  const t = ev.target.closest("[data-lib]");
  if (!t) return;
  ev.preventDefault();
  const a = t.dataset.lib;
  if (a === "modo") estado.modo = t.dataset.valor;
  else if (a === "voc") { estado.voc = t.dataset.valor; estado.modo = "voc"; }
  else if (a === "raza") { estado.raza = t.dataset.valor; estado.modo = "raza"; }
  else if (a === "anadir") {
    const doc = buscarUuid(t.dataset.uuid);
    if (doc && actor) {
      await actor.createEmbeddedDocuments("Item", [foundry.utils.deepClone(doc.datos)]);
      ui.notifications.info(`${actor.name} aprende «${doc.name}».`);
      // Aprender con la EXP malvada llena la gasta
      const xp = actor.system?.wickedxp, lleno = Number(xp?.value ?? 0) >= Number(xp?.max ?? 9);
      if (lleno && !estado.evolucion) { await actor.update({ "system.wickedxp.value": 0 }); ui.notifications.info(`${actor.name} gasta su EXP malvada: vuelve a 0.`); }
    }
  } else if (a === "elegir-voc") {
    const v = (await vocaciones()).find(x => x.id === t.dataset.id);
    if (v?.docCalling && actor) await reemplazar(actor, "calling", v.docCalling);
  } else if (a === "elegir-raza") {
    const r = (await razas()).find(x => x.id === t.dataset.id);
    if (r?.doc && actor) await reemplazar(actor, "monster_race", r.doc);
  } else if (a === "anadir-unico-imp" || a === "anadir-unico-jue") {
    const doc = buscarUuid(t.dataset.uuid);
    if (doc && actor) { await reemplazar(actor, a === "anadir-unico-jue" ? "revelry" : "wickedimpulse", doc); }
  }
  await refrescar();
}

/* -------------------------------------------------------------------------- */
/*  Ventana independiente                                                     */
/* -------------------------------------------------------------------------- */

const App = foundry.applications?.api?.ApplicationV2;

export class LibretosMR extends App {
  static DEFAULT_OPTIONS = {
    id: "mr-wo-libretos", tag: "div", classes: ["mrg", "mrg-ventana", "mrg-libretos"],
    window: { title: "Libretos de Wicked Ones", icon: "fa-solid fa-book-skull", resizable: true },
    position: { width: 760, height: 720 }
  };
  actor = null;
  estado = { modo: "voc" };
  constructor(actor = null, estado = {}, opciones = {}) { super(opciones); this.actor = actor; this.estado = { modo: "voc", ...estado }; }
  async _renderHTML() { return htmlLibreto(this.estado, this.actor); }
  _replaceHTML(res, cont) {
    cont.innerHTML = `<div class="mrg-libretos-cuerpo">${res}</div>`;
    cont.onclick = ev => clicLibreto(ev, this.actor, this.estado, () => this.render());
  }
}

export function abrirLibretos(actor = null, estado = {}) {
  actor ??= canvas?.tokens?.controlled?.[0]?.actor ?? game.user.character ?? null;
  foundry.applications.instances?.get?.("mr-wo-libretos")?.close?.();
  const app = new LibretosMR(actor, estado);
  app.render(true);
  return app;
}
