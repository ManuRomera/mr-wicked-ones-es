/**
 * Núcleo puro de reglas de Wicked Ones (Edición de The Hills Press).
 * Sin dependencias de Foundry VTT (game / canvas / Hooks) para ejecución directa con node --test.
 */

export const n = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
export const sig = v => (v > 0 ? `+${v}` : `${v >= 0 ? "0" : `−${Math.abs(v)}`}`);
export const acota = (v, min, max) => Math.min(max, Math.max(min, n(v, min)));

/**
 * Evalúa una reserva de dados de 6 caras según el motor Forged in the Dark de Wicked Ones.
 * Si la reserva es <= 0 (modo cero), se tiran 2d6 y se toma el menor; un doble 6 en modo cero cuenta como éxito (6).
 * @param {number[]} resultados Caras obtenidas en los d6 (1-6)
 * @param {number} reservaSolicitada Dados solicitados antes de ajustar por modo cero (<= 0 activa modo cero)
 * @returns {{ estado: "critical"|"success"|"mixed"|"failure", dadoClave: number, seises: number, modoCero: boolean, etiqueta: string }}
 */
export function evaluarTirada(resultados, reservaSolicitada = 1) {
  if (!Array.isArray(resultados) || !resultados.length) {
    return { estado: "failure", dadoClave: 1, seises: 0, modoCero: reservaSolicitada <= 0, etiqueta: "Fallo (1–3)" };
  }
  const limpios = resultados.map(d => acota(d, 1, 6)).sort((a, b) => a - b);
  const modoCero = n(reservaSolicitada, 1) <= 0;
  const seises = limpios.filter(d => d === 6).length;

  if (modoCero) {
    const menor = limpios[0];
    const estado = menor === 6 ? "success" : menor >= 4 ? "mixed" : "failure";
    const mapa = { success: "Éxito completo (6)", mixed: "Éxito parcial (4–5)", failure: "Fallo (1–3)" };
    return { estado, dadoClave: menor, seises, modoCero: true, etiqueta: mapa[estado] };
  }

  const mayor = limpios[limpios.length - 1];
  const estado = seises >= 2 ? "critical" : mayor === 6 ? "success" : mayor >= 4 ? "mixed" : "failure";
  const mapa = {
    critical: "¡Éxito crítico! (6, 6)",
    success: "Éxito completo (6)",
    mixed: "Éxito parcial (4–5)",
    failure: "Fallo (1–3)"
  };
  return { estado, dadoClave: mayor, seises, modoCero: false, etiqueta: mapa[estado] };
}

/**
 * Calcula las consecuencias sugeridas y el coste de resistencia según la posición en Wicked Ones.
 * En Wicked Ones, resistir una consecuencia en Posición Por defecto o Funesta requiere tirar Resistencia
 * (con 6: 0 de Estrés; con 4-5: 1 de Estrés; con 1-3: 2 de Estrés o marcar Conmocionado), y en Posición Mortal
 * convierte la tirada en Resistir la Muerte.
 * @param {"dominant"|"default"|"dire"|"deadly"} posicion
 * @param {"critical"|"success"|"mixed"|"failure"} estadoResistencia
 * @returns {{ estres: number, conmocionado: boolean, malherido: boolean, muerte: boolean, resumen: string }}
 */
export function evaluarResistencia(posicion = "default", estadoResistencia = "success") {
  if (posicion === "deadly") {
    if (estadoResistencia === "critical" || estadoResistencia === "success") {
      return { estres: 1, conmocionado: false, malherido: true, muerte: false, resumen: "Escapas de la muerte por los pelos: sufres 1 de Estrés y quedas Malherido." };
    }
    if (estadoResistencia === "mixed") {
      return { estres: 2, conmocionado: true, malherido: true, muerte: false, resumen: "Sobrevives a duras penas (4–5 en Resistir la Muerte): quedas Malherido, Conmocionado y fuera de la escena." };
    }
    return { estres: 0, conmocionado: true, malherido: true, muerte: true, resumen: "Fallo al Resistir la Muerte (1–3): el golpe resulta letal." };
  }

  // Libro (Resistencias): fallo 3 de estrés, parcial 2, éxito 1; crítico despeja 1 y resiste del todo.
  if (estadoResistencia === "critical") {
    return { estres: -1, conmocionado: false, malherido: false, muerte: false, total: true, resumen: "Resistencia crítica: resistes por completo y despejas 1 de Estrés." };
  }
  if (estadoResistencia === "success") {
    return { estres: 1, conmocionado: false, malherido: false, muerte: false, total: true, resumen: "Éxito: resistes por completo la consecuencia y pagas 1 de Estrés." };
  }
  if (estadoResistencia === "mixed") {
    return { estres: 2, conmocionado: false, malherido: false, muerte: false, total: false, resumen: "Parcial: resistes solo en parte la consecuencia y pagas 2 de Estrés." };
  }
  return { estres: 3, conmocionado: false, malherido: false, muerte: false, total: false, resumen: "Fallo: resistes solo en parte la consecuencia y pagas 3 de Estrés." };
}

/**
 * Suma (o despeja, si es negativo) estrés respetando el reloj de 6 casillas. Al llenarlo el personaje se desata (feral):
 * el desbordamiento se ignora (libro, «Going Feral»).
 * @returns {{ nuevo: number, feral: boolean, aplicado: number }}
 */
export function aplicarEstres(actual, delta, max = 6) {
  const a = n(actual, 0);
  const nuevo = acota(a + n(delta, 0), 0, n(max, 6));
  return { nuevo, feral: nuevo >= n(max, 6) && n(delta, 0) > 0, aplicado: nuevo - a };
}

/**
 * Experiencia de práctica (libro, «Practice XP»): tras una tirada de acción o resistencia con una acción SIN puntos,
 * se marca 1 de práctica; a la tercera la acción sube a 1 punto. practica va de 0 a 2.
 * @returns {{ valor: number, practica: number, sube: boolean }}
 */
export function progresoPractica(valor, practica) {
  if (n(valor, 0) > 0) return { valor: n(valor, 0), practica: n(practica, 0), sube: false };
  const p = n(practica, 0);
  if (p >= 2) return { valor: 1, practica: 0, sube: true };
  return { valor: 0, practica: p + 1, sube: false };
}

/**
 * Evalúa la Tirada de Implicación (Engagement Roll) al comenzar una Incursión.
 * @param {number[]} resultados
 * @param {number} reservaSolicitada
 * @returns {{ estado: string, posicionInicial: "dominant"|"default"|"dire", resumen: string }}
 */
export function evaluarImplicacion(resultados, reservaSolicitada = 1) {
  const ev = evaluarTirada(resultados, reservaSolicitada);
  if (ev.estado === "critical") {
    return { estado: ev.estado, posicionInicial: "dominant", resumen: "¡Implicación crítica! Ya habéis superado el primer obstáculo exterior y empezáis en Posición Dominante." };
  }
  if (ev.estado === "success") {
    return { estado: ev.estado, posicionInicial: "dominant", resumen: "Buen comienzo: empezáis frente al primer obstáculo en Posición Dominante." };
  }
  if (ev.estado === "mixed") {
    return { estado: ev.estado, posicionInicial: "default", resumen: "Acercamiento estándar: empezáis la incursión en Posición Por defecto." };
  }
  return { estado: ev.estado, posicionInicial: "dire", resumen: "Empezáis con mal pie o emboscados: la incursión arranca en Posición Funesta." };
}

/**
 * Evalúa la Tirada de Desastre (Calamity Roll) durante la Fase de Lógica de Mazmorra.
 * @param {number[]} resultados
 * @param {number} reservaSolicitada
 * @returns {{ estado: string, resumen: string, avanceRelojes: number }}
 */
export function evaluarDesastre(resultados, reservaSolicitada = 1) {
  const ev = evaluarTirada(resultados, reservaSolicitada);
  if (ev.estado === "critical" || ev.estado === "success") {
    return {
      estado: ev.estado,
      avanceRelojes: 2,
      resumen: "¡Desastre mayor en la guarida! Estalla una revuelta de esbirros, se fuga un cautivo clave, una criatura rompe sus cadenas o una facción rival descubre una entrada secreta."
    };
  }
  if (ev.estado === "mixed") {
    return {
      estado: ev.estado,
      avanceRelojes: 1,
      resumen: "Incidente menor en la mazmorra: disputas entre manadas, gasto de 1 Suministro para reparar daños o una trampa queda temporalmente inutilizada."
    };
  }
  return {
    estado: ev.estado,
    avanceRelojes: 0,
    resumen: "Todo marcha en orden en las profundidades: los diablillos y esbirros trabajan sin incidentes."
  };
}

/**
 * Evalúa la Tirada de Represalia (Blowback Roll) tras una Incursión.
 * @param {number[]} resultados
 * @param {number} reservaSolicitada
 * @returns {{ estado: string, segmentosFaccion: number, invasoresExtra: number, resumen: string }}
 */
export function evaluarRepresalia(resultados, reservaSolicitada = 2) {
  const ev = evaluarTirada(resultados, reservaSolicitada);
  if (ev.estado === "critical") {
    return {
      estado: ev.estado,
      segmentosFaccion: 3,
      invasoresExtra: 1,
      resumen: "¡Escándalo mayúsculo! habéis dejado un rastro inconfundible: la facción objetivo avanza +3 segmentos en su reloj de respuesta (o suma +1 Aventurero a la próxima invasión)."
    };
  }
  if (ev.estado === "success") {
    return {
      estado: ev.estado,
      segmentosFaccion: 2,
      invasoresExtra: 0,
      resumen: "Represalia fuerte: testigos o rastros delatan vuestra presencia; el reloj de respuesta de la facción avanza +2 segmentos."
    };
  }
  if (ev.estado === "mixed") {
    return {
      estado: ev.estado,
      segmentosFaccion: 1,
      invasoresExtra: 0,
      resumen: "Rumores y sospechas: el reloj de respuesta de la facción avanza +1 segmento (o podéis gastar 1 de Oro/Suministro para silenciarlo)."
    };
  }
  return {
    estado: ev.estado,
    segmentosFaccion: 0,
    invasoresExtra: 0,
    resumen: "Golpe limpio: nadie logra vincular la incursión con vuestra guarida (+0 segmentos de represalia)."
  };
}

/**
 * Evalúa el rendimiento de una Defensa de Mazmorra (Criatura, Trampa o Portón) frente a un grupo invasor.
 * @param {"creature"|"trap"|"lock"|"trick"} tipo
 * @param {number[]} resultados
 * @param {number} nivel
 * @returns {{ estado: string, corazonesInfligidos: number, movimientosConsumidos: number, resumen: string }}
 */
export function evaluarDefensaMazmorra(tipo, resultados, nivel = 1) {
  const ev = evaluarTirada(resultados, nivel);
  if (tipo === "creature") {
    const mapa = {
      critical: { c: 3, m: 1, r: "¡Masacre! La criatura inflige 3 Corazones repartidos entre los invasores y les cuesta 1 Movimiento abatirla." },
      success: { c: 2, m: 0, r: "La criatura lucha con ferocidad e inflige 2 Corazones antes de caer." },
      mixed: { c: 1, m: 0, r: "La criatura inflige 1 Corazón (o fuerza a gastar 1 Movimiento Defensivo)." },
      failure: { c: 0, m: 1, r: "Los aventureros abaten a la criatura rápidamente gastando 1 Movimiento." }
    }[ev.estado];
    return { estado: ev.estado, corazonesInfligidos: mapa.c, movimientosConsumidos: mapa.m, resumen: mapa.r };
  }
  if (tipo === "trap") {
    const mapa = {
      critical: { c: 2, m: 1, r: "¡Trampa letal! Inflige 2 Corazones y divide o retrasa al grupo (+1 Movimiento gastado)." },
      success: { c: 1, m: 1, r: "La trampa golpea de lleno: inflige 1 Corazón y consume 1 Movimiento." },
      mixed: { c: 1, m: 0, r: "Impacto parcial: inflige 1 Corazón a un ayudante/aventurero o les obliga a gastar 1 Movimiento." },
      failure: { c: 0, m: 0, r: "Los invasores detectan y desactivan la trampa sin sufrir daño." }
    }[ev.estado];
    return { estado: ev.estado, corazonesInfligidos: mapa.c, movimientosConsumidos: mapa.m, resumen: mapa.r };
  }
  if (tipo === "lock") {
    const mapa = {
      critical: { c: 0, m: 2, r: "¡Portón infranqueable! No logran cruzarlo, pierden 2 Movimientos y deben buscar otro camino." },
      success: { c: 0, m: 2, r: "El portón resiste largo rato: los invasores gastan 2 Movimientos en derribarlo y alertan a toda la zona." },
      mixed: { c: 0, m: 1, r: "Logran forzar o romper el portón tras gastar 1 Movimiento." },
      failure: { c: 0, m: 0, r: "Abren o derriban el portón al instante sin perder el ímpetu." }
    }[ev.estado];
    return { estado: ev.estado, corazonesInfligidos: mapa.c, movimientosConsumidos: mapa.m, resumen: mapa.r };
  }
  // trick
  const mapa = {
    critical: { c: 0, m: 2, r: "¡Engaño perfecto! Caen de lleno en el truco, pierden 2 Movimientos y quedan en Posición Funesta." },
    success: { c: 0, m: 1, r: "El truco los desorienta o separa, dándoos Posición Dominante en la sala." },
    mixed: { c: 0, m: 1, r: "Dudan y gastan 1 Movimiento en comprobar el truco." },
    failure: { c: 0, m: 0, r: "Ven a través del engaño de inmediato." }
  }[ev.estado];
  return { estado: ev.estado, corazonesInfligidos: mapa.c, movimientosConsumidos: mapa.m, resumen: mapa.r };
}

/**
 * Simula de forma pura una Incursión de Esbirros (Minion Raid) según las reglas de pág. 262 y modo solitario.
 * @param {number[]} resultados
 * @param {number} reservaDados
 * @returns {{ estado: string, botinOro: number, suministros: number, malheridos: boolean, represalia: number, resumen: string }}
 */
export function simularIncursionEsbirros(resultados, reservaDados = 2) {
  const ev = evaluarTirada(resultados, reservaDados);
  if (ev.estado === "critical") {
    return {
      estado: ev.estado,
      botinOro: 1,
      suministros: 2,
      malheridos: false,
      represalia: 0,
      resumen: "¡Triunfo arrollador de la manada! Regresan intactos con 1 de Oro, 2 Suministros y sin dejar testigos."
    };
  }
  if (ev.estado === "success") {
    return {
      estado: ev.estado,
      botinOro: 1,
      suministros: 1,
      malheridos: false,
      represalia: 1,
      resumen: "Incursión exitosa: la manada cumple su objetivo y trae 1 de Oro (o 2 Suministros) con +1 segmento de represalia."
    };
  }
  if (ev.estado === "mixed") {
    return {
      estado: ev.estado,
      botinOro: 0,
      suministros: 2,
      malheridos: true,
      represalia: 1,
      resumen: "Éxito costoso: logran traer 2 Suministros, pero la manada vuelve Malherida y genera +1 segmento de represalia."
    };
  }
  return {
    estado: ev.estado,
    botinOro: 0,
    suministros: 0,
    malheridos: true,
    represalia: 2,
    resumen: "Desastre: la manada es rechazada, regresa Malherida con las manos vacías y provoca +2 segmentos de represalia."
  };
}
