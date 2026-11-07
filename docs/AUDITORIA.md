# Auditoría de MR- Wicked Ones (v1.0.0 → v2.0.0)

Informe de lo que se encontró en la v1.0.0 (publicada el 05-nov-2026) y de lo que cambia en la v2.0.0. Las reglas del libro se citan solo aquí, nunca en la interfaz.

## 1. Fallos de la v1.0.0

| Área | Qué pasaba | Qué se hizo en la 2.0.0 |
|---|---|---|
| **Importación** | La importación automática de la campaña estaba rota en Foundry 13 (`adv.sheet._importContent` ya no existe) y fallaba con `Cannot read properties of undefined (reading 'createDocuments')`. | `adv.import({dialog:false, preImport})` (`js/inicio.mjs`), con asistente al principio: **importar todo al mundo** o **solo ordenar los compendios**. |
| **Mundo vacío** | `mundoVacio()` exigía 0 escenas, pero Foundry crea una escena de bienvenida (fondo `nue/…`): el módulo nunca se consideraba en un mundo nuevo. | Se ignora la escena de bienvenida. |
| **Modo oscuro** | Pintaba el fondo oscuro pero dejaba los PNG negros del sistema (casillas de habilidad, conmoción, reventado, reloj de estrés, corazones vacíos…) invisibles. | `tools/gen_oscuro.py` lee el CSS compilado del sistema y recolorea con un filtro todas las reglas que pintan esos PNG (47 selectores), más un tema «pergamino oscuro» coherente. |
| **Ficha compacta** | Solo `max-height: 620px` y ocultar la decoración: un recorte. | Re-composición real (`js/ficha.mjs` + `styles/compacta.css`): cabecera con retrato, contadores, defensas/estrés, tres atributos en columnas y secciones plegables que conviven; recuerda tamaño, posición y secciones por ficha. |
| **Carpetas** | Nada ordenado: ni actores, ni objetos, ni escenas, ni compendios. | Carpetas dentro de cada compendio y en la aventura (actores por tipo y entorno, objetos por categoría, escenas por tipo, diarios, tablas, listas de reproducción) y compendios en `packFolders`; los del sistema se agrupan aparte («Wicked Ones · Sistema base»). |
| **Compendios** | 7, con `facciones-es` mezclando facciones, personajes, esbirros, grupos, mazmorra y panel del DJ. | 10: personajes, esbirros, facciones y grupos separados. |
| **Aventura** | Solo `labores + equipo[:25] + aventureros[:15]` (corte arbitrario), sin carpetas, sin listas de reproducción. | Todo el contenido (361 objetos, 66 actores, 21 escenas, 13 diarios, 16 tablas, macros, listas de reproducción). |
| **Escenas** | Páginas del PDF (mapas con rótulos del libro), sin lectura, sin música, sin miniaturas. | Arte nuevo; cada escena con **lectura** (diario «Lecturas de escena» + nota de mapa), **música** y **efectos** (MR- Dirección), miniatura y marca MR animada. |
| **Imágenes** | Recortes y gráficos mal hechos del PDF de The Hills Press (arte de Victor Costa). | Todo regenerado en local con Flux (Draw Things) en el estilo gráfico de *Wicked Ones*. |
| **Paquete de Dirección** | Escenas con solo nombre e icono; motivos sin sonido. | Esquema 1 completo: lecturas, música, efectos, motivos, hitos R1–R6 y relojes con frases. |
| **Automatismos** | Las reglas de resistencia no eran las del libro (ver §2). | `js/automatismos.mjs`. |

## 2. Reglas verificadas contra el libro (*Wicked Ones* 1.4, CC0)

- **Resistencias**: fallo 3 de Estrés, parcial 2, éxito 1; crítico despeja 1. La v1.0.0 aplicaba 2/1/0/0 (de otro juego Forged in the Dark).
- **Estrés**: reloj de 6; al llenarse, el personaje se desata (feral) y el desbordamiento se ignora.
- **Conmoción**: −1D en la siguiente acción o resistencia del atributo; se limpia tras la tirada.
- **EXP de práctica**: tirada de acción o resistencia con una acción sin puntos → 1 de práctica; a la tercera sube a 1 punto.
- **Corazón Oscuro**: +1D en una tirada de acción o resistencia, uno por tirada.
- **EXP Osada**: máximo 1 por sesión, al desatarse o quedar reventado interpretándolo (se ofrece, no se marca sola).

### Automatismos que ya están (y los que no, a propósito)
| Regla | Estado |
|---|---|
| Estrés de las resistencias, crítico que despeja | Automático (desactivable) |
| Estado «desatado» al llenar el Estrés + tarjeta con los pasos | Automático |
| Conmoción que se limpia | Automático |
| EXP de práctica | Automático |
| Gastar Corazón Oscuro (+1D) con recálculo y corrección del Estrés | Botón en la tarjeta |
| Tiradas de desastre, represalia, defensas de mazmorra e incursión de esbirros | Tarjetas con botones (ya estaban) |
| EXP Malvada, EXP Osada, Oro, Suministros | A propósito, a mano: dependen de la ficción y de la mesa |
| Capacidades que cuestan Estrés | A propósito, a mano: no hay una regla única |
| Posición y efecto, «ir a por todas» | A propósito, a mano: es decisión de mesa |

## 3. Pendientes y riesgos
- **Licencia del texto**: *Wicked Ones* 1.4 (Ben Nielson) es CC0, pero el contenido en español (campaña «El Valle Silencioso», 48 facciones, tablas…) procede de la edición de The Hills Press, que puede llevar material propio con derechos. Conviene confirmarlo con la editorial antes de seguir distribuyéndolo.
- **Foundry 14**: sin probar (solo 13.351). El código pasa por `compat.mjs` y las hojas V1 del sistema siguen funcionando, pero hay que verificarlo.
- **Mapas tácticos**: son arte cenital con cuadrícula superpuesta; no llevan muros ni luces.
- **Audio**: sintetizado (sin muestras), evaluado por niveles y estado, no al oído.
- **Arte generado**: algún trazo puede llevar una firma ilegible típica del modelo; si se ve, se regenera esa pieza (`tools/arte/`).

## 4. Cómo se reconstruye
```bash
python3 tools/arte/generar.py     # arte con Draw Things (API en 127.0.0.1:7860), reanudable
python3 tools/ingest_arte.py      # raw → assets/ (alfa, retratos, tokens, figuras, escenas, marca MR)
python3 tools/audio.py            # música y efectos
npm run datos                     # _data → _pack (carpetas, imágenes, escenas, lecturas, Dirección)
npm test && npm run build         # tests y compendios + dist/module.zip
```
