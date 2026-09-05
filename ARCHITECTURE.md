# ROAT Observatory — Architecture v0.2

*How law lets automated vehicles onto the road.*

| | |
|---|---|
| **Document** | Architecture specification, version 0.2 (working draft) |
| **Date** | 5 September 2026 |
| **Owner** | Jozef Andraško, ROAT (Faculty of Law, Comenius University Bratislava) |
| **Status** | For decision — every section marked **Decision** fixes a choice that later sections depend on |
| **Supersedes** | Architecture v0.1 "ROAT Regulatory Atlas" (5 Sep 2026) |
| **Companion** | Content prototype "ROAT Observatory" (published 5 Sep 2026, generated from Hub snapshots of 25 and 31 Aug 2026) |

---

## 0. Executive summary and what changed since v0.1

Version 0.1 designed an encyclopaedic **Regulatory Atlas**: hand-written pages per jurisdiction, instrument and topic. A profile of the ROAT Intelligence Hub (364 records) and the 2026 article portfolio (12 manuscripts) showed that this is not where ROAT's material or originality lies. National regulatory evidence in the Hub is thin (Slovakia 6 records, Germany 10, France 4, Czechia 2), while the Hub is rich in **coded analytical models**: the N0–N4 functional-layer coding of five 2026 regimes and a historical UK panel, the Second Gate table of eight deployment regimes across eighteen dimensions, the roles and role–function matrices, the eight-dimension safety-data research-readiness framework, the cybersecurity incident-reporting equivalence map and the LTCTC traceability profile. Eight of the twelve manuscripts circle one question: how law converts the technical admissibility of a vehicle into lawful driverless deployment.

**Decision.** The public platform is therefore redefined as the **ROAT Observatory**: a versioned, citable publication of ROAT's comparative models and their coded data, generated from the Hub at dated snapshots, with a curated Source Library underneath and the research outputs on top. Its homepage is not a menu but the comparative matrix itself.

What survives from v0.1 unchanged: the three-layer ecosystem (Hub → public layer → Research), the ROAT ID principles, the verification discipline, the Markdown/GitHub/Astro stack and the one-way Hub bridge. What changes: the core record type is a **Model** with dated **Snapshots** of coded data, not a hand-written instrument page; jurisdictions are profiles derived from the models, not encyclopaedia entries; the MVP is three modules plus the Source Library, most of it generated rather than written; and the jurisdiction set follows the data (EU/UNECE, Germany, France, Croatia, Great Britain, China, Slovakia, with the United States inside the safety-data module), not a list chosen a priori.

The content prototype already demonstrates the homepage, Module 01 and Module 02 from live Hub data. This document fixes the architecture around it.

---

## 1. Mission, positioning and scope

### 1.1 Mission

> To make visible, comparable and citable how legal systems let automated vehicles onto the road — by publishing ROAT's coded comparative models with full provenance, at dated snapshots, as open research infrastructure.

### 1.2 Positioning statement

**Decision.**

> *The ROAT Observatory is an open, versioned research infrastructure that publishes comparative models of automated-vehicle deployment governance — layered regulatory normalisation, legal bridges and deployment gates, human roles, safety evidence and data — as coded, provenance-tracked datasets with the sources and research behind them.*

It is not a legal encyclopaedia, a link database, a news feed or the research group's institutional site. Its distinguishing feature is that every published claim is a **coded cell with a rationale, a confidence level and a Hub record behind it**, frozen at a snapshot date and citable as such.

### 1.3 What the Observatory is and is not

| It **is** | It **is not** |
|---|---|
| A publication channel for ROAT's analytical models and their data | A catalogue of regulations |
| Comparative and cross-jurisdictional by construction (models, not country pages) | A jurisdiction-by-jurisdiction encyclopaedia |
| Versioned: every snapshot is frozen, dated and citable with a DOI | A continuously edited wiki |
| Diagnostic: vectors, families, gates — never an aggregate "readiness score" | A ranking or index of countries |
| The public counterpart of ROAT's articles (each article has a data companion) | A substitute for the articles |

### 1.4 Scope

**Decision.** Scope follows what is coded in the Hub, and grows only when a new model or a new coded row exists there.

| Dimension | v0.1 (first release) | Later |
|---|---|---|
| **Modules (models)** | 01 Layered normalisation (N0–N4 vectors, pathway families, historical UK panel); 02 Second Gate (post-type-approval deployment models); 03 Human roles (concept register and role–function matrix) | 04 Safety-data research readiness (US SGO vs EU 2022/1426); 05 Incident-reporting equivalence map; 06 LTCTC traceability profile; 07 ROAT Regulatory Method (13 stages) |
| **Jurisdictions with profiles** | EU/UNECE baseline, Germany, France, Croatia, Great Britain, China, Slovakia | Netherlands, Austria, Poland, Czechia, Japan — only once coded in at least one module |
| **United States** | Present as a regime inside Module 04 (safety data) and in Sources; no profile until coded in 01 or 02 | Profile in v0.2 if coded |
| **Historical panel** | UK 1861–1930 as part of Module 01 | — |
| **Sources** | Public Library: 80–120 verified foundational records (Hub guide) | Monthly additions |
| **Research** | All `OUT-*` outputs with a public status, linked to their module | — |
| **Slovak legislative chain (RC/SG/TM/LA/PA)** | Not published; RC concepts feed Module 03 | Decision after tlač 1329 is decided (section 13) |

### 1.5 Audiences

Primary: legal and technical researchers working on automated-vehicle governance in Europe; ministries and authorities (MD SR, MV SR, Policajný zbor and their counterparts) preparing deployment frameworks; UNECE/EU policy staff comparing national implementation. Secondary: type-approval and testing bodies, manufacturers and operators, journalists, students.

### 1.6 Separation from the faculty website

**Decision.** `flaw.uniba.sk/ROAT` presents the group; the Observatory presents the knowledge. They link, they do not duplicate.

---

## 2. Ecosystem: three layers and one workflow

### 2.1 The three layers

| Layer | Name | Nature | Where it lives |
|---|---|---|---|
| A | **ROAT Intelligence Hub** | Internal register (364 records, 64 columns, `ROAT-2026-NNNN`) **plus the analytical sheets** that hold the models: Cross-section 2026, Layer Coding, Post-Type-Approval Deployment Models, Roles & Concepts, Role Function Matrix, ROAT Regulatory Method, and the article-specific sheets | Google Sheet |
| B | **ROAT Observatory** | Public, versioned publication of models, snapshots, jurisdiction profiles, sources and outputs | GitHub repository → static site |
| C | **ROAT Research** | Articles, policy papers, methodologies, teaching; catalogued as `OUT-*` | Journals, repositories; Outputs sheet |

### 2.2 The workflow

```
Legislation · decisions · papers · standards
        │
        ▼
Hub register           capture → classify → gate → Verified          (roat-intake)
        │
        ▼
Hub analytical sheets  code the model: cell = score + rationale + confidence + records
        │
        ▼
Snapshot               freeze the sheet at a date (already practised before each submission)
        │
        ▼
Observatory            generate module pages, jurisdiction profiles, data files; publish; DOI
        │
        ▼
Research outputs       the article cites the snapshot; the snapshot cites the article (OUT-*)
```

### 2.3 Binding rules

1. **The Hub is the source of truth for models, not the repository.** Coding happens in the analytical sheets; the Observatory build reads them. Nobody edits a score in Markdown.
2. **Nothing is published that a Hub sheet does not hold at snapshot time.** A module page cannot contain a cell, rationale or record that is not in the exported snapshot.
3. **Every cell cites Hub records at Research Stage ≥ Verified.** The build checks the record index; a cell citing a `Signal` record fails the build.
4. **Sources are the Public Library.** The Hub's Public Library fields (columns 51–55, 61–63) and its Published gate are the only editorial layer for sources. The Observatory renders `Public Status = Published` rows and nothing else.
5. **Draft law is never coded as current law.** Prospective regimes (tlač 1329, China's RTSL draft) appear as sensitivity rows or separate regimes marked `draft`, exactly as in the sheets.
6. **One-way write.** The build reads exports; nothing writes back to the Sheet.

---

## 3. Information architecture

### 3.1 Design principle

The Observatory is a small set of **modules**, each a coded model with dated snapshots; **jurisdiction profiles** are computed views across modules; **sources** and **outputs** are the provenance and the research on either side. Users see tables and cards; underneath it is a typed dataset.

### 3.2 Primary navigation

**Decision.** Six items:

**Observatory | Modules | Jurisdictions | Sources | Research | Method**

| Item | Landing content |
|---|---|
| Observatory (home) | The current Module 01 matrix, pathway families, and a Module 02 summary — the prototype as built |
| Modules | One card per module: question, latest snapshot date, jurisdictions covered, companion article |
| Jurisdictions | Profiles: the jurisdiction's row in every module, its bridges/gates, legal status, records |
| Sources | Public Library: filterable catalogue of published Hub records |
| Research | `OUT-*` outputs with public status; each linked to the module and snapshot it uses |
| Method | N0–N4 scale, coding rules, snapshot and release policy, ROAT Regulatory Method, how to cite |

### 3.3 URL scheme

**Decision.** Permanent, lower-case, hyphenated, English. Snapshots carry their date in the URL by design — the date *is* the identity of a snapshot.

| Type | Pattern | Example |
|---|---|---|
| Module (latest) | `/modules/{slug}` | `/modules/layered-normalisation` |
| Snapshot | `/modules/{slug}/{YYYY-MM-DD}` | `/modules/layered-normalisation/2026-08-25` |
| Data file | `/modules/{slug}/{YYYY-MM-DD}/data.csv` (and `.json`) | — |
| Jurisdiction profile | `/jurisdictions/{slug}` | `/jurisdictions/slovakia` |
| Concept | `/method/concepts/{slug}` | `/method/concepts/remote-intervention` |
| Source | `/sources/{roat-record-id}` | `/sources/roat-2026-0329` |
| Research output | `/research/{out-id}` | `/research/out-005` |
| Method pages | `/method/{slug}` | `/method/n-scale`, `/method/how-to-cite` |
| ID resolver | `/id/{ROAT-ID}` | `/id/ROAT-MOD-LAYERS` |

### 3.4 Relationships (closed vocabulary)

| Relationship | From → To | Meaning |
|---|---|---|
| `codes` | Module → Jurisdiction | The module contains a coded row for this regime |
| `has_snapshot` | Module → Snapshot | Dated frozen version |
| `cites` | Snapshot cell / Module / Profile → Source | Hub record supporting the coding |
| `companion_of` | Module ↔ Research output | The article this model belongs to |
| `uses_concept` | Module → Concept | ODD, DDT, remote intervention, second gate … |
| `related_module` | Module ↔ Module | e.g. 02 Second Gate ↔ 01 Layered normalisation (road-access layer) |
| `supersedes` | Snapshot → Snapshot | Later snapshot of the same module |

Relationships are declared in module and snapshot metadata; profiles and source pages render the inverse.

### 3.5 The jurisdiction profile is a view, not a page

A profile is generated from every module that `codes` the jurisdiction: its layer vector and family (01), its deployment model row (02), its role allocation (03), its regimes in 04–06 when they exist, plus a short editor-written overview paragraph and the list of Sources with that jurisdiction. There is no free-form "country page" to maintain — when a snapshot changes, every profile changes with it.

---

## 4. Record types

**Decision.** Seven content types and one meta type.

| # | Type | Key | Definition | v0.1 count |
|---|---|---|---|---|
| 1 | **Module** | `MOD` | A comparative model: question, method, dimensions, coding rules, companion article | 3 |
| 2 | **Snapshot** | `SNAP` | A frozen, dated export of one module's coded table, with audit and caveats | 3–4 |
| 3 | **Jurisdiction** | `JUR` | A regime that appears in at least one module; profile generated | 7 (+ US in Sources) |
| 4 | **Concept** | `CON` | A defined notion reused across modules, quoted from instruments with locus | ~15 (from Roles & Concepts) |
| 5 | **Source** | Hub ID | A Public Library record, generated | 80–120 |
| 6 | **Research output** | `OUT` | A ROAT output with public status, generated from the Outputs sheet | 6–8 |
| 7 | **Historical panel** | part of `MOD-LAYERS` | The UK 1861–1930 coding, published as a snapshot of Module 01 with `panel: historical` | 1 |
| 8 | **Meta page** | — | Method pages, About, How to cite, Changelog | 5 |

Removed from v0.1: *Instrument* pages (instruments are Sources with `Legal Status`, cited by cells; a regulation page is a Source page with its citing cells listed), *Topic* pages (topics are modules), *Evidence chain* pages (Module 06 when LTCTC is published), *Case* pages (not needed by any current model).

---

## 5. Metadata schema

Modules and snapshots are the heart of the system. Their metadata is validated at build time; the data tables are validated against a per-module column schema.

### 5.1 Module (`content/modules/{slug}.md`)

```yaml
roat_id: ROAT-MOD-LAYERS
type: module
number: 1
title: Regulatory normalisation by functional layer
short_title: Layered normalisation
question: >-
  How far has each regulatory function normalised automated driving, and which legal
  bridge or gate manages the mismatch between layers?
method_summary: >-
  N0–N4 ordinal coding of seven functional layers per regime; range and asynchrony
  as descriptive signals; pathway families as recurring configurations.
dimensions:                          # the columns of the coded table, in order
  - {key: technical_approval, label: Technical approval, scale: n-scale}
  - {key: road_access, label: Road access / operation, scale: n-scale}
  - {key: actor_allocation, label: Actor allocation, scale: n-scale}
  - {key: liability_risk, label: Liability / risk, scale: n-scale}
  - {key: behavioural_rules, label: Behavioural rules, scale: n-scale}
  - {key: infrastructure, label: Infrastructure, scale: n-scale}
  - {key: international, label: International / cross-border, scale: n-scale}
scales: [n-scale, asynchrony, confidence]
hub_sheet: "Cross-section 2026 – AV Normalisation"   # where coding lives
panels: [current, prospective, historical]
latest_snapshot: 2026-08-25
relationships:
  companion_of: [OUT-005-HISTORY]      # placeholder until AV History has an OUT id
  related_module: [ROAT-MOD-SECOND-GATE]
  uses_concept: [ROAT-CON-BRIDGE, ROAT-CON-GATE, ROAT-CON-NORMALISATION]
status: published
license: CC-BY-4.0
```

### 5.2 Snapshot (`data/modules/layers/2026-08-25/snapshot.yaml` + `data.csv`)

```yaml
roat_id: ROAT-SNAP-LAYERS-2026-08-25
module: ROAT-MOD-LAYERS
snapshot_date: 2026-08-25
exported_from_hub: 2026-09-05T14:10:00Z
coder: JA
second_pass: rule-based same-coder recoding (6 cells); not inter-coder reliability
finding: >-
  The five 2026 regimes do not line up on one common ladder …
caveats:
  - Draft law excluded from current-law scores; shown as sensitivity rows.
  - Scores measure legal embedding, not regulatory intensity.
supersedes: null
doi: null                               # filled by the Zenodo release
rows: 5 current + 2 prospective
```

`data.csv` — one row per regime, one column per dimension, **and for every dimension a rationale, a confidence and a records column**, because a score without its rationale is not publishable:

```
regime_id,regime_label,panel,technical_approval,…,international,range,asynchrony,family,bridge,rationale,sensitivity,robust_conclusion,confidence,caveat,records
ROAT-JUR-SK,Slovakia,current,3,1,1,1,1,1,2,2,Significant,"Testing-permit / technical-leading configuration","§ 49 test-operation permit; narrower ADV operational regime","EU technical approval can reach N3 …","Road/actor/behaviour plausibly N1–N2 …","Testing-permit … persists …",Medium–High,"Snapshot is 25 August 2026 …","ROAT-2026-0070;ROAT-2026-0155;ROAT-2026-0156;ROAT-2026-0159;ROAT-2026-0306"
```

Module 02 uses the same pattern with its eighteen text dimensions; Module 03 with the role–function matrix values (`Yes`, `No`, `Conditional`, `System`, `Support only`, `Possible interface`).

### 5.3 Jurisdiction (`content/jurisdictions/{slug}.md`)

```yaml
roat_id: ROAT-JUR-SK
type: jurisdiction
title: Slovakia
code: SK
overview: >-                          # the only hand-written text on the profile, ≤ 120 words
  …
legal_snapshot_note: "Act 131/2026 effective 1 Sep 2026; print 1329 pending."
authorities: [Ministerstvo dopravy SR, Ministerstvo vnútra SR, Policajný zbor]
last_verified: 2026-09-05
verified_by: JA
```

Everything else on the profile is generated from snapshots and the Public Library.

### 5.4 Concept, Source, Research output

Concept: `roat_id`, `title`, `definitions[] {source, locus, text}`, `distinguish_from[]` (the "must not be conflated with" discipline from the Roles register), `used_in_modules[]`.
Source: generated from the Public Library export — Hub columns 5, 23, 51–55, 56–61 — plus a computed list of citing cells.
Research output: generated from the Outputs sheet — `OUT-*`, type, title, status, URL, source record IDs — plus `companion_of` inverse.

### 5.5 Field rules

- Every score cell in every snapshot must have a non-empty rationale and a confidence value; the build fails otherwise.
- `records` in a cell or row may list only Hub IDs present in the record index with Research Stage ≥ Verified.
- `snapshot_date` is the legal snapshot date used in the coding, not the export date; both are stored.
- A snapshot is immutable once released. Corrections produce a new snapshot with `supersedes` set and a changelog entry.
- Prospective rows carry `panel: prospective` and never feed the "current" view.

---

## 6. Taxonomy and controlled vocabularies

**Decision.** Hub vocabularies are reused verbatim; the Observatory adds only the scales its models already use.

### 6.1 Modules

| # | Slug | ROAT ID | Hub sheet | Companion output | Release |
|---|---|---|---|---|---|
| 01 | `layered-normalisation` | `ROAT-MOD-LAYERS` | Cross-section 2026; Layer Coding – AV History | AV History article | v0.1 |
| 02 | `second-gate` | `ROAT-MOD-SECOND-GATE` | Post-Type-Approval Deployment Models | OUT-005 | v0.1 |
| 03 | `human-roles` | `ROAT-MOD-ROLES` | Roles & Concepts; Role Function Matrix | Remote-intervention article (BLF 2026) | v0.1 |
| 04 | `safety-data-readiness` | `ROAT-MOD-SAFETY-DATA` | (article sheets) | OUT-006 | v0.2 |
| 05 | `incident-reporting-map` | `ROAT-MOD-INCIDENT-MAP` | (article sheets) | CLSR cyber article | v0.2 |
| 06 | `traffic-law-traceability` | `ROAT-MOD-LTCTC` | (article sheets) | OUT-012 | v0.2 |
| 07 | `regulatory-method` | `ROAT-MOD-METHOD` | ROAT Regulatory Method | — | v0.2 (as Method page first) |

### 6.2 Scales

**N-scale** (Module 01): `N0` unintegrated / exceptional · `N1` ad hoc or conditional accommodation · `N2` bridge-based integration · `N3` dedicated institutionalisation · `N4` routinisation / mainstream recognition. Ordinal, never summed.
**Asynchrony**: `Mild` · `Significant` · `Strong`.
**Confidence**: `High` · `Medium–High` · `Medium` · `Low`.
**Legal state of a regime**: `current` · `prospective` · `historical` (panel), plus the Hub *Legal Status* value for the underlying instrument.
**Role–function values** (Module 03): `Yes` · `No` · `Conditional` · `System` · `Support only` · `Possible interface`.

### 6.3 Pathway families (Module 01)

`technical-harmonisation-first` · `actor-institutional-first` · `deployment-assurance` (variants: service-test, safety-case/organiser-decision) · `testing-permit`. New families are added only when a coded regime does not fit an existing one and the module's companion article says so.

### 6.4 Jurisdictions

`eu-unece`, `germany`, `france`, `croatia`, `great-britain`, `china`, `slovakia`, `united-states` (Sources and Module 04 only in v0.1). IDs: `ROAT-JUR-EU`, `-DE`, `-FR`, `-HR`, `-UK`, `-CN`, `-SK`, `-US`. Mirrors Hub *Country Cluster*; Croatia and France must be added to the Hub list.

### 6.5 Evidence badge (provenance)

Unchanged from v0.1: 🟢 Primary source (Hub Level 1) · 🔵 Official guidance (Level 2) · 🟡 Academic analysis (Levels 3–4) · ⚪ ROAT interpretation. Levels 5–6 cannot support any cell. A module page shows the weakest badge among the records its snapshot cites.

---

## 7. The ROAT ID system

Principles unchanged from v0.1: one ID per entity for life; type-prefixed and readable; Hub IDs reused, never duplicated; IDs resolve via `/id/{ROAT-ID}`.

| Type | Pattern | Examples |
|---|---|---|
| Module | `ROAT-MOD-{SHORT}` | `ROAT-MOD-LAYERS`, `ROAT-MOD-SECOND-GATE`, `ROAT-MOD-ROLES` |
| Snapshot | `ROAT-SNAP-{MODULE SHORT}-{YYYY-MM-DD}` | `ROAT-SNAP-LAYERS-2026-08-25`, `ROAT-SNAP-SECOND-GATE-2026-08-31` |
| Regime row | `{JUR ID}` with panel suffix where needed | `ROAT-JUR-SK`, `ROAT-JUR-SK:1329` (prospective), `ROAT-JUR-CN:RTSL-DRAFT` |
| Jurisdiction | `ROAT-JUR-{code}` (ISO alpha-2; `UK` not `GB`; `EU` for EU/UNECE baseline) | `ROAT-JUR-HR` |
| Concept | `ROAT-CON-{SHORT}`; Roles register IDs `RC-nnn` are referenced, not renamed | `ROAT-CON-REMOTE-INTERVENTION` → `RC-004` |
| Source | Hub Record ID unchanged | `ROAT-2026-0329` |
| Research output | Hub Outputs ID unchanged | `OUT-005` |
| 1329 chain rows | unchanged, referenced only | `SG-004`, `TM-007` |

`data/ids.yaml` is the registry; the build refuses unknown IDs and orphan registry entries.

### 7.1 Citing

> ROAT Observatory, *Regulatory normalisation by functional layer* [ROAT-MOD-LAYERS], snapshot 2026-08-25 [ROAT-SNAP-LAYERS-2026-08-25], DOI 10.5281/zenodo.…, Faculty of Law, Comenius University Bratislava. https://…/modules/layered-normalisation/2026-08-25

---

## 8. Page templates

### 8.1 Module page (latest snapshot)

```
{Module number} · {Title}                                         ROAT-MOD-…
{One-sentence question}
Snapshot {date} · {n} regimes · coder {initials} · confidence range · DOI

The question                 3–5 sentences (from module metadata)
The table                    the coded matrix; click a row → rationale, sensitivity, caveat, records
Legend and scale             the scale used, with one-line definitions
Findings                     the snapshot's finding and novelty statement (quoted from the Hub sheet)
Families / typology          cards (Module 01: pathway families; Module 02: deployment models)
Robustness                   second-pass audit table and the honesty note
Prospective / sensitivity    draft-law rows, visibly separated
Companion research           the article(s) this model belongs to
All snapshots                dated list; each is its own URL with data.csv / data.json
Sources                      every Hub record cited in the snapshot, with badges
Cite this snapshot · Changelog
```

The prototype implements this template for Modules 01 and 02 and is the reference rendering.

### 8.2 Jurisdiction profile

```
{Jurisdiction}                                                    ROAT-JUR-…
Overview                     ≤ 120 words, hand-written, last verified {date}
Legal snapshot note          one line
In Module 01                 its layer vector, range, asynchrony, family, bridge/gate; rationale on click
In Module 02                 its deployment model row (all 18 dimensions on click)
In Module 03                 the roles it recognises and how it allocates DDT / fallback / remote functions
Prospective regimes          rows marked draft (e.g. print 1329), with the sensitivity result
Authorities                  list
Sources                      Public Library records with this jurisdiction
Research                     outputs that use this jurisdiction
Cite · Changelog
```

### 8.3 Snapshot page

The module table frozen at that date, its `snapshot.yaml` rendered (coder, second pass, caveats, finding), download links for `data.csv` / `data.json`, DOI, and "superseded by" if applicable.

### 8.4 Source page (generated)

Public title, summary, why it matters, legal status and effective date, citation, primary-source link, evidence badge — and **"cited by"**: every module cell and profile that relies on this record. This turns the Public Library from a catalogue into provenance.

### 8.5 Method pages

`/method/n-scale`, `/method/coding-rules`, `/method/snapshots-and-releases`, `/method/regulatory-method` (the 13-stage ROAT–TechReg framework), `/method/how-to-cite`, `/method/about`.

---

## 9. Verification, snapshots and release policy

### 9.1 Chain of custody

```
Source → Hub intake gates → Research Stage Verified
      → cell coded in the analytical sheet (score + rationale + confidence + records)
      → same-coder rule-based second pass (audit block) — until a second coder exists
      → snapshot frozen (date, coder, caveats)
      → build gates pass → published → Zenodo DOI on release
```

### 9.2 Coding discipline (from the Hub sheets, now enforced)

- A score without a rationale is a build error.
- Draft law is never coded as current; prospective rows are separate.
- Scores measure legal embedding, not regulatory intensity, and are never aggregated per jurisdiction.
- The robustness audit is published with the wording of the sheet: *"a sensitivity check only; not inter-coder reliability"*. When a second human coder exists, the audit block gains an inter-coder section.

### 9.3 Snapshot and release timing

**Decision.** A module snapshot is published **after** the companion manuscript has been submitted (not accepted), as a dated release with a DOI. This protects priority while making the data citable in the manuscript's revision. Until then the snapshot may exist in the repository as `status: embargoed` and is excluded from the build. Modules with no companion article (Method) have no embargo.

### 9.4 Review cadence

| Object | Re-verification trigger | Default cadence |
|---|---|---|
| Snapshot | Never changed; superseded by a new snapshot | Before each companion submission, and at least every 6 months for published modules |
| Jurisdiction overview | Any new snapshot that codes it; any Hub record for it with Action Required `Verify` | 3 months |
| Concept | Change in a cited instrument | 6 months |
| Source | Hub monitoring (Next Check Date) | as in Hub |

The build emits an *Observatory review queue* (overviews past `last_verified`, snapshots older than six months, cited records whose Legal Status changed) in the format of the Monday weekly review.

### 9.5 Build gates

The build fails when: metadata does not validate; a `data.csv` column set differs from the module's `dimensions`; a cell lacks rationale or confidence; a cited record is missing from the index or is `Signal`; a relationship target does not exist; a snapshot marked `published` has no `snapshot_date` or has `embargoed` companions; an ID is not in the registry. It warns on Hub vocabulary drift and on external link failures (weekly).

---

## 10. MVP: Observatory v0.1

**Decision.** v0.1 is three modules, seven profiles, the Source Library and five method pages. Most of it is generated; the hand-written text is seven overview paragraphs, three module questions and the method pages.

### 10.0 Prototype (done, 5 Sep 2026)

Homepage with Module 01 matrix (5 current + 2 prospective regimes), pathway families, Module 02 summary with 8 regimes × 18 dimensions on click, robustness audit and N-scale definitions — generated from the Hub sheets of 25 and 31 August 2026.

### 10.1 Modules (3)

| # | Module | Snapshot(s) | Hand-written | Generated |
|---|---|---|---|---|
| 1 | Layered normalisation | 2026-08-25 (current + prospective); historical UK panel | question, method summary | matrix, families, audit, findings, sources |
| 2 | Second Gate | 2026-08-31 | question, method summary | table, deployment models, sources |
| 3 | Human roles | first snapshot to be frozen from Roles & Concepts + Role Function Matrix | question, method summary, concept definitions with locus | concept register, matrix, sources |

### 10.2 Jurisdiction profiles (7)

EU/UNECE baseline, Germany, France, Croatia, Great Britain, China, Slovakia — each: one overview paragraph plus generated module rows.

### 10.3 Sources

Public Library first release: 80–120 records moved to `Public Status = Published` through the Public Editorial Queue (55 are in Review today). Every record cited by a v0.1 snapshot must be among them — the build lists the missing ones.

### 10.4 Research

Outputs with public status: OUT-001, OUT-005, OUT-006, OUT-007, OUT-012 and the AV History and BLF outputs once they have `OUT-*` IDs; each linked `companion_of` its module.

### 10.5 Method pages (5) + About + How to cite + Changelog

### 10.6 Definition of done

A module is done when its snapshot passes all gates, its audit block is published, its companion article is submitted, every cited record is Published in the Library, a second ROAT member has read the module page, and the release has a DOI.

### 10.7 Explicitly deferred

Modules 04–07; United States profile; Netherlands, Austria, Poland, Czechia; publication of the 1329 legislative chain; any free-text instrument commentary.

---

## 11. Technical architecture: Hub → snapshot → website

### 11.1 Stack

**Decision.** Unchanged in kind from v0.1, adjusted in what it carries.

| Layer | Choice | Reason |
|---|---|---|
| Models and coding | Google Sheet analytical tabs (source of truth) | Coding is done where it is done today; no double entry |
| Snapshot export | `scripts/hub-sync.ts` reads named sheets by ID, writes `data/modules/{slug}/{date}/data.csv` + `.json` + `snapshot.yaml` (skeleton), and `data/hub/{register-index,sources,outputs}.json` | One export, repeatable, diffable |
| Content | Markdown + YAML for modules, jurisdictions, concepts, method pages | Only narrative is hand-written |
| Site generator | Astro with content collections; data collections for snapshots; Zod schemas per module | Typed validation of both metadata and data tables at build time |
| Tables and interaction | Plain HTML tables with inline script (as in the prototype); no charting library | Readable, printable, indexable; the prototype already works this way |
| Search | Pagefind | Static, indexes cells and rationales |
| Hosting | GitHub Pages → Cloudflare Pages with domain | Zero cost |
| Archive | Zenodo per release (repository release = all published snapshots) + per-snapshot DOI where a module is released alone | Citable |

### 11.2 Repository layout

```
roat-observatory/
├── content/
│   ├── modules/          layered-normalisation.md, second-gate.md, human-roles.md
│   ├── jurisdictions/    slovakia.md, germany.md, …          (overview paragraphs only)
│   ├── concepts/         remote-intervention.md, odd.md, …
│   └── method/           n-scale.md, coding-rules.md, snapshots-and-releases.md, regulatory-method.md, how-to-cite.md, about.md
├── data/
│   ├── modules/
│   │   ├── layers/2026-08-25/{data.csv,data.json,snapshot.yaml}
│   │   ├── layers/historical-uk/{…}
│   │   └── second-gate/2026-08-31/{…}
│   ├── hub/              register-index.json, sources.json, outputs.json   (generated)
│   ├── ids.yaml          registry
│   └── vocabularies.yaml Hub Lists snapshot + scales
├── schemas/              module.ts, snapshot.ts, per-module data schemas, jurisdiction.ts, concept.ts
├── src/                  layouts, matrix/table components, detail panels, badges, cite block
├── scripts/              hub-sync.ts, validate.ts, review-queue.ts, release.ts (Zenodo)
├── ARCHITECTURE.md
└── CHANGELOG.md
```

### 11.3 Hub bridge

1. Reads, read-only, by sheet name: Intelligence Register, Outputs, Public Library, and each module's analytical sheet(s) named in the module metadata.
2. Writes the record index (ID → Research Stage, Legal Status, Evidence Level, Next Check Date), `sources.json` (Published rows only), `outputs.json`.
3. For a module: parses the sheet into the module's column schema; unknown columns are a warning, missing required columns an error; writes the dated data files and a `snapshot.yaml` skeleton for the coder to complete (finding, caveats, coder, second pass).
4. Opens a pull request when a new export differs from the latest published snapshot, so a change to a score is reviewed by a human before it becomes a new snapshot.
5. Never writes to the Sheet.

### 11.4 Editorial workflow

```
Coding in Hub sheet → hub-sync (PR with new export) → coder completes snapshot.yaml
→ build gates + preview → second reader → merge → publish (or hold as embargoed until submission)
→ release tag → Zenodo DOI → DOI written back into snapshot.yaml (commit) → CHANGELOG
```

### 11.5 Versioned URLs and immutability

Snapshots are immutable and addressed by date; there is no `?v=` parameter. The "latest" module URL redirects to the newest published snapshot. Git history is the audit trail.

---

## 12. Governance, licensing, citation

| Question | Decision |
|---|---|
| Editorial responsibility | Editor-in-chief JA; every published module has a second reader; coder named on every snapshot |
| Data licence | **CC BY 4.0** for snapshots, rationales and profiles |
| Code licence | MIT |
| Citation | Snapshot-level with ROAT ID and DOI (section 7.1); release-level DOI via Zenodo |
| Embargo | Snapshot published after companion submission (section 9.3) |
| Corrections | New snapshot with `supersedes`; never a silent edit; changelog entry |
| Brand | **ROAT Observatory** (primary); tagline *How law lets automated vehicles onto the road* |
| Relationship to the faculty | Research output of ROAT; affiliation and funding (APVV-23-0519 etc.) stated; not the institutional site |

---

## 13. Open decisions and roadmap

### 13.1 Open decisions

| # | Decision | Options | Needed by |
|---|---|---|---|
| 1 | Domain | `roat-observatory.eu` · `observatory.roat.sk` · a `uniba.sk` subdomain | Before public launch |
| 2 | Public Library first release | Move the 55 Review records + the ~40 cited by v0.1 snapshots to Published, or the Hub guide's 80–120 in one editorial pass | Before v0.1 |
| 3 | Hub read mechanism | Service account (read scope) · published CSV per sheet | Repository setup |
| 4 | Second coder | Who codes the inter-coder pass for Module 01 and 02; needed to replace the same-coder audit | v0.2 |
| 5 | 1329 chain publication | Not published · RC/SG as ROAT interpretation after the bill is decided · full chain | After tlač 1329 |
| 6 | Language | English only (v0.1) · Slovak overview paragraphs on SK profile · bilingual method pages | v0.2 |
| 7 | AV History and BLF outputs | Assign `OUT-*` IDs in the Hub so `companion_of` resolves | Before v0.1 |

### 13.2 Roadmap

| Milestone | Content | Exit criterion |
|---|---|---|
| **Prototype** (done) | Home = Module 01 + Module 02 from Hub data | Decision to proceed (taken 5 Sep 2026) |
| **Repository + bridge** | Layout in 11.2; schemas for Modules 01–03; hub-sync producing the two existing snapshots automatically | The prototype is reproduced from the pipeline, not hand-built |
| **v0.1** | Modules 01–03, 7 profiles, Source Library ≥ 80 Published, Method pages, first Zenodo release | All gates pass; every cited record Published; DOI minted; second reader on each module |
| **v0.2** | Modules 04–06 as their articles are submitted; US profile if coded; second coder audit | — |
| **v1.0** | Module 07 as an interactive method; JSON-LD export of the graph; external citations exist | — |

### 13.3 What to do next

1. Approve or amend the **Decision** sections, in particular 9.3 (embargo timing) and 10.3 (Library release).
2. Create `roat-observatory` with the layout in 11.2; seed `ids.yaml` with `ROAT-MOD-LAYERS`, `ROAT-MOD-SECOND-GATE`, `ROAT-MOD-ROLES`, the two existing snapshots and the seven jurisdictions.
3. Write `hub-sync.ts` for the three module sheets and the Public Library, and reproduce the prototype from it.
4. Freeze the first Module 03 snapshot from Roles & Concepts and Role Function Matrix.
5. Run the Public Editorial Queue to move the records cited by the three snapshots to Published.

---

*Architecture v0.2 — working draft for decision. Hub figures (364 records; jurisdiction and topic distributions; 55 Public Library records in Review) were read from the ROAT Intelligence Hub on 5 September 2026. Snapshot contents cited here are those of the Cross-section 2026 (25 Aug 2026) and Post-Type-Approval Deployment Models (31 Aug 2026) sheets.*

---

## Amendment A1 (5 September 2026) — build tooling

**Decision (amends §11.1).** The repository is built with plain Node (no framework, no npm dependencies): `scripts/hub-sync.mjs`, `scripts/validate.mjs`, `scripts/build.mjs` and `src/templates.mjs`. Reasons: the Observatory's pages are a small number of table-driven templates; schema validation is written once in `validate.mjs` and is not weaker than a framework's; a dependency-free build has no upgrade churn for a law-faculty team and runs anywhere Node ≥ 20 runs. Astro remains a possible later replacement for `build.mjs` if the site outgrows the templates; nothing in `content/` or `data/` would change.

## Amendment A2 (5 September 2026) — role-function cells are qualified values

**Decision (amends §6.2 and §9.5).** A role–function cell in Module 03 is not drawn from a closed list. The Hub's Role Function Matrix uses 56 distinct values across 30 roles, and most of them carry the legal condition that makes the answer true — `No while engaged`, `Possible during fallback`, `MRM request`, `Readiness duties`. Forcing them into a controlled vocabulary would delete the analysis the matrix exists to record.

A cell is therefore a **polarity token plus an optional qualifier**. The build derives the polarity (`Yes`, `No`, `System`, otherwise qualified) for the colour chip and keeps the full text as the label and tooltip; a chip that carries a qualifier is outlined rather than solid, so the reader is told to read the words and not the colour. Validation checks that a cell is non-empty and that a polarity is derivable — never that the string is in a list. The `role_values` list in `data/vocabularies.json` is replaced by `role_polarity`, which documents the derivation rather than enumerating answers.


## Amendment A3 (5 September 2026) — method modules and partial publication

**Decision (amends §4, §6.1 and §9.5).** Two additions the first three modules made necessary.

A **method module** (`kind: "method"`) publishes a framework rather than coded jurisdiction claims. Module 07, the ROAT regulatory analysis framework, is the first: thirteen stages parsed from the Hub's *ROAT Regulatory Method* sheet by the `stages` parser profile. Because it makes no claim about any jurisdiction, it carries no per-row evidence; instead the module cites the sources its framework rests on at module level, and the build gates those. It has no companion manuscript, so the §9.3 embargo does not apply and it is published immediately.

**Partial publication.** A module may set `evidence_policy: "publish-evidenced-rows"`. A row then publishes when at least one of its core records passes the evidence gate, and records below the gate are dropped from that row's sources rather than silently accepted. A row whose evidence is entirely below the gate is not published as coded: it appears in a **Pending evidence** section naming the primary source it still needs. This replaces the earlier all-or-nothing behaviour, under which a single unusable record held an entire module in draft — Module 03 was held by one blog-level record cited in nineteen rows.
