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


/* -------------------------------------------------------------------------- */
/*  Reinstalar el contenido del módulo                                        */
/* -------------------------------------------------------------------------- */

const COLECCIONES = { Scene: "scenes", Actor: "actors", Item: "items", RollTable: "tables", JournalEntry: "journal", Macro: "macros", Playlist: "playlists", Folder: "folders" };

async function aventuraDelModulo() {
  const pack = game.packs.get(`${MOD}.aventura-es`);
  return pack ? (await pack.getDocuments())[0] : null;
}

/** Qué cambiaría una reinstalación: documentos del módulo que existen, nuevos y que la versión nueva ya no trae. */
async function resumenReinstalacion(adv) {
  const datos = adv.toObject();
  const ids = {};
  let existen = 0, nuevos = 0;
  for (const [dn, campo] of Object.entries(COLECCIONES)) {
    ids[dn] = new Set((datos[campo] ?? []).map(d => d._id));
    const col = game.collections.get(dn);
    for (const id of ids[dn]) col.has(id) ? existen++ : nuevos++;
  }
  const huerfanos = [];
  for (const dn of Object.keys(COLECCIONES)) {
    for (const d of game.collections.get(dn).contents) if (d.flags?.[MOD]?.contenido && !ids[dn].has(d.id)) huerfanos.push(d);
  }
  return { existen, nuevos, huerfanos };
}

/**
 * Reinstala todo el contenido del módulo: restaura lo suyo a su versión original, añade lo nuevo y retira lo que ya
 * no existe. Lo que no es del módulo (tus actores, escenas, objetos…) no se toca.
 * @param {object} o { soloNuevo: solo crear lo que falte, restaurarPJ: también los personajes de ejemplo }
 */
export async function reinstalarContenido({ soloNuevo = false, restaurarPJ = false } = {}) {
  const adv = await aventuraDelModulo();
  if (!adv) return ui.notifications.error("No se encuentra el compendio de la campaña.");
  const { huerfanos } = await resumenReinstalacion(adv);
  ui.notifications.info("Reinstalando el contenido de MR- Wicked Ones…");
  const preImport = [];
  if (!restaurarPJ) preImport.push(respetarPJ);
  if (soloNuevo) preImport.push(d => { d.toUpdate = {}; });
  await adv.import({ dialog: false, preImport });
  if (!soloNuevo && huerfanos.length) {
    const porTipo = {};
    for (const d of huerfanos) (porTipo[d.documentName] ??= []).push(d.id);
    for (const [dn, lista] of Object.entries(porTipo).sort(([a]) => (a === "Folder" ? 1 : -1))) {
      await getDocumentClass(dn).deleteDocuments(lista).catch(e => console.warn(`${MOD} | no se pudo retirar`, dn, e));
    }
  }
  await game.settings.set(MOD, "versionImportada", game.modules.get(MOD)?.version ?? "0.0.0");
  await organizarCompendios().catch(() => 0);
  await alImportar();
  ui.notifications.info(soloNuevo ? "Contenido nuevo añadido." : `Contenido reinstalado${huerfanos.length ? ` (${huerfanos.length} retirados por ya no existir)` : ""}.`);
}

/** Diálogo de reinstalación (desde el aviso de actualización o desde Configuración). */
export async function dialogoReinstalar({ actualizacion = null } = {}) {
  const adv = await aventuraDelModulo();
  if (!adv) return ui.notifications.error("No se encuentra el compendio de la campaña.");
  const r = await resumenReinstalacion(adv);
  const cab = actualizacion
    ? `<p>Hay una versión nueva de <em>MR- Wicked Ones</em> (<strong>${esc(actualizacion.nueva)}</strong>; tienes el contenido de la ${esc(actualizacion.vieja)}).</p>`
    : `<p>Puedes volver a dejar el contenido de <em>MR- Wicked Ones</em> como viene de fábrica.</p>`;
  const eleccion = await DialogV2.wait({
    window: { title: "MR · Wicked Ones — reinstalar el contenido", icon: "fa-solid fa-arrows-rotate" },
    position: { width: 620 },
    rejectClose: false,
    content: `${cab}
      <ul class="mr-wo-lista-opciones">
        <li><strong>${r.existen}</strong> documentos del módulo ya están en tu mundo: se restauran a su versión original (pierdes los cambios que les hayas hecho).</li>
        <li><strong>${r.nuevos}</strong> son nuevos y se añaden.</li>
        <li><strong>${r.huerfanos.length}</strong> de versiones anteriores ya no existen y se retiran.</li>
      </ul>
      <p class="notes"><i class="fa-solid fa-shield-halved"></i> <strong>No se toca nada que no sea del módulo</strong>: tus personajes, escenas, objetos y diarios propios siguen como están.</p>
      <label class="mr-wo-check"><input type="checkbox" name="pj"> Restaurar también los personajes de ejemplo (por defecto se respetan por si ya los usas)</label>`,
    buttons: [
      { action: "todo", label: "Reinstalar todo el contenido", icon: "fa-solid fa-arrows-rotate", default: true, callback: (ev, b, d) => ({ modo: "todo", pj: d.element.querySelector("[name=pj]")?.checked }) },
      { action: "nuevo", label: "Solo añadir lo nuevo", icon: "fa-solid fa-plus", callback: () => ({ modo: "nuevo" }) },
      { action: "luego", label: "Más tarde", icon: "fa-solid fa-clock", callback: () => ({ modo: "luego" }) }
    ]
  });
  if (!eleccion || eleccion.modo === "luego") return false;
  await reinstalarContenido({ soloNuevo: eleccion.modo === "nuevo", restaurarPJ: Boolean(eleccion.pj) });
  return true;
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
  const hecho = await dialogoReinstalar({ actualizacion: { nueva: actual, vieja: previa } });
  // «Más tarde» vuelve a preguntar en la próxima partida; si se hizo, la versión ya queda guardada.
  return hecho;
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
  game.settings.registerMenu(MOD, "menuReinstalar", {
    name: "Reinstalar el contenido", label: "Reinstalar todo", icon: "fa-solid fa-arrows-rotate",
    hint: "Restaura el contenido de este módulo en el mundo a su versión original, añade lo nuevo y retira lo que ya no existe. No toca nada que no sea del módulo.",
    type: menu(() => dialogoReinstalar()), restricted: true
  });
  game.settings.registerMenu(MOD, "menuCarpetas", {
    name: "Ordenar compendios", label: "Separar sistema y módulo", icon: "fa-solid fa-folder-tree",
    hint: "Agrupa en una carpeta lo que trae el sistema y deja en otra lo que aporta este módulo.",
    type: menu(async () => { const n = await organizarCompendios(); ui.notifications.info(n ? `${n} compendios ordenados.` : "Los compendios ya estaban ordenados."); }),
    restricted: true
  });
}
