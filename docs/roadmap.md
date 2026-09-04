# Eyot System Roadmap & Blueprint

> **Status**: Living document. System goal blueprint + current program.
> **Design SoT**: `.omo/evidence/audit-product-design.md` (function) + `.omo/evidence/v5-rename-decisions.md` (names).
> **Current program**: **0.5.x hardening** — `.omo/plans/0-5-x-hardening.md` (overview `.omo/plans/0x-roadmap.md`).
> **Naming (read these)**: [`terminology.zh.md`](terminology.zh.md) · [`terminology.md`](terminology.md) · [`metaphor-name-table.md`](metaphor-name-table.md).
> **Archived PRDs / old subsystem docs**: [`archive/`](archive/) — do not treat as current direction.
> **Last revision**: 2026-09-02（harness-for-harness + 工单入口远期主路径）.

---

## 0. How to use this doc

| Reader | Read first | Then |
|---|---|---|
| Human / new session | [`terminology.zh.md`](terminology.zh.md) + [`design.zh.md`](design.zh.md) + [`architecture.zh.md`](architecture.zh.md) | `audit-product-design.md` · `0-5-x-hardening.md` |
| Planner | `audit-product-design.md` + `0x-roadmap.md` + this §0.1 / §5 | `audit-cross-reference.md` · `audit-conclusions.md` |
| Worker | The open `0.5.N` proposal + §6 | `audit-implementation.md` as as-is baseline |
| Reviewer | `audit-cross-reference.md` vs target design | That proposal’s Acceptance |

### 0.1 Active program — 0.5.x 既有功能固化

Version track is **0.x** (pre-1.0; first official tag is **1.0**). Already delivered: **0.4.x ≈ v4 functional closure**, **0.5.0–0.5.3 = v5** (naming → definition → UIUX → visual; G7 closed 2026-08-25).

Current work is not a pre-opened slice number. It is running shipped surfaces against the design SoT. The next `0.5.N` / `0.5.N.devM` is opened by the user with a **temporary change + proposal**.

| Layer | Plan | Order |
|---|---|---|
| 0.5.x hardening | `0-5-x-hardening.md` | **中枢 → gene → 协作** |
| Composer multimodal + rich text | `.omo/drafts/composer-multimodal.md` | Near-term; gated on the three layers above. **Not** Session engine v2 |

Far queue: §5.4 / §7.

---

## 1. System goal blueprint

### 1.1 One-sentence product

**Eyot is a harness for harnesses** on Kubernetes: it composes role-shaped **后裔** (each a harness-agent entry with genes/capabilities enough for that role’s work), watches them on a topology, and writes experience back. Operators 创生 **始祖 / BaseClass** → **血脉 / Entity** → **后裔 / Instance**. Far-term: ticket submitters can get a network provisioned by 星球中枢, with the habitat cerebellum closing the job.

### 1.2 Why it exists

Chat agents reset every session. Eyot closes three loops those tools leave open:

| Loop | Without Eyot | With Eyot |
|---|---|---|
| **Identity** | Disposable reply | BaseClass → Entity → Instance |
| **Memory** | Context window only | Append-only Memory on the Entity + 蜕变 / 演化 |
| **Collaboration** | 1:1 flat chat | Shared Workspace + Passage near-neighbor + CentralHub + Topology |

Inherited from `nodeskclaw`, rebuilt lighter and vision-first. **Inner** loop engineering (Boulder / breakers / notepad) is the class of senpi · oh-my-openagent — it lives **inside each 后裔**, specialized per 始祖. Eyot’s outer job is to harness many of those. Each **后裔** is driven by sandboxed **pi** (React runtime optional) — never by Senpi CLI as the Instance driver.

### 1.3 What Eyot is / is not

| Is | Is not |
|---|---|
| Multi-agent **control plane** that harnesses role-harnesses | Generic chatbot / Copilot clone |
| Each 后裔 ≈ a role-specialized harness (loop engineering in-pod) | Equating Eyot’s outer studio with senpi CLI |
| Per-后裔 **pi** sandbox (React optional) | Equating “pi runtime” with “Senpi CLI” |
| Persistent Entity memory + capability write-back | Stateless prompt playground |
| Near-neighbor Passage + glow live-status | Flat group-chat bus |
| K8s-native Instance deploy (orbstack for live test) | Desktop-only toy runtime |
| Single-tenant default; multi-org is real in schema + UI | A copy of the full nodeskclaw 6-registry platform |
| | No-code builder / RAG vector KB (deferred) |
| | Voice gateway day-1 (deferred) |

### 1.4 Ontological stack (locked)

Two axes — never conflate **place** and **being**. Lab rank is **retired**.

**Place**

```
System (logical control plane — not a business table)
  └── Organization（大陆）     tenant boundary
        └── Namespace（区域）  scenario partition (NOT env); Entity lives here
              └── Workspace（生境）  workstream; Instance + Membership + Passage
                                     + CentralHub + Vault live here
```

Example: Namespace `coding` vs `social-media`; inside social-media, Workspaces `wechat-official` / `xiaohongshu`. Entity binds Namespace so scenario identity and Memory span those Workspaces.

**Being**

```
L1 BaseClass（始祖）   role archetype; gene + capability FKs; 5 built-in animals
L2 Entity（血脉）      Namespace-scoped identity + Memory + own bindings
L3 Instance（后裔）    Workspace-scoped running body (pod + runtime + injected knowledge)
```

**Capability vs permission** (different tables):

```
Human → UserGene atoms (can_*) granted on OrganizationContract / NamespaceContract
AI    → AiGene (manifest-inline) + CapabilityMarket entries
```

**Knowledge** is an independent table (`system | org | namespace | workspace`) with require / has dimensions. It is not “JSON stuffed only into Instance.runtime_config as the source of truth”; spawn injects the resolved has-set into the Instance.

**Learning — two chains**

```
Chain A (content):  Memory ──distill / 领悟──▶ Capability ──compose──▶ AiGene
Chain B (identity): Instance ──promote / 蜕变──▶ Entity ──transmute / 演化──▶ BaseClass
```

Single-tenant default remains valid: `1 Org → 1 Namespace → 1 Workspace`, empty start.

**Vault**: DB KV is enough; object store deferred.

**CentralHub**: every Workspace hub has the four regions. Cerebellum product: one `is_cerebellum` Entity per Namespace; first Workspace creates Entity + Instance, later Workspaces add Instances.

### 1.5 Portal surface (shipped)

Canonical routes live under `/orgs/:orgId/…`. Login lands on the org picker (or last org dashboard).

| Surface | Route | Role |
|---|---|---|
| Login / Register | `/login` | Auth |
| Org picker | `/orgs/picker` | Choose 大陆 |
| Dashboard | `/orgs/:orgId` | Org home |
| Org settings / members | `/orgs/:orgId/settings` · `members` | 大陆配置与成员赋基因 |
| 始祖 / 能力 / 基因 / 知识 | `base-classes` · `capabilities` · `genes` · `knowledge` | Org-scoped catalogs |
| 区域 | `/orgs/:orgId/namespaces` · `…/:nsId` | 区域资源：生境 / 血脉 / 后裔 / 成员 |
| 生境 IDE | `/orgs/:orgId/workspaces/:id` | Topology + Composer + Hub + instance controls |
| Account / 403 | `/account` · `/403` | Account; missing `can_*` |
| Legacy URLs | `/namespaces` etc. | Redirect into `/orgs/:orgId/…` |

Topology is the flagship: SVG nodes + glow(`loop_status`) + Select/Connect/Move + Passage particles. CorridorNode is gone.

### 1.6 Runtime spine (shipped)

Two layers — never conflate (locked 2026-07-30):

| Layer | Peer / driver | Eyot role |
|---|---|---|
| **Outer: Eyot** (harness for harnesses) | — | Portal + Passage + CentralHub + deploy + observability; `HarnessSupervisor` is outer loop registry, not a second senpi |
| **Inner: 后裔** (role harness) | Loop engineering class of senpi · oh-my-openagent (in-pod, per 始祖). Driver: **pi** (sandboxed; preferred). React optional | Each Instance is a role-shaped harness entry; overlay → AgentConfig → pi |

| Mechanism | Status |
|---|---|
| Harness Supervisor + 4 breakers + control commands | Shipped |
| pi via Host RPC + Tunnel WS | Shipped (`eyot-instance-host` + `WS /api/v1/tunnel/connect`) |
| 9-step K8s pipeline + DeployRecord + SSE | Shipped |
| Providers + ModelCatalog | Shipped |
| Passage-gated messaging + four command families | Shipped |
| CentralHub four regions + Fornix `shared/`/`work` | Shipped (cerebellum **business** `@` still template — not auto-scope) |
| Tenant + Contract + UserGene atoms | Shipped |
| Knowledge table + require/has | Shipped |
| Learning write-back (领悟 / 蜕变 / 演化) | Shipped |
| `delivery_mode` notify / soft_inject / wake | Shipped |
| 5 animal 始祖 + 6 subagent ids | Shipped |

---

## 2. Iteration model

Product truth lives in the audit SoT + v5 naming SoT. Engineering waves implement a named proposal. After 0.5.3, **do not invent empty slice numbers**.

```
lock design → proposal (user opens 0.5.N) → plan → implement from main
  → tests + evidence → merge main → deploy orbstack → human inspect
```

| Artifact | Role |
|---|---|
| `.omo/evidence/audit-product-design.md` | Functional design SoT |
| `.omo/evidence/v5-rename-decisions.md` | Naming / abstraction SoT |
| `docs/roadmap.md` (this file) | Blueprint + program status |
| `docs/terminology*.md` | Living names |
| `.omo/plans/0-5-x-hardening.md` | Current program frame |
| `.omo/plans/archive/` | Finished waves (read-only) |
| `docs/archive/` | Historical PRDs / 15d names / pre-v4 subsystems |

**Generations (for orientation only)**

| Gen | Intent | Status |
|---|---|---|
| v1–v3.4.1 | Historical product slices | Archived → `docs/archive/` |
| v4 ≈ 0.4.x | Functional closure | **Done** |
| v5 = 0.5.0–0.5.3 | Names, definition, UIUX, visual | **Done** (G7 2026-08-25) |
| 0.5.x | Harden what shipped | **Active** |
| Later | Session engine v2, Voice, … | §7 |

Code identifiers are the English stack (Organization / Namespace / Workspace / BaseClass / Entity / Instance). v5 changed UI copy and the five animal slugs, not API paths.

---

## 3. Current state snapshot (2026-09-01)

### 3.1 Shipped

Foundation P0–P15 plus v4 (tenant, genes, knowledge, clone, Fornix, learning write-back, harness collab, meetings) plus v5 (5 始祖, rank retired, subagents, visual). Application version: `0.5.3.dev1`.

Honest remaining work is **hardening**, not “rebuild tenant tables”:

- Cerebellum **business** path for `@` without Passage is still template / notify-only.
- Composer multimodal + rich text is gated on 中枢 → gene → 协作.
- Redis-backed rate limit / task queue, object-store Vault, Voice, Session engine v2 remain deferred.

### 3.2 Live test environment

Orbstack namespace `eyot` is the persistent human inspection environment. Every implementation wave that changes backend / portal / deploy **must** end with `scripts/deploy-to-orbstack.sh` (§6). See `.omo/evidence/orbstack-operations.md`.

---

## 4. Target architecture (digest)

Authoritative detail: `audit-product-design.md`. This section is orientation only.

- Soft delete everywhere; Partial Unique Indexes for uniqueness.
- Membership exclusive-FK (user XOR instance); Passage M↔M only.
- Memory append-only (no `updated_at`).
- Auth: `require_permission(user, can_*, org/ns/ws ids)` — UserGene atoms on contracts, not static roles.
- Entity overlays serialize toward **pi AgentConfig**. Boulder stays on the control plane; no workflow-gene.

Default live shape:

```
orbstack K8s  namespace eyot
  eyot-backend   API + harness + deploy controller
  eyot-portal    operator UI
  eyot-postgres  live-env DB (not local-pgvector eyot_dev)
```

---

## 5. Wave status & queue

### 5.1 Completed (archive only)

P0–P15 foundation, PRD-v1…v3.4.1, v4.0–v4.10, v5.0–v5.3. Plans: `.omo/plans/archive/` and `.omo/plans/archive/0x-gen/`.

### 5.2 Version track

| Track | Intent | Status |
|---|---|---|
| 3.5.x / 3.6 | Historical | Archived |
| 4.x / 0.4.x | Functional closure | Done |
| 5.x / 0.5.0–0.5.3 | Naming → visual | Done |
| **0.x (Eyot)** | **Only active track** | 0.5.x hardening |

**Working agreement:** v4 closed the main functional loop; v5 visual is accepted. Next is hardening 中枢 / gene / 协作 — not another visual generation, and not Composer multimodal first.

### 5.3 Now — 0.5.x 固化

| Slot | Spec | Notes |
|---|---|---|
| **0.5.x 固化** | `0-5-x-hardening.md` | 中枢 → gene → 协作. Version number opened by proposal |
| Composer multimodal + rich text | `.omo/drafts/composer-multimodal.md` | Near-term; hard gate = row above stable. ≠ Session engine v2 |

### 5.4 Near backlog (needs its own proposal)

| Theme | Note |
|---|---|
| Capability hub assist / Gene LLM real | Not auto-in-scope for gene hardening |
| Session engine v2 | `.omo/drafts/session-engine-v2.md` |
| 外接后裔运行时 | Attach local/remote pi; no hot-swap; explicit directory grant |
| Voice / channels / OTel / backup / S3 | Selective nodeskclaw parity |

---

## 6. Hard process rules

### 6.1 Deploy to orbstack after every implementation wave

1. Commit on the feature branch → merge to `main` (fast-forward when possible).
2. `bash scripts/deploy-to-orbstack.sh`.
3. Verify pods Ready; smoke on the live cluster.
4. Leave namespace `eyot` running.
5. Record evidence under `.omo/evidence/` when material.

Forbidden: “code done” without orbstack; ad-hoc live SQL as a fix; `kubectl delete namespace eyot`.

### 6.2 Other non-negotiables

- Soft delete only; Partial Unique Indexes.
- Alembic autogenerate; never hand-written fake revision IDs.
- No emoji in product / UI / docs / commits without explicit permission; icons via `lucide-react`.
- i18n for user-visible strings (`zh-CN` / `en`).
- pytest never touches shared `eyot_dev` on `local-pgvector`.
- Persistent Fix Policy: code → commit → image → rollout.

### 6.3 Branch workflow

`main` is source of truth. Each wave: `git checkout main && git checkout -b feat/<kebab>`.

---

## 7. Long-term directions (not active waves)

1. **Session engine v2** — lighter store; multimodal first-class; Tunnel-class transport. Draft: `.omo/drafts/session-engine-v2.md`. Do not mix with the gated Composer multimodal slice.
2. **工单入口** — 用户分权：提交工单 → 星球中枢生成/部署生境网络 → 需求交给生境小脑 → 其它角色 harness 协同 loop engineering → 小脑回结论。可作远期主入口。见 `design.zh.md` §10.3。未锁 schema 前不开工。
3. **外接后裔运行时** — bind an already-running local/remote runtime at 创生 / attach. Instance remains the only domain execution body. See `v5-rename-decisions.md` §7.2.
4. **Selective nodeskclaw surface parity** — Voice, extra Knowledge scopes, multi-runtime, etc., only after the control plane is solid.
5. **Plan hygiene** — finished plans are immutable; drift goes to evidence.

---

## 8. Document map

See [`README.md`](README.md) in this folder.

### External references

| Project | Layer |
|---|---|
| nodeskclaw | Product ancestor |
| oh-my-openagent (senpi / oh-my-pi) | **Inner** role-harness peer (loop engineering in-pod; pin tags) |
| pi (`@mariozechner/pi-coding-agent`) | **Instance / 后裔** driver |
| jcode | Collab / delivery semantics (soft interrupt, handoff) — not a product clone |

---

## 9. Decision log (roadmap-level)

| Date | Decision |
|---|---|
| 2026-07-28 | Persistent Fix + orbstack rules; P15d naming lock |
| 2026-07-29 | Roadmap canonicalized here; Namespace = scenario partition; Vault = DB KV |
| 2026-07-30 | Runtime spine: each 后裔 driven by **pi** (not Senpi CLI). Later reading of “Workspace ≈ senpi” corrected 2026-09-02 |
| 2026-08-01 | Design correction → v4; `audit-product-design.md` SoT |
| 2026-08-02 | OrgContract + atomic UserGene; org picker; Knowledge override |
| 2026-08-07 | v5 generation: 5 始祖, 6 subagent ids, 始祖/血脉/后裔, 大陆/区域/生境, rank retired |
| 2026-08-17 | Project rename Cocoa → Eyot; version track 0.x |
| 2026-08-25 | 0.5.3 G7 closed; program = 0.5.x hardening |
| 2026-08-27 | Record 外接后裔运行时 as a far direction |
| 2026-09-01 | Living `docs/` aligned to v5 names + 0.5.x; Chinese glossary added |
| 2026-09-02 | Eyot = harness for harnesses; each 后裔 is a role-shaped harness entry. Far-term ticket entry: 中枢搭网、小脑收口. Do not equate outer studio with senpi |

*Next update trigger: user opens a 0.5.N hardening proposal, or Composer multimodal is explicitly ungated.*
