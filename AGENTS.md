# AGENTS.md — Website Contact Extractor

Guidelines for AI agents working in this repository.

## Overview
Client-side Chrome Extension (Manifest V3) that extracts public business contact info (emails, phones, social handles, addresses) and manages them in a local lead database using Chrome Storage and Downloads API.

## Tech Stack & Architecture
- **Framework**: React 19 + TypeScript, Vite (`vite.config.ts` for popup, `vite.content.config.ts` for content script), Tailwind CSS, Lucide Icons.
- **Storage**: `chrome.storage.local` for local lead database.
- **Export**: CSV & JSON export via Chrome Downloads API.

## Key Commands
```bash
npm install
npm run build      # Build both popup and content script into dist/
npm run dev        # Development mode
```

## Guidelines
- Zero external server/backend dependency: all parsing happens in the DOM / content script and stays in browser storage.
- Respect user privacy & rate limits: avoid aggressive requests or blocking the host page event loop.

