# NeoSubTranslator

A single-file, browser-based subtitle translator. Drop in `.srt`, `.vtt`, `.ass`/`.ssa`, or `.txt` files, translate them with an AI model of your choice, review/edit the results line by line, and export — all without a backend. Your API keys and file content never leave your device except to call the endpoint you configure.

No install, no build step, no server: `NeoSubTranslator.html` is the entire application.

---

## Table of contents

- [Features](#features)
- [Supported subtitle formats](#supported-subtitle-formats)
- [Supported AI providers](#supported-ai-providers)
- [Getting started](#getting-started)
- [Workflow](#workflow)
- [Settings reference](#settings-reference)
- [Right-to-left (RTL) handling](#right-to-left-rtl-handling)
- [Export filenames](#export-filenames)
- [How translation requests work](#how-translation-requests-work)
- [Caching & resuming](#caching--resuming)
- [Security & privacy](#security--privacy)
- [Architecture](#architecture)
- [Localization](#localization)
- [Known limitations](#known-limitations)
- [License](#license)

---

## Features

- **Multi-format subtitle support** — SRT, WebVTT, Advanced SubStation Alpha (`.ass`/`.ssa`), and plain text.
- **Bring your own AI endpoint** — Google AI Studio (Gemini), OpenAI, or any OpenAI-compatible endpoint (self-hosted, gateway, or proxy).
- **Batch translation with chunking** — files are split into configurable line-count blocks so large subtitle files translate reliably and can be retried block-by-block.
- **Resumable, cached translations** — re-importing a file you've already translated automatically restores prior progress from a local cache, keyed by the file's content fingerprint and target language.
- **Line-by-line manual editing** — every translated line is an editable text field; you can hand-correct anything the model produced, or retranslate a single block.
- **Automatic retry on partial failures** — if a model returns translations for only some lines in a block, NeoSubTranslator automatically re-requests just the missing lines (up to 3 attempts) before surfacing an error.
- **Adjustable creativity (Temperature)** — a labeled slider from 0.0–1.0 that controls how literal vs. creative the translation is, with plain-language descriptions of what each range is good for.
- **Tone control** — Neutral, Formal, Casual, Playful, Dramatic, Literal, or Poetic.
- **Explicit-content toggle** — translate mature/profane content faithfully instead of having the model soften or censor it.
- **Custom instructions** — free-text field for glossaries, honorifics, character-name spellings, or any other guidance passed straight to the model.
- **Right-to-left output correction** — automatically fixes the punctuation/line-direction rendering bugs that RTL-language subtitles (Persian, Arabic, Hebrew, Urdu, etc.) commonly hit in `.ass`/`.ssa` and other players. See [Right-to-left (RTL) handling](#right-to-left-rtl-handling).
- **Per-file and bulk export** — download files individually or as a single ZIP archive (via JSZip).
- **Encrypted local key storage** — API keys are encrypted with AES-256-GCM using a non-extractable browser-generated key before being persisted.
- **Bilingual UI** — English and Persian (فارسی), with full RTL layout support in the interface itself, switchable at any time.
- **Light/dark themes.**
- **Fully client-side** — no backend server; works as a static HTML file.

---

## Supported subtitle formats

| Format | Extension(s) | Notes |
|---|---|---|
| SubRip | `.srt` | |
| WebVTT | `.vtt` | |
| Advanced SubStation Alpha | `.ass`, `.ssa` | Preserves override tags (e.g. `{\i1}`, `{\pos(x,y)}`) unchanged; only translates the surrounding natural-language text. Forced line breaks (`\N`) are handled correctly. |
| Plain text | `.txt`, `.text` | One line per entry. |

## Supported AI providers

| Provider | Endpoint | Notes |
|---|---|---|
| **Google AI Studio (Gemini)** | Fixed, official Generative Language API | Uses `x-goog-api-key` header and the `generateContent` endpoint. |
| **OpenAI** | Fixed, official API | OpenAI's official API does not consistently allow direct browser (CORS) requests — if fetching models or translating fails immediately, point a **Custom** endpoint at a CORS-enabled OpenAI-compatible proxy instead. |
| **Custom — OpenAI-compatible** | User-supplied base URL | Any self-hosted, gateway, or proxy endpoint that speaks the OpenAI `/chat/completions` API shape and responds to CORS preflight requests from a browser origin. |

You can save multiple endpoints ("profiles") and switch between them.

---

## Getting started

1. Download `NeoSubTranslator.html` and open it in a modern browser (Chrome, Edge, Firefox, Safari), or host it as a static file.
2. Click the **Settings** (gear) icon → **Endpoints** tab → **Add an endpoint**.
   - Choose a provider, give it a name, paste your API key, and click **Fetch models** to populate the model dropdown.
   - Click **Save endpoint**.
3. Switch to the **Preferences** tab to set your target language, tone, temperature, and any other defaults (see [Settings reference](#settings-reference)).
4. Close Settings and drop your subtitle file(s) onto the **Files** step, or click to browse.
5. Move to the **Translate** step and click **Translate this file** or **Translate all files**.
6. Review/edit lines as needed, then go to **Download** to export individual files or a ZIP of everything.

> Requires an internet connection — both to reach your chosen AI endpoint and to load the Google Fonts / JSZip CDN assets referenced by the page.

---

## Workflow

The app is organized into three steps:

1. **Files** — add subtitle files (drag-and-drop or file picker), and configure **Lines per block** (default 30), which controls how each file is chunked for translation requests.
2. **Translate** — step through files, translate an individual file or all loaded files at once, pause/resume an in-progress run, retranslate a single block, or hand-edit any line's translation directly.
3. **Download** — export each file individually (in its original format) or all of them together as a ZIP.

A status pill and per-block progress bar show translation state (`idle`, `translating`, `done`, `error`) at all times, and step badges in the top navigation show file count and overall line-translation progress.

---

## Settings reference

All settings are found under **Settings → Preferences** and are saved automatically to `localStorage`.

| Setting | Description |
|---|---|
| **Target language** | Free-text field (with suggestions) for the language to translate into, e.g. `Spanish`, `Persian`, `Chinese (Simplified)`. |
| **Tone** | Neutral · Formal · Casual · Playful · Dramatic · Literal / word-for-word · Poetic. |
| **Cooldown between blocks (seconds)** | Delay inserted between block requests, useful for staying under rate limits. |
| **Temperature** | 0.0–1.0 slider (default **0.4**) controlling how literal vs. creative the model's output is. See table below. |
| **Additional instructions** | Free text appended to every translation prompt — glossaries, honorifics, character names, formatting rules, etc. |
| **Explicit translation** | When enabled, instructs the model to translate mature/profane content faithfully and without censorship. When disabled, the model is told to keep the translation faithful without adding content beyond the source. |

### Temperature guide

| Value | Label | Best for |
|---|---|---|
| 0.0 – 0.1 | Very precise and conservative | Technical, legal, data-driven translation, sensitive texts |
| 0.2 – 0.3 | Precise and faithful | Professional, educational, specialized translation |
| **0.4 – 0.5** *(0.4 = default)* | Balanced | General translation, subtitles, smooth and natural text |
| 0.6 – 0.7 | Creative and freer | Localization, advertising, rewriting |
| 0.8 – 1.0 | Very creative | Brainstorming, creative writing, recreation |

The current numeric value is always shown next to the slider label, and the matching description updates live as you drag it.

---

## Right-to-left (RTL) handling

Translating into an RTL language (Arabic, Persian/Farsi, Hebrew, Urdu, Pashto, Sindhi, Sorani Kurdish, Yiddish, Dhivehi, Uyghur, etc.) is detected automatically from the **Target language** field, and two display fixes are applied automatically at export time:

1. **Wrong base direction from a leading LTR word.** If a line starts with an English (or other Latin/Greek/Cyrillic-script) word, some renderers infer the whole line's direction as left-to-right. A hidden Right-to-Left Mark (`U+200F`) is inserted before such lines so the renderer correctly infers RTL.

2. **Punctuation jumping to the wrong end of the line.** This is the more common and more subtle bug, and it's especially prevalent in **`.ass`/`.ssa`** because that format has no field at all to declare a line's paragraph direction — so even fully bidi-compliant renderers (like `libass`, which almost every `.ass` player uses, via FriBidi) default to assuming left-to-right and misplace trailing/leading neutral characters (`.`, `,`, `!`, `?`, `:`, `;`, quotes, parentheses, etc.), making them appear to jump from the end of the sentence to the start, or vice versa. Players with no bidi support at all show a similar-looking symptom for a cruder reason — they don't reorder anything, they just draw characters in storage order.

   The fix: each line of RTL-target translated text is wrapped in an explicit **Right-to-Left Embedding** (`RLE` `U+202B` … `PDF` `U+202C`). This forces every neutral character in the line — including edge punctuation — to resolve against an explicit RTL context instead of a guessed/default one, while leaving embedded LTR runs (English names, numbers, etc.) internally ordered correctly. It's invisible, zero-width, and has no effect on non-RTL targets.

Both fixes are applied per visual line (so multi-line `.ass` dialogue via `\N`, and multi-line SRT/VTT cues, each get their own correct wrap), only at export time — the in-app editable text stays clean of control characters — and only for detected RTL target languages.

> **Caveat:** these are standards-based Unicode Bidi Algorithm fixes. They correct the behavior of any renderer that implements the algorithm at all — which covers virtually all real-world players (`libass`/FriBidi, browsers, VLC, mpv, Kodi, PotPlayer, Plex, etc.). They cannot help a renderer with genuinely zero bidi support, since such renderers ignore directional control characters entirely. There is no single fix that works for both "no bidi support" and "correct bidi support" players simultaneously — pre-reversing the text to accommodate the former would break the (far more common) latter.

---

## Export filenames

Translated files are named `<original-name>_<TargetLanguage>.<ext>` — e.g. translating `movie.srt` into Persian produces `movie_Persian.srt`. The target-language suffix is sanitized for filesystem safety (illegal characters stripped, spaces converted to underscores), so `Chinese (Simplified)` becomes `Chinese_(Simplified)`.

---

## How translation requests work

- Each block's lines are sent as a JSON object keyed by line number, and the model is instructed to return only a JSON object of translations keyed the same way — no markdown, no commentary.
- For `.ass`/`.ssa` files, the prompt explicitly instructs the model to leave override tags (`{\i1}`, `{\pos(x,y)}`, etc.) untouched and translate only the surrounding text.
- If the model omits some lines in its response, NeoSubTranslator automatically re-sends just the missing lines (renumbered, with a note explaining the retry) for up to 3 attempts before marking the block as failed.
- A configurable cooldown is inserted between blocks to help avoid rate limits.
- Translation runs can be paused and resumed at any time; pausing takes effect between blocks.

---

## Caching & resuming

Every file's content is fingerprinted (SHA-256) and, together with the target language, used as a cache key in an IndexedDB store. If you close the tab mid-translation and re-import the same file later, NeoSubTranslator automatically restores whatever lines were already translated instead of starting over. Clearing the cache (in Settings) wipes this stored progress for every file.

---

## Security & privacy

- **No backend.** NeoSubTranslator is a static HTML file; translation requests go directly from your browser to the AI endpoint you configure.
- **Encrypted key storage.** API keys are encrypted with **AES-256-GCM** using a non-extractable `CryptoKey` generated in your browser and stored in IndexedDB. The encrypted key material is what's persisted to `localStorage` — the raw key never touches disk, and decrypted API keys only ever live in memory for the duration of the session.
- **Your data stays local.** Subtitle content and settings are stored in your browser's `localStorage`/IndexedDB and are never sent anywhere except to the AI endpoint you explicitly configure, to perform the translation you requested.

---

## Architecture

NeoSubTranslator is intentionally a **single self-contained `.html` file** — no build tooling, package manager, or server required. High-level structure inside the file:

- **CSS design tokens** — light/dark theme variables, RTL-aware layout rules.
- **i18n dictionaries** — English and Persian string tables, applied via `data-i18n*` attributes and a small `t()` lookup/formatting helper.
- **Subtitle parsers/rebuilders** — format-specific parse functions (`parseASS`, etc.) that normalize every format's line breaks to `\n` internally, and matching rebuild functions (`rebuildSRT`, `rebuildVTT`, `rebuildASS`, `rebuildTXT`) that reconstruct the original file format on export, applying the RTL directionality fix at that stage.
- **`CryptoStore`** — IndexedDB-backed AES-256-GCM key management for API keys.
- **`CacheStore`** — IndexedDB-backed translation cache keyed by content fingerprint + target language.
- **Chunking** — `chunkEntries()` splits a file's entries into fixed-size blocks for translation requests.
- **Prompt building & API calls** — `buildInstructions()` assembles the system instructions from current settings; `callTranslateAPI()` dispatches to the Gemini or OpenAI-compatible request shape depending on the active endpoint's provider type.
- **Rendering** — plain DOM rendering functions for the Files/Translate/Download panels and the Settings drawer; no framework dependency.
- **External dependencies (via CDN)** — Google Fonts (Manrope, JetBrains Mono, Vazirmatn) and [JSZip](https://stuk.github.io/jszip/) for bulk ZIP export.

---

## Localization

The interface ships with English and Persian (فارسی) translations, toggled from the top bar. Persian mode switches the document to RTL layout, swaps in the Vazirmatn font, and mirrors directional UI elements (icons, badges) automatically. This is separate from — and independent of — the subtitle *content* RTL fixes described above, which apply regardless of what UI language you're using.

## Known limitations

- OpenAI's official API frequently blocks direct browser (CORS) requests; use a Custom OpenAI-compatible proxy if you hit this.
- The RTL punctuation fix (see above) relies on the target renderer implementing the Unicode Bidi Algorithm; it cannot correct output on renderers with no bidi support at all.
- Very large files with many blocks will make many sequential API requests; adjust **Lines per block** and **Cooldown** to match your provider's rate limits.
- All processing and storage is per-browser — there is no account system or cross-device sync.

## License

No license file is included with this project. Add one (e.g. MIT) if you intend to distribute or open-source it.
