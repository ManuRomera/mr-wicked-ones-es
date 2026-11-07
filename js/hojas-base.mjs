/**
 * Base común de las hojas de MR- Wicked Ones: cada hoja nueva hereda la del sistema (conserva datos, arrastrar y soltar
 * y la gestión de objetos) y pinta una plantilla propia. Aquí viven la fábrica de hojas, el registro por tipo de actor y
 * las escuchas compartidas, que se activan con atributos de datos en las plantillas:
 *   data-pip="system.x.value" data-n="3"        casilla de un contador del actor (pulsar de nuevo baja una)
 *   data-toggle="system.x"                      interruptor booleano del actor
 *   data-item-pip="<id>" data-campo="system.x"  casilla de un contador de un objeto
 *   data-item-check="<id>" data-campo="x"       casilla booleana de un objeto (system.x)
 *   data-num="system.x" data-delta="1"          paso +/− con data-min / data-max
 *   data-fase="n"                               fase del ciclo de juego (hoja del DJ)
 *   data-corazon="j" data-item="<id>"           corazón de un aventurero (marcas de herida)
 *   data-abrir / data-borrar="<id>"             abrir o quitar un objeto
 *   data-ir="pestaña"                           saltar de pestaña
 *   data-tirar="acción" · data-fortuna="dados"  tiradas
 */
import { n } from "./core/reglas.mjs";
import { abrirTirada } from "./tirada-dialogo.mjs";
import { tirar } from "./tirada.mjs";
import { aplicarEstresActor } from "./automatismos.mjs";

export const MOD = "mr-wicked-ones-es";
export const L = (k, d = "") => { const v = game.i18n.localize(k); return v === k ? d : v; };
export const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
export const pips = (valor, max) => Array.from({ length: Math.max(0, n(max, 0)) }, (_, i) => ({ n: i + 1, on: i < n(valor, 0) }));

/** Clase de hoja del sistema registrada para un tipo de actor. */
export function claseSistema(tipo) {
  return Object.values(CONFIG.Actor?.sheetClasses?.[tipo] ?? {}).find(r => String(r.id).startsWith("wicked-ones."))?.cls ?? null;
}

/** Corazones de un aventurero (o ayudante): 0 = entero, 1 = medio tajo, 2 = roto. Las heridas se reparten desde la derecha. */
export function corazonesDe(item) {
  const total = item.system.adventurer_type === "hireling" ? 1 : n(item.system.tier, 0) + 1;
  let marcas = n(item.system.heart_slashes, 0);
  const estados = Array(total).fill(0);
  for (let j = total - 1; j >= 0; j--) {
    if (marcas > 1) { estados[j] = 2; marcas -= 2; } else if (marcas === 1) { estados[j] = 1; marcas = 0; }
  }
  return estados.map((e, i) => ({ j: i + 1, estado: e }));
}

/**
 * Fábrica de hojas.
 * @param {Function} Base hoja del sistema
 * @param {object} cfg { clase, plantilla, ancho, alto, pestanas: {inicial}|null, modelo: async (actor, hoja, d) => object, extra: (hoja, html) => void }
 */
export function crearHoja(Base, cfg) {
  return class HojaMR extends Base {
    static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
        classes: ["mrg", "mrg-hoja", "sheet", "actor", cfg.clase],
        template: `modules/${MOD}/templates/${cfg.plantilla}`,
        width: cfg.ancho ?? 760, height: cfg.alto ?? 800, resizable: true,
        tabs: cfg.pestanas ? [{ navSelector: ".mrg-nav", contentSelector: ".mrg-cuerpo", initial: cfg.pestanas.inicial }] : [],
        scrollY: [".mrg-cuerpo"]
      });
    }
    get title() { return this.actor.name; }
    async getData(options) {
      const d = await super.getData(options);
      d.mr = await cfg.modelo(this.actor, this, d);
      d.mr.editable = this.isEditable;
      return d;
    }
    activateListeners(html) {
      super.activateListeners(html);
      escuchasComunes(this, html);
      cfg.extra?.(this, html);
    }
  };
}

/** Escuchas compartidas (ver la cabecera del archivo). */
export function escuchasComunes(hoja, html) {
  const actor = hoja.actor;
  html.find("[data-ir]").on("click", ev => hoja._tabs?.[0]?.activate(ev.currentTarget.dataset.ir));
  html.find("[data-abrir]").on("click", ev => actor.items.get(ev.currentTarget.dataset.abrir)?.sheet.render(true));
  html.find("[data-borrar]").on("click", async ev => {
    const it = actor.items.get(ev.currentTarget.dataset.borrar);
    if (!it) return;
    const ok = await foundry.applications.api.DialogV2.confirm({ window: { title: "Quitar" }, content: `<p>¿Quitar «${esc(it.name)}» de ${esc(actor.name)}?</p>`, rejectClose: false });
    if (ok) it.delete();
  });
  if (!hoja.isEditable) return;

  html.find("[data-pip]").on("click", async ev => {
    const b = ev.currentTarget, campo = b.dataset.pip, num = n(b.dataset.n);
    const actual = n(foundry.utils.getProperty(actor, campo), 0);
    const nuevo = actual === num ? num - 1 : num;
    if (campo === "system.stress.value" && nuevo > actual) return aplicarEstresActor(actor, nuevo - actual, { silencioso: true });
    await actor.update({ [campo]: nuevo });
  });
  html.find("[data-toggle]").on("click", async ev => {
    const campo = ev.currentTarget.dataset.toggle;
    await actor.update({ [campo]: !foundry.utils.getProperty(actor, campo) });
  });
  html.find("[data-num]").on("click", async ev => {
    const b = ev.currentTarget, campo = b.dataset.num;
    const v = Math.min(n(b.dataset.max, 99), Math.max(n(b.dataset.min, 0), n(foundry.utils.getProperty(actor, campo), 0) + n(b.dataset.delta, 1)));
    await actor.update({ [campo]: v });
  });
  html.find("[data-item-pip]").on("click", async ev => {
    const b = ev.currentTarget, it = actor.items.get(b.dataset.itemPip);
    const campo = b.dataset.campo, num = n(b.dataset.n), actual = n(foundry.utils.getProperty(it, campo), 0);
    await it?.update({ [campo]: actual === num ? num - 1 : num });
  });
  html.find("[data-item-check]").on("change", async ev => {
    const b = ev.currentTarget;
    await actor.items.get(b.dataset.itemCheck)?.update({ [`system.${b.dataset.campo}`]: b.checked });
  });
  html.find("[data-practica]").on("click", async ev => {
    const b = ev.currentTarget, a = b.dataset.atrib, k = b.dataset.accion, num = n(b.dataset.n);
    const base = `system.attributes.${a}.skills.${k}`;
    const actual = n(foundry.utils.getProperty(actor, `${base}.practice`), 0);
    if (num === 3) return actor.update({ [`${base}.value`]: 1, [`${base}.practice`]: 0 });
    await actor.update({ [`${base}.practice`]: actual === num ? num - 1 : num });
  });
  html.find("[data-fase]").on("click", async ev => { await actor.update({ "system.current_phase.value": n(ev.currentTarget.dataset.fase, 1) }); });
  html.find("[data-corazon]").on("click", async ev => {
    const b = ev.currentTarget, it = actor.items.get(b.dataset.item);
    if (!it) return;
    const j = n(b.dataset.corazon), total = it.system.adventurer_type === "hireling" ? 1 : n(it.system.tier, 0) + 1;
    const estado = corazonesDe(it).find(c => c.j === j)?.estado ?? 0;
    const nuevo = estado === 2 ? (total - j) * 2 : estado === 1 ? (total - j + 1) * 2 : (total - j) * 2 + 1;
    await it.update({ "system.heart_slashes": nuevo });
  });
  html.find("[data-uso]").on("click", async ev => {
    const b = ev.currentTarget, it = actor.items.get(b.dataset.uso), num = n(b.dataset.n), actual = n(it?.system.moves_used, 0);
    await it?.update({ "system.moves_used": actual === num ? num - 1 : num });
  });
  html.find("[data-tirar]").on("click", ev => {
    const k = ev.currentTarget.dataset.tirar;
    if (game.settings.get(MOD, "estiloTiradas") === "mr") abrirTirada(actor, { accion: k, tipo: ev.altKey ? "resistencia" : "accion" });
    else actor.rollAttributePopup(k);
  });
  html.find("[data-tirada-tipo]").on("click", ev => {
    const t = ev.currentTarget.dataset.tiradaTipo;
    if (game.settings.get(MOD, "estiloTiradas") === "mr") abrirTirada(actor, { tipo: t });
    else if (t === "fortuna") actor.rollBasicPopup("fortune", 2, 6);
    else actor.rollAttributePopup("smash", null, "resistance");
  });
  html.find("[data-fortuna]").on("click", ev => {
    const b = ev.currentTarget;
    tirar(actor, { tipo: "fortuna", dadosBase: n(b.dataset.fortuna, 1), titulo: b.dataset.titulo || undefined });
  });
  html.find("[data-asistente]").on("click", ev => game.modules.get(MOD)?.api?.abrirGenerador(ev.currentTarget.dataset.asistente));
  html.find("[data-select]").on("change", async ev => {
    const el = ev.currentTarget;
    await actor.update({ [el.dataset.select]: el.dataset.tipo === "n" ? Number(el.value) : el.value });
  });
  html.find("[data-set]").on("click", async ev => { await actor.update({ [ev.currentTarget.dataset.set]: ev.currentTarget.dataset.valor }); });
  // Los segmentos de un reloj (SVG con role=button) también responden al teclado
  html.find("path[data-pip][role=button]").on("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); ev.currentTarget.dispatchEvent(new MouseEvent("click")); } });
}

/** Registra una hoja MR como predeterminada para un tipo de actor. */
export function registrarHojaTipo(Clase, tipos, etiqueta) {
  const DSC = foundry.applications?.apps?.DocumentSheetConfig;
  const opts = { types: tipos, makeDefault: true, label: etiqueta };
  if (DSC?.registerSheet) DSC.registerSheet(Actor, MOD, Clase, opts);
  else Actors.registerSheet(MOD, Clase, opts);
}
