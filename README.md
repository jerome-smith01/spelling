# Spelling Tutor

An interactive, web-based educational tool designed to help elementary school students (specifically targeted at the 3rd-grade level) practice spelling through syllable breakdown, progressive letter hiding, text-to-speech audio, and AI-assisted struggle tracking.

## Core Links
* **Live Deployment:** [https://www.goodplusfast.com/spelling/app/](https://www.goodplusfast.com/spelling/app/)
* **Landing Page:** [https://www.goodplusfast.com/spelling/](https://www.goodplusfast.com/spelling/)
* **GitHub Repository:** [https://github.com/jerome-smith01/spelling](https://github.com/jerome-smith01/spelling)

## Architecture & Documentation
* Architecture Overview: [`docs/architecture/00_overview.md`](./docs/architecture/00_overview.md)
* Platform, Routing & PWA: [`docs/architecture/01_platform_and_pwa.md`](./docs/architecture/01_platform_and_pwa.md)
* Launch Plan: [`docs/spelling_tutor_launch_plan.md`](./docs/spelling_tutor_launch_plan.md)
* Original Product Spec: [`docs/spelling_app_product_spec.md`](./docs/spelling_app_product_spec.md)

## Developer Tooling
All common workflows are accessible via 2-digit numbered scripts in the [`tools/`](./tools/) folder:
* `tools/01.launch_dev.bat` — Run local dev server (`localhost:5173/spelling/app/`)
* `tools/02.build_web.bat` — Create a production Vite build (`dist/`)
* `tools/03.publish_web_to_cloudflare.bat` — Build, deploy to Cloudflare Pages, and purge CDN cache
* `tools/04.arch_review.bat` — Verify code consistency against architecture docs
* `tools/11.build_android.bat` — Sync and open Capacitor project in Android Studio
