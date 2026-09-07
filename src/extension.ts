import * as vscode from "vscode";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { GoogleGenAI } from "@google/genai";

const execFileAsync = promisify(execFile);

export function activate(context: vscode.ExtensionContext) {
  const setKeyDisposable = vscode.commands.registerCommand(
    "commit-gen.setApiKey",
    async () => {
      const key = await vscode.window.showInputBox({
        prompt: "Enter your Gemini API Key",
        password: true,
        ignoreFocusOut: true,
      });

      if (key && key.trim()) {
        await context.secrets.store("gemini_api_key", key.trim());
        vscode.window.showInformationMessage(
          "Gemini API Key securely stored in OS Keychain!",
        );
      }
    },
  );

  const disposable = vscode.commands.registerCommand(
    "commit-gen.generateCommit",
    async (sourceControl?: vscode.SourceControl) => {
      try {
        let apiKey = await context.secrets.get("gemini_api_key");
        if (!apiKey) {
          apiKey = process.env.GEMINI_API_KEY;
        }

        if (!apiKey) {
          vscode.window.showErrorMessage(
            'API Key missing. Press Ctrl+Shift+P and run "Commit Gen: Set Gemini API Key"',
          );
          return;
        }

        const gitExtension = vscode.extensions.getExtension("vscode.git");
        if (!gitExtension) {
          throw new Error("VS Code Git extension not found");
        }

        if (!gitExtension.isActive) {
          await gitExtension.activate();
        }

        const api = gitExtension.exports.getAPI(1);
        if (api.repositories.length === 0) {
          throw new Error("No Git repository found in the workspace");
        }

        let repo = api.repositories[0];
        if (sourceControl?.rootUri) {
          const matchedRepo = api.repositories.find(
            (r: any) =>
              r.rootUri.toString() === sourceControl.rootUri!.toString(),
          );
          if (matchedRepo) {
            repo = matchedRepo;
          }
        }

        const gitPath = api.git.path;
        if (!gitPath) {
          throw new Error("Git executable not found");
        }

        const { stdout: diff } = await execFileAsync(
          gitPath,
          [
            "diff",
            "--staged",
            "--no-ext-diff",
            "--",
            ":(exclude)*-lock.json",
            ":(exclude)*.lock",
            ":(exclude)*.map",
            ":(exclude)*.svg",
          ],
          {
            cwd: repo.rootUri.fsPath,
            maxBuffer: 10 * 1024 * 1024,
          },
        );

        if (!diff || diff.trim() === "") {
          vscode.window.showWarningMessage(
            "No staged changes found. Stage files first.",
          );
          return;
        }

        const config = vscode.workspace.getConfiguration("commitGen");
        const systemInstruction = config.get<string>(
          "instructions",
          "You are an expert developer. Generate a concise Conventional Commit message based on the diff. Do not include markdown formatting or explanations.",
        );

        const combinedPrompt = `SYSTEM INSTRUCTIONS:\n${systemInstruction}\n\nHere is the staged diff:\n\n${diff}`;

        if (combinedPrompt.length > 1_000_000) {
          vscode.window.showErrorMessage(
            "Staged diff is too large to process (~1MB text limit). Please stage fewer files.",
          );
          return;
        }

        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.SourceControl,
            title: "Analyzing staged diff...",
            cancellable: true,
          },
          async (progress, token) => {
            const controller = new AbortController();
            const abortSub = token.onCancellationRequested(() =>
              controller.abort(),
            );

            try {
              const ai = new GoogleGenAI({ apiKey: apiKey as string });

              const charCount = combinedPrompt.length;
              const GEMMA_LIMIT = 15000;
              const FLASH_LIMIT = 240000;
              let targetModel = "gemma-4-31b-it";

              if (charCount > 20000) {
                progress.report({
                  message: "Payload large, counting tokens...",
                });

                const countResponse = await ai.models.countTokens({
                  model: targetModel,
                  contents: combinedPrompt,
                  config: { abortSignal: controller.signal } as any,
                });

                const totalTokens = countResponse.totalTokens || 0;

                if (totalTokens > FLASH_LIMIT) {
                  vscode.window.showErrorMessage(
                    `Staged diff is massive (${totalTokens} tokens). Please break your changes into smaller, atomic commits.`,
                  );
                  return;
                }

                if (totalTokens > GEMMA_LIMIT) {
                  progress.report({
                    message: `Payload is ${totalTokens} tokens. Routing to gemini-3.8-flash.`,
                  });
                  targetModel = "gemini-3.8-flash";
                }
              }

              progress.report({
                message: `Generating using ${targetModel}...`,
              });

              const response = await ai.models.generateContent({
                model: targetModel,
                contents: combinedPrompt,
                config: {
                  thinkingConfig:
                    targetModel === "gemma-4-31b-it"
                      ? { thinkingLevel: "HIGH" }
                      : undefined,
                  abortSignal: controller.signal,
                } as any,
              });

              if (!response.text) {
                throw new Error(
                  "AI returned an empty response. It may have been blocked by safety filters.",
                );
              }

              let commitMessage = response.text;
              commitMessage = commitMessage
                .replace(/<think>[\s\S]*?<\/think>/g, "")
                .replace(/^```[\s\S]*?\n/, "")
                .replace(/```$/, "")
                .trim();

              const currentText = repo.inputBox.value.trim();
              repo.inputBox.value = currentText
                ? `${currentText}\n\n${commitMessage}`
                : commitMessage;
            } catch (error: any) {
              if (error.name === "AbortError" || controller.signal.aborted) {
                vscode.window.showWarningMessage(
                  "Commit generation cancelled.",
                );
                return;
              }
              throw error;
            } finally {
              abortSub.dispose();
            }
          },
        );
      } catch (error: any) {
        console.error(error);
        vscode.window.showErrorMessage(`Failed: ${error.message}`);
      }
    },
  );

  context.subscriptions.push(setKeyDisposable, disposable);
}

export function deactivate() {}
