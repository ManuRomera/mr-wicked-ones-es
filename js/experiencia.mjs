/**
 * Ventana de experiencia de un monstruo (manual, pág. 78-80). Al final de cada sesión se repasan los desencadenantes:
 * cada uno que se haya cumplido da 1 EXP malvada, y interpretar un desate o quedar reventado da 1 EXP osada.
 * La segunda pestaña explica en qué se gasta la experiencia cuando se llenan las barras.
 */
import { n } from "./core/reglas.mjs";
import { subirAccionPorOsada } from "./automatismos.mjs";
import { abrirLibretos } from "./libretos.mjs";

const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const App = foundry.applications?.api?.ApplicationV2;

const MALVADA = [
  ["plan", "fa-map", "¿Progresasteis en vuestro plan maestro?", "¿Cómo os ayudó esta sesión a alcanzar el siguiente paso? Lo activa todo el grupo: todos los jugadores ganan la EXP, aunque no intervinieran mucho."],
  ["escena", "fa-people-arrows", "¿Participaste en la escena de mazmorra de otra persona?", "¿Cómo le ayudaste a pasar el tiempo entre incursiones e invasiones, con momentos interesantes de la rutina de un monstruo?"],
  ["monstruo", "fa-paw", "¿Actuaste como un monstruo?", "Con tus acciones, ¿lograste reflejar que eres un monstruo y no un humano? Se activa haciendo cosas que a los humanos no se les ocurriría hacer."],
  ["equipo", "fa-toolbox", "¿Usaste tu equipo o tus suministros de forma creativa?", "¿Cómo usaste tus preciadas posesiones? Recompensa la originalidad y usar las herramientas de un modo distinto al habitual."]
];

export class ExperienciaMR extends App {
  static DEFAULT_OPTIONS = {
    id: "mr-wo-experiencia", tag: "div", classes: ["mrg", "mrg-ventana", "mrg-xp-app"],
    window: { title: "Experiencia", icon: "fa-solid fa-star", resizable: true }, position: { width: 560, height: "auto" }
  };

  constructor(actor) {
    super();
    this.actor = actor;
    this.pestana = "ganar";
    this.resp = {};   // clave → true | false
    this.notas = {};
    this.options.window.title = `Experiencia · ${actor.name}`;
  }

  get #xp() {
    const s = this.actor.system;
    return { m: n(s.wickedxp?.value, 0), mMax: n(s.wickedxp?.max, 9), o: n(s.recklessxp?.value, 0), oMax: n(s.recklessxp?.max, 3) };
  }

  async _renderHTML() {
    const x = this.#xp;
    const tabs = [["ganar", "Ganar", "fa-circle-plus"], ["gastar", "Gastar", "fa-hand-holding-dollar"]]
      .map(([k, t, i]) => `<button type="button" class="mrg-btn ${this.pestana === k ? "mrg-activo" : ""}" data-pestana="${k}" aria-pressed="${this.pestana === k}"><i class="fa-solid ${i}"></i> ${t}</button>`).join("");
    const barra = (v, mx, oro) => `<span class="mrg-xp-mini ${oro ? "oro" : ""}" role="img" aria-label="${v} de ${mx}">${Array.from({ length: mx }, (_, i) => `<i class="${i < v ? "on" : ""}"></i>`).join("")}</span>`;
    const cab = `<div class="mrg-xp-cab"><span><b>EXP malvada</b> ${x.m}/${x.mMax} ${barra(x.m, x.mMax, true)}</span><span><b>EXP osada</b> ${x.o}/${x.oMax} ${barra(x.o, x.oMax, false)}</span></div>`;
    return `<div class="mrg-xp-v">${cab}<nav class="mrg-lib-tabs">${tabs}</nav>${this.pestana === "ganar" ? this.#ganar(x) : this.#gastar(x)}</div>`;
  }

  #sino(clave) {
    const r = this.resp[clave];
    return `<div class="mrg-sino" role="group"><button type="button" class="mrg-chipbtn ${r === true ? "mrg-sel" : ""}" data-resp="${clave}:1" aria-pressed="${r === true}"><i class="fa-solid fa-check"></i> Sí</button><button type="button" class="mrg-chipbtn ${r === false ? "mrg-sel" : ""}" data-resp="${clave}:0" aria-pressed="${r === false}"><i class="fa-solid fa-xmark"></i> No</button></div>`;
  }

  #ganar(x) {
    const si = MALVADA.filter(([k]) => this.resp[k] === true).length;
    const osada = this.resp.osada === true ? 1 : 0;
    const filas = MALVADA.map(([k, ic, q, ayuda]) => `<article class="mrg-xp-q"><header><i class="fa-solid ${ic}"></i><h5>${q}</h5>${this.#sino(k)}</header><p class="mrg-nota">${ayuda}</p>${this.resp[k] === true ? `<input type="text" data-nota="${k}" value="${esc(this.notas[k] ?? "")}" placeholder="Cómo sucedió (opcional)">` : ""}</article>`).join("");
    return `<p class="mrg-asist-intro">Al final de la sesión, repasad los desencadenantes. <strong>Cada «Sí» da 1 EXP malvada.</strong> Decide el jugador: no des por hecho que los cumplirás todos y, si no se te ocurre nada rápido, pasa al siguiente.</p>
      ${filas}
      <article class="mrg-xp-q mrg-xp-q--osada"><header><i class="fa-solid fa-fire"></i><h5>¿Te desataste o acabaste reventado, y lo interpretaste?</h5>${this.#sino("osada")}</header><p class="mrg-nota">Da 1 EXP osada (solo una por sesión). Hay que representarlo en la historia: cómo de herido estás, o cómo se te va la cabeza.</p></article>
      <footer class="mrg-xp-pie"><span>Ganarás <b>+${si}</b> EXP malvada${osada ? " y <b>+1</b> EXP osada" : ""}.</span><button type="button" class="mrg-btn mrg-btn--sangre" data-aplicar ${si || osada ? "" : "disabled"}><i class="fa-solid fa-star"></i> Anotar experiencia</button></footer>`;
  }

  #gastar(x) {
    const mLlena = x.m >= x.mMax, oLlena = x.o >= x.oMax;
    return `<p class="mrg-asist-intro">La experiencia se gasta al completar cada barra. Esto es lo que desbloquea cada una:</p>
      <article class="mrg-xp-q ${mLlena ? "mrg-xp-q--lista" : ""}"><header><i class="fa-solid fa-graduation-cap"></i><h5>EXP malvada completa <small>${x.m}/${x.mMax}</small></h5></header>
        <p>Aprendes <strong>una capacidad de vocación</strong> nueva de tu libreto (y la barra se vacía al elegirla). También puedes aprender una única capacidad de la lista de otra vocación, pero no una capacidad principal.</p>
        <button type="button" class="mrg-btn ${mLlena ? "mrg-btn--sangre" : ""}" data-gasto="malvada" ${mLlena ? "" : "disabled"}><i class="fa-solid fa-book-skull"></i> ${mLlena ? "Elegir capacidad" : `Te faltan ${x.mMax - x.m}`}</button></article>
      <article class="mrg-xp-q ${oLlena ? "mrg-xp-q--lista" : ""}"><header><i class="fa-solid fa-dice"></i><h5>EXP osada completa <small>${x.o}/${x.oMax}</small></h5></header>
        <p>Ganas <strong>un punto en una acción</strong> a tu elección (el máximo es 3 por acción) y la barra se vacía.</p>
        <button type="button" class="mrg-btn ${oLlena ? "mrg-btn--sangre" : ""}" data-gasto="osada" ${oLlena ? "" : "disabled"}><i class="fa-solid fa-arrow-up"></i> ${oLlena ? "Subir una acción" : `Te faltan ${x.oMax - x.o}`}</button></article>
      <article class="mrg-xp-q"><header><i class="fa-solid fa-dumbbell"></i><h5>EXP de práctica</h5></header>
        <p>Cada vez que haces una tirada de acción <em>o de resistencia</em> con una acción que no tiene puntos, marcas 1 de práctica en ella (también si añades dados extra). Con la tercera marca, la acción sube a 1 punto. Se marca sola al tirar.</p></article>`;
  }

  _replaceHTML(res, cont) {
    cont.innerHTML = res;
    cont.onclick = async ev => {
      const b = ev.target.closest("button");
      if (!b || b.disabled) return;
      if (b.dataset.pestana) { this.pestana = b.dataset.pestana; return this.render(); }
      if (b.dataset.resp) { const [k, v] = b.dataset.resp.split(":"); this.resp[k] = this.resp[k] === (v === "1") ? undefined : v === "1"; return this.render(); }
      if ("aplicar" in b.dataset) return this.#aplicar();
      if (b.dataset.gasto === "malvada") { abrirLibretos(this.actor, { modo: "voc" }); return this.close(); }
      if (b.dataset.gasto === "osada") { await subirAccionPorOsada(this.actor); return this.render(); }
    };
    cont.querySelectorAll("[data-nota]").forEach(i => i.addEventListener("input", () => { this.notas[i.dataset.nota] = i.value; }));
  }

  async #aplicar() {
    const x = this.#xp;
    const si = MALVADA.filter(([k]) => this.resp[k] === true);
    const m = Math.min(x.mMax, x.m + si.length), o = Math.min(x.oMax, x.o + (this.resp.osada === true ? 1 : 0));
    await this.actor.update({ "system.wickedxp.value": m, "system.recklessxp.value": o });
    const notas = si.map(([k, , q]) => `<li>${esc(q.replace(/^¿|\?$/g, ""))}${this.notas[k] ? `: <em>${esc(this.notas[k])}</em>` : ""}</li>`).join("");
    const { htmlTarjetaSimple } = await import("./tirada.mjs");
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }), flags: { "mr-wicked-ones-es": { tarjeta: true } },
      content: htmlTarjetaSimple({ tipo: "Experiencia", titulo: this.actor.name, subtitulo: `EXP malvada +${si.length}${this.resp.osada === true ? " · EXP osada +1" : ""}`, neutro: "azul",
        cuerpo: `${notas ? `<ul>${notas}</ul>` : ""}<p class="mrg-nota">Malvada ${m}/${x.mMax} · Osada ${o}/${x.oMax}${m >= x.mMax ? " · ¡puede aprender una capacidad!" : ""}</p>` })
    });
    this.resp = {}; this.notas = {};
    this.pestana = (m >= x.mMax || o >= x.oMax) ? "gastar" : "ganar";
    this.render();
  }
}

export function abrirExperiencia(actor) {
  const previa = foundry.applications.instances?.get?.("mr-wo-experiencia");
  if (previa?.actor === actor) { previa.render(true); return previa; }
  previa?.close?.();
  const app = new ExperienciaMR(actor);
  app.render(true);
  return app;
}

/** Se redibuja cuando cambia el actor (las barras de EXP). */
export function registrarExperiencia() {
  Hooks.on("updateActor", actor => {
    const app = foundry.applications.instances?.get?.("mr-wo-experiencia");
    if (app?.actor === actor) app.render();
  });
}
