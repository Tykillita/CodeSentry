# CodeSentry — Jardín digital

[English](README.md) · **Español**

CodeSentry es un portafolio estático bilingüe de 16 proyectos y herramientas. Un sakura 3D original introduce un catálogo recorrido con el scroll, con detalles por proyecto, un índice filtrable, ambiente sonoro opcional y enlaces compartibles.

## Ejecutar localmente

Requisitos: Node.js 22.12 o posterior y npm.

~~~powershell
npm ci
npm run dev
~~~

Abre http://127.0.0.1:4321/es/ o /en/. Para revisar la compilación de producción:

~~~powershell
npm run build
npm run preview -- --port 4322
~~~

Si un entorno restringido de Windows impide que Astro escriba su configuración de telemetría, establece ASTRO_TELEMETRY_DISABLED=1 antes. No cambia el contenido del sitio.

## Sitio y contenido

- Astro genera las páginas estáticas en español e inglés. Firebase Hosting sirve dist; el sitio no tiene backend, SDK de Firebase, autenticación, base de datos ni Functions.
- React Three Fiber, Three.js, TypeScript, GSAP ScrollTrigger y Tailwind dan vida al jardín y su navegación.
- El movimiento reducido mantiene la escena 3D montada, quieta y renderizada bajo demanda. Si WebGL falla, el paisaje CSS y el catálogo siguen disponibles. Los detalles de proyectos también cuentan con una alternativa HTML sin JavaScript.
- Los registros de proyectos están en src/content/projects/*.json. Mantén alineados los campos es/en y publica solo enlaces públicos comprobados y medios aprobados.

Consulta [docs/development.md](docs/development.md) para las reglas del repositorio, el versionado y el despliegue, y [docs/asset-credits.md](docs/asset-credits.md) para la procedencia de recursos y las licencias de terceros. Se versionan los originales y prompts de las texturas; las capturas de QA, informes generados, cachés Vite y copias before/ se mantienen en local.

## Cambios y pull requests

Mantén bilingües las actualizaciones visibles para usuarios. Registra los cambios importantes en CHANGELOG.md bajo Unreleased. La web se despliega continuamente, así que no se aumenta package.json.version por cada commit; usa tags SemVer solo para hitos de release. Crea una rama desde main, ejecuta npm ci y npm run build, y envía un pull request para revisión.

El workflow de pull requests compila el sitio y crea una vista previa de Firebase Hosting para ramas del mismo repo. Al integrar en main, dist se publica en el sitio live https://gocodesentry.web.app. Los pull requests de forks ejecutan el build sin credenciales de despliegue.

## Firebase Hosting

El proyecto predeterminado es gocodesentry. Un deploy manual requiere una sesión autorizada de Firebase CLI:

~~~powershell
firebase hosting:sites:list --project gocodesentry
npm run build
firebase deploy --only hosting --project gocodesentry
~~~

GitHub Actions usa el secreto del repo FIREBASE_SERVICE_ACCOUNT_GOCODESENTRY. Nunca confirmes una clave de cuenta de servicio ni otras credenciales.

## Licencia

El código y los recursos originales de CodeSentry usan Apache-2.0. Las fuentes, el audio y los medios de terceros conservan sus condiciones propias, indicadas en docs/asset-credits.md.
