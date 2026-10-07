# Cuerda roja del recorrido — 2026-10-05

La barra nativa del documento se sustituye en pantallas de al menos 900 px con puntero fino, una vez inicializado el control. El scroll real y ScrollTrigger permanecen activos. La cuerda SVG ocupa una zona transparente de 36 px a la derecha; su nudo va desde 32 px hasta 30 px antes del borde inferior. Fibras, reflejos y sombras aportan volumen sin imágenes externas ni otro canvas.

El progreso es el mismo del catálogo y la cámara. Arrastrar el nudo y usar sus teclas realiza un salto directo; pulsar a otra altura utiliza el viaje animado existente. El balanceo lateral está limitado a 3 px, con inclinación y amortiguación. En modo reducido se elimina ese balanceo y el desplazamiento es inmediato. Durante loader, diálogos y pestañas ocultas se desactiva la interacción y se detiene el ticker.

La inicialización del módulo es independiente de la navegación principal. Si falta su SVG o falla la inicialización, se conserva la barra nativa. Su destrucción cancela frames, libera la captura del puntero, aborta eventos y elimina la suscripción al recorrido y el observador de tamaño.

## Evidencia

- `npm run build`: 26 archivos, 0 errores, 0 advertencias de tipos y 0 sugerencias. Persiste el aviso anterior del módulo 3D de más de 500 kB.
- Navegador integrado, 1440 × 900: cuerda, catálogo y cámara en progreso `0.500000` después del arrastre; clic animado a `0.250612`, con cámara en `0.250615`.
- Once comprobaciones rápidas de teclado, incluidos Home, End y los límites, pasaron después de vaciar el scrub pendiente antes de aplicar un salto directo.
- Se comprobaron rueda, logo, Inicio, Enfoque, Explorar proyectos, flechas, diálogos, movimiento reducido y etiquetas en inglés. La cuerda se ocultó correctamente a 820 px y 390 px; se restauró `scrollbar-width:auto`.
- El audit de ciclo de vida pasó: modo reducido, bloqueo al ocultar la pestaña y abrir diálogos, liberación de recursos y recuperación ante fallo de inicialización o falta de markup.
- No se registraron errores de consola. Son pruebas de navegador y simulación de eventos, no ensayos en dispositivos físicos.

Las capturas, estados y el audit de ciclo de vida fueron generados como evidencia local y no se versionan. Las comprobaciones descritas son históricas; la compilación CI cubre `npm run build`, no reproduce este audit.
