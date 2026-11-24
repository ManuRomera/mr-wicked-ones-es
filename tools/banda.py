#!/usr/bin/env python3
"""Banda sonora de MR- Wicked Ones a partir de grabaciones con licencia libre (ver NOTICE.md):
música de Scott Buckley (scottbuckley.com.au, CC BY 4.0) y efectos/ambientes de Freesound (CC0).
Todo pasa por el mismo master «de cueva» (EQ + compresión suave) y los efectos comparten la misma sala de piedra, para que
suene a una sola banda sonora. La música suena entera con fundido circular de 6 s (sin hueco); los ambientes, en bucle, loudnorm −26 LUFS.
Fuentes en «Trabajo WO/audio-fuentes» (buckley/*.mp3, freesound/*.ogg; lista.txt con autores y enlaces).
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

# música por escena (mismas claves que las escenas y Dirección) y estados (motivos de Dirección): Scott Buckley
# (scottbuckley.com.au, CC BY 4.0), obras completas de 2,5 a 9 min en audio-fuentes/buckley. Cada una suena entera y el final
# enlaza con el principio con un fundido largo: nada de bucles cortos que se repiten como un disco rayado.
MUSICA = {
    "musica/acecho": ("sb_sanctuary.mp3", "Sanctuary"), "musica/valle": ("PathThroughTheMountains.mp3", "Path Through The Mountains"),
    "musica/incursion": ("IntoTheWilds.mp3", "Into The Wilds"), "musica/cueva": ("descent.mp3", "Descent"),
    "musica/taller": ("PumpkinPolka.mp3", "Pumpkin Polka"), "musica/abadia": ("PassageOfTime.mp3", "Passage of Time"),
    "musica/ritual": ("sb_thesummoning.mp3", "The Summoning"), "musica/invasion": ("sb_legionnaire2022.mp3", "Legionnaire (2022 Remaster)"),
    "musica/consejo": ("Juggernaut.mp3", "Juggernaut"), "musica/climax": ("sb_goliath.mp3", "Goliath"),
    "musica/cloacas": ("HourOfTheWitch.mp3", "Hour Of The Witch"), "musica/mares": ("ThreeSheetsToTheWind.mp3", "Three Sheets to the Wind"),
    "musica/guerra": ("sb_primalcarnage.mp3", "Primal Carnage"), "musica/excavacion": ("SongOfTheForge.mp3", "Song Of The Forge"),
    "musica/cripta": ("sb_theoldones.mp3", "The Old Ones"), "musica/banquete": ("sb_theblackwaltz.mp3", "The Black Waltz"),
    "estados/sigilo": ("sb_intervention.mp3", "Intervention"), "estados/tension": ("Anabasis_I.mp3", "The Weight of Air – Anabasis I"),
    "estados/combate": ("sb_terminus.mp3", "Terminus"), "estados/triunfo": ("sb_marchofmidnight.mp3", "March of Midnight"),
    "estados/derrota": ("ADragonsLullaby2023.mp3", "A Dragon’s Lullaby (2023 Remaster)"), "estados/misterio": ("Balefire.mp3", "Balefire"),
    "estados/juerga": ("HonourAmongThieves.mp3", "Honour Among Thieves"),
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
    x = sin_cola(lee(SRC / "buckley" / MUSICA[clave][0]))
    x = x[np.where(np.abs(x).max(axis=1) > 10 ** (-50 / 20))[0][0]:]   # fuera el silencio inicial
    print(f"  {clave}: {MUSICA[clave][1]}, {len(x) / SR:.0f} s")
    escribe(bucle(x, 6.0), OUT / f"{clave}.ogg", True, CINTA)


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
