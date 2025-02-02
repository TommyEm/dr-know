// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import ollama from "ollama";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log("Dr. Know is now active!");

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand(
		"dr-know.start",
		() => {
			const panel = vscode.window.createWebviewPanel(
				"deepChat",
				"Deep Seek Chat",
				vscode.ViewColumn.One,
				{ enableScripts: true }
			);

			panel.webview.html = getWebviewContent();

			panel.webview.onDidReceiveMessage(async (message: any) => {
				if (message.command === "abort") {
					// Stop current stream
					ollama.abort();
				} else if (message.command === "chat") {
					const userPrompt = message.text;
					let responseText = "";

					// Stop already current stream if any
					ollama.abort();

					try {
						const streamResponse = await ollama.chat({
							model: "deepseek-r1:7b",
							messages: [{ role: "user", content: userPrompt }],
							stream: true,
						});

						for await (const part of streamResponse) {
							responseText += part.message.content;
							panel.webview.postMessage({
								command: "chatResponse",
								text: responseText,
							});
						}
					} catch (err) {
						panel.webview.postMessage({
							command: "chatResponse",
							text: `Error: ${String(err)}`,
						});
					}
				}
			});
		}
	);

	context.subscriptions.push(disposable);
}

function getWebviewContent() {
	return /*html*/ `
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="UTF-8">
			<style>
				body { font-family: sans-serif; margin: 1rem; }
				#prompt { width: 100%; box-sizing: border-box; }
				#response { 1px solid #ccc; margin-top: 1rem; padding: 0.5rem; min-height: 10rem; }
			</style>
		</head>
		<body>
			<h2>Dr. Know VS Code extension</h2>
			<textarea id="prompt" rows="3" placeholder="Ask something..."></textarea><br>
			<button id="askBtn">Ask</button>
			<div id="response"></div>
			<button id="abortBtn">Abort</button>

			<script>
				const vscode = acquireVsCodeApi();

				document.getElementById('askBtn').addEventListener('click', () => {
					const text = document.getElementById('prompt').value;
					vscode.postMessage({ command: 'chat', text });
				});

				document.getElementById('abortBtn').addEventListener('click', () => {
					vscode.postMessage({ command: 'abort' })
				})

				window.addEventListener('message', event => {
					const { command, text } = event.data;
					if (command === 'chatResponse') {
						document.getElementById('response').innerText = text;
					}
				})
			</script>
		</body>
		</html>
	`;
}

// This method is called when your extension is deactivated
export function deactivate() {}
