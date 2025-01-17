/*---------------------------------------------------------------------------------------------
 *  Copyright (c) RStudio, PBC. All rights reserved.
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import QuartoLinkProvider, { OpenLinkCommand } from "./providers/link";
import QuartoDocumentSymbolProvider from "./providers/symbol-document";
import QuartoFoldingProvider from "./providers/folding";
import { PathCompletionProvider } from "./providers/completion-path";
import QuartoSelectionRangeProvider from "./providers/selection-range";
import QuartoWorkspaceSymbolProvider from "./providers/symbol-workspace";
import { MarkdownEngine } from "./markdown/engine";
import { activateBackgroundHighlighter } from "./providers/background";
import { kQuartoDocSelector } from "./core/doc";
import { Command, CommandManager } from "./core/command";
import { newDocumentCommands } from "./providers/newdoc";
import { insertCommands } from "./providers/insert";

export function activateCommon(
  context: vscode.ExtensionContext,
  engine: MarkdownEngine,
  commands?: Command[]
) {
  // core language features
  const symbolProvider = new QuartoDocumentSymbolProvider(engine);
  context.subscriptions.push(
    vscode.Disposable.from(
      vscode.languages.registerDocumentSymbolProvider(
        kQuartoDocSelector,
        symbolProvider
      ),
      vscode.languages.registerDocumentLinkProvider(
        kQuartoDocSelector,
        new QuartoLinkProvider(engine)
      ),
      vscode.languages.registerFoldingRangeProvider(
        kQuartoDocSelector,
        new QuartoFoldingProvider(engine)
      ),
      vscode.languages.registerSelectionRangeProvider(
        kQuartoDocSelector,
        new QuartoSelectionRangeProvider(engine)
      ),
      vscode.languages.registerWorkspaceSymbolProvider(
        new QuartoWorkspaceSymbolProvider(symbolProvider)
      ),
      PathCompletionProvider.register(engine)
    )
  );

  // background highlighter
  activateBackgroundHighlighter(context, engine);

  // commands (common + passed)
  const commandManager = new CommandManager();
  commandManager.register(new OpenLinkCommand(engine));
  for (const cmd of newDocumentCommands()) {
    commandManager.register(cmd);
  }
  for (const cmd of insertCommands(engine)) {
    commandManager.register(cmd);
  }
  if (commands) {
    for (const cmd of commands) {
      commandManager.register(cmd);
    }
  }
  context.subscriptions.push(commandManager);
}
