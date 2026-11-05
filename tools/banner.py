#!/usr/bin/env python3
"""Genera docs/img/banner.webp (1600x560), docs/img/social.png (1280x640) y vistas previas para el README
siguiendo el estándar visual exacto de MR- (mr-ultimo-descenso / mr-mothership-es)."""
import pathlib, shutil
import fitz
from PIL import Image, ImageDraw, ImageFilter, ImageFont

R = pathlib.Path(__file__).resolve().parent.parent
PDF_PATH = pathlib.Path("/Volumes/Datos_Dock/Descargas_Mac/Wicked Ones - The Hills Press (Español).pdf")
LOGO_MARFIL = pathlib.Path("/Volumes/Datos_Dock/FoundryVTT/Data/modules/mr-nadir/brand/MR_11_Formal_Marfil_Transparente.png")
DOCS_IMG = R / "docs" / "img"
DOCS_IMG.mkdir(parents=True, exist_ok=True)


def fnt(path, size, index=0):
    try:
        return ImageFont.truetype(path, size, index=index)
    except Exception:
        return ImageFont.load_default()


def render_banner(out_path: pathlib.Path, W: int, H: int):
    # Extraer la ilustración limpia de portada (xref 36723, sin texto superpuesto) y el mapa del valle
    import io
    doc = fitz.open(str(PDF_PATH))
    cov_bytes = doc.extract_image(36723)["image"]
    cov_im = Image.open(io.BytesIO(cov_bytes)).convert("RGB")

    valle_im = Image.open(R / "assets/escenas/valle-mesa.webp").convert("RGB")
    # Fondo base: mapa del valle oscurecido y tintado en obsidiana/carmesí
    bg = valle_im.resize((W, H), Image.Resampling.LANCZOS).filter(ImageFilter.GaussianBlur(3))
    dark_overlay = Image.new("RGB", (W, H), (14, 11, 16))
    bg = Image.blend(bg, dark_overlay, 0.72)

    # Colocar el arte limpio de los monstruos emboscando a los héroes en el centro-derecha
    ch = int(H * 1.15)
    cw = int(cov_im.width * (ch / cov_im.height))
    cov_resized = cov_im.resize((cw, ch), Image.Resampling.LANCZOS)
    cx = int(W * 0.54)
    cy = int((H - ch) * 0.45)

    mask_cov = Image.new("L", (cw, ch), 255)
    md = ImageDraw.Draw(mask_cov)
    fade_w = int(cw * 0.32)
    for x in range(fade_w):
        a = int(255 * (x / fade_w) ** 1.4)
        md.line([(x, 0), (x, ch)], fill=a)
    for x in range(cw - int(cw * 0.18), cw):
        rel = (cw - x) / (cw * 0.18)
        a = int(255 * max(0.0, min(1.0, rel)) ** 1.2)
        md.line([(x, 0), (x, ch)], fill=a)
    bg.paste(cov_resized, (cx, cy), mask_cov)

    # Gradiente izquierdo oscuro estilo MR-
    sombra = Image.new("L", (W, H), 0)
    sd = ImageDraw.Draw(sombra)
    lim = int(W * 0.70)
    for x in range(lim):
        sd.line([(x, 0), (x, H)], fill=int(235 * (1 - x / lim) ** 1.35))
    # Sombra también en esquina superior derecha para el sello MR
    sombra_r = Image.new("L", (W, H), 0)
    sdr = ImageDraw.Draw(sombra_r)
    for x in range(int(W * 0.74), W):
        rel = max(0.0, (x - W * 0.74) / (W * 0.26))
        sdr.line([(x, 0), (x, H)], fill=int(165 * (rel ** 1.3)))
    bg.paste((11, 9, 13), mask=sombra)
    bg.paste((11, 9, 13), mask=sombra_r)

    d = ImageDraw.Draw(bg)
    x0 = int(W * 0.046)

    f_kicker = fnt("/System/Library/Fonts/Avenir Next Condensed.ttc", int(H * 0.036), 2)
    f_title = fnt("/System/Library/Fonts/Supplemental/DIN Condensed Bold.ttf", int(H * 0.22), 0)
    f_sub = fnt("/System/Library/Fonts/Avenir Next Condensed.ttc", int(H * 0.056), 2)
    f_tag = fnt("/System/Library/Fonts/Avenir Next.ttc", int(H * 0.035), 5)

    y_kicker = int(H * 0.14)
    d.text(
        (x0, y_kicker),
        "THE HILLS PRESS · FORJADO EN LA OSCURIDAD · EDICIÓN EN ESPAÑOL",
        font=f_kicker,
        fill=(201, 154, 46),
    )

    y_title = int(H * 0.22)
    d.text((x0, y_title), "WICKED ONES", font=f_title, fill=(243, 239, 230))

    y_rule = int(H * 0.56)
    d.rectangle([x0, y_rule, x0 + int(W * 0.085), y_rule + max(3, int(H * 0.007))], fill=(208, 68, 55))

    y_sub = int(H * 0.61)
    d.text(
        (x0, y_sub),
        "CONTENIDO COMPLETO Y CAMPAÑA «EL VALLE SILENCIOSO»",
        font=f_sub,
        fill=(224, 168, 72),
    )

    y_tag = int(H * 0.72)
    d.text(
        (x0, y_tag),
        "Salas N1–N2 · trampas · criaturas · 30 aventureros · 4 entornos · modo solitario · Foundry VTT v13 | v14",
        font=f_tag,
        fill=(214, 220, 222),
    )

    # Sello oficial MR- en la esquina superior derecha (idéntico a mr-ultimo-descenso)
    if LOGO_MARFIL.exists():
        mono = Image.open(LOGO_MARFIL).convert("RGBA")
        mono.thumbnail((int(W * 0.16), int(H * 0.26)), Image.Resampling.LANCZOS)
        lx = W - mono.width - int(W * 0.035)
        ly = int(H * 0.07)
        bg.paste(mono, (lx, ly), mono)

    if out_path.suffix.lower() == ".webp":
        bg.save(out_path, "WEBP", quality=90)
    else:
        bg.save(out_path, "PNG", optimize=True)
    doc.close()


def main():
    render_banner(DOCS_IMG / "banner.webp", 1600, 560)
    render_banner(DOCS_IMG / "social.png", 1280, 640)

    # Copiar capturas/escenas de muestra para la galería del README
    previews = {
        "portada.webp": "foundry-portada.webp",
        "valle-dj.webp": "foundry-valle.webp",
        "cueva-caravana-dj.webp": "foundry-cueva.webp",
        "defensa-mazmorra.webp": "foundry-guarida.webp",
    }
    for src_name, dst_name in previews.items():
        src = R / "assets" / "escenas" / src_name
        if src.exists():
            shutil.copy2(src, DOCS_IMG / dst_name)
    print("Banners y vistas previas generados en docs/img/")


if __name__ == "__main__":
    main()
