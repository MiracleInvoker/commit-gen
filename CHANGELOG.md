# Change Log

All notable changes to the "commit-gen" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.0.2] - 2026-09-08

### Fixed

- **Critical:** Added `--no-ext-diff` to git commands to prevent the extension from hanging indefinitely if the user has an external diff GUI configured globally.
- **Critical:** Added manual regex stripping for `<think>` tags to prevent the reasoning models from leaking chain-of-thought text into the commit message box.
- Improved Git repository resolution when multiple workspaces are open or when the Source Control UI isn't fully initialized.
- Adapted prompt payload structure to remain compatible with Google's Free Tier API constraints (which currently reject the native `systemInstruction` field).

### Changed

- Added `shortTitle` to the generate command to clean up the hover tooltip in the Source Control view.
- Upgraded internal TypeScript compilation to `NodeNext` to properly align with modern VS Code extension host environments.

## [0.0.1] - 2026-09-08

- Initial release
