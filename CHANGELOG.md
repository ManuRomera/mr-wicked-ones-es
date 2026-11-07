## 2.9.0 (2026-11-08)

Látigo con gritos, tokens a media casilla y vídeo del constructor. / Whip with screams, half-cell tokens and a demo video.

### Añadido / Added
- **Vídeo del constructor en el README**: se ve cómo se excava, se construyen salas con forma, se ponen puertas y trampas y se dan latigazos a los duendes, que salen corriendo (versión animada y MP4 en `docs/video/`). / **Demo video in the README** (animated WebP and MP4).
- **El látigo se oye y se ve mejor**: restallido más potente (silbido, estallido, golpe seco y eco) y los duendes azotados **gritan** (voz áspera con vibrato, hasta seis a la vez) y sueltan su grito en una burbuja que sube («¡Iiik!», «¡Ay!», «¡Piedad!»…). / **Louder whip and minion screams**, with floating shout bubbles.

### Cambiado / Changed
- **Tokens a media casilla**: en las escenas de mazmorra los tokens miden de verdad **media casilla** (ancho y alto), no solo el dibujo; así ya no llenan el cuadrado entero ni un túnel. Los tokens grandes se reducen a la mitad. Los que la 2.6-2.8 había encogido solo por el dibujo se corrigen solos. Ajuste «Tamaño de los tokens en la mazmorra» (media casilla o normal). / **Tokens are now half a cell** wide and tall in dungeon scenes (setting), legacy shrunk tokens are migrated.
- El volumen de los sonidos del constructor es propio (por defecto 0,8) y ya no se multiplica por el de interfaz de Foundry, que por defecto lo dejaba casi inaudible; si el navegador aún no ha dado permiso de audio, el primer sonido se reanuda en vez de perderse. / **Sound volume is independent** of Foundry's interface volume; first sound no longer lost.

## 2.8.0 (2026-11-08)

Sonido, látigo, obra con los relojes de proyecto y luz en todas partes. / Sound, whip, build counts from project clocks and light everywhere.

### Añadido / Added
- **Efectos de sonido del constructor** (cavar, rellenar, construir una sala, demoler, puertas, preparar y activar trampas, descubrirlas, conceder acciones, avisos de error y látigo) y un **ambiente** mientras observas la mazmorra: zumbido de cueva, goteo, picos lejanos, antorchas que chisporrotean, ecos y duendes charlando (más a menudo cuantos más hay). Se sintetizan en el navegador (sin archivos), suenan en todas las mesas a la vez y se activan, desactivan y regulan de volumen desde el propio panel del constructor y desde Ajustes (cada navegador decide). / **Sound effects and ambience**, synthesized, toggleable and with volume control.
- **Látigo** (herramienta nueva, como en *Dungeon Keeper*): pulsa en la mazmorra y suena el restallido con silbido, estallido y «¡ZAS!»; los duendes a 2,5 celdas a la redonda se azoran, corren y trabajan al doble de velocidad unos segundos y chillan. Lo ve y lo oye toda la mesa. / **Whip tool**: area effect that makes nearby minions work and run twice as fast.
- **Lo que pueden hacer**: el panel muestra las acciones de obra (fase de acecho) y los **créditos**, que no caducan. Los **proyectos de las fichas** (relojes de 4, 6 u 8) valen acciones al llenarse: 2, 3 o 4; los que hablan de construir, excavar, salas, túneles o trampas se aplican solos y el resto los aplica el DJ. El DJ también puede **dar por hecho** un proyecto sin acabar o **conceder** créditos como quiera. / **Build allowance** with credits from filled project clocks; the GM can grant or waive.
- Los rechazos de un jugador (por reglas o falta de acciones) le llegan a él con aviso y sonido. / Players now get the rejection message and sound.

### Corregido / Fixed
- **Las salas con forma no se ponían** si lo marcado tocaba otra sala o el borde del mapa: ahora se quedan con lo libre (recortadas, si llegan al mínimo de celdas) en vez de fallar; la vista previa lo muestra. / **Shaped rooms now trim to free space** instead of failing.
- **Salas y pasillos a oscuras**: toda sala lleva su luz central (las pequeñas, un candil) y los pasillos cortos, los cruces y los codos reciben su antorcha de relleno hasta que no quede ninguna celda sin luz. / **Every room and corridor is now lit.**
- La vista previa del látigo capturaba los pulsos del ratón; ahora las capas de ayuda nunca los reciben. / Whip preview no longer swallows clicks.

## 2.7.0 (2026-11-08)

Salas de cualquier forma, trampas del manual y más control del DJ. / Free-shape rooms, rulebook traps and more GM control.

### Añadido / Added
- **Salas de cualquier forma**: además del rectángulo, óvalo, en L (se puede girar), en cruz y **libre** (pintas las celdas una a una, de una sola pieza). La decoración, la alfombra, las antorchas y las luces se adaptan a la forma; si no llega al mínimo del tipo, crece sola. / **Free-shape rooms** (oval, L, cross, freehand); layout, carpet, torches and lights adapt.
- **Trampas y trucos del manual** (herramienta «Trampa»): mecanismo y detonador de las tablas del manual (d12, con botón de azar) o escritos a mano, nivel 1-3 y nota; los trucos llevan método, detonador e intención. Dibujo propio de cada mecanismo con insignia de nivel; se pueden **activar** (tirada de trampa o de truco del manual en el chat), marcar como **descubiertas** o quitar. Cuestan acciones de descanso según su nivel. / **Traps and tricks** from the rulebook tables with art, level badge, roll and discovered state.
- **Acciones extra del DJ**: botón «Conceder» (cuántas y por qué: esbirros pagados, capacidad de vocación, flashback, gracia…) que avisa en el chat y deja constancia en el panel. / **GM can grant extra rest actions**.
- **Densidad de duendes regulable** desde el constructor (el DJ, de 0 a ×2) y ligada al nivel de la mazmorra, sus salas y sus túneles. / **Minion density** slider tied to dungeon level.
- El panel marca las salas que las reglas no permiten ahora mismo (con el motivo) y recomienda el tamaño del santuario del manual (5×5 o más). / Locked room types explain why.

### Corregido / Fixed
- **Contraste del constructor** y sus ventanas en todos los modos (claro, oscuro, alto contraste y lectura limpia): el panel usaba un fondo que no seguía al modo de lectura y dejaba el texto claro sobre papel claro. / **Constructor contrast fixed in every display mode.**

## 2.6.0 (2026-11-08)

Constructor de mazmorras. / Dungeon builder.

### Añadido / Added
- **Constructor de mazmorras** (botón en la barra de escena): excavar túneles, construir salas arrastrando un rectángulo, poner puertas, rellenar y demoler. Dibujo en vista 3/4 tipo *Dungeon Keeper* con **decoración que cambia según las dimensiones** de la sala (brasero, braseros y estandartes desde 3×3, pilares, antorchas, alfombra y estatua en salas grandes). / **Dungeon builder** with size-dependent decoration.
- **Foundry hace lo suyo**: muros y puertas nativos (`Wall`, con visión y puertas que se abren) y **luces con animación de antorcha** en salas de 3×3 o más y en las importantes (santuario, tesoro, forja). Los dibujos son discretos y **no se animan**: solo parpadea la luz, con un radio que cubre la sala según su tamaño (los braseros dan un resplandor pequeño). / **Native walls, doors and torch lights**; only the light flickers, with a radius scaled to the room.
- **Los jugadores también construyen** (ajuste «Los jugadores pueden construir la mazmorra»): sus órdenes viajan por socket al DJ. / Players can build via the GM (socket).
- **Gráficos nuevos** en `assets/wicked-isometric/`: terreno (roca, tierra, túnel), suelos y emblemas de las siete salas, brasero, pilar, estandarte, estatua y puertas. Se regeneran con `tools/mazmorra_assets.py`. / New art set.
- «Nueva escena de mazmorra» o «Usar esta escena» desde el propio constructor. / One-click scene setup.
- **Cada sala, con su plano y orientada a la puerta**: diez tipos (santuario, tesoro, sala menor, guarida de esbirros, prisión y las temáticas enclave, escondrijo, forja, fortaleza y templo) con arte nuevo (cofre, oro, yunque, horno, altar, trono, estantería, mesa, jergón, armero, barril, jaula). El fondo de la sala es siempre el muro opuesto a la puerta; **la alfombra va por el eje de la entrada** (vertical u horizontal, y sin puerta se alarga con la sala) y deja libre el emblema. El tesoro amontona más oro según el nivel de la ficha. / **Per-room layouts turned toward the door**; carpets follow the entrance axis; treasure grows with dungeon level.
- **La sala se adapta sola**: arrastras (o pulsas una celda) y se crea ajustada al espacio; si es menor que el mínimo de su tipo crece hasta él hacia donde haya sitio. La vista previa muestra el resultado, el coste y el motivo si no cabe. / **Rooms auto-fit** to the dragged area up to a per-type minimum.
- **Antorchas en los pasillos**, de frente en los horizontales y de perfil en los verticales, cada una con su luz de antorcha. / **Corridor torches** drawn front-on or side-on by direction, each with its light.
- **Vasallos constructores**: esbirros diminutos que recorren salas y túneles picando y trabajando (más cuanto mayor es la mazmorra). Ajuste de cliente. / **Minion workers** wandering the dungeon (client setting).
- **Tokens a la escala de la mazmorra**: los tokens de las escenas de mazmorra se reducen solos (ajuste, 0,6 por defecto). / **Token scale** setting for dungeon scenes.
- **Reglas del manual** (ajuste «El constructor sigue las reglas de obra»): acciones de descanso por fase de acecho (una por PJ más los duendes; +1 por panda de esbirros pagada), nivel 1 = 1, nivel 2 = 2, nivel 3 = 4; salas de nivel 3 con temática y materiales de la ficha de la mazmorra (solo una de otra temática); santuario y tesoro únicos y gratis. «Nueva fase de acecho» repone las acciones (y se hace sola al pasar el panel del DJ a la fase 1). Cada obra deja una tarjeta en el chat. / **Rulebook rules**: rest-action budget, level costs, level-3 rooms need theme and materials; chat card per build.
- **Integrado con la ficha de la mazmorra**: el panel muestra su nivel, temática y salas de nivel 3 (con o sin materiales), y la ficha tiene un botón «Constructor». / **Linked to the dungeon sheet**, with a Constructor button.

## 2.5.1 (2026-11-07)

Arreglos de la 2.5.0. / Fixes for 2.5.0.

### Corregido / Fixed
- **«Anotar experiencia» no respondía** cuando la ventana era pequeña: el asa de redimensionar de la esquina tapaba el botón. Ahora el botón ocupa **todo el ancho** de la ventana y queda lejos del asa; las ventanas pequeñas recuperan su relleno. / **XP button** covered by the resize handle: now full width.
- **Texto de la pestaña seleccionada ilegible** por el resplandor del núcleo de Foundry; se quita. / Selected-tab glow removed.
- El pie del **creador de monstruos** también se aparta del asa de la esquina. / Creator footer clear of the resize handle.

### Cambiado / Changed
- **Hitos y relojes más simples**: el propio panel lleva un **+** para añadir un reloj o un hito (con un diálogo mínimo) y una **papelera** en cada uno (pide confirmación); ya no hace falta abrir la gestión. También se pueden quitar los de la campaña y recuperarlos desde la ventana de gestión. / Add and delete directly from the panel; campaign ones can be removed and restored.

## 2.5.0 (2026-11-07)

Control nativo de hitos y relojes, y arreglos de la experiencia. / Native milestones & clocks control and XP fixes.

### Añadido / Added
- **Hitos y relojes nativos** (píldora «Marcadores», Alt+M): panel con todos los hitos y relojes, ventana para **añadir, editar y quitar**, hitos públicos o secretos, relojes visibles u ocultos, **aviso a la mesa** con frase de sabor por casilla (o propia con Mayús + clic) y botón en el panel del DJ. Funciona **sin MR- Dirección**; con él activo **sustituye a su control y comparte sus datos** (hitos, relojes y progreso), y los avisos los sigue emitiendo MR- Dirección. Ajuste «Control de hitos y relojes del módulo» para volver al de MR- Dirección. / **Native milestones & clocks**; with MR- Dirección active it replaces its control and shares its data.

### Corregido / Fixed
- **Gastar experiencia**: al elegir una capacidad desde la ventana de experiencia la EXP malvada no se vaciaba; ahora sí (y avisa). / Learning an ability from the XP window now spends the XP.
- **Anotar experiencia** muestra un aviso con el resultado y, si falla algo, el error en pantalla. / The XP window now reports the result and any error.
- El libreto abierto aparte solo ofrece aprender capacidades cuando toca (EXP completa, evolución o aún sin las dos iniciales). / Standalone playbook only offers learning when allowed.

## 2.4.0 (2026-11-07)

Experiencia por hitos, hoja de guarida arreglada y capturas nuevas. / Milestone XP, fixed dungeon sheet and fresh screenshots.

### Añadido / Added
- **Ventana de experiencia** (botón «Fin de sesión» entre las barras de EXP): preguntas Sí/No de los desencadenantes de EXP malvada y de EXP osada, con nota opcional; anota las EXP y deja un mensaje en el chat. La pestaña **Gastar** explica qué desbloquea cada barra y cómo funciona la práctica. / **XP window** with yes/no milestones and a *Spend* guide.

### Corregido / Fixed
- **Hojas sin retrato (mazmorra, facción, grupo, DJ, conquista, reloj)**: el título se cortaba y la temática ocupaba una columna estrecha por culpa de la cabecera nueva. / Portrait-less sheets header layout.
- Capturas del README rehechas con la versión actual, sin la barra de Dirección y con los dados del módulo en Dice So Nice y un éxito crítico. / README screenshots redone.

## 2.3.1 (2026-11-07)

Arreglos de la 2.3.0. / Fixes for 2.3.0.

### Corregido / Fixed
- **Los iconos de la barra de la ventana no respondían al hacer clic**: Foundry identifica cada botón por una única clase y los míos llevaban dos. / **Window-bar icons now respond to clicks.**
- **Dados 3D incorrectos**: Dice So Nice dibujaba la ruta de la imagen como texto en las caras; ahora carga las texturas de los dados del módulo (emblema del Señor Oscuro en el 6) con reintentos. / **Wrong 3D dice**: textures were never loaded; now they are.

### Añadido / Added
- Cuando una tabla del asistente da un **objeto del compendio** (mejunje, artilugio, poción, objeto mágico), la tarjeta lo muestra para **arrastrarlo a la hoja** de un personaje. / Table cards offer the resulting item as draggable.

## 2.3.0 (2026-11-07)

Hoja más limpia y compacta, asistente solo para el DJ y dados propios sin repeticiones. / Cleaner, more compact sheet; GM-only assistant; custom dice without repeats.

### Añadido / Added
- **Barra de la ventana con las herramientas** (compacta, libretos, evolución, heridas, recuperación, creador, aspecto, ayuda); se esconde y aparece al acercar el cursor (ajuste «Esconder la barra de la hoja»). / **Window-bar toolbar** that hides and shows on hover.
- **Ventana de heridas**: la hoja solo muestra tres gotas crecientes y el texto del nivel; al pulsarlas se gestionan conmociones, reventado y muerte y se apunta qué ha pasado. / **Wounds window**; the sheet shows only growing drops and the level text.
- **Tesoro de la mazmorra** junto al oro (el botín va al tesoro conjunto; tu oro es lo que controlas, máx. 3). / **Dungeon treasure** link next to gold.
- **Asistente solo para el DJ**: todas sus tiradas (tablas, oráculo, ciclo, criaturas) salen con el estilo del módulo, susurradas, con botón **«Mostrar a los jugadores»**, explicaciones de cada sección y una guía «¿Primera vez dirigiendo?». El oráculo de semillas explica cómo usarlo. / **GM-only assistant** with reveal button and explanations.
- **EXP osada completa**: un diálogo permite subir un punto en una acción (máx. 3). / **Reckless XP** raises an action.

### Cambiado / Changed
- **Hoja sin cajas** y mucho menos alta: vitales en una banda, EXP en dos barras finas, acciones y objetos con filetes en lugar de recuadros. / **Box-free, shorter sheet.**
- **Equipo simplificado**: una sola lista y un único botón «Añadir objeto» (los mejunjes y pociones van solos a suministros). / **Simpler gear**: one list, one add button.
- **Catálogo de objetos para jugadores**: solo objetos mundanos; mejunjes, artilugios, pociones y objetos mágicos los concede el DJ desde las tablas. / Players only see mundane gear.
- La **práctica** solo se muestra en las acciones sin puntos (única donde se gana, según el manual). / Practice only on 0-point actions.

### Corregido / Fixed
- **Dados**: la tirada se animaba dos veces con Dice So Nice y no usaba los dados del módulo; ahora una sola animación y con los dados propios en cada tirada. / Dice animated twice and ignored the module dice: fixed.
- **Falta la X de cerrar** en Libretos, asistente y demás ventanas (una regla de CSS pisaba la fuente de iconos). / Missing close button.
- Las tarjetas de las tablas del asistente ya no llevan botones de Resistir ni repiten el texto. / Table cards no longer show resist buttons or duplicate text.
- El chip seleccionado de las hojas se deformaba por un conflicto de nombre de clase. / Selected chip layout.

## 2.2.0 (2026-11-07)

Más claridad en la hoja, creador de personajes y dados propios. / Clearer sheet, character creator and custom dice.

### Añadido / Added
- **Creador de monstruos** paso a paso con «Al azar» en cada paso y «Todo al azar» (directorio de Actores, barra de la hoja, `api.abrirCreador()`). / **Step-by-step monster creator** with per-step *Random* and *Randomise everything*.
- **Catálogo de objetos** con buscador, categorías y descripciones, en lugar del desplegable del sistema; los objetos pierden el prefijo de tabla («Artilugio [11] · …»). / **Searchable item catalogue** replacing the system dropdown; item names lose their table prefix.
- **Dados propios** (caras de color y emblema del Señor Oscuro) en las tarjetas del chat y en **Dice So Nice** (ajuste «Dados de Wicked Ones»; se recomienda el módulo). / **Custom dice** in chat cards and Dice So Nice.
- **Ayuda al detener el cursor** (2 s por defecto, ajustable) en todas las hojas, diálogos y tarjetas. / **Hover help** after 2 s (adjustable).
- **Heridas de aventureros** con botones ½ para herir y curar, marcador de vida y estado «Caído». / **Adventurer wound controls** (±½ heart).
- **Barra flotante de cristal** con iconos del juego para las herramientas de la hoja (antes, botones sueltos en la cabecera). / **Glass floating toolbar**.
- **Panel de estados** (conmoción por atributo, reventado, desatado), **uso de capacidades** explicado (cuesta estrés, pasiva, con tirada, de suministro) con botón de uso, y guía «¿Cómo se usan las capacidades?». / **States panel** and **ability usage** badges and buttons.
- **Heridas con anotación**: un monstruo no tiene tres niveles de herida (según el manual: conmoción por atributo → reventado → muerte); el panel permite **apuntar qué te ha pasado** en cada una, se borra sola cuando la herida desaparece, y avisa del golpe de gracia (+1d por corazón oscuro). / **Wounds with notes** (shock per attribute → bloodied → dead).
- **Recuperación** (fase 1 del ciclo): botón en la barra de la hoja y aviso a la dirección al pasar el ciclo a la fase 1; quita estrés, conmociones y reventado, y regenera defensas y suministros. / **Recovery** button and prompt on cycle phase 1.
- **Barra de cristal que aparece al acercar el cursor** (y se esconde al apartarlo, como la barra de tareas); la calavera la deja fija. / **Toolbar shows on hover**.
- **Modo evolución**: raza, vocación, impulso y juerga quedan fijados; se desbloquean al evolucionar, y aprender una capacidad con la EXP malvada llena la gasta. / **Evolution mode** locks race, calling, impulse and revelry.

### Automatismos / Automations
- Reventarse da **conmoción en todos los atributos**; al limpiarlas todas se deja de estar reventado. / Bloodied ↔ shock coupling.
- Tachar una **defensa** publica en el chat su efecto (evita la consecuencia, sin estrés). / Defence use card.
- **Moral de las manadas**: +1d en acciones y tiradas de fortuna, y se gasta sola. / Minion morale +1d, auto-spent.

### Cambiado / Changed
- **Ficha compacta** rehecha: funciona desde cualquier pestaña y muestra acciones, capacidades con su botón de uso y equipo. / **Compact sheet** rebuilt; works from any tab.
- La **EXP de práctica** solo se muestra en las acciones con 0 puntos (las únicas que pueden ganarla). / Practice XP only on 0-point actions.
- En la hoja de esbirros, la **moral** se explica como en el manual: un punto que se gasta para +1d (máximo uno por manada). / Minion **morale** now matches the rulebook.

### Corregido / Fixed
- Se ocultan los cuatro objetos de relleno del sistema («Nuevo equipo 1…») del catálogo. / Placeholder system items hidden.

## 2.1.0 (2026-11-07)

Rediseño completo de la interfaz: hojas, tiradas, tarjetas del chat, asistente, accesibilidad y libretos.

### Añadido
- **Hoja de monstruo** nueva (heredada de la del sistema): cabecera y constantes vitales siempre visibles (**Estrés usable pulsando casillas**, corazones, reventado, oro, suministros, EXP) y pestañas Acciones, Capacidades, **Libreto**, Equipo, Guarida y Notas; modo compacto real que recuerda su estado por hoja.
- **Libretos** de vocaciones y razas (texto del manual + capacidades de los compendios, en castellano), con botón para aprender capacidades y elegir vocación, raza, impulso y juerga; ventana propia `Libretos`.
- **Lanzador de tiradas** (Situación × Efecto, Ayudar, Darlo todo, pacto oscuro, corazón oscuro, probabilidades) integrado con las tiradas del módulo y con las hojas originales.
- **Tarjetas de chat** rediseñadas y con datos estructurados (se redibujan, incluido el tema oscuro y claro); también para el ciclo de partida, los oráculos y «se desata».
- **Panel de aspecto y accesibilidad** con vista previa: oscuro, contraste, lectura limpia, tamaño, tipografía sencilla, espaciado, botones grandes, menos movimiento y efectos, daltonismo.
- Ajustes **«Estilo de las hojas»** y **«Estilo de las tiradas y las tarjetas»** (MR u original del sistema).
- **Reinstalar todo el contenido** al actualizar (y desde Configuración): restaura lo del módulo, añade lo nuevo y retira lo obsoleto, sin tocar lo ajeno.

- **Hojas nuevas** para manada de esbirros, mazmorra, facción, facción de la Alianza Impía, grupo invasor, panel del DJ (ciclo de juego con pistas por fase), conquista y reloj (círculo clicable); **el despertado** pasa a la hoja de monstruo (Anatomía, Secreciones/Trofeos, Conquista). Las notas usan el editor enriquecido del sistema.
- `Reinstalar` deja las imágenes de la v2.0.0 que apuntaban a archivos inexistentes (retrato del panel del DJ, imágenes de diarios, retratos de grupos) en el arte nuevo.

### Cambiado
- **Asistente y generador** rehechos (cinco secciones, tarjetas, labores por tipo).
- Las hojas originales del sistema (esbirros, mazmorra, facción, grupo, objetos) unifican su tipografía (adiós a *Piedra* a 20 px en los campos) y comparten la paleta del tema oscuro.
- Tutoriales actualizados.

### Corregido
- El cálculo de dados del sistema (`value[0]`) daba `NaN` con valores numéricos: el módulo calcula la reserva por su cuenta.
- La resistencia usa una acción, como dice el manual (y no la puntuación del atributo).

# Cambios

## 2.0.0 (2026-11-07)

Rehecho completo con la calidad MR-. Ver el informe en `docs/AUDITORIA.md`.

- **Importación**: nuevo asistente al principio (**importar todo al mundo** o **solo ordenar los compendios**), repetible desde Configuración. Corrige la importación automática, que no funcionaba en Foundry 13.
- **Carpetas**: actores, objetos, escenas, diarios, tablas y listas de reproducción ordenados por categoría; compendios en carpetas, con lo que trae el sistema separado de lo que aporta el módulo. De 7 a 10 compendios (personajes, esbirros, facciones y grupos separados).
- **Arte nuevo**: retratos, tokens, figuras de cuerpo entero, 13 dioses, 30 aventureros, 36 ayudantes, 6 manadas, 36 criaturas, 48 emblemas de facciones, iconos de salas, trampas y todo el equipo, escenas y mapas, generados en el estilo de *Wicked Ones*. Sustituye a los recortes del PDF.
- **Escenas**: lectura para leer en voz alta, música y efectos propios, miniaturas y marca MR animada; paquete completo para **MR- Dirección**.
- **Modo oscuro** corregido: los indicadores negros del sistema se ven; tema «pergamino oscuro».
- **Ficha compacta** de verdad: una sola vista con lo habitual y secciones plegables; recuerda tamaño, posición y secciones. También para manadas de esbirros.
- **Automatismos** (según el libro): estrés de las resistencias (3/2/1, crítico despeja 1), conmoción que se limpia, EXP de práctica, personaje desatado al llenar el Estrés y botón de Corazón Oscuro (+1D) con recálculo. Se corrigieron las cifras de resistencia de la 1.0.0, que no eran las del libro.
- **Tutorial guiado** para dirección y para jugadores.
- **Música y efectos** sintetizados: 16 pistas y 7 efectos.

## 1.0.0 (2026-11-05)

Primera publicación: compendios de salas, equipo, aventureros, facciones y tablas, manual en diarios, generador y campaña «El Valle Silencioso».
