#!/usr/bin/env python3
"""
Genera los gráficos del constructor de mazmorras en assets/wicked-isometric/:
  terrain/{bedrock,earth,tunnel}_iso.webp      texturas continuas generadas con ruido (sin IA)
  rooms/floor_<tipo>_iso.webp                  suelo de cada tipo de sala (losas, tablones…)
  rooms/room_<tipo>_iso.webp                   suelo + emblema brillante (la pieza del centro de la sala)
  objetos/<nombre>_iso.webp                    mobiliario y puertas (recortados de las imágenes de IA; ver OBJETOS)
Uso:  python3 tools/mazmorra_assets.py [carpeta_con_raw]     (por defecto: Trabajo WO/mazmorra/raw)
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / "assets" / "wicked-isometric"
RAW = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/Volumes/Datos_Dock/FoundryVTT/Trabajo WO/mazmorra/raw")
N = 256


def ruido(beta=2.0, seed=0, n=N):
    """Ruido continuo (se repite sin costuras): ruido blanco filtrado en frecuencia, normalizado a 0..1."""
    rng = np.random.default_rng(seed)
    f = np.fft.fftfreq(n)
    r2 = f[:, None] ** 2 + f[None, :] ** 2
    r2[0, 0] = 1
    espectro = (rng.normal(size=(n, n)) + 1j * rng.normal(size=(n, n))) / (r2 ** (beta / 2))
    a = np.fft.ifft2(espectro).real
    return (a - a.min()) / (a.max() - a.min() + 1e-9)


def mezcla(a, b, t):
    t = t[..., None]
    return a * (1 - t) + b * t


def color(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=float)


def a_imagen(arr):
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB")


def guardar(im, ruta, calidad=88):
    ruta.parent.mkdir(parents=True, exist_ok=True)
    im.save(ruta, "WEBP", quality=calidad, method=6)
    print("  ", ruta.relative_to(RAIZ))


# ----------------------------------------------------------------------------------------------- terreno
def tierra():
    g, f, p, t = ruido(1.7, 1), ruido(0.6, 2), ruido(1.9, 3), ruido(1.2, 4)
    base = mezcla(color("#3a281a"), color("#86623c"), g * 0.6 + t * 0.4)
    base = mezcla(base, color("#241609"), np.clip((0.4 - p) * 4, 0, 1) * 0.75)   # terrones oscuros
    base *= (0.78 + 0.44 * f)[..., None]                                          # grano fino
    rng = np.random.default_rng(7)
    im = a_imagen(base).convert("RGBA")
    d = ImageDraw.Draw(im)
    for _ in range(70):                                                           # guijarros y raíces
        x, y, r = int(rng.integers(0, N)), int(rng.integers(0, N)), int(rng.integers(2, 6))
        gris = 105 + int(rng.integers(-20, 20))
        d.ellipse((x - r, y - r, x + r, y + r), fill=(gris, gris - 8, gris - 16, 255), outline=(36, 26, 20, 255))
        d.arc((x - r, y - r, x + r, y + r), 200, 300, fill=(190, 175, 150, 255))
    return im.convert("RGB")


def roca():
    g, f = ruido(1.6, 11), ruido(0.7, 12)
    r1 = np.abs(ruido(1.5, 13) - 0.5) * 2
    r2 = np.abs(ruido(1.8, 14) - 0.5) * 2
    base = mezcla(color("#14121a"), color("#403b4c"), g)
    base *= (0.75 + 0.5 * f)[..., None]
    grietas = np.clip(np.minimum(r1, r2) * 9, 0, 1)
    base *= (0.35 + 0.65 * grietas)[..., None]                                    # red de grietas
    base += (np.clip(1 - np.minimum(r1, r2) * 9, 0, 1) ** 4)[..., None] * 18      # filo claro en las grietas
    return a_imagen(base)


def tunel():
    g, f, t = ruido(1.7, 21), ruido(0.6, 22), ruido(1.3, 23)
    base = mezcla(color("#58402c"), color("#9a7a52"), g * 0.6 + t * 0.4)
    base *= (0.8 + 0.4 * f)[..., None]
    base *= (1 - 0.3 * (ruido(2.2, 24) > 0.7))[..., None]                         # roderas y huellas
    rng = np.random.default_rng(25)
    im = a_imagen(base).convert("RGBA")
    d = ImageDraw.Draw(im)
    for _ in range(45):                                                           # gravilla
        x, y, r = int(rng.integers(0, N)), int(rng.integers(0, N)), int(rng.integers(1, 4))
        v = 120 + int(rng.integers(-25, 25))
        d.ellipse((x - r, y - r, x + r, y + r), fill=(v, v - 10, v - 24, 255))
    return im.convert("RGB")


# ----------------------------------------------------------------------------------------------- suelos
SUELOS = {
    "santuario": dict(a="#2b0f14", b="#5a2028", tipo="losas", hueco="#0e0405"),
    "tesoro": dict(a="#6e5a34", b="#b89850", tipo="losas", hueco="#2a2010"),
    "enclave": dict(a="#3a3418", b="#6b6430", tipo="tablones", hueco="#15130a"),
    "escondrijo": dict(a="#14282c", b="#2c5058", tipo="losas", hueco="#050e10"),
    "forja": dict(a="#1d1b1b", b="#46403f", tipo="losas", hueco="#050404", brasas=True),
    "fortaleza": dict(a="#2c323c", b="#59616f", tipo="losas", hueco="#0b0d10"),
    "templo": dict(a="#3a3040", b="#8a7f8c", tipo="losas", hueco="#120d14"),
    "menor": dict(a="#3a2c1e", b="#6a5136", tipo="tablones", hueco="#150f09"),
    "guarida": dict(a="#2c2a1a", b="#55502c", tipo="tablones", hueco="#100f08"),
    "prision": dict(a="#1c2024", b="#3d444c", tipo="losas", hueco="#07090b"),
}


def suelo(cfg, semilla):
    a, b = color(cfg["a"]), color(cfg["b"])
    g, f = ruido(2.0, semilla), ruido(1.0, semilla + 1)
    arr = mezcla(a, b, g) * (0.85 + 0.3 * f)[..., None]
    n = 4
    paso = N // n
    rng = np.random.default_rng(semilla + 2)
    hueco = color(cfg["hueco"])
    if cfg["tipo"] == "tablones":
        alto = N // (n * 2)
        for j in range(n * 2):
            y0 = j * alto
            arr[y0:y0 + alto] *= rng.uniform(0.8, 1.12)
            arr[y0:y0 + 3] = hueco
            x = int(((0.25 if j % 2 else 0.0) + 0.5 * (j % 3) / 3) * N) % N
            arr[y0:y0 + alto, x:x + 3] = hueco
    else:
        for j in range(n):
            for i in range(n):
                arr[j * paso:(j + 1) * paso, i * paso:(i + 1) * paso] *= rng.uniform(0.82, 1.16)
        for k in range(n):
            arr[k * paso + 4:k * paso + 7, :] *= 1.18
            arr[:, k * paso + 4:k * paso + 7] *= 1.12
            arr[k * paso:k * paso + 4, :] = hueco
            arr[:, k * paso:k * paso + 4] = hueco
    if cfg.get("brasas"):                                               # grietas con brasas (forja)
        r = np.abs(ruido(2.8, semilla + 5) - 0.5) * 2
        brillo = np.clip(1 - r * 14, 0, 1) ** 2
        arr = arr + brillo[..., None] * np.array([255, 110, 20]) * 0.85
    return a_imagen(arr)


# ----------------------------------------------------------------------------------------------- piezas de IA
def recortar_magenta(ruta, tam=256):
    a = np.asarray(Image.open(ruta).convert("RGB")).astype(float)
    dist = np.sqrt((a[..., 0] - 255) ** 2 + a[..., 1] ** 2 + (a[..., 2] - 255) ** 2)
    alfa = np.clip((dist - 70) / 70, 0, 1)                              # 0 = fondo magenta
    halo = (alfa < 1) & (alfa > 0)                                      # quita el halo magenta de los bordes
    a[halo, 0] = np.minimum(a[halo, 0], a[halo, 1] + 60)
    a[halo, 2] = np.minimum(a[halo, 2], a[halo, 1] + 60)
    out = Image.fromarray(np.dstack([a, alfa * 255]).astype(np.uint8), "RGBA")
    caja = out.getbbox()
    if caja:
        out = out.crop(caja)
    out.thumbnail((tam, tam), Image.LANCZOS)
    return out


def emblema_sobre(suelo_im, ruta, margen=0.1):
    e = np.asarray(Image.open(ruta).convert("RGB").resize((N, N), Image.LANCZOS)).astype(float)
    brillo = e.max(axis=2) / 255.0
    alfa = np.clip((brillo - 0.06) / 0.5, 0, 1) ** 0.8
    ch = int(N * (1 - 2 * margen))
    e_img = Image.fromarray(np.dstack([e, alfa * 255]).astype(np.uint8), "RGBA").resize((ch, ch), Image.LANCZOS)
    base = suelo_im.convert("RGBA")
    pos = ((N - ch) // 2, (N - ch) // 2)
    sombra = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    sombra.paste((0, 0, 0, 120), pos, e_img.split()[3].point(lambda v: int(v * 0.7)))
    base = Image.alpha_composite(base, sombra)
    base.alpha_composite(e_img, pos)
    return base.convert("RGB")


OBJETOS = ("brasero", "pilar", "estandarte", "estatua", "puerta_cerrada", "puerta_abierta",
           "cofre", "oro", "yunque", "horno", "altar", "trono", "estanteria", "mesa", "jergon", "armero", "barril", "jaula")


def main():
    print("Terreno")
    guardar(tierra(), SALIDA / "terrain" / "earth_iso.webp")
    guardar(roca(), SALIDA / "terrain" / "bedrock_iso.webp")
    guardar(tunel(), SALIDA / "terrain" / "tunnel_iso.webp")
    print("Suelos y salas")
    for i, (nombre, cfg) in enumerate(SUELOS.items()):
        s = suelo(cfg, 100 + i * 10)
        guardar(s, SALIDA / "rooms" / f"floor_{nombre}_iso.webp")
        em = RAW / f"emblema_{nombre}.png"
        if em.exists():
            guardar(emblema_sobre(s, em), SALIDA / "rooms" / f"room_{nombre}_iso.webp")
        else:                                                           # sin emblema: el suelo sirve también de miniatura
            guardar(s, SALIDA / "rooms" / f"room_{nombre}_iso.webp")
    print("Objetos")
    for nombre in OBJETOS:
        ruta = RAW / f"objeto_{nombre}.png"
        if ruta.exists():
            guardar(recortar_magenta(ruta), SALIDA / "objetos" / f"{nombre}_iso.webp")
        else:
            print("   (falta", ruta.name + ")")


if __name__ == "__main__":
    main()
