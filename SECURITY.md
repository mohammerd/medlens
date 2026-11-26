# Security Policy

MEDLENS is an early research prototype. It is not approved for clinical use and must not be used to make diagnosis or treatment decisions.

## Sensitive data

- Do not submit patient reports or identifiable health information in public issues or pull requests.
- Do not commit credentials, tokens, private keys or environment files.
- Do not use production patient data in development, tests, screenshots or benchmarks.
- The current frontend selects a file locally only. It does not upload, persist or analyse the file.

## Reporting a vulnerability

Please do not publish details of a suspected vulnerability in a public issue. Use GitHub's private vulnerability reporting feature where available, or contact the repository owner privately.

Include the affected component, reproduction steps and potential impact. Do not include patient information or secrets.

## Scope

Security review is required before enabling authentication, report upload, storage, telemetry or integrations with external model providers. Backend access controls, tenant isolation, encryption, retention and deletion must be tested before any real health information is processed.
