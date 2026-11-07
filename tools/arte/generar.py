"""Cola reanudable de generación de arte con Draw Things (API HTTP en 127.0.0.1:7860, Flux schnell).
Lee manifest*.py (se pueden añadir lotes mientras corre), salta lo ya generado y escribe raw/<id>.png.
Parar: crear el archivo STOP. Registro en cola.log."""
import base64, glob, hashlib, importlib.util, json, os, sys, time, urllib.request, datetime

AQUI = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(AQUI, "raw"); os.makedirs(RAW, exist_ok=True)
URL = "http://127.0.0.1:7860/sdapi/v1/txt2img"

STYLE = {
 "char": ("stylized flat vector gouache illustration in the style of Mike Mignola and the tabletop game Wicked Ones, "
          "bold simple angular shapes, thick dark ink outlines, limited palette of deep crimson red, ochre yellow, olive green, "
          "teal and charcoal, subtle paper grain, no text, no frame"),
 "scene": ("dark cinematic illustration in the style of Mike Mignola and the tabletop game Wicked Ones, flat bold angular shapes, "
           "heavy black shadows, limited palette of deep crimson, ochre, olive green, teal and charcoal, grain texture, no text"),
 "map": ("flat bold shapes with thick ink outlines in the style of Wicked Ones tabletop game art, colored in olive green, teal, ochre and crimson, "
         "no text"),
 "icon": ("stylized flat vector gouache illustration in the style of Mike Mignola and the tabletop game Wicked Ones, "
          "bold simple shapes, thick dark ink outlines, limited palette of crimson, ochre, olive green and teal, single object centered, "
          "plain warm cream background, no text, no frame"),
}
KIND_STYLE = {"fig": "char", "bust": "char", "group": "char", "god": "char", "creature": "char",
              "scene": "scene", "map": "map", "icon": "icon", "emblem": "icon", "tile": "scene"}

def log(m):
    with open(os.path.join(AQUI, "cola.log"), "a") as f:
        f.write(f"{datetime.datetime.now().isoformat(timespec='seconds')} {m}\n")

def cargar():
    out = []
    for p in sorted(glob.glob(os.path.join(AQUI, "manifest*.py"))):
        spec = importlib.util.spec_from_file_location(os.path.basename(p)[:-3], p)
        m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
        out += m.build()
    out.sort(key=lambda e: (e["prio"], e["id"]))
    return out

def generar(e):
    estilo = STYLE[KIND_STYLE.get(e["kind"], "char")]
    seed = int(hashlib.md5(e["id"].encode()).hexdigest()[:7], 16)
    body = {"prompt": f'{e["prompt"]}, {estilo}', "width": e["w"], "height": e["h"], "seed": seed, "batch_size": 1}
    req = urllib.request.Request(URL, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    r = json.load(urllib.request.urlopen(req, timeout=1500))
    return base64.b64decode(r["images"][0])

def main():
    while not os.path.exists(os.path.join(AQUI, "STOP")):
        pend = [e for e in cargar() if not os.path.exists(os.path.join(RAW, e["id"] + ".png"))]
        if not pend:
            time.sleep(60); continue
        e = pend[0]; t = time.time()
        try:
            png = generar(e)
            tmp = os.path.join(RAW, e["id"] + ".tmp"); open(tmp, "wb").write(png)
            os.replace(tmp, os.path.join(RAW, e["id"] + ".png"))
            log(f'OK {e["id"]} {time.time()-t:.0f}s ({len(pend)-1} pendientes)')
        except Exception as ex:
            log(f'ERR {e["id"]} {ex}'); time.sleep(30)

if __name__ == "__main__":
    main()
