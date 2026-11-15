# Where the thesis papers came from

Counts are links in `research-map/reports/`, `research_notes/`, `sources/` and `map.json` as of 2026-11-15. Use the
indexes to find, then the hosts to get the PDF.

## Indexes (search here first)

| Source | How | Notes from past runs |
|---|---|---|
| OpenAlex | `https://api.openalex.org/works?search=<q>&filter=publication_year:>2017&per-page=25&select=id,doi,title,publication_year,primary_location,open_access,cited_by_count` | Worked best. `open_access.oa_url` often gives the PDF. Snowballing: `filter=cites:<W-id>` (cited by) and `referenced_works` on a work. 562 records screened in the first report. A case-retrieval query failed once: rephrase, do not give up on the source. No `mailto` with the author's email. |
| Crossref | `https://api.crossref.org/works?query.bibliographic=<q>&rows=20&select=DOI,title,author,issued,container-title,abstract` | Wide (1,496 records screened) but only ~1 in 5 has an abstract. Good to confirm metadata of a DOI. |
| arXiv | `https://export.arxiv.org/api/query?search_query=all:"masked autoencoder"+AND+all:graph&max_results=20` (https: plain http answers 301 with an empty body); PDF at `https://arxiv.org/pdf/<id>` | Most-linked host (159 links). Always open PDFs, non-exclusive license. Rate-limits parallel scouts (429): wait 3 s between calls, and fall back to OpenAlex, which indexes arXiv. |
| CumInCAD | Search page needs a human check (captcha): give the author the queries to run by hand. Direct PDFs work: `https://papers.cumincad.org/data/works/att/<venue><year>_<n>.pdf` | eCAADe, CAADRIA, ACADIA, SIGraDi, CAAD Futures (barely covered so far). Mirrors: `cumincades.scix.net`, `architektur-informatik.scix.net`, `itc.scix.net` (CIB W78). |
| Semantic Scholar, Google Scholar | `https://api.semanticscholar.org/graph/v1/paper/search?query=<q>&fields=title,year,externalIds,openAccessPdf` | Gave nothing in the first report (rate limits). Last resort. |
| The author's Drive | `I:\My Drive\MaCAD Thesis\Papers` | Origin of the eight recommended PDFs (`sources/papers-2026-W43.md`). Ask before reading it. |

## Venues and hosts that gave open PDFs

| Host | What is there |
|---|---|
| `ec-3.org/wp-content/uploads/<year>/<month>/EC3<year>_<n>.pdf` | EC3 (European Conference on Computing in Construction) — Wang & Ying, Cao & Hall, Sydora & Stroulia, Sesterhenn |
| `itcon.org/papers/<year>_<n>-ITcon-<Author>.pdf` | ITcon journal, open — Kone & Mahesh, Geç & Güzelci |
| `api.figshare.com/v2/file/download/<id>` | Author-deposited versions — Hornung, Zhu (IFC-Graph) |
| `web.archive.org/web/2024id_/https://www.mdpi.com/<…>/pdf` | MDPI PDFs when the site blocks scripts — Deng, Austern |
| `ceur-ws.org/Vol-<n>/<file>.pdf` | Workshop proceedings (LDAC, linked data) |
| `openaccess.thecvf.com` | CVPR/ICCV/WACV |
| `huggingface.co`, `github.com`, `zenodo.org` | Datasets and code (BIMCompNet, IFCNet, MSD) |
| Institutional repositories | `strathprints.strath.ac.uk`, `repository.cam.ac.uk`, `aaltodoc.aalto.fi`, `lirias.kuleuven.be`, `trepo.tuni.fi`, `ir.library.osaka-u.ac.jp`, `ualberta.scholaris.ca`, `mediatum.ub.tum.de`, `escholarship.org`, `discovery.ucl.ac.uk`, `iris.unica.it`, `pure.tue.nl` |
| Author sites | `paulmerrell.org`, `vladlen.info`, `sidch.com` — the graphics "parts and grammars" papers |

Closed (metadata only unless the author gets it through the library): `sciencedirect.com` (Automation in
Construction), `link.springer.com`, `tandfonline.com`, `dl.acm.org`. `journals.sagepub.com` had Renner 2025 open.

## Checks

- PDF check: HTTP 200 and the first bytes are `%PDF-`. Several hosts failed local TLS verification; retry with it off
  and mark the result † (the bytes are real, the host was not verified).
- Some publishers block scripts (Li et al. 2024 "bloqueó scripts"): mark "open in browser" for the author.
- Cross-check title, year and authors against the PDF's title page; indexes get venues wrong.

## Queries the author still owes in CumInCAD (from the first report)

`BIM grammar`, `IFC generative`, `BIM learning rules`, `IFC graph generation`, `BIM typology`, `BIM reuse parts`,
`Revit machine learning`, `BIM renovation generative`. Add the topic's own queries to this list at the end of a run.

Masking (2026-11-15): `masked BIM`, `BIM completion`, `floor plan masked`, `graph masked autoencoder architecture`,
`generation order layout`, `novelty generative design evaluation`.

Also blocked for scripts in that run, so give the author the link to open in a browser: ETH Research Collection
(429/500), mediaTUM (bot check), ScienceDirect, ACM and MDPI (403).
