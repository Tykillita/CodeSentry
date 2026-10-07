# Viento del sakura — 2026-10-05

## Comportamiento

La escena tiene una brisa suave continua, aunque el visitante permanezca quieto. Las ráfagas duran entre 2 y 4 segundos, separadas por 10–18 segundos de calma, y entran y salen con una curva suave. El viento cambia lentamente de dirección e incluye variaciones espaciales pequeñas. Su reloj es independiente del scroll y del sonido.

Un mismo campo de viento mueve las flores, las ramitas flexibles y los pétalos desprendidos. La flexibilidad aumenta con la distancia al tronco y a las ramas principales; las geometrías de raíces, tronco y ramas principales reciben peso cero. La copa conserva sus puntos de unión y el balanceo está limitado a 0,15 unidades del mundo. La transformación del árbol y la cámara del jardín se mantienen como en la revisión anterior.

Cada pétalo nace junto a una flor real del modelo, incluyendo su desplazamiento por viento. Tiene posición y velocidad propias, gravedad, arrastre hacia la velocidad del aire, una ligera sustentación y rotación irregular. Al llegar al suelo, desliza brevemente y se aplana; reposa 3–6 segundos, se desvanece durante 2 segundos y se reutiliza. Las edades iniciales están repartidas para que ya haya pétalos en distintas fases al entrar.

## Implementación

- `src/components/scene/wind-simulation.ts`: campo de viento, flexibilidad, integración y conjunto limitado de partículas.
- `src/components/scene/wind-shaders.ts`: desplazamiento de la copa y opacidad por instancia.
- `src/components/scene/SakuraCanvas.tsx`: reloj compartido, dibujo instanciado, adaptación y pausas.

La simulación integra a 1/60 s, con un máximo de cuatro pasos por fotograma. Mantiene un conjunto preasignado de 96 pétalos; dibuja 32 en pantallas menores de 600 px. Si la muestra inicial de rendimiento baja de 40 FPS, reduce DPR a 1 y partículas a 48 o 16. No crea mallas ni actualiza estado de React en cada fotograma. Ordena las instancias de pétalos por distancia para su transparencia y libera geometrías y materiales al desmontarse.

Al abrir un diálogo u ocultar la pestaña, la escena suspende su reloj y el bucle de renderizado. Al reanudar, descarta el primer intervalo para impedir que el tiempo oculto se convierta en un salto de física. Con movimiento reducido, el canvas conserva la pose 3D y usa renderizado bajo demanda; viento y pétalos quedan congelados. El control de ambiente sigue apagado al entrar y no controla el viento.

## Comprobación local

`npm run build` completado: 22 archivos revisados, 0 errores, 0 advertencias de tipos y 0 sugerencias. Se mantiene el aviso previo del empaquetador sobre el módulo 3D diferido de más de 500 kB. Sin dependencias nuevas.

Comprobación numérica con el modelo y las clases reales, durante 90 segundos simulados:

| Comprobación | Resultado |
| --- | --- |
| Misma secuencia a 30, 60 y 120 FPS | Posiciones finales idénticas |
| Aterrizajes / reciclados | 343 / 343; se observaron las tres fases |
| Posiciones, rotaciones y opacidad | Valores finitos, rotaciones normalizadas, sin atravesar el suelo |
| Ráfagas | Máximo del sobre 0,99995 |
| Balanceo de copa en 60 s | Máximo observado 0,09586 unidades |
| Peso cero del soporte rígido | Desplazamiento exactamente cero |
| Reanudación tras intervalo de 30 s | Sin avance del reloj en el primer fotograma |
| Límites de partículas | 96, 32, 48 y 16 |

En el navegador integrado, a 1440 × 900, la portada permaneció en progreso cero mientras el reloj del viento avanzó de 0 a 226,77 segundos; cámara y puntos del paisaje conservaron sus coordenadas. En ese intervalo se registraron 858 aterrizajes y 857 reciclados, y cambió la posición del pétalo de referencia y el balanceo de la copa. La muestra inicial fue de 93 FPS con 43 llamadas de dibujo en este equipo.

El índice congeló el reloj en 227,0167 segundos y mantuvo exactamente iguales posición y balanceo; al cerrarlo reanudó en 227,2667, sin recuperar el tiempo de pausa. Avanzar a la primera ficha movió la cámara a `-5.8922,2.1157,13.5242`; retroceder restauró `-5.4696,2.0000,20.4237`, mientras el viento siguió avanzando. La raíz de portada permaneció a 902 px y el árbol mantuvo su transformación `0,0,0,1,0,-0.13`.

La pausa por pestaña oculta usa el mismo estado de suspensión, conectado a `document.hidden` mediante `visibilitychange`; se revisó esa conexión y el descarte de tiempo con la comprobación numérica. La automatización del navegador integrado no permite cambiar la visibilidad del documento de una pestaña, por lo que ese evento no se forzó desde la interfaz.

La revisión móvil usa un viewport emulado de 390 × 844, no un teléfono físico. Se observaron 32 pétalos y raíz a 846 px. La primera ficha conservó sus controles y contenido legible. La revisión anterior probó el modo reducido desmontando el canvas; la implementación actual conserva la misma escena y detiene el reloj. El fallo de WebGL deja el paisaje CSS y la navegación disponibles.

Las capturas finales son evidencia local y no se versionan. El viewport temporal se restableció después de la revisión.

La web queda preparada en la vista previa local. Esta revisión no publica en Firebase.
