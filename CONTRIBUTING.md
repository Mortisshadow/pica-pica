# Contributing to Pica Pica

Thanks for helping make local gaming clips easier to enjoy.

## Ground rules

- Never add telemetry, advertising, or uploads without an explicit opt-in design discussion.
- Treat the selected clip directory as read-only unless a future action clearly asks for confirmation.
- Keep platform-specific behavior behind a small adapter.
- Do not commit API keys, personal clip paths, generated thumbnails, or media fixtures.
- Contributions are accepted under GPL-3.0-or-later, matching the project license.
- Prefer a complete vertical change with tests over broad placeholder APIs.

## Before submitting a change

```bash
pnpm check
cd src-tauri
cargo fmt --all -- --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test
cargo audit
```

For UI changes, check a narrow window, a typical laptop window, keyboard focus, and reduced-motion behavior. For scanner changes, include tests for Unicode paths and repeated scans where relevant.

## Commit style

Use concise imperative commit subjects, keep unrelated changes separate, and describe user-visible tradeoffs in the pull request.
