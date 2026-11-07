/**
 * Asistente y Generador Interactivo MR para Wicked Ones (ApplicationV2 con memoria en localStorage).
 * Permite reclutar Manadas de Esbirros, añadir Salas/Trampas/Criaturas, generar Invasiones completas
 * con los 6 movimientos de cada aventurero y consultar los Oráculos y Tablas d66.
 */

import { n, acota } from "./core/reglas.mjs";
import { actorActivo, ejecutarTiradaCiclo, publicarTarjetaMR } from "./tiradas.mjs";

const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const MOD = "mr-wicked-ones-es";
const CLAVE_MEMORIA = "mr-wicked-ones-es.generador.memoria";

const BaseApp = foundry.applications?.api?.ApplicationV2 ?? Application;

export class GeneradorWickedOnes extends BaseApp {
  static DEFAULT_OPTIONS = {
    id: "mr-wo-generador",
    tag: "div",
    window: {
      title: "MR · Asistente y Generador de Wicked Ones",
      icon: "fas fa-dungeon",
      resizable: true
    },
    position: {
      width: 900,
      height: 700
    },
    classes: ["mrg", "mrg-ventana", "mrg-asistente"],
    actions: {
      cambiarPestana: GeneradorWickedOnes.#cambiarPestana,
      reclutarManada: GeneradorWickedOnes.#reclutarManada,
      simularEsbirros: GeneradorWickedOnes.#simularEsbirros,
      anadirLabor: GeneradorWickedOnes.#anadirLabor,
      generarCriaturaMutante: GeneradorWickedOnes.#generarCriaturaMutante,
      generarGrupoInvasor: GeneradorWickedOnes.#generarGrupoInvasor,
      tirarOraculoSemillas: GeneradorWickedOnes.#tirarOraculoSemillas,
      tirarTablaCompendio: GeneradorWickedOnes.#tirarTablaCompendio,
      lanzarCiclo: GeneradorWickedOnes.#lanzarCiclo
    }
  };

  #pestana = "mesa";

  constructor(options = {}) {
    super(options);
    const mem = this.#leerMemoria();
    this.#pestana = { invasiones: "invasores", oraculos: "mesa" }[options.pestana ?? mem.pestana] ?? options.pestana ?? mem.pestana ?? "mesa";
  }

  #leerMemoria() {
    try {
      return JSON.parse(localStorage.getItem(CLAVE_MEMORIA) || "{}");
    } catch {
      return {};
    }
  }

  #guardarMemoria(parcial = {}) {
    try {
      const actual = this.#leerMemoria();
      localStorage.setItem(CLAVE_MEMORIA, JSON.stringify({ ...actual, ...parcial }));
    } catch {
      // Ignorar errores de almacenamiento privado
    }
  }

  establecerPestana(p) {
    p = { invasiones: "invasores", oraculos: "mesa" }[p] ?? p;
    this.#pestana = p;
    this.#guardarMemoria({ pestana: p });
    if (this.rendered) this.render();
  }

  async _prepareContext() {
    return {
      pestana: this.#pestana
    };
  }

  async _renderHTML() {
    const p = this.#pestana;
    const laboresPack = game.packs.get(`${MOD}.labores-es`);
    const laboresIdx = laboresPack ? Array.from(await laboresPack.getIndex({ fields: ["system.tier", "system.type_custom"] })) : [];
    const secciones = [
      ["mesa", "La mesa", "fa-hourglass-half", "Ciclo de partida y oráculos"],
      ["esbirros", "Esbirros", "fa-users", "Reclutar y mandar manadas"],
      ["guarida", "Guarida", "fa-dungeon", "Salas, trampas y criaturas"],
      ["invasores", "Invasores", "fa-shield-halved", "Aventureros que os atacan"],
      ["tablas", "Tablas", "fa-dice-d20", "Generadores al azar"]
    ];
    const nav = secciones.map(([k, t, i, h]) => `<button type="button" class="mrg-asist-nav-b ${p === k ? "mrg-sel" : ""}" data-action="cambiarPestana" data-tab="${k}" aria-pressed="${p === k}"><i class="fa-solid ${i}"></i><span><strong>${t}</strong><small>${h}</small></span></button>`).join("");
    const cuerpo = { mesa: () => this.#htmlMesa(), esbirros: () => this.#htmlEsbirros(), guarida: () => this.#htmlGuarida(laboresIdx), invasores: () => this.#htmlInvasiones(), tablas: () => this.#htmlTablas() }[p]?.() ?? "";
    return `<div class="mrg-asist"><nav class="mrg-asist-nav" aria-label="Secciones">${nav}</nav><section class="mrg-asist-cuerpo">${cuerpo}</section></div>`;
  }

  _replaceHTML(result, content) {
    content.innerHTML = result;
  }

  /** Tarjeta de herramienta: título, qué hace, controles y acciones. */
  #tarjeta(icono, titulo, ayuda, controles, acciones) {
    return `<article class="mrg-herr"><header><i class="fa-solid ${icono}" aria-hidden="true"></i><h3>${titulo}</h3></header><p class="mrg-nota">${ayuda}</p>${controles ? `<div class="mrg-herr-ctrl">${controles}</div>` : ""}<footer>${acciones}</footer></article>`;
  }
  #campo(etiqueta, control, ayuda = "") { return `<label class="mrg-campo"><span class="mrg-etiqueta">${etiqueta}</span>${control}${ayuda ? `<small class="mrg-nota">${ayuda}</small>` : ""}</label>`; }
  #boton(accion, icono, texto, { tipo = "", datos = "", clase = "" } = {}) { return `<button type="button" class="mrg-btn ${tipo === "p" ? "mrg-btn--sangre" : ""} ${clase}" data-action="${accion}" ${datos}><i class="fa-solid ${icono}"></i> ${texto}</button>`; }

  #htmlMesa() {
    return `<h2 class="mrg-asist-t mrg-titulo">La mesa</h2>
    <p class="mrg-asist-intro">Herramientas para <strong>dirigir la partida</strong>. Todo lo que tires aquí lo ves solo tú; con el botón «Mostrar a los jugadores» de la tarjeta lo enseñas cuando quieras.</p>
    <details class="mrg-guia mrg-guia--dj"><summary><i class="fa-solid fa-circle-info"></i> ¿Primera vez dirigiendo Wicked Ones? Así funciona una sesión</summary>
      <ol>
        <li><strong>Acecho.</strong> Empieza con la <em>recuperación</em> (se quita todo el estrés y se curan las heridas), se tira el botín de la incursión anterior, se celebra una <em>juerga</em> y cada jugador hace una <em>acción de descanso</em> (construir, fabricar, reclutar esbirros…).</li>
        <li><strong>Desastre.</strong> Tú tiras para ver si algo malo ocurre dentro de la mazmorra (un motín, un derrumbe…). Es la primera tarjeta de abajo.</li>
        <li><strong>Incursión.</strong> Los monstruos eligen un objetivo y un plan, tiras la <em>implicación</em> para ver cómo empieza, y se juega la escena con tiradas de acción, resistencias y estrés.</li>
        <li><strong>Represalias.</strong> Según cómo fue la incursión, el mundo contraataca: tiras la represalia y la mazmorra se defiende de los invasores.</li>
      </ol>
      <p>El <strong>Panel del DJ</strong> (actor «panel del DJ») marca en qué fase del ciclo estáis y da pistas de cada una. Si pasas a la fase 1, el módulo te ofrece aplicar la recuperación a todos.</p>
    </details>
    ${this.#tarjeta("fa-biohazard", "Tirada de Desastre", "Fase de desastre: mira si algo malo pasa dentro de vuestra mazmorra (un motín, un derrumbe…). Cuantos más dados, más probable que el descontento de la guarida se note. El resultado indica cuánto avanzan los relojes.", this.#campo("Reserva de dados", `<input type="number" id="mr-gen-ciclo-dados" value="2" min="0" max="6">`, "0 = tiras 2d y cuenta el menor"), `${this.#boton("lanzarCiclo", "fa-biohazard", "Tirar Desastre", { tipo: "p", datos: 'data-tipo="calamity"' })}${this.#boton("lanzarCiclo", "fa-bullhorn", "Tirar Represalia", { datos: 'data-tipo="blowback"' })}`)}
    ${this.#tarjeta("fa-seedling", "Oráculo de dos semillas", "Dos palabras al azar para despertar la imaginación cuando necesitas un detalle sobre la marcha (un guardián, un hallazgo, un giro). Se tira una semilla en cada tabla y se juntan; la tarjeta explica cómo usarlas (manual, pág. 356).", "", this.#boton("tirarOraculoSemillas", "fa-seedling", "Tirar el oráculo", { tipo: "p" }))}
    ${this.#tarjeta("fa-skull", "Solitario: suceso en la guarida", "Qué le ocurre a la mazmorra mientras nadie la vigila: un suceso que complica o mejora la guarida. Útil en las fases de acecho o para partidas en solitario.", "", this.#boton("tirarTablaCompendio", "fa-crown", "Tirar suceso (d12)", { tipo: "p", datos: 'data-tabla="solitario-gran-malo"' }))}`;
  }

  #htmlEsbirros() {
    const razas = ["Orco", "Goblin", "Kóbold", "Sérpido", "Demonio", "No-muerto", "Osgo", "Hombres rata"];
    const oficios = [
      ["Guardias y rompelíneas", "smash", "threaten"], ["Arqueros y emboscadores", "finesse", "scan"], ["Exploradores y asesinos", "skulk", "trick"],
      ["Artificieros y tramperos", "tinker", "scan"], ["Acólitos y chamanes", "invoke", "banter"], ["Matones e intimidadores", "threaten", "smash"]
    ];
    const controles = `<div class="mrg-rejilla-2">
      ${this.#campo("Nombre de la manada", `<input type="text" id="mr-gen-manada-nombre" value="Garras del Paso">`)}
      ${this.#campo("Raza", `<select id="mr-gen-manada-raza">${razas.map(r => `<option value="${esc(r)}">${esc(r)}</option>`).join("")}</select>`)}
      ${this.#campo("Función", `<select id="mr-gen-manada-oficio">${oficios.map(([nom, h1, h2]) => `<option value="${esc(nom)}" data-h1="${h1}" data-h2="${h2}">${esc(nom)}</option>`).join("")}</select>`, "Dos acciones con 2 puntos")}
      ${this.#campo("¿Vincular a tu personaje?", `<select id="mr-gen-manada-vincular"><option value="1" selected>Sí, al personaje seleccionado</option><option value="0">No, solo crear</option></select>`)}
    </div>`;
    const sim = `<div class="mrg-rejilla-2">${this.#campo("Dados de la manada", `<input type="number" id="mr-gen-manada-dados" value="2" min="0" max="6">`)}${this.#campo("Objetivo", `<input type="text" id="mr-gen-manada-objetivo" value="Saquear caravana en el Paso del Mercader">`)}</div>`;
    return `<h2 class="mrg-asist-t mrg-titulo">Esbirros</h2>
    <p class="mrg-asist-intro">Los esbirros son <strong>manadas</strong> de monstruos menores al servicio de los jugadores: una acción primaria (2d) y dos secundarias (1d), sin estrés ni experiencia. Aquí creas una manada lista para jugar o resuelves lo que hace cuando los jugadores la mandan por su cuenta.</p>
    ${this.#tarjeta("fa-user-plus", "Reclutar una manada", "Crea la manada con su raza, función, acciones iniciales e impulso, y la deja vinculada a tu personaje.", controles, this.#boton("reclutarManada", "fa-plus", "Crear y reclutar", { tipo: "p" }))}
    ${this.#tarjeta("fa-person-running", "Incursión de esbirros", "Manda a la manada por su cuenta: se resuelve el botín, las bajas y la represalia (pág. 262).", sim, this.#boton("simularEsbirros", "fa-dice", "Simular la incursión", { tipo: "p" }))}`;
  }

  #htmlGuarida(laboresIdx) {
    const porTipo = new Map();
    for (const it of laboresIdx) {
      const t = it.system?.type_custom || "Otras";
      if (!porTipo.has(t)) porTipo.set(t, []);
      porTipo.get(t).push(it);
    }
    const opciones = [...porTipo.entries()].sort((a, b) => a[0].localeCompare(b[0], "es")).map(([t, lista]) =>
      `<optgroup label="${esc(t)} (${lista.length})">${lista.sort((a, b) => a.name.localeCompare(b.name, "es")).map(it => `<option value="${esc(it._id)}">${esc(it.name)}${it.system?.tier ? ` · N${it.system.tier}` : ""}</option>`).join("")}</optgroup>`).join("");
    return `<h2 class="mrg-asist-t mrg-titulo">Guarida</h2>
    <p class="mrg-asist-intro">La <strong>guarida</strong> es la mazmorra de los monstruos. Las <em>labores</em> son sus salas, trampas, trucos, portones, criaturas y hallazgos: las añades al personaje o a la hoja de la mazmorra. Los generadores te dan ideas al momento.</p>
    ${this.#tarjeta("fa-hammer", "Añadir una labor", `Salas, trampas, trucos, portones, criaturas y hallazgos: ${laboresIdx.length} labores del libro, agrupadas por tipo.`, this.#campo("Labor", `<select id="mr-gen-labor-id">${opciones}</select>`), `${this.#boton("anadirLabor", "fa-user-check", "A mi personaje", { tipo: "p", datos: 'data-destino="pj"' })}${this.#boton("anadirLabor", "fa-dungeon", "A la hoja de la mazmorra", { datos: 'data-destino="mazmorra"' })}`)}
    ${this.#tarjeta("fa-dragon", "Criatura con mutación", "Una especie base (d36) con un rasgo mutante (d20). Sale al chat (pág. 373).", "", this.#boton("generarCriaturaMutante", "fa-paw", "Generar criatura", { tipo: "p" }))}
    ${this.#tarjeta("fa-compass", "Sala de mazmorra al azar", "Una sala nueva para tu guarida (d18).", "", this.#boton("tirarTablaCompendio", "fa-door-open", "Tirar sala", { tipo: "p", datos: 'data-tabla="generador-mazmorras-salas"' }))}`;
  }

  #htmlInvasiones() {
    const controles = `<div class="mrg-rejilla-2">
      ${this.#campo("Nombre de la expedición", `<input type="text" id="mr-gen-inv-nombre" value="Expedición Castigadora del Valle">`)}
      ${this.#campo("Ayudantes", `<input type="number" id="mr-gen-inv-ayu" value="2" min="0" max="6">`)}
      ${this.#campo("Aventureros de nivel 1", `<input type="number" id="mr-gen-inv-n1" value="2" min="0" max="5">`)}
      ${this.#campo("Aventureros de nivel 2", `<input type="number" id="mr-gen-inv-n2" value="1" min="0" max="5">`)}
      ${this.#campo("Aventureros de nivel 3", `<input type="number" id="mr-gen-inv-n3" value="0" min="0" max="4">`)}
    </div>`;
    return `<h2 class="mrg-asist-t mrg-titulo">Invasores</h2>
    <p class="mrg-asist-intro">Los <strong>invasores</strong> son los aventureros que atacan la mazmorra. Genera un grupo con los niveles que quieras (cada uno con sus movimientos y corazones) y úsalo en las escenas de defensa. El nivel de un aventurero indica cuántos corazones tiene.</p>
    ${this.#tarjeta("fa-users-gear", "Generar un grupo invasor", "Crea el grupo con aventureros de los niveles que pidas (con sus movimientos) y sus ayudantes, listo para entrar en vuestra mazmorra.", controles, this.#boton("generarGrupoInvasor", "fa-users-gear", "Generar el grupo", { tipo: "p" }))}
    ${this.#tarjeta("fa-gem", "Botín de aventureros caídos", "Lo que llevaban encima los que no salieron de la mazmorra.", "", this.#boton("tirarTablaCompendio", "fa-gem", "Tirar botín", { tipo: "p", datos: 'data-tabla="botin-mayor"' }))}
    ${this.#tarjeta("fa-user-shield", "Aventurero al azar", "Un aventurero de la lista (d30), por si necesitas uno sobre la marcha.", "", this.#boton("tirarTablaCompendio", "fa-user-shield", "Tirar aventurero", { tipo: "p", datos: 'data-tabla="aventureros-30"' }))}`;
  }

  #htmlTablas() {
    const t = (clave, icono, titulo, dado, para) => `<button type="button" class="mrg-tabla-b" data-action="tirarTablaCompendio" data-tabla="${clave}" data-ayuda="${esc(titulo)}||${esc(para)}"><i class="fa-solid ${icono}"></i><span><strong>${titulo}</strong><small>${para}</small></span><b class="mrg-chip">${dado}</b></button>`;
    return `<h2 class="mrg-asist-t mrg-titulo">Tablas</h2>
    <p class="mrg-asist-intro">Generadores al azar para improvisar. <strong>Cada tirada se susurra solo a la dirección</strong> y trae un botón para enseñarla a los jugadores cuando quieras. Los objetos de las tablas de creación (mejunjes, artilugios, pociones y objetos mágicos) <strong>no se eligen: salen de aquí</strong>, al fabricarlos en una acción de descanso o al encontrarlos en el botín.</p>
    <h3 class="mrg-seccion">Incursión</h3><div class="mrg-tablas">${t("incursion-objetivo", "fa-crosshairs", "Objetivo de la incursión", "d18", "Qué hay que asaltar y qué botín principal ofrece. Para planear una incursión.")}${t("incursion-complicacion", "fa-triangle-exclamation", "Giro de la incursión", "d12", "Una complicación inesperada durante la incursión, para cuando va demasiado bien.")}</div>
    <h3 class="mrg-seccion">Creaciones y botín</h3><div class="mrg-tablas">${t("mejunjes-36", "fa-flask", "Mejunje alquímico", "d36", "El mejunje que consigue o fabrica un monstruo.")}${t("artilugios-36", "fa-gears", "Artilugio mecánico", "d36", "El artilugio que fabrica o encuentra.")}${t("pociones-36", "fa-wine-bottle", "Poción de brujería", "d36", "La poción que se prepara o se halla.")}${t("reliquias-36", "fa-ring", "Objeto mágico o reliquia", "d36", "Un tesoro mágico del botín.")}</div>
    <h3 class="mrg-seccion">Guarida y héroes</h3><div class="mrg-tablas">${t("solitario-gran-malo", "fa-crown", "Suceso en la guarida", "d12", "Qué le ocurre a la mazmorra mientras nadie la vigila.")}${t("aventureros-30", "fa-user-shield", "Aventurero al azar", "d30", "Un aventurero rival sobre la marcha.")}</div>`;
  }

  static #cambiarPestana(ev, target) {
    const tab = target.dataset.tab || "esbirros";
    this.establecerPestana(tab);
  }

  static async #reclutarManada() {
    const el = this.element;
    const nombre = el.querySelector("#mr-gen-manada-nombre")?.value?.trim() || "Nueva Manada";
    const raza = el.querySelector("#mr-gen-manada-raza")?.value || "Orco";
    const selOficio = el.querySelector("#mr-gen-manada-oficio");
    const oficio = selOficio?.value || "Guardias";
    const opt = selOficio?.selectedOptions?.[0];
    const h1 = opt?.dataset?.h1 || "smash";
    const h2 = opt?.dataset?.h2 || "threaten";
    const vincular = el.querySelector("#mr-gen-manada-vincular")?.value === "1";

    const nuevo = await Actor.create({
      name: nombre,
      type: "minion_pack",
      img: `modules/${MOD}/assets/retratos/esbirros-ulrot.webp`,
      system: {
        mp_type: "normal",
        ua_job: oficio,
        number: { min: 0, value: 4, max: 10 },
        attributes: {
          brains: {
            skills: {
              scan: { value: h1 === "scan" || h2 === "scan" ? 2 : 1 },
              tinker: { value: h1 === "tinker" || h2 === "tinker" ? 2 : 0 },
              trick: { value: h1 === "trick" || h2 === "trick" ? 2 : 0 }
            }
          },
          muscles: {
            skills: {
              finesse: { value: h1 === "finesse" || h2 === "finesse" ? 2 : 0 },
              skulk: { value: h1 === "skulk" || h2 === "skulk" ? 2 : 1 },
              smash: { value: h1 === "smash" || h2 === "smash" ? 2 : 0 }
            }
          },
          guts: {
            skills: {
              banter: { value: h1 === "banter" || h2 === "banter" ? 2 : 0 },
              threaten: { value: h1 === "threaten" || h2 === "threaten" ? 2 : 0 },
              invoke: { value: h1 === "invoke" || h2 === "invoke" ? 2 : 0 }
            }
          }
        }
      },
      items: [
        { name: raza, type: "monster_race", system: { primal: false, description: `Manada de ${raza.toLowerCase()}s.` } },
        { name: oficio, type: "minion_type", system: { description: oficio } },
        { name: "Armar escándalo y saquear", type: "minionimpulse", system: { is_for_ua: false } }
      ]
    });

    if (vincular && nuevo) {
      const pj = actorActivo();
      if (pj && pj.type === "character") {
        await pj.update({ "system.minionpack": nuevo.id });
      }
    }
    nuevo?.sheet?.render(true);
    ui.notifications.info(`Manada «${nombre}» reclutada con éxito.`);
  }

  static async #simularEsbirros() {
    const el = this.element;
    const dados = n(el.querySelector("#mr-gen-manada-dados")?.value, 2);
    const obj = el.querySelector("#mr-gen-manada-objetivo")?.value?.trim() || "Incursión de esbirros";
    await ejecutarTiradaCiclo("minion_raid", dados, obj);
  }

  static async #anadirLabor(ev, target) {
    const el = this.element;
    const id = el.querySelector("#mr-gen-labor-id")?.value;
    if (!id) return;
    const pack = game.packs.get(`${MOD}.labores-es`);
    const doc = await pack?.getDocument(id);
    if (!doc) return;

    const destino = target.dataset.destino === "mazmorra"
      ? game.actors.find(a => a.type === "dungeon")
      : actorActivo();

    if (!destino) return ui.notifications.warn("No se encontró el actor de destino (selecciona un PJ o crea una Mazmorra).");
    await destino.createEmbeddedDocuments("Item", [doc.toObject()]);
    ui.notifications.info(`Añadido «${doc.name}» a ${destino.name}.`);
  }

  static async #generarCriaturaMutante() {
    const pack = game.packs.get(`${MOD}.tablas-es`);
    if (!pack) return;
    const docs = await pack.getDocuments();
    const tEsp = docs.find(t => t.flags?.[MOD]?.clave === "criaturas-36");
    const tMut = docs.find(t => t.flags?.[MOD]?.clave === "criaturas-mutacion");
    const r1 = tEsp ? (await tEsp.draw({ displayChat: false }))?.results?.[0]?.text : "Criatura subterránea";
    const r2 = tMut ? (await tMut.draw({ displayChat: false }))?.results?.[0]?.text : "Mutación desconocida";

    await publicarTarjetaMR({
      titulo: "Criatura de Guarida Generada",
      subtitulo: "Especie (d36) + Rasgo Mutante (d20)",
      estado: null, tipo: "Generador", soloDJ: true,
      cuerpoHTML: `<h4 class="mrg-tabla-res">${esc(r1)}</h4><p><strong>Mutación:</strong> ${esc(r2)}</p><p class="mrg-nota">Describe cómo luce la criatura combinando ambas cosas y decide dónde vive en la mazmorra.</p>`
    });
  }

  static async #generarGrupoInvasor() {
    const el = this.element;
    const nombre = el.querySelector("#mr-gen-inv-nombre")?.value?.trim() || "Grupo de Aventureros";
    const n1 = acota(el.querySelector("#mr-gen-inv-n1")?.value, 0, 5);
    const n2 = acota(el.querySelector("#mr-gen-inv-n2")?.value, 0, 5);
    const n3 = acota(el.querySelector("#mr-gen-inv-n3")?.value, 0, 4);
    const nAyu = acota(el.querySelector("#mr-gen-inv-ayu")?.value, 0, 6);

    const pack = game.packs.get(`${MOD}.aventureros-es`);
    const docs = pack ? await pack.getDocuments() : [];
    const poolAdv = docs.filter(d => d.system?.adventurer_type === "adventurer");
    const poolAyu = docs.filter(d => d.system?.adventurer_type === "hireling");

    const elegir = arr => arr[Math.floor(Math.random() * arr.length)];
    const items = [];

    for (const [niv, cant] of [[1, n1], [2, n2], [3, n3]]) {
      for (let i = 0; i < cant; i++) {
        if (!poolAdv.length) break;
        const base = elegir(poolAdv).toObject();
        base.system.tier = niv;
        items.push(base);
      }
    }
    for (let i = 0; i < nAyu; i++) {
      if (!poolAyu.length) break;
      items.push(elegir(poolAyu).toObject());
    }

    const party = await Actor.create({
      name: nombre,
      type: "party",
      img: `modules/${MOD}/assets/retratos/adv-defensor.webp`,
      items
    });
    party?.sheet?.render(true);
    ui.notifications.info(`Grupo invasor «${nombre}» generado con ${items.length} integrantes.`);
  }

  static async #tirarOraculoSemillas() {
    const pack = game.packs.get(`${MOD}.tablas-es`);
    if (!pack) return;
    const docs = await pack.getDocuments();
    const s1 = docs.find(t => t.flags?.[MOD]?.clave === "oraculo-semilla-1");
    const s2 = docs.find(t => t.flags?.[MOD]?.clave === "oraculo-semilla-2");
    const r1 = s1 ? (await s1.draw({ displayChat: false }))?.results?.[0]?.text : "Semilla 1";
    const r2 = s2 ? (await s2.draw({ displayChat: false }))?.results?.[0]?.text : "Semilla 2";

    await publicarTarjetaMR({
      titulo: "Oráculo de dos semillas",
      subtitulo: "«Deja volar tu imaginación» · pág. 356",
      estado: null, tipo: "Oráculo", soloDJ: true,
      cuerpoHTML: `<p class="mrg-semillas"><strong>${esc(r1)}</strong><span>+</span><strong>${esc(r2)}</strong></p>
        <p><strong>Cómo usarlo:</strong> junta las dos palabras y úsalas como punto de partida para inventar lo que necesites. Pregúntate: <em>¿qué es o quién es?, ¿qué quiere?, ¿cómo complica la escena?</em></p>
        <p class="mrg-nota">Ejemplo del manual: un «recuerdo ominoso» puede traer a un viejo enemigo; una «sombra humeante», un gólem de humo; un «artesano horrible», un pirómano con una quemadura espantosa. Si no te sirve, vuelve a tirar.</p>`
    });
  }

  static async #tirarTablaCompendio(ev, target) {
    const clave = target.dataset.tabla;
    await tirarTablaPorClave(clave);
  }

  static async #lanzarCiclo(ev, target) {
    const tipo = target.dataset.tipo || "calamity";
    const dados = n(this.element?.querySelector("#mr-gen-ciclo-dados")?.value, 2);
    await ejecutarTiradaCiclo(tipo, dados);
  }
}

/** Tira una tabla del módulo y publica una tarjeta MR solo para el DJ (con botón para mostrarla). */
export async function tirarTablaPorClave(clave) {
  const pack = game.packs.get(`${MOD}.tablas-es`);
  if (!pack) return;
  const docs = await pack.getDocuments();
  const tabla = docs.find(t => t.flags?.[MOD]?.clave === clave) ?? docs[0];
  if (!tabla) return;
  const r = await tabla.roll();
  const texto = String(r.results?.[0]?.text ?? "").trim();
  const m = texto.match(/^(.{3,80}?)(?::\s+|\s+\()(.*?)\)?$/s);
  const [cabeza, cola] = m ? [m[1].trim(), m[2].trim()] : [texto, ""];
  const titulo = tabla.name.replace(/^\d+\s*·\s*/, "").replace(/\s*\(d\d+\)\s*$/, "");
  const desc = String(tabla.description ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  await publicarTarjetaMR({
    titulo, subtitulo: `${tabla.formula} → ${r.roll.total}`, tipo: "Tabla", estado: null, soloDJ: true,
    cuerpoHTML: `<h4 class="mrg-tabla-res">${esc(cabeza)}</h4>${cola ? `<p>${esc(cola)}</p>` : ""}${desc ? `<p class="mrg-nota">${esc(desc)}</p>` : ""}`,
    botones: [{ accion: "tirar-tabla", valor: clave, icono: "fa-solid fa-rotate", etiqueta: "Volver a tirar" }]
  });
}
