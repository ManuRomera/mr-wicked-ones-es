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
