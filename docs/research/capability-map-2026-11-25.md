# KEY CHAT — CAPABILITY MAP (research completed 25 Nov 2026)

## 0. READ FIRST — what I could and could not open

This session's proxy is far more restrictive than the brief suggested. **`WebFetch` is blocked for every external host** (DNS-level `ENOTFOUND`), so my only page-body tool was `WebSearch` plus `curl` to the handful of hosts the proxy allows.

**OPENED directly with curl (primary sources, byte-for-byte):**
- `raw.githubusercontent.com` — this turned out to be the single most valuable channel. I pulled OpenAI's own OpenAPI spec, Cloudflare's own docs repo, and Hugging Face's own inference client source.
- `platform.claude.com` / `docs.claude.com` (serves `.md` versions of every doc page), `claude.com`, `www.anthropic.com`
- `generativelanguage.googleapis.com` (Gemini API — including its live discovery document) and `api.anthropic.com`
- `registry.npmjs.org` (package metadata **and tarballs**, so I measured real bundle sizes)
- `learn.microsoft.com` via the Microsoft Learn MCP tool

**BLOCKED (HTTP 000 / `connect_rejected`), despite some being listed as allowed in the brief:** `platform.openai.com`, `openai.com`, `help.openai.com`, `developers.openai.com`, `ai.google.dev`, `blog.google`, `support.google.com`, `support.anthropic.com`, `huggingface.co`, `router.huggingface.co`, `openrouter.ai`, `api.together.xyz`, `api.groq.com`, `api.cloudflare.com`, `developers.cloudflare.com`, `fal.ai` / `fal.run`, `replicate.com`, `deepinfra.com`, `fireworks.ai`, `nebius.com`, `stability.ai`, `bfl.ai`, `pollinations.ai` subdomains, **`vercel.com`** (listed as allowed, actually refused), `developer.mozilla.org`, `caniuse.com`, `web.dev`, `github.com` HTML, `codeload.github.com`, `cloud.google.com` doc paths. `api.github.com` works only for repos attached to this session.

Every claim below is tagged **[OPENED]** (I read the bytes), **[SEARCH]** (saw it in WebSearch result bodies only), or **[NOT VERIFIED]**.

Two things I verified **empirically today**, which matter more than any doc:

```
$ curl -i -X OPTIONS https://api.anthropic.com/v1/messages \
    -H "Origin: https://example.com" -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: content-type,x-api-key,anthropic-version,anthropic-dangerous-direct-browser-access"
HTTP/2 200
access-control-allow-origin: *
access-control-allow-headers: content-type,x-api-key,anthropic-version,anthropic-dangerous-direct-browser-access

$ curl -i -X OPTIONS "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" \
    -H "Origin: https://example.com" -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: content-type,x-goog-api-key"
HTTP/2 200
access-control-allow-origin: https://example.com
access-control-allow-headers: content-type,x-goog-api-key
```

**Anthropic and Google both serve CORS to arbitrary browser origins.** That single fact shapes the whole build plan: Google's Gemini API is a browser-reachable, free-tier, BYOK provider for image generation, image **editing**, TTS, STT, embeddings, video understanding and (paid) video generation. It is the backbone for almost every gap in Key Chat.

---

# SECTION 1 — THE COMPLETE TOOL LIST

## 1.1 Source quality warning, stated plainly

For **Claude** I have Anthropic's own pricing/feature matrix and own developer docs **[OPENED]** — this section is solid.
For **Gemini** I have Google's own live API discovery document, revision `20261124` **[OPENED]** — authoritative for the API surface; the consumer *app* surface is **[SEARCH]**.
For **ChatGPT** I have OpenAI's own OpenAPI spec v`2.3.0` **[OPENED]** — authoritative for the API, but **every consumer-app and pricing-tier claim about ChatGPT below is [SEARCH] from third-party blogs**, because every OpenAI-owned host is blocked here. Those blogs openly contradicted each other on limits. Treat ChatGPT tier claims as the weakest data in this report.

## 1.2 Claude.ai — authoritative feature matrix

From `https://claude.com/pricing` **[OPENED today]**, the per-tier table verbatim:

| Capability | Free | Pro ($17–20/mo) | Max ($100) | Ultra ($200) |
|---|---|---|---|---|
| Chat on web, iOS, Android, Desktop | Yes | Yes | Yes | Yes |
| **Web search** | **Yes** | Yes | Yes | Yes |
| **Create and edit files with code execution** | **Yes** | Yes | Yes | Yes |
| **Create Artifacts** | **Yes** | Yes | Yes | Yes |
| **Memory** | **Yes** | Yes | Yes | Yes |
| **Connectors** (MCP) | **Yes** | Yes | Yes | Yes |
| **Skills** | **Yes** | Yes | Yes | Yes |
| **Voice mode** | **Yes** | Yes | Yes | Yes |
| Claude Design | Yes | Yes | Yes | Yes |
| Claude Docs | Yes | Yes | Yes | Yes |
| Claude Slides | Yes | Yes | Yes | Yes |
| Desktop extensions | Yes | Yes | Yes | Yes |
| Incognito chats | Yes | Yes | Yes | Yes |
| User preferences | Yes | Yes | Yes | Yes |
| Projects | Up to 5 | Yes | Yes | Yes |
| **Research** (deep research) | **No** | Yes | Yes | Yes |
| **Hand off and schedule tasks** | **No** | Yes | Yes | Yes |
| **Claude in Chrome** (browser use) | **No** | Yes | Yes | Yes |
| Claude Data | No | Yes | Yes | Yes |
| Claude Sheets (beta) | No | Yes | Yes | Yes |
| Claude Whiteboards (beta) | No | Yes | Yes | Yes |
| Claude Code | No | Yes | Yes | Yes |
| Claude Science | No | Yes | Yes | Yes |
| Claude for Microsoft 365 / Outlook | No | Yes | Yes | Yes |
| Claude Motion (beta) | No | No | No | No (Team/Ent) |
| Claude Tag | No | No | No | No (Team/Ent) |
| Enterprise search | No | No | No | No (Team/Ent) |
| Opus model | No | Yes | Yes | Yes |
| Context window | Up to 1M (varies by model) | same | same | same |

Notable: **Claude.ai has no image generation, no text-to-image, no video generation and no standalone TTS product** in that table. Voice mode covers voice in and voice out. Note the new product names `Claude Duet`, `Claude Ship`, `Claude Tag`, `Claude Cowork`, `Claude Motion` in the site nav **[OPENED]**.

Claude's **API-side** tool surface, from `platform.claude.com/.../tool-use/tool-reference.md` **[OPENED]** — this is what the chat product is built on:

| Tool | `type` value | Runs on |
|---|---|---|
| Web search | `web_search_20260318` / `_20260209` / `_20250305` | Server |
| Web fetch | `web_fetch_20260318` / `_20260309` / `_20260209` / `_20250910` | Server |
| Code execution | `code_execution_20260521` / `_20260120` / `_20250825` | Server |
| Advisor | `advisor_20260301` (beta hdr `advisor-tool-2026-03-01`) | Server |
| Tool search | `tool_search_tool_regex_20251119`, `..._bm25_20251119` | Server |
| MCP connector | `mcp_toolset` (beta hdr `mcp-client-2025-11-20`) | Server |
| Memory | `memory_20250818` | Client |
| Bash | `bash_20250124` | Client |
| Text editor | `text_editor_20250728` / `_20250124` | Client |
| Computer use | `computer_toolset_20260801` (stable), `computer_20251124`, `computer_20250124` | Client toolset |
| Browser use | `browser_toolset_20260801` | Client toolset |

Code execution doc **[OPENED]**: "analyze data, create visualizations, perform complex calculations, run system commands, **create and edit files**, and process uploaded files." It is **free when used alongside `web_search_20260209` / `web_fetch_20260209` or later**. PDF support doc **[OPENED]**: max request 128 MB, max **600 pages** per request (100 when context < 1M); `.xlsx`/`.docx` are **not** accepted in document blocks — convert to text or PDF first.

## 1.3 Gemini — authoritative API surface

From the live discovery document, `revision: 20261124` **[OPENED]**. `GenerationConfig` carries:
`responseModalities`, `imageConfig` (`imageSize`: `512`/`1K`/`2K`/`4K`; `aspectRatio`: `1:1, 1:4, 4:1, 1:8, 8:1, 2:3, 3:2, 3:4, 4:3, …`), `speechConfig` (incl. `multiSpeakerVoiceConfig`, `textNormalization`), `audioTranscriptionConfig`, `translationConfig`, `thinkingConfig`, `responseSchema`, `enableAffectiveDialog`, `mediaResolution`, `responseFormat`.

`Tool` union **[OPENED]**: `googleSearch` (with `searchTypes`, `timeRangeFilter`), `googleMaps`, `codeExecution`, `urlContext`, `fileSearch` (over `fileSearchStores`), `computerUse` (with `enablePromptInjectionDetection`), `mcpServers`, `functionDeclarations`, `googleSearchRetrieval`.

`Part` union **[OPENED]** proves the input modalities: `inlineData`, `fileData`, `videoMetadata`, `audioMetadata`, `documentMetadata`, **`spreadsheetMetadata`**, `speechMetadata`, `executableCode`, `codeExecutionResult`, `audioTranscription`, `toolCall`/`toolResponse`.

Relevant methods **[OPENED]**: `models.generateContent`, `streamGenerateContent`, `embedContent`, `batchEmbedContents`, `predictLongRunning` (**this is the Veo video path**), `countTokens`, `generateAnswer`, `files.upload`/`list`/`get`/`delete`, `fileSearchStores.*`, `cachedContents.*`, `batches.*`, `auth_tokens.create`, `environments.*`, `generatedFiles.list`.

Model IDs and request shapes, from a GitHub mirror of Google's Gemini API docs **[OPENED]** (`raw.githubusercontent.com/diskd-ai/gemini-api/main/references/*.md`; third-party mirror, but it cross-validates exactly against the official discovery doc above, which is why I trust it):

- **Image gen + edit:** `gemini-2.5-flash-image` ("Nano Banana", 1024px, max 3 input images) and `gemini-3-pro-image-preview` ("Nano Banana Pro", 4K, **max 14 input images** — 6 objects + 5 humans, Google Search grounding, thinking mode). All output carries a **SynthID watermark**.
- **Video:** `veo-3.1-generate-preview`, `veo-3.1-fast-generate-preview`, `veo-3-generate-preview`, `veo-3-fast-generate-preview` (all native audio, 720p/1080p/4K, 4–8s), `veo-2.0-generate-001` (silent, 720p, 5–8s). REST path `POST {BASE}/models/veo-3.1-generate-preview:predictLongRunning`, then poll the operation, then GET `.response.generateVideoResponse.generatedSamples[0].video.uri`.
- **Music:** `lyria-realtime-exp` — real-time continuous instrumental music over the Live API WebSocket, steerable mid-stream.
- **Embeddings:** `gemini-embedding-001` via `POST /v1beta/models/gemini-embedding-001:embedContent`, default **3072 dims**, Matryoshka truncation, `task_type` (e.g. `SEMANTIC_SIMILARITY`).
- **TTS models [SEARCH]:** `gemini-3.8-flash-tts`, `gemini-3.8-flash-lite-tts`, `gemini-3.1-flash-tts-preview`, `gemini-2.5-flash-preview-tts`. Multi-speaker is capped at **2 speakers per request**; beyond that, synthesize per turn and concatenate.
- **Live API models [SEARCH]:** `gemini-2.5-flash-live`, `gemini-3.1-flash-live-preview`, `gemini-3.8-live`. Native-audio models support **only** the `AUDIO` response modality.

Gemini **app** (consumer) features, all **[SEARCH]**: Canvas (which also emits slide decks, quizzes, infographics, web pages, audio overviews, apps), Deep Research and "Deep Research Max" (claimed launch 2026-04-20, adds MCP + native visualizations), Nano Banana / Nano Banana Pro image gen+edit **on the free tier with limits**, Veo behind Google AI Pro / moved to Google Flow (sources conflict), Agent Mode / "Task", Audio Overviews, NotebookLM. **Gems are being retired and replaced by Skills: read-only for personal accounts from 17 Nov 2026, removed 17 Dec 2026** — so as of today they are already read-only. Scheduled actions: I could not confirm.

## 1.4 ChatGPT — authoritative API surface

From OpenAI's own `openapi.yaml`, `info.version: 2.3.0`, `openapi: 3.1.0`, 245 paths **[OPENED]**. The server-side tool union for `/responses` **[OPENED]**:

`FunctionTool`, `FileSearchTool`, `ComputerTool`, `ComputerUsePreviewTool`, `WebSearchTool`, `WebSearchPreviewTool`, `MCPTool`, `CodeInterpreterTool`, `ProgrammaticToolCallingParam`, `ImageGenTool`, `LocalShellToolParam`, `FunctionShellToolParam`, `CustomToolParam`, `NamespaceToolParam`, `ToolSearchToolParam`, `ApplyPatchToolParam`.

ChatGPT **app** features, all **[SEARCH]** and mutually contradictory on limits: Tools menu with image creation / web search / Canvas / Deep Research; Agent Mode selected from the composer dropdown (visual browser + text browser + terminal + direct API + connectors such as Gmail and GitHub); Deep Research (claimed 5–30 min sessions, MCP-connected since Feb 2026, can restrict to trusted sites); Tasks (scheduled, recurring or one-time); Projects; Memory; Sora; Connectors ("60+" per one blog); Study-and-Learn (unconfirmed). Claimed tier limits ranged from 10 to 250 deep-research queries/month and 40 to 400 agent messages/month depending on the blog. Free tier described as ad-supported, without Deep Research, Sora or Agent Mode. **Do not build a comparison chart off these numbers.**

## 1.5 The consolidated tool list — every invocable capability

Legend: ✅ yes · ❌ no · ⚠️ partial/conditional · 💰 needs paid tier · 🆓 on free tier

| # | Capability | ChatGPT | Claude.ai | Gemini | How the user invokes it |
|---|---|---|---|---|---|
| 1 | Web search | ✅ [SEARCH] | ✅ 🆓 [OPENED] | ✅ [SEARCH] | Tools menu, or just ask; Claude/Gemini auto-invoke |
| 2 | Web fetch / read a specific URL | ✅ [SEARCH] | ✅ 🆓 [OPENED] | ✅ `urlContext` [OPENED] | Paste a URL |
| 3 | Deep research mode | ✅ 💰 [SEARCH] | ✅ 💰 Pro+ ("Research") [OPENED] | ✅ [SEARCH] | Explicit mode button/toggle |
| 4 | Code execution / data-analysis sandbox | ✅ [SEARCH] | ✅ 🆓 [OPENED] | ✅ `codeExecution` [OPENED] | Upload data and ask; or "run this" |
| 5 | Image generation | ✅ 🆓 [SEARCH] | ❌ [OPENED] | ✅ 🆓 w/ limits [SEARCH] | "draw/generate an image of…" |
| 6 | **Image EDITING of an uploaded image** | ✅ [OPENED, API] | ❌ | ✅ 🆓 [OPENED] | Attach image + "change X to Y" |
| 7 | Image understanding (vision) | ✅ | ✅ 🆓 | ✅ | Attach an image |
| 8 | Document / PDF reading | ✅ | ✅ 🆓 (600 pp/req) [OPENED] | ✅ `documentMetadata` [OPENED] | Attach a PDF |
| 9 | Spreadsheet reading | ✅ | ⚠️ via code exec; **not** in document blocks [OPENED] | ✅ native `spreadsheetMetadata` [OPENED] | Attach .xlsx/.csv |
| 10 | Spreadsheet creation (.xlsx) | ✅ [SEARCH] | ✅ 🆓 via code exec; Claude Sheets 💰 [OPENED] | ✅ via Canvas [SEARCH] | "make me a spreadsheet" |
| 11 | Slide creation (.pptx) | ✅ [SEARCH] | ✅ Claude Slides 🆓 [OPENED] | ✅ Canvas [SEARCH] | "make a deck" |
| 12 | Word doc creation (.docx) | ✅ [SEARCH] | ✅ 🆓 [OPENED] | ✅ [SEARCH] | "write this as a Word doc" |
| 13 | PDF creation | ✅ | ✅ 🆓 [OPENED] | ✅ [SEARCH] | "export as PDF" |
| 14 | File download of generated artifacts | ✅ | ✅ 🆓 [OPENED] | ✅ | Download button |
| 15 | Chart / graph generation | ✅ | ✅ 🆓 (code exec → image, or Artifact) | ✅ (Deep Research Max native viz) | "chart this" |
| 16 | Diagram generation | ✅ | ✅ Artifacts / Whiteboards 💰 | ✅ Canvas | "draw a flowchart" |
| 17 | Canvas / artifact side-panel editing | ✅ Canvas [SEARCH] | ✅ Artifacts 🆓 [OPENED] | ✅ Canvas [SEARCH] | Auto, or "open in canvas" |
| 18 | Interactive artifacts that call the model / connectors | ❌ [NOT VERIFIED] | ✅ [SEARCH] | ✅ Canvas "apps" [SEARCH] | "build me a tool that…" |
| 19 | Whiteboard | ❌ | ✅ 💰 beta [OPENED] | ❌ | "whiteboard this" |
| 20 | Voice in (dictation / STT) | ✅ | ✅ 🆓 [OPENED] | ✅ | Mic button |
| 21 | Voice out (TTS) | ✅ | ✅ 🆓 [OPENED] | ✅ | Read-aloud / voice mode |
| 22 | Full duplex voice conversation | ✅ | ✅ 🆓 Voice mode [OPENED] | ✅ Gemini Live [SEARCH] | Voice mode button |
| 23 | Video understanding (uploaded video) | ✅ [OPENED, API] | ❌ [NOT VERIFIED] | ✅ `videoMetadata`, `mediaProcessing` [OPENED] | Attach a video |
| 24 | Video generation | ✅ Sora 💰 [SEARCH]; **API `/videos` is `deprecated: true`** [OPENED] | ❌ (Claude Motion beta, Team/Ent only) [OPENED] | ✅ Veo 💰 [OPENED] | "make a video of…" |
| 25 | Music / audio generation | ❌ | ❌ | ✅ Lyria RealTime [OPENED] | Live API session |
| 26 | Memory / personalization | ✅ [SEARCH] | ✅ 🆓 [OPENED] | ✅ [SEARCH] | Automatic; editable in Settings |
| 27 | Custom instructions / preferences | ✅ | ✅ 🆓 "User preferences" [OPENED] | ✅ | Settings |
| 28 | Projects / workspaces | ✅ [SEARCH] | ✅ 5 free, unlimited 💰 [OPENED] | ✅ Notebooks [SEARCH] | New project |
| 29 | Scheduled tasks | ✅ Tasks [SEARCH] | ✅ 💰 "Hand off and schedule tasks" [OPENED] | ⚠️ [NOT VERIFIED] | "every Monday at 9am, …" |
| 30 | Background / async agent tasks | ✅ Agent mode [SEARCH] | ✅ 💰 Cowork / handoff [OPENED] | ✅ Agent Mode [SEARCH] | Mode selector |
| 31 | Connectors to third-party apps | ✅ [SEARCH] | ✅ 🆓 [OPENED] | ✅ [SEARCH] | Connect in Settings, then @-mention |
| 32 | Custom / remote MCP connectors | ✅ [SEARCH] | ✅ 🆓 (1 custom on Free) [SEARCH] | ✅ `mcpServers` [OPENED] | Paste MCP server URL |
| 33 | Computer use / browser use | ✅ Agent [SEARCH]; API `ComputerTool` [OPENED] | ✅ 💰 Claude in Chrome [OPENED]; API `computer_toolset_20260801`, `browser_toolset_20260801` [OPENED] | ✅ `computerUse` tool [OPENED] | Agent mode / extension |
| 34 | Browser extension | ✅ [SEARCH] | ✅ 💰 [OPENED] | ✅ [SEARCH] | Install extension |
| 35 | Desktop app w/ local file + extensions | ✅ | ✅ 🆓 Desktop extensions [OPENED] | ⚠️ | Desktop app |
| 36 | Search over your own uploaded corpus (RAG) | ✅ `FileSearchTool` + `/vector_stores` [OPENED] | ✅ Projects / Skills [OPENED] | ✅ `fileSearch` + `fileSearchStores` [OPENED] | Upload to a project |
| 37 | Reusable procedural "skills" | ✅ `/skills` endpoints exist [OPENED] | ✅ 🆓 Skills [OPENED] | ✅ Skills (replacing Gems) [SEARCH] | Author a skill |
| 38 | Custom assistants (GPTs / Gems) | ✅ [SEARCH] | ⚠️ Projects+Skills | ⚠️ Gems retiring 17 Dec 2026 [SEARCH] | Builder UI |
| 39 | Agentic coding product | ✅ Codex [SEARCH] | ✅ 💰 Claude Code [OPENED] | ✅ Jules/Antigravity [NOT VERIFIED] | Separate surface |
| 40 | Incognito / temporary chat | ✅ | ✅ 🆓 [OPENED] | ✅ | Toggle |
| 41 | Model picker | ✅ | ✅ (Opus 💰) [OPENED] | ✅ | Dropdown |
| 42 | Shared links / collaboration | ✅ | ⚠️ Project sharing is Team/Ent only [OPENED] | ✅ | Share button |
| 43 | Grounded-maps / geospatial answers | ❌ | ❌ | ✅ `googleMaps` tool [OPENED] | Ask a place question |
| 44 | AI-provenance check of a file | ✅ `/content_provenance_checks` [OPENED] | ❌ | ⚠️ SynthID Detector [NOT VERIFIED] | Upload the file |
| 45 | Custom / cloned voices | ✅ `/audio/voices` (prompt- or sample-based + `/audio/voice_consents`) [OPENED] | ❌ | ⚠️ "voice design/replication" [SEARCH] | Create a voice |
| 46 | Translation | ✅ | ✅ | ✅ dedicated `translationConfig` [OPENED] | "translate this" |
| 47 | Prompt-/tool-search to scale past context | ✅ `ToolSearchToolParam` [OPENED] | ✅ `tool_search_tool_*` [OPENED] | ❌ | Automatic |
| 48 | Memory as an explicit agent tool | ✅ | ✅ `memory_20250818` + `/memory_stores` beta API [OPENED] | ❌ | Automatic |
| 49 | Specialized verticals in-product | ⚠️ health/shopping [SEARCH] | ✅ 💰 Claude Science [OPENED] | ⚠️ [SEARCH] | Mode/product selector |
| 50 | Local-shell / apply-patch agent tools | ✅ `LocalShellToolParam`, `ApplyPatchToolParam` [OPENED] | ✅ `bash_20250124`, `text_editor_*` [OPENED] | ❌ | Coding surfaces |

---

# SECTION 2 — THE OPENAI-COMPATIBLE SURFACE

**Primary source: OpenAI's own spec, fetched today [OPENED]:**
`https://raw.githubusercontent.com/openai/openai-openapi/master/openapi.yaml` — `openapi: 3.1.0`, `info.version: 2.3.0`, `servers: [https://api.openai.com/v1]`, 245 paths, auth `Authorization: Bearer <key>`.

## 2.1 The endpoints that matter to Key Chat

### `POST /chat/completions` — **THE de-facto standard**
Universally implemented. Everything else is optional. Confirmed implemented by Groq at `/openai/v1/chat/completions` **[OPENED]**, Together at `https://api.together.xyz/v1/chat/completions` **[OPENED]**, Cloudflare at `/client/v4/accounts/{account_id}/ai/v1/chat/completions` **[OPENED]**, HF Router at `https://router.huggingface.co/v1/chat/completions` **[OPENED]**, Pollinations at `https://text.pollinations.ai/openai` *and* `/v1/chat/completions` **[OPENED]**.

### `POST /images/generations` — **de-facto standard for text→image**
```jsonc
{
  "model": "gpt-image-2.6-flare",
  "prompt": "...",                 // ≤ 32000 chars
  "n": 1,                          // 1..10
  "size": "1024x1024",             // or "auto", or arbitrary WxH divisible by 16,
                                   // aspect 1:3..3:1, max 3840x2160 (>2560x1440 experimental)
  "quality": "auto|low|medium|high|xhigh|max",
  "output_format": "png|webp|jpeg|gif|svg",
  "output_compression": 100,       // webp/jpeg only
  "background": "transparent|opaque|auto",
  "moderation": "low|auto",
  "stream": false, "partial_images": 0,
  "complexity": "low|medium|high",
  "frame_count": 9, "frame_duration_ms": 0,   // GIF only, 2..16 frames
  "svg": { "model": "...", "reasoning": { "effort": "..." } },  // output_format=svg
  "safety_identifier": "user-hash"
}
```
**Newsworthy, all [OPENED] from the spec:** `output_format` now includes **`gif` and `svg`** — the API can return animated GIFs and real vector SVG. `response_format` and `style` are **deprecated**; GPT image models always return base64. Model enum: `gpt-image-1-mini`, `gpt-image-1.5`, `gpt-image-2`, `gpt-image-2-2026-04-21`, `gpt-image-2.5-sunburst(-2026-09-08)`, `gpt-image-2.5-flare(-2026-09-08)`, `gpt-image-2.6-sunburst`, `gpt-image-2.6-flare`, `chatgpt-image-latest`. **`gpt-image-1` was shut down 23 Oct 2026; `dall-e-2` and `dall-e-3` were retired 12 May 2026** (requests return HTTP 410).

Together AI implements this path with an OpenAI-shaped body plus `steps` and `response_format: "url"|"base64"` **[OPENED]**.

### `POST /images/edits` — image EDITING. **Not a universal standard; shapes diverge.**
Accepts **both** `multipart/form-data` and `application/json` **[OPENED]**:
```
multipart: model, prompt, image=<binary | up to 16 binaries>, mask=<PNG, <4MB, same dims>,
           markup=<transparent PNG overlay, GPT Image 2.5, mutually exclusive with mask>,
           background, size, quality, output_format, n, input_fidelity, stream, complexity
json:      { "model":"gpt-image-2.6-flare", "prompt":"...",
             "images":[{"image_url":"https://…"} | {"file_id":"file-abc123"}],
             "mask": {"file_id":"file-mask123"}, "output_format":"png" }
```
Mask semantics: **fully transparent pixels mark the region to edit**. Each source image ≤ 50 MB, png/webp/jpg, up to 16 images. Streams via `text/event-stream`. **`markup`** (a transparent PNG you scribble on) is a new alternative to masks.

### `POST /images/variations` — **RETIRED. Do not build on it.**
The spec marks it `deprecated: true` and documents a `410` response: "The image variations endpoint is no longer available." The spec's own guidance: use `/images/edits` with a GPT image model and a prompt instead **[OPENED]**.

### `POST /audio/speech` — TTS
```jsonc
{ "model": "gpt-4o-mini-tts", "input": "…",   // ≤4096 chars
  "voice": "alloy|ash|ballad|coral|echo|fable|onyx|nova|sage|shimmer|verse|marin|cedar"
           | {"id":"voice_1234"},
  "instructions": "…",            // not on tts-1/tts-1-hd
  "response_format": "mp3|opus|aac|flac|wav|pcm",
  "speed": 1.0,                   // 0.25..4.0
  "stream_format": "audio|sse" }
```
Required: `model`, `input`, `voice`. **Every current OpenAI TTS model (`tts-1`, `tts-1-hd`, `gpt-4o-mini-tts`, `gpt-4o-mini-tts-2025-12-15`) carries an announced shutdown date of 2027-01-06** **[OPENED]** — a real risk if you hard-code them. Also implemented by **Groq** at `/openai/v1/audio/speech` **[OPENED]** and **Together** at `/v1/audio/speech` (requires a `voice`; Kokoro uses `af_*` names such as `af_alloy`) **[OPENED]**.

### `POST /audio/transcriptions` — STT. **De-facto standard, widely implemented.**
`multipart/form-data`: `file` (flac/mp3/mp4/mpeg/mpga/m4a/ogg/wav/webm), `model`, `language`, `languages`, `keywords`, `prompt`, `response_format` (`json|text|srt|verbose_json|vtt`), `temperature`, `include`, `timestamp_granularities[]`, `stream`, `chunking_strategy` (`auto` or a `VadConfig`), `known_speaker_names`, `known_speaker_references`. Models: `whisper-1`, `gpt-transcribe`, `gpt-4o-transcribe`, `gpt-4o-mini-transcribe(-2025-12-15)`, `gpt-4o-transcribe-diarize` **[OPENED]**. Implemented by **Groq** **[OPENED]** and **Together** (whose version also accepts a public HTTP(S) URL as the `file` form field) **[OPENED]**.

### `POST /audio/translations` — **`deprecated: true` in the current spec [OPENED]**
`multipart`: `file`, `model` (`whisper-1` only — a `const`), `prompt`, `response_format`, `temperature`. Groq still exposes `/openai/v1/audio/translations` **[OPENED]**. Low value: use `/audio/transcriptions` then translate the text.

### `POST /embeddings` — **de-facto standard**
```jsonc
{ "model": "text-embedding-3-small",
  "input": "str" | ["str", …≤2048] | [int,…] | [[int,…],…],
  "encoding_format": "float|base64", "dimensions": 1536, "user": "…" }
```
8192 tokens per input; **300,000 tokens total per request** across all inputs **[OPENED]**. Implemented by **Groq** `/openai/v1/embeddings` **[OPENED]**, **Together** `/v1/embeddings` **[OPENED]**, **Cloudflare** `/ai/v1/embeddings` (e.g. `@cf/baai/bge-large-en-v1.5`) **[OPENED]**. **Anthropic offers no embedding model at all** — its own doc says so outright and points to Voyage AI by MongoDB (`voyage-4-large`, `voyage-4`, `voyage-4-lite`, `voyage-code-4`, 32k ctx, 1024 default dims with 256/512/2048 options; `voyage-4-nano` is Apache-2.0 open weights) **[OPENED]**.

### `POST /moderations` — effectively OpenAI-only
`{ "input": str | [str] | [{type:"text",text}|{type:"image_url",image_url:{url}}], "model": "omni-moderation-latest" }` **[OPENED]**. I found no third-party implementation.

### `POST /responses` — OpenAI's agent-loop endpoint, now partially adopted
Server-side tool union **[OPENED]**: `function`, `file_search`, `computer`, `computer_use_preview`, `web_search`, `web_search_preview`, `mcp`, `code_interpreter`, `programmatic_tool_calling`, `image_generation`, `local_shell`, `function_shell`, `custom`, `namespace`, `tool_search`, `apply_patch`. Companion paths: `/responses/{id}`, `/{id}/cancel`, `/{id}/input_items`, `/responses/input_tokens` (beta, deprecated), `/responses/compact`. **Cloudflare implements `/ai/v1/responses` but only for `@cf/openai/gpt-oss-120b` and `@cf/openai/gpt-oss-20b`, and only with `stream: false`** **[OPENED]**.

### `/files` and friends
`GET /files` (`purpose`, `limit` up to 10,000, `order`, `after`), `POST /files`, `GET|DELETE /files/{id}`, `GET /files/{id}/content`; plus chunked `POST /uploads`, `/uploads/{id}/parts`, `/complete`, `/cancel` **[OPENED]**. **Groq implements the whole `/openai/v1/files` family** including `/content` **[OPENED]**.

### `GET /models`, `GET /models/{model}`, `DELETE /models/{model}`
Near-universal. Groq, Together, Cloudflare, HF Router, Pollinations (`GET https://text.pollinations.ai/models`) all expose a models list **[OPENED]**.

### `POST /completions` (legacy text completion)
Still present, not deprecated. HF `hf-inference` builds `/v1/completions` for text-generation **[OPENED]**.

### Everything else in the spec (OpenAI-only; useful as a feature checklist, not as a portability target)
All **[OPENED]**: `/batches` (+Groq), `/videos` + `/videos/edits` + `/videos/extensions` + `/videos/characters` + `/videos/{id}/remix` + `/{id}/content` — **the entire `/videos` family is `deprecated: true`**; body is `{model: "sora-2"|"sora-2-pro", prompt (≤32000), input_reference:{image_url|file_id}, seconds: 4|8|12, size: "720x1280"|"1280x720"|"1024x1792"|"1792x1024"}`. Also `/realtime/*` (calls, client_secrets, sessions, transcription_sessions, translations), the newer `/live/sessions/*` family, `/containers/*` (code-interpreter containers + file upload/download), `/vector_stores/*` incl. `POST /vector_stores/{id}/search`, `/conversations/*`, `/skills/*` (+ versions + content), `/chatkit/*`, `/evals/*`, `/fine_tuning/*`, `/content_provenance_checks`, `/audio/voices` + `/audio/voice_consents`, `/decisions`, `/organization/*` (admin/billing/usage), and the **deprecated** `/assistants` + `/threads` family.

## 2.2 Compatibility matrix — what to actually code against

| Endpoint | De-facto standard? | Verified implementers (beyond OpenAI) |
|---|---|---|
| `/chat/completions` | **Yes — universal** | Groq, Together, Cloudflare, HF Router, Pollinations, OpenRouter [SEARCH] **[OPENED except OpenRouter]** |
| `/models` | **Yes** | Groq, Together, Cloudflare, HF, Pollinations **[OPENED]** |
| `/embeddings` | **Yes** | Groq, Together, Cloudflare **[OPENED]** |
| `/audio/transcriptions` | **Yes** | Groq, Together **[OPENED]** |
| `/images/generations` | **Mostly** | Together (+ doubles as the image-edit path) **[OPENED]**; OpenRouter uses `/api/v1/images` instead [SEARCH] |
| `/audio/speech` | **Partial** | Groq, Together **[OPENED]** |
| `/completions` | Partial | HF `hf-inference` **[OPENED]** |
| `/files`, `/batches` | Partial | Groq **[OPENED]** |
| `/responses` | Partial | Cloudflare (gpt-oss only, non-streaming) **[OPENED]** |
| `/images/edits` | **No** | OpenAI only, as far as I verified |
| `/audio/translations` | No (and deprecated) | Groq **[OPENED]** |
| `/moderations` | No | none found |
| `/images/variations` | **RETIRED (410)** | n/a |
| `/videos` | No (and deprecated) | Together uses `POST /v2/videos` instead **[OPENED]** |

**Engineering conclusion for Key Chat:** treat `/chat/completions`, `/models`, `/embeddings`, `/audio/transcriptions` as safely portable. Treat `/images/generations` as portable-with-quirks. Treat image **editing** as per-provider adapters, because the field name differs (`image` vs `image_url` vs `image_urls` vs `reference_images` vs `inlineData`) — see Section 3.

---

# SECTION 3 — WHICH PROVIDERS OFFER WHAT, FOR A BYOK BROWSER USER

## 3.1 CORS — the gate everything else passes through

| Provider host | CORS for a browser origin | Evidence |
|---|---|---|
| `generativelanguage.googleapis.com` (Google AI Studio / Gemini) | **YES** — reflects `Origin`, allows `x-goog-api-key` | **VERIFIED by me today**, preflight above |
| `api.anthropic.com` | **YES** — `ACAO: *`, allows `anthropic-dangerous-direct-browser-access` | **VERIFIED by me today**; SDK doc also lists "browser support" **[OPENED]** |
| `api.replicate.com` | **NO** | Replicate's own JS README, line 9: *"This library can't interact with Replicate's API directly from a browser."* **[OPENED]** |
| `fal.run` / `queue.fal.run` | **Very likely YES** | fal's own client README documents browser use ("Browser applications use browser trust") and tells you to allow `falrun.com` / `queue.falrun.com` in your **browser Content Security Policy `connect-src`** — meaningless unless browsers call it directly **[OPENED]**. The proxy package exists to hide keys, which BYOK makes moot. |
| `api.groq.com` | Likely yes | A developer's own live preflight test reported wildcard `ACAO` [SEARCH]. Not verified by me. |
| `openrouter.ai` | Likely yes | Same source [SEARCH]. Not verified by me. |
| `api.cloudflare.com` (Workers AI) | **UNVERIFIED — biggest open risk** | I could not reach the host; no doc states it. [NOT VERIFIED] |
| `api.together.xyz` | **UNVERIFIED** | [NOT VERIFIED] |
| `image.pollinations.ai` | YES for images (it is a plain `<img src>` URL, so CORS is irrelevant) | Pollinations' own docs **[OPENED]** |
| DeepInfra / Fireworks / Nebius / OVH / Stability / BFL / Wavespeed / Novita | **UNVERIFIED** | all hosts blocked |

**Build rule:** probe CORS at runtime. On a failed preflight, surface "this provider needs a proxy" rather than a generic network error, and let the user paste a proxy URL (their own Cloudflare Worker is the cheap fix — free tier, ~20 lines).

## 3.2 IMAGE EDITING / INPAINTING — the critical sub-section

Ranked by usefulness to a free-tier BYOK browser user.

**#1 — Google Gemini API. Free tier, CORS verified, no proxy, real instruction editing.**
```http
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent
x-goog-api-key: <user key>
Content-Type: application/json

{ "contents": [{ "parts": [
      { "text": "Add a sunset sky to this image" },
      { "inlineData": { "mimeType": "image/png", "data": "<base64>" } } ]}],
  "generationConfig": {
      "responseModalities": ["TEXT","IMAGE"],
      "imageConfig": { "aspectRatio": "16:9", "imageSize": "2K" } } }
```
Response: edited image returned as `candidates[0].content.parts[].inlineData.data` (base64). Models: **`gemini-2.5-flash-image`** (Nano Banana; 1024px; up to 3 input images) and **`gemini-3-pro-image-preview`** (Nano Banana Pro; 1K/2K/4K; **up to 14 input images**; Search grounding; thinking mode). Aspect ratios `1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9`; `imageSize` `"1K"|"2K"|"4K"` (Pro only). The `ImageConfig` schema in Google's discovery doc independently confirms `imageSize` ∈ `512, 1K, 2K, 4K` **[OPENED]**. Free-tier **image** quotas specifically: **[NOT VERIFIED]** — blogs say image gen/edit is on the free tier "with limits" but nobody published the numbers, and Google's rate-limit page was unreachable. Multi-turn chat editing works (send follow-up turns). All output is **SynthID-watermarked**.
*No mask support* — it is instruction-based, not region-based inpainting.

**#2 — Together AI. OpenAI-shaped, one endpoint for generate *and* edit.** **[OPENED from HF's `together.ts`]**
```http
POST https://api.together.xyz/v1/images/generations
Authorization: Bearer <key>
{ "model": "...", "prompt": "...", "steps": 28, "response_format": "base64",
  "image_url": "<data: or https: URL>"        // FLUX.1 Kontext models ONLY
  // OR
  "reference_images": ["<url>"]               // FLUX.2 [dev]/[pro]/[flex], Gemini 3 Pro Image, Flash Image 2.5
}
```
The HF source comments document the split explicitly: *"FLUX.1 Kontext only accepts `image_url`; FLUX.2 [dev] and Google models (Gemini 3 Pro Image, Flash Image 2.5) only accept `reference_images`. FLUX.2 [pro]/[flex] accept either but `reference_images` is the documented default."* **[OPENED]** Free tier: blogs claim $1 free credit without a card, one claims up to $100 [SEARCH] — **[NOT VERIFIED]**. CORS **[NOT VERIFIED]**. Paid beyond the credit.

**#3 — Cloudflare Workers AI. Genuinely free daily allowance, real image-edit models.** **[OPENED from `cloudflare/cloudflare-docs`]**
Native (non-OpenAI) shape: `POST https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/{model}` with `Authorization: Bearer <token>`. Image models are **not** on the OpenAI-compatible path — that path serves only chat, embeddings and gpt-oss responses.
Models whose published pricing includes an **input-image** term, i.e. they accept an image to edit:
- `@cf/black-forest-labs/flux-2-klein-9b` — 1363.64 neurons per first MP + 181.82 per subsequent MP + **181.82 per input image MP**
- `@cf/black-forest-labs/flux-2-dev` — 18.75 neurons per **input** 512×512 tile per step + 37.50 per output tile per step
- `@cf/black-forest-labs/flux-2-klein-4b` — 5.37 neurons per **input** 512×512 tile + 26.05 per output tile
- Text-to-image only: `@cf/black-forest-labs/flux-1-schnell`, `@cf/leonardo/lucid-origin`, `@cf/leonardo/phoenix-1.0`
Free allowance: **10,000 neurons/day, on Workers Free and Workers Paid alike, resetting daily; $0.011 per 1,000 neurons above it** **[OPENED]**. My arithmetic from those published rates: ≈**173** 1024×1024 4-step flux-1-schnell images/day free; ≈**6** flux-2-klein-9b edits/day free (1 MP in, 1 MP out ≈ 1,545 neurons). CORS **[NOT VERIFIED]** — the one blocker.

**#4 — fal.ai. The only true mask-based inpainting I could pin down.** **[OPENED from HF's `fal-ai.ts`]**
```http
POST https://queue.fal.run/{model_path}          # or https://fal.run/{model_path}
Authorization: Key <FAL_KEY>
{ "prompt": "...", "image_url": "data:image/png;base64,…",
  "image_urls": ["data:image/png;base64,…"] }    # FLUX.2-dev wants the array form
```
Then poll the queue; result is `{ "images": [{ "url": "…" }] }`. `FLUX.1 Fill [pro]` inpainting/outpainting endpoint is `POST https://fal.run/fal-ai/flux-pro/v1/fill` at **$0.05/megapixel** [SEARCH]. Supports `image-to-image`, `image-text-to-image` (instruction edit), `image-segmentation` (which returns a mask you can feed back into an inpaint call — a nice two-step pipeline), `image-to-video`, TTS, ASR. Free credits: one blog says ~$20 without a card, another just "free credits" [SEARCH] — **[NOT VERIFIED]**. Paid thereafter.

**#5 — Hugging Face Inference Providers.** The HF JS client's own `getProviderHelper.ts` gives the complete, current task × provider matrix **[OPENED]**:
- `image-to-image`: **fal-ai, hf-inference, replicate, together, wavespeed**
- `image-text-to-image` (prompt + image → image, i.e. instruction editing): **fal-ai, wavespeed**
Real model IDs, taken from HF's own test suite **[OPENED]**:
| Model ID | Provider | What it does |
|---|---|---|
| `black-forest-labs/flux-kontext-dev` | replicate | instruction edit ("change the armor to gold") |
| `Qwen/Qwen-Image-Edit-2509` | wavespeed | instruction edit |
| `dx8152/Qwen-Edit-2509-Multiple-angles` | wavespeed | multi-image edit (takes an `images: []` array) |
| `HiDream-ai/HiDream-E1-Full` | wavespeed | instruction edit, `guidance_scale`, `num_inference_steps`, `seed` |
| `lllyasviel/sd-controlnet-depth` | hf-inference | ControlNet depth-guided |
| `lllyasviel/sd-controlnet-canny` | hf-inference | ControlNet edge-guided |
**Critical change:** HF moved **language-model routing to OpenRouter on 16 Nov 2026**; image, video and audio generation stay on HF's own provider infrastructure [SEARCH]. Its OpenAI-compatible endpoint `https://router.huggingface.co/v1` is **chat-only** — per HF's own README, `chatCompletion` goes to `/v1/chat/completions`; every other task uses native per-provider routes **[OPENED]**. Free credits: sources conflict badly ($0.10/mo, $2/mo PRO, or nothing at all; one says free monthly credit ended Oct 2026) — **[NOT VERIFIED]**. Over-quota returns **402 Payment Required** [SEARCH].

**#6 — Replicate.** `POST https://api.replicate.com/v1/models/{model}/predictions` (or `/v1/predictions` for versioned models) **[OPENED]**. Serves `image-to-image` incl. `black-forest-labs/flux-kontext-dev`. **Unusable from a browser — ruled out by Replicate's own docs.** Needs a proxy. Paid.

**#7 — OpenAI.** `/images/edits` with `gpt-image-2.6-flare` etc., full mask + `markup` support, 16 input images, JSON or multipart **[OPENED]**. Paid only; `api.openai.com` CORS **[NOT VERIFIED]** (host blocked; historically OpenAI has not served browser CORS).

**#8 — Black Forest Labs direct.** `FLUX.1 Fill [pro]` at **$0.05/image** per BFL's own pricing page [SEARCH]. Endpoint name **[NOT VERIFIED]**. Paid, no free tier found.

**#9 — Stability AI.** I could not verify the `v2beta/stable-image/edit/inpaint` route or its credit pricing. **[NOT VERIFIED]**

**Not an option: Pollinations.** Its Classic API is text→image only, one model, JPEG with a watermark, max 768×768, and **one request per IP per 45 seconds** **[OPENED]**. No editing. (A keyed tier exists at `enter.pollinations.ai` with "pollen" credits and docs at `gen.pollinations.ai/docs` — both unreachable, **[NOT VERIFIED]**.)

## 3.3 TEXT-TO-SPEECH

| Option | Free? | Browser-reachable | Endpoint shape |
|---|---|---|---|
| **Browser `speechSynthesis`** | **Totally free, no key, no provider** | n/a — it *is* the browser | `new SpeechSynthesisUtterance(text)` |
| **Gemini TTS** | Free tier (quota **[NOT VERIFIED]**) | **CORS VERIFIED** | `generateContent` + `generationConfig.speechConfig` (`voiceConfig` or `multiSpeakerVoiceConfig`, max 2 speakers; `textNormalization`; `languageCode`) **[OPENED schema]**; models `gemini-3.8-flash-tts`, `gemini-3.8-flash-lite-tts`, `gemini-2.5-flash-preview-tts` [SEARCH] |
| **Cloudflare `@cf/myshell-ai/melotts`** | **Yes — 18.63 neurons/audio-min ⇒ ≈536 min/day free** (my arithmetic on CF's published rate) | **[NOT VERIFIED]** | `POST /ai/run/@cf/myshell-ai/melotts` **[OPENED]** |
| Cloudflare `@cf/deepgram/aura-1` | 1,363.64 neurons/1k chars ⇒ ≈7.3k chars/day free | **[NOT VERIFIED]** | `/ai/run/...` **[OPENED]** |
| Cloudflare `@cf/deepgram/aura-2-en` / `-es` | 2,727 neurons/1k chars ⇒ ≈3.6k chars/day free | **[NOT VERIFIED]** | **[OPENED]** |
| **Groq** | Free tier claimed, no card [SEARCH] | likely [SEARCH] | **`POST /openai/v1/audio/speech`** — OpenAI-identical **[OPENED]** |
| **Together** | credit-based | **[NOT VERIFIED]** | `POST /v1/audio/speech`, **requires `voice`**; Kokoro voices are `af_*`, default `af_alloy` **[OPENED]** |
| HF Providers | per-provider | varies | `text-to-speech` served by **deepinfra, fal-ai, hf-inference, replicate, together** **[OPENED]**; models `hexgrad/Kokoro-82M` (replicate), `espnet/kan-bayashi_ljspeech_vits` (hf-inference) **[OPENED]** |
| OpenAI | paid | **[NOT VERIFIED]** | `/audio/speech`; **all current TTS models shut down 2027-01-06** **[OPENED]** |

**Recommendation: ship `speechSynthesis` first.** Zero cost, zero key, zero network, works offline, available in every browser. Then offer Gemini TTS as the "good voices" upgrade, since it is the only high-quality option with verified browser CORS *and* a free tier.

## 3.4 SPEECH-TO-TEXT (Key Chat already has this — here are the free upgrades)

| Option | Free? | Browser | Shape |
|---|---|---|---|
| **Browser `SpeechRecognition`** | **Free** | native | `recognition.lang`, `.continuous`, `.interimResults`, `.phrases` (contextual biasing, Edge 142+), **`.processLocally = true`** for a fully on-device model (Edge Canary/Dev 150.0.4076+; en-US, de-DE, it-IT, pt-PT, es-ES, ko-KR), `install()` to pre-download. Edge 159 adds `speechStartTime`/`speechEndTime` on results for subtitle alignment. **[OPENED — Microsoft Learn]** Caveat: Edge's non-local path sends audio to Azure Cognitive Services; not supported on Edge Android/iOS. |
| **Gemini** | free tier | **CORS VERIFIED** | `generateContent` with an audio `inlineData` part + `generationConfig.audioTranscriptionConfig` **[OPENED]** |
| **Cloudflare `@cf/openai/whisper`** | 41.14 neurons/audio-min ⇒ **≈243 min/day free**; `whisper-large-v3-turbo` 46.63 ⇒ ≈214 min/day | **[NOT VERIFIED]** | `/ai/run/@cf/openai/whisper` **[OPENED]** |
| Cloudflare `@cf/deepgram/nova-3` | 472.73 n/min (836 over WebSocket) ⇒ ≈21 min/day free | **[NOT VERIFIED]** | **[OPENED]** |
| **Groq** | free tier claimed | likely | `/openai/v1/audio/transcriptions` **[OPENED]** |
| **Together** | credits | **[NOT VERIFIED]** | `/v1/audio/transcriptions`, also accepts a public URL as `file` **[OPENED]** |
| HF Providers | varies | varies | ASR via **deepinfra, fal-ai, hf-inference, replicate, together** **[OPENED]**; e.g. `openai/whisper-large-v3` |

## 3.5 EMBEDDINGS

| Option | Free allowance | Browser | Shape |
|---|---|---|---|
| **Cloudflare `@cf/google/embeddinggemma-2`** | **154 neurons per M input tokens ⇒ ≈64.9M tokens/day free** (my arithmetic on CF's rate) — by far the largest free embedding budget I found | **[NOT VERIFIED]** | `/ai/v1/embeddings` (OpenAI-shaped!) or `/ai/run/...` **[OPENED]** |
| Cloudflare `@cf/baai/bge-m3`, `@cf/qwen/qwen3-embedding-0.6b` | 1,075 n/M ⇒ ≈9.3M tokens/day free | **[NOT VERIFIED]** | **[OPENED]** |
| Cloudflare `bge-small/base/large-en-v1.5`, `@cf/pfnet/plamo-embedding-1b` | 1,841 / 6,058 / 18,582 / 1,689 n/M | **[NOT VERIFIED]** | **[OPENED]** |
| **Gemini `gemini-embedding-001`** | free tier | **CORS VERIFIED** | `POST /v1beta/models/gemini-embedding-001:embedContent`; **3072 dims default**, Matryoshka truncation, `task_type` **[OPENED]** |
| **Groq** | free tier claimed | likely | `/openai/v1/embeddings` **[OPENED]** |
| **Together** | credits | **[NOT VERIFIED]** | `/v1/embeddings` **[OPENED]** |
| HF Providers (`feature-extraction`) | varies | varies | **deepinfra, hf-inference, scaleway, together** **[OPENED]** |
| Voyage AI (MongoDB) | 200M free tokens claimed [SEARCH] | **[NOT VERIFIED]** | Anthropic's own doc recommends it: `voyage-4-large/4/4-lite/code-4`, 32k ctx **[OPENED]**; `voyage-4-nano` is Apache-2.0 open weights you can run in-browser |
| Jina AI | 1M tokens free, 100 RPM / 100k TPM claimed [SEARCH] | **[NOT VERIFIED]** | — |
| Cohere | trial key, 1,000 calls/month claimed [SEARCH] | **[NOT VERIFIED]** | — |
| **Anthropic** | **none — no embedding model exists** | n/a | Confirmed by Anthropic's own doc **[OPENED]** |
| OpenAI | no free tier; $5 new-account credit, 3-month expiry [SEARCH] | **[NOT VERIFIED]** | `/embeddings` **[OPENED]** |

**Also worth noting: on-device embeddings.** `voyage-4-nano` is Apache-2.0 **[OPENED]**, and transformers.js-class models run in-browser on WebGPU/WASM. That makes embeddings a *client-side* capability with **no provider at all** — see Section 4.

## 3.6 VIDEO

| Option | Free? | Browser | Shape |
|---|---|---|---|
| **Gemini / Veo** | **Paid** (app access tied to Google AI Pro [SEARCH]) | **CORS VERIFIED** | `POST /v1beta/models/veo-3.1-generate-preview:predictLongRunning` → poll operation → `.response.generateVideoResponse.generatedSamples[0].video.uri`. Models/caps table in §1.3 **[OPENED]** |
| **Together** | credits | **[NOT VERIFIED]** | `POST https://api.together.xyz/v2/videos`, returns a job id, poll `{url}/{jobId}` **[OPENED]** |
| HF Providers | varies | varies | `text-to-video`: **fal-ai, novita, replicate, together, wavespeed**; `image-to-video`: **fal-ai, together, wavespeed**; `image-text-to-video`: **fal-ai, novita, wavespeed** **[OPENED]**. Verified IDs: `Wan-AI/Wan2.1-T2V-14B`, `Wan-AI/Wan2.1-I2V-14B-480P` (wavespeed), `fal-ai/ltxv-13b-098-distilled/image-to-video` (fal) **[OPENED]** |
| OpenAI / Sora | paid | **[NOT VERIFIED]** | `/videos` — **entire family `deprecated: true`** **[OPENED]** |
| Cloudflare | — | — | **No video-generation model appears in Cloudflare's published pricing table** **[OPENED]** |

**Video *understanding*** is the cheaper, more useful win: Gemini accepts video via `inlineData`/`fileData` with `videoMetadata` and a `mediaProcessing` hint, on a CORS-verified, free-tier endpoint **[OPENED]**. Video *generation* is paid everywhere.

## 3.7 Free-tier summary, ranked for a user who cannot spend much

1. **Cloudflare Workers AI** — the only provider with a standing, renewing, card-free daily allowance (**10,000 neurons/day**) that covers image gen, image edit, TTS, STT and embeddings at once **[OPENED]**. **Blocked only by unverified CORS.** If CORS fails, a user's own free Cloudflare Worker fixes it, and they already have a Cloudflare account by definition.
2. **Google AI Studio / Gemini API** — free tier, **CORS verified**, and the widest modality coverage from one key and one request shape: chat, vision, image gen, **image edit**, TTS, STT, embeddings, video understanding, doc/spreadsheet understanding, web search grounding, code execution, computer use, MCP **[OPENED]**. Free-tier *numbers* unverified and reportedly tightened during 2026 [SEARCH].
3. **Groq** — card-free free tier claimed, fully OpenAI-shaped across chat/embeddings/TTS/STT/translations/batches/files **[OPENED]**. No image endpoints.
4. **OpenRouter** — free key, some `:free` models, now a dedicated `POST /api/v1/images` plus image output through `/api/v1/chat/completions` with `modalities` for Gemini and gpt-5-image models [SEARCH].
5. **Pollinations Classic** — zero-signup, but 45 s between requests, 768×768, watermarked, one model **[OPENED]**. Fine as a no-key demo, not a product.
6. **Together / fal / Fireworks / HF** — finite trial credits, then paid. Amounts **[NOT VERIFIED]**.
7. **Replicate** — paid *and* browser-impossible. Lowest priority.

---

# SECTION 4 — CLIENT-SIDE CAPABILITIES NEEDING NO PROVIDER

All npm figures below are **measured by me today**: metadata from `registry.npmjs.org` and byte sizes from the actual tarballs, gzipped at level 9 **[OPENED]**.

## 4.1 Measured bundle sizes

| Package | Latest version | Browser bundle | raw | **gzip** |
|---|---|---|---|---|
| `fflate` | 0.8.3 | `umd/index.js` | 32 KB | **12 KB** |
| `papaparse` | 5.7.1 | `papaparse.min.js` | 18 KB | **6 KB** |
| `qrcode` | 1.5.4 | core `lib/core/qrcode.js` | 14 KB | **4 KB** (132 KB unpacked total) |
| `chart.js` | 4.6.2 | `chart.umd.js` | 207 KB | **70 KB** |
| `xlsx` (SheetJS) | **0.18.5** | `xlsx.mini.min.js` | 244 KB | **76 KB** |
| `xlsx` (SheetJS) | 0.18.5 | `xlsx.core.min.js` | 426 KB | 137 KB |
| `xlsx` (SheetJS) | 0.18.5 | `xlsx.full.min.js` | 861 KB | 307 KB |
| `mammoth` | 1.13.0 | `mammoth.browser.min.js` | 395 KB | **98 KB** |
| `jspdf` | 4.2.1 | `jspdf.umd.min.js` | 410 KB | **129 KB** |
| `docx` | 9.16.0 | `dist/index.iife.js` | 1036 KB | **225 KB** |
| `docx` | 9.16.0 | `dist/charts.iife.js` (optional) | 210 KB | 49 KB |
| `exceljs` | 4.4.0 | `exceljs.min.js` | 925 KB | **250 KB** |
| `pdfjs-dist` | 6.5.438 | `pdf.min.mjs` | 463–525 KB | **132–151 KB** |
| `pdfjs-dist` | 6.5.438 | `pdf.worker.min.mjs` (also required) | 1242–1296 KB | **369–385 KB** |
| `pdf-lib` | 1.17.1 | — | 19.0 MB unpacked | — |
| `write-excel-file` | 4.1.1 | — | 1.77 MB unpacked | — |
| `jszip` | 3.10.2 | — | 677 KB unpacked | — |
| `html2canvas` | 1.4.1 | — | 3.3 MB unpacked | — |

**⚠️ Important trap:** **`xlsx` on npm is pinned at 0.18.5** — SheetJS stopped publishing to the npm registry after that release and now distributes from its own CDN. So `npm i xlsx` installs a 2022-era build. If you want a maintained npm-installable writer, use `write-excel-file` or `exceljs`; otherwise fetch SheetJS from its own CDN, or hand-roll (see next).

## 4.2 The big architectural insight: XLSX, DOCX and PPTX are all ZIP-of-XML

Key Chat **already writes ZIP**. Every Office Open XML format is a ZIP archive containing a small set of XML parts. So **.xlsx, .docx and .pptx generation cost you ~0 KB of new dependency** — only the template XML you write by hand:

- **.xlsx** minimal parts: `[Content_Types].xml`, `_rels/.rels`, `xl/workbook.xml`, `xl/_rels/workbook.xml.rels`, `xl/worksheets/sheet1.xml`, optionally `xl/sharedStrings.xml`. Inline strings (`t="inlineStr"`) let you skip the shared-string table entirely.
- **.docx** minimal parts: `[Content_Types].xml`, `_rels/.rels`, `word/document.xml`, `word/_rels/document.xml.rels`.
- **.pptx** needs one `ppt/slides/slideN.xml` per slide plus a presentation part and a slide master/layout — more template work, still no library.

This is comfortably the highest-leverage item in this whole report: three headline "file creation" features for roughly 300–600 lines of template code and zero new bundle weight. Compare: `exceljs` 250 KB gzip + `docx` 225 KB gzip + a pptx library, versus 0 KB.

## 4.3 ZIP with no library at all

The browser ships **`CompressionStream('deflate-raw')`**. A ZIP file is `deflate-raw` members plus local file headers, a central directory, and a CRC-32 per entry. CRC-32 is ~15 lines with a precomputed table. So even the existing ZIP writer could drop `fflate`/`jszip` if you want. `fflate` at 12 KB gzip is cheap enough that this is optional — but if you need **reading** ZIPs too, `DecompressionStream('deflate-raw')` covers that symmetrically.

## 4.4 Zero-dependency browser APIs — the cheapest wins

| Capability | Approach | Library? | Notes |
|---|---|---|---|
| **Voice out (TTS)** | `speechSynthesis.speak(new SpeechSynthesisUtterance(t))`; `getVoices()` for voice picker, `rate`/`pitch`/`volume` | **None** | Universal. **Closes the "voice out" gap with no provider and no key.** |
| **Voice in (STT)** | `new SpeechRecognition()`; `lang`, `continuous`, `interimResults`, `phrases` (biasing), **`processLocally = true`** + `install()` for on-device | **None** | **[OPENED — Microsoft Learn]** Chrome/Edge/Safari. On-device model in Edge Canary/Dev 150.0.4076+, 6 languages. Edge 159 adds `speechStartTime`/`speechEndTime`. Not on Edge mobile. |
| **Audio recording** | `getUserMedia({audio:true})` → `new MediaRecorder(stream, {mimeType:'audio/webm;codecs=opus'})` → Blob | **None** | Feed straight into any `/audio/transcriptions` |
| **Image resize / crop / rotate / format convert** | `createImageBitmap(blob, {resizeWidth, resizeHeight, resizeQuality})` → `OffscreenCanvas` → `canvas.convertToBlob({type:'image/webp', quality})` | **None** | png / jpeg / webp out. Also the right way to downscale images before sending to a vision model — direct token-cost savings. |
| **Chart → image** | Draw on Canvas 2D (axes, bars, lines, labels), then `toBlob('image/png')` | **None** (or `chart.js` 70 KB gzip) | Hand-rolled bar/line/pie is ~200 lines and gives full style control. Also: render SVG, then `new Image()` from a `data:image/svg+xml` URL, draw to canvas, `toBlob`. |
| **SVG output** | Emit SVG text directly | **None** | Zero-cost vector charts/diagrams; also directly embeddable in PDFs |
| **QR codes** | `qrcode` core, or hand-roll the Reed–Solomon encoder | 4 KB gzip | Cheap either way |
| **QR / barcode *reading*** | `new BarcodeDetector({formats:['qr_code']})` | **None** | Chromium/Android; feature-detect |
| **CSV write** | String building + RFC-4180 quoting | **None** | ~20 lines. Prepend a UTF-8 BOM so Excel reads non-ASCII correctly. |
| **CSV / TSV read** | `papaparse` | 6 KB gzip | Worth it for malformed real-world files; hand-rolling is error-prone |
| **Clipboard (rich)** | `navigator.clipboard.write([new ClipboardItem({'text/html':…, 'text/plain':…, 'image/png': blob})])` | **None** | Copy a generated chart as an image, or a table as HTML that pastes into Excel/Docs |
| **Clipboard read** | `navigator.clipboard.read()` | **None** | Paste an image straight into chat |
| **Web Share** | `navigator.canShare({files:[f]})` then `navigator.share({files, title, text})` | **None** | Share generated PDF/PNG to native apps. **Mobile-only in practice — guard with `canShare`.** |
| **Save-as dialog** | `showSaveFilePicker({suggestedName, types})` → `createWritable()` | **None** | Chromium only; fall back to `<a download>` + `URL.createObjectURL` |
| **Open local files** | `showOpenFilePicker()`, `<input type=file>`, drag-and-drop `DataTransfer`, directory handles | **None** | Directory handles let you persist access across sessions |
| **Large-file staging** | OPFS: `navigator.storage.getDirectory()` + sync access handles in a Worker | **None** | For multi-hundred-MB files that would blow the heap |
| **Gzip / deflate** | `CompressionStream` / `DecompressionStream` | **None** | Also shrinks what you put in localStorage/IndexedDB |
| **Local memory / personalization** | IndexedDB (+ embeddings for semantic recall) | **None** | A fully local "memory" feature, no provider, better privacy story than any competitor |
| **Hashing / crypto** | `crypto.subtle.digest`, `crypto.randomUUID()` | **None** | Dedupe attachments; derive a key for encrypting stored API keys |
| **Screen / window capture** | `getDisplayMedia()` | **None** | Screenshot → vision model |
| **Camera capture** | `getUserMedia({video:true})` → canvas frame | **None** | Live camera → vision model |
| **Video frame extraction** | `<video>` + `requestVideoFrameCallback` → canvas; or WebCodecs `VideoDecoder` | **None** | **Lets Key Chat do "video understanding" against *any* vision model** by sampling N frames + the audio track. Big capability for free. |
| **Audio extraction / resample** | `AudioContext.decodeAudioData` → `OfflineAudioContext` → WAV/PCM encode | **None** | Normalize any audio to 16 kHz mono before STT |
| **Notifications** | `Notification` + Service Worker | **None** | Needed for anything resembling scheduled tasks |
| **Scheduled tasks (partial)** | Service Worker + `Periodic Background Sync` | **None** | **Chromium-only, requires installed PWA, intervals not guaranteed.** Honest answer: a browser PWA cannot do reliable server-side scheduling. Offer "run on next open" semantics instead of promising cron. |
| **On-device models** | WebGPU / WASM (transformers.js-class): embeddings, small STT, rerankers | ~1–3 MB model, lazy-loaded | **Embeddings and STT with literally no provider and no key.** `voyage-4-nano` is Apache-2.0 **[OPENED]**. Gate behind an explicit opt-in download. |

## 4.5 Reading documents client-side

| Format | Approach | Cost |
|---|---|---|
| **PDF text** | `pdfjs-dist` — needs **both** `pdf.min.mjs` (132–151 KB gz) **and** `pdf.worker.min.mjs` (369–385 KB gz) | ~**500 KB gzip** — lazy-load only when a PDF is attached |
| **PDF → image per page** | pdf.js render to canvas → `toBlob` | same bundle | **This is the smarter default:** render pages to PNG and send them to any vision model. No text-extraction edge cases, works on scanned PDFs, and Key Chat already has vision. |
| **DOCX text** | `mammoth.browser.min.js` → HTML/text | **98 KB gzip** |
| **DOCX text, no library** | unzip → read `word/document.xml` → strip tags, join `<w:t>` runs | **0 KB** (you have ZIP already) |
| **XLSX read** | unzip → `xl/worksheets/sheet*.xml` + `xl/sharedStrings.xml` → cells | **0 KB** |
| **PPTX read** | unzip → `ppt/slides/slide*.xml` → `<a:t>` runs | **0 KB** |
| **CSV read** | `papaparse` | 6 KB gzip |
| **OCR of scanned PDFs/images** | Don't ship Tesseract (~2 MB+). Render to image and use a vision model — Key Chat already has vision. | 0 KB |

---

# RANKED BUILD TABLE

Effort: **S** ≈ under a day · **M** ≈ a few days · **L** ≈ a week+

| # | Capability | Key Chat today | What it takes | Effort |
|---|---|---|---|---|
| 1 | **Voice out (TTS)** | No | **Client-side only** — `speechSynthesis`, no key, no network | **S** |
| 2 | **XLSX generation** | No (has ZIP) | **Client-side only** — ZIP + hand-written OOXML, 0 KB added | **S** |
| 3 | **DOCX generation** | No (has ZIP) | **Client-side only** — same trick, 0 KB added | **S** |
| 4 | **CSV generation + parsing** | No | **Client-side only** — hand-rolled write; `papaparse` 6 KB gz to read | **S** |
| 5 | **Image resize/crop/convert before send** | No | **Client-side only** — `createImageBitmap` + `OffscreenCanvas`; cuts vision token cost immediately | **S** |
| 6 | **Rich clipboard + Web Share of outputs** | No | **Client-side only** — `ClipboardItem`, `navigator.share({files})` | **S** |
| 7 | **QR code generation** | No | **Client-side only** — 4 KB gz, or hand-roll | **S** |
| 8 | **Chart/graph rendering to PNG** | No | **Client-side only** — Canvas 2D hand-rolled (0 KB) or `chart.js` 70 KB gz | **S–M** |
| 9 | **Audio recording UI** | Has STT | **Client-side only** — `MediaRecorder` + Opus | **S** |
| 10 | **Image EDITING of an uploaded image** | No | **Free provider** — Gemini `gemini-2.5-flash-image` / `gemini-3-pro-image-preview`, **CORS verified**, free tier | **M** |
| 11 | **Browser-native STT upgrade** | Has STT | **Client-side only** — `SpeechRecognition` with `processLocally`, offline + free | **S** |
| 12 | **PDF/DOCX/XLSX *reading*** | No | **Client-side** — 0 KB for Office via ZIP+XML; ~500 KB gz lazy for PDF text, or render-to-image and reuse vision | **M** |
| 13 | **Embeddings + semantic search over chats/files** | No | **Free provider** — Cloudflare `embeddinggemma-2` (≈65M tok/day free) or Gemini `gemini-embedding-001` (CORS verified); or **fully on-device** via WebGPU | **M** |
| 14 | **Local memory / personalization** | No | **Client-side only** — IndexedDB + #13 for recall; privacy is a selling point | **M** |
| 15 | **High-quality TTS voices** | No | **Free provider** — Gemini TTS (CORS verified) or Cloudflare `melotts` (≈536 min/day free, CORS unverified) | **M** |
| 16 | **Image generation breadth / failover** | Has T2I | **Free provider** — add Cloudflare `flux-1-schnell` (≈173 img/day free) + Gemini + Together to the existing failover chain | **M** |
| 17 | **PPTX generation** | No | **Client-side only** — ZIP + OOXML, more template work than xlsx/docx | **M** |
| 18 | **Video *understanding*** | No | **Client-side + free provider** — extract frames via `requestVideoFrameCallback`, send to Gemini (or any vision model) + transcribe the audio track | **M** |
| 19 | **Web search / grounding** | No | **Free provider** — Gemini `googleSearch` tool, CORS verified, free tier (Google prints 500 grounded requests/day for Flash tiers [SEARCH]) | **M** |
| 20 | **Code execution / data analysis** | No | **Client-side** (Pyodide ~6 MB lazy, or a JS sandbox in a Worker — real work) **or free provider** (Gemini `codeExecution`) | **L** |
| 21 | **Canvas / artifact-style editing** | No | **Client-side only** — biggest UX project here, no provider needed | **L** |
| 22 | **Deep research mode** | No | **Free provider** — orchestrate Gemini search-grounded multi-step loop yourself; it's a prompt/loop problem, not an API problem | **L** |
| 23 | **Full duplex voice conversation** | No | **Free-ish provider** — Gemini Live API WebSocket (`gemini-2.5-flash-live` etc.), browser WebSocket is CORS-exempt | **L** |
| 24 | **Connectors / MCP to third-party apps** | No | **Free provider** — Gemini `mcpServers`, Anthropic `mcp_toolset`; most remote MCP servers need OAuth, which is the real work | **L** |
| 25 | **Scheduled tasks** | No | **Client-side, degraded** — Periodic Background Sync is Chromium-only, installed-PWA-only, no timing guarantee. Ship "run on next open" and be honest. | **L** |
| 26 | **Mask-based inpainting (draw a region)** | No | **Paid provider** — fal `flux-pro/v1/fill` ($0.05/MP) or OpenAI `/images/edits`. Free options are instruction-edit only. Mask-drawing UI is client-side. | **L** |
| 27 | **Music generation** | No | **Paid-ish provider** — Gemini `lyria-realtime-exp` over Live API | **L** |
| 28 | **Video generation** | No | **Paid provider everywhere** — Veo (`predictLongRunning`) or Together `/v2/videos`. No free path found. **Deprioritize.** | **L** |
| 29 | **Computer / browser use** | No | Out of scope for a sandboxed browser PWA — it cannot drive other origins. Skip. | — |

---

# GAPS: what I could not verify

**Blocking the build plan:**
1. **Whether `api.cloudflare.com` serves CORS to browser origins.** This is the single most consequential unknown in the report. Cloudflare Workers AI is the best free tier for image gen, image edit, TTS, STT and embeddings simultaneously, and the entire value depends on this one header. Host unreachable; no doc states it. **Test it in a browser console as the very first thing you do.**
2. **CORS for Together, Groq, OpenRouter, HF Router, DeepInfra, Fireworks, Nebius, OVH, Stability, BFL, Wavespeed, Novita.** All hosts blocked. Only Groq and OpenRouter have even second-hand evidence (one developer's self-reported preflight test). Build a runtime CORS probe; don't trust any of this.
3. **Gemini free-tier quotas for the non-text modalities** — images, image edits, TTS, STT, embeddings. Blogs agree the free tier exists and was tightened during 2026, and disagree on every number (5 RPM/20 RPD vs 10 RPM/1500 RPD for text). `ai.google.dev` was unreachable. **Check your own project's limits in AI Studio.**

**Section 1 weaknesses:**
4. **Every consumer-app and tier claim about ChatGPT.** All OpenAI-owned hosts are blocked, so §1.4's app-level content is third-party blogs that contradict each other (deep research 10 vs 25 vs 250/month; agent mode 40 vs 400/month). I have OpenAI's API spec cold, and its consumer product not at all.
5. **Whether Gemini has scheduled actions**, and whether Veo is still in the Gemini app or has moved entirely to Google Flow. Sources conflict.
6. **Whether Claude.ai supports video understanding.** Not in the pricing matrix, not in the docs I opened. Probably not; not proven.
7. **Claude Cowork's current status** — one recent guide says it was merged into the main app on 16 Sep 2026; others still list it as a separate Pro feature. The official pricing page lists "Claude Cowork" in the nav and in Team-plan copy but not in the individual-tier matrix.
8. **Gems → Skills retirement dates** (read-only 17 Nov 2026, removed 17 Dec 2026) are [SEARCH] only.

**Section 3 weaknesses:**
9. **Exact free-credit amounts** for Together ($1? $100?), fal (~$20?), Fireworks ($1?), Hugging Face ($0.10/mo? $2 PRO? nothing since Oct 2026?). Every provider pricing page was unreachable. All figures are third-party and mutually inconsistent.
10. **DeepInfra, Nebius AI Studio, OVH AI Endpoints** — searches returned nothing usable. Their free tiers, endpoint shapes and CORS are all unknown. I have them only as names in HF's provider matrix (DeepInfra serves ASR, chat, feature-extraction, text-generation, text-to-image, text-to-speech; OVH serves chat and text-generation **[OPENED]**).
11. **Stability AI's `v2beta/stable-image/edit/inpaint` route and credit pricing** — could not confirm the endpoint exists under that name, let alone its cost.
12. **Black Forest Labs' own endpoint path** for `flux-pro-1.0-fill`. I have the $0.05/img price from their pricing page [SEARCH] and fal's hosted path `POST https://fal.run/fal-ai/flux-pro/v1/fill` [SEARCH], but not BFL's own API route.
13. **Whether Gemini's OpenAI-compatibility layer (`/v1beta/openai/...`) exists and what it covers.** Unauthenticated GETs returned 404 — ambiguous, since those are POST-only and unauthenticated. `/v1beta/openai/models` returned Google's structured `"Requested entity was not found"` rather than a bare 404, which *hints* the route is real, but I will not call that verified.
14. **Pollinations' new keyed platform** (`enter.pollinations.ai`, docs at `gen.pollinations.ai/docs`, "pollen" credits, claimed image/text/audio/video models without watermarks). Both hosts unreachable. Only the heavily-restricted Classic API is verified.
15. **OpenRouter's audio and embeddings endpoints.** Verified image surface (`POST /api/v1/images` + image output via chat `modalities`) [SEARCH]; found nothing on `/audio/*` or `/embeddings`.

**Section 4 weaknesses:**
16. **Per-browser support matrices.** MDN, caniuse, web.dev and chromestatus are all blocked. My Web Speech API details come from Microsoft Learn **[OPENED]** and are therefore Edge-accurate; Chrome/Safari/Firefox specifics for `BarcodeDetector`, `showSaveFilePicker`, Periodic Background Sync, `requestVideoFrameCallback` and `navigator.share({files})` are from general knowledge, **not verified here**. Feature-detect all of them.
17. **The exact minimal OOXML part lists** for .xlsx/.docx/.pptx in §4.2 are from my own knowledge, not from a spec I opened in this session (ECMA-376 / the Microsoft OOXML reference were not among the reachable hosts). The ZIP-of-XML architecture is certain; validate the minimal part set against a real file produced by Excel/Word before shipping.
18. **Cloudflare free-tier yields** (≈173 images/day, ≈536 TTS min/day, ≈243 STT min/day, ≈64.9M embedding tokens/day, ≈6 image edits/day) are **my own arithmetic** on Cloudflare's published per-model neuron rates **[OPENED]** against the published 10,000 neurons/day allowance **[OPENED]**. The inputs are authoritative; the division is mine, and real requests may round or bill differently.