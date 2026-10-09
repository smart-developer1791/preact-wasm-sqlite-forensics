<div align="center">

# ✦ Preact WASM SQLite Forensics

**A local-first SQLite forensic workbench with WASM execution, schema intelligence, diffing, and timeline analysis.**

![Preact](https://img.shields.io/badge/Preact-10-673ab8?style=for-the-badge&logo=preact&logoColor=ffffff)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?style=for-the-badge&logo=typescript&logoColor=ffffff)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=ffffff)
![SQLite WASM](https://img.shields.io/badge/SQLite-WASM-0f766e?style=for-the-badge&logo=sqlite&logoColor=ffffff)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=ffffff)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

</div>

---

## ✨ Highlights

- **Real SQLite WASM Runtime:** Uses `sql.js` and a bundled `sql-wasm.wasm` file to open `.sqlite`, `.sqlite3`, and `.db` files locally in the browser.
- **Schema Atlas:** Reads `sqlite_master`, table columns, indexes, row counts, primary keys, and foreign keys.
- **Database Health:** Runs lightweight `PRAGMA` checks for integrity, foreign key issues, page metrics, freelist, encoding, and object counts.
- **Forensic Heuristics:** Flags sensitive columns, token-like values, sparse fields, orphan foreign keys, missing primary keys, and index gaps.
- **CodeMirror SQL Workspace:** Runs custom SQL with SQLite syntax highlighting, schema-aware completion, sample presets, query timing, changed row counts, query history, CSV copy, and CSV download.
- **SQL Formatting & Explain Plan:** Formats SQLite queries and runs `EXPLAIN QUERY PLAN` to inspect SQLite's execution strategy.
- **Persistent Investigation Context:** Saves the last query and query history in IndexedDB via `idb-keyval`.
- **Fuzzy Search:** Uses Fuse.js for forgiving schema and finding search across table names, column names, evidence, and finding details.
- **Table Preview & Profiler:** Provides searchable previews plus per-column completeness, null/empty counts, distinct counts, samples, and sensitive/timestamp flags.
- **Report Export:** Exports a JSON forensic report with schema summary, health, findings, timeline, and snapshot diff.
- **Timeline Extraction:** Detects timestamp-like columns and builds an investigative event stream with density bars.
- **Relation Graph:** Renders a local SVG graph for declared foreign key relationships.
- **Snapshot Diff:** Compares the current database against a second SQLite snapshot for table, row-count, column, and DDL drift.
- **Desktop-First UI:** Built for dense forensic/database workflows while keeping stacked views usable on smaller screens.

## 🧱 Project Structure

```text
public/
|-- favicon.svg
|-- sample-forensics.sqlite
|-- sample-forensics-after.sqlite
`-- sql-wasm.wasm
scripts/
`-- generate-samples.mjs
src/
|-- app.tsx                # SQLite runtime orchestration, state, loading, exports
|-- main.tsx
|-- index.css
|-- sqljs.d.ts             # local module typing for sql.js under strict Vite bundler settings
|-- components/
|   |-- header.tsx
|   |-- metric-strip.tsx
|   |-- sql-editor.tsx
|   |-- ui.tsx
|   `-- workbench-nav.tsx
|-- domain/
|   |-- constants.ts
|   |-- diff.ts
|   |-- export.ts
|   |-- forensics.ts
|   |-- query.ts
|   |-- sqlite.ts
|   `-- types.ts
`-- views/
    |-- data-view.tsx
    |-- diff-view.tsx
    |-- forensics-view.tsx
    |-- overview-view.tsx
    |-- query-view.tsx
    |-- relations-view.tsx
    `-- timeline-view.tsx
```

## 🛠️ Tech Stack

- Preact 10 with Vite 8
- TypeScript 6
- Tailwind CSS 4
- `sql.js`
- `@codemirror/lang-sql`
- `@codemirror/state`, `@codemirror/view`, `@codemirror/commands`, `@codemirror/search`, `@codemirror/autocomplete`
- `sql-formatter`
- `idb-keyval`
- `fuse.js`
- `lucide-preact`
- `date-fns`

## 📦 Included Sample Data

- `public/sample-forensics.sqlite` is the primary forensic dataset with users, devices, sessions, transactions, audit events, notes, migrations, sensitive columns, sparse fields, and orphan references.
- `public/sample-forensics-after.sqlite` is a changed snapshot for the diff view, including row-count drift, schema drift, a new incident table, and additional risky records.
- Run `npm run samples` to regenerate the SQLite samples and copy the WASM runtime from `node_modules/sql.js/dist/sql-wasm.wasm`.

## 🚀 Local Development

```bash
npm install
npm run samples
npm run dev
```

Open `http://localhost:5173`.

## 🔌 Extension Notes & Nuances

- SQL execution is intentionally local-first; imported databases are opened inside the browser runtime and are not uploaded.
- The forensic scanner is bounded for UI responsiveness and samples text values rather than scanning every cell in large databases.
- Snapshot diff currently compares schema, row counts, columns, and DDL; primary-key row-level diffing can be added as a deeper workflow.
- The relation graph uses declared foreign keys only; heuristic relation discovery could be added for databases without constraints.
- Heavy SQL tooling is loaded with dynamic imports so the initial Vite bundle stays compact while the SQL workspace remains feature-rich.
- Query history and the last editor contents are persisted locally with IndexedDB and never leave the browser.
- Restored SQL is auto-run only when it is one read-only `SELECT` statement, including `WITH ... SELECT`; modifying statements are restored into the editor but left idle.
- `domain/` contains the reusable SQLite, forensic, diff, and export logic so UI views can evolve without touching database analysis code.
- The UI is desktop-first because SQL grids, schema graphs, and forensic tables are dense by nature, but controls and panels stack safely on mobile.

## 🧪 Build & Checks

```bash
npm run build
npm run preview
```

Run `npm run samples` before release builds when the generated SQLite sample files or bundled WASM runtime need to be refreshed.

## 🌐 Vercel Deployment

The repository includes a Vite-ready `vercel.json` with SPA rewrites.

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

## 📄 License

MIT License. See [LICENSE](./LICENSE).
