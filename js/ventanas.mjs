/**
 * Ventanas que caben en cualquier pantalla (kit mr-pantallas). Toda ventana del módulo —fichas V1 (.mrg-hoja) y
 * ventanas ApplicationV2 (.mrg-ventana)— se escala en proporción a la pantalla (referencia 1920×950) para quedar entera
 * a la vista; si aun así no cabe, se desplaza por dentro (tope y scroll en guarida.css). El ajuste de cliente
 * «Tamaño de las ventanas» fija una escala propia en vez de la automática.
 */
import { escalaDeVentana } from "./core/ventanas.mjs";

const MOD = "mr-wicked-ones-es";
const elDe = app => app?.element?.[0] ?? app?.element;
const nuestra = app => { const el = elDe(app); return Boolean(el?.classList?.contains("mrg-ventana") || el?.classList?.contains("mrg-hoja") || el?.classList?.contains("mrg-dialogo")); };

/** Escala una ventana para que quepa en la pantalla (o con la escala elegida en Ajustes). */
export function ajustarVentana(app) {
  if (!nuestra(app) || !app.rendered || app.minimized || app._minimized) return;
  const el = elDe(app), doc = document.documentElement;
  const hotbar = parseFloat(getComputedStyle(document.body).getPropertyValue("--hotbar-height")) || 0;
  const vista = { ancho: doc.clientWidth, alto: doc.clientHeight - 1.5 * hotbar, total: doc.clientHeight };
  const primera = !app._mrEsc; app._mrEsc = true;
  const ahora = app.position ?? {};
  const pedido = app.options?.position ?? { width: app.options?.width, height: app.options?.height };
  const medida = (pide, tiene, medir) => (primera && Number.isFinite(pide) ? pide : Number.isFinite(tiene) ? tiene : medir());
  const ancho = medida(pedido.width, ahora.width, () => el.offsetWidth);
  // Alto automático: no decide la escala. Su tope se divide por la escala, así que medirlo la iba bajando en cada pintado hasta
  // dejar la letra ilegible; lo que no quepa se desplaza por dentro.
  const alto = Number.isFinite(pedido.height) ? medida(pedido.height, ahora.height, () => el.offsetHeight) : 1;
  const escala = escalaDeVentana(ancho, alto, vista, Number(game.settings.get(MOD, "escalaVentanas")) || 0);
  el.style.setProperty("--mrg-esc-ventana", String(escala));
  if (Math.abs((ahora.scale ?? 1) - escala) < 0.004) return;
  app.setPosition({ scale: escala });
  // Con escala < 1 la ventana se encoge desde su esquina: si se sale por la derecha o abajo, se recoloca.
  const r = el.getBoundingClientRect();
  const left = Math.max(0, Math.min(ahora.left ?? r.left, vista.ancho - r.width - 8));
  const top = Math.max(0, Math.min(ahora.top ?? r.top, vista.alto - r.height - 8));
  if (left !== ahora.left || top !== ahora.top) app.setPosition({ left, top });
}

let espera = 0;
export function reajustarVentanas() {
  clearTimeout(espera);
  espera = setTimeout(() => {
    for (const app of foundry.applications.instances.values()) ajustarVentana(app);
    for (const app of Object.values(ui.windows)) ajustarVentana(app);
  }, 150);
}

export function registrarVentanas() {
  game.settings.register(MOD, "escalaVentanas", {
    name: "Tamaño de las ventanas (%)",
    hint: "0 = automático: fichas y ventanas del módulo se ven igual de grandes en cualquier pantalla y siempre caben enteras. Otro valor fija esa escala. Ajuste de este navegador.",
    scope: "client", config: true, type: Number, default: 0, range: { min: 0, max: 150, step: 5 }, onChange: reajustarVentanas
  });
  const cuando = app => requestAnimationFrame(() => ajustarVentana(app));
  Hooks.on("renderApplicationV2", cuando);
  // Fichas V1 (heredan de las del sistema). En v13 su cadena de hooks termina en ActorSheet/ItemSheet: no llega a renderApplication.
  for (const h of ["renderActorSheet", "renderItemSheet"]) Hooks.on(h, cuando);
  window.addEventListener("resize", reajustarVentanas);
}
