/**
 * Ventana de defensas y estructuras del constructor de mazmorras: trampas (mecanismo + detonador, pág. 198), trucos (método +
 * detonador + intención, pág. 200), portones (material + cierre, pág. 201) y estructuras de nivel 1 (conducto, construcción, túnel
 * largo, pasaje secreto, ventana, pág. 197). Es una ventana del módulo (clases mrg): sigue el modo claro, oscuro, alto contraste y
 * lectura. No toca la escena: devuelve la orden a quien la abrió (`alElegir`).
 */
import { MECANISMOS, DETONADORES, MATERIALES_PORTON, CIERRES_PORTON, ESTRUCTURAS, relojTrampa } from "./core/mazmorra.mjs";

const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const App = foundry.applications?.api?.ApplicationV2;

const NIVELES = {
  trampa: [[1, "Fácil de evitar", "Una aguja envenenada enganchada en el pomo de una puerta."], [2, "Mortífera", "Una gigantesca cuchilla oscilante unida a una placa de presión."], [3, "La más letal", "Un cable trampa que suelta una bola de roca rodante y puede afectar a varios aventureros."]],
  truco: [[1, "Poco probable", "Un charco que quizá engañe a quien pase con armadura."], [2, "Probable", "Un prisionero que grita pidiendo ayuda y atrae a los aventureros."], [3, "Muy probable", "Un dédalo sinuoso que divide al grupo al entrar."]],
  porton: [[1, "Simple", "Una barra de madera que mantiene cerrada una puerta."], [2, "Eficaz", "Una puerta con un candado."], [3, "Formidable", "Un enorme rastrillo de acero con poleas y clave mecánica."]]
};
const TIPOS = [["trampa", "fa-skull-crossbones", "Trampa"], ["truco", "fa-wand-sparkles", "Truco"], ["porton", "fa-dungeon", "Portón"], ["estructura", "fa-bridge", "Estructura"]];
const TITULO = { trampa: "Trampa", truco: "Truco", porton: "Portón", estructura: "Estructura" };
const INTRO = {
  trampa: "Una <strong>trampa</strong> es una defensa estática y oculta: un <em>mecanismo</em> (lo que hace) y un <em>detonador</em> (lo que la activa). Cada avance de la tirada de trampa hiere medio corazón.",
  truco: "Un <strong>truco</strong> no hiere: hace que los aventureros hagan lo que queréis o crea una ventaja defensiva. Tiene un <em>método</em>, un <em>detonador</em> y una <em>intención</em>. Nunca deja a nadie sin salida.",
  porton: "Un <strong>portón</strong> gana tiempo y aparta a los invasores de las zonas delicadas; con tiempo, acaban atravesándolo. Elige el <em>material</em> de la puerta y su <em>mecanismo de cierre</em>; quien lo construye narra qué pasa al superarlo.",
  estructura: "Las <strong>estructuras de nivel 1</strong> no son salas: un paso estrecho, un puente o ascensor, un túnel largo, un pasaje secreto o una ventana entre zonas."
};

export class TrampaMR extends App {
  static DEFAULT_OPTIONS = {
    id: "mr-wo-trampa", tag: "div", classes: ["mrg", "mrg-ventana", "mrg-trampa-app"],
    window: { title: "Trampa", icon: "fa-solid fa-skull-crossbones", resizable: false }, position: { width: 460, height: "auto" }
  };

  /** @param {{trampa?:object, gm:boolean, reglas:boolean, activar:Function, alElegir:Function}} o  `reglas`: lo nuevo será un proyecto. */
  constructor(o) {
    super();
    this.o = o; this.t = o.trampa ?? null;
    this.d = o.trampa ? { ...o.trampa } : { tipo: "trampa", mecanismo: "", detonador: "", intencion: "", nota: "", nivel: 1 };
    this.options.window.title = this.t ? TITULO[this.t.tipo] ?? "Trampa" : "Defensas y estructuras";
  }

  #chips(lista, campo) {
    return `<div class="mrg-trampa-chips">${lista.map((n, i) => `<button type="button" class="mrg-chipbtn ${this.d[campo] === n ? "mrg-sel" : ""}" data-pon="${campo}" data-valor="${esc(n)}" aria-pressed="${this.d[campo] === n}"><b>${i + 1}</b> ${esc(n)}</button>`).join("")}</div>`;
  }
  #seccion(titulo, lista, campo, ph) {
    return `<div class="mrg-trampa-sec"><h5>${titulo} <button type="button" class="mrg-mini" data-azar="${campo}" data-lista="${esc(JSON.stringify(lista))}" aria-label="${titulo} al azar"><i class="fa-solid fa-dice"></i></button></h5>${this.#chips(lista, campo)}
      <input type="text" data-txt="${campo}" value="${esc(this.d[campo])}" placeholder="${ph}" aria-label="${titulo}"></div>`;
  }
  #proyecto(n) { const s = relojTrampa(n); return s === 1 ? "1 tirada" : `reloj de ${s}`; }

  async _renderHTML() {
    const d = this.d, tipo = d.tipo;
    const tipos = this.t ? "" : `<div class="mrg-sino" role="group" aria-label="Qué colocas">${TIPOS.map(([k, ic, tx]) => `<button type="button" class="mrg-chipbtn ${tipo === k ? "mrg-sel" : ""}" data-tipo="${k}" aria-pressed="${tipo === k}"><i class="fa-solid ${ic}"></i> ${tx}</button>`).join("")}</div>`;
    let campos;
    if (tipo === "truco") campos = `<label class="mrg-campo"><span class="mrg-etiqueta">Método</span><input type="text" data-txt="mecanismo" value="${esc(d.mecanismo)}" placeholder="Una cuerda con cascabeles, un charco que parece profundo…"></label>
         <label class="mrg-campo"><span class="mrg-etiqueta">Detonador</span><input type="text" data-txt="detonador" value="${esc(d.detonador)}" placeholder="Al pasar junto a ella, al pararse a mirar…"></label>
         <label class="mrg-campo"><span class="mrg-etiqueta">Intención</span><input type="text" data-txt="intencion" value="${esc(d.intencion)}" placeholder="Alerta a todos los esbirros, los intrusos descuidan la espalda…"></label>`;
    else if (tipo === "porton") campos = this.#seccion("Material", MATERIALES_PORTON, "mecanismo", "…o escribe otro") + this.#seccion("Cierre", CIERRES_PORTON, "detonador", "…o escribe otro");
    else if (tipo === "estructura") campos = `<div class="mrg-trampa-sec"><h5>Cuál</h5><div class="mrg-trampa-niv">${Object.entries(ESTRUCTURAS).map(([n, t]) => `<button type="button" class="mrg-chipbtn ${d.mecanismo === n ? "mrg-sel" : ""}" data-pon="mecanismo" data-valor="${esc(n)}" aria-pressed="${d.mecanismo === n}"><span><b>${esc(n)}</b></span><small>${esc(t)}</small></button>`).join("")}</div></div>`;
    else campos = this.#seccion("Mecanismo", MECANISMOS, "mecanismo", "…o escribe otro") + this.#seccion("Detonador", DETONADORES, "detonador", "…o escribe otro");
    const niveles = tipo === "estructura" ? `<p class="mrg-nota">Nivel 1${this.o.reglas ? ` · ${this.#proyecto(1)}` : ""}.</p>`
      : `<div class="mrg-trampa-sec"><h5>Nivel</h5><div class="mrg-trampa-niv">${NIVELES[tipo].map(([n, t, ej]) => `<button type="button" class="mrg-chipbtn ${d.nivel === n ? "mrg-sel" : ""}" data-nivel="${n}" aria-pressed="${d.nivel === n}"><span><b>Nivel ${n}</b> · ${t}</span><small>${ej}</small><small>${this.o.reglas ? `Proyecto: ${this.#proyecto(n)}` : ""}${tipo === "porton" ? "" : `${this.o.reglas ? " · " : ""}tiras ${n}d`}</small></button>`).join("")}</div></div>`;
    const tirable = tipo === "trampa" || tipo === "truco";
    const pie = this.t
      ? `<footer class="mrg-trampa-pie"><button type="button" class="mrg-btn mrg-btn--sangre" data-op="editar"><i class="fa-solid fa-floppy-disk"></i> Guardar</button>
         ${tirable ? `<button type="button" class="mrg-btn" data-op="activar" data-ayuda="Activar||Tira ${this.t.nivel}d como pide el manual y publica el resultado en el chat."><i class="fa-solid fa-dice"></i> ${tipo === "truco" ? "Probar" : "Activar"} (${this.t.nivel}d)</button>
         <button type="button" class="mrg-btn" data-op="descubrir" data-ayuda="Descubierta||Márcala cuando los aventureros la hayan descubierto; se dibuja apagada."><i class="fa-solid ${this.t.revelada ? "fa-eye-slash" : "fa-eye"}"></i> ${this.t.revelada ? "Volver a armar" : "Descubierta"}</button>` : ""}
         <button type="button" class="mrg-btn" data-op="quitar"><i class="fa-solid fa-trash"></i> Quitar</button></footer>`
      : `<footer class="mrg-trampa-pie"><button type="button" class="mrg-btn mrg-btn--sangre" data-op="poner"><i class="fa-solid fa-hammer"></i> ${this.o.reglas ? "Empezar la obra" : "Colocar"}</button></footer>`;
    return `<div class="mrg-trampa">${tipos}<p class="mrg-asist-intro">${INTRO[tipo]}</p>${campos}${niveles}<label class="mrg-campo"><span class="mrg-etiqueta">Nota (opcional)</span><input type="text" data-txt="nota" value="${esc(d.nota)}" placeholder="Quién lo prepara, dónde se activa…"></label>${pie}</div>`;
  }

  _replaceHTML(res, cont) {
    cont.innerHTML = res;
    cont.querySelectorAll("[data-txt]").forEach(i => i.addEventListener("input", () => { this.d[i.dataset.txt] = i.value; }));
    cont.onclick = async ev => {
      const b = ev.target.closest("button"); if (!b || b.disabled) return;
      if (b.dataset.tipo) { this.d.tipo = b.dataset.tipo; this.d.mecanismo = ""; this.d.detonador = ""; this.d.nivel = 1; return this.render(); }
      if (b.dataset.pon) { this.d[b.dataset.pon] = b.dataset.valor; return this.render(); }
      if (b.dataset.azar) { const l = JSON.parse(b.dataset.lista); this.d[b.dataset.azar] = l[Math.floor(Math.random() * l.length)]; return this.render(); }
      if (b.dataset.nivel) { this.d.nivel = Number(b.dataset.nivel); return this.render(); }
      const op = b.dataset.op; if (!op) return;
      const d = this.d;
      if (op !== "quitar" && op !== "activar" && op !== "descubrir" && !String(d.mecanismo).trim()) {
        return ui.notifications.warn({ truco: "Escribe el método del truco.", porton: "Elige el material del portón.", estructura: "Elige qué estructura es." }[d.tipo] ?? "Elige o escribe el mecanismo de la trampa.");
      }
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
