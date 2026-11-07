/**
 * Ventana de heridas de un monstruo. Un monstruo no tiene tres niveles de herida: sufre conmociones (leves, una por
 * atributo), puede quedar reventado (grave) y morir. Aquí se marcan y se apunta qué le ha pasado en cada una.
 * La hoja solo muestra el nivel (gotas) y el texto; todo lo demás se gestiona en esta ventana.
 */
import { ATRIBUTOS, nombreAtributo } from "./tirada.mjs";

const MOD = "mr-wicked-ones-es";
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const App = foundry.applications?.api?.ApplicationV2;

export class HeridasMR extends App {
  static DEFAULT_OPTIONS = {
    id: "mr-wo-heridas", tag: "div", classes: ["mrg", "mrg-ventana", "mrg-heridas-app"],
    window: { title: "Heridas", icon: "fa-solid fa-droplet", resizable: true }, position: { width: 520, height: "auto" }
  };

  constructor(actor) {
    super();
    this.actor = actor;
    this.options.window.title = `Heridas · ${actor.name}`;
  }

  async _renderHTML() {
    const a = this.actor, s = a.system, hs = a.getFlag(MOD, "heridas") ?? {}, muerto = Boolean(a.getFlag(MOD, "muerto"));
    const dis = a.isOwner ? "" : "disabled";
    const filas = Object.keys(ATRIBUTOS).map(k => {
      const on = Boolean(s.attributes?.[k]?.shocked);
      return `<div class="mrg-herida-fila ${on ? "on" : ""}"><button type="button" class="mrg-chipbtn ${on ? "mrg-sel" : ""}" data-alternar="system.attributes.${k}.shocked" aria-pressed="${on}" ${dis} data-ayuda="Conmoción en ${esc(nombreAtributo(k))}||Herida leve o susto: −1d en tu siguiente tirada de acción o resistencia de este atributo. Se quita sola tras esa tirada y al recuperarte."><i class="fa-solid fa-bolt"></i> Conmoción · ${esc(nombreAtributo(k))}</button>
        ${on ? `<input type="text" data-texto="${k}" value="${esc(hs[k] ?? "")}" placeholder="¿Qué te ha pasado? (un puñetazo en la sien…)" aria-label="Herida de ${esc(nombreAtributo(k))}" ${dis}>` : `<span class="mrg-nota">—</span>`}</div>`;
    }).join("");
    return `<div class="mrg-heridas-v">
      <p class="mrg-asist-intro">Un monstruo no tiene tres niveles de herida: <strong>conmoción</strong> (leve), <strong>reventado</strong> (grave) y <strong>muerte</strong>. Apunta qué te ha pasado en cada una; la nota se borra sola cuando la herida desaparece.</p>
      <h4 class="mrg-estado-t"><i class="fa-solid fa-bolt"></i> Conmociones <small>una por atributo · −1d a la siguiente tirada</small></h4>${filas}
      <h4 class="mrg-estado-t"><i class="fa-solid fa-droplet"></i> Reventado <small>recibes conmoción en todos los atributos</small></h4>
      <div class="mrg-herida-fila mrg-herida-fila--grave ${s.bloodied ? "on" : ""}"><button type="button" class="mrg-chipbtn ${s.bloodied ? "mrg-sel" : ""}" data-alternar="system.bloodied" aria-pressed="${Boolean(s.bloodied)}" ${dis} data-ayuda="Reventado||Herida grave: recibes conmoción en todos los atributos y sigues reventado hasta eliminarlas todas. Otra herida seria mientras tanto te mata (aunque siempre puedes resistir la muerte)."><i class="fa-solid fa-droplet"></i> Reventado</button>
        ${s.bloodied ? `<input type="text" data-texto="sangre" value="${esc(hs.sangre ?? "")}" placeholder="¿Cómo te han reventado?" aria-label="Herida grave" ${dis}>` : `<span class="mrg-nota">Sin heridas graves</span>`}</div>
      <h4 class="mrg-estado-t"><i class="fa-solid fa-skull-crossbones"></i> Muerte <small>reventado + otra herida seria</small></h4>
      <div class="mrg-herida-fila mrg-herida-fila--muerte ${muerto ? "on" : ""}"><button type="button" class="mrg-chipbtn ${muerto ? "mrg-sel" : ""}" data-alternar="flags.${MOD}.muerto" aria-pressed="${muerto}" ${dis} data-ayuda="Muerto||Antes de morir puedes hacer un golpe de gracia: una acción final con +1d por cada corazón oscuro que te quede; quien lo vea gana un corazón oscuro."><i class="fa-solid fa-skull-crossbones"></i> Muerto</button>
        <span class="mrg-nota">${muerto ? `Golpe de gracia: una acción final con +${Number(s.dark_hearts?.value ?? 0)}d (un dado por corazón oscuro).` : "Siempre puedes resistir la muerte antes."}</span></div>
    </div>`;
  }

  _replaceHTML(res, cont) {
    cont.innerHTML = res;
    cont.onclick = async ev => {
      const b = ev.target.closest("[data-alternar]");
      if (!b || b.disabled) return;
      const campo = b.dataset.alternar;
      await this.actor.update({ [campo]: !foundry.utils.getProperty(this.actor, campo) });
    };
    cont.querySelectorAll("[data-texto]").forEach(inp => inp.addEventListener("change", async () => {
      this.escribiendo = true;
      await this.actor.update({ [`flags.${MOD}.heridas.${inp.dataset.texto}`]: inp.value });
      this.escribiendo = false;
    }));
  }
}

export function abrirHeridas(actor) {
  const previa = foundry.applications.instances?.get?.("mr-wo-heridas");
  if (previa?.actor === actor) { previa.render(true); return previa; }
  previa?.close?.();
  const app = new HeridasMR(actor);
  app.render(true);
  return app;
}

/** La ventana se redibuja cuando cambia el actor (menos al escribir una nota, para no perder el cursor). */
export function registrarHeridas() {
  Hooks.on("updateActor", actor => {
    const app = foundry.applications.instances?.get?.("mr-wo-heridas");
    if (app?.actor === actor && !app.escribiendo) app.render();
  });
}
