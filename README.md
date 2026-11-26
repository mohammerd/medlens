# MEDLENS

**Open-source, evidence-grounded medical laboratory intelligence.**

MEDLENS is a research-oriented project exploring how software can turn laboratory reports into understandable, traceable and uncertainty-aware information.

> **Research prototype. Not for diagnosis or clinical decision-making.**
>
> The current frontend is an interface prototype. Report upload is local-only and does not send files to a server. The displayed patient and laboratory information is synthetic demonstration data. Do not upload real patient records.

## Project status

The frontend repository is the first of two independently maintained repositories:

- **medlens** — React + TypeScript frontend.
- **medlens-backend** — planned Python + FastAPI processing and intelligence service.

The frontend will consume a versioned API contract. It will not calculate diagnoses or independently interpret laboratory measurements.

## Product principles

1. **Source-linked extraction:** every extracted value should be traceable to its position in the source report.
2. **Preserve clinical context:** retain the laboratory's units, reference intervals, sample details and report date.
3. **Visible uncertainty:** missing, conflicting or low-confidence information must be surfaced, not guessed.
4. **Evidence before explanation:** patient-facing explanations should be grounded in reviewed sources and show their provenance.
5. **Human care stays central:** MEDLENS supports conversations with qualified healthcare professionals; it does not replace them.
6. **Privacy by design:** sensitive health information must be protected throughout collection, processing, storage and deletion.

## Frontend stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Lucide icons

## Run locally

Requirements: Node.js 20.19+ or 22.12+ and npm.

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite.

Validate the application:

```bash
npm run typecheck
npm run build
```

## Current prototype capabilities

- Responsive research-product dashboard.
- Overview, reports, trends and evidence-library navigation.
- Synthetic example report with source traceability concept.
- Local file picker and drag-and-drop affordance.
- Light/dark appearance toggle.
- Versioned frontend/backend data-contract draft.
- Search and interactive report preview.

**Important:** selecting a file currently displays its name only. No OCR, upload, AI interpretation, account system or medical-data persistence is connected yet.

## Planned architecture

```text
Browser
  |
  v
MEDLENS Frontend (this repository)
  |  Versioned HTTPS API
  v
MEDLENS Backend (separate repository)
  |
  +-- Secure document ingestion
  +-- OCR and layout extraction
  +-- Laboratory terminology and unit normalization
  +-- Reference-interval validation
  +-- Evidence retrieval
  +-- Uncertainty and safety controls
  +-- Longitudinal comparison
  +-- Evaluation and audit trail
```

The backend should expose validated structured observations and provenance. The frontend should render them faithfully and make uncertainty understandable. See [docs/API_CONTRACT.md](docs/API_CONTRACT.md) for the proposed v1 boundary.

## Safety and data policy

- Do not use this prototype to make medical decisions.
- Do not commit patient reports, health data, API keys, credentials or other secrets.
- Use synthetic or appropriately licensed/de-identified data for development and benchmarks.
- Any study involving human participants or identifiable health information requires the appropriate institutional, legal and ethics review.
- Clinical explanations and safety behaviour require review by qualified healthcare professionals before any patient-facing clinical pilot.
- The project must not present an LLM-generated explanation as a diagnosis or treatment recommendation.

See [SECURITY.md](SECURITY.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT. See [LICENSE](LICENSE).
