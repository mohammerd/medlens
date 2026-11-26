# Contributing to MEDLENS

Contributions are welcome. This project is a research prototype, so correctness, privacy and clear scope matter more than feature count.

## Before opening a change

1. Open an issue describing the problem or proposal.
2. Keep pull requests focused and explain the user-visible or research impact.
3. Do not include real patient records, identifiable health information, credentials or secrets.
4. Use synthetic fixtures or data with explicit reuse permission.
5. Do not add medical claims, reference ranges or clinical recommendations without credible sources and qualified review.

## Development

- Node.js 20.19+ is required.
- Run `npm install`.
- Run `npm run typecheck` and `npm run build` before opening a pull request.

## Frontend rules

- Keep API contracts typed and versioned.
- Keep medical interpretation out of presentation components.
- Render uncertainty, missing data and provenance explicitly.
- Never silently replace an original unit, value or laboratory reference interval.
- All interactive controls must have accessible labels and keyboard behaviour.
- Avoid storing report contents in browser storage or analytics tools.

## Pull requests

Include a concise summary, screenshots for visual changes, tests performed and any known limitations. A UI that uses fabricated information must label it as demonstration data.
