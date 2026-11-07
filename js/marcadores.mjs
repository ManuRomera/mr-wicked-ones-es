/**
 * Control nativo de hitos y relojes de la campaña. Funciona solo, sin MR- Dirección: una píldora arrastrable abre un panel
 * con todos los marcadores (el DJ los ve todos y puede avanzarlos; la mesa solo ve lo público) y una ventana permite
 * añadir, editar y quitar los propios. Trae lo último de MR- Dirección: hitos públicos o secretos, relojes públicos u
 * ocultos, aviso a la mesa al avanzar un reloj con una frase de sabor por casilla (o propia con Mayús + clic).
 *
 * Con MR- Dirección activo, este control sustituye al suyo (se oculta su píldora) pero se nutre de sus datos: lee y escribe
 * sus ajustes `global` (definiciones) y `markerState` (progreso), de modo que ambos módulos siempre ven lo mismo y los
 * avisos de reloj los sigue emitiendo MR- Dirección.
 */
import {
  milestonesState, milestonesProgress, clockState, clockAfterClick, clockEvent, publicMilestones, publicClocks,
  normalizarMarcadores, normalizarFrases, unirPorId
} from "./core/marcadores.mjs";

const MOD = "mr-wicked-ones-es";
const DIR = "mr-direccion";
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const App = foundry.applications?.api?.ApplicationV2;

let base = { milestones: [], clocks: [] };   // los de la campaña (content/direccion-es.json)
let pastilla = null, panel = null;

const dirActivo = () => Boolean(game.modules.get(DIR)?.active);
const activo = () => { try { return game.settings.get(MOD, "marcadoresPropios") !== false; } catch { return true; } };

/* ------------------------------------------------------------------------------------------------------ datos */

const propias = () => normalizarMarcadores(game.settings.get(MOD, "marcadoresDef"));
const ajusteEstado = () => (dirActivo() ? [DIR, "markerState"] : [MOD, "marcadoresEstado"]);
const estado = () => game.settings.get(...ajusteEstado()) ?? {};

function defsDireccion() {
  try { return normalizarMarcadores(game.modules.get(DIR).api.globalSettings().markers); } catch { return { milestones: [], clocks: [] }; }
}

/** Definiciones vigentes: campaña < propias < las de MR- Dirección (si está activo). */
export function definiciones() {
  const p = propias();
  let m = { milestones: unirPorId(base.milestones, p.milestones), clocks: unirPorId(base.clocks, p.clocks) };
  if (dirActivo()) { const d = defsDireccion(); m = { milestones: unirPorId(m.milestones, d.milestones), clocks: unirPorId(m.clocks, d.clocks) }; }
  const q = quitados();
  return { milestones: m.milestones.filter(x => !q.includes(x.id)), clocks: m.clocks.filter(x => !q.includes(x.id)) };
}

/** Ids quitados por el DJ (también valen para lo que trae la campaña, que así deja de verse sin borrarse del módulo). */
const quitados = () => { const q = game.settings.get(MOD, "marcadoresQuitados"); return Array.isArray(q) ? q : []; };

async function parchear(clave, id, valor, evento = null) {
  const cur = estado();
  const sig = { ...cur, milestones: { ...cur.milestones }, clocks: { ...cur.clocks } };
  sig[clave][id] = valor;
  if (evento) sig.event = evento;
  await game.settings.set(...ajusteEstado(), sig);
  Hooks.callAll("mrWoMarcador", clave === "milestones" ? "milestone" : "clock", id, valor);
}

export const alternarHito = id => parchear("milestones", id, !estado().milestones?.[id]);

async function pedirFrase(c) {
  return foundry.applications.api.DialogV2.prompt({
    window: { title: c.label },
    content: `<p>Escribe la frase que verá la mesa al avanzar este reloj:</p><input type="text" name="frase" autofocus placeholder="Algo en el pasillo se mueve…">`,
    ok: { label: "Avisar", callback: (_ev, btn) => btn.form.elements.frase.value.trim() }, rejectClose: false
  });
}

/** Pulsa la casilla `i`. `preguntar`: el DJ quiere avisar con una frase propia (aunque el reloj no avise de por sí). */
export async function pulsarCasilla(id, i, { preguntar = false } = {}) {
  const c = definiciones().clocks.find(x => x.id === id);
  if (!c) return;
  const de = clockState([c], estado().clocks)[id], a = clockAfterClick(de, i, c.segments);
  let frase = null;
  if (preguntar && a > de) { frase = await pedirFrase(c); if (frase === null) return; }
  await parchear("clocks", id, a, clockEvent(c, de, a, { phrase: frase, force: preguntar }));
}

/** Guarda (o crea) la definición de un hito o un reloj donde toca: en MR- Dirección si está activo, o en este módulo. */
async function guardarDef(tipo, def) {
  const poner = m => { const i = m[tipo].findIndex(x => x.id === def.id); if (i >= 0) m[tipo][i] = def; else m[tipo].push(def); return m; };
  if (dirActivo()) {
    const g = foundry.utils.deepClone(game.settings.get(DIR, "global") ?? {});
    g.markers = poner(normalizarMarcadores(g.markers));
    await game.settings.set(DIR, "global", g);
  } else await game.settings.set(MOD, "marcadoresDef", poner(propias()));
}

async function borrarDef(tipo, id) {
  if (!quitados().includes(id)) await game.settings.set(MOD, "marcadoresQuitados", [...quitados(), id]);
  const quitar = m => { m[tipo] = m[tipo].filter(x => x.id !== id); return m; };
  await game.settings.set(MOD, "marcadoresDef", quitar(propias()));
  if (dirActivo()) {
    const g = foundry.utils.deepClone(game.settings.get(DIR, "global") ?? {});
    g.markers = quitar(normalizarMarcadores(g.markers));
    await game.settings.set(DIR, "global", g);
  }
  const cur = estado(), sig = { ...cur, milestones: { ...cur.milestones }, clocks: { ...cur.clocks } };
  delete sig[tipo][id];
  await game.settings.set(...ajusteEstado(), sig);
}

/** Alta rápida con un diálogo mínimo (desde el panel). */
async function altaRapida(tipo) {
  const reloj = tipo === "clocks";
  const campos = reloj
    ? `<label>Nombre<input type="text" name="nombre" autofocus placeholder="Alarma en el valle"></label><label>Casillas<select name="seg">${[4, 6, 8, 10, 12].map(n => `<option ${n === 6 ? "selected" : ""}>${n}</option>`).join("")}</select></label><label><input type="checkbox" name="pub"> Visible para los jugadores</label>`
    : `<label>Hito<input type="text" name="nombre" autofocus placeholder="Reclamar las cuevas"></label><label><input type="checkbox" name="pub" checked> Se revela a la mesa al lograrse</label>`;
  const r = await foundry.applications.api.DialogV2.prompt({
    window: { title: reloj ? "Nuevo reloj" : "Nuevo hito" },
    content: `<div style="display:grid;gap:.6rem">${campos}</div>`,
    ok: { label: "Añadir", callback: (_e, b) => { const f = b.form.elements; return { nombre: f.nombre.value.trim(), seg: Number(f.seg?.value ?? 6), pub: f.pub.checked }; } }, rejectClose: false
  });
  if (!r?.nombre) return;
  const id = (reloj ? "r" : "h") + Date.now().toString(36);
  await guardarDef(tipo, reloj ? { id, label: r.nombre, segments: r.seg, public: r.pub, announce: false, phrases: [] } : { id, label: r.nombre, public: r.pub });
}

async function quitarConfirmado(tipo, id) {
  const def = definiciones()[tipo].find(x => x.id === id);
  if (await foundry.applications.api.DialogV2.confirm({ window: { title: "Quitar" }, content: `<p>¿Quitar «${esc(def?.label ?? id)}»? Dejará de verse y se borra su progreso.</p>`, rejectClose: false })) await borrarDef(tipo, id);
}

async function cambiarMarca(tipo, id, cambio) {
  const def = definiciones()[tipo].find(x => x.id === id);
  if (def) await guardarDef(tipo, { ...def, ...cambio });
}

/* ---------------------------------------------------------------------------------------------------- avisos */

function toast(ev) {
  let host = document.getElementById("mr-wo-toasts");
  if (!host) { host = document.createElement("div"); host.id = "mr-wo-toasts"; host.className = "mrg"; host.setAttribute("role", "status"); host.setAttribute("aria-live", "polite"); document.body.append(host); }
  const lleno = ev.to >= ev.segments, el = document.createElement("div");
  el.className = `mrg-toast ${lleno ? "lleno" : ""}`;
  el.innerHTML = `<div class="mrg-toast-cab"><span>${lleno ? "¡Reloj completo!" : "El reloj avanza"}</span><b>${esc(ev.label)}</b><small>${ev.to}/${ev.segments}</small></div>
    <div class="mrg-toast-seg" aria-hidden="true">${Array.from({ length: ev.segments }, (_, i) => `<i class="${i < ev.to ? "on" : ""} ${i >= ev.from && i < ev.to ? "nuevo" : ""}"></i>`).join("")}</div>${ev.phrase ? `<p>${esc(ev.phrase)}</p>` : ""}`;
  host.append(el);
  const cerrar = () => { el.classList.add("sale"); setTimeout(() => el.remove(), 400); };
  el.addEventListener("click", cerrar);
  setTimeout(cerrar, 7000 + (ev.phrase?.length ?? 0) * 45);
}

/* ------------------------------------------------------------------------------------------------------- panel */

function colocarPanel() {
  if (!pastilla || !panel || panel.hidden) return;
  const x = pastilla.offsetLeft, y = pastilla.offsetTop;
  panel.style.left = `${Math.min(Math.max(8, x), Math.max(8, innerWidth - panel.offsetWidth - 8))}px`;
  panel.style.top = `${y > innerHeight / 2 ? Math.max(8, y - panel.offsetHeight - 8) : y + pastilla.offsetHeight + 8}px`;
}

function colocar() {
  if (!pastilla) return;
  const p = game.settings.get(MOD, "marcadoresPos"), w = pastilla.offsetWidth || 150, h = pastilla.offsetHeight || 36;
  pastilla.style.left = `${Math.min(Math.max(4, p?.x ?? 16), innerWidth - w - 4)}px`;
  pastilla.style.top = `${Math.min(Math.max(4, p?.y ?? innerHeight - 150), innerHeight - h - 4)}px`;
  colocarPanel();
}

export function alternarPanel(forzar) {
  if (!panel) return ui.notifications.info("Aún no hay marcadores: el DJ puede crearlos desde «Gestionar».");
  panel.hidden = forzar ?? !panel.hidden;
  pastilla?.setAttribute("aria-expanded", String(!panel.hidden));
  colocarPanel();
}

const boton = (tipo, id, clave, on, tip, icono) => `<button type="button" class="mrg-marc-mini ${on ? "on" : ""}" data-marca="${tipo}" data-id="${esc(id)}" data-clave="${clave}" aria-pressed="${on}" data-ayuda="${esc(tip)}" aria-label="${esc(tip)}"><i class="fa-solid fa-${icono}"></i></button>`;

function crearElementos() {
  pastilla = document.createElement("button"); pastilla.type = "button"; pastilla.id = "mr-wo-marc-pastilla"; pastilla.className = "mrg mrg-marc-pastilla";
  panel = document.createElement("aside"); panel.id = "mr-wo-marc-panel"; panel.className = "mrg mrg-marc-panel"; panel.hidden = true; panel.setAttribute("role", "region");
  document.body.append(pastilla, panel);
  let arrastre = null;
  pastilla.addEventListener("pointerdown", ev => { if (ev.button !== 0) return; arrastre = { x: ev.clientX, y: ev.clientY, px: pastilla.offsetLeft, py: pastilla.offsetTop, mov: false }; pastilla.setPointerCapture(ev.pointerId); });
  pastilla.addEventListener("pointermove", ev => {
    if (!arrastre) return;
    const dx = ev.clientX - arrastre.x, dy = ev.clientY - arrastre.y;
    if (!arrastre.mov && Math.hypot(dx, dy) < 5) return;
    arrastre.mov = true;
    pastilla.style.left = `${arrastre.px + dx}px`; pastilla.style.top = `${arrastre.py + dy}px`; colocarPanel();
  });
  pastilla.addEventListener("pointerup", async ev => {
    if (!arrastre) return;
    const mov = arrastre.mov; arrastre = null;
    try { pastilla.releasePointerCapture(ev.pointerId); } catch { /* ya soltado */ }
    if (mov) await game.settings.set(MOD, "marcadoresPos", { x: pastilla.offsetLeft, y: pastilla.offsetTop });
    else alternarPanel();
  });
  panel.addEventListener("click", async ev => {
    if (ev.target.closest("[data-reiniciar-pos]")) { ev.preventDefault(); await game.settings.set(MOD, "marcadoresPos", null); colocar(); return; }
    if (!game.user.isGM) return;
    if (ev.target.closest("[data-gestionar]")) return abrirMarcadores();
    const alta = ev.target.closest("[data-alta]"); if (alta) return altaRapida(alta.dataset.alta);
    const quita = ev.target.closest("[data-quitar]"); if (quita) { const [t, i] = quita.dataset.quitar.split(":"); return quitarConfirmado(t, i); }
    const fl = ev.target.closest("[data-marca]");
    if (fl) return cambiarMarca(fl.dataset.marca, fl.dataset.id, { [fl.dataset.clave]: fl.getAttribute("aria-pressed") !== "true" });
    const seg = ev.target.closest("[data-seg]");
    if (seg) return pulsarCasilla(seg.dataset.reloj, Number(seg.dataset.seg), { preguntar: ev.shiftKey });
    const li = ev.target.closest("[data-hito]");
    if (li) await alternarHito(li.dataset.hito);
  });
  panel.addEventListener("keydown", ev => { if (["Enter", " "].includes(ev.key) && ev.target.matches("[data-hito]")) { ev.preventDefault(); ev.target.click(); } });
  document.addEventListener("pointerdown", ev => { if (!panel || panel.hidden || pastilla.contains(ev.target) || panel.contains(ev.target) || ev.target.closest(".application")) return; alternarPanel(true); }, true);
}

export function pintar() {
  const gm = game.user.isGM;
  if (!activo()) { pastilla?.remove(); panel?.remove(); pastilla = panel = null; return; }
  const todas = definiciones();
  const hitos = gm ? todas.milestones : publicMilestones(todas.milestones);
  const relojes = gm ? todas.clocks : publicClocks(todas.clocks);
  if (!gm && !hitos.length && !relojes.length) { pastilla?.remove(); panel?.remove(); pastilla = panel = null; return; }

  const e = estado(), hs = milestonesState(hitos, e.milestones), pr = milestonesProgress(hitos, e.milestones), cs = clockState(relojes, e.clocks);
  if (!pastilla) crearElementos();
  pastilla.setAttribute("aria-expanded", String(!panel.hidden));
  const pct = pr.total ? Math.round(100 * pr.done / pr.total) : 0;
  pastilla.innerHTML = `<i class="fa-solid fa-flag-checkered" aria-hidden="true"></i><span>Marcadores</span>${pr.total ? `<b>${pr.done}/${pr.total}</b>` : ""}<em style="--p:${pct}%"></em>`;
  pastilla.dataset.ayuda = "Hitos y relojes||Pulsa para ver los hitos de la campaña y los relojes. Arrástrala para moverla. Alt+M la muestra u oculta.";

  const htmlRelojes = relojes.map(c => {
    const n = cs[c.id], pub = c.public === true, avisa = c.announce === true;
    const segs = Array.from({ length: c.segments }, (_, i) => gm ? `<button type="button" class="mrg-marc-seg ${i < n ? "on" : ""}" data-reloj="${esc(c.id)}" data-seg="${i}" aria-label="Casilla ${i + 1}" aria-pressed="${i < n}"></button>` : `<span class="mrg-marc-seg ${i < n ? "on" : ""}"></span>`).join("");
    const herr = gm ? `<span class="mrg-marc-herr">${boton("clocks", c.id, "public", pub, pub ? "Visible para los jugadores" : "Oculto para los jugadores", pub ? "eye" : "eye-slash")}${boton("clocks", c.id, "announce", avisa, avisa ? "Avisa a la mesa al avanzar" : "No avisa al avanzar", "bullhorn")}<button type="button" class="mrg-marc-mini" data-quitar="clocks:${esc(c.id)}" aria-label="Quitar el reloj" data-ayuda="Quitar||Quita este reloj (pide confirmación)."><i class="fa-solid fa-trash"></i></button></span>` : "";
    return `<div class="mrg-marc-reloj"><h4><span>${esc(c.label)}</span>${herr}</h4><div class="mrg-marc-fila" style="--n:${c.segments}">${segs}</div><p class="mrg-nota"><b>${n}/${c.segments}</b></p></div>`;
  }).join("");
  const itemHito = h => {
    const hecho = hs[h.id], secreto = h.public === false, rotulo = esc(hecho || gm ? h.label : "???");
    const punto = `<span class="mrg-marc-punto" aria-hidden="true">${hecho ? "✦" : "·"}</span><span>${rotulo}</span>`;
    return gm ? `<li class="${hecho ? "hecho" : ""} ${secreto ? "secreto" : ""}"><span class="mrg-marc-hito" data-hito="${esc(h.id)}" role="button" tabindex="0" aria-pressed="${!!hecho}">${punto}</span>${boton("milestones", h.id, "public", !secreto, secreto ? "Secreto: la mesa no lo ve" : "Se revela a la mesa al lograrse", secreto ? "eye-slash" : "eye")}<button type="button" class="mrg-marc-mini" data-quitar="milestones:${esc(h.id)}" aria-label="Quitar el hito" data-ayuda="Quitar||Quita este hito (pide confirmación)."><i class="fa-solid fa-trash"></i></button></li>` : `<li class="${hecho ? "hecho" : ""}">${punto}</li>`;
  };
  const mas = tipo => gm ? `<button type="button" class="mrg-marc-mini" data-alta="${tipo}" aria-label="${tipo === "clocks" ? "Añadir un reloj" : "Añadir un hito"}" data-ayuda="Añadir||${tipo === "clocks" ? "Añade un reloj nuevo." : "Añade un hito nuevo."}"><i class="fa-solid fa-plus"></i></button>` : "";
  panel.innerHTML = `${gm || relojes.length ? `<h3 class="mrg-marc-tit">Relojes ${mas("clocks")}</h3>` : ""}${gm && relojes.length ? `<p class="mrg-nota">Pulsa una casilla para avanzar el reloj. Con Mayús, avisas a la mesa con una frase propia.</p>` : ""}${htmlRelojes}
    ${hitos.length || gm ? `<h3 class="mrg-marc-tit">Hitos ${mas("milestones")}</h3>` : ""}${hitos.length ? `<p class="mrg-nota">${gm ? "Pulsa un hito para marcarlo al lograrlo. El ojo decide si la mesa lo ve." : "Los hitos que vais logrando."}</p><ol>${hitos.map(itemHito).join("")}</ol>` : ""}
    ${!hitos.length && !relojes.length ? `<p class="mrg-nota">Todavía no hay marcadores.</p>` : ""}
    ${gm ? `<button type="button" class="mrg-btn mrg-btn--suave" data-gestionar><i class="fa-solid fa-pen-ruler"></i> Gestionar hitos y relojes</button>` : ""}
    <p class="mrg-nota mrg-marc-pie">Arrastra la píldora para moverla. <a href="#" data-reiniciar-pos>Colocarla en su sitio</a></p>`;
  colocar();
}

/* -------------------------------------------------------------------------------------------------- gestor */

export class MarcadoresMR extends App {
  static DEFAULT_OPTIONS = {
    id: "mr-wo-marcadores", tag: "div", classes: ["mrg", "mrg-ventana", "mrg-marc-app"],
    window: { title: "Hitos y relojes", icon: "fa-solid fa-flag-checkered", resizable: true }, position: { width: 620, height: 720 }
  };

  async _renderHTML() {
    const d = definiciones(), e = estado();
    const hs = milestonesState(d.milestones, e.milestones), cs = clockState(d.clocks, e.clocks);
    const borra = (tipo, id) => `<button type="button" class="mrg-mini" data-borrar="${tipo}:${esc(id)}" aria-label="Quitar" data-ayuda="Quitar||Quita este marcador (pide confirmación)."><i class="fa-solid fa-trash"></i></button>`;
    const relojes = d.clocks.map(c => `<article class="mrg-marc-edit" data-tipo="clocks" data-id="${esc(c.id)}">
        <header><input type="text" data-campo="label" value="${esc(c.label)}" aria-label="Nombre del reloj"><input type="number" class="estrecho" data-campo="segments" min="2" max="12" value="${c.segments}" aria-label="Casillas" data-ayuda="Casillas||De 2 a 12.">${borra("clocks", c.id)}</header>
        <div class="mrg-marc-opts"><label><input type="checkbox" data-campo="public" ${c.public ? "checked" : ""}> Visible para los jugadores</label><label><input type="checkbox" data-campo="announce" ${c.announce ? "checked" : ""}> Avisar a la mesa al avanzar</label>
          <span class="mrg-nota">${cs[c.id]}/${c.segments}</span><button type="button" class="mrg-btn mrg-btn--suave" data-poner="${esc(c.id)}">A cero</button></div>
        <details><summary>Frases de sabor <small>(una por casilla; con una sola se usa siempre)</small></summary><textarea data-campo="phrases" rows="${Math.min(6, c.segments)}" placeholder="Alguien ha visto humo.&#10;Llegan rumores…">${esc((c.phrases ?? []).join("\n"))}</textarea></details></article>`).join("");
    const hitos = d.milestones.map(h => `<article class="mrg-marc-edit" data-tipo="milestones" data-id="${esc(h.id)}">
        <header><input type="checkbox" data-logrado ${hs[h.id] ? "checked" : ""} aria-label="Logrado" data-ayuda="Logrado||Márcalo cuando la mesa lo consiga."><input type="text" data-campo="label" value="${esc(h.label)}" aria-label="Hito">${borra("milestones", h.id)}</header>
        <div class="mrg-marc-opts"><label><input type="checkbox" data-campo="public" ${h.public !== false ? "checked" : ""}> Se revela a la mesa al lograrse (si no, es secreto)</label></div></article>`).join("");
    return `<div class="mrg-marc-v"><p class="mrg-asist-intro">Los <strong>hitos</strong> son metas de la campaña que se marcan al lograrlas; los <strong>relojes</strong> miden amenazas o proyectos que avanzan casilla a casilla. Los jugadores solo ven lo público.${dirActivo() ? " <strong>MR- Dirección está activo:</strong> se comparten sus datos." : ""}</p>
      <h3 class="mrg-seccion">Relojes <button type="button" class="mrg-btn mrg-btn--suave" data-nuevo="clocks"><i class="fa-solid fa-plus"></i> Nuevo reloj</button></h3>${relojes || `<p class="mrg-nota">Sin relojes.</p>`}
      <h3 class="mrg-seccion">Hitos <button type="button" class="mrg-btn mrg-btn--suave" data-nuevo="milestones"><i class="fa-solid fa-plus"></i> Nuevo hito</button></h3>${hitos || `<p class="mrg-nota">Sin hitos.</p>`}
      <p class="mrg-marc-pie"><button type="button" class="mrg-btn" data-reiniciar><i class="fa-solid fa-rotate-left"></i> Reiniciar todo el progreso</button>${quitados().length ? ` <button type="button" class="mrg-btn" data-recuperar><i class="fa-solid fa-clock-rotate-left"></i> Recuperar los quitados (${quitados().length})</button>` : ""}</p></div>`;
  }

  _replaceHTML(res, cont) {
    cont.innerHTML = res;
    cont.onclick = async ev => {
      const b = ev.target.closest("button"); if (!b) return;
      if (b.dataset.nuevo) {
        const id = (b.dataset.nuevo === "clocks" ? "r" : "h") + Date.now().toString(36);
        await guardarDef(b.dataset.nuevo, b.dataset.nuevo === "clocks" ? { id, label: "Nuevo reloj", segments: 6, public: false, announce: false, phrases: [] } : { id, label: "Nuevo hito", public: true });
        return this.render();
      }
      if (b.dataset.borrar) {
        const [tipo, id] = b.dataset.borrar.split(":");
        if (await foundry.applications.api.DialogV2.confirm({ window: { title: "Quitar" }, content: "<p>¿Quitar este marcador? Dejará de verse y se borra su progreso (puedes recuperarlo desde esta ventana).</p>", rejectClose: false })) { await borrarDef(tipo, id); this.render(); }
        return;
      }
      if ("recuperar" in b.dataset) { await game.settings.set(MOD, "marcadoresQuitados", []); return this.render(); }
      if (b.dataset.poner) { await parchear("clocks", b.dataset.poner, 0); return this.render(); }
      if ("reiniciar" in b.dataset) {
        if (await foundry.applications.api.DialogV2.confirm({ window: { title: "Reiniciar" }, content: "<p>Se vacían todos los relojes y se desmarcan todos los hitos. ¿Seguir?</p>", rejectClose: false })) { await game.settings.set(...ajusteEstado(), { milestones: {}, clocks: {} }); this.render(); }
      }
    };
    cont.onchange = async ev => {
      const el = ev.target, art = el.closest("[data-tipo]"); if (!art) return;
      const tipo = art.dataset.tipo, id = art.dataset.id;
      if ("logrado" in el.dataset) { await parchear("milestones", id, el.checked); return this.render(); }
      const campo = el.dataset.campo; if (!campo) return;
      const def = definiciones()[tipo].find(x => x.id === id); if (!def) return;
      let valor = el.type === "checkbox" ? el.checked : el.value;
      if (campo === "phrases") valor = normalizarFrases(valor);
      if (campo === "segments") valor = Math.min(12, Math.max(2, Math.round(Number(valor)) || 6));
      if (campo === "label" && !String(valor).trim()) return this.render();
      await guardarDef(tipo, { ...def, [campo]: typeof valor === "string" && campo !== "phrases" ? valor.trim() : valor });
      this.render();
    };
  }
}

export function abrirMarcadores() {
  if (!game.user.isGM) return ui.notifications.warn("Solo el DJ puede gestionar los marcadores.");
  const prev = foundry.applications.instances?.get?.("mr-wo-marcadores");
  if (prev) { prev.render(true); return prev; }
  const app = new MarcadoresMR(); app.render(true); return app;
}

/* -------------------------------------------------------------------------------------------------- arranque */

export function registrarMarcadores() {
  game.settings.register(MOD, "marcadoresDef", { scope: "world", config: false, type: Object, default: { milestones: [], clocks: [] }, onChange: () => pintar() });
  game.settings.register(MOD, "marcadoresEstado", { scope: "world", config: false, type: Object, default: { milestones: {}, clocks: {} }, onChange: () => pintar() });
  game.settings.register(MOD, "marcadoresQuitados", { scope: "world", config: false, type: Array, default: [], onChange: () => pintar() });
  game.settings.register(MOD, "marcadoresPos", { scope: "client", config: false, type: Object, default: null });
  const ALT = foundry.helpers?.interaction?.KeyboardManager?.MODIFIER_KEYS?.ALT ?? "Alt";
  game.keybindings.register(MOD, "marcadores", { name: "Mostrar u ocultar los hitos y relojes", editable: [{ key: "KeyM", modifiers: [ALT] }], onDown: () => { alternarPanel(); return true; } });
}

export async function iniciarMarcadores() {
  try {
    const r = await fetch(`modules/${MOD}/content/direccion-es.json`);
    if (r.ok) base = normalizarMarcadores((await r.json())?.settings?.markers);
  } catch { /* sin paquete de campaña */ }
  pintar();
  let hechos = milestonesState(definiciones().milestones, estado().milestones), ultimo = estado().event?.t ?? 0;
  Hooks.on("mrWoAspecto", () => pintar());
  Hooks.on("updateSetting", s => {
    if (![`${MOD}.marcadoresEstado`, `${DIR}.markerState`, `${DIR}.global`, `${MOD}.marcadoresDef`].includes(s.key)) return;
    pintar();
    // Los avisos los emite este módulo solo cuando no está MR- Dirección (que ya los emite él)
    if (dirActivo() || s.key !== `${MOD}.marcadoresEstado`) {
      if (s.key === `${DIR}.markerState`) { hechos = milestonesState(definiciones().milestones, s.value?.milestones); ultimo = s.value?.event?.t ?? ultimo; }
      return;
    }
    const defs = definiciones().milestones, ahora = milestonesState(defs, s.value?.milestones);
    for (const h of defs) if (ahora[h.id] && !hechos[h.id]) {
      if (h.public !== false) ui.notifications.info(`Hito logrado: ${h.label}`);
      else if (game.user.isGM) ui.notifications.info(`Hito logrado (secreto): ${h.label}`);
    }
    hechos = ahora;
    const ev = s.value?.event; if (ev && ev.t > ultimo) { ultimo = ev.t; toast(ev); }
  });
}
