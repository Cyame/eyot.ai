# Eyot 架构设计

技术侧。产品「为什么」见 [`design.zh.md`](design.zh.md)；名词见 [`terminology.zh.md`](terminology.zh.md)。API 信封 / 分页惯例见 [`api-architecture.md`](api-architecture.md)。

本文对照 **当前代码**（`eyot-backend` / `eyot-portal` / `eyot-instance-host` / `eyot-artifacts`）整理。和产品设计不一致的地方单独写在 §12，不当成已经落地。

---

## 1. 全景

产品意图：**harness for harness**（见 [`design.zh.md`](design.zh.md)）。实现上仍是两层，但内层不是「通用 agent 二进制」，而是 **按角色装好的 harness**：

| 层 | 代码落点 | 含义 |
|---|---|---|
| **外层 Eyot** | Portal + FastAPI + 兽道投递 + CentralHub + DeployService + HarnessSupervisor | 组网、调度多只角色 harness、观测 |
| **内层后裔** | 每个 Instance pod：`eyot-instance-host` + 始祖镜像资产 + `pi --mode rpc` | 角色 harness 入口；基因/能力够干这份活；循环结构按始祖特化 |

控制面自己的 `HarnessSupervisor` 是 **外层** 对每只后裔 loop 的登记与熔断，不是「Eyot 自己再当一只 senpi」。后裔 pod 里的 Boulder / notepad / subagent 才是角色份内的 loop engineering。

```
  浏览器
    │  REST + SSE（Composer / 部署进度）
    ▼
  eyot-portal          React 19 + Vite + Zustand
    │  /api/v1  （dev 走 Vite 代理，K8s 走 nginx）
    ▼
  eyot-backend         FastAPI :4510
    │
    ├─ PostgreSQL      领域真相（软删）
    ├─ 进程内          Harness 注册表 / Composer turn 队列 / 限流 / TaskQueue
    │
    └─ WS /api/v1/tunnel/connect   ◄── 出站拨号
              ▲
              │  Host 带着 instance_id + proxy_token 来鉴权
              │
        eyot-instance-host (Node)
              │  JSONL stdin/stdout
              ▼
            pi --mode rpc          后裔循环

  DeployService ──► K8s（每后裔独立 namespace + 1+5 始祖镜像）
```

控制面自己也跑在 K8s `eyot` 命名空间：`eyot-backend` / `eyot-portal` / `eyot-postgres`。后裔 **不** 和它们同命名空间，由后端用 `kubernetes_asyncio` 另建。

---

## 2. 仓库怎么切

| 目录 | 职责 |
|---|---|
| `eyot-backend/` | 唯一 API、领域模型、鉴权、Harness、蒸馏、部署控制器。构建上下文在这里，不在仓库根。 |
| `eyot-portal/` | 操作员控制台。不持有业务真相；JWT + `X-Organization-Id` 调 API。 |
| `eyot-instance-host/` | 后裔 sidecar：Tunnel 客户端、把 pi 事件翻译成中立信封、健康检查。 |
| `eyot-artifacts/` | 控制面与后裔的 Dockerfile、K8s 清单。 |
| `scripts/deploy-to-orbstack.sh` | 幂等部署到 orbstack；改运行时必须走这条，不在 live DB 上打补丁。 |

本地：`./dev.sh` 起后端 4510 + 前端 5173。测试库是 `eyot_test_template` 克隆，**禁止**碰共享 `eyot_dev`。

---

## 3. 后端分层

按调用方向，而不是按历史 Phase 名：

```
app/api/v1/*          路由。聚合在 api/v1/router.py，前缀 /api/v1
app/schemas/          Pydantic 进出站（snake_case = 线上字段）
app/core/             领域规则：鉴权、路由指令、overlay、知识注入、Harness
app/services/         有外部边界的事：K8s 部署、Tunnel hub、LLM、clone、fornix 同步
app/models/           SQLAlchemy。一律混入 BaseModel（id / timestamps / deleted_at）
app/agent_runtime/    进程内 Boulder 循环（本地 / 旧 K8s poll 路径，见 §8.3）
```

请求中间件（外→内）：RequestID → Logging → CORS → Auth（抽 JWT）→ RateLimit（内存，600 次 / 60s，只计 `/api/`）。

生命周期（`app/main.py`）：loguru、进程级 `EYOT_API_TOKEN`（注入后裔 pod）、内存 TaskQueue、daily-report 调度、HarnessSupervisor 再水合、`ensure_system_seeds`（Alembic 只管 schema，种子数据幂等注入）。

错误统一信封：`error_code` / `message_key` / `message` / `details` / `request_id`。业务代码抛 `EyotError` 子类，不手写 `HTTPException`。

---

## 4. 数据：地方轴 × 生命轴

PostgreSQL。软删 + Partial Unique Index（`deleted_at IS NULL`）。Alembic 基线已压平；之后增量必须 `--autogenerate`。

### 4.1 地方

```
organizations
  └── namespaces                    场景分区，不是 env
        └── workspaces
              ├── memberships       user_id XOR instance_id；posx/posy 唯一
              ├── passages          Membership ↔ Membership，双向都算邻居
              ├── central_hubs 1:1
              │     ├── fornix_files
              │     ├── frontal_lobe_kanbans
              │     ├── brainstem_schedules
              │     ├── vaults / vault_entries
              │     └── cerebellum_agents   ← 遗留表，见 §12
              ├── instances
              └── meetings / participants
```

`instances` 有 `(workspace_id, entity_id)` 活跃唯一约束——实现了「同生境同血脉最多一个后裔」。

### 4.2 生命

```
base_classes                    slug = fox|beaver|sparrow|coyote|lion
  ├── base_class_ai_genes
  └── base_class_capabilities

entities                        namespace_id + preset_slug（软引用，无 FK）
  ├── entity_ai_genes           血脉自有绑定，不和始祖做运行时并集
  ├── entity_capabilities
  ├── memories                  append-only
  └── is_cerebellum             每区域最多一条活跃小脑血脉（partial unique）

instances
  ├── instance_loop_states      心智；与 Instance.status（基础设施）正交
  ├── instance_provider_configs
  ├── instance_inject_queue     投递三态的持久下行
  └── deploy_records
```

Overlay（`app/core/overlay.py`）：`system_prompt` 血脉非空则替换始祖；**能力 / 基因只认血脉 junction**，不和始祖模板做 union。产品要求这些绑定 **够这份角色把一串任务做完**——现在校验主要在 spawn 时的 knowledge has⊇require 提示，并没有「角色任务完备」的硬门；那是产品不变量，不是已实现的检查器。`config_override` 不再当 skills 第二真源。

### 4.3 授权与目录

- `user_genes`：原子 `can_*`，带 `effect_scope`，**不表示谁拥有**
- `organization_contracts` + `organization_contract_genes`：加入大陆
- `namespace_contracts` + `namespace_contract_genes`：在大陆授权上并集细化
- `user_user_genes`：遗留全局 junction，日常租户授权不走这里
- `ai_genes.manifest`：技能包内联；无 `ai_gene_capabilities` 表
- `capability_market_entries`：能力目录 CRUD
- `knowledge_entries` / `knowledge_dimensions`：`system|org|namespace|workspace`，NULL id 用 sentinel 做唯一

Membership **不是**鉴权源。

---

## 5. 鉴权怎么跑

1. 登录发 JWT（`Authorization: Bearer`）。
2. Portal 每次请求带 `X-Organization-Id`（Zustand 里的 `currentOrgId`）。
3. 路由层 `require_permission(user, "can_*", organization_id / namespace_id / workspace_id)`：从资源向上解析祖先，在对应 Contract 展开的原子里查找。
4. `is_super_admin` 只做平台破例。

没有大陆合同，或原子数为 0：这座大陆对你不可见。静态 `role` 列已物理删除。

内部后裔调用走另一套：`/api/v1/internal/*` 用进程 `EYOT_API_TOKEN`（`secrets.compare_digest`），给 Host / 旧 poll 循环上报事件、拉控制、写粮仓，不给浏览器。

Tunnel 鉴权是第三套：Host 第一条帧 `auth`，payload 里 `instance_id` + `proxy_token`，对上 `instances.proxy_token` 才 `auth.ok`。

---

## 6. 一条人话怎么落到后裔

这是控制面最重要的运行时路径。

```
ComposerPanel
  → 前端 slash-parser.ts（与 Python parse_turn 对测）
  → POST /workspaces/{id}/composer/turns  （或等价 stream 入口）
  → composer_turns.start_turn
       │
       ├─ Tunnel 已连接该 instance？
       │     是 → tunnel_hub.send_chat_request  （chat.request）
       │           Host ChatBridge → PiRpc
       │           上行 chunk/done/error/activity
       │           进程内 turn 队列 → SSE 给浏览器
       │
       └─ 否 → stub / LLMClient 兜底（via_tunnel=false）
  → 同时：directive_router
       parse_turn → 按指令族分流
         GLOBAL / PER-PRESET → message_router（兽道门）
         CONTROL             → HarnessSupervisor
         LEARNING            → distill 等
```

`message_router`：活跃 Passage（任一方向）才投递给目标后裔。没有兽道：**不**代理到目标 Host，走小脑模板回复 + `notify` 协作任务，并记 `messaging.delivery_blocked`。这和产品设计一致；小脑「真业务」仍是模板。

投递默认：loop `running` → `soft_inject`；空闲 / 无状态 → `wake`。行写入 `instance_inject_queue`，Host 轮询 ACK。`notify` 只留线索。硬中断仍是 `/interrupt`。

邻居列表：`GET /workspaces/{id}/mention-candidates` 只返回兽道邻居；用户仍可打出非邻居 `@`，投递阶段再进小脑路径。

---

## 7. Harness

`HarnessSupervisor` 是 **进程内单例**：内存 registry（continuation / token / checkpoint）+ 事件 handler。handler **不写库**；DB 变更由 API 层 `handle_*` 在自己的事务里做。启动时从 `instance_loop_states` 把 `running` 行再水合。

`Instance.status`（creating / deploying / running / failed…）和 `LoopStatus`（idle / running / paused / interrupted / completed / failed）正交。熔断绊住循环 **不** 去改基础设施 status。

控制命令：`/interrupt` `/pause` `/resume` `/status` `/snapshot`。四路熔断在 `harness_breakers`。Boulder snapshot / notepad 字段在 loop_state 上。

限制（实现事实）：registry 不跨进程。后端 replica=1（orbstack 清单也是 1）。多副本前必须把 turn 队列、限流、Harness 注册表外置。

---

## 8. 后裔 runtime

### 8.1 主路径（线上）

Instance 镜像：`eyot-instance-base` + 五个始祖薄层（`fox` / `beaver` / `sparrow` / `coyote` / `lion`）。`DeployService._resolve_instance_image` 按 `preset_slug` 解析，禁止再写死单一 `eyot-instance:{version}`。

Pod 里入口是 Host，不是 Python `agent_runtime`：

1. `materializeAgentBundle` 把始祖/血脉配置落到工作区
2. 出站连 `ws://…/api/v1/tunnel/connect`
3. `PiRpc` spawn `pi --mode rpc --no-session`
4. `ChatBridge` 把 pi 的 `message_update` / `text_delta` / `agent_end` **消化掉**，只向 Tunnel 发中立类型

信封（两端枚举必须 1:1，`protocol.py` ↔ `protocol.ts`）：

下行：`auth.ok` / `auth.error` / `chat.request` / `control` / `ping`  
上行：`auth` / `chat.response.chunk|done|error|activity` / `pong`

纪律（已在 v5.1 清过泄漏）：错误码禁止带 runtime 名（`host_*` / `turn_rejected`）；`control` 用 `interrupt|pause|resume`；done 不带 `finish_reason`。pi 命令名留在 Host 内部。

### 8.2 创生与注入

创生时 `knowledge_spawn` 把 has 知识解析进 `runtime_config["knowledge"]`；缺 require 只提示，不阻断。知识真源仍是 `knowledge_entries` 表，配置里那份是注入快照。

粮仓：pod `shared/` 与 DB `FornixFile` 双写（`fornix_sync`）；失败回滚，不静默单边成功。`work/` 是私有 tmp，Host `hub_write` 可以写 work 但不镜像成共享行。

### 8.3 还在仓库里的旁路

| 路径 | 何时 | 说明 |
|---|---|---|
| Composer stub / `LLMClient` | Tunnel 未连上或 `send` 失败 | `composer_turns` 明确 fallback |
| `app/agent_runtime/loop.py` | 本地模式 `emit()`；K8s 模式 HTTP `internal/events` + `control/poll` | 旧 Boulder 进程内循环，测试仍覆盖；**不是**当前 pod 主入口 |
| `python -m app.agent_runtime` | 历史 pod 入口 | 现网镜像走 Host |

产品设计说「每个后裔由 pi 驱动」。实现上：**连上 Tunnel 就是这句话**；没连上则控制面用 LLM/stub 把 Composer 聊完，后裔身体不在场。

外接已运行的 pi（attach）**没有**实现。Instance 行上也没有 runtime 类型列可热切换——符合「绑定后不热切换」，但 attach 语义本身尚未建模。

---

## 9. 部署管线

`DeployService.execute_deploy_pipeline` 九步，进度进 `deploy_records`，Portal SSE `GET /deploy/deploy-progress/{id}`：

`ensure_namespace` → `configmap` → `secret` → `pvc` → `deployment` → `service` → `network_policy` → `healthz_watch` → `status_update`

后裔 namespace 与控制面 `eyot` 分离。清单骨架在 `eyot-artifacts/k8s/instance/`。失败 teardown。`proxy_token` 写入 Secret 再进 Host 环境。

控制面部署：`scripts/deploy-to-orbstack.sh` 要求 kubectl context = `orbstack`，禁止删 `eyot` namespace。

---

## 10. Portal

React Router 路径式租户：`/orgs/:orgId/...`。`session.ts` 只持久化 `token` / `user` / `currentOrgId`；当前区域从 URL 推，不进 localStorage。

`lib/api.ts` 统一塞 JWT 和 `X-Organization-Id`。i18n（zh-CN / en）出显示名；代码里仍是 Entity / Workspace。

生境 IDE（`WorkspaceIdePage` + `IdeShell`）：领地地图（`TopologyPage`，live-status 轮询）、Composer、粮仓/标本、会议/调度、后裔面板。发光由 `loop_status` → `app/core/glow.py` 映射，后端 `GET /workspaces/{id}/live-status` 聚合。

slash 语法前后端双份实现，有对测。这是协议，不是 UI 独有。

---

## 11. 学习写回（代码入口）

| 产品动作 | 实现 |
|---|---|
| 领悟 | `POST /learning/entities/{id}/distill`；slash `/distill` 走启发式同一套 mapping |
| 蜕变 | `POST /learning/entities/{id}/promote`（含 has 聚合） |
| 演化 | `POST /learning/entities/{id}/transmute` |
| 打包 | `POST /learning/capabilities/combine` → AiGene manifest 内联 |
| 实例侧草稿 | `POST /learning/instances/{id}/reap`（instance-private） |

蒸馏引擎：`AggregatingDistiller` 启发式默认；`LLMDistiller` 可换。Gene「真 LLM 蒸馏」仍是远期。

---

## 12. 实现相对设计：已经对齐 / 尚未对齐

**对齐的**

- 血脉 `namespace_id`；后裔 `(workspace, entity)` 唯一
- 兽道门 + 无通道不静默代理
- UserGene 原子 + Org/NS Contract；无 role 列
- 知识独立表 + spawn 注入；overlay 能力只认血脉
- 小脑 `Entity.is_cerebellum` + 每 NS 一条
- Tunnel 中立信封；5 始祖 slug；rank 列已不存在
- 投递队列 + `delivery_mode`
- 软删、种子与 schema 分离

**尚未对齐或仍双轨**

| 项 | 现实 |
|---|---|
| 小脑真业务 `@` | 模板 + notify-only |
| `cerebellum_agents` 表 | 仍在；workspace 创建会看遗留行；`cerebellum_migration.py` 负责迁到 Entity |
| Composer 无 Host | stub/LLM，不是 pi |
| `agent_runtime` 包 | 仍可跑，不是 Host 主路径 |
| 进程内状态 | turn 队列、限流、Harness registry、TaskQueue 均内存；重启丢失；单 replica |
| Redis / OTel / S3 标本 | 协议留缝，未换生产后端 |
| 外接 runtime | 无 attach API / 无目录授权面 |
| 工单入口 | 无工单表 / 无中枢搭网器 / 小脑不回「任务结论」给提单人 |
| 多模态 | Composer 仍是文本 turn |
| OpenAPI `openapi_tags` | 构造函数里仍是一份过时短列表；真实 tags 以各 router 为准 |

---

## 13. 远期对架构的约束（现在就要守）

这些还没做，但现在改协议时不能把门焊死：

1. **Tunnel 保持 runtime 中立。** 新语义加字段，不加「pi 专用类型」。会话引擎 v2 的多模态要走这个窗口，不能事后把 base64 塞进 `text`。
2. **不要预建 runtime 插件平台。** 第二种 runtime 用第二个 Host 实现出现，再抽最小差。
3. **Instance 仍是唯一执行体。** attach 外接 pi 时加绑定，不新造领域类型；目录访问单独授权。工单搭网也是创生后裔，不发明第二种身体。
4. **多副本之前** 必须先外置：Tunnel hub、Composer turns、inject 轮询亲和、限流、Harness registry。现在默认 replica=1 是有意识的。
5. **Composer 多模态** 挂现有 SSE/Tunnel 形状即可；不要和 Session store 整包重建绑在一次 diff 里。
6. **工单入口（未实现）** 应复用：DeployService 九步、兽道、`delivery_mode`、小脑后裔收口、智人基因原子。不要为提单人再做一条广播总线。星球中枢若升成搭网器，仍通过现有组织/生境 API 创建资源，结论从小脑后裔回，不从 SystemHub 短会话冒充「任务结束」。
7. **角色 harness 特化** 落在始祖镜像 + `subagent_strategy` + 血脉 gene/capability，而不是运行时再选「引擎皮肤」。

---

## 14. 关键代码索引

| 主题 | 路径 |
|---|---|
| API 聚合 | `eyot-backend/app/api/v1/router.py` |
| 鉴权 | `app/core/permissions.py` |
| Overlay | `app/core/overlay.py` |
| 指令 / 近邻 | `app/core/directive_router.py` · `message_router.py` |
| Composer / Tunnel 调度 | `app/core/composer_turns.py` · `services/tunnel/` |
| 注入队列 | `app/core/inject_queue.py` |
| Harness | `app/core/harness_supervisor.py` |
| 部署 | `app/services/deploy_service.py` |
| Host | `eyot-instance-host/src/{main,protocol,chat-bridge,pi-rpc,tunnel-client}.ts` |
| Portal 会话 | `eyot-portal/src/stores/session.ts` · `lib/api.ts` · `router/index.tsx` |
| 种子 | `app/core/seeds.py` · `builtin_presets.py` |

---

*架构随实现更新。产品意图以 `design.zh.md` 为准；本文以仓库里的代码为准。*
