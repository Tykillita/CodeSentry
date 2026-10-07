<div align="center">

<img src="public/media/garden/mark.svg" width="80" alt="Marca de CodeSentry">

# CodeSentry — Jardín digital

**Software para operar, crear y conectar.**

[English](README.md) · **Español**

[![Sitio estático](https://img.shields.io/badge/sitio-est%C3%A1tico-334155?style=flat-square)](https://gocodesentry.web.app)
[![Astro](https://img.shields.io/badge/Astro-7-BC52EE?style=flat-square&logo=astro&logoColor=white)](https://astro.build)
[![Node.js](https://img.shields.io/badge/Node.js-22.12%2B-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Idiomas](https://img.shields.io/badge/idiomas-EN%20%7C%20ES-52665A?style=flat-square)](README.md)
[![Firebase Hosting](https://img.shields.io/badge/hosting-Firebase%20Hosting-FFCA28?style=flat-square&logo=firebase&logoColor=111)](https://firebase.google.com/products/hosting)
[![Apache-2.0](https://img.shields.io/badge/licencia-Apache--2.0-5C83B5?style=flat-square)](LICENSE)

<br>

<a href="https://gocodesentry.web.app"><img src="public/media/garden/social.png?v=3" width="720" alt="Imagen de marca del jardín digital CodeSentry"></a>

<p><a href="https://gocodesentry.web.app">Abrir el jardín</a> &bull; <a href="#caracteristicas">Características</a> &bull; <a href="#ejecutar-localmente">Ejecutar localmente</a> &bull; <a href="#privacidad-y-accesibilidad">Privacidad y accesibilidad</a> &bull; <a href="#versionado-y-pull-requests">Versionado</a> &bull; <a href="SECURITY.md">Política de seguridad</a></p>

<sub>16 proyectos y herramientas · Español e inglés · Firebase Hosting</sub>

</div>

CodeSentry es un portafolio bilingüe presentado como un jardín digital. Un sakura 3D da paso a un catálogo de proyectos y herramientas que se recorre con el scroll, con detalles ilustrados, un índice filtrable, ambiente sonoro opcional y enlaces compartibles.

## ¿Por qué CodeSentry?

El jardín reúne una colección de proyectos de software en un solo lugar. Su catálogo está pensado para explorarse: recorre el jardín, abre la tarjeta de un proyecto o usa el índice para encontrar una entrada concreta.

<a id="caracteristicas"></a>
## Características

| | Función | Detalles |
|:-:|---|---|
| 🌸 | **Jardín 3D** | Una escena original de sakura introduce el catálogo y responde al desplazamiento. |
| 🗂️ | **Catálogo de proyectos** | Las tarjetas ilustradas llevan a páginas de detalle, enlaces públicos e índice filtrable. |
| 🌐 | **Español e inglés** | Hay páginas localizadas en <code>/es/</code> y <code>/en/</code>; cada proyecto conserva su contenido por idioma. |
| 🔗 | **Navegación compartible** | Las ubicaciones del catálogo y los proyectos se pueden abrir y compartir como enlaces directos. |
| 🎧 | **Sonido opcional** | El ambiente sonoro del jardín es una opción que el visitante puede activar. |
| ♿ | **Alternativas accesibles** | Compatibilidad con movimiento reducido, controles aptos para teclado, detalles HTML sin JavaScript y un paisaje CSS si WebGL no está disponible. |
| 🔒 | **Sitio estático y privado** | El sitio no tiene cuentas, base de datos, analítica ni backend de aplicación. |

## Ejecutar localmente

Requisitos: Node.js 22.12 o posterior y npm.

~~~powershell
npm ci
npm run dev
~~~

Abre la página en español en <http://127.0.0.1:4321/es/> o la página en inglés en <http://127.0.0.1:4321/en/>.

Para revisar localmente la compilación de producción:

~~~powershell
npm run build
npm run preview -- --port 4322
~~~

El comando de compilación ejecuta <code>astro check</code> antes de generar el sitio estático en <code>dist/</code>. Si un entorno restringido de Windows impide que Astro escriba su configuración de telemetría, establece esto en la sesión actual de PowerShell antes de compilar:

~~~powershell
$env:ASTRO_TELEMETRY_DISABLED = '1'
~~~

## Privacidad y accesibilidad

CodeSentry se genera como páginas estáticas y se sirve desde Firebase Hosting. No requiere iniciar sesión y no tiene servidor de aplicación, base de datos, SDK cliente de Firebase ni analítica. El audio ambiental es opcional. Los enlaces a proyectos pueden llevar a sitios operados por separado; sus prácticas de privacidad están fuera de este repositorio.

La interfaz admite movimiento reducido y navegación con teclado. Los detalles de proyecto siguen disponibles en HTML sin JavaScript, y el paisaje CSS y el catálogo continúan disponibles si WebGL no puede iniciarse.

## Contenido y archivos del proyecto

- <code>src/content/projects/*.json</code> contiene los registros de proyectos en ambos idiomas. Mantén alineados los campos en español e inglés y comprueba los enlaces públicos antes de agregarlos.
- <code>src/data/ui.ts</code> contiene los textos compartidos de la interfaz en ambos idiomas.
- <code>src/pages/</code> y <code>src/components/</code> contienen las páginas Astro y los componentes de interfaz.
- <code>public/media/</code> contiene el arte del sitio, las ilustraciones de proyectos y los recursos locales.
- <code>docs/asset-credits.md</code> registra la procedencia y las licencias de recursos de terceros.
- <code>docs/development.md</code> documenta el desarrollo local, el versionado y el despliegue.

Los originales y prompts de las texturas se conservan con el proyecto. Los informes generados de QA, las capturas, las cachés y las copias before/ son archivos de trabajo locales.

## Versionado y pull requests

CodeSentry es un sitio con publicación continua. Registra los cambios importantes en <code>CHANGELOG.md</code>, bajo **Unreleased**. No aumentes la versión del paquete privado con cada actualización del sitio; crea un tag SemVer solo cuando se declare un hito de release.

Crea una rama desde <code>main</code>, ejecuta <code>npm ci</code> y <code>npm run build</code>, y abre un pull request. Los pull requests de ramas de este repositorio reciben una vista previa de Firebase para revisión. Los pull requests de forks ejecutan el build sin credenciales de despliegue.

## Despliegue

Al integrar un pull request revisado en <code>main</code>, se publica el sitio generado en <code>dist/</code> en [CodeSentry en Firebase Hosting](https://gocodesentry.web.app). El workflow de GitHub Actions lee el secreto del repositorio <code>FIREBASE_SERVICE_ACCOUNT_GOCODESENTRY</code>; su valor nunca se debe confirmar ni incluir en los registros.

## Créditos

CodeSentry incluye fuentes, audio y medios de proyectos de terceros. Sus fuentes y licencias están en [docs/asset-credits.md](docs/asset-credits.md). Esos recursos conservan sus propias licencias.

## Licencia

El código fuente y los recursos originales del proyecto CodeSentry se distribuyen bajo la [Licencia Apache, versión 2.0](LICENSE). Los materiales de terceros conservan las condiciones indicadas en los créditos de recursos.