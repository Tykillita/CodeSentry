# Rediseño del sakura — 2026-10-05

## Cambios

- Tronco más orgánico, ensanchamiento de la base y raíces de apoyo. Curvas con secciones suaves, variación de grosor y superficie irregular.
- Ramas conectadas a la curva de su rama madre, copa asimétrica y pequeños tallos que sostienen los racimos.
- Corteza procedural con las marcas horizontales características del cerezo; materiales con respuesta a la iluminación y relieve sutil.
- 1872 flores con cinco pétalos curvos, hendidura en la punta, color gradual, distintas orientaciones, estambres y botones cerrados.
- En portada y cierre, la base se sitúa sobre el borde superior real de `.journey-controls`. Se mide ese borde y se convierte a coordenadas de la cámara; se recalcula al cambiar el tamaño. El canvas se recorta en ese mismo borde.
- Encuadres específicos para escritorio, tablet y móvil, con la base fuera del contador de proyectos. El recorrido mantiene la rama y los pétalos ligados a su progreso.
- Alternativa SVG generada a partir de la misma estructura; también termina en el borde del footer.

## Revisión visual

La compilación estática finaliza con **0 errores de tipos, 0 advertencias de tipos y 0 hints**. Se conserva el aviso informativo del empaquetador sobre el tamaño del módulo 3D, que se carga de forma diferida.

En el navegador integrado, base del modelo / borde del footer:

| Vista | Base | Footer |
| --- | --- | --- |
| 1440 × 900 | 824 px | 824 px |
| 821 × 883 | 811 px | 811 px |
| 390 × 844 | 780 px | 780 px |

La alternativa estática también termina en 824 px en escritorio. Se avanzó a la primera ficha y se volvió a portada, conservando la animación. No se observaron errores de consola. La muestra local del renderer en escritorio registró 94 fps y 6 llamadas de dibujo; no representa un resultado de un teléfono físico.

Las capturas de esa revisión son locales y no se versionan. La vista previa de entonces usó el puerto 4322; el estado actual de Hosting se consulta por separado.

## Ajuste posterior del apoyo y la casa

Este ajuste del apoyo fue sustituido después por la base al borde inferior y el recorrido real de cámara, documentados en `camera-journey.md`.

Por petición del usuario, la base ahora entra detrás de la parte superior del footer transparente: se desplaza un 38% de la altura del footer desde su borde superior. El 3D y el SVG comparten `--tree-footer-depth`, y se retiró el recorte que impedía mostrar las raíces detrás de los controles. En 821 × 883 se observó base en 838 px / inicio del footer en 811 px; en 390 × 844, base en 804 px / inicio en 780 px.

La casa del paisaje conserva un único techo. Se quitó la segunda cubierta y se extendió la fachada hasta la cubierta restante. Las capturas de esa revisión son locales y no se versionan. La compilación estática terminó correctamente.
