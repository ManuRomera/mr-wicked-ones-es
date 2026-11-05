/**
 * Mejoras de interfaz, accesibilidad, modo oscuro, ficha resumida, traducción DOM en vivo (TreeWalker)
 * y corrección de bugs de plantillas de Wicked Ones y Babele.
 */

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
 * Aplica las clases globales de accesibilidad y modo oscuro en document.body.
 */
export function aplicarClasesAccesibilidad() {
  const body = document.body;
  if (!body) return;

  // Si mr-mothership-es está activo, podemos sincronizar o respetar sus ajustes si existen
  const moshActivo = game.modules.get("mr-mothership-es")?.active;
  const leer = (claveMosh, clavePropia, def) => {
    try {
      if (moshActivo && game.settings.settings.has(`mr-mothership-es.${claveMosh}`)) {
        return game.settings.get("mr-mothership-es", claveMosh);
      }
      return game.settings.get(MOD, clavePropia);
    } catch {
      return def;
    }
  };

  const oscuro = leer("a11y-oscuro", "a11yOscuro", true);
  const contraste = leer("a11y-contraste", "a11yContraste", false);
  const legible = leer("a11y-legible", "a11yLegible", false);
  const escala = n(leer("a11y-escala", "a11yEscala", 100), 100);

  body.classList.toggle("mr-wo-oscuro", Boolean(oscuro));
  body.classList.toggle("mr-wo-contraste", Boolean(contraste));
  body.classList.toggle("mr-wo-legible", Boolean(legible));
  body.style.setProperty("--mr-wo-escala", `${escala / 100}`);
}

/**
 * Abre un diálogo rápido de accesibilidad y modo oscuro al pulsar el botón fa-universal-access.
 */
export function abrirMenuAccesibilidad() {
  const oscuro = game.settings.get(MOD, "a11yOscuro");
  const contraste = game.settings.get(MOD, "a11yContraste");
  const legible = game.settings.get(MOD, "a11yLegible");
  const escala = n(game.settings.get(MOD, "a11yEscala"), 100);

  const DialogV1 = foundry.appv1?.api?.Dialog ?? Dialog;
  new DialogV1({
    title: "MR · Accesibilidad y Modo Oscuro",
    content: `
      <form class="mr-wo-form-dialogo">
        <div class="form-group">
          <label><input type="checkbox" name="oscuro" ${oscuro ? "checked" : ""} /> Modo oscuro en hojas y diálogos</label>
        </div>
        <div class="form-group">
          <label><input type="checkbox" name="contraste" ${contraste ? "checked" : ""} /> Alto contraste de lectura</label>
        </div>
        <div class="form-group">
          <label><input type="checkbox" name="legible" ${legible ? "checked" : ""} /> Tipografía de alta legibilidad</label>
        </div>
        <div class="form-group">
          <label>Escala de texto (${escala} %):</label>
          <input type="range" name="escala" min="90" max="125" step="5" value="${escala}" />
        </div>
      </form>
    `,
    buttons: {
      guardar: {
        icon: '<i class="fas fa-check"></i>',
        label: "Aplicar",
        callback: async jq => {
          const root = jq instanceof HTMLElement ? jq : jq[0];
          await game.settings.set(MOD, "a11yOscuro", Boolean(root.querySelector('[name="oscuro"]')?.checked));
          await game.settings.set(MOD, "a11yContraste", Boolean(root.querySelector('[name="contraste"]')?.checked));
          await game.settings.set(MOD, "a11yLegible", Boolean(root.querySelector('[name="legible"]')?.checked));
          await game.settings.set(MOD, "a11yEscala", n(root.querySelector('[name="escala"]')?.value, 100));
          aplicarClasesAccesibilidad();
        }
      }
    },
    default: "guardar"
  }).render(true);
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

  // Botón Ficha Resumida
  const btnRes = document.createElement("a");
  btnRes.className = "header-button control mr-wo-header-btn";
  btnRes.title = "Alternar modo compacto (mr-resumida)";
  btnRes.innerHTML = '<i class="fas fa-compress-alt"></i>';
  btnRes.addEventListener("click", ev => {
    ev.preventDefault();
    ventana.classList.toggle("mr-resumida");
  });

  // Botón Accesibilidad / Modo Oscuro
  const btnA11y = document.createElement("a");
  btnA11y.className = "header-button control mr-wo-header-btn";
  btnA11y.title = "Accesibilidad y Modo Oscuro (MR)";
  btnA11y.innerHTML = '<i class="fas fa-universal-access"></i>';
  btnA11y.addEventListener("click", ev => {
    ev.preventDefault();
    abrirMenuAccesibilidad();
  });

  header.insertBefore(btnGen, closeBtn);
  header.insertBefore(btnRes, closeBtn);
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
