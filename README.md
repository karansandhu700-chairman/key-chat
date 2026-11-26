# Key Chat

**Your own API keys. No markup. Nothing stops working because you ran out of credits.**

Key Chat is a web app that runs AI models from your phone's browser. There is
nothing to install and no account to create: open the page, add a key from a
provider you choose, and it works. Your key stays in your browser and talks to
the provider directly. Key Chat never sits in the middle and never adds a charge
on top.

Live at <https://karansandhu700-chairman.github.io/key-chat/> — on iPhone, open
it in Safari and use Share → Add to Home Screen.

## Why bring your own key

Every competitor in this space sells credits. You buy a bundle, the AI makes a
mistake, and you pay again to have it fixed. The complaint is the same
everywhere, and it is structural: their revenue is your token spend.

Key Chat cannot have that problem, because it never resells tokens. You pay the
provider directly, at their price, or nothing at all on a free tier.

There is a second reason, and it comes from Anthropic's own documentation.
[The Remote Control docs](https://code.claude.com/docs/en/remote-control) state:

> Subscription: available on Pro, Max, Ultra, Team, and Enterprise plans.
> **API keys are not supported.**

And [the Agent SDK quickstart](https://code.claude.com/docs/en/agent-sdk/quickstart):

> Unless previously approved, Anthropic does not allow third party developers to
> offer claude.ai login or rate limits for their products... **Use the API key
> authentication methods described in this document instead.**

Read together: if you hold an API key, the official mobile route is closed to
you — and bring-your-own-key is the only model a third-party app is permitted to
use. Key Chat is built for exactly that gap.

## What it does

Type what you want. Key Chat works out which tool to use.

| You type | What happens |
| --- | --- |
| a question | chat, with failover across every provider you have configured |
| attach a photo and ask about it | the image is read by a vision model |
| `create an image of a sunset` | an image is generated |
| `make a pdf about our pricing` | a real PDF, built in your browser |
| `make an excel of the tiers` | a real .xlsx, with numbers as numbers |
| `create a word document about X` | a real .docx |
| `make a csv of the leads` | a real .csv, openable in Excel |
| `zip these up` | a real .zip |
| `एक पीडीएफ बनाओ` / `pdf bana do` | the same, in Hindi or Hinglish |

Files are built **in the browser**, with no library downloaded and no server
involved. Nothing you write is sent anywhere except to the model provider you
chose.

If it picks the wrong tool, every reply carries **Answer in chat instead**, and
you can force a tool with a slash: `/pdf`, `/xlsx`, `/docx`, `/csv`, `/zip`,
`/image`, `/chat`.

Also included: voice in and voice out, a coding studio with per-file diffs and
preview, document reading (PDF, DOCX, CSV, text), and an offers and invoices
desk for freelance work.

## What it does not do

Stated plainly, because a tool that pretends is worse than one that is honest.

- **It cannot edit a photo you send it.** It can only create new images from a
  description. No provider wired into the app offers image editing, so asking it
  to change a background gets a straight answer rather than a tutorial.
- **It cannot put Hindi or other non-Latin scripts in a PDF.** The PDF writer
  carries no embedded font. When it sees that writing, it builds a Word file
  instead and tells you why.
- **It is not a scheduler.** A browser page cannot reliably run work while
  closed.

## Getting a key

Free, no card needed: **Groq**, **Google AI Studio**, **Cerebras**. Several
models also work with no key at all, though those are shared by everyone and
run out at busy times.

Settings → AI providers → paste the key → Save and test.

## Running it yourself

Static files, no build step.

```bash
python3 -m http.server 8765
```

Then open <http://localhost:8765>.

Tests:

```bash
node .github/kc-tools-test.cjs      # router and file builders, 90 assertions
node .github/keychat-check.cjs      # browser checks, needs a server on 8765
```

Both run in CI on every pull request.
