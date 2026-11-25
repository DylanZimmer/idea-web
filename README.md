# idea-web

**Find papers. Discover connections.**

idea-web turns a research idea into a map of the papers worth reading. Describe
an idea in plain language, and the app searches three scholarly databases, has
an LLM sort the results into shared research categories, and draws the papers
as a graph where the lines show which categories they have in common. Open any
paper in a built-in reader, highlight a passage to search from it, and save the
papers you want to keep.

Built on [DeepSpace](https://docs.deep.space) and deployed to Cloudflare
Workers at `idea-web.app.space`.

## Features

- **Idea search.** One search box on the home page. Results come from
  OpenAlex, Crossref and Semantic Scholar, queried in parallel.
- **AI categorization.** An LLM groups the papers into a shared set of
  research categories (up to 4 per paper, 35 in total) and drops papers that
  fall outside the scope of the question.
- **Paper graph.** The 12 best-ranked papers, split evenly across the sources
  that answered, are drawn as bubbles, with a paper found by several sources
  shown only once. A line joins two papers that share a
  category; thicker lines mean more shared categories. Hover a bubble for its
  details, or browse every result by category in the list beside the graph.
- **Reader.** Open a paper from the graph, from your saved list, or by pasting
  any public URL (a publisher page or a PDF such as arXiv). The reader shows a
  clean Markdown version of the paper with its figures and rendered math
  (KaTeX).
- **Highlight to search.** Select text in the reader and press **Go** to search
  for papers related to that passage.
- **Saved papers.** Signed-in users can save papers and find them again at
  `/user_home`. Each user sees only their own list, and it syncs live across
  tabs and devices.
- **Agent tools.** The same search, reader and saved-papers features are
  available to AI agents through DeepSpace's agent tools (see below).

## How it works

```
Home page ──► /results?q=… ──► searchPapers action (worker)
                                 ├─ reserve one search for this user
                                 ├─ OpenAlex + Crossref + Semantic Scholar (in parallel)
                                 └─ openai integration: categorize + drop out-of-scope
                               ◄── papers + categories ──► graph + category list

Paper URL ──► /reader?url=… ──► readPaper action (worker)
                                 ├─ reserve one read for this user
                                 └─ exa/contents: text + figure links
                               ◄── Markdown ──► reader (figures placed back, math rendered)
```

Search and reading run as DeepSpace **server actions**, so the paid calls happen
on the server, under the signed-in user's verified identity, and never expose a
key to the browser.

## DeepSpace integrations

This app uses two DeepSpace integrations, and notably leaves out the ones that
could have searched for the papers themselves.

| Integration | Used for | Billed to |
| --- | --- | --- |
| `openai` (via `createDeepSpaceAI`, model `gpt-6-luna`) | Categorizing the papers in each search | App owner |
| `exa/contents` | Turning a paper's URL into a readable version, with its figures, in the reader | App owner |

It doesn't use `scholar/search-papers`, `serpapi`, or `exa/search`, which could
have searched outside sources for research papers. Instead it searches
OpenAlex, Crossref, and Semantic Scholar directly, because these three
databases are free to access, return enough structured metadata (like
abstracts) for the AI categorization, and give redundancy: if one source fails,
the search continues with the other two.

### DeepSpace platform features

| Feature | How the app uses it |
| --- | --- |
| Auth | Sign-in; `/results`, `/user_home` and the reader require an account |
| Records (RecordRoom) | The `saved-papers` collection, read with `useQuery` and written with `useMutations`, synced live |
| Permissions (RBAC) | Server-enforced: each user can read and change only their own saved papers, one save per paper |
| Server actions | `searchPapers` and `readPaper` in `src/actions/index.ts` |
| Durable Object storage | Per-user search and reading limits |
| Secrets | `OPENALEX_API_KEY` |
| Agent tools | `registerAgent` in `worker.ts` and `<AgentTools />` in the app layout |
| Prerendering | The home page is static, prerendered HTML with SEO metadata |

## Usage limits

Both integrations are billed to the app owner, so each signed-in user gets a
rolling allowance:

- **3 searches** every 2 hours
- **20 paper reads** every 2 hours

A search that fails or finds nothing is given back. The limits live in the
app's RecordRoom Durable Object, which handles one request at a time, so
simultaneous requests can't slip past them. The browser also caches searches
and papers for the session, so a refresh doesn't spend another one.

Limits are set in `src/server/search-limit.ts`.

## Getting started

Requirements: Node 22.15+, 24 or 26, and npm 11.6+.

```powershell
npm install
```

```powershell
npx deepspace auth login
```

The search needs an OpenAlex API key (free at <https://openalex.org>). Store it
in the app's secrets store; never put it in `.dev.vars` or commit it:

```powershell
npx deepspace secrets set OPENALEX_API_KEY=<your-key>
```

Start the local dev server (Vite + Miniflare):

```powershell
npm run dev
```

## Testing

```powershell
npm run validate
```

Type-checks and runs the unit tests (Vitest).

```powershell
npm run lint
```

```powershell
npx deepspace test run
```

Runs the smoke and API Playwright specs against a local server.

```powershell
npx deepspace test run all
```

Runs every spec, including the multi-user and reader specs. If port 5173 is
already in use, add `--port <other>`.

## Deploying

```powershell
npx deepspace deploy
```

The app is served at `https://idea-web.app.space`. Its permanent identity is
`DEEPSPACE_APP_ID` in `wrangler.toml`; the `name` there is only the subdomain,
so renaming the app never strands its data or secrets.

After a deploy:

```powershell
npx deepspace logs --follow
```

```powershell
npx deepspace app usage
```

## Agent tools

A local agent (Claude Code, Codex and similar) can use the app through the
DeepSpace CLI with your normal login. Discover the tools first:

```powershell
npx deepspace agent tools idea-web --json
```

| Tool | What it does |
| --- | --- |
| `search_papers` | Runs an idea search and returns categorized papers (counts toward the search limit) |
| `read_paper` | Returns a paper's text as Markdown, cut at 24,000 characters (counts toward the reading limit) |
| `records_query`, `records_get`, `records_create`, `records_update`, `records_delete` | Read and manage your saved papers |
| `schema_list`, `schema_describe`, `user_current` | Describe the app's data and the signed-in user |

Then invoke one with input that matches its schema:

```powershell
npx deepspace agent invoke idea-web search_papers --input '{"query":"spectral graph theory for community detection"}' --json
```

Tools are defined once in `src/ai/tools.ts` and run as the calling user, so
their permissions and limits match the website's.

## Project structure

```
worker.ts                     Worker entry: routes, Durable Objects, agent registration
wrangler.toml                 App name, app id, bindings
src/
  pages/
    index.tsx                 Static home page: idea search and "read from URL"
    reader.tsx                Full-screen paper reader
    (app)/_layout.tsx         Auth + realtime data layer
    (app)/(protected)/
      results.tsx             Search results graph
      user_home.tsx           Saved papers
  actions/index.ts            searchPapers and readPaper server actions
  ai/
    paper-analysis.ts         LLM categorization and out-of-scope filtering
    tools.ts                  Agent tools
    agent.ts                  Agent route access checks
  server/
    research-sources.ts       OpenAlex, Crossref and Semantic Scholar clients
    search-limit.ts           Per-user search and reading limits
  schemas/                    saved-papers and users collections
  components/                 Graph, category list, reader, save button, UI kit
  paper-graph.ts              Paper selection and graph edges
  paper-figures.ts            Puts figures back into extracted paper text
  paper-normalizers.ts        Maps each source's response to one Paper shape
  integrations.ts             Who pays for each integration
tests/                        Playwright specs
```
