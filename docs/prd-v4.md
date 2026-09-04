# PRD-v4 — Functional Closure (Index)

> **Status**: Historical index. v4 functional closure **is done** (v4.0–v4.10 + v4.9.5 closeout).
> **Design SoT**: `.omo/evidence/audit-product-design.md`
> **Executable plans**: `.omo/plans/v4-*.md` (archived with the wave)
> **Prior PRDs**: `docs/archive/` (v1–v3.4.1)
> **After v4**: v5 = 0.5.0–0.5.3 (delivered). **Current program = 0.5.x hardening** — `.omo/plans/0x-roadmap.md` + `0-5-x-hardening.md`

This file is the **product index** for the v4 generation. Normative design lives in the audit pack. Do not duplicate full schema here.

Current direction and names: [`roadmap.md`](roadmap.md) · [`terminology.zh.md`](terminology.zh.md).

## Locked product intents (D1–D16)

See `.omo/evidence/audit-conclusions.md` §一. 缺陷评审决议见 `audit-v4-design-review.md` 附录 B；执行层交叉验证见附录 C + `.omo/evidence/v4-0-migration-spec.md`.

## Waves

| Wave | Plan |
|---|---|
| Schema / auth / scope | `v4-0-schema-auth-scope.md` |
| Capability & gene CRUD | `v4-1-capability-gene-crud.md` |
| Knowledge | `v4-2-knowledge-system.md` |
| Tenant + Dashboard + cerebellum | `v4-3-tenant-dashboard-ia.md` |
| Clone | `v4-4-clone-ops.md` |
| Fornix / hub UI | `v4-5-fornix-hub.md` |
| Learning write-back | `v4-6-learning-writeback.md` |
| Harness collaboration | `v4-7-harness-collab.md`（D9：delivery_mode + soft inject + hub/topology） |
| Meetings / schedules | `v4-8-meetings-schedules.md` |
| Closure gate | `v4-9-closure-gate.md` |
| Default prompt polish | `v4-10-default-prompts.md` |

## Closure rule

After v4.9, no intentional functional holes remain versus `audit-product-design.md` except items explicitly deferred (v5 visual, §7 far queue, cerebellum **business** `@`, Composer multimodal). **v4.10** was post-closure prompt polish.
