#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Extractor y generador de recursos gráficos para MR- Wicked Ones (The Hills Press).
Aplica siempre la marca oficial MR_MARCA (marca.esquina en escenas/mapas/ilustraciones
y marca.discreta en tokens y figuras recortadas).
"""

import os
import sys
import math
import fitz
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance, ImageFont

sys.path.insert(0, "/Volumes/Datos_Dock/FoundryVTT/Trabajo LOGO/marca")
import marca

PDF_PATH = "/Volumes/Datos_Dock/Descargas_Mac/Wicked Ones - The Hills Press (Español).pdf"
BASE_DIR = "/Volumes/Datos_Dock/FoundryVTT/Data/modules/mr-wicked-ones-es"
ASSETS_DIR = os.path.join(BASE_DIR, "assets")

for sub in ("escenas", "retratos", "tokens", "figuras", "dioses", "vocaciones", "iconos"):
    os.makedirs(os.path.join(ASSETS_DIR, sub), exist_ok=True)


def cargar_fuente(tam=22, bold=False):
    rutas = [
        "/System/Library/Fonts/Supplemental/Futura.ttc",
        "/System/Library/Fonts/Supplemental/GillSans.ttc",
        "/System/Library/Fonts/HelveticaNeue.ttc",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for r in rutas:
        if os.path.exists(r):
            try:
                return ImageFont.truetype(r, tam)
            except Exception:
                pass
    return ImageFont.load_default()


def extraer_xref(doc, xref):
    """Extrae una imagen por xref del PDF, respetando su máscara si existe."""
    d = doc.extract_image(xref)
    import io
    im = Image.open(io.BytesIO(d["image"]))
    smask = d.get("smask", 0)
    if smask and smask > 0:
        try:
            m_d = doc.extract_image(smask)
            mask = Image.open(io.BytesIO(m_d["image"])).convert("L")
            if mask.size != im.size:
                mask = mask.resize(im.size, Image.LANCZOS)
            im = im.convert("RGBA")
            im.putalpha(mask)
            return im
        except Exception:
            pass
    return im.convert("RGBA")


def renderizar_pagina(doc, num_pag_1based, dpi=180):
    """Renderiza una página completa del PDF a PIL Image RGBA."""
    page = doc[num_pag_1based - 1]
    mat = fitz.Matrix(dpi / 72.0, dpi / 72.0)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    return Image.frombytes("RGB", [pix.width, pix.height], pix.samples).convert("RGBA")


def unir_doble_pagina_xref(doc, xref_izq, xref_der, destino):
    im_i = extraer_xref(doc, xref_izq).convert("RGB")
    im_d = extraer_xref(doc, xref_der).convert("RGB")
    h = max(im_i.height, im_d.height)
    if im_i.height != h:
        im_i = im_i.resize((int(im_i.width * h / im_i.height), h), Image.LANCZOS)
    if im_d.height != h:
        im_d = im_d.resize((int(im_d.width * h / im_d.height), h), Image.LANCZOS)
    lienzo = Image.new("RGBA", (im_i.width + im_d.width, h))
    lienzo.paste(im_i.convert("RGBA"), (0, 0))
    lienzo.paste(im_d.convert("RGBA"), (im_i.width, 0))
    lienzo = marca.esquina(lienzo)
    lienzo.convert("RGB").save(destino, "WEBP", quality=88)
    print(f"  [OK] Doble página XREF -> {os.path.basename(destino)} ({lienzo.width}x{lienzo.height})")


def unir_doble_pagina_render(doc, pag_izq, pag_der, destino, dpi=160):
    im_i = renderizar_pagina(doc, pag_izq, dpi=dpi)
    im_d = renderizar_pagina(doc, pag_der, dpi=dpi)
    lienzo = Image.new("RGBA", (im_i.width + im_d.width, im_i.height))
    lienzo.paste(im_i, (0, 0))
    lienzo.paste(im_d, (im_i.width, 0))
    lienzo = marca.esquina(lienzo)
    lienzo.convert("RGB").save(destino, "WEBP", quality=88)
    print(f"  [OK] Doble página Render -> {os.path.basename(destino)} ({lienzo.width}x{lienzo.height})")


def crear_escena_ilustrada(doc, xref_fondo, destino, titulo="", subtitulo=""):
    """Convierte una ilustración vertical del libro (1007x1423) en una escena panorámica 1920x1080
    con fondo atmosférico desenfocado lateral e ilustración central nítida."""
    ilust = extraer_xref(doc, xref_fondo).convert("RGBA")
    W, H = 1920, 1080
    # Fondo atmosférico estirado y oscurecido
    fondo = ilust.convert("RGB").resize((W, H), Image.LANCZOS)
    fondo = fondo.filter(ImageFilter.GaussianBlur(radius=28))
    fondo = ImageEnhance.Brightness(fondo).enhance(0.32)
    fondo = ImageEnhance.Color(fondo).enhance(0.75)
    lienzo = fondo.convert("RGBA")

    # Encajar la ilustración con marco sutil
    escala = min((W * 0.72) / ilust.width, (H * 0.94) / ilust.height)
    nw, nh = int(ilust.width * escala), int(ilust.height * escala)
    central = ilust.resize((nw, nh), Image.LANCZOS)
    cx = (W - nw) // 2
    cy = (H - nh) // 2

    # Sombra detrás de la lámina central
    sombra = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sombra)
    sd.rounded_rectangle((cx - 12, cy - 12, cx + nw + 12, cy + nh + 12), radius=14, fill=(0, 0, 0, 210))
    sombra = sombra.filter(ImageFilter.GaussianBlur(radius=18))
    lienzo = Image.alpha_composite(lienzo, sombra)
    lienzo.paste(central, (cx, cy), central)

    # Borde dorado viejo / hierro oscuro alrededor de la lámina
    dr = ImageDraw.Draw(lienzo)
    dr.rounded_rectangle((cx - 2, cy - 2, cx + nw + 2, cy + nh + 2), radius=6, outline=(196, 154, 69, 190), width=3)

    if titulo:
        f_tit = cargar_fuente(32, bold=True)
        f_sub = cargar_fuente(18, bold=False)
        # Cartela inferior izquierda
        caja_w = 560
        caja_h = 88 if subtitulo else 56
        bx, by = 36, H - caja_h - 32
        placa = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        pd = ImageDraw.Draw(placa)
        pd.rounded_rectangle((bx, by, bx + caja_w, by + caja_h), radius=8, fill=(14, 12, 16, 215), outline=(196, 154, 69, 180), width=2)
        lienzo = Image.alpha_composite(lienzo, placa)
        dr = ImageDraw.Draw(lienzo)
        dr.text((bx + 18, by + 10), titulo, font=f_tit, fill=(242, 224, 176, 255))
        if subtitulo:
            dr.text((bx + 18, by + 52), subtitulo, font=f_sub, fill=(200, 192, 180, 235))

    lienzo = marca.esquina(lienzo)
    lienzo.convert("RGB").save(destino, "WEBP", quality=88)
    print(f"  [OK] Escena ilustrada -> {os.path.basename(destino)}")


def crear_portada(doc, destino):
    """Crea la escena de portada panorámica 1920x1080 combinando el arte de portada (xref 36723)
    y el logotipo en español (xref 36727)."""
    arte = extraer_xref(doc, 36723).convert("RGBA")
    logo = extraer_xref(doc, 36727).convert("RGBA")
    W, H = 1920, 1080
    fondo = arte.convert("RGB").resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(radius=24))
    fondo = ImageEnhance.Brightness(fondo).enhance(0.35).convert("RGBA")

    # Arte de portada a la derecha/centro
    escala = (H * 0.96) / arte.height
    nw, nh = int(arte.width * escala), int(arte.height * escala)
    central = arte.resize((nw, nh), Image.LANCZOS)
    cx = int(W * 0.54 - nw / 2)
    cy = (H - nh) // 2

    sombra = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sombra)
    sd.rounded_rectangle((cx - 10, cy - 10, cx + nw + 10, cy + nh + 10), radius=12, fill=(0, 0, 0, 220))
    sombra = sombra.filter(ImageFilter.GaussianBlur(radius=18))
    lienzo = Image.alpha_composite(fondo, sombra)
    lienzo.paste(central, (cx, cy), central)

    # Panel izquierdo con el logo oficial en español y subtítulo de campaña
    panel = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    pd = ImageDraw.Draw(panel)
    pd.rounded_rectangle((56, 70, 680, H - 70), radius=16, fill=(15, 12, 18, 225), outline=(204, 162, 74, 210), width=3)
    lienzo = Image.alpha_composite(lienzo, panel)

    lw = 480
    lh = int(logo.height * (lw / logo.width))
    logo_r = logo.resize((lw, lh), Image.LANCZOS)
    lienzo.paste(logo_r, (128, 115), logo_r)

    dr = ImageDraw.Draw(lienzo)
    f_tit = cargar_fuente(30, bold=True)
    f_sub = cargar_fuente(20, bold=False)
    f_peq = cargar_fuente(16, bold=False)

    dr.line((110, 510, 626, 510), fill=(204, 162, 74, 180), width=2)
    dr.text((110, 535), "EL VALLE SILENCIOSO", font=f_tit, fill=(245, 222, 166, 255))
    dr.text((110, 580), "«Un lugar al que llamar hogar»", font=f_sub, fill=(224, 198, 148, 255))
    lineas = [
        "• Manual completo en español (The Hills Press)",
        "• Los 4 entornos oficiales y sus 48 facciones",
        "• Salas N1-N2, trampas, trucos, portones y criaturas",
        "• Arsenal, mejunjes, artilugios, pociones y reliquias",
        "• 30 aventureros con sus 6 movimientos y 36 ayudantes",
        "• Modo solitario «El Gran Malo Malvado» y oráculos",
        "• Campaña lista para jugar con MR- Dirección",
    ]
    y = 640
    for lin in lineas:
        dr.text((115, y), lin, font=f_peq, fill=(215, 210, 205, 240))
        y += 34

    lienzo = marca.esquina(lienzo)
    lienzo.convert("RGB").save(destino, "WEBP", quality=90)
    print(f"  [OK] Portada -> {os.path.basename(destino)}")


def crear_retrato_token_figura(im_origen, slug, color_anillo=(196, 154, 69), recorte_foco=None):
    """A partir de una imagen RGBA o RGB, genera:
    1) Retrato 512x512 en assets/retratos/<slug>.webp (con marca.esquina)
    2) Token circular 400x400 en assets/tokens/<slug>.webp (con marca.discreta en el anillo)
    3) Figura de cuerpo entero 600x800 con fondo transparente en assets/figuras/<slug>.webp (con marca.discreta)
    """
    im = im_origen.convert("RGBA")
    w, h = im.size

    # Si el fondo es casi blanco uniforme (como las ilustraciones de razas/vocaciones/aventureros),
    # hacemos transparente el blanco exterior para la figura y el retrato
    im_trans = im.copy()
    px_t = im_trans.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px_t[x, y]
            if a > 0 and r > 240 and g > 240 and b > 240:
                dist_blanco = max(255 - r, 255 - g, 255 - b)
                if dist_blanco < 15:
                    px_t[x, y] = (r, g, b, int(a * (dist_blanco / 15.0)))

    # 1. Retrato 512x512 sobre fondo oscuro texturizado
    R_SIZE = 512
    ret = Image.new("RGBA", (R_SIZE, R_SIZE), (24, 21, 28, 255))
    rd = ImageDraw.Draw(ret)
    rd.ellipse((20, 20, R_SIZE - 20, R_SIZE - 20), fill=(42, 36, 48, 255))

    if recorte_foco:
        x0, y0, x1, y1 = recorte_foco
        rec = im_trans.crop((int(x0 * w), int(y0 * h), int(x1 * w), int(y1 * h)))
    else:
        lado = min(w, h)
        x0 = (w - lado) // 2
        y0 = max(0, int((h - lado) * 0.15))
        rec = im_trans.crop((x0, y0, x0 + lado, min(h, y0 + lado)))

    rec_r = rec.resize((R_SIZE - 24, R_SIZE - 24), Image.LANCZOS)
    ret.paste(rec_r, (12, 12), rec_r)
    rd.rounded_rectangle((4, 4, R_SIZE - 5, R_SIZE - 5), radius=18, outline=color_anillo + (230,), width=6)
    ret = marca.esquina(ret)
    ret.convert("RGB").save(os.path.join(ASSETS_DIR, "retratos", f"{slug}.webp"), "WEBP", quality=88)

    # 2. Token circular 400x400 con anillo metálico, fondo oscuro interior y exterior transparente
    T_SIZE = 400
    base_tok = Image.new("RGBA", (T_SIZE, T_SIZE), (30, 26, 36, 255))
    bd = ImageDraw.Draw(base_tok)
    bd.ellipse((40, 40, T_SIZE - 40, T_SIZE - 40), fill=(46, 40, 54, 255))
    cara = rec.resize((T_SIZE - 36, T_SIZE - 36), Image.LANCZOS)
    base_tok.paste(cara, (18, 18), cara)

    mascara_circ = Image.new("L", (T_SIZE, T_SIZE), 0)
    md = ImageDraw.Draw(mascara_circ)
    md.ellipse((14, 14, T_SIZE - 14, T_SIZE - 14), fill=255)

    tok = Image.new("RGBA", (T_SIZE, T_SIZE), (0, 0, 0, 0))
    tok = Image.composite(base_tok, tok, mascara_circ)

    td = ImageDraw.Draw(tok)
    td.ellipse((6, 6, T_SIZE - 6, T_SIZE - 6), outline=(18, 14, 20, 255), width=12)
    td.ellipse((10, 10, T_SIZE - 10, T_SIZE - 10), outline=color_anillo + (255,), width=7)
    td.ellipse((17, 17, T_SIZE - 17, T_SIZE - 17), outline=(255, 240, 200, 140), width=2)
    tok = marca.discreta(tok, T_SIZE // 2, T_SIZE - 42, 18)
    tok.save(os.path.join(ASSETS_DIR, "tokens", f"{slug}.webp"), "WEBP", quality=90)

    # 3. Figura de cuerpo entero 600x800 con fondo transparente para escenas de imagen (MR- Dirección)
    FW, FH = 600, 800
    fig = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
    esc_f = min((FW - 48) / w, (FH - 48) / h)
    fw, fh = int(w * esc_f), int(h * esc_f)
    cuerpo = im_trans.resize((fw, fh), Image.LANCZOS)
    fig.paste(cuerpo, ((FW - fw) // 2, FH - 20 - fh), cuerpo)
    try:
        fig = marca.hombro(fig)
    except Exception:
        fig = marca.discreta(fig, FW // 2, FH // 2, 22)
    fig.save(os.path.join(ASSETS_DIR, "figuras", f"{slug}.webp"), "WEBP", quality=88)


def generar_plano_cueva_caravana(destino, modo_dj=False):
    """Genera el plano táctico de la incursión inicial «Un lugar al que llamar hogar»
    (Las Cuevas del Paso del Mercader en las Colinas de Piedra Blanca)."""
    W, H = 1920, 1280
    im = Image.new("RGBA", (W, H), (28, 25, 22, 255))
    dr = ImageDraw.Draw(im)

    # Textura de roca y cuadrícula sutil
    paso = 64
    for x in range(0, W, paso):
        dr.line((x, 0, x, H), fill=(44, 39, 34, 140), width=1)
    for y in range(0, H, paso):
        dr.line((0, y, W, y), fill=(44, 39, 34, 140), width=1)

    # Exterior (bosque y camino de caravanas a la izquierda)
    dr.polygon([(0, 0), (540, 0), (490, 460), (560, 820), (460, 1280), (0, 1280)], fill=(38, 48, 34, 255))
    # Camino del Paso del Mercader
    dr.polygon([(90, 0), (230, 0), (290, 560), (420, 620), (310, 740), (240, 1280), (110, 1280), (160, 680)], fill=(76, 64, 48, 255))

    # Salas de la cueva (Roca tallada y caverna natural)
    salas = [
        # Entrada y empalizada de los mercaderes
        ([ (430, 520), (740, 470), (780, 740), (440, 730) ], (66, 60, 54, 255), "1. Boca de la Cueva y Carromatos"),
        # Galería de guardia
        ([ (740, 490), (1120, 460), (1140, 710), (780, 720) ], (58, 53, 48, 255), "2. Galería de los Guardias"),
        # Almacén de mercancías y cajas (Norte)
        ([ (820, 160), (1260, 150), (1280, 430), (800, 450) ], (64, 56, 46, 255), "3. Depósito de Caravanas (Botín)"),
        # Gruta del manantial subterráneo (Sur)
        ([ (760, 780), (1220, 770), (1260, 1110), (740, 1100) ], (42, 56, 64, 255), "4. Cisterna del Arroyo Frío"),
        # Cámara profunda / Corazón potencial de la Mazmorra (Este)
        ([ (1180, 390), (1760, 340), (1800, 890), (1180, 840) ], (52, 44, 58, 255), "5. Bóveda de Piedra Antigua (Corazón)"),
    ]

    # Pasillos de conexión
    pasillos = [
        [(920, 430), (1040, 430), (1040, 490), (920, 490)],
        [(920, 700), (1040, 700), (1040, 790), (920, 790)],
        [(1120, 540), (1200, 540), (1200, 660), (1120, 660)],
    ]
    for p in pasillos:
        dr.polygon(p, fill=(58, 53, 48, 255), outline=(140, 126, 108, 255))

    f_sala = cargar_fuente(22, bold=True)
    f_nota = cargar_fuente(17, bold=False)
    f_tit = cargar_fuente(30, bold=True)

    for pts, col, nombre in salas:
        dr.polygon(pts, fill=col, outline=(175, 156, 128, 255))
        # Borde interior grueso
        for i in range(len(pts)):
            p1 = pts[i]
            p2 = pts[(i + 1) % len(pts)]
            dr.line((p1[0], p1[1], p2[0], p2[1]), fill=(186, 166, 134, 255), width=4)

    # Elementos escenográficos (carromatos, cajas, fogata, altar antiguo)
    # Fogata exterior/entrada
    dr.ellipse((550, 580, 610, 640), fill=(210, 95, 30, 230), outline=(255, 200, 80, 255), width=3)
    # Cajas de suministros en sala 3
    for cx, cy in [(880, 220), (950, 220), (1020, 220), (1140, 260), (1140, 330)]:
        dr.rectangle((cx, cy, cx + 52, cy + 46), fill=(124, 88, 48, 255), outline=(60, 40, 20, 255), width=2)
    # Estanque subterráneo en sala 4
    dr.ellipse((840, 830, 1160, 1050), fill=(28, 78, 104, 230), outline=(90, 150, 180, 200), width=3)
    # Pedestal del Corazón de la Mazmorra en sala 5
    dr.ellipse((1440, 550, 1580, 690), fill=(88, 38, 98, 240), outline=(212, 164, 78, 255), width=4)

    if modo_dj:
        # Etiquetas, rutas secretas y relojes recomendados para el DJ
        for pts, _, nombre in salas:
            cx = sum(p[0] for p in pts) // len(pts)
            cy = min(p[1] for p in pts) + 26
            dr.rounded_rectangle((cx - 170, cy - 14, cx + 170, cy + 22), radius=6, fill=(16, 14, 18, 220), outline=(204, 162, 74, 200), width=1)
            dr.text((cx - 156, cy - 10), nombre, font=f_nota, fill=(244, 224, 174, 255))

        # Ruta secreta de infiltración (Chimenea de ventilación norte y sumidero sur)
        dr.line((230, 180, 820, 240), fill=(220, 80, 80, 220), width=4)
        dr.text((340, 165), "Grieta de humo (Acechar / Escalar)", font=f_nota, fill=(255, 150, 150, 255))
        dr.line((290, 980, 760, 940), fill=(80, 190, 240, 220), width=4)
        dr.text((340, 990), "Sumidero del arroyo (Entrada sumergida)", font=f_nota, fill=(150, 225, 255, 255))

        # Notas tácticas en Sala 2 y 5
        dr.text((810, 580), "• 6 Guardias de Caravana + Capataz", font=f_nota, fill=(235, 210, 190, 255))
        dr.text((810, 610), "• Cuerno de alarma (Reloj 4 seg.)", font=f_nota, fill=(235, 210, 190, 255))
        dr.text((1310, 720), "• Fisura arcana ideal para el Corazón", font=f_nota, fill=(220, 185, 245, 255))
        dr.text((1310, 750), "• Hallazgo oculto tras el derrumbe", font=f_nota, fill=(220, 185, 245, 255))

    # Cartela de título
    dr.rounded_rectangle((32, 28, 680, 114), radius=8, fill=(16, 14, 18, 230), outline=(196, 154, 69, 210), width=2)
    sub = "Plano del Director de Juego (con rutas y secretos)" if modo_dj else "Plano táctico para la mesa"
    dr.text((50, 38), "CUEVAS DEL PASO DEL MERCADER", font=f_tit, fill=(242, 222, 170, 255))
    dr.text((50, 78), sub, font=f_nota, fill=(200, 190, 175, 240))

    im = marca.esquina(im)
    im.convert("RGB").save(destino, "WEBP", quality=88)
    print(f"  [OK] Plano táctico -> {os.path.basename(destino)}")


def main():
    doc = fitz.open(PDF_PATH)
    print(f"Abierto PDF: {len(doc)} páginas")

    # 1. Portada
    crear_portada(doc, os.path.join(ASSETS_DIR, "escenas", "portada.webp"))

    # 2. Los 4 Entornos Oficiales (versión Mesa limpia y versión DJ anotada)
    # Cloacas de la Gran Ciudad: P280-281 (xrefs 3966, 3968), DJ P282-283
    unir_doble_pagina_xref(doc, 3966, 3968, os.path.join(ASSETS_DIR, "escenas", "cloacas-mesa.webp"))
    unir_doble_pagina_render(doc, 282, 283, os.path.join(ASSETS_DIR, "escenas", "cloacas-dj.webp"))

    # Mares Coloniales: P284-285 (xrefs 3990, 3992), DJ P286-287
    unir_doble_pagina_xref(doc, 3990, 3992, os.path.join(ASSETS_DIR, "escenas", "mares-mesa.webp"))
    unir_doble_pagina_render(doc, 286, 287, os.path.join(ASSETS_DIR, "escenas", "mares-dj.webp"))

    # Valle Silencioso: P288-289 (xrefs 3994, 3996), DJ P290-291
    unir_doble_pagina_xref(doc, 3994, 3996, os.path.join(ASSETS_DIR, "escenas", "valle-mesa.webp"))
    unir_doble_pagina_render(doc, 290, 291, os.path.join(ASSETS_DIR, "escenas", "valle-dj.webp"))

    # Zona de Guerra: P292-293 (xrefs 3998, 4000), DJ P294-295
    unir_doble_pagina_xref(doc, 3998, 4000, os.path.join(ASSETS_DIR, "escenas", "guerra-mesa.webp"))
    unir_doble_pagina_render(doc, 294, 295, os.path.join(ASSETS_DIR, "escenas", "guerra-dj.webp"))

    # 3. Las 3 Mazmorras de ejemplo a doble página del libro (P214-219)
    unir_doble_pagina_xref(doc, 2111, 2115, os.path.join(ASSETS_DIR, "escenas", "mazmorra-1.webp"))
    unir_doble_pagina_xref(doc, 3914, 2122, os.path.join(ASSETS_DIR, "escenas", "mazmorra-2.webp"))
    unir_doble_pagina_xref(doc, 2127, 2131, os.path.join(ASSETS_DIR, "escenas", "mazmorra-3.webp"))

    # 4. Planos tácticos de la Cueva de los Mercaderes (Mesa y DJ)
    generar_plano_cueva_caravana(os.path.join(ASSETS_DIR, "escenas", "cueva-caravana-mesa.webp"), modo_dj=False)
    generar_plano_cueva_caravana(os.path.join(ASSETS_DIR, "escenas", "cueva-caravana-dj.webp"), modo_dj=True)

    # 5. Escenas narrativas ilustradas de la campaña (El trío icónico del libro)
    escenas_narrativas = [
        (404, "cueva-mercaderes.webp", "Incursión I · Un lugar al que llamar hogar", "Asalto al refugio de los mercaderes en las Colinas de Piedra Blanca"),
        (1067, "biblioteca-abadia.webp", "Incursión II · Una biblioteca necesita libros", "Saqueo de los archivos prohibidos de la Abadía de Piedra Blanca"),
        (1722, "ritual-luna-llena.webp", "Incursión III · Piel de lobo para un ritual", "Caza de la bestia lunar y consagración del altar del eclipse"),
        (2185, "defensa-mazmorra.webp", "Fase de Guarida · ¡Matad a los intrusos!", "Los héroes del Valle Silencioso irrumpen en vuestro santuario"),
        (2518, "consejo-guerra.webp", "El Plan Maestro · Preparando la Horda", "La oscuridad se cierne sobre Ciudad Floresta"),
        (3283, "batalla-santuario.webp", "Clímax · La última luna llena", "El asalto final contra los defensores de la Luz"),
    ]
    for xref, archivo, tit, sub in escenas_narrativas:
        crear_escena_ilustrada(doc, xref, os.path.join(ASSETS_DIR, "escenas", archivo), titulo=tit, subtitulo=sub)

    # 6. Retratos, Tokens y Figuras de PJs, Esbirros, Aventureros y Criaturas
    personajes = [
        # 6 PJs pregenerados (vocaciones P96-113 y razas P92-93)
        (954, "pj-ulrot", (188, 64, 52)),      # Ulrot (Orco Bruto)
        (986, "pj-crag", (214, 132, 46)),      # Crag (Kóbold Chamán)
        (1056, "pj-slem", (112, 78, 176)),     # Slem (Sérpido Sombra)
        (918, "pj-viska", (76, 158, 92)),      # Viska (Goblin Artesana)
        (1038, "pj-kaelen", (176, 48, 96)),    # Kaelen (Demonio Hechicero)
        (1004, "pj-zira", (64, 148, 184)),     # Zira (Devoramentes Confabuladora)
        # 6 Manadas de esbirros (P92-93 + P96-101)
        (856, "esbirros-ulrot", (188, 64, 52)),
        (860, "esbirros-crag", (214, 132, 46)),
        (883, "esbirros-slem", (112, 78, 176)),
        (852, "esbirros-viska", (76, 158, 92)),
        (887, "esbirros-kaelen", (176, 48, 96)),
        (879, "esbirros-zira", (64, 148, 184)),
        # Aventureros y Jefes del Valle Silencioso (P322-331)
        (3072, "adv-defensor", (212, 175, 82)),
        (3051, "adv-cleriga", (220, 200, 120)),
        (3193, "adv-explorador", (92, 164, 102)),
        (3236, "adv-arquera", (120, 170, 220)),
        (3016, "adv-centurion", (200, 150, 70)),
        (3121, "adv-inquisidor", (190, 70, 70)),
        (3047, "adv-archimago", (150, 95, 210)),
        (2971, "adv-barbaro", (195, 110, 65)),
        (2967, "adv-asesina", (110, 115, 135)),
        (3125, "adv-caballero", (215, 190, 110)),
        # Criaturas de guarida y adversarios (P145-157, P348-353)
        (1344, "criatura-hombre-lobo", (145, 55, 55)),
        (1411, "criatura-golem", (135, 120, 95)),
        (1386, "criatura-hidra", (65, 145, 95)),
        (1587, "criatura-sombra", (105, 65, 155)),
    ]
    for xref, slug, col in personajes:
        im_p = extraer_xref(doc, xref)
        crear_retrato_token_figura(im_p, slug, color_anillo=col)
    print(f"  [OK] Generados {len(personajes)} retratos, tokens y figuras con MR_MARCA")

    # 7. Los 13 Dioses Oscuros (P145-157)
    dioses = [
        (1344, "gorlag"),
        (1365, "iziza"),
        (1386, "melkahar"),
        (1411, "gimosha"),
        (1432, "dalgeth"),
        (1457, "nezame"),
        (1478, "melawa"),
        (1499, "shabaz"),
        (1520, "labisha"),
        (1545, "talazar"),
        (1566, "crevis"),
        (1587, "vahoona"),
        (1608, "zaheen"),
    ]
    for xref, slug in dioses:
        im_d = extraer_xref(doc, xref).convert("RGBA")
        lienzo = Image.new("RGBA", (512, 512), (20, 18, 24, 255))
        esc = min(480 / im_d.width, 480 / im_d.height)
        nw, nh = int(im_d.width * esc), int(im_d.height * esc)
        im_r = im_d.resize((nw, nh), Image.LANCZOS)
        lienzo.paste(im_r, ((512 - nw) // 2, (512 - nh) // 2), im_r)
        lienzo = marca.esquina(lienzo)
        lienzo.convert("RGB").save(os.path.join(ASSETS_DIR, "dioses", f"{slug}.webp"), "WEBP", quality=86)
    print(f"  [OK] Generados {len(dioses)} iconos de Dioses Oscuros con MR_MARCA")

    doc.close()


if __name__ == "__main__":
    main()
