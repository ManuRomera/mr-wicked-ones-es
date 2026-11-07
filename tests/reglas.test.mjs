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
  simularIncursionEsbirros
} from "../js/core/reglas.mjs";

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

  const muerteParcial = evaluarResistencia("deadly", "mixed");
  assert.equal(muerteParcial.muerte, false);
  assert.equal(muerteParcial.malherido, true);
});

test("Ciclo de partida: Implicación, Desastre, Represalia, Defensas e Incursión de Esbirros", () => {
  assert.equal(evaluarImplicacion([6], 1).posicionInicial, "dominant");
  assert.equal(evaluarImplicacion([4], 1).posicionInicial, "default");
  assert.equal(evaluarImplicacion([2], 1).posicionInicial, "dire");

  assert.equal(evaluarDesastre([6, 2], 2).avanceRelojes, 2);
  assert.equal(evaluarDesastre([4], 1).avanceRelojes, 1);
  assert.equal(evaluarDesastre([2], 1).avanceRelojes, 0);

  assert.equal(evaluarRepresalia([6, 6], 2).segmentosFaccion, 3);
  assert.equal(evaluarRepresalia([6, 1], 2).segmentosFaccion, 2);
  assert.equal(evaluarRepresalia([5, 2], 2).segmentosFaccion, 1);
  assert.equal(evaluarRepresalia([1, 3], 2).segmentosFaccion, 0);

  const criatura = evaluarDefensaMazmorra("creature", [6, 6], 2);
  assert.equal(criatura.corazonesInfligidos, 3);

  const porton = evaluarDefensaMazmorra("lock", [6], 1);
  assert.equal(porton.movimientosConsumidos, 2);

  const esbirros = simularIncursionEsbirros([6, 6], 2);
  assert.equal(esbirros.botinOro, 1);
  assert.equal(esbirros.suministros, 2);
  assert.equal(esbirros.malheridos, false);
});

test("Integridad de datos generados y cumplimiento de reglas CSS de la casa MR-", async () => {
  const labores = JSON.parse(await fs.readFile("_data/labores-es.json", "utf8"));
  const equipo = JSON.parse(await fs.readFile("_data/equipo-es.json", "utf8"));
  const aventureros = JSON.parse(await fs.readFile("_data/aventureros-es.json", "utf8"));
  const facciones = JSON.parse(await fs.readFile("_data/facciones-es.json", "utf8"));
  const tablas = JSON.parse(await fs.readFile("_data/tablas-es.json", "utf8"));
  const manual = JSON.parse(await fs.readFile("_data/manual-es.json", "utf8"));
  const aventura = JSON.parse(await fs.readFile("_data/aventura-es.json", "utf8"));

  assert.ok(labores.length >= 120, "Debe incluir todas las salas N1/N2, trampas, trucos, portones, criaturas y hallazgos");
  assert.ok(equipo.length >= 160, "Debe incluir armas, suministros y los 36x4 mejunjes/artilugios/pociones/reliquias");
  assert.equal(aventureros.length, 66, "Debe incluir los 30 aventureros y los 36 ayudantes");
  assert.ok(facciones.length >= 60, "Debe incluir las 48 facciones de los 4 entornos, PJs, manadas, mazmorra y grupos");
  assert.equal(tablas.length, 16, "Debe incluir las 16 tablas de incursión, invasión, oráculos y solitario");
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

test("EXP de práctica: tres marcas suben la acción sin puntos a 1", () => {
  assert.deepEqual(progresoPractica(0, 0), { valor: 0, practica: 1, sube: false });
  assert.deepEqual(progresoPractica(0, 2), { valor: 1, practica: 0, sube: true });
  assert.deepEqual(progresoPractica(2, 1), { valor: 2, practica: 1, sube: false });
});
