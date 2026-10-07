<div align="center">

<img src="public/media/garden/mark.svg" width="80" alt="CodeSentry mark">

# CodeSentry — Digital garden

**Software to operate, create, and connect.**

**English** · [Español](README.es.md)

[![Static website](https://img.shields.io/badge/site-static-334155?style=flat-square)](https://gocodesentry.web.app)
[![Astro](https://img.shields.io/badge/Astro-7-BC52EE?style=flat-square&logo=astro&logoColor=white)](https://astro.build)
[![Node.js](https://img.shields.io/badge/Node.js-22.12%2B-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Languages](https://img.shields.io/badge/languages-EN%20%7C%20ES-52665A?style=flat-square)](README.es.md)
[![Firebase Hosting](https://img.shields.io/badge/hosting-Firebase%20Hosting-FFCA28?style=flat-square&logo=firebase&logoColor=111)](https://firebase.google.com/products/hosting)
[![Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-5C83B5?style=flat-square)](LICENSE)

<br>

<a href="https://gocodesentry.web.app"><img src="public/media/garden/social.png" width="720" alt="CodeSentry digital garden social card"></a>

<p><a href="https://gocodesentry.web.app">Open the garden</a> &bull; <a href="#features">Features</a> &bull; <a href="#run-locally">Run locally</a> &bull; <a href="#privacy-and-accessibility">Privacy and accessibility</a> &bull; <a href="#versioning-and-pull-requests">Versioning</a> &bull; <a href="SECURITY.md">Security policy</a></p>

<sub>16 projects and tools · English and Spanish · Firebase Hosting</sub>

</div>

CodeSentry is a bilingual portfolio built as a digital garden. A 3D sakura opens into a scroll-driven catalogue of projects and tools, with illustrated details, a searchable index, optional ambient sound, and links that can be shared directly.

## Why CodeSentry?

The garden brings a collection of software projects together in one place. Its catalogue is designed for exploration: move through the garden, open a project card, or use the index to find a specific entry.

## Features

| | Feature | Details |
|:-:|---|---|
| 🌸 | **3D garden** | An original sakura scene introduces the catalogue and responds to scrolling. |
| 🗂️ | **Project catalogue** | Illustrated cards lead to dedicated details, public project links, and a searchable index. |
| 🌐 | **English and Spanish** | Localized pages are available at <code>/en/</code> and <code>/es/</code>; each project keeps its language-specific content. |
| 🔗 | **Shareable navigation** | Project and catalogue locations can be opened and shared as direct links. |
| 🎧 | **Optional sound** | Ambient garden audio is available as an opt-in part of the experience. |
| ♿ | **Accessible alternatives** | Reduced-motion support, keyboard-friendly controls, HTML project details without JavaScript, and a CSS landscape if WebGL is unavailable. |
| 🔒 | **Static and private by design** | The site has no account system, database, analytics, or application backend. |

## Run locally

Requirements: Node.js 22.12 or later and npm.

~~~powershell
npm ci
npm run dev
~~~

Open the Spanish page at <http://127.0.0.1:4321/es/> or the English page at <http://127.0.0.1:4321/en/>.

To check the production build locally:

~~~powershell
npm run build
npm run preview -- --port 4322
~~~

The build script runs <code>astro check</code> before generating the static site in <code>dist/</code>. If a restricted Windows environment prevents Astro from writing its telemetry configuration, set this for the current PowerShell session before running the build:

~~~powershell
$env:ASTRO_TELEMETRY_DISABLED = '1'
~~~

## Privacy and accessibility

CodeSentry is generated as static pages and served from Firebase Hosting. It does not require sign-in and has no application server, database, Firebase client SDK, or analytics. Ambient audio is optional. Project links may lead to separately operated websites; their privacy practices are outside this repository.

The interface supports reduced motion and keyboard navigation. Project details remain available in HTML without JavaScript, and the CSS landscape and catalogue remain usable when WebGL cannot start.

## Content and project files

- <code>src/content/projects/*.json</code> contains the bilingual project records. Keep English and Spanish fields aligned and verify public links before adding them.
- <code>src/data/ui.ts</code> contains shared interface text in both languages.
- <code>src/pages/</code> and <code>src/components/</code> contain the Astro pages and interface components.
- <code>public/media/</code> contains the site artwork, project illustrations, and local media.
- <code>docs/asset-credits.md</code> records the provenance and license terms for third-party resources.
- <code>docs/development.md</code> documents local development, versioning, and deployment.

Original texture sources and prompts are kept with the project. Generated QA reports, screenshots, caches, and before/ snapshots are local working files.

## Versioning and pull requests

CodeSentry is a continuously deployed website. Record notable changes in <code>CHANGELOG.md</code> under **Unreleased**. Do not bump the private package version for each website update; create a SemVer tag only when a release milestone is declared.

Create a branch from <code>main</code>, run <code>npm ci</code> and <code>npm run build</code>, and open a pull request. Pull requests from branches in this repository receive a Firebase Hosting preview for review. Pull requests from forks run the build without deployment credentials.

## Deployment

Merging a reviewed pull request into <code>main</code> deploys the generated <code>dist/</code> site to [CodeSentry on Firebase Hosting](https://gocodesentry.web.app). The GitHub Actions deployment reads the <code>FIREBASE_SERVICE_ACCOUNT_GOCODESENTRY</code> repository secret; its value must never be committed or included in logs.

## Credits

CodeSentry includes third-party fonts, audio, and project media. Their sources and license terms are listed in [docs/asset-credits.md](docs/asset-credits.md). Those resources keep their own licenses.

## License

The CodeSentry source code and original project assets are distributed under the [Apache License, Version 2.0](LICENSE). Third-party materials retain the terms listed in the asset credits.