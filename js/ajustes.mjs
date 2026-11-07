/**
 * Ajustes de aspecto y accesibilidad de MR- Wicked Ones.
 *  · Selectores «MR / Sistema original» para las hojas y para las tiradas y tarjetas de chat (por defecto, MR).
 *  · Accesibilidad completa: tema oscuro, alto contraste, lectura limpia, tamaño de texto, tipografía sencilla,
 *    espaciado, botones grandes, menos movimiento, menos efectos y marcas para daltonismo.
 *  · Panel único con vista previa; todo se aplica en vivo y afecta a hojas, diálogos, tarjetas de chat y asistente.
 */
import { n } from "./core/reglas.mjs";
import { htmlTarjeta } from "./tirada.mjs";

const MOD = "mr-wicked-ones-es";
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

export const TINTAS = { suave: ["Hueso suave", "#e8e2d4"], papel: ["Papel", "#f2ede1"], perla: ["Perla", "#dfe3e8"], ambar: ["Ámbar", "#ecc98f"], menta: ["Menta", "#cfe3d5"] };

/** [ajuste, clase en <html>] */
const CLASES = [
  ["a11yOscuro", "mrg-oscuro"], ["a11yContraste", "mrg-contraste"], ["a11yLegible", "mrg-sencilla"], ["a11yEspaciado", "mrg-espaciado"],
  ["a11yBotones", "mrg-botones"], ["a11ySinMovimiento", "mrg-sin-mov"], ["a11ySinEfectos", "mrg-sin-efectos"], ["a11yLectura", "mrg-lectura"],
  ["a11yDaltonismo", "mrg-dalto"], ["dadosPropios", "mrg-dados-img"], ["barraAuto", "mrg-barra-auto"]
];

export const DEFECTOS = Object.freeze({
  estiloHojas: "mr", estiloTiradas: "mr", a11yOscuro: true, a11yContraste: false, a11yLegible: false, a11yEscala: 100, a11yEspaciado: false,
  a11yBotones: false, a11ySinMovimiento: false, a11ySinEfectos: false, a11yLectura: false, a11yTinta: "suave", a11yDaltonismo: false,
  ayudaActiva: true, ayudaRetraso: 2, dadosPropios: true, barraAuto: true
});

const leer = k => { try { return game.settings.get(MOD, k); } catch { return DEFECTOS[k]; } };

export function registrarAjustes() {
  const tipo = k => (typeof DEFECTOS[k] === "boolean" ? Boolean : typeof DEFECTOS[k] === "number" ? Number : String);
  const cliente = (k, extra = {}) => game.settings.register(MOD, k, { scope: "client", config: false, type: tipo(k), default: DEFECTOS[k], onChange: aplicarAspecto, ...extra });
  for (const k of Object.keys(DEFECTOS)) {
    if (k === "estiloHojas") cliente(k, { config: true, requiresReload: true, name: "MRWO.Settings.EstiloHojas.Name", hint: "MRWO.Settings.EstiloHojas.Hint", choices: { mr: "MRWO.Settings.Estilo.MR", sistema: "MRWO.Settings.Estilo.Sistema" } });
    else if (k === "estiloTiradas") cliente(k, { config: true, requiresReload: true, name: "MRWO.Settings.EstiloTiradas.Name", hint: "MRWO.Settings.EstiloTiradas.Hint", choices: { mr: "MRWO.Settings.Estilo.MR", sistema: "MRWO.Settings.Estilo.Sistema" } });
    else cliente(k);
  }
  game.settings.registerMenu(MOD, "menuAspecto", {
    name: "MRWO.Settings.Aspecto.Name", label: "MRWO.Settings.Aspecto.Label", hint: "MRWO.Settings.Aspecto.Hint",
    icon: "fa-solid fa-universal-access", type: class extends foundry.applications.api.ApplicationV2 { async render() { abrirPanelAspecto(); return this; } }, restricted: false
  });
}

/** Aplica el aspecto elegido a <html>: clases, escala y tinta de lectura. */
export function aplicarAspecto() {
  const raiz = document.documentElement;
  for (const [k, c] of CLASES) raiz.classList.toggle(c, Boolean(leer(k)));
  raiz.classList.toggle("mrg-hojas", leer("estiloHojas") !== "sistema");
  raiz.classList.toggle("mrg-tiradas", leer("estiloTiradas") !== "sistema");
  const escala = Math.min(1.6, Math.max(0.85, n(leer("a11yEscala"), 100) / 100));
  raiz.style.setProperty("--g-escala", String(escala));
  raiz.style.setProperty("--g-tinta-lectura", (TINTAS[leer("a11yTinta")] ?? TINTAS.suave)[1]);

  // Compatibilidad con el tema oscuro por filtros de las hojas originales del sistema (oscuro.css)
  const b = document.body;
  if (b) {
    b.classList.toggle("mr-wo-oscuro", Boolean(leer("a11yOscuro")));
    b.classList.toggle("mr-wo-contraste", Boolean(leer("a11yContraste")));
    b.classList.toggle("mr-wo-legible", Boolean(leer("a11yLegible")));
    b.style.setProperty("--mr-wo-escala", String(escala));
  }
  if (globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches) raiz.classList.add("mrg-sin-mov");
  Hooks.callAll("mrWoAspecto");
}

/* -------------------------------------------------------------------------- */
/*  Panel                                                                     */
/* -------------------------------------------------------------------------- */

const App = foundry.applications?.api?.ApplicationV2;
const MUESTRA = {
  v: 1, tipo: "accion", titulo: "Destrozar", atributo: "Músculos", actor: "Ulrot", actorId: null, caras: [6, 4, 2], cero: false, estado: "exito",
  posicion: "dire", efecto: "default", posicionBase: "dire", efectoBase: "default", pool: { base: 3, total: 3 }, mods: [{ id: "pacto", txt: "Pacto oscuro: +1d", d: 1 }], efectos: [], nota: "", mortal: false
};

const GRUPOS = [
  { t: "Tema y lectura", items: [
    ["a11yOscuro", "Modo oscuro", "Fondo carbón y letra hueso en hojas, diálogos, tarjetas de chat y asistente."],
    ["a11yContraste", "Alto contraste", "Bordes y textos más marcados, sin medios tonos."],
    ["a11yLectura", "Lectura limpia", "Fondos lisos sin adornos y la tinta que elijas abajo."]
  ] },
  { t: "Letra y espacio", items: [
    ["a11yLegible", "Tipografía sencilla", "Usa solo la letra de lectura, sin la fuente decorativa de los títulos."],
    ["a11yEspaciado", "Espaciado amplio", "Más interlineado y separación entre palabras y letras."],
    ["a11yBotones", "Botones grandes", "Zonas de pulsación mayores (casillas, botones, dados)."]
  ] },
  { t: "Movimiento y efectos", items: [
    ["a11ySinMovimiento", "Reducir el movimiento", "Sin animaciones ni transiciones (también se respeta la preferencia del sistema operativo)."],
    ["a11ySinEfectos", "Reducir los efectos", "Sin sombras, recortes irregulares ni giros en sellos y tarjetas."],
    ["a11yDaltonismo", "Marcas para daltonismo", "El resultado de las tiradas añade trama al borde, además del icono y el texto."]
  ] }
];

export class PanelAspecto extends App {
  static DEFAULT_OPTIONS = {
    id: "mr-wo-aspecto", tag: "div", classes: ["mrg", "mrg-ventana", "mrg-panel-aspecto"],
    window: { title: "Aspecto y accesibilidad", icon: "fa-solid fa-universal-access", resizable: true },
    position: { width: 700, height: 660 },
    actions: { reiniciar: PanelAspecto.#reiniciar, recargar: PanelAspecto.#recargar }
  };
  #recarga = false;

  async _renderHTML() {
    const chk = ([k, t, h]) => `<label class="mrg-fila-ajuste"><input type="checkbox" data-aj="${k}" ${leer(k) ? "checked" : ""}><span><strong>${esc(t)}</strong><small>${esc(h)}</small></span></label>`;
    const tintas = Object.entries(TINTAS).map(([k, [t]]) => `<option value="${k}" ${leer("a11yTinta") === k ? "selected" : ""}>${t}</option>`).join("");
    const opcion = (k, v, t) => `<option value="${v}" ${leer(k) === v ? "selected" : ""}>${t}</option>`;
    return `<div class="mrg-aspecto">
      <section class="mrg-aspecto-col">
        <h3 class="mrg-seccion">Estilo del módulo</h3>
        <label class="mrg-campo"><span class="mrg-etiqueta">Hojas</span>
          <select data-aj="estiloHojas">${opcion("estiloHojas", "mr", "Estilo MR (hojas nuevas)")}${opcion("estiloHojas", "sistema", "Original del sistema")}</select></label>
        <label class="mrg-campo"><span class="mrg-etiqueta">Tiradas y tarjetas de chat</span>
          <select data-aj="estiloTiradas">${opcion("estiloTiradas", "mr", "Estilo MR (diálogo y tarjetas nuevos)")}${opcion("estiloTiradas", "sistema", "Original del sistema")}</select></label>
        ${this.#recarga ? `<p class="mrg-aviso"><i class="fa-solid fa-rotate"></i> Este cambio necesita recargar. <button type="button" class="mrg-btn mrg-btn--sangre" data-action="recargar">Recargar ahora</button></p>` : `<p class="mrg-nota">Con «Original del sistema» se vuelve al aspecto de siempre; los automatismos de reglas siguen funcionando.</p>`}
        ${GRUPOS.map(g => `<h3 class="mrg-seccion">${esc(g.t)}</h3>${g.items.map(chk).join("")}`).join("")}
        <h3 class="mrg-seccion">Barra de la ventana</h3>
        <label class="mrg-fila-ajuste"><input type="checkbox" data-aj="barraAuto" ${leer("barraAuto") ? "checked" : ""}><span><strong>Esconder la barra de la hoja</strong><small>La barra con los iconos (compacta, libretos, heridas…) se esconde y aparece al acercar el cursor a la parte de arriba de la hoja, para verla más limpia.</small></span></label>
        <h3 class="mrg-seccion">Dados</h3>
        <label class="mrg-fila-ajuste"><input type="checkbox" data-aj="dadosPropios" ${leer("dadosPropios") ? "checked" : ""}><span><strong>Dados de Wicked Ones</strong><small>Caras de color de menos a más, con el emblema del Señor Oscuro en el 6: en las tarjetas del chat y en Dice So Nice (si lo tienes; con él, cada jugador puede cambiarlo en su configuración de dados).</small></span></label>
        <h3 class="mrg-seccion">Ayuda</h3>
        <label class="mrg-fila-ajuste"><input type="checkbox" data-aj="ayudaActiva" ${leer("ayudaActiva") ? "checked" : ""}><span><strong>Explicar al detener el cursor</strong><small>Si dejas el cursor quieto sobre algo, un globo explica qué es y cómo se usa.</small></span></label>
        <label class="mrg-campo"><span class="mrg-etiqueta">Espera antes de explicar: <b data-etq="ayudaRetraso">${n(leer("ayudaRetraso"), 2)} s</b></span>
          <input type="range" data-aj="ayudaRetraso" min="0.5" max="5" step="0.5" value="${n(leer("ayudaRetraso"), 2)}"></label>
        <h3 class="mrg-seccion">Tamaño y tinta</h3>
        <label class="mrg-campo"><span class="mrg-etiqueta">Tamaño de texto: <b data-escala>${n(leer("a11yEscala"), 100)}%</b></span>
          <input type="range" data-aj="a11yEscala" min="85" max="160" step="5" value="${n(leer("a11yEscala"), 100)}"></label>
        <label class="mrg-campo"><span class="mrg-etiqueta">Tinta de la lectura limpia</span><select data-aj="a11yTinta">${tintas}</select></label>
        <div class="mrg-pie"><button type="button" class="mrg-btn" data-action="reiniciar"><i class="fa-solid fa-rotate-left"></i> Restablecer todo</button></div>
      </section>
      <aside class="mrg-aspecto-col mrg-aspecto-previa" aria-label="Vista previa">
        <h3 class="mrg-seccion">Vista previa</h3>
        ${htmlTarjeta(MUESTRA, { vista: true })}
        <div class="mrg-previa-pips"><div class="mrg-pips" aria-hidden="true"><span class="mrg-pip" aria-pressed="true"></span><span class="mrg-pip" aria-pressed="true"></span><span class="mrg-pip" aria-pressed="false"></span><span class="mrg-pip mrg-pip--corazon" aria-pressed="true"></span></div>
        <span class="mrg-btn mrg-btn--sangre">Botón de ejemplo</span></div>
      </aside>
    </div>`;
  }

  _replaceHTML(result, content) {
    content.innerHTML = result;
    content.querySelectorAll("[data-aj]").forEach(el => {
      el.addEventListener("change", async () => {
        const k = el.dataset.aj;
        const v = el.type === "checkbox" ? el.checked : el.type === "range" ? Number(el.value) : el.value;
        await game.settings.set(MOD, k, v);
        if (k === "estiloHojas" || k === "estiloTiradas") { this.#recarga = true; this.render(); }
        else if (k === "a11yEscala") { const b = content.querySelector("[data-escala]"); if (b) b.textContent = `${v}%`; }
        else if (k === "ayudaRetraso") { const b = content.querySelector('[data-etq="ayudaRetraso"]'); if (b) b.textContent = `${v} s`; }
        else this.render();
      });
    });
  }

  static async #reiniciar() {
    for (const [k, v] of Object.entries(DEFECTOS)) await game.settings.set(MOD, k, v);
    this.#recarga = true;
    this.render();
  }
  static #recargar() { foundry.utils.debouncedReload?.() ?? location.reload(); }
}

export function abrirPanelAspecto() {
  const previa = foundry.applications.instances?.get?.("mr-wo-aspecto");
  if (previa) { previa.render(true); return previa; }
  const p = new PanelAspecto();
  p.render(true);
  return p;
}
