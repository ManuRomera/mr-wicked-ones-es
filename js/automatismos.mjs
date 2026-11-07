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
/*  Registro                                                                  */
/* -------------------------------------------------------------------------- */

export function registrarAutomatismos() {
  game.settings.register(MOD, "autoAplicar", {
    name: "MRWO.Settings.AutoAplicar.Name", hint: "MRWO.Settings.AutoAplicar.Hint",
    scope: "world", config: true, type: Boolean, default: true
  });
  CONFIG.statusEffects.push({ id: "mr-feral", name: "Desatado (feral)", img: "icons/svg/terror.svg" });
  Hooks.on("createChatMessage", msg => { procesarTirada(msg).catch(e => console.error(`${MOD} | automatismos`, e)); });
}
