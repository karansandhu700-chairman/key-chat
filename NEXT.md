# What to do next

Written 26 November 2026, at the end of the session that added the tool router.
Everything here is either unfinished or unverified. Research backing it is in
`docs/research/`, which was copied out of an ephemeral container and would
otherwise have been lost.

## 1. The one test only you can run

**Does `generativelanguage.googleapis.com` allow a browser origin?**

This single answer decides whether image editing, better text-to-speech and
embeddings are possible at all in a browser-only app. Google's own SDK README
states `| Browser | Supported, with an API key |` for the Gemini Developer API,
which makes it the only provider in the set with a documented green light — but
nobody has sent a real request from a real browser.

Get a free key at AI Studio, add Gemini in Settings → AI providers, press Test.

- **Passes** → image editing is one adapter, not a subsystem. Gemini does
  instruction-style editing through `generateContent`, the same endpoint the
  chat router already speaks: base64 image in `contents[].parts[].inline_data`,
  `responseModalities: ["TEXT","IMAGE"]`, edited image back as base64.
- **Fails** → no browser-only image editing is possible from any provider found.
  Say so in the UI and stop promising it.

Test with a bare `fetch`, not an SDK: the one documented Gemini CORS failure was
caused by the OpenAI SDK's `x-stainless-*` headers tripping preflight.

## 2. Image editing has no free option

Verified, not assumed. Pollinations — the only keyless provider — is
text-to-image only: one model, 768×768, watermarked, one image per 45 seconds
per IP before it returns 402. There is no image input parameter.

`answer()` returns an honest refusal for `edit-image` rather than letting a chat
model write a Photoshop tutorial. Leave it that way until a provider is wired in.

Ranked candidates, from `docs/research/capability-map-2026-11-25.md`:

1. **Gemini** — free tier, documented browser support, JSON only, no polling
2. **DeepInfra** `/v1/openai/images/edits` — OpenAI-shaped, so nearly no new code
3. **OpenAI** `/v1/images/edits` — best-specified, CORS undocumented
4. **Replicate** — ruled out; its own docs say a browser cannot reach the API

## 3. The tool registry

`answer()` dispatches on a hardcoded `if/else`. Three tools proved the pattern;
a fourth should not be another branch. `docs/research/tool-registry-teardown-2026-11-25.md`
reads the source of LibreChat, Open WebUI, Jan, Cherry Studio, Chatbox, Lobe
Chat, AnythingLLM, big-AGI and NextChat, with commit SHAs. **Read its triggering
and "what they get wrong" sections before designing anything** — over-triggering
is the failure mode they all hit, and it is exactly what #9 shipped.

## 4. Known defects

- **Hindi and other non-Latin scripts cannot go in a PDF.** The writer uses Type1
  WinAnsi fonts and carries no embedded font, so Devanagari became `??????`.
  `pdfWouldLose()` now detects this and builds a `.docx` instead, which is UTF-8
  XML and renders correctly. A real fix means embedding a subset font — a few
  hundred KB and a font-subsetting routine.
- **cdnjs is a single point of failure.** `index.html`, `site/index.html` and
  `studio-live.html` load `marked`, `DOMPurify` and `highlight.js` from
  cdnjs, and none are in the service worker cache. There is **no security hole**
  — `md()` guards on both libraries and falls back to escaped text — but if
  cdnjs is unreachable, every answer renders as flat text with visible markdown.
  Vendoring the three files locally removes the dependency. cdnjs was blocked
  from the build sandbox, so it could not be done there.
- **No live provider has been tested.** Every provider host was blocked from the
  sandbox. All error paths were exercised with mocked responses. Nobody knows
  which models actually answer from a phone.
- **HawkScan has never run.** `HAWK_API_KEY` is unset.

## 5. The capability audit is unfinished

A ranked table of 29 capabilities is in the capability map. A spot check of ten
of them against the code found that **voice out, image downscaling before send,
Web Share, clipboard, audio recording, camera capture and browser speech
recognition already exist** — the research had listed them as missing because it
could not see the code. Only QR codes and embeddings were confirmed absent.

That check was ten greps, not an audit. Before planning a roadmap from that
table, verify each row against a function and a line number. Treat the research
file's "Key Chat today" column as unreliable.

## 6. Revenue: what is ready and what is yours

`offers.html` is live and self-contained — no CDN, no external request, clean at
390 and 1440. Three offers with price, scope, exclusions, timeline and terms:
$750 audit (credited into the build), $2,500 pilot, $1,200/month care plan.
Prices are anchored to live competitor pages that were opened and read; the
comparables are in `docs/research/capability-map-2026-11-25.md`.

**One thing is missing from that page: a contact address.** The footer has a
TODO. Nothing will come of it until that is filled in.

Five things only you can do, in order:

1. Open Payoneer — Aadhaar plus a **physical** PAN card, not an e-PAN. It gives
   a free automatic FIRA, which matters for the export-of-services question
   below. Stripe will not open an account for an individual in India.
2. Send ten short notes to people who already know you. Every solo consultancy's
   first client comes from here; cold outreach before this is the expensive
   mistake.
3. List on Contra using the text from `offers.html`. Its service pages are
   public, indexed and carry the price — effectively a free hosted offer page
   with payment attached.
4. Run the Gemini test in Settings (section 1 above).
5. Run the phone tests in section 7.

## 7. Phone tests to run after each deploy

Nothing here has met a live provider or WebKit. These six take two minutes:

| Type this | Should give you |
| --- | --- |
| `make a pdf about my services` | a PDF download |
| `make an excel of my pricing` | an .xlsx with numbers you can sum |
| `summarise this pdf` + attach one | a summary, **not** a new PDF |
| screenshot + `fix this error` | real help, **not** a refusal |
| photo + `change background` | honest "can't edit images yet" |
| `pdf bana do` | a PDF, from Hinglish |

If the router picks wrong, every reply has **Answer in chat instead**, and
`/pdf`, `/xlsx`, `/docx`, `/csv`, `/zip`, `/image`, `/chat` force a tool.

## 8. Non-code decisions still open

- **A CA on export of services.** Whether AED/SGD receipts qualify as zero-rated
  exports turns on the IGST Act's convertible-foreign-exchange condition, which
  could not be retrieved. Also whether the ₹20 lakh registration threshold still
  stands; the only source found is dated 2019.
- **The five subreddit rules pages.** Reddit is unreachable to automated clients
  and blocks the crawler. Nothing in the revenue plan about subreddit rules,
  karma minimums or subscriber counts is verified. Open them in a browser before
  posting anywhere.
- **OpenRouter's key storage rule.** Its docs reportedly forbid persisting keys
  in `localStorage`, `sessionStorage` or IndexedDB — the entire storage surface
  of a backend-less PWA. Unopened source; confirm before relying on it.
