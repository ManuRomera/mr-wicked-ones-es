/**
 * Pruebas unitarias del núcleo puro de reglas (`js/core/reglas.mjs`) y validación de integridad
 * de los compendios y selectores CSS para MR- Wicked Ones (The Hills Press).
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  n,
  sig,
  acota,
  evaluarTirada,
  evaluarResistencia,
  aplicarEstres,
  progresoPractica,
  evaluarImplicacion,
  evaluarDesastre,
  evaluarRepresalia,
  evaluarDefensaMazmorra,
  evaluarIncursionEsbirros,
  evaluarTrabajoEnEquipo,
  DESASTRE_ALEATORIO,
  probabilidades
} from "../js/core/reglas.mjs";
import {
  crearMapa, excavar, rellenar, construirSala, quitarSala, alternarPuerta, muros, decorar, lucesDe, celda, resumen, TIPOS_SALA, cabe, ajustarSala,
  reglasSala, costeSala, costeExcavar, puedeGastar, gastar, quedanObra, esProyectoDeObra, relojSala, enObra, obrasEnCurso, avanzarObra, AVANCE_RESULTADO, tipoDeTema, antorchasTunel, lucesTunel, entradasDe,
  mascara, celdasForma, validarCeldas, contiene, celdasDe, FORMAS, MECANISMOS, DETONADORES, ponerTrampa, editarTrampa, quitarTrampa, costeTrampa, numDuendes
} from "../js/core/mazmorra.mjs";
import { clockAfterClick, clockState, clockEvent, phraseFor, publicMilestones, publicClocks, normalizarMarcadores, unirPorId, milestonesProgress } from "../js/core/marcadores.mjs";

test("Micro-utilidades puras (n, sig, acota)", () => {
  assert.equal(n("4", 0), 4);
  assert.equal(n("invalido", 2), 2);
  assert.equal(sig(3), "+3");
  assert.equal(sig(-2), "−2");
  assert.equal(acota(10, 0, 6), 6);
  assert.equal(acota(-3, 0, 6), 0);
});

test("Evaluación de tiradas Forged in the Dark (normal y modo cero)", () => {
  // Crítico con dos seises en reserva positiva
  const crit = evaluarTirada([3, 6, 6], 3);
  assert.equal(crit.estado, "critical");
  assert.equal(crit.seises, 2);
  assert.equal(crit.modoCero, false);

  // Éxito simple con un 6
  const exito = evaluarTirada([2, 6, 4], 3);
  assert.equal(exito.estado, "success");

  // Éxito parcial con 4 o 5
  const parcial = evaluarTirada([1, 5], 2);
  assert.equal(parcial.estado, "mixed");

  // Fallo con 1-3
  const fallo = evaluarTirada([1, 3], 2);
  assert.equal(fallo.estado, "failure");

  // Modo cero (0D -> se tiran 2d6 y se toma el menor; doble 6 es éxito simple, no crítico)
  const ceroDobleSeis = evaluarTirada([6, 6], 0);
  assert.equal(ceroDobleSeis.modoCero, true);
  assert.equal(ceroDobleSeis.estado, "success");

  const ceroFallo = evaluarTirada([2, 6], 0);
  assert.equal(ceroFallo.estado, "failure");
  assert.equal(ceroFallo.dadoClave, 2);
});

test("Evaluación de Resistencia y Resistir la Muerte", () => {
  const resExito = evaluarResistencia("default", "success");
  assert.equal(resExito.estres, 1);
  assert.equal(resExito.total, true);
  assert.equal(evaluarResistencia("default", "critical").estres, -1);
  assert.equal(resExito.muerte, false);

  const resParcial = evaluarResistencia("dire", "mixed");
  assert.equal(resParcial.estres, 2);

  const resFallo = evaluarResistencia("default", "failure");
  assert.equal(resFallo.estres, 3);
  assert.equal(resFallo.total, false);

  const muerteFallo = evaluarResistencia("deadly", "failure");
  assert.equal(muerteFallo.muerte, true);

  // pág. 52: resistirse a la muerte cuesta el mismo estrés; parcial = sigue siendo devastador; fracaso = sigues muriendo
  const muerteParcial = evaluarResistencia("deadly", "mixed");
  assert.equal(muerteParcial.muerte, false);
  assert.equal(muerteParcial.grave, true);
  assert.equal(muerteParcial.estres, 2);
  assert.equal(muerteFallo.estres, 3);
  assert.equal(evaluarResistencia("deadly", "success").estres, 1);
  assert.equal(evaluarResistencia("deadly", "success").total, true);
  assert.equal(evaluarResistencia("deadly", "critical").estres, -1);
  assert.equal(evaluarResistencia("deadly", "critical").muerte, false);
});

test("Ciclo de partida según el manual: implicación, desastre y represalia (sacar alto es bueno)", () => {
  // pág. 40
  assert.equal(evaluarImplicacion([6], 1).posicionInicial, "dominant");
  assert.equal(evaluarImplicacion([4], 1).posicionInicial, "default");
  assert.equal(evaluarImplicacion([2], 1).posicionInicial, "dire");
  assert.match(evaluarImplicacion([6, 6], 2).resumen, /giro afortunado/);

  // pág. 244: fracaso grave, parcial leve, éxito moral + incursión gratis, crítico además descubrimiento
  const dFallo = evaluarDesastre([2, 3], 2), dParcial = evaluarDesastre([5, 1], 2), dExito = evaluarDesastre([6, 2], 2), dCrit = evaluarDesastre([6, 6], 2);
  assert.equal(dFallo.desastre, "grave"); assert.equal(dFallo.moral, false);
  assert.equal(dParcial.desastre, "leve");
  assert.equal(dExito.desastre, null); assert.ok(dExito.moral && dExito.incursionGratis && !dExito.descubrimiento);
  assert.ok(dCrit.moral && dCrit.incursionGratis && dCrit.descubrimiento);
  assert.equal(evaluarDesastre([6], 1).desastre, null);
  assert.equal(DESASTRE_ALEATORIO.length, 6);

  // pág. 264: fracaso grave, parcial leve, éxito corazón oscuro, crítico además chivo expiatorio; sin valores inventados
  const rFallo = evaluarRepresalia([1, 3], 2), rParcial = evaluarRepresalia([5, 2], 2), rExito = evaluarRepresalia([6, 1], 2), rCrit = evaluarRepresalia([6, 6], 2);
  assert.equal(rFallo.represalia, "grave"); assert.equal(rFallo.corazonOscuro, false);
  assert.equal(rParcial.represalia, "leve");
  assert.ok(rExito.corazonOscuro && !rExito.chivoExpiatorio && rExito.represalia === null);
  assert.ok(rCrit.corazonOscuro && rCrit.chivoExpiatorio);
  for (const r of [rFallo, rParcial, rExito, rCrit]) { assert.equal(r.segmentosFaccion, undefined); assert.equal(r.invasoresExtra, undefined); }
});

test("Defensas de la mazmorra según el manual: criatura, trampa y portón (tajos de medio corazón, repetir y otro camino)", () => {
  // Criatura (pág. 188)
  const cF = evaluarDefensaMazmorra("creature", [2], 1), cP = evaluarDefensaMazmorra("creature", [4], 1), cE = evaluarDefensaMazmorra("creature", [6, 1], 2), cC = evaluarDefensaMazmorra("creature", [6, 6], 2);
  assert.ok(cF.estadoCriatura === "muerta" && cF.heridos === 0 && !cF.repetir);
  assert.ok(cP.estadoCriatura === "inconsciente" && cP.heridos === 1 && cP.eligeDJ && !cP.repetir && cP.tajos === 1 && cP.corazones === 0.5);
  assert.ok(cE.estadoCriatura === "activa" && cE.heridos === 1 && !cE.eligeDJ && cE.repetir);
  assert.ok(cC.heridos === 2 && cC.tajos === 2 && cC.corazones === 1 && cC.repetir);
  for (const r of [cF, cP, cE, cC]) assert.equal(r.movimientosUnAventurero + r.movimientosPorAventurero, 0);   // sin movimientos inventados
  // Trampa (pág. 198)
  const tF = evaluarDefensaMazmorra("trap", [3], 1), tP = evaluarDefensaMazmorra("trap", [5], 1), tE = evaluarDefensaMazmorra("trap", [6], 1), tC = evaluarDefensaMazmorra("trap", [6, 6], 2);
  assert.ok(tF.heridos === 0 && !tF.repetir);
  assert.ok(tP.heridos === 1 && tP.eligeDJ && tP.corazones === 0.5 && !tP.repetir);
  assert.ok(tE.heridos === 1 && !tE.eligeDJ && tE.repetir);
  assert.ok(tC.heridos === 2 && tC.repetir && /dos veces seguidas/.test(tC.nota));
  // Portón (pág. 222)
  const pF = evaluarDefensaMazmorra("lock", [1], 1), pP = evaluarDefensaMazmorra("lock", [4], 1), pE = evaluarDefensaMazmorra("lock", [6], 1), pC = evaluarDefensaMazmorra("lock", [6, 6], 2);
  assert.ok(pF.atraviesan && !pF.otroCamino);
  assert.ok(pP.otroCamino && pP.movimientosUnAventurero === 0 && pP.movimientosPorAventurero === 0);
  assert.ok(pE.otroCamino && pE.movimientosUnAventurero === 1 && pE.movimientosPorAventurero === 0);
  assert.ok(pC.otroCamino && pC.movimientosPorAventurero === 1);
  assert.ok(pC.heridos === 0);
  // Truco (pág. 200): tirada de fortuna, sin tabla propia
  assert.ok(evaluarDefensaMazmorra("trick", [6], 1).heridos === 0);
});

test("Incursión de esbirros (pág. 354) y trabajo en equipo (pág. 63)", () => {
  // la primera tabla ajusta los dados de las otras dos; 4+ cumple el objetivo
  const ev = evaluarIncursionEsbirros({ exito: [2, 4], consecuencias: [6, 1], botin: [3, 5] }, 2);
  assert.equal(ev.exito.valor, 4); assert.ok(ev.cumplido); assert.equal(ev.ajuste, -2); assert.equal(ev.reservaAjustada, 0);
  assert.equal(ev.consecuencias.valor, 1);   // con 0d cuenta el dado más bajo
  assert.equal(ev.botin.valor, 3); assert.match(ev.botin.texto, /ganan moral/);
  const perfecta = evaluarIncursionEsbirros({ exito: [6], consecuencias: [6, 2], botin: [6, 1] }, 1);
  assert.ok(perfecta.cumplido && perfecta.ajuste === 1 && perfecta.consecuencias.texto === "¡No hay consecuencias!");
  assert.equal(evaluarIncursionEsbirros({ exito: [3], consecuencias: [3], botin: [3] }, 1).cumplido, false);
  // trabajo en equipo: cuenta el mejor resultado; quien saca parcial o fracaso sufre estrés
  const eq = evaluarTrabajoEnEquipo(["mixed", "success", "failure"]);
  assert.equal(eq.estado, "success"); assert.deepEqual(eq.estres, [1, 0, 1]);
});

test("Integridad de datos generados y cumplimiento de reglas CSS de la casa MR-", async () => {
  const labores = JSON.parse(await fs.readFile("_data/labores-es.json", "utf8"));
  const equipo = JSON.parse(await fs.readFile("_data/equipo-es.json", "utf8"));
  const aventureros = JSON.parse(await fs.readFile("_data/aventureros-es.json", "utf8"));
  const facciones = JSON.parse(await fs.readFile("_data/facciones-es.json", "utf8"));
  const tablas = JSON.parse(await fs.readFile("_data/tablas-es.json", "utf8"));
  const manual = JSON.parse(await fs.readFile("_data/manual-es.json", "utf8"));
  const aventura = JSON.parse(await fs.readFile("_data/aventura-es.json", "utf8"));

  // Labores del capítulo 4, con el texto del libro (nada inventado)
  const tipoLabor = t => labores.filter(l => l.system.type_custom === t);
  const subtipo = t => labores.filter(l => l.flags["mr-wicked-ones-es"].subtipo === t).length;
  assert.deepEqual([subtipo("sala_n1"), subtipo("sala_n2"), subtipo("sala_n3")], [6, 5, 35], "Salas N1 y N2 (pág. 197) y N3 de las cinco temáticas");
  assert.deepEqual(["Trampa", "Portón", "Truco", "Criatura", "Descubrimiento"].map(t => tipoLabor(t).length), [3, 3, 8, 36, 108]);
  assert.ok(labores.find(l => l.name === "Sala N1 · Sala menor").system.description.includes("ganáis +1d en vuestra siguiente tirada de desastre"));
  assert.ok(labores.find(l => l.name === "Sala N3 · Dojo (Escondrijo)").system.description.includes("sufrís estrés solo con un fracaso"));
  assert.ok(labores.find(l => l.name === "Criatura · Basilisco").system.description.includes("fuerte y terrorífica"));
  assert.ok(!labores.some(l => /Almacenes|Foso de estacas|Hidra de foso|Veta de oro|Sala N1 · Forja/.test(l.name)), "Sin labores inventadas");
  // Facciones de ejemplo de los cuatro entornos (cap. 6), leídas de los mapas
  const fac = facciones.filter(a => a.type === "faction");
  assert.equal(fac.length, 62, "62 facciones de ejemplo de los 4 entornos");
  const almirantazgo = fac.find(a => a.name === "[Cloacas de la Gran Ciudad] Almirantazgo");
  assert.deepEqual([almirantazgo.system.tier.value, almirantazgo.system.category, almirantazgo.system.clock1.max, almirantazgo.system.clock2.max], [3, "light", 6, 8]);
  assert.equal(fac.find(a => a.name.endsWith("Horda de osgos")).system.category, "dark");
  assert.ok(!fac.some(a => /Piedra Blanca|Colmillo Sangriento|Culto del Gusano/.test(a.name)), "Sin facciones inventadas");
  // PJ pregenerados: 3 / 2+2 / 1+1 (pág. 90) y capacidad principal del libro; manadas: 1 primaria 2d + 2 secundarias 1d (pág. 194)
  const puntos = a => Object.values(a.system.attributes).flatMap(at => Object.values(at.skills).map(sk => sk.value)).filter(v => v > 0).sort().join(",");
  for (const pj of facciones.filter(a => a.type === "character")) assert.equal(puntos(pj), "1,1,2,2,3", `Reparto de acciones de ${pj.name}`);
  for (const m of facciones.filter(a => a.type === "minion_pack")) assert.equal(puntos(m), "1,1,2", `Acciones de ${m.name}`);
  assert.ok(facciones.find(a => a.name.startsWith("Ulrot")).items.some(i => i.type === "specialability" && i.name === "Cólera"));
  assert.equal(equipo.filter(e => e.flags?.["mr-wicked-ones-es"]?.categoria === "objeto").length, 108, "Los 108 objetos de «Objetos al azar» (pág. 358)");
  for (const cat of ["mejunje", "artilugio", "pocion", "reliquia"]) assert.equal(equipo.filter(e => e.flags?.["mr-wicked-ones-es"]?.categoria === cat).length, 36, `36 ${cat}s del manual`);
  assert.ok(equipo.some(e => e.name === "Mejunje [11] · Vara luminosa") && equipo.some(e => e.name === "Artilugio [11] · Encendedor") && equipo.some(e => e.name === "Poción [11] · Pez globo") && equipo.some(e => e.name === "Objeto mágico [11] · Bolsa de la suerte"));
  assert.ok(!equipo.some(e => /Ácido corrosivo|Alas planeadoras|Arma de mano brutal|Arma a dos manos colosal/.test(e.name)), "Sin objetos inventados");
  assert.equal(aventureros.length, 66, "Debe incluir los 30 aventureros y los 36 ayudantes");
  assert.ok(facciones.length >= 74, "Facciones, PJ, manadas, mazmorra y grupos");
  assert.equal(tablas.length, 49, "Las 49 tablas aleatorias del manual");
  const tabla = clave => tablas.find(t => t.flags?.["mr-wicked-ones-es"]?.clave === clave);
  for (const t of tablas) {
    const max = Math.max(...t.results.map(r => r.range[1]));
    const caras = { "1d36": 36, "2d6kh": 6 }[t.formula] ?? Number(t.formula.replace("1d", ""));
    assert.equal(max, caras, `La fórmula de «${t.name}» cubre todas sus filas`);
  }
  assert.equal(tabla("desastre-aleatorio").results.length, 6);
  assert.equal(tabla("mejunjes").results[0].text, "[11] Vara luminosa: Ilumina una zona como si fuera una antorcha, pero la luz es de un color aleatorio.");
  assert.equal(tabla("objetos-magicos").results[0].text.slice(0, 23), "[11] Bolsa de la suerte");
  assert.equal(tabla("semilla-1").results[0].text, "[11] Recuerdo");
  assert.equal(manual.length, 10, "Debe incluir los 10 diarios multipágina del manual y campaña");
  assert.equal(aventura.length, 1, "Debe incluir el documento Adventure completo");

  // Verificar que todos los _id tienen exactamente 16 caracteres alfanuméricos
  for (const doc of [...labores, ...equipo, ...aventureros, ...facciones, ...tablas, ...manual, ...aventura]) {
    assert.match(doc._id, /^[0-9A-Za-z]{16}$/, `ID inválido: ${doc._id}`);
  }

  // Verificar regla de la casa CSS: no tocar font-family, font ni all en selectores globales prohibidos
  for (const archivoCss of ["styles/mr-wicked-ones.css", "styles/oscuro.css"]) {
    const css = await fs.readFile(archivoCss, "utf8");
    assert.doesNotMatch(css, /^\s*(\*|i|\.window-header)\s*\{[^}]*\b(font-family|font|all)\s*:/m);
  }
});

test("Estrés: se despeja, se limita a 6 y al llenarse se desata (feral)", () => {
  assert.deepEqual(aplicarEstres(2, 1), { nuevo: 3, feral: false, aplicado: 1 });
  assert.deepEqual(aplicarEstres(4, 3), { nuevo: 6, feral: true, aplicado: 2 });
  assert.deepEqual(aplicarEstres(1, -1), { nuevo: 0, feral: false, aplicado: -1 });
  assert.equal(aplicarEstres(0, -1).nuevo, 0);
});

test("EXP de práctica: tres marcas suben la acción sin puntos a 1, también tirando 0d (pág. 80)", async () => {
  assert.deepEqual(progresoPractica(0, 0), { valor: 0, practica: 1, sube: false });
  assert.deepEqual(progresoPractica(0, 2), { valor: 1, practica: 0, sube: true });
  assert.deepEqual(progresoPractica(2, 1), { valor: 2, practica: 1, sube: false });
  // las tarjetas nativas del sistema marcan práctica aunque la tirada sea de 0d
  const auto = await fs.readFile("js/automatismos.mjs", "utf8");
  assert.doesNotMatch(auto, /hab\.valor === 0 && !t\.cero/);
  assert.match(auto, /if \(hab\.valor === 0\)/);
  // la resistencia se tira con UNA acción (pág. 50), no sumando acciones con puntos de un atributo
  const tiradas = await fs.readFile("js/tiradas.mjs", "utf8");
  assert.doesNotMatch(tiradas, /for \(const sk of Object\.values\(skills\)\)/);
  assert.match(tiradas, /abrirTirada\(actor, \{ tipo: "resistencia" \}\)/);
  // resistirse a la muerte cuesta estrés: ya no se salta el cálculo con «!mortal»
  const tirada = await fs.readFile("js/tirada.mjs", "utf8");
  assert.doesNotMatch(tirada, /tipo === "resistencia" && !mortal/);
});

test("Probabilidades de la reserva de dados suman 1 y coinciden con casos conocidos", () => {
  for (const d of [0, 1, 2, 3, 4, 6]) {
    const p = probabilidades(d);
    assert.ok(Math.abs(p.critical + p.success + p.mixed + p.failure - 1) < 1e-9, `suma ${d}d`);
  }
  const u = probabilidades(1);
  assert.equal(u.critical, 0);
  assert.ok(Math.abs(u.success - 1 / 6) < 1e-9 && Math.abs(u.mixed - 2 / 6) < 1e-9 && Math.abs(u.failure - 0.5) < 1e-9);
  assert.ok(Math.abs(probabilidades(2).critical - 1 / 36) < 1e-9);
  assert.equal(probabilidades(0).critical, 0);
});

test("Libretos del manual: 9 vocaciones y 6 razas completas", async () => {
  const d = JSON.parse(await fs.readFile(new URL("../content/libretos.json", import.meta.url), "utf8"));
  assert.equal(d.vocaciones.length, 9);
  for (const v of d.vocaciones) {
    assert.ok(v.nombre && v.principal?.nombre && v.principal.texto.length > 30, `principal de ${v.nombre}`);
    assert.ok(v.intro.length > 60, `intro de ${v.nombre}`);
    assert.ok(v.flashback.startsWith("En tus flashbacks"), `flashback de ${v.nombre}`);
    assert.ok(v.objetos.length >= 10, `objetos de ${v.nombre}`);
  }
  assert.equal(d.razas.length, 6);
  for (const r of d.razas) assert.ok(r.texto.length > 60 && r.nombres.length >= 10 && r.dice.length >= 2, `raza ${r.nombre}`);
});

test("Estructura del módulo: estilos, módulos JS, plantillas y versiones coherentes", async () => {
  const raiz = new URL("../", import.meta.url);
  const m = JSON.parse(await fs.readFile(new URL("module.json", raiz), "utf8"));
  const pkg = JSON.parse(await fs.readFile(new URL("package.json", raiz), "utf8"));
  assert.equal(m.version, pkg.version);
  for (const f of [...m.styles, ...m.esmodules, "templates/personaje.hbs", "templates/capacidad.hbs", "templates/capacidad-compacta.hbs", "js/selector.mjs", "js/creador.mjs", "js/dados.mjs", "js/ayuda.mjs", "js/heridas.mjs", "js/experiencia.mjs", "js/marcadores.mjs", "js/core/marcadores.mjs", "js/mazmorra.mjs", "js/core/mazmorra.mjs", "assets/wicked-isometric/terrain/earth_iso.webp", "assets/dados/d6-6.png", ...["esbirros", "mazmorra", "faccion", "faccion-ua", "grupo", "panel-dj", "conquista", "reloj"].map(x => `templates/${x}.hbs`), "js/hojas-base.mjs", "js/hojas-actores.mjs", "content/libretos.json", "tours/director.json", "tours/jugadores.json"]) {
    await fs.access(new URL(f, raiz));
  }
  for (const tour of ["director", "jugadores"]) {
    const j = JSON.parse(await fs.readFile(new URL(`tours/${tour}.json`, raiz), "utf8"));
    assert.ok(j.steps.length >= 7 && j.steps.every(s => s.id && s.content), `tour ${tour}`);
  }
});

test("Marcadores: relojes, avisos con frase, hitos públicos y fusión por id (compatibles con MR- Dirección)", () => {
  assert.equal(clockAfterClick(2, 2, 6), 3);      // sube hasta la casilla pulsada
  assert.equal(clockAfterClick(3, 2, 6), 2);      // pulsar la última llena, baja
  assert.deepEqual(clockState([{ id: "a", segments: 4 }], { a: 9 }), { a: 4 });
  const c = { id: "a", label: "Alarma", segments: 4, announce: true, phrases: ["Uno", "Dos", "Tres", "Cuatro"] };
  assert.equal(clockEvent(c, 1, 2, { now: 1 }).phrase, "Dos");
  assert.equal(clockEvent(c, 2, 1), null);        // solo avisa al subir
  assert.equal(clockEvent({ ...c, announce: false }, 0, 1), null);
  assert.equal(clockEvent({ ...c, announce: false }, 0, 1, { phrase: "Propia", force: true }).phrase, "Propia");
  assert.equal(phraseFor(["Siempre"], 3), "Siempre");
  assert.deepEqual(publicMilestones([{ id: "x" }, { id: "y", public: false }]).map(h => h.id), ["x"]);
  assert.deepEqual(publicClocks([{ id: "x", public: true }, { id: "y" }]).map(h => h.id), ["x"]);
  const m = normalizarMarcadores({ milestones: [{ id: "h1" }, { id: "h1", label: "dup" }, null], clocks: [{ id: "r", segments: 99, phrases: "a\nb" }] });
  assert.equal(m.milestones.length, 1);
  assert.equal(m.clocks[0].segments, 12);
  assert.deepEqual(m.clocks[0].phrases, ["a", "b"]);
  assert.deepEqual(unirPorId([{ id: "a", v: 1 }], [{ id: "a", v: 2 }, { id: "b", v: 3 }]), [{ id: "a", v: 2 }, { id: "b", v: 3 }]);
  assert.deepEqual(milestonesProgress([{ id: "a" }, { id: "b" }], { a: true }), { done: 1, total: 2 });
});

test("Constructor de mazmorras: excavar, salas que se ajustan, puertas, muros de Foundry", () => {
  const m = crearMapa(20, 14);
  assert.equal(celda(m, 0, 0), "#");
  assert.equal(excavar(m, 0, 0), false);            // la roca base no se excava
  assert.equal(excavar(m, 5, 5), true);
  assert.equal(rellenar(m, 5, 5), true);
  // un túnel de 3 celdas: muros por todos los lados (2 largos arriba/abajo + 2 tapas)
  for (const x of [3, 4, 5]) excavar(m, x, 3);
  const w = muros(m);
  assert.equal(w.length, 4);
  assert.ok(w.every(s => !s.puerta));
  // una forja marcada de 3×3 se ajusta sola a su mínimo (4×3) hacia la derecha y abajo
  const r = construirSala(m, { x: 6, y: 2, w: 3, h: 3 }, "forja");
  assert.ok(r.ok && r.ajustada);
  assert.deepEqual(r.rect, { x: 6, y: 2, w: 4, h: 3 });
  // una sala marcada encima de otra no la pisa: se queda con lo que está libre (si llega al mínimo de celdas)
  const encima = construirSala(structuredClone(m), { x: 7, y: 3, w: 4, h: 3 }, "templo");
  assert.ok(encima.ok);
  const ocupadas = new Set(celdasDe(m.salas[0]).map(c => c.join(",")));
  const mm = structuredClone(m); const e2 = construirSala(mm, { x: 7, y: 3, w: 4, h: 3 }, "templo");
  assert.ok(celdasDe(mm.salas.find(s => s.id === e2.id)).every(c => !ocupadas.has(c.join(","))));
  const borde = structuredClone(m), rb = construirSala(borde, { x: 0, y: 0, w: 2, h: 2 }, "templo");   // y la roca base no se toca: se recorta
  assert.ok(rb.ok && celdasDe(borde.salas.at(-1)).every(([i, j]) => i >= 1 && j >= 1));
  const p = alternarPuerta(m, 5, 3, "e");
  assert.ok(p.ok && p.puesta);
  assert.equal(muros(m).filter(s => s.puerta).length, 1);
  assert.equal(alternarPuerta(m, 3, 3, "e").ok, false);                                // túnel con túnel: sin puerta
  assert.equal(alternarPuerta(m, 5, 3, "e").puesta, false);                             // se quita
  assert.ok(quitarSala(m, r.id));
  assert.equal(resumen(m).salas, 0);
  // un clic suelto (1×1) crea la sala mínima; si no hay sitio, avisa
  const n = crearMapa(8, 8);
  const unaCelda = construirSala(n, { x: 6, y: 6, w: 1, h: 1 }, "santuario");
  assert.ok(unaCelda.ok && unaCelda.rect.w === 3 && unaCelda.rect.h === 3);             // crece hacia la izquierda/arriba porque a la derecha está la roca
  assert.equal(construirSala(crearMapa(4, 4), { x: 1, y: 1, w: 1, h: 1 }, "templo").ok, false);
  assert.ok(cabe("templo", 3, 4) && cabe("templo", 4, 3) && !cabe("templo", 3, 3));
  assert.equal(ajustarSala(crearMapa(10, 10), { x: 2, y: 2, w: 6, h: 6 }, "templo").ajustada, false);
});

test("Constructor: la decoración se orienta hacia la puerta y cambia con el tamaño", () => {
  const sala = (w, h, tipo = "santuario") => ({ x: 5, y: 5, w, h, tipo });
  const cuenta = (e, t) => e.filter(z => z.tipo === t).length;
  const sinPuerta = (w, h, tipo) => decorar(sala(w, h, tipo));
  assert.equal(sinPuerta(3, 3)[0].tipo, "emblema");
  assert.equal(cuenta(sinPuerta(3, 3), "brasero"), 4);
  assert.equal(cuenta(sinPuerta(3, 3), "pilar"), 0);
  assert.ok(cuenta(sinPuerta(6, 5), "pilar") > 0);
  assert.equal(cuenta(sinPuerta(8, 8), "estatua"), 2);
  assert.equal(cuenta(sinPuerta(4, 3), "pilar"), 0);   // 12 celdas: aún no es grande
  // la alfombra sigue el eje de la entrada: puerta al sur → vertical; puerta al oeste → horizontal
  const alf = (puertas, w, h) => decorar(sala(w, h), puertas).filter(e => e.tipo === "alfombra");
  const sur = alf([{ x: 7, y: 8, d: "n" }], 5, 5), oeste = alf([{ x: 5, y: 7, d: "w" }], 7, 5);
  assert.ok(sur.length && sur.every(e => e.eje === "v" && e.w === 1));
  assert.ok(oeste.length && oeste.every(e => e.eje === "h" && e.h === 1));
  // sin puerta, una sala más ancha que alta se alarga en horizontal y una más alta que ancha en vertical
  assert.ok(decorar(sala(9, 4)).filter(e => e.tipo === "alfombra").every(e => e.eje === "h"));
  assert.ok(decorar(sala(4, 9)).filter(e => e.tipo === "alfombra").every(e => e.eje === "v"));
  // el trono queda en el muro opuesto a la puerta, y la entrada nunca se tapa con muebles
  const conPuerta = decorar(sala(5, 5), [{ x: 7, y: 5, d: "n" }]);   // puerta en el borde norte
  const trono = conPuerta.find(e => e.tipo === "trono");
  assert.equal(Math.floor(trono.y), 9);
  assert.ok(!conPuerta.some(e => !["emblema", "alfombra", "antorcha"].includes(e.tipo) && Math.floor(e.x) === 7 && Math.floor(e.y) === 5));
  assert.deepEqual(entradasDe(sala(5, 5), [{ x: 7, y: 5, d: "n" }]), [{ x: 7, y: 5, lado: "n" }]);
  // cada tipo se compone con sus piezas
  const tiene = (tipo, w, h, t) => cuenta(decorar(sala(w, h, tipo)), t) > 0;
  assert.ok(tiene("forja", 5, 4, "yunque") && tiene("forja", 5, 4, "horno"));
  assert.ok(tiene("templo", 5, 4, "altar") && tiene("tesoro", 3, 3, "cofre") && tiene("prision", 5, 3, "jaula") && tiene("guarida", 4, 4, "jergon"));
  // el tesoro acumula más oro cuanto mayor es el nivel de la mazmorra
  assert.ok(cuenta(decorar(sala(5, 5, "tesoro"), [], { nivel: 4 }), "oro") > cuenta(decorar(sala(5, 5, "tesoro"), [], { nivel: 0 }), "oro"));
  // luces: 2×2 normal no, 2×2 importante sí; 3×3 con braseros; los hornos de la forja también alumbran
  assert.equal(lucesDe({ x: 1, y: 1, w: 2, h: 2, tipo: "enclave" }).length, 1);   // toda sala lleva su luz, aunque sea un candil
  assert.equal(lucesDe({ x: 1, y: 1, w: 2, h: 2, tipo: "santuario" }).length, 1);
  assert.equal(lucesDe(sala(3, 3)).length, 5);
  assert.ok(lucesDe(sala(10, 10))[0].dim <= 10 && lucesDe(sala(3, 3))[0].dim === 4);
  assert.ok(lucesDe(sala(5, 4, "forja")).some(l => l.tipo === "horno"));
});

test("Constructor: antorchas de pasillo según la orientación", () => {
  const m = crearMapa(20, 14);
  for (let x = 2; x <= 12; x++) excavar(m, x, 3);          // pasillo horizontal de 11 celdas
  for (let y = 6; y <= 12; y++) excavar(m, 15, y);         // pasillo vertical de 7 celdas
  const t = antorchasTunel(m);
  const h = t.filter(a => a.eje === "h"), v = t.filter(a => a.eje === "v");
  assert.ok(h.length >= 2 && h.every(a => a.lado === "n" && a.y === 3.5));
  assert.ok(v.length >= 1 && v.every(a => (a.lado === "w" || a.lado === "e") && a.x === 15.5));
  assert.ok(new Set(v.map(a => a.lado)).size >= 1);
  assert.equal(lucesTunel(m).length, t.length);
  const corto = crearMapa(10, 10); excavar(corto, 4, 4); excavar(corto, 5, 4);
  const cortas = antorchasTunel(corto);
  assert.ok(cortas.length === 1 && cortas[0].relleno);       // un tramo corto lleva una sola antorcha de relleno, para que no quede a oscuras
});

test("Constructor: reglas de obra (acciones de descanso, relojes de proyecto, temática y materiales)", () => {
  // pág. 238: nivel 1 = una tirada; nivel 2 = reloj de 4; nivel 3 = reloj de 8; base sin coste
  assert.equal(costeSala("santuario"), 0);
  assert.equal(costeSala("menor"), 1);
  assert.equal(costeSala("prision"), 0); assert.equal(relojSala("prision"), 4);
  assert.equal(costeSala("forja"), 0); assert.equal(relojSala("forja"), 8);
  assert.equal(relojSala("menor"), 0);
  assert.deepEqual(AVANCE_RESULTADO, { failure: 0, mixed: 1, success: 2, critical: 3 });
  assert.equal(costeExcavar(0), 0); assert.equal(costeExcavar(8), 1); assert.equal(costeExcavar(9), 2);
  for (const k of ["tortura", "escalera", "guardia", "guarida", "prision"]) assert.equal(TIPOS_SALA[k].nivel, 2, `${k} es de nivel 2`);
  for (const k of ["enclave", "escondrijo", "forja", "fortaleza", "templo"]) assert.equal(TIPOS_SALA[k].salas.length, 7, `${k}: 7 salas de nivel 3`);
  const m = crearMapa(30, 20);
  assert.equal(m.obra.total, 3);
  assert.ok(puedeGastar(m, 3).ok && !puedeGastar(m, 4).ok);
  gastar(m, 2);
  assert.equal(puedeGastar(m, 2).ok, false);
  assert.ok(/te quedan 1/.test(puedeGastar(m, 2).motivo));
  m.obra.creditos = 3;   // acciones concedidas por el DJ: no caducan y se gastan después de las de la fase
  assert.equal(quedanObra(m), 4);
  gastar(m, 3);
  assert.deepEqual([m.obra.gastadas, m.obra.creditos, quedanObra(m)], [3, 1, 1]);
  assert.ok(esProyectoDeObra("Excavar el pasillo norte") && esProyectoDeObra("Construir una prisión") && !esProyectoDeObra("Elaborar una poción"));
  m.obra.creditos = 0; m.obra.gastadas = 2;
  // una sala de nivel 2 en obras: reloj de 4, sin luz ni mobiliario hasta llenarlo
  const ob = construirSala(m, { x: 20, y: 10, w: 3, h: 3 }, "prision", { obra: true, nombre: "" });
  assert.equal(ob.obra, 4);
  const sala = m.salas.find(s => s.id === ob.id);
  assert.ok(enObra(sala) && lucesDe(sala).length === 0);
  assert.equal(obrasEnCurso(m).length, 1);
  assert.ok(avanzarObra(m, "sala", ob.id, AVANCE_RESULTADO.success).ok && sala.obra.hecho === 2);
  assert.ok(avanzarObra(m, "sala", ob.id, AVANCE_RESULTADO.mixed).ok && sala.obra.hecho === 3);
  const fin = avanzarObra(m, "sala", ob.id, AVANCE_RESULTADO.critical);
  assert.ok(fin.completa && sala.obra.hecho === 4 && !enObra(sala) && lucesDe(sala).length > 0);
  assert.equal(avanzarObra(m, "sala", ob.id, 1).ok, false);   // ya terminada
  quitarSala(m, ob.id);
  // una trampa de nivel 3 también es un proyecto (reloj de 8)
  excavar(m, 25, 5);
  assert.equal(ponerTrampa(m, { x: 25, y: 5, mecanismo: "Roca", nivel: 3, obra: true }).obra, 8);
  // única: solo un santuario
  assert.ok(construirSala(m, { x: 2, y: 2, w: 3, h: 3 }, "santuario").ok);
  assert.equal(reglasSala(m, "santuario").ok, false);
  // nivel 3: de la temática sí (con materiales), de otra solo una
  const ctx = { tema: "forja", materiales: { forja: true, templo: true, fortaleza: true, enclave: false } };
  assert.ok(reglasSala(m, "forja", ctx).ok);
  assert.equal(reglasSala(m, "enclave", ctx).ok, false);                    // faltan materiales
  assert.ok(reglasSala(m, "templo", ctx).ok);
  assert.ok(construirSala(m, { x: 8, y: 2, w: 4, h: 3 }, "templo").ok);
  assert.equal(reglasSala(m, "fortaleza", ctx).ok, false);                  // ya hay una de otra temática
  assert.ok(reglasSala(m, "forja", ctx).ok);
  assert.equal(tipoDeTema("Forge"), "forja"); assert.equal(tipoDeTema("Fortaleza"), "fortaleza"); assert.equal(tipoDeTema("Stronghold"), "fortaleza"); assert.equal(tipoDeTema("???"), null);
  assert.ok(Object.values(TIPOS_SALA).every(t => t.min.length === 2 && t.nombre));
});

test("Constructor: salas de cualquier forma (óvalo, L, cruz, libre) con su decoración", () => {
  assert.equal(mascara("rect", 4, 3).length, 12);
  assert.ok(mascara("ovalo", 5, 5).length < 25 && mascara("ovalo", 5, 5).length > 12);
  assert.ok(!mascara("ovalo", 5, 5).some(([u, v]) => u === 0 && v === 0));           // las esquinas del óvalo quedan fuera
  assert.equal(mascara("ele", 4, 4, 0).length, 12);                                   // 2 columnas + 2 filas solapadas
  assert.ok(mascara("cruz", 6, 6).length < 36);
  const m = crearMapa(30, 20);
  const ov = construirSala(m, { x: 4, y: 4, w: 7, h: 6 }, "templo", { forma: "ovalo" });
  assert.ok(ov.ok && ov.forma === "ovalo" && ov.celdas < 42);
  const sala = m.salas[0];
  assert.ok(contiene(sala, 7, 7) && !contiene(sala, 4, 4));                           // esquina fuera del óvalo
  assert.equal(celda(m, 4, 4), "e");                                                 // sigue siendo tierra
  const deco = decorar(sala);
  assert.ok(deco.every(e => contiene(sala, Math.floor(e.x), Math.floor(e.y)) || e.tipo === "antorcha"));   // todo cae dentro de la sala
  assert.ok(deco.some(e => e.tipo === "altar"));
  // una forma que no llega al mínimo crece sola; en L y en cruz también
  assert.ok(construirSala(m, { x: 14, y: 4, w: 3, h: 3 }, "forja", { forma: "ele", giro: 2 }).ok);
  assert.ok(construirSala(m, { x: 20, y: 4, w: 5, h: 5 }, "enclave", { forma: "cruz" }).ok);
  // libre: celdas sueltas, de una pieza y con el mínimo de celdas
  const libre = [[5, 12], [6, 12], [7, 12], [7, 13], [7, 14], [8, 14], [9, 14]];
  assert.equal(construirSala(m, null, "tesoro", { forma: "libre", celdas: [[5, 12], [6, 12], [7, 12], [9, 14]] }).ok, false);   // dos piezas
  assert.equal(construirSala(m, null, "forja", { forma: "libre", celdas: libre.slice(0, 5) }).ok, false);                      // faltan celdas (12)
  const l = construirSala(m, null, "tesoro", { forma: "libre", celdas: libre });
  assert.ok(l.ok && m.salas.at(-1).celdas.length === 7);
  assert.equal(validarCeldas(m, [[5, 12]]).ok, false);                               // ya es sala
  // muros: la sala libre tiene muros por todo su contorno
  assert.ok(muros(m).length > 8);
  // quitar una sala con forma deja túnel solo en sus celdas
  const antes = resumen(m).tunel;
  assert.ok(quitarSala(m, l.id) && resumen(m).tunel === antes + 7);
  assert.equal(celdasDe({ x: 1, y: 1, w: 2, h: 2 }).length, 4);
  assert.deepEqual(Object.keys(FORMAS), ["rect", "ovalo", "ele", "cruz", "libre"]);
  // la alfombra de una sala con forma no pisa celdas que no son de la sala
  const cr = { x: 5, y: 5, w: 7, h: 7, tipo: "templo", forma: "cruz", celdas: celdasForma({ x: 5, y: 5, w: 7, h: 7 }, "cruz") };
  assert.ok(decorar(cr).filter(e => e.tipo === "alfombra").every(e => contiene(cr, e.x, e.y)));
});

test("Constructor: trampas del manual, trucos y duendes según el nivel", () => {
  assert.equal(MECANISMOS.length, 12); assert.equal(DETONADORES.length, 12);
  const m = crearMapa(20, 14);
  excavar(m, 4, 4); excavar(m, 5, 4);
  assert.equal(ponerTrampa(m, { x: 9, y: 9, mecanismo: "Pinchos" }).ok, false);          // en roca/tierra no
  const t = ponerTrampa(m, { x: 4, y: 4, mecanismo: "Péndulo", detonador: "Placa de presión", nivel: 2 });
  assert.ok(t.ok && t.coste === 0 && m.trampas[0].tipo === "trampa" && m.trampas[0].revelada === false);   // nivel 2: se paga sobre su reloj
  assert.equal(ponerTrampa(m, { x: 4, y: 4, mecanismo: "Gas" }).ok, false);              // una por celda
  const tr = ponerTrampa(m, { x: 5, y: 4, tipo: "truco", mecanismo: "Cuerda con cascabeles", detonador: "Al pasar", intencion: "Alerta a los esbirros", nivel: 9 });
  assert.ok(tr.ok && tr.nivel === 3 && tr.coste === 0);                                  // el nivel se acota a 1-3
  assert.ok(editarTrampa(m, t.id, { nivel: 3, revelada: true, mecanismo: "Sierra" }).ok);
  assert.ok(m.trampas[0].nivel === 3 && m.trampas[0].revelada && m.trampas[0].mecanismo === "Sierra");
  assert.equal(costeTrampa(1), 1); assert.equal(costeTrampa(3), 0);
  rellenar(m, 5, 4);                                                                      // al rellenar la celda, el truco desaparece
  assert.equal(m.trampas.length, 1);
  assert.ok(quitarTrampa(m, t.id) && m.trampas.length === 0);
  // duendes: crecen con el nivel, las salas y la densidad; sin mazmorra no hay
  const v = crearMapa(30, 20);
  assert.equal(numDuendes(v, 3), 0);
  for (let x = 3; x < 20; x++) excavar(v, x, 5);
  construirSala(v, { x: 3, y: 8, w: 4, h: 4 }, "menor");
  assert.ok(numDuendes(v, 4) > numDuendes(v, 0));
  assert.ok(numDuendes(v, 2, 2) > numDuendes(v, 2, 1) && numDuendes(v, 2, 0) === 0);
  assert.ok(numDuendes(v, 4, 2) <= 40);
});

test("Constructor: ninguna sala ni túnel se queda a oscuras, y las salas se recortan en vez de fallar", () => {
  const m = crearMapa(40, 28);
  for (let x = 3; x < 36; x++) excavar(m, x, 13);
  for (let y = 5; y < 13; y++) excavar(m, 12, y);
  excavar(m, 25, 14); excavar(m, 26, 14); excavar(m, 26, 15);                 // un codo corto
  construirSala(m, { x: 8, y: 2, w: 9, h: 3 }, "santuario");
  construirSala(m, { x: 20, y: 16, w: 2, h: 2 }, "menor");                    // sala pequeña
  construirSala(m, { x: 30, y: 16, w: 5, h: 4 }, "enclave", { forma: "ovalo" });
  const focos = [...m.salas.flatMap(s => lucesDe(s, m.puertas)), ...lucesTunel(m)];
  const sinLuz = [];
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (celda(m, x, y) === "." || celda(m, x, y) === "r") if (!focos.some(l => Math.hypot(l.x - x - 0.5, l.y - y - 0.5) <= l.dim * 0.9)) sinLuz.push([x, y]);
  assert.deepEqual(sinLuz, []);
  assert.ok(m.salas.every(s => lucesDe(s, m.puertas).some(l => l.tipo === "sala")));   // toda sala lleva su luz central
  // marcar una sala encima de otra ya no falla: se queda con lo libre
  const r = construirSala(m, { x: 9, y: 2, w: 3, h: 4 }, "menor");
  assert.ok(r.ok && r.recortada);
  assert.ok(celdasDe(m.salas.at(-1)).every(([i, j]) => !contiene(m.salas[0], i, j)));
});
