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
 * Tirada de resistencia (manual, pág. 50-52): fallo 3 de estrés y resistes en parte; parcial 2 y en parte; éxito 1 y del todo;
 * crítico recuperas 1 y del todo. Resistirse a la muerte (situación mortal) cuesta el mismo estrés, pero con un éxito parcial la
 * consecuencia baja un nivel y sigue siendo devastadora, y con un fracaso sigues muriendo (golpe de gracia si tienes corazones oscuros).
 * @param {"dominant"|"default"|"dire"|"deadly"} posicion
 * @param {"critical"|"success"|"mixed"|"failure"} estadoResistencia
 * @returns {{ estres: number, total: boolean, muerte: boolean, grave: boolean, resumen: string }}
 */
export function evaluarResistencia(posicion = "default", estadoResistencia = "success") {
  const COSTE = { critical: -1, success: 1, mixed: 2, failure: 3 };
  const estres = COSTE[estadoResistencia] ?? 3;
  const total = estadoResistencia === "critical" || estadoResistencia === "success";
  const pago = estres < 0 ? "recuperas 1 de estrés" : `sufres ${estres} de estrés`;
  if (posicion === "deadly") {
    if (total) return { estres, total, muerte: false, grave: false, resumen: `Te resistes a la muerte por completo: ${pago}.` };
    if (estadoResistencia === "mixed") return { estres, total, muerte: false, grave: true, resumen: `Éxito parcial: ${pago}. La consecuencia baja un nivel, pero sigue siendo tremendamente grave (te sacan de la escena, empieza un reloj hasta desangrarte, pierdes una extremidad…).` };
    return { estres, total, muerte: true, grave: true, resumen: `Fracaso: ${pago} y sigues muriendo. Si tienes corazones oscuros, ¡es el momento de tu golpe de gracia!` };
  }
  const resumen = {
    critical: "Crítico: recuperas 1 de estrés y resistes la consecuencia por completo.",
    success: "Éxito: sufres 1 de estrés y resistes la consecuencia por completo.",
    mixed: "Éxito parcial: sufres 2 de estrés y resistes la consecuencia de manera parcial.",
    failure: "Fracaso: sufres 3 de estrés y resistes la consecuencia de manera parcial."
  }[estadoResistencia] ?? "";
  return { estres, total, muerte: false, grave: false, resumen };
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
 * Tirada de implicación (manual, pág. 40): el DJ tira 1d (escasas), 2d (igualadas) o 3d (prometedoras). Fracaso: empezáis en un
 * aprieto, sufriendo las consecuencias. Parcial: en igualdad de condiciones. Éxito: con ventaja, controlando la situación. Crítico:
 * como en éxito, ¡pero además se produce un giro afortunado de los acontecimientos!
 * @returns {{ estado: string, posicionInicial: "dominant"|"default"|"dire", resumen: string }}
 */
export function evaluarImplicacion(resultados, reservaSolicitada = 2) {
  const ev = evaluarTirada(resultados, reservaSolicitada);
  const t = {
    critical: ["dominant", "Empezáis con ventaja, controlando la situación, ¡y además se produce un giro afortunado de los acontecimientos!"],
    success: ["dominant", "Empezáis con ventaja, controlando la situación."],
    mixed: ["default", "Empezáis en igualdad de condiciones, listos para afrontar el reto."],
    failure: ["dire", "Empezáis en un aprieto, sufriendo las consecuencias."]
  }[ev.estado];
  return { estado: ev.estado, posicionInicial: t[0], resumen: t[1] };
}

/**
 * Tirada de desastre (manual, pág. 244): el DJ tira 1d (quejas incesantes), 2d (descontento normal) o 3d (demasiado felices o
 * asustados para quejarse). Fracaso: desastre grave. Parcial: desastre leve. Éxito: la moral de los esbirros aumenta y se unen a la
 * siguiente incursión gratis. Crítico: además, los duendes hallan un descubrimiento (de la categoría de «éxito»).
 * @returns {{ estado: string, desastre: "grave"|"leve"|null, moral: boolean, incursionGratis: boolean, descubrimiento: boolean, resumen: string }}
 */
export function evaluarDesastre(resultados, reservaSolicitada = 2) {
  const ev = evaluarTirada(resultados, reservaSolicitada);
  const bien = ev.estado === "critical" || ev.estado === "success";
  const resumen = {
    failure: "¡Sois víctimas de un desastre grave!",
    mixed: "Sois víctimas de un desastre leve.",
    success: "La moral de vuestros esbirros aumenta y se unen a la siguiente incursión gratis.",
    critical: "La moral de vuestros esbirros aumenta y se unen a la siguiente incursión gratis. Además, vuestros duendes hallan un descubrimiento (de la categoría de «éxito»)."
  }[ev.estado];
  return { estado: ev.estado, desastre: ev.estado === "failure" ? "grave" : ev.estado === "mixed" ? "leve" : null, moral: bien, incursionGratis: bien, descubrimiento: ev.estado === "critical", resumen };
}

/** Desastre aleatorio (manual, pág. 247): la categoría del desastre con 1d6. */
export const DESASTRE_ALEATORIO = ["Invasión de la mazmorra", "Invasión de la mazmorra", "Problema con los habitantes", "Problema con los habitantes", "Problema estructural", "Interferencia del exterior"];

/**
 * Tirada de represalia (manual, pág. 264): el DJ tira 1d (os habéis desviado mucho), 2d (se fue un poco de las manos) o 3d (fue todo
 * bien). Fracaso: represalia grave. Parcial: represalia leve. Éxito: cada PJ gana un corazón oscuro. Crítico: como éxito y además podéis
 * elegir una facción como chivo expiatorio. Las represalias no se pueden resistir.
 * @returns {{ estado: string, represalia: "grave"|"leve"|null, corazonOscuro: boolean, chivoExpiatorio: boolean, resumen: string }}
 */
export function evaluarRepresalia(resultados, reservaSolicitada = 2) {
  const ev = evaluarTirada(resultados, reservaSolicitada);
  const resumen = {
    failure: "Sufrís una represalia grave.",
    mixed: "Sufrís una represalia leve.",
    success: "Cada PJ gana un corazón oscuro.",
    critical: "Cada PJ gana un corazón oscuro, y además podéis elegir una facción como chivo expiatorio."
  }[ev.estado];
  const bien = ev.estado === "critical" || ev.estado === "success";
  return { estado: ev.estado, represalia: ev.estado === "failure" ? "grave" : ev.estado === "mixed" ? "leve" : null, corazonOscuro: bien, chivoExpiatorio: ev.estado === "critical", resumen };
}

/**
 * Defensas de la mazmorra. Cada aventurero herido recibe un tajo (medio corazón; dos tajos quitan un corazón entero, pág. 222).
 *  · Criatura (pág. 188): fracaso, muere o huye para siempre; parcial, hiere a un aventurero a elección del DJ y queda inconsciente
 *    (se recupera al acabar la defensa); éxito, hiere a uno a tu elección y vuelve a tirar; crítico, a dos y vuelve a tirar.
 *  · Trampa (pág. 198): fracaso, la desactivan o la evitan; parcial, el DJ elige a un aventurero herido; éxito, hieres a uno a tu
 *    elección y vuelves a tirar; crítico, a dos y vuelves a tirar.
 *    En ambas: no puedes herir al mismo aventurero dos veces seguidas, salvo que esté solo.
 *  · Portón (pág. 222): fracaso, lo desbloquean y lo atraviesan; parcial, van por otro lado; éxito, un aventurero gasta un movimiento
 *    y van por otro lado; crítico, todos gastan un movimiento cada uno y van por otro lado («salvo que no tengan otra opción»: si
 *    solo se puede avanzar por el portón, se repite la tirada hasta que lo desbloquean).
 *  · Truco (pág. 200): tirada de fortuna de su nivel; el jugador al cargo narra lo que ocurre según el resultado.
 * @param {"creature"|"trap"|"lock"|"trick"} tipo
 * @returns {{ estado: string, heridos: number, tajos: number, corazones: number, eligeDJ: boolean, repetir: boolean,
 *   estadoCriatura: "muerta"|"inconsciente"|"activa"|null, otroCamino: boolean, atraviesan: boolean,
 *   movimientosUnAventurero: number, movimientosPorAventurero: number, resumen: string, nota: string }}
 */
export function evaluarDefensaMazmorra(tipo, resultados, nivel = 1) {
  const ev = evaluarTirada(resultados, nivel);
  const e = ev.estado, base = { estado: e, heridos: 0, tajos: 0, corazones: 0, eligeDJ: false, repetir: false, estadoCriatura: null, otroCamino: false, atraviesan: false, movimientosUnAventurero: 0, movimientosPorAventurero: 0, nota: "" };
  const herir = (n, dj, extra) => ({ ...base, heridos: n, tajos: n, corazones: n / 2, eligeDJ: dj, ...extra });
  const NO_REPETIR = "No puedes herir al mismo aventurero dos veces seguidas, salvo que esté solo.";
  if (tipo === "creature") {
    if (e === "failure") return { ...base, estadoCriatura: "muerta", resumen: "La criatura muere o huye para siempre de la mazmorra." };
    if (e === "mixed") return herir(1, true, { estadoCriatura: "inconsciente", resumen: "Hieres a un aventurero a elección del DJ (un tajo, medio corazón) y la criatura queda inconsciente: se recuperará en cuanto acabe la defensa de la mazmorra." });
    if (e === "success") return herir(1, false, { estadoCriatura: "activa", repetir: true, nota: NO_REPETIR, resumen: "Hieres a un aventurero a tu elección (un tajo, medio corazón). Tira otra vez." });
    return herir(2, false, { estadoCriatura: "activa", repetir: true, nota: NO_REPETIR, resumen: "Hieres a dos aventureros a tu elección (un tajo a cada uno). Tira otra vez." });
  }
  if (tipo === "trap") {
    if (e === "failure") return { ...base, resumen: "Los aventureros consiguen desactivar o evitar la trampa." };
    if (e === "mixed") return herir(1, true, { resumen: "El DJ elige a un aventurero al que has herido (un tajo, medio corazón)." });
    if (e === "success") return herir(1, false, { repetir: true, nota: NO_REPETIR, resumen: "Hieres a un aventurero de tu elección (un tajo, medio corazón). Tira otra vez." });
    return herir(2, false, { repetir: true, nota: NO_REPETIR, resumen: "Hieres a dos aventureros de tu elección (un tajo a cada uno). Tira otra vez." });
  }
  if (tipo === "lock") {
    const SALVO = "Si solo se puede avanzar por el portón, repite la tirada hasta que los aventureros logren desbloquear la ruta.";
    if (e === "failure") return { ...base, atraviesan: true, resumen: "Desbloquean el portón y lo atraviesan." };
    if (e === "mixed") return { ...base, otroCamino: true, nota: SALVO, resumen: "Van por otro lado, salvo que no tengan otra opción." };
    if (e === "success") return { ...base, otroCamino: true, movimientosUnAventurero: 1, nota: SALVO, resumen: "Un aventurero gasta un movimiento intentando atravesar el portón. Después van por otro lado, salvo que no tengan otra opción." };
    return { ...base, otroCamino: true, movimientosPorAventurero: 1, nota: SALVO, resumen: "Todos los aventureros gastan un movimiento cada uno intentando atravesar el portón. Después van por otro lado, salvo que no tengan otra opción." };
  }
  // truco: tirada de fortuna, sin tabla propia en el manual
  return { ...base, resumen: `${ev.etiqueta}. El jugador al cargo del truco narra lo que ocurre según el resultado; el DJ puede ajustar su eficacia para que coincida mejor con él. Un truco nunca puede dejar a un aventurero sin salida.` };
}

/**
 * Incursiones de esbirros (manual, pág. 354): se prepara la incursión y se hace una tirada de implicación normal (enviar menos de tres
 * esbirros resta, enviarlos con mejoras suma). Esa reserva se tira en cada tabla; la primera ajusta los dados de las otras dos.
 * Se puede gastar moral para +1d en una única tirada de estas tablas. Después, tirada de represalias.
 */
export const INCURSION_ESBIRROS = {
  exito: { titulo: "Éxito o fracaso de la incursión", nota: "4+ para cumplir con el objetivo.", filas: [["Aniquilados", -2], ["Por los pelos", -1], ["Retirada rápida", 0], ["Victoria pírrica", -2], ["Un poco caótico, pero ya está hecho", -1], ["Ejecución perfecta", 1]] },
  consecuencias: { titulo: "Consecuencias", nota: "Ajusta el número de dados según los resultados de la 1.ª tabla.", filas: ["2 Devastadoras, 1 Molesta", "1 Devastadora, 2 Frustrantes", "3 Frustrantes", "1 Frustrante", "2 Molestas", "¡No hay consecuencias!"] },
  botin: { titulo: "Botín y moral", nota: "Añade botín de base si la incursión salió bien.", filas: ["Los esbirros pierden moral", "-1d al botín", "Los esbirros ganan moral", "+1d al botín", "+1d al botín y ganan moral", "+2d al botín y ganan moral"] }
};

/** Valor de una tabla de reserva: el dado más alto (con 0d, el más bajo de dos). */
export const valorReserva = (caras, reserva) => { const v = caras.map(c => acota(c, 1, 6)); return n(reserva, 1) <= 0 ? Math.min(...v) : Math.max(...v); };

/**
 * Resuelve las tres tablas de una incursión de esbirros a partir de las caras tiradas en cada una.
 * @param {{ exito: number[], consecuencias: number[], botin: number[] }} caras
 * @param {number} reserva dados de la tirada de implicación
 * @returns {{ exito: object, consecuencias: object, botin: object, cumplido: boolean, ajuste: number, reservaAjustada: number }}
 */
export function evaluarIncursionEsbirros(caras, reserva = 2) {
  const T = INCURSION_ESBIRROS;
  const v1 = valorReserva(caras.exito, reserva), [texto, ajuste] = T.exito.filas[v1 - 1];
  const reservaAjustada = n(reserva, 2) + ajuste;
  const v2 = valorReserva(caras.consecuencias, reservaAjustada), v3 = valorReserva(caras.botin, reservaAjustada);
  return {
    exito: { valor: v1, texto: ajuste ? `${texto} (${ajuste > 0 ? "+" : ""}${ajuste}d)` : texto },
    consecuencias: { valor: v2, texto: T.consecuencias.filas[v2 - 1] },
    botin: { valor: v3, texto: T.botin.filas[v3 - 1] },
    cumplido: v1 >= 4, ajuste, reservaAjustada
  };
}

/**
 * Trabajo en equipo (manual, pág. 63): cada PJ implicado tira con la misma acción y el grupo usa el mejor resultado individual;
 * cualquier PJ que saque un éxito parcial o un fracaso sufre estrés (un punto, como en el ejemplo del manual).
 * @param {Array<"critical"|"success"|"mixed"|"failure">} estados
 */
export function evaluarTrabajoEnEquipo(estados) {
  const orden = ["failure", "mixed", "success", "critical"];
  const mejor = estados.reduce((a, e) => (orden.indexOf(e) > orden.indexOf(a) ? e : a), "failure");
  return { estado: mejor, estres: estados.map(e => (e === "mixed" || e === "failure" ? 1 : 0)) };
}

/**
 * Probabilidad exacta de cada resultado para una reserva de d6 (0 = tirar 2d y quedarse con el menor).
 * @returns {{ critical: number, success: number, mixed: number, failure: number }} fracciones que suman 1
 */
export function probabilidades(dados) {
  const d = Math.max(0, Math.floor(n(dados, 0)));
  if (d === 0) return { critical: 0, success: 1 / 36, mixed: 8 / 36, failure: 27 / 36 };
  const sinSeis = (5 / 6) ** d;
  const unSeis = d * (1 / 6) * (5 / 6) ** (d - 1);
  const fallo = 0.5 ** d;
  return { critical: Math.max(0, 1 - sinSeis - unSeis), success: unSeis, mixed: sinSeis - fallo, failure: fallo };
}
