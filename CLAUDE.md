# CodeSentry — reglas compartidas del proyecto

CodeSentry es un sitio estático bilingüe construido con Astro, React Three Fiber, Three.js y Firebase Hosting. Estas reglas aplican a cualquier persona o agente que trabaje en este repositorio.

## Fuente de verdad y alcance

- Lee estas reglas antes de modificar el proyecto. Si una instrucción del usuario entra en conflicto, sigue la instrucción del usuario.
- Inspecciona el estado actual antes de editar. Conserva cambios locales y limita cada cambio al objetivo solicitado.
- Las reglas de isTargetSleeping sobre .NET, instaladores, binarios, hashes de descargas y versiones de una app nativa no se trasladan a CodeSentry.
- No añadas líneas de atribución de agentes a commits, PRs ni archivos.

## Contenido público, idiomas y recursos

- Mantén equivalentes las guías públicas en README.md (inglés) y README.es.md (español).
- Todo texto visible nuevo debe existir en español e inglés. Respeta los datos localizados de src/content/projects y las cadenas de src/data/ui.ts.
- Publica enlaces de demo, repositorio y documentación solo después de comprobar que son públicos y corresponden al proyecto descrito. No atribuyas funcionalidades, estado de producción ni contribuciones sin evidencia.
- No subas rutas personales, contenido de PLAN.md, LAB.md o INVENTARIO.md, configuraciones locales de lanzamiento, datos de clientes, credenciales ni archivos .env. La excepción versionada es .env.example, sin secretos.
- Conserva la procedencia de recursos originales y las licencias de terceros en docs/asset-credits.md. No añadas Analytics, seguimiento, backend o SDK externos sin autorización explícita.
- El código y los recursos originales de CodeSentry se distribuyen bajo Apache-2.0. Los recursos de terceros conservan sus condiciones individuales indicadas en los créditos.

## Interfaz y validación

- Conserva la salida estática y el Hosting clásico de Firebase. El sitio no necesita base de datos, autenticación ni Functions.
- Respeta los detalles HTML sin JavaScript, navegación por teclado, enlaces compartibles, idioma seleccionado, movimiento reducido y el paisaje CSS disponible si WebGL falla.
- Para cambios de interfaz, revisa español e inglés, teclado, movimiento reducido y tamaños de móvil y escritorio en la vista previa. No describas tamaños simulados como pruebas en dispositivos físicos.
- La comprobación base es npm ci seguida de npm run build; este script ejecuta astro check antes de compilar. No afirmes que una compilación cubre auditorías visuales o pruebas que no se ejecutaron.
- Capturas, informes JSON, cachés y copias before/ generados dentro de artifacts/ son locales. Se versionan solamente las fuentes de texturas/prompts y harnesses QA enumerados en .gitignore.

## Versionado y documentación

- CodeSentry se publica como sitio continuo. Registra cambios relevantes en CHANGELOG.md bajo Unreleased.
- No aumentes package.json.version por cada commit ni añadas una versión visible a la web. Crea tags SemVer vX.Y.Z solo cuando el usuario marque un hito como release.
- Actualiza los README en ambos idiomas cuando cambien la instalación, el uso, la arquitectura pública o el proceso de despliegue.
- Mantén docs/asset-credits.md y cualquier documentación técnica alineadas con los recursos efectivamente versionados. Etiqueta como locales las capturas o mediciones que no se distribuyen.

## GitHub y despliegues

- Trabaja desde ramas basadas en main y entrega cambios mediante pull requests; no empujes directamente a main.
- Los pull requests deben pasar el build y recibir revisión del preview antes de integrarse.
- Los previews usan Firebase Hosting. Solo una integración en main publica al canal live del proyecto gocodesentry.
- La cuenta de servicio solo se guarda como secreto de GitHub FIREBASE_SERVICE_ACCOUNT_GOCODESENTRY. Nunca imprimas, escribas ni confirmes su valor.
- Usa pull_request para PRs públicos; nunca expongas secretos a código de forks ni uses pull_request_target para ejecutar cambios no confiables.
- No ejecutes un deploy manual a producción salvo petición explícita del usuario.
