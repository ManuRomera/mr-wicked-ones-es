/**
 * Punto de entrada principal de MR- Wicked Ones: Contenido Completo y Campaña (The Hills Press).
 * Sigue la arquitectura MR- para Foundry VTT v13 y v14.
 */

import { soyGM, insertarControlEscena } from "./compat.mjs";
import { inicializarHooksChat, dialogoCiclo, ejecutarTiradaCiclo } from "./tiradas.mjs";
import { GeneradorWickedOnes, tirarTablaPorClave } from "./generador.mjs";
import { cargarLiterales, inicializarMejoras, aplicarClasesAccesibilidad, abrirMenuAccesibilidad } from "./mejoras.mjs";
import { registrarCreditosMR } from "./mr-credits.mjs";

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
 * Comprueba si el mundo está vacío (sin escenas ni personajes creados).
 */
function mundoVacio() {
  const sinEscenas = game.scenes.size === 0;
  const sinPJs = game.actors.filter(a => a.type === "character").length === 0;
  return sinEscenas && sinPJs;
}

/**
 * Filtro preImport para no sobrescribir nunca a los PJs que ya estén jugando al actualizar la aventura.
 */
function respetarPJ(adventure, importOptions, toCreate, toUpdate) {
  if (!toUpdate?.Actor) return;
  toUpdate.Actor = toUpdate.Actor.filter(a => {
    const existente = game.actors.get(a._id);
    if (existente?.flags?.[MOD]?.tipo === "pj") return false;
    return true;
  });
}

/**
 * Importa la aventura desde el compendio aventura-es y activa la escena de portada.
 */
export async function importarAventuraCampana() {
  const pack = game.packs.get(`${MOD}.aventura-es`);
  if (!pack) return;
  const docs = await pack.getDocuments();
  const adv = docs[0];
  if (!adv) return;

  await adv.sheet?._importContent?.(adv.toObject(), { preImport: [respetarPJ] })
    ?? adv.import({ preImport: [respetarPJ] });

  const versionMod = game.modules.get(MOD)?.version || "1.0.0";
  await game.settings.set(MOD, "versionImportada", versionMod);

  const portada = game.scenes.find(s => s.flags?.[MOD]?.clave === "portada" || s.name.includes("Portada"));
  if (portada) await portada.activate();

  const diarioInicial = game.journal.find(j => j.name.startsWith("01 · Campaña"));
  diarioInicial?.sheet?.render(true);

  await registrarPaqueteDireccion();
  ui.notifications.info("¡Campaña «El Valle Silencioso» y contenidos de Wicked Ones importados con éxito!");
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
      importarAventuraCampana
    };
  }

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

  if (!soyGM()) return;

  // Auto-importación segura en mundos vacíos o aviso de actualización
  const autoImp = game.settings.get(MOD, "autoImportar");
  const verActual = game.modules.get(MOD)?.version || "1.0.0";
  const verImp = game.settings.get(MOD, "versionImportada") || "0.0.0";

  if (autoImp && mundoVacio()) {
    await importarAventuraCampana();
  } else if (verImp !== "0.0.0" && foundry.utils.isNewerVersion(verActual, verImp)) {
    const DialogV1 = foundry.appv1?.api?.Dialog ?? Dialog;
    new DialogV1({
      title: "MR · Actualización de Wicked Ones disponible",
      content: `<p>Se ha detectado la versión <strong>${verActual}</strong> de <em>MR- Wicked Ones</em> (anterior: ${verImp}). ¿Deseas reimportar las escenas, tablas y diarios actualizados respetando las fichas de los PJs actuales?</p>`,
      buttons: {
        si: {
          icon: '<i class="fas fa-download"></i>',
          label: "Actualizar contenido (respetar PJs)",
          callback: () => importarAventuraCampana()
        },
        no: {
          icon: '<i class="fas fa-times"></i>',
          label: "Más tarde"
        }
      },
      default: "si"
    }).render(true);
  }
});
