#!/usr/bin/env python3
"""Extrae del manual traducido (PDF) lo que los compendios no traen de cada libreto: introducción, capacidad principal,
objetos de ejemplo de cada vocación y la descripción de cada raza. Salida: content/libretos.json.
Uso: python3 tools/libretos.py "<ruta al PDF>"   (el PDF no se distribuye; solo el JSON resultante)"""
import json, re, sys
from pathlib import Path
import fitz

PDF = sys.argv[1] if len(sys.argv) > 1 else "/Volumes/Datos_Dock/Rol/01 Sistemas de juego/Colección de sistemas/Wicked Ones/Wicked Ones - The Hills Press (Español).pdf"
OUT = Path(__file__).resolve().parent.parent / "content" / "libretos.json"
VOC = ["Artesano", "Bandido", "Bruto", "Cazador", "Chamán", "Confabulador", "Fanático", "Hechicero", "Sombra"]
doc = fitz.open(PDF)
pag = {i + 1: doc[i].get_text() for i in range(len(doc))}
clean = lambda t: re.sub(r"[ \t]+", " ", re.sub(r"\s*\n\s*", " ", t)).strip()

voc = []
for p, t in pag.items():
    lines = [l.strip() for l in t.split("\n") if l.strip()]
    if len(lines) > 3 and lines[0] == "Wicked Ones" and lines[1] in VOC and "capacidad principal" in t:
        nombre = lines[1]
        resto = lines[2:]
        lema = ""
        if len(resto[0]) <= 60 and not resto[0].endswith((",", ".")):
            lema, resto = resto[0], resto[1:]
        cuerpo = clean(" ".join(resto))
        m = re.search(r"^(.*?)\s*Empiezas a jugar con la siguiente capacidad principal:\s*(.*?)\s*En tus flashbacks, (.*?)(?:\s+\d{2,3})?$", cuerpo)
        if not m:
            print("sin parsear", nombre); continue
        intro, principal, flash = m.groups()
        # restos de cabecera de la página siguiente colados al final del flashback
        flash = re.sub(r"\s+(?:Genio|Guerreros|Artífices|Pícaros)[^.]*$", "", flash)
        pn = re.match(r"([^:]+):\s*(.*)", principal, re.S)
        sig = pag.get(p + 1, "")
        obj = []
        mo = re.search(r"Objetos de ejemplo d(?:el|e la) [^\n]+\n(.*?)(?:\n\d{2,3}\s*\nPersonajes|\Z)", sig, re.S)
        if mo:
            obj = [l.strip() for l in mo.group(1).split("\n") if l.strip() and not re.fullmatch(r"\d+", l.strip())]
            fus = []
            for l in obj:
                if fus and (fus[-1].endswith((" de", " del", " con", " para", " y", " la", " el")) or l[:1].islower()):
                    fus[-1] += " " + l
                else:
                    fus.append(l)
            obj = fus
        voc.append({"id": nombre.lower().replace("á", "a").replace("ú", "u"), "nombre": nombre, "pagina": p, "lema": lema,
                    "intro": intro.strip(),
                    "principal": {"nombre": pn.group(1).strip(), "texto": pn.group(2).strip()} if pn else {"nombre": "", "texto": principal},
                    "flashback": "En tus flashbacks, " + flash.strip().rstrip(".") + ".", "objetos": obj})

# Razas (págs. 92-93 del libro = páginas 92 y 93 del PDF): cada párrafo empieza por «Los/Las <raza>s ...»
RAZAS = ["goblins", "demonios", "kóbolds", "sérpidos", "osgos", "orcos"]
razas = []
txt = "\n".join(pag[i] for i in (92, 93))
partes = re.split(r"\n(?=Los (?:goblins|demonios|kóbolds|sérpidos|osgos|orcos) )", "\n" + txt)
for bloque in partes:
    m = re.match(r"Los (goblins|demonios|kóbolds|sérpidos|osgos|orcos) (.*)", bloque.strip(), re.S)
    if not m: continue
    plural = m.group(1)
    cuerpo = m.group(0)
    nombres = re.search(r"Nombres habituales:\s*(.*?)(?:\n\d{2,3}\s*\n|\nCapítulo|\Z)", cuerpo, re.S)
    desc = re.split(r"Un \w+ diría:", cuerpo)[0]
    diria = re.search(r"Un \w+ diría:\s*(.*?)\s*Nombres habituales", cuerpo, re.S)
    sing = {"goblins": "Goblin", "demonios": "Demonio", "kóbolds": "Kóbold", "sérpidos": "Sérpido", "osgos": "Osgo", "orcos": "Orco"}[plural]
    razas.append({"id": sing.lower().replace("é", "e").replace("ó", "o"), "nombre": sing, "pagina": 92, "texto": clean(desc),
                  "dice": [x for x in (clean(y).lstrip("—").strip() for y in re.split(r"\n—", "\n" + diria.group(1))) if x] if diria else [],
                  "nombres": [x.strip().capitalize() for x in re.split(r"\s*[-–]\s*|\s*\n\s*", nombres.group(1)) if x.strip()] if nombres else []})
OUT.parent.mkdir(exist_ok=True)
OUT.write_text(json.dumps({"vocaciones": voc, "razas": razas}, ensure_ascii=False, indent=1), encoding="utf-8")
print(len(voc), "vocaciones;", len(razas), "razas →", OUT)
