# AI Voice + Eurobot Knowledge Base Integration Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task after André approves the plan.

**Goal:** Replace the current per-module-only AI path with a Training-wide AI assistant backed by Eurobot knowledge bases, while adding voice interaction in addition to text.

**Architecture:** Keep `Login-system` as the Training source of truth and integration gateway. Add a Eurobot adapter service in `Login-system` that calls Eurobot APIs for chat, voice/transcription/TTS, and knowledge-base management/sync. Keep `Multiplayer-project` as UI/runtime only: it renders voice + chat controls and calls `Login-system` endpoints. Course/module uploads continue to be stored in Training first, then synced to a configured Eurobot knowledge base.

**Tech Stack:** Node/Express, Prisma/PostgreSQL, browser JS dashboard, Three.js multiplayer runtime, Eurobot FastAPI APIs (`/route-query/`, `/responses/chat`, `/transcribe`, `/tts`, `/admin/internal-collections`, `/admin/upload-auto`, `/admin/upload-auto-v2`, `/admin/collections/:collection/files/check`).

---

## Current baseline confirmed

- Repos are now on branch `feature/ai_new_requests`:
  - `Login-system` from previous staging branch `daniel/fix` at `238486988102d89c7572303fdc4d86c5b82a599b`.
  - `Multiplayer-project` from previous staging branch `teste-branch` at `55210396ed3ce2fd4c885ecad459934cc6c3820d`.
- Both repos already had substantial uncommitted staging work before branch creation; do not reset or overwrite.
- Training currently has:
  - module assistant endpoint: `POST /modules/:id/assistant/chat` in `Login-system/index.js` + `controllers/moduleAiController.js`.
  - per-module OpenAI direct service: `services/moduleAiService.js`, reusing `services/openaiQuizService.js` context assembly.
  - 3D world Assistant tab in `Multiplayer-project/public/index.html`, implemented in `public/main.js` around the `moduleAssistant*` functions.
  - no Tenant/TenantCode model currently found; default KB naming needs an explicit config value or a derived fallback.
- Eurobot exposes usable integration primitives:
  - chat: `/route-query/` and `/responses/chat` with `knowledge_base_ids`.
  - voice: `/transcribe`, `/tts`, and realtime websocket `/realtime`.
  - knowledge bases: admin/user internal collection endpoints and upload/auto-classify endpoints.
  - file dedupe/status: `/admin/collections/{collection_name}/files/check`, upload jobs/batches endpoints.

## Product interpretation

1. “Interação por voz” means every AI chat entry point should support:
   - type text and get text response;
   - record voice, transcribe it, send it as a normal AI prompt;
   - optionally play assistant responses as audio.
2. “Base de conhecimento” means module-only RAG should stop being the primary AI behavior.
3. Training should use the Eurobot knowledge-base/RAG system through APIs, not duplicate the RAG pipeline locally.
4. Default base name: `training-<tenant-code>` (or a configured fallback until Training gets first-class tenants).
5. Materials uploaded to Training modules/courses should automatically sync to the selected/default Eurobot knowledge base.
6. Admins/managers need a Training panel to configure the Eurobot connection and knowledge base behavior: create/select/rename base, refresh/sync missing materials, see status/errors.

---

## Task 1: Add Training-side Eurobot config

**Objective:** Make Eurobot integration configurable without hardcoding URLs/tokens.

**Files:**
- Modify: `Login-system/config/env.js`
- Modify: `Login-system/.env.example` if present
- Test: `Login-system/tests/eurobotConfig.test.js`

**Implementation details:**
- Add env fields:
  - `EUROBOT_API_URL`
  - `EUROBOT_API_TOKEN` or service credentials strategy (confirm exact auth mechanism before final implementation)
  - `EUROBOT_DEFAULT_KB_PREFIX=training`
  - `TRAINING_TENANT_CODE` (temporary until a tenant/company model exists)
  - `EUROBOT_CHAT_BACKEND=responses|route-query`
  - `EUROBOT_ENABLE_TTS=true|false`
- Validate URL trimming and trailing slash removal.
- Do not log secrets.

**Verification:**
- `node tests/eurobotConfig.test.js`
- `node --check config/env.js`

## Task 2: Add Prisma models for AI knowledge-base configuration and sync state

**Objective:** Persist the active/default KB, remote IDs, and per-material sync status.

**Files:**
- Modify: `Login-system/prisma/schema.prisma`
- Test: `npx prisma validate --schema prisma/schema.prisma`

**Proposed models:**
- `AiKnowledgeBaseConnection`
  - `id`
  - `tenantCode`
  - `displayName`
  - `remoteType` (`internal_collection` initially)
  - `remoteId`
  - `remoteName` / `collectionName`
  - `isDefault`
  - `status`
  - `lastRefreshAt`
  - `lastError`
  - timestamps
- `AiKnowledgeBaseSyncItem`
  - `id`
  - `connectionId`
  - `sourceType` (`Document`, `ModuleVideo`, `TrainingModule`, `Course` metadata)
  - `sourceId`
  - `sourceHash`
  - `remoteFileId` / `remoteDocumentId`
  - `status` (`PENDING`, `SYNCED`, `FAILED`, `SKIPPED`, `STALE`)
  - `lastSyncedAt`
  - `lastError`
  - timestamps

**Important:** preserve existing `Document.data` legacy behavior and storage-provider architecture.

**Verification:**
- `npx prisma validate --schema prisma/schema.prisma`
- `npx prisma generate`
- only run `db push` against disposable local DB.

## Task 3: Create Eurobot adapter service

**Objective:** Centralize all HTTP calls to Eurobot behind a small Training service.

**Files:**
- Create: `Login-system/services/eurobotClient.js`
- Test: `Login-system/tests/eurobotClient.test.js`

**Functions:**
- `listKnowledgeBases()` / `listInternalCollections()`
- `createKnowledgeBase({ name, description })`
- `updateKnowledgeBase(remoteId, payload)`
- `uploadFilesToKnowledgeBase(remoteId, files, options)`
- `checkFileExists(collectionName, filename)`
- `chat({ message, conversationId, knowledgeBaseIds, userContext })`
- `transcribe(audioBuffer, mimeType)`
- `tts(text)`

**Implementation details:**
- Use native `fetch`/`FormData` in Node 18+.
- Add request timeout with `AbortController`.
- Normalize Eurobot errors into stable Training API errors.
- Keep `Authorization` handling flexible because Eurobot supports normal auth tokens; if a service token is unavailable, first implementation may require an admin token env variable.

**Verification:**
- Unit tests should mock global `fetch` and assert correct URL/body/headers.
- `node --check services/eurobotClient.js`

## Task 4: Build knowledge-base management controller and routes

**Objective:** Provide Training APIs for admin/tutor management of the KB connection.

**Files:**
- Create: `Login-system/controllers/aiKnowledgeController.js`
- Modify: `Login-system/index.js`
- Test: `Login-system/tests/aiKnowledgeController.test.js` or focused smoke script

**Routes:**
- `GET /api/ai/knowledge-base/config` — current active/default connection and sync summary.
- `POST /api/ai/knowledge-base/default` — create or ensure `training-<tenant-code>` in Eurobot and mark it default.
- `PUT /api/ai/knowledge-base/config` — rename/display name, select remote collection, update flags.
- `GET /api/ai/knowledge-base/remote` — list Eurobot KBs/collections available to connect.
- `POST /api/ai/knowledge-base/refresh` — enqueue/sync missing or stale Training materials.
- `GET /api/ai/knowledge-base/sync-items` — inspect per-file status/errors.

**Permissions:**
- Use the same manager role pattern as course/module management (`MASTER`, `ADMIN`, `TUTOR` where appropriate), while preserving owner/global-manager semantics.

**Verification:**
- Auth required.
- Non-manager denied for management endpoints.
- Manager can create/list/select/refresh.

## Task 5: Build Training material extractor for Eurobot upload

**Objective:** Convert Training module/course materials into files or text payloads Eurobot can ingest.

**Files:**
- Create: `Login-system/services/trainingKnowledgeMaterialService.js`
- Modify if needed: `Login-system/services/assetStorage.js`
- Test: `Login-system/tests/trainingKnowledgeMaterialService.test.js`

**Sources to include:**
- `TrainingModule.title` and `description` as metadata text file.
- `Course.title`, description, course trail/module order as metadata text file.
- `ModuleDocument -> Document` files.
- `ModuleVideo` records:
  - if URL points to `/api/documents/download/:id`, upload the underlying document/video file metadata or the file if acceptable;
  - external URLs become text metadata entries unless Eurobot supports fetching them.
- Quiz questions as learning context with correct answers omitted for learner-facing chat, same safety principle as existing module assistant.

**Deduping:**
- Compute stable hashes from source type + id + updatedAt/storageKey/size.
- Use local `AiKnowledgeBaseSyncItem` plus Eurobot `/admin/collections/{collection}/files/check` where possible.

**Verification:**
- Build material list for sample module/course.
- Confirm no quiz answer keys are included.
- Confirm local-storage and database-blob documents both produce uploadable payloads.

## Task 6: Automatic sync hooks for new/changed material

**Objective:** New module assets should automatically be marked/sent to the default KB.

**Files:**
- Modify: `Login-system/controllers/contentController.js`
- Modify: `Login-system/controllers/moduleController.js`
- Modify: `Login-system/controllers/courseController.js`
- Create: `Login-system/services/aiKnowledgeSyncService.js`
- Test: focused service/controller tests

**Behavior:**
- On document upload/attach/update/delete: mark affected sync item pending/stale or deleted.
- On module title/description/video changes: mark metadata pending/stale.
- On course trail changes: mark course metadata pending/stale.
- For v1, run sync inline for small files or via explicit refresh; avoid long blocking uploads on user-facing requests if large videos are involved.
- Provide manual refresh endpoint to sync all pending/stale items.

**Verification:**
- Create/update/delete a document and assert sync item status transitions.
- Refresh sends only missing/stale items.

## Task 7: Replace current module-only assistant with Eurobot-backed Training AI

**Objective:** Use Eurobot chat with the selected Training knowledge base instead of direct OpenAI module context as the main answer path.

**Files:**
- Modify: `Login-system/services/moduleAiService.js` or replace with `services/trainingAiService.js`
- Modify: `Login-system/controllers/moduleAiController.js`
- Modify: `Login-system/index.js`
- Test: `Login-system/tests/trainingAiService.test.js`

**Endpoint plan:**
- Keep backwards-compatible `POST /modules/:id/assistant/chat` for world UI.
- Add broader `POST /api/ai/chat` with payload:
  - `message`
  - `courseId?`
  - `moduleId?`
  - `courseModuleId?`
  - `conversationId?`
  - `knowledgeBaseId?` optional override.
- Resolve active KB:
  1. explicitly selected Training connection;
  2. default `training-<tenant-code>`;
  3. if not configured, return actionable admin error.
- Continue enforcing module/course access and lock rules when context includes module/course IDs.
- Pass `knowledge_base_ids` to Eurobot.
- Preserve “do not reveal quiz answers” as additional instructions/context if Eurobot endpoint supports per-request instruction; if not, include it in user/context wrapper.

**Verification:**
- Learner without course access cannot query locked module context.
- Manager can query.
- Eurobot call receives correct KB ID and conversation ID.

## Task 8: Add voice interaction APIs in Training

**Objective:** Let UI record voice, transcribe through Eurobot, send prompt, and optionally return/play TTS.

**Files:**
- Modify/Create: `Login-system/controllers/aiVoiceController.js`
- Modify: `Login-system/index.js`
- Test: `Login-system/tests/aiVoiceController.test.js`

**Routes:**
- `POST /api/ai/transcribe` — multipart audio -> `{ text }` via Eurobot `/transcribe`.
- `POST /api/ai/tts` — `{ text }` -> audio response or `{ audioBase64, mimeType }` via Eurobot `/tts`.
- `POST /api/ai/voice-chat` — optional convenience endpoint: audio in -> transcribe -> chat -> optional TTS out.

**Implementation details:**
- Use `multer` with audio-only size limits.
- Accept `webm`, `ogg`, `mp3`, `wav`, browser `MediaRecorder` formats.
- Avoid storing audio by default.

**Verification:**
- Mock Eurobot transcribe and TTS responses.
- Validate unsupported file types and oversize files fail cleanly.

## Task 9: Dashboard knowledge-base management panel

**Objective:** Give managers an in-Training UI to configure and refresh Eurobot KB connection.

**Files:**
- Modify: `Login-system/public/dashboard.html`
- Modify: `Login-system/public/js/app.js` or create `public/js/aiKnowledge.js`
- Modify: `Login-system/public/css/*.css` as needed

**UI:**
- New admin/manager section: “AI Knowledge Base”.
- Show:
  - connection status to Eurobot;
  - active KB display name and remote ID/collection;
  - default name `training-<tenant-code>`;
  - sync summary: pending/synced/failed/skipped/stale;
  - recent sync errors.
- Actions:
  - Ensure/create default base;
  - Select existing Eurobot base;
  - Rename display name;
  - Refresh/sync missing materials;
  - Retry failed sync items.

**Verification:**
- Manager can see and trigger refresh.
- Non-manager does not see management controls.
- Errors are visible, not silent alerts only.

## Task 10: Dashboard/global AI chat with voice controls

**Objective:** Provide a Training-wide chat entry point that uses the active Eurobot KB.

**Files:**
- Modify: `Login-system/public/dashboard.html`
- Modify: `Login-system/public/js/app.js` or create `public/js/aiChat.js`
- Modify: CSS files

**UI:**
- Chat panel accepts text and voice.
- Voice button states: idle, recording, transcribing, sending, speaking.
- Render citations/source snippets if Eurobot returns them.
- Keep conversation ID in localStorage, scoped to Training user and KB.
- Add optional “play response” / “auto-speak” toggle.

**Verification:**
- Type text -> response appears.
- Record voice -> transcribed text appears -> response appears.
- TTS audio plays if enabled.

## Task 11: Multiplayer module assistant voice support

**Objective:** Enhance existing 3D module Assistant tab with voice input/output while still enforcing course/module access.

**Files:**
- Modify: `Multiplayer-project/public/index.html`
- Modify: `Multiplayer-project/public/main.js`
- Modify: `Multiplayer-project/public/styles.css`

**Implementation details:**
- Reuse browser `MediaRecorder` for module assistant voice messages.
- Send audio to Login-system `/api/ai/transcribe`, then send text to `/api/ai/chat` or existing `/modules/:id/assistant/chat`.
- Pass `courseId`, `moduleId`, `courseModuleId` so backend enforces enrollment/unlock rules.
- Avoid conflict with existing PeerJS user-to-user microphone flow around `initPeer()`.
- Do not auto-start microphone; require explicit user click.

**Verification:**
- Open module sidebar, Assistant tab, record short question.
- Confirm transcription appears as user message.
- Confirm answer is rendered and optional audio playback works.
- Confirm locked modules cannot be queried by manipulating the frontend.

## Task 12: Testing and local QA

**Objective:** Validate with safe local disposable database and mocked Eurobot when necessary.

**Commands:**
- `node --check services/eurobotClient.js services/trainingAiService.js controllers/aiKnowledgeController.js controllers/aiVoiceController.js`
- `node tests/eurobotClient.test.js`
- `node tests/trainingKnowledgeMaterialService.test.js`
- `node tests/trainingAiService.test.js`
- `npx prisma validate --schema prisma/schema.prisma`
- `npx prisma generate`
- local smoke per Training skill:
  - disposable Postgres container `training-login-postgres`
  - `npm start` in `Login-system`
  - `PORT=3001 LOGIN_SYSTEM_URL=http://<wsl-ip>:3000 npm start` in `Multiplayer-project`
  - browser E2E via Playwright/Chrome.

**Manual smoke scenarios:**
1. Manager creates/ensures default KB.
2. Manager uploads a module document; sync status becomes pending/synced.
3. Manager clicks refresh; missing materials upload to Eurobot.
4. Student opens Training AI chat, asks with text, receives KB-grounded answer.
5. Student records voice, sees transcript, gets answer.
6. Student opens course world module assistant and asks by voice.
7. Locked course module cannot be queried.

---

## Eurobot endpoint authentication findings

After inspecting `EuroLegalBot/eurobot/server/eurobot_server/infrastructure/api.py` and `auth.py`, Eurobot auth is mixed:

- Auth mechanism: JWT bearer token in `Authorization: Bearer <token>`, created by `POST /auth/login` and validated with `AUTH_JWT_SECRET` / `AUTH_JWT_ALG`.
- Public/no required auth currently:
  - `POST /responses/chat`
  - `GET /route-query/`
  - `POST /responses/chat/stream`
  - `POST /transcribe`
  - `POST /tts`
  - `GET /knowledge-bases`
  - `GET /internal-collections` (uses optional auth; without token returns global collections only)
  - `GET /themes`
  - `POST /upload-auto` (uses optional auth)
- Admin bearer token required:
  - `GET/POST/PUT/DELETE /admin/knowledge-bases...`
  - `GET/POST/PUT/DELETE /admin/internal-collections...`
  - `POST /admin/internal-collections/{id}/upload`
  - `POST /admin/internal-collections/{id}/upload-stream`
  - `GET /admin/collections/{collection_name}/files/check`
  - `POST /admin/upload-auto` and `/admin/upload-auto-v2`
  - upload job/batch admin endpoints.
- User bearer token required:
  - `/my/internal-collections...`
  - conversation persistence endpoints (`/conversations...`).

**Implication for Training:** chat/voice can technically call Eurobot without auth today, but KB management/sync needs an admin token. The safer implementation should still put all Eurobot calls behind the Training backend and send a server-side bearer token when configured; do not expose Eurobot admin tokens to the browser.

## Risks / open decisions

1. **Eurobot authentication model:** Current Eurobot has no dedicated service-token/API-key flow. For v1, Training can store either an admin JWT or service account credentials in env and obtain/cache JWT via `/auth/login`; a proper machine-to-machine token would be cleaner if we add it to Eurobot.
2. **Public chat/voice endpoints:** `/responses/chat`, `/route-query/`, `/transcribe`, and `/tts` are currently unauthenticated on Eurobot. That may be acceptable only if Eurobot is not intended as a public API, but for Railway deployment this is a security/cost risk. Recommended: add an internal service auth requirement or shared API-key middleware before relying on direct server-to-server use.
3. **Tenant code source:** Training currently has no tenant model. I propose `TRAINING_TENANT_CODE` env for v1, later replaced by real tenant/company records.
4. **Upload size/performance:** Large video files should not block normal module upload requests; v1 should mark pending and sync through manual refresh or lightweight queue-like service.
5. **Eurobot API contract:** Eurobot has both internal collections and themes/auto-classification. For Training default KB, use internal collection direct upload first; auto-classify can be optional later.
6. **Current uncommitted staging work:** Both repos have many existing modified files. Implementation must avoid broad formatting and use targeted patches only.
7. **Voice browser permissions:** Multiplayer already uses microphone for PeerJS; assistant voice must not interfere with user-to-user calls.

## Cross-project dependency: Eurobot API security task

This Training task should run together with the Eurobot task now saved at:

`/mnt/c/Users/andre/Code/EuroLegalBot/eurobot/docs/plans/2026-04-29-secure-external-api-access.md`

Training should not depend on unauthenticated Eurobot endpoints as the permanent architecture. The Training `eurobotClient` should send server-side service-auth headers such as:

```http
X-Eurobot-Service-Key: <secret from Training backend env>
X-Eurobot-Service-Client: training
```

No Eurobot service/admin secret should ever be exposed to browser JS.

## Recommended first implementation slice

1. Eurobot: add service-auth dependencies and protect cost-sensitive AI/voice endpoints behind JWT-or-service-key auth, with rollout flags.
2. Eurobot: allow service-key access to the specific KB list/create/upload/check endpoints Training needs.
3. Training: Config + Eurobot client service with mocked tests using service-auth headers.
4. Training: Knowledge-base config model/controller/routes.
5. Training: Manual “ensure default + refresh missing materials” flow.
6. Training: Replace chat backend with Eurobot for text.
7. Training: Add voice transcription/TTS.
8. Training: Add dashboard and multiplayer UI polish.

Do not proceed to code implementation until André approves this plan or asks for revisions.
