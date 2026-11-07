/**
 * MR · Tutorial guiado de MR- Wicked Ones (plantilla estándar MR-: foundry.nue.Tour).
 * Dos recorridos: dirección («director») y jugadores («jugadores»). Se repiten desde Configuración → Tours
 * o desde Configuración → MR- Wicked Ones → Tutorial guiado.
 */
const MOD = "mr-wicked-ones-es";
const TOURS = [
  { clave: "director", ruta: `modules/${MOD}/tours/director.json` },
  { clave: "jugadores", ruta: `modules/${MOD}/tours/jugadores.json` }
];

const esperar = ms => new Promise(r => setTimeout(r, ms));

/** Primer personaje del mundo (o el del usuario) para enseñar la hoja. */
const personaje = () => game.user.character ?? game.actors.find(a => a.type === "character" && a.isOwner);
const abrirHoja = async () => {
  const a = personaje();
  if (!a) return;
  if (!a.sheet.rendered) await a.sheet.render(true);
  await esperar(600);
};

const cerrarTirada = () => foundry.applications.instances?.get?.("mr-wo-tirada")?.close?.();
const abrirTiradaEjemplo = async () => {
  const a = personaje();
  if (!a) return;
  game.modules.get(MOD)?.api?.abrirTirada(a, {});
  await esperar(700);
};

/**
 * Preparación de cada paso (abrir ventana, activar pestaña de la barra lateral…). Clave: `<tour>.<id del paso>`.
 * Si falla, el tour sigue y el paso sale centrado.
 */
const ANTES = {
  "director.compendios": async () => ui.sidebar?.changeTab?.("compendium", "primary"),
  "director.carpetas": async () => ui.sidebar?.changeTab?.("actors", "primary"),
  "director.escenas": async () => ui.sidebar?.changeTab?.("scenes", "primary"),
  "director.diarios": async () => ui.sidebar?.changeTab?.("journal", "primary"),
  "director.ficha": abrirHoja,
  "director.libretos": async () => { await abrirHoja(); personaje()?.sheet?._tabs?.[0]?.activate?.("libreto"); await esperar(400); },
  "director.compacta": abrirHoja,
  "director.tirada": abrirTiradaEjemplo,
  "director.chat": async () => { cerrarTirada(); ui.sidebar?.changeTab?.("chat", "primary"); },
  "director.generador": async () => { game.modules.get(MOD)?.api?.abrirGenerador(); await esperar(700); },
  "director.aspecto": async () => { await abrirHoja(); personaje()?.sheet?._tabs?.[0]?.activate?.("acciones"); },
  "jugadores.ficha": abrirHoja,
  "jugadores.estres": abrirHoja,
  "jugadores.acciones": async () => { await abrirHoja(); personaje()?.sheet?._tabs?.[0]?.activate?.("acciones"); },
  "jugadores.tirada": abrirTiradaEjemplo,
  "jugadores.libreto": async () => { cerrarTirada(); await abrirHoja(); personaje()?.sheet?._tabs?.[0]?.activate?.("libreto"); await esperar(400); },
  "jugadores.compacta": abrirHoja,
  "jugadores.chat": async () => { cerrarTirada(); ui.sidebar?.changeTab?.("chat", "primary"); },
  "jugadores.aspecto": abrirHoja
};

class TourWO extends foundry.nue.Tour {
  async _preStep() {
    await super._preStep();
    const paso = this.currentStep;
    try { await ANTES[`${this.id}.${paso.id}`]?.(); } catch (e) { console.warn(`${MOD} | tutorial: no se pudo preparar «${paso.id}»`, e); }
    // Un elemento que no existe (p. ej. aún no hay fichas) no rompe el tour: el paso sale centrado.
    if (paso.selector && !document.querySelector(paso.selector)) paso.selector = "";
  }
}

export async function registrarTutorial() {
  const idioma = game.i18n.lang?.startsWith("en") ? ".en" : "";
  for (const { clave, ruta } of TOURS) {
    try {
      let json = await fetch(ruta.replace(".json", `${idioma}.json`)).then(r => (r.ok ? r.json() : null));
      json ??= await fetch(ruta).then(r => r.json());
      game.tours.register(MOD, clave, new TourWO(json, { id: clave, namespace: MOD }));
    } catch (e) {
      console.error(`${MOD} | no se pudo registrar el tour «${clave}»`, e);
    }
  }
}

export async function empezarTutorial(clave = game.user.isGM ? "director" : "jugadores") {
  const activo = [...game.tours.values()].find(t => t.status === "in-progress");
  if (activo) await activo.exit?.();
  const tour = game.tours.get(`${MOD}.${clave}`);
  if (!tour) return ui.notifications.warn("El tutorial todavía no está disponible.");
  await tour.reset();
  return tour.start();
}

/** La primera vez se ofrece (una vez por navegador y mundo), como hace Foundry con el suyo. */
export async function ofrecerTutorial() {
  if (game.settings.get(MOD, "tutorialOfrecido")) return;
  await game.settings.set(MOD, "tutorialOfrecido", true);
  const quiere = await foundry.applications.api.DialogV2.confirm({
    window: { title: "¿Te enseño cómo funciona?", icon: "fa-solid fa-graduation-cap" },
    content: "<p>Hay un tutorial guiado de unos minutos por las hojas, las tiradas y la dirección de partida. Puedes repetirlo cuando quieras desde Configuración → Tours.</p>",
    yes: { label: "Empezar el tutorial", icon: "fa-solid fa-graduation-cap" },
    no: { label: "Ahora no", icon: "fa-solid fa-xmark" },
    rejectClose: false
  });
  if (quiere) empezarTutorial();
}
