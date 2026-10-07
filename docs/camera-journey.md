# Recorrido de cámara — 2026-10-05

> Revisión posterior: [Profundidad del jardín](garden-depth.md) reemplaza la disposición inicial de cámara y el desplazamiento CSS sutil del fondo descritos aquí. Árbol y paisaje ahora comparten el mismo mundo 3D.

## Cambios solicitados

- La base del tronco llega al borde inferior del viewport y continúa 2 px fuera de él. Queda detrás de los controles del footer. La alternativa estática usa el mismo margen mediante `--tree-root-bleed`.
- Se recuperó la línea superior del footer con un 9% de opacidad. El fondo sigue siendo transparente.
- Se sustituyó la cámara ortográfica y la animación de escala/posición del árbol por una cámara en perspectiva con campo de visión constante de 42°.
- El árbol conserva posición `(0, 0, 0)`, escala `1` y giro inicial fijo. El recorrido avanza la cámara hacia las ramas y la desplaza lateralmente para recorrer la copa. El cierre vuelve al encuadre inicial.
- La posición y el punto de mirada de la cámara dependen del mismo progreso que desplaza el catálogo. Al retroceder se recorre la misma trayectoria en sentido inverso. El viento ambiental sigue siendo independiente.
- Los pétalos ocupan distintos planos de profundidad. Luna y montañas tienen un desplazamiento sutil ligado al avance de la cámara.
- El indicador de proyecto se centra en el footer para conservar su legibilidad delante del tronco; el progreso lineal se reserva para pantallas amplias.

## Evidencia local

Compilación estática completada con 0 errores y 0 advertencias de tipos. Se conserva el aviso del empaquetador sobre el tamaño del módulo 3D diferido.

En escritorio de 1440 × 900, la base proyectada está en **902 px**: alcanza el límite visible de 900 px. La cámara inicial registra `-4.9442,6.6735,17.3082`.

Al avanzar a la primera ficha, el progreso es **0.066314** y la cámara registra `-6.2010,4.5024,8.4961`: el punto de vista se ha acercado al plano del árbol. La transformación del árbol sigue siendo `0,0,0,1,0,-0.13`.

La revisión visual se realiza en el navegador integrado; no supone una medición en un teléfono físico ni una publicación en Firebase.

Al volver con «Anterior», el progreso regresa a `0.000000` y la cámara recupera exactamente el encuadre inicial. En tablet de 821 × 883, la raíz se proyecta a 885 px; en móvil de 390 × 844, a 846 px. En ambos tamaños continúa detrás del footer hasta el borde inferior. El navegador no registra errores de consola durante esta revisión.

Las capturas de esa revisión local no forman parte del repositorio. La vista previa queda en Inicio y se restableció el tamaño normal del navegador.
