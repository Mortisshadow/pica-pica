# Security policy

Pica Pica processes private local recordings. Security and data minimization are release requirements, not optional features.

## Reporting

Until a private GitHub security advisory channel is configured, do not publish exploit details in a public issue. Contact the maintainer privately through the repository profile and include the affected version, operating system, reproduction steps and impact.

## Release baseline

- No telemetry, uploads or remote metadata calls without a user action.
- API keys live in the operating-system credential store.
- Original clips are treated as read-only.
- FFmpeg is invoked directly without a shell and with fixed argument structure.
- Release binaries are built in CI, checksummed, signed where supported and accompanied by an SBOM.
- `pnpm audit`, `cargo audit`, tests and linting run before release.

Open source makes review possible; it does not replace review. AI-assisted changes require the same tests, dependency review and human-readable design as any other contribution.
