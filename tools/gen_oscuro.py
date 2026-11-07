#!/usr/bin/env python3
"""Genera styles/oscuro-pips.css: recolorea en modo oscuro los indicadores NEGROS del sistema Wicked Ones
(casillas de habilidad, conmoción, reventado, reloj de estrés, etc.) leyendo su CSS compilado.
Uso: python3 tools/gen_oscuro.py [ruta/a/wicked.css]
Así no se toca ni una imagen: cada regla del sistema que pinta uno de esos PNG recibe un filtro en oscuro."""
import re, sys, os

AQUI = os.path.dirname(os.path.abspath(__file__))
ORIGEN = sys.argv[1] if len(sys.argv) > 1 else "/Volumes/Datos_Dock/FoundryVTT/Trabajo WO/base/wicked-ones/styles/wicked.css"
DESTINO = os.path.join(AQUI, "..", "styles", "oscuro-pips.css")

# Imágenes del sistema dibujadas en negro (invisibles sobre fondo oscuro). Las variantes «white», rojas y de color se dejan.
NEGROS = ("box-empty", "box-filled", "box-crossed", "box-slashed", "bloodied-empty", "bloodied-filled.png",
          "bloodied-minion-empty.png", "bloodied-minion-filled.png", "empowered-empty", "empowered-filled.png",
          "threatened-empty", "threatened-filled.png", "shock-empty", "shock-filled", "heart-empty", "stresstooth-black",
          "a-heart-slashed", "box-greyed")
# Reglas sobre celdas con texto dentro (no se les puede aplicar filter): se tratan a mano en oscuro.css
OMITIR = ("growth-path",)

css = open(ORIGEN, encoding="utf-8").read()
css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
reglas = re.findall(r"([^{}]+)\{([^{}]*)\}", css)

vistos, salida = set(), []
for sel, cuerpo in reglas:
    for url in re.findall(r"url\([\"']?([^)\"']+)", cuerpo):
        base = url.split("/")[-1]
        if not any(base.startswith(n) or n in base for n in NEGROS):
            continue
        if base.startswith(("box-white", "box-red", "box-gray")):
            continue
        sels = [s.strip() for s in sel.split(",") if s.strip()]
        sels = [s for s in sels if not any(o in s for o in OMITIR)]
        for s in sels:
            if s in vistos:
                continue
            vistos.add(s)
            salida.append(s)

# --- Textos y fondos oscuros del sistema que, sobre fondo oscuro, desaparecen -----------------------------------
TINTA = {"#191919", "black", "#000", "#000000"}
ORO = {"#68332c", "#400000", "#311815", "#862118"}
SANGRE = {"#a20000", "#b12c20"}
FONDOS_CLAROS = {"#c9c7b8": "var(--mr-wo-papel-3)", "#e8e8ef": "var(--mr-wo-papel-2)", "#bdb7ab": "var(--mr-wo-papel-3)",
                 "#fffaf096": "color-mix(in oklab, var(--mr-wo-papel) 85%, transparent)"}
ENTORNO = ("form.", "#attributes", ".wicked-ones", ".item-", ".tab", "table.", "#abilities", "#loadout", "#duties", ".label-stripe")
txt, fondos = {}, {}
for sel, cuerpo in reglas:
    sels = [s.strip() for s in sel.split(",") if s.strip() and not s.strip().startswith(("@", "from", "to", "0%", "100%"))]
    sels = [s for s in sels if s.startswith(ENTORNO) and "tooltip" not in s and "chat" not in s and "wicked-roll" not in s]
    if not sels:
        continue
    m = re.search(r"(?<![-\w])color:\s*([^;!]+)", cuerpo)
    if m:
        v = m.group(1).strip().lower()
        tok = "tinta" if v in TINTA else "oro" if v in ORO else "sangre" if v in SANGRE else None
        if tok:
            txt.setdefault(tok, []).extend(sels)
    m = re.search(r"background(?:-color)?:\s*([^;!]+)", cuerpo)
    if m:
        v = m.group(1).strip().lower()
        if v in FONDOS_CLAROS:
            fondos.setdefault(v, []).extend(sels)
        elif v == "rgba(0, 0, 0, 0.05)" or v == "rgba(0, 0, 0, 0.15)":
            fondos.setdefault("sombra", []).extend(sels)

with open(DESTINO, "w", encoding="utf-8") as f:
    f.write("/* GENERADO por tools/gen_oscuro.py a partir de wicked.css: no editar a mano.\n"
            "   Recolorea los indicadores negros del sistema cuando el modo oscuro está activo. */\n")
    for s in salida:
        f.write(f"body.mr-wo-oscuro {s},\n")
    f.write("body.mr-wo-oscuro .mr-wo-pip-fix {\n  filter: var(--mr-wo-filtro-pip, invert(0.92) sepia(0.28) saturate(1.2) brightness(1.02));\n}\n")
    for tok, sels in txt.items():
        uniq = list(dict.fromkeys(sels))
        f.write("\n" + ",\n".join(f"body.mr-wo-oscuro {s}" for s in uniq) + f" {{\n  color: var(--mr-wo-{tok});\n}}\n")
    for v, sels in fondos.items():
        uniq = list(dict.fromkeys(sels))
        val = "rgba(255, 255, 255, 0.07)" if v == "sombra" else FONDOS_CLAROS[v]
        f.write("\n" + ",\n".join(f"body.mr-wo-oscuro {s}" for s in uniq) + f" {{\n  background: {val};\n}}\n")
    print(f"textos: { {k: len(set(v)) for k, v in txt.items()} } fondos: { {k: len(set(v)) for k, v in fondos.items()} }")
print(f"{len(salida)} selectores -> {os.path.relpath(DESTINO)}")
