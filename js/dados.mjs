/**
 * Dados propios de Wicked Ones para Dice So Nice: caras de color de menos a más (1 apagado → 6 con el emblema del
 * Señor Oscuro). Si el jugador no los quiere, el ajuste «dadosPropios» los deja disponibles pero no preferidos.
 */
const MOD = "mr-wicked-ones-es";
const RUTA = `modules/${MOD}/assets/dados`;

/** Pide a Dice So Nice que use nuestros dados en esta tirada, tenga el jugador la apariencia que tenga (si el ajuste está activo). */
export function aparienciaDados(roll) {
  try {
    if (roll && game.settings.get(MOD, "dadosPropios")) roll.options.appearance = { system: "mr-wicked-ones", colorset: "mr-wicked-ones" };
  } catch { /* sin ajuste */ }
  return roll;
}

export function registrarDados() {
  Hooks.once("diceSoNiceReady", dice3d => {
    const activo = (() => { try { return game.settings.get(MOD, "dadosPropios"); } catch { return true; } })();
    const modo = activo ? "preferred" : "default";
    dice3d.addSystem({ id: "mr-wicked-ones", name: "Wicked Ones (MR-)" }, modo);
    const cara = (pref, i) => `${RUTA}/${pref}-${i}.png`;
    dice3d.addDicePreset({
      type: "d6", system: "mr-wicked-ones",
      labels: [1, 2, 3, 4, 5, 6].map(i => cara("d6", i)),
      bumpMaps: [1, 2, 3, 4, 5, 6].map(i => cara("bump", i))
    });
    dice3d.addColorset({
      name: "mr-wicked-ones", description: "Wicked Ones · escala de éxito", category: "Wicked Ones",
      foreground: "#ffae00", background: "#16141c", outline: "#000000", edge: "#2a1215", material: "metal"
    }, modo);
  });
}
