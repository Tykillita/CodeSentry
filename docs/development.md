# Desarrollo y versionado de CodeSentry

## Build local

CodeSentry necesita Node.js 22.12 o posterior y npm.

~~~powershell
npm ci
npm run dev
npm run build
npm run preview -- --port 4322
~~~

Si un entorno Windows restringido bloquea la escritura de telemetría de Astro, establece ASTRO_TELEMETRY_DISABLED=1 antes del build. No cambia el contenido del sitio.

## Archivos públicos

El repositorio conserva la fuente del sitio, sus recursos públicos, documentación útil, los tres PNG originales de texturas, sus prompts y manifiesto, y los harnesses de QA indicados en .gitignore. No versiona configuraciones de lanzamiento locales, planes e inventarios de trabajo, capturas de QA, informes generados, cachés Vite ni copias de código anteriores.

Los archivos omitidos permanecen en la carpeta local. Los documentos técnicos pueden describir verificaciones hechas durante el desarrollo, pero deben identificarlas como históricas/locales y no enlazar salidas que no forman parte del repositorio. No publiques datos privados de los proyectos descritos en el catálogo.

## Versionado

Los cambios continuos quedan registrados en CHANGELOG.md bajo Unreleased. No se incrementa la versión privada del paquete con cada cambio de la web. Cuando el usuario declare un hito de release, crea un tag SemVer vX.Y.Z y mueve las entradas correspondientes de Unreleased a esa release.

## GitHub Actions y Firebase Hosting

Los pull requests ejecutan npm ci y npm run build. Los PRs de ramas del mismo repositorio reciben un canal preview temporal de Firebase Hosting; los PRs de forks solo ejecutan el build porque GitHub no comparte secretos con ellos. La integración en main despliega dist al sitio Hosting gocodesentry.

Configura FIREBASE_SERVICE_ACCOUNT_GOCODESENTRY como secreto del repo. La clave JSON no se guarda en el árbol de trabajo. Comprueba Hosting y el proyecto seleccionado antes de autorizar el primer deploy live.