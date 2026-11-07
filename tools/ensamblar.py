#!/usr/bin/env python3
"""Ensambla el contenido final de MR- Wicked Ones v2: lee _data/*.json (salida de build_foundry.py, sin tocarla) y escribe
_pack/<pack>.json (+ carpetas.json) con
  · carpetas por categoría dentro de cada compendio y en la aventura (actores, objetos, escenas, diarios, tablas, listas de reproducción),
  · arte nuevo por orden de categoría (assets/ generado con Draw Things; si falta una imagen se conserva la del sistema),
  · diez compendios en lugar de siete (personajes, esbirros y grupos salen del cajón de «facciones»),
  · escenas con su LECTURA (diario «Lecturas de escena» + notas de mapa), música y efectos (listas de reproducción),
  · el paquete de MR- Dirección (content/direccion-es.json, esquema 1) con figuras, motivos, hitos y relojes.
Uso: python3 tools/ensamblar.py"""
import hashlib, json, os, re, sys, unicodedata
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
VERSION = json.load(open(Path(__file__).resolve().parent.parent / "module.json"))["version"]
MOD = "mr-wicked-ones-es"
D, OUT, A = BASE / "_data", BASE / "_pack", BASE / "assets"
sys.path.insert(0, os.environ.get("MR_ARTE", str(BASE / "tools" / "arte")))
sys.path.insert(0, os.environ.get("MR_MARCA", "/Volumes/Datos_Dock/FoundryVTT/Trabajo LOGO/marca"))
import manifest1 as M1, manifest2 as M2  # noqa: E402  (las claves siguen el orden de los datos)
import marca  # noqa: E402

B62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"


def fid(clave):
    n = int.from_bytes(hashlib.sha256(f"mrwo2:{clave}".encode()).digest()[:12], "big")
    r = []
    for _ in range(16):
        n, m = divmod(n, 62); r.append(B62[m])
    return "".join(r)


def slug(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def cargar(n):
    return json.loads((D / f"{n}.json").read_text(encoding="utf-8"))


def ruta(rel):
    return f"modules/{MOD}/{rel}"


def imagen(rel, defecto):
    """Ruta del arte nuevo si existe; si no, la anterior (nunca una ruta rota del módulo: se cae a una imagen del núcleo)."""
    if (BASE / rel).exists():
        return ruta(rel)
    if defecto and defecto.startswith(f"modules/{MOD}/") and not (BASE / defecto.split(f"modules/{MOD}/", 1)[1]).exists():
        return "icons/svg/mystery-man.svg"
    return defecto


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


# ------------------------------------------------------------------ carpetas
class Carpetas:
    def __init__(self, tipo):
        self.tipo, self.lista, self.n = tipo, [], 0

    def nueva(self, clave, nombre, padre=None, color=None):
        self.n += 1
        f = {"_id": fid(f"folder:{self.tipo}:{clave}"), "name": nombre, "type": self.tipo, "folder": padre["_id"] if padre else None,
             "sorting": "a", "sort": self.n * 100, "color": color, "description": "", "flags": {}}
        self.lista.append(f)
        return f


COL = {"campana": "#a83228", "heroes": "#4d6a8c", "monstruos": "#5f7f3a", "mundo": "#8a6d3b", "luz": "#c9b458", "oscuridad": "#6a3a7b", "neutral": "#6b6b6b"}

# ------------------------------------------------------------------ objetos
def duty_grupo(nombre):
    m = re.match(r"(Sala|Trampa|Truco|Port[oó]n|Criatura|Hallazgo)\s*(N\d)?", nombre)
    return (m.group(1).replace("ó", "o"), m.group(2) or "") if m else ("Otro", "")


def procesar_labores(docs, fol):
    claves = {"Sala": {"N1": [k for k in M2.SALAS if k.startswith("n1")], "N2": [k for k in M2.SALAS if k.startswith("n2")]},
              "Trampa": {"N1": [k for k in M2.TRAMPAS if k.startswith("n1")], "N2": [k for k in M2.TRAMPAS if k.startswith("n2")]},
              "Truco": {"": list(M2.TRUCOS)}, "Porton": {"N1": [k for k in M2.PORTONES if k.startswith("n1")], "N2": [k for k in M2.PORTONES if k.startswith("n2")]},
              "Criatura": {n: [k for k in M1.CRIATURAS if k.startswith(n.lower())] for n in ("N1", "N2", "N3")},
              "Hallazgo": {"": list(M2.HALLAZGOS)}}
    prefijo = {"Sala": "sala", "Trampa": "trampa", "Truco": "truco", "Porton": "porton", "Hallazgo": "hallazgo"}
    nombres = {"Sala": "Salas de la mazmorra", "Trampa": "Trampas", "Truco": "Trucos de la mazmorra", "Porton": "Portones y cerraduras",
               "Criatura": "Criaturas de guarida", "Hallazgo": "Hallazgos de excavación"}
    raiz, hijos, cont = {}, {}, {}
    for g, nm in nombres.items():
        raiz[g] = fol.nueva(f"duty:{g}", nm, color=COL["mundo"])
        for n in claves[g]:
            if n:
                hijos[(g, n)] = fol.nueva(f"duty:{g}:{n}", f"Nivel {n[1]}", raiz[g], COL["mundo"])
    for d in docs:
        g, n = duty_grupo(d["name"])
        if g not in nombres:
            continue
        i = cont.get((g, n), 0); cont[(g, n)] = i + 1
        lista = claves[g].get(n, [])
        k = lista[i] if i < len(lista) else None
        d["folder"] = (hijos.get((g, n)) or raiz[g])["_id"]
        if k:
            if g == "Criatura":
                d["img"] = imagen(f"assets/retratos/cri-{k}.webp", d["img"])
            else:
                d["img"] = imagen(f"assets/iconos/{prefijo[g]}-{k}.webp", d["img"])
    return docs


def procesar_equipo(docs, fol):
    grupos = [("Arsenal y herramientas", "eq"), ("Mejunjes alquímicos (d66)", "mejunje"), ("Artilugios goblinoides (d66)", "artilugio"),
              ("Pociones mágicas (d66)", "pocion"), ("Reliquias y objetos mágicos (d66)", "magico"), ("Rituales y proyectos", "proyecto")]
    f = {g[1]: fol.nueva(f"gear:{g[1]}", g[0], color=COL["mundo"]) for g in grupos}
    cont = {g[1]: 0 for g in grupos}
    for d in docs:
        n = d["name"]
        g = "mejunje" if n.startswith("Mejunje") else "artilugio" if n.startswith("Artilugio") else "pocion" if n.startswith("Poci") else \
            "magico" if n.startswith("Objeto M") else "proyecto" if d["type"] == "project" or n.startswith(("Ritual", "Proyecto")) else "eq"
        i = cont[g]; cont[g] += 1
        d["folder"] = f[g]["_id"]
        # «Artilugio [11] · Alas planeadoras» → nombre limpio; la categoría y el nº de tabla pasan a las banderas
        m = re.match(r"^([^\[·]+?)\s*\[(\d+)\]\s*·\s*(.+)$", n)
        fl = d.setdefault("flags", {}).setdefault("mr-wicked-ones-es", {})
        fl["categoria"] = {"magico": "reliquia", "eq": "gear", "proyecto": "proyecto"}.get(g, g)
        if m:
            d["name"] = m.group(3).strip(); fl["tabla"] = m.group(2)
        if g == "eq":
            k = list(M2.BASICAS)[i] if i < len(M2.BASICAS) else None
            if k:
                d["img"] = imagen(f"assets/iconos/eq-{k}.webp", d["img"])
        elif g != "proyecto":
            d["img"] = imagen(f"assets/iconos/{g}-{i + 1:02d}.webp", d["img"])
    return docs


def procesar_aventureros(docs, fol):
    h = fol.nueva("adv:heroes", "Aventureros (rivales)", color=COL["heroes"])
    a = fol.nueva("adv:ayudantes", "Ayudantes y mercenarios", color=COL["neutral"])
    for d in docs:
        s = d["system"]
        if s.get("adventurer_type") == "hireling":
            k = slug(d["name"].split("·")[-1])
            d["folder"] = a["_id"]
            d["img"] = imagen(f"assets/retratos/ayu-{k}.webp", d["img"])
        else:
            k = slug(d["name"])
            d["folder"] = h["_id"]
            d["img"] = imagen(f"assets/retratos/adv-{k}.webp", d["img"])
            d.setdefault("flags", {}).setdefault(MOD, {})["figura"] = imagen(f"assets/figuras/adv-{k}.webp", None)
    return docs


# ------------------------------------------------------------------ actores
ENTORNOS = [("Valle Silencioso", "valle"), ("Cloacas de la Gran Ciudad", "cloaca"), ("Mares Coloniales", "mares"), ("Zona de Guerra", "guerra")]


def procesar_actores(docs, fol_a):
    """Devuelve dict de listas por pack: personajes, esbirros, facciones, grupos."""
    f_pj = fol_a.nueva("act:pj", "Personajes pregenerados", color=COL["monstruos"])
    f_esb = fol_a.nueva("act:esb", "Manadas de esbirros", color=COL["monstruos"])
    f_riv = fol_a.nueva("act:rivales", "Aventureros rivales", color=COL["heroes"])
    f_maz = fol_a.nueva("act:mazmorra", "Mazmorra", color=COL["campana"])
    f_dj = fol_a.nueva("act:dj", "Panel del DJ", color=COL["campana"])
    f_fac = fol_a.nueva("act:facciones", "Facciones por entorno", color=COL["mundo"])
    f_ent = {e: fol_a.nueva(f"act:fac:{k}", e, f_fac, COL["mundo"]) for e, k in ENTORNOS}
    esb_k, cont_f, fac_k = list(M1.ESBIRROS), {}, list(M2.FACCIONES)
    out = {"personajes": [], "esbirros": [], "facciones": [], "grupos": []}
    iesb = 0
    for d in docs:
        t = d["type"]
        fl = d.setdefault("flags", {}).setdefault(MOD, {})
        if t == "character":
            k = slug(d["name"].split("(")[0])
            d["folder"] = f_pj["_id"]
            d["img"] = imagen(f"assets/retratos/pj-{k}.webp", d["img"])
            d["prototypeToken"]["texture"]["src"] = imagen(f"assets/tokens/pj-{k}.webp", d["prototypeToken"]["texture"]["src"])
            fl.update({"tipo": "pj", "slug": f"pj-{k}", "figura": imagen(f"assets/figuras/pj-{k}.webp", None)})
            out["personajes"].append(d)
        elif t == "minion_pack":
            k = esb_k[iesb]; iesb += 1
            d["folder"] = f_esb["_id"]
            d["img"] = imagen(f"assets/retratos/esb-{k}.webp", d["img"])
            d["prototypeToken"]["texture"]["src"] = imagen(f"assets/tokens/esb-{k}.webp", d["prototypeToken"]["texture"]["src"])
            fl.update({"slug": f"esb-{k}", "figura": imagen(f"assets/figuras/esb-{k}.webp", None)})
            out["esbirros"].append(d)
        elif t == "faction":
            ent = fl.get("entorno", "")
            i = cont_f.get(ent, 0); cont_f[ent] = i + 1
            nombres = [e for e, _ in ENTORNOS]
            idx = nombres.index(ent) * 12 + i if ent in nombres else None
            d["folder"] = f_ent.get(ent, f_fac)["_id"]
            if idx is not None and idx < len(fac_k):
                ico = imagen(f"assets/iconos/fac-{fac_k[idx]}.webp", None)
                if ico:
                    d["img"] = ico
                    d["prototypeToken"]["texture"]["src"] = ico
            out["facciones"].append(d)
        else:
            d["folder"] = {"party": f_riv, "dungeon": f_maz, "gm_sheet": f_dj}.get(t, f_dj)["_id"]
            if t == "party":
                base = {"Invasión N1": "defensor", "Invasión N2": "explorador", "Invasión N3": "inquisidor"}
                k = next((v for kk, v in base.items() if kk in d["name"]), "centurion")
                d["img"] = imagen(f"assets/retratos/adv-{k}.webp", d["img"])
                d["prototypeToken"]["texture"]["src"] = imagen(f"assets/tokens/adv-{k}.webp", d["prototypeToken"]["texture"]["src"])
            if t == "dungeon":
                d["img"] = imagen("assets/escenas/mapa-guarida-1.webp", d["img"])
            out["grupos"].append(d)
    return out


# ------------------------------------------------------------------ escenas, lecturas y música
# (clave, nombre, imagen, tipo, carpeta, música, lectura)
ESCENAS = [
 ("portada", "00 · Portada: El Valle Silencioso", "esc-portada", "imagen", "campana", "acecho",
  "Bajo vuestros pies, la montaña respira. Allá abajo, en el Valle Silencioso, las chimeneas de Ciudad Floresta humean y nadie sospecha que los monstruos más viejos de las Colinas de Piedra Blanca han decidido, por fin, tener un hogar. Un lugar que llamar vuestro. Un lugar al que ellos no van a poder llegar jamás."),
 ("valle", "01 · Entorno I: El Valle Silencioso", "mapa-valle", "mapa", "mundo", "valle",
  "Un valle verde y callado, partido por un río lento: la ciudad amurallada de las flores, la abadía de piedra blanca sobre las colinas, el bosque oscuro, los picos de cobre y, entre dos montañas, un paso donde pasan las caravanas. Aquí hay mucho que robar y mucho que temer."),
 ("cueva-mercaderes", "02 · Hito R1: Un lugar al que llamar hogar", "esc-cueva-mercaderes", "imagen", "campana", "incursion",
  "La caravana ha cometido el error de acampar junto a la boca de la cueva. El carromato vuelca con un crujido, las cajas se abren y el aroma del grano, la sal y el aceite llena el aire frío de la noche. Las antorchas de los guardias tiemblan. Es vuestro momento: reclamad las cuevas del Paso del Mercader."),
 ("cueva-mercader-plano", "02b · Plano táctico: Cuevas del Paso del Mercader", "mapa-cueva-mercader", "tactico", "tactico", "cueva",
  "Una caverna natural, húmeda y estrecha: la boca con los carromatos, la galería donde dormitan los guardias, un depósito de piedra, un arroyo helado y, al fondo, las ruinas de un viejo santuario donde brilla algo con forma de corazón."),
 ("guarida-1", "03 · Hito R2: Nuestra Guarida (nivel 1)", "mapa-guarida-1", "tactico", "tactico", "acecho",
  "Aún huele a piedra recién rota y a polvo. Unos pocos túneles, una cámara central y, sobre un pedestal, el Corazón de la Mazmorra palpitando con una luz roja que os reconoce. Todo lo demás está por excavar. Todo."),
 ("guarida-2", "03b · La Guarida (nivel 2)", "mapa-guarida-2", "tactico", "tactico", "taller",
  "La guarida ya tiene salas, olor a forja y un cuartel donde los esbirros se pelean por la paja. Las trampas escupen óxido y los pasillos empiezan a parecer un laberinto de verdad."),
 ("guarida-3", "03c · La Guarida (nivel 3)", "mapa-guarida-3", "tactico", "tactico", "invasion",
  "Una fortaleza bajo la montaña: salón del trono, círculo ritual, foso de arena y pasillos que se retuercen sobre sí mismos. Los héroes que lleguen hasta aquí no volverán a contar nada."),
 ("biblioteca-abadia", "04 · Hito R3: Una biblioteca necesita libros", "esc-biblioteca-abadia", "imagen", "campana", "abadia",
  "Estanterías hasta el techo, velas que no deberían estar encendidas y un monje que duerme sobre un atril. Cada tomo prohibido de la Abadía de Piedra Blanca es una página arrancada de vuestro futuro. Silencio: ahora, a robar."),
 ("ritual-luna-llena", "05 · Hito R4: Piel de lobo para un ritual", "esc-ritual-luna-llena", "imagen", "campana", "ritual",
  "La luna llena cuelga como un ojo enorme sobre el claro. En el altar de piedra, la piel del Gran Hombre Lobo aún humea. Las llamas se vuelven verdes. El chamán canta. El demonio sonríe. Algo, muy abajo, contesta."),
 ("defensa-mazmorra", "06 · Hito R5: ¡Matad a los intrusos!", "esc-defensa-mazmorra", "imagen", "campana", "invasion",
  "Pasos de metal en el túnel. Voces de hombres que creen que hacen el bien. La guarida entera contiene la respiración: la barricada, las estacas, los esbirros en las sombras. Que entren. Que entren todos."),
 ("consejo-guerra", "07 · El Plan Maestro: preparando la horda", "esc-consejo-guerra", "imagen", "campana", "consejo",
  "Alrededor de la mesa de piedra, una docena de ojos feroces miran el mapa del Valle. El dedo de garra avanza sobre Ciudad Floresta. Habla el más viejo: «Cuando la última luna se apague, abriremos las puertas»."),
 ("batalla-santuario", "08 · Hito R6: La última luna llena", "esc-batalla-santuario", "imagen", "campana", "climax",
  "El santuario se alza sobre la colina, blanco y orgulloso. Las banderas de la Luz ondean sobre las escaleras y vuestra horda sube, rugiendo, por entre las llamas. Hoy el Valle Silencioso aprende vuestro nombre."),
 ("cloacas", "09 · Entorno II: Cloacas de la Gran Ciudad", "mapa-cloacas", "mapa", "mundo", "cloacas",
  "Una gran ciudad sobre otra ciudad: tejados, canales, catedral y puerto arriba; túneles, esclusas y ratas del tamaño de perros abajo. Quien domine las cloacas domina a quien cree gobernarlas."),
 ("mares", "10 · Entorno III: Mares Coloniales", "mapa-mares", "mapa", "mundo", "mares",
  "Un archipiélago de sal y pólvora: fuertes, ensenadas piratas, arrecifes de coral, galeones y, en el centro, un remolino que no sale en ninguna carta de navegación."),
 ("guerra", "11 · Entorno IV: Zona de Guerra", "mapa-guerra", "mapa", "mundo", "guerra",
  "Trincheras, campamentos de asedio y aldeas quemadas a lo largo de un río con un fuerte. Aquí la guerra se alimenta sola, y siempre hay sitio para un nuevo señor de la matanza."),
 ("sala-del-trono", "12 · Escena: la sala del trono", "esc-sala-del-trono", "imagen", "fases", "consejo",
  "Un trono de calaveras, braseros que lanzan sombras largas y goblins que no se atreven a levantar la vista. La sala del trono es el corazón político de la guarida."),
 ("excavacion", "13 · Escena: excavando la guarida", "esc-excavacion", "imagen", "fases", "excavacion",
  "Picos que golpean la roca, carretillas de escombro, faroles temblorosos. En el filo de una pared, una veta de oro brilla como una promesa. Cada golpe os acerca a la próxima sala."),
 ("taller-alquimia", "14 · Escena: el taller de alquimia", "esc-taller-alquimia", "imagen", "fases", "taller",
  "Matraces que hierven, engranajes que giran solos y un olor que no se sabe si es de azufre o de ideas peligrosas. Aquí se destilan los mejunjes y se arman los artilugios."),
 ("cripta-hallazgo", "15 · Escena: una cripta olvidada", "esc-cripta-hallazgo", "imagen", "fases", "cripta",
  "El muro cede y, tras él, una cripta que nadie ha pisado en siglos: sarcófagos, runas que brillan al despertar y telarañas tan viejas como los reinos que las vieron nacer."),
 ("banquete", "16 · Escena: el gran banquete", "esc-banquete", "imagen", "fases", "banquete",
  "Mesas largas, carne asada, jarras que chocan y una pelea que ya ha empezado en el otro extremo. Un monstruo que come bien es un monstruo leal. Durante un rato."),
 ("incursion-aventureros", "17 · Escena: aventureros en el pasillo", "esc-incursion-aventureros", "imagen", "fases", "incursion",
  "Un caballero, una maga y una arquera avanzan por vuestro pasillo con la antorcha en alto. Creen que el suelo es suelo. Creen que las paredes son paredes. Están a punto de aprender que no."),
]


def escena_doc(i, e, dims, lect_id):
    clave, nombre, img, tipo, car, musica, lectura = e
    w, h = dims.get(img, (1920, 1080))
    es_tactico = tipo == "tactico"
    tam = round(w / 30) if es_tactico else 100
    x, y, ancho, alto = marca.caja_animada(w, h)
    return {
        "_id": fid(f"scene:{clave}"), "name": nombre, "active": clave == "portada", "navigation": True, "navOrder": i + 1,
        "background": {"src": ruta(f"assets/escenas/{img}.webp")}, "thumb": ruta(f"assets/thumbs/{img}.webp"),
        "width": w, "height": h, "padding": 0, "backgroundColor": "#0b0809",
        "grid": {"type": 1 if es_tactico else 0, "size": tam, "alpha": 0.18 if es_tactico else 0, "distance": 1.5, "units": "m", "color": "#000000", "style": "solidLines", "thickness": 1},
        "tokenVision": False, "fog": {"exploration": False},
        "tokens": [], "walls": [], "lights": [], "sounds": [], "drawings": [], "templates": [], "regions": [],
        "tiles": [{"_id": fid(f"tile:firma:{clave}"), "texture": {"src": ruta("assets/brand/mr-marca.webm"), "scaleX": 1, "scaleY": 1, "tint": "#ffffff", "fit": "fill"},
                   "x": x, "y": y, "width": ancho, "height": alto, "elevation": 0, "sort": 0, "rotation": 0, "alpha": 1, "hidden": False, "locked": True,
                   "restrictions": {"light": False, "weather": False}, "occlusion": {"mode": 0, "alpha": 0}, "video": {"loop": True, "autoplay": True, "volume": 0}, "flags": {}}],
        "notes": [{"_id": fid(f"note:{clave}"), "entryId": lect_id, "pageId": fid(f"lect:{clave}"), "x": round(w * 0.04), "y": round(h * 0.07), "elevation": 0, "sort": 0,
                   "texture": {"src": "icons/svg/book.svg", "tint": "#e6b865"}, "iconSize": 48, "text": "Lectura", "fontFamily": "Signika", "fontSize": 32, "textAnchor": 1,
                   "textColor": "#ffffff", "global": False, "flags": {}}],
        "sort": (i + 1) * 100, "ownership": {"default": 0},
        "flags": {MOD: {"clave": clave, "slug": clave, "imagen": tipo == "imagen", "musica": musica}},
    }


def diario_lecturas():
    pages = []
    for i, e in enumerate(ESCENAS):
        clave, nombre, *_r, lectura = e
        pages.append({"_id": fid(f"lect:{clave}"), "name": nombre, "type": "text", "title": {"show": True, "level": 1}, "sort": (i + 1) * 100,
                      "text": {"format": 1, "content": f"<blockquote><p>{esc(lectura)}</p></blockquote><p><em>Texto para leer en voz alta.</em></p>"},
                      "ownership": {"default": -1}, "flags": {}})
    return {"_id": fid("journal:lecturas"), "name": "Lecturas de escena (para leer en voz alta)", "pages": pages, "ownership": {"default": 0}, "flags": {MOD: {"clave": "lecturas"}}}


EMPIEZA_AQUI = """
<h2>Bienvenido, Señor Oscuro</h2>
<p><strong>Wicked Ones</strong> es un juego de monstruos que excavan una guarida bajo la montaña mientras los «héroes» de la superficie los persiguen. Este módulo trae todo lo que necesitas, ordenado en carpetas.</p>
<h3>Dónde está cada cosa</h3>
<ul>
<li><strong>Escenas</strong>: la portada, los cuatro entornos con su mapa, los planos tácticos de la guarida y las escenas ilustradas. Todas tienen su <em>lectura</em> (el icono del libro en el mapa) y su música.</li>
<li><strong>Actores</strong>: personajes pregenerados, manadas de esbirros, aventureros rivales y las 48 facciones, por entorno.</li>
<li><strong>Objetos</strong>: aventureros y ayudantes, salas, trampas, criaturas, mejunjes, artilugios, pociones y objetos mágicos.</li>
<li><strong>Diarios</strong>: el libro de reglas por capítulos. <strong>Tablas</strong>: botín, incursiones, calamidades y el modo solitario.</li>
<li><strong>Compendios</strong>: «Wicked Ones · Sistema base» (lo que trae el sistema) y «MR · Wicked Ones» (lo que añade este módulo).</li>
</ul>
<h3>Para empezar</h3>
<ol>
<li>Reparte los personajes pregenerados o crea los vuestros desde el compendio del sistema.</li>
<li>Activa la escena <strong>00 · Portada</strong> y lee su texto en voz alta.</li>
<li>Empieza por la <strong>Fase de Incursión</strong>: escena «02 · Un lugar al que llamar hogar».</li>
<li>Usa el <strong>Generador del Señor Oscuro</strong> (icono de la mazmorra en los controles de escena) cuando necesites un golpe de inspiración.</li>
</ol>
<p>¿Quieres que te lo enseñe paso a paso? Configuración → <em>MR- Wicked Ones</em> → Tutorial guiado.</p>
"""

MUSICA = {"acecho": "Acecho en la guarida", "valle": "El Valle Silencioso", "incursion": "Incursión nocturna", "cueva": "Cuevas del Paso del Mercader",
          "taller": "Forja y alquimia", "abadia": "La abadía en silencio", "ritual": "Artes oscuras y ritual", "invasion": "¡Invasión de héroes!",
          "consejo": "Consejo de guerra", "climax": "La última luna llena", "cloacas": "Cloacas de la gran ciudad", "mares": "Mares coloniales",
          "guerra": "Zona de guerra", "excavacion": "Picos en la roca", "cripta": "Cripta olvidada", "banquete": "Banquete de monstruos"}
SFX = {"puerta": "Portón que cede", "trampa": "Trampa que salta", "gong": "Gong de guerra", "rugido": "Rugido lejano", "antorcha": "Antorchas y viento",
       "derrumbe": "Derrumbe de roca", "reloj": "Reloj que avanza"}


def playlists(fol):
    f_mus = fol.nueva("pl:mus", "Música", color=COL["campana"])
    f_sfx = fol.nueva("pl:sfx", "Efectos", color=COL["neutral"])
    pl = []

    def lista(clave, nombre, carpeta_audio, dic, repetir, f):
        sonidos = []
        for k, lab in dic.items():
            if (BASE / f"assets/audio/{carpeta_audio}/{k}.ogg").exists():
                sonidos.append({"_id": fid(f"snd:{k}"), "name": lab, "description": "", "path": ruta(f"assets/audio/{carpeta_audio}/{k}.ogg"), "playing": False,
                                "pausedTime": None, "repeat": repetir, "volume": 0.7, "fade": None, "sort": len(sonidos) * 100, "flags": {MOD: {"slug": k}}})
        pl.append({"_id": fid(f"playlist:{clave}"), "name": nombre, "description": "", "mode": -1 if repetir else 0, "playing": False, "fade": None, "folder": f["_id"],
                   "sorting": "a", "seed": None, "sort": 100, "sounds": sonidos, "flags": {MOD: {"clave": clave}}})
    lista("musica", "MR · Música de la campaña", "musica", MUSICA, True, f_mus)
    lista("sfx", "MR · Efectos", "sfx", SFX, False, f_sfx)
    return [p for p in pl if p["sounds"]]


# ------------------------------------------------------------------ paquete de MR- Dirección
def direccion():
    mot = [("acecho", "Acecho en la guarida", "hammer"), ("incursion", "Incursión nocturna", "skull"), ("ritual", "Artes oscuras y ritual", "eye"), ("invasion", "¡Invasión de héroes!", "shield-halved")]
    efectos = [("puerta", "Portón", "door-closed"), ("trampa", "Trampa", "bomb"), ("gong", "Gong de guerra", "bell"), ("rugido", "Rugido", "dragon"), ("derrumbe", "Derrumbe", "mountain")]
    ref = lambda k: {"flag": [MOD, "slug", k]}
    escenas = []
    for i, (clave, nombre, img, tipo, car, musica, _l) in enumerate(ESCENAS):
        figs = []
        if clave in ("portada", "cueva-mercaderes", "consejo-guerra", "batalla-santuario", "defensa-mazmorra", "ritual-luna-llena"):
            figs = [{"ref": ref(f"pj-{k}"), "label": ""} for k in ("ulrot", "crag", "slem", "viska", "kaelen")]
        if clave == "incursion-aventureros":
            figs = [{"ref": ref(f"adv-{k}"), "label": ""} for k in ("caballero", "mago-del-caos", "arquero-arcano")]
        escenas.append({
            "ref": ref(clave), "order": i, "name": nombre.split("· ", 1)[-1], "reading": {"uuid": f"JournalEntry.{fid('journal:lecturas')}.JournalEntryPage.{fid(f'lect:{clave}')}"},
            "music": ref(musica) if musica in MUSICA else None, "motifs": None,
            "cues": [{"label": l, "icon": ic, "sound": ref(k)} for k, l, ic in efectos[:3]] if tipo == "imagen" else [],
            "ambient": None, "figures": figs, "handouts": [], "notes": "", "thumb": ruta(f"assets/thumbs/{img}.webp"),
            "stage": {"mode": "none"} if tipo != "imagen" else {"eye": 0.5, "anchors": [[0.3, 0.88], [0.5, 0.9], [0.7, 0.88]]},
        })
    hitos = ["R1 · Reclamar las Cuevas del Paso del Mercader", "R2 · Despertar el Corazón y excavar la Guarida", "R3 · Saquear los grimorios de la Abadía de Piedra Blanca",
             "R4 · Cazar al Gran Hombre Lobo del Bosque Susurrante", "R5 · Aniquilar a la Expedición Invasora en la Mazmorra", "R6 · Completar el Eclipse y asaltar Ciudad Floresta"]
    return {
        "schema": 1, "id": MOD, "title": "Wicked Ones · El Valle Silencioso", "version": "2.0.0", "author": "Manu Romera", "license": "MIT", "settings": {
            "fade": 3.5,
            "motifs": [{"id": k, "label": l, "icon": ic, "music": ref(k)} for k, l, ic in mot],
            "effects": [{"id": k, "label": l, "icon": ic, "sound": ref(k)} for k, l, ic in efectos],
            "markers": {
                "milestones": [{"id": f"r{n}", "label": t, "public": True} for n, t in enumerate(hitos, 1)],
                "clocks": [
                    {"id": "alarma", "label": "Alarma en las Colinas de Piedra Blanca", "segments": 4, "public": False, "announce": True,
                     "phrases": ["Alguien ha visto humo.", "Llegan rumores a Ciudad Floresta.", "El gremio manda exploradores.", "La Expedición se pone en marcha."]},
                    {"id": "abadia", "label": "Sospecha de la Abadía", "segments": 6, "public": False, "announce": False,
                     "phrases": ["Un monje echa de menos un libro.", "Se refuerzan las cerraduras.", "El abad convoca un cónclave.", "Cazadores de brujas recorren el camino.", "La abadía pide ayuda a la ciudad.", "Cruzada contra las colinas."]},
                    {"id": "cruzada", "label": "Cruzada de Ciudad Floresta", "segments": 8, "public": False, "announce": True, "phrases": []},
                    {"id": "eclipse", "label": "Plan Maestro: el Eclipse de la última luna", "segments": 8, "public": True, "announce": True, "phrases": []}]}},
        "scenes": escenas}


# ------------------------------------------------------------------ main
# Imágenes de la v1 que aún quedaban referenciadas (diarios, panel del DJ, grupos): se llevan al arte nuevo
REMAPEO = {
    "assets/escenas/portada.webp": "assets/escenas/esc-portada.webp", "assets/escenas/biblioteca-abadia.webp": "assets/escenas/esc-biblioteca-abadia.webp",
    "assets/escenas/cloacas-dj.webp": "assets/escenas/mapa-cloacas.webp", "assets/escenas/cueva-mercaderes.webp": "assets/escenas/esc-cueva-mercaderes.webp",
    "assets/escenas/defensa-mazmorra.webp": "assets/escenas/esc-defensa-mazmorra.webp", "assets/escenas/guerra-dj.webp": "assets/escenas/mapa-guerra.webp",
    "assets/escenas/mares-dj.webp": "assets/escenas/mapa-mares.webp", "assets/escenas/mazmorra-1.webp": "assets/escenas/mapa-guarida-1.webp",
    "assets/escenas/mazmorra-2.webp": "assets/escenas/mapa-guarida-2.webp", "assets/escenas/mazmorra-3.webp": "assets/escenas/mapa-guarida-3.webp",
    "assets/escenas/ritual-luna-llena.webp": "assets/escenas/esc-ritual-luna-llena.webp", "assets/escenas/valle-dj.webp": "assets/escenas/mapa-valle.webp",
    "assets/retratos/adv-archimago.webp": "assets/retratos/adv-mago-del-caos.webp", "assets/retratos/adv-arquera.webp": "assets/retratos/adv-arquero-arcano.webp",
    "assets/retratos/adv-asesina.webp": "assets/retratos/adv-asesino.webp", "assets/retratos/adv-cleriga.webp": "assets/retratos/adv-clerigo.webp"
}


def reparar(x):
    if isinstance(x, str):
        for a, b in REMAPEO.items():
            if a in x:
                x = x.replace(a, b)
        return x
    if isinstance(x, list):
        return [reparar(v) for v in x]
    if isinstance(x, dict):
        return {k: reparar(v) for k, v in x.items()}
    return x


def guardar(nombre, datos):
    OUT.mkdir(exist_ok=True)
    (OUT / f"{nombre}.json").write_text(json.dumps(reparar(datos), ensure_ascii=False, indent=1), encoding="utf-8")


def main():
    dims = json.loads((A / "escenas" / "dims.json").read_text()) if (A / "escenas" / "dims.json").exists() else {}
    F = {t: Carpetas(t) for t in ("Item", "Actor", "Scene", "JournalEntry", "RollTable", "Playlist", "Macro")}

    labores = procesar_labores(cargar("labores-es"), F["Item"])
    equipo = procesar_equipo(cargar("equipo-es"), F["Item"])
    aventureros = procesar_aventureros(cargar("aventureros-es"), F["Item"])
    act = procesar_actores(cargar("facciones-es"), F["Actor"])

    ft = F["RollTable"].nueva("tab", "Tablas de MR · Wicked Ones", color=COL["mundo"])
    tablas = cargar("tablas-es")
    for t in tablas:
        t["folder"] = ft["_id"]
    manual = cargar("manual-es")
    fd_libro = F["JournalEntry"].nueva("j:libro", "Libro y referencia", color=COL["mundo"])
    fd_camp = F["JournalEntry"].nueva("j:campana", "Campaña y escenas", color=COL["campana"])
    for j in manual:
        j["folder"] = (fd_camp if j["name"].startswith(("01", "10")) else fd_libro)["_id"]
    ini = {"_id": fid("journal:empieza-aqui"), "name": "00 · Empieza aquí", "folder": fd_camp["_id"], "ownership": {"default": 2}, "flags": {MOD: {"clave": "empieza-aqui"}},
           "pages": [{"_id": fid("page:empieza-aqui"), "name": "Bienvenido, Señor Oscuro", "type": "text", "title": {"show": True, "level": 1}, "sort": 0,
                      "text": {"format": 1, "content": EMPIEZA_AQUI}, "ownership": {"default": -1}, "flags": {}}]}
    lect = diario_lecturas()
    lect["folder"] = fd_camp["_id"]
    manual = [ini] + manual + [lect]

    fs = {"campana": F["Scene"].nueva("s:camp", "Campaña · El Valle Silencioso", color=COL["campana"]),
          "mundo": F["Scene"].nueva("s:mundo", "Entornos (mapas regionales)", color=COL["mundo"]),
          "tactico": F["Scene"].nueva("s:tac", "Planos tácticos", color=COL["heroes"]),
          "fases": F["Scene"].nueva("s:fases", "Escenas de fase (ilustradas)", color=COL["monstruos"])}
    escenas = [escena_doc(i, e, dims, lect["_id"]) for i, e in enumerate(ESCENAS)]
    for e, x in zip(ESCENAS, escenas):
        x["folder"] = fs[e[4]]["_id"]

    pls = playlists(F["Playlist"])
    fm = F["Macro"].nueva("m", "MR · Herramientas", color=COL["campana"])
    def macro(k, nombre, img, cmd):
        return {"_id": fid(f"macro:{k}"), "name": nombre, "type": "script", "img": img, "scope": "global", "author": "0000000000000000", "command": cmd, "folder": fm["_id"]}
    api = "game.modules.get('mr-wicked-ones-es')?.api?."
    macros = [macro("gen", "MR · Generador del Señor Oscuro", "icons/svg/d20-highlight.svg", api + "abrirGenerador();"),
              macro("des", "MR · Tirada de Desastre", "icons/svg/hazard.svg", api + "dialogoCiclo('calamity');"),
              macro("rep", "MR · Tirada de Represalia", "icons/svg/explosion.svg", api + "dialogoCiclo('blowback');"),
              macro("tut", "MR · Tutorial guiado", "icons/svg/book.svg", api + "empezarTutorial();")]

    todas = {t: c.lista for t, c in F.items()}
    aventura = {
        "_id": fid("adventure:valle-silencioso"), "name": "MR- Wicked Ones: El Valle Silencioso («Un lugar al que llamar hogar»)",
        "img": ruta("assets/escenas/esc-portada.webp"),
        "caption": "Campaña lista para jugar + cuatro entornos, 48 facciones, aventureros, mazmorra y manual, todo en carpetas.",
        "description": "<p>Importa al mundo toda la campaña de <strong>Wicked Ones</strong>: escenas con lectura y música, personajes, esbirros, aventureros rivales, facciones, objetos, tablas y el libro por capítulos, ordenados en carpetas.</p>",
        "scenes": escenas, "actors": [a for k in ("personajes", "esbirros", "facciones", "grupos") for a in act[k]],
        "items": labores + equipo + aventureros, "tables": tablas, "journal": manual, "macros": macros, "playlists": pls,
        "folders": [f for t in ("Actor", "Item", "Scene", "JournalEntry", "RollTable", "Playlist", "Macro") for f in todas[t]],
        "sort": 1000, "flags": {MOD: {"version": VERSION}}}

    # Marca de contenido del módulo: permite reinstalar y retirar lo que una versión nueva ya no trae sin tocar lo ajeno
    for campo in ("scenes", "actors", "items", "tables", "journal", "macros", "playlists", "folders"):
        for d in aventura[campo]:
            d.setdefault("flags", {}).setdefault(MOD, {})["contenido"] = True
    guardar("aventura-es", [aventura]); guardar("manual-es", manual); guardar("tablas-es", tablas)
    guardar("aventureros-es", aventureros); guardar("labores-es", labores); guardar("equipo-es", equipo)
    for k in ("personajes", "esbirros", "facciones", "grupos"):
        guardar(f"{k}-es", act[k])
    (OUT / "carpetas.json").write_text(json.dumps(todas, ensure_ascii=False, indent=1), encoding="utf-8")
    (BASE / "content").mkdir(exist_ok=True)
    (BASE / "content" / "direccion-es.json").write_text(json.dumps(direccion(), ensure_ascii=False, indent=2), encoding="utf-8")
    print("OK:", {k: len(v) for k, v in {"escenas": escenas, "items": aventura["items"], "actores": aventura["actors"], "diarios": aventura["journal"], "playlists": pls}.items()})


if __name__ == "__main__":
    main()
