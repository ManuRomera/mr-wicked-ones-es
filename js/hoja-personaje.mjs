/**
 * Hoja de personaje de MR- Wicked Ones («hoja de monstruo»).
 * Hereda la hoja del sistema (así conserva sus datos, arrastrar y soltar y la gestión de objetos) pero pinta una
 * plantilla propia con cabecera y constantes vitales siempre visibles, y el resto repartido en pestañas:
 * Acciones · Capacidades · Libreto · Equipo · Guarida · Notas. Incluye modo compacto (solo lo habitual).
 * Los tipos «despertado» (Unholy Alliance) se siguen mostrando con la hoja original del sistema.
 */
import { n } from "./core/reglas.mjs";
import { ATRIBUTOS, nombreAccion, nombreAtributo } from "./tirada.mjs";
import { abrirTirada } from "./tirada-dialogo.mjs";
import { aplicarEstresActor } from "./automatismos.mjs";
import { htmlLibreto, clicLibreto, abrirLibretos, vocacionDe, razaDe } from "./libretos.mjs";
import { abrirPanelAspecto } from "./ajustes.mjs";

const MOD = "mr-wicked-ones-es";
const L = (k, d = "") => { const v = game.i18n.localize(k); return v === k ? d : v; };
const claveCompacta = id => `${MOD}.compacta.${id}`;

function hojaDelSistema() {
  const reg = CONFIG.Actor?.sheetClasses?.character ?? {};
  return Object.values(reg).map(r => r.cls).find(c => c?.name === "WickedActorSheet") ?? null;
}

const pips = (valor, max) => Array.from({ length: Math.max(0, n(max, 0)) }, (_, i) => ({ n: i + 1, on: i < n(valor, 0) }));
const QUALITY = { mundane: "FITD.Mundane", valuable: "FITD.Valuable", powerful: "FITD.Powerful", tier1: "FITD.TierOne", tier2: "FITD.TierTwo", tier3: "FITD.TierThree" };

function crearClase(Base) {
  return class HojaPersonajeMR extends Base {
    #libreto = { modo: "voc" };
    #compacta = null;

    static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
        classes: ["mrg", "mrg-hoja", "sheet", "actor"],
        template: `modules/${MOD}/templates/personaje.hbs`,
        width: 800, height: 860, resizable: true,
        tabs: [{ navSelector: ".mrg-nav", contentSelector: ".mrg-cuerpo", initial: "acciones" }],
        scrollY: [".mrg-cuerpo"]
      });
    }

    get title() { return this.actor.name; }
    get compacta() {
      if (this.#compacta === null) {
        try { this.#compacta = localStorage.getItem(claveCompacta(this.actor.id)) === "1"; } catch { this.#compacta = false; }
      }
      return this.#compacta;
    }

    _getHeaderButtons() {
      const b = super._getHeaderButtons();
      b.unshift(
        { label: this.compacta ? "Completa" : "Compacta", class: "mrg-btn-compacta", icon: this.compacta ? "fa-solid fa-expand" : "fa-solid fa-compress", onclick: () => this.#alternarCompacta() },
        { label: "Libretos", class: "mrg-btn-libretos", icon: "fa-solid fa-book-skull", onclick: () => abrirLibretos(this.actor, this.#libreto) },
        { label: "", class: "mrg-btn-aspecto", icon: "fa-solid fa-universal-access", onclick: () => abrirPanelAspecto() }
      );
      return b;
    }

    #alternarCompacta() {
      this.#compacta = !this.compacta;
      try { localStorage.setItem(claveCompacta(this.actor.id), this.#compacta ? "1" : "0"); } catch { /* sin almacenamiento */ }
      this.setPosition({ width: this.#compacta ? 460 : 800, height: this.#compacta ? 740 : 860 });
      this.render(true);
    }

    async getData(options) {
      const d = await super.getData(options);
      const actor = this.actor;
      const s = actor.system;
      const items = actor.items.contents;
      const por = t => items.filter(i => i.type === t);
      const sk = s.attributes ?? {};
      const despertado = s.pc_type === "awakened";
      const ATR = despertado ? { ...ATRIBUTOS, guts: ["horrify", "command", "invoke"] } : ATRIBUTOS;

      const atributos = Object.entries(ATR).map(([a, keys]) => ({
        id: a, nombre: nombreAtributo(a), desc: L(`FITD.Skills${a}Description`, ""), shocked: Boolean(sk[a]?.shocked),
        acciones: keys.map(k => {
          const v = n(sk[a]?.skills?.[k]?.value, 0), pr = n(sk[a]?.skills?.[k]?.practice, 0);
          return {
            id: k, atrib: a, nombre: nombreAccion(k), desc: L(`FITD.Skills${k}Description`, ""), valor: v, practica: pr,
            dados: Math.max(0, v + (sk[a]?.shocked ? -1 : 0)),
            puntos: Array.from({ length: 3 }, (_, i) => ({ n: i + 1, on: i < v })),
            marcas: Array.from({ length: 3 }, (_, i) => ({ n: i + 1, on: i < pr }))
          };
        })
      }));

      const capsBrutas = por("specialability").map(i => {
        const sy = i.system;
        const bloque = (pre, etiqueta, texto) => texto ? {
          etiqueta, texto, checks: [1, 2].filter(c => sy[`${pre}_checkbox_${c}_text`]).map(c => ({ id: i.id, campo: `${pre}_checkbox_${c}_checked`, texto: sy[`${pre}_checkbox_${c}_text`], on: Boolean(sy[`${pre}_checkbox_${c}_checked`]) }))
        } : null;
        return {
          id: i.id, nombre: i.name, fuente: sy.source ?? "", desc: sy.description ?? "", principal: sy.ability_group === "group_core", externa: sy.ability_group === "group_ext",
          primigenia: ["be_psi", "ds_eyes", "fs_face", "gm_path"].includes(sy.ability_type),
          bloques: [bloque("supply", "Suministro", sy.supply_desc), bloque("downtime", "Descanso", sy.downtime_desc)].filter(Boolean),
          checks: [1, 2].filter(c => sy[`ability_checkbox_${c}_text`]).map(c => ({ id: i.id, campo: `ability_checkbox_${c}_checked`, texto: sy[`ability_checkbox_${c}_text`], on: Boolean(sy[`ability_checkbox_${c}_checked`]) })),
          contador: sy.counter?.text ? { id: i.id, texto: sy.counter.text, valor: n(sy.counter.value, 0), max: n(sy.counter.max, 2), pips: pips(sy.counter.value, sy.counter.max) } : null
        };
      });

      const equipo = por("gearsupply").map(i => ({
        id: i.id, nombre: i.name, desc: i.system.description ?? "", tipo: i.system.gear_or_supply,
        calidad: L(QUALITY[i.system.quality_category] ?? "", ""), calidadClase: ["valuable", "tier2"].includes(i.system.quality_category) ? "mrg-chip--oro" : ["powerful", "tier3"].includes(i.system.quality_category) ? "mrg-chip--sangre" : "",
        ventajas: Object.values(i.system.edges ?? {}).filter(Boolean)
      }));

      const lleno = n(s.stress?.value, 0) >= n(s.stress?.max, 6);
      d.mr = {
        compacta: this.compacta, editable: this.isEditable,
        despertado,
        raza: (despertado ? actor.items.find(i => i.type === "awakened_type") : razaDe(actor))?.name ?? "", vocacion: vocacionDe(actor)?.name ?? "",
        etiquetas: {
          raza: despertado ? "tipo de despertado" : "raza", equipo: despertado ? "Anatomía" : "Equipo", guarida: despertado ? "Conquista" : "Guarida",
          suministro: despertado ? (/sacr[ií]lego|defiler/i.test(vocacionDe(actor)?.name ?? "") ? "Trofeos" : "Secreciones") : "Suministros",
          descanso: despertado ? "Movimiento de conquista" : "Acción de descanso"
        },
        movimientos: capsBrutas.filter(c => c.bloques.some(b => b.etiqueta === "Descanso")),
        impulsos: por("wickedimpulse").map(i => ({ id: i.id, nombre: i.name, desc: i.system.description ?? "" })),
        juerga: despertado ? null : por("revelry").map(i => ({ id: i.id, nombre: i.name, desc: i.system.description ?? "" }))[0] ?? null,
        vitales: {
          estres: { valor: n(s.stress?.value, 0), max: n(s.stress?.max, 6), pips: pips(s.stress?.value, s.stress?.max ?? 6), lleno },
          corazones: { valor: n(s.dark_hearts?.value, 0), max: n(s.dark_hearts?.max, 2), pips: pips(s.dark_hearts?.value, s.dark_hearts?.max ?? 2) },
          oro: { valor: n(s.gold?.value, 0), max: n(s.gold?.max, 3), pips: pips(s.gold?.value, s.gold?.max ?? 3), visible: d.system?.has_gold !== false && !despertado },
          suministro: { valor: n(s.supply?.value, 0), max: n(s.supply?.max, 2), pips: pips(s.supply?.value, s.supply?.max ?? 2) },
          malvada: { valor: n(s.wickedxp?.value, 0), max: n(s.wickedxp?.max, 9), pips: pips(s.wickedxp?.value, s.wickedxp?.max ?? 9) },
          osada: { valor: n(s.recklessxp?.value, 0), max: n(s.recklessxp?.max, 3), pips: pips(s.recklessxp?.value, s.recklessxp?.max ?? 3) },
          reventado: Boolean(s.bloodied)
        },
        atributos,
        principales: capsBrutas.filter(c => c.principal),
        otras: capsBrutas.filter(c => !c.principal),
        cuentaCaps: capsBrutas.length,
        defensas: por("defense").map(i => ({ id: i.id, nombre: i.name, on: Boolean(i.system.checked) })),
        equipo: equipo.filter(e => e.tipo !== "supply"), suministros: equipo.filter(e => e.tipo === "supply"),
        proyectos: por("project").map(i => ({ id: i.id, nombre: i.name, desc: i.system.description ?? "", pips: pips(i.system.clock_progress, i.system.clock_size), valor: n(i.system.clock_progress, 0), max: n(i.system.clock_size, 4) })),
        labores: por("duty").map(i => ({ id: i.id, nombre: i.name, desc: i.system.description ?? "", tipo: i.system.type_custom || i.system.type || "", nivel: n(i.system.tier, 0) })),
        pandas: game.actors.filter(a => a.type === "minion_pack").map(a => ({ id: a.id, nombre: a.name, sel: a.id === s.minionpack })),
        descansoUsado: Boolean(s.downtime_action_used),
        libretoHTML: await htmlLibreto(this.#libreto, actor)
      };
      return d;
    }

    activateListeners(html) {
      super.activateListeners(html);
      const actor = this.actor;
      const root = html[0] ?? html;

      root.querySelector("[data-pestana-libreto]")?.addEventListener("click", ev => clicLibreto(ev, actor, this.#libreto, async () => { await this.render(false); }));

      html.find("[data-ir]").on("click", ev => this._tabs?.[0]?.activate(ev.currentTarget.dataset.ir));
      html.find("[data-abrir]").on("click", ev => actor.items.get(ev.currentTarget.dataset.abrir)?.sheet.render(true));
      html.find("[data-borrar]").on("click", async ev => {
        const it = actor.items.get(ev.currentTarget.dataset.borrar);
        if (!it) return;
        const ok = await foundry.applications.api.DialogV2.confirm({ window: { title: "Quitar" }, content: `<p>¿Quitar «${foundry.utils.escapeHTML(it.name)}» de ${foundry.utils.escapeHTML(actor.name)}?</p>`, rejectClose: false });
        if (ok) it.delete();
      });

      if (!this.isEditable) return;

      html.find("[data-pip]").on("click", async ev => {
        const b = ev.currentTarget;
        const campo = b.dataset.pip, num = n(b.dataset.n);
        const actual = n(foundry.utils.getProperty(actor, campo), 0);
        const nuevo = actual === num ? num - 1 : num;
        if (campo === "system.stress.value" && nuevo > actual) return aplicarEstresActor(actor, nuevo - actual, { silencioso: true });
        await actor.update({ [campo]: nuevo });
      });
      html.find("[data-toggle]").on("click", async ev => {
        const campo = ev.currentTarget.dataset.toggle;
        await actor.update({ [campo]: !foundry.utils.getProperty(actor, campo) });
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
      html.find("[data-panda]").on("change", async ev => { await actor.update({ "system.minionpack": ev.currentTarget.value }); });
      html.find("[data-abrir-panda]").on("click", () => game.actors.get(actor.system.minionpack)?.sheet.render(true));
    }
  };
}

/** Registra la hoja MR como predeterminada para personajes si el ajuste está en «MR». */
export async function registrarHojaPersonaje() {
  if (game.settings.get(MOD, "estiloHojas") !== "mr") return;
  let Base = hojaDelSistema();
  if (!Base) {
    try { Base = (await import("/systems/wicked-ones/module/wicked-actor-sheet.js")).WickedActorSheet; } catch { /* sin sistema */ }
  }
  if (!Base) return console.warn(`${MOD} | no se encontró la hoja de personaje del sistema`);
  const Hoja = crearClase(Base);
  const DSC = foundry.applications?.apps?.DocumentSheetConfig;
  const opts = { types: ["character"], makeDefault: true, label: "MR · Hoja de monstruo" };
  if (DSC?.registerSheet) DSC.registerSheet(Actor, MOD, Hoja, opts);
  else Actors.registerSheet(MOD, Hoja, opts);
}
