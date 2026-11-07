/**
 * Selector de objetos de MR- Wicked Ones: sustituye al desplegable del sistema (una lista larga sin orden ni filtros).
 * Busca por texto, filtra por categoría, ordena alfabéticamente (con acentos) y muestra la descripción de cada objeto.
 * Para equipo y suministros, el objeto se crea ya como lo uno o lo otro. Para los que solo admiten uno (raza, tipo,
 * impulso…) sustituye al anterior.
 */
const MOD = "mr-wicked-ones-es";
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const sn = s => String(s ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const App = foundry.applications?.api?.ApplicationV2;

const ETIQUETAS = {
  gearsupply: "equipo o suministro", specialability: "capacidad", defense: "defensa", project: "proyecto", duty: "labor", adventurer: "aventurero o ayudante",
  minion_upgrade: "mejora de esbirros", minion_type: "función de la manada", minionimpulse: "impulso de la manada", monster_race: "raza", awakened_type: "tipo de despertado",
  dungeon_theme: "temática de la mazmorra", tier3room: "sala de nivel 3", invasion: "gran invasión", conquest_ability: "habilidad de conquista", wickedimpulse: "impulso oscuro", revelry: "juerga",
  calling: "vocación"
};
const UNICOS = new Set(["monster_race", "awakened_type", "minion_type", "minionimpulse", "dungeon_theme", "wickedimpulse", "revelry", "calling"]);
export const DEFENSAS = [
  ["Captura", "Un cuchillo pequeño, aceite o una armadura de púas."], ["Detección", "Una capa oscura, botas blandas o una máscara."],
  ["Errores de los esbirros", "Un látigo, un palo o un silbato."], ["Heridas", "Una armadura pesada, un escudo o un arma defensiva."],
  ["Magia", "Una máscara espiritual, un manto o brazaletes."], ["Mentira descubierta", "Ropa impresionante, joyas o una máscara."],
  ["Movimiento enemigo", "Una lanza, boleadoras o una red."]
];

const FUENTES = {
  gearsupply: [`${MOD}.equipo-es`, "wicked-ones.gearsupply"],
  project: [`${MOD}.equipo-es`, "wicked-ones.project"],
  duty: [`${MOD}.labores-es`, "wicked-ones.duty"],
  adventurer: [`${MOD}.aventureros-es`, "wicked-ones.adventurer"]
};

const cache = {};

function categoria(tipo, o) {
  const s = o.system ?? {};
  if (tipo === "gearsupply") {
    const c = o.flags?.[MOD]?.categoria;
    if (["mejunje", "artilugio", "pocion", "reliquia"].includes(c)) return { mejunje: "Mejunjes", artilugio: "Artilugios", pocion: "Pociones", reliquia: "Objetos mágicos" }[c];
    const t = sn(o.name);
    if (/arma|arco|ballesta|escudo|armadura|espada|hacha|daga|lanza/.test(t)) return "Armas y armaduras";
    if (/veneno|botiquin|polvora/.test(t)) return "Consumibles";
    return "Herramientas y varios";
  }
  if (tipo === "duty") return s.type_custom || s.type || "Otras";
  if (tipo === "minion_upgrade") return { regular: "Normales", path: "Senda de invocación", external: "Externas" }[s.upgrade_type] ?? "Otras";
  if (tipo === "adventurer") return s.adventurer_type === "hireling" ? "Ayudantes" : `Aventureros · nivel ${s.tier ?? 0}`;
  if (tipo === "tier3room") return s.theme || "Otras";
  if (tipo === "conquest_ability") return s.domain || "Otras";
  return "";
}

export async function cargar(tipo) {
  if (cache[tipo]) return cache[tipo];
  const packs = FUENTES[tipo] ?? [`wicked-ones.${tipo}`];
  const vistos = new Set();
  const lista = [];
  for (const id of packs) {
    const pack = game.packs.get(id);
    if (!pack) continue;
    const esSistema = id.startsWith("wicked-ones.");
    for (const d of await pack.getDocuments()) {
      if (d.type !== tipo) continue;
      let o = d.toObject();
      if (esSistema) { try { o = game.babele?.packs?.get(id)?.translate?.(o) ?? o; } catch { /* sin traducción */ } }
      if (esSistema && /^(Nuevo|New)\s/i.test(o.name)) continue; // objetos de relleno del sistema
      const clave = sn(o.name);
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      lista.push({ datos: o, nombre: o.name, desc: o.system?.description ?? "", cat: categoria(tipo, o), sistema: esSistema });
    }
  }
  lista.sort((a, b) => a.cat.localeCompare(b.cat, "es") || a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }));
  return (cache[tipo] = lista);
}

export class SelectorMR extends App {
  static DEFAULT_OPTIONS = {
    id: "mr-wo-selector", tag: "div", classes: ["mrg", "mrg-ventana", "mrg-selector-app"],
    window: { title: "Añadir", icon: "fa-solid fa-plus", resizable: true }, position: { width: 720, height: 720 }
  };
  constructor(actor, tipo, opts = {}) {
    super();
    this.actor = actor; this.tipo = tipo; this.uso = opts.uso ?? null;
    this.filtro = ""; this.cat = "";
    this.options.window.title = `Añadir ${ETIQUETAS[tipo] ?? tipo} · ${actor.name}`;
  }

  tiene(nombre) { return this.actor.items.some(i => i.type === this.tipo && sn(i.name) === sn(nombre)); }

  async _renderHTML() {
    if (this.tipo === "defense") return this.#htmlDefensa();
    const todos = await cargar(this.tipo);
    const cats = [...new Set(todos.map(x => x.cat).filter(Boolean))];
    const f = sn(this.filtro);
    const lista = todos.filter(x => (!this.cat || x.cat === this.cat) && (!f || sn(x.nombre).includes(f) || sn(x.desc).includes(f)));
    const chips = cats.length > 1 ? `<div class="mrg-sel-cats" role="group" aria-label="Categorías"><button type="button" class="mrg-chipbtn ${!this.cat ? "mrg-sel" : ""}" data-cat="">Todo <b>${todos.length}</b></button>${cats.map(c => `<button type="button" class="mrg-chipbtn ${this.cat === c ? "mrg-sel" : ""}" data-cat="${esc(c)}">${esc(c)} <b>${todos.filter(x => x.cat === c).length}</b></button>`).join("")}</div>` : "";
    const extra = this.tipo === "gearsupply" && this.uso ? `<p class="mrg-nota">Se añade como <strong>${this.uso === "equipo" ? "equipo" : "suministro"}</strong>. ${this.uso === "equipo" ? `Llevas ${this.actor.items.filter(i => i.type === "gearsupply" && i.system.gear_or_supply !== "supply").length} de 4.` : "Mejunjes, pociones y cosas de uso limitado van siempre como suministro."}</p>` : "";
    const filas = lista.map(x => {
      const ya = !UNICOS.has(this.tipo) && this.tiene(x.nombre);
      const s = x.datos.system ?? {};
      const calidad = { mundane: "Mundano", valuable: "Valioso", powerful: "Poderoso", tier1: "Nivel 1", tier2: "Nivel 2", tier3: "Nivel 3" }[s.quality_category];
      const ventajas = Object.values(s.edges ?? {}).filter(v => v && !/^d66/i.test(v));
      const marcas = `${calidad ? `<span class="mrg-chip ${s.quality_category === "powerful" || s.quality_category === "tier3" ? "mrg-chip--sangre" : s.quality_category === "valuable" || s.quality_category === "tier2" ? "mrg-chip--oro" : ""}">${calidad}</span>` : ""}${x.cat && cats.length > 1 ? `<span class="mrg-chip">${esc(x.cat)}</span>` : ""}${ventajas.map(v => `<span class="mrg-chip mrg-chip--azul">${esc(v)}</span>`).join("")}`;
      return `<article class="mrg-sel-fila ${ya ? "mrg-tiene" : ""}"><header><h5>${esc(x.nombre)}</h5>
        ${ya ? `<span class="mrg-chip mrg-chip--verde"><i class="fa-solid fa-check"></i> Ya lo tienes</span>` : `<button type="button" class="mrg-btn mrg-btn--sangre" data-add="${todos.indexOf(x)}"><i class="fa-solid fa-plus"></i> Añadir</button>`}</header>
        ${marcas ? `<div class="mrg-sel-marcas">${marcas}</div>` : ""}${x.desc ? `<p>${esc(x.desc)}</p>` : ""}</article>`;
    }).join("");
    return `<div class="mrg-sel"><div class="mrg-sel-cab"><input type="search" class="mrg-sel-buscar" placeholder="Buscar por nombre o descripción…" value="${esc(this.filtro)}" aria-label="Buscar" autofocus>${chips}${extra}
      <p class="mrg-nota">${lista.length} de ${todos.length} · ordenados por categoría y nombre</p></div><div class="mrg-sel-lista">${filas || `<p class="mrg-vacio">Nada coincide con la búsqueda.</p>`}</div></div>`;
  }

  #htmlDefensa() {
    const filas = DEFENSAS.map(([n, ej], i) => `<article class="mrg-sel-fila ${this.tiene(n) ? "mrg-tiene" : ""}"><header><h5>${esc(n)}</h5><button type="button" class="mrg-btn mrg-btn--sangre" data-defensa="${i}"><i class="fa-solid fa-plus"></i> Elegir</button></header><p>Ejemplos de equipo: ${esc(ej)}</p></article>`).join("");
    return `<div class="mrg-sel"><div class="mrg-sel-cab"><p class="mrg-nota">Tu equipo da <strong>una sola defensa</strong>. Negocia con el DJ cuál: ni demasiado concreta ni demasiado amplia; debería usarse más o menos una vez por sesión.</p>
      <label class="mrg-campo"><span class="mrg-etiqueta">O escribe la tuya</span><span class="mrg-fila"><input type="text" class="mrg-sel-libre" placeholder="Contra qué te protege"><button type="button" class="mrg-btn" data-defensa-libre><i class="fa-solid fa-plus"></i> Añadir</button></span></label></div>
      <div class="mrg-sel-lista">${filas}</div></div>`;
  }

  _replaceHTML(res, cont) {
    cont.innerHTML = res;
    const buscar = cont.querySelector(".mrg-sel-buscar");
    buscar?.addEventListener("input", () => {
      this.filtro = buscar.value;
      clearTimeout(this._t);
      this._t = setTimeout(async () => { await this.render(); const b = this.element.querySelector(".mrg-sel-buscar"); b?.focus(); b?.setSelectionRange(b.value.length, b.value.length); }, 180);
    });
    cont.onclick = async ev => {
      const t = ev.target.closest("[data-cat],[data-add],[data-defensa],[data-defensa-libre]");
      if (!t) return;
      if (t.dataset.cat !== undefined) { this.cat = t.dataset.cat; return this.render(); }
      if (t.dataset.add !== undefined) return this.#anadir((await cargar(this.tipo))[Number(t.dataset.add)]);
      if (t.dataset.defensa !== undefined) return this.#crearDefensa(DEFENSAS[Number(t.dataset.defensa)][0]);
      if (t.hasAttribute("data-defensa-libre")) { const v = cont.querySelector(".mrg-sel-libre")?.value?.trim(); if (v) return this.#crearDefensa(v); }
    };
  }

  async #crearDefensa(nombre) {
    await this.actor.createEmbeddedDocuments("Item", [{ name: nombre, type: "defense", img: "systems/wicked-ones/styles/assets/icons/Icon.6_88.png", system: { checked: false } }]);
    ui.notifications.info(`${this.actor.name}: defensa «${nombre}».`);
    this.render();
  }

  async #anadir(x) {
    if (!x) return;
    const o = foundry.utils.deepClone(x.datos);
    delete o._id;
    if (this.tipo === "gearsupply" && this.uso) {
      o.system = { ...(o.system ?? {}), gear_or_supply: this.uso === "equipo" ? "gear" : "supply" };
      if (this.uso === "equipo") {
        const n = this.actor.items.filter(i => i.type === "gearsupply" && i.system.gear_or_supply !== "supply").length;
        if (n >= 4 && !(await foundry.applications.api.DialogV2.confirm({ window: { title: "Equipo lleno" }, content: "<p>Ya llevas cuatro objetos de equipo. ¿Añadir este de todos modos?</p>", rejectClose: false }))) return;
      }
    }
    if (UNICOS.has(this.tipo)) {
      const previos = this.actor.items.filter(i => i.type === this.tipo).map(i => i.id);
      if (previos.length) await this.actor.deleteEmbeddedDocuments("Item", previos);
    }
    await this.actor.createEmbeddedDocuments("Item", [o]);
    ui.notifications.info(`${this.actor.name}: «${x.nombre}» añadido.`);
    if (UNICOS.has(this.tipo)) return this.close();
    this.render();
  }
}

export function abrirSelector(actor, tipo, opts = {}) {
  foundry.applications.instances?.get?.("mr-wo-selector")?.close?.();
  const app = new SelectorMR(actor, tipo, opts);
  app.render(true);
  return app;
}

export const olvidarSelector = () => { for (const k of Object.keys(cache)) delete cache[k]; };
