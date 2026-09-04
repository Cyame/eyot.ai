# Eyot terminology

> **Canonical names**: v5 display names (山海 + 生物). Decision SoT: `.omo/evidence/v5-rename-decisions.md`.
> **Readable Chinese**: [`terminology.zh.md`](terminology.zh.md). Lookup table: [`metaphor-name-table.md`](metaphor-name-table.md).
> Historical 15d (Cthulhu) snapshot: `docs/archive/terminology-15d.md` (read-only; not current).

Code, DB, and API use English identifiers. Portal UI uses the Chinese display names in parentheses. This file is the English glossary for implementers.

---

## Structure (tenant + identity)

### Tenant stack（大陆 → 区域 → 生境）

- **Organization**（大陆）— Top-level isolation unit. Single-tenant default slug `default` is allowed; multi-org is real (org picker + contracts).
- **Namespace**（区域）— Scenario partition inside an Organization (e.g. coding vs social-media). **Not** env. Entity（血脉）lives here so identity and Memory span Workspaces in that region.
- **Workspace**（生境）— Concrete workstream inside a Namespace. Code and table name are `Workspace` / `workspaces`. Instance, Membership, Passage, CentralHub, and Vault live here.
- **迁徙路线** — Portal topology background metaphor (not a DB entity).

### Identity stack（始祖 → 血脉 → 后裔）

From large to small: 始祖 (source) > 血脉 (lineage) > 后裔 (individual).

- **BaseClass**（始祖）— Role archetype: prompt, provider, gene/capability bindings, subagent strategy. Human-created or 演化 from an Entity. Scope `system | org | namespace`. **Five built-in** 始祖（§BaseClasses）.
- **Entity**（血脉）— Per-Namespace identity of a BaseClass, with its own gene/capability bindings and append-only Memory. Can spawn Instances across Workspaces in that Namespace. Can 蜕变 / 演化. Cerebellum uses `is_cerebellum` and is hidden from ordinary 血脉 lists.
- **Instance**（后裔）— Running materialization of an Entity in one Workspace (pod + runtime). Lifecycle ≤ Workspace. **Invariant**: at most one active Instance per `(workspace_id, entity_id)` because `@slug` addresses the Entity.
- **Membership**（智人 / 生物）— Workspace presence with `posx/posy`. Exclusive-FK: user XOR instance. User row = **智人**; instance row = **生物**.
- **NamespaceContract**（成员）— User is a member of a Namespace. No special product noun.

Lab **rank is retired**. There is no intern / researcher / director axis.

### Collaboration and storage

- **Passage**（兽道）— Directed adjacency edge between two Memberships. Messaging is near-neighbor only. CorridorNode dropped.
- **CentralHub**（信号塔）— Per-Workspace collaboration hub. Four regions: Fornix（粮仓）, Frontal Lobe（额叶 / Kanban）, Brainstem（脑干 / schedule）, Cerebellum（小脑）.
- **CerebellumAgent**（小脑）— Product: one cerebellum **Entity** per Namespace; first Workspace creates Entity + Instance, later Workspaces add Instances of the same Entity. Not a topology Membership.
- **Fornix**（粮仓）— Active shared files: pod `shared/` mount; `work/` is private tmp. `FornixFile` is index/cache, not the only human surface.
- **Vault**（标本）— Cold archive per Workspace (DB KV; object store deferred).
- **Memory**（记忆）— Append-only per-Entity log, indexed by kind and time. No `updated_at`.
- **Event**（足迹）— Audit log row.
- **DeployRecord**（诞生记录）— K8s deploy lifecycle (9-step pipeline).
- **Topology**（领地地图）— SVG canvas of Memberships + glow(`loop_status`) + Select/Connect/Move + Passage flow.
- **SystemHub**（星球中枢）— Org-level implicit assistant (description generation / LLM defaults). Code: `system_hub`.
- **IntelligenceProvider**（智能）— LLM provider at org level. Code: `OrganizationProvider`.
- **AiGene**（生物基因）— Capability pack for 血脉 (manifest-inline skills/tools/commands).
- **UserGene**（智人基因）— Permission atom `can_*` with `effect_scope`. Catalog is org-neutral; grant lives on OrganizationContract / NamespaceContract.
- **Permission**（权限）— One `can_*` atom. Never show the raw slug as the operator-facing label.
- **Knowledge**（知识）— Independent table with scope `system | org | namespace | workspace`. Two dimensions: **require** (on gene/capability) and **has** (on BaseClass / Entity / Instance). Override: workspace > namespace > org > system.
- **CapabilityMarket**（能力）— Manageable capability catalog (CRUD), not a read-only view.
- **summon / spawn**（创生）— Verb: create an Entity or Instance.

### Runtime

- **Outer control plane (Eyot)** — Portal + Passage + CentralHub + deploy + observability. HarnessSupervisor is the outer loop registry. Eyot harnesses many role-harnesses; it is **not** a senpi studio.
- **Inner role harness (后裔)** — Each Instance is a harness-agent entry specialized by 始祖. Loop engineering (Boulder / notepad / subagent) lives in-pod. Class of senpi · oh-my-openagent, not Eyot’s outer product.
- **pi runtime** — Preferred sandboxed loop that drives each Instance. Entity overlay serializes to pi AgentConfig. React runtime optional. **Not** Senpi CLI.
- **Ticket entry (far-term)** — Submitter files a ticket; SystemHub provisions and deploys a network; that Workspace’s cerebellum Instance returns the conclusion. Not shipped. See `design.zh.md` §10.3.
- **托管运行时（managed runtime）** — Eyot creates and manages the Instance runtime (current online path: sandboxed pi). Bound at 创生; no hot-swap.
- **外接运行时（attached / external runtime）** — An already-running local or remote runtime bound onto an Instance. Attach does not grant host directory access; directories need explicit grant / mount / file bridge. No hot-swap on the same Instance.
- **LoopState**（心智状态）— Harness state: `loop_status` (6 values), continuation, breakers, checkpoint.
- **InstanceProviderConfig** — Per-Instance LLM config (internal).
- **delivery_mode**（投递模式）— `notify` / `soft_inject` / `wake`.
- **subagent 能力** — In-pod mechanism (pi task tool / Host adapter). **No topology node, no Tunnel type, no Memory/distill chain.** Six built-in ids: `intent` / `architecture` / `quality` / `explore` / `research` / `vision`. Declared per 始祖 via `subagent_strategy`.

---

## BaseClasses（5 built-in 始祖）

Five named 始祖. Six former tool-like roles are subagent capabilities only (no animal name, no Entity card).

Slug = English animal kebab-case (DB unique). Display = i18n. DB does not store a display_name column.

| Slug | Display | Role |
|---|---|---|
| `fox` | 狐狸 | Strategic planner, plan-mode sticky, `.omo` plan writer |
| `beaver` | 海狸 | Solo full-stack coder |
| `sparrow` | 麻雀 | Fast high-throughput coder (do not label as “cheap”) |
| `coyote` | 郊狼 | Autonomous deep worker |
| `lion` | 狮子 | Top-level delegation / monitoring |

### Built-in subagent capabilities (no product name)

| id | Role |
|---|---|
| `intent` | Intent analysis, pre-planner |
| `architecture` | Read-only architecture / hard debugging |
| `quality` | Quality gate: review / approve / reject |
| `explore` | Codebase grep / exploration |
| `research` | External reference + multi-repo + docs |
| `vision` | Visual / media / audio analysis |

---

## Learning actions

| Code | Display | Meaning |
|---|---|---|
| distill | **领悟** | Memory → capability（CapabilityMarket） |
| promote | **蜕变** | Instance → Entity (write-back, including has-knowledge) |
| transmute | **演化** | Entity → BaseClass (new 始祖, org scope) |
| compose | （打包） | N capabilities → 1 AiGene (manifest-inline) |

Two independent chains — not a single four-step ladder:

```
Chain A (content):  Memory ──distill──▶ Capability ──compose──▶ AiGene
Chain B (identity): Instance ──promote──▶ Entity ──transmute──▶ BaseClass
```

---

## Data-layer names

These are persisted types. Product copy uses the display names above.

- **User** — Human auth identity.
- **OrganizationContract** — User membership of an Organization + granted UserGene atoms. No contract → org is invisible.
- **BaseClass** / **Entity** / **Instance** / **Workspace** / **Membership** / **Passage** / **Namespace** / **NamespaceContract**
- **FornixFile** — Index row for a 粮仓 file.
- **VaultEntry** — KV row in 标本.
- **Memory** — Append-only memory row.
- **KnowledgeEntry** / **KnowledgeDimension**
- **InstanceProviderConfig** / **InstanceLoopState** / **InstanceInjectQueue** / **DeployRecord** / **Event**

---

## Concepts (do not conflate)

- **Entity-as-role-identity** — Persistent role identity = BaseClass + own bindings + Memory. It grows; the Instance is not the identity.
- **Instance = materialization** — One running body of that identity in one Workspace.
- **near-neighbor messaging** — Only Passage-adjacent Memberships; no workspace broadcast bus.
- **slash-protocol** — A Turn is a list of Directives (`target`, `cmd`, `args`, `content-ref`).
- **command-registry** — Four families: GLOBAL (`/read` `/list` `/write` `/archive`), PER-PRESET (`manifest.commands`), CONTROL (`/interrupt` `/pause` `/resume` `/status` `/snapshot`), LEARNING (`/distill` `/consolidate` `/reflect`).
- **content-ref** — Scope-prefixed pointer. Hub content uses `hub` (not `blackboard`); instance-local content uses `instance`.
- **composer compartmentalization** — Composer splits a send into per-entity compartments.
- **standing knowledge convention** — System rows `eyot.collab.passage` and `eyot.hub.shared_work` are **policy text**, not live dumps. Neighbor routing uses Passage rows.

---

*Living glossary. Chinese: `docs/terminology.zh.md`. Mapping: `docs/metaphor-name-table.md`. Naming SoT: `.omo/evidence/v5-rename-decisions.md`.*
