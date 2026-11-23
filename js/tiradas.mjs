/**
 * Automatización de aritmética y botones de confirmación en tarjetas de chat para Wicked Ones.
 * «Menos software visible. Más partida.»
 */

import { n, acota, evaluarTirada, evaluarDesastre, evaluarRepresalia, evaluarDefensaMazmorra, evaluarIncursionEsbirros, INCURSION_ESBIRROS } from "./core/reglas.mjs";
import { soyGM, aplicarModoMensaje } from "./compat.mjs";
import { aparienciaDados } from "./dados.mjs";
import { aplicarEstresActor, gastarCorazonExtraDado } from "./automatismos.mjs";

const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const MOD = "mr-wicked-ones-es";

/**
 * Obtiene el actor seleccionado o el personaje asignado al usuario actual.
 */
export function actorActivo(speaker = null) {
  if (speaker?.actor) {
    const a = game.actors.get(speaker.actor);
    if (a) return a;
  }
  const controlado = canvas?.tokens?.controlled?.[0]?.actor;
  if (controlado) return controlado;
  if (game.user.character) return game.user.character;
  return game.actors.find(a => a.type === "character" && a.isOwner) ?? null;
}

/**
 * Envía una tarjeta de chat con el estilo de Wicked Ones y botones de acción.
 */
export async function publicarTarjetaMR({ titulo, subtitulo = "", estado = null, dados = [], cuerpoHTML = "", botones = [], speaker = null, tipo = "Ciclo de partida", soloDJ = false, neutro = null }) {
  const { htmlTarjetaSimple } = await import("./tirada.mjs");
  // Lo que sale del asistente es del DJ: se susurra a la dirección y trae un botón para enseñarlo a los jugadores
  if (soloDJ) {
    cuerpoHTML = `<p class="mrg-solo-dj"><i class="fa-solid fa-eye-slash"></i> Solo lo ve el DJ.</p>${cuerpoHTML}`;
    botones = [...botones, { accion: "revelar", icono: "fa-solid fa-eye", etiqueta: "Mostrar a los jugadores" }];
  }
  const content = htmlTarjetaSimple({
    tipo, titulo, subtitulo, estado, caras: dados.map(d => n(d, 1)), cuerpo: cuerpoHTML,
    botones: botones.map((b, i) => ({ ...b, sangre: i === 0 && b.accion !== "revelar" })), neutro: neutro ?? (estado ? "azul" : "sangre")
  });
  const msgData = { user: game.user.id, speaker: speaker || ChatMessage.getSpeaker(), content, flags: { [MOD]: { tarjeta: true } } };
  aplicarModoMensaje(msgData);
  if (soloDJ) msgData.whisper = ChatMessage.getWhisperRecipients("GM").map(u => u.id);
  return ChatMessage.create(msgData);
}

/**
 * Ejecuta una tirada especial del ciclo de juego (Desastre, Represalia, Defensa, Incursión de Esbirros)
 * y publica su tarjeta enriquecida con botones de aplicación.
 */
export async function ejecutarTiradaCiclo(tipo, reserva = 2, nombreContexto = "") {
  const solicitados = n(reserva, 2);
  const tirarReserva = async dados => {
    const r = new Roll(`${dados <= 0 ? 2 : dados}d6`);
    await r.evaluate();
    aparienciaDados(r);
    if (game.dice3d) await game.dice3d.showForRoll(r);
    return r.terms?.[0]?.results?.map(x => x.result) ?? [1];
  };

  if (tipo === "minion_raid") {
    // pág. 354: la reserva de la implicación se tira en cada tabla; la primera ajusta los dados de las otras dos
    const exito = await tirarReserva(solicitados);
    const pre = evaluarIncursionEsbirros({ exito, consecuencias: [1], botin: [1] }, solicitados);
    const consecuencias = await tirarReserva(pre.reservaAjustada), botin = await tirarReserva(pre.reservaAjustada);
    const ev = evaluarIncursionEsbirros({ exito, consecuencias, botin }, solicitados);
    const T = INCURSION_ESBIRROS, fila = (t, r, caras) => `<li><strong>${esc(t.titulo)}</strong> (${caras.join(", ")} → ${r.valor}): ${esc(r.texto)}</li>`;
    return publicarTarjetaMR({ soloDJ: true,
      titulo: "Incursión de esbirros",
      subtitulo: nombreContexto || `Reserva de implicación: ${solicitados}d${ev.ajuste ? ` · después ${ev.reservaAjustada}d` : ""}`,
      estado: ev.cumplido ? "success" : "failure",
      dados: exito,
      cuerpoHTML: `<ul>${fila(T.exito, ev.exito, exito)}${fila(T.consecuencias, ev.consecuencias, consecuencias)}${fila(T.botin, ev.botin, botin)}</ul>
        <p>${ev.cumplido ? "Cumplen el objetivo (4+): añade el botín de base." : "No cumplen el objetivo (hace falta 4+)."} Combina los resultados para narrar cómo fue y haz después una <strong>tirada de represalias</strong>.</p>
        <p class="mrg-nota">Enviar menos de tres esbirros resta dados a la implicación y enviarlos con mejoras los suma; se puede gastar moral para +1d en una única tirada de estas tablas (pág. 354).</p>`,
      botones: [{ accion: "tirar-ciclo", valor: "blowback", icono: "fas fa-bullhorn", etiqueta: "Tirar represalias" }]
    });
  }

  const caras = await tirarReserva(solicitados);

  if (tipo === "calamity") {
    const ev = evaluarDesastre(caras, solicitados);
    const botones = [];
    if (ev.desastre) {
      botones.push({ accion: "tirar-tabla", valor: "desastre-aleatorio", icono: "fas fa-dice", etiqueta: "Tipo de desastre (1d6)" });
      botones.push({ accion: "tirar-tabla", valor: ev.desastre === "grave" ? "desastres-graves" : "desastres-leves", icono: "fas fa-dungeon", etiqueta: `Desastre ${ev.desastre} (d66)` });
    }
    if (ev.descubrimiento) botones.push({ accion: "tirar-tabla", valor: "descubrimientos-exito", icono: "fas fa-gem", etiqueta: "Descubrimiento con éxito (d66)" });
    return publicarTarjetaMR({ soloDJ: true,
      titulo: "Tirada de desastre",
      subtitulo: nombreContexto || `Reserva: ${solicitados}d`,
      estado: ev.estado,
      dados: caras,
      cuerpoHTML: `<p>${esc(ev.resumen)}</p><p class="mrg-nota">No es posible resistir un desastre, pero sí empezar una escena para lidiar con sus consecuencias (pág. 244).</p>`,
      botones
    });
  }

  if (tipo === "blowback") {
    const ev = evaluarRepresalia(caras, solicitados);
    const botones = [];
    if (ev.represalia) botones.push({ accion: "tirar-tabla", valor: ev.represalia === "grave" ? "represalias-graves" : "represalias-leves", icono: "fas fa-bullhorn", etiqueta: `Represalia ${ev.represalia} (d66)` });
    if (ev.corazonOscuro) botones.push({ accion: "corazon-todos", icono: "fas fa-heart", etiqueta: "Cada PJ gana un corazón oscuro" });
    return publicarTarjetaMR({ soloDJ: true,
      titulo: "Tirada de represalia",
      subtitulo: nombreContexto || `Reserva: ${solicitados}d`,
      estado: ev.estado,
      dados: caras,
      cuerpoHTML: `<p>${esc(ev.resumen)}</p><p class="mrg-nota">Las represalias no se pueden resistir (pág. 264).</p>`,
      botones
    });
  }

  if (["creature", "trap", "lock", "trick"].includes(tipo)) {
    const ev = evaluarDefensaMazmorra(tipo, caras, solicitados);
    const titulos = { creature: "Tirada de criatura", trap: "Tirada de trampa", lock: "Tirada de portón", trick: "Truco (tirada de fortuna)" };
    const pildoras = [];
    if (ev.heridos) pildoras.push(`Heridos: ${ev.heridos} (${ev.tajos} tajo${ev.tajos > 1 ? "s" : ""}: ${ev.corazones === 0.5 ? "½" : ev.corazones} corazón)${ev.eligeDJ ? " · elige el DJ" : ""}`);
    if (ev.repetir) pildoras.push("Tira otra vez");
    if (ev.estadoCriatura) pildoras.push({ muerta: "La criatura muere o huye", inconsciente: "Criatura inconsciente", activa: "La criatura sigue luchando" }[ev.estadoCriatura]);
    if (ev.movimientosUnAventurero) pildoras.push("Un aventurero gasta 1 movimiento");
    if (ev.movimientosPorAventurero) pildoras.push("Todos gastan 1 movimiento");
    if (ev.otroCamino) pildoras.push("Van por otro lado");
    if (ev.atraviesan) pildoras.push("Atraviesan el portón");
    const botones = [{ accion: "abrir-grupo-invasor", icono: "fas fa-users", etiqueta: "Abrir grupo invasor" }];
    if (ev.repetir || (tipo === "lock" && ev.otroCamino)) botones.unshift({ accion: "tirar-ciclo", valor: tipo, extra: String(solicitados), contexto: nombreContexto, icono: "fas fa-rotate", etiqueta: ev.repetir ? "Tirar otra vez" : "Repetir (si no hay otra ruta)" });
    return publicarTarjetaMR({ soloDJ: true,
      titulo: titulos[tipo],
      subtitulo: nombreContexto || `Nivel ${solicitados} (${solicitados}d)`,
      estado: ev.estado,
      dados: caras,
      cuerpoHTML: `<p>${esc(ev.resumen)}</p>${pildoras.length ? `<p class="mr-wo-resumen-pildoras">${pildoras.map(x => `<span class="mr-wo-pildora">${esc(x)}</span>`).join(" ")}</p>` : ""}${ev.nota ? `<p class="mrg-nota">${esc(ev.nota)}</p>` : ""}`,
      botones
    });
  }

  const ev = evaluarTirada(caras, solicitados);
  return publicarTarjetaMR({ soloDJ: true,
    titulo: nombreContexto || "Tirada de fortuna",
    subtitulo: `Reserva: ${solicitados}d`,
    estado: ev.estado,
    dados: caras,
    cuerpoHTML: `<p>${esc(ev.etiqueta)}</p>`
  });
}

/**
 * Diálogo rápido para lanzar una tirada del ciclo desde macros o botones.
 */
export async function dialogoCiclo(tipoInicial = "calamity") {
  const opciones = [
    ["calamity", "Tirada de desastre (1d quejas incesantes · 2d normal · 3d felices o asustados)"],
    ["blowback", "Tirada de represalia (1d os desviasteis mucho · 2d algo · 3d todo bien)"],
    ["minion_raid", "Incursión de esbirros (reserva de la implicación)"],
    ["creature", "Tirada de criatura (dados = nivel)"],
    ["trap", "Tirada de trampa (dados = nivel)"],
    ["lock", "Tirada de portón (dados = nivel)"],
    ["trick", "Truco: tirada de fortuna (dados = nivel)"]
  ];

  const html = `
    <form class="mr-wo-form-dialogo">
      <div class="form-group">
        <label>Tipo de tirada:</label>
        <select name="tipo">
          ${opciones.map(([k, l]) => `<option value="${k}" ${k === tipoInicial ? "selected" : ""}>${esc(l)}</option>`).join("")}
        </select>
      </div>
      <div class="form-group">
        <label>Reserva de dados (0D a 6D):</label>
        <input type="number" name="dados" value="2" min="0" max="6" />
      </div>
      <div class="form-group">
        <label>Detalle o nombre (opcional):</label>
        <input type="text" name="contexto" placeholder="Ej. Cuevas del Paso del Mercader" />
      </div>
    </form>
  `;

  const DialogV1 = foundry.appv1?.api?.Dialog ?? Dialog;
  new DialogV1({
    title: "MR · Tiradas del Ciclo y Defensas",
    content: html,
    buttons: {
      tirar: {
        icon: '<i class="fas fa-dice"></i>',
        label: "Tirar dados",
        callback: jq => {
          const root = jq instanceof HTMLElement ? jq : jq[0];
          const tipo = root.querySelector('[name="tipo"]')?.value || tipoInicial;
          const dados = n(root.querySelector('[name="dados"]')?.value, 2);
          const contexto = root.querySelector('[name="contexto"]')?.value?.trim() || "";
          ejecutarTiradaCiclo(tipo, dados, contexto);
        }
      },
      cancelar: {
        icon: '<i class="fas fa-times"></i>',
        label: "Cancelar"
      }
    },
    default: "tirar"
  }).render(true);
}

/**
 * Añade botones contextuales a las tarjetas nativas de tirada de Wicked Ones en el chat
 * y gestiona los clics de confirmación.
 */
export function inicializarHooksChat() {
  Hooks.on("renderChatMessageHTML", (message, html) => {
    try {
      if (!game.settings.get(MOD, "tarjetasChat")) return;
    } catch {
      // Si el setting aún no está registrado, continuamos
    }

    // Si es una tarjeta nativa de Wicked Ones (.dice-tooltip sin .mr-wo-procesada), añadimos barra de acciones rápidas
    const contenedor = html.querySelector(".dice-tooltip");
    if (contenedor && !contenedor.classList.contains("mr-wo-procesada")) {
      contenedor.classList.add("mr-wo-procesada");
      const dieEl = contenedor.querySelector(".die");
      const estado = dieEl?.classList.contains("critical")
        ? "critical"
        : dieEl?.classList.contains("success")
          ? "success"
          : dieEl?.classList.contains("mixed")
            ? "mixed"
            : "failure";

      const spActorId = message.speaker?.actor || "";
      const barra = document.createElement("div");
      barra.className = "mr-wo-chat-acciones";

      // En fallos o éxitos parciales, ofrecer botón de Resistencia y botón de +1/+2 Estrés
      if (estado === "mixed" || estado === "failure") {
        barra.innerHTML += `
          <button type="button" class="mr-wo-btn-chat" data-mr-accion="tirar-resistencia" data-actor-id="${esc(spActorId)}" title="Abrir tirada de Resistencia para mitigar la consecuencia">
            <i class="fas fa-shield-alt"></i> Resistir
          </button>
        `;
      }

      // Siempre permitir gastar 1 Corazón Oscuro si el actor tiene alguno disponible
      barra.innerHTML += `
        <button type="button" class="mr-wo-btn-chat" data-mr-accion="gastar-corazon" data-actor-id="${esc(spActorId)}" title="Gasta 1 Corazón Oscuro: tira +1D y recalcula el resultado">
          <i class="fas fa-heart"></i> Corazón Oscuro (+1D)
        </button>
      `;

      contenedor.appendChild(barra);
    }

    // Enlazar todos los botones .mr-wo-btn-chat presentes en el mensaje
    html.querySelectorAll(".mr-wo-btn-chat, .mrg-card[data-tipo='simple'] [data-mr-accion]").forEach(btn => {
      if (btn.dataset.mrEnlazado) return;
      btn.dataset.mrEnlazado = "1";
      btn.addEventListener("click", ev => manejarClicBotonChat(ev, message));
    });
  });
}

async function manejarClicBotonChat(ev, message) {
  ev.preventDefault();
  const btn = ev.currentTarget;
  const accion = btn.dataset.mrAccion;
  const actorId = btn.dataset.actorId;
  const valor = btn.dataset.valor;
  const actor = (actorId && game.actors.get(actorId)) || actorActivo(message?.speaker);

  switch (accion) {
    case "revelar": {
      if (!game.user.isGM) return;
      const limpio = message.content.replace(/<p class="mrg-solo-dj">[\s\S]*?<\/p>/, "").replace(/<button[^>]*data-mr-accion="revelar"[\s\S]*?<\/button>/, "");
      await message.update({ whisper: [], content: limpio });
      break;
    }
    case "tirar-resistencia": {
      // pág. 50: te resistes eligiendo UNA acción que encaje (no la que causó la consecuencia); se abre la ventana de tirada
      if (!actor) return ui.notifications.warn("Selecciona un token o asigna un personaje para resistir.");
      const { abrirTirada } = await import("./tirada-dialogo.mjs");
      abrirTirada(actor, { tipo: "resistencia" });
      break;
    }

    case "sumar-estres": {
      if (!actor) return ui.notifications.warn("No se encontró un personaje activo.");
      if (actor.isOwner || soyGM()) await aplicarEstresActor(actor, n(valor, 1));
      else await actualizarActorSeguro(actor, { "system.stress.value": acota(n(actor.system?.stress?.value, 0) + n(valor, 1), 0, n(actor.system?.stress?.max, 6)) });
      break;
    }

    case "corazon-todos": {
      if (!game.user.isGM) return;
      const pjs = game.actors.filter(a => a.type === "character" && a.hasPlayerOwner);
      for (const a of pjs) {
        const max = n(a.system?.dark_hearts?.max, 2);
        await a.update({ "system.dark_hearts.value": acota(n(a.system?.dark_hearts?.value, 0) + 1, 0, max) });
      }
      ui.notifications.info(pjs.length ? `Corazón oscuro para: ${pjs.map(a => a.name).join(", ")}.` : "No hay PJ con jugador asignado.");
      break;
    }

    case "tirar-ciclo": {
      if (!game.user.isGM) return;
      await ejecutarTiradaCiclo(valor, n(btn.dataset.extra, 2), btn.dataset.contexto ?? "");
      break;
    }

    case "ganar-corazon": {
      if (!actor) return;
      const max = n(actor.system?.dark_hearts?.max, 2);
      await actualizarActorSeguro(actor, { "system.dark_hearts.value": acota(n(actor.system?.dark_hearts?.value, 0) + 1, 0, max) });
      ui.notifications.info(`${actor.name} recibe un Corazón Oscuro.`);
      break;
    }

    case "marcar-osada": {
      if (!actor) return;
      const rx = actor.system?.recklessxp;
      await actualizarActorSeguro(actor, { "system.recklessxp.value": acota(n(rx?.value, 0) + 1, 0, n(rx?.max, 3)) });
      ui.notifications.info(`${actor.name}: EXP Osada marcada (máx. 1 por sesión).`);
      break;
    }

    case "marcar-conmocionado": {
      if (!actor) return;
      const atrib = btn.dataset.extra || "brains";
      await actualizarActorSeguro(actor, { [`system.attributes.${atrib}.shocked`]: true });
      ui.notifications.info(`${actor.name}: atributo marcado como Conmocionado.`);
      break;
    }

    case "gastar-corazon": {
      if (!actor) return ui.notifications.warn("No se encontró un personaje activo.");
      await gastarCorazonExtraDado(message, actor);
      break;
    }

    case "sumar-oro": {
      if (!actor) return ui.notifications.warn("Selecciona un personaje para recibir el Oro.");
      const actual = n(actor.system?.gold?.value, 0);
      const max = n(actor.system?.gold?.max, 3);
      const nuevo = acota(actual + n(valor, 1), 0, max);
      await actualizarActorSeguro(actor, { "system.gold.value": nuevo });
      ui.notifications.info(`${actor.name}: Oro actualizado a ${nuevo}/${max}.`);
      break;
    }

    case "sumar-suministro": {
      if (!actor) return ui.notifications.warn("Selecciona un personaje para recibir los Suministros.");
      const actual = n(actor.system?.supply?.value, 0);
      const max = n(actor.system?.supply?.max, 2);
      const nuevo = acota(actual + n(valor, 1), 0, max);
      await actualizarActorSeguro(actor, { "system.supply.value": nuevo });
      ui.notifications.info(`${actor.name}: Suministros actualizados a ${nuevo}/${max}.`);
      break;
    }

    case "abrir-panel-dj": {
      const gmSheet = game.actors.find(a => a.type === "gm_sheet");
      if (gmSheet) gmSheet.sheet.render(true);
      else ui.notifications.info("No hay un Panel del DJ importado en el mundo.");
      break;
    }

    case "abrir-grupo-invasor": {
      const party = game.actors.find(a => a.type === "party");
      if (party) party.sheet.render(true);
      else game.modules.get(MOD)?.api?.abrirGenerador("invasiones");
      break;
    }

    case "abrir-generador": {
      game.modules.get(MOD)?.api?.abrirGenerador(valor || "esbirros");
      break;
    }

    case "tirar-tabla": {
      game.modules.get(MOD)?.api?.tirarTablaCompendio(valor);
      break;
    }
  }
}

/**
 * Actualiza un actor directamente si el usuario es dueño/GM o envía la petición por socket al activeGM.
 */
export async function actualizarActorSeguro(actor, cambios) {
  if (!actor) return;
  if (actor.isOwner || soyGM()) {
    return actor.update(cambios);
  }
  game.socket.emit(`module.${MOD}`, {
    tipo: "actualizarActor",
    actorId: actor.id,
    cambios
  });
}
