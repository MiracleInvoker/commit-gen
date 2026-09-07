# AI Commit Generator (VS Code)

A VS Code extension that automatically generates precise, context-aware [Conventional Commits](https://www.conventionalcommits.org/) from your staged git diffs using Google's GenAI SDK.

Stop wasting time writing commit messages. Stage your files, click a button, and let the AI summarize your work.

## Features

- **Context-Aware Summaries:** Analyzes your staged diffs to generate accurate, semantic commit messages.
- **Smart Auto-Routing:** Dynamically calculates token limits. Routes to `gemma-4-31b-it` (high-reasoning) by default, and gracefully falls back to `gemini-3.8-flash` for massive payloads.
- **Non-Destructive:** Appends the generated message to any text you've already typed in the input box, it will never overwrite your JIRA ticket numbers or WIP thoughts.
- **Secure by Design:** Uses VS Code's native `SecretStorage` API to proxy API keys securely into your OS Keychain (Windows Credential Manager / macOS Keychain). Your keys are never exposed to your environment variables.
- **Fail-Safes:** Prevents API spam by enforcing a local 1MB limit on diff payloads and a 240k token hard-cap.

## Prerequisites

You need a **Google Gemini API Key** to use this extension.

1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Sign in and create a free API key.

## Installation

1. Install the extension from the VS Code Marketplace.
2. Reload VS Code.
3. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).
4. Run `Commit Gen: Set Gemini API Key` and paste your key.

## Usage

1. Stage the files you want to commit in the VS Code Source Control panel.
2. Click the **Sparkle icon (✨)** in the Source Control header.
3. The extension will read the diff, generate a message, and drop it directly into the input box.
4. Review the commit message and press `Ctrl+Enter` (`Cmd+Enter`) to commit.

## Extension Settings

This extension contributes the following settings that can be configured in your `settings.json`:

- `commitGen.instructions`: The system prompt sent to the LLM. You can customize this to enforce specific commit guidelines, languages, or formatting rules for your team.
- _Default:_ `"You are an expert developer. Generate a concise Conventional Commit message based on the diff. Do not include markdown formatting or explanations."\*

## Known Limitations

- **Diff Size Limits:** If your staged changes exceed 1MB of text, the extension will abort locally to protect against network timeouts and out-of-memory errors.
- **Binary Files:** The extension automatically attempts to exclude lockfiles (`*-lock.json`, `*.lock`) and map files (`*.map`) to preserve token space, but committing massive generated files may still trigger the size limits.

## Development

To build and run this extension locally:

```bash
# Install dependencies
npm ci

# Compile the TypeScript code
npm run compile

# Or watch for changes
npm run watch
```

Press `F5` in VS Code to open a new Extension Development Host window.
