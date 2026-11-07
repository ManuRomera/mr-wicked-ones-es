/**
 * Primer arranque: asistente de instalación (importar TODO al mundo o solo ordenar los compendios),
 * importación de la campaña compatible con v13/v14 y aviso de actualización.
 * Se puede repetir cuando se quiera desde Configuración → MR- Wicked Ones.
 */
import { organizarCompendios } from "./carpetas.mjs";
import { empezarTutorial } from "./tutorial.mjs";

const MOD = "mr-wicked-ones-es";
const { DialogV2 } = foundry.applications.api;
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
let alImportar = async () => {};

export function configurarInicio({ despues } = {}) {
  if (despues) alImportar = despues;
}

/** Un mundo «vacío» ignora la escena de bienvenida que crea Foundry (su fondo empieza por «nue/»). */
export function mundoVacio() {
  const escenasPropias = game.scenes.contents.filter(s => !String(s.background?.src ?? "").startsWith("nue/"));
  return escenasPropias.length === 0 && game.actors.size === 0 && game.items.size === 0;
}

/** Nunca se pisa a un PJ que ya esté jugando al reimportar la campaña. */
function respetarPJ(importData) {
  if (!importData?.toUpdate?.Actor) return;
  importData.toUpdate.Actor = importData.toUpdate.Actor.filter(a => game.actors.get(a._id)?.flags?.[MOD]?.tipo !== "pj");
}

export async function importarCampana() {
  const pack = game.packs.get(`${MOD}.aventura-es`);
  if (!pack) return ui.notifications.error("No se encuentra el compendio de la campaña.");
  const adv = (await pack.getDocuments())[0];
  if (!adv) return ui.notifications.error("El compendio de la campaña está vacío.");

  ui.notifications.info("Importando la campaña y todo el contenido de Wicked Ones…");
  await adv.import({ dialog: false, preImport: [respetarPJ] });
  await game.settings.set(MOD, "versionImportada", game.modules.get(MOD)?.version ?? "0.0.0");

  const portada = game.scenes.find(s => s.flags?.[MOD]?.clave === "portada");
  if (portada) await portada.activate();
  const inicio = game.journal.find(j => j.flags?.[MOD]?.clave === "empieza-aqui");
  inicio?.sheet?.render(true);
  await alImportar();
  ui.notifications.info("Wicked Ones: contenido importado y ordenado en carpetas.");
}

export async function abrirAsistente({ primeraVez = false } = {}) {
  const hayContenido = !mundoVacio();
  const elegido = await DialogV2.wait({
    window: { title: "MR · Wicked Ones — instalación", icon: "fa-solid fa-dungeon" },
    position: { width: 580 },
    rejectClose: false,
    content: `
      <p>${primeraVez ? "Bienvenido a <strong>Wicked Ones</strong>." : "Asistente de instalación de <strong>MR- Wicked Ones</strong>."}
      ¿Cómo quieres tener el contenido?</p>
      <ul class="mr-wo-lista-opciones">
        <li><strong>Importar todo al mundo</strong>: la campaña «El Valle Silencioso», las escenas con su lectura y música,
        los personajes, aventureros, facciones, objetos, tablas y diarios, ya ordenados en carpetas.</li>
        <li><strong>Solo ordenar los compendios</strong>: no se importa nada; los compendios del sistema y los de este módulo
        quedan en carpetas separadas para ir cogiendo lo que haga falta.</li>
      </ul>
      ${hayContenido ? `<p class="notes"><i class="fa-solid fa-triangle-exclamation"></i> Este mundo ya tiene contenido: al importar se actualizará lo que ya vino de este módulo, sin tocar a tus personajes.</p>` : ""}
      <label class="mr-wo-check"><input type="checkbox" name="tutorial" ${primeraVez ? "checked" : ""}> Después, enséñame cómo funciona todo (tutorial guiado)</label>`,
    buttons: [
      { action: "todo", label: "Importar todo al mundo", icon: "fa-solid fa-download", default: true,
        callback: (ev, btn, dlg) => ({ accion: "todo", tutorial: dlg.element.querySelector("[name=tutorial]")?.checked }) },
      { action: "compendios", label: "Solo ordenar los compendios", icon: "fa-solid fa-folder-tree",
        callback: (ev, btn, dlg) => ({ accion: "compendios", tutorial: dlg.element.querySelector("[name=tutorial]")?.checked }) },
      { action: "luego", label: "Más tarde", icon: "fa-solid fa-clock", callback: () => ({ accion: "luego" }) }
    ]
  });
  if (!elegido || elegido.accion === "luego") return false;

  await organizarCompendios();
  if (elegido.accion === "todo") await importarCampana();
  await game.settings.set(MOD, "asistenteHecho", true);
  if (elegido.tutorial) setTimeout(() => empezarTutorial(game.user.isGM ? "director" : "jugadores"), 1200);
  return true;
}

async function avisarActualizacion() {
  const actual = game.modules.get(MOD)?.version ?? "0.0.0";
  const previa = game.settings.get(MOD, "versionImportada");
  if (previa === "0.0.0" || !foundry.utils.isNewerVersion(actual, previa)) return;
  const si = await DialogV2.confirm({
    window: { title: "MR · Wicked Ones — actualización", icon: "fa-solid fa-arrows-rotate" },
    content: `<p>Hay contenido nuevo de <em>MR- Wicked Ones</em> (${esc(actual)}; tienes ${esc(previa)}). ¿Lo actualizo en el mundo? No se tocan tus personajes.</p>`,
    yes: { label: "Actualizar", icon: "fa-solid fa-download" },
    no: { label: "Más tarde" },
    rejectClose: false
  });
  if (si) await importarCampana();
}

/** Llamar desde el hook `ready` (solo quien dirige). */
export async function arrancar() {
  if (!game.user.isGM) return;
  if (!game.settings.get(MOD, "asistenteHecho") && game.settings.get(MOD, "autoImportar") && mundoVacio()) {
    await abrirAsistente({ primeraVez: true });
  } else if (game.settings.get(MOD, "asistenteHecho")) {
    await organizarCompendios().catch(() => 0);
    await avisarActualizacion();
  }
}

/** Botones del menú Configuración → MR- Wicked Ones (ApplicationV2 «de mentira»: solo ejecutan la acción). */
function menu(accion) {
  return class extends foundry.applications.api.ApplicationV2 {
    async render() { accion(); return this; }
  };
}
export function registrarMenus() {
  game.settings.registerMenu(MOD, "menuAsistente", {
    name: "Asistente de instalación", label: "Abrir el asistente", icon: "fa-solid fa-dungeon",
    hint: "Importar toda la campaña al mundo o solo ordenar los compendios en carpetas.",
    type: menu(() => abrirAsistente()), restricted: true
  });
  game.settings.registerMenu(MOD, "menuTutorial", {
    name: "Tutorial guiado", label: "Empezar el tutorial", icon: "fa-solid fa-graduation-cap",
    hint: "Recorrido paso a paso por las hojas, las tiradas, el generador y la dirección de partida.",
    type: menu(() => empezarTutorial(game.user.isGM ? "director" : "jugadores"))
  });
  game.settings.registerMenu(MOD, "menuCarpetas", {
    name: "Ordenar compendios", label: "Separar sistema y módulo", icon: "fa-solid fa-folder-tree",
    hint: "Agrupa en una carpeta lo que trae el sistema y deja en otra lo que aporta este módulo.",
    type: menu(async () => { const n = await organizarCompendios(); ui.notifications.info(n ? `${n} compendios ordenados.` : "Los compendios ya estaban ordenados."); }),
    restricted: true
  });
}
