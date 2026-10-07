# Cordón lateral unido a los rodillos

El control de lectura ahora está suspendido junto al borde exterior del papel. Dos vueltas de lino cruzan la cara de cada rodillo, terminan en un pequeño nudo y se unen al tramo vertical. La tablilla tiene una cara de madera tallada, un canto oscuro y dos perforaciones por las que pasa la cuerda. El papel, sus dimensiones, el contenido, las tipografías, los rodillos y su física se conservan.

## Geometría y capas

`scroll-reader-geometry.ts` calcula la curva, sus dos hebras retorcidas, las perforaciones, el recorrido y los límites de ventana. El trazo usa interpolación de x en función de y para evitar bucles junto a las perforaciones. Las fibras siguen la tangente y su torsión se calcula por distancia recorrida, con un paso de 6,5 px. Los 18 puntos físicos y sus extremos fijos proceden del modelo existente; la geometría añade guías por las dos perforaciones, transformadas con la inclinación de la madera.

La cuerda mide 3,6 px, con un contorno fino que define su sección. Se separa 10 px del papel desde 1100 px de ancho y 3 px en ventanas menores. La tablilla ocupa 14 × 30 px incluyendo su contorno. Su zona interactiva fija de 44 × 44 px se extiende hacia dentro para permanecer completa en la ventana. El recorrido reserva 34 px desde cada anclaje, y se oculta la tablilla mientras los rodillos están demasiado juntos. La inclinación conserva el límite de 9 grados; el movimiento exterior se limita además por el espacio disponible para mantener una separación mínima de 2 px con el borde de la ventana.

Los anclajes usan el centro y radio reales de cada rodillo, incluidos sus offsets de -2/+2 px en el diseño móvil. Se dibujan en una capa frontal sobre la madera. El tramo suspendido y la tablilla quedan detrás de la superficie temporal del papel, por lo que la curvatura puede ocultarlos de forma coherente. La sombra del cordón se proyecta hacia el papel y se recorta a su superficie; no se dibuja sobre el fondo fuera del papel.

`scroll-reader.ts` conserva `refresh()`, `setEnabled()`, `setPaperMotion()` y `destroy()`. Recalcula anclajes y coordenadas al redimensionar, adapta arrastre y pulsación al nuevo recorrido y oculta los amarres junto con el control cuando el contenido cabe entero o se desmonta. La posición de lectura sigue siendo el `scrollTop` real. Se conservan rueda, gestos sobre el papel, teclado, foco y movimiento reducido. No se introducen dependencias ni bucles adicionales de animación.

## Evidencia

Las revisiones locales cubrieron 360 combinaciones de geometría, tamaños de 320 a 1280 px, la matriz de 16 proyectos en ambos idiomas, contratos del controlador, interacción, alto contraste y compilación. Los informes JSON y las capturas generados no se versionan. El harness de geometría reproducible está en `tools/verify-reader-geometry.mjs`; la vista manual `artifacts/reader-cord-integration/verify.html` también se conserva como fuente.

Las ventanas móviles son simuladas. El gesto táctil de la prueba de contratos es sintético y simula la captura del puntero; el arrastre de ratón y la rueda usan entrada real del navegador. La vista `verify.html` y su emulación de contraste están fuera del sitio publicado. La compilación conserva el aviso previo sobre el tamaño del chunk de la escena 3D.
