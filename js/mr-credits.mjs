/**
 * Crédito discreto MR en la barra lateral de Ajustes del juego.
 */

export function registrarCreditosMR() {
  Hooks.on("renderSettings", (app, html) => {
    const raiz = html instanceof HTMLElement ? html : html?.[0];
    if (!raiz || raiz.querySelector(".mr-credits-bloque")) return;

    const bloque = document.createElement("div");
    bloque.className = "mr-credits-bloque";
    bloque.innerHTML = `
      <hr/>
      <p style="font-size:0.82em;opacity:0.8;text-align:center;margin:4px 0;">
        <strong>MR · Wicked Ones</strong> · Edición española (The Hills Press)<br/>
        Diseño y programación por <a href="https://github.com/ManuRomera" target="_blank" rel="noopener">Manu Romera</a>
      </p>
    `;
    const destino = raiz.querySelector("#settings-documentation") ?? raiz;
    destino.appendChild(bloque);
  });
}
