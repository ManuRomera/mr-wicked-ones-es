/**
 * Mejoras de interfaz, accesibilidad, modo oscuro, ficha resumida, traducción DOM en vivo (TreeWalker)
 * y corrección de bugs de plantillas de Wicked Ones y Babele.
 */

import { abrirPanelAspecto } from "./ajustes.mjs";

const MOD = "mr-wicked-ones-es";
const n = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

let diccionarioLiterales = { exactos: {}, patrones: [] };

export async function cargarLiterales() {
  try {
    const resp = await fetch(`modules/${MOD}/lang/literales.json`);
    if (resp.ok) {
      const json = await resp.json();
      diccionarioLiterales.exactos = json.exactos || {};
      diccionarioLiterales.patrones = (json.patrones || []).map(p => ({
        re: new RegExp(p.regex),
        reemplazo: p.reemplazo
      }));
    }
  } catch (e) {
    console.warn(`${MOD} | No se pudo cargar literales.json:`, e);
  }
}

/**
 * Traduce un texto suelto si coincide con el diccionario de literales o patrones.
 */
function traducirCadena(txt) {
  const limpio = txt.trim();
  if (!limpio) return null;
  if (diccionarioLiterales.exactos[limpio]) {
    return txt.replace(limpio, diccionarioLiterales.exactos[limpio]);
  }
  for (const { re, reemplazo } of diccionarioLiterales.patrones) {
    if (re.test(limpio)) {
      return txt.replace(limpio, limpio.replace(re, reemplazo));
    }
  }
  return null;
}

/**
 * Recorre todos los nodos de texto de un contenedor con TreeWalker y traduce literales en inglés.
 */
export function traducirNodoDOM(raiz) {
  if (!raiz) return;
  try {
    if (!game.settings.get(MOD, "traducirDOM")) return;
  } catch {
    // Continuar si aún no está listo
  }

  const walker = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, null);
  const nodos = [];
  let actual = walker.nextNode();
  while (actual) {
    const tag = actual.parentElement?.tagName;
    if (tag !== "SCRIPT" && tag !== "STYLE" && tag !== "TEXTAREA") {
      nodos.push(actual);
    }
    actual = walker.nextNode();
  }

  for (const nodo of nodos) {
    const nuevo = traducirCadena(nodo.nodeValue || "");
    if (nuevo && nuevo !== nodo.nodeValue) {
      nodo.nodeValue = nuevo;
    }
  }

  // Traducir también placeholders y títulos en inglés
  raiz.querySelectorAll?.("[placeholder], [title], [data-tooltip]").forEach(el => {
    for (const attr of ["placeholder", "title", "data-tooltip"]) {
      const val = el.getAttribute(attr);
      if (val) {
        const tr = traducirCadena(val);
        if (tr) el.setAttribute(attr, tr);
      }
    }
  });
}

/**
 * Normaliza los tipos de tirada de las Labores (Duties) en español para que el botón de dado
 * de la hoja de personaje no falle cuando type_custom está traducido.
 */
function corregirBotonesLaboresEnFicha(app, raiz) {
  const actor = app?.actor || app?.document;
  if (!actor || !raiz) return;

  raiz.querySelectorAll("#duties-table tr.item").forEach(fila => {
    const itemId = fila.dataset.itemId;
    const item = actor.items?.get(itemId);
    const dado = fila.querySelector(".roll-die-attribute");
    if (!dado || !item) return;

    const t = String(item.system?.type || "");
    const tc = String(item.system?.type_custom || "").toLowerCase();
    let rollType = "fortune";
    if (t.endsWith(".Creature") || tc.includes("criatura") || tc.includes("creature")) rollType = "creature";
    else if (t.endsWith(".Trap") || tc.includes("trampa") || tc.includes("trap")) rollType = "trap";
    else if (t.endsWith(".Lock") || tc.includes("cerradura") || tc.includes("portón") || tc.includes("lock")) rollType = "lock";
    else if (t.endsWith(".Discovery") || tc.includes("hallazgo") || tc.includes("descubrimiento") || tc.includes("discovery")) rollType = "discovery";
    else rollType = "fortune";

    dado.dataset.rollType = rollType;
    dado.setAttribute("data-roll-type", rollType);
  });
}

/**
 * Añade botones de cabecera (Accesibilidad, Ficha Resumida y Asistente MR) a las hojas de Wicked Ones.
 */
function inyectarBotonesCabecera(app, raiz) {
  if (app?.options?.classes?.includes("mrg-hoja")) return;
  const ventana = raiz.closest?.(".app.window-app") || raiz;
  const header = ventana?.querySelector?.(".window-header");
  if (!header || header.querySelector(".mr-wo-header-btn")) return;

  const closeBtn = header.querySelector(".close");
  if (!closeBtn) return;

  // Botón Asistente MR
  const btnGen = document.createElement("a");
  btnGen.className = "header-button control mr-wo-header-btn";
  btnGen.title = "Abrir Asistente y Generador MR";
  btnGen.innerHTML = '<i class="fas fa-dungeon"></i>';
  btnGen.addEventListener("click", ev => {
    ev.preventDefault();
    game.modules.get(MOD)?.api?.abrirGenerador();
  });

  // Botón Accesibilidad / Modo Oscuro
  const btnA11y = document.createElement("a");
  btnA11y.className = "header-button control mr-wo-header-btn";
  btnA11y.title = "Accesibilidad y Modo Oscuro (MR)";
  btnA11y.innerHTML = '<i class="fas fa-universal-access"></i>';
  btnA11y.addEventListener("click", ev => {
    ev.preventDefault();
    abrirPanelAspecto();
  });

  header.insertBefore(btnGen, closeBtn);
  header.insertBefore(btnA11y, closeBtn);
}

/**
 * Registra los hooks de mejora de hojas, Babele y observador DOM.
 */
export function inicializarMejoras() {
  // Registrar nuestras traducciones/parches de Babele adicionales
  Hooks.once("babele.init", babele => {
    babele.register({
      module: MOD,
      lang: "es",
      dir: "compendium/es"
    });
  });

  Hooks.on("renderActorSheet", (app, html) => {
    const raiz = html instanceof HTMLElement ? html : html?.[0];
    if (!raiz) return;
    traducirNodoDOM(raiz);
    corregirBotonesLaboresEnFicha(app, raiz);
    inyectarBotonesCabecera(app, raiz);
  });

  Hooks.on("renderItemSheet", (app, html) => {
    const raiz = html instanceof HTMLElement ? html : html?.[0];
    if (!raiz) return;
    traducirNodoDOM(raiz);

    // Corregir bug del sistema base en adventurer.html (motivation_1_custom muestra motivation_2_custom)
    const inputMot1 = raiz.querySelector("#adventurer-motivation-1-custom");
    if (inputMot1 && app.item?.system) {
      inputMot1.value = app.item.system.motivation_1_custom ?? "";
    }
  });

  Hooks.on("renderDialog", (app, html) => {
    const raiz = html instanceof HTMLElement ? html : html?.[0];
    if (raiz) traducirNodoDOM(raiz);
  });
}
