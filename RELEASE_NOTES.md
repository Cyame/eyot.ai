# Release Notes

All notable changes to **Eyot** are documented here.

**Convention.** Tags are cut per `x.x` (major.minor). Development builds such
as `0.5.2.dev1` do **not** get their own sections — they fold into the section
for the version they will become. The first tagged release is **1.0**.

---

## Unreleased — targeting 1.0

### 2026-09-05 — 0.5.4.dev1（依赖心跳与部署流故障可见性）

- 新增 `GET /api/v1/system/dependencies`：可注册的依赖检查原语（首版 database + kubernetes），JWT-only 鉴权，pg 挂时端点仍能 200 报告。
- 全局 `ServiceWatchdog` 轮询心跳，依赖异常时非阻塞 banner + 重试。
- 部署流：`ImagePullBackOff`/`ErrImagePull` 秒级失败；SSE ping + nginx `proxy_read_timeout 300s`；DeployProgressFloat 区分连接中断 / 记录消失，终态可重试部署。
- 版本同步为 **0.5.4.dev1**。


### 2026-08-17 — Cocoa → Eyot (project rebirth)

The project was **renamed from *Cocoa* to *Eyot*** and reset for a clean
pre-1.0 trajectory.

- **Rename**: product, repo namespace, packages (`eyot-backend` /
  `eyot-portal` / `eyot-instance-host`), and directories.
  The acronym **E·Y·O·T = Entity · Yoke · Organization · Topology**.
- **Version reset**: 5.2.1 → **0.5.2.dev1** (pre-1.0; tags will start at 1.0).
- **0.x generation framing**: 版本轨重置为 **0.x pre-1.0**，正式 tag 从 1.0 起；MINOR 每完成一个切片 +1。
  已交付切片等价映射：**0.4.x ≈ v4 功能收口**、**0.5.0 = v5.0 命名**、**0.5.1 = v5.1 定义**、
  **0.5.2 = v5.2 UIUX**、**0.5.3 = v5.3 视觉**（G7 2026-08-25 关闭）。**当前程序 = 0.5.x 固化**。
- **Alembic reset**: the 35 incremental migration files were squashed into a
  single **schema-only baseline** (`Base.metadata.create_all`).
- **Seeding moved to the app layer**: a fresh database is now populated at
  startup by an idempotent seeder (default 大陆 + 区域, 5 built-in 始祖,
  the internal 小脑, 16 `can_*` permission atoms, `cmd-*` capabilities),
  mirroring the previous migration-seeded data. Alembic stays schema-only.
- **Internal identifiers**: `COCOA_*` env vars → `EYOT_*`, DBs
  `cocoa_dev`/`cocoa_test_*` → `eyot_dev`/`eyot_test_*`, in-cluster DNS,
  knowledge slugs, `CocoaError` → `EyotError`.
- **Tests**: full backend suite green (**1047 passed / 1 skipped**);
  portal lint + build + **264 vitest tests** green.

### 2026-08-17 — 0.5.2.dev2（cocoa 残留对齐）

- 全量对齐文档中的 `cocoa` 残留为 `eyot`：`.omo/` 活跃 + 归档（plans / evidence /
  drafts / notepads）、`docs/archive/`（`docs/roadmap.md` 改名叙事句保留 `Cocoa → Eyot` 原意，仅修语义）。
- 重命名 8 个 `cocoa-*.md` 证据/归档文档为 `eyot-*.md` 并更新全部交叉引用
  （capability-map / capability-gap-table / vs-nodeskclaw-drift / deployment-state +
  archive 的 roadmap / v2-roadmap / v2-program / capability-map-p0-p10-snapshot）。
- `.github/workflows/ci.yml` 内 `cocoa-backend`/`cocoa-portal` → `eyot-backend`/`eyot-portal`
  （CI 路径修复，本地生效；`.github/` 仍按 `.gitignore` 不追踪）。
- 上述 `.omo/`、`AGENTS.md`、`.github/` 改动为本地态（gitignored，不入库）；
  本 commit 仅含 `docs/archive/` 12 个追踪文档。版号 0.5.2.dev1 → **0.5.2.dev2**。

### 2026-08-18 — 后端测试隔离

- pytest 启动时清除宿主机的 HTTP/HTTPS/SOCKS 代理变量，避免 mock 的
  LLM 测试因本地代理缺少 `socksio` 而在客户端构造阶段失败。
- 新增测试环境回归覆盖；后端全量测试为 **1051 passed / 1 skipped**。
- Portal、Backend、Instance Host 的版本号统一到 `0.5.2.dev3`。
- OrbStack 中旧 Cocoa Portal 占用 `30173` 时，Eyot Portal 改用空闲 NodePort `30174`。

### 2026-08-21 — 0.5.3（视觉波）

- Portal 视觉 SoT（`.omo/evidence/v5-visual-spec.md`）+ Tailwind `@theme` 语义 token + dark/light 双主题（跟随系统 / 持久化偏好）。
- 壳层现代化：AppShell / IdeShell / Header 去僵硬（苔藓品牌色、pill 导航、玻璃顶栏）。
- 5 始祖圆形头像 SVG + `ProgenitorAvatar` / `InitialAvatar` 挂始祖卡片、血脉列表、拓扑节点。
- 公共 `EmptyState`、密度统一为 `p-6`、修复缺失的 `topology-pop` 动画；补 favicon。
- 版本三处同步为 **0.5.3**（portal / backend / instance-host）。

### 2026-08-21 — 0.5.3.dev1（视觉审阅后续）

- 大陆选择空态改为土黄底 + 框线 + 墨色文字，避免灰底灰字。
- 设置页「大陆智能 / 星球中枢 / 信号塔」卡片宽度与出口代理对齐（`max-w-xl`）。
- 始祖 / 血脉 / 后裔卡：主标签与「子代理」在右上，slug 与头像拉开；底部左右铺满「创生 / 克隆」。
- 修复 `Preset 'coyote' not found`：系统种子在 registry 加载之前执行，并兼容 15d `zhu-jin` 别名。
- 单元权限显示中文名（叫「权限」）；权限包叫「智人基因」。大陆切换器旁的拥有者可展开查看全部权限。
- 定义 `eyot.collab.passage` / `eyot.hub.shared_work` 为静态公约，不随拓扑或粮仓变化。
- 调试入口移到账户分组，超管可隐藏；主题开关只留侧栏左下。
- 顶栏去掉重复的「Eyot / 控制台」；大陆选择器与权限监视左对齐。
- 大陆选择卡片不再用 modal overlay 灰底，改为土黄框底 + 墨色字。
- 版本同步为 **0.5.3.dev1**。

### 2026-08-25 — 0.5.3 G7 视觉验收关闭

- 用户确认视觉无大问题，G7 关闭。0.5.3 切片 Done。
- 后续 0.5.x 转为既有功能固化（中枢 → gene → 协作）；`0.5.N` / `0.5.N.devM` 由临时变更 + proposal 打开，不预开空号。
- Composer 多模态 + 富文本渲染为近期项，硬门禁是上述三层稳定；Session engine v2 仍远期。
- 产品版本仍为 **0.5.3.dev1**，直到下一张 proposal 指定新号。

### 2026-08-19 — 0.5.2.dev4（Composer 命令历史）

- Composer 主输入框支持 CLI 式上/下方向键翻阅已发送命令（按工作区写入 localStorage，最多 50 条）。
- 与 `/` 命令补全、`@` 提及补全互斥；多行文本仅在首行/末行拦截方向键。
- Portal、Backend、Instance Host 的版本号统一到 `0.5.2.dev4`。

## 1.0

_To be tagged. Sections for 1.x releases land here; `*.devN` builds above fold
into them._

## Template (new x.x release)

```markdown
## x.y — <date>

### Added
- ...

### Changed
- ...

### Fixed
- ...
```
