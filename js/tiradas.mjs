/**
 * Automatización de aritmética y botones de confirmación en tarjetas de chat para Wicked Ones.
 * «Menos software visible. Más partida.»
 */

import { n, acota, evaluarTirada, evaluarResistencia, evaluarDesastre, evaluarRepresalia, evaluarDefensaMazmorra, simularIncursionEsbirros } from "./core/reglas.mjs";
import { soyGM, aplicarModoMensaje } from "./compat.mjs";

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
export async function publicarTarjetaMR({ titulo, subtitulo = "", estado = "success", dados = [], cuerpoHTML = "", botones = [], speaker = null }) {
  const sp = speaker || ChatMessage.getSpeaker();
  const etiquetasEstado = {
    critical: "¡Éxito crítico!",
    success: "Éxito completo",
    mixed: "Éxito parcial",
    failure: "Fallo"
  };
  const dadosHTML = dados.length
    ? `<ol class="dice-rolls">${dados.map(d => `<li class="roll die d6 ${d === 6 ? "max" : d === 1 ? "min" : ""}">${n(d, 1)}</li>`).join("")}</ol>`
    : "";
  const btnsHTML = botones.length
    ? `<div class="mr-wo-chat-acciones">${botones.map(b => `<button type="button" class="mr-wo-btn-chat" data-mr-accion="${esc(b.accion)}" ${b.actorId ? `data-actor-id="${esc(b.actorId)}"` : ""} ${b.valor !== undefined ? `data-valor="${esc(b.valor)}"` : ""} ${b.extra ? `data-extra="${esc(b.extra)}"` : ""}><i class="${esc(b.icono || "fas fa-dice")}"></i> ${esc(b.etiqueta)}</button>`).join("")}</div>`
    : "";

  const content = `
    <div class="dice-tooltip wicked-roll-card mr-wo-tarjeta">
      <div class="chat-label label-stripe1">${esc(titulo)}</div>
      ${subtitulo ? `<div class="chat-label-small label-stripe2">${esc(subtitulo)}</div>` : ""}
      <div class="die ${esc(estado)}">${esc(etiquetasEstado[estado] || estado)}</div>
      ${dadosHTML}
      <div class="description">${cuerpoHTML}</div>
      ${btnsHTML}
    </div>
  `;

  const msgData = { user: game.user.id, speaker: sp, content };
  aplicarModoMensaje(msgData);
  return ChatMessage.create(msgData);
}

/**
 * Ejecuta una tirada especial del ciclo de juego (Desastre, Represalia, Defensa, Incursión de Esbirros)
 * y publica su tarjeta enriquecida con botones de aplicación.
 */
export async function ejecutarTiradaCiclo(tipo, reserva = 2, nombreContexto = "") {
  const solicitados = n(reserva, 2);
  const cant = solicitados <= 0 ? 2 : solicitados;
  const r = new Roll(`${cant}d6`);
  await r.evaluate();
  if (game.dice3d) await game.dice3d.showForRoll(r);
  const caras = r.terms?.[0]?.results?.map(x => x.result) ?? [1];

  if (tipo === "calamity") {
    const ev = evaluarDesastre(caras, solicitados);
    return publicarTarjetaMR({
      titulo: "Fase de Desastre · Lógica de Mazmorra",
      subtitulo: nombreContexto || `Reserva: ${solicitados}D`,
      estado: ev.estado,
      dados: caras,
      cuerpoHTML: `<p>${esc(ev.resumen)}</p>`,
      botones: [
        ...(ev.avanceRelojes > 0 ? [{ accion: "abrir-panel-dj", icono: "fas fa-clock", etiqueta: "Abrir Panel del DJ" }] : []),
        { accion: "tirar-tabla", valor: "solitario-gran-malo", icono: "fas fa-dungeon", etiqueta: "Tirar Suceso en la Guarida" }
      ]
    });
  }

  if (tipo === "blowback") {
    const ev = evaluarRepresalia(caras, solicitados);
    return publicarTarjetaMR({
      titulo: "Fase de Represalia · Ecos de la Incursión",
      subtitulo: nombreContexto || `Reserva: ${solicitados}D`,
      estado: ev.estado,
      dados: caras,
      cuerpoHTML: `<p>${esc(ev.resumen)}</p>`,
      botones: [
        { accion: "abrir-panel-dj", icono: "fas fa-flag", etiqueta: `Ver Relojes (+${ev.segmentosFaccion} seg.)` },
        { accion: "abrir-generador", valor: "invasiones", icono: "fas fa-shield-halved", etiqueta: "Preparar Invasión" }
      ]
    });
  }

  if (["creature", "trap", "lock", "trick"].includes(tipo)) {
    const ev = evaluarDefensaMazmorra(tipo, caras, solicitados);
    const titulos = {
      creature: "Defensa · Criatura de Guarida",
      trap: "Defensa · Trampa de Mazmorra",
      lock: "Defensa · Portón / Cerradura",
      trick: "Defensa · Truco y Engaño"
    };
    return publicarTarjetaMR({
      titulo: titulos[tipo],
      subtitulo: nombreContexto || `Nivel ${solicitados} (${solicitados}D)`,
      estado: ev.estado,
      dados: caras,
      cuerpoHTML: `<p>${esc(ev.resumen)}</p><p class="mr-wo-resumen-pildoras"><span class="mr-wo-pildora">Corazones: ${ev.corazonesInfligidos}</span> <span class="mr-wo-pildora">Movimientos: ${ev.movimientosConsumidos}</span></p>`,
      botones: [
        { accion: "abrir-grupo-invasor", icono: "fas fa-users", etiqueta: "Abrir Grupo Invasor" }
      ]
    });
  }

  if (tipo === "minion_raid") {
    const ev = simularIncursionEsbirros(caras, solicitados);
    return publicarTarjetaMR({
      titulo: "Simulador · Incursión de Esbirros",
      subtitulo: nombreContexto || `Manada (${solicitados}D)`,
      estado: ev.estado,
      dados: caras,
      cuerpoHTML: `<p>${esc(ev.resumen)}</p>`,
      botones: [
        ...(ev.botinOro > 0 ? [{ accion: "sumar-oro", valor: ev.botinOro, icono: "fas fa-coins", etiqueta: `+${ev.botinOro} de Oro` }] : []),
        ...(ev.suministros > 0 ? [{ accion: "sumar-suministro", valor: ev.suministros, icono: "fas fa-box-open", etiqueta: `+${ev.suministros} Suministros` }] : [])
      ]
    });
  }

  const ev = evaluarTirada(caras, solicitados);
  return publicarTarjetaMR({
    titulo: nombreContexto || "Tirada de Fortuna",
    subtitulo: `Reserva: ${solicitados}D`,
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
    ["calamity", "Fase de Desastre (Lógica de Mazmorra)"],
    ["blowback", "Fase de Represalia (Blowback)"],
    ["minion_raid", "Simular Incursión de Manada de Esbirros"],
    ["creature", "Defensa: Criatura de Guarida"],
    ["trap", "Defensa: Trampa de Mazmorra"],
    ["lock", "Defensa: Portón / Cerradura"],
    ["trick", "Defensa: Truco de Mazmorra"]
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
          <button type="button" class="mr-wo-btn-chat" data-mr-accion="sumar-estres" data-actor-id="${esc(spActorId)}" data-valor="1" title="Marcar +1 de Estrés en el personaje activo">
            <i class="fas fa-bolt"></i> +1 Estrés
          </button>
        `;
      }

      // Siempre permitir gastar 1 Corazón Oscuro si el actor tiene alguno disponible
      barra.innerHTML += `
        <button type="button" class="mr-wo-btn-chat" data-mr-accion="gastar-corazon" data-actor-id="${esc(spActorId)}" title="Gastar 1 Corazón Oscuro del personaje">
          <i class="fas fa-heart"></i> Corazón Oscuro
        </button>
      `;

      contenedor.appendChild(barra);
    }

    // Enlazar todos los botones .mr-wo-btn-chat presentes en el mensaje
    html.querySelectorAll(".mr-wo-btn-chat").forEach(btn => {
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
    case "tirar-resistencia": {
      if (!actor) return ui.notifications.warn("Selecciona un token o asigna un personaje para tirar Resistencia.");
      const DialogV1 = foundry.appv1?.api?.Dialog ?? Dialog;
      new DialogV1({
        title: `Resistir Consecuencia · ${actor.name}`,
        content: `
          <form class="mr-wo-form-dialogo">
            <p>Elige el atributo con el que <strong>${esc(actor.name)}</strong> resiste la consecuencia:</p>
            <div class="form-group">
              <label>Atributo:</label>
              <select name="atrib">
                <option value="brains">Sesos (Escanear + Chapucear + Engañar)</option>
                <option value="muscles">Músculos (Sutileza + Acechar + Machacar)</option>
                <option value="guts">Agallas (Cháchara + Amenazar + Invocar)</option>
              </select>
            </div>
            <div class="form-group">
              <label>¿Posición Mortal?</label>
              <select name="posicion">
                <option value="default">No (Resistencia normal)</option>
                <option value="deadly">Sí (Resistir la Muerte)</option>
              </select>
            </div>
          </form>
        `,
        buttons: {
          resistir: {
            icon: '<i class="fas fa-shield-alt"></i>',
            label: "Tirar Resistencia",
            callback: async jq => {
              const root = jq instanceof HTMLElement ? jq : jq[0];
              const atrib = root.querySelector('[name="atrib"]')?.value || "brains";
              const pos = root.querySelector('[name="posicion"]')?.value || "default";
              const skills = actor.system?.attributes?.[atrib]?.skills ?? {};
              let dados = 0;
              for (const sk of Object.values(skills)) {
                const v = n(sk.value, 0);
                if (v > 0 && !(v === 1 && n(sk.practice, 0) > 0)) dados += 1;
              }
              const r = new Roll(`${dados <= 0 ? 2 : dados}d6`);
              await r.evaluate();
              if (game.dice3d) await game.dice3d.showForRoll(r);
              const caras = r.terms?.[0]?.results?.map(x => x.result) ?? [1];
              const evT = evaluarTirada(caras, dados);
              const evR = evaluarResistencia(pos, evT.estado);
              const nombresAtrib = { brains: "Sesos", muscles: "Músculos", guts: "Agallas" };
              await publicarTarjetaMR({
                titulo: pos === "deadly" ? "Resistir la Muerte" : `Resistencia · ${nombresAtrib[atrib]}`,
                subtitulo: `${actor.name} (${dados}D)`,
                estado: evT.estado,
                dados: caras,
                cuerpoHTML: `<p>${esc(evR.resumen)}</p>`,
                botones: [
                  ...(evR.estres > 0 ? [{ accion: "sumar-estres", actorId: actor.id, valor: evR.estres, icono: "fas fa-bolt", etiqueta: `Aplicar +${evR.estres} Estrés` }] : []),
                  ...(evR.conmocionado ? [{ accion: "marcar-conmocionado", actorId: actor.id, extra: atrib, icono: "fas fa-dizzy", etiqueta: `Marcar ${nombresAtrib[atrib]} Conmocionado` }] : [])
                ]
              });
            }
          }
        },
        default: "resistir"
      }).render(true);
      break;
    }

    case "sumar-estres": {
      if (!actor) return ui.notifications.warn("No se encontró un personaje activo.");
      const delta = n(valor, 1);
      const actual = n(actor.system?.stress?.value, 0);
      const max = n(actor.system?.stress?.max, 6);
      const nuevo = acota(actual + delta, 0, max);
      await actualizarActorSeguro(actor, { "system.stress.value": nuevo });
      ui.notifications.info(`${actor.name}: Estrés actualizado a ${nuevo}/${max}.`);
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
      const actual = n(actor.system?.dark_hearts?.value, 0);
      if (actual <= 0) return ui.notifications.warn(`${actor.name} no tiene Corazones Oscuros disponibles.`);
      await actualizarActorSeguro(actor, { "system.dark_hearts.value": actual - 1 });
      ui.notifications.info(`${actor.name} ha gastado 1 Corazón Oscuro (quedan ${actual - 1}).`);
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
