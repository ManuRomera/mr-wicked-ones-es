#!/usr/bin/env python3
"""Procesa el arte generado con Draw Things (Trabajo WO/arte/raw/<id>.png) y lo deja listo en assets/.
  adv-*/pj-* (-fig, -bust) -> figuras/ (alfa, escala MR- Dirección), retratos/, tokens/ (redondo con aro)
  esb-*  (grupo)           -> figuras/, retratos/, tokens/
  cri-*  (criatura)        -> retratos/, tokens/
  dios-*                   -> dioses/ (alfa)
  esc-*, mapa-*            -> escenas/ (1920x1080) + thumbs/
  ico-*                    -> iconos/ (256, alfa)
Toda imagen lleva la marca MR (Trabajo LOGO/marca/marca.py). Idempotente: solo reprocesa lo que cambió.
Uso: python3 tools/ingest_arte.py [--todo]"""
import json, os, sys, shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

AQUI = Path(__file__).resolve().parent
MOD = AQUI.parent
RAW = Path("/Volumes/Datos_Dock/FoundryVTT/Trabajo WO/arte/raw")
A = MOD / "assets"
sys.path.insert(0, os.environ.get("MR_MARCA", "/Volumes/Datos_Dock/FoundryVTT/Trabajo LOGO/marca"))
import marca  # noqa: E402  (regla de la casa: toda imagen lleva la marca MR)

TODO = "--todo" in sys.argv
COLORES = {"pj": (196, 154, 69, 255), "adv": (127, 149, 181, 255), "esb": (111, 143, 74, 255),
           "cri": (168, 50, 40, 255), "dios": (123, 67, 151, 255), "ico": (196, 154, 69, 255)}


def reciente(src, dst):
    return TODO or not dst.exists() or dst.stat().st_mtime < src.stat().st_mtime


def quitar_fondo(im, umbral=46):
    """Fondo liso (blanco/crema) -> alfa, por relleno desde los bordes; el trazo oscuro de las figuras lo frena."""
    im = im.convert("RGB")
    w, h = im.size
    marca_px = (255, 0, 255)
    trabajo = im.copy()
    semillas = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2),
                (w // 4, 0), (3 * w // 4, 0), (w // 4, h - 1), (3 * w // 4, h - 1)]
    for s in semillas:
        if trabajo.getpixel(s) != marca_px:
            ImageDraw.floodfill(trabajo, s, marca_px, thresh=umbral)
    # Bolsillos de fondo cerrados por el trazo (entre piernas, brazos y armas): blanco puro de cierta extensión
    import numpy as np
    otro = (254, 0, 254)
    arr = np.asarray(trabajo)
    pura = (arr.min(axis=2) >= 252)
    ys, xs = np.nonzero(pura[::12, ::12])
    for y, x in zip(ys * 12, xs * 12):
        if trabajo.getpixel((int(x), int(y))) in (marca_px, otro):
            continue
        copia = trabajo.copy()
        antes = int((np.asarray(trabajo) == otro).all(axis=2).sum())
        ImageDraw.floodfill(trabajo, (int(x), int(y)), otro, thresh=3)
        area = int((np.asarray(trabajo) == otro).all(axis=2).sum()) - antes
        if area < 450:
            trabajo = copia
    a_t = np.asarray(trabajo)
    fondo = (a_t == marca_px).all(axis=2) | (a_t == otro).all(axis=2)
    alfa = Image.fromarray(np.where(fondo, 0, 255).astype("uint8"))
    alfa = alfa.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.1))   # come el halo claro y suaviza
    out = im.convert("RGBA")
    out.putalpha(alfa)
    return out


def figura(src, dst, lado=1024, visible=0.885, pie=0.055):
    """Figura de cuerpo entero (alfa) -> lienzo cuadrado transparente: alto 88,5 %, pies a 5,5 % del borde."""
    im = quitar_fondo(Image.open(src))
    box = im.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox()
    if not box:
        return
    im = im.crop(box)
    alto = round(lado * visible); ancho = round(im.width * alto / im.height)
    if ancho > lado:
        ancho, alto = lado, round(im.height * lado / im.width)
    im = im.resize((ancho, alto), Image.LANCZOS)
    out = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))
    out.alpha_composite(im, ((lado - ancho) // 2, round(lado * (1 - pie)) - alto))
    out = marca.hombro(out)
    dst.parent.mkdir(parents=True, exist_ok=True)
    out.save(dst, "WEBP", quality=88, method=6)


def retrato(src, dst, lado=512):
    im = Image.open(src).convert("RGB")
    s = min(im.size)
    im = im.crop(((im.width - s) // 2, 0, (im.width - s) // 2 + s, s)).resize((lado, lado), Image.LANCZOS)
    im = marca.esquina(im)
    dst.parent.mkdir(parents=True, exist_ok=True)
    im.save(dst, "WEBP", quality=86, method=6)


def token(src, dst, color, arriba=0.04, zoom=1.0):
    """Token circular: cuadrado desde arriba (donde está la cara) con aro de color; marca discreta en la ropa."""
    im = Image.open(src).convert("RGB")
    lado = int(min(im.size) / zoom)
    x0 = (im.width - lado) // 2
    y0 = min(int(im.height * arriba), im.height - lado)
    im = im.crop((x0, y0, x0 + lado, y0 + lado)).resize((400, 400), Image.LANCZOS)
    out = Image.new("RGBA", (400, 400), (0, 0, 0, 0))
    m = Image.new("L", (400, 400), 0); ImageDraw.Draw(m).ellipse([6, 6, 394, 394], fill=255)
    out.paste(im, (0, 0), m)
    d = ImageDraw.Draw(out)
    d.ellipse([6, 6, 394, 394], outline=(20, 14, 12, 255), width=22)
    d.ellipse([10, 10, 390, 390], outline=color, width=12)
    out = marca.discreta(out, 329, 329, 17, contraste=.22)
    dst.parent.mkdir(parents=True, exist_ok=True)
    out.save(dst, "WEBP", quality=90, method=6)


DIMS = {}


def escena(src, dst, thumb):
    im = Image.open(src).convert("RGB")
    ancho = 2000 if "guarida" in src.stem or "cueva-mercader" in src.stem else 1920
    im = im.resize((ancho, round(ancho * im.height / im.width)), Image.LANCZOS)
    DIMS[src.stem] = list(im.size)
    t = im.copy(); t.thumbnail((400, 400)); thumb.parent.mkdir(parents=True, exist_ok=True); t.save(thumb, "WEBP", quality=78)
    im = marca.esquina(im)
    dst.parent.mkdir(parents=True, exist_ok=True)
    im.save(dst, "WEBP", quality=86, method=6)


def icono(src, dst):
    im = quitar_fondo(Image.open(src), umbral=38)
    box = im.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox()
    if box:
        im = im.crop(box)
    lado = max(im.size)
    out = Image.new("RGBA", (lado, lado), (0, 0, 0, 0)); out.alpha_composite(im, ((lado - im.width) // 2, (lado - im.height) // 2))
    out = out.resize((256, 256), Image.LANCZOS)
    dst.parent.mkdir(parents=True, exist_ok=True)
    out.save(dst, "WEBP", quality=88, method=6)


def main():
    n = 0
    for src in sorted(RAW.glob("*.png")):
        k = src.stem
        tipo = k.split("-")[0]
        try:
            if tipo in ("pj", "adv") and k.endswith("-fig"):
                base = k[:-4]; dst = A / "figuras" / f"{base}.webp"
                if reciente(src, dst): figura(src, dst); n += 1
            elif tipo in ("pj", "adv") and k.endswith("-bust"):
                base = k[:-5]
                if reciente(src, A / "retratos" / f"{base}.webp"):
                    retrato(src, A / "retratos" / f"{base}.webp"); token(src, A / "tokens" / f"{base}.webp", COLORES[tipo], zoom=1.15); n += 1
            elif tipo == "esb":
                if reciente(src, A / "figuras" / f"{k}.webp"):
                    figura(src, A / "figuras" / f"{k}.webp", visible=0.8); retrato(src, A / "retratos" / f"{k}.webp"); token(src, A / "tokens" / f"{k}.webp", COLORES["esb"], zoom=1.25); n += 1
            elif tipo == "ayu" and k.endswith("-bust"):
                base = k[:-5]
                if reciente(src, A / "retratos" / f"{base}.webp"):
                    retrato(src, A / "retratos" / f"{base}.webp"); token(src, A / "tokens" / f"{base}.webp", (150, 150, 140, 255), zoom=1.1); n += 1
            elif tipo == "cri":
                if reciente(src, A / "retratos" / f"{k}.webp"):
                    retrato(src, A / "retratos" / f"{k}.webp"); token(src, A / "tokens" / f"{k}.webp", COLORES["cri"], arriba=0.0, zoom=1.0); n += 1
            elif tipo == "dios":
                if reciente(src, A / "dioses" / f"{k[5:]}.webp"):
                    im = quitar_fondo(Image.open(src)); im = marca.hombro(im)
                    (A / "dioses").mkdir(parents=True, exist_ok=True); im.save(A / "dioses" / f"{k[5:]}.webp", "WEBP", quality=88, method=6); n += 1
            elif tipo in ("esc", "mapa"):
                if reciente(src, A / "escenas" / f"{k}.webp"):
                    escena(src, A / "escenas" / f"{k}.webp", A / "thumbs" / f"{k}.webp"); n += 1
            elif tipo == "ico":
                if reciente(src, A / "iconos" / f"{k[4:]}.webp"):
                    icono(src, A / "iconos" / f"{k[4:]}.webp"); n += 1
        except Exception as e:
            print("ERROR", k, e)
    if DIMS:
        f = A / "escenas" / "dims.json"
        previas = json.loads(f.read_text()) if f.exists() else {}
        previas.update(DIMS); f.write_text(json.dumps(previas))
    (A / "brand").mkdir(parents=True, exist_ok=True)
    shutil.copy(Path(marca.__file__).parent / "mr-marca.webm", A / "brand" / "mr-marca.webm")
    print(f"{n} imágenes procesadas")


if __name__ == "__main__":
    main()
