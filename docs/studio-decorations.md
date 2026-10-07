# Decoraciones del estudio — 2026-10-06

El bonsái de la repisa, las ramas florales del florero y el pergamino de la pared ahora tienen geometría y superficies más naturales. Se mantienen sus anclajes, la paleta del estudio y el carácter **守**. La cámara y `garden.css` coinciden exactamente con la copia anterior a este cambio.

- **Bonsái:** tronco curvo con corteza, raíces expuestas, ramas conectadas, 2.400 agujas de pino, tierra, grava y pequeñas zonas de musgo. La maceta ovalada tiene interior, base y acabado cerámico.
- **Arreglo floral:** tres ramas curvas con pedicelos conectados, 12 flores de cinco pétalos, centros, sépalos y seis capullos. El florero conserva su forma y tono celadón, con boca abierta.
- **Pergamino:** soporte textil verde con espesor, papel marfil ligeramente curvado, tinta bermellón, rodillo de madera, remates y cordón. 守 se dibuja con Noto Serif JP una vez cargada la fuente; no forma parte de una imagen generada.

## Recursos

Las tres superficies se generaron con **ImageGen integrado**, sin modelos 3D externos. Los originales, los prompts exactos y los tamaños se conservan en `artifacts/decorations/`.

| Superficie | Archivo web | Tamaño |
| --- | --- | ---: |
| Corteza de pino | [decor-bark-v1.webp](../public/media/studio/decor-bark-v1.webp) | 117.300 bytes |
| Pétalo con transparencia | [decor-petal-v1.webp](../public/media/studio/decor-petal-v1.webp) | 40.472 bytes |
| Papel washi | [decor-washi-v1.webp](../public/media/studio/decor-washi-v1.webp) | 26.772 bytes |

[Prompts de generación](../artifacts/decorations/prompts.json). Total WebP: **184.544 bytes**, a 512 × 512. La geometría reutiliza los pétalos y centros del sakura y emplea instancias para agujas, flores, capullos, grava y musgo: 25 mallas y 30.138 triángulos efectivos.

## Carga y recursos

`createStudioDecorations` administra sus geometrías, materiales y texturas propias; conserva los mapas compartidos de madera y contacto. `house.loadDecorations(invalidate)` comienza al entrar al estudio, reutiliza su promesa y refresca el render y las sombras cuando llegan las texturas o la fuente. El desmontaje impide avisos tardíos y libera también las instancias y las texturas que terminan de cargar después.

Las nuevas texturas no aparecen en el inventario inicial de producción. En una revisión local, los recursos de la visita inicial con el audio apagado y el HTML ocuparon **885.136 bytes con gzip**, por debajo del presupuesto de 3.000.000 bytes. Esa medición histórica no incluye todos los archivos publicados; el informe generado se conserva localmente y no se versiona.

## Verificación

- `npm run build`: 37 archivos comprobados, cero errores, advertencias ni sugerencias de Astro. Vite mantiene el aviso previo sobre el tamaño del paquete de la escena.
- Primeros planos frontal y lateral de las tres piezas, renderizados por la misma fábrica utilizada en producción.
- Composición completa en 1280 × 720, 768 × 1024 y 390 × 844. Son ventanas simuladas en el navegador de escritorio, no dispositivos físicos. Los solapamientos con tarjetas y cabecera se conservan según la elección del usuario.
- Entrada desde recarga con movimiento reducido, navegación al segundo proyecto, salida y segunda entrada. Tres texturas cargadas y versión 6 estable.
- Fuente deliberadamente retrasada: las tres texturas llegan antes de 守; se produce el render al completar la fuente sin un bucle continuo.
- Inicio de carga seguido de desmontaje inmediato: no se emiten callbacks tardíos. Las llamadas posteriores reutilizan los tres recursos.
- Consola de producción y vista de revisión sin errores.

Las capturas y reportes de QA se generan localmente y no se versionan. Los originales y prompts sí se conservan como fuentes; la vista de primeros planos es una herramienta local y no se publica en `dist/`.
