/**
 * Creador de personajes de MR- Wicked Ones: paso a paso, siguiendo el orden del manual (raza, vocación, capacidad,
 * acciones 3/2/2/1/1, impulso oscuro, juerga, equipo y suministros, nombre), con «aleatorio» en cada paso y para todo
 * el personaje. Sin hoja asociada crea un actor nuevo; con una hoja, la rehace (previa confirmación).
 */
import { razas, vocaciones, docsDe, sinAcentos } from "./libretos.mjs";
import { cargar, DEFENSAS } from "./selector.mjs";
import { ATRIBUTOS, nombreAccion, nombreAtributo } from "./tirada.mjs";

const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const azar = a => a[Math.floor(Math.random() * a.length)];
const barajar = a => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const App = foundry.applications?.api?.ApplicationV2;
const ACCIONES = Object.values(ATRIBUTOS).flat();
const PASOS = [
  ["raza", "Raza", "fa-dragon"], ["voc", "Vocación", "fa-hat-wizard"], ["cap", "Capacidad", "fa-bolt"], ["acc", "Acciones", "fa-dice"],
  ["imp", "Impulso oscuro", "fa-heart-crack"], ["jue", "Juerga", "fa-champagne-glasses"], ["eq", "Equipo", "fa-toolbox"], ["nom", "Nombre", "fa-signature"]
];
const BORRAR = ["monster_race", "calling", "specialability", "wickedimpulse", "revelry", "gearsupply", "defense"];

export class CreadorMR extends App {
  static DEFAULT_OPTIONS = {
    id: "mr-wo-creador", tag: "div", classes: ["mrg", "mrg-ventana", "mrg-creador-app"],
    window: { title: "Crear monstruo", icon: "fa-solid fa-skull", resizable: true }, position: { width: 860, height: 740 }
  };

  constructor(actor = null) {
    super();
    this.actor = actor;
    this.paso = 0;
    this.e = { raza: null, voc: null, cap: null, acciones: {}, imp: null, jue: null, equipo: [], sumin: [], defensa: "", nombre: actor?.name && actor.name !== "Nuevo personaje" ? actor.name : "" };
    this.filtro = ""; this.cat = "";
    this.options.window.title = actor ? `Rehacer · ${actor.name}` : "Crear monstruo";
  }

  /* ---------------------------------------------------------------- datos */
  async #datos() {
    if (this._d) return this._d;
    const [rs, vs, imp, jue, cat] = await Promise.all([razas(), vocaciones(), docsDe("wickedimpulse"), docsDe("revelry"), cargar("gearsupply")]);
    return (this._d = {
      razas: rs.filter(r => r.doc && r.libro), vocs: vs.filter(v => v.docCalling && v.libro), imp: imp.filter(d => !d.system?.is_for_ua), jue,
      cat: cat.filter(x => x.datos.system?.quality_category !== "powerful")
    });
  }
  #voc(d) { return d.vocs.find(v => v.id === this.e.voc); }
  #razaSel(d) { return d.razas.find(r => r.id === this.e.raza); }
  #nucleo(v) { return v?.capacidades.find(h => h.system?.ability_group === "group_core"); }
  #opcionales(v) { return (v?.capacidades ?? []).filter(h => h.system?.ability_group !== "group_core"); }
  #conteo() { const c = { 3: 0, 2: 0, 1: 0 }; for (const v of Object.values(this.e.acciones)) if (v) c[v]++; return c; }
  #valorados(d) { return [...this.e.equipo, ...this.e.sumin].filter(i => d.cat[i]?.datos.system?.quality_category !== "mundane").length; }

  #valido(k, d) {
    const e = this.e;
    if (k === "raza") return Boolean(e.raza);
    if (k === "voc") return Boolean(e.voc);
    if (k === "cap") return Boolean(e.voc) && (Boolean(e.cap) || this.#opcionales(this.#voc(d)).length === 0);
    if (k === "acc") { const c = this.#conteo(); return c[3] === 1 && c[2] === 2 && c[1] === 2; }
    if (k === "imp") return Boolean(e.imp);
    if (k === "jue") return Boolean(e.jue);
    if (k === "eq") return e.equipo.length === 4 && e.sumin.length === 3 && Boolean(e.defensa.trim()) && this.#valorados(d) <= 1;
    if (k === "nom") return Boolean(e.nombre.trim());
    return false;
  }

  /* ------------------------------------------------------------ aleatorio */
  #azarPaso(k, d) {
    const e = this.e;
    if (k === "raza") e.raza = azar(d.razas).id;
    else if (k === "voc") { e.voc = azar(d.vocs).id; e.cap = null; this.#azarPaso("cap", d); }
    else if (k === "cap") { const o = this.#opcionales(this.#voc(d)); e.cap = o.length ? azar(o).uuid : null; }
    else if (k === "acc") {
      const t = barajar(ACCIONES); e.acciones = {};
      t.slice(0, 1).forEach(a => e.acciones[a] = 3); t.slice(1, 3).forEach(a => e.acciones[a] = 2); t.slice(3, 5).forEach(a => e.acciones[a] = 1);
    } else if (k === "imp") e.imp = azar(d.imp).uuid;
    else if (k === "jue") e.jue = azar(d.jue).uuid;
    else if (k === "eq") {
      const mund = d.cat.map((x, i) => ({ x, i })).filter(({ x }) => x.datos.system?.quality_category === "mundane");
      const eqs = barajar(mund.filter(({ x }) => /Armas|Herramientas/.test(x.cat))).slice(0, 4).map(o => o.i);
      const sums = barajar(mund.filter(({ i }) => !eqs.includes(i))).slice(0, 3).map(o => o.i);
      e.equipo = eqs; e.sumin = sums;
      if (Math.random() < .6) { // un objeto valioso en lugar de uno de suministro
        const val = d.cat.map((x, i) => ({ x, i })).filter(({ x }) => x.datos.system?.quality_category === "valuable" && /Artilugios|Mejunjes/.test(x.cat));
        if (val.length) e.sumin[2] = azar(val).i;
      }
      e.defensa = azar(DEFENSAS)[0];
    } else if (k === "nom") {
      const r = this.#razaSel(d);
      const lista = (r?.nombres ?? []).flatMap(n => String(n).split(/\s*[-–,]\s*/)).filter(Boolean);
      if (lista.length) e.nombre = azar(lista);
    }
  }
  async #todoAzar() {
    const d = await this.#datos();
    for (const [k] of PASOS) this.#azarPaso(k, d);
    this.paso = PASOS.length - 1;
    this.render();
  }

  /* ----------------------------------------------------------------- vista */
  #carta(id, nombre, texto, activo, extra = "") {
    return `<button type="button" class="mrg-crea-carta ${activo ? "mrg-sel" : ""}" data-elige="${esc(id)}" aria-pressed="${activo}"><strong>${esc(nombre)}</strong>${extra}<span>${esc(String(texto ?? "").slice(0, 170))}${String(texto ?? "").length > 170 ? "…" : ""}</span></button>`;
  }

  async #cuerpo(d) {
    const e = this.e, k = PASOS[this.paso][0];
    if (k === "raza") return `<p class="mrg-nota">La raza apenas cambia las reglas: modifica la situación y el efecto en casos extremos. Elige la que te divierta.</p><div class="mrg-crea-cartas">${d.razas.map(r => this.#carta(r.id, r.nombre, r.texto, e.raza === r.id)).join("")}</div>`;
    if (k === "voc") return `<p class="mrg-nota">Tu vocación define tus capacidades monstruosas: una principal, flashbacks y capacidades de vocación.</p><div class="mrg-crea-cartas">${d.vocs.map(v => this.#carta(v.id, v.nombre, v.lema || v.intro, e.voc === v.id, v.principal?.nombre ? `<em>Principal: ${esc(v.principal.nombre)}</em>` : "")).join("")}</div>`;
    if (k === "cap") {
      const v = this.#voc(d), nuc = this.#nucleo(v);
      const lista = this.#opcionales(v).map(h => `<button type="button" class="mrg-crea-carta ${e.cap === h.uuid ? "mrg-sel" : ""}" data-elige="${esc(h.uuid)}" aria-pressed="${e.cap === h.uuid}"><strong>${esc(h.name)}</strong><span>${esc(h.system?.description ?? "")}</span></button>`).join("");
      return `${nuc ? `<section class="mrg-crea-fija"><h4>Ya la tienes · ${esc(nuc.name)}</h4><p>${esc(nuc.system?.description ?? "")}</p></section>` : ""}<p class="mrg-nota">Empiezas con tu capacidad principal y <strong>una</strong> más de la lista. Otra llegará cada vez que llenes la EXP malvada.</p><div class="mrg-crea-cartas mrg-crea-cartas--ancho">${lista || `<p class="mrg-vacio">Esta vocación no tiene capacidades adicionales en los compendios.</p>`}</div>`;
    }
    if (k === "acc") {
      const c = this.#conteo();
      const falta = (v, n) => `<span class="mrg-chip ${c[v] === n ? "mrg-chip--verde" : c[v] > n ? "mrg-chip--sangre" : ""}">${c[v]}/${n} con ${v}</span>`;
      const cols = Object.entries(ATRIBUTOS).map(([at, acs]) => `<div class="mrg-crea-atr"><h4>${esc(nombreAtributo(at))}</h4>${acs.map(a => `<button type="button" class="mrg-crea-acc v${e.acciones[a] ?? 0}" data-acc="${a}" aria-label="${esc(nombreAccion(a))}: ${e.acciones[a] ?? 0} puntos"><span>${esc(nombreAccion(a))}</span><b>${"●".repeat(e.acciones[a] ?? 0) || "○"}</b></button>`).join("")}</div>`).join("");
      return `<p class="mrg-nota">Pulsa una acción para subirla (0 → 3 y vuelta). Reparte: <strong>una con 3</strong> (lo que mejor se te da), <strong>dos con 2</strong> y <strong>dos con 1</strong>.</p><p class="mrg-fila">${falta(3, 1)}${falta(2, 2)}${falta(1, 2)}</p><div class="mrg-crea-acciones">${cols}</div>`;
    }
    if (k === "imp") return `<p class="mrg-nota">Al elegirlo, empiezas con un corazón oscuro. Cuando lo satisfaces, ganas otro.</p><div class="mrg-crea-cartas">${d.imp.map(x => this.#carta(x.uuid, x.name, x.system?.description, e.imp === x.uuid)).join("")}</div>`;
    if (k === "jue") return `<p class="mrg-nota">Así libera estrés tu monstruo. Lo que elijas determina qué ocurre cuando te pasas.</p><div class="mrg-crea-cartas">${d.jue.map(x => this.#carta(x.uuid, x.name, x.system?.description, e.jue === x.uuid)).join("")}</div>`;
    if (k === "eq") return this.#cuerpoEquipo(d);
    const r = this.#razaSel(d), v = this.#voc(d);
    const resumen = [["Raza", r?.nombre], ["Vocación", v?.nombre], ["Capacidades", [this.#nucleo(v)?.name, d.vocs.flatMap(x => x.capacidades).find(h => h.uuid === e.cap)?.name].filter(Boolean).join(" + ")],
      ["Acciones", ACCIONES.filter(a => e.acciones[a]).sort((a, b) => e.acciones[b] - e.acciones[a]).map(a => `${nombreAccion(a)} ${e.acciones[a]}`).join(" · ")],
      ["Impulso oscuro", d.imp.find(x => x.uuid === e.imp)?.name], ["Juerga", d.jue.find(x => x.uuid === e.jue)?.name],
      ["Equipo", e.equipo.map(i => d.cat[i]?.nombre).join(", ")], ["Suministros", e.sumin.map(i => d.cat[i]?.nombre).join(", ")], ["Defensa", e.defensa]]
      .map(([t, x]) => `<tr><th>${t}</th><td>${esc(x || "—")}</td></tr>`).join("");
    return `<label class="mrg-campo"><span class="mrg-etiqueta">Nombre del monstruo</span><span class="mrg-fila"><input type="text" class="mrg-crea-nombre" value="${esc(e.nombre)}" placeholder="Cómo te llaman en la mazmorra"><button type="button" class="mrg-btn" data-azar-nombre><i class="fa-solid fa-dice"></i> Un nombre de su raza</button></span></label>
      <table class="mrg-crea-resumen">${resumen}</table>
      <p class="mrg-nota">Cuando la mazmorra esté lista, elige un <strong>amigo vil</strong> de la región: te venderá información, objetos y ayuda.</p>`;
  }

  #cuerpoEquipo(d) {
    const e = this.e, v = this.#voc(d), f = sinAcentos(this.filtro);
    const cats = [...new Set(d.cat.map(x => x.cat))];
    const fila = (i, tipo) => `<li><span>${esc(d.cat[i].nombre)}</span><button type="button" class="mrg-mini" data-quita="${tipo}:${i}" aria-label="Quitar ${esc(d.cat[i].nombre)}"><i class="fa-solid fa-xmark"></i></button></li>`;
    const lista = d.cat.map((x, i) => ({ x, i })).filter(({ x, i }) => (!this.cat || x.cat === this.cat) && (!f || sinAcentos(x.nombre).includes(f)) && !e.equipo.includes(i) && !e.sumin.includes(i)).slice(0, 80)
      .map(({ x, i }) => { const val = x.datos.system?.quality_category !== "mundane"; return `<article class="mrg-sel-fila"><header><h5>${esc(x.nombre)}</h5>${val ? `<span class="mrg-chip mrg-chip--oro">Valioso</span>` : ""}<button type="button" class="mrg-btn" data-add-eq="${i}" ${e.equipo.length >= 4 ? "disabled" : ""}>Equipo</button><button type="button" class="mrg-btn" data-add-su="${i}" ${e.sumin.length >= 3 ? "disabled" : ""}>Suministro</button></header>${x.desc ? `<p>${esc(x.desc)}</p>` : ""}</article>`; }).join("");
    return `<div class="mrg-crea-eq"><aside><h4>Equipo <small>${e.equipo.length}/4</small></h4><ul>${e.equipo.map(i => fila(i, "e")).join("") || "<li class='mrg-nota'>Cosas que siempre llevas encima</li>"}</ul>
      <h4>Suministros <small>${e.sumin.length}/3</small></h4><ul>${e.sumin.map(i => fila(i, "s")).join("") || "<li class='mrg-nota'>Se gastan con el uso</li>"}</ul>
      <label class="mrg-campo"><span class="mrg-etiqueta">Defensa de tu equipo</span><select class="mrg-crea-def"><option value="">— elige —</option>${DEFENSAS.map(([n]) => `<option ${e.defensa === n ? "selected" : ""}>${esc(n)}</option>`).join("")}${e.defensa && !DEFENSAS.some(([n]) => n === e.defensa) ? `<option selected>${esc(e.defensa)}</option>` : ""}</select></label>
      <p class="mrg-nota">Como mucho <strong>un</strong> objeto valioso (${this.#valorados(d)}/1)${this.#valorados(d) > 1 ? " — ¡te pasas!" : ""}.${v?.objetos?.length ? ` Ideas de ${esc(v.nombre.toLowerCase())}: ${esc(v.objetos.join(", "))}.` : ""}</p></aside>
      <section><input type="search" class="mrg-sel-buscar mrg-crea-buscar" placeholder="Buscar objeto…" value="${esc(this.filtro)}" aria-label="Buscar objeto">
      <div class="mrg-sel-cats"><button type="button" class="mrg-chipbtn ${!this.cat ? "mrg-sel" : ""}" data-cat="">Todo</button>${cats.map(c => `<button type="button" class="mrg-chipbtn ${this.cat === c ? "mrg-sel" : ""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("")}</div>
      <div class="mrg-sel-lista">${lista || `<p class="mrg-vacio">Nada coincide.</p>`}</div></section></div>`;
  }

  async _renderHTML() {
    const d = await this.#datos();
    this._ok = Object.fromEntries(PASOS.map(([k]) => [k, this.#valido(k, d)]));
    const rail = PASOS.map(([k, t, ic], i) => `<li><button type="button" class="${i === this.paso ? "actual" : ""} ${this._ok[k] ? "hecho" : ""}" data-paso="${i}" aria-current="${i === this.paso}"><i class="fa-solid ${this._ok[k] ? "fa-check" : ic}"></i> ${i + 1}. ${t}</button></li>`).join("");
    const ultimo = this.paso === PASOS.length - 1;
    const todos = PASOS.every(([k]) => this._ok[k]);
    return `<div class="mrg-crea"><nav aria-label="Pasos"><ol>${rail}</ol><button type="button" class="mrg-btn mrg-btn--suave" data-todo-azar><i class="fa-solid fa-dice"></i> Todo al azar</button></nav>
      <main><header><h3 class="mrg-titulo">${PASOS[this.paso][1]}</h3><button type="button" class="mrg-btn" data-azar><i class="fa-solid fa-dice"></i> Al azar</button></header>
      <div class="mrg-crea-cuerpo">${await this.#cuerpo(d)}</div>
      <footer><button type="button" class="mrg-btn" data-prev ${this.paso === 0 ? "disabled" : ""}><i class="fa-solid fa-arrow-left"></i> Atrás</button>
      ${ultimo ? `<button type="button" class="mrg-btn mrg-btn--sangre" data-crear ${todos ? "" : "disabled"}><i class="fa-solid fa-skull"></i> ${this.actor ? "Rehacer personaje" : "Crear personaje"}</button>` : `<button type="button" class="mrg-btn mrg-btn--sangre" data-sig ${this._ok[PASOS[this.paso][0]] ? "" : "disabled"}>Siguiente <i class="fa-solid fa-arrow-right"></i></button>`}</footer></main></div>`;
  }

  _replaceHTML(res, cont) {
    const y = cont.querySelector(".mrg-crea-cuerpo, .mrg-sel-lista")?.scrollTop ?? 0;
    cont.innerHTML = res;
    const nom = cont.querySelector(".mrg-crea-nombre");
    nom?.addEventListener("input", () => {
      this.e.nombre = nom.value;
      const b = cont.querySelector("[data-crear]");
      if (b) b.disabled = !nom.value.trim() || !PASOS.slice(0, -1).every(([k]) => this._ok[k]);
    });
    cont.querySelector(".mrg-crea-def")?.addEventListener("change", ev => { this.e.defensa = ev.target.value; this.render(); });
    const bus = cont.querySelector(".mrg-crea-buscar");
    bus?.addEventListener("input", () => {
      this.filtro = bus.value;
      clearTimeout(this._t);
      this._t = setTimeout(async () => { await this.render(); const b = this.element.querySelector(".mrg-crea-buscar"); b?.focus(); b?.setSelectionRange(b.value.length, b.value.length); }, 180);
    });
    cont.onclick = ev => this.#clic(ev);
    requestAnimationFrame(() => { const c = cont.querySelector(".mrg-crea-cuerpo"); if (c && y) c.scrollTop = y; });
  }

  async #clic(ev) {
    const t = ev.target.closest("button"); if (!t || t.disabled) return;
    const d = await this.#datos(), e = this.e, k = PASOS[this.paso][0], ds = t.dataset;
    if (ds.paso !== undefined) this.paso = Number(ds.paso);
    else if ("sig" in ds) this.paso = Math.min(PASOS.length - 1, this.paso + 1);
    else if ("prev" in ds) this.paso = Math.max(0, this.paso - 1);
    else if ("azar" in ds) this.#azarPaso(k, d);
    else if ("todoAzar" in ds) return this.#todoAzar();
    else if ("azarNombre" in ds) this.#azarPaso("nom", d);
    else if ("crear" in ds) return this.#crear(d);
    else if (ds.cat !== undefined) this.cat = ds.cat;
    else if (ds.acc) { const a = ds.acc; e.acciones[a] = ((e.acciones[a] ?? 0) + 1) % 4; if (!e.acciones[a]) delete e.acciones[a]; }
    else if (ds.elige !== undefined) {
      if (k === "raza") e.raza = ds.elige;
      else if (k === "voc") { if (e.voc !== ds.elige) e.cap = null; e.voc = ds.elige; }
      else if (k === "cap") e.cap = ds.elige;
      else if (k === "imp") e.imp = ds.elige;
      else if (k === "jue") e.jue = ds.elige;
    } else if (ds.addEq !== undefined) { if (e.equipo.length < 4) e.equipo.push(Number(ds.addEq)); }
    else if (ds.addSu !== undefined) { if (e.sumin.length < 3) e.sumin.push(Number(ds.addSu)); }
    else if (ds.quita) { const [tp, i] = ds.quita.split(":"); const l = tp === "e" ? e.equipo : e.sumin; l.splice(l.indexOf(Number(i)), 1); }
    else return;
    this.render();
  }

  /* ----------------------------------------------------------------- crear */
  async #crear(d) {
    const e = this.e, v = this.#voc(d), r = this.#razaSel(d);
    let actor = this.actor;
    if (actor) {
      const ok = await foundry.applications.api.DialogV2.confirm({ window: { title: "Rehacer personaje" }, content: `<p>Se sustituirán la raza, la vocación, las capacidades, el impulso, la juerga, el equipo y las acciones de <strong>${esc(actor.name)}</strong>. Los proyectos, las labores y las notas no se tocan. ¿Seguir?</p>`, rejectClose: false });
      if (!ok) return;
      const previos = actor.items.filter(i => BORRAR.includes(i.type)).map(i => i.id);
      if (previos.length) await actor.deleteEmbeddedDocuments("Item", previos);
    } else actor = await Actor.create({ name: e.nombre.trim(), type: "character" });
    const cambios = { name: e.nombre.trim(), "system.dark_hearts.value": 1 };
    for (const [at, acs] of Object.entries(ATRIBUTOS)) for (const a of acs) { cambios[`system.attributes.${at}.skills.${a}.value`] = e.acciones[a] ?? 0; cambios[`system.attributes.${at}.skills.${a}.practice`] = 0; }
    await actor.update(cambios);
    const copia = o => { const c = foundry.utils.deepClone(o); delete c._id; return c; };
    const caps = d.vocs.flatMap(x => x.capacidades);
    const items = [copia(r.doc.datos), copia(v.docCalling.datos), this.#nucleo(v) && copia(this.#nucleo(v).datos), e.cap && copia(caps.find(h => h.uuid === e.cap)?.datos),
      copia(d.imp.find(x => x.uuid === e.imp).datos), copia(d.jue.find(x => x.uuid === e.jue).datos)].filter(Boolean);
    for (const [lista, uso] of [[e.equipo, "gear"], [e.sumin, "supply"]]) for (const i of lista) { const o = copia(d.cat[i].datos); o.system = { ...(o.system ?? {}), gear_or_supply: uso }; items.push(o); }
    items.push({ name: e.defensa.trim(), type: "defense", img: "systems/wicked-ones/styles/assets/icons/Icon.6_88.png", system: { checked: false } });
    await actor.createEmbeddedDocuments("Item", items);
    ui.notifications.info(`${actor.name} está listo para la mazmorra.`);
    actor.sheet.render(true);
    this.close();
  }
}

export function abrirCreador(actor = null) {
  foundry.applications.instances?.get?.("mr-wo-creador")?.close?.();
  const app = new CreadorMR(actor);
  app.render(true);
  return app;
}
