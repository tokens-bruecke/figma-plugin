# Figma plugin: controller, UI, storage, servers

## Message protocol

The UI sends `parent.postMessage({ pluginMessage: msg }, '*')`. The controller handles everything in one `figma.ui.onmessage` in [src/app/controller/index.ts](../../src/app/controller/index.ts), as a chain of `if (msg.type === …)` blocks. The controller replies with `figma.ui.postMessage(msg)`, and the UI listens with `window.addEventListener('message')`, reading `event.data.pluginMessage`.

### UI → controller

| `type`                 | Payload                                                            | Sender                                                   | Effect                                                                                                              |
| ---------------------- | ------------------------------------------------------------------ | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `getPluginEnvironment` |                                                                    | `Container` on mount                                     | reply `pluginEnvironment`                                                                                           |
| `getStorageConfig`     |                                                                    | `Container` on mount                                     | load from `clientStorage`, reply `storageConfig`                                                                    |
| `getSharedProfiles`    |                                                                    | `Container` on mount                                     | read `figma.root` pluginData, reply `sharedProfiles`                                                                |
| `shareProfile`         | `sharedId`, `profile: SettingsProfileI`, `updatedAt`               | `Container` (ProfileDetailView)                          | `stripCredentials` → `figma.root.setPluginData`, reply `sharedProfiles`                                             |
| `unshareProfile`       | `sharedId`                                                         | `Container` (ProfileDetailView)                          | remove it, reply `sharedProfiles`                                                                                   |
| `openExternal`         | `url` (http/https only)                                            | `Container`, for `target="_blank"` clicks in VS Code     | `figma.openExternal(url)`                                                                                           |
| `checkForVariables`    |                                                                    | `Container` on mount                                     | reply `checkForVariables`                                                                                           |
| `JSONSettingsConfig`   | `config: MultiTenantConfigI`                                       | `Container`, on every config change after storage loaded | `sanitizeMultiTenantConfig` → store                                                                                 |
| `getTokens`            | `role: 'preview' \| 'download' \| 'push'`, `server?: ServerType[]` | `SettingsView`, `CodePreviewView`                        | `getTokens(PluginAPIResolver, activeProfile)` → reply `setTokens`                                                   |
| `importTokens`         | `tokens: any` (parsed JSON), `role: 'import'`                      | `Container` (for both views)                             | `tokensToVariables` → reply `importResult` (+ `checkForVariables` on success). In Dev Mode: an `importResult` error |
| `resizeUIHeight`       | `height`                                                           | `Container` (ResizeObserver, manual resize)              | `figma.ui.resize(width, height)`. All four resize messages are ignored in Dev Mode                                  |
| `resizeUIWidth`        | `width`                                                            | `CodePreviewView` drag handle                            | preview width (min 540)                                                                                             |
| `resetUIWidth`         |                                                                    | `CodePreviewView` double-click                           | preview width back to 800                                                                                           |
| `openCodePreview`      | `isCodePreviewOpen`, `height`                                      | `Container`                                              | width 800/custom with preview, else 300                                                                             |

### Controller → UI

| `type`                | Payload                                         | Handled in                                                                                                       |
| --------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `pluginEnvironment`   | `environment: PluginEnvironmentI`               | `Container` → `PluginEnvironmentContext`. Views wait for it (`LoadingView`)                                      |
| `storageConfig`       | `storageConfig: MultiTenantConfigI`             | `Container` → `setMultiTenantConfig`, `isStorageLoaded = true`                                                   |
| `sharedProfiles`      | `sharedProfiles: SharedProfilesI`               | `Container` → profile dropdown section "Shared in this file", Update banner                                      |
| `sharedProfilesError` | `message`                                       | `Container` → error toast (e.g. over the 100 kB pluginData limit)                                                |
| `checkForVariables`   | `hasVariables`, `variableCollections: string[]` | `Container` → `Loading`/`Empty`/`Settings` view; keeps the collection names in its own state for "Add styles to" |
| `setTokens`           | `tokens`, `role`, `server`                      | `SettingsView` → preview / download / push                                                                       |
| `tokensError`         | `role`, `message`                               | `SettingsView` → error toast, stops the push spinner. Sent when `getTokens` throws                               |
| `importResult`        | `result` (see import-pipeline.md)               | `Container` → its own toast, which survives the switch from the empty view to the settings view                  |

Message shapes are typed loosely as `TokensMessageI` in global.d.ts. To add a message: add the `type` to `TokensMessageI` if it carries tokens, add an `if` block in the controller, and a listener in the component that needs the reply.

## Settings, profiles, storage

- **Types** (global.d.ts): `JSONSettingsConfigI = ExportSettingsI & { servers: ServerSettingsI }`; `SettingsProfileI = JSONSettingsConfigI & { profileName, updatedAt }`; `MultiTenantConfigI = { activeProfileId, profiles: Record<id, SettingsProfileI> }`.
- **Storage:** `figma.clientStorage` key **`'tokenbrücke-config'`**, value `JSON.stringify(MultiTenantConfigI)`. clientStorage is local to the user's machine and plugin, and it isn't shared through the file. **Server tokens and passwords are stored here in plain text.**
- **Defaults and migration** ([storageConfig.ts](../../src/app/controller/storageConfig.ts)): `createDefaultJSONSettingsConfig()` holds the plugin defaults. `sanitizeProfileConfig` deep-merges each stored profile with the defaults (includedStyles, each server), migrates the legacy `useDTCGKeys` → `useDTCG`, and backfills new booleans. `parseStoredConfig` falls back to a fresh `{ activeProfileId: 'default', profiles: { default: <default profile named 'Default profile'> } }` for anything unreadable. **When you add a setting, add its default here, or old profiles will have `undefined`.**
- **Flow:** the controller loads the config at startup and on `getStorageConfig`. The UI holds the state (`Container.multiTenantConfig`), and `useDidUpdate` posts every change back. It waits for `isStorageLoaded` so the defaults don't overwrite what is stored. `getTokens` always uses the active profile the controller last received.
- **Collection names** of the open file are not part of the profile. Up to v3.20 they were, and the two startup replies (`storageConfig`, `checkForVariables`) raced: a stored list arriving last replaced the current one and left "Add styles to" empty. `sanitizeProfileConfig` now drops the old field.
- **Profiles:** ids are `'default'` and `profile-<Date.now()>`. New profiles start from the defaults. The last profile can't be deleted.
- **Shared profiles** ([sharedProfiles.ts](../../src/app/controller/sharedProfiles.ts)): stored in the file with `figma.root.setPluginData('sharedProfiles', JSON)`, as `SharedProfilesI` keyed by `shared-<Date.now()>`. pluginData is private to the plugin id for stability, not security, so `stripCredentials` empties every token, key and Custom URL header, both when writing and when reading. A local profile follows a shared one through `sharedId`; `sharedUpdatedAt` is the shared `updatedAt` it last applied, and a newer one shows the Update banner. `mergeSharedProfile` takes the settings from the file and keeps the local name and credentials. pluginData may be written in Dev Mode too. The entry must stay under 100 kB (`serializeSharedProfiles` throws above 90 000 characters).

## UI structure

```
index.tsx  createRoot(#react-page) + react-figma-ui styles
└─ container.tsx  Container: config state, profile CRUD, window sizing, import entry (EmptyView)
   ├─ LoadingView          until checkForVariables arrives
   ├─ EmptyView            "No variables found": Import tokens / Continue without variables
   ├─ SettingsView         routing by `currentView` string:
   │    'main'              profile bar, Show output, Color mode, Include styles, Add styles to,
   │                        DTCG toggle, Advanced settings →, Push to server (+ list), Download, Import
   │    'advancedSettings'  AdvancedSettingsView: toggle list (split, omit names, scopes, %, easing, .value, metadata)
   │    'profileDetail'     ProfileDetailView: rename / remove
   │    'newProfile'        NewProfileView
   │    'jsonbin' | 'github' | 'githubPullRequest' | 'gitlab' | 'customURL'
   │                        ServerSettingsView: form generated from `viewsConfig[server].fields`
   │    + Toast (ref), footer (Documentation, version), height resizer
   └─ CodePreviewView      side pane: Update, Copy, stats (getTokensStat), JsonViewer (CodeMirror 6), width resizer
```

- UI kit: [`react-figma-ui`](https://github.com/PavelLaptev/react-figma-ui), pinned to a git commit in package.json (`Panel`, `PanelHeader`, `Stack`, `Dropdown`, `Toggle`, `Input`, `Button`, `IconButton`, `Icon`, `Text`, `OverlayList`). Use these components and Figma's CSS variables (`var(--figma-color-…)`, `var(--space-…)`) so the UI follows the Figma theme (`showUI(..., { themeColors: true })`).
- Styles are SCSS modules (`styles.module.scss` next to each view or component), typed by `declaration.d.ts`.
- Window: width 300 (`config.frameWidth`), 800 with the preview (user-resizable, min 540). Height follows the content through ResizeObserver; manual resizing is between 360 and the content height, and a double-click resets it.
- Panel layout (Dev Mode, `isPanelLayout` in [pluginEnvironment.ts](../../src/app/pluginEnvironment.ts)): no ResizeObserver, no resize handles, everything `width: 100%` and `height: 100vh` with vertical scrolling. The preview replaces the settings (back header via `onClose`) instead of sitting beside them; `SettingsView` stays mounted but hidden, because its listener receives the preview tokens. `canImportTokens` hides the import buttons; `onImportTokens` is then `undefined`.
- Toasts: `toastRef.current?.show({ title, message, link?, options: { type, timeout } })`. Error toasts stay until clicked.

## Push servers (src/app/api/servers/)

They all run in the **UI iframe** after `setTokens` with `role: 'push'`, one after another in this order: jsonbin, github, githubPullRequest, gitlab, customURL. A server is used when `servers[id].isEnabled`, which `ServerSettingsView` sets on Save.

| Server     | File                   | Mechanism                                                                                                                                                                                               | Split support                     |
| ---------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| JSONBin    | `pushToJSONBin.ts`     | `PUT /v3/b/{id}`, or `POST /v3/b` when no id; `X-Master-Key`, `X-Bin-Name`                                                                                                                              | no (whole JSON)                   |
| GitHub     | `pushToGithub.ts`      | Octokit git data API: ref → commit → tree (all files) → commit → PATCH ref. One commit for all files.                                                                                                   | yes (`fileName` becomes a folder) |
| GitHub PR  | `githubPullRequest.ts` | Commit on top of `baseBranch`, create or **force-update** `branch` (default `tokens-bruecke/update-tokens`), reuse an open PR (`head: owner:branch`) or open one. The toast links to the PR.            | yes                               |
| GitLab     | `pushToGitlab.ts`      | `HEAD /repository/files/:path` to choose create/update, then `POST /repository/commits` with all actions; retries with the flipped action when a check was inconclusive. Host defaults to `gitlab.com`. | yes                               |
| Custom URL | `pushToCustomURL.ts`   | `fetch(url, { method, headers, body })`; `headers` is an optional JSON object string (empty → `{}`)                                                                                                     | no                                |

Each server function takes `(credentials, tokens, toastCallback, splitOptions?)` (`splitOptions` only for the Git servers) and reports success and failure through the toast callback. `SettingsView` runs each one in `runPush`, which turns an unexpected throw into an error toast, so one failing server doesn't stop the others, and the button always stops spinning. To add one, see [recipes.md](recipes.md#add-a-push-server).

## Download and import helpers (src/app/api/)

- `downloadTokensFile(tokens, splitByCollection, splitByMode)`: one file → a Blob download of `design.tokens.json`; split → `design.tokens.zip` (JSZip).
- `importTokensFile()`: a hidden `<input type=file accept=.json>` → parsed JSON, or `null` on cancel.
- `analytics.track(path, event = true)`: a GoatCounter pixel, only when `NODE_ENV === 'production'`. Paths in use: `/` (pageview), `/ready`, `/empty`, `/download`, `/copy`, `/import`, `/push/jsonbin`, `/push/github`, `/push/github-pull-request`, `/push/gitlab`, `/push/custom-url`. Fixed strings only.
- `pluginApiResolver.ts`: `IResolver` on top of the async `figma.*` APIs. It runs in the controller, despite the folder name.
