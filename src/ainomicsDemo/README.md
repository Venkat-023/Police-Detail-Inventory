# Ainomics demo signals

- **AI-attributed (Sure):** modules with Co-Authored-By / Generated-with footers on the commit.
- **AI-suspected (Proxy):** `suspectedSlipFormatter.ts` and `suspectedVendorNotes.ts` — file banners
  only, **no** Co-Authored-By and no “built using …” declaration, so heuristics classify them as
  suspected rather than attributed.

Safe to leave in place; not used by the production app routes.
