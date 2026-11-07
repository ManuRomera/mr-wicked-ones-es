#!/usr/bin/env python3
"""Banda sonora propia de MR- Wicked Ones: reutiliza el sintetizador de Nádir (tools/audio_base.py, misma licencia) y añade
recetas de fantasía oscura: fuego, agua, viento, coro de formantes, piedra y yunque. Todo es obra original (sin muestras).
Música: bucles de 96 s sin costura (Ogg Opus). Efectos: 2-8 s.
Uso: python3 tools/audio.py [clave ...]  →  assets/audio/{musica,sfx}/<clave>.ogg   (sin argumentos: todo)"""
import os
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
import audio_base as A  # noqa: E402

SR, D1 = A.SR, A.D1

# clave: (raíz Hz, brillo, bpm del pulso o 0, pings/min, textura, tensión)
MUSICA = {
    "acecho":     (D1 * 0.75, 0.25, 0, 2, "agua", 0.30),      # la guarida en calma: gotas y un coro lejano
    "valle":      (D1 * 1.5, 0.40, 0, 3, "viento", 0.15),     # el valle: viento y campanas
    "incursion":  (D1, 0.35, 72, 2, "piedra", 0.60),          # pulso de tambor, piedra que cruje
    "cueva":      (D1 * 0.75, 0.25, 0, 4, "agua", 0.45),
    "taller":     (D1, 0.40, 84, 1, "yunque", 0.45),          # forja y alquimia
    "abadia":     (D1 * 1.5, 0.20, 0, 2, "coro", 0.30),
    "ritual":     (D1 * 0.75, 0.30, 52, 1, "coro", 0.85),
    "invasion":   (D1, 0.55, 104, 2, "yunque", 0.95),         # tambores de guerra
    "consejo":    (D1 * 0.75, 0.30, 0, 2, "fuego", 0.45),
    "climax":     (D1, 0.55, 120, 3, "coro", 0.98),
    "cloacas":    (D1 * 0.75, 0.30, 0, 3, "agua", 0.55),
    "mares":      (D1 * 1.5, 0.35, 0, 3, "viento", 0.30),
    "guerra":     (D1, 0.45, 88, 2, "yunque", 0.70),
    "excavacion": (D1, 0.35, 76, 1, "piedra", 0.40),
    "cripta":     (D1 * 0.75, 0.20, 0, 2, "coro", 0.65),
    "banquete":   (D1 * 1.5, 0.45, 96, 4, "fuego", 0.35),
}
A.MUSICA.update(MUSICA)
_textura = A.textura


def coro(n, rng):
    """Voces de formantes («a», «o») que respiran despacio, sin palabras."""
    y = np.zeros(n)
    t = A.t_axis(n / SR)[:n]
    for f0 in (110.0, 146.8, 164.8, 220.0):
        v = np.sin(2 * np.pi * f0 * t + 2 * np.sin(2 * np.pi * 5 * t) * 0.01)
        sw = 0.5 + 0.5 * np.sin(2 * np.pi * rng.uniform(0.02, 0.05) * t + rng.uniform(0, 6.28))
        y += (A.reso(v + A.noise(n, rng, "pink") * 0.4, 700, 8) + A.reso(v, 1100, 10)) * sw ** 2
    return y


def textura(kind, n, rng, t):
    if kind == "fuego":
        y = np.zeros(n)
        for _ in range(int(n / SR * 14)):
            A.place(y, A.burst(0.05, rng, 1500, 6000, 0.01) * rng.uniform(0.2, 1), rng.integers(0, n))
        return A.normal(A.band(A.noise(n, rng, "pink"), 80, 500)) * 0.4 + A.normal(y) * 0.5
    if kind == "agua":
        y = np.zeros(n)
        for _ in range(int(n / SR * 1.2)):
            f = rng.uniform(500, 1400)
            tt = A.t_axis(0.18)
            A.place(y, np.sin(2 * np.pi * (f + 600 * tt) * tt) * np.exp(-tt * 28) * rng.uniform(0.3, 1), rng.integers(0, n))
        return A.normal(A.band(A.noise(n, rng, "pink"), 120, 900) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.05 * t))) * 0.35 + A.normal(y) * 0.6
    if kind == "viento":
        env = 0.5 + 0.5 * np.sin(2 * np.pi * 0.04 * t + np.sin(2 * np.pi * 0.013 * t) * 2)
        return A.normal(A.reso(A.noise(n, rng, "pink"), 450, 3) * env ** 2) * 0.7
    if kind == "coro":
        return A.normal(coro(n, rng)) * 0.8
    if kind == "piedra":
        y = np.zeros(n)
        for _ in range(int(n / SR * 0.5)):
            A.place(y, A.burst(0.6, rng, 80, 900, 0.12) * rng.uniform(0.2, 1), rng.integers(0, n))
        return A.normal(A.band(A.noise(n, rng, "pink"), 40, 220)) * 0.5 + A.normal(y) * 0.5
    if kind == "yunque":
        y = np.zeros(n)
        for k in range(int(n / SR / 1.4)):
            A.place(y, A.bell(rng.choice([420, 530, 640]), 0.9, rng, partials=(1, 2.3, 4.1, 6.7), decay=0.3) * 0.7, (k * 1.4 + rng.uniform(0, 0.2)) * SR)
        return A.normal(A.band(A.noise(n, rng, "pink"), 60, 600)) * 0.3 + A.normal(y) * 0.6
    return _textura(kind, n, rng, t)


A.textura = textura


# ------------------------------------------------------------------ efectos
def f_puerta(t, n, rng):      # portón de piedra que se arrastra y cede
    y = A.band(A.noise(n, rng, "pink"), 40, 260) * A.adsr(n, 0.15, 0.6)
    y += A.burst(n / SR, rng, 120, 1200, 0.5) * 0.2
    A.place(y, A.thump(40, 0.9, 1.5) * 1.5, int(n * 0.8))
    return y


def f_trampa(t, n, rng):      # clic, muelle y golpe seco
    y = np.zeros(n)
    A.place(y, A.burst(0.03, rng, 1500, 5000, 0.004) * 1.5, int(0.2 * SR))
    tt = A.t_axis(0.5)
    A.place(y, np.sin(2 * np.pi * (300 + 1800 * tt) * tt) * np.exp(-tt * 9) * 0.5, int(0.25 * SR))
    A.place(y, A.thump(70, 0.7, 2.5) * 1.6, int(0.55 * SR))
    return y


def f_gong(t, n, rng):
    y = np.zeros(n)
    A.place(y, A.bell(110, 7, rng, partials=(1, 1.52, 2.1, 2.74, 3.4), decay=1.0) * 1.4, 0)
    A.place(y, A.thump(60, 1.2, 1.2), 0)
    return y


def f_rugido(t, n, rng):      # gruñido grave modulado
    f = 70 + 25 * np.sin(2 * np.pi * 3.5 * t) + 20 * np.sin(2 * np.pi * 7 * t)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.5 * np.sign(np.sin(2 * np.pi * np.cumsum(f * 2) / SR))
    y = A.reso(y + A.noise(n, rng, "pink") * 0.6, 260, 5)
    return y * A.adsr(n, 0.25, 0.6)


def f_antorcha(t, n, rng):    # fuego y viento
    return textura("fuego", n, rng, t) + textura("viento", n, rng, t) * 0.6


def f_derrumbe(t, n, rng):
    y = np.zeros(n)
    for _ in range(26):
        A.place(y, A.burst(rng.uniform(0.1, 0.5), rng, 90, 1400, 0.1) * rng.uniform(0.2, 1), int(rng.uniform(0, 0.7) * n))
    return (y + A.band(A.noise(n, rng, "pink"), 30, 200)) * A.env_exp(n, 1.2) * 1.5


def f_reloj(t, n, rng):       # tictac que se acelera
    y = np.zeros(n)
    p, k = 0.0, 0
    while p < n / SR - 0.2:
        A.place(y, A.burst(0.04, rng, 1800, 6000, 0.006) * (1.4 if k % 2 == 0 else 0.9), int(p * SR))
        p += max(0.18, 0.62 - 0.045 * k); k += 1
    return y


DISPAROS = {"puerta": (f_puerta, 5), "trampa": (f_trampa, 2.5), "gong": (f_gong, 7), "rugido": (f_rugido, 4), "derrumbe": (f_derrumbe, 5), "reloj": (f_reloj, 6)}
AMBIENTES = {"antorcha": f_antorcha}

if __name__ == "__main__":
    out = ROOT / "assets" / "audio"
    pedidas = set(sys.argv[1:])
    for k in MUSICA:
        if not pedidas or k in pedidas:
            A.save(A.musica(k), str(out / "musica" / f"{k}.ogg"))
            print("música", k, flush=True)
    for k, fn in AMBIENTES.items():
        if not pedidas or k in pedidas:
            A.save(A.amb_loop(fn, k, rms=-24), str(out / "sfx" / f"{k}.ogg"))
            print("ambiente", k, flush=True)
    for k, (fn, sec) in DISPAROS.items():
        if not pedidas or k in pedidas:
            A.save(A.one_shot(fn, k, sec), str(out / "sfx" / f"{k}.ogg"))
            print("disparo", k, flush=True)
