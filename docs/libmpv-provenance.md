# libmpv preview provenance

Windows preview installers embed `libmpv-2.dll` for in-process playback.

- Upstream project: [mpv-player/mpv](https://github.com/mpv-player/mpv)
- Windows builder: [shinchiro/mpv-winbuild-cmake](https://github.com/shinchiro/mpv-winbuild-cmake)
- Release: `20260421`
- Archive: `mpv-dev-x86_64-20260421-git-5921fe5.7z`
- SHA-256: `9dcda280322cfec168d42f5afa1a58691311e6aaf81b8a0dfddfa97a6209a5fa`
- Architecture: Windows x86-64
- mpv source revision identified by the archive: `5921fe5`

The GitHub Actions workflows download this exact archive over HTTPS and stop before extraction if its SHA-256 digest differs. The binary is not checked into this repository.

mpv is free software distributed under GPL-2.0-or-later by default. Pica Pica is distributed under GPL-3.0-or-later, so the combined Windows package is distributed under compatible GPL terms. This preview provenance record does not replace the stable-release requirements to retain corresponding source, upstream notices, the complete build recipe, and an SBOM.
