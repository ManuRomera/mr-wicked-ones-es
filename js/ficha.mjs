/**
 * Ficha compacta y memoria de ventanas de las hojas de Wicked Ones (hojas V1 del sistema).
 *
 * Modo compacto = re-composición real de la hoja (como la ficha compacta de CoC7): se conserva lo habitual
 * (retrato, XP, estrés, defensas, habilidades) en una sola vista y el resto pasa a secciones plegables que
 * conviven en la misma pantalla. Los nodos del DOM se MUEVEN (no se copian), así que todos los campos y
 * botones del sistema siguen funcionando; al alternar se vuelve a pintar la hoja entera.
 *
 * Estado por actor en el ajuste de cliente `ventanas`:
 *   { [actorId]: { c: 0|1, secs: { abilities: 1, ... }, full: {w,h,l,t}, comp: {w,h,l,t} } }
 */

const MOD = "mr-wicked-ones-es";
const TIPOS = new Set(["character", "minion_pack"]);
const GEOM_FULL = { w: 820, h: 970 };
const GEOM_COMP = { w: 600, h: 700 };
const SECCIONES_ABIERTAS = { abilities: 1, loadout: 1 };
const el = (tag, cls, html = "") => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};

/* -------------------------------------------------------------------------- */
/*  Estado persistente                                                        */
/* -------------------------------------------------------------------------- */

const leer = () => {
  try { return foundry.utils.deepClone(game.settings.get(MOD, "ventanas") ?? {}); } catch { return {}; }
};
async function guardar(id, parche) {
  const v = leer();
  v[id] = foundry.utils.mergeObject(v[id] ?? {}, parche, { inplace: false });
  try { await game.settings.set(MOD, "ventanas", v); } catch (e) { console.warn(`${MOD} | no se pudo guardar el estado de la ventana`, e); }
}
export function esCompacta(actor) {
  const st = leer()[actor.id];
  if (st && st.c !== undefined) return Boolean(st.c);
  try { return Boolean(game.settings.get(MOD, "compactaPorDefecto")); } catch { return false; }
}

/* -------------------------------------------------------------------------- */
/*  Alternar compacto / completo                                              */
/* -------------------------------------------------------------------------- */

async function alternar(app) {
  const actor = app.actor ?? app.document;
  const ahora = esCompacta(actor);
  const p = app.position;
  await guardar(actor.id, { [ahora ? "comp" : "full"]: { w: p.width, h: p.height, l: p.left, t: p.top } });
  await guardar(actor.id, { c: ahora ? 0 : 1 });
  const g = leer()[actor.id]?.[ahora ? "full" : "comp"] ?? (ahora ? GEOM_FULL : GEOM_COMP);
  app.setPosition({ width: g.w, height: g.h, left: g.l ?? p.left, top: g.t ?? p.top });
  app.render(true);
}

/* -------------------------------------------------------------------------- */
/*  Re-composición del DOM                                                    */
/* -------------------------------------------------------------------------- */

function chipsIdentidad(form) {
  const partes = [];
  form.querySelectorAll("table.base-info .item-block").forEach(bloque => {
    const nombres = [...bloque.querySelectorAll(".item-name")].map(n => n.textContent.trim()).filter(Boolean);
    if (nombres.length) partes.push(nombres.join(", "));
  });
  return partes;
}

function compactarPersonaje(app, form) {
  const actor = app.actor;
  const st = leer()[actor.id] ?? {};
  const secs = foundry.utils.mergeObject(foundry.utils.deepClone(SECCIONES_ABIERTAS), st.secs ?? {});
  const q = s => form.querySelector(s);
  const mover = (nodo, destino) => { if (nodo && destino) destino.appendChild(nodo); };

  form.classList.add("mr-compacta");

  /* Cabecera: retrato + nombre + identidad */
  const cab = el("div", "mrc-cab");
  const img = q("img.profile-big");
  const nombre = q("#name");
  const tipo = q(".sheet-type");
  const ident = el("div", "mrc-ident");
  mover(nombre, ident);
  const chips = el("div", "mrc-chips");
  chipsIdentidad(form).forEach(t => chips.appendChild(el("span", "mrc-chip", foundry.utils.escapeHTML(t))));
  ident.appendChild(chips);
  if (img) cab.appendChild(img);
  cab.appendChild(ident);
  const botones = el("div", "mrc-cab-botones");
  mover(tipo, botones);
  cab.appendChild(botones);

  /* «Más datos»: lo que casi nunca se toca en mesa (aspecto, amigo vil, panda, razas…) */
  const datos = el("details", "mrc-datos");
  datos.dataset.sec = "datos";
  datos.open = Boolean(secs.datos);
  datos.appendChild(el("summary", "", `<i class="fas fa-id-card"></i> Datos del personaje`));
  /* Las reglas del sistema cuelgan de `table.base-info`: se conserva esa clase en los contenedores nuevos */
  const datosTabla = el("table", "base-info mrc-datos-tabla");
  const datosCuerpo = el("td", "mrc-datos-cuerpo");
  datosTabla.appendChild(el("tbody")).appendChild(el("tr")).appendChild(datosCuerpo);
  form.querySelectorAll("table.base-info .item-block, table.base-info .text-input, table.base-info .minionpack").forEach(n => datosCuerpo.appendChild(n));
  datos.appendChild(datosTabla);

  /* Contadores: oro, EXP malvada/osada (o putrefacción, tamaño…): se mueve la fila original entera */
  const stats = el("table", "base-info mrc-stats");
  const filaXP = q("table.base-info tr.xp-stripe");
  const cuerpoStats = stats.appendChild(el("tbody"));
  if (filaXP) cuerpoStats.appendChild(filaXP);

  /* Defensas · estrés · impulsos: ya es compacto, se conserva tal cual */
  const vitales = q("#defenses-stress");
  vitales?.classList.add("mrc-vitales");

  /* Habilidades (tres atributos en columnas) */
  const atributos = q("#attributes");

  /* Panel de secciones plegables con el contenido de las pestañas */
  const cuerpo = el("div", "mrc-cuerpo");
  const titulos = {};
  form.querySelectorAll("nav.tabs a.item").forEach(a => { titulos[a.dataset.tab] = a.textContent.trim(); });
  const iconos = { abilities: "fa-skull", loadout: "fa-toolbox", duties: "fa-hammer", "character-notes": "fa-feather" };
  form.querySelectorAll("#wo-nav-container .tab").forEach(panel => {
    const clave = panel.dataset.tab;
    if (clave === "all-character-items") return;
    const sec = el("details", "mrc-sec");
    sec.dataset.sec = clave;
    sec.open = Boolean(secs[clave]);
    sec.appendChild(el("summary", "", `<i class="fas ${iconos[clave] ?? "fa-list"}"></i> ${foundry.utils.escapeHTML(titulos[clave] ?? clave)}`));
    sec.appendChild(panel);
    cuerpo.appendChild(sec);
  });

  /* Recolocar: se oculta lo original y se monta el orden compacto */
  form.querySelectorAll(":scope > .top-bar, :scope > section").forEach(n => n.classList.add("mrc-oculto"));
  const marco = el("div", "mrc-marco");
  const medio = el("div", "mrc-medio");
  marco.append(cab, stats, medio, cuerpo, datos);
  if (vitales) medio.appendChild(vitales);
  if (atributos) medio.appendChild(atributos);
  form.appendChild(marco);

  /* Memoria de secciones abiertas */
  marco.querySelectorAll("details[data-sec]").forEach(d => {
    d.addEventListener("toggle", () => guardar(actor.id, { secs: { [d.dataset.sec]: d.open ? 1 : 0 } }));
  });

  /* Descripciones largas: una línea hasta que se pulsa */
  marco.querySelectorAll("#abilities-list .item-description").forEach(d => {
    d.addEventListener("click", ev => {
      if (ev.target.closest("a, input, label, button")) return;
      d.classList.toggle("mrc-abierta");
    });
  });
}

function compactarEsbirros(app, form) {
  form.classList.add("mr-compacta", "mr-compacta-esbirros");
  form.querySelectorAll(".top-decoration, .conquest-hints").forEach(n => n.classList.add("mrc-oculto"));
}

/* -------------------------------------------------------------------------- */
/*  Memoria de posición y tamaño                                              */
/* -------------------------------------------------------------------------- */

function restaurarGeometria(app) {
  if (app._mrGeometria) return;
  app._mrGeometria = true;
  const actor = app.actor;
  const st = leer()[actor.id] ?? {};
  const g = st[esCompacta(actor) ? "comp" : "full"] ?? (esCompacta(actor) ? GEOM_COMP : null);
  if (g) app.setPosition({ width: g.w, height: g.h, ...(g.l !== undefined ? { left: g.l, top: g.t } : {}) });
}

function guardarGeometria(app) {
  const actor = app.actor;
  if (!actor || !TIPOS.has(actor.type)) return;
  const p = app.position;
  guardar(actor.id, { [esCompacta(actor) ? "comp" : "full"]: { w: p.width, h: p.height, l: p.left, t: p.top } });
}

/* -------------------------------------------------------------------------- */
/*  Registro de hooks                                                         */
/* -------------------------------------------------------------------------- */

export function registrarFicha() {
  game.settings.register(MOD, "ventanas", { scope: "client", config: false, type: Object, default: {} });
  game.settings.register(MOD, "compactaPorDefecto", {
    name: "MRWO.Settings.CompactaDefecto.Name",
    hint: "MRWO.Settings.CompactaDefecto.Hint",
    scope: "client", config: true, type: Boolean, default: false
  });

  Hooks.on("getActorSheetHeaderButtons", (app, botones) => {
    const actor = app.actor ?? app.document;
    if (!actor || !TIPOS.has(actor.type) || app.options?.classes?.includes("mrg-hoja")) return;
    const compacta = esCompacta(actor);
    botones.unshift({
      label: "",
      class: "mr-wo-compacta",
      icon: compacta ? "fas fa-expand-alt" : "fas fa-compress-alt",
      title: compacta ? "Ficha completa" : "Ficha compacta",
      onclick: () => alternar(app)
    });
  });

  Hooks.on("renderActorSheet", (app, html) => {
    const raiz = html instanceof HTMLElement ? html : html?.[0];
    const actor = app.actor;
    if (!raiz || !actor || !TIPOS.has(actor.type) || app.options?.classes?.includes("mrg-hoja")) return;
    const ventana = raiz.closest(".window-app") ?? raiz.closest(".app") ?? raiz;
    ventana.classList.toggle("mr-ventana-compacta", esCompacta(actor));
    restaurarGeometria(app);
    if (!esCompacta(actor)) return;
    const form = raiz.matches?.("form") ? raiz : raiz.querySelector("form");
    if (!form || form.classList.contains("mr-compacta")) return;
    try {
      if (actor.type === "character") compactarPersonaje(app, form);
      else compactarEsbirros(app, form);
    } catch (e) {
      console.error(`${MOD} | fallo al compactar la ficha`, e);
      form.classList.remove("mr-compacta");
    }
  });

  Hooks.on("closeActorSheet", app => { try { guardarGeometria(app); } catch (e) { /* sin estado */ } });
}
