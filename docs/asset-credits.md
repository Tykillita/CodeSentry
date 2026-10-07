# Créditos de recursos — CodeSentry

## Muestra de paisaje sonoro del jardín

La muestra de 60 segundos es un recurso de revisión local y no forma parte del repositorio público.

### Grabación de agua

- Recurso: **Stream Sounds**.
- Autor: **kurt**.
- Fuente: <https://opengameart.org/content/stream-sounds>.
- Archivo seleccionado del paquete: `stream-waterfall/stream1.ogg`.
- Licencia: **Creative Commons Attribution 3.0**, <https://creativecommons.org/licenses/by/3.0/>.
- Cambios: selección de fragmento, adaptación a 60 segundos, filtrado, ajuste de nivel, mezcla con viento sintetizado y notas originales, y fundidos.

Attribution: “Stream Sounds” by kurt, licensed under CC BY 3.0. Source: https://opengameart.org/content/stream-sounds. Edited and mixed for the CodeSentry garden soundscape preview.

### Elementos originales de la muestra

El viento de la muestra se sintetiza a partir de ruido filtrado. Las tres notas de cuerda pulsada se sintetizan expresamente para esta muestra. No se incluyen fragmentos de First Light Particles ni Quiet Garden Meditation.

La web incorpora una adaptación de 57 segundos con unión cruzada de tres segundos, en `public/media/audio/garden.ogg` y `garden.wav`. El arroyo y el viento predominan; las tres notas aisladas mantienen la dirección acordada. El acabado de la mezcla puede ajustarse después de escucharla. La reproducción comienza apagada y solo carga el archivo al activarse.

## Recursos visuales de la web

El árbol procedural, sus ramas, las flores y pétalos, el sello CodeSentry, el paisaje CSS y los diagramas funcionales son originales de esta implementación. Las referencias adjuntas y Bushido orientan composición y movimiento; no se copian sus modelos, imágenes, código ni música.

Las imágenes públicas se adaptaron a WebP, sin cambiar su contenido:

| Recurso | Procedencia | Uso |
| --- | --- | --- |
| `sleep-panel-es/en.webp`, `sleep-activity-es/en.webp` | Documentación pública de isTargetSleeping, `docs/images` | Capturas de la aplicación |
| `cowork-es/en.webp` | Cowork, `docs/images/video-poster-es/en.jpg` | Presentación; no se etiqueta como captura |
| `centrovet-home.webp`, `centrovet-shop.webp` | Caninos y Felinos, `docs/screenshots/01-portada.png` y `03-tienda.png` | Capturas de portada y catálogo público |
| `vidmaker-frame.webp` | VidMaker, exportación original local | Fotograma generado; los valores del ejemplo no son métricas de CodeSentry |

Las capturas seleccionadas no muestran expedientes, clientes identificados, credenciales ni rutas privadas. Se utilizan únicamente los recursos de los proyectos del usuario seleccionados para esta publicación.

## Sakura

El sakura 3D, su corteza procedural y sus flores son geometría original de esta web. No se distribuye una ilustración estática alternativa del árbol. No utiliza modelos ni texturas externos.

The social card (`social.png`) reinterprets this scene with photorealistic-style artwork. Its master background and vector type overlay are kept in `tools/media/social-garden-background.webp` and `tools/media/social-overlay.svg`; `tools/prepare-media.mjs` composites them into the public asset.

La tarjeta social (`social.png`) reinterpreta esta escena con una imagen de estilo fotorrealista. El fondo maestro y la capa tipográfica vectorial se conservan en `tools/media/social-garden-background.webp` y `tools/media/social-overlay.svg`; `tools/prepare-media.mjs` los compone para producir el recurso público.

El jardín 3D de `garden-environment.ts` también usa geometría original: montañas, luna, suelo de arena, piedras, hierbas, casa de un solo techo y farol. Comparte la cámara del sakura para producir perspectiva y paralaje durante el recorrido.

## Decoraciones del estudio

El bonsái de la repisa, el arreglo floral y el pergamino usan geometría original. Las superficies `decor-bark-v1.webp`, `decor-petal-v1.webp` y `decor-washi-v1.webp` se generaron con ImageGen integrado y se adaptaron a WebP de 512 × 512; el pétalo conserva transparencia. No incorporan modelos 3D ni fotografías de terceros. Los originales y prompts exactos se conservan en `artifacts/decorations/`; detalles y capturas en [studio-decorations.md](studio-decorations.md). El carácter 守 se dibuja con la fuente japonesa, separado de la textura de papel.

## Tipografías

Noto Serif JP, Manrope e IBM Plex Mono se alojan localmente mediante Fontsource, usando el subconjunto latino para ES/EN. Los pequeños caracteres japoneses pueden usar la fuente serif del sistema. Licencias SIL Open Font License incluidas en `public/fonts/licenses/`.

La atribución del agua y los enlaces a las licencias también son accesibles desde el diálogo de créditos y `public/media/credits.txt`.

## Recurso candidato para producción

- **Gentle wind**, de **fthgurdy**.
- Fuente: <https://freesound.org/people/fthgurdy/sounds/528944/>.
- Licencia publicada: **CC0**.
- Estado: identificado; no descargado ni usado en la muestra.
