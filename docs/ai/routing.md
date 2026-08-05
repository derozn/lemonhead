# Tool and skill routing

**Sourcing policy (owner directive): adopt first, build only on a verified gap.** Before any new server or skill is written in-house, check what exists (MCP directories, installed skills). The adoption bar: official or first-party, or clearly maintained; sane transport; acceptable supply-chain surface. Build only when the niche is empty, state the gap, and design for cheap retirement. Today's only build: govuk-mcp (the GOV.UK niche contained nothing above 11 stars). Never wrap what a native tool already does.

## MCP servers

### context7 (adopted, global)

- **Purpose**: current library/framework documentation.
- **Choose when**: any library, SDK, API, or CLI question, even ones you think you know (mandatory per user rules).
- **NOT this**: general web research → WebSearch. Project-internal questions → Grep/Read.

### govuk-mcp (ours, tools/govuk-mcp, from PR A3)

- **Purpose**: structured GOV.UK content (per-section bodies, `public_updated_at`, `change_history[]`) and search.
- **Choose when**: /verify-rule research; rule-change triage; anything needing gov.uk change history.
- **NOT this**: legislation text → lex. Arbitrary non-gov pages → native WebFetch. If a mature external GOV.UK server appears, adopt it and retire this one (client adapter makes that a one-file change).

### lex (adopted, i-dot-ai/lex, from PR A3)

- **Purpose**: UK legislation and statutory instruments, semantically searchable; official government-built.
- **Choose when**: guidance prose is ambiguous and the SI text settles it; statutory backing for a params citation.
- **NOT this**: the citation of record for params stays gov.uk; Lex corroborates.

### mcp-server-fetch (adopted, official reference server, from PR A3)

- **Purpose**: polite document collection (robots.txt-respecting) for the golden set.
- **NOT this, in bold**: **fetch collects bytes; it never extracts fields. Extraction of fee data is the Phase 3 pipeline (prompts + evals on the Anthropic API) — the portfolio centrepiece is never outsourced to a crawl service.**

### Deliberately not wired

No PDF server (native PDF Read + `pdftotext` cover it; avoids AGPL surface) · no browser server project-side (claude-in-chrome exists user-level) · no reasoning server (native) · no hobby GOV.UK servers (supply-chain risk exceeds value).

## External skills (adopted; in-house skills must not duplicate them)

| Work                                                       | Load                                                      |
| ---------------------------------------------------------- | --------------------------------------------------------- |
| Next.js / App Router work in `apps/web`                    | `vercel:nextjs`, `vercel-react-best-practices`            |
| UI component build (Phase 4; shadcn adoption decided then) | `vercel:shadcn`, `building-components`                    |
| Turbo config or pipeline changes                           | `turborepo`                                               |
| Deploys, env vars, preview/production                      | `vercel:deploy`, `vercel:env`, `vercel:deployments-cicd`  |
| Anthropic API work (Phase 3 pipeline)                      | `claude-api`                                              |
| Charts/dashboards (Phase 5 stats page)                     | `dataviz`                                                 |
| Write-up prose (Phase 6)                                   | `avoid-ai-writing`, `grill-me` for structure stress-tests |
| Storage decisions (Phase 3+)                               | `vercel:vercel-storage` / `supabase`                      |

In-house skills (`/task`, `/plan-gate`, `/verify-rule`, `/troubleshoot`, `/review`) encode **project flows**; the table above supplies **framework expertise**. A flow skill links here rather than restating any of it.
