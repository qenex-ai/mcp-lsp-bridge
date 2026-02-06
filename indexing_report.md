
# Indexing Evaluation Report (NDJSON)

## General Stats
- **Total Files**: 45
- **Total Chunks**: 2907
- **Total Content Size**: 414.07 KB

## Chunk Size Stats
- **Average Size**: 145.86 chars
- **Max Size**: 62723 chars
- **Min Size**: 0 chars

## Hierarchy Stats
- **Average Depth**: 3.03
- **Max Depth**: 9

### Deepest Semantic Structures
- [Depth 9] **valueSet** in `src/lsp/base-client.ts`
- [Depth 8] **codeActionKind** in `src/lsp/base-client.ts`
- [Depth 8] **commitCharactersSupport** in `src/lsp/base-client.ts`
- [Depth 8] **documentationFormat** in `src/lsp/base-client.ts`
- [Depth 8] **snippetSupport** in `src/lsp/base-client.ts`

### Most Linked Chunks (Detailed)
- [Children 139] **packages** in `package-lock.json`
- [Children 70] **lspServerConfigs** in `src/config/lsp-servers.ts`
- [Children 45] **tools** in `src/server.ts`
- [Children 28] **dependencies** in `package-lock.json`
- [Children 26] **optionalDependencies** in `package-lock.json`

### Minimal Context Tokens (Sample)
The following shows how deep chunks retrieve context from their parents (Hierarchy Field):
- **codeAction**: ["export class BaseLSPClient extends EventEmitter {","private async initialize(): Promise<void> {","const initParams: InitializeParams = {","capabilities: {","textDocument: {"]
- **codeActionLiteralSupport**: ["export class BaseLSPClient extends EventEmitter {","private async initialize(): Promise<void> {","const initParams: InitializeParams = {","capabilities: {","textDocument: {","codeAction: {"]
- **codeActionKind**: ["export class BaseLSPClient extends EventEmitter {","private async initialize(): Promise<void> {","const initParams: InitializeParams = {","capabilities: {","textDocument: {","codeAction: {","codeActionLiteralSupport: {"]

## Chunk Type Distribution
- **String**: 1025
- **Property**: 696
- **Constant**: 350
- **Module**: 344
- **Variable**: 117
- **Function**: 112
- **Boolean**: 90
- **Array**: 62
- **Method**: 57
- **Interface**: 18
- **Field**: 15
- **Class**: 12
- **Constructor**: 3
- **Number**: 2
- **Struct**: 2
- **Object**: 1
- **Enum**: 1
