/**
 * Hoja de personaje de MR- Wicked Ones («hoja de monstruo»).
 * Hereda la hoja del sistema (conserva datos, arrastrar y soltar y la gestión de objetos) y pinta una plantilla propia:
 * cabecera con barra de herramientas «de cristal», constantes vitales y estados siempre visibles, y pestañas
 * Acciones · Capacidades · Libreto · Equipo · Guarida · Notas. Raza, vocación e impulso quedan fijados tras elegirse:
 * solo se cambian en «modo evolución». La ficha compacta es un diseño propio (no una versión recortada).
 * El despertado (Unholy Alliance) usa esta misma hoja con sus etiquetas (Anatomía, Secreciones/Trofeos, Conquista).
 */
import { n } from "./core/reglas.mjs";
import { ATRIBUTOS, nombreAccion, nombreAtributo, htmlTarjetaSimple } from "./tirada.mjs";
import { aplicarEstresActor, recuperar } from "./automatismos.mjs";
import { htmlLibreto, clicLibreto, abrirLibretos, vocacionDe, razaDe } from "./libretos.mjs";
import { abrirPanelAspecto } from "./ajustes.mjs";
import { abrirHeridas } from "./heridas.mjs";
import { abrirExperiencia } from "./experiencia.mjs";
import { escuchasComunes, MOD, L, pips } from "./hojas-base.mjs";

const claveCompacta = id => `${MOD}.compacta.${id}`;
const sn = s => String(s ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

function hojaDelSistema() {
  return Object.values(CONFIG.Actor?.sheetClasses?.character ?? {}).map(r => r.cls).find(c => c?.name === "WickedActorSheet") ?? null;
}

const QUALITY = { mundane: "FITD.Mundane", valuable: "FITD.Valuable", powerful: "FITD.Powerful", tier1: "FITD.TierOne", tier2: "FITD.TierTwo", tier3: "FITD.TierThree" };

/** Cómo se usa una capacidad, deducido de su texto (el manual no las clasifica, pero se reconocen por cómo están escritas). */
export function clasificarUso(sy) {
  const t = sn([sy.description, sy.supply_desc, sy.downtime_desc].join(" "));
  const casillas = [1, 2].some(c => sy[`ability_checkbox_${c}_text`]) || sy.counter?.text;
  if (/(sufre|sufrir|sufras|sufriendo|pagar?|gasta|gastar)\b[^.]{0,30}estres|estres para/.test(t)) {
    return { k: "estres", etiqueta: "Cuesta Estrés", boton: "Usar · 1 Estrés", titulo: "Cuesta Estrés", ayuda: "Al usarla sufres 1 de Estrés. No lleva tirada propia: hace automático lo que una acción normal ya podría conseguir, o te deja intentar con una tirada lo que sin ella sería imposible." };
  }
  if (casillas) return { k: "marca", etiqueta: "Se marca", boton: "Usar", titulo: "Se marca", ayuda: "Tiene casillas: se marca al gastar un uso y se limpia al descansar. Usarla no cuesta Estrés." };
  if (/\+1d|\+2d|ganas \+/.test(t)) return { k: "dados", etiqueta: "Da dados", titulo: "Da dados", ayuda: "Suma dados cuando se cumple la condición que describe. No hay que gastar nada: añádelos al montar la tirada (± dados en el lanzador)." };
  if (/con un (exito|critico)|cuando (obtengas|saques|logres)/.test(t)) return { k: "resultado", etiqueta: "Tras un resultado", titulo: "Tras un resultado", ayuda: "Se activa sola cuando la tirada sale como indica el texto. No cuesta Estrés." };
  return { k: "pasiva", etiqueta: "Pasiva", titulo: "Pasiva", ayuda: "Siempre está activa: no hay que tirar, gastar ni marcar nada." };
}

function crearClase(Base) {
  return class HojaPersonajeMR extends Base {
    #libreto = { modo: "voc" };
    #compacta = null;
    #evolucion = false;
    #dock = null;

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
    get dockAbierto() {
      if (this.#dock === null) { try { this.#dock = localStorage.getItem(`${MOD}.dock`) === "1"; } catch { this.#dock = false; } }
      return this.#dock;
    }

    #alternarCompacta() {
      this.#compacta = !this.compacta;
      try { localStorage.setItem(claveCompacta(this.actor.id), this.#compacta ? "1" : "0"); } catch { /* sin almacenamiento */ }
      this.setPosition({ width: this.#compacta ? 480 : 800, height: this.#compacta ? 760 : 860 });
      this.render(true);
    }

    async getData(options) {
      const d = await super.getData(options);
      const actor = this.actor, s = actor.system, items = actor.items.contents;
      const por = t => items.filter(i => i.type === t);
      const sk = s.attributes ?? {};
      const despertado = s.pc_type === "awakened";
      const ATR = despertado ? { ...ATRIBUTOS, guts: ["horrify", "command", "invoke"] } : ATRIBUTOS;

      const atributos = Object.entries(ATR).map(([a, keys]) => ({
        id: a, nombre: nombreAtributo(a), desc: L(`FITD.Skills${a}Description`, ""), shocked: Boolean(sk[a]?.shocked),
        acciones: keys.map(k => {
          const v = n(sk[a]?.skills?.[k]?.value, 0), pr = n(sk[a]?.skills?.[k]?.practice, 0);
          return {
            id: k, atrib: a, nombre: nombreAccion(k), desc: L(`FITD.Skills${k}Description`, ""), valor: v, practica: pr, sinPuntos: v === 0,
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
          primigenia: ["be_psi", "ds_eyes", "fs_face", "gm_path"].includes(sy.ability_type), uso: clasificarUso(sy),
          bloques: [bloque("supply", "Suministro", sy.supply_desc), bloque("downtime", "Descanso", sy.downtime_desc)].filter(Boolean),
          checks: [1, 2].filter(c => sy[`ability_checkbox_${c}_text`]).map(c => ({ id: i.id, campo: `ability_checkbox_${c}_checked`, texto: sy[`ability_checkbox_${c}_text`], on: Boolean(sy[`ability_checkbox_${c}_checked`]) })),
          contador: sy.counter?.text ? { id: i.id, texto: sy.counter.text, valor: n(sy.counter.value, 0), max: n(sy.counter.max, 2), pips: pips(sy.counter.value, sy.counter.max) } : null
        };
      });

      const equipoTodo = por("gearsupply").map(i => ({
        id: i.id, nombre: i.name, desc: i.system.description ?? "", tipo: i.system.gear_or_supply,
        calidad: L(QUALITY[i.system.quality_category] ?? "", ""), calidadClase: ["valuable", "tier2"].includes(i.system.quality_category) ? "mrg-chip--oro" : ["powerful", "tier3"].includes(i.system.quality_category) ? "mrg-chip--sangre" : "",
        ventajas: Object.values(i.system.edges ?? {}).filter(Boolean)
      }));
      const equipo = equipoTodo.filter(e => e.tipo !== "supply"), suministros = equipoTodo.filter(e => e.tipo === "supply");

      const estres = { valor: n(s.stress?.value, 0), max: n(s.stress?.max, 6) };
      const lleno = estres.valor >= estres.max;
      const xpLleno = n(s.wickedxp?.value, 0) >= n(s.wickedxp?.max, 9);
      const puedeAprender = this.#evolucion || capsBrutas.length < 2 || xpLleno;
      Object.assign(this.#libreto, { evolucion: this.#evolucion, puedeAprender, xpLleno });
      const maxSum = n(s.supply?.max, 2), usadosSum = n(s.supply?.value, 0);
      const raza = (despertado ? actor.items.find(i => i.type === "awakened_type") : razaDe(actor))?.name ?? "";
      const voc = vocacionDe(actor)?.name ?? "";

      const hs = actor.getFlag(MOD, "heridas") ?? {};
      const muerto = Boolean(actor.getFlag(MOD, "muerto"));
      const shocks = atributos.filter(a => a.shocked);
      const nivelH = muerto ? 3 : s.bloodied ? 2 : shocks.length ? 1 : 0;
      const textoH = muerto ? "Golpe de gracia: una acción final" : s.bloodied ? (hs.sangre || "Otra herida seria te mata") : shocks.length ? shocks.map(a => `${a.nombre}${hs[a.id] ? `: ${hs[a.id]}` : ""}`).join(" · ") : "Sin heridas";
      const mazmorra = game.actors.find(a => a.type === "dungeon");
      d.mr = {
        heridas: { nivel: nivelH, nombre: ["Ileso", "Conmoción", "Reventado", "Muerto"][nivelH], texto: textoH, gotas: [1, 2, 3].map(k => ({ tam: k, on: k <= nivelH })) },
        tesoro: mazmorra ? { id: mazmorra.id, nivel: n(mazmorra.system?.tier?.value, 0), nombre: mazmorra.name } : null,
        compacta: this.compacta, evolucion: this.#evolucion, dockAbierto: this.dockAbierto, editable: this.isEditable, despertado,
        raza, vocacion: voc, impulsos: por("wickedimpulse").map(i => ({ id: i.id, nombre: i.name, desc: i.system.description ?? "" })),
        juerga: despertado ? null : por("revelry").map(i => ({ id: i.id, nombre: i.name, desc: i.system.description ?? "" }))[0] ?? null,
        etiquetas: {
          raza: despertado ? "tipo de despertado" : "raza", equipo: despertado ? "Anatomía" : "Equipo", guarida: despertado ? "Conquista" : "Guarida",
          suministro: despertado ? (/sacr[ií]lego|defiler/i.test(voc) ? "Trofeos" : "Secreciones") : "Suministros",
          descanso: despertado ? "Movimiento de conquista" : "Acción de descanso"
        },
        movimientos: capsBrutas.filter(c => c.bloques.some(b => b.etiqueta === "Descanso")),
        vitales: {
          estres: { ...estres, pips: pips(estres.valor, estres.max), lleno },
          corazones: { valor: n(s.dark_hearts?.value, 0), max: n(s.dark_hearts?.max, 2), pips: pips(s.dark_hearts?.value, s.dark_hearts?.max ?? 2) },
          oro: { valor: n(s.gold?.value, 0), max: n(s.gold?.max, 3), pips: pips(s.gold?.value, s.gold?.max ?? 3), visible: d.system?.has_gold !== false && !despertado },
          suministro: { usados: usadosSum, max: maxSum, quedan: Math.max(0, maxSum - usadosSum), pips: pips(usadosSum, maxSum) },
          malvada: { valor: n(s.wickedxp?.value, 0), max: n(s.wickedxp?.max, 9), pips: pips(s.wickedxp?.value, s.wickedxp?.max ?? 9), lleno: xpLleno },
          osada: { valor: n(s.recklessxp?.value, 0), max: n(s.recklessxp?.max, 3), pips: pips(s.recklessxp?.value, s.recklessxp?.max ?? 3) }
        },
        estados: {
          conmocion: atributos.map(a => ({ id: a.id, nombre: a.nombre, on: a.shocked, texto: actor.getFlag(MOD, "heridas")?.[a.id] ?? "" })),
          reventadoTexto: actor.getFlag(MOD, "heridas")?.sangre ?? "",
          muerto: Boolean(actor.getFlag(MOD, "muerto")),
          golpe: n(s.dark_hearts?.value, 0),
          hayConmocion: atributos.some(a => a.shocked),
          reventado: Boolean(s.bloodied),
          desatado: Boolean(actor.statuses?.has?.("mr-feral")) || lleno
        },
        atributos, principales: capsBrutas.filter(c => c.principal), otras: capsBrutas.filter(c => !c.principal), cuentaCaps: capsBrutas.length, puedeAprender, xpLleno,
        defensas: por("defense").map(i => ({ id: i.id, nombre: i.name, on: Boolean(i.system.checked) })),
        equipo, suministros, cuentaEquipo: equipo.length, equipoLleno: equipo.length >= 4, equipoExcedido: equipo.length > 4,
        proyectos: por("project").map(i => ({ id: i.id, nombre: i.name, desc: i.system.description ?? "", pips: pips(i.system.clock_progress, i.system.clock_size), valor: n(i.system.clock_progress, 0), max: n(i.system.clock_size, 4) })),
        labores: por("duty").map(i => ({ id: i.id, nombre: i.name, desc: i.system.description ?? "", tipo: i.system.type_custom || i.system.type || "", nivel: n(i.system.tier, 0) })),
        pandas: game.actors.filter(a => a.type === "minion_pack").map(a => ({ id: a.id, nombre: a.name, sel: a.id === s.minionpack })),
        descansoUsado: Boolean(s.downtime_action_used),
        libretoHTML: this.compacta ? "" : await htmlLibreto(this.#libreto, actor)
      };
      return d;
    }

    /** Herramientas de la hoja: viven en la barra de la ventana. */
    async accionDock(a) {
      const actor = this.actor;
      if (a === "compacta") this.#alternarCompacta();
      else if (a === "libretos") abrirLibretos(actor, this.#libreto);
      else if (a === "aspecto") abrirPanelAspecto();
      else if (a === "evolucion") { this.#evolucion = !this.#evolucion; if (this.#evolucion) ui.notifications.info("Modo evolución: ahora puedes cambiar raza, vocación, impulso y juerga, y aprender capacidades."); await this.render(false); }
      else if (a === "ayuda") { const v = !game.settings.get(MOD, "ayudaActiva"); await game.settings.set(MOD, "ayudaActiva", v); ui.notifications.info(v ? "Ayuda al detener el cursor: activada." : "Ayuda al detener el cursor: desactivada."); }
      else if (a === "recuperar") { const ok = await foundry.applications.api.DialogV2.confirm({ window: { title: "Recuperación" }, content: `<p>Elimina todo el estrés de <strong>${foundry.utils.escapeHTML(actor.name)}</strong>, cura sus heridas (conmociones y reventado) y regenera defensas y suministros. ¿Aplicarlo?</p>`, rejectClose: false }); if (ok) await recuperar(actor); }
      else if (a === "heridas") abrirHeridas(actor);
      else if (a === "creador") game.modules.get(MOD)?.api?.abrirCreador?.(actor);
      this.#marcarCabecera();
    }

    _getHeaderButtons() {
      const b = super._getHeaderButtons();
      const mk = (k, icon, label) => ({ label, class: `mrg-hb-${k}`, icon, onclick: () => this.accionDock(k) });
      return [mk("compacta", "fa-solid fa-compress", "Compacta"), mk("libretos", "fa-solid fa-book-skull", "Libretos"), mk("evolucion", "fa-solid fa-dna", "Evolución"),
        mk("heridas", "fa-solid fa-droplet", "Heridas"), mk("recuperar", "fa-solid fa-moon", "Recuperación"), mk("creador", "fa-solid fa-wand-sparkles", "Creador"),
        mk("aspecto", "fa-solid fa-universal-access", "Aspecto"), mk("ayuda", "fa-solid fa-circle-question", "Ayuda"), ...b];
    }

    /** Explicación de cada botón de la barra y estado de los que se activan. */
    #marcarCabecera() {
      const el = this.element?.[0]; if (!el) return;
      const T = {
        compacta: "Ficha compacta||Deja la hoja en lo esencial para tenerla en un rincón de la pantalla. Pulsa otra vez para volver a la completa.",
        libretos: "Libretos||Abre la ventana con todas las vocaciones y razas: cómo interpretarlas, capacidades y objetos de ejemplo.",
        evolucion: "Modo evolución||Mientras está activo puedes cambiar raza, vocación, impulso y juerga y aprender capacidades. Úsalo solo cuando toque subir de nivel o cuando tu DJ lo permita.",
        heridas: "Heridas||Abre la ventana para gestionar conmociones, reventado y muerte, y apuntar qué te ha pasado en cada una.",
        recuperar: "Recuperación||Elimina todo tu estrés, cura tus heridas y regenera defensas y suministros. Es lo primero que se hace en la fase de acecho.",
        creador: "Creador de monstruos||Te guía paso a paso (o al azar) para crear un monstruo completo.",
        aspecto: "Aspecto y accesibilidad||Modo oscuro, contraste, tamaño de letra, barra de ventana y más.",
        ayuda: "Explicaciones||Activa o desactiva las explicaciones que salen al dejar el cursor quieto sobre algo."
      };
      for (const [k, t] of Object.entries(T)) { const b = el.querySelector(`.window-header .mrg-hb-${k}`); if (b) b.dataset.ayuda = t; }
      el.querySelector(".window-header .mrg-hb-evolucion")?.classList.toggle("on", this.#evolucion);
      el.querySelector(".window-header .mrg-hb-compacta")?.classList.toggle("on", this.compacta);
    }

    async _render(force, options) {
      await super._render(force, options);
      this.#marcarCabecera();
    }

    activateListeners(html) {
      super.activateListeners(html);
      escuchasComunes(this, html);
      const actor = this.actor, root = html[0] ?? html;

      root.querySelector("[data-pestana-libreto]")?.addEventListener("click", ev => clicLibreto(ev, actor, this.#libreto, async () => { await this.render(false); }));

      html.find("[data-heridas]").on("click", () => abrirHeridas(actor));
      html.find("[data-xp]").on("click", () => abrirExperiencia(actor));
      html.find("[data-abrir-actor]").on("click", ev => game.actors.get(ev.currentTarget.dataset.abrirActor)?.sheet.render(true));
      html.find("[data-ir-libreto]").on("click", async ev => {
        this.#libreto.modo = ev.currentTarget.dataset.irLibreto;
        await this.render(false);
        this._tabs?.[0]?.activate("libreto");
      });

      html.find("[data-desatar]").on("click", async () => {
        const activo = actor.statuses?.has?.("mr-feral");
        try { await actor.toggleStatusEffect("mr-feral", { active: !activo }); } catch { /* sin estado */ }
        await this.render(false);
      });

      html.find("[data-item-check][data-campo='checked']").on("change", async ev => {
        const it = actor.items.get(ev.currentTarget.dataset.itemCheck);
        if (it?.type !== "defense" || !ev.currentTarget.checked || !game.settings.get(MOD, "autoAplicar")) return;
        await ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor }), flags: { [MOD]: { tarjeta: true } },
          content: htmlTarjetaSimple({ tipo: "Defensa", titulo: it.name, subtitulo: `${actor.name} usa su defensa`, estado: "success", neutro: "azul",
            cuerpo: "<p>Evita por completo la consecuencia, como un éxito en una tirada de resistencia: <strong>no genera Estrés</strong>. Describe qué ocurre y cómo te aprovechas.</p><p class=\"mrg-nota\">No podrá volver a usarla hasta la próxima recuperación.</p>" })
        });
      });
      html.find("[data-usar]").on("click", async ev => {
        const it = actor.items.get(ev.currentTarget.dataset.usar);
        if (!it) return;
        const uso = clasificarUso(it.system);
        if (uso.k === "estres") await aplicarEstresActor(actor, 1, { silencioso: true });
        await ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor }), flags: { [MOD]: { tarjeta: true } },
          content: htmlTarjetaSimple({ tipo: "Capacidad", titulo: it.name, subtitulo: `${actor.name}${uso.k === "estres" ? " · 1 de Estrés" : ""}`, cuerpo: `<p>${foundry.utils.escapeHTML(it.system.description ?? "")}</p>`, neutro: "sangre" })
        });
      });

      html.find("[data-sacar]").on("click", async ev => {
        const it = actor.items.get(ev.currentTarget.dataset.sacar);
        const max = n(actor.system.supply?.max, 2), usados = n(actor.system.supply?.value, 0);
        if (!it) return;
        if (usados >= max) return ui.notifications.warn(`${actor.name} no tiene casillas de suministro libres: no lleva nada más.`);
        await actor.update({ "system.supply.value": usados + 1 });
        await ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor }), flags: { [MOD]: { tarjeta: true } },
          content: htmlTarjetaSimple({ tipo: "Suministro", titulo: it.name, subtitulo: `${actor.name} saca algo de su inventario`, cuerpo: `<p>${foundry.utils.escapeHTML(it.system.description ?? "")}</p><p class="mrg-nota">Se tacha una casilla: quedan ${max - usados - 1} de ${max} hasta la próxima recuperación.</p>`, neutro: "azul" })
        });
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
