/**
 * Asistente y Generador Interactivo MR para Wicked Ones (ApplicationV2 con memoria en localStorage).
 * Permite reclutar Manadas de Esbirros, añadir Salas/Trampas/Criaturas, generar Invasiones completas
 * con los 6 movimientos de cada aventurero y consultar los Oráculos y Tablas d66.
 */

import { n, acota } from "./core/reglas.mjs";
import { actorActivo, ejecutarTiradaCiclo, publicarTarjetaMR } from "./tiradas.mjs";
import { ATRIBUTOS, nombreAccion } from "./tirada.mjs";

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
    ${this.#tarjeta("fa-biohazard", "Desastre y represalia", "<strong>Desastre</strong> (pág. 244): tras cada fase de acecho tiras 1d si hay quejas incesantes, 2d con el descontento normal y 3d si están demasiado felices o asustados para quejarse. Fracaso: desastre grave; parcial: leve; éxito: los esbirros ganan moral y van gratis a la siguiente incursión; crítico: además, un descubrimiento. <strong>Represalia</strong> (pág. 264): 1d si os desviasteis mucho del plan, 2d si se fue un poco de las manos, 3d si fue todo bien. Fracaso: grave; parcial: leve; éxito: cada PJ gana un corazón oscuro; crítico: además, una facción como chivo expiatorio.", this.#campo("Reserva de dados", `<input type="number" id="mr-gen-ciclo-dados" value="2" min="1" max="3">`, "1d, 2d o 3d"), `${this.#boton("lanzarCiclo", "fa-biohazard", "Tirar desastre", { tipo: "p", datos: 'data-tipo="calamity"' })}${this.#boton("lanzarCiclo", "fa-bullhorn", "Tirar represalia", { datos: 'data-tipo="blowback"' })}`)}
    ${this.#tarjeta("fa-seedling", "Oráculo de dos semillas", "Dos palabras al azar para despertar la imaginación cuando necesitas un detalle sobre la marcha (un guardián, un hallazgo, un giro). Se tira una semilla en cada tabla y se juntan; la tarjeta explica cómo usarlas (manual, pág. 356).", "", this.#boton("tirarOraculoSemillas", "fa-seedling", "Tirar el oráculo", { tipo: "p" }))}
    ${this.#tarjeta("fa-crown", "Partidas en solitario", "El gran malo malvado (pág. 352): en solitario, la categoría del desastre o de la represalia sale de estas tablas del manual.", "", `${this.#boton("tirarTablaCompendio", "fa-biohazard", "Desastre aleatorio (1d6)", { tipo: "p", datos: 'data-tabla="solo-desastre"' })}${this.#boton("tirarTablaCompendio", "fa-bullhorn", "Represalia aleatoria (1d6)", { datos: 'data-tabla="solo-represalia"' })}`)}`;
  }

  #htmlEsbirros() {
    // pág. 194 y 372: razas, trabajos e impulsos de los esbirros del manual
    const razas = ["Demonio", "Gnoll", "Goblin", "Hobgoblin", "Kóbold", "Orco", "Osgo", "Sérpido"];
    const trabajos = ["Acólitos", "Alquimistas", "Asesinos", "Brujos", "Bufones", "Conductores", "Estafadores", "Exploradores", "Guardaespaldas", "Ingenieros", "Ladrones", "Magos", "Matones", "Mensajeros", "Mineros", "Obreros", "Sacerdotes", "Saqueadores", "Tramperos", "Zapadores"];
    const impulsos = ["Adictos", "Agresivos", "Codiciosos", "Desleales", "Impacientes", "Inestables", "Perezosos", "Supersticiosos"];
    const acciones = Object.values(ATRIBUTOS).flat();
    const selAccion = (id, def) => `<select id="${id}">${acciones.map(k => `<option value="${k}" ${k === def ? "selected" : ""}>${esc(nombreAccion(k))}</option>`).join("")}</select>`;
    const lista = (id, arr) => `<select id="${id}">${arr.map(r => `<option value="${esc(r)}">${esc(r)}</option>`).join("")}</select>`;
    const controles = `<div class="mrg-rejilla-2">
      ${this.#campo("Nombre de la panda", `<input type="text" id="mr-gen-manada-nombre" value="Garras del Paso">`)}
      ${this.#campo("¿Cuántos la forman?", `<input type="number" id="mr-gen-manada-numero" value="4" min="2" max="5">`, "De 2 (un par de ogros) a 5")}
      ${this.#campo("Raza", lista("mr-gen-manada-raza", razas))}
      ${this.#campo("Trabajo", lista("mr-gen-manada-oficio", trabajos))}
      ${this.#campo("Acción primaria (2d)", selAccion("mr-gen-manada-h1", "smash"))}
      ${this.#campo("Impulso oscuro", lista("mr-gen-manada-impulso", impulsos))}
      ${this.#campo("Acción secundaria (1d)", selAccion("mr-gen-manada-h2", "scan"))}
      ${this.#campo("Acción secundaria (1d)", selAccion("mr-gen-manada-h3", "skulk"))}
      ${this.#campo("¿Vincular a tu personaje?", `<select id="mr-gen-manada-vincular"><option value="1" selected>Sí, al personaje seleccionado</option><option value="0">No, solo crear</option></select>`)}
    </div>`;
    const sim = `<div class="mrg-rejilla-2">${this.#campo("Reserva de la implicación", `<input type="number" id="mr-gen-manada-dados" value="2" min="0" max="6">`, "Menos de tres esbirros resta; con mejoras suma")}${this.#campo("Objetivo", `<input type="text" id="mr-gen-manada-objetivo" value="Saquear caravana en el Paso del Mercader">`)}</div>`;
    return `<h2 class="mrg-asist-t mrg-titulo">Esbirros</h2>
    <p class="mrg-asist-intro">Los esbirros son <strong>pandas</strong> de monstruos menores (pág. 192-194): una acción primaria (2d) y dos secundarias (1d), elegidas al reclutarlos; tiran 0d en las demás. No tienen estrés ni tiradas de resistencia y no ganan experiencia. Se reclutan con 1 oro o una acción de descanso.</p>
    ${this.#tarjeta("fa-user-plus", "Reclutar una panda", "Responde a las preguntas del manual (pág. 194): cuántos son, raza, trabajo, acción primaria, dos secundarias e impulso oscuro.", controles, this.#boton("reclutarManada", "fa-plus", "Crear y reclutar", { tipo: "p" }))}
    ${this.#tarjeta("fa-person-running", "Incursión de esbirros", "Mándalos solos (pág. 354): prepara la incursión, haz la tirada de implicación y tira esa reserva en «Éxito o fracaso», «Consecuencias» y «Botín y moral». Luego, tirada de represalias.", sim, this.#boton("simularEsbirros", "fa-dice", "Tirar las tres tablas", { tipo: "p" }))}`;
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
    ${this.#tarjeta("fa-dragon", "Criatura al azar", "Una criatura (d66) con dos rasgos (1d20 cada uno), como en el generador de mazmorras del manual (pág. 373).", "", this.#boton("generarCriaturaMutante", "fa-paw", "Generar criatura", { tipo: "p" }))}
    ${this.#tarjeta("fa-compass", "Sala al azar", "Las tablas de salas del generador de mazmorras (pág. 372).", "", `${this.#boton("tirarTablaCompendio", "fa-door-open", "Nivel 1 (1d12)", { tipo: "p", datos: 'data-tabla="salas-n1"' })}${this.#boton("tirarTablaCompendio", "fa-door-open", "Nivel 2 (1d6)", { datos: 'data-tabla="salas-n2"' })}${this.#boton("tirarTablaCompendio", "fa-door-open", "Nivel 3 (d66)", { datos: 'data-tabla="salas-n3"' })}`)}`;
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
    ${this.#tarjeta("fa-gem", "Botín importante", "Ejemplos de botín importante del manual (d66, pág. 359).", "", this.#boton("tirarTablaCompendio", "fa-gem", "Tirar botín", { tipo: "p", datos: 'data-tabla="botin-importante"' }))}
    ${this.#tarjeta("fa-user-shield", "Aventurero o ayudante al azar", "El generador de invasiones del manual (d66, pág. 355). Una invasión grave suele ser de tres aventureros del nivel de la mazmorra.", "", `${this.#boton("tirarTablaCompendio", "fa-user-shield", "Aventurero (d66)", { tipo: "p", datos: 'data-tabla="aventureros"' })}${this.#boton("tirarTablaCompendio", "fa-user", "Ayudante (d66)", { datos: 'data-tabla="ayudantes"' })}`)}`;
  }

  #htmlTablas() {
    const t = (clave, icono, titulo, dado, para) => `<button type="button" class="mrg-tabla-b" data-action="tirarTablaCompendio" data-tabla="${clave}" data-ayuda="${esc(titulo)}||${esc(para)}"><i class="fa-solid ${icono}"></i><span><strong>${titulo}</strong><small>${para}</small></span><b class="mrg-chip">${dado}</b></button>`;
    return `<h2 class="mrg-asist-t mrg-titulo">Tablas</h2>
    <p class="mrg-asist-intro">Generadores al azar para improvisar. <strong>Cada tirada se susurra solo a la dirección</strong> y trae un botón para enseñarla a los jugadores cuando quieras. Los objetos de las tablas de creación (mejunjes, artilugios, pociones y objetos mágicos) <strong>no se eligen: salen de aquí</strong>, al fabricarlos en una acción de descanso o al encontrarlos en el botín.</p>
    <h3 class="mrg-seccion">Incursión (pág. 354)</h3><div class="mrg-tablas">${t("incursion-plan", "fa-map", "Plan de incursión", "1d", "Primero se tira el plan.")}${t("incursion-nivel", "fa-layer-group", "Nivel del objetivo", "2d", "Cuenta el dado más alto.")}${t("incursion-estado", "fa-crosshairs", "Estado del objetivo", "2d", "Cuenta el dado más alto.")}${t("incursion-aventureros", "fa-user-shield", "Aventureros", "1d", "Depende del estado del objetivo.")}${t("incursion-caos", "fa-triangle-exclamation", "Un poco de caos", "1d", "Determina una semilla y después 1d.")}</div>
    <h3 class="mrg-seccion">Creaciones y botín</h3><div class="mrg-tablas">${t("mejunjes", "fa-flask", "Mejunjes", "d66", "Decenas 1-2 nivel 1, 3-4 nivel 2, 5-6 nivel 3.")}${t("artilugios", "fa-gears", "Artilugios", "d66", "Decenas 1-2 nivel 1, 3-4 nivel 2, 5-6 nivel 3.")}${t("pociones", "fa-wine-bottle", "Pociones", "d66", "Decenas 1-2 nivel 1, 3-4 nivel 2, 5-6 nivel 3.")}${t("objetos-magicos", "fa-ring", "Objetos mágicos", "d66", "Decenas 1-2 nivel 1, 3-4 nivel 2, 5-6 nivel 3.")}${t("objetos-azar", "fa-box-open", "Objetos al azar", "d66", "Tres objetos por fila.")}${t("botin-importante", "fa-gem", "Botín importante", "d66", "Lo que se trae de una incursión.")}${t("pactos-oscuros", "fa-file-signature", "Pactos oscuros", "d66", "Ejemplos de consecuencias pactadas.")}</div>
    <h3 class="mrg-seccion">Desastres, represalias y descubrimientos</h3><div class="mrg-tablas">${t("desastre-aleatorio", "fa-dice", "Desastre aleatorio", "1d", "La categoría del desastre.")}${t("desastres-leves", "fa-biohazard", "Desastres leves", "d66", "")}${t("desastres-graves", "fa-biohazard", "Desastres graves", "d66", "")}${t("represalia-aleatoria", "fa-dice", "Represalia aleatoria", "1d", "La categoría de la represalia.")}${t("represalias-leves", "fa-bullhorn", "Represalias leves", "d66", "")}${t("represalias-graves", "fa-bullhorn", "Represalias graves", "d66", "")}${t("descubrimientos-exito", "fa-gem", "Descubrimiento con éxito", "d66", "")}${t("descubrimientos-parcial", "fa-gem", "Descubrimiento con parcial", "d66", "")}${t("descubrimientos-fracaso", "fa-gem", "Descubrimiento con fracaso", "d66", "")}</div>
    <h3 class="mrg-seccion">Generador de mazmorras (pág. 371-373)</h3><div class="mrg-tablas">${t("tematica", "fa-landmark", "Temática", "1d6", "")}${t("iluminacion", "fa-fire", "Iluminación", "1d6", "")}${t("suelos-paredes", "fa-cubes", "Suelos y paredes", "1d6", "")}${t("olor", "fa-wind", "Olor", "1d6", "")}${t("rasgos-sala", "fa-door-open", "Rasgos de la sala", "1d20", "")}${t("rasgos-duendes", "fa-users", "Rasgos de los duendes", "1d12", "")}${t("trampa-mecanismo", "fa-skull-crossbones", "Mecanismo de la trampa", "1d12", "")}${t("trampa-detonador", "fa-bolt", "Detonador de la trampa", "1d12", "")}${t("porton-material", "fa-door-closed", "Material de la puerta", "1d12", "")}${t("porton-cierre", "fa-lock", "Mecanismo de cierre", "1d12", "")}${t("razas-esbirros", "fa-users", "Raza de los esbirros", "1d8", "")}${t("trabajos-esbirros", "fa-hammer", "Trabajo de los esbirros", "1d20", "")}${t("impulsos-esbirros", "fa-heart-crack", "Impulso de los esbirros", "1d8", "")}${t("mejoras-esbirros", "fa-arrow-up", "Mejora de los esbirros", "1d8", "")}</div>`;
  }

  static #cambiarPestana(ev, target) {
    const tab = target.dataset.tab || "esbirros";
    this.establecerPestana(tab);
  }

  static async #reclutarManada() {
    const el = this.element, val = id => el.querySelector(id)?.value;
    const nombre = val("#mr-gen-manada-nombre")?.trim() || "Nueva panda";
    const raza = val("#mr-gen-manada-raza") || "Orco";
    const oficio = val("#mr-gen-manada-oficio") || "Matones";
    const impulso = val("#mr-gen-manada-impulso") || "Agresivos";
    const numero = acota(val("#mr-gen-manada-numero"), 2, 5);
    const h1 = val("#mr-gen-manada-h1"), h2 = val("#mr-gen-manada-h2"), h3 = val("#mr-gen-manada-h3");
    // pág. 194: una acción primaria (2d) y dos secundarias (1d), todas distintas
    if (new Set([h1, h2, h3]).size < 3) return ui.notifications.warn("La acción primaria y las dos secundarias tienen que ser tres acciones distintas.");
    const vincular = val("#mr-gen-manada-vincular") === "1";
    const valor = k => (k === h1 ? 2 : k === h2 || k === h3 ? 1 : 0);
    const attributes = Object.fromEntries(Object.entries(ATRIBUTOS).map(([atrib, keys]) => [atrib, { skills: Object.fromEntries(keys.map(k => [k, { value: valor(k) }])) }]));

    const nuevo = await Actor.create({
      name: nombre,
      type: "minion_pack",
      img: `modules/${MOD}/assets/retratos/esbirros-ulrot.webp`,
      system: { mp_type: "normal", ua_job: oficio, number: { min: 0, value: numero, max: 5 }, attributes },
      items: [
        { name: raza, type: "monster_race", system: { primal: false, description: "" } },
        { name: oficio, type: "minion_type", system: { description: "" } },
        { name: impulso, type: "minionimpulse", system: { is_for_ua: false } }
      ]
    });

    if (vincular && nuevo) {
      const pj = actorActivo();
      if (pj && pj.type === "character") {
        await pj.update({ "system.minionpack": nuevo.id });
      }
    }
    nuevo?.sheet?.render(true);
    ui.notifications.info(`Panda «${nombre}» reclutada: ${nombreAccion(h1)} 2d, ${nombreAccion(h2)} y ${nombreAccion(h3)} 1d.`);
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
    const tCri = docs.find(t => t.flags?.[MOD]?.clave === "criaturas");
    const tRas = docs.find(t => t.flags?.[MOD]?.clave === "rasgos-criaturas");
    if (!tCri || !tRas) return ui.notifications.warn("Faltan las tablas de criaturas en el compendio.");
    const r1 = (await tCri.draw({ displayChat: false }))?.results?.[0]?.text ?? "";
    // dos rasgos distintos (pág. 373: «dos por criatura»)
    const a = (await tRas.draw({ displayChat: false }))?.results?.[0]?.text ?? "";
    let b = a;
    for (let i = 0; i < 10 && b === a; i++) b = (await tRas.draw({ displayChat: false }))?.results?.[0]?.text ?? "";

    await publicarTarjetaMR({
      titulo: "Criatura al azar",
      subtitulo: "Criatura (d66) y dos rasgos (1d20) · pág. 373",
      estado: null, tipo: "Generador", soloDJ: true,
      cuerpoHTML: `<h4 class="mrg-tabla-res">${esc(r1.replace(/^\[\d+\]\s*/, ""))}</h4><p><strong>Rasgos:</strong> ${esc(a)} y ${esc(b)}</p><p class="mrg-nota">Puede ser una sola criatura, un grupo o una horda. Su nivel (1-4) depende de lo letal que sea (pág. 188).</p>`
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
    const s1 = docs.find(t => t.flags?.[MOD]?.clave === "semilla-1");
    const s2 = docs.find(t => t.flags?.[MOD]?.clave === "semilla-2");
    const limpio = t => String(t ?? "").replace(/^\[\d+\]\s*/, "");
    const r1 = s1 ? limpio((await s1.draw({ displayChat: false }))?.results?.[0]?.text) : "Semilla 1";
    const r2 = s2 ? limpio((await s2.draw({ displayChat: false }))?.results?.[0]?.text) : "Semilla 2";

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
  // Si la tabla da un objeto del compendio, la tarjeta lo ofrece para arrastrarlo a una hoja
  const CAT = { mejunjes: "mejunje", artilugios: "artilugio", pociones: "pocion", "objetos-magicos": "reliquia" };
  let objeto = "";
  if (CAT[clave]) {
    const eq = game.packs.get(`${MOD}.equipo-es`);
    const num = texto.match(/^\[(\d+)\]/)?.[1];
    const nombre = cabeza.replace(/^\[\d+\]\s*/, "").trim().toLowerCase();
    const it = eq && (await eq.getDocuments()).find(d => d.flags?.[MOD]?.categoria === CAT[clave] && ((num && String(d.flags[MOD].tabla) === num) || d.name.toLowerCase() === nombre));
    if (it) objeto = `<a class="mrg-arrastrable" draggable="true" data-uuid="${it.uuid}" data-ayuda="Arrastrar objeto||Arrastra este objeto a la hoja de un personaje para dárselo."><img src="${esc(it.img)}" alt=""><span><strong>${esc(it.name)}</strong><small>Arrástralo a la hoja de un personaje</small></span><i class="fa-solid fa-grip"></i></a>`;
  }
  const titulo = tabla.name.replace(/^\d+\s*·\s*/, "").replace(/\s*\(d\d+\)\s*$/, "");
  const desc = String(tabla.description ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  await publicarTarjetaMR({
    titulo, subtitulo: `${tabla.formula} → ${r.roll.total}`, tipo: "Tabla", estado: null, soloDJ: true,
    cuerpoHTML: `<h4 class="mrg-tabla-res">${esc(cabeza)}</h4>${cola ? `<p>${esc(cola)}</p>` : ""}${objeto}${desc ? `<p class="mrg-nota">${esc(desc)}</p>` : ""}`,
    botones: [{ accion: "tirar-tabla", valor: clave, icono: "fa-solid fa-rotate", etiqueta: "Volver a tirar" }]
  });
}
