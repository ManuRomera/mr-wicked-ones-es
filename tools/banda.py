#!/usr/bin/env python3
"""Banda sonora de MR- Wicked Ones a partir de grabaciones con licencia libre (ver NOTICE.md):
música de OpenGameArt.org (Of Far Different Nature, NorthFantasyMusic y Spring Spring; CC BY 4.0) y efectos/ambientes de Freesound (CC0).
Todo pasa por el mismo master «de cueva» (EQ + compresión suave) y los efectos comparten la misma sala de piedra, para que
suene a una sola banda sonora. Bucles con el corte a compás y fundido circular horneado (sin hueco), loudnorm −26 LUFS.
Fuentes en «Trabajo WO/audio-fuentes» (oga/…, freesound/*.ogg; lista.txt con autores y enlaces).
Uso: python3 tools/banda.py [clave ...]   (p. ej. musica/acecho sfx/gong)"""
import subprocess, sys
from pathlib import Path
import numpy as np

R = Path(__file__).resolve().parent.parent
SRC = Path("/Volumes/Datos_Dock/FoundryVTT/Trabajo WO/audio-fuentes")
OUT = R / "assets" / "audio"
SR = 48000
CINTA = "highpass=f=35,lowpass=f=15000,acompressor=threshold=-20dB:ratio=2:attack=15:release=250"
SALA = "aecho=0.8:0.5:52|117:0.18|0.1"   # bóveda de piedra

# música por escena (mismas claves que las escenas y Dirección) y estados (motivos de Dirección), de OpenGameArt (CC BY):
# OFDN = Of Far Different Nature, «LOOP BOX #3» (ya son bucles sin costura: no se cortan); NFM = NorthFantasyMusic,
# «Fantasy Music and Drum Loops Pack»; SPRING = Spring Spring, «Goblins Soundtrack». Rutas bajo audio-fuentes/oga.
OFDN = "of_far_different_nature_-_loop_box_3_cc-by_-_ogg_files_1/Of Far Different Nature - {} (CC-BY).ogg"
NFM, NFMX = "fantasyambience/FantasyAmbience/{}.wav", "fantasyambience_extended/FantasyAmbience_extended/{}.wav"
MUSICA = {
    "musica/acecho": OFDN.format("Obscurium"), "musica/valle": NFM.format("New_Dawn"), "musica/incursion": OFDN.format("Epic Departure [v2]"),
    "musica/cueva": NFM.format("Dark_and_Mysterious"), "musica/taller": "town_day.flac", "musica/abadia": NFM.format("Temple_of_Light"),
    "musica/ritual": NFMX.format("Threat_From_Another_Realm"), "musica/invasion": NFM.format("Sacred_Guardians"),
    "musica/consejo": OFDN.format("Throne Room [v2]"), "musica/climax": "champion_fight.flac",
    "musica/cloacas": OFDN.format("Underground Town"), "musica/mares": OFDN.format("Ship In A Storm"), "musica/guerra": NFM.format("Storm_Incoming"),
    "musica/excavacion": OFDN.format("Eastern Treasures"), "musica/cripta": OFDN.format("In Darkness [v2]"), "musica/banquete": OFDN.format("Pavane"),
    "estados/sigilo": NFM.format("Nightwatch"), "estados/tension": OFDN.format("Zwischenwelt"), "estados/combate": OFDN.format("Clash"),
    "estados/triunfo": OFDN.format("Adventure Begins"), "estados/derrota": NFM.format("Soft_Strings_and_Flutes"),
    "estados/misterio": NFMX.format("Dreams_of_Magic"), "estados/juerga": "town_night.flac",
}
# ambientes en bucle: capas (archivo, ganancia dB, inicio, duración, retardo)
AMBIENTES = {
    "cueva": [("cueva", 0, 0, 58, 0), ("goteo", -6, 0, 19, 0), ("goteo", -7, 0, 19, 19.5), ("goteo", -6, 0, 19, 39)],
    "fuego": [("fuego", 0, 0, 20, 0)],
    "picos": [("picos", 0, 0, 25, 0)],
    "caldero": [("caldero", 0, 0, 38, 0)],
    "viento": [("viento", 0, 2, 60, 0)],
    "barco": [("barco", 0, 10, 90, 0)],
}
# efectos: capas (archivo, ganancia dB, inicio, duración, retardo)
EFECTOS = {
    "puerta": [("puerta", 0, 0, 3.9)], "trampa": [("trampa", 0, 0, 2.0), ("cadenas", -8, 0.3, 1.2, 0.5)], "gong": [("gong", 0, 0, 9)],
    "rugido": [("rugido", 0, 0, 2.8)], "derrumbe": [("derrumbe", 0, 0, 7)], "reloj": [("reloj", 0, 0, 2.2)],
    "espadas": [("espadas", 0, 0, 1.2)], "conjuro": [("conjuro", 0, 0, 4.5)], "cadenas": [("cadenas", 0, 0, 3.5)],
    "risa": [("risa", 0, 0, 8)], "cuerno": [("cuerno", 0, 0, 4.3)],
}


def lee(ruta, ini=0.0, dur=None):
    cmd = ["ffmpeg", "-v", "error", "-ss", str(ini)] + (["-t", str(dur)] if dur else []) + ["-i", str(ruta), "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"]
    return np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, np.float32).reshape(-1, 2).copy()


def fundidos(x, a=0.005, b=0.08):
    n, na, nb = len(x), int(a * SR), int(b * SR)
    x[:na] *= np.linspace(0, 1, na)[:, None]
    x[n - nb:] *= np.linspace(1, 0, nb)[:, None]
    return x


def bucle(x, xf=4.0):
    """Fundido circular de potencia constante: la cola se funde con el arranque y el archivo empieza donde acaba."""
    n = int(xf * SR)
    t = np.linspace(0, np.pi / 2, n)[:, None]
    cabeza, cola = x[:n], x[-n:]
    return np.concatenate([cola * np.cos(t) + cabeza * np.sin(t), x[n:-n]])


def corte_en_compas(x, n, intro=20):
    """Bucle x[s0:c] con s0 en los primeros `intro` s (para saltar una intro distinta) y c en los últimos ~45 s, elegidos
    para que x[c:] ≈ x[s0:] y el fundido circular no descuadre el ritmo: envolvente de energía a 10 ms y ajuste fino
    por correlación de la onda."""
    from numpy.lib.stride_tricks import sliding_window_view as ventanas
    h = SR // 100
    mono = x.mean(axis=1)
    L = len(mono) // h * h
    env = np.sqrt(np.add.reduceat(mono[:L] ** 2, np.arange(0, L, h)) / h)
    m = 2 * n // h
    norm = lambda W: (W - W.mean(axis=-1, keepdims=True)) / (W.std(axis=-1, keepdims=True) + 1e-9)
    c0 = max(m + intro * 100, len(env) - 4500)
    W = norm(ventanas(env[c0:], m))
    S = norm(ventanas(env[: intro * 100 + m], m)[::10])            # inicios cada 0,1 s
    R = S @ W.T / m
    R[0] += 0.05                                                     # a igualdad, mejor no saltarse nada
    a, b = np.unravel_index(np.argmax(R), R.shape)
    s0, c = a * 10 * h, (c0 + b) * h
    w = mono[s0:s0 + n // 2]
    lo, hi = max(0, c - h), min(len(mono) - n // 2, c + h)
    c = lo + int(np.argmax([float(np.dot(w, mono[k:k + n // 2])) for k in range(lo, hi)]))
    return s0, c, float(R[a, b])


def sin_cola(x, umbral=-50):
    e = np.abs(x).max(axis=1)
    sonido = np.where(e > 10 ** (umbral / 20))[0]
    return x[: sonido[-1] + 1] if len(sonido) else x


def escribe(x, destino, es_bucle, filtro):
    destino.parent.mkdir(parents=True, exist_ok=True)
    ln = "loudnorm=I=-26:TP=-2:LRA=11" if es_bucle else "loudnorm=I=-18:TP=-1.5"
    if es_bucle:   # dos pasadas con ganancia fija: la dinámica de loudnorm daría un salto de volumen en la costura del bucle
        import json
        med = subprocess.run(["ffmpeg", "-v", "info", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", "-af", f"{filtro},{ln}:print_format=json",
                              "-f", "null", "-"], input=x.astype(np.float32).tobytes(), capture_output=True).stderr.decode()
        i = med.rindex("{"); m = json.loads(med[i:med.index("}", i) + 1])
        ln += (f":measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
               f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-",
                    "-af", f"{filtro},{ln}", "-ar", "48000", "-c:a", "libopus", "-b:a", "96k" if es_bucle else "80k", str(destino)],
                   input=x.astype(np.float32).tobytes(), check=True)
    print("hecho", destino.relative_to(R))


def musica(clave):
    x = lee(SRC / "oga" / MUSICA[clave])
    rms = lambda a: float(np.sqrt((a ** 2).mean())) + 1e-9
    if MUSICA[clave].startswith("of_far") and rms(x[-SR // 2:]) > rms(x) / 5:   # bucle de fábrica sin cola apagada: tal cual
        return escribe(x, OUT / f"{clave}.ogg", True, CINTA)
    x = sin_cola(x)
    x = x[: len(x) - int(3 * SR)]   # fuera los últimos 3 s (el final con ritardando)
    n = int(1.5 * SR)
    s0, c, r = corte_en_compas(x, n)
    t = np.linspace(0, np.pi / 2, n)[:, None]
    y = np.concatenate([x[c:c + n] * np.cos(t) + x[s0:s0 + n] * np.sin(t), x[s0 + n:c]])   # tras c sigue x[c:] ≈ x[s0:]
    print(f"  {clave}: bucle {s0 / SR:.1f}–{c / SR:.1f} s de {len(x) / SR:.1f} s (parecido {r:.2f})")
    escribe(y, OUT / f"{clave}.ogg", True, CINTA)


def mezcla(capas, con_retardo):
    pistas = []
    for c in capas:
        nombre, db, ini, dur = c[:4]
        x = fundidos(lee(SRC / "freesound" / f"{nombre}.ogg", ini, dur)) * 10 ** (db / 20)
        if con_retardo and len(c) > 4 and c[4]:
            x = np.concatenate([np.zeros((int(c[4] * SR), 2), np.float32), x])
        pistas.append(x)
    n = max(len(p) for p in pistas)
    return sum(np.pad(p, ((0, n - len(p)), (0, 0))) for p in pistas)


def construir(clave):
    if clave in MUSICA:
        return musica(clave)
    nombre = clave.split("/")[-1]
    if clave.startswith("ambiente/"):
        return escribe(bucle(mezcla(AMBIENTES[nombre], True), 3.0), OUT / f"{clave}.ogg", True, CINTA)
    x = np.concatenate([mezcla(EFECTOS[nombre], True), np.zeros((int(0.8 * SR), 2), np.float32)])   # sitio para la cola de sala
    escribe(fundidos(x, 0.002, 0.3), OUT / f"{clave}.ogg", False, f"{CINTA},{SALA}")


TODO = list(MUSICA) + [f"ambiente/{k}" for k in AMBIENTES] + [f"sfx/{k}" for k in EFECTOS]
if __name__ == "__main__":
    for clave in sys.argv[1:] or TODO:
        construir(clave)
