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
from datos_reglas import (
    SALAS_N1, SALAS_N2, TRAMPAS, TRUCOS, PORTONES, CRIATURAS, HALLAZGOS,
    ARMAS_Y_EQUIPO, SUMINISTROS, MEJUNJES_36, ARTILUGIOS_36, POCIONES_36, OBJETOS_MAGICOS_36,
    AVENTUREROS_30, AYUDANTES_36, ENTORNOS_FACCIONES,
)

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
    items = []

    for nom, desc in SALAS_N1:
        items.append({
            "_id": fid(f"duty:sala1:{nom}"),
            "name": f"Sala N1 · {nom}",
            "type": "duty",
            "img": "systems/wicked-ones/styles/assets/icons/Icon.5_70.png",
            "system": {
                "tier": 1,
                "type": "FITD.DUTY_TYPE.Room",
                "type_custom": "Sala",
                "description": desc,
            },
            "flags": {MOD: {"subtipo": "sala_n1"}},
        })

    for nom, desc in SALAS_N2:
        items.append({
            "_id": fid(f"duty:sala2:{nom}"),
            "name": f"Sala N2 · {nom}",
            "type": "duty",
            "img": "systems/wicked-ones/styles/assets/icons/Icon.5_70.png",
            "system": {
                "tier": 2,
                "type": "FITD.DUTY_TYPE.Room",
                "type_custom": "Sala",
                "description": desc,
            },
            "flags": {MOD: {"subtipo": "sala_n2"}},
        })

    for nom, niv, desc in TRAMPAS:
        items.append({
            "_id": fid(f"duty:trampa:{nom}"),
            "name": f"Trampa N{niv} · {nom}",
            "type": "duty",
            "img": "systems/wicked-ones/styles/assets/icons/Icon.1_04.png",
            "system": {
                "tier": niv,
                "type": "FITD.DUTY_TYPE.Trap",
                "type_custom": "Trampa",
                "description": desc,
            },
            "flags": {MOD: {"subtipo": "trampa"}},
        })

    for nom, niv, desc in TRUCOS:
        items.append({
            "_id": fid(f"duty:truco:{nom}"),
            "name": f"Truco · {nom}",
            "type": "duty",
            "img": "systems/wicked-ones/styles/assets/icons/Icon.6_25.png",
            "system": {
                "tier": niv,
                "type": "FITD.DUTY_TYPE.Trick",
                "type_custom": "Truco",
                "description": desc,
            },
            "flags": {MOD: {"subtipo": "truco"}},
        })

    for nom, niv, desc in PORTONES:
        items.append({
            "_id": fid(f"duty:porton:{nom}"),
            "name": f"Portón N{niv} · {nom}",
            "type": "duty",
            "img": "systems/wicked-ones/styles/assets/icons/Icon.5_85.png",
            "system": {
                "tier": niv,
                "type": "FITD.DUTY_TYPE.Lock",
                "type_custom": "Cerradura",
                "description": desc,
            },
            "flags": {MOD: {"subtipo": "porton"}},
        })

    for nom, niv, desc in CRIATURAS:
        items.append({
            "_id": fid(f"duty:criatura:{nom}"),
            "name": f"Criatura N{niv} · {nom}",
            "type": "duty",
            "img": "systems/wicked-ones/styles/assets/icons/Icon.3_37.png",
            "system": {
                "tier": niv,
                "type": "FITD.DUTY_TYPE.Creature",
                "type_custom": "Criatura",
                "description": desc,
            },
            "flags": {MOD: {"subtipo": "criatura"}},
        })

    for nom, niv, desc in HALLAZGOS:
        items.append({
            "_id": fid(f"duty:hallazgo:{nom}"),
            "name": f"Hallazgo · {nom}",
            "type": "duty",
            "img": "systems/wicked-ones/styles/assets/icons/Icon.5_16.png",
            "system": {
                "tier": niv,
                "type": "FITD.DUTY_TYPE.Discovery",
                "type_custom": "Descubrimiento",
                "description": desc,
            },
            "flags": {MOD: {"subtipo": "hallazgo"}},
        })

    return items


# ---------------------------------------------------------------------------
# 2. PACK: equipo-es (Armas, Armaduras, Suministros, 36 Mejunjes, 36 Artilugios, 36 Pociones, 36 Objetos Mágicos)
# ---------------------------------------------------------------------------
def construir_equipo():
    items = []

    for nom, gos, qual, utype, uses, edges, desc in ARMAS_Y_EQUIPO + SUMINISTROS:
        edges_dict = {str(i): v for i, v in enumerate(edges)}
        items.append({
            "_id": fid(f"eq:base:{nom}"),
            "name": nom,
            "type": "gearsupply",
            "img": "systems/wicked-ones/styles/assets/icons/Icon.6_37.png",
            "system": {
                "gear_or_supply": gos,
                "quality_category": qual,
                "use_type": utype,
                "uses_left": uses,
                "edges": edges_dict,
                "description": desc,
            },
            "flags": {MOD: {"categoria": gos}},
        })

    for d66, nom, desc in MEJUNJES_36:
        items.append({
            "_id": fid(f"eq:mejunje:{d66}"),
            "name": f"Mejunje [{d66}] · {nom}",
            "type": "gearsupply",
            "img": "systems/wicked-ones/styles/assets/icons/Icon.4_48.png",
            "system": {
                "gear_or_supply": "supply",
                "quality_category": "valuable",
                "use_type": "limited",
                "uses_left": 1,
                "edges": {"0": "Mejunje alquímico", "1": f"d66: {d66}"},
                "description": desc,
            },
            "flags": {MOD: {"categoria": "mejunje", "d66": d66}},
        })

    for d66, nom, desc in ARTILUGIOS_36:
        items.append({
            "_id": fid(f"eq:artilugio:{d66}"),
            "name": f"Artilugio [{d66}] · {nom}",
            "type": "gearsupply",
            "img": "systems/wicked-ones/styles/assets/icons/Icon.7_96.png",
            "system": {
                "gear_or_supply": "gear",
                "quality_category": "valuable",
                "use_type": "unlimited",
                "uses_left": 1,
                "edges": {"0": "Artilugio mecánico", "1": f"d66: {d66}"},
                "description": desc,
            },
            "flags": {MOD: {"categoria": "artilugio", "d66": d66}},
        })

    for d66, nom, desc in POCIONES_36:
        items.append({
            "_id": fid(f"eq:pocion:{d66}"),
            "name": f"Poción [{d66}] · {nom}",
            "type": "gearsupply",
            "img": "systems/wicked-ones/styles/assets/icons/Icon.5_34.png",
            "system": {
                "gear_or_supply": "supply",
                "quality_category": "valuable",
                "use_type": "limited",
                "uses_left": 1,
                "edges": {"0": "Poción bruja", "1": f"d66: {d66}"},
                "description": desc,
            },
            "flags": {MOD: {"categoria": "pocion", "d66": d66}},
        })

    for d66, nom, desc in OBJETOS_MAGICOS_36:
        items.append({
            "_id": fid(f"eq:reliquia:{d66}"),
            "name": f"Objeto Mágico [{d66}] · {nom}",
            "type": "gearsupply",
            "img": "systems/wicked-ones/styles/assets/icons/Icon.1_66.png",
            "system": {
                "gear_or_supply": "gear",
                "quality_category": "powerful",
                "use_type": "unlimited",
                "uses_left": 1,
                "edges": {"0": "Reliquia mágica", "1": f"d66: {d66}"},
                "description": desc,
            },
            "flags": {MOD: {"categoria": "reliquia", "d66": d66}},
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


def construir_aventureros():
    items = []

    for (clave, nom_es, mot_k, mot_es, pos_k, pos_es, neg_k, neg_es, pasiva, mov_of, mov_def) in AVENTUREROS_30:
        slug_img = MAPA_RETRATOS_ADV.get(clave)
        img = f"modules/{MOD}/assets/retratos/{slug_img}.webp" if slug_img else "systems/wicked-ones/styles/assets/icons/Icon.1_05.png"
        desc_movs = (
            f"Pasiva: {pasiva}\n"
            f"Movimientos ofensivos:\n"
            f"• {mov_of[0]}\n• {mov_of[1]}\n• {mov_of[2]}\n"
            f"Movimientos defensivos:\n"
            f"• {mov_def[0]}\n• {mov_def[1]}\n• {mov_def[2]}"
        )
        items.append({
            "_id": fid(f"adv:clase:{clave}"),
            "name": nom_es,
            "type": "adventurer",
            "img": img,
            "system": {
                "adventurer_type": "adventurer",
                "adventurer_class": f"FITD.ADV_CLASS.{clave.capitalize()}",
                "adventurer_class_custom": nom_es,
                "hireling_type": "",
                "hireling_type_custom": "",
                "tier": 1,
                "heart_slashes": 0,
                "moves_used": 0,
                "passive": f"{pasiva} | Ofensivos: {', '.join(mov_of)} | Defensivos: {', '.join(mov_def)}",
                "trait_pos_1": f"FITD.ADV_TRAIT.{pos_k.capitalize()}",
                "trait_pos_1_custom": pos_es,
                "trait_pos_2": "",
                "trait_pos_2_custom": "",
                "trait_neg_1": f"FITD.ADV_TRAIT.{neg_k.capitalize()}",
                "trait_neg_1_custom": neg_es,
                "trait_neg_2": "",
                "trait_neg_2_custom": "",
                "motivation_1": f"FITD.ADV_MOTIVE.{mot_k.capitalize()}",
                "motivation_1_custom": mot_es,
                "motivation_2": "",
                "motivation_2_custom": "",
                "description": desc_movs,
            },
            "flags": {
                MOD: {
                    "clase": clave,
                    "pasivaCorto": pasiva,
                    "ofensivos": mov_of,
                    "defensivos": mov_def,
                }
            },
        })

    for clave, nom_es, pasiva in AYUDANTES_36:
        items.append({
            "_id": fid(f"adv:ayudante:{clave}"),
            "name": f"Ayudante · {nom_es}",
            "type": "adventurer",
            "img": "systems/wicked-ones/styles/assets/icons/Icon.6_62.png",
            "system": {
                "adventurer_type": "hireling",
                "adventurer_class": "",
                "adventurer_class_custom": "",
                "hireling_type": f"FITD.ADV_TYPE.{clave.capitalize()}",
                "hireling_type_custom": nom_es,
                "tier": 0,
                "heart_slashes": 0,
                "moves_used": 0,
                "passive": pasiva,
                "trait_pos_1": "FITD.ADV_TRAIT.Helpful",
                "trait_pos_1_custom": "Servicial",
                "trait_pos_2": "",
                "trait_pos_2_custom": "",
                "trait_neg_1": "FITD.ADV_TRAIT.Impatient",
                "trait_neg_1_custom": "Impaciente",
                "trait_neg_2": "",
                "trait_neg_2_custom": "",
                "motivation_1": "FITD.ADV_MOTIVE.Riches",
                "motivation_1_custom": "Riquezas",
                "motivation_2": "",
                "motivation_2_custom": "",
                "description": pasiva,
            },
            "flags": {MOD: {"ayudante": clave}},
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

    # 4.1 Las 48 Facciones de los 4 entornos oficiales
    for entorno, lista in ENTORNOS_FACCIONES.items():
        for nom, niv, bando, c1_max, c1_txt, c2_max, c2_txt, desc in lista:
            aid = fid(f"actor:faccion:{entorno}:{nom}")
            actores.append({
                "_id": aid,
                "name": f"[{entorno}] {nom}",
                "type": "faction",
                "img": "systems/wicked-ones/styles/assets/default-images/faction.webp",
                "system": {
                    "category": bando,
                    "tier": {"value": niv, "min": 0, "max": 4},
                    "clock1": {"value": 0, "min": 0, "max": c1_max, "text": c1_txt},
                    "clock2": {"value": 0, "min": 0, "max": c2_max, "text": c2_txt},
                    "description": f"<p><strong>Entorno:</strong> {entorno}</p><p>{desc}</p>",
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
        ("esbirros-ulrot", "Machacadores de Ulrot", "Orco", "Guardias y rompelíneas", "Hachas melladas, escudos de hierro y armaduras saqueadas.",
         {"smash": 2, "threaten": 2, "scan": 1, "finesse": 1},
         "Acorazados", "Una vez por escena pueden absorber un impacto mortal sin perder integrantes."),
        ("esbirros-crag", "Acechadores Escamosos de Crag", "Kóbold", "Chamanes y tramperos de túnel", "Jabalinas con plumas, máscaras de hueso y bolsas de componentes.",
         {"invoke": 2, "tinker": 2, "skulk": 1, "trick": 1},
         "Iniciados en Senda Arcana", "Pueden asistir en rituales y canalizar chispas de piromancia en combate."),
        ("esbirros-slem", "Merodeadores Sombríos de Slem", "Sérpido", "Exploradores y asesinos nocturnos", "Capas oscuras, dagas envenenadas y cerbatanas silenciosas.",
         {"skulk": 2, "finesse": 2, "scan": 1, "trick": 1},
         "Sigilosos", "Se mueven en silencio absoluto por sombras y conductos estrechos."),
        ("esbirros-viska", "Chapuceros de Viska", "Goblin", "Ingenieros, minadores y artificieros", "Gafas de latón, llaves inglesas, picos y barriles de pólvora.",
         {"tinker": 2, "trick": 2, "scan": 1, "skulk": 1},
         "Constructores incansables", "Otorgan ventaja al excavar salas o montar trampas en la guarida."),
        ("esbirros-kaelen", "Acólitos de Ceniza de Kaelen", "Demonio", "Cultistas y guardias del santuario", "Túnicas carmesíes, incensarios ardientes y espadas curvas.",
         {"invoke": 2, "banter": 2, "threaten": 1, "smash": 1},
         "Fanáticos devotos", "Nunca sufren rotura de moral mientras su señor esté presente."),
        ("esbirros-zira", "Susurradores del Velo de Zira", "Devoramentes", "Espías e infiltrados en la superficie", "Disfraces de peregrinos, lentes oscuras y dagas ocultas.",
         {"trick": 2, "banter": 2, "scan": 1, "skulk": 1},
         "Infiltrados", "Pueden caminar por los pueblos de la superficie haciéndose pasar por viajeros."),
    ]

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
                        "upgrade_checkbox_text": "Usado en esta fase",
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
                    "name": "Armar escándalo y saquear",
                    "type": "minionimpulse",
                    "img": "systems/wicked-ones/styles/assets/icons/Icon.2_29.png",
                    "system": {"is_for_ua": False, "description": "Celebran cada victoria con estrépito y disputas por el botín."},
                },
            ],
            "flags": {
                MOD: {
                    "tipo": "esbirros",
                    "figura": f"modules/{MOD}/assets/figuras/{slug}.webp",
                }
            },
        })

    # 4.3 Los 6 Personajes Jugadores (PJs) pregenerados (liderados por el trío icónico del libro: Ulrot, Crag y Slem)
    pjs_cfg = [
        ("pj-ulrot", "Ulrot", "Orco", "Bruto", "Cicatrices de guerra, hombreras de hueso y un enorme mandoble dentado",
         "Grash (el carnicero del campamento)", "esbirros-ulrot",
         {"smash": 2, "threaten": 2, "finesse": 1, "scan": 1, "skulk": 1},
         "Festín de carne asada y cerveza robada",
         "Aplastar a los arrogantes campeones de la Luz",
         "Fuerza imparable", "Tus golpes cuerpo a cuerpo destrozan escudos, puertas y armaduras con facilidad aterradora.",
         "Mandoble quebrantahuesos", "Armadura de placas abolladas"),
        ("pj-crag", "Crag", "Kóbold", "Chamán", "Escamas rojizas, corona de cuernos y un báculo coronado por un cráneo humeante",
         "Vex (la anciana guardiana de los huevos)", "esbirros-crag",
         {"invoke": 2, "trick": 2, "scan": 1, "tinker": 1, "banter": 1},
         "Danza extática alrededor de la hoguera ritual",
         "Demostrar que las artes oscuras dominan el Valle Silencioso",
         "Canalizador de Gorlag", "Dominas los rituales de sangre y la senda de piromancia, canalizando el poder de los Dioses Oscuros.",
         "Báculo de canalización rúnica", "Bolsa de fetiches y pergaminos"),
        ("pj-slem", "Slem", "Sérpido", "Sombra", "Ojos verticales dorados, capucha de cuero negro y un par de dagas curvas goteantes",
         "Naga-Sss (traficante de venenos)", "esbirros-slem",
         {"skulk": 2, "finesse": 2, "trick": 1, "scan": 1, "threaten": 1},
         "Acechar desde las vigas altas y coleccionar llaves robadas",
         "Infiltrarse en las fortalezas más vigiladas sin ser visto",
         "Uno con las sombras", "Puedes desaparecer de la vista en cualquier rincón oscuro y atacar desde ángulos imposibles.",
         "Dagas gemelas envenenadas", "Herramientas de ladrón y ganzúas"),
        ("pj-viska", "Viska", "Goblin", "Artesana", "Dedos manchados de hollín, gafas de aumento triples y un cinturón lleno de engranajes",
         "Tock (su autómata de cuerda medio loco)", "esbirros-viska",
         {"tinker": 2, "scan": 2, "trick": 1, "skulk": 1, "finesse": 1},
         "Probar explosivos e inventos ruidosos en el taller",
         "Convertir la mazmorra en una máquina mortal perfecta",
         "Mente maestra de artilugios", "Comienzas cada fase con suministros para fabricar mejunjes alquímicos y artilugios mecánicos.",
         "Ballesta de repetición", "Caja de herramientas de maestro"),
        ("pj-kaelen", "Kaelen", "Demonio", "Hechicero", "Cuernos curvados hacia atrás, ojos como brasas y túnica ribeteada en oro negro",
         "Malphas (un diablillo mensajero del Abismo)", "esbirros-kaelen",
         {"invoke": 2, "threaten": 2, "banter": 1, "scan": 1, "smash": 1},
         "Deleitarse con el miedo de los prisioneros y beber vino especiado",
         "Someter las almas de la Abadía de Piedra Blanca",
         "Hechicería abisal", "Desatas fuego negro, telequinesis e ilusiones aterradoras canalizando tu propia sangre demoníaca.",
         "Orbe de obsidiana ardiente", "Túnica de escamas infernales"),
        ("pj-zira", "Zira", "Devoramentes", "Confabuladora", "Tentáculos faciales violáceos ocultos tras una máscara de plata y capa de terciopelo",
         "Hermano Tomás (un monje corrupto de Piedra Blanca)", "esbirros-zira",
         {"banter": 2, "trick": 2, "scan": 2, "invoke": 1},
         "Saborear los recuerdos y secretos extraídos de mentes cautivas",
         "Enfrentar a las facciones de la Luz entre sí mediante intrigas",
         "Red de marionetas", "Siempre tienes un contacto sobornado o coaccionado dentro de la facción objetivo de la incursión.",
         "Bastón estoque oculto", "Disfraces y sellos falsificados"),
    ]

    for (slug, nom, raza, voc, look, amigo, slug_manada, habs, juerga, impulso, hab_nom, hab_desc, eq1, eq2) in pjs_cfg:
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
                "step2": "2. Saquear los grimorios prohibidos de la Abadía de Piedra Blanca («Una biblioteca necesita libros»).",
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
         "Primer grupo de héroes enviado por el Gremio de Mercaderes y la Abadía de Piedra Blanca para recuperar la mercancía robada y tantear vuestras defensas.",
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
                "<li><strong>Hito R3:</strong> Incursión II «Una biblioteca necesita libros» (Abadía de Piedra Blanca).</li>"
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
                "name": "Sospecha de la Abadía de Piedra Blanca",
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
    tablas = []

    tablas.append(crear_tabla(
        "incursion-objetivo",
        "01 · Generador de Incursiones: Objetivo y Botín (d36)",
        "Tira para generar un objetivo de incursión en el entorno y su recompensa principal.",
        [
            "Caravana de impuestos fuertemente escoltada (2 de Oro + Suministros)",
            "Almacén de suministros del Gremio (1 de Oro + 3 Suministros compartidos)",
            "Biblioteca o archivo monástico (Grimorios + +2 segmentos a un Ritual)",
            "Prisión o convoy de cautivos (Esclavos o reclutas para una nueva Manada)",
            "Torre de un mago o alquimista solitario (1 Objeto Mágico o 3 Pociones)",
            "Santuario consagrado de la Luz (Profanarlo otorga 1 Corazón Oscuro y +1 XP Malvada)",
            "Mina de hierro o cobre en activo (Materiales para construir una Sala de Nivel 3)",
            "Campamento de cazadores o montaraces (Capturar bestias de guarida y mapas)",
            "Posada fortificada en un cruce de caminos (1 de Oro + información sobre facciones)",
            "Taller de un maestro armero o inventor (2 Artilugios o Armas Valiosas)",
            "Cripta antigua recién descubierta por eruditos (Reliquia antigua + huesos para nigromancia)",
            "Granja o destilería próspera (Provisiones para un gran festín: reduce estrés de la horda)",
            "Embajada o mansión de un aristócrata (Rehenes nobles por rescate de 2 de Oro)",
            "Puesto de guardia fronterizo (Debilita en −1 el reloj de invasión de una facción de la Luz)",
            "Círculo druídico o claro sagrado (Ingredientes raros para brujería y rituales)",
            "Barco mercante o barcaza fluvial (2 de Oro + cañones o pólvora negra)",
            "Campamento de una banda rival de la Oscuridad (Someterlos o arrebatarles su tributo)",
            "Cámara del tesoro de un recaudador corrupto (3 de Oro, pero muy vigilada)",
        ]
    ))

    tablas.append(crear_tabla(
        "incursion-complicacion",
        "02 · Generador de Incursiones: Giro y Oposición (d18)",
        "Tira para descubrir qué complicación inesperada aguarda durante la incursión.",
        [
            "Un aventurero errante de Nivel 2 se aloja casualmente en el lugar.",
            "Otra facción (neutral u oscura) está atacando o robando el objetivo al mismo tiempo.",
            "El botín real es una trampa tendida para emboscar a los monstruos.",
            "Una tormenta violenta, niebla mágica o incendio complica la huida.",
            "El objetivo está protegido por guardias con perros de presa y alarmas conectadas.",
            "El botín es mucho más pesado, frágil o ruidoso de transportar de lo previsto.",
            "Un traidor o espía ha avisado de vuestra llegada; la posición inicial baja un paso.",
            "En el sótano del lugar hay una criatura peligrosa encadenada lista para soltarse.",
            "Los defensores cuentan con suministros alquímicos (fuego líquido y bombas de humo).",
            "Un clérigo o inquisidor ha sellado las entradas principales con glifos de alarma.",
            "Los civiles del lugar han formado una milicia desesperada y conocen el terreno.",
            "Hay un prisionero o desertor que ofrece un trato tentador si lo liberáis en silencio.",
        ]
    ))

    tablas.append(crear_tabla(
        "aventureros-30",
        "03 · Generador de Invasión: Aventureros (d30)",
        "Genera uno de los 30 Aventureros oficiales con sus rasgos, pasiva y 6 movimientos.",
        [
            f"{nom_es} — Pasiva: {pasiva} | Rasgos: +{pos_es}, −{neg_es} | Motivación: {mot_es} | Ofensivos: {', '.join(mov_of)} | Defensivos: {', '.join(mov_def)}"
            for (_, nom_es, _, mot_es, _, pos_es, _, neg_es, pasiva, mov_of, mov_def) in AVENTUREROS_30
        ]
    ))

    tablas.append(crear_tabla(
        "ayudantes-36",
        "04 · Generador de Invasión: Ayudantes (d36)",
        "Genera uno de los 36 Ayudantes oficiales que acompañan a los grupos invasores.",
        [f"{nom_es} — {pasiva}" for (_, nom_es, pasiva) in AYUDANTES_36]
    ))

    tablas.append(crear_tabla(
        "criaturas-36",
        "05 · Generador de Criaturas de Guarida (d36)",
        "Genera una criatura para habitar o defender la mazmorra (Niveles 1 a 3).",
        [f"[Nivel {niv}] {nom} — {desc}" for (nom, niv, desc) in CRIATURAS]
    ))

    tablas.append(crear_tabla(
        "criaturas-mutacion",
        "06 · Rasgo Mutante o Especial de Criatura (d20)",
        "Añade un giro único o mutación a cualquier criatura de la mazmorra (p. 373).",
        [
            "1. Alada: Puede volar por bóvedas altas y abalanzarse sobre la retaguardia.",
            "2. Anfibia / Acuática: Respira bajo el agua y embosca desde cisternas y canales.",
            "3. Acorazada: Placas de quitina o escamas pétreas que reducen el efecto de las armas.",
            "4. Bioluminiscente / Hipnótica: Sus patrones de luz desorientan y embelesan.",
            "5. Camuflada: Se funde con la roca o las sombras hasta el instante de atacar.",
            "6. Ciega con ecolocalización: Inmune a ilusiones visuales, ceguera y oscuridad total.",
            "7. Corrosiva: Su saliva o sangre disuelve el metal y la madera.",
            "8. Dos cabezas: Actúa y vigila en dos direcciones a la vez; difícil de flanquear.",
            "9. Eléctrica: Descarga arcos voltaicos al contacto o a través del agua.",
            "10. Enjambre divisible: Al ser herida se separa en múltiples criaturas menores.",
            "11. Escupefuego: Exhala un cono de llamas o bilis incendiaria.",
            "12. Espectral / Fase: Puede atravesar muros o volverse intangible brevemente.",
            "13. Espinas proyectables: Lanza púas o agujas óseas a distancia.",
            "14. Grito aterrador: Su alarido hiela la sangre y alerta a las salas vecinas.",
            "15. Magnética: Atrae o repele las armas y armaduras de hierro de los aventureros.",
            "16. Parásita / Esporal: Infecta a los heridos con esporas o larvas debilitantes.",
            "17. Pegajosa / Telarañas: Inmoviliza a sus presas con filamentos o baba adhesiva.",
            "18. Psíquica / Telépata: Susurra terrores en la mente y detecta intrusos a través de muros.",
            "19. Regeneradora: Cura sus heridas salvo que reciba fuego o ácido.",
            "20. Venenosa: Su mordisco o aguijón inyecta una potente toxina paralizante.",
        ]
    ))

    tablas.append(crear_tabla(
        "mejunjes-36",
        "07 · Tabla de Mejunjes Alquímicos (d36)",
        "Tira para obtener un mejunje alquímico aleatorio (p. 131).",
        [f"[{d66}] {nom}: {desc}" for (d66, nom, desc) in MEJUNJES_36]
    ))

    tablas.append(crear_tabla(
        "artilugios-36",
        "08 · Tabla de Artilugios Mecánicos (d36)",
        "Tira para obtener un artilugio mecánico aleatorio (p. 133).",
        [f"[{d66}] {nom}: {desc}" for (d66, nom, desc) in ARTILUGIOS_36]
    ))

    tablas.append(crear_tabla(
        "pociones-36",
        "09 · Tabla de Pociones de Brujería (d36)",
        "Tira para obtener una poción mágica aleatoria (p. 141).",
        [f"[{d66}] {nom}: {desc}" for (d66, nom, desc) in POCIONES_36]
    ))

    tablas.append(crear_tabla(
        "reliquias-36",
        "10 · Tabla de Objetos Mágicos y Reliquias (d36)",
        "Tira para obtener un objeto mágico o reliquia aleatoria (p. 143).",
        [f"[{d66}] {nom}: {desc}" for (d66, nom, desc) in OBJETOS_MAGICOS_36]
    ))

    semillas_1 = [
        "11. Traición", "12. Emboscada", "13. Secreto", "14. Riqueza", "15. Fuego", "16. Sombra",
        "21. Sangre", "22. Reliquia", "23. Prisionero", "24. Plaga", "25. Juramento", "26. Tormenta",
        "31. Ruinas", "32. Bestia", "33. Fanatismo", "34. Espejismo", "35. Hambre", "36. Veneno",
        "41. Cisma", "42. Profecía", "43. Asedio", "44. Contrabando", "45. Maldición", "46. Mina",
        "51. Huida", "52. Venganza", "53. Experimento", "54. Tributo", "55. Eclipse", "56. Infiltración",
        "61. Rebelión", "62. Sacrificio", "63. Demonio", "64. Desastre", "65. Alianza", "66. Tesoro",
    ]
    semillas_2 = [
        "11. Mercaderes", "12. Sacerdotes", "13. Guardia", "14. Nobleza", "15. Ladrones", "16. Magos",
        "21. Campesinos", "22. Mercenarios", "23. Druidas", "24. Cazadores", "25. Mineros", "26. Piratas",
        "31. Ancianos", "32. Huérfanos / Pueblo", "33. Inquisidor", "34. Héroe caído", "35. Monstruo rival", "36. Espíritu",
        "41. Puente / Paso", "42. Torre", "43. Templo", "44. Caravana", "45. Cueva", "46. Bosque",
        "51. Pantano", "52. Puerto / Río", "53. Cripta", "54. Biblioteca", "55. Prisión", "56. Mercado",
        "61. Corazón Oscuro", "62. Dios Oscuro", "63. Artefacto", "64. Mapa antiguo", "65. Llave maestra", "66. Trono",
    ]
    tablas.append(crear_tabla(
        "oraculo-semilla-1",
        "11 · Deja volar tu imaginación: Primera Semilla (d36)",
        "Oráculo de inspiración abierta para improvisar giros, rumores y escenas (p. 316).",
        semillas_1
    ))
    tablas.append(crear_tabla(
        "oraculo-semilla-2",
        "12 · Deja volar tu imaginación: Segunda Semilla (d36)",
        "Combínala con la Primera Semilla para responder preguntas abiertas o crear PNJs (p. 316).",
        semillas_2
    ))

    tablas.append(crear_tabla(
        "solitario-gran-malo",
        "13 · Modo Solitario («El Gran Malo Malvado»): Acciones de Esbirros y Guarida (d12)",
        "Oráculo del modo solitario para determinar qué hacen tus lugartenientes y qué ocurre en la mazmorra (pp. 362-367).",
        [
            "1. Un lugarteniente reclama más oro o comida para su manada; amenaza con disturbios.",
            "2. Tus excavadores topan con un Hallazgo inesperado en las profundidades.",
            "3. Una patrulla de exploradores de la Luz es avistada cerca de la entrada exterior.",
            "4. Dos manadas de esbirros se pelean en el foso; una queda Malherida pero gana experiencia.",
            "5. Un emisario de una facción Oscura o Neutral llega con una propuesta de alianza o comercio.",
            "6. Tus artesanos completan un avance gratuito (+1 segmento) en un proyecto o trampa.",
            "7. Un prisionero intenta escapar o revela la ubicación de un botín valioso por su vida.",
            "8. El Corazón de la Mazmorra pulsa con energía: obtienes +1d en tu próximo ritual o canalización.",
            "9. Una criatura salvaje de la caverna se instala en una galería vacía.",
            "10. Rumores en la superficie: una facción de la Luz avanza +1 segmento en su reloj.",
            "11. Tus esbirros traen un botín menor (1 Suministro) de una correría nocturna.",
            "12. Silencio tenso: los aventureros preparan una incursión inminente contra tu guarida.",
        ]
    ))

    tablas.append(crear_tabla(
        "simulador-incursion-esbirros",
        "14 · Resolución Rápida de Incursión de Esbirros (d6)",
        "Tira según el nivel de la manada enviada para resolver una incursión secundaria sin jugarla entera (p. 262).",
        [
            "1 · Fracaso desastroso: La manada vuelve Malherida, sin botín y genera +2 de Represalia.",
            "2 · Retirada costosa: Consiguen solo la mitad del objetivo, vuelven Malheridos y generan +1 de Represalia.",
            "3 · Éxito ruidoso: Logran el objetivo principal, pero vuelven Malheridos y dejan rastro (+1 de Represalia).",
            "4 · Éxito estándar: Cumplen la misión y traen el botín esperado con bajas menores.",
            "5 · Éxito limpio: Cumplen la misión sin sufrir daños ni levantar sospechas adicionales.",
            "6 · Triunfo rotundo: Cumplen la misión, traen un botín extra (+1 Suministro o Mejunje) y amedrentan al enemigo.",
        ]
    ))

    tablas.append(crear_tabla(
        "generador-mazmorras-salas",
        "15 · Generador de Mazmorras: Salas, Trampas y Criaturas (d18)",
        "Tira para poblar rápidamente una sección de mazmorra o una guarida rival (p. 372).",
        [
            "1. Cuerpo de guardia con barricada y una manada de esbirros alerta.",
            "2. Pasillo largo con Trampa de foso de estacas y arqueros al fondo.",
            "3. Almacén de suministros custodiado por una Criatura de Nivel 1.",
            "4. Cruce engañoso con un Truco (puerta falsa o pasillo giratorio) y una emboscada.",
            "5. Celdas de prisioneros con un Portón reforzado y un carcelero bruto.",
            "6. Laboratorio o taller con reactivos volátiles (1 Mejunje + 1 Artilugio).",
            "7. Santuario oscuro con un altar activo y acólitos canalizando.",
            "8. Gruta natural inundada con una Criatura acuática o ácida al acecho.",
            "9. Sala de banquetes o dormitorios donde los esbirros están de juerga.",
            "10. Cripta antigua con esqueletos reanimados y una trampa de gas.",
            "11. Puente estrecho sobre una sima con cuchillas o cuerdas cortables.",
            "12. Cámara de tortura o trofeos con pistas sobre las debilidades de la región.",
            "13. Criadero de bestias con una Criatura de Nivel 2 hambrienta.",
            "14. Biblioteca prohibida protegida por runas explosivas y un hechicero.",
            "15. Hallazgo subterráneo (veta de oro o fuente mágica) disputado por alimañas.",
            "16. Sala del consejo o guerra con el mapa táctico de la zona.",
            "17. Bóveda del tesoro tras un Portón de Nivel 2 y una trampa letal.",
            "18. Cámara del Corazón de la Mazmorra custodiada por el líder y su guardia de élite.",
        ]
    ))

    tablas.append(crear_tabla(
        "botin-mayor",
        "16 · Tabla de Botín Mayor de Aventureros Caídos (d12)",
        "Qué llevan encima los héroes derrotados en vuestra mazmorra cuando registráis sus cadáveres.",
        [
            "1. Bolsa de monedas de oro del reino (1 de Oro) y raciones de viaje.",
            "2. Arma de factura magistral (Valiosa) con el blasón de su orden.",
            "3. Dos viales de Pociones curativas o de resistencia elemental.",
            "4. Mapa anotado con los puntos débiles de una facción de la Luz (+1d en la próxima incursión).",
            "5. Armadura de placas o cota de malla élfica adaptable (Equipo Valioso).",
            "6. Estuche de alquimista con 2 Mejunjes listos para usar.",
            "7. Sello oficial o salvoconducto que permite infiltrarse en Ciudad Floresta.",
            "8. Artilugio de ingeniería enana (ballesta de repetición o ganzúa mecánica).",
            "9. Reliquia sagrada que puede ser profanada en el Santuario por +2 segmentos de Ritual.",
            "10. Diario personal que revela quién contrató la expedición y dónde guarda su tesoro.",
            "11. Objeto Mágico poderoso (tira en la tabla de Objetos Mágicos d36).",
            "12. Cofre de paga de la expedición (2 de Oro) y un prisionero importante con vida.",
        ]
    ))

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
                <h2>Un lugar al que llamar hogar · Campaña oficial en el Valle Silencioso</h2>
                <p>Esta campaña lista para jugar traslada a la mesa el arco completo de los ejemplos narrativos del manual de <strong>Wicked Ones (The Hills Press)</strong> protagonizados por <strong>Ulrot</strong> (Orco Bruto), <strong>Crag</strong> (Kóbold Chamán) y <strong>Slem</strong> (Sérpido Sombra), junto a tres compañeros adicionales listos para elegir (<strong>Viska</strong>, <strong>Kaelen</strong> y <strong>Zira</strong>).</p>
                <blockquote><p><em>«Hartos de huir de los cruzados de Ciudad Floresta y de dormir bajo la lluvia en los riscos, habéis descubierto el lugar perfecto para fundar vuestra propia mazmorra: las Cuevas del Paso del Mercader, en las Colinas de Piedra Blanca. Solo hay un pequeño problema: una caravana armada del Gremio de Mercaderes las está usando como almacén fortificado…»</em></p></blockquote>
                <h3>Estructura en 6 Hitos (Integrada con MR- Dirección)</h3>
                <ol>
                    <li><strong>Hito R1 · Incursión Inicial («Un lugar al que llamar hogar», pág. 37):</strong> Asalto a las Cuevas del Paso del Mercader para expulsar o aniquilar a los guardias del Gremio, quedarse con su botín inicial y despertar el <strong>Corazón de la Mazmorra</strong> en la Bóveda de Piedra Antigua.</li>
                    <li><strong>Hito R2 · Fase de Guarida y Desastre («Construyendo el santuario», pág. 191):</strong> Primera fase de construcción: excavar salas de Nivel 1, tender trampas, reclutar esbirros y afrontar la primera tirada de Desastre y Represalia.</li>
                    <li><strong>Hito R3 · Incursión II («Una biblioteca necesita libros», pág. 116):</strong> Infiltración o asalto nocturno contra la <strong>Abadía de Piedra Blanca</strong> para robar los códices prohibidos que Crag y Kaelen necesitan para su gran ritual.</li>
                    <li><strong>Hito R4 · Incursión III («Piel de lobo para un ritual», pág. 165):</strong> Caza en el <strong>Bosque Susurrante</strong> para abatir al Gran Hombre Lobo antes de que los Cazadores de Plata o los Druidas del Círculo lo reclamen.</li>
                    <li><strong>Hito R5 · Defensa de la Guarida («¡Matad a los intrusos!», pág. 229):</strong> ¡Invasión! La <em>Expedición de Piedra Blanca</em> (o los <em>Cazadores de la Luna de Plata</em>) penetra en vuestra mazmorra. Hora de activar trampas, trucos, portones y manadas.</li>
                    <li><strong>Hito R6 · Clímax («La última luna llena», pág. 267 y 333):</strong> Con el ritual del Eclipse completado, la horda marcha sobre <strong>Ciudad Floresta</strong> mientras la vanguardia de campeones de la Luz lanza su asalto desesperado contra el Santuario.</li>
                </ol>
            """),
            crear_pagina_texto("01", 2, "Hito R1 · Un lugar al que llamar hogar (Incursión Inicial)", f"""
                <p><img src="modules/{MOD}/assets/escenas/cueva-mercaderes.webp" alt="Cueva de los Mercaderes" style="width:100%;border-radius:8px;margin-bottom:12px;" /></p>
                <h2>Hito R1 · Un lugar al que llamar hogar (Pág. 37)</h2>
                <p>Según las reglas de inicio rápido del manual, toda campaña de <em>Wicked Ones</em> arranca <strong>en mitad de la primera incursión</strong> para reclamar el emplazamiento de la mazmorra, sin necesidad de tirada de Implicación previa: los PJs ya están frente a la entrada (Posición <strong>Por defecto</strong>).</p>
                <h3>Situación Táctica en las Cuevas del Paso del Mercader</h3>
                <ul>
                    <li><strong>1. Boca de la Cueva y Carromatos:</strong> Dos carromatos blindados forman un parapeto junto a una hoguera. Cuatro guardias del Gremio vigilan el camino con ballestas y lanzas.</li>
                    <li><strong>2. Galería de los Guardias:</strong> El capataz <strong>Bram</strong> y seis guardias veteranos descansan junto a un <strong>cuerno de bronce de alarma</strong> (Reloj de 4 segmentos: <em>«¡Fuego de señales hacia Piedra Blanca!»</em>).</li>
                    <li><strong>3. Depósito de Caravanas (Norte):</strong> Cajas de herramientas, barriles de licor, hierro forjado y un cofre con la paga (<strong>2 de Oro</strong> y <strong>2 Suministros</strong> para empezar la guarida). Accesible en sigilo por la <em>Grieta de humo</em> superior.</li>
                    <li><strong>4. Cisterna del Arroyo Frío (Sur):</strong> Estanque subterráneo conectado al exterior por un sumidero sumergido. En el fondo acecha una <em>Serpiente constrictora albina</em> (Criatura N1) que puede ser domada o azuzada contra los guardias.</li>
                    <li><strong>5. Bóveda de Piedra Antigua (Este):</strong> Cámara sellada tras un derrumbe parcial donde late una fisura de energía oscura perfecta para anclar el <strong>Corazón de la Mazmorra</strong>.</li>
                </ul>
            """),
            crear_pagina_texto("01", 3, "Hitos R2 a R6 · El ascenso de la Oscuridad", f"""
                <p><img src="modules/{MOD}/assets/escenas/biblioteca-abadia.webp" alt="Biblioteca de la Abadía" style="width:100%;border-radius:8px;margin-bottom:12px;" /></p>
                <h2>Hito R3 · Una biblioteca necesita libros (Pág. 116)</h2>
                <p>Para desbloquear salas avanzadas y el <strong>Ritual del Eclipse de Sangre</strong>, los malvados necesitan los tomos encuadernados en hierro custodiados en el scriptorium de la <strong>Abadía de Piedra Blanca (Facción Nivel 2, Luz)</strong>.</p>
                <ul>
                    <li><strong>Enfoque de Asalto:</strong> Derribar el portón lateral del claustro y enfrentarse a los monjes guerreros antes de que tañan la gran campana.</li>
                    <li><strong>Enfoque de Sigilo / Engaño:</strong> Escalar los contrafuertes góticos bajo la lluvia o infiltrarse con hábitos robados hasta el archivo prohibido.</li>
                    <li><strong>Oposición:</strong> La <strong>Hermana Valeria</strong> (Clériga N1) y dos escuadras de guardias monásticos custodian el relicario.</li>
                </ul>
                <hr/>
                <p><img src="modules/{MOD}/assets/escenas/ritual-luna-llena.webp" alt="Ritual de Luna Llena" style="width:100%;border-radius:8px;margin:12px 0;" /></p>
                <h2>Hito R4 · Piel de lobo para un ritual (Pág. 165)</h2>
                <p>El segundo ingrediente del gran ritual exige desollar al <strong>Gran Hombre Lobo Alfa</strong> que aterroriza el Bosque Susurrante en noche de luna llena. Sin embargo, los <strong>Cazadores de Hombres Lobo de Plata (N2)</strong> también le han tendido una trampa esa misma noche.</p>
                <hr/>
                <p><img src="modules/{MOD}/assets/escenas/defensa-mazmorra.webp" alt="Defensa de la Mazmorra" style="width:100%;border-radius:8px;margin:12px 0;" /></p>
                <h2>Hito R5 · ¡Matad a los intrusos! (Pág. 229) y Hito R6 · La última luna llena (Pág. 333)</h2>
                <p>Cuando los relojes de las facciones de la Luz se completan, los grupos de aventureros (disponibles en la carpeta de Actores listos para arrastrar con sus Corazones y 6 Movimientos) invaden vuestra mazmorra. Si los malvados defienden su Corazón y completan los 6 pasos de su Plan Maestro, desatan el asalto final sobre <strong>Ciudad Floresta</strong>.</p>
            """),
        ],
    })

    # Diario 02: Reglas Fundamentales, Ciclo de Partida y Automatización en Chat
    diarios.append({
        "_id": fid("journal:02-reglas-y-ciclo"),
        "name": "02 · Manual: Ciclo de Partida, Tiradas y Automatización",
        "pages": [
            crear_pagina_texto("02", 1, "Las 4 Fases del Ciclo de Partida", """
                <h2>El Ciclo de Partida en Wicked Ones</h2>
                <p>El juego alterna entre cuatro fases claramente diferenciadas que puedes seguir paso a paso en la <strong>Hoja del DJ (Panel del DJ)</strong>:</p>
                <ol>
                    <li><strong>Fase de Acecho (Guarida / Tiempo Libre):</strong>
                        <ul>
                            <li>Los jugadores eligen y resuelven su <strong>Acción de Tiempo Libre</strong> (Reclutar, Construir, Fabricar, Investigar, Entrenar, Juerga o Proyecto a largo plazo) y pueden <em>Arriesgarse</em> (+1 acción a cambio de +1 dado en la tirada de Desastre).</li>
                            <li>Se realizan las labores de excavación, salas de Nivel 1-3, defensas y mejoras de la mazmorra.</li>
                        </ul>
                    </li>
                    <li><strong>Fase de Desastre (Lógica de Mazmorra):</strong>
                        <ul>
                            <li>El DJ tira por <strong>Desastre (Calamity)</strong> lanzando tantos dados como la Inmundicia/Tamaño más los dados por <em>Arriesgarse</em>.</li>
                            <li>Si hay grupos de aventureros capturados o invasiones pendientes, se resuelven en el interior de la guarida.</li>
                        </ul>
                    </li>
                    <li><strong>Fase de Incursión (Raiding):</strong>
                        <ul>
                            <li>Los malvados salen a la superficie para golpear a una facción del entorno: eligen objetivo, enfoque y realizan la <strong>Tirada de Implicación</strong>.</li>
                            <li>Usa flashbacks, trabajo en equipo, esbirros y Corazones Oscuros para superar los obstáculos y volver con Oro, Suministros y cautivos.</li>
                        </ul>
                    </li>
                    <li><strong>Fase de Represalia (Blowback):</strong>
                        <ul>
                            <li>Se hace la <strong>Tirada de Represalia</strong> (2d por defecto) para ver cuánto ruido ha hecho la incursión.</li>
                            <li>Los relojes de las facciones del entorno avanzan y se comprueba si se desencadena una Invasión.</li>
                        </ul>
                    </li>
                </ol>
            """),
            crear_pagina_texto("02", 2, "Posición, Efecto, Resistencia y Corazones Oscuros", """
                <h2>Posición y Efecto</h2>
                <p>En <em>Wicked Ones</em> no es necesario negociar posición y efecto en cada tirada salvo que cambien respecto al estándar:</p>
                <ul>
                    <li><strong>Posición Por defecto:</strong> Situación normal de riesgo equilibrado (consecuencia estándar: 2 de Estrés o quedar Malherido si ya no puedes asumir estrés).</li>
                    <li><strong>Posición Dominante:</strong> Llevas toda la ventaja (consecuencia menor: 1 de Estrés o pérdida de oportunidad).</li>
                    <li><strong>Posición Funesta (Dire):</strong> Estás en clara desventaja (consecuencia grave: 3 de Estrés, quedar Malherido + Conmocionado o perder un esbirro).</li>
                    <li><strong>Posición Mortal (Deadly):</strong> Si fallas o sacas éxito parcial y decides resistir, debes hacer una <strong>Tirada de Resistir la Muerte</strong> (con 1-3 mueres; con 4-5 sobrevives pero quedas fuera de combate y Malherido).</li>
                </ul>
                <h3>Automatización MR- en las Tarjetas de Chat</h3>
                <p>Este módulo añade botones interactivos en las tarjetas de tirada del chat para agilizar la mesa sin quitar nunca la decisión narrativa:</p>
                <ul>
                    <li><strong>Resistir consecuencia:</strong> Lanza la tirada de resistencia con el atributo elegido o aplica el coste de estrés calculado.</li>
                    <li><strong>Gastar Corazón Oscuro:</strong> Permite invocar un flashback gratuito, potenciar al máximo el efecto o activar habilidades especiales de vocación.</li>
                    <li><strong>Abrir Asistente / Generador MR:</strong> Accesible desde los controles de escena o la cabecera de las fichas para generar incursiones, invasores, salas o tirar en los oráculos.</li>
                </ul>
            """),
        ],
    })

    # Diario 03: Las Artes Oscuras y los 13 Dioses Oscuros
    html_dioses = []
    dioses_info = [
        ("gorlag", "Gorlag, el Señor de la Matanza", "Guerra, sangre, furia berseker y conquista brutal.", "Sacrificar a un guerrero digno en combate singular o bañarse en la sangre de los caídos.", "Desatar una furia imparable, quebrar muros y armas, o invocar sabuesos de sangre."),
        ("iziza", "Iziza, la Reina de los Enjambres", "Insectos, plagas, venenos, telarañas y mutación quitinosa.", "Alimentar al nido con carne fresca o infectar un asentamiento de la superficie.", "Invocar nubes de insectos devoradores, segregar veneno letal o caminar por techos y muros."),
        ("melkahar", "Melkahar, el Corazón de la Fragua Ardiente", "Fuego, magma, ceniza, metal fundido y destrucción volcánica.", "Arrojar tesoros de oro o prisioneros vivos a una fisura de lava o gran horno.", "Tormentas de fuego, fundir el acero enemigo o revestir a la horda en piel de magma."),
        ("gimosha", "Gimosha, el Silencio de la Cripta", "No-muertos, huesos, frío sepulcral y nigromancia.", "Profanar cementerios sagrados y entregar cadáveres intactos al osario.", "Alzar legiones de esqueletos, drenar la vida con un toque o hablar con los espíritus antiguos."),
        ("dalgeth", "Dalgeth, el Tejedor de Mentiras", "Engaño, ilusiones, traición, secretos y paranoia.", "Sembrar la discordia hasta que dos aliados de la Luz se destruyan entre sí.", "Disfraces perfectos, invisibilidad masiva o volver locos de sospecha a los defensores."),
        ("nezame", "Nezame, la Dama de las Sombras", "Oscuridad, noche eterna, sigilo, robo y asesinatos silenciosos.", "Apagar las luces sagradas de un templo o robar la joya más vigilada sin dejar rastro.", "Teletransportarse entre sombras, apagar toda luz en kilómetros o estrangular con penumbra sólida."),
        ("melawa", "Melawa, la Madre del Cieno y la Podredumbre", "Ácido, hongos, esporas, pantanos y decadencia orgánica.", "Corromper los manantiales y cosechas de la superficie con lodo fúngico.", "Lluvia ácida, levantar colosos de barro y micelio o disolver portones de piedra."),
        ("shabaz", "Shabaz, el Ojo de la Tormenta", "Relámpagos, huracanes, trueno y furia de los cielos.", "Atar ofrendas en la cumbre más alta durante una tempestad eléctrica.", "Descargar rayos devastadores, volar sobre vientos huracanados o derribar torres."),
        ("labisha", "Labisha, la Señora del Dolor Exquisito", "Tortura, terror, pesadillas, cadenas y sumisión.", "Quebrar la fe de un campeón de la Luz sin matarlo.", "Paralizar de pavor a un ejército, infligir dolor psíquico a distancia o atar con cadenas espectrales."),
        ("talazar", "Talazar, el Arquitecto del Laberinto", "Piedra, trampas, geometría imposible y secretos subterráneos.", "Construir un complejo de trampas que acabe con un grupo entero sin intervención directa.", "Remodelar pasillos en el acto, abrir fosos bajo los pies o animar estatuas de piedra."),
        ("crevis", "Crevis, el Hambre Insaciable", "Gula, canibalismo, bestias salvajes y caza implacable.", "Celebrar un festín monstruoso con las reservas de toda una aldea.", "Otorgar fauces y garras de depredador alfa, regenerar heridas devorando o atraer monstruos."),
        ("vahoona", "Vahoona, el Susurro del Vacío", "Locura, estrellas oscuras, gravedad, portales y aberraciones.", "Contemplar el abismo cósmico y destruir obras de conocimiento racional.", "Alterar la gravedad, abrir grietas dimensionales o quebrar la mente de los eruditos."),
        ("zaheen", "Zaheen, el Príncipe de la Avaricia", "Oro, contratos de sangre, corrupción, sobornos y reliquias.", "Acumular un tesoro legendario y comprar el alma de un gobernante justo.", "Convertir la carne en oro, maldecir las monedas robadas o someter mediante pactos irrompibles."),
    ]
    for slug_d, nom_d, dom_d, ofr_d, mil_d in dioses_info:
        html_dioses.append(f"""
            <div style="display:flex;gap:14px;align-items:center;margin-bottom:14px;padding:10px;border:1px solid rgba(196,154,69,0.35);border-radius:8px;">
                <img src="modules/{MOD}/assets/dioses/{slug_d}.webp" alt="{nom_d}" style="width:96px;height:96px;object-fit:cover;border-radius:6px;flex-shrink:0;" />
                <div>
                    <h3 style="margin:0 0 4px 0;">{nom_d}</h3>
                    <p style="margin:2px 0;"><strong>Dominios:</strong> {dom_d}</p>
                    <p style="margin:2px 0;"><strong>Ofrenda predilecta:</strong> {ofr_d}</p>
                    <p style="margin:2px 0;"><strong>Milagros de Canalización:</strong> {mil_d}</p>
                </div>
            </div>
        """)

    diarios.append({
        "_id": fid("journal:03-artes-oscuras-dioses"),
        "name": "03 · Manual: Las Artes Oscuras, Invocación y los 13 Dioses",
        "pages": [
            crear_pagina_texto("03", 1, "Las 9 Sendas de Conjuros, Brujería y Hechicería", """
                <h2>Las Artes Oscuras (Págs. 129–171)</h2>
                <p>Cuando un personaje o manada usa la acción <strong>Invocar</strong> o fabrica creaciones arcanas, recurre a una de las ramas de las Artes Oscuras:</p>
                <ul>
                    <li><strong>Alquimia y Artificiería (Págs. 130–133):</strong> Permite destilar los <strong>36 Mejunjes</strong> y ensamblar los <strong>36 Artilugios</strong> (todos disponibles como objetos arrastrables en el compendio <em>MR- Equipo</em> y en sus tablas d36).</li>
                    <li><strong>Las 9 Sendas de Conjuros (Págs. 136–139):</strong>
                        <ol>
                            <li><strong>Piromancia:</strong> Fuego, humo, calor y explosiones ígneas.</li>
                            <li><strong>Criomancia:</strong> Hielo, escarcha, entumecimiento y muros helados.</li>
                            <li><strong>Electromancia:</strong> Relámpagos, magnetismo y sobrecargas nerviosas.</li>
                            <li><strong>Geomancia:</strong> Roca, barro, temblores, fosos y piel de piedra.</li>
                            <li><strong>Umbramancia:</strong> Sombras sólidas, ceguera, silencio y paso oscuro.</li>
                            <li><strong>Biomancia:</strong> Mutación corporal, garras, venenos, curación grotesca y plagas.</li>
                            <li><strong>Ilusionismo:</strong> Espejismos, duplicados, disfraces y sonidos falsos.</li>
                            <li><strong> Gravitomancia / Cinética:</strong> Empujones telequinéticos, levitación y aplastamiento.</li>
                            <li><strong>Nigromancia:</strong> Hablar con cadáveres, reanimar huesos y drenar vigor.</li>
                        </ol>
                    </li>
                    <li><strong>Brujería y Pociones (Págs. 140–141):</strong> Elaboración de las <strong>36 Pociones Mágicas</strong> y fetiches de maldición simpática.</li>
                    <li><strong>Rituales y Objetos Mágicos (Págs. 142–143):</strong> Proyectos de reloj de 4, 6 u 8 segmentos capaces de alterar toda la región o forjar las <strong>36 Reliquias Mágicas</strong>.</li>
                </ul>
            """),
            crear_pagina_texto("03", 2, "Panteón de los 13 Dioses Oscuros (Canalización)", f"""
                <h2>Los 13 Dioses Oscuros (Págs. 145–157)</h2>
                <p>Los Chamanes, Fanáticos y acólitos que practican la <strong>Canalización</strong> suplican favores a estas trece entidades primordiales:</p>
                {"".join(html_dioses)}
            """),
        ],
    })

    # Diario 04: Construcción de Mazmorras, Salas N1-N3, Trampas y Criaturas
    diarios.append({
        "_id": fid("journal:04-construccion-mazmorra"),
        "name": "04 · Manual: Construcción de la Mazmorra, Salas y Defensas",
        "pages": [
            crear_pagina_texto("04", 1, "El Corazón, los Diablillos y el Nivel de la Mazmorra", f"""
                <p><img src="modules/{MOD}/assets/escenas/mazmorra-1.webp" alt="Ejemplo de Mazmorra" style="width:100%;border-radius:8px;margin-bottom:12px;" /></p>
                <h2>La Guarida de los Malvados (Págs. 173–223)</h2>
                <p>La mazmorra es un personaje compartido por toda la mesa. Su poder se mide por su <strong>Nivel (Tier 1 a 3)</strong>:</p>
                <ul>
                    <li><strong>El Corazón de la Mazmorra:</strong> Es el nexo vital. Si los aventureros llegan hasta él y lo destruyen, la campaña termina o los malvados se ven obligados a huir.</li>
                    <li><strong>Los Diablillos (Imps):</strong> Trabajadores incansables convocados por el Corazón que excavan túneles y muros básicos de forma gratuita entre fases.</li>
                    <li><strong>Salas de Nivel 1 (18 tipos) y Nivel 2 (18 tipos):</strong> Otorgan narrativa y permisos de ficción para entrenar, forjar, destilar o encerrar cautivos (todas incluidas en el compendio <em>MR- Salas N1-N2, Trampas y Criaturas</em>).</li>
                    <li><strong>Salas de Nivel 3 (Temas de Mazmorra):</strong> Cada tema de mazmorra desbloquea salas de Nivel 3 con beneficios mecánicos directos y casillas de uso especial.</li>
                    <li><strong>Defensas (Trampas, Trucos, Portones y Criaturas):</strong> Durante una invasión, el DJ o los jugadores tiran los dados del <strong>Nivel de la Trampa/Portón/Criatura</strong> cuando los aventureros entran en contacto con ellos.</li>
                </ul>
            """),
            crear_pagina_texto("04", 2, "Planos de Mazmorras de Ejemplo del Libro", f"""
                <h2>Ejemplos Oficiales de Diseño de Mazmorras (Págs. 214–219)</h2>
                <p>El módulo incluye como escenas listas para activar los tres planos a doble página del manual:</p>
                <p><img src="modules/{MOD}/assets/escenas/mazmorra-2.webp" alt="Mazmorra 2" style="width:100%;border-radius:8px;margin-bottom:10px;" /></p>
                <p><img src="modules/{MOD}/assets/escenas/mazmorra-3.webp" alt="Mazmorra 3" style="width:100%;border-radius:8px;" /></p>
            """),
        ],
    })

    # Diario 05: Los 4 Entornos Oficiales y sus 48 Facciones
    diarios.append({
        "_id": fid("journal:05-entornos-y-facciones"),
        "name": "05 · Manual: Los 4 Entornos Oficiales y sus 48 Facciones",
        "pages": [
            crear_pagina_texto("05", 1, "1. El Valle Silencioso y 2. Las Cloacas de la Gran Ciudad", f"""
                <h2>1. El Valle Silencioso (Págs. 288–291)</h2>
                <p><img src="modules/{MOD}/assets/escenas/valle-dj.webp" alt="Valle Silencioso" style="width:100%;border-radius:8px;margin-bottom:10px;" /></p>
                <p>El entorno clásico de fantasía pastoral lista para ser corrompida: caravanas mercantes, una abadía fortificada, druidas ancestrales y la amurallada <strong>Ciudad Floresta</strong>.</p>
                <hr/>
                <h2>2. Las Cloacas de la Gran Ciudad (Págs. 280–283)</h2>
                <p><img src="modules/{MOD}/assets/escenas/cloacas-dj.webp" alt="Cloacas de la Gran Ciudad" style="width:100%;border-radius:8px;margin-bottom:10px;" /></p>
                <p>Campaña claustrofóbica bajo una metrópolis superpoblada: gremios de ladrones, inquisidores con lanzallamas, vampiros aristócratas y el alcantarillado profundo.</p>
            """),
            crear_pagina_texto("05", 2, "3. Los Mares Coloniales y 4. La Zona de Guerra", f"""
                <h2>3. Los Mares Coloniales (Págs. 284–287)</h2>
                <p><img src="modules/{MOD}/assets/escenas/mares-dj.webp" alt="Mares Coloniales" style="width:100%;border-radius:8px;margin-bottom:10px;" /></p>
                <p>Archipiélago tropical de galeones del tesoro, fuertes costeros, piratas bucaneros, tribus isleñas y cultos abisales.</p>
                <hr/>
                <h2>4. La Zona de Guerra (Págs. 292–295)</h2>
                <p><img src="modules/{MOD}/assets/escenas/guerra-dj.webp" alt="Zona de Guerra" style="width:100%;border-radius:8px;margin-bottom:10px;" /></p>
                <p>Frente devastado entre el Imperio Solar y la Horda del Cráneo de Hierro, lleno de trincheras, mercenarios, nigromantes e ingenieros de asedio.</p>
            """),
        ],
    })

    # Diario 06: Los 30 Aventureros (con sus 6 Movimientos) y 36 Ayudantes
    filas_adv_html = []
    for (_, nom_es, _, mot_es, _, pos_es, _, neg_es, pasiva, mov_of, mov_def) in AVENTUREROS_30:
        filas_adv_html.append(f"""
            <tr>
                <td><strong>{nom_es}</strong><br/><small>+{pos_es} / −{neg_es}<br/>Motivación: {mot_es}</small></td>
                <td>{pasiva}</td>
                <td>• {mov_of[0]}<br/>• {mov_of[1]}<br/>• {mov_of[2]}</td>
                <td>• {mov_def[0]}<br/>• {mov_def[1]}<br/>• {mov_def[2]}</td>
            </tr>
        """)
    diarios.append({
        "_id": fid("journal:06-aventureros-y-movimientos"),
        "name": "06 · Manual: Los 30 Aventureros (con sus 6 Movimientos) y Ayudantes",
        "pages": [
            crear_pagina_texto("06", 1, "Referencia Completa de los 30 Aventureros (Págs. 320–331)", f"""
                <h2>Los 30 Aventureros y sus Movimientos Ofensivos y Defensivos</h2>
                <p>Cuando un aventurero actúa o gasta una casilla de <strong>Movimiento</strong> en la hoja de grupo, usa uno de sus movimientos característicos:</p>
                <table border="1" style="width:100%;border-collapse:collapse;font-size:0.9em;">
                    <thead>
                        <tr>
                            <th>Clase y Rasgos</th>
                            <th>Pasiva</th>
                            <th>3 Movimientos Ofensivos</th>
                            <th>3 Movimientos Defensivos</th>
                        </tr>
                    </thead>
                    <tbody>
                        {"".join(filas_adv_html)}
                    </tbody>
                </table>
            """),
        ],
    })

    # Diario 07: Monstruos Primigenios
    diarios.append({
        "_id": fid("journal:07-monstruos-primigenios"),
        "name": "07 · Expansión: Monstruos Primigenios (Devoramentes, Buscafatums, Robarrostros, Acaparador)",
        "pages": [
            crear_pagina_texto("07", 1, "Jugar como un Monstruo Primigenio (Págs. 336–347)", """
                <h2>Monstruos Primigenios</h2>
                <p>En lugar de elegir una raza monstruosa y una vocación normal, un jugador puede encarnar a uno de los cuatro <strong>Monstruos Primigenios</strong>:</p>
                <ul>
                    <li><strong>Devoramentes (Braineater):</strong> Señor psiónico con tentáculos faciales que no usa la acción <em>Invocar</em> normal, sino sus propias <strong>Disciplinas Psiónicas</strong> (Telepatía, Telequinesis, Piroquinesis, Proyección Astral y Dominación) y se alimenta de cerebros.</li>
                    <li><strong>Buscafatums (Doomseeker):</strong> Aberración esférica flotante con un gran ojo central antimagia y <strong>9 Rayos Oculares</strong> personalizables (Hechizar, Muerte, Miedo, Nulidad, Parálisis, Telequinesis, Tiempo, Transmutación y Visión).</li>
                    <li><strong>Robarrostros (Facestealer):</strong> Cambiaformas infiltrado capaz de coleccionar hasta varias <strong>Caras</strong> con sus recuerdos y talentos robados a víctimas de la superficie.</li>
                    <li><strong>Acaparador de Oro (Goldmonger / Dragón):</strong> Sierpe dracónica obsesionada con hacer crecer su tesoro y su propio tamaño a través de tres <strong>Sendas de Crecimiento</strong> (Guarida, Aliento Elemental y Escamas/Cuerpo) y la tirada especial de <strong>Letargo (Slumber)</strong>.</li>
                </ul>
            """),
        ],
    })

    # Diario 08: Los Errantes y Los Valientes
    diarios.append({
        "_id": fid("journal:08-errantes-y-valientes"),
        "name": "08 · Expansión: «Los Errantes» y «Los Valientes» (Modos Alternativos)",
        "pages": [
            crear_pagina_texto("08", 1, "Los Errantes (Sin Mazmorra) y Los Valientes (Héroes FitD)", """
                <h2>Los Errantes (Wandering Ones, Págs. 354–357)</h2>
                <p>En este modo alternativo, los personajes no tienen una mazmorra fija ni fase de guarida: son una banda de monstruos nómadas o mercenarios que viajan de región en región realizando incursiones, acampando al raso y huyendo de la justicia de la Luz.</p>
                <hr/>
                <h2>Los Valientes (Valiant Ones, Págs. 358–361)</h2>
                <p>Invierte por completo la premisa del juego: los jugadores interpretan a los <strong>héroes de la Luz</strong> (usando las vocaciones recontextualizadas: el Bruto es el Campeón, el Chamán es el Clérigo, la Sombra es el Pícaro, el Hechicero es el Mago...) que defienden un asentamiento fronterizo y realizan expediciones contra las guaridas del mal.</p>
            """),
        ],
    })

    # Diario 09: Modo Solitario («El Gran Malo Malvado») y Generador de Mazmorras
    diarios.append({
        "_id": fid("journal:09-solitario-y-generador"),
        "name": "09 · Expansión: Modo Solitario («El Gran Malo Malvado») y Generador de Mazmorras",
        "pages": [
            crear_pagina_texto("09", 1, "El Gran Malo Malvado (Big Bad Wicked One, Págs. 362–373)", """
                <h2>Jugar en Solitario: El Gran Malo Malvado</h2>
                <p>En el modo solitario encarnas al único señor supremo de la mazmorra rodeado de lugartenientes (manadas de esbirros con personalidad propia):</p>
                <ul>
                    <li><strong>Tus Lugartenientes:</strong> Comienzas con dos o tres manadas de esbirros que actúan como tus capitanes. Puedes enviarlos a realizar incursiones usando el <strong>Simulador de Incursión de Esbirros</strong> del Generador MR o liderar tú mismo los asaltos clave.</li>
                    <li><strong>Oráculos de Dos Semillas:</strong> Cuando tengas una pregunta abierta, pulsa el botón <strong>Oráculo de Semillas</strong> en el Asistente MR para combinar la <em>Primera Semilla</em> y la <em>Segunda Semilla</em>.</li>
                    <li><strong>Generador de Mazmorras:</strong> Si necesitas explorar una mazmorra rival (o jugar como <em>Los Valientes</em>), usa la tabla 15 o el botón del Asistente MR para generar salas, trampas, trucos y criaturas al vuelo.</li>
                </ul>
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
            {"id": "R3", "label": "R3 · Saquear los grimorios de la Abadía de Piedra Blanca", "done": False},
            {"id": "R4", "label": "R4 · Cazar al Gran Hombre Lobo del Bosque Susurrante", "done": False},
            {"id": "R5", "label": "R5 · Aniquilar a la Expedición Invasora en la Mazmorra", "done": False},
            {"id": "R6", "label": "R6 · Completar el Eclipse y asaltar Ciudad Floresta", "done": False},
        ],
        "clocks": [
            {"id": "alarma_gremio", "name": "Alarma en las Colinas de Piedra Blanca", "value": 0, "max": 4},
            {"id": "sospecha_abadia", "name": "Sospecha de la Abadía de Piedra Blanca", "value": 0, "max": 6},
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
    for (clave, nom_es, _, mot_es, _, pos_es, _, neg_es, pasiva, mov_of, mov_def) in AVENTUREROS_30:
        # Nombre en inglés en el compendio original
        mapa_en = {
            "academic": "Academic", "alchemist": "Alchemist", "amazon": "Amazon", "aristocrat": "Aristocrat",
            "assassin": "Assassin", "barbarian": "Barbarian", "bard": "Bard", "buccaneer": "Buccaneer",
            "centurion": "Centurion", "chaosmage": "Chaos Mage", "cleric": "Cleric", "deathknight": "Death Knight",
            "defender": "Defender", "druid": "Druid", "eldritchwarrior": "Eldritch Warrior", "illusionist": "Illusionist",
            "inquisitor": "Inquisitor", "knight": "Knight", "lancer": "Lancer", "magehunter": "Mage Hunter",
            "monk": "Monk", "occultslayer": "Occult Slayer", "ranger": "Ranger", "scout": "Scout",
            "shadowdancer": "Shadowdancer", "slinger": "Slinger", "spellbow": "Spellbow", "templar": "Templar",
            "weaponsmith": "Weaponsmith", "wildling": "Wildling",
        }
        nom_en = mapa_en[clave]
        entries_adv[nom_en] = {
            "id": nom_es,
            "name": nom_es,
            "adventurer_class_custom": nom_es,
            "trait_pos_1_custom": pos_es,
            "trait_neg_1_custom": neg_es,
            "motivation_1_custom": mot_es,
            "passive": f"{pasiva} (Ofensivos: {', '.join(mov_of)} · Defensivos: {', '.join(mov_def)})",
            "description": (
                f"Pasiva: {pasiva}\n"
                f"Movimientos ofensivos: {', '.join(mov_of)}\n"
                f"Movimientos defensivos: {', '.join(mov_def)}"
            ),
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
