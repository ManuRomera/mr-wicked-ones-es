/**
 * Organización de compendios: lo que trae el SISTEMA (wicked-ones y su traducción) queda en una carpeta y lo que
 * aporta ESTE módulo en otra (las de este módulo las crea Foundry desde `packFolders` de module.json).
 * Los compendios de otros paquetes se tocan una sola vez y nunca se pisan las decisiones del usuario:
 * si alguien mueve un compendio a mano, no se vuelve a mover.
 */

const MOD = "mr-wicked-ones-es";
const PAQUETES_SISTEMA = ["wicked-ones", "wicked-ones-esp"];

async function carpeta(nombre, color, padre = null) {
  const existente = game.folders.find(f => f.type === "Compendium" && f.name === nombre && (f.folder?.id ?? null) === (padre?.id ?? null));
  if (existente) return existente;
  return Folder.create({ name: nombre, type: "Compendium", sorting: "a", color, folder: padre?.id ?? null });
}

/**
 * Agrupa en «Wicked Ones · Sistema base» los compendios del sistema y de su traducción.
 * @returns {Promise<number>} cuántos compendios se movieron
 */
export async function organizarCompendios() {
  if (!game.user.isGM) return 0;
  const packs = game.packs.filter(p => PAQUETES_SISTEMA.includes(p.metadata.packageName));
  if (!packs.length) return 0;

  const config = foundry.utils.deepClone(game.settings.get("core", "compendiumConfiguration") ?? {});
  const pendientes = packs.filter(p => !config[p.collection]?.folder);
  if (!pendientes.length) return 0;

  const raiz = await carpeta("Wicked Ones · Sistema base", "#4a4651");
  const traduccion = await carpeta("Traducción al español (wicked-ones-esp)", "#4a4651", raiz);
  for (const p of pendientes) {
    const destino = p.metadata.packageName === "wicked-ones-esp" ? traduccion : raiz;
    config[p.collection] = { ...(config[p.collection] ?? {}), folder: destino.id };
  }
  await game.settings.set("core", "compendiumConfiguration", config);
  ui.sidebar?.tabs?.compendium?.render?.();
  return pendientes.length;
}

/** Compendios que aporta este módulo. */
export function compendiosPropios() {
  return game.packs.filter(p => p.metadata.packageName === MOD);
}
