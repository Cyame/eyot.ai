# Eyot Metaphor Name Table

> **Canonical mapping**: code/DB/API English → Portal Chinese (山海 + 生物).
> Decision SoT: `.omo/evidence/v5-rename-decisions.md`.
> Readable Chinese: [`terminology.zh.md`](terminology.zh.md). English glossary: [`terminology.md`](terminology.md).
> Historical 15d table: `docs/archive/metaphor-name-table-15d.md` (read-only).

Backend uses the left column. UI uses the middle column via i18n. DB does **not** store display_name columns.

---

## Name table

### Tenant + identity + collaboration

| Backend (code/DB) | Frontend | Description |
|---|---|---|
| **Organization** | **大陆** | Top-level isolation unit |
| **Namespace** | **区域** | Scenario partition (not env) |
| **Workspace** | **生境** | Concrete workstream (`workspaces` table) |
| （场景意象） | **迁徙路线** | Portal topology background |
| **BaseClass** | **始祖** | Role archetype; 5 built-in |
| **Entity** | **血脉** | Per-Namespace identity + Memory |
| **Instance** | **后裔** | Running pod; ≤ 生境; at most one active per `(workspace, entity)` |
| **Membership** user | **智人** | Human presence on the canvas |
| **Membership** instance | **生物** | AI presence on the canvas |
| **NamespaceContract** | **成员** | User is a member of a 区域 |
| **OrganizationContract** | （大陆成员 / 授权） | Org membership + UserGene grants |
| **Passage** | **兽道** | Topology adjacency edge |
| **CentralHub** | **信号塔** | Collaboration hub; cerebellum 1:1 product-wise |
| **Cerebellum** / cerebellum Entity | **小脑** | Per-Namespace system 血脉 (`is_cerebellum`) |
| **Fornix** | **粮仓** | Active shared files (`shared/`) |
| **Vault** | **标本** | Cold archive (DB KV) |
| **Memory** | **记忆** | Append-only per-Entity log |
| **Event** | **足迹** | Audit log row |
| **LoopState** | **心智状态** | Harness runtime state |
| **DeployRecord** | **诞生记录** | K8s deploy record |
| **Topology** | **领地地图** | Workspace canvas |
| **SystemHub** | **星球中枢** | Org-level entry (now: short session; far-term: ticket → provision a network) |
| **OrganizationProvider** | **智能** | Org LLM provider |
| **AiGene** | **生物基因** | Capability pack for 血脉 |
| **UserGene** | **智人基因** | Human permission atom |
| **Knowledge** | **知识** | Scoped knowledge table (require / has) |
| **CapabilityMarket** | **能力** | Capability catalog |

### Built-in 始祖

| Slug | Display | Role |
|---|---|---|
| `fox` | **狐狸** | Strategic planner |
| `beaver` | **海狸** | Solo full-stack coder |
| `sparrow` | **麻雀** | Fast high-throughput coder |
| `coyote` | **郊狼** | Autonomous deep worker |
| `lion` | **狮子** | Delegation / monitoring |

### Subagent capabilities (no display name, no topology)

| id | Role |
|---|---|
| `intent` | Intent analysis |
| `architecture` | Read-only architecture / debugging |
| `quality` | Quality gate |
| `explore` | Codebase exploration |
| `research` | External reference / docs |
| `vision` | Visual / media analysis |

### Learning verbs

| Backend | Display | Description |
|---|---|---|
| distill | **领悟** | Memory → capability |
| promote | **蜕变** | Instance → Entity |
| transmute | **演化** | Entity → BaseClass |
| spawn / summon | **创生** | Create Entity or Instance |

---

## Design rules

1. **Slug** is the DB identifier. **Display** is an i18n key. No display_name columns.
2. Backend code uses backend names. Frontend copy uses display names.
3. If a product concept is not in this table, it is not named yet.
4. CorridorNode is gone. Edges are Membership ↔ Membership.
5. Five named 始祖 only. Subagent capabilities are ids, not animals.
6. v5 does not rename code / DB / API paths. Those already use Organization / Namespace / Workspace / BaseClass / Entity / Instance.
7. Rank is retired. Do not reintroduce intern / researcher / director as a product axis.

---

*Mapping table. Chinese prose: `docs/terminology.zh.md`.*
