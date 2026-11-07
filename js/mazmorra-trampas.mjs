/**
 * Ventanas pequeñas del constructor de mazmorras: la de trampas y trucos (manual, pág. 198-200: mecanismo + detonador + nivel)
 * y la de acciones extra que el DJ concede. Son ventanas del módulo (clases mrg), así que siguen el modo claro, oscuro,
 * alto contraste y lectura como el resto. No tocan la escena: devuelven la orden a quien las abrió (`alElegir`).
 */
import { MECANISMOS, DETONADORES, costeTrampa } from "./core/mazmorra.mjs";

const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const App = foundry.applications?.api?.ApplicationV2;

const NIVELES = [
  [1, "Fácil de evitar", "Una aguja envenenada enganchada en el pomo de una puerta."],
  [2, "Mortífera", "Una gigantesca cuchilla oscilante unida a una placa de presión."],
  [3, "La más letal", "Un cable trampa que suelta una bola de roca rodante y puede afectar a varios aventureros."]
];
const NIVELES_TRUCO = [
  [1, "Poco probable", "Un charco que quizá engañe a quien pase con armadura."],
  [2, "Probable", "Un prisionero que grita pidiendo ayuda y atrae a los aventureros."],
  [3, "Muy probable", "Un dédalo sinuoso que divide al grupo al entrar."]
];

export class TrampaMR extends App {
  static DEFAULT_OPTIONS = {
    id: "mr-wo-trampa", tag: "div", classes: ["mrg", "mrg-ventana", "mrg-trampa-app"],
    window: { title: "Trampa", icon: "fa-solid fa-skull-crossbones", resizable: false }, position: { width: 460, height: "auto" }
  };

  /** @param {{trampa?:object, gm:boolean, reglas:boolean, quedan:number|null, activar:Function, alElegir:Function}} o */
  constructor(o) {
    super();
    this.o = o; this.t = o.trampa ?? null;
    this.d = o.trampa ? { ...o.trampa } : { tipo: "trampa", mecanismo: "", detonador: "", intencion: "", nota: "", nivel: 1 };
    this.options.window.title = this.t ? (this.t.tipo === "truco" ? "Truco" : "Trampa") : "Preparar trampa o truco";
  }

  get #nivelesDe() { return this.d.tipo === "truco" ? NIVELES_TRUCO : NIVELES; }

  #chips(lista, campo) {
    return `<div class="mrg-trampa-chips">${lista.map((n, i) => `<button type="button" class="mrg-chipbtn ${this.d[campo] === n ? "mrg-sel" : ""}" data-pon="${campo}" data-valor="${esc(n)}" aria-pressed="${this.d[campo] === n}"><b>${i + 1}</b> ${esc(n)}</button>`).join("")}</div>`;
  }

  async _renderHTML() {
    const d = this.d, truco = d.tipo === "truco", coste = costeTrampa(d.nivel);
    const falta = this.o.reglas && this.o.quedan !== null && !this.t && coste > this.o.quedan;
    const tipos = this.t ? "" : `<div class="mrg-sino" role="group" aria-label="Qué preparas">${[["trampa", "fa-skull-crossbones", "Trampa"], ["truco", "fa-wand-sparkles", "Truco"]].map(([k, ic, tx]) => `<button type="button" class="mrg-chipbtn ${d.tipo === k ? "mrg-sel" : ""}" data-tipo="${k}" aria-pressed="${d.tipo === k}"><i class="fa-solid ${ic}"></i> ${tx}</button>`).join("")}</div>`;
    const intro = truco
      ? `<p class="mrg-asist-intro">Un <strong>truco</strong> no hiere: sirve para que los aventureros hagan lo que queréis o para crear una ventaja defensiva. Tiene un <em>método</em> (cómo engaña), un <em>detonador</em> (cuándo se activa) y una <em>intención</em> (qué pasa si funciona). Nunca puede dejar a nadie sin salida.</p>`
      : `<p class="mrg-asist-intro">Una <strong>trampa</strong> es una defensa estática y oculta: un <em>mecanismo</em> (lo que hace) y un <em>detonador</em> (lo que la activa). Cada avance de la tirada de trampa hiere medio corazón. Elige de las tablas del manual o escribe la tuya.</p>`;
    const campoMec = truco
      ? `<label class="mrg-campo"><span class="mrg-etiqueta">Método</span><input type="text" data-txt="mecanismo" value="${esc(d.mecanismo)}" placeholder="Una cuerda con cascabeles, un charco que parece profundo…"></label>
         <label class="mrg-campo"><span class="mrg-etiqueta">Detonador</span><input type="text" data-txt="detonador" value="${esc(d.detonador)}" placeholder="Al pasar junto a ella, al pararse a mirar…"></label>
         <label class="mrg-campo"><span class="mrg-etiqueta">Intención</span><input type="text" data-txt="intencion" value="${esc(d.intencion)}" placeholder="Alerta a todos los esbirros, los intrusos descuidan la espalda…"></label>`
      : `<div class="mrg-trampa-sec"><h5>Mecanismo <button type="button" class="mrg-mini" data-azar="mecanismo" aria-label="Mecanismo al azar" data-ayuda="Al azar||Tira un d12 en la tabla de mecanismos del manual."><i class="fa-solid fa-dice"></i></button></h5>${this.#chips(MECANISMOS, "mecanismo")}
         <input type="text" data-txt="mecanismo" value="${esc(d.mecanismo)}" placeholder="…o escribe otro" aria-label="Mecanismo"></div>
         <div class="mrg-trampa-sec"><h5>Detonador <button type="button" class="mrg-mini" data-azar="detonador" aria-label="Detonador al azar" data-ayuda="Al azar||Tira un d12 en la tabla de detonadores del manual."><i class="fa-solid fa-dice"></i></button></h5>${this.#chips(DETONADORES, "detonador")}
         <input type="text" data-txt="detonador" value="${esc(d.detonador)}" placeholder="…o escribe otro" aria-label="Detonador"></div>`;
    const niveles = `<div class="mrg-trampa-sec"><h5>Nivel</h5><div class="mrg-trampa-niv">${this.#nivelesDe.map(([n, t, ej]) => `<button type="button" class="mrg-chipbtn ${d.nivel === n ? "mrg-sel" : ""}" data-nivel="${n}" aria-pressed="${d.nivel === n}"><span><b>Nivel ${n}</b> · ${t}</span><small>${ej}</small><small>${this.o.reglas ? `${costeTrampa(n)} acción${costeTrampa(n) > 1 ? "es" : ""} de descanso · ` : ""}tiras ${n}d</small></button>`).join("")}</div></div>`;
    const pie = this.t
      ? `<footer class="mrg-trampa-pie"><button type="button" class="mrg-btn mrg-btn--sangre" data-op="editar"><i class="fa-solid fa-floppy-disk"></i> Guardar</button>
         <button type="button" class="mrg-btn" data-op="activar" data-ayuda="Activar||Tira ${this.t.nivel}d como pide el manual y publica el resultado en el chat."><i class="fa-solid fa-dice"></i> ${truco ? "Probar" : "Activar"} (${this.t.nivel}d)</button>
         <button type="button" class="mrg-btn" data-op="descubrir" data-ayuda="Descubierta||Márcala cuando los aventureros la hayan descubierto; se dibuja apagada."><i class="fa-solid ${this.t.revelada ? "fa-eye-slash" : "fa-eye"}"></i> ${this.t.revelada ? "Volver a armar" : "Descubierta"}</button>
         <button type="button" class="mrg-btn" data-op="quitar"><i class="fa-solid fa-trash"></i> Quitar</button></footer>`
      : `<footer class="mrg-trampa-pie"><button type="button" class="mrg-btn mrg-btn--sangre" data-op="poner" ${falta ? "disabled" : ""}><i class="fa-solid fa-hammer"></i> Colocar${this.o.reglas && coste ? ` (${coste} acc.)` : ""}</button>${falta ? `<span class="mrg-cons-no">Te quedan ${this.o.quedan} acciones.</span>` : ""}</footer>`;
    return `<div class="mrg-trampa">${tipos}${intro}${campoMec}${niveles}<label class="mrg-campo"><span class="mrg-etiqueta">Nota (opcional)</span><input type="text" data-txt="nota" value="${esc(d.nota)}" placeholder="Quién la prepara, dónde se activa…"></label>${pie}</div>`;
  }

  _replaceHTML(res, cont) {
    cont.innerHTML = res;
    cont.querySelectorAll("[data-txt]").forEach(i => i.addEventListener("input", () => { this.d[i.dataset.txt] = i.value; }));
    cont.onclick = async ev => {
      const b = ev.target.closest("button"); if (!b || b.disabled) return;
      if (b.dataset.tipo) { this.d.tipo = b.dataset.tipo; this.d.mecanismo = ""; this.d.detonador = ""; return this.render(); }
      if (b.dataset.pon) { this.d[b.dataset.pon] = b.dataset.valor; return this.render(); }
      if (b.dataset.azar) { const l = b.dataset.azar === "mecanismo" ? MECANISMOS : DETONADORES; this.d[b.dataset.azar] = l[Math.floor(Math.random() * l.length)]; return this.render(); }
      if (b.dataset.nivel) { this.d.nivel = Number(b.dataset.nivel); return this.render(); }
      const op = b.dataset.op; if (!op) return;
      const d = this.d;
      if (op !== "quitar" && op !== "activar" && op !== "descubrir" && !String(d.mecanismo).trim()) return ui.notifications.warn(d.tipo === "truco" ? "Escribe el método del truco." : "Elige o escribe el mecanismo de la trampa.");
      if (op === "activar") return this.o.activar(this.t);
      await this.o.alElegir(op, d, this.t);
      this.close();
    };
  }
}

export function abrirTrampa(o) {
  foundry.applications.instances?.get?.("mr-wo-trampa")?.close();
  const app = new TrampaMR(o); app.render(true); return app;
}

/** Acciones de descanso extra que concede el DJ (esbirros pagados, una capacidad de vocación, una gracia…). */
export class ExtraMR extends App {
  static DEFAULT_OPTIONS = {
    id: "mr-wo-extra", tag: "div", classes: ["mrg", "mrg-ventana", "mrg-trampa-app"],
    window: { title: "Conceder acciones", icon: "fa-solid fa-gift", resizable: false }, position: { width: 400, height: "auto" }
  };
  constructor(alElegir) { super(); this.alElegir = alElegir; this.n = 1; this.motivo = ""; }
  async _renderHTML() {
    const razones = ["Esbirros pagados (1 de oro cada panda)", "Capacidad de vocación", "Un flashback", "Gracia del DJ"];
    return `<div class="mrg-trampa"><p class="mrg-asist-intro">Cada PJ tiene una acción de descanso por fase de acecho, los duendes otra y cada panda de esbirros pagada (1 de oro) otra más. Aquí regalas las que quieras de más: se guardan como créditos de obra, que no caducan al cambiar de fase.</p>
      <div class="mrg-trampa-sec"><h5>Cuántas</h5><div class="mrg-sino" role="group">${[1, 2, 3, 4, 5].map(k => `<button type="button" class="mrg-chipbtn ${this.n === k ? "mrg-sel" : ""}" data-n="${k}" aria-pressed="${this.n === k}">+${k}</button>`).join("")}</div></div>
      <div class="mrg-trampa-sec"><h5>Motivo</h5><div class="mrg-trampa-chips">${razones.map(r => `<button type="button" class="mrg-chipbtn ${this.motivo === r ? "mrg-sel" : ""}" data-motivo="${esc(r)}" aria-pressed="${this.motivo === r}">${esc(r)}</button>`).join("")}</div>
      <input type="text" data-txt placeholder="…o escribe otro" value="${esc(this.motivo)}" aria-label="Motivo"></div>
      <footer class="mrg-trampa-pie"><button type="button" class="mrg-btn mrg-btn--sangre" data-dar><i class="fa-solid fa-gift"></i> Conceder +${this.n}</button></footer></div>`;
  }
  _replaceHTML(res, cont) {
    cont.innerHTML = res;
    cont.querySelector("[data-txt]")?.addEventListener("input", ev => { this.motivo = ev.target.value; });
    cont.onclick = async ev => {
      const b = ev.target.closest("button"); if (!b) return;
      if (b.dataset.n) { this.n = Number(b.dataset.n); return this.render(); }
      if (b.dataset.motivo) { this.motivo = b.dataset.motivo; return this.render(); }
      if ("dar" in b.dataset) { await this.alElegir(this.n, this.motivo.trim()); this.close(); }
    };
  }
}

export function abrirExtra(alElegir) {
  foundry.applications.instances?.get?.("mr-wo-extra")?.close();
  const app = new ExtraMR(alElegir); app.render(true); return app;
}
