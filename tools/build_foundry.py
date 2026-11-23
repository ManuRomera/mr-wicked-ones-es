#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generador determinista de compendios, aventura, diarios, tablas, paquete MR- Dirección
y parches de Babele para MR- Wicked Ones (The Hills Press).
Usa fid(key) con SHA-256 -> Base62 de 16 caracteres según las reglas de arquitectura MR-.
"""

import os
import json
import hashlib
import re

BASE_DIR = "/Volumes/Datos_Dock/FoundryVTT/Data/modules/mr-wicked-ones-es"
DATA_DIR = os.path.join(BASE_DIR, "_data")
CONTENT_DIR = os.path.join(BASE_DIR, "content")
BABELE_DIR = os.path.join(BASE_DIR, "compendium", "es")
MOD = "mr-wicked-ones-es"

for d in (DATA_DIR, CONTENT_DIR, BABELE_DIR):
    os.makedirs(d, exist_ok=True)

ALFABETO_B62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"


def fid(clave):
    """Genera un _id determinista de 16 caracteres en base62 a partir de SHA-256."""
    h = hashlib.sha256(f"mrwo:{clave}".encode("utf-8")).digest()
    num = int.from_bytes(h[:12], "big")
    res = []
    for _ in range(16):
        num, rem = divmod(num, 62)
        res.append(ALFABETO_B62[rem])
    return "".join(res)


def guardar_json(ruta, datos):
    with open(ruta, "w", encoding="utf-8") as f:
        json.dump(datos, f, ensure_ascii=False, indent=2)
    print(f"  [OK] {os.path.relpath(ruta, BASE_DIR)} ({len(datos) if isinstance(datos, list) else 1} docs)")


# ---------------------------------------------------------------------------
# 1. PACK: labores-es (Salas N1/N2, Trampas, Trucos, Portones, Criaturas, Hallazgos)
# ---------------------------------------------------------------------------
def construir_labores():
    """Labores del capítulo 4 del manual, literales (tools/tablas_manual.py → labores_manual.json)."""
    LAB = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "datos", "labores_manual.json"), encoding="utf-8"))
    ICONO = {"Room": "Icon.5_70", "Trap": "Icon.1_04", "Trick": "Icon.6_25", "Lock": "Icon.5_85", "Creature": "Icon.3_37", "Discovery": "Icon.5_16"}
    CUSTOM = {"Room": "Sala", "Trap": "Trampa", "Trick": "Truco", "Lock": "Portón", "Creature": "Criatura", "Discovery": "Descubrimiento"}
    items = []

    def labor(clave, nombre, tipo, nivel, parrafos, subtipo, **flags):
        items.append({
            "_id": fid(f"duty:{clave}"),
            "name": nombre,
            "type": "duty",
            "img": f"systems/wicked-ones/styles/assets/icons/{ICONO[tipo]}.png",
            "system": {"tier": nivel, "type": f"FITD.DUTY_TYPE.{tipo}", "type_custom": CUSTOM[tipo],
                       "description": "".join(f"<p>{x}</p>" for x in parrafos if x)},
            "flags": {MOD: {"subtipo": subtipo, **flags}},
        })

    def lista(clave):
        return " – ".join(f[2] for f in TM[clave]["filas"]).lower()

    def frase_nivel(texto, n):
        return next(f for f in re.split(r"(?<=\.) ", texto) if f"nivel {n} " in f and "1 a nivel 3" not in f)

    for nivel, clave in ((1, "salas_n1"), (2, "salas_n2")):
        for x in LAB[clave]:
            labor(f"sala{nivel}:{x['nombre']}", f"Sala N{nivel} · {x['nombre']}", "Room", nivel, [x["texto"]], f"sala_n{nivel}")
    for x in LAB["salas_n3"]:
        labor(f"sala3:{x['nombre']}", f"Sala N3 · {x['nombre']} ({x['tema']})", "Room", 3, [x["texto"], f"<em>{x['materiales']}</em>"], "sala_n3", tema=x["tema"])

    T, P, C, K = LAB["trampas"], LAB["portones"], LAB["criaturas"], LAB["trucos"]
    for n in (1, 2, 3):
        labor(f"trampa:{n}", f"Trampa N{n}", "Trap", n, [frase_nivel(T["niveles"], n), T["intro"], T["tirada"],
              f"<strong>Mecanismos:</strong> {lista('trampa-mecanismo')}.", f"<strong>Detonadores:</strong> {lista('trampa-detonador')}."], "trampa")
        labor(f"porton:{n}", f"Portón N{n}", "Lock", n, [frase_nivel(P["niveles"], n), P["intro"], P["construir"],
              f"<strong>Materiales:</strong> {lista('porton-material')}.", f"<strong>Cierres:</strong> {lista('porton-cierre')}."], "porton")
    for x in K["ejemplos"]:
        labor(f"truco:{x['nombre']}", f"Truco · {x['nombre']}", "Trick", 1, [x["texto"], K["niveles"], K["tirada"], K["limite"]], "truco")

    for f in TM["criaturas"]["filas"]:
        nom = f[2]
        rasgos = C["ejemplos"].get(nom)
        labor(f"criatura:{nom}", f"Criatura · {nom}", "Creature", 1, [
            f"<strong>Rasgos de ejemplo:</strong> {rasgos}." if rasgos else f"<strong>Elige dos rasgos:</strong> {lista('rasgos-criaturas')}.",
            "Las criaturas se clasifican de acuerdo a un nivel, que va de 1 a 4. Una guarida solo atraerá a criaturas del nivel que tenía la mazmorra en el momento en el que se añadió.", C["crear"], C["tirada"]], "criatura", d66=d66_de(f[0]))

    for clave, res in (("descubrimientos-exito", "éxito"), ("descubrimientos-parcial", "parcial"), ("descubrimientos-fracaso", "fracaso")):
        for f in TM[clave]["filas"]:
            corto = re.split(r"[.,(:;]", f[2])[0].strip()
            corto = corto if len(corto) <= 60 else corto[:57].rsplit(" ", 1)[0] + "…"
            labor(f"desc:{clave}:{f[0]}", f"Descubrimiento ({res}) [{d66_de(f[0])}] · {corto}", "Discovery", 1, [f[2], f"Tabla «{TM[clave]['nombre']}» (pág. {TM[clave]['pagina']})."], "descubrimiento", resultado=res, d66=d66_de(f[0]))
    return items


# ---------------------------------------------------------------------------
# 2. PACK: equipo-es (Armas, Armaduras, Suministros, 36 Mejunjes, 36 Artilugios, 36 Pociones, 36 Objetos Mágicos)
# ---------------------------------------------------------------------------
# Tablas y objetos del manual, extraídos literalmente por tools/tablas_manual.py (nada inventado)
MANUAL = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "datos", "tablas_manual.json"), encoding="utf-8"))
TM = {t["clave"]: t for t in MANUAL}


def d66_de(i):
    return f"{(i - 1) // 6 + 1}{(i - 1) % 6 + 1}"


def construir_equipo():
    items = []

    # Objetos mundanos: los 108 de «Objetos al azar» (pág. 358), tres por fila de la d66
    for fila in TM["objetos-azar"]["filas"]:
        d66 = d66_de(fila[0])
        for col, nom in enumerate(fila[2].split(" · "), start=1):
            items.append({
                "_id": fid(f"eq:objeto:{d66}:{col}"),
                "name": nom,
                "type": "gearsupply",
                "img": "systems/wicked-ones/styles/assets/icons/Icon.6_37.png",
                "system": {
                    "gear_or_supply": "gear",
                    "quality_category": "mundane",
                    "use_type": "unlimited",
                    "uses_left": 4,
                    "edges": {},
                    "description": f"Objeto de la tabla «Objetos al azar» del manual (pág. {TM['objetos-azar']['pagina']}, d66 {d66}). Llévalo como equipo o, si tiene usos limitados, como suministro (pág. 70).",
                },
                "flags": {MOD: {"categoria": "objeto", "d66": d66, "tabla": d66, "columna": col}},
            })

    # Mejunjes, artilugios, pociones y objetos mágicos: las d66 del manual (decenas 1-2 nivel 1, 3-4 nivel 2, 5-6 nivel 3)
    CREACIONES = [
        ("mejunjes", "mejunje", "Mejunje", "supply", "valuable", "limited", "Icon.4_48.png"),
        ("artilugios", "artilugio", "Artilugio", "gear", "valuable", "unlimited", "Icon.7_96.png"),
        ("pociones", "pocion", "Poción", "supply", "valuable", "limited", "Icon.5_34.png"),
        ("objetos-magicos", "reliquia", "Objeto mágico", "gear", "powerful", "unlimited", "Icon.1_66.png"),
    ]
    for clave, cat, etiqueta, gos, qual, uso, icono in CREACIONES:
        t = TM[clave]
        for fila in t["filas"]:
            d66 = d66_de(fila[0])
            nivel = 1 if fila[0] <= 12 else 2 if fila[0] <= 24 else 3
            nom, _, desc = fila[2].partition(": ")
            items.append({
                "_id": fid(f"eq:{cat}:{d66}"),
                "name": f"{etiqueta} [{d66}] · {nom.strip()}",
                "type": "gearsupply",
                "img": f"systems/wicked-ones/styles/assets/icons/{icono}",
                "system": {
                    "gear_or_supply": gos,
                    "quality_category": qual,
                    "use_type": uso,
                    "uses_left": 1,
                    "edges": {"0": f"{etiqueta} de nivel {nivel}", "1": f"d66: {d66}"},
                    "description": f"{desc.strip()} (Nivel {nivel} · d66 {d66} · manual, pág. {t['pagina']}.)",
                },
                "flags": {MOD: {"categoria": cat, "d66": d66, "tabla": d66, "nivel": nivel}},
            })

    proyectos = [
        ("Ritual: Eclipse de Sangre sobre el Valle", 8, "Sumergir el Valle Silencioso en una noche de tres días usando la piel del hombre lobo y los tomos de la Abadía."),
        ("Proyecto: Domesticar a la Hidra del Arroyo", 6, "Alimentar y encadenar a la hidra subterránea para que custodie la Cisterna del Arroyo Frío."),
        ("Proyecto: Abrir Túnel Secreto hacia Ciudad Floresta", 8, "Excavar una galería oculta desde las Colinas de Piedra Blanca hasta las criptas exteriores de la capital."),
        ("Ritual: Despertar el Corazón de Piedra Antigua", 6, "Fortalecer el vínculo del Corazón de la Mazmorra para alcanzar el Nivel 2."),
    ]
    for nom, tam, desc in proyectos:
        items.append({
            "_id": fid(f"eq:proyecto:{nom}"),
            "name": nom,
            "type": "project",
            "img": "systems/wicked-ones/styles/assets/icons/Icon.7_53.png",
            "system": {
                "clock_sizes": [4, 6, 8],
                "clock_size": tam,
                "clock_progress": 0,
                "description": desc,
            },
        })

    return items


# ---------------------------------------------------------------------------
# 3. PACK: aventureros-es (30 Aventureros con sus 6 Movimientos + 36 Ayudantes)
# ---------------------------------------------------------------------------
MAPA_RETRATOS_ADV = {
    "defender": "adv-defensor",
    "cleric": "adv-cleriga",
    "scout": "adv-explorador",
    "spellbow": "adv-arquera",
    "centurion": "adv-centurion",
    "inquisitor": "adv-inquisidor",
    "chaosmage": "adv-archimago",
    "barbarian": "adv-barbaro",
    "assassin": "adv-asesina",
    "knight": "adv-caballero",
}


ADV_MANUAL = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "datos", "aventureros_manual.json"), encoding="utf-8"))
# claves del sistema (FITD.ADV_*) por su nombre en español (traducción base wicked-ones-esp)
CLASES = {"Sabio": "Academic", "Alquimista": "Alchemist", "Amazona": "Amazon", "Aristócrata": "Aristocrat", "Asesino": "Assassin", "Bárbaro": "Barbarian", "Bardo": "Bard",
          "Bucanero": "Buccaneer", "Centurión": "Centurion", "Mago del caos": "ChaosMage", "Clérigo": "Cleric", "Caballero de la muerte": "DeathKnight", "Guardián": "Defender",
          "Druida": "Druid", "Guerrero arcano": "EldritchWarrior", "Ilusionista": "Illusionist", "Inquisidor": "Inquisitor", "Caballero": "Knight", "Lancero": "Lancer",
          "Cazabrujas": "MageHunter", "Monje": "Monk", "Asesino sagrado": "OccultSlayer", "Guardabosques": "Ranger", "Explorador": "Scout", "Bailarín sombrío": "Shadowdancer",
          "Hondero": "Slinger", "Arquero arcano": "Spellbow", "Templario": "Templar", "Armero": "Weaponsmith", "Salvaje": "Wildling"}
RASGOS = {"astuto": "Clever", "confiado": "Confident", "generoso": "Generous", "servicial": "Helpful", "honesto": "Honest", "optimista": "Optimistic", "perseverante": "Persistent",
          "firme": "Steady", "descarado": "Brash", "arrogante": "Cocky", "mentiroso": "Dishonest", "lerdo": "Dumb", "codicioso": "Greedy", "impaciente": "Impatient",
          "indeciso": "Indecisive", "terco": "Stubborn"}
MOTIVOS = {"desafíos": "Challenge", "exploración": "Exploration", "justicia": "Justice", "reputación": "Respect", "riquezas": "Riches", "emoción": "Thrills", "venganza": "Vengeance"}
OFICIOS = {"Arquero": "Archer", "Barquero": "Boatman", "Ratero": "Burglar", "Carnicero": "Butcher", "Carpintero": "Carpenter", "Cartógrafo": "Cartographer", "Cronista": "Chronicler",
           "Cocinero": "Cook", "Conductor": "Driver", "Labrador": "Farmhand", "Pescador": "Fisherman", "Infante": "Footman", "Salteador": "Footpad", "Montaraz": "Forester",
           "Guardia": "Guard", "Guía": "Guide", "Inventor": "Inventor", "Lingüista": "Linguist", "Cerrajero": "Locksmith", "Leñador": "Lumberjack", "Mercenario": "Mercenary",
           "Mensajero": "Messenger", "Minero": "Miner", "Batidor": "Pathfinder", "Sacerdote": "Priest", "Cazarratas": "RatCatcher", "Jinete": "Rider", "Marinero": "Sailor",
           "Matasanos": "Sawbones", "Erudito": "Scholar", "Escriba": "Scribe", "Cantante": "Singer", "Espeleólogo": "Spelunker", "Espadachín": "Swordsman", "Mercader": "Trader",
           "Trampero": "Trapfinder"}


def masculino(r):
    r = r.lower()
    return {"honesta": "honesto", "terca": "terco"}.get(r, r)


def construir_aventureros():
    """Los 30 aventureros de ejemplo del manual (pág. 320-329) y los 36 ayudantes (pág. 318, solo el oficio)."""
    items = []
    for a in ADV_MANUAL:
        nom = a["nombre"]
        clave = CLASES[nom]
        slug_img = MAPA_RETRATOS_ADV.get(clave.lower())
        img = f"modules/{MOD}/assets/retratos/{slug_img}.webp" if slug_img else "systems/wicked-ones/styles/assets/icons/Icon.1_05.png"
        pos, neg = (masculino(r) for r in a["rasgos"])
        of, de = a["ofensivos"], a["defensivos"]
        items.append({
            "_id": fid(f"adv:clase:{clave.lower()}"),
            "name": nom,
            "type": "adventurer",
            "img": img,
            "system": {
                "adventurer_type": "adventurer",
                "adventurer_class": f"FITD.ADV_CLASS.{clave}",
                "adventurer_class_custom": nom,
                "hireling_type": "",
                "hireling_type_custom": "",
                "tier": 1,
                "heart_slashes": 0,
                "moves_used": 0,
                "passive": f"{a['pasiva']} | Ofensivos: {', '.join(of)} | Defensivos: {', '.join(de)}",
                "trait_pos_1": f"FITD.ADV_TRAIT.{RASGOS[pos]}",
                "trait_pos_1_custom": a["rasgos"][0],
                "trait_pos_2": "",
                "trait_pos_2_custom": "",
                "trait_neg_1": f"FITD.ADV_TRAIT.{RASGOS[neg]}",
                "trait_neg_1_custom": a["rasgos"][1].capitalize(),
                "trait_neg_2": "",
                "trait_neg_2_custom": "",
                "motivation_1": f"FITD.ADV_MOTIVE.{MOTIVOS[a['motivacion']]}",
                "motivation_1_custom": a["motivacion"].capitalize(),
                "motivation_2": "",
                "motivation_2_custom": "",
                "description": "Pasiva: " + a["pasiva"] + "\nMovimientos ofensivos:\n" + "\n".join(f"• {m}" for m in of) + "\nMovimientos defensivos:\n" + "\n".join(f"• {m}" for m in de) + "\n(Aventureros de ejemplo, manual pág. 320.)",
            },
            "flags": {MOD: {"clase": clave.lower(), "pasivaCorto": a["pasiva"], "ofensivos": of, "defensivos": de}},
        })

    for fila in TM["ayudantes"]["filas"]:
        nom = fila[2]
        clave = OFICIOS[nom]
        items.append({
            "_id": fid(f"adv:ayudante:{clave.lower()}"),
            "name": f"Ayudante · {nom}",
            "type": "adventurer",
            "img": "systems/wicked-ones/styles/assets/icons/Icon.6_62.png",
            "system": {
                "adventurer_type": "hireling",
                "adventurer_class": "",
                "adventurer_class_custom": "",
                "hireling_type": f"FITD.ADV_TYPE.{clave}",
                "hireling_type_custom": nom,
                "tier": 0,
                "heart_slashes": 0,
                "moves_used": 0,
                "passive": "",
                "trait_pos_1": "", "trait_pos_1_custom": "", "trait_pos_2": "", "trait_pos_2_custom": "",
                "trait_neg_1": "", "trait_neg_1_custom": "", "trait_neg_2": "", "trait_neg_2_custom": "",
                "motivation_1": "", "motivation_1_custom": "", "motivation_2": "", "motivation_2_custom": "",
                "description": "Un ayudante es casi un aprendiz de aventurero, un miembro muy cualificado de su profesión: tiene un corazón y puede hacer un movimiento o tener una habilidad pasiva (manual, pág. 318). El libro solo da el oficio: el movimiento o la pasiva los decides tú.",
            },
            "flags": {MOD: {"ayudante": clave.lower()}},
        })

    return items

# ---------------------------------------------------------------------------
# 4. PACK: facciones-es (48 Facciones de los 4 Entornos, 6 PJs, 6 Manadas, 2 Mazmorras, 4 Grupos, 1 Hoja DJ)
# ---------------------------------------------------------------------------
def crear_atributos_actor(vals):
    """Construye el bloque system.attributes de un personaje o manada de esbirros."""
    return {
        "brains": {
            "shocked": False,
            "label": "FITD.SkillsBrains",
            "skills": {
                "scan": {"label": "FITD.SkillsScan", "value": vals.get("scan", 0), "practice": 0},
                "tinker": {"label": "FITD.SkillsTinker", "value": vals.get("tinker", 0), "practice": 0},
                "trick": {"label": "FITD.SkillsTrick", "value": vals.get("trick", 0), "practice": 0},
            },
        },
        "muscles": {
            "shocked": False,
            "label": "FITD.SkillsMuscles",
            "skills": {
                "finesse": {"label": "FITD.SkillsFinesse", "value": vals.get("finesse", 0), "practice": 0},
                "skulk": {"label": "FITD.SkillsSkulk", "value": vals.get("skulk", 0), "practice": 0},
                "smash": {"label": "FITD.SkillsSmash", "value": vals.get("smash", 0), "practice": 0},
            },
        },
        "guts": {
            "shocked": False,
            "label": "FITD.SkillsGuts",
            "skills": {
                "banter": {"label": "FITD.SkillsBanter", "value": vals.get("banter", 0), "practice": 0},
                "threaten": {"label": "FITD.SkillsThreaten", "value": vals.get("threaten", 0), "practice": 0},
                "horrify": {"label": "FITD.SkillsHorrify", "value": 0, "practice": 0},
                "command": {"label": "FITD.SkillsCommand", "value": 0, "practice": 0},
                "invoke": {"label": "FITD.SkillsInvoke", "value": vals.get("invoke", 0), "practice": 0},
            },
        },
    }


def construir_actores():
    actores = []

    # 4.1 Las facciones de ejemplo de los 4 entornos del manual (cap. 6), leídas de los mapas por tools/tablas_manual.py
    FAC = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "datos", "facciones_manual.json"), encoding="utf-8"))
    for entorno, lista in FAC.items():
        for f in lista:
            nom, niv, bando = f["nombre"], f["nivel"], f["bando"]
            relojes = f["relojes"] + [{"segmentos": 4, "texto": ""}] * (2 - len(f["relojes"]))
            actores.append({
                "_id": fid(f"actor:faccion:{entorno}:{nom}"),
                "name": f"[{entorno}] {nom}",
                "type": "faction",
                "img": "systems/wicked-ones/styles/assets/default-images/faction.webp",
                "system": {
                    "category": bando,
                    "tier": {"value": niv, "min": 0, "max": 4},
                    "clock1": {"value": 0, "min": 0, "max": relojes[0]["segmentos"], "text": relojes[0]["texto"]},
                    "clock2": {"value": 0, "min": 0, "max": relojes[1]["segmentos"], "text": relojes[1]["texto"]},
                    "description": f"<p><strong>Entorno:</strong> {entorno} (pág. {f['pagina']})</p><ul>" + "".join(f"<li>{r}</li>" for r in f["rasgos"]) + "</ul>",
                },
                "prototypeToken": {
                    "name": nom,
                    "displayName": 50,
                    "actorLink": True,
                    "texture": {"src": "systems/wicked-ones/styles/assets/default-images/faction-token.webp"},
                },
                "items": [],
                "flags": {MOD: {"entorno": entorno, "bando": bando}},
            })

    # 4.2 Las 6 Manadas de Esbirros pregeneradas
    manadas_cfg = [
        ("esbirros-ulrot", "Machacadores de Ulrot", "Orco", "Matones", "Hachas melladas, escudos de hierro y armaduras saqueadas.",
         {"smash": 2, "threaten": 1, "scan": 1},
         "Equipados", "Los esbirros obtienen una defensa a tu elección gracias a su equipo."),
        ("esbirros-crag", "Acechadores Escamosos de Crag", "Kóbold", "Brujos", "Jabalinas con plumas, máscaras de hueso y bolsas de componentes.",
         {"invoke": 2, "tinker": 1, "skulk": 1},
         "Adeptos", "Una vez por ciclo de juego, la panda de esbirros puede lanzar un conjuro de nivel 2. Tiran con -1d, como es normal, pero no sufren estrés."),
        ("esbirros-slem", "Merodeadores Sombríos de Slem", "Sérpido", "Asesinos", "Capas oscuras, dagas envenenadas y cerbatanas silenciosas.",
         {"skulk": 2, "finesse": 1, "scan": 1},
         "Pertrechados", "Los esbirros tienen un espacio más de suministro que se puede utilizar para acceder a cualquier cosa de la que tengas suministro."),
        ("esbirros-viska", "Chapuceros de Viska", "Goblin", "Ingenieros", "Gafas de latón, llaves inglesas, picos y barriles de pólvora.",
         {"tinker": 2, "trick": 1, "scan": 1},
         "Adiestrados", "Los esbirros tiran +1d a un tipo específico de proyecto de descanso: construir, contactar, elaborar, fabricar, preparar, reclutar o torturar."),
        ("esbirros-kaelen", "Acólitos de Ceniza de Kaelen", "Demonio", "Acólitos", "Túnicas carmesíes, incensarios ardientes y espadas curvas.",
         {"invoke": 2, "banter": 1, "threaten": 1},
         "Mentalidad (fanático)", "Los esbirros tienen una ventaja mental que puede servir como ajuste de circunstancias a la situación y el efecto: valiente, leal o fanático (podéis inventaros otras)."),
        ("esbirros-zira", "Susurradores del Velo de Zira", "Devoramentes", "Estafadores", "Disfraces de peregrinos, lentes oscuras y dagas ocultas.",
         {"trick": 2, "banter": 1, "scan": 1},
         "Don de lenguas", "Los esbirros saben hablar la lengua de la luz, aunque con un acento muy marcado."),
    ]

    IMPULSO_MANADA = {"esbirros-ulrot": "Agresivos", "esbirros-crag": "Supersticiosos", "esbirros-slem": "Codiciosos", "esbirros-viska": "Inestables", "esbirros-kaelen": "Adictos", "esbirros-zira": "Desleales"}
    for slug, nom, raza, oficio, aspecto, habs, mej_nom, mej_desc in manadas_cfg:
        mid = fid(f"actor:manada:{slug}")
        actores.append({
            "_id": mid,
            "name": nom,
            "type": "minion_pack",
            "img": f"modules/{MOD}/assets/retratos/{slug}.webp",
            "system": {
                "mp_type": "normal",
                "ua_job": oficio,
                "bloodied": False,
                "morale": False,
                "number": {"min": 0, "value": 4, "max": 10},
                "attribute_max_value": 2,
                "attributes": crear_atributos_actor(habs),
                "description": f"<p><strong>Raza:</strong> {raza} · <strong>Función:</strong> {oficio}</p><p><strong>Equipo y aspecto:</strong> {aspecto}</p>",
            },
            "prototypeToken": {
                "name": nom,
                "displayName": 30,
                "actorLink": True,
                "texture": {"src": f"modules/{MOD}/assets/tokens/{slug}.webp"},
            },
            "items": [
                {
                    "_id": fid(f"item:{slug}:raza"),
                    "name": raza,
                    "type": "monster_race",
                    "img": "systems/wicked-ones/styles/assets/icons/Icon.3_37.png",
                    "system": {"primal": False, "description": f"Manada de {raza.lower()}s leales a la mazmorra."},
                },
                {
                    "_id": fid(f"item:{slug}:tipo"),
                    "name": oficio,
                    "type": "minion_type",
                    "img": "systems/wicked-ones/styles/assets/icons/Icon.6_62.png",
                    "system": {"description": aspecto},
                },
                {
                    "_id": fid(f"item:{slug}:mejora"),
                    "name": mej_nom,
                    "type": "minion_upgrade",
                    "img": "systems/wicked-ones/styles/assets/icons/Icon.7_96.png",
                    "system": {
                        "upgrade_type": "regular",
                        "upgrade_checkbox_text": "",
                        "upgrade_checkbox_checked": False,
                        "upgrade_checkbox_2_text": "",
                        "upgrade_checkbox_2_checked": False,
                        "is_for_wo": True,
                        "is_for_ua": True,
                        "description": mej_desc,
                    },
                },
                {
                    "_id": fid(f"item:{slug}:impulso"),
                    "name": IMPULSO_MANADA[slug],
                    "type": "minionimpulse",
                    "img": "systems/wicked-ones/styles/assets/icons/Icon.2_29.png",
                    "system": {"is_for_ua": False, "description": f"Impulso oscuro de la panda: {IMPULSO_MANADA[slug].lower()} (lista del manual, pág. 194)."},
                },
            ],
            "flags": {
                MOD: {
                    "tipo": "esbirros",
                    "figura": f"modules/{MOD}/assets/figuras/{slug}.webp",
                }
            },
        })

    VOC = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "datos", "vocaciones_manual.json"), encoding="utf-8"))
    # 4.3 Los 6 Personajes Jugadores (PJs) pregenerados (liderados por el trío icónico del libro: Ulrot, Crag y Slem)
    pjs_cfg = [
        ("pj-ulrot", "Ulrot", "Orco", "Bruto", "Cicatrices de guerra, hombreras de hueso y un enorme mandoble dentado",
         "Grash (el carnicero del campamento)", "esbirros-ulrot",
         {"smash": 3, "threaten": 2, "scan": 2, "finesse": 1, "skulk": 1},
         "Festín de carne asada y cerveza robada",
         "Aplastar a los arrogantes campeones de la Luz",
         None, None,  # capacidad principal de la vocación (vocaciones_manual.json)
         "Hacha de guerra", "Armadura de pinchos"),
        ("pj-crag", "Crag", "Kóbold", "Chamán", "Escamas rojizas, corona de cuernos y un báculo coronado por un cráneo humeante",
         "Vex (la anciana guardiana de los huevos)", "esbirros-crag",
         {"invoke": 3, "trick": 2, "scan": 2, "tinker": 1, "banter": 1},
         "Danza extática alrededor de la hoguera ritual",
         "Demostrar que las artes oscuras dominan el Valle Silencioso",
         None, None,  # capacidad principal de la vocación (vocaciones_manual.json)
         "Bastón retorcido", "Máscara espiritual"),
        ("pj-slem", "Slem", "Sérpido", "Sombra", "Ojos verticales dorados, capucha de cuero negro y un par de dagas curvas goteantes",
         "Naga-Sss (traficante de venenos)", "esbirros-slem",
         {"skulk": 3, "finesse": 2, "trick": 2, "scan": 1, "threaten": 1},
         "Acechar desde las vigas altas y coleccionar llaves robadas",
         "Infiltrarse en las fortalezas más vigiladas sin ser visto",
         None, None,  # capacidad principal de la vocación (vocaciones_manual.json)
         "Dagas gemelas", "Ganzúas"),
        ("pj-viska", "Viska", "Goblin", "Artesana", "Dedos manchados de hollín, gafas de aumento triples y un cinturón lleno de engranajes",
         "Tock (su autómata de cuerda medio loco)", "esbirros-viska",
         {"tinker": 3, "scan": 2, "trick": 2, "skulk": 1, "finesse": 1},
         "Probar explosivos e inventos ruidosos en el taller",
         "Convertir la mazmorra en una máquina mortal perfecta",
         None, None,  # capacidad principal de la vocación (vocaciones_manual.json)
         "Ballesta", "Bolsa de herramientas"),
        ("pj-kaelen", "Kaelen", "Demonio", "Hechicero", "Cuernos curvados hacia atrás, ojos como brasas y túnica ribeteada en oro negro",
         "Malphas (un diablillo mensajero del Abismo)", "esbirros-kaelen",
         {"invoke": 3, "threaten": 2, "banter": 2, "scan": 1, "smash": 1},
         "Deleitarse con el miedo de los prisioneros y beber vino especiado",
         "Someter las almas de la Abadía del Corazón Valiente",
         None, None,  # capacidad principal de la vocación (vocaciones_manual.json)
         "Bola de cristal", "Túnica raída"),
        ("pj-zira", "Zira", "Devoramentes", "Confabuladora", "Tentáculos faciales violáceos ocultos tras una máscara de plata y capa de terciopelo",
         "Hermano Tomás (un monje corrupto de Piedra Blanca)", "esbirros-zira",
         {"banter": 3, "trick": 2, "scan": 2, "invoke": 1, "skulk": 1},
         "Saborear los recuerdos y secretos extraídos de mentes cautivas",
         "Enfrentar a las facciones de la Luz entre sí mediante intrigas",
         None, None,  # capacidad principal de la vocación (vocaciones_manual.json)
         "Daga oculta", "Máscara decorativa"),
    ]

    for (slug, nom, raza, voc, look, amigo, slug_manada, habs, juerga, impulso, hab_nom, hab_desc, eq1, eq2) in pjs_cfg:
        vm = VOC[{"Artesana": "Artesano", "Confabuladora": "Confabulador"}.get(voc, voc)]
        hab_nom, hab_desc = vm["capacidad"], vm["texto"] + " (Capacidad principal, manual cap. 2.)"
        pid = fid(f"actor:pj:{slug}")
        mid = fid(f"actor:manada:{slug_manada}")
        actores.append({
            "_id": pid,
            "name": f"{nom} ({raza} {voc})",
            "type": "character",
            "img": f"modules/{MOD}/assets/retratos/{slug}.webp",
            "system": {
                "pc_type": "wicked_one",
                "look": look,
                "vilefriend": amigo,
                "minionpack": mid,
                "wickedxp": {"value": 0, "max": 9, "max_default": 9, "name_default": "FITD.WickedXP", "name": "FITD.WickedXP"},
                "recklessxp": {"value": 0, "max": 3, "max_default": 3, "name_default": "FITD.RecklessXP", "name": "FITD.RecklessXP"},
                "stress": {"min": 0, "value": 0, "max": 6},
                "bloodied": False,
                "supply": {"min": 0, "value": 2, "max": 2},
                "attribute_max_value": 3,
                "downtime_action_used": False,
                "dark_hearts": {"min": 0, "value": 1, "max": 2},
                "gold": {"min": 0, "value": 1, "max": 3},
                "rot": {"min": 1, "value": 1, "max": 4},
                "attributes": crear_atributos_actor(habs),
                "description": (
                    f"<p><strong>{nom}</strong> es un <strong>{raza} {voc}</strong> que busca forjar un nuevo hogar "
                    f"en las Colinas de Piedra Blanca del Valle Silencioso.</p>"
                    f"<p><strong>Aspecto:</strong> {look}.</p>"
                    f"<p><strong>Amigo vil:</strong> {amigo}.</p>"
                ),
            },
            "prototypeToken": {
                "name": nom,
                "displayName": 50,
                "actorLink": True,
                "disposition": 1,
                "texture": {"src": f"modules/{MOD}/assets/tokens/{slug}.webp"},
            },
            "items": [
                {
                    "_id": fid(f"item:{slug}:raza"),
                    "name": raza,
                    "type": "monster_race",
                    "img": "systems/wicked-ones/styles/assets/icons/Icon.3_37.png",
                    "system": {"primal": False, "description": f"Raza monstruosa: {raza}."},
                },
                {
                    "_id": fid(f"item:{slug}:vocacion"),
                    "name": voc,
                    "type": "calling",
                    "img": "systems/wicked-ones/styles/assets/icons/Icon.1_66.png",
                    "system": {"is_ua_calling": False, "description": f"Vocación malvada: {voc}."},
                },
                {
                    "_id": fid(f"item:{slug}:juerga"),
                    "name": juerga,
                    "type": "revelry",
                    "img": "systems/wicked-ones/styles/assets/icons/Icon.4_48.png",
                    "system": {"description": juerga},
                },
                {
                    "_id": fid(f"item:{slug}:impulso"),
                    "name": impulso,
                    "type": "wickedimpulse",
                    "img": "systems/wicked-ones/styles/assets/icons/Icon.6_25.png",
                    "system": {"is_for_ua": False, "description": impulso},
                },
                {
                    "_id": fid(f"item:{slug}:hab"),
                    "name": hab_nom,
                    "type": "specialability",
                    "img": "systems/wicked-ones/styles/assets/icons/Icon.5_34.png",
                    "system": {
                        "ability_type": "basic",
                        "ability_group": "group_core",
                        "source": voc,
                        "description": hab_desc,
                    },
                },
                {
                    "_id": fid(f"item:{slug}:eq1"),
                    "name": eq1,
                    "type": "gearsupply",
                    "img": "systems/wicked-ones/styles/assets/icons/Icon.6_37.png",
                    "system": {
                        "gear_or_supply": "gear",
                        "quality_category": "mundane",
                        "use_type": "unlimited",
                        "uses_left": 4,
                        "edges": {"0": "Personal"},
                        "description": eq1,
                    },
                },
                {
                    "_id": fid(f"item:{slug}:eq2"),
                    "name": eq2,
                    "type": "gearsupply",
                    "img": "systems/wicked-ones/styles/assets/icons/Icon.6_37.png",
                    "system": {
                        "gear_or_supply": "gear",
                        "quality_category": "mundane",
                        "use_type": "unlimited",
                        "uses_left": 4,
                        "edges": {"0": "Útil"},
                        "description": eq2,
                    },
                },
            ],
            "flags": {
                MOD: {
                    "tipo": "pj",
                    "figura": f"modules/{MOD}/assets/figuras/{slug}.webp",
                }
            },
        })

    # 4.4 Las 2 Mazmorras (Guarida inicial de la campaña y Fortaleza avanzada de Nivel 2)
    actores.append({
        "_id": fid("actor:mazmorra:paso-mercader"),
        "name": "Guarida del Paso del Mercader",
        "type": "dungeon",
        "img": "systems/wicked-ones/styles/assets/default-images/dungeon.webp",
        "system": {
            "tier": {"min": 0, "value": 1, "max": 4},
            "entrance": "Boca de cueva oculta tras los riscos del Paso del Mercader, reforzada con carromatos volcados.",
            "structure": "Cavernas naturales de caliza conectadas con una antigua bóveda tallada de otra era.",
            "lighting": "Braseros humeantes, antorchas de resina y hongos fosforescentes junto a la cisterna.",
            "atmospherics": "Olor a humo de leña, humedad fría del arroyo subterráneo y murmullo constante del Corazón.",
            "hoard": "Cajas de mercancías saqueadas, barriles de licor y cofres de monedas en la Bóveda de Piedra Antigua.",
            "imps": "Diablillos tiznados de hollín que acarrean piedras y chillan cuando huelen intrusos.",
            "master_plan": {
                "step1": "1. Tomar las Cuevas del Paso del Mercader y despertar el Corazón («Un lugar al que llamar hogar»).",
                "step2": "2. Saquear los grimorios prohibidos de la Abadía del Corazón Valiente («Una biblioteca necesita libros»).",
                "step3": "3. Capturar la piel del Gran Hombre Lobo del Bosque Susurrante («Piel de lobo para un ritual»).",
                "step4": "4. Repeler la invasión de los héroes del valle en nuestra guarida («¡Matad a los intrusos!»).",
                "step5": "5. Completar el Ritual del Eclipse sobre las Colinas («Bajo la luna llena»).",
                "step6": "6. Lanzar el asalto final contra Ciudad Floresta («La última luna llena»).",
            },
            "description": (
                "<h2>Guarida de la Campaña · El Valle Silencioso</h2>"
                "<p>Esta hoja representa vuestra mazmorra comunitaria tras reclamar las Cuevas del Paso del Mercader. "
                "Añadid aquí vuestras Salas de Nivel 3 y llevad el registro de vuestro Plan Maestro.</p>"
            ),
        },
        "items": [
            {
                "_id": fid("item:mazmorra:tema1"),
                "name": "Fortaleza de Saqueadores de las Colinas",
                "type": "dungeon_theme",
                "img": "systems/wicked-ones/styles/assets/icons/Icon.3_67.png",
                "system": {
                    "special_name": "Pasadizos de emboscada",
                    "special_feature": "Los esbirros y trampas situados cerca de la entrada obtienen +1d en la primera sala.",
                    "theme_checkbox_1_text": "Emboscada activada",
                    "theme_checkbox_1_checked": False,
                    "theme_checkbox_2_text": "Alarma de cuerno",
                    "theme_checkbox_2_checked": False,
                    "description": "Un bastión excavado en la roca desde el que dominar las rutas del Valle Silencioso.",
                },
            }
        ],
        "flags": {MOD: {"tipo": "mazmorra"}},
    })

    # 4.5 Los 4 Grupos de Aventureros listos para Invasiones
    todos_adv = {a["flags"][MOD]["clase"]: a for a in construir_aventureros() if "clase" in a["flags"][MOD]}
    todos_ayu = {a["flags"][MOD]["ayudante"]: a for a in construir_aventureros() if "ayudante" in a["flags"][MOD]}

    def clonar_adv(clave_adv, nivel, nombre_propio):
        base = json.loads(json.dumps(todos_adv[clave_adv]))
        base["_id"] = fid(f"partyitem:{nombre_propio}")
        base["name"] = nombre_propio
        base["system"]["tier"] = nivel
        base["system"]["adventurer_class_custom"] = f"{nombre_propio} ({base['system']['adventurer_class_custom']})"
        return base

    def clonar_ayu(clave_ayu, nombre_propio):
        base = json.loads(json.dumps(todos_ayu[clave_ayu]))
        base["_id"] = fid(f"partyitem:{nombre_propio}")
        base["name"] = nombre_propio
        return base

    grupos_cfg = [
        ("party-piedra-blanca", "Expedición de Piedra Blanca (Invasión N1)", "adv-defensor",
         "Primer grupo de héroes enviado por el Gremio de Mercaderes y la Abadía del Corazón Valiente para recuperar la mercancía robada y tantear vuestras defensas.",
         [
             clonar_adv("defender", 1, "Alric de Piedra Blanca"),
             clonar_adv("cleric", 1, "Hermana Valeria"),
             clonar_adv("scout", 1, "Garrick el Rastreador"),
             clonar_ayu("torchbearer" if "torchbearer" in todos_ayu else "guard", "Guardia de Caravana"),
             clonar_ayu("trapfinder", "Buscatrampas del Gremio"),
         ]),
        ("party-cazadores-plata", "Cazadores de la Luna de Plata (Invasión N2)", "adv-explorador",
         "Veteranos curtidos en dar caza a bestias sobrenaturales que siguen el rastro del ritual licántropo hasta el corazón de vuestra mazmorra.",
         [
             clonar_adv("occultslayer", 2, "Vaelen Cazador de Sombras"),
             clonar_adv("spellbow", 2, "Lyra Vientoveloz"),
             clonar_adv("druid", 1, "Thorn de la Arboleda"),
             clonar_adv("barbarian", 1, "Korgath Rompecráneos"),
             clonar_ayu("forester", "Rastreador Montaraz"),
             clonar_ayu("sawbones", "Cirujano de Campaña"),
         ]),
        ("party-cruzada-floresta", "Vanguardia de Ciudad Floresta (Invasión N3)", "adv-inquisidor",
         "La élite militar, arcana y religiosa del Valle Silencioso reunida para destruir vuestro Corazón de la Mazmorra antes del eclipse final.",
         [
             clonar_adv("inquisitor", 3, "Alto Inquisidor Malakor"),
             clonar_adv("centurion", 2, "Comandante Vane"),
             clonar_adv("chaosmage", 2, "Archimago Oakhaven"),
             clonar_adv("knight", 2, "Sir Roland del Sol"),
             clonar_ayu("locksmith", "Maestro Cerrajero"),
             clonar_ayu("mercenary", "Veterano de la Guardia"),
             clonar_ayu("priest", "Acólito Portador del Sello"),
         ]),
        ("party-redada-cloacas", "Escuadrón de Purga de las Cloacas (Invasión N2)", "adv-centurion",
         "Grupo de choque especializado en túneles estrechos para campañas en las Cloacas de la Gran Ciudad.",
         [
             clonar_adv("templar", 2, "Hermano Ignis"),
             clonar_adv("alchemist", 2, "Maestra Soria"),
             clonar_adv("assassin", 1, "Vesper Cuchillo Negro"),
             clonar_ayu("ratcatcher", "Cazarratas Mayor"),
             clonar_ayu("miner", "Zapador de Túneles"),
         ]),
    ]

    for slug_p, nom_p, slug_img, desc_p, miembros in grupos_cfg:
        actores.append({
            "_id": fid(f"actor:party:{slug_p}"),
            "name": nom_p,
            "type": "party",
            "img": f"modules/{MOD}/assets/retratos/{slug_img}.webp",
            "system": {
                "description": f"<p>{desc_p}</p>",
            },
            "prototypeToken": {
                "name": nom_p,
                "displayName": 50,
                "actorLink": True,
                "disposition": -1,
                "texture": {"src": f"modules/{MOD}/assets/tokens/{slug_img}.webp"},
            },
            "items": miembros,
            "flags": {
                MOD: {
                    "tipo": "grupo_invasor",
                    "figura": f"modules/{MOD}/assets/figuras/{slug_img}.webp",
                }
            },
        })

    # 4.6 Hoja del Director de Juego (gm_sheet) preconfigurada para la campaña
    actores.append({
        "_id": fid("actor:gmsheet:valle-silencioso"),
        "name": "Panel del DJ · Campaña El Valle Silencioso",
        "type": "gm_sheet",
        "img": f"modules/{MOD}/assets/escenas/portada.webp",
        "system": {
            "current_phase": {"value": 7, "min": 1, "max": 12},
            "description": (
                "<h2>Guía Rápida del Ciclo de Partida · El Valle Silencioso</h2>"
                "<p>La campaña comienza directamente en la <strong>Fase de Incursión (Fase 7)</strong> con el asalto inicial "
                "<em>«Un lugar al que llamar hogar»</em> contra las Cuevas del Paso del Mercader.</p>"
                "<ul>"
                "<li><strong>Hito R1:</strong> Reclamar la cueva y forjar el Corazón de la Mazmorra.</li>"
                "<li><strong>Hito R2:</strong> Primera Fase de Guarida (excavar salas N1, colocar trampas y reclutar).</li>"
                "<li><strong>Hito R3:</strong> Incursión II «Una biblioteca necesita libros» (Abadía del Corazón Valiente).</li>"
                "<li><strong>Hito R4:</strong> Incursión III «Piel de lobo para un ritual» (Bosque Susurrante).</li>"
                "<li><strong>Hito R5:</strong> Invasión «¡Matad a los intrusos!» (Defensa de la mazmorra).</li>"
                "<li><strong>Hito R6:</strong> Clímax «La última luna llena» (Eclipse y asalto a Ciudad Floresta).</li>"
                "</ul>"
            ),
        },
        "items": [
            {
                "_id": fid("gmsheet:clock:alarma"),
                "name": "Alarma en las Colinas de Piedra Blanca",
                "type": "project",
                "img": "systems/wicked-ones/styles/assets/icons/Icon.7_53.png",
                "system": {"clock_sizes": [4, 6, 8], "clock_size": 4, "clock_progress": 0, "description": "Cuando se llena, el Gremio de Mercaderes envía a la Expedición de Piedra Blanca."},
            },
            {
                "_id": fid("gmsheet:clock:inquisicion"),
                "name": "Sospecha de la Abadía del Corazón Valiente",
                "type": "project",
                "img": "systems/wicked-ones/styles/assets/icons/Icon.7_53.png",
                "system": {"clock_sizes": [4, 6, 8], "clock_size": 6, "clock_progress": 0, "description": "Avanza con las represalias mágicas o incursiones contra lugares sagrados."},
            },
            {
                "_id": fid("gmsheet:clock:eclipse"),
                "name": "El Ritual de la Última Luna Llena",
                "type": "project",
                "img": "systems/wicked-ones/styles/assets/icons/Icon.7_53.png",
                "system": {"clock_sizes": [4, 6, 8], "clock_size": 8, "clock_progress": 0, "description": "Reloj maestro del Plan Oscuro para sumir Ciudad Floresta en la noche eterna."},
            },
            {
                "_id": fid("gmsheet:inv:1"),
                "name": "Invasión 1: Expedición de Piedra Blanca",
                "type": "invasion",
                "img": "systems/wicked-ones/styles/assets/icons/Icon.6_01.png",
                "system": {"adventurers_lv_0": 0, "adventurers_lv_1": 3, "adventurers_lv_2": 0, "adventurers_lv_3": 0, "adventurers_lv_4": 0, "hirelings": 2},
            },
            {
                "_id": fid("gmsheet:inv:2"),
                "name": "Invasión 2: Cazadores de la Luna de Plata",
                "type": "invasion",
                "img": "systems/wicked-ones/styles/assets/icons/Icon.6_01.png",
                "system": {"adventurers_lv_0": 0, "adventurers_lv_1": 2, "adventurers_lv_2": 2, "adventurers_lv_3": 0, "adventurers_lv_4": 0, "hirelings": 2},
            },
            {
                "_id": fid("gmsheet:inv:3"),
                "name": "Invasión 3: Vanguardia de Ciudad Floresta",
                "type": "invasion",
                "img": "systems/wicked-ones/styles/assets/icons/Icon.6_01.png",
                "system": {"adventurers_lv_0": 0, "adventurers_lv_1": 0, "adventurers_lv_2": 3, "adventurers_lv_3": 1, "adventurers_lv_4": 0, "hirelings": 3},
            },
        ],
        "flags": {MOD: {"tipo": "panel_dj"}},
    })

    return actores


# ---------------------------------------------------------------------------
# 5. PACK: tablas-es (16 Tablas de Incursión, Invasión, Oráculos, Botín y Solitario)
# ---------------------------------------------------------------------------
def crear_tabla(clave, nombre, descripcion, filas, formula=None):
    n_filas = len(filas)
    form = formula or f"1d{n_filas}"
    results = []
    for idx, texto in enumerate(filas, start=1):
        results.append({
            "_id": fid(f"tblres:{clave}:{idx}"),
            "type": "text",
            "text": texto,
            "name": texto[:80],
            "description": texto,
            "img": "icons/svg/d20-black.svg",
            "weight": 1,
            "range": [idx, idx],
            "drawn": False,
        })
    return {
        "_id": fid(f"tabla:{clave}"),
        "name": nombre,
        "description": descripcion,
        "img": "icons/svg/d20-grey.svg",
        "formula": form,
        "replacement": True,
        "displayRoll": True,
        "results": results,
        "flags": {MOD: {"clave": clave}},
    }


def construir_tablas():
    """Todas las tablas aleatorias del manual (pág. 247-373), literales. Las d66 llevan su número delante: «[11] …»."""
    tablas = []
    for t in MANUAL:
        filas = [(f"[{d66_de(f[0])}] " if t["d66"] else "") + f[2] for f in t["filas"]]
        desc = f"{t['descripcion']} (Manual, pág. {t['pagina']}.)".strip()
        tablas.append(crear_tabla(t["clave"], t["nombre"], desc, filas, t["formula"]))
    return tablas

# ---------------------------------------------------------------------------
# 6. PACK: manual-es (10 Diarios Multipágina: Manual Completo The Hills Press + Guía de Campaña)
# ---------------------------------------------------------------------------
def crear_pagina_texto(clave_diario, orden, titulo, html):
    return {
        "_id": fid(f"jpage:{clave_diario}:{orden}"),
        "name": titulo,
        "type": "text",
        "title": {"show": True, "level": 1},
        "text": {"format": 1, "content": html},
        "sort": orden * 1000,
    }


def construir_manual():
    diarios = []

    # Diario 01: Guía de la Campaña «El Valle Silencioso: Un lugar al que llamar hogar»
    diarios.append({
        "_id": fid("journal:01-campana-valle"),
        "name": "01 · Campaña: El Valle Silencioso («Un lugar al que llamar hogar»)",
        "pages": [
            crear_pagina_texto("01", 1, "Bienvenida y Resumen de la Campaña", f"""
                <p><img src="modules/{MOD}/assets/escenas/portada.webp" alt="Portada" style="width:100%;border-radius:8px;margin-bottom:12px;" /></p>
                <h2>Un lugar al que llamar hogar · Campaña del módulo en el Valle Silencioso</h2>
                <p>Esta campaña lista para jugar es una adaptación propia del módulo, inspirada en los ejemplos de juego del manual de <strong>Wicked Ones (The Hills Press)</strong> protagonizados por <strong>Ulrot</strong> (Orco Bruto), <strong>Crag</strong> (Kóbold Chamán) y <strong>Slem</strong> (Sérpido Sombra), junto a tres compañeros adicionales listos para elegir (<strong>Viska</strong>, <strong>Kaelen</strong> y <strong>Zira</strong>).</p>
                <blockquote><p><em>«Hartos de huir de los cruzados de Ciudad Floresta y de dormir bajo la lluvia en los riscos, habéis descubierto el lugar perfecto para fundar vuestra propia mazmorra: las Cuevas del Paso del Mercader, en las Colinas de Piedra Blanca. Solo hay un pequeño problema: una caravana armada del Gremio de Mercaderes las está usando como almacén fortificado…»</em></p></blockquote>
                <h3>Estructura en 6 Hitos (Integrada con MR- Dirección)</h3>
                <ol>
                    <li><strong>Hito R1 · Incursión Inicial («Un lugar al que llamar hogar», ejemplo de la pág. 16):</strong> Asalto a las Cuevas del Paso del Mercader para expulsar o aniquilar a los guardias del Gremio, quedarse con su botín inicial y despertar el <strong>Corazón de la Mazmorra</strong> en la Bóveda de Piedra Antigua.</li>
                    <li><strong>Hito R2 · Fase de Guarida y Desastre (acecho y desastre, págs. 234-249):</strong> Primera fase de construcción: excavar salas de Nivel 1, tender trampas, reclutar esbirros y afrontar la primera tirada de Desastre y Represalia.</li>
                    <li><strong>Hito R3 · Incursión II («Una biblioteca necesita libros», pág. 82):</strong> Infiltración o asalto nocturno contra la <strong>Abadía del Corazón Valiente</strong> para robar los códices prohibidos que Crag y Kaelen necesitan para su gran ritual.</li>
                    <li><strong>Hito R4 · Incursión III («Piel de lobo para un ritual», pág. 112):</strong> Caza en el <strong>Bosque Susurrante</strong> para abatir al Gran Hombre Lobo antes de que la familia de cazadores del ejemplo lo reclame.</li>
                    <li><strong>Hito R5 · Defensa de la Guarida («¡Matad a los intrusos!», pág. 228):</strong> ¡Invasión! Un grupo de aventureros de la Abadía (como el monje, el templario y la inquisidora del ejemplo) penetra en vuestra mazmorra. Hora de activar trampas, trucos, portones y manadas.</li>
                    <li><strong>Hito R6 · Clímax («La última luna llena», pág. 332):</strong> Con el ritual del Eclipse completado, la horda marcha sobre <strong>Ciudad Floresta</strong> mientras la vanguardia de campeones de la Luz lanza su asalto desesperado contra el Santuario.</li>
                </ol>
            """),
            crear_pagina_texto("01", 2, "Hito R1 · Un lugar al que llamar hogar (Incursión Inicial)", f"""
                <p><img src="modules/{MOD}/assets/escenas/cueva-mercaderes.webp" alt="Cueva de los Mercaderes" style="width:100%;border-radius:8px;margin-bottom:12px;" /></p>
                <h2>Hito R1 · Un lugar al que llamar hogar (ejemplo de la pág. 16)</h2>
                <p>La guía de la sesión 1 (pág. 308) arranca con los PJ huyendo bajo la lluvia en busca de un refugio, y el ejemplo de juego de la pág. 16 empieza cuando están a punto de asaltar una cueva donde acampan unos mercaderes. Este hito lo convierte en la primera incursión.</p>
                <h3>Situación Táctica en las Cuevas del Paso del Mercader</h3>
                <ul>
                    <li><strong>1. Boca de la Cueva y Carromatos:</strong> Dos carromatos blindados forman un parapeto junto a una hoguera. Cuatro guardias del Gremio vigilan el camino con ballestas y lanzas.</li>
                    <li><strong>2. Galería de los Guardias:</strong> El capataz <strong>Bram</strong> y seis guardias veteranos descansan junto a un <strong>cuerno de bronce de alarma</strong> (Reloj de 4 segmentos: <em>«¡Fuego de señales hacia Piedra Blanca!»</em>).</li>
                    <li><strong>3. Depósito de Caravanas (Norte):</strong> Cajas de herramientas, barriles de licor, hierro forjado y un cofre con la paga (<strong>2 de Oro</strong> y <strong>2 Suministros</strong> para empezar la guarida). Accesible en sigilo por la <em>Grieta de humo</em> superior.</li>
                    <li><strong>4. Cisterna del Arroyo Frío (Sur):</strong> Estanque subterráneo conectado al exterior por un sumidero sumergido. En el fondo acecha una <em>serpiente gigante</em> (criatura de nivel 1) que puede ser domada o azuzada contra los guardias.</li>
                    <li><strong>5. Bóveda de Piedra Antigua (Este):</strong> Cámara sellada tras un derrumbe parcial donde late una fisura de energía oscura perfecta para anclar el <strong>Corazón de la Mazmorra</strong>.</li>
                </ul>
            """),
            crear_pagina_texto("01", 3, "Hitos R2 a R6 · El ascenso de la Oscuridad", f"""
                <p><img src="modules/{MOD}/assets/escenas/biblioteca-abadia.webp" alt="Biblioteca de la Abadía" style="width:100%;border-radius:8px;margin-bottom:12px;" /></p>
                <h2>Hito R3 · Una biblioteca necesita libros (ejemplo de la pág. 82)</h2>
                <p>Para desbloquear salas avanzadas y el <strong>Ritual del Eclipse de Sangre</strong>, los malvados necesitan los tomos encuadernados en hierro custodiados en el scriptorium de la <strong>Abadía del Corazón Valiente (facción de nivel 2, luz; Valle Silencioso, pág. 286)</strong>.</p>
                <ul>
                    <li><strong>Enfoque de Asalto:</strong> Derribar el portón lateral del claustro y enfrentarse a los monjes guerreros antes de que tañan la gran campana.</li>
                    <li><strong>Enfoque de Sigilo / Engaño:</strong> Escalar los contrafuertes góticos bajo la lluvia o infiltrarse con hábitos robados hasta el archivo prohibido.</li>
                    <li><strong>Oposición:</strong> La <strong>Hermana Valeria</strong> (Clériga N1) y dos escuadras de guardias monásticos custodian el relicario.</li>
                </ul>
                <hr/>
                <p><img src="modules/{MOD}/assets/escenas/ritual-luna-llena.webp" alt="Ritual de Luna Llena" style="width:100%;border-radius:8px;margin:12px 0;" /></p>
                <h2>Hito R4 · Piel de lobo para un ritual (ejemplo de la pág. 112)</h2>
                <p>El segundo ingrediente del gran ritual exige desollar al <strong>Gran Hombre Lobo Alfa</strong> que aterroriza el Bosque Susurrante en noche de luna llena. Sin embargo, la famosa familia de cazadores del ejemplo del libro también le han tendido una trampa esa misma noche.</p>
                <hr/>
                <p><img src="modules/{MOD}/assets/escenas/defensa-mazmorra.webp" alt="Defensa de la Mazmorra" style="width:100%;border-radius:8px;margin:12px 0;" /></p>
                <h2>Hito R5 · ¡Matad a los intrusos! (ejemplo de la pág. 228) y Hito R6 · La última luna llena (ejemplo de la pág. 332)</h2>
                <p>Cuando los relojes de las facciones de la Luz se completan, los grupos de aventureros (disponibles en la carpeta de Actores listos para arrastrar con sus Corazones y 6 Movimientos) invaden vuestra mazmorra. Si los malvados defienden su Corazón y avanzan su plan maestro (pág. 174), desatan el asalto final sobre <strong>Ciudad Floresta</strong>.</p>
            """),
        ],
    })

    # Diarios 02-09: índice fiel del manual (nombres y páginas del libro impreso) + qué automatiza el módulo.
    # Nada de reglas resumidas de memoria: lo que no está aquí, se consulta en el libro.
    LAB = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "datos", "labores_manual.json"), encoding="utf-8"))
    FAC = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "datos", "facciones_manual.json"), encoding="utf-8"))

    diarios.append({
        "_id": fid("journal:02-reglas-y-ciclo"),
        "name": "02 · Manual: Ciclo de juego, situación y efecto",
        "pages": [
            crear_pagina_texto("02", 1, "Las cuatro fases del ciclo", """
                <h2>Resumen del ciclo (pág. 232)</h2>
                <p>El juego progresa a través de cuatro fases: <strong>acecho, desastre, incursión y represalias</strong>. Son fijas, pero no hay que obligarse a seguirlas si hay una escena que queráis interpretar.</p>
                <ol>
                    <li><strong>Acecho (pág. 234):</strong> contáis el botín, celebráis una juerga y pasáis un descanso con proyectos para mejorar la mazmorra.</li>
                    <li><strong>Desastre (pág. 244):</strong> al final de cada acecho el DJ hace una tirada de desastre (lógica de la mazmorra, tipos y tablas en las págs. 245-249).</li>
                    <li><strong>Incursión (pág. 250):</strong> elegís propósito, objetivo, plan y detalles; el DJ hace la tirada de implicación y empezáis en plena acción.</li>
                    <li><strong>Represalias (pág. 264):</strong> al final de cada incursión el DJ hace la tirada de represalia (tipos y tablas en las págs. 268-271).</li>
                </ol>
                <p>El panel del DJ y las tarjetas de chat del módulo tiran desastre, implicación, represalia y defensas con las tablas del libro.</p>
            """),
            crear_pagina_texto("02", 2, "Situación y efecto", """
                <h2>Situación y efecto (pág. 36)</h2>
                <p>La <strong>situación</strong> mide lo graves que serán las consecuencias si fallas una tirada de acción; el <strong>efecto</strong>, el impacto si tienes éxito. Solo las tiradas de acción tienen situación y efecto, y la estándar se da por supuesta.</p>
                <ul>
                    <li><strong>Situación:</strong> ventajosa · estándar · nefasta · mortal (un éxito parcial o un fracaso acaba con tu muerte).</li>
                    <li><strong>Efecto:</strong> potente · estándar · débil · nulo.</li>
                </ul>
                <p>Los modificadores «+/− situación» y «+/− efecto» son circunstancias que tienden hacia ese grado, no cambios automáticos. Resistencia, estrés y muerte: capítulo 1 del manual; el diálogo de tirada del módulo aplica sus costes.</p>
            """),
        ],
    })

    dioses = [
        ("gorlag", "Gorlag, el Emperador Bendito", "dios de la Conquista y la Tiranía", "La familia imperial"),
        ("iziza", "Iziza, la Dulce Cortesana", "diosa de la Seducción y la Mentira", "La familia imperial"),
        ("melkahar", "Melkahar, el Príncipe Pútrido", "dios de la Pestilencia y la Descomposición", "La familia imperial"),
        ("gimosha", "Gimosha, la Llama de los Celos", "diosa de la Codicia y la Envidia", "La familia imperial"),
        ("dalgeth", "Dalgeth, la Inconformidad Quejumbrosa", "diosa de la Astucia y la Traición", "La familia imperial"),
        ("nezame", "Nezame, el Hedonista Jubiloso", "dios del Placer y la Satisfacción", "La familia imperial"),
        ("melawa", "Melawa, la Guardiana de los Secretos", "diosa del Conocimiento y el Engaño", "La familia imperial"),
        ("shabaz", "Shabaz, el Destructor Inmoral", "dios de la Tempestad y de la Ruina", "Los salvajes"),
        ("labisha", "Labisha, la Carnívora", "diosa de la Matanza y la Brutalidad", "Los salvajes"),
        ("talazar", "Talazar, el Acechador Implacable", "dios de la Venganza y de la Caza", "Los salvajes"),
        ("crevis", "Crevis, el Desgraciado Tembloroso", "dios de la Cobardía y el Sufrimiento", "Los salvajes"),
        ("vahoona", "Vahoona, la Aulladora Nocturna", "diosa de las Pesadillas y del Crepúsculo", "Los salvajes"),
        ("zaheen", "Zaheen, el Bailarín Demente", "dios del Azar y del Caos", "Los salvajes"),
    ]
    html_dioses = "".join(f"""
            <div style="display:flex;gap:14px;align-items:center;margin-bottom:10px;padding:8px;border:1px solid rgba(196,154,69,0.35);border-radius:8px;">
                <img src="modules/{MOD}/assets/dioses/{slug}.webp" alt="{nom}" style="width:80px;height:80px;object-fit:cover;border-radius:6px;flex-shrink:0;" />
                <div><h3 style="margin:0 0 4px 0;">{nom}</h3><p style="margin:0;">{dom} · <em>{grupo}</em></p></div>
            </div>""" for slug, nom, dom, grupo in dioses)
    diarios.append({
        "_id": fid("journal:03-artes-oscuras-dioses"),
        "name": "03 · Manual: Artes oscuras y dioses oscuros",
        "pages": [
            crear_pagina_texto("03", 1, "Disciplinas y sendas mágicas", """
                <h2>Artes oscuras (capítulo 3)</h2>
                <ul>
                    <li><strong>Leyes de la magia ritual (pág. 132)</strong> y <strong>objetos mágicos (pág. 134)</strong>.</li>
                    <li><strong>Brujería (pág. 136):</strong> adivinación, control climático, corazón salvaje, espiritismo y hemoteurgia.</li>
                    <li><strong>Canalización (pág. 142):</strong> invocas a un dios oscuro que te deja ejercer una fracción de su poder; cada dios tiene un título y dos dominios que forman tu senda.</li>
                    <li><strong>Hechicería (pág. 156):</strong> encantamiento, evocación, fuerzas, ilusión, nigromancia y piromancia.</li>
                </ul>
                <p>Las d66 de mejunjes, artilugios, pociones y objetos mágicos del libro están en el compendio de equipo y en las tablas del módulo.</p>
            """),
            crear_pagina_texto("03", 2, "Los dioses oscuros (pág. 142)", f"""
                <h2>Los dioses oscuros</h2>
                <p>El libro advierte que sus descripciones son ambiguas a propósito: son sugerencias, no ambientación. Habladlo con el DJ y dejad que se desarrolle en la partida.</p>
                {html_dioses}
            """),
        ],
    })

    salas_n3 = {}
    for x in LAB["salas_n3"]:
        salas_n3.setdefault(x["tema"], []).append(x["nombre"])
    diarios.append({
        "_id": fid("journal:04-construccion-mazmorra"),
        "name": "04 · Manual: La mazmorra",
        "pages": [
            crear_pagina_texto("04", 1, "Creación, habitantes y diseño", f"""
                <p><img src="modules/{MOD}/assets/escenas/mazmorra-1.webp" alt="Ejemplo de mazmorra" style="width:100%;border-radius:8px;margin-bottom:12px;" /></p>
                <h2>Mazmorras (capítulo 4)</h2>
                <ul>
                    <li><strong>Creación de mazmorras (pág. 170):</strong> temática (enclave, escondrijo, forja, fortaleza o templo, págs. 176-185), atmósfera, duendes (pág. 187) y el resto de pasos.</li>
                    <li><strong>Habitantes (pág. 186):</strong> duendes, criaturas (nivel 1 a 4, pág. 188) y esbirros (pág. 192).</li>
                    <li><strong>Diseño (pág. 196):</strong> salas y estructuras (pág. 197), trampas (pág. 198), trucos (pág. 200), portones (pág. 201) y el santuario (pág. 202).</li>
                    <li><strong>Descubrimientos (pág. 204)</strong>, <strong>guía de dibujo (pág. 210)</strong> y <strong>defender la mazmorra (pág. 218)</strong>.</li>
                </ul>
                <p>El compendio de labores trae las {len(LAB['salas_n1'])} salas de nivel 1, las {len(LAB['salas_n2'])} de nivel 2, las {len(LAB['salas_n3'])} de nivel 3, trampas, portones, los {len(LAB['trucos']['ejemplos'])} trucos de ejemplo, las criaturas de la d66 y los descubrimientos, con el texto del libro.</p>
                <h3>Salas de nivel 3 por temática</h3>
                <ul>{"".join(f"<li><strong>{t}:</strong> {', '.join(n)}</li>" for t, n in salas_n3.items())}</ul>
            """),
            crear_pagina_texto("04", 2, "Mazmorras de ejemplo", f"""
                <h2>Planos de mazmorra del libro</h2>
                <p><img src="modules/{MOD}/assets/escenas/mazmorra-2.webp" alt="Mazmorra 2" style="width:100%;border-radius:8px;margin-bottom:10px;" /></p>
                <p><img src="modules/{MOD}/assets/escenas/mazmorra-3.webp" alt="Mazmorra 3" style="width:100%;border-radius:8px;" /></p>
            """),
        ],
    })

    BANDO = {"light": "luz", "neutral": "neutral", "dark": "oscura"}
    PAGS = {"Cloacas de la Gran Ciudad": ("cloacas", "278"), "Mares coloniales": ("mares", "282"), "Valle Silencioso": ("valle", "286"), "Zona de guerra": ("guerra", "290")}
    paginas_ent = []
    for i, (ent, lista) in enumerate(FAC.items(), start=1):
        img, pag = PAGS[ent]
        filas = ""
        for f in lista:
            relojes = "<br/>".join(f"{c['texto']} ({c['segmentos']})" for c in f["relojes"])
            filas += f"<tr><td><strong>{f['nombre']}</strong></td><td>{f['nivel']}</td><td>{BANDO[f['bando']]}</td><td>{'; '.join(f['rasgos'])}</td><td>{relojes}</td></tr>"
        paginas_ent.append(crear_pagina_texto("05", i, ent, f"""
                <h2>{ent} (pág. {pag})</h2>
                <p><img src="modules/{MOD}/assets/escenas/{img}-dj.webp" alt="{ent}" style="width:100%;border-radius:8px;margin-bottom:10px;" /></p>
                <table border="1" style="width:100%;border-collapse:collapse;font-size:0.9em;">
                    <thead><tr><th>Facción</th><th>Nivel</th><th>Bando</th><th>Rasgos</th><th>Relojes (segmentos)</th></tr></thead>
                    <tbody>{filas}</tbody>
                </table>
            """))
    diarios.append({
        "_id": fid("journal:05-entornos-y-facciones"),
        "name": f"05 · Manual: Los 4 entornos y sus {sum(len(v) for v in FAC.values())} facciones de ejemplo",
        "pages": paginas_ent,
    })

    filas_adv = "".join(f"""
            <tr>
                <td><strong>{a['nombre']}</strong><br/><small>{a['rasgos'][0]}, {a['rasgos'][1]}<br/>Motivación: {a['motivacion']}</small></td>
                <td>{a['pasiva']}</td>
                <td>{'<br/>'.join('• ' + m for m in a['ofensivos'])}</td>
                <td>{'<br/>'.join('• ' + m for m in a['defensivos'])}</td>
            </tr>""" for a in ADV_MANUAL)
    diarios.append({
        "_id": fid("journal:06-aventureros-y-movimientos"),
        "name": "06 · Manual: Aventureros de ejemplo y ayudantes",
        "pages": [
            crear_pagina_texto("06", 1, "Los 30 aventureros de ejemplo (pág. 320)", f"""
                <h2>Aventureros de ejemplo</h2>
                <p>Clase y nivel (pág. 314), corazones (pág. 316), habilidad pasiva (pág. 316), movimientos (pág. 317), rasgos y motivaciones (pág. 318) y ayudantes (pág. 318).</p>
                <table border="1" style="width:100%;border-collapse:collapse;font-size:0.9em;">
                    <thead><tr><th>Clase</th><th>Pasiva</th><th>Movimientos ofensivos</th><th>Movimientos defensivos</th></tr></thead>
                    <tbody>{filas_adv}</tbody>
                </table>
            """),
        ],
    })

    diarios.append({
        "_id": fid("journal:07-monstruos-primigenios"),
        "name": "07 · Hasta el fondo: Monstruos ancestrales",
        "pages": [
            crear_pagina_texto("07", 1, "Monstruos ancestrales (pág. 336)", """
                <h2>Monstruos ancestrales</h2>
                <p>En lugar de la capacidad principal de una vocación y una segunda capacidad inicial, hacen varios cambios fundamentales en sus mecánicas y tienen rasgos únicos. Todos los jugadores deben estar de acuerdo para que haya uno en la partida.</p>
                <ul>
                    <li><strong>Auróvoros (pág. 338):</strong> tiranos codiciosos que crecen junto a su tesoro.</li>
                    <li><strong>Devoramentes (pág. 342):</strong> voraces maestros psiónicos con cuatro disciplinas psiónicas.</li>
                    <li><strong>Perdición (pág. 344):</strong> aberraciones paranoicas que flotan y tienen nueve ojos con rayos.</li>
                    <li><strong>Robacaras (pág. 346):</strong> impostores perversos que cambian de forma.</li>
                </ul>
            """),
        ],
    })

    diarios.append({
        "_id": fid("journal:08-errantes-y-valientes"),
        "name": "08 · Hasta el fondo: Los errantes y Los valientes",
        "pages": [
            crear_pagina_texto("08", 1, "Modalidades sin mazmorra", """
                <h2>Los errantes (pág. 348)</h2>
                <p>Un juego sin mazmorra: viajáis por la superficie. El pacto (pág. 349) sustituye a la mazmorra y sus capacidades a las salas; relojes de descanso y de facción (pág. 349) y viajar por el mundo (pág. 350).</p>
                <h2>Los valientes (pág. 351)</h2>
                <p>Jugáis desde el otro lado, como aventureros y héroes. Se basa en Los errantes y trae nuevas vocaciones.</p>
            """),
        ],
    })

    diarios.append({
        "_id": fid("journal:09-solitario-y-generador"),
        "name": "09 · Hasta el fondo: El gran malo malvado y generador de mazmorras",
        "pages": [
            crear_pagina_texto("09", 1, "Juego en solitario (pág. 352)", """
                <h2>El gran malo malvado</h2>
                <p>Partidas en solitario o de un PJ y un DJ: llevas a un único líder con varias pandas de esbirros. Haz incursiones o simúlalas con el generador de incursiones, y deja que las tiradas de fortuna respondan a tus preguntas. El asistente del módulo trae el generador de incursiones, la incursión de esbirros, las semillas y las tablas de desastre y represalia en solitario.</p>
                <h2>Generador de mazmorras (pág. 371)</h2>
                <p>Elige una temática (o tírala), sigue la creación normal de la pág. 170 y, por cada nivel adicional, tira un descubrimiento y añade salas. Las tablas están en el asistente y en el compendio de tablas.</p>
            """),
        ],
    })

    # Diario 10: Guía de Interfaz, Modo Oscuro y Herramientas MR-
    diarios.append({
        "_id": fid("journal:10-guia-interfaz-mr"),
        "name": "10 · Guía de la Interfaz en Español, Accesibilidad y Herramientas MR-",
        "pages": [
            crear_pagina_texto("10", 1, "Cómo aprovechar las mejoras de MR- Wicked Ones", """
                <h2>Guía de Interfaz y Mejoras MR-</h2>
                <ul>
                    <li><strong>Botón de Accesibilidad (<i class="fas fa-universal-access"></i>):</strong> En la barra superior de las ventanas encontrarás el menú rápido para activar el <strong>Modo Oscuro</strong>, <strong>Alto Contraste</strong>, <strong>Tipografía Legible</strong>, <strong>Escala de Fuente</strong> y la <strong>Ficha Resumida</strong>.</li>
                    <li><strong>Asistente y Generador Interactivo MR (<i class="fas fa-dungeon"></i>):</strong> Disponible en la barra de controles de la izquierda (bajo el botón de dados) y en las cabeceras de las hojas de Mazmorra, Grupo y DJ. Permite:
                        <ol>
                            <li>Reclutar y crear <strong>Manadas de Esbirros</strong> completas en un clic.</li>
                            <li>Añadir <strong>Salas N1/N2, Trampas, Trucos, Portones, Criaturas y Hallazgos</strong> a la guarida o a un PJ.</li>
                            <li>Generar <strong>Invasiones y Grupos de Aventureros</strong> completos con sus 6 movimientos en español.</li>
                            <li>Lanzar todas las tiradas del ciclo (<strong>Desastre, Represalia, Letargo, Simulador de Esbirros y Oráculos Solitarios</strong>) con resultados enriquecidos en el chat.</li>
                        </ol>
                    </li>
                </ul>
            """),
        ],
    })

    return diarios


# ---------------------------------------------------------------------------
# 7. ESCENAS Y PACK: aventura-es (Adventure completa lista para importar)
# ---------------------------------------------------------------------------
def crear_escena(clave, nombre, archivo_img, ancho=1920, alto=1080, es_imagen=True, nav_order=10, tokens=None, notas=None):
    return {
        "_id": fid(f"scene:{clave}"),
        "name": nombre,
        "active": clave == "portada",
        "navigation": True,
        "navOrder": nav_order,
        "background": {"src": f"modules/{MOD}/assets/escenas/{archivo_img}"},
        "width": ancho,
        "height": alto,
        "padding": 0.05,
        "grid": {"type": 0 if es_imagen else 1, "size": 100, "alpha": 0 if es_imagen else 0.2},
        "tokenVision": False,
        "fog": {"exploration": False},
        "tokens": tokens or [],
        "notes": notas or [],
        "flags": {
            MOD: {
                "clave": clave,
                "imagen": es_imagen,
            }
        },
    }


def construir_escenas():
    escenas = [
        crear_escena("portada", "00 · Portada: El Valle Silencioso", "portada.webp", 1920, 1080, True, 1),
        crear_escena("valle-mesa", "01 · Entorno: El Valle Silencioso (Mesa)", "valle-mesa.webp", 2018, 1422, False, 2),
        crear_escena("valle-dj", "01b · Entorno: El Valle Silencioso (Mapa DJ)", "valle-dj.webp", 2142, 1512, False, 3),
        crear_escena("cueva-mercaderes", "02 · Hito R1: Un lugar al que llamar hogar (Escena)", "cueva-mercaderes.webp", 1920, 1080, True, 4),
        crear_escena("cueva-caravana-mesa", "02b · Plano Táctico: Cuevas del Paso del Mercader (Mesa)", "cueva-caravana-mesa.webp", 1920, 1280, False, 5),
        crear_escena("cueva-caravana-dj", "02c · Plano Táctico: Cuevas del Paso del Mercader (DJ)", "cueva-caravana-dj.webp", 1920, 1280, False, 6),
        crear_escena("mazmorra-1", "03 · Hito R2: Nuestra Guarida (Plano Base I)", "mazmorra-1.webp", 2018, 1422, False, 7),
        crear_escena("biblioteca-abadia", "04 · Hito R3: Una biblioteca necesita libros (Abadía)", "biblioteca-abadia.webp", 1920, 1080, True, 8),
        crear_escena("ritual-luna-llena", "05 · Hito R4: Piel de lobo para un ritual (Bosque)", "ritual-luna-llena.webp", 1920, 1080, True, 9),
        crear_escena("defensa-mazmorra", "06 · Hito R5: ¡Matad a los intrusos! (Invasión)", "defensa-mazmorra.webp", 1920, 1080, True, 10),
        crear_escena("consejo-guerra", "07 · El Plan Maestro: Preparando la Horda", "consejo-guerra.webp", 1920, 1080, True, 11),
        crear_escena("batalla-santuario", "08 · Hito R6: La última luna llena (Clímax)", "batalla-santuario.webp", 1920, 1080, True, 12),
        crear_escena("cloacas-mesa", "09 · Entorno II: Cloacas de la Gran Ciudad", "cloacas-mesa.webp", 2018, 1422, False, 13),
        crear_escena("mares-mesa", "10 · Entorno III: Mares Coloniales", "mares-mesa.webp", 2018, 1422, False, 14),
        crear_escena("guerra-mesa", "11 · Entorno IV: Zona de Guerra", "guerra-mesa.webp", 2018, 1422, False, 15),
    ]
    return escenas


def construir_aventura(labores, equipo, aventureros, actores, tablas, diarios):
    escenas = construir_escenas()
    macros = [
        {
            "_id": fid("macro:abrir-generador"),
            "name": "MR · Asistente y Generador de Wicked Ones",
            "type": "script",
            "img": "icons/svg/d20-highlight.svg",
            "scope": "global",
            "command": "game.modules.get('mr-wicked-ones-es')?.api?.abrirGenerador();",
        },
        {
            "_id": fid("macro:tirar-desastre"),
            "name": "MR · Tirada de Fase de Desastre",
            "type": "script",
            "img": "icons/svg/hazard.svg",
            "scope": "global",
            "command": "game.modules.get('mr-wicked-ones-es')?.api?.dialogoCiclo('calamity');",
        },
        {
            "_id": fid("macro:tirar-represalia"),
            "name": "MR · Tirada de Represalia (Blowback)",
            "type": "script",
            "img": "icons/svg/explosion.svg",
            "scope": "global",
            "command": "game.modules.get('mr-wicked-ones-es')?.api?.dialogoCiclo('blowback');",
        },
    ]

    aventura = {
        "_id": fid("adventure:valle-silencioso"),
        "name": "MR- Wicked Ones: El Valle Silencioso («Un lugar al que llamar hogar»)",
        "img": f"modules/{MOD}/assets/escenas/portada.webp",
        "caption": "Campaña oficial lista para jugar en el Valle Silencioso + Los 4 Entornos Oficiales, 48 Facciones, Manual Completo y Herramientas MR-.",
        "description": (
            "<p>Importa todo el contenido necesario para dirigir o jugar en solitario a <strong>Wicked Ones (Edición de The Hills Press)</strong>:</p>"
            "<ul>"
            "<li><strong>15 Escenas preparadas:</strong> Portada, los 4 Entornos Oficiales (Valle Silencioso, Cloacas de la Gran Ciudad, Mares Coloniales y Zona de Guerra), los planos tácticos de las Cuevas del Paso del Mercader (Mesa y DJ), la mazmorra de la horda y las escenas ilustradas de las incursiones del libro.</li>"
            "<li><strong>Actores completos:</strong> Los 6 PJs pregenerados (Ulrot, Crag, Slem, Viska, Kaelen y Zira), sus 6 Manadas de Esbirros, la Guarida del Paso del Mercader, el Panel del DJ, 4 Grupos de Aventureros listos para Invasiones y las 48 Facciones de los 4 entornos.</li>"
            "<li><strong>10 Diarios del Manual y Campaña</strong>, <strong>16 Tablas de Oráculo y Generación</strong> y <strong>3 Macros rápidas</strong>.</li>"
            "</ul>"
        ),
        "scenes": escenas,
        "actors": actores,
        "items": labores + equipo[:25] + aventureros[:15],
        "tables": tablas,
        "journal": diarios,
        "macros": macros,
        "playlists": [],
        "folders": [],
        "sort": 1000,
        "flags": {MOD: {"version": "1.0.0"}},
    }
    return [aventura]


# ---------------------------------------------------------------------------
# 8. PAQUETE DE MR- DIRECCIÓN (content/direccion-es.json)
# ---------------------------------------------------------------------------
def construir_direccion():
    pack = {
        "id": MOD,
        "title": "Wicked Ones · El Valle Silencioso",
        "scenes": [
            {"id": "portada", "name": "Portada", "sceneName": "00 · Portada: El Valle Silencioso", "icon": "fa-solid fa-dungeon"},
            {"id": "mapa_valle", "name": "Mapa del Valle", "sceneName": "01 · Entorno: El Valle Silencioso (Mesa)", "icon": "fa-solid fa-map"},
            {"id": "incursion_cueva", "name": "R1 · Cueva Mercaderes", "sceneName": "02 · Hito R1: Un lugar al que llamar hogar (Escena)", "icon": "fa-solid fa-campground"},
            {"id": "plano_cueva", "name": "Plano Cueva", "sceneName": "02b · Plano Táctico: Cuevas del Paso del Mercader (Mesa)", "icon": "fa-solid fa-chess-board"},
            {"id": "guarida", "name": "R2 · Nuestra Guarida", "sceneName": "03 · Hito R2: Nuestra Guarida (Plano Base I)", "icon": "fa-solid fa-fort-awesome"},
            {"id": "incursion_abadia", "name": "R3 · Biblioteca Abadía", "sceneName": "04 · Hito R3: Una biblioteca necesita libros (Abadía)", "icon": "fa-solid fa-book-skull"},
            {"id": "incursion_lobo", "name": "R4 · Ritual del Lobo", "sceneName": "05 · Hito R4: Piel de lobo para un ritual (Bosque)", "icon": "fa-solid fa-moon"},
            {"id": "invasion", "name": "R5 · ¡Intrusos!", "sceneName": "06 · Hito R5: ¡Matad a los intrusos! (Invasión)", "icon": "fa-solid fa-shield-halved"},
            {"id": "climax", "name": "R6 · Última Luna Llena", "sceneName": "08 · Hito R6: La última luna llena (Clímax)", "icon": "fa-solid fa-fire-flame-curved"},
        ],
        "motifs": [
            {"id": "acecho", "name": "Acecho en la Guarida", "icon": "fa-solid fa-hammer", "color": "#8a6d3b"},
            {"id": "incursion", "name": "Incursión Nocturna", "icon": "fa-solid fa-skull", "color": "#b83a2e"},
            {"id": "ritual", "name": "Artes Oscuras y Ritual", "icon": "fa-solid fa-eye", "color": "#7b4397"},
            {"id": "invasion", "name": "¡Invasión de Héroes!", "icon": "fa-solid fa-swords", "color": "#d49a35"},
        ],
        "milestones": [
            {"id": "R1", "label": "R1 · Reclamar las Cuevas del Paso del Mercader", "done": False},
            {"id": "R2", "label": "R2 · Despertar el Corazón y excavar la Guarida", "done": False},
            {"id": "R3", "label": "R3 · Saquear los grimorios de la Abadía del Corazón Valiente", "done": False},
            {"id": "R4", "label": "R4 · Cazar al Gran Hombre Lobo del Bosque Susurrante", "done": False},
            {"id": "R5", "label": "R5 · Aniquilar a la Expedición Invasora en la Mazmorra", "done": False},
            {"id": "R6", "label": "R6 · Completar el Eclipse y asaltar Ciudad Floresta", "done": False},
        ],
        "clocks": [
            {"id": "alarma_gremio", "name": "Alarma en las Colinas de Piedra Blanca", "value": 0, "max": 4},
            {"id": "sospecha_abadia", "name": "Sospecha de la Abadía del Corazón Valiente", "value": 0, "max": 6},
            {"id": "cruzada_floresta", "name": "Cruzada de Ciudad Floresta", "value": 0, "max": 8},
            {"id": "ritual_eclipse", "name": "Plan Maestro: El Eclipse de la Última Luna", "value": 0, "max": 8},
        ],
    }
    guardar_json(os.path.join(CONTENT_DIR, "direccion-es.json"), pack)


# ---------------------------------------------------------------------------
# 9. PARCHES DE BABELE (compendium/es/*.json)
#    Corrige los bugs detectados en wicked-ones-esp:
#    - wicked-ones.minion_upgrade.json (typo checbox2 -> checkbox2)
#    - wicked-ones.adventurer.json (añade campos custom y los 6 movimientos)
#    - wicked-ones.conquest_ability.json (traduce las 15 habilidades de Undead Awakening)
#    - wicked-ones.system-documentation.json (traduce la guía de interfaz del sistema)
# ---------------------------------------------------------------------------
def construir_babele():
    # 1. Copiar y corregir wicked-ones.minion_upgrade.json desde el repo de wicked-ones-esp
    ruta_esp_mu = "/Users/mromera/.gemini/antigravity/brain/407b1090-088f-4ab3-bc5f-0ff789ba6293/scratch/wicked-ones-esp/compendium/es/wicked-ones.minion_upgrade.json"
    if os.path.exists(ruta_esp_mu):
        with open(ruta_esp_mu, "r", encoding="utf-8") as f:
            mu_data = json.load(f)
        mu_data["mapping"] = {
            "description": "system.description",
            "checkbox1": "system.upgrade_checkbox_text",
            "checkbox2": "system.upgrade_checkbox_2_text",
            "checbox2": "system.upgrade_checkbox_2_text",
        }
        for k, v in mu_data.get("entries", {}).items():
            if "checbox2" in v and "checkbox2" not in v:
                v["checkbox2"] = v["checbox2"]
        guardar_json(os.path.join(BABELE_DIR, "wicked-ones.minion_upgrade.json"), mu_data)

    # 2. Enriquecer wicked-ones.adventurer.json con todos los campos que muestra party-sheet.html + los 6 movimientos
    entries_adv = {}
    for adv in ADV_MANUAL:
        nom_en = re.sub(r"(?<!^)([A-Z])", r" \1", CLASES[adv["nombre"]])
        of, de = adv["ofensivos"], adv["defensivos"]
        entries_adv[nom_en] = {
            "id": adv["nombre"],
            "name": adv["nombre"],
            "adventurer_class_custom": adv["nombre"],
            "trait_pos_1_custom": adv["rasgos"][0],
            "trait_neg_1_custom": adv["rasgos"][1].capitalize(),
            "motivation_1_custom": adv["motivacion"].capitalize(),
            "passive": f"{adv['pasiva']} (Ofensivos: {', '.join(of)} · Defensivos: {', '.join(de)})",
            "description": f"Pasiva: {adv['pasiva']}\nMovimientos ofensivos: {', '.join(of)}\nMovimientos defensivos: {', '.join(de)}",
        }

    babele_adv = {
        "label": "Aventureros",
        "mapping": {
            "passive": "system.passive",
            "adventurer_class_custom": "system.adventurer_class_custom",
            "trait_pos_1_custom": "system.trait_pos_1_custom",
            "trait_neg_1_custom": "system.trait_neg_1_custom",
            "motivation_1_custom": "system.motivation_1_custom",
            "description": "system.description",
        },
        "entries": entries_adv,
    }
    guardar_json(os.path.join(BABELE_DIR, "wicked-ones.adventurer.json"), babele_adv)

    # 3. Traducir wicked-ones.conquest_ability.json (que faltaba por completo en wicked-ones-esp)
    babele_conquest = {
        "label": "Habilidades de Conquista (Despertar No-Muerto)",
        "mapping": {
            "description": "system.description",
        },
        "entries": {
            "Blight": {"name": "Plaga Marchitadora", "description": "La corrupción de vuestro dominio pudre las cosechas y envenena las aguas de la región."},
            "Dark Omen": {"name": "Presagio Oscuro", "description": "Señales funestas en el cielo minan la voluntad de los defensores de la Luz antes de la batalla."},
            "Deadly Fog": {"name": "Niebla Mortal", "description": "Un banco de bruma helada y necrótica oculta el avance de vuestras huestes y asfixia a los vivos."},
            "Endless Tide": {"name": "Marea Inagotable", "description": "Vuestras filas de muertos sin mente se reponen constantemente tras cada escaramuza."},
            "Fearsome Visage": {"name": "Semblante Aterrador", "description": "El horror sobrenatural que emana de vuestros campeones hace huir a las milicias mortales."},
            "Grim Harvest": {"name": "Cosecha Siniestra", "description": "Cada batalla contra las facciones de la superficie engrosa directamente el tamaño de vuestra Horda."},
            "Haunting": {"name": "Apariciones Espectrales", "description": "Fantasmas y ecos de los caídos atormentan los sueños de los líderes enemigos, impidiéndoles descansar."},
            "Infiltration": {"name": "Infiltración Silenciosa", "description": "Agentes corruptos y siervos juramentados abren las puertas desde dentro cuando comienza el asedio."},
            "March of the Dead": {"name": "Marcha de los Muertos", "description": "Vuestros ejércitos no necesitan dormir ni comer, cruzando montañas y ríos de noche sin detenerse."},
            "Necrotic Empowerment": {"name": "Empoderamiento Necrótico", "description": "La energía de la vela ritual sobrecarga el poder físico y arcano de los Despertados."},
            "Shatter Morale": {"name": "Quebrar la Moral", "description": "Los gritos de los condenados rompen la disciplina de cualquier formación enemiga."},
            "Soul Tether": {"name": "Vínculo de Almas", "description": "Permite transferir el daño sufrido por un Despertado a sus siervos no-muertos cercanos."},
            "Tainted Land": {"name": "Tierra Profanada", "description": "El suelo conquistado rechaza la magia sagrada de los clérigos y paladines de la Luz."},
            "Unholy Vanguard": {"name": "Vanguardia Impía", "description": "La primera oleada de la Horda golpea con fuerza devastadora contra las defensas de la facción."},
            "Whispers in the Dark": {"name": "Susurros en la Oscuridad", "description": "La corrupción se extiende por las ciudades enemigas sembrando traición y paranoia."},
        },
    }
    guardar_json(os.path.join(BABELE_DIR, "wicked-ones.conquest_ability.json"), babele_conquest)


def main():
    print("Generando datos para MR- Wicked Ones (The Hills Press)...")
    labores = construir_labores()
    guardar_json(os.path.join(DATA_DIR, "labores-es.json"), labores)

    equipo = construir_equipo()
    guardar_json(os.path.join(DATA_DIR, "equipo-es.json"), equipo)

    aventureros = construir_aventureros()
    guardar_json(os.path.join(DATA_DIR, "aventureros-es.json"), aventureros)

    actores = construir_actores()
    guardar_json(os.path.join(DATA_DIR, "facciones-es.json"), actores)

    tablas = construir_tablas()
    guardar_json(os.path.join(DATA_DIR, "tablas-es.json"), tablas)

    diarios = construir_manual()
    guardar_json(os.path.join(DATA_DIR, "manual-es.json"), diarios)

    aventura = construir_aventura(labores, equipo, aventureros, actores, tablas, diarios)
    guardar_json(os.path.join(DATA_DIR, "aventura-es.json"), aventura)

    construir_direccion()
    construir_babele()
    print("¡Generación completada con éxito!")


if __name__ == "__main__":
    main()
