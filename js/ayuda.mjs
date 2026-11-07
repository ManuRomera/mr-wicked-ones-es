/**
 * Ayuda contextual de MR- Wicked Ones: al dejar el cursor quieto sobre un elemento con `data-ayuda` (o con `title`,
 * dentro de las ventanas y tarjetas del módulo) aparece una explicación pasados unos segundos (por defecto 2).
 * Ajustes de cliente: `ayudaActiva` y `ayudaRetraso` (segundos). Cualquier clic, tecla o movimiento fuera la oculta.
 * Formato: data-ayuda="Título || explicación" (el título es opcional).
 */
const MOD = "mr-wicked-ones-es";
const ZONAS = ".mrg, .mrg-msg, .mrg-ventana, .app.mrg-hoja";

let temporizador = null;
let globo = null;
let objetivo = null;
let pos = { x: 0, y: 0 };

const leer = (k, d) => { try { return game.settings.get(MOD, k); } catch { return d; } };
const retraso = () => Math.max(0.3, Number(leer("ayudaRetraso", 2)) || 2) * 1000;

function ocultar() {
  clearTimeout(temporizador);
  temporizador = null;
  globo?.remove();
  globo = null;
  objetivo = null;
}

/** Ayudas por tipo de control, para las hojas que no llevan `data-ayuda` en cada elemento: [selector, "Título || texto"]. */
const AUTO = [
  ["[data-fortuna]", "Tirada de fortuna||Tira tantos d6 como se indica y se queda con el mejor: 6 sale bien, 4-5 sale a medias, 1-3 sale mal. Dos 6 son un crítico. Con 0d se tiran dos y cuenta el peor."],
  ["[data-tirar]", "Tirar la acción||Abre la tirada con tus puntos en esta acción. Con Alt pulsado la tiras como resistencia."],
  ["[data-tirada-tipo]", "Tirada||Abre el diálogo de tirada para elegir acción, ayuda, «darlo todo» y pacto oscuro."],
  ["[data-pip*='number.value']", "Número de esbirros||Cuántos esbirros quedan en la manada. Pulsa el último que quieras que cuente."],
  ["[data-pip*='tier.value']", "Nivel||Determina los dados de sus tiradas de fortuna y lo peligroso que es."],
  ["[data-pip*='clock']", "Reloj||Marca un segmento cada vez que avanza. Al llenarlo, ocurre lo que anuncia."],
  ["[data-pip*='candle']", "Progreso||Pulsa un segmento para marcarlo o desmarcarlo."],
  ["[data-pip*='_value.value']", "Valor||Pulsa un punto para fijarlo; pulsa el mismo otra vez para bajarlo."],
  ["[data-pip]", "Casilla||Pulsa para marcarla; pulsa la última marcada para quitarla."],
  ["[data-toggle*='empowered']", "Empoderado||Esta conquista está reforzada y cuenta con ventaja."],
  ["[data-toggle*='threatened']", "Amenazado||Algo pone en peligro esta conquista."],
  ["[data-toggle*='is_primary']", "Facción primaria||Marca la facción principal de la campaña."],
  ["[data-toggle]", "Interruptor||Pulsa para activarlo o desactivarlo."],
  ["[data-fase]", "Fase del ciclo||Marca en qué momento del ciclo de juego está la mesa; debajo salen las pistas de esa fase."],
  ["[data-asistente]", "Asistente||Abre el asistente de la mesa con tiradas, tablas y generadores."],
  ["[data-num]", "Avanzar o retroceder||Sube o baja el valor en una unidad."],
  ["[data-selector]", "Elegir||Abre el catálogo con buscador y categorías para añadir esto a la hoja."],
  ["[data-herida]", "Heridas||Hiere o cura medio corazón; el botón de la flecha curva lo cura todo."],
  ["[data-corazon]", "Corazón||Pulsa para marcar o quitar daño en este corazón (cada corazón son dos mitades)."],
  ["[data-uso]", "Movimiento gastado||Marca los movimientos que ya ha usado en esta escena."],
  ["[data-abrir]", "Abrir||Abre la ficha completa de este elemento."],
  ["[data-borrar]", "Quitar||Quita este elemento de la hoja (pide confirmación)."],
  ["[data-item-check]", "Casilla||Márcala cuando se cumpla."],
  ["[data-select]", "Selector||Cambia este valor."],
  ["[data-set]", "Opción||Elige esta opción."]
];

function textoDe(el) {
  // Los `title` nativos se convierten en ayuda propia para que no salgan dos globos a la vez
  const t = el.closest("[title]");
  if (t && t.closest(ZONAS)) {
    t.dataset.ayuda ||= t.getAttribute("title");
    t.removeAttribute("title");
  }
  const propia = el.closest("[data-ayuda]");
  if (propia || !el.closest(ZONAS)) return propia;
  for (const [sel, txt] of AUTO) {
    const c = el.closest(sel);
    if (c && c.closest(ZONAS)) { c.dataset.ayuda = txt; return c; }
  }
  return null;
}

function mostrar(el) {
  const texto = el.dataset.ayuda;
  if (!texto) return;
  globo?.remove();
  globo = document.createElement("div");
  globo.className = "mrg mrg-ayuda";
  globo.setAttribute("role", "tooltip");
  const [titulo, ...resto] = texto.split("||");
  const e = foundry.utils.escapeHTML;
  globo.innerHTML = resto.length ? `<strong>${e(titulo.trim())}</strong><span>${e(resto.join("||").trim())}</span>` : `<span>${e(texto)}</span>`;
  document.body.append(globo);
  const r = globo.getBoundingClientRect();
  const x = Math.min(window.innerWidth - r.width - 8, Math.max(8, pos.x + 14));
  const y = pos.y + 22 + r.height > window.innerHeight ? pos.y - r.height - 12 : pos.y + 22;
  globo.style.left = `${x}px`;
  globo.style.top = `${Math.max(8, y)}px`;
}

export function registrarAyuda() {
  if (registrarAyuda.hecho) return;
  registrarAyuda.hecho = true;
  document.addEventListener("mouseover", ev => {
    if (!leer("ayudaActiva", true)) return;
    const el = ev.target instanceof Element && ev.target.closest(ZONAS) ? textoDe(ev.target) : null;
    if (el === objetivo) return;
    ocultar();
    if (!el) return;
    objetivo = el;
    temporizador = setTimeout(() => mostrar(el), retraso());
  }, true);
  document.addEventListener("mousemove", ev => {
    pos = { x: ev.clientX, y: ev.clientY };
    // El cursor debe estar «parado»: si se mueve antes de que salga la ayuda, se reinicia la cuenta
    if (objetivo && !globo) {
      clearTimeout(temporizador);
      temporizador = setTimeout(() => objetivo && mostrar(objetivo), retraso());
    } else if (globo && objetivo && !objetivo.contains(ev.target)) ocultar();
  }, true);
  for (const tipo of ["mousedown", "keydown", "wheel", "dragstart"]) document.addEventListener(tipo, ocultar, true);
}
