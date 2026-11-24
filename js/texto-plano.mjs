/**
 * Las fichas de objeto del sistema enseñan la descripción en un <textarea>: si llega HTML (contenido importado de versiones
 * anteriores del módulo), se ve en crudo («<p>…</p>»). Esto lo pasa a texto plano al arrancar (DJ activo) y al crear objetos.
 * Mismo mapa que TEXTO_PLANO en tools/ensamblar.py, que ya genera los compendios limpios.
 */
const CAMPOS = {
  calling: ["description", "flashback_clues"], dungeon_theme: ["description", "special_name", "special_feature"],
  wickedimpulse: ["description"], gearsupply: ["description"], minionimpulse: ["description"],
  monster_race: ["description", "flashback_clues"], conquest_ability: ["description"], duty: ["description"],
  minion_upgrade: ["description"], tier3room: ["description", "requirements"], project: ["description"],
  defense: ["description"], minion_type: ["description"], revelry: ["description"], awakened_type: ["description"],
  specialability: ["description", "supply_desc", "downtime_desc", "primal.be_psi_desc_1", "primal.be_psi_desc_2",
    "primal.gm_desc_1", "primal.gm_desc_2", "primal.gm_desc_3"]
};
const ETIQUETA = /<[a-zA-Z/][^>]*>/;

export function plano(v) {
  if (typeof v !== "string" || !ETIQUETA.test(v)) return v;
  const t = v.replace(/<br\s*\/?>/gi, "\n").replace(/<li[^>]*>/gi, "• ").replace(/<\/(p|div|li|h\d|ul|ol|blockquote)>/gi, "\n\n")
    .replace(/<[^>]+>/g, "");
  const txt = document.createElement("textarea");
  txt.innerHTML = t;   // decodifica entidades (&amp;, &nbsp;…) sin ejecutar nada
  return txt.value.split("\n").map(l => l.replace(/[ \t]+/g, " ").trim()).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Cambios para un objeto (o sus datos de origen) con HTML en campos de texto plano; null si no hace falta. */
function cambios(item) {
  const campos = CAMPOS[item?.type];
  if (!campos) return null;
  const c = {};
  for (const k of campos) {
    const v = foundry.utils.getProperty(item.system ?? {}, k);
    const p = plano(v);
    if (p !== v) c[`system.${k}`] = p;
  }
  return Object.keys(c).length ? c : null;
}

export async function migrarTextoPlano() {
  const sueltos = game.items.contents.map(i => ({ _id: i.id, ...cambios(i) })).filter(u => Object.keys(u).length > 1);
  if (sueltos.length) await Item.updateDocuments(sueltos);
  let n = sueltos.length;
  for (const a of game.actors) {
    const ups = a.items.contents.map(i => ({ _id: i.id, ...cambios(i) })).filter(u => Object.keys(u).length > 1);
    if (ups.length) { await a.updateEmbeddedDocuments("Item", ups); n += ups.length; }
  }
  if (n) console.log(`mr-wicked-ones-es | ${n} descripciones de objeto pasadas a texto plano`);
}

Hooks.on("preCreateItem", (item, datos) => {
  const c = cambios({ type: item.type, system: datos.system ?? item._source.system });
  if (c) item.updateSource(c);
});
