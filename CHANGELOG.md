# Cambios

## 1.0.0 (2026-11-05)

Primera publicación completa para la edición en español de **Wicked Ones** (*The Hills Press*).

- **Contenido íntegro omitido en el sistema base y en la traducción previa**:
  - **130 elementos de guarida (`labores-es`)**: las 18 salas de Nivel 1, 18 salas de Nivel 2, 20 trampas, 14 trucos, 12 cerraduras y portones, 36 criaturas de guarida (N1–N3) y 12 descubrimientos subterráneos.
  - **165 piezas de arsenal, alquimia, artilugios y magia (`equipo-es`)**: equipo de mano, suministros, los 36 mejunjes alquímicos, los 36 artilugios goblinoides, las 36 pociones, los 36 objetos mágicos (N1–N3) y proyectos de ritual.
  - **30 clases de aventureros completas y 36 ayudantes (`aventureros-es`)**: cada aventurero incluye sus rasgos, motivaciones, pasiva y sus **6 movimientos individuales** (3 ofensivos y 3 defensivos) en español, además de los 36 ayudantes/mercenarios clasificados en los 6 gremios y cultos.
  - **Los 4 entornos de campaña oficiales y sus 48 facciones (`facciones-es`)**: *El Valle Silencioso*, *Las Cloacas de Cantoclaro*, *Los Mares de Sharn* y *La Guerra por el Trono*, con sus facciones configuradas en nivel, pilar y relojes, más los 6 PJ pregenerados, 6 manadas de esbirros, el mapa de la guarida inicial y 4 grupos de aventureros rivales.
  - **16 tablas aleatorias y oráculos (`tablas-es`)**: botín N1–N3, eventos de incursión, calamidades de guarida, nombres y apodos monstruosos, generador de aventureros rivales, eventos de descanso y los 5 oráculos completos del modo en solitario *El Gran Malo Malvado* (Acción, Tema, Sí/No, Reacción de Esbirros y Complicación).
  - **Manual completo de referencia y modo solitario (`manual-es`)**: 10 diarios multipágina maquetados con reglas de ciclo de fases, tabla de los 13 Dioses Oscuros con ilustraciones, guía del modo en solitario y sin DJ (*El Gran Malo Malvado*), rituales y guía de la campaña.
- **Parches Babele y traducción reactiva del DOM**:
  - Corrige textos en inglés residuales de `wicked-ones` y `wicked-ones-esp` en mejoras de esbirros, conquistas y aventureros (`compendium/es/*.json`).
  - Traduce al vuelo etiquetas inyectadas desde JS y plantillas mediante `TreeWalker` + `MutationObserver` y `lang/literales.json`.
- **Campaña lista para jugar («El Valle Silencioso: Un lugar al que llamar hogar»)**:
  - Compendio `Adventure` (`aventura-es`) con **15 escenas** (portada, los 4 mapas regionales en versión mesa y DJ, planos de las Cuevas del Paso del Mercader en versión mesa sin secretos y versión DJ con rutas y etiquetas, los 3 niveles de mazmorra y 4 escenas ilustradas de incursión, defensa, consejo de guerra y ritual), actores con retrato, token circular y **figura de cuerpo entero** a escala, y paquete completo para **MR- Dirección** (`content/direccion-es.json`).
  - Importación automática en un mundo vacío y oferta de reimportar al actualizar sin sobrescribir los PJ de los jugadores (`respetarPJ`).
- **Automatización, generador y accesibilidad**:
  - Tarjetas de chat interactivas que calculan posición, efecto, dados oscuros e impulsos diabólicos y ofrecen botones de confirmación al DJ (`Consecuencia`, `Reloj +1/+2/+3`, `Estrés`, `Tirar botín`).
  - Ventana con memoria (`ConMemoria`) para el **Generador y Oráculo del Señor Oscuro** (incursiones de aventureros N1–N3, hallazgos de excavación, botín y modo solitario).
  - Modo oscuro y controles de accesibilidad compartidos con el ecosistema `MR-`.
