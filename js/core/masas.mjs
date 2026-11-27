/**
 * Masas del mapa de los monstruos (sin Foundry ni PIXI, para poder probarlo): cuando varios sellos de la misma familia de terreno
 * se juntan, forman una masa continua (árboles → bosque, lagos → un gran lago, olas → mar, montañas → sierra…). Las «manchas»
 * (`zona-<familia>`) son trazos de pincel sin dibujo propio que solo pintan su masa: para dibujar un mar o un lago a mano alzada.
 */
export const FAMILIAS = {
  mar: { nombre: "Mar", minimo: 2, orden: 1 },
  lago: { nombre: "Lago", minimo: 2, orden: 2 },
  campos: { nombre: "Campos", minimo: 3, orden: 3 },
  pantano: { nombre: "Pantano", minimo: 3, orden: 3 },
  yermo: { nombre: "Yermo", minimo: 3, orden: 3 },
  relieve: { nombre: "Sierra", minimo: 3, orden: 4 },
  bosque: { nombre: "Bosque", minimo: 3, orden: 5 }
};
const PREFIJO = { bosque: "bosque", pinar: "bosque", montana: "relieve", colina: "relieve", acantilado: "relieve", pantano: "pantano", campos: "campos", lago: "lago", olas: "mar", yermo: "yermo", volcan: "yermo" };
/** Familia de un sello (`bosque-2` → bosque, `olas-1` → mar, `zona-lago` → lago) o null si no forma masas. */
export function familiaDe(k) {
  const s = String(k ?? "");
  if (s.startsWith("zona-")) return FAMILIAS[s.slice(5)] ? s.slice(5) : null;
  return PREFIJO[s.split("-")[0]] ?? null;
}
/** Familia del terreno elegido en la paleta (claves de TERRENO). */
export const familiaTerreno = t => (t === "mar" ? "mar" : PREFIJO[t] ?? null);

/**
 * Agrupa los sellos en masas. `circulo(s)` da { x, y, r } de cada sello (su huella en el lienzo). Dos sellos de la misma familia se
 * unen si sus huellas se tocan (con un poco de holgura). Devuelve, por masa: familia, círculos (con «puentes» entre vecinos para que
 * el contorno sea continuo) e ids de sus sellos. Una masa necesita `minimo` sellos o alguna mancha.
 */
export function masas(sellos, circulo, holgura = 1.15) {
  const porFam = new Map();
  for (const s of sellos) { const f = familiaDe(s.k); if (f) { if (!porFam.has(f)) porFam.set(f, []); porFam.get(f).push({ s, c: circulo(s) }); } }
  const out = [];
  for (const [fam, lista] of porFam) {
    const padre = lista.map((_, i) => i), raiz = i => (padre[i] === i ? i : (padre[i] = raiz(padre[i])));
    const pares = [];
    for (let i = 0; i < lista.length; i++) for (let j = i + 1; j < lista.length; j++) {
      const a = lista[i].c, b = lista[j].c, d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < (a.r + b.r) * holgura) { padre[raiz(i)] = raiz(j); pares.push([i, j, d]); }
    }
    const grupos = new Map();
    lista.forEach((_, i) => { const r = raiz(i); if (!grupos.has(r)) grupos.set(r, []); grupos.get(r).push(i); });
    for (const idx of grupos.values()) {
      const conMancha = idx.some(i => String(lista[i].s.k).startsWith("zona-"));
      if (idx.length < FAMILIAS[fam].minimo && !conMancha) continue;
      const dentro = new Set(idx), miembros = idx.map(i => ({ ...lista[i].c })), puentes = [];
      for (const [i, j, d] of pares) {   // puentes: círculos intermedios para que la masa no quede en cuentas sueltas
        if (!dentro.has(i)) continue;
        const a = lista[i].c, b = lista[j].c, n = Math.max(1, Math.ceil(d / (Math.min(a.r, b.r) * 0.6)));
        for (let k = 1; k < n; k++) { const t = k / n; puentes.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, r: (a.r + (b.r - a.r) * t) * 0.92 }); }
      }
      const manchas = idx.filter(i => String(lista[i].s.k).startsWith("zona-")).map(i => ({ ...lista[i].c }));
      out.push({ fam, circulos: [...miembros, ...puentes], miembros, puentes, manchas, ids: idx.map(i => lista[i].s.id) });
    }
  }
  return out.sort((a, b) => FAMILIAS[a.fam].orden - FAMILIAS[b.fam].orden);
}

/** Curva suave (Catmull-Rom) que pasa por los puntos [x0, y0, x1, y1…]; `paso` en píxeles. Devuelve [{ x, y }]. */
export function suavizar(p, paso = 10) {
  const P = []; for (let i = 0; i < p.length; i += 2) P.push({ x: p[i], y: p[i + 1] });
  if (P.length < 3) return P;
  const out = [P[0]];
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[Math.max(0, i - 1)], b = P[i], c = P[i + 1], d = P[Math.min(P.length - 1, i + 2)];
    const n = Math.max(2, Math.ceil(Math.hypot(c.x - b.x, c.y - b.y) / paso));
    for (let k = 1; k <= n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (A, B, C, D) => 0.5 * (2 * B + (-A + C) * t + (2 * A - 5 * B + 4 * C - D) * t2 + (-A + 3 * B - 3 * C + D) * t3);
      out.push({ x: f(a.x, b.x, c.x, d.x), y: f(a.y, b.y, c.y, d.y) });
    }
  }
  return out;
}

/** Cinta de anchura variable alrededor de una curva: polígono [x, y…] (lado izquierdo de ida, derecho de vuelta). */
export function cinta(curva, ancho) {
  const L = [], R = [], n = curva.length;
  for (let i = 0; i < n; i++) {
    const a = curva[Math.max(0, i - 1)], b = curva[Math.min(n - 1, i + 1)], dx = b.x - a.x, dy = b.y - a.y, m = Math.hypot(dx, dy) || 1;
    const w = ancho(i / Math.max(1, n - 1)) / 2, nx = -dy / m, ny = dx / m, p = curva[i];
    L.push(p.x + nx * w, p.y + ny * w); R.unshift(p.x - nx * w, p.y - ny * w);
  }
  return [...L, ...R];
}

/**
 * Dónde poner más dibujos para que una masa de tierra se vea continua solo con dibujos (sin relleno pintado): los huecos entre
 * vecinos y el interior de las manchas, sin amontonarse sobre lo que ya hay (cada hueco queda a `aire` radios de lo demás).
 */
export function huecosDeMasa(m, aire = 0.45) {
  const ocupado = m.miembros.filter((_, i) => !m.manchas?.some(z => z.x === m.miembros[i].x && z.y === m.miembros[i].y)).map(c => ({ ...c }));
  const cand = [...m.puentes];
  for (const z of m.manchas ?? []) { cand.push({ x: z.x, y: z.y, r: z.r * 0.55 }); for (let k = 0; k < 3; k++) { const a = k * 2.1 + z.x * 0.01; cand.push({ x: z.x + Math.cos(a) * z.r * 0.5, y: z.y + Math.sin(a) * z.r * 0.4, r: z.r * 0.5 }); } }
  const out = [];
  for (const c of cand) if (![...ocupado, ...out].some(o => Math.hypot(o.x - c.x, o.y - c.y) < (o.r + c.r) * aire)) out.push(c);
  return out;
}

