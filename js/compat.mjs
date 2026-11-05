/**
 * Capa de aislamiento de compatibilidad entre Foundry VTT v13 y v14 (`compat.mjs`).
 * El resto del código nunca pregunta por la versión de Foundry.
 */

export const soyGM = () => game.user === game.users?.activeGM;

/**
 * Obtiene el modo de tirada actual compatible con v13 y v14.
 */
export function obtenerModoTirada() {
  try {
    return game.settings.get("core", "messageMode") ?? game.settings.get("core", "rollMode") ?? CONST.DICE_ROLL_MODES?.PUBLIC ?? "publicroll";
  } catch {
    try {
      return game.settings.get("core", "rollMode") ?? "publicroll";
    } catch {
      return "publicroll";
    }
  }
}

/**
 * Aplica el modo de tirada / mensaje a los datos de un ChatMessage en v13 y v14.
 */
export function aplicarModoMensaje(datosMensaje, modo) {
  const m = modo || obtenerModoTirada();
  if (typeof ChatMessage.applyMode === "function") return ChatMessage.applyMode(datosMensaje, m);
  if (typeof ChatMessage.applyRollMode === "function") return ChatMessage.applyRollMode(datosMensaje, m);
  if (["gmroll", "blindroll"].includes(m)) {
    datosMensaje.whisper = ChatMessage.getWhisperRecipients("GM");
  }
  return datosMensaje;
}

/**
 * Inserta un botón en la barra de controles de escena tanto en DOM v13 como v14.
 */
export function insertarControlEscena(html, claseLi, icono, titulo, callback) {
  const raiz = html instanceof HTMLElement ? html : html?.[0];
  const menu = raiz?.querySelector("#scene-controls-layers") ?? raiz?.querySelector(".main-controls") ?? raiz?.firstElementChild;
  if (!menu || menu.querySelector(`.${claseLi}`)) return;

  const li = document.createElement("li");
  li.classList.add(claseLi);

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `control ui-control layer icon ${icono}`;
  btn.dataset.tooltip = titulo;
  btn.setAttribute("aria-label", titulo);
  btn.addEventListener("click", ev => {
    ev.preventDefault();
    callback(ev);
  });

  li.appendChild(btn);
  menu.appendChild(li);
}
