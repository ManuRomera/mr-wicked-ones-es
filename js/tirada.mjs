/**
 * Motor de tiradas de MR- Wicked Ones: reserva de dados, modificadores del manual (Ayudar, Darlo todo, pacto oscuro,
 * corazón oscuro, conmoción), automatismos y la tarjeta de chat «de monstruos».
 * La tarjeta se genera siempre a partir de un objeto de datos (flags.mr-wicked-ones-es.tirada), así se puede
 * redibujar, actualizar (p. ej. al gastar un corazón oscuro) y aplicar el tema oscuro y la accesibilidad.
 */
import { n, acota, evaluarTirada, evaluarResistencia, progresoPractica, probabilidades } from "./core/reglas.mjs";
import { aplicarEstresActor } from "./automatismos.mjs";
import { aplicarModoMensaje } from "./compat.mjs";

const MOD = "mr-wicked-ones-es";
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const L = (k, def = "") => { const v = game.i18n.localize(k); return v === k ? def : v; };

export const POSICIONES = ["dominant", "default", "dire", "deadly"];
export const EFECTOS = ["zero", "weak", "default", "strong"];
export const ATRIBUTOS = { brains: ["scan", "tinker", "trick"], muscles: ["finesse", "skulk", "smash"], guts: ["banter", "threaten", "invoke"] };

const CAP = s => s.charAt(0).toUpperCase() + s.slice(1);
export const nombreAccion = k => L(`FITD.Skills${CAP(k)}`, k);
export const nombreAtributo = k => L(`FITD.Skills${CAP(k)}`, k);
export const nombrePosicion = k => L(`FITD.Position${CAP(k)}`, k);
export const nombreEfecto = k => L(`FITD.Effect${CAP(k)}`, k);
export const atributoDe = accion => Object.entries(ATRIBUTOS).find(([, v]) => v.includes(accion))?.[0] ?? null;

const ESTADO = { critical: "crit", success: "exito", mixed: "parcial", failure: "fallo" };
const ESTADO_INV = { crit: "critical", exito: "success", parcial: "mixed", fallo: "failure" };
const CLASIF = { crit: "Critical", exito: "Success", parcial: "Mixed", fallo: "Failure" };
const ETIQUETA = { crit: "Crítico", exito: "Éxito", parcial: "Éxito parcial", fallo: "Fallo" };
const ICONO = { crit: "fa-crown", exito: "fa-check", parcial: "fa-circle-half-stroke", fallo: "fa-skull" };
const FRASE = {
  crit: "¡Sangre y gloria! Ve más allá de lo que querías.",
  exito: "Sin piedad: lo consigues y nadie te lo reprocha.",
  parcial: "Lo logras… pero alguien pagará el precio.",
  fallo: "Los «héroes» se cobran esta ronda."
};
const GRAVEDAD = {
  dominant: "Consecuencia molesta: un segmento de reloj.",
  default: "Consecuencia frustrante: dos segmentos de reloj.",
  dire: "Consecuencia devastadora: el reloj se llena.",
  deadly: "Situación mortal: esta consecuencia puede matarte."
};
const EFECTO_TXT = {
  strong: "Efecto potente: consigues más de lo habitual.",
  default: "",
  weak: "Efecto débil: consigues menos de lo que querías.",
  zero: "Efecto nulo: aunque aciertes, no cambia nada."
};
const TIPOS = {
  accion: { tipo: "ACTION", nombre: "Tirada de acción" },
  resistencia: { tipo: "RESISTANCE", nombre: "Tirada de resistencia" },
  fortuna: { tipo: "FORTUNE", nombre: "Tirada de fortuna" },
  implicacion: { tipo: "ENGAGEMENT", nombre: "Tirada de implicación" }
};
export const nombreTipo = t => L(`FITD.ROLL.${TIPOS[t]?.tipo ?? String(t).toUpperCase()}.Name`, TIPOS[t]?.nombre ?? t);

/* -------------------------------------------------------------------------- */
/*  Reserva de dados                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Dados base de una acción para un actor. Se calcula aquí y no con getRollData() del sistema, que lee `value[0]`
 * (da NaN cuando el valor se guardó como número). Conmoción (o «malherido» en pandas de esbirros): −1d.
 */
export function reservaDe(actor, accion) {
  const atrib = atributoDe(accion);
  const a = atrib ? actor?.system?.attributes?.[atrib] : null;
  const base = Math.max(0, n(a?.skills?.[accion]?.value, 0));
  const bono = (actor?.type === "minion_pack" ? actor?.system?.bloodied : a?.shocked) ? -1 : 0;
  return { base, bono, total: Math.max(0, base + bono) };
}

export function datosAccion(actor, accion) {
  const atrib = atributoDe(accion);
  const a = atrib ? actor?.system?.attributes?.[atrib] : null;
  return { atrib, conmocion: Boolean(a?.shocked), valor: n(a?.skills?.[accion]?.value, 0), practica: n(a?.skills?.[accion]?.practice, 0) };
}

function mover(lista, v, paso) {
  return lista[acota(lista.indexOf(v) + paso, 0, lista.length - 1)];
}

/** Aplica Ayudar / Darlo todo a posición y efecto (manual, «Alterar las tiradas»). */
export function ajustar({ posicion = "default", efecto = "default", ayuda = false, todo = false }) {
  let p = posicion, e = efecto;
  if (ayuda) e = mover(EFECTOS, e, 1);
  if (todo) { e = mover(EFECTOS, e, 1); p = mover(POSICIONES, p, 1); }
  return { posicion: p, efecto: e };
}

/* -------------------------------------------------------------------------- */
/*  Lanzar                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Lanza una tirada y publica la tarjeta.
 * @param {Actor} actor
 * @param {object} c { tipo, accion, dadosBase, posicion, efecto, ayuda, todo, pacto, corazon, extra, titulo, nota }
 */
export async function tirar(actor, c = {}) {
  const tipo = c.tipo ?? "accion";
  const accion = c.accion ?? null;
  const info = accion && actor ? datosAccion(actor, accion) : { atrib: null, conmocion: false, valor: 0, practica: 0 };
  const res = accion && actor ? reservaDe(actor, accion) : { base: n(c.dadosBase, 0), bono: 0, total: Math.max(0, n(c.dadosBase, 0)) };

  const mods = [];
  let dados = res.base;
  if (res.bono) { dados += res.bono; mods.push({ id: "conmocion", txt: `Conmoción: ${res.bono}d`, d: res.bono }); }
  if (c.pacto) { dados += 1; mods.push({ id: "pacto", txt: "Pacto oscuro: +1d", d: 1 }); }
  const corazones = n(actor?.system?.dark_hearts?.value, 0);
  const gastaCorazon = Boolean(c.corazon) && corazones > 0;
  if (gastaCorazon) { dados += 1; mods.push({ id: "corazon", txt: "Corazón oscuro: +1d", d: 1 }); }
  const gastaMoral = Boolean(c.moral) && actor?.type === "minion_pack" && Boolean(actor.system?.morale);
  if (gastaMoral) { dados += 1; mods.push({ id: "moral", txt: "Moral: +1d", d: 1 }); }
  if (n(c.extra, 0)) { dados += n(c.extra); mods.push({ id: "extra", txt: `Otros: ${n(c.extra) > 0 ? "+" : ""}${n(c.extra)}d`, d: n(c.extra) }); }
  dados = Math.max(0, dados);

  const accionable = tipo === "accion";
  let pe = { posicion: c.posicion ?? "default", efecto: c.efecto ?? "default" };
  const base = { ...pe };
  if (accionable) {
    pe = ajustar({ ...pe, ayuda: c.ayuda, todo: c.todo });
    if (c.ayuda) mods.push({ id: "ayuda", txt: "Ayuda de un aliado: +efecto", d: 0 });
    if (c.todo) mods.push({ id: "todo", txt: "Darlo todo: +efecto, −situación", d: 0 });
  }

  const cero = dados <= 0;
  const roll = new Roll(`${cero ? 2 : dados}d6`);
  await roll.evaluate();
  if (game.dice3d) { try { await game.dice3d.showForRoll(roll, game.user, true); } catch { /* sin Dice So Nice */ } }
  const caras = roll.terms[0].results.map(r => r.result);
  const ev = evaluarTirada(caras, dados);
  const estado = ESTADO[ev.estado];

  const efectos = [];
  const auto = game.settings.get(MOD, "autoAplicar");
  const cambios = {};
  const titulo = c.titulo ?? (accion ? nombreAccion(accion) : nombreTipo(tipo));

  if (gastaMoral) {
    cambios["system.morale"] = false;
    efectos.push({ icono: "fa-flag", txt: "La manada gasta su punto de moral." });
  }
  if (gastaCorazon) {
    cambios["system.dark_hearts.value"] = corazones - 1;
    efectos.push({ icono: "fa-heart", txt: `Gastas un corazón oscuro (quedan ${corazones - 1}).` });
  }
  if (auto && actor && (tipo === "accion" || tipo === "resistencia") && info.atrib) {
    if (info.conmocion) {
      cambios[`system.attributes.${info.atrib}.shocked`] = false;
      efectos.push({ icono: "fa-bolt", txt: `La conmoción de ${nombreAtributo(info.atrib)} se limpia tras la tirada.` });
    }
    if (info.valor === 0 && actor.type === "character") {
      const p = progresoPractica(info.valor, info.practica);
      cambios[`system.attributes.${info.atrib}.skills.${accion}.practice`] = p.practica;
      if (p.sube) {
        cambios[`system.attributes.${info.atrib}.skills.${accion}.value`] = p.valor;
        efectos.push({ icono: "fa-arrow-up", txt: `¡${nombreAccion(accion)} sube a 1 punto!` });
      } else efectos.push({ icono: "fa-dumbbell", txt: `Práctica ${p.practica}/3 en ${nombreAccion(accion)}.` });
    }
  }
  let estresDelta = 0;
  const mortal = pe.posicion === "deadly";
  if (auto && actor && tipo === "resistencia" && !mortal) {
    const r = evaluarResistencia("default", ev.estado);
    estresDelta = r.estres;
    efectos.push({ icono: "fa-brain", txt: r.estres < 0 ? "Despejas 1 de Estrés y resistes por completo." : `Pagas ${r.estres} de Estrés (${r.total ? "resistes por completo" : "resistes solo en parte"}).`, estres: r.estres });
  }

  const datos = {
    v: 1, tipo, titulo, atributo: info.atrib ? nombreAtributo(info.atrib) : "", accion,
    actor: actor?.name ?? "", actorId: actor?.id ?? null,
    caras, cero, estado, posicion: pe.posicion, efecto: pe.efecto, posicionBase: base.posicion, efectoBase: base.efecto,
    pool: { base: res.base, total: dados }, mods, efectos, nota: c.nota ?? "", mortal
  };

  const msg = {
    user: game.user.id,
    speaker: actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker(),
    content: htmlTarjeta(datos), sound: CONFIG.sounds?.dice, rolls: [roll],
    flags: { [MOD]: { tirada: datos } }
  };
  aplicarModoMensaje(msg);
  const mensaje = await ChatMessage.create(msg);

  // Efectos sobre el actor (tras publicar, para que la tarjeta salga aunque falle un permiso)
  if (actor && Object.keys(cambios).length) await actor.update(cambios).catch(e => console.warn(`${MOD} | tirada: no se pudo actualizar`, e));
  if (actor && estresDelta) await aplicarEstresActor(actor, estresDelta, { silencioso: true });
  return { mensaje, datos };
}

/** Gasta un corazón oscuro sobre una tarjeta ya publicada: +1d, se recalcula y la tarjeta se actualiza. */
export async function gastarCorazon(mensaje) {
  const d = foundry.utils.deepClone(mensaje.getFlag(MOD, "tirada"));
  const actor = game.actors.get(d?.actorId);
  if (!d || !actor) return ui.notifications.warn("No se puede leer esta tirada.");
  if (d.mods?.some(m => m.id === "corazon")) return ui.notifications.warn("Solo se puede gastar un corazón oscuro por tirada.");
  const corazones = n(actor.system?.dark_hearts?.value, 0);
  if (corazones <= 0) return ui.notifications.warn(`${actor.name} no tiene corazones oscuros.`);

  const r = new Roll("1d6");
  await r.evaluate();
  if (game.dice3d) { try { await game.dice3d.showForRoll(r, game.user, true); } catch { /* ok */ } }
  const nueva = r.terms[0].results[0].result;
  const antes = d.estado;
  // Con 0d la tirada era «2d, el menor»: con el dado extra pasa a ser una tirada normal de 1d
  d.caras = d.cero ? [nueva] : [...d.caras, nueva];
  const ev = evaluarTirada(d.caras, d.caras.length);
  d.cero = false;
  d.estado = ESTADO[ev.estado];
  d.pool = { ...d.pool, total: d.caras.length };
  d.mods = [...(d.mods ?? []), { id: "corazon", txt: "Corazón oscuro: +1d", d: 1 }];
  d.efectos = [...(d.efectos ?? []), { icono: "fa-heart", txt: `Gastas un corazón oscuro (quedan ${corazones - 1}).` }];
  await actor.update({ "system.dark_hearts.value": corazones - 1 });

  if (d.tipo === "resistencia" && antes !== d.estado) {
    const a = evaluarResistencia("default", ESTADO_INV[antes]).estres;
    const b = evaluarResistencia("default", ESTADO_INV[d.estado]).estres;
    if (a !== b) {
      await aplicarEstresActor(actor, b - a, { silencioso: true });
      d.efectos.push({ icono: "fa-brain", txt: `Estrés corregido: ${a} → ${b}.` });
    }
  }
  await mensaje.update({ content: htmlTarjeta(d), flags: { [MOD]: { tirada: d } } });
}

/* -------------------------------------------------------------------------- */
/*  Tarjeta                                                                   */
/* -------------------------------------------------------------------------- */

const dadoHTML = (v, cls = "") => `<span class="mrg-dado ${cls}" data-v="${v}"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>`;

/** Qué dados cuentan: el mayor (o los dos 6 de un crítico); en modo cero, el menor. */
function dadosClave(caras, cero) {
  if (cero) return new Set([caras.indexOf(Math.min(...caras))]);
  const max = Math.max(...caras);
  const idx = caras.map((c, i) => (c === max ? i : -1)).filter(i => i >= 0);
  return new Set(max === 6 ? idx.slice(0, 2) : idx.slice(0, 1));
}

export function htmlTarjeta(d, { vista = false } = {}) {
  const e = d.estado;
  const clave = dadosClave(d.caras, d.cero);
  const dados = d.caras.map((c, i) => dadoHTML(c, clave.has(i) ? "mrg-mejor" : "mrg-apagado")).join("");
  const etiqueta = L(`FITD.ROLL.${CLASIF[e]}`, ETIQUETA[e]);
  const tipoKey = TIPOS[d.tipo]?.tipo ?? String(d.tipo).toUpperCase();
  let regla = L(`FITD.ROLL.${tipoKey}.${CLASIF[e]}`, "");
  if (d.tipo === "resistencia" && d.posicion === "deadly" && (e === "fallo" || e === "parcial")) regla = L(`FITD.ROLL.RESISTDEATH.${CLASIF[e]}`, regla);

  const accionable = d.tipo === "accion";
  const chips = [];
  if (accionable) {
    if (d.posicion === "default" && d.efecto === "default") chips.push(`<span class="mrg-chip">Igualdad de condiciones</span>`);
    else {
      chips.push(`<span class="mrg-chip ${d.posicion === "dire" || d.posicion === "deadly" ? "mrg-chip--sangre" : d.posicion === "dominant" ? "mrg-chip--verde" : ""}"><i class="fa-solid fa-scale-unbalanced"></i> ${esc(nombrePosicion(d.posicion))}</span>`);
      chips.push(`<span class="mrg-chip ${d.efecto === "strong" ? "mrg-chip--verde" : d.efecto === "default" ? "" : "mrg-chip--oro"}"><i class="fa-solid fa-burst"></i> Efecto ${esc(nombreEfecto(d.efecto).toLowerCase())}</span>`);
    }
  }
  for (const m of d.mods ?? []) chips.push(`<span class="mrg-chip mrg-chip--oro">${esc(m.txt)}</span>`);

  let consecuencia = "";
  if (accionable && (e === "parcial" || e === "fallo")) consecuencia += `<p class="mrg-card-consec"><i class="fa-solid fa-triangle-exclamation"></i> ${esc(GRAVEDAD[d.posicion] ?? "")}</p>`;
  if (accionable && e !== "fallo" && EFECTO_TXT[d.efecto]) consecuencia += `<p class="mrg-card-consec mrg-card-consec--efecto">${esc(EFECTO_TXT[d.efecto])}</p>`;

  const efectos = (d.efectos ?? []).map(x => `<li><i class="fa-solid ${esc(x.icono ?? "fa-bolt")}"></i> ${esc(x.txt)}</li>`).join("");
  const reserva = d.cero ? "0d: se tiran 2d y cuenta el menor" : `${d.pool?.total ?? d.caras.length}d`;

  const botones = [];
  if (!vista && d.actorId) {
    if (accionable && (e === "parcial" || e === "fallo")) botones.push(`<button type="button" class="mrg-btn mrg-btn--sangre" data-mr-accion="resistir" data-actor-id="${esc(d.actorId)}" data-excluir="${esc(d.accion ?? "")}"><i class="fa-solid fa-shield-halved"></i> Resistir la consecuencia</button>`);
    if ((d.tipo === "accion" || d.tipo === "resistencia") && !(d.mods ?? []).some(m => m.id === "corazon")) botones.push(`<button type="button" class="mrg-btn" data-mr-accion="corazon-extra" data-actor-id="${esc(d.actorId)}"><i class="fa-solid fa-heart"></i> Gastar corazón oscuro (+1d)</button>`);
  }

  return `<article class="mrg mrg-card" data-estado="${e}" data-tipo="${esc(d.tipo)}">
  <header class="mrg-card-cab">
    <span class="mrg-card-tipo">${esc(nombreTipo(d.tipo))}</span>
    <h4 class="mrg-card-titulo">${esc(d.titulo)}</h4>
    <span class="mrg-card-quien">${d.atributo ? `${esc(d.atributo)} · ` : ""}${esc(d.actor)}</span>
  </header>
  <div class="mrg-card-dados" role="img" aria-label="Dados: ${d.caras.join(", ")}. ${d.cero ? "Cuenta el menor." : "Cuenta el mayor."}">${dados}</div>
  <div class="mrg-veredicto" data-estado="${e}"><i class="fa-solid ${ICONO[e]}" aria-hidden="true"></i><strong>${esc(etiqueta)}</strong></div>
  <p class="mrg-card-frase">${esc(FRASE[e])}</p>
  ${chips.length ? `<div class="mrg-card-chips">${chips.join("")}</div>` : ""}
  ${consecuencia}
  ${regla ? `<p class="mrg-card-regla">${regla}</p>` : ""}
  <p class="mrg-card-reserva">${esc(reserva)}${d.nota ? ` · ${esc(d.nota)}` : ""}</p>
  ${efectos ? `<ul class="mrg-card-efectos">${efectos}</ul>` : ""}
  ${botones.length ? `<footer class="mrg-card-acciones">${botones.join("")}</footer>` : ""}
</article>`;
}

/**
 * Tarjeta simple del mismo estilo para lo que no es una tirada de acción: ciclo de partida, oráculos, estados.
 * @param {object} t { tipo, titulo, subtitulo, estado: "critical"|"success"|"mixed"|"failure"|null, caras: number[], cuerpo (HTML), botones: [...], neutro: "sangre"|"azul" }
 */
export function htmlTarjetaSimple({ tipo = "", titulo = "", subtitulo = "", estado = null, caras = [], cuerpo = "", botones = [], neutro = "azul" } = {}) {
  const e = estado ? (ESTADO[estado] ?? estado) : null;
  const dados = caras.length ? `<div class="mrg-card-dados" role="img" aria-label="Dados: ${caras.join(", ")}">${caras.map(c => dadoHTML(c, c === Math.max(...caras) ? "mrg-mejor" : "mrg-apagado")).join("")}</div>` : "";
  const sello = e ? `<div class="mrg-veredicto" data-estado="${e}"><i class="fa-solid ${ICONO[e]}" aria-hidden="true"></i><strong>${esc(L(`FITD.ROLL.${CLASIF[e]}`, ETIQUETA[e]))}</strong></div>` : "";
  const btns = botones.length ? `<footer class="mrg-card-acciones">${botones.map(b => `<button type="button" class="mrg-btn ${b.sangre ? "mrg-btn--sangre" : ""}" data-mr-accion="${esc(b.accion)}" ${b.actorId ? `data-actor-id="${esc(b.actorId)}"` : ""} ${b.valor !== undefined ? `data-valor="${esc(b.valor)}"` : ""} ${b.extra ? `data-extra="${esc(b.extra)}"` : ""}><i class="${esc(b.icono || "fa-solid fa-dice")}"></i> ${esc(b.etiqueta)}</button>`).join("")}</footer>` : "";
  return `<article class="mrg mrg-card" data-estado="${e ?? "neutro-" + neutro}" data-tipo="simple">
  <header class="mrg-card-cab">${tipo ? `<span class="mrg-card-tipo">${esc(tipo)}</span>` : ""}<h4 class="mrg-card-titulo">${esc(titulo)}</h4>${subtitulo ? `<span class="mrg-card-quien">${esc(subtitulo)}</span>` : ""}</header>
  ${dados}${sello}
  ${cuerpo ? `<div class="mrg-card-cuerpo">${cuerpo}</div>` : ""}
  ${btns}
</article>`;
}

/* -------------------------------------------------------------------------- */
/*  Tarjetas del sistema → estilo MR (se redibujan al mostrarse, sin tocar el mensaje)                        */
/* -------------------------------------------------------------------------- */

const TIPO_POR_TEXTO = () => Object.fromEntries(Object.entries(TIPOS).map(([k, v]) => [L(`FITD.ROLL.${v.tipo}.Name`, v.nombre).trim().toLowerCase(), k]));

function leerTarjetaSistema(contenido) {
  const doc = new DOMParser().parseFromString(String(contenido ?? ""), "text/html");
  if (!doc.querySelector(".wicked-die-tooltip")) return null;
  const caras = [...doc.querySelectorAll("li.wicked-die")].map(li => Number(/wd(\d)/.exec(li.className)?.[1])).filter(Boolean);
  const estadoC = ["critical", "success", "mixed", "failure"].find(c => doc.querySelector(`.die.${c}`));
  if (!caras.length || !estadoC) return null;
  const rot = doc.querySelector(".chat-label");
  const tipoTxt = (rot?.querySelector(".label-type")?.firstChild?.textContent ?? rot?.firstChild?.textContent ?? "").trim().toLowerCase();
  const tipo = TIPO_POR_TEXTO()[tipoTxt] ?? "fortuna";
  const rotulo = rot?.querySelector(".label-type") ? (rot.firstChild?.textContent ?? "").trim() : "";
  const quien = (rot?.querySelector(".label-type")?.textContent ?? rot?.textContent ?? "").match(/(?:Para|For)\s+(.+)$/i)?.[1]?.trim() ?? "";
  const peTxt = doc.querySelector(".chat-label-small")?.textContent ?? "";
  const pos = POSICIONES.find(p => peTxt.includes(nombrePosicion(p))) ?? "default";
  const efe = EFECTOS.find(x => peTxt.includes(nombreEfecto(x))) ?? "default";
  const cero = Boolean(doc.querySelector(".zero-hint"));
  return {
    v: 1, tipo, titulo: rotulo || nombreTipo(tipo), atributo: "", accion: null, actor: quien, actorId: null,
    caras, cero, estado: ESTADO[estadoC], posicion: pos, posicionBase: pos, efecto: efe, efectoBase: efe,
    pool: { base: cero ? 0 : caras.length, total: cero ? 0 : caras.length }, mods: [], efectos: [], nota: "", mortal: pos === "deadly"
  };
}

/** Enlaza los botones de una tarjeta (Resistir, Gastar corazón oscuro). */
function enlazarBotones(raiz, msg) {
  raiz.querySelectorAll(".mrg-card [data-mr-accion]").forEach(btn => {
    if (btn.dataset.enlazado) return;
    btn.dataset.enlazado = "1";
    btn.addEventListener("click", async ev => {
      ev.preventDefault();
      const actor = game.actors.get(btn.dataset.actorId);
      if (!actor?.isOwner) return ui.notifications.warn("Solo quien lleva a este personaje puede pulsarlo.");
      if (btn.dataset.mrAccion === "resistir") {
        const { abrirTirada } = await import("./tirada-dialogo.mjs");
        abrirTirada(actor, { tipo: "resistencia", excluir: btn.dataset.excluir || null });
      } else if (btn.dataset.mrAccion === "corazon-extra") {
        if (msg.getFlag(MOD, "tirada")) await gastarCorazon(msg);
        else { const { gastarCorazonExtraDado } = await import("./automatismos.mjs"); await gastarCorazonExtraDado(msg, actor); }
      }
    });
  });
}

export function registrarTarjetas() {
  // Redibuja las tarjetas del sistema (y marca las de este módulo) con el estilo MR si el ajuste está activo.
  Hooks.on("renderChatMessageHTML", (msg, html) => {
    const raiz = html instanceof HTMLElement ? html : html?.[0];
    if (!raiz) return;
    if (msg.getFlag?.(MOD, "tirada")) { raiz.classList.add("mrg-msg"); enlazarBotones(raiz, msg); return; }
    if (msg.getFlag?.(MOD, "tarjeta")) { raiz.classList.add("mrg-msg"); return; }
    if (game.settings.get(MOD, "estiloTiradas") !== "mr") return;
    const d = leerTarjetaSistema(msg.content);
    if (!d) return;
    const cont = raiz.querySelector(".message-content");
    if (!cont) return;
    d.actorId = msg.speaker?.actor ?? null;
    if (!d.actor) d.actor = msg.speaker?.alias ?? "";
    cont.innerHTML = htmlTarjeta(d, { vista: !d.actorId });
    raiz.classList.add("mrg-msg");
    enlazarBotones(raiz, msg);
  });
}

export { probabilidades };
