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
      width: 660,
      height: 580
    },
    classes: ["mr-wo-ventana", "mr-wo-generador-app"],
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

  #pestana = "esbirros";

  constructor(options = {}) {
    super(options);
    const mem = this.#leerMemoria();
    this.#pestana = options.pestana || mem.pestana || "esbirros";
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

    return `
      <div class="mr-wo-gen-contenedor">
        <nav class="mr-wo-gen-tabs">
          <button type="button" class="mr-wo-tab-btn ${p === "esbirros" ? "activa" : ""}" data-action="cambiarPestana" data-tab="esbirros">
            <i class="fas fa-users"></i> Manadas de Esbirros
          </button>
          <button type="button" class="mr-wo-tab-btn ${p === "guarida" ? "activa" : ""}" data-action="cambiarPestana" data-tab="guarida">
            <i class="fas fa-fort-awesome"></i> Salas, Trampas y Criaturas
          </button>
          <button type="button" class="mr-wo-tab-btn ${p === "invasiones" ? "activa" : ""}" data-action="cambiarPestana" data-tab="invasiones">
            <i class="fas fa-shield-halved"></i> Invasiones y Héroes
          </button>
          <button type="button" class="mr-wo-tab-btn ${p === "oraculos" ? "activa" : ""}" data-action="cambiarPestana" data-tab="oraculos">
            <i class="fas fa-dice-d20"></i> Ciclo, Oráculos y Botín
          </button>
        </nav>

        <section class="mr-wo-gen-cuerpo">
          ${p === "esbirros" ? this.#htmlEsbirros() : ""}
          ${p === "guarida" ? this.#htmlGuarida(laboresIdx) : ""}
          ${p === "invasiones" ? this.#htmlInvasiones() : ""}
          ${p === "oraculos" ? this.#htmlOraculos() : ""}
        </section>
      </div>
    `;
  }

  _replaceHTML(result, content) {
    content.innerHTML = result;
  }

  #htmlEsbirros() {
    const razas = ["Orco", "Goblin", "Kóbold", "Sérpido", "Demonio", "No-muerto", "Bugbear", "Hombres Rata"];
    const oficios = [
      ["Guardias y rompelíneas", "smash", "threaten"],
      ["Arqueros y emboscadores", "finesse", "scan"],
      ["Exploradores y asesinos", "skulk", "trick"],
      ["Artificieros y tramperos", "tinker", "scan"],
      ["Acólitos y chamanes", "invoke", "banter"],
      ["Matones e intimidadores", "threaten", "smash"]
    ];
    return `
      <div class="mr-wo-panel">
        <h3><i class="fas fa-user-plus"></i> Reclutar Nueva Manada de Esbirros</h3>
        <p class="mr-wo-ayuda">Crea un actor de Manada de Esbirros completo con su raza, función, puntos de acción iniciales e impulso, y vincúlalo opcionalmente a tu personaje.</p>
        <div class="mr-wo-grid-2">
          <label>Nombre de la manada:
            <input type="text" id="mr-gen-manada-nombre" value="Garras del Paso" />
          </label>
          <label>Raza monstruosa:
            <select id="mr-gen-manada-raza">
              ${razas.map(r => `<option value="${esc(r)}">${esc(r)}</option>`).join("")}
            </select>
          </label>
          <label>Especialidad y acciones (2 puntos c/u):
            <select id="mr-gen-manada-oficio">
              ${oficios.map(([nom, h1, h2]) => `<option value="${esc(nom)}" data-h1="${h1}" data-h2="${h2}">${esc(nom)}</option>`).join("")}
            </select>
          </label>
          <label>Vincular al PJ activo:
            <select id="mr-gen-manada-vincular">
              <option value="1" selected>Sí, asignar al personaje seleccionado</option>
              <option value="0">No, solo crear en el directorio</option>
            </select>
          </label>
        </div>
        <div class="mr-wo-fila-botones">
          <button type="button" class="mr-wo-btn-primario" data-action="reclutarManada">
            <i class="fas fa-plus-circle"></i> Crear y Reclutar Manada
          </button>
        </div>
        <hr/>
        <h3><i class="fas fa-running"></i> Simulador de Incursión de Esbirros (Pág. 262)</h3>
        <p class="mr-wo-ayuda">Envía a una manada a realizar una incursión secundaria y resuelve automáticamente el botín, bajas y represalia.</p>
        <div class="mr-wo-grid-2">
          <label>Reserva de dados de la manada (1D a 5D):
            <input type="number" id="mr-gen-manada-dados" value="2" min="0" max="6" />
          </label>
          <label>Objetivo de la manada:
            <input type="text" id="mr-gen-manada-objetivo" value="Saquear caravana en el Paso del Mercader" />
          </label>
        </div>
        <div class="mr-wo-fila-botones">
          <button type="button" class="mr-wo-btn-secundario" data-action="simularEsbirros">
            <i class="fas fa-dice"></i> Simular Incursión de Esbirros
          </button>
        </div>
      </div>
    `;
  }

  #htmlGuarida(laboresIdx) {
    const opciones = laboresIdx
      .sort((a, b) => a.name.localeCompare(b.name, "es"))
      .map(it => `<option value="${esc(it._id)}">${esc(it.name)}</option>`)
      .join("");
    return `
      <div class="mr-wo-panel">
        <h3><i class="fas fa-hammer"></i> Añadir Sala, Trampa, Truco, Portón, Criatura o Hallazgo</h3>
        <p class="mr-wo-ayuda">Selecciona cualquiera de las 130 labores oficiales traducidas (Salas N1 y N2, Trampas, Trucos, Portones, Criaturas N1–N3 y Hallazgos) para añadirla a tu ficha o a la Mazmorra.</p>
        <div class="mr-wo-grid-1">
          <label>Labor del compendio (${laboresIdx.length} disponibles):
            <select id="mr-gen-labor-id">${opciones}</select>
          </label>
        </div>
        <div class="mr-wo-fila-botones">
          <button type="button" class="mr-wo-btn-primario" data-action="anadirLabor" data-destino="pj">
            <i class="fas fa-user-check"></i> Añadir a mi Personaje Activo
          </button>
          <button type="button" class="mr-wo-btn-secundario" data-action="anadirLabor" data-destino="mazmorra">
            <i class="fas fa-dungeon"></i> Añadir a la Hoja de Mazmorra
          </button>
        </div>
        <hr/>
        <h3><i class="fas fa-dragon"></i> Generador de Criatura de Guarida con Mutación (Pág. 373)</h3>
        <p class="mr-wo-ayuda">Combina una especie base (d36) con un rasgo mutante (d20) y publícalo en el chat o añádelo como defensa.</p>
        <div class="mr-wo-fila-botones">
          <button type="button" class="mr-wo-btn-primario" data-action="generarCriaturaMutante">
            <i class="fas fa-paw"></i> Generar Criatura + Rasgo Mutante
          </button>
          <button type="button" class="mr-wo-btn-secundario" data-action="tirarTablaCompendio" data-tabla="generador-mazmorras-salas">
            <i class="fas fa-compass"></i> Generar Sala de Mazmorra Aleatoria (d18)
          </button>
        </div>
      </div>
    `;
  }

  #htmlInvasiones() {
    return `
      <div class="mr-wo-panel">
        <h3><i class="fas fa-shield-halved"></i> Generador de Grupos de Aventureros (Invasión)</h3>
        <p class="mr-wo-ayuda">Crea un nuevo actor de Grupo Invasor (<code>party</code>) listo para entrar en vuestra mazmorra, con Aventureros de los niveles indicados (incluyendo sus 3 movimientos ofensivos y 3 defensivos en español) y sus Ayudantes.</p>
        <div class="mr-wo-grid-2">
          <label>Nombre de la expedición invasora:
            <input type="text" id="mr-gen-inv-nombre" value="Expedición Castigadora del Valle" />
          </label>
          <label>Aventureros de Nivel 1:
            <input type="number" id="mr-gen-inv-n1" value="2" min="0" max="5" />
          </label>
          <label>Aventureros de Nivel 2:
            <input type="number" id="mr-gen-inv-n2" value="1" min="0" max="5" />
          </label>
          <label>Aventureros de Nivel 3:
            <input type="number" id="mr-gen-inv-n3" value="0" min="0" max="4" />
          </label>
          <label>Ayudantes (Hirelings):
            <input type="number" id="mr-gen-inv-ayu" value="2" min="0" max="6" />
          </label>
        </div>
        <div class="mr-wo-fila-botones">
          <button type="button" class="mr-wo-btn-primario" data-action="generarGrupoInvasor">
            <i class="fas fa-users-cog"></i> Generar Grupo Invasor Completo
          </button>
          <button type="button" class="mr-wo-btn-secundario" data-action="tirarTablaCompendio" data-tabla="botin-mayor">
            <i class="fas fa-gem"></i> Tirar Botín de Aventureros Caídos
          </button>
        </div>
      </div>
    `;
  }

  #htmlOraculos() {
    return `
      <div class="mr-wo-panel">
        <h3><i class="fas fa-sync-alt"></i> Tiradas del Ciclo de Partida</h3>
        <div class="mr-wo-fila-botones">
          <button type="button" class="mr-wo-btn-primario" data-action="lanzarCiclo" data-tipo="calamity">
            <i class="fas fa-biohazard"></i> Tirada de Desastre
          </button>
          <button type="button" class="mr-wo-btn-primario" data-action="lanzarCiclo" data-tipo="blowback">
            <i class="fas fa-bullhorn"></i> Tirada de Represalia
          </button>
          <button type="button" class="mr-wo-btn-secundario" data-action="tirarOraculoSemillas">
            <i class="fas fa-seedling"></i> Oráculo de Dos Semillas (Pág. 316)
          </button>
        </div>
        <hr/>
        <h3><i class="fas fa-scroll"></i> Generadores de Incursión, Solitario y Creaciones (d36)</h3>
        <div class="mr-wo-grid-2">
          <button type="button" class="mr-wo-btn-secundario" data-action="tirarTablaCompendio" data-tabla="incursion-objetivo">
            <i class="fas fa-crosshairs"></i> Objetivo de Incursión (d18)
          </button>
          <button type="button" class="mr-wo-btn-secundario" data-action="tirarTablaCompendio" data-tabla="incursion-complicacion">
            <i class="fas fa-exclamation-triangle"></i> Giro de Incursión (d12)
          </button>
          <button type="button" class="mr-wo-btn-secundario" data-action="tirarTablaCompendio" data-tabla="mejunjes-36">
            <i class="fas fa-flask"></i> Mejunje Alquímico (d36)
          </button>
          <button type="button" class="mr-wo-btn-secundario" data-action="tirarTablaCompendio" data-tabla="artilugios-36">
            <i class="fas fa-cogs"></i> Artilugio Mecánico (d36)
          </button>
          <button type="button" class="mr-wo-btn-secundario" data-action="tirarTablaCompendio" data-tabla="pociones-36">
            <i class="fas fa-wine-bottle"></i> Poción de Brujería (d36)
          </button>
          <button type="button" class="mr-wo-btn-secundario" data-action="tirarTablaCompendio" data-tabla="reliquias-36">
            <i class="fas fa-ring"></i> Objeto Mágico / Reliquia (d36)
          </button>
          <button type="button" class="mr-wo-btn-secundario" data-action="tirarTablaCompendio" data-tabla="solitario-gran-malo">
            <i class="fas fa-crown"></i> Solitario: Suceso en la Guarida (d12)
          </button>
          <button type="button" class="mr-wo-btn-secundario" data-action="tirarTablaCompendio" data-tabla="aventureros-30">
            <i class="fas fa-user-shield"></i> Aventurero Aleatorio (d30)
          </button>
        </div>
      </div>
    `;
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
      estado: "success",
      cuerpoHTML: `<p><strong>Especie:</strong> ${esc(r1)}</p><p><strong>Mutación:</strong> ${esc(r2)}</p>`
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
      titulo: "Oráculo · «Deja volar tu imaginación»",
      subtitulo: "Combinación de Primera y Segunda Semilla (pág. 316)",
      estado: "critical",
      cuerpoHTML: `<p style="font-size:1.1em;text-align:center;"><strong>${esc(r1)}</strong> &nbsp;+&nbsp; <strong>${esc(r2)}</strong></p>`
    });
  }

  static async #tirarTablaCompendio(ev, target) {
    const clave = target.dataset.tabla;
    await tirarTablaPorClave(clave);
  }

  static async #lanzarCiclo(ev, target) {
    const tipo = target.dataset.tipo || "calamity";
    await ejecutarTiradaCiclo(tipo, 2);
  }
}

export async function tirarTablaPorClave(clave) {
  const pack = game.packs.get(`${MOD}.tablas-es`);
  if (!pack) return;
  const docs = await pack.getDocuments();
  const tabla = docs.find(t => t.flags?.[MOD]?.clave === clave) ?? docs[0];
  if (tabla) return tabla.draw({ displayChat: true });
}
