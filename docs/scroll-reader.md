# Lectura del pergamino con cordón y madera

El diálogo de detalle conserva la lectura continua sobre papel y sus rodillos de madera. Junto al borde exterior derecho cuelga un cordón de lino con fibras, sujeto a los rodillos mediante vueltas y nudos. Su tablilla tallada tiene dos perforaciones y un amarre bermellón. Se puede arrastrar la tablilla, pulsar otra altura del cordón o seguir leyendo con rueda, trackpad y deslizamiento sobre el papel. El porcentaje se comunica a tecnologías de asistencia, sin etiqueta visual. El arrastre no muestra un recuadro; el foco de teclado resalta únicamente el contorno de la madera.

La barra nativa se oculta después de preparar el control. El papel y el cordón comparten la animación de apertura y cierre; el control permanece desactivado mientras esa animación está en curso. La cabecera pertenece al inicio del papel y sale de la vista al bajar; reaparece al volver arriba. El título admite saltos en sus límites CamelCase y, cuando hace falta, dentro de una palabra para mantener libre el margen en ventanas estrechas. El botón de cerrar recibe el foco inicial.

## Control y accesibilidad

`initScrollReader` recibe el diálogo, la hoja, el idioma y una función para consultar el movimiento reducido. Devuelve `refresh()`, `setEnabled()`, `setPaperMotion()` y `destroy()`; una segunda inicialización sobre el mismo diálogo devuelve la instancia existente. La posición procede siempre de `scrollTop / (scrollHeight - clientHeight)`.

- Slider vertical «Posición de lectura» / «Reading position», con porcentaje accesible, orientación, límites, referencia a la hoja y foco visible.
- Flechas: 40 px; Re Pág/Av Pág: 85 % del área visible; Inicio/Fin: extremos.
- Área del agarre de 44 × 44 px. Captura del puntero durante el arrastre; los contactos secundarios no desplazan el agarre ni cancelan el contacto principal.
- Respuesta física amortiguada del cordón y del agarre durante la apertura, el cierre y la lectura, desactivada con movimiento reducido. El texto permanece estable al leer.
- Sincronización mediante eventos de scroll, observación de tamaños y cambios de contenido, carga de imágenes y fuentes. No utiliza un bucle de animación permanente.
- Contenido que cabe completo: control oculto y fuera del orden de tabulación. El desmontaje elimina listeners y observadores, libera la captura y restituye el scrollbar nativo.
- Colores del sistema y contornos explícitos para `forced-colors`; los gradientes y sombras dejan de ser necesarios para reconocer el control.

Los estilos están limitados al diálogo de lectura. `garden.css` y el controlador de la cuerda roja del recorrido se mantienen intactos. No se añaden dependencias ni imágenes rasterizadas: el cordón y la tablilla son SVG y CSS originales.

## Verificación

Las revisiones locales cubrieron los 16 proyectos en ambos idiomas, teclado, puntero, movimiento reducido, tamaños de 320 a 1280 px, foco y compilación. Los informes JSON y capturas son salidas QA regenerables y no se versionan. La herramienta manual `artifacts/scroll-reader/verify.html` sí se conserva como fuente.

La vista `verify.html` es una herramienta local bajo `artifacts/`, fuera del sitio publicado. El modo de alto contraste se revisa por sus reglas CSS; no se cambia la configuración de Windows.

La ampliación posterior de físicas del papel y del cordón está descrita en [parchment-physics.md](parchment-physics.md). Conserva la paleta, el contenido y el control de lectura de esta implementación.

La integración del cordón suspendido, sus amarres y la tablilla perforada está descrita en [reader-cord-integration.md](reader-cord-integration.md); los informes de QA de esa revisión se mantienen locales.
