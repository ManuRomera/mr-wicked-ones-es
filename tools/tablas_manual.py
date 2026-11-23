#!/usr/bin/env python3
"""Extrae las tablas aleatorias del manual español de Wicked Ones (The Hills Press) a tools/datos/tablas_manual.json.
Sin inventar nada: cada fila sale literal del texto del libro (texto.txt, una línea por línea del PDF, con marcas
=====PAG n=====). build_foundry.py lee ese JSON para crear el compendio de tablas y los objetos de creación.
Uso: python3 tools/tablas_manual.py [ruta/a/texto.txt]"""
import json, os, re, sys
from pathlib import Path

BASE = Path(__file__).resolve().parent
TEXTO = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/Volumes/Datos_Dock/FoundryVTT/Trabajo WO/libro/texto.txt")
PDF = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("/Volumes/Datos_Dock/Rol/01 Sistemas de juego/Colección de sistemas/Wicked Ones/Wicked Ones - The Hills Press (Español).pdf")
SALIDA = BASE / "datos" / "tablas_manual.json"

# (clave, nombre en Foundry, página del PDF, inicio del título en el libro, tipo, caras, fórmula, descripción)
# tipo «d66»: filas 11..66 · «dN»: filas 1..N. La página impresa es la del PDF menos 2.
TABLAS = [
    ("incursion-plan", "Generador de incursiones: plan de incursión (1d)", 356, "Plan de incursión", "dN", 6, "1d6", "Primero se tira el plan y luego se establecen las condiciones del objetivo."),
    ("incursion-nivel", "Generador de incursiones: nivel del objetivo (2d)", 356, "Nivel del objetivo", "dN", 6, "2d6kh", "Se tiran 2d y cuenta el más alto."),
    ("incursion-estado", "Generador de incursiones: estado del objetivo (2d)", 356, "Estado del objetivo", "dN", 6, "2d6kh", "Se tiran 2d y cuenta el más alto."),
    ("incursion-aventureros", "Generador de incursiones: aventureros", 356, "Aventureros", "dN", 6, "1d6", "Esta tirada depende de la tabla «Estado del objetivo» (1d o 2d)."),
    ("incursion-caos", "Generador de incursiones: un poco de caos (1d)", 356, "Un poco de caos", "dN", 6, "1d6", "Determina una semilla y después tira 1d."),
    ("esbirros-exito", "Incursión de esbirros: éxito o fracaso", 356, "Éxito o fracaso", "dN", 6, "1d6", "Se tira la reserva de la implicación (cuenta el dado más alto). 4+ para cumplir con el objetivo."),
    ("esbirros-consecuencias", "Incursión de esbirros: consecuencias", 356, "Consecuencias", "dN", 6, "1d6", "Ajusta el número de dados según los resultados de la 1.ª tabla."),
    ("esbirros-botin", "Incursión de esbirros: botín y moral", 356, "Botín y moral", "dN", 6, "1d6", "Añade botín de base si la incursión salió bien."),
    ("aventureros", "Generador de invasiones: aventureros (d66)", 357, "Aventureros", "d66", 0, None, "En general, una invasión grave son tres aventureros del nivel de la mazmorra."),
    ("ayudantes", "Generador de invasiones: ayudantes (d66)", 357, "Ayudantes", "d66", 0, None, ""),
    ("semilla-1", "Deja volar tu imaginación: primera semilla (d66)", 358, "Primera semilla", "d66", 0, None, "Tira en la primera tabla, luego en la segunda y junta los términos."),
    ("semilla-2", "Deja volar tu imaginación: segunda semilla (d66)", 358, "Segunda semilla", "d66", 0, None, "Tira en la primera tabla, luego en la segunda y junta los términos."),
    ("pactos-oscuros", "Ejemplos de pactos oscuros (d66)", 359, "Ejemplos de pactos oscuros", "d66", 0, None, ""),
    ("objetos-azar", "Objetos al azar (d66)", 360, "Objetos al azar", "d66", 0, None, ""),
    ("botin-importante", "Ejemplos de botín importante (d66)", 361, "Ejemplos de botín importante", "d66", 0, None, ""),
    ("objetos-magicos", "Ejemplos de objetos mágicos (d66)", 362, "Ejemplos de objetos mágicos", "d66", 0, None, "Las decenas del 1 al 2 son de nivel 1; del 3 al 4, de nivel 2; del 5 al 6, de nivel 3."),
    ("pociones", "Ejemplos de pociones (d66)", 363, "Ejemplos de pociones", "d66", 0, None, "Las decenas del 1 al 2 son de nivel 1; del 3 al 4, de nivel 2; del 5 al 6, de nivel 3."),
    ("artilugios", "Ejemplos de artilugios (d66)", 364, "Ejemplos de artilugios", "d66", 0, None, "Las decenas del 1 al 2 son de nivel 1; del 3 al 4, de nivel 2; del 5 al 6, de nivel 3."),
    ("mejunjes", "Ejemplos de mejunjes (d66)", 365, "Ejemplos de mejunjes", "d66", 0, None, "Las decenas del 1 al 2 son de nivel 1; del 3 al 4, de nivel 2; del 5 al 6, de nivel 3."),
    ("represalias-leves", "Represalias leves (d66)", 366, "Represalias leves", "d66", 0, None, "Es mejor que las invasiones las decida el DJ, sin hacer tiradas."),
    ("represalias-graves", "Represalias graves (d66)", 367, "Represalias graves", "d66", 0, None, "Es mejor que las invasiones las decida el DJ, sin hacer tiradas."),
    ("desastres-leves", "Desastres leves (d66)", 368, "Desastres leves", "d66", 0, None, "Es mejor que las invasiones las decida el DJ, sin hacer tiradas."),
    ("desastres-graves", "Desastres graves (d66)", 369, "Desastres graves", "d66", 0, None, "Es mejor que las invasiones las decida el DJ, sin hacer tiradas."),
    ("descubrimientos-exito", "Descubrimientos con éxito (d66)", 370, "Descubrimientos con éxito", "d66", 0, None, ""),
    ("descubrimientos-parcial", "Descubrimientos con éxito parcial (d66)", 371, "Descubrimientos con éxito parcial", "d66", 0, None, ""),
    ("descubrimientos-fracaso", "Descubrimientos con fracaso (d66)", 372, "Descubrimientos con fracaso", "d66", 0, None, ""),
    ("desastre-aleatorio", "Desastre aleatorio (1d6)", 249, "Desastre aleatorio", "dN", 6, "1d6", "La categoría del desastre (pág. 247)."),
    ("represalia-aleatoria", "Represalias aleatorias (1d6)", 270, "Represalias aleatorias", "dN", 6, "1d6", "La categoría de la represalia (pág. 268)."),
    ("solo-desastre", "Partidas en solitario: desastre aleatorio (1d6)", 355, "Desastre aleatorio", "dN", 6, "1d6", "Variante de El gran malo malvado (pág. 353)."),
    ("solo-represalia", "Partidas en solitario: represalia aleatoria (1d6)", 355, "Represalia aleatoria", "dN", 6, "1d6", "Variante de El gran malo malvado (pág. 353)."),
    ("rasgos-duendes", "Generador de mazmorras: rasgos de los duendes (1d12)", 373, "Rasgos de los duendes", "dN", 12, "1d12", ""),
    ("tematica", "Generador de mazmorras: temática de la mazmorra (1d6)", 373, "Temática de la mazmorra", "dN", 6, "1d6", ""),
    ("iluminacion", "Generador de mazmorras: iluminación (1d6)", 373, "Iluminación", "dN", 6, "1d6", ""),
    ("rasgos-sala", "Generador de mazmorras: rasgos de la sala (1d20)", 373, "Rasgos de la sala", "dN", 20, "1d20", ""),
    ("suelos-paredes", "Generador de mazmorras: suelos y paredes (1d6)", 373, "Suelos y paredes", "dN", 6, "1d6", ""),
    ("olor", "Generador de mazmorras: olor (1d6)", 373, "Olor", "dN", 6, "1d6", ""),
    ("salas-n2", "Generador de mazmorras: salas de nivel 2 (1d6)", 374, "Salas de nivel 2", "dN", 6, "1d6", ""),
    ("razas-esbirros", "Generador de mazmorras: razas de los esbirros (1d8)", 374, "Razas de los esbirros", "dN", 8, "1d8", ""),
    ("impulsos-esbirros", "Generador de mazmorras: impulsos de los esbirros (1d8)", 374, "Impulsos de los esbirros", "dN", 8, "1d8", ""),
    ("mejoras-esbirros", "Generador de mazmorras: mejoras de los esbirros (1d8)", 374, "Mejoras de los esbirros", "dN", 8, "1d8", ""),
    ("salas-n1", "Generador de mazmorras: salas de nivel 1 (1d12)", 374, "Salas de nivel 1", "dN", 12, "1d12", ""),
    ("salas-n3", "Generador de mazmorras: salas de nivel 3 (d66)", 374, "Salas de nivel 3", "d66", 0, None, ""),
    ("trabajos-esbirros", "Generador de mazmorras: trabajos de los esbirros (1d20)", 374, "Trabajos de los esbirros", "dN", 20, "1d20", ""),
    ("trampa-mecanismo", "Generador de mazmorras: mecanismo de la trampa (1d12)", 375, "Mecanismo de la trampa", "dN", 12, "1d12", ""),
    ("porton-cierre", "Generador de mazmorras: mecanismo de cierre (1d12)", 375, "Mecanismo de cierre", "dN", 12, "1d12", ""),
    ("trampa-detonador", "Generador de mazmorras: detonador de la trampa (1d12)", 375, "Detonador de la trampa", "dN", 12, "1d12", ""),
    ("porton-material", "Generador de mazmorras: material de la puerta (1d12)", 375, "Material de la puerta", "dN", 12, "1d12", ""),
    ("criaturas", "Generador de mazmorras: criatura (d66)", 375, "Criatura", "d66", 0, None, "Puede ser una sola criatura, un grupo o una horda."),
    ("rasgos-criaturas", "Generador de mazmorras: rasgos de las criaturas (1d20, dos por criatura)", 375, "Rasgos de las criaturas", "dN", 20, "1d20", "Dos por criatura."),
]

RUIDO = re.compile(r"^(Wicked Ones|Capítulo \d+:.*|Hasta el fondo|Ciclo de juego|Artes oscuras|Mazmorras|\d{3})$")


def paginas(texto):
    out, pag = {}, None
    for l in texto.split("\n"):
        m = re.match(r"=====PAG (\d+)=====", l)
        if m:
            pag = int(m.group(1)); out[pag] = []; continue
        if pag is not None:
            out[pag].append(l.rstrip())
    return out


def numeros(tipo, caras):
    return [f"{a}{b}" for a in range(1, 7) for b in range(1, 7)] if tipo == "d66" else [str(i) for i in range(1, caras + 1)]


def extraer(lineas, titulo, tipo, caras, titulos_pagina):
    validos = numeros(tipo, caras)
    ini = next(i for i, l in enumerate(lineas) if l.strip().startswith(titulo))
    filas, actual = {}, None
    for l in lineas[ini + 1:]:
        s = l.strip()
        if not s or RUIDO.match(s) or s.startswith("❖") or s.startswith("\t"):
            continue
        if s in validos and s not in filas:
            actual = s; filas[s] = []; continue
        if len(filas) == len(validos) and actual and filas[actual]:
            # todas las filas ya tienen número: solo se acepta una continuación evidente (empieza en minúscula)
            if not s[0].islower():
                break
        if any(s.startswith(t) for t in titulos_pagina if t != titulo):
            if len(filas) == len(validos):
                break
            continue
        if actual is not None:
            filas[actual].append(s)
    falta = [v for v in validos if v not in filas or not filas[v]]
    if falta:
        raise SystemExit(f"Tabla «{titulo}»: faltan filas {falta}")
    salida = []
    for v in validos:
        txt = re.sub(r"\s+", " ", " ".join(filas[v])).strip()
        txt = re.sub(r"(\w)- (\w)", r"\1\2", txt).replace("­", "")
        # la nota al pie de las d66 («tira 2d6: un dado para las decenas y otro para las unidades…») no es parte de la fila
        txt = re.sub(r"\s+(otro para las unidades|unidades \(por|ejemplo, 4 y 6|podrían significar).*$", "", txt)
        n = int(v) if tipo == "dN" else validos.index(v) + 1
        salida.append([n, n, txt])
    return salida


def objetos_azar(pag_pdf):
    """«Objetos al azar» tiene tres objetos por fila: se leen del PDF por columnas (el texto plano los junta)."""
    import fitz  # PyMuPDF
    pagina = fitz.open(PDF)[pag_pdf - 1]
    filas = {}
    for b in pagina.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            t = "".join(s["text"] for s in l["spans"]).strip()
            if t:
                filas.setdefault(round((l["bbox"][1] + l["bbox"][3]) / 2), []).append((l["bbox"][0], t))
    salida = []
    for y in sorted(filas):
        celdas = [t for _, t in sorted(filas[y])]
        if re.fullmatch(r"[1-6][1-6]", celdas[0]):
            salida.append([len(salida) + 1, len(salida) + 1, " · ".join(celdas[1:])])
    if len(salida) != 36 or any(r[2].count(" · ") != 2 for r in salida):
        raise SystemExit("Objetos al azar: no salen 36 filas de tres objetos")
    return salida


def main():
    pags = paginas(TEXTO.read_text(encoding="utf-8"))
    titulos = {}
    for t in TABLAS:
        titulos.setdefault(t[2], []).append(t[3])
    datos = []
    for clave, nombre, pag, titulo, tipo, caras, formula, desc in TABLAS:
        filas = objetos_azar(pag) if clave == "objetos-azar" else extraer(pags[pag], titulo, tipo, caras, titulos[pag])
        if clave == "objetos-azar":
            desc = "Cada fila trae tres objetos: elige uno o tira 1d6 (1-2, 3-4, 5-6) para escoger la columna."
        datos.append({"clave": clave, "nombre": nombre, "formula": formula or "1d36", "d66": tipo == "d66",
                      "pagina": pag - 2, "descripcion": desc, "filas": filas})
        print(f"  {clave:24} {len(filas):3} filas · pág. {pag - 2}")
    SALIDA.parent.mkdir(exist_ok=True)
    SALIDA.write_text(json.dumps(datos, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"→ {SALIDA.relative_to(BASE.parent)}: {len(datos)} tablas")


if __name__ == "__main__":
    main()


# ------------------------------------------------------------------ aventureros de ejemplo (pág. 320-329)
RASGO = re.compile(r"^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+ (?:e|y) [a-záéíóúñ]+[;:] [a-záéíóúñ ]+\.$")   # el Guerrero arcano lleva «:» en el libro


def aventureros(pags, desde=322, hasta=331):
    lineas = []
    for p in range(desde, hasta + 1):
        lineas += [l for l in pags[p] if l.strip() and not RUIDO.match(l.strip()) and l.strip() not in ("Dirección",)]
    advs, a, modo = [], None, None
    for i, l in enumerate(lineas):
        s = l.strip()
        vineta = l.startswith("\t")
        s = re.sub(r"^[\t\s-]+", "", s).strip()
        if s == "Movimientos ofensivos":
            a = {"pasiva": "", "ofensivos": [], "defensivos": []}; modo = "of"; continue
        if a is None:
            continue
        if s == "Movimientos defensivos":
            modo = "def"; continue
        if s.startswith("Pasiva:"):
            a["pasiva"] = s[7:].strip(); modo = "pasiva"; continue
        if vineta:
            (a["ofensivos"] if modo in ("of", "pasiva") else a["defensivos"]).append(re.sub(r"^[\t\s\x83]+", "", s))
            if modo == "pasiva": modo = "of"
            continue
        sig = lineas[i + 1].strip() if i + 1 < len(lineas) else ""
        if modo == "def" and len(a["defensivos"]) == 3 and RASGO.match(sig):
            rasgos, motiv = re.split(r"[;:] ", sig.rstrip("."), maxsplit=1)
            pos, neg = re.split(r" (?:e|y) ", rasgos)
            a.update(nombre=s, rasgos=[pos.strip(), neg.strip()], motivacion=motiv.strip())
            advs.append(a); a = None; continue
        if RASGO.match(s):
            continue
        if modo == "pasiva":
            a["pasiva"] += " " + s
        elif modo == "of" and a["ofensivos"]:
            a["ofensivos"][-1] += " " + s
        elif modo == "def" and a["defensivos"]:
            a["defensivos"][-1] += " " + s
    for x in advs:
        x["pasiva"] = re.sub(r"\s+", " ", x["pasiva"]).strip()
        if len(x["ofensivos"]) != 3 or len(x["defensivos"]) != 3 or not x["pasiva"]:
            raise SystemExit(f"Aventurero mal leído: {x}")
    return advs


def main_aventureros():
    pags = paginas(TEXTO.read_text(encoding="utf-8"))
    advs = aventureros(pags)
    (SALIDA.parent / "aventureros_manual.json").write_text(json.dumps(advs, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"→ tools/datos/aventureros_manual.json: {len(advs)} aventureros de ejemplo")


if __name__ == "__main__":
    main_aventureros()


# ---------------------------------------------------------------------------
# Labores de la mazmorra (cap. 4): salas N1-N3, trampas, trucos, portones y criaturas, literales
# ---------------------------------------------------------------------------
RUIDO = re.compile(r"^(=====PAG \d+=====|Capítulo 4: Mazmorras|Wicked Ones|Mazmorras|\d+)?$")


def unir(lineas):
    out = ""
    for l in lineas:
        l = l.strip().replace("\x83", "").strip()
        if RUIDO.match(l):
            continue
        if out.endswith("­"):
            out = out[:-1] + l
        else:
            out = f"{out} {l}" if out else l
    return re.sub(r"\s+", " ", out).replace(" ­", "").strip()


def bloque(L, desde, hasta, i0=0):
    a = next(i for i in range(i0, len(L)) if L[i].strip().startswith(desde))
    b = next(i for i in range(a + 1, len(L)) if L[i].strip().startswith(hasta))
    return a, b


def entradas(lineas):
    """«Nombre: texto» repartido en varias líneas."""
    out, actual = [], None
    for l in lineas:
        m = re.match(r"^([A-ZÁÉÍÓÚÑ][\wáéíóúñ ]{2,30}): (.*)$", l.strip())
        if m:
            actual = [m.group(1), [m.group(2)]]
            out.append(actual)
        elif actual:
            actual[1].append(l)
    return [{"nombre": n, "texto": unir(t)} for n, t in out]


def labores(texto):
    L = texto.splitlines()
    a1, b1 = bloque(L, "SALAS Y ESTRUCTURAS DE NIVEL 1", "SALAS Y ESTRUCTURAS DE NIVEL 2")
    a2, b2 = bloque(L, "SALAS Y ESTRUCTURAS DE NIVEL 2", "SALAS DE NIVEL 3", b1 - 1)
    n1, n2 = entradas(L[a1 + 1:b1]), entradas(L[a2 + 1:b2])

    # Salas de nivel 3 de cada temática: nombre, descripción y «Podría necesitar…»
    t0 = next(i for i, l in enumerate(L) if l.startswith("Salas de nivel 3 del enclave"))
    n3, tema = [], None
    for j in range(t0, a1):
        m = re.match(r"^Salas de nivel 3 de(?:l| la) (\w+)", L[j])
        if m:
            tema = m.group(1).capitalize()
        if not re.match(r"^(Podrían? |Solo |No |Una sala de estrategia puede )necesita", L[j]):
            continue
        k = j - 1
        while not (len(L[k].strip()) < 35 and L[k].strip()[:1].isupper() and not L[k].strip().endswith((".", ",", ";", ":", "»"))
                   and not RUIDO.match(L[k].strip()) and (RUIDO.match(L[k - 1].strip()) or L[k - 1].strip().endswith((".", "»", "!", "?")) or L[k - 1].startswith("Salas de nivel 3"))):
            k -= 1
        fin = j
        while not L[fin].strip().endswith("."):
            fin += 1
        n3.append({"nombre": L[k].strip(), "tema": tema, "texto": unir(L[k + 1:j]), "materiales": unir(L[j:fin + 1])})

    def parrafo(desde, hasta, i0=0):
        a, b = bloque(L, desde, hasta, i0)
        return unir(L[a:b])

    tr0 = next(i for i, l in enumerate(L) if l.strip() == "Trampas" and i > b2)
    trampas = {
        "intro": parrafo("Las trampas son defensas", "El mecanismo describe", tr0),
        "niveles": parrafo("Las trampas se clasifican", "Tiradas de trampa", tr0),
        "tirada": parrafo("Tira un número de dados igual al nivel de la trampa", "❖", tr0) + " " + unir([L[bloque(L, "Crítico: Hieres a dos", "❖", tr0)[1]].replace("❖", "")]),
    }
    a, b = bloque(L, "varios ejemplos de trucos", "Un truco nunca puede", tr0)
    ejemplos = [e.strip() for e in re.split(r"(?<=\)\.)\s+", unir(L[a + 1:b])) if e.strip()]
    trucos = {
        "intro": parrafo("Los trucos son formas sutiles", "Cuando los aventureros se hallan", tr0),
        "tirada": parrafo("Cuando los aventureros se hallan frente a un truco", "Los trucos se clasifican", tr0),
        "niveles": parrafo("Los trucos se clasifican", "varios ejemplos", tr0).rsplit(". ", 1)[0] + ".",
        "limite": parrafo("Un truco nunca puede", "200", tr0),
        "ejemplos": [{"nombre": re.search(r"\(([^:]+):", e).group(1).strip().capitalize(), "texto": e} for e in ejemplos],
    }
    portones = {
        "intro": parrafo("Los portones sirven para ganar tiempo", "Los portones se clasifican", tr0),
        "niveles": parrafo("Los portones se clasifican", "Al construir un portón", tr0),
        "construir": parrafo("Al construir un portón", "rompecabezas – temporizador", tr0).split(" barrotes")[0],
    }
    c0 = next(i for i, l in enumerate(L) if l.strip() == "Criaturas" and i < t0 + 600 and i > t0)
    criaturas = {
        "intro": parrafo("Las criaturas son bestias sin inteligencia", "Cuando los aventureros pasan cerca", c0),
        "tirada": parrafo("Tira un número de dados igual al nivel de la criatura", "❖", c0) + " " + unir([L[bloque(L, "Crítico: Hieres a dos", "❖", c0)[1]].replace("❖", "")]),
        "crear": parrafo("Cuando una criatura llega a vuestra mazmorra, decidís", "Las criaturas no son inteligentes", c0),
    }
    a, b = bloque(L, "Los rasgos anteriores os ofrecen", "191", c0)
    ej = unir(L[a:b]).split("ejemplos:", 1)[1]
    criaturas["ejemplos"] = {n.strip(): r for n, r in re.findall(r"([^()]+?) \(([^)]+)\)", ej)}

    if not os.environ.get("DEBUG") and (len(n1) != 6 or len(n2) != 5 or len(n3) != 35 or len(trucos["ejemplos"]) != 8 or len(criaturas["ejemplos"]) != 10):
        raise SystemExit(f"Labores mal leídas: n1={len(n1)} n2={len(n2)} n3={len(n3)} trucos={len(trucos['ejemplos'])} criaturas={len(criaturas['ejemplos'])}")
    return {"salas_n1": n1, "salas_n2": n2, "salas_n3": n3, "trampas": trampas, "trucos": trucos, "portones": portones, "criaturas": criaturas}


def main_labores():
    lab = labores(TEXTO.read_text(encoding="utf-8"))
    (SALIDA.parent / "labores_manual.json").write_text(json.dumps(lab, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"→ tools/datos/labores_manual.json: {len(lab['salas_n1'])}+{len(lab['salas_n2'])}+{len(lab['salas_n3'])} salas")


if __name__ == "__main__":
    main_labores()


# ---------------------------------------------------------------------------
# Facciones de ejemplo de los cuatro entornos (cap. 6). Están sobre los mapas: se leen
# por posición; los relojes son imágenes de 4, 6 u 8 segmentos y el bando es el color
# del estandarte (verde = luz, gris = neutral, rojo = oscura).
# ---------------------------------------------------------------------------
RELOJ_XREF = {3978: 4, 3986: 6, 3982: 8}
ENTORNOS = {"Cloacas de la Gran Ciudad": (282, 283), "Mares coloniales": (286, 287), "Valle Silencioso": (290, 291), "Zona de guerra": (294, 295)}


def facciones_pagina(doc, n):
    import fitz
    from collections import Counter
    p = doc[n - 1]
    spans = [s for b in p.get_text("dict")["blocks"] for l in b.get("lines", []) for s in l["spans"] if s["text"].strip()]
    coin = [s for s in spans if s["font"].startswith("Coinage")]
    relojes = [(im["bbox"], RELOJ_XREF[im["xref"]]) for im in p.get_image_info(xrefs=True) if im["xref"] in RELOJ_XREF]
    pm = p.get_pixmap(matrix=fitz.Matrix(2, 2))
    facs = []
    for b in coin:
        x, y = b["bbox"][0], b["bbox"][1]
        t = [s for s in coin if s["text"].strip().isdigit() and abs(s["bbox"][1] - y) < 4 and 0 < x - s["bbox"][0] < 30]
        if b["text"].strip().isdigit() or not t:
            continue
        c = Counter()
        x0, y0, x1, y1 = b["bbox"]
        for px in range(int(x0 * 2), int(x1 * 2)):
            for py in range(int(y0 * 2) + 2, int(y1 * 2) - 2):
                r, g, bl = pm.pixel(px, py)
                if r + g + bl < 400:
                    c[(r // 16, g // 16, bl // 16)] += 1
        r, g, _ = c.most_common(1)[0][0]
        bando = "light" if g > r else "dark" if r > g + 1 else "neutral"
        facs.append({"nombre": b["text"].strip(), "nivel": int(t[0]["text"]), "bando": bando, "x": x, "y": y, "rasgos": [], "relojes": []})

    def duena(sx, sy):
        cand = [f for f in facs if f["x"] - 25 <= sx <= f["x"] + 100 and 0 < sy - f["y"] < 130]
        return min(cand, key=lambda f: sy - f["y"]) if cand else None

    vinetas = [s for s in spans if s["font"].startswith("Wingdings")]
    for s in spans:
        if not (s["font"].startswith("Bitter-Regular") and s["size"] < 7):
            continue
        sx, sy = s["bbox"][0], s["bbox"][1]
        f = duena(sx, sy)
        if not f:
            continue
        txt = s["text"].strip()
        if any(abs(v["bbox"][1] - sy) < 3 and 0 < sx - v["bbox"][0] < 6 for v in vinetas):
            f["rasgos"].append(txt)
            continue
        r = [(rb, seg) for rb, seg in relojes if -2 < sy - rb[1] < 12 and 12 < sx - rb[0] < 120]
        if r:
            rb, seg = r[0]
            prev = next((c for c in f["relojes"] if c["y"] == rb[1]), None)
            if prev:
                prev["texto"] += " " + txt
            else:
                f["relojes"].append({"y": rb[1], "seg": seg, "texto": txt})
        elif f["rasgos"]:
            f["rasgos"][-1] += " " + txt
    for f in facs:
        f["relojes"] = [{"segmentos": c["seg"], "texto": re.sub(r"\s+", " ", c["texto"])} for c in sorted(f["relojes"], key=lambda c: c["y"])]
        f["rasgos"] = [re.sub(r"\s+", " ", x) for x in f["rasgos"]]
        f["pagina"] = n - 2
        del f["x"], f["y"]
        if not f["rasgos"] or not 1 <= len(f["relojes"]) <= 2:
            raise SystemExit(f"Facción mal leída: {f}")
    return facs


def main_facciones():
    import fitz
    doc = fitz.open(PDF)
    out = {e: [f for n in pags for f in facciones_pagina(doc, n)] for e, pags in ENTORNOS.items()}
    (SALIDA.parent / "facciones_manual.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print("→ tools/datos/facciones_manual.json:", {e: len(v) for e, v in out.items()})


if __name__ == "__main__":
    main_facciones()


# ---------------------------------------------------------------------------
# Vocaciones (cap. 2): capacidad principal y objetos de ejemplo, para los PJ pregenerados
# ---------------------------------------------------------------------------
VOCACIONES = ["Artesano", "Bandido", "Bruto", "Cazador", "Chamán", "Confabulador", "Fanático", "Hechicero", "Sombra"]


def vocaciones(texto):
    L = texto.splitlines()
    out = {}
    for v in VOCACIONES:
        i = next(k for k in range(len(L) - 1) if L[k].strip() == v and "capacidad principal" in " ".join(L[k + 1:k + 12]))
        a = next(k for k in range(i, i + 15) if "capacidad principal" in L[k]) + 1
        b = next(k for k in range(a, a + 15) if L[k].startswith("En tus flashbacks"))
        nombre, txt = unir(L[a:b]).split(": ", 1)
        o = next(k for k in range(b, b + 120) if L[k].startswith("Objetos de ejemplo d") and L[k].strip().endswith(v.lower()))
        objetos, k = [], o + 1
        while not re.match(r"^\d+$", L[k].strip()):
            l = L[k].strip()
            if l and l[0].islower() and objetos:
                objetos[-1] += " " + l
            elif l:
                objetos.append(l)
            k += 1
        out[v] = {"capacidad": nombre.strip(), "texto": txt.strip(), "objetos": objetos}
    return out


def main_vocaciones():
    voc = vocaciones(TEXTO.read_text(encoding="utf-8"))
    (SALIDA.parent / "vocaciones_manual.json").write_text(json.dumps(voc, ensure_ascii=False, indent=1), encoding="utf-8")
    print("→ tools/datos/vocaciones_manual.json:", len(voc), "vocaciones")


if __name__ == "__main__":
    main_vocaciones()
