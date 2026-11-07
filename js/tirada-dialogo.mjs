/**
 * Diálogo de tirada de MR- Wicked Ones (ApplicationV2). Se inspira en los lanzadores FitD genéricos:
 * eliges acción, trucos del manual y la tirada sale al pulsar la casilla donde se cruzan Situación y Efecto.
 */
import { n, probabilidades } from "./core/reglas.mjs";
import { POSICIONES, EFECTOS, ATRIBUTOS, nombreAccion, nombreAtributo, nombrePosicion, nombreEfecto, reservaDe, datosAccion, ajustar, tirar } from "./tirada.mjs";

const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const App = foundry.applications?.api?.ApplicationV2;
const CLAVE = "mr-wicked-ones-es.tirada.ultimo";

const ACCIONES_AWAKENED = { brains: ATRIBUTOS.brains, muscles: ATRIBUTOS.muscles, guts: ["horrify", "command", "invoke"] };
const accionesDe = actor => (actor?.system?.pc_type === "awakened" || actor?.system?.mp_type === "undead" ? ACCIONES_AWAKENED : ATRIBUTOS);
const memoria = () => { try { return JSON.parse(localStorage.getItem(CLAVE) || "{}"); } catch { return {}; } };
const guardar = o => { try { localStorage.setItem(CLAVE, JSON.stringify({ ...memoria(), ...o })); } catch { /* sin almacenamiento */ } };

const dadoMini = (v = 6) => `<span class="mrg-dado mrg-mini" data-v="${v}"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>`;

export class TiradaMR extends App {
  static DEFAULT_OPTIONS = {
    id: "mr-wo-tirada",
    tag: "div",
    classes: ["mrg", "mrg-ventana", "mrg-tirada"],
    window: { title: "Tirada", icon: "fa-solid fa-dice-d6", resizable: false },
    position: { width: 620, height: "auto" },
    actions: {
      tipo: TiradaMR.#tipo, accion: TiradaMR.#accion, truco: TiradaMR.#truco, celda: TiradaMR.#celda,
      tirar: TiradaMR.#tirarYa, dados: TiradaMR.#dados, mortal: TiradaMR.#mortal
    }
  };

  /** @type {Actor|null} */
  actor = null;
  e = { tipo: "accion", accion: null, ayuda: false, todo: false, pacto: false, corazon: false, extra: 0, posicion: "default", efecto: "default", mortal: false, moral: false, dadosFortuna: 2 };

  constructor(actor, inicial = {}, options = {}) {
    super(options);
    this.actor = actor;
    const m = memoria();
    this.e = { ...this.e, tipo: inicial.tipo ?? m.tipo ?? "accion", ...inicial };
    if (this.e.tipo === "fortuna" && inicial.dadosBase != null) this.e.dadosFortuna = n(inicial.dadosBase, 2);
    if (!this.e.accion && this.e.tipo !== "fortuna") this.e.accion = this.#primera();
    if (this.e.tipo === "resistencia" && this.e.excluir && this.e.accion === this.e.excluir) this.e.accion = this.#primera();
    this.options.window.title = `Tirada · ${actor?.name ?? "Fortuna"}`;
  }

  #primera() {
    const todas = Object.values(accionesDe(this.actor)).flat();
    return todas.filter(k => !(this.e.tipo === "resistencia" && k === this.e.excluir)).map(k => [k, reservaDe(this.actor, k).total]).sort((x, y) => y[1] - x[1])[0]?.[0] ?? todas[0];
  }

  get #pool() {
    const e = this.e;
    if (e.tipo === "fortuna") return { total: Math.max(0, e.dadosFortuna), partes: [{ t: `${e.dadosFortuna}d elegidos`, d: e.dadosFortuna }] };
    const r = reservaDe(this.actor, e.accion);
    const partes = [{ t: `${nombreAccion(e.accion)}: ${r.base}d`, d: r.base }];
    let total = r.base;
    if (r.bono) { total += r.bono; partes.push({ t: `Conmoción ${r.bono}d`, d: r.bono }); }
    if (e.pacto) { total += 1; partes.push({ t: "Pacto oscuro +1d", d: 1 }); }
    const corazones = n(this.actor?.system?.dark_hearts?.value, 0);
    if (e.corazon && corazones > 0) { total += 1; partes.push({ t: "Corazón oscuro +1d", d: 1 }); }
    if (e.moral && this.actor?.system?.morale) { total += 1; partes.push({ t: "Moral +1d", d: 1 }); }
    if (e.extra) { total += e.extra; partes.push({ t: `Otros ${e.extra > 0 ? "+" : ""}${e.extra}d`, d: e.extra }); }
    return { total: Math.max(0, total), partes };
  }

  async _prepareContext() { return {}; }

  async _renderHTML() {
    const e = this.e, actor = this.actor;
    const pool = this.#pool;
    const pe = e.tipo === "accion" ? ajustar({ posicion: e.posicion, efecto: e.efecto, ayuda: e.ayuda, todo: e.todo }) : null;
    const p = probabilidades(pool.total);
    const pct = x => `${Math.round(x * 100)}%`;
    const corazones = n(actor?.system?.dark_hearts?.value, 0);

    const tabs = [["accion", "Acción", "fa-hand-fist"], ["resistencia", "Resistir", "fa-shield-halved"], ["fortuna", "Fortuna", "fa-dice"]]
      .map(([k, t, i]) => `<button type="button" class="mrg-btn ${e.tipo === k ? "mrg-activo" : ""}" data-action="tipo" data-valor="${k}" aria-pressed="${e.tipo === k}"><i class="fa-solid ${i}"></i> ${t}</button>`).join("");

    const colAcciones = Object.entries(accionesDe(actor)).map(([atrib, keys]) => {
      const shock = actor?.system?.attributes?.[atrib]?.shocked;
      const filas = keys.map(k => {
        const val = n(actor?.system?.attributes?.[atrib]?.skills?.[k]?.value, 0);
        const puntos = Array.from({ length: 3 }, (_, i) => `<span class="mrg-punto ${i < val ? "on" : ""}"></span>`).join("");
        const sel = e.accion === k;
        const fuera = e.tipo === "resistencia" && e.excluir === k;
        return `<button type="button" class="mrg-accion ${sel ? "mrg-sel" : ""} ${fuera ? "mrg-fuera" : ""}" data-action="accion" data-valor="${k}" aria-pressed="${sel}" ${fuera ? `disabled title="No puedes resistir con la acción que causó la consecuencia"` : ""}><span>${esc(nombreAccion(k))}</span><span class="mrg-puntos" aria-label="${val} puntos">${puntos}</span></button>`;
      }).join("");
      return `<div class="mrg-col"><div class="mrg-col-t">${esc(nombreAtributo(atrib))}${shock ? ` <span class="mrg-chip mrg-chip--sangre" title="−1d en la siguiente tirada">conmoción</span>` : ""}</div>${filas}</div>`;
    }).join("");

    const btnCorazon = `<button type="button" class="mrg-btn" data-action="truco" data-valor="corazon" aria-pressed="${e.corazon && corazones > 0}" ${corazones ? "" : "disabled"} title="Gastas un corazón oscuro."><i class="fa-solid fa-heart"></i><span class="mrg-t">Corazón oscuro<small>+1d · ${corazones}</small></span></button>`;
    const btnPacto = `<button type="button" class="mrg-btn" data-action="truco" data-valor="pacto" aria-pressed="${e.pacto}" title="El DJ fija una consecuencia que ocurrirá pase lo que pase."><i class="fa-solid fa-file-signature"></i><span class="mrg-t">Pacto oscuro<small>+1d</small></span></button>`;
    const btnMoral = this.actor?.type === "minion_pack" ? `<button type="button" class="mrg-btn" data-action="truco" data-valor="moral" aria-pressed="${e.moral && Boolean(actor?.system?.morale)}" ${actor?.system?.morale ? "" : "disabled"} data-ayuda="Moral||La manada gasta su punto de moral para añadir +1d."><i class="fa-solid fa-flag"></i><span class="mrg-t">Moral<small>+1d</small></span></button>` : "";
    const trucos = e.tipo === "accion" ? `
      <div class="mrg-trucos">
        <button type="button" class="mrg-btn" data-action="truco" data-valor="ayuda" aria-pressed="${e.ayuda}" title="Un aliado te echa una mano: +efecto, pero comparte la consecuencia."><i class="fa-solid fa-handshake-angle"></i><span class="mrg-t">Ayudar<small>+efecto</small></span></button>
        <button type="button" class="mrg-btn" data-action="truco" data-valor="todo" aria-pressed="${e.todo}" title="Prescindes de tu seguridad: +efecto, −situación."><i class="fa-solid fa-fire"></i><span class="mrg-t">Darlo todo<small>+efecto −situación</small></span></button>
        ${btnPacto}${btnCorazon}${btnMoral}
      </div>` : e.tipo === "resistencia" ? `
      <div class="mrg-trucos">
        <button type="button" class="mrg-btn" data-action="mortal" aria-pressed="${e.mortal}"><i class="fa-solid fa-skull-crossbones"></i><span class="mrg-t">Resistir la muerte<small>situación mortal</small></span></button>
        ${btnPacto}${btnCorazon}
      </div>` : "";

    const resumen = `
      <div class="mrg-reserva">
        <div class="mrg-reserva-dados" aria-hidden="true">${Array.from({ length: Math.min(pool.total || 2, 8) }, () => dadoMini()).join("")}</div>
        <div class="mrg-reserva-txt">
          <strong>${pool.total}d</strong>${pool.total === 0 ? ` <span class="mrg-nota">tiras 2d y cuenta el menor</span>` : ""}
          <div class="mrg-nota">${pool.partes.map(x => esc(x.t)).join(" · ")}</div>
        </div>
        <div class="mrg-ajuste" role="group" aria-label="Dados extra"><button type="button" class="mrg-btn mrg-btn--suave" data-action="dados" data-valor="-1" aria-label="Quitar un dado">−</button><button type="button" class="mrg-btn mrg-btn--suave" data-action="dados" data-valor="1" aria-label="Añadir un dado">+</button></div>
      </div>
      <div class="mrg-prob">
        <div class="mrg-prob-barra" role="img" aria-label="Fallo ${pct(p.failure)}, parcial ${pct(p.mixed)}, éxito ${pct(p.success)}, crítico ${pct(p.critical)}">
          <span class="f" style="flex:${p.failure}"></span><span class="p" style="flex:${p.mixed}"></span><span class="x" style="flex:${p.success}"></span><span class="c" style="flex:${p.critical}"></span>
        </div>
        <div class="mrg-prob-leyenda"><span><i class="f"></i>Fallo ${pct(p.failure)}</span><span><i class="p"></i>Parcial ${pct(p.mixed)}</span><span><i class="x"></i>Éxito ${pct(p.success)}</span><span><i class="c"></i>Crítico ${pct(p.critical)}</span></div>
      </div>`;

    let cuerpo = "";
    if (e.tipo === "fortuna") {
      cuerpo = `<p class="mrg-nota">Tirada sin acción: elige cuántos dados con los botones + y −.</p>${resumen}
        <div class="mrg-pie"><button type="button" class="mrg-btn mrg-btn--sangre mrg-grande" data-action="tirar"><i class="fa-solid fa-dice"></i> Tirar</button></div>`;
    } else if (e.tipo === "resistencia") {
      cuerpo = `<h5 class="mrg-etiqueta">¿Con qué te resistes?</h5><div class="mrg-acciones">${colAcciones}</div>${trucos}${resumen}
        <p class="mrg-nota mrg-regla">Fallo: 3 de Estrés · parcial: 2 · éxito: 1 · crítico: despejas 1.${e.mortal ? " <strong>Resistir la muerte</strong> no cuesta Estrés: decide si sobrevives." : ""}</p>
        <div class="mrg-pie"><button type="button" class="mrg-btn mrg-btn--sangre mrg-grande" data-action="tirar"><i class="fa-solid fa-shield-halved"></i> Resistir</button></div>`;
    } else {
      const efs = EFECTOS.slice().reverse();
      const cab = efs.map(x => `<div class="mrg-cab-efecto">${esc(nombreEfecto(x))}</div>`).join("");
      const filas = POSICIONES.map(pos => {
        const celdas = efs.map(ef => {
          const esSel = pe.posicion === pos && pe.efecto === ef;
          const esBase = e.posicion === pos && e.efecto === ef;
          return `<button type="button" class="mrg-celda ${esBase ? "mrg-base" : ""} ${esSel ? "mrg-sel" : ""}" data-action="celda" data-pos="${pos}" data-efecto="${ef}" aria-label="Tirar con situación ${esc(nombrePosicion(pos))} y efecto ${esc(nombreEfecto(ef))}" title="${esc(nombrePosicion(pos))} · ${esc(nombreEfecto(ef))}"><i class="fa-solid fa-dice-d6"></i></button>`;
        }).join("");
        return `<div class="mrg-cab-pos">${esc(nombrePosicion(pos))}</div>${celdas}`;
      }).join("");
      cuerpo = `<h5 class="mrg-etiqueta">¿Qué haces?</h5><div class="mrg-acciones">${colAcciones}</div>${trucos}${resumen}
        <h5 class="mrg-etiqueta">Situación y efecto <span class="mrg-nota">— pulsa la casilla que fija el DJ y se tira</span></h5>
        <div class="mrg-rejilla"><div class="mrg-esquina">Situación ↓ · Efecto →</div>${cab}${filas}</div>
        ${(pe.posicion !== e.posicion || pe.efecto !== e.efecto) ? `<p class="mrg-nota mrg-ajustado"><i class="fa-solid fa-wand-sparkles"></i> Con tus trucos acabará como <strong>${esc(nombrePosicion(pe.posicion))}</strong> / efecto <strong>${esc(nombreEfecto(pe.efecto).toLowerCase())}</strong>.</p>` : ""}`;
    }
    return `<div class="mrg-tirada-cuerpo"><nav class="mrg-tabs" role="tablist">${tabs}</nav>${cuerpo}</div>`;
  }

  _replaceHTML(result, content) { content.innerHTML = result; }

  /* -------------------------------- acciones -------------------------------- */

  static #tipo(ev, t) { this.e.tipo = t.dataset.valor; if (this.e.tipo !== "fortuna" && !this.e.accion) this.e.accion = this.#primera(); guardar({ tipo: this.e.tipo }); this.render(); }
  static #accion(ev, t) { this.e.accion = t.dataset.valor; this.render(); }
  static #truco(ev, t) {
    const k = t.dataset.valor;
    if (k === "ayuda" || k === "todo") { const v = !this.e[k]; this.e.ayuda = false; this.e.todo = false; this.e[k] = v; } // el manual: solo uno de los dos
    else this.e[k] = !this.e[k];
    this.render();
  }
  static #mortal() { this.e.mortal = !this.e.mortal; this.render(); }
  static #dados(ev, t) {
    if (this.e.tipo === "fortuna") this.e.dadosFortuna = Math.max(0, Math.min(10, this.e.dadosFortuna + n(t.dataset.valor)));
    else this.e.extra = Math.max(-3, Math.min(3, this.e.extra + n(t.dataset.valor)));
    this.render();
  }
  static async #celda(ev, t) { this.e.posicion = t.dataset.pos; this.e.efecto = t.dataset.efecto; await this.#lanzar(); }
  static async #tirarYa() { await this.#lanzar(); }

  async #lanzar() {
    const e = this.e;
    const opts = { tipo: e.tipo, accion: e.accion, ayuda: e.ayuda, todo: e.todo, pacto: e.pacto, corazon: e.corazon, moral: e.moral, extra: e.extra, posicion: e.mortal && e.tipo === "resistencia" ? "deadly" : e.posicion, efecto: e.efecto };
    if (e.tipo === "fortuna") { opts.accion = null; opts.dadosBase = e.dadosFortuna; }
    await this.close();
    await tirar(this.actor, opts);
  }
}

/** Abre el diálogo de tirada para un actor. */
export function abrirTirada(actor, inicial = {}) {
  if (!actor) return ui.notifications.warn("Selecciona un personaje para tirar.");
  foundry.applications.instances?.get?.("mr-wo-tirada")?.close?.();
  const app = new TiradaMR(actor, inicial);
  app.render(true);
  return app;
}
