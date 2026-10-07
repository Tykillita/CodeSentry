# Arena y sombras suaves — 5 de octubre de 2026

Se retiraron las hierbas `near-grasses` y se conservaron el plano crema `#e5ddc8`, los trazos de arena y el recorrido. Una capa transparente `ShadowMaterial` recibe las sombras de casa, farol y piedras sin convertir el suelo en un material iluminado ni cambiar su color base. La arquitectura recibe sombreado propio bajo aleros, postes y cubiertas.

La luz cálida mantiene la dirección e intensidad previas. Su mapa `PCFShadowMap` usa 2048 px en escritorio/tablet y 1024 px bajo 600 px de ancho. La cámara de sombras incluye los objetos y sus proyecciones sobre el suelo. El mapa se actualiza al disponer el mundo tras un cambio de tamaño, no por el scroll; no incluye las tejas individuales, la copa animada ni los pétalos. La adaptación existente por FPS inferiores a 40 desactiva las sombras proyectadas y libera el mapa, manteniendo los contactos.

Las sombras de contacto comparten una textura procedural con borde difuso y cerrado. Las 28 piedras reutilizan un conjunto instanciado. La raíz reemplaza su disco uniforme por una sombra difusa; el respaldo SVG incorpora gradientes bajo casa/farol y sombreado bajo sus cubiertas. No se añadieron dependencias ni recursos externos, ni se publicó en Firebase.

## Verificación

`npm run build` terminó con 26 archivos revisados, 0 errores, 0 advertencias de tipos y 0 sugerencias. Persiste el aviso previo del empaquetador sobre el módulo 3D de más de 500 kB.

Una revisión local comprobó ausencia de hierbas, conservación del material y rastrillado, resoluciones 2048/2048/1024, 176 esquinas de objetos, liberación de recursos y conservación de contactos al desactivar las sombras proyectadas. El script y el informe de esa revisión no se incluyen en el repositorio; npm run build no reproduce esa auditoría geométrica.

La revisión visual se completó en el navegador integrado a 1440 × 900, 820 × 1180 y 390 × 844. La cámara regresó al mismo valor de Inicio; el contador de disposición de sombras permaneció en 5 al avanzar y regresar. El reloj del viento quedó detenido con el índice abierto. En esa revisión, movimiento reducido desmontaba el canvas y el fallo del módulo mostraba el respaldo SVG. La implementación actual conserva el canvas con movimiento reducido y usa solo el paisaje CSS si la escena falla. La salida sin scripts conserva los detalles HTML en español e inglés.

Las lecturas iniciales del navegador integrado fueron aproximadamente 90–92 FPS y 34 llamadas de dibujo. Son comprobaciones locales con tamaños emulados, no mediciones en teléfonos físicos ni una comparación controlada de rendimiento. Las capturas antes/después de escritorio y tablet, así como los resultados de automatización, se mantienen locales y no se versionan.
