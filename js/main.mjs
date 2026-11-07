/**
 * Punto de entrada principal de MR- Wicked Ones: Contenido Completo y Campaña (The Hills Press).
 * Sigue la arquitectura MR- para Foundry VTT v13 y v14.
 */

import { soyGM, insertarControlEscena } from "./compat.mjs";
import { inicializarHooksChat, dialogoCiclo, ejecutarTiradaCiclo } from "./tiradas.mjs";
import { GeneradorWickedOnes, tirarTablaPorClave } from "./generador.mjs";
import { cargarLiterales, inicializarMejoras, aplicarClasesAccesibilidad, abrirMenuAccesibilidad } from "./mejoras.mjs";
import { registrarCreditosMR } from "./mr-credits.mjs";
import { registrarFicha } from "./ficha.mjs";
import { registrarAutomatismos } from "./automatismos.mjs";
import { configurarInicio, arrancar, abrirAsistente, importarCampana, registrarMenus } from "./inicio.mjs";
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
    config: true,
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

  game.settings.register(MOD, "a11yOscuro", {
    name: "MRWO.Settings.Oscuro.Name",
    hint: "MRWO.Settings.Oscuro.Hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => aplicarClasesAccesibilidad()
  });

  game.settings.register(MOD, "a11yContraste", {
    name: "MRWO.Settings.Contraste.Name",
    hint: "MRWO.Settings.Contraste.Hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    onChange: () => aplicarClasesAccesibilidad()
  });

  game.settings.register(MOD, "a11yLegible", {
    name: "MRWO.Settings.Legible.Name",
    hint: "MRWO.Settings.Legible.Hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    onChange: () => aplicarClasesAccesibilidad()
  });

  game.settings.register(MOD, "a11yEscala", {
    name: "MRWO.Settings.Escala.Name",
    hint: "MRWO.Settings.Escala.Hint",
    scope: "client",
    config: true,
    type: Number,
    range: { min: 90, max: 125, step: 5 },
    default: 100,
    onChange: () => aplicarClasesAccesibilidad()
  });

  // Exponer API pública del módulo
  const mod = game.modules.get(MOD);
  if (mod) {
    mod.api = {
      abrirGenerador,
      abrirMenuAccesibilidad,
      dialogoCiclo,
      ejecutarTiradaCiclo,
      tirarTablaCompendio: tirarTablaPorClave,
      importarCampana,
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
  aplicarClasesAccesibilidad();
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
