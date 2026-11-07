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
