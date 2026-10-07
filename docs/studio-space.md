# Casa y estudio ampliados — 2026-10-06

El cuarto tiene 3,8 unidades locales de ancho, 4,3 de fondo y 2,6 de altura libre. Su suelo sigue en `y=0,37`; techo, paredes, entrada y exterior comparten `STUDIO_ROOM`. La mesa y el atril conservan sus medidas. Los conjuntos existentes —tokonoma, estantes, biombo, escritorio, brasero, bandeja y lámparas— se trasladan sin escalar sus objetos.

Se conservan los materiales y sus colores, mapas, rugosidad y acabados. El CSS de la página coincide byte por byte con el anterior. Se amplían el entramado, la cubierta curva y el tatami usando los mismos acabados. Las luces conservan sus colores y acompañan la nueva posición de lámparas y ventana.

La cámara parte de una inclinación de 28°, encuadra el pergamino con más espacio alrededor y adapta la altura y el campo de visión (60–68°) al viewport. En móvil de hasta 600 px, el encuadre de lectura se acerca: el pergamino ocupa el ancho del escenario, frente al 78 % usado en escritorio. Mantiene 0,15 unidades de separación de las paredes y una altura máxima de 1,75. Las ventanas muy anchas conservan al menos 1,05 unidades de distancia de lectura. El plano cercano termina en 0,04; se eliminó el recorte de la pared frontal.

El humo del incienso desplaza sus volutas hacia arriba. Una máscara fija conserva el nacimiento junto al quemador y la disipación en el extremo superior; el movimiento reducido detiene la animación.

El recorrido de 2,8 segundos pasa por el acceso, el umbral y un punto interior antes de llegar a la mesa. Sus segmentos permanecen dentro del acceso o del cuarto, sin sobrepasar los puntos de control. Salir recorre los mismos puntos en sentido inverso. El encuadre evita que el pergamino quede debajo del footer en ventanas bajas.

El reconstruido del catálogo guarda el proyecto antes de cambiar entre desplazamiento vertical y horizontal: los eventos transitorios de scroll ya no lo devuelven al inicio durante un resize.

## Verificación

- `node tools/verify-studio-camera.mjs`: 352 poses y 141.504 muestras de recorrido, incluidos los cuatro vértices del plano cercano, paredes, techo, suelo y vano de la puerta. Incluye los 16 proyectos, modo normal/reducido y 11 proporciones de ventana.
- `npm run build`: 36 archivos, 0 errores, 0 advertencias de tipos y 0 hints. Continúa el aviso existente sobre el tamaño del módulo 3D diferido.
- Navegador: vistas de 320×844, 390×844, 874×882, 1440×900, 844×390, 599×900, 600×900, 899×900, 900×900 y 2560×1080. El proyecto seleccionado se conserva al cruzar los breakpoints.
- Los 16 pergaminos se abren en movimiento reducido y mantienen su botón de detalle. Se comprobó la apertura y cierre del detalle, la entrada/salida y un cambio de ventana durante la entrada.
- Las capturas y reportes de esa revisión se generaron localmente y no se versionan.

La revisión es local y usa tamaños simulados en el navegador del equipo; no se publicó una nueva versión.
