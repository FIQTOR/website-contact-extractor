# Website Contact Extractor

A Chrome Extension (Manifest V3) that extracts **public business contact information** from the website you are viewing and turns it into a local lead database. No backend, no account, no external server.

Built with React + TypeScript, Vite, Tailwind CSS, Lucide Icons, and the Chrome Storage, Scripting, and Downloads APIs.

---

## Features

### Extract a website

Open any business website, click the extension icon, and press **Scan website**. The extension reads the active page and collects:

- Emails (plain text, `mailto:` links, Cloudflare-protected `data-cfemail`, `name [at] domain [dot] com` obfuscation)
- Phone numbers (international and local formats, `tel:` links)
- WhatsApp links (`wa.me`, `api.whatsapp.com`, `web.whatsapp.com`, `whatsapp://`)
- Business address (`<address>`, `itemprop="address"`, address-like blocks, visible text)
- Contact / about / location page links
- Social profiles: Instagram, Facebook, TikTok, LinkedIn, YouTube, X / Twitter
- Website URL, page title, meta description, site name, favicon, logo
- Company name and description (JSON-LD, `og:site_name`, cleaned page title)

Every extracted value is labelled with where it came from:

| Label | Meaning |
| --- | --- |
| Visible page content | Text a visitor can see on the page |
| HTML metadata | Meta tags, attributes and raw HTML (e.g. `data-cfemail`) |
| JSON-LD | schema.org structured data |
| Contact link | Found after following a detected contact/about page |

Nothing is invented. If a field is not found, it stays empty.

### Contact Page Scanner (opt-in)

The scan can follow the contact/about/location links it found, up to **1–5 extra pages** (default 3). It only requests pages on the same site, one at a time, with a ~350 ms delay. It never crawls the whole website.

### Results dashboard

Six sections — Business Information, Email Addresses, Phone Numbers, WhatsApp, Social Media, Website Information — each with a count and per-item **Copy**, **Open link**, and **Remove** actions. Results survive popup close/reopen through `chrome.storage.session`.

### Lead management

- Save the current result as a lead (duplicate websites/phone numbers merge into the existing lead)
- Search with debounce, filter by category and date
- Edit every field, add notes and tags, delete single or multiple leads
- Lazy list rendering for large databases

### Export

- **CSV** for Excel / Google Sheets (UTF-8 BOM, CRLF)
- **JSON** with the full lead structure
- Export all leads, selected leads, or the current scan result

### CSV import (Google Maps Scraper bridge)

Import a CSV exported from any Google Maps scraping tool. The importer auto-maps common column names, lets you remap columns manually, previews the first rows, reports added/merged/skipped counts, and gives every imported business an **Open** button so you can scan its website for extra details.

There is **no direct integration** with other extensions. CSV is the only bridge.

---

## Install (Load unpacked)

Requirements: Node.js 20+ and Google Chrome 102+.

```bash
cd website-contact-extractor
npm install
npm run build
```

`npm run build` typechecks the project and writes the extension to `dist/`:

```
dist/
├── manifest.json
├── popup.html
├── background.js
├── content.js
├── assets/
└── icons/
```

Then:

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode** (top-right).
3. Click **Load unpacked**.
4. Select the **`dist`** folder inside `website-contact-extractor`.
5. Pin **Website Contact Extractor** to the toolbar if you like.

After changing source code, run `npm run build` again and press the **reload** icon on the extension card in `chrome://extensions`.

### Development

```bash
npm run dev        # Vite dev server for the popup UI only
npm run typecheck  # tsc --noEmit
npm run build      # typecheck + popup/background build + content script build
python3 generate_icons.py  # regenerate icons (optional, needs Pillow)
```

`npm run dev` is useful for iterating on the popup layout, but the extension APIs are only available when the popup is loaded from `dist`. Use `npm run build` for a fully working extension.

---

## How to use

1. **Extract** — open a business website, press the extension icon, then **Scan website**. Optionally enable contact-page scanning first.
2. **Review** — check each section, copy values, open links, or remove anything you do not want.
3. **Save lead** — stores the result in `chrome.storage.local`. If the website or a phone number already exists, the new details are merged into that lead.
4. **My Leads** — search, filter, edit, add notes/tags, select rows, delete, and export.
5. **Import** — drop a CSV, confirm the column mapping, preview, then import.
6. **Settings** — theme, default export format, maximum scan pages, contact-page scanning default, storage usage, permissions, and data cleanup.

---

## CSV import format

A header row is recommended. Column names are matched automatically; you can also map them manually.

```csv
name,website,phone,address,google_maps_url
Kopi Senja,https://kopisenja.id,+62 812 3456 7890,"Jl. Senja 12, Jakarta",https://maps.app.goo.gl/example
Toko Roti,rotibagus.id,021-555-1234,Bandung,
```

Recognised header aliases include:

| Field | Examples |
| --- | --- |
| Business name | `name`, `business name`, `company`, `nama` |
| Website | `website`, `url`, `site`, `domain` |
| Phone | `phone`, `telephone`, `telp`, `whatsapp`, `no hp` |
| Email | `email`, `e-mail`, `surel` |
| Address | `address`, `alamat`, `location` |
| Google Maps URL | `google maps url`, `maps link`, `place url` |

Notes:

- Max file size 5 MB and max 5,000 leads per import.
- Files without a header row are supported; columns are numbered and you choose the mapping.
- Imported leads are marked **Imported**. Their phone numbers are normalised, websites get `https://` when missing, and duplicates are merged.
- The importer never opens or uploads the file anywhere; parsing happens in the popup.

### CSV export columns

`Company Name, Website, Emails, Phones, WhatsApp, Instagram, Facebook, TikTok, LinkedIn, YouTube, X (Twitter), Address, Description, Contact Page, Notes, Tags, Google Maps URL, Source, Extracted At`

Multi-value fields are joined with `; `.

---

## Architecture

```
popup  ──runtime message──▶  background service worker
                                 │  chrome.scripting.executeScript
                                 ▼
                            content script (reads DOM, same-origin fetches)
                                 │  PageSnapshot
                                 ▼
                            extraction engine (pure functions)
                                 │  ExtractionResult
                                 ▼
                    chrome.storage.session (per tab)  ──▶  popup dashboard
```

```
src/
├── types/                    Shared types + messaging contracts
├── core/
│   ├── constants.ts          Storage keys, defaults, hard limits
│   ├── extraction/
│   │   ├── engine.ts         Orchestrates all evidence into one result
│   │   ├── email.ts          Regex, mailto, Cloudflare decoding, obfuscation
│   │   ├── phone.ts          Normalisation, validation, dedupe keys
│   │   ├── whatsapp.ts       WhatsApp URL parsing
│   │   ├── social.ts         Platform detection and profile filtering
│   │   ├── jsonld.ts         schema.org parsing across @graph
│   │   ├── address.ts        Conservative address heuristics
│   │   ├── contactPages.ts   Contact/about/location candidate scoring
│   │   └── collector.ts      Source-merging evidence collector
│   ├── services/
│   │   ├── storage.ts        Leads CRUD, duplicate merge, settings
│   │   ├── export.ts         CSV/JSON builders + downloads
│   │   └── import.ts         CSV parsing, mapping, lead conversion
│   └── utils/                URL, text, date, CSV, id helpers
├── content/
│   ├── index.ts              Message listener, injected on demand
│   ├── collector.ts          DOM → PageSnapshot
│   └── fetcher.ts            Same-origin contact-page fetching
├── background/
│   └── index.ts              Scan orchestration, progress, session cache
├── popup/
│   ├── App.tsx               Shell + navigation
│   ├── pages/                Extract, My Leads, Import, Settings
│   ├── components/           Buttons, modals, dashboard, lead editor…
│   ├── hooks/                Settings, leads, extraction, toasts
│   └── lib/                  Typed messaging, clipboard, result edits
└── styles/index.css          Dark-first theme tokens
```

### Technical notes

- The content script is built separately as a self-contained IIFE because it is injected with `chrome.scripting.executeScript`.
- The background worker is an ES module (`"type": "module"`).
- The extraction engine is pure TypeScript operating on a serialisable `PageSnapshot`, so it is testable outside Chrome.
- Progress is reported through `WCE_PROGRESS` runtime events; the final result is also cached in `chrome.storage.session` under `wce:current:<tabId>`.
- Data lives in `chrome.storage.local` (`wce:leads`, `wce:settings`). Nothing is synced.

---

## Permissions & privacy

| Permission | Why it is needed |
| --- | --- |
| `activeTab` | Read the page you are on, only after you click the extension icon |
| `scripting` | Inject the page reader into that active tab |
| `storage` | Save leads, settings, and temporary scan results locally |
| `downloads` | Save CSV/JSON exports when you ask for them |

No `host_permissions`, no `<all_urls>` content script, no background browsing.

**Privacy**

- No external servers, analytics, paid APIs, accounts, or tracking.
- No password, cookie, or session collection.
- No CAPTCHA bypass, no login bypass, no hidden-data extraction.
- Same-origin contact pages are fetched only when you enable the contact-page scanner, slowly and with a hard limit.
- Data never leaves `chrome.storage.local` except when you explicitly export or click an extracted link.

---

## Error handling

The popup surfaces actionable messages for:

- Chrome-protected pages (`chrome://`, Web Store, PDF viewer)
- Pages where Chrome refuses script injection or the active-tab grant expired
- Content scripts that fail to start or stop responding
- Bot-protection / CAPTCHA screens (reported, never bypassed)
- JavaScript-rendered pages with little readable text
- Pages with no public contacts
- Same-origin contact pages blocked by CORS or returning errors
- Duplicate leads (merged instead of duplicated)
- Invalid or oversized CSV files
- Full local storage or too many leads

---

## Limitations

- Chrome extensions cannot read `chrome://` pages, the Chrome Web Store, PDF viewer internals, or `file://` URLs without extra permissions.
- Contact details rendered only after a user interaction, or behind a login/contact form, will not be found.
- Fetching extra contact pages requires them to be same-origin and CORS-permitted.
- Only public, visible information is read. If nothing is found, nothing is fabricated.
- Local storage is per Chrome profile and per device; it is not synced.
- The extension does not integrate directly with Google Maps scraping tools; use CSV import/export.

---

## License

MIT
