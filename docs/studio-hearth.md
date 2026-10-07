# Brasero y tetera del estudio

`src/components/scene/studio-hearth.ts` reemplaza las primitivas del rincón delantero izquierdo por un conjunto de cerámica e hierro. Conserva el ancla horizontal original (`STUDIO_OFFSETS.hearth`) y apoya la pieza sobre la cara superior del tatami.

- Brasero hueco con perfil torneado suave, labio redondeado, pie e interior de arcilla. El esmalte tiene variaciones de color y relieve fino.
- Cama de ceniza con relieve, granos, siete piezas irregulares de carbón y rescoldos discretos debajo. Las partículas quedan estáticas.
- Soporte de hierro con tres patas y aro; la tetera descansa sobre él.
- Tetera con tapa independiente, pomo, borde desgastado, pico curvo hueco y asa arqueada con anclajes. Los 440 relieves se colocan sobre el mismo perfil curvo del cuerpo.

Referencia de forma y material: [tetera de hierro del National Museum of Asian Art](https://asia-archive.si.edu/object/FSC-M-94a-b/). No se incorpora ninguna imagen ni modelo externo. Las cuatro superficies se generan con semillas estables en mapas de 256 × 256; los mapas de relieve usan espacio de color lineal.

Las piezas pequeñas se combinan por material; los relieves y granos usan instancias. El conjunto suma 21 mallas y 39.038 triángulos efectivos. No añade descargas ni un bucle de animación. `house-interior.ts` monta el conjunto y llama a su `dispose()` al desmontar la casa. Se liberan las geometrías, materiales, texturas e instancias propias y se conserva la textura de contacto compartida.

## Revisión local

La vista `artifacts/hearth/preview.html` utiliza la misma fábrica que producción. Se sirve con `node node_modules/vite/bin/vite.js --config artifacts/hearth/vite.config.mjs` y no se publica en `dist/`.

- Primeros planos desde varios ángulos: cerámica hueca, tapa, asa, pico y soporte visibles.
- La revisión local de ciclo de vida registró 22 geometrías y 14 texturas al terminar; el JSON generado no se versiona.
- La escena se revisó en ventanas emuladas de 1280 × 720, 390 × 844 y 874 × 882. Las capturas y reportes generados se mantienen locales.
- `npm run build`: 42 archivos comprobados, cero errores, advertencias o sugerencias de Astro. Vite conserva el aviso existente del paquete de escena mayor de 500 kB.
