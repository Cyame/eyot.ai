# Eyot docs

活文档在本目录；历史 PRD 与旧子系统说明只在 `archive/`。冲突时以设计 SoT 为准，不以 archive 为准。

产品句：**Eyot 是 harness for harness**——外层组网调度，内层每只后裔是按角色装好的 harness 入口。远期工单入口见 [`design.zh.md`](design.zh.md) §10.3。

| 读什么 | 文件 |
|---|---|
| **中文术语（给人读）** | [`terminology.zh.md`](terminology.zh.md) |
| **中文产品设计（给人读）** | [`design.zh.md`](design.zh.md) |
| **中文架构（对照实现）** | [`architecture.zh.md`](architecture.zh.md) |
| 英文术语（代码 / agent） | [`terminology.md`](terminology.md) |
| 代码名 ↔ 界面名对照 | [`metaphor-name-table.md`](metaphor-name-table.md) |
| 系统蓝图 + 当前程序 | [`roadmap.md`](roadmap.md) |
| API 约定 | [`api-architecture.md`](api-architecture.md) |
| 日志 / 事件 / 队列 | [`observability.md`](observability.md) |
| v4 功能收口索引（已完成） | [`prd-v4.md`](prd-v4.md) |
| 归档 | [`archive/README.md`](archive/README.md) |

**设计 SoT**（不在 `docs/` 内）：

- 功能面：`.omo/evidence/audit-product-design.md`
- 命名：`.omo/evidence/v5-rename-decisions.md`
- 当前程序：`.omo/plans/0-5-x-hardening.md`（0.x 总图 `.omo/plans/0x-roadmap.md`）
