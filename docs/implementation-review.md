# Revisión de implementación — 2026-10-05

## Resultado

La revisión inicial se conserva como registro. El rediseño posterior del sakura, sus nuevos materiales y su apoyo sobre el footer están documentados en `tree-redesign.md`.

El footer se rediseñó posteriormente como controles transparentes sobre el paisaje: sin degradado, relleno, sombra, desenfoque ni línea de separación. Los iconos usan trazos SVG consistentes y la navegación tiene áreas de interacción de 44 px. En móvil, el indicador de posición conserva su anuncio accesible y los controles se distribuyen para dejar visible el fondo. Las capturas de esa revisión son locales y no se versionan; la compilación estática finalizó correctamente.

Implementación estática completa de CodeSentry, con 16 iniciativas, ES/EN, recorrido horizontal, sakura 3D original, índice filtrable, detalles superpuestos y ambiente opcional. Preparada para Firebase Hosting clásico en `gocodesentry`. El estado actual del canal live se consulta directamente en Firebase Hosting y no se deduce de esta revisión histórica.

La revisión se hizo sobre la compilación de producción servida localmente en un navegador. Se usaron vistas de escritorio, tablet y móvil. No se añadió un framework de pruebas.

## Criterios y evidencia

| Criterio | Resultado observado |
| --- | --- |
| 16 iniciativas y agrupación de copias | 16 tarjetas y 16 detalles en **cada idioma**; orden validado mediante la colección. Los inventarios editoriales locales no forman parte del repo público. |
| Presentación empresarial | Cada ficha expone propósito, funciones, flujo, arquitectura, tecnologías y decisiones. La portada y el cierre presentan sistemas y productos; no hay sección de contacto. |
| Dirección japonesa clara | Papel washi, marfil, tinta, bermellón, flores sakura, luna, montañas, templo y farol discretos; tipografías locales y caracteres japoneses junto a etiquetas comprensibles. |
| Protagonista 3D | Un mismo árbol procedural pasa de vista completa a encuadres de rama. Flores y pétalos instanciados; tronco y ramas combinados en una geometría. No se distribuyen recursos de Bushido. |
| Scroll compartido | En escritorio, el avance vertical desplaza el pergamino con pin y scrub. En una muestra, el DOM y la escena registraron **0.076167** de progreso simultáneamente. |
| Movimiento reversible | PAMS → proyecto siguiente → PAMS devolvió los mismos valores: progreso **0.299747**, pose `8.5495,-5.7240,1.7560,0.0700,-0.4679` y trayectoria principal del pétalo `-8.035420,-0.157860,0.098229`. El viento ambiental es independiente. |
| Índice y filtros | 16 resultados iniciales; `fastapi` devuelve Vigilia; búsqueda inexistente muestra el estado vacío; Operaciones + Firebase devuelve Técnico Terminal; restablecimiento correcto. |
| Saltos y teclado | Saltos directos desde el índice, anterior/siguiente y flechas del teclado seleccionan la tarjeta correspondiente. El scroll hacia delante y hacia atrás funciona. |
| Móvil | Vista **390 × 844**: recorrido horizontal nativo, ajuste a tarjetas, controles y diálogo legibles. El desplazamiento lateral cambia la selección; los botones y el detalle funcionan. |
| Diálogo y foco | Apertura por tarjeta, Escape y cierre visible correctos. Shift+Tab permanece dentro del diálogo; el cierre restaura el foco en el botón del proyecto. La barra de cierre permanece visible al recorrer contenido largo. |
| Historial y enlaces | Atrás cierra el detalle; Adelante lo reabre. El cambio ES → EN conservó Técnico Terminal abierto con sus textos traducidos. La apertura inicial mediante hash selecciona y abre el proyecto. |
| Recarga de la entrada | La recarga de `/es/` sin hash vuelve a la portada con progreso DOM/3D **0.000000** y audio sin cargar. El recorrido controla su restauración de scroll. |
| Cambio de tamaño | Se cambió de escritorio a móvil con PAMS abierto. Al cerrar, continuó seleccionada la lámina 05 y se restauró el foco. |
| Sonido voluntario | Ningún elemento de audio en la entrada. Al activar, se crea el reproductor local; duración observada **57.01161 s**, reproducción efectiva y control de apagado correcto. Cada recarga vuelve a silencio. |
| Movimiento reducido | La implementación actual conserva el canvas 3D y detiene el bucle de viento, cámara y navegación. El sistema establece el modo inicial; una elección manual guardada puede anularla. El loader del logo siempre anima. Una revisión anterior registró nueve escenarios; sus informes son locales y no forman parte de CI. |
| Alternativa HTML | La vista auxiliar sin scripts confirmó el catálogo y los detalles HTML desplegables; 16 detalles de proyecto, ficha accesible mediante ancla y contenido técnico completo. El código incluye índice y medios en `noscript`. |
| Fallo de 3D | La implementación actual conserva el paisaje CSS y el catálogo cuando el módulo o WebGL fallan; ya no se distribuye el árbol SVG de respaldo. También se controla la pérdida del contexto WebGL en el código y la verificación automatizada. |
| Contenido público | La salida HTML no contiene rutas locales de investigación ni claves privadas según la inspección del artefacto. Los medios públicos se seleccionaron explícitamente; no se copian archivos de clientes o configuración de los proyectos originales. |
| Rutas y publicación | `/es/`, `/en/` y los medios responden 200; una ruta inexistente responde 404. La raíz contiene redirección estática; Hosting configura además redirección HTTP a `/es/`. Salida sin reescritura global de SPA. |
| Compilación | `npm run build`: 26 archivos revisados, **0 errores, 0 advertencias de tipos y 0 hints**. Generadas las cuatro páginas y el sitemap. |

## Rendimiento medido y límites

- Muestra inicial del renderer: **99 fps**, **4 llamadas de dibujo**, tanto en la vista de escritorio como en la vista de 390 × 844 sobre este equipo Windows. La muestra se toma después de cuatro segundos de frames válidos.
- El viewport móvil es una simulación de tamaño en el navegador del equipo; **no representa una medición en un teléfono físico**.
- Todo el JavaScript de la compilación: aproximadamente **379 KB gzip**. El módulo de escena se solicita después de la primera pintura y mide aproximadamente **255 KB gzip**.
- Todos los archivos de publicación, incluyendo OGG, WAV alternativo, medios y fuentes: aproximadamente **8.0 MB**. Todo el sitio excluyendo audio ocupa aproximadamente **2.53 MB sin compresión**; el presupuesto de 3 MB queda cumplido incluso considerando recursos que no se descargan en la entrada.
- La compilación emite el aviso informativo de Vite por un chunk de Three.js que supera 500 KB sin comprimir. El módulo es diferido y su tamaño comprimido está medido arriba.
- La interfaz HTML y el fondo CSS están disponibles antes de cargar React/Three.js. Audio apagado en cada entrada, galería diferida y DPR con límites y reducción adaptable.
- Render y audio se pausan mediante `visibilitychange`; el render también se pausa en los diálogos. La inspección del código confirmó estas rutas. No se forzó una interrupción real del controlador gráfico del equipo.

El informe local `build-report.json` conserva detalles de tamaños y rutas, pero no se versiona. La compresión medida es gzip local; la transferencia efectiva depende de las cabeceras del servidor y del navegador.

## Enlaces públicos

Consultados el 2026-10-05 mediante solicitudes públicas y comprobación de título. Todos devolvieron HTTP 200:

- isTargetSleeping: `https://istargetsleeping.web.app/` y `https://github.com/Tykillita/isTargetSleeping`.
- Caninos y Felinos: `https://vetcentercaninosyfelinos.web.app/` y `https://github.com/Tykillita/CentroVeterinario`.
- Cowork: `https://cwspace.web.app/novedades`.
- Vigilia: `https://vigilia-health.vercel.app/`, `https://vigilia-project-pi.vercel.app/` y `https://github.com/rgkue/vigilia-project`.

La comprobación confirma que los destinos son públicos y responden. No equivale a revisar todos los flujos internos de esas aplicaciones.

## Recursos y continuación

- Capturas reales, presentaciones y esquemas se identifican por separado. Créditos de colaboración de Vigilia incluidos.
- El agua tiene atribución CC BY 3.0; viento y notas son síntesis original. Fuentes locales con sus licencias. Procedencia completa en `asset-credits.md`.
- La mezcla responde al ambiente lento de agua y viento acordado. Puede ajustarse tras la valoración auditiva del usuario; no se presenta como una pista comercial previamente aprobada.
- Antes de publicar en Firebase, comprobar el sitio de Hosting y la cuenta autorizada. Las instrucciones están en `README.md`; no se ha sustituido una publicación existente.

La evidencia visual de esta revisión es local y no se versiona.
