/**
 * Automatismos de reglas de Wicked Ones que el sistema base deja a mano (se aplican en el cliente de quien tira):
 *  · Resistencia: fallo 3 de Estrés, parcial 2, éxito 1; crítico despeja 1 (libro, «Resistance Rolls»). Se aplica solo.
 *  · Estrés lleno → el personaje se desata (feral): sin desbordamiento, aviso con los pasos del libro, Corazón Oscuro y EXP Osada.
 *  · Conmoción: tras una tirada de acción o resistencia del atributo conmocionado, la conmoción se limpia («Shock clears after the roll»).
 *  · EXP de práctica: tirada con una acción SIN puntos → +1 de práctica; a la tercera, la acción sube a 1 punto.
 *  · Corazón Oscuro: botón en la tarjeta que gasta 1 corazón y tira +1D, recalculando el resultado (y corrigiendo el Estrés).
 * Todo es desactivable en Configuración → «Aplicar las reglas automáticamente».
 */
import { n, aplicarEstres, progresoPractica, evaluarResistencia, evaluarTirada } from "./core/reglas.mjs";
import { aparienciaDados } from "./dados.mjs";

const MOD = "mr-wicked-ones-es";
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const ESTADOS = ["critical", "success", "mixed", "failure"];
const TIPOS = ["ACTION", "RESISTANCE", "FORTUNE", "ENGAGEMENT", "LOOT", "CREATURE", "TRAP", "LOCK"];

/* -------------------------------------------------------------------------- */
/*  Lectura de la tarjeta de tirada del sistema                               */
/* -------------------------------------------------------------------------- */

export function leerTarjeta(contenido) {
  const doc = new DOMParser().parseFromString(String(contenido ?? ""), "text/html");
  if (!doc.querySelector(".wicked-die-tooltip, .dice-roll")) return null;
  const dados = [...doc.querySelectorAll("li.wicked-die")].map(li => Number(/wd(\d)/.exec(li.className)?.[1])).filter(Boolean);
  const estado = ESTADOS.find(c => doc.querySelector(`.die.${c}`));
  if (!dados.length || !estado) return null;
  const rotulo = doc.querySelector(".chat-label");
  const tipoTxt = (rotulo?.querySelector(".label-type")?.firstChild?.textContent ?? rotulo?.firstChild?.textContent ?? "").trim().toLowerCase();
  const tipo = TIPOS.find(k => game.i18n.localize(`FITD.ROLL.${k}.Name`).trim().toLowerCase() === tipoTxt) ?? null;
  const atribTxt = rotulo?.querySelector(".label-type") ? (rotulo.firstChild?.textContent ?? "").trim().toLowerCase() : "";
  const mortal = doc.body.innerHTML.includes(game.i18n.localize("FITD.PositionDeadly"));
  return { dados, estado, tipo, atribTxt, mortal, cero: Boolean(doc.querySelector(".zeromode, .zero-mode")) };
}

function buscarHabilidad(actor, etiqueta) {
  if (!etiqueta) return null;
  for (const [atrib, a] of Object.entries(actor.system?.attributes ?? {})) {
    for (const [hab, h] of Object.entries(a.skills ?? {})) {
      if (game.i18n.localize(h.label).trim().toLowerCase() === etiqueta) return { atrib, hab, valor: n(h.value, 0), practica: n(h.practice, 0) };
    }
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/*  Estrés y estado «desatado»                                                */
/* -------------------------------------------------------------------------- */

export async function aplicarEstresActor(actor, delta, { silencioso = false } = {}) {
  const r = aplicarEstres(actor.system?.stress?.value, delta, actor.system?.stress?.max ?? 6);
  if (r.aplicado !== 0) await actor.update({ "system.stress.value": r.nuevo });
  if (r.feral) await desatar(actor);
  if (!silencioso) ui.notifications.info(`${actor.name}: Estrés ${r.nuevo}/${actor.system?.stress?.max ?? 6}.`);
  return r;
}

async function desatar(actor) {
  try { await actor.toggleStatusEffect("mr-feral", { active: true }); } catch { /* sin estado */ }
  const { htmlTarjetaSimple } = await import("./tirada.mjs");
  const cuerpo = `<ol class="mrg-pasos">
        <li>Se detiene la partida: ¿qué es lo más <em>impulsivo</em> que puede hacer ahora? Una idea por cabeza.</li>
        <li>Decide quién interpreta: la última palabra la tiene la jugadora.</li>
        <li>Actúa de inmediato; puede usar capacidades sin gastar Estrés en esa acción.</li>
        <li>Toma un Corazón Oscuro.</li></ol>
        <p class="mrg-nota">Seguirá desatado hasta su próximo descanso: sin Estrés no tiene acceso a capacidades ni a resistencias.</p>`;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: htmlTarjetaSimple({
      tipo: "Estrés al límite", titulo: `¡${actor.name} se desata!`, subtitulo: "Feral", cuerpo, neutro: "sangre",
      botones: [
        { accion: "ganar-corazon", actorId: actor.id, icono: "fa-solid fa-heart", etiqueta: "Tomar un corazón oscuro", sangre: true },
        { accion: "marcar-osada", actorId: actor.id, icono: "fa-solid fa-bolt", etiqueta: "Marcar EXP osada" }
      ]
    }),
    flags: { [MOD]: { tarjeta: true } }
  });
}

/* -------------------------------------------------------------------------- */
/*  Reglas automáticas tras cada tirada                                       */
/* -------------------------------------------------------------------------- */

async function procesarTirada(msg) {
  if (!msg.isAuthor) return;
  if (!game.settings.get(MOD, "autoAplicar")) return;
  const t = leerTarjeta(msg.content);
  if (!t) return;
  const actor = msg.speaker?.actor ? game.actors.get(msg.speaker.actor) : null;
  if (!actor || !actor.isOwner || actor.type !== "character") return;

  const avisos = [];
  const hab = buscarHabilidad(actor, t.atribTxt);
  const cambios = {};

  if ((t.tipo === "ACTION" || t.tipo === "RESISTANCE") && hab) {
    if (actor.system.attributes[hab.atrib]?.shocked) {
      cambios[`system.attributes.${hab.atrib}.shocked`] = false;
      avisos.push(`conmoción de ${game.i18n.localize(actor.system.attributes[hab.atrib].label)} limpiada`);
    }
    if (hab.valor === 0 && !t.cero) {
      const p = progresoPractica(hab.valor, hab.practica);
      cambios[`system.attributes.${hab.atrib}.skills.${hab.hab}.practice`] = p.practica;
      if (p.sube) {
        cambios[`system.attributes.${hab.atrib}.skills.${hab.hab}.value`] = p.valor;
        avisos.push(`¡${game.i18n.localize(actor.system.attributes[hab.atrib].skills[hab.hab].label)} sube a 1 punto!`);
      } else {
        avisos.push(`práctica ${p.practica}/3 en ${game.i18n.localize(actor.system.attributes[hab.atrib].skills[hab.hab].label)}`);
      }
    }
  }
  if (Object.keys(cambios).length) await actor.update(cambios);

  if (t.tipo === "RESISTANCE" && !t.mortal) {
    const ev = evaluarResistencia("default", t.estado);
    const r = await aplicarEstresActor(actor, ev.estres, { silencioso: true });
    avisos.unshift(ev.estres < 0 ? `despeja 1 de Estrés (${r.nuevo}/6)` : `${ev.estres} de Estrés (${r.nuevo}/6) · ${ev.total ? "resiste por completo" : "resiste en parte"}`);
    await msg.setFlag(MOD, "estres", { actor: actor.id, valor: ev.estres });
  }

  if (avisos.length) {
    await ChatMessage.create({ speaker: msg.speaker, content: `<div class="mr-wo-auto"><i class="fas fa-wand-magic-sparkles"></i> <strong>${esc(actor.name)}</strong>: ${avisos.map(esc).join(" · ")}.</div>` });
  }
}

/* -------------------------------------------------------------------------- */
/*  Corazón Oscuro: +1D con recálculo                                          */
/* -------------------------------------------------------------------------- */

export async function gastarCorazonExtraDado(msg, actor) {
  const t = leerTarjeta(msg.content);
  if (!t || !actor) return ui.notifications.warn("No se puede leer esta tirada.");
  const corazones = n(actor.system?.dark_hearts?.value, 0);
  if (corazones <= 0) return ui.notifications.warn(`${actor.name} no tiene Corazones Oscuros.`);
  if (msg.getFlag(MOD, "corazonGastado")) return ui.notifications.warn("Solo se puede gastar un Corazón Oscuro por tirada.");

  const r = new Roll("1d6");
  await r.evaluate();
  aparienciaDados(r);
  if (game.dice3d) await game.dice3d.showForRoll(r);
  const extra = r.terms[0].results[0].result;
  const caras = [...t.dados, extra];
  const ev = evaluarTirada(caras, caras.length);
  await actor.update({ "system.dark_hearts.value": corazones - 1 });
  await msg.setFlag(MOD, "corazonGastado", true);

  let linea = "";
  const previo = msg.getFlag(MOD, "estres");
  if (previo && ev.estado) {
    const nuevo = evaluarResistencia("default", ev.estado).estres;
    if (nuevo !== previo.valor) {
      await aplicarEstresActor(actor, nuevo - previo.valor, { silencioso: true });
      linea = `<p>Estrés corregido: ${previo.valor} → ${nuevo}.</p>`;
    }
  }
  const etiqueta = { critical: "¡Éxito crítico!", success: "Éxito completo", mixed: "Éxito parcial", failure: "Fallo" }[ev.estado];
  await ChatMessage.create({
    speaker: msg.speaker,
    content: `<div class="dice-tooltip wicked-roll-card mr-wo-tarjeta">
      <div class="chat-label label-stripe1">Corazón Oscuro · +1D</div>
      <div class="chat-label-small label-stripe2">${esc(actor.name)} gasta 1 corazón (quedan ${corazones - 1})</div>
      <div class="die ${esc(ev.estado)}">${esc(etiqueta)}</div>
      <ol class="dice-rolls">${caras.map(d => `<li class="roll die d6 ${d === 6 ? "max" : d === 1 ? "min" : ""}">${d}</li>`).join("")}</ol>${linea}</div>`
  });
}

/* -------------------------------------------------------------------------- */
/*  Heridas y recuperación                                                    */
/* -------------------------------------------------------------------------- */

const ATRS = ["brains", "muscles", "guts"];
const FLAGS = `flags.${MOD}`;

/**
 * Recuperación (fase 1 del ciclo): se elimina todo el estrés, las conmociones y el estado reventado; se regeneran
 * las defensas y los suministros, y termina el estado desatado. En una manada de esbirros se limpia «reventada».
 */
export async function recuperar(actor, { silencioso = false } = {}) {
  if (!actor) return false;
  if (actor.type === "minion_pack") { if (actor.system.bloodied) await actor.update({ "system.bloodied": false }); return true; }
  if (actor.type !== "character") return false;
  const cambios = { "system.stress.value": 0, "system.bloodied": false, "system.supply.value": 0, [`${FLAGS}.-=heridas`]: null };
  for (const a of ATRS) cambios[`system.attributes.${a}.shocked`] = false;
  await actor.update(cambios);
  const defensas = actor.items.filter(i => i.type === "defense" && i.system.checked).map(i => ({ _id: i.id, "system.checked": false }));
  if (defensas.length) await actor.updateEmbeddedDocuments("Item", defensas);
  try { if (actor.statuses?.has?.("mr-feral")) await actor.toggleStatusEffect("mr-feral", { active: false }); } catch { /* sin estado */ }
  if (!silencioso) ui.notifications.info(`${actor.name} se recupera: sin estrés ni heridas, con defensas y suministros renovados.`);
  return true;
}

/** Recuperación de toda la mesa (monstruos y manadas). Solo la dirección. */
export async function recuperarTodos() {
  const lista = game.actors.filter(a => ["character", "minion_pack"].includes(a.type) && a.isOwner);
  for (const a of lista) await recuperar(a, { silencioso: true });
  const { htmlTarjetaSimple } = await import("./tirada.mjs");
  await ChatMessage.create({
    content: htmlTarjetaSimple({ tipo: "Fase de acecho", titulo: "Recuperación", subtitulo: `${lista.length} actores`, neutro: "azul",
      cuerpo: "<p>Se elimina todo el estrés y se curan las heridas (conmociones y reventado). Defensas y suministros se regeneran.</p>" })
  });
  return lista.length;
}

/** Reventado ↔ conmociones: reventarse da conmoción en todos los atributos; al limpiarlas todas, se deja de estar reventado. */
function acoplarHeridas(actor, cambios, userId) {
  if (actor.type !== "character" || game.user.id !== userId || !game.settings.get(MOD, "autoAplicar")) return;
  const g = k => foundry.utils.getProperty(cambios, k);
  const sh = a => g(`system.attributes.${a}.shocked`);
  if (g("system.bloodied") === true && !actor.system.bloodied) {
    for (const a of ATRS) foundry.utils.setProperty(cambios, `system.attributes.${a}.shocked`, true);
    ui.notifications.info(`${actor.name} queda reventado: conmoción en todos los atributos. Otra herida seria lo mata.`);
  } else if (actor.system.bloodied && g("system.bloodied") === undefined && ATRS.some(a => sh(a) !== undefined)) {
    if (ATRS.every(a => (sh(a) ?? actor.system.attributes[a].shocked) === false)) {
      foundry.utils.setProperty(cambios, "system.bloodied", false);
      foundry.utils.setProperty(cambios, `${FLAGS}.heridas.-=sangre`, null);
      ui.notifications.info(`${actor.name} sale adelante: ya no está reventado.`);
    }
  }
  if (g("system.bloodied") === false) foundry.utils.setProperty(cambios, `${FLAGS}.heridas.-=sangre`, null);
  for (const a of ATRS) if (sh(a) === false) foundry.utils.setProperty(cambios, `${FLAGS}.heridas.-=${a}`, null); // la herida anotada se borra con la conmoción
}

/** EXP osada completa (3): se vacía y sube un punto en una acción a elegir (máximo 3 puntos por acción). */
export async function subirAccionPorOsada(actor) {
  const { ATRIBUTOS, nombreAccion } = await import("./tirada.mjs");
  const opciones = Object.entries(ATRIBUTOS).flatMap(([at, acs]) => acs.map(a => ({ at, a, v: n(actor.system.attributes?.[at]?.skills?.[a]?.value, 0) }))).filter(o => o.v < 3);
  if (!opciones.length) return;
  const elegida = await foundry.applications.api.DialogV2.prompt({
    window: { title: "EXP osada completa" },
    content: `<p><strong>${foundry.utils.escapeHTML(actor.name)}</strong> llena su EXP osada: gana un punto en una acción (máximo 3). ¿Cuál?</p><select name="accion" style="width:100%">${opciones.map(o => `<option value="${o.at}.${o.a}">${foundry.utils.escapeHTML(nombreAccion(o.a))} (${o.v} → ${o.v + 1})</option>`).join("")}</select>`,
    ok: { label: "Subir acción", callback: (_ev, btn) => btn.form.elements.accion.value }, rejectClose: false
  });
  if (!elegida) return;
  const [at, a] = elegida.split(".");
  await actor.update({ [`system.attributes.${at}.skills.${a}.value`]: n(actor.system.attributes[at].skills[a].value, 0) + 1, "system.recklessxp.value": 0 });
  ui.notifications.info(`${actor.name}: ${nombreAccion(a)} sube a ${n(actor.system.attributes[at].skills[a].value, 0)}.`);
}

/* -------------------------------------------------------------------------- */
/*  Registro                                                                  */
/* -------------------------------------------------------------------------- */

export function registrarAutomatismos() {
  game.settings.register(MOD, "autoAplicar", {
    name: "MRWO.Settings.AutoAplicar.Name", hint: "MRWO.Settings.AutoAplicar.Hint",
    scope: "world", config: true, type: Boolean, default: true
  });
  CONFIG.statusEffects.push({ id: "mr-feral", name: "Desatado (feral)", img: "icons/svg/terror.svg" });
  Hooks.on("preUpdateActor", (actor, cambios, _o, userId) => acoplarHeridas(actor, cambios, userId));
  // Fase 1 del ciclo = recuperación: la dirección puede aplicarla a toda la mesa
  Hooks.on("updateActor", async (actor, cambios, _o, userId) => {
    if (actor.type !== "gm_sheet" || game.user.id !== userId || !game.user.isGM || !game.settings.get(MOD, "autoAplicar")) return;
    if (foundry.utils.getProperty(cambios, "system.current_phase.value") !== 1) return;
    const ok = await foundry.applications.api.DialogV2.confirm({ window: { title: "Fase de recuperación" }, content: "<p>Empieza la fase de acecho con la <strong>recuperación</strong>: se elimina todo el estrés, se curan las heridas y se regeneran defensas y suministros de todos los monstruos y manadas. ¿Aplicarlo ahora?</p>", rejectClose: false });
    if (ok) await recuperarTodos();
  });
  Hooks.on("updateActor", async (actor, cambios, _o, userId) => {
    if (actor.type !== "character" || game.user.id !== userId || !game.settings.get(MOD, "autoAplicar")) return;
    if (foundry.utils.getProperty(cambios, "system.recklessxp.value") === undefined) return;
    const r = actor.system.recklessxp;
    if (n(r?.value, 0) >= n(r?.max, 3)) await subirAccionPorOsada(actor);
  });
  Hooks.on("createChatMessage", msg => { procesarTirada(msg).catch(e => console.error(`${MOD} | automatismos`, e)); });
}
