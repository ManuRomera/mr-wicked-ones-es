<p align="center">
  <img src="docs/img/banner.webp" alt="MR- Wicked Ones — Campaña, compendios y mejoras" width="100%">
</p>

<p align="center">
  <a href="https://github.com/ManuRomera"><img alt="Manu Romera · Digital RPG Design" src="https://raw.githubusercontent.com/ManuRomera/ManuRomera/main/badges/mr-firma.svg" height="28"></a>
  <a href="https://github.com/ManuRomera/mr-wicked-ones-es/releases/latest"><img alt="Versión" src="https://img.shields.io/github/v/release/ManuRomera/mr-wicked-ones-es?style=for-the-badge&color=c49a45&label=release"></a>
  <img alt="Foundry VTT v13" src="https://img.shields.io/badge/Foundry%20VTT-v13-57d8c8?style=for-the-badge">
  <a href="https://github.com/ManuRomera/mr-wicked-ones-es/releases"><img alt="Descargas" src="https://raw.githubusercontent.com/ManuRomera/ManuRomera/main/badges/descargas/mr-wicked-ones-es.svg"></a>
  <img alt="Wicked Ones" src="https://img.shields.io/badge/Wicked%20Ones-CC0-a83228?style=for-the-badge">
  <img alt="Idioma" src="https://img.shields.io/badge/idioma-castellano-0d6670?style=for-the-badge">
  <a href="LICENSE"><img alt="Licencia MIT" src="https://img.shields.io/badge/license-MIT-2b3245?style=for-the-badge"></a>
</p>

<h3 align="center">Lo que le falta al sistema <em>Wicked Ones</em> en Foundry VTT: campaña, compendios, arte propio, ficha compacta, modo oscuro y reglas automatizadas.</h3>

> [!IMPORTANT]
> Este módulo amplía el sistema [**Wicked Ones**](https://foundryvtt.com/packages/wicked-ones) y su traducción [**Wicked Ones (Español)**](https://foundryvtt.com/packages/wicked-ones-esp) con **Babele**. Para la barra del Director de Juego (escenas, música, relojes) instala también [**MR- Dirección**](https://github.com/ManuRomera/mr-direccion).

<p align="center">
  <a href="https://github.com/ManuRomera/mr-wicked-ones-es/releases/latest/download/module.zip"><strong>⬇️ Descargar</strong></a>
  ·
  <a href="#-instalar"><strong>⚡ Instalar</strong></a>
  ·
  <a href="#-qué-trae"><strong>📦 Contenido</strong></a>
  ·
  <a href="#-mejoras-de-juego"><strong>🛠️ Mejoras</strong></a>
</p>

---

## 🏰 La premisa

Sois **monstruos** —orcos, goblins, kóbolds, demonios, serpientes— que excavan su guarida bajo la montaña mientras los «héroes» de la superficie os persiguen. Este módulo trae el contenido que el sistema no incluye, ordenado y con arte propio en el estilo gráfico del juego.

<p align="center">
  <img src="docs/img/escenas.webp" alt="Escenas de la campaña con su lectura y su música" width="100%">
</p>

## 📦 Qué trae

Todo está en carpetas, y los compendios del sistema quedan separados de los de este módulo.

| Compendio | Contenido |
|---|---|
| **Campaña** | «El Valle Silencioso»: 21 escenas ilustradas y mapas, con **lectura**, **música**, **ambiente** y **efectos** propios; 4 listas de reproducción (música, estados, ambientes y efectos); macros. |
| **Libro y referencia** | Diarios por capítulos, «Empieza aquí» y las lecturas de escena. |
| **Tablas** | Las 49 tablas aleatorias del manual, literales: incursiones, invasiones, semillas, pactos, objetos, botín, desastres, represalias, descubrimientos y generador de mazmorras. |
| **Aventureros y ayudantes** | 30 aventureros con sus 6 movimientos y 36 ayudantes, cada uno con retrato. |
| **Salas, trampas, trucos, portones y criaturas** | 204 labores del libro con su texto: 46 salas (nivel 1 a 3 de las cinco temáticas), trampas y portones por nivel, 8 trucos de ejemplo, 36 criaturas y 108 descubrimientos. |
| **Equipo** | Los 108 objetos al azar y los 36 mejunjes, artilugios, pociones y objetos mágicos del libro, con icono. |
| **Personajes · Esbirros · Facciones · Grupos** | 6 pregenerados, 6 manadas, las 62 facciones de ejemplo de los 4 entornos del libro (nivel, rasgos y relojes) y grupos rivales, con retrato, token y figura de cuerpo entero. |

<p align="center">
  <img src="docs/img/carpetas.webp" alt="Actores, objetos y compendios ordenados en carpetas" width="100%">
</p>

## 🛠️ Mejoras de juego

### Crear un monstruo paso a paso (o al azar)
El **creador** sigue el orden del manual: raza, vocación, capacidad de vocación, reparto de acciones (3/2/2/1/1), impulso oscuro, juerga, equipo y suministros con su defensa, y nombre. Cada paso tiene su botón **«Al azar»** y hay un **«Todo al azar»** para tener un monstruo listo en diez segundos. Se abre desde el directorio de Actores («Crear monstruo»), desde la barra de la hoja (para rehacer un personaje) o con `api.abrirCreador()`.

Respeta las reglas del libro (págs. 70 y 89). La vocación **no da puntos de acción**: todos reparten 9 (una acción a 3, dos a 2 y dos a 1), y el clic no deja pasarse. Tampoco hay **nivel de carga**: eliges 4 objetos de equipo con su defensa y 3 de suministro, que en partida sacas tachando una de tus 2 casillas. Primero se ofrecen los **12 objetos de ejemplo de tu vocación**. Como mucho puedes llevar **un objeto valioso** (o **1 oro** en su lugar) y nada poderoso. También puedes dejar el equipo para **decidirlo sobre la marcha**.

### Ventanas que caben en cualquier pantalla
Fichas, creador, lanzador de tiradas, selector y asistentes se **escalan en proporción a la pantalla**: en un portátil de 13″ se ven igual de completas que en un monitor grande y el botón principal nunca queda fuera. Si prefieres otro tamaño, el ajuste de cliente **«Tamaño de las ventanas (%)»** lo fija.

### Banda sonora
Cada escena trae su **música** (obras orquestales completas de **Scott Buckley**, CC BY 4.0), un **ambiente en bucle** (cueva con goteo, braseros, picos, caldero, viento o casco de barco) y sus propios **efectos** en la barra de Dirección. Siete **estados** (sigilo, tensión, combate, misterio, triunfo, derrota y juerga) cambian la música en cualquier momento. Los efectos y ambientes son grabaciones CC0 de Freesound, todo con bucles sin cortes y el mismo master.

### Mapa de los monstruos (sesión 0 y mapa de juego)
Con el botón **«MR · Mapa del entorno»** de la barra de escena se crea el mundo como pide el manual (págs. 294 y 307): sobre un **pergamino viejo, quemado o de piel de bestia** (a elegir) se pinta la región con **52 sellos ilustrados** en el estilo del módulo —terreno, lugares y decorado de monstruos con su **rosa de los vientos** y su cartela—, se trazan ríos y caminos y se colocan **las facciones del sistema**, las vuestras o las 62 del manual, con su imagen, su nivel y su territorio. Un **check-list de la sesión 0 y la 1** se marca solo (entorno, mazmorra, temática, vocaciones, seguridad, atmósfera, mazmorra inicial, facciones por nivel…). Al terminar, el DJ **bloquea el mapa** y se convierte en el mapa de juego: cada lugar abre su escena, diario o actor (la mazmorra, su escena del constructor) y cada facción, su ficha con sus relojes.

**Todos a la vez**: cada jugador pinta, coloca y mueve lo de cualquiera al mismo tiempo, y **cada cual deshace lo suyo** sin tocar lo de los demás. Lo último que se pone queda **encima** (barcos sobre el mar), y cada cosa tiene su **menú** (clic derecho, o clic con «Seleccionar»): al frente, al fondo, más grande, más pequeño, voltear, renombrar o quitar; arrastrándola se mueve. Una **escala general** (días de viaje del centro al borde) ajusta el tamaño de todo y se dibuja en el mapa como **barra de escala**. Las facciones se **arrastran** desde su ventana, que sigue abierta y filtra **por grupo**; una facción nueva lleva una imagen genérica hasta que le pongáis la suya. **Solo el DJ vincula** escenas a los lugares, desde su propio menú: los jugadores no ven sus escenas. Cambiar el pergamino no toca nada de lo dibujado. **Lo que se junta se une**: los árboles juntos hacen un bosque y las montañas una cordillera, solo con dibujos (los huecos se llenan con más), y los lagos que se tocan forman un gran lago continuo y las olas el mar (y hay un pincel de **mancha** para pintarlos a mano alzada). Los **ríos** son curvas que se ensanchan hacia la desembocadura, con orilla, arena, olitas y reflejos, y la pestaña **Estilo** añade sombras, marco de cartógrafo, rejilla hexagonal y tinta en color, sepia o grabado.

### Constructor de mazmorras al estilo *Dungeon Keeper*
Un **constructor interactivo** (botón de la barra de escena) para excavar la mazmorra en la propia escena. **Excavas** túneles, **construyes salas** de diez tipos con solo arrastrar un rectángulo (o pulsar una celda): la sala **se crea sola, ajustada al espacio**, y si es menor que su mínimo crece hasta él. Las salas pueden tener **cualquier forma** (óvalo, L, cruz o pintada celda a celda). Se dibuja en vista 3/4 con arte propio (cofres, yunques, hornos, altares, tronos, armeros, jaulas…) y **cada tipo tiene su plano**: el trono o el altar al fondo, **la alfombra siguiendo el eje de la puerta** (horizontal o vertical), pilares y estatuas en las salas grandes y más oro en el tesoro cuanto más sube el nivel de la mazmorra. Los **pasillos llevan antorchas** de frente o de perfil según corran en horizontal o vertical, y unos **duendes diminutos** recorren la mazmorra picando y trabajando: su número crece con el nivel de la mazmorra y el DJ regula la densidad (se apagan en Ajustes). Con el **látigo** (como en *Dungeon Keeper*) los azuzas: trabajan al doble de velocidad un rato. Hay **efectos de sonido** (cavar, construir, puertas, trampas, látigo) y **ambiente** de cueva, con interruptor y volumen en el propio panel. Puedes colocar las **trampas y trucos del manual** (mecanismo, detonador y nivel de sus tablas), activarlos con la tirada del manual y marcarlos como descubiertos. Los **tokens** pasan a **media casilla** en las escenas de mazmorra para quedar a la escala de las salas (ajuste).

Sigue las **reglas del manual** (los relojes se apagan en Ajustes). Empieza por la **mazmorra inicial** (pág. 171): una de cada —sala de nivel 1, 2 y 3 (sin materiales), guarida de criatura, portón, trampa y truco de nivel 1, santuario y escalera—, dibujadas sin tiradas. Después, **dibujar es libre** y sin medidas; lo que hace real cada cosa nueva es su **proyecto de descanso**: nivel 1, una tirada; nivel 2, un reloj de 4; nivel 3, uno de 8 y los materiales de la **ficha de la mazmorra** (solo una sala de nivel 3 de otra temática). Lo nuevo queda **en obras** hasta llenar su reloj con las tiradas de quien trabaje: los PJ (una acción de descanso por fase de acecho), las pandas de esbirros (1 de oro) o los **duendes**, que tiran tantos dados como el nivel de la mazmorra y, según decida el DJ o el azar, **cavan túneles** entre zonas sin conectar, **empiezan una sala de nivel 3** por su cuenta o ayudan en una obra. Las **guaridas de criatura** no se construyen: se suma una al subir de nivel. Además hay **portones** (material y cierre) y **estructuras de nivel 1** (conducto, construcción, túnel largo, pasaje secreto, ventana). Un **proyecto de la hoja** de un PJ con el reloj lleno termina una obra en curso. Cada sala de nivel 3 que se dibuja aparece en la **ficha de la mazmorra** con su casilla de materiales: sin ellos, su reloj se queda a un segmento de terminarse (pág. 197). La ficha tiene una pestaña **Construcción** con lo mismo que el mapa: salas por nivel, santuario, guaridas, defensas y obras en curso con su reloj.

Lo que Foundry ya hace, lo hace Foundry: **los muros y las puertas son `Wall` nativos** (visión, colisión y puertas que se abren) y las salas de 3×3 o más —y las importantes: santuario, tesoro y forja— reciben una **luz con animación de antorcha**. Cualquier jugador puede construir (el DJ puede desactivarlo en Configuración): sus órdenes viajan por socket al DJ, que levanta la obra.

**Toda la mesa construye a la vez** y cada cual **deshace lo suyo**; el DJ pone la escena en **modo obra** (luz y sin visión por token, para que todos vean la mazmorra entera) y la pasa a **modo juego** para defenderla. El constructor se vincula a una **ficha de mazmorra**, que da el nivel, la temática y los materiales, y las salas salen en un **catálogo por nivel**: la mazmorra inicial lleva una de cada y, después, todo es un proyecto. Cada obra dice **con qué se tira** (afinar, destrozar, engañar, examinar o trastear, en situación ventajosa) y el botón **«Tirar»** elige quién trabaja (tu PJ, una panda de esbirros por 1 de oro o los duendes), tira y avanza el reloj, que se ve **dibujado sobre la sala** y, con **MR- Dirección**, en su panel de marcadores.

<p align="center"><img src="docs/img/constructor-demo.webp" alt="Excavando túneles, construyendo salas con forma y puertas, y dando latigazos a los duendes, que salen corriendo / Digging tunnels, building shaped rooms and doors, and whipping the minions into a run" width="90%"><br><sub>Construir la mazmorra desde cero y dar latigazos a los duendes · Building a dungeon from scratch and whipping the minions · <a href="docs/video/constructor-demo.mp4">MP4</a></sub></p>
<p align="center"><img src="docs/img/constructor.webp" alt="Constructor de mazmorras con su paleta" width="70%"></p>
<p align="center"><img src="docs/img/mazmorra.webp" alt="Mazmorra construida con salas de distintos tamaños" width="70%"></p>

### Hitos y relojes de la campaña, sin depender de nada más
Una píldora **«Marcadores»** (arrastrable; **Alt+M**) abre un panel con los **hitos** de la campaña y los **relojes**. El DJ lo ve todo y avanza los relojes casilla a casilla; la mesa solo ve lo público. Desde **«Gestionar hitos y relojes»** (o el panel del DJ) se **añaden, editan y quitan**: hitos **públicos o secretos**, relojes **visibles u ocultos**, **aviso a la mesa** al avanzar con una **frase de sabor por casilla** (o propia con Mayús + clic). Con [MR- Dirección](https://github.com/ManuRomera/mr-direccion) activo, este control **sustituye al suyo y comparte sus datos** (lee y escribe sus hitos, relojes y progreso), así que ambos módulos siempre ven lo mismo.

<p align="center"><img src="docs/img/marcadores.webp" alt="Panel de hitos y relojes y ventana para gestionarlos" width="70%"></p>

### Experiencia: hitos al final de la sesión
Entre las dos barras de EXP hay un botón **«Fin de sesión»** (también se abre pulsando el nombre de cada barra). Una ventana pregunta, con **Sí / No**, los desencadenantes del manual —plan maestro, escena de otra persona, actuar como un monstruo, uso creativo del equipo— y si interpretaste un desate o un reventado; al anotarlos suben solas la EXP malvada y la osada. La pestaña **Gastar** explica qué desbloquea cada barra al llenarse (una capacidad de vocación, un punto de acción) y cómo funciona la práctica.

<p align="center"><img src="docs/img/experiencia.webp" alt="Ventana de experiencia" width="40%"></p>

### Una hoja que no estorba
Raza, vocación, impulso y juerga quedan **fijados** una vez elegidos; solo se pueden cambiar activando el **modo evolución** de la barra de la hoja, y las capacidades nuevas se ofrecen cuando llenas la EXP malvada. Las herramientas (compacta, libretos, evolución, aspecto, ayuda, creador) viven en una **barra flotante de cristal** que se muestra u oculta con la calavera. Cada capacidad dice **cómo se usa** (cuesta estrés, pasiva, tiene tirada…) y tiene su botón de uso; las **conmociones, reventado y desatado** salen en un panel de estados; la EXP de práctica solo aparece donde se puede ganar.

### Una hoja limpia: sin cajas y con las herramientas en la barra de la ventana
Los iconos (compacta, libretos, evolución, heridas, recuperación, creador, aspecto, ayuda) viven en la **barra de la ventana**, que se esconde y aparece al acercar el cursor, así la ficha se ve limpia. Las constantes vitales forman una sola banda y las heridas se resumen en **tres gotas crecientes** con el texto del nivel; al pulsarlas se abre su ventana.

<p align="center"><img src="docs/img/ficha.webp" alt="Hoja de monstruo sin cajas" width="62%"> <img src="docs/img/heridas.webp" alt="Ventana de heridas" width="62%"></p>

### Heridas que se apuntan, y recuperación
Un monstruo no tiene tres niveles de herida: sufre **conmociones** (leves, una por atributo), puede quedar **reventado** y, si recibe otra herida seria, **muere**. El panel de **Heridas** deja anotar qué te ha pasado en cada una (se borra sola al curarse), reventarse pone conmoción en todos los atributos, y la **recuperación** (botón de la barra de la hoja, o al pasar el ciclo a la fase 1) elimina estrés y heridas y regenera defensas y suministros. La barra de herramientas **aparece al acercar el cursor**.

### Catálogo de objetos con buscador
Añadir equipo, suministros, defensas, proyectos, labores, mejoras y aventureros abre un **catálogo** con búsqueda, categorías (armas y armaduras, mejunjes, artilugios, pociones, objetos mágicos…), orden alfabético y la descripción de cada objeto. Los nombres de los objetos ya no llevan prefijos de tabla.

### Dados propios y Dice So Nice
Caras de color de menos a más —con el emblema del Señor Oscuro en el 6— en las **tarjetas del chat** y, si tienes [Dice So Nice](https://foundryvtt.com/packages/dice-so-nice), también en los **dados 3D** (ajuste «Dados de Wicked Ones»; cada jugador puede cambiarlos en su configuración de dados).

### Ayuda al detener el cursor
Si dejas el cursor **quieto dos segundos** sobre cualquier botón, casilla o dato de las hojas y las tarjetas, un globo explica qué es y cómo se usa (el retraso se ajusta de 0,5 a 5 s o se desactiva).

### Una hoja de monstruo pensada para jugar
Cabecera y **constantes vitales siempre visibles**: el **Estrés** se marca pulsando sus casillas (y al llenarlo el personaje se desata), igual que los corazones oscuros, el oro, los suministros y la EXP. El resto, repartido en pestañas: **Acciones**, **Capacidades**, **Libreto**, **Equipo**, **Guarida** y **Notas**. Nada de una hoja enorme en una sola pestaña.

<p align="center"><img src="docs/img/ficha.webp" alt="Hoja de monstruo" width="62%"> <img src="docs/img/compacta.webp" alt="Modo compacto" width="36%"></p>

El **modo compacto** deja solo lo habitual (vitales, acciones y capacidades) en un rincón de la pantalla; recuerda tamaño y posición de cada hoja.

### Todas las hojas, rediseñadas
Además de la de personaje, ahora tienen hoja propia: **manada de esbirros**, **mazmorra**, **facción** (y la de la Alianza Impía), **grupo invasor** (con corazones tachables y defensas), **panel del DJ** (el ciclo de juego de un vistazo con las pistas de cada fase), **conquista** y **reloj** (con su círculo). El **despertado** usa la misma hoja de monstruo, con su «Anatomía», «Secreciones/Trofeos» y pestaña de «Conquista».

<p align="center"><img src="docs/img/hojas.webp" alt="Hojas de esbirros, mazmorra, grupo invasor y panel del DJ" width="100%"></p>

### Libretos: qué eres y cómo interpretarlo
Los jugadores ven su **vocación** y su **raza** explicadas —cómo interpretarlas, capacidad principal, pista de *flashback*, todas las capacidades que pueden aprender (con botón para añadirlas a la hoja), objetos de ejemplo, frases y nombres típicos— y los **impulsos oscuros** y **juergas**. Están en la pestaña *Libreto* de la hoja y en la ventana **Libretos** (cabecera de la hoja, o `api.abrirLibretos()`).

<p align="center"><img src="docs/img/libreto.webp" alt="Libreto de vocación" width="62%"></p>

### Tiradas con toque malote
El clic en una acción abre un lanzador inspirado en los lanzadores FitD genéricos, integrado en el módulo: eliges la acción, los **trucos del manual** (*Ayudar*, *Darlo todo*, **pacto oscuro**, **corazón oscuro**), ves la **probabilidad** de fallo/parcial/éxito/crítico y tiras pulsando la casilla donde se cruzan **Situación** y **Efecto**. También sirve para **resistir** (no se puede con la acción que causó la consecuencia) y para tiradas de fortuna.

<p align="center"><img src="docs/img/tirada.webp" alt="Lanzador de tiradas" width="48%"> </p>

<p align="center"><img src="docs/img/tarjetas.webp" alt="Tirada con un éxito crítico: dados del módulo en Dice So Nice y tarjeta del chat" width="78%"></p>

Las **tarjetas del chat** muestran los dados de hueso, el veredicto, la gravedad de la consecuencia según la situación y lo que se aplicó solo; desde ellas se puede **resistir** o **gastar un corazón oscuro** (la tarjeta se recalcula). También las del ciclo de partida, los oráculos y el «¡se desata!».

### Accesibilidad completa
Un panel con vista previa: **modo oscuro** (también en las tarjetas del chat), **alto contraste**, **lectura limpia** con tinta a elegir, **tamaño de texto** (85–160 %), **tipografía sencilla**, **espaciado amplio**, **botones grandes**, **menos movimiento** (respeta el del sistema operativo), **menos efectos** y **marcas para daltonismo**. Se abre desde Configuración o desde la cabecera de la hoja.

<p align="center"><img src="docs/img/aspecto.webp" alt="Panel de aspecto y accesibilidad" width="62%"></p>

<p align="center"><img src="docs/img/claro.webp" alt="Tema claro" width="62%"></p>

### Todo es opcional
En Configuración, **«Estilo de las hojas»** y **«Estilo de las tiradas y las tarjetas»** se pueden poner en *Original del sistema* para volver al aspecto de siempre (por defecto, MR). Los automatismos de reglas siguen funcionando en cualquier caso.

### Asistente y generador
Solo para la dirección: todas sus tiradas se **susurran al DJ** y traen un botón **«Mostrar a los jugadores»**; cada sección explica para qué sirve (con una guía para quien dirige por primera vez). Rehecho: cinco secciones (**La mesa**, **Esbirros**, **Guarida**, **Invasores**, **Tablas**) con tarjetas claras, labores agrupadas por tipo y tablas con su dado.

<p align="center"><img src="docs/img/asistente.webp" alt="Asistente y generador" width="62%"> <img src="docs/img/tarjeta-dj.webp" alt="Tarjeta solo para el DJ" width="30%"></p>

### Reglas automatizadas
Tras cada tirada se aplican solas las reglas del libro (se puede desactivar en Configuración):
- **Resistencias**: fallo 3 de Estrés, parcial 2, éxito 1; el crítico despeja 1.
- **Estrés lleno**: el personaje se **desata** y la tarjeta recuerda los pasos.
- **Conmoción** que se limpia y **EXP de práctica** (tres marcas suben la acción a 1 punto).
- **Corazón oscuro**: se gasta desde la tarjeta o el lanzador, tira +1D y recalcula el resultado (y corrige el Estrés).

### Instalar, actualizar y reinstalar
Al activar el módulo en un mundo vacío, un asistente te deja **importar todo al mundo** o **solo ordenar los compendios**. Al **actualizar**, se te ofrece **reinstalar todo el contenido**: restaura lo que es del módulo, añade lo nuevo y retira lo que ya no existe, **sin tocar nada que no sea del módulo** (también está en Configuración). Un **tutorial guiado** para dirección y para jugadores se repite cuando quieras.

## 📋 Requisitos

| Componente | Notas |
|---|---|
| **Foundry VTT** | v13 (v14 sin probar). |
| **Sistema [Wicked Ones](https://foundryvtt.com/packages/wicked-ones)** | Sistema base. |
| **[Babele](https://foundryvtt.com/packages/babele)** y **[Wicked Ones (Español)](https://foundryvtt.com/packages/wicked-ones-esp)** | Traducción base. |
| **[MR- Dirección](https://github.com/ManuRomera/mr-direccion)** *(recomendado)* | Escenas, música, motivos, figuras y relojes. |

## ⚡ Instalar

En Foundry: **Add-on Modules → Install Module** y pega el manifiesto:

```text
https://github.com/ManuRomera/mr-wicked-ones-es/releases/latest/download/module.json
```

## 🔧 Cómo está hecho

El arte se generó en local con **Flux (Draw Things)** y, desde la 2.12.0, con **Codex** (láminas 2×2 sobre magenta que se recortan en `Trabajo WO/arte2`); todo se procesa con `tools/ingest_arte.py` y cada entrada de los compendios busca su imagen por nombre; la banda sonora (Scott Buckley, CC BY 4.0, y efectos CC0 de Freesound) se monta con `tools/banda.py`; `npm run datos` ensambla los compendios (`_data` → `_pack`) y `npm run build` los compila. El informe de la reescritura está en [`docs/AUDITORIA.md`](docs/AUDITORIA.md).

```bash
npm install
npm test
npm run datos && npm run build
```

## 📜 Créditos y aviso

- **Juego original:** *Wicked Ones*, de **Ben Nielson** (Bandit Camp), CC0. Edición en español: The Hills Press.
- **Sistema:** Spearhead y LorduFreeman. **Traducción base:** wicked-ones-esp.
- **Diseño, arte generado, programación y adaptación:** Manu Romera (MR · Digital RPG Design).
- **Música:** [Scott Buckley](https://www.scottbuckley.com.au), licencia [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). **Efectos y ambientes:** [Freesound.org](https://freesound.org), CC0. Títulos, licencias y enlaces en `NOTICE.md`. / *Music by Scott Buckley (CC BY 4.0, scottbuckley.com.au); effects and ambiences from Freesound (CC0).*
- Más en [`NOTICE.md`](NOTICE.md). Licencia MIT para el código.

<p align="center"><sub>MR- · Manu Romera · <a href="https://github.com/ManuRomera">github.com/ManuRomera</a></sub></p>

---

## 🇬🇧 English summary

**MR- Wicked Ones** extends the [Wicked Ones](https://foundryvtt.com/packages/wicked-ones) system for Foundry VTT (v13) with a complete Spanish-language campaign (*El Valle Silencioso*), all-new art generated locally in the Wicked Ones style, and the usual MR- toolkit:

- **Everything in folders**: actors, items, scenes, journals and compendia, with this module's content separated from the system's.
- **Redesigned character sheet**: vitals always visible (clickable stress track), tabs for Actions, Abilities, **Playbook**, Gear, Lair and Notes, and a real compact mode.
- **Step-by-step character creator** following the rulebook order, with a *Random* button on every step and a one-click *Randomise everything*.
- **Locked playbook choices** (race, calling, impulse, revelry) unless you switch on *evolution mode*; clear ability usage badges and use buttons; shock / bloodied / feral states panel; glass-style floating toolbar.
- **Searchable item catalogue** (categories, alphabetical, descriptions) instead of the system's long dropdown, and **wound ± controls** for adventurers.
- **Custom dice** (colour-scaled faces, Dark Lord emblem on the 6) in chat cards and in **Dice So Nice**.
- **Wounds you can annotate** (shock → bloodied → dead), a **Recovery** button and prompt on cycle phase 1, and a toolbar that appears on hover.
- **GM-only assistant** (whispered rolls with a *Show to players* button and explanations), **box-free sheet** with the toolbar in the window bar (shows on hover) and a wounds window.
- **The monsters' map** (session 0 tool and game map): selectable burnt parchments, 52 illustrated stamps including a monstrous compass rose, the system's factions with their art and territories, a self-ticking session-0 checklist, and a lock mode where places open their linked scenes (the dungeon opens its builder scene) and factions open their sheets. Everyone edits at once with per-player undo, the last thing placed sits on top, every element has its own menu (front/back, bigger/smaller, flip, rename, remove), a global scale with an on-map scale bar sizes everything, factions are dragged in from a group-filterable window that stays open, and only the GM links scenes to places. Tier-3 rooms drawn in the builder appear on the dungeon sheet with their materials checkbox (without materials their clock stops one segment short, p. 197), and the sheet's new Construction tab mirrors the map. Touching stamps merge (trees into a forest and mountains into a range, drawn only with more stamps; lakes into one continuous lake, waves into the sea), a patch brush paints them freehand, rivers are smooth tapering ribbons with banks and ripples, and a Style tab adds shadows, a cartographer's frame, a hex grid and ink tones.
- **Dungeon builder for the whole table**: everyone builds at once with per-player undo; a GM build/play mode lets players see the whole dungeon; it is linked to a dungeon sheet, rooms come in a tier catalogue (the starting dungeon takes one of each), and every project states which actions roll for it, with a «Roll» button that advances its clock, drawn on the room and mirrored in MR- Dirección.
- **Dungeon-Keeper-style dungeon builder**: dig tunnels and build ten kinds of rooms by dragging a rectangle; each room fits itself to the space (growing to its minimum), has its own layout turned toward its door (carpets follow the door axis), and corridors get torches drawn front-on or side-on depending on direction. Rooms can have any shape (oval, L, cross, freehand). Tiny minions wander the dungeon (density set by the GM and tied to dungeon level) and can be whipped into working twice as fast; sound effects and cave ambience (toggleable) accompany every action; rulebook traps and tricks can be placed and rolled, the GM can grant extra rest actions, and tokens shrink to half a cell in dungeon scenes. It follows the rulebook (toggleable): a free starting dungeon (one of each feature), then free drawing where every new thing is a rest project (tier 1 one roll, tier 2 a 4-clock, tier 3 an 8-clock plus materials) filled by PC, paid-minion and imp rolls; imps can dig connecting tunnels or start a tier-3 room on their own; creature lairs, gates and tier-1 structures included. Walls, doors and torch-animated lights are native Foundry documents; players can build too (via the GM).
- **Native milestones & clocks control** (draggable pill, GM manager with public/secret milestones, hidden/visible clocks, announcements with flavour phrases); it replaces MR- Dirección's and shares its data when that module is active.
- **Session XP window** (yes/no milestones, spending guide).
- **Hover help**: rest the cursor for two seconds on anything and a balloon explains it.
- **Playbooks** for every calling and monster race (how to play it, abilities you can learn, example items), readable by players.
- **Roller** inspired by generic FitD rollers (Position × Effect grid, Help / Go all out / dark pact / dark heart, live odds) and **monster-themed chat cards**.
- **Full accessibility panel** (dark mode also on chat cards, high contrast, reading mode, text size, plain font, spacing, big buttons, less motion/effects, colour-blind marks) and a switch back to the original system look.
- **Scene reading + music + effects** for 21 scenes through [MR- Dirección](https://github.com/ManuRomera/mr-direccion); original synthesized soundtrack.
- **Character creation by the book** (3/2/2/1/1 action dots enforced, 4 gear + 3 supply items, vocation items first, one valuable item or 1 gold, no load levels), **windows that scale to any screen**, a graphite dark sheet and a **full-length orchestral soundtrack by Scott Buckley (CC BY 4.0) with CC0 Freesound effects**: music, mood motifs and an ambience loop for every scene.
- **Rulebook content, nothing invented**: the 49 random tables, 204 dungeon duties (rooms of every theme, traps, gates, example tricks, creatures, discoveries), the 62 example factions of the four settings (tier, traits, clocks), the 30 example adventurers and the book's items, all taken from the Spanish rulebook.
- **Reinstall content** on update without touching anything that isn't the module's.
- **Automations** verified against the *Wicked Ones* 1.4 rulebook (CC0): resistance stress, feral state, shock, practice XP, Dark Heart +1D; all optional.
- **Guided tour** for the GM and for players, and an install wizard (import everything or just organise the compendia).

Requires the `wicked-ones` system, `babele` and `wicked-ones-esp`. Manifest: `https://github.com/ManuRomera/mr-wicked-ones-es/releases/latest/download/module.json`. Foundry v14 is untested.
