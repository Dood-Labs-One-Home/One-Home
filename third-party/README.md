# Reviewed third-party dependencies

Runtime files are unmodified copies of the exact npm versions pinned by the OH-276 package. Registry archive integrity was checked against its package-lock before extraction. No install script, package manager installation, rebuild, or downloaded binary execution was performed. Browser `dist` subdirectories here belong to pinned upstream libraries, not the excluded generated application dist.

- tus-js-client 4.3.1: MIT; its own LICENSE and bundled MIT/BSD notices accompany the browser bundle. Notices were recovered using its exact upstream release lockfile, not newer dependencies from the consuming application's lockfile.
- un7z-opfs 1.0.2: LGPL 2.1-or-later plus the accompanying 7-Zip/unRAR notice. Its documented source input is 7-Zip 26.02; the source archive matches the SHA-256 embedded in its pinned CMakeLists.txt. Its worker and dist directory layout is unchanged.
- 7z-wasm 1.2.0: LGPL 2.1-or-later plus unRAR restrictions. Its documented source input is 7-Zip 24.09. The old 7-zip.org source URL returned 404; the same named version was obtained from the official ip7z/7zip release, with its SHA-256 recorded. It was not replaced with 26.02.
- Comic Neue Bold and Regular: SIL OFL 1.1. The package fonts and OFL notice exactly match the pinned Google Fonts revision in the provenance manifest. No font modification or artwork inference was made.

The LGPL libraries' original 7-Zip source archives, derivative patches/glue, build recipes, full GNU license texts, and Emscripten notices are supplied in this folder. Preserve them and the runtime notices when redistributing this candidate. The source archives contain upstream source, not One Home data or application backups. Upstream build flag files are provided as `build-es6-flags.txt` and `build-umd-flags.txt`; restore their original `.env` filenames only if deliberately rebuilding upstream. They contain public compiler flags, not account environment settings.

Build instructions describe provenance only and were not executed. Bit-for-bit rebuild reproducibility was not established; the upstream 7z-wasm Dockerfile uses an SDK `latest` activation despite a tagged SDK checkout. Binary authenticity is instead checked against the exact lockfile-pinned npm archive and upstream source association. unRAR terms prohibit using its source to recreate the proprietary RAR compression algorithm. No removal of those restrictions is implied.

These two archive libraries do not supply One Home's missing custom `onehome-7z-workerfs-v1467141.js` protocol adapter. Their availability does not make archive import complete. The missing wallet wrappers likewise were neither invented nor replaced by similarly named upstream packages.
