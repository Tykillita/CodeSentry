# CodeSentry — Digital garden

**English** · [Español](README.es.md)

CodeSentry is a bilingual static portfolio for 16 projects and tools. An original 3D sakura leads into a scroll-driven catalogue, with project details, a searchable index, optional ambient audio, and shareable links.

## Run locally

Requirements: Node.js 22.12 or later and npm.

~~~powershell
npm ci
npm run dev
~~~

Open http://127.0.0.1:4321/es/ or /en/. To inspect the production build:

~~~powershell
npm run build
npm run preview -- --port 4322
~~~

If a restricted Windows environment prevents Astro from writing its telemetry configuration, set ASTRO_TELEMETRY_DISABLED=1 first. This does not change site content.

## Site and content

- Astro generates the static Spanish and English pages. Firebase Hosting serves dist; the site has no backend, Firebase SDK, authentication, database, or Functions.
- React Three Fiber, Three.js, TypeScript, GSAP ScrollTrigger, and Tailwind power the garden and its navigation.
- Reduced motion keeps the 3D scene mounted in a still, demand-rendered pose. If WebGL fails, the CSS landscape and catalogue remain available. Project details also have an HTML fallback without JavaScript.
- Project records live in src/content/projects/*.json. Keep es/en fields aligned and publish only verified public links and approved media.

See [docs/development.md](docs/development.md) for repository, versioning, and deployment guidance, and [docs/asset-credits.md](docs/asset-credits.md) for resource provenance and third-party licenses. Original texture sources and prompts are tracked; QA screenshots, generated reports, Vite caches, and before/ code snapshots are local-only.

## Changes and pull requests

Keep user-facing updates bilingual. Record notable changes in CHANGELOG.md under Unreleased. The website deploys continuously, so package.json version is not bumped per commit; create SemVer tags only for release milestones. Branch from main, run npm ci and npm run build, and submit a pull request for review.

The pull-request workflow builds the site and creates a Firebase Hosting preview for same-repository branches. Merging into main deploys dist to the live site at https://gocodesentry.web.app. Fork pull requests run the build without deployment credentials.

## Firebase Hosting

The default project is gocodesentry. A manual deploy requires an authorized Firebase CLI session:

~~~powershell
firebase hosting:sites:list --project gocodesentry
npm run build
firebase deploy --only hosting --project gocodesentry
~~~

GitHub Actions uses the FIREBASE_SERVICE_ACCOUNT_GOCODESENTRY repository secret. Never commit a service-account key or other credentials.

## License

CodeSentry source and original assets are under Apache-2.0. Third-party fonts, audio, and project media keep their own terms as listed in docs/asset-credits.md.
