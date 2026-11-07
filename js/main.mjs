/**
 * Punto de entrada principal de MR- Wicked Ones: Contenido Completo y Campaña (The Hills Press).
 * Sigue la arquitectura MR- para Foundry VTT v13 y v14.
 */

import { soyGM, insertarControlEscena } from "./compat.mjs";
import { inicializarHooksChat, dialogoCiclo, ejecutarTiradaCiclo } from "./tiradas.mjs";
import { GeneradorWickedOnes, tirarTablaPorClave } from "./generador.mjs";
import { cargarLiterales, inicializarMejoras } from "./mejoras.mjs";
import { registrarAjustes, aplicarAspecto, abrirPanelAspecto } from "./ajustes.mjs";
import { registrarDados } from "./dados.mjs";
import { abrirCreador } from "./creador.mjs";
import { registrarHeridas } from "./heridas.mjs";
import { registrarTarjetas, tirar } from "./tirada.mjs";
import { abrirTirada } from "./tirada-dialogo.mjs";
import { registrarHojaPersonaje } from "./hoja-personaje.mjs";
import { registrarHojasActores } from "./hojas-actores.mjs";
import { abrirLibretos } from "./libretos.mjs";
import { registrarAyuda } from "./ayuda.mjs";
import { registrarCreditosMR } from "./mr-credits.mjs";
import { registrarFicha } from "./ficha.mjs";
import { registrarAutomatismos, recuperar, recuperarTodos } from "./automatismos.mjs";
import { configurarInicio, arrancar, abrirAsistente, importarCampana, registrarMenus, reinstalarContenido, dialogoReinstalar } from "./inicio.mjs";
import { registrarTutorial, ofrecerTutorial, empezarTutorial } from "./tutorial.mjs";
import { organizarCompendios } from "./carpetas.mjs";

const MOD = "mr-wicked-ones-es";
let instanciaGenerador = null;

/**
 * Abre la ventana del Asistente y Generador MR (o cambia su pestaña si ya está abierta).
 */
export function abrirGenerador(pestana = null) {
  if (!instanciaGenerador) {
    instanciaGenerador = new GeneradorWickedOnes(pestana ? { pestana } : {});
  } else if (pestana) {
    instanciaGenerador.establecerPestana(pestana);
  }
  instanciaGenerador.render(true);
  return instanciaGenerador;
}

/**
 * Registra el paquete de dirección de la campaña en MR- Dirección.
 */
async function registrarPaqueteDireccion() {
  const dirMod = game.modules.get("mr-direccion");
  const api = dirMod?.api || window.MRDireccion;
  if (!api?.registerPack) return;
  try {
    const resp = await fetch(`modules/${MOD}/content/direccion-es.json`);
    if (resp.ok) {
      const pack = await resp.json();
      api.registerPack(pack);
    }
  } catch (e) {
    console.warn(`${MOD} | No se pudo registrar direccion-es.json:`, e);
  }
}

/**
 * Con el estilo de tiradas MR, el clic en una acción de cualquier hoja (también las originales del sistema)
 * abre nuestro diálogo en vez del desplegable del sistema. Las tiradas de dados fijos y los tipos especiales
 * (criatura, trampa, cerradura…) siguen usando el original.
 */
function parchearTiradasDelSistema() {
  if (game.settings.get(MOD, "estiloTiradas") !== "mr") return;
  const proto = CONFIG.Actor.documentClass?.prototype;
  if (!proto?.rollAttributePopup || proto.rollAttributePopup.__mrwo) return;
  const original = proto.rollAttributePopup;
  proto.rollAttributePopup = function (attribute_name, attribute_value = null, roll_type = null, for_name = null) {
    const habilidad = attribute_name && attribute_value == null && this.getRollData?.().dice_amount?.[attribute_name] !== undefined;
    if (habilidad && (roll_type == null || roll_type === "action" || roll_type === "resistance")) {
      return abrirTirada(this, { accion: attribute_name, tipo: roll_type === "resistance" ? "resistencia" : "accion" });
    }
    return original.call(this, attribute_name, attribute_value, roll_type, for_name);
  };
  proto.rollAttributePopup.__mrwo = true;
}

/* -------------------------------------------------------------------------- */
/*  Hooks de Inicialización                                                   */
/* -------------------------------------------------------------------------- */

Hooks.once("init", () => {
  game.settings.register(MOD, "autoImportar", {
    name: "MRWO.Settings.AutoImportar.Name",
    hint: "MRWO.Settings.AutoImportar.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MOD, "asistenteHecho", { scope: "world", config: false, type: Boolean, default: false });
  game.settings.register(MOD, "tutorialOfrecido", { scope: "client", config: false, type: Boolean, default: false });
  game.settings.register(MOD, "versionImportada", {
    name: "Versión de la aventura importada",
    scope: "world",
    config: false,
    type: String,
    default: "0.0.0"
  });

  game.settings.register(MOD, "tarjetasChat", {
    name: "MRWO.Settings.TarjetasChat.Name",
    hint: "MRWO.Settings.TarjetasChat.Hint",
    scope: "world",
    config: false,
    type: Boolean,
    default: true
  });

  game.settings.register(MOD, "traducirDOM", {
    name: "MRWO.Settings.TraducirDOM.Name",
    hint: "MRWO.Settings.TraducirDOM.Hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });

  registrarAjustes();
  registrarDados();
  registrarHeridas();

  // Exponer API pública del módulo
  const mod = game.modules.get(MOD);
  if (mod) {
    mod.api = {
      abrirGenerador,
      abrirCreador,
      recuperar,
      recuperarTodos,
      abrirMenuAccesibilidad: abrirPanelAspecto,
      abrirPanelAspecto,
      abrirTirada,
      abrirLibretos,
      tirar,
      dialogoCiclo,
      ejecutarTiradaCiclo,
      tirarTablaCompendio: tirarTablaPorClave,
      importarCampana,
      reinstalarContenido,
      dialogoReinstalar,
      abrirAsistente,
      empezarTutorial,
      organizarCompendios
    };
  }

  registrarFicha();
  registrarAutomatismos();
  registrarMenus();
  inicializarMejoras();
  inicializarHooksChat();
  registrarTarjetas();
  registrarCreditosMR();
});

// Botón en la barra lateral de Controles de Escena para abrir el Asistente MR
Hooks.on("renderSceneControls", (app, html) => {
  insertarControlEscena(
    html,
    "mr-wo-control-generador",
    "fa-solid fa-dungeon",
    "MR · Asistente y Generador de Wicked Ones",
    () => abrirGenerador()
  );
});

// Botón «Crear monstruo» en el directorio de Actores
Hooks.on("renderActorDirectory", (app, html) => {
  const raiz = html instanceof HTMLElement ? html : html?.[0];
  const cab = raiz?.querySelector(".header-actions, .directory-header .action-buttons");
  if (!cab || cab.querySelector(".mr-wo-crear")) return;
  const b = document.createElement("button");
  b.type = "button"; b.className = "mr-wo-crear"; b.innerHTML = '<i class="fa-solid fa-skull"></i> Crear monstruo';
  b.addEventListener("click", () => abrirCreador());
  cab.append(b);
});

// Cambio automático a figura de cuerpo entero en escenas de imagen (para MR- Dirección)
Hooks.on("preCreateToken", (tokenDoc, data) => {
  const escena = tokenDoc.parent;
  const actor = tokenDoc.actor;
  const figura = actor?.flags?.[MOD]?.figura;
  if (figura && escena?.flags?.[MOD]?.imagen) {
    tokenDoc.updateSource({
      "texture.src": figura,
      "texture.fit": "contain",
      "ring.enabled": false
    });
  }
});

// Integración con MR- Dirección
Hooks.on("mrDireccion.ready", () => {
  registrarPaqueteDireccion();
});

Hooks.once("ready", async () => {
  await cargarLiterales();
  aplicarAspecto();
  registrarAyuda();
  await foundry.applications.handlebars.loadTemplates([`modules/${MOD}/templates/capacidad.hbs`, `modules/${MOD}/templates/capacidad-compacta.hbs`]);
  await registrarHojaPersonaje();
  registrarHojasActores();
  parchearTiradasDelSistema();
  await registrarPaqueteDireccion();

  // Escucha de socket en el activeGM para actualizaciones delegadas desde tarjetas de chat
  game.socket.on(`module.${MOD}`, async payload => {
    if (!soyGM() || !payload) return;
    if (payload.tipo === "actualizarActor" && payload.actorId && payload.cambios) {
      const actor = game.actors.get(payload.actorId);
      await actor?.update(payload.cambios);
    }
  });

  await registrarTutorial();
  configurarInicio({ despues: registrarPaqueteDireccion });
  if (game.user.isGM) await arrancar();
  if (game.settings.get(MOD, "asistenteHecho")) setTimeout(ofrecerTutorial, 3000);
});
