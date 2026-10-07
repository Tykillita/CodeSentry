# Profundidad del jardín — 2026-10-05

## Dirección

El movimiento debía transmitir que el visitante entra en el jardín. El pequeño desplazamiento CSS del fondo anterior no aportaba referencias suficientes de distancia. Esta revisión sustituye ese fondo animado por objetos del mismo mundo 3D que el árbol.

- Encuadre inicial un 18% más lejano, con la cámara a una altura constante de 2 unidades y mirando hacia la copa. La raíz continúa 2 px fuera del borde inferior.
- Llegada a las ramas al 12% del recorrido, para repartir el avance inicial entre las primeras fichas. Campo de visión constante de 42°; el árbol conserva su posición y escala.
- Suelo horizontal con trazos de arena rastrillada, un camino de piedras y pequeñas hierbas. Su perspectiva permite ver el avance y el paso junto a elementos cercanos.
- Casa con un solo techo y farol en distancias intermedias; tres capas de montañas y luna en planos más lejanos. Todos se proyectan con la misma cámara del sakura.
- Niebla de distancia y contrastes suaves mantienen el acabado de ilustración sobre papel. La luna conserva el marfil de la interfaz.
- Las posiciones del paisaje se calculan al cambiar el tamaño de pantalla. Durante el recorrido animado permanecen fijas en el mundo; se mueve la cámara. Con movimiento reducido, la cámara queda quieta y el canvas solo se redibuja al cambiar la vista. El fondo CSS cubre la carga y los fallos de WebGL; sin JavaScript permanece el contenido HTML.
- El footer conserva su transparencia y la divisoria al 9% de opacidad.

No se añadieron dependencias ni modelos, imágenes o texturas externos. Geometrías estáticas reutilizadas, piedras instanciadas y liberación de recursos al desmontar la escena. Se mantiene la adaptación de DPR y la pausa al abrir diálogos u ocultar la pestaña.

## Evidencia local

`npm run build` finalizó correctamente: 20 archivos revisados, 0 errores, 0 advertencias de tipos y 0 sugerencias. El empaquetador conserva su aviso previo del módulo 3D diferido de más de 500 kB.

En el navegador integrado, a 1440 × 900:

| Vista | Cámara X, Y, Z | Base de la casa en pantalla | Piedra de referencia en pantalla | Centro de la luna en pantalla |
| --- | --- | --- | --- | --- |
| Inicio, progreso 0 | -5.4696, 2.0000, 20.4237 | 1172, 849 | 837, 878 | 992, 398 |
| Primera ficha, progreso 0.066314 | -5.8922, 2.1157, 13.5242 | 1208, 928 | 827, 986 | 920, 441 |
| Segunda ficha, progreso 0.124660 | -6.2004, 2.2002, 8.4985 | 1174, 1046 | 775, 1163 | 785, 518 |

La transformación del árbol se mantiene en `0,0,0,1,0,-0.13` durante el recorrido. Al volver a Inicio, cámara y paisaje recuperan el encuadre de entrada. La raíz inicial se proyecta a 902 px en escritorio y 885 px en tablet de 821 × 883.

Se revisó también la presentación móvil de 390 × 844, el avance con sus controles y el modo de movimiento reducido, que conserva el canvas y usa el paisaje CSS durante la carga. No aparecieron errores de consola. Es una revisión en navegador con tamaños emulados, no en un teléfono físico.

Las capturas finales son evidencia local de revisión y no se versionan.

## Archivos

- `src/components/scene/garden-environment.ts`: construcción y disposición del jardín.
- `src/components/scene/SakuraCanvas.tsx`: cámara compartida, trayectoria y niebla.
- `src/styles/garden.css`: fondo CSS durante la carga o un fallo de WebGL.
- `src/lib/garden.ts`: conserva el progreso único del catálogo; elimina la máscara global que ocultaba el suelo.

## Casa de té y farol de piedra — 5 de octubre de 2026

La casa incorpora un tejado a cuatro aguas con aleros curvos, 452 tejas instanciadas, cumbrera, postes, vigas, ventanas shoji, puerta retranqueada, plataforma y dos escalones. El farol tiene pedestal, cámara abierta con cuatro soportes, cubierta tallada y una luz ámbar tenue de alcance corto. Ambos utilizan materiales opacos iluminados y sombras de contacto. Se conservaron sus referencias y posiciones en el mundo.

Las piezas de carpintería y piedra se agrupan por material. Las tres texturas procedurales son de 256 × 256 px, sin recursos externos. Una inspección del modelo confirmó posiciones finitas, normales superiores del tejado hacia arriba y liberación de geometrías, materiales, texturas e instancias. El farol mide 1,463 unidades de alto, dentro del incremento máximo del 15% previsto.

Comprobaciones: `npm run build` terminó con 24 archivos revisados, 0 errores, 0 advertencias de tipos y 0 sugerencias; permanece el aviso previo del empaquetador sobre el módulo 3D de más de 500 kB. En Inicio, en el mismo navegador integrado, las llamadas de dibujo bajaron de 43 a 33 y la lectura inicial de FPS fue aproximadamente 94 antes y después. Esta lectura sirve como comprobación local, no como un ensayo de rendimiento en dispositivos físicos.

La revisión histórica de la dirección visual inspeccionó Inicio y Enfoque a 1440 × 900, 820 × 1180 y 390 × 844; el avance con botón y teclado, y el regreso con el logo. El modo reducido de esa versión usaba un SVG de respaldo, que ya se retiró. La implementación actual conserva el canvas y el movimiento reducido congela la escena. Las capturas históricas se mantienen localmente.
