/** Cálculo puro de la escala de una ventana (sin Foundry: se prueba en tests/ventanas.test.mjs). */
export const MARGEN = 8;       // píxeles que se dejan libres alrededor de la ventana
export const MINIMA = 0.5;     // por debajo de esto el texto deja de leerse: lo que no quepa se desplaza por dentro
export const AIRE = 0.92;      // en pantallas pequeñas una ventana no ocupa más de este tanto del espacio útil
/** Un monitor de 1080p con el navegador abierto: ahí todo se ve a tamaño 1. Las pantallas menores lo escalan todo en proporción. */
export const REFERENCIA = { ancho: 1920, alto: 950 };

/**
 * Escala con la que una ventana de `ancho` × `alto` píxeles se ve bien en `vista`:
 *  - `ancho`/`alto`: espacio útil (el alto ya sin la reserva de la barra de macros), `total`: alto completo de la pantalla;
 *  - proporcional: lo que mide la pantalla frente a la de referencia (todo el sistema se ve igual de «grande» en cualquier pantalla);
 *  - y siempre cabe, con aire por los cuatro lados cuando la pantalla es pequeña.
 * `manual` es el porcentaje elegido en Ajustes (0 = automático): si lo hay, manda tal cual (entre 50 % y 150 %).
 */
export function escalaDeVentana(ancho, alto, vista, manual = 0) {
  if (manual > 0) return Math.min(1.5, Math.max(0.5, manual / 100));
  if (!(ancho > 0) || !(alto > 0)) return 1;
  const proporcion = Math.min(1, vista.ancho / REFERENCIA.ancho, (vista.total ?? vista.alto) / REFERENCIA.alto);
  const aire = proporcion < 1 ? AIRE : 1;
  const cabe = aire * Math.min((vista.ancho - MARGEN) / ancho, (vista.alto - MARGEN) / alto);
  return Math.max(MINIMA, Math.floor(Math.min(1, proporcion, cabe) * 100) / 100);
}
