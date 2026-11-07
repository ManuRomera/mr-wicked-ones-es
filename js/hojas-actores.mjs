/**
 * Hojas de MR- Wicked Ones para los actores que no son personajes: manada de esbirros, mazmorra, facción (y facción de la
 * Alianza Impía), grupo invasor, panel del DJ (ciclo de juego), conquista y reloj. Cada una es la hoja del sistema con una
 * plantilla propia (templates/*.hbs) y un modelo de datos que se construye aquí.
 */
import { n } from "./core/reglas.mjs";
import { nombreAccion, nombreAtributo } from "./tirada.mjs";
import { crearHoja, claseSistema, registrarHojaTipo, corazonesDe, L, pips, MOD } from "./hojas-base.mjs";

const por = (actor, t) => actor.items.contents.filter(i => i.type === t);
const casillas = (i, pares) => pares.filter(([t]) => i.system[t]).map(([t, c]) => ({ id: i.id, campo: c, texto: i.system[t], on: Boolean(i.system[c]) }));
const nombreDe = (actor, t) => por(actor, t)[0]?.name ?? "";

/* -------------------------------------------------------------------------- */
/*  Esbirros                                                                  */
/* -------------------------------------------------------------------------- */

const ACC_NORMAL = { brains: ["scan", "tinker", "trick"], muscles: ["finesse", "skulk", "smash"], guts: ["banter", "threaten", "invoke"] };
const ACC_MUERTO = { brains: ["scan", "tinker", "trick"], muscles: ["finesse", "skulk", "smash"], guts: ["horrify", "command", "invoke"] };

async function modeloEsbirros(actor) {
  const s = actor.system, muerto = s.mp_type === "undead";
  const max = n(s.attribute_max_value, 2);
  const atributos = Object.entries(muerto ? ACC_MUERTO : ACC_NORMAL).map(([a, keys]) => ({
    id: a, nombre: nombreAtributo(a), desc: L(`FITD.Skills${a}Description`, ""),
    acciones: keys.map(k => {
      const v = n(s.attributes?.[a]?.skills?.[k]?.value, 0);
      return { id: k, atrib: a, nombre: nombreAccion(k), desc: L(`FITD.Skills${k}Description`, ""), valor: v, dados: Math.max(0, v - (s.bloodied ? 1 : 0)), puntos: pips(v, max) };
    })
  }));
  const fichaMejora = i => ({
    id: i.id, nombre: i.name, desc: i.system.description ?? "", fuente: "", principal: false, externa: i.system.upgrade_type === "external",
    checks: casillas(i, [["upgrade_checkbox_text", "upgrade_checkbox_checked"], ["upgrade_checkbox_2_text", "upgrade_checkbox_2_checked"]]),
    tirada: i.system.upgrade_skill_name ? { dados: n(i.system.upgrade_skill_value, 2), nombre: L(CONFIG.WO?.rollable_skills?.[i.system.upgrade_skill_name] ?? "", i.system.upgrade_skill_name) } : null
  });
  const mejoras = por(actor, "minion_upgrade");
  const invoca = n(s.attributes?.guts?.skills?.invoke?.value, 0) > 0;
  const externas = por(actor, "specialability").map(i => ({
    id: i.id, nombre: i.name, desc: i.system.description ?? "", externa: true,
    checks: i.system.ability_type === "advanced" ? casillas(i, [["ability_checkbox_1_text", "ability_checkbox_1_checked"], ["ability_checkbox_2_text", "ability_checkbox_2_checked"]]) : []
  }));
  return {
    muerto, raza: muerto ? nombreDe(actor, "awakened_type") : nombreDe(actor, "monster_race"),
    tipo: muerto ? (s.ua_job || "") : nombreDe(actor, "minion_type"), impulso: por(actor, "minionimpulse")[0]?.name ?? "",
    numero: { valor: n(s.number?.value, 0), max: n(s.number?.max, 10), pips: pips(s.number?.value, s.number?.max ?? 10) },
    reventado: Boolean(s.bloodied), moral: Boolean(s.morale),
    atributos,
    ruta: invoca ? mejoras.filter(i => i.system.upgrade_type === "path").map(fichaMejora) : [],
    regulares: mejoras.filter(i => i.system.upgrade_type === "regular").map(fichaMejora),
    externas: [...mejoras.filter(i => i.system.upgrade_type === "external").map(fichaMejora), ...externas],
    cuenta: mejoras.length + externas.length
  };
}

/* -------------------------------------------------------------------------- */
/*  Mazmorra                                                                  */
/* -------------------------------------------------------------------------- */

async function modeloMazmorra(actor) {
  const s = actor.system;
  const tema = por(actor, "dungeon_theme")[0];
  const salas = por(actor, "tier3room").map(i => ({
    id: i.id, nombre: i.name, desc: i.system.description ?? "", requisitos: i.system.requirements ?? "", falta: Boolean(i.system.missing_materials),
    tema: i.system.theme ?? "", flexible: Boolean(tema && i.system.theme && i.system.theme !== tema.name),
    checks: casillas(i, [["room_checkbox_1_text", "room_checkbox_1_checked"], ["room_checkbox_2_text", "room_checkbox_2_checked"]])
  }));
  const campo = (k, etiqueta, pista) => ({ k, etiqueta: L(`FITD.${etiqueta}`, etiqueta), pista: L(`FITD.${pista}`, ""), valor: s[k] ?? "" });
  return {
    nivel: { valor: n(s.tier?.value, 0), max: n(s.tier?.max, 4), pips: pips(s.tier?.value, s.tier?.max ?? 4) },
    tema: tema ? {
      id: tema.id, nombre: tema.name, desc: tema.system.description ?? "", especial: tema.system.special_name ?? "", texto: tema.system.special_feature ?? "",
      checks: casillas(tema, [["theme_checkbox_1_text", "theme_checkbox_1_checked"], ["theme_checkbox_2_text", "theme_checkbox_2_checked"]])
    } : null,
    salas,
    campos: [campo("entrance", "Entrance", "EntranceHints"), campo("structure", "Structure", "StructureHints"), campo("lighting", "Lighting", "LightingHints"),
      campo("atmospherics", "Atmospherics", "AtmosphericsHints"), campo("hoard", "Hoard", "HoardHints"), campo("imps", "Imps", "ImpsHints1")],
    plan: ["One", "Two", "Three", "Four", "Five", "Six"].map((nom, i) => ({ k: `system.master_plan.step${i + 1}`, etiqueta: L(`FITD.Step${nom}`, `Paso ${i + 1}`), valor: s.master_plan?.[`step${i + 1}`] ?? "", num: i + 1 })),
    notas: s.notes ?? ""
  };
}

/* -------------------------------------------------------------------------- */
/*  Facciones                                                                 */
/* -------------------------------------------------------------------------- */

async function modeloFaccion(actor) {
  const s = actor.system;
  const reloj = k => {
    const c = s[`clock${k}`] ?? {};
    return { k, activo: n(c.max, 0) > 0, valor: n(c.value, 0), max: n(c.max, 0), texto: c.text ?? "", pips: pips(c.value, c.max), opciones: [0, 4, 6, 8].map(v => ({ v, sel: v === n(c.max, 0), t: v ? `${v} segmentos` : "Apagado" })) };
  };
  return {
    nivel: { valor: n(s.tier?.value, 0), max: n(s.tier?.max, 4), pips: pips(s.tier?.value, s.tier?.max ?? 4) },
    bando: s.category ?? "neutral",
    bandos: [["dark", "Oscuros"], ["neutral", "Neutrales"], ["light", "De la luz"]].map(([v, t]) => ({ v, t: L(`FITD.FACTION_SIDE.${v.charAt(0).toUpperCase() + v.slice(1)}`, t), sel: (s.category ?? "neutral") === v })),
    relojes: [reloj(1), reloj(2)]
  };
}

async function modeloFaccionUA(actor) {
  const s = actor.system;
  return {
    primaria: Boolean(s.is_primary),
    dominios: Object.entries(CONFIG.WO?.ua_conquest_domains ?? {}).map(([v, k]) => ({ v, t: L(k, v), sel: s.domain === v })),
    defensas: [1, 2, 3].map(i => ({ k: `system.defense${i}`, valor: s[`defense${i}`] ?? "", num: i }))
  };
}

/* -------------------------------------------------------------------------- */
/*  Grupo invasor                                                             */
/* -------------------------------------------------------------------------- */

async function modeloGrupo(actor) {
  const base = i => ({
    id: i.id, nombre: i.name, tier: n(i.system.tier, 0), corazones: corazonesDe(i), img: i.img,
    detalles: String(i.system.passive ?? "").split(/\s*\|\s*/).filter(Boolean).map(t => { const m = t.match(/^([^:]{2,16}):\s*(.*)$/s); return m ? { t: m[1], x: m[2] } : { x: t }; }),
    pos: [i.system.trait_pos_1_custom, i.system.trait_pos_2_custom].filter(Boolean), neg: [i.system.trait_neg_1_custom, i.system.trait_neg_2_custom].filter(Boolean),
    motivos: [i.system.motivation_1_custom, i.system.motivation_2_custom].filter(Boolean), usados: n(i.system.moves_used, 0)
  });
  const adv = por(actor, "adventurer");
  return {
    aventureros: adv.filter(i => i.system.adventurer_type === "adventurer").map(i => ({ ...base(i), clase: i.system.adventurer_class_custom || i.name, usos: pips(i.system.moves_used, 3) })).sort((a, b) => b.tier - a.tier),
    ayudantes: adv.filter(i => i.system.adventurer_type === "hireling").map(i => ({ ...base(i), clase: i.system.hireling_type_custom || i.name, usos: i.system.passive ? [] : pips(i.system.moves_used, 1) }))
  };
}

/* -------------------------------------------------------------------------- */
/*  Panel del DJ (ciclo de juego)                                             */
/* -------------------------------------------------------------------------- */

async function modeloDJ(actor) {
  const s = actor.system, fase = n(s.current_phase?.value, 1);
  const etapas = [["Lurking", 1], ["Calamity", 4], ["Raiding", 7], ["Blowback", 10]].map(([k, ini]) => ({
    nombre: L(`FITD.CYCLE.HEADINGS.${k}`, k), activa: fase >= ini && fase < ini + 3,
    fases: [0, 1, 2].map(d => ({ n: ini + d, nombre: L(`FITD.CYCLE.PHASE${ini + d}.Name`, `Fase ${ini + d}`), actual: fase === ini + d, hecha: fase > ini + d }))
  }));
  const pistas = [];
  for (let i = 1; i < 10; i++) { const t = L(`FITD.CYCLE.PHASE${fase}.Hint${i}`, ""); if (!t) break; pistas.push(t); }
  const invasiones = por(actor, "invasion").map((i, k) => ({ id: i.id, num: k + 1, niveles: [0, 1, 2, 3, 4].map(l => n(i.system[`adventurers_lv_${l}`], 0)), ayudantes: n(i.system.hirelings, 0) }));
  return { fase, etapas, fasePropia: { nombre: L(`FITD.CYCLE.PHASE${fase}.Name`, `Fase ${fase}`), pistas }, anterior: Math.max(1, fase - 1), siguiente: Math.min(n(s.current_phase?.max, 12), fase + 1), invasiones };
}

/* -------------------------------------------------------------------------- */
/*  Conquista (Alianza Impía)                                                 */
/* -------------------------------------------------------------------------- */

async function modeloConquista(actor) {
  const s = actor.system;
  const hab = por(actor, "conquest_ability");
  const dominios = ["horde", "horror", "corruption"].map(k => ({
    id: k, nombre: L(`FITD.UA_CONQUEST_SHEET.${k.charAt(0).toUpperCase() + k.slice(1)}`, k), valor: n(s[`${k}_value`]?.value, 1), pips: pips(s[`${k}_value`]?.value, s[`${k}_value`]?.max ?? 3),
    empoderado: Boolean(s[`${k}_empowered`]), amenazado: Boolean(s[`${k}_threatened`]), texto: s[`${k}_txt`] ?? "",
    habilidades: hab.filter(i => i.system.domain === k).map(i => ({ id: i.id, nombre: i.name, desc: i.system.description ?? "", nucleo: Boolean(i.system.is_core) }))
  }));
  return {
    dominios, sinDominio: hab.filter(i => !["horde", "horror", "corruption"].includes(i.system.domain)).map(i => ({ id: i.id, nombre: i.name, desc: i.system.description ?? "" })),
    vela: { valor: n(s.candle_progress?.value, 0), max: n(s.candle_progress?.max, 6), pips: pips(s.candle_progress?.value, s.candle_progress?.max ?? 6) },
    textos: ["theme_txt", "origin_txt", "history_txt_1", "history_txt_2", "dark_plan_txt"].map(k => ({ k: `system.${k}`, valor: s[k] ?? "", etiqueta: { theme_txt: "Temática", origin_txt: "Origen", history_txt_1: "Historia (I)", history_txt_2: "Historia (II)", dark_plan_txt: "Plan oscuro" }[k] }))
  };
}

/* -------------------------------------------------------------------------- */
/*  Reloj                                                                     */
/* -------------------------------------------------------------------------- */

const COLORES = { red: "#c4302b", blue: "#2f78c4", green: "#3d9a4a", yellow: "#d9a21b", transparent: "#8a8a8a" };

async function modeloReloj(actor) {
  const s = actor.system, total = n(s.type, 4), valor = Math.min(total, n(s.value, 0));
  const cx = 100, cy = 100, r = 88, punto = a => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  const segmentos = Array.from({ length: total }, (_, i) => {
    const a0 = (i / total) * Math.PI * 2, a1 = ((i + 1) / total) * Math.PI * 2, [x0, y0] = punto(a0), [x1, y1] = punto(a1);
    return { n: i + 1, on: i < valor, d: `M ${cx} ${cy} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z` };
  });
  return {
    total, valor, color: COLORES[s.style] ?? COLORES.red, segmentos,
    tipos: [4, 6, 8].map(v => ({ v, sel: v === total })),
    estilos: Object.keys(COLORES).map(v => ({ v, t: { transparent: "Gris", red: "Rojo", blue: "Azul", green: "Verde", yellow: "Amarillo" }[v], sel: v === s.style })),
    lleno: valor >= total, notas: s.notes ?? ""
  };
}

/* -------------------------------------------------------------------------- */
/*  Registro                                                                  */
/* -------------------------------------------------------------------------- */

const HOJAS = [
  { tipo: "minion_pack", clase: "mrg-esbirros", plantilla: "esbirros.hbs", ancho: 740, alto: 780, pestanas: { inicial: "mejoras" }, modelo: modeloEsbirros, etiqueta: "MR · Manada de esbirros" },
  { tipo: "dungeon", clase: "mrg-mazmorra", plantilla: "mazmorra.hbs", ancho: 820, alto: 780, pestanas: { inicial: "descripcion" }, modelo: modeloMazmorra, etiqueta: "MR · Mazmorra" },
  { tipo: "faction", clase: "mrg-faccion", plantilla: "faccion.hbs", ancho: 560, alto: 640, pestanas: null, modelo: modeloFaccion, etiqueta: "MR · Facción" },
  { tipo: "faction_ua", clase: "mrg-faccion", plantilla: "faccion-ua.hbs", ancho: 560, alto: 560, pestanas: null, modelo: modeloFaccionUA, etiqueta: "MR · Facción (Alianza Impía)" },
  { tipo: "party", clase: "mrg-grupo", plantilla: "grupo.hbs", ancho: 860, alto: 760, pestanas: null, modelo: modeloGrupo, etiqueta: "MR · Grupo invasor" },
  { tipo: "gm_sheet", clase: "mrg-dj", plantilla: "panel-dj.hbs", ancho: 860, alto: 760, pestanas: { inicial: "ciclo" }, modelo: modeloDJ, etiqueta: "MR · Panel del DJ" },
  { tipo: "conquest_ua", clase: "mrg-conquista", plantilla: "conquista.hbs", ancho: 820, alto: 780, pestanas: { inicial: "dominios" }, modelo: modeloConquista, etiqueta: "MR · Conquista" },
  { tipo: "clock", clase: "mrg-reloj", plantilla: "reloj.hbs", ancho: 460, alto: 600, pestanas: null, modelo: modeloReloj, etiqueta: "MR · Reloj" }
];

/** Registra las hojas MR de los actores que no son personajes (si «Estilo de las hojas» está en MR). */
export function registrarHojasActores() {
  if (game.settings.get(MOD, "estiloHojas") !== "mr") return;
  for (const h of HOJAS) {
    const Base = claseSistema(h.tipo);
    if (!Base) { console.warn(`${MOD} | sin hoja del sistema para «${h.tipo}»`); continue; }
    registrarHojaTipo(crearHoja(Base, h), [h.tipo], h.etiqueta);
  }
}
