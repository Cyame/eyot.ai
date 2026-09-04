# Eyot 可观测性约定

> 活约定。与 [`api-architecture.md`](api-architecture.md) 构成姊妹文档。界面中文名见 [`terminology.zh.md`](terminology.zh.md)。
> 代码位置：`eyot-backend/app/core/` —— 日志 `logging.py`、事件 `events.py` / `event_types.py`、队列 `queue.py`、中间件 `middleware/logging.py`、模型 `models/event.py`。
> 审计行在产品上叫 **足迹（Event）**。

## 1. 日志约定

## 1. 日志约定

### 1.1 统一入口

所有日志统一走 loguru，禁止 `print()` 和 stdlib `logging.getLogger()` 直接输出。

```python
from loguru import logger

logger.info("Worker started", instance_id=instance_id)
logger.error("DB connection failed", host=host, port=port)
```

### 1.2 模块区分

在模块顶部用 `logger.bind(module=__name__)` 绑定模块名，方便按模块过滤。

```python
from loguru import logger

# 文件顶层：绑定当前模块名，该模块内所有日志行自动携带 module 字段
_logger = logger.bind(module=__name__)

async def process_task(task_id: str) -> None:
    _logger.info("Processing task", task_id=task_id)
```

### 1.3 request_id 贯通

`LoggingMiddleware`（`app/core/middleware/logging.py`）在每次请求内用 `logger.contextualize(request_id=...)` 包裹整个请求生命周期。context manager 退出后 extra 自动恢复，后续请求不会污染。

```python
# LoggingMiddleware.dispatch() 核心逻辑（已落地，无需手动调用）
with logger.contextualize(request_id=request_id):
    logger.info("http.request.start", method=request.method, path=request.url.path)
    response = await call_next(request)
    logger.info("http.request.end", status_code=response.status_code)
```

请求链路内所有日志（uvicorn、SQLAlchemy、auth、业务逻辑）自动携带 `request_id`，无需每行手动传参。

### 1.4 级别指引

| 级别 | 适用场景 | 示例 |
|------|---------|------|
| DEBUG | 开发调试信息、变量值、SQL 参数 | `logger.debug("Query params", params=params)` |
| INFO | 关键流程节点、请求起止、任务调度 | `logger.info("http.request.start", method=req.method)` |
| WARNING | 可恢复的异常、降级行为、重试 | `logger.warning("Rate limit approaching", remaining=5)` |
| ERROR | 操作失败、异常捕获、外部服务不可达 | `logger.opt(exception=True).error("DB commit failed")` |

`logger.exception()` 内部即调用 `logger.opt(exception=True).error(...)`，是 loguru 推荐的等价格式；勿使用 stdlib 风格的 `exc_info=True`（loguru 会把 `exc_info` 当作 extra 字段，不会触发异常记录）。

### 1.5 prod JSON vs dev console

`configure_logging()`（`app/core/logging.py`）在 lifespan 启动时根据 `settings.ENV` 选择 sink：

- **dev**：彩色 console 输出到 stderr，human-readable 格式。
- **prod**：JSON 行输出到 stdout（`serialize=True`），每条日志一行 JSON。`extra` 字段位于 `record.extra` 路径下（**不扁平化**）——`request_id` 位于 `record.extra.request_id`。引用方按此路径解析。

```python
# app/core/logging.py 关键逻辑（已落地，无需手动干预）
if settings.ENV == "dev":
    logger.add(sys.stderr, level=settings.LOG_LEVEL, colorize=True,
               format="<green>{time:HH:mm:ss.SSS}</green> | "
                      "<level>{level: <8}</level> | "
                      "<cyan>{extra[request_id]}</cyan> | "
                      "<level>{message}</level>")
else:
    logger.add(sys.stdout, level=settings.LOG_LEVEL, serialize=True)
```

### 1.6 stdlib 桥接

`configure_logging()` 同时安装 `InterceptHandler`（`logging.Handler` 子类），将 uvicorn 和 SQLAlchemy 等 stdlib 日志路由到 loguru。所有日志行共享同一组 sink 和 `extra` 上下文。

---

## 2. 事件系统

### 2.1 事件模型

事件是一次性写入的审计记录，永不更新、永不删除（`deleted_at` 始终为 NULL）。模型定义在 `app/models/event.py`：

```python
class Event(BaseModel, Base):
    __tablename__ = "events"

    type: Mapped[str] = mapped_column(String(128), nullable=False)
    actor_type: Mapped[str] = mapped_column(String(32), nullable=False)
    actor_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    resource_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    resource_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False)
    request_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
```

### 2.2 事件分类法常量

`app/core/event_types.py` 定义所有事件类型常量，命名规则：`<域>.<动作过去式>`。

完整事件家族清单（按域分组）：

| 常量 | 值 | 域 | 发射点 |
|------|-----|-----|--------|
| `SYSTEM_STARTUP` / `SYSTEM_SHUTDOWN` | `system.*` | 系统生命周期 | lifespan |
| `MESSAGING_MESSAGE_SENT` | `messaging.message_sent` | 消息 | `route_message()` 投递成功 |
| `MESSAGING_DELIVERY_BLOCKED` | `messaging.delivery_blocked` | 消息 | 投递被门控 |
| `MESSAGING_ACTIVATION_TRIGGERED` | `messaging.activation_triggered` | 消息 | on-mention / 调度唤醒 |
| `CHAT_RESPONSE_*` | `chat.response.*` | Composer / Tunnel | chunk / done / error / activity |
| `INSTANCE_CREATED` … `INSTANCE_DELETED` | `instance.*` | 后裔生命周期 | 创建 / 部署 / 启停 / 失败 / 删除 |
| `FORNIX_FILE_*` | `fornix.file_*` | 粮仓 | 共享文件 CRUD / 同步失败 / work 写入 |
| `MEMORY_ENTRY_APPENDED` | `memory.entry_appended` | 记忆 | 血脉记忆追加 |
| `HARNESS_*` | `harness.*` | 控制循环 | loop / checkpoint / pause / inject / report |
| `LEARNING_*` | `learning.*` | 领悟 / 蜕变 / 演化 | distill / promote / transmute / compose / inject |
| `BASE_CLASS_CLONED` 等 | `*.cloned` | 副本 | Org / Workspace / Entity / BaseClass clone |
| `MEETING_*` / `SCHEDULE_*` | `meeting.*` / `schedule.*` | 会议与脑干调度 | 已落地 |

完整常量以 `app/core/event_types.py` 为准。上表按家族折叠；新增类型先加常量再 `emit()`。

### 2.3 emit() 用法

`emit()`（`app/core/events.py`）写入 Event 行并分发到匹配的 handler。调用方拥有事务边界，emit 只 flush 不 commit。

```python
from app.core.events import emit
from app.core.event_types import SYSTEM_STARTUP

async with get_session_factory()() as session:
    await emit(
        SYSTEM_STARTUP,
        actor_type="system",
        payload={"env": settings.ENV},
        session=session,
    )
    await session.commit()
```

**参数说明**：

| 参数 | 必填 | 说明 |
|------|------|------|
| `event_type` | 是 | 点分事件类型字符串，如 `"system.startup"` |
| `actor_type` | 是 | 触发者类型，`"system"` / `"user"` / `"agent"` |
| `actor_id` | 否 | 触发者 UUID |
| `resource_type` | 否 | 受影响资源类型 |
| `resource_id` | 否 | 受影响资源 UUID |
| `payload` | 否 | 自由格式 JSON-serializable 负载 |
| `request_id` | 否 | 关联 HTTP 请求 ID |
| `session` | 是 | 活跃的 AsyncSession |

### 2.4 handler 注册与 best-effort 语义

`register_handler(pattern, handler)` 注册事件监听器。`pattern` 支持 shell 风格通配符（`*`、`?`、`[seq]`）。handler 异常被捕获并记录，绝不传播到调用方。

```python
from app.core.events import register_handler

async def log_system_events(event, event_type, **kwargs):
    logger.info("System event", event_type=event_type)

# 注册通配 handler：匹配所有 system.* 事件
register_handler("system.*", log_system_events)
```

**handler 契约**：
- handler 在 `emit()` 调用方的事务内、commit 之前执行。handler 可访问同一事务内的未提交数据。
- handler 必须容忍回滚（phantom event），或在 handler 内使用 `after_commit` 事件推迟副作用。
- 一个 handler 抛异常不会阻塞其他 handler，也不会中断 `emit()` 的返回。

### 2.5 新增事件类型流程

1. 在 `app/core/event_types.py` 按 `<域>.<动作过去式>` 命名规则添加常量。
2. 在业务代码中调用 `emit(event_type, ...)` 发射事件。
3. 如需自动响应，调用 `register_handler(pattern, handler)` 注册监听器。

查询已落地：`GET /api/v1/events`（Portal 足迹面）。不要把事件表当可变业务状态。

---

## 3. TaskQueue

### 3.1 协议

`TaskQueue` 是 `typing.Protocol`（`app/core/queue.py`），定义四个方法，任何实现（内存 / Redis / Celery）只要满足协议即可替换。

| 方法 | 签名 | 说明 |
|------|------|------|
| `enqueue` | `async (task_name, *, delay, payload) -> str` | 调度任务，返回 UUID |
| `register_task` | `(task_name, handler)` | 注册任务处理器 |
| `start` | `async ()` | 启动 worker 协程 |
| `stop` | `async ()` | 优雅停止，排空当前任务 |

### 3.2 用法片段

```python
from app.core.queue import InMemoryTaskQueue

queue = InMemoryTaskQueue()

async def send_reminder(payload: dict) -> None:
    user_id = payload["user_id"]
    logger.info("Sending reminder", user_id=user_id)

queue.register_task("reminder.send", send_reminder)
await queue.start()

# 延迟 30 秒后执行
task_id = await queue.enqueue("reminder.send", delay=30.0, payload={"user_id": "u1"})
```

### 3.3 存根语义警告

当前 `InMemoryTaskQueue` 仅用于开发与测试：

- **进程重启丢任务**：队列在内存中，重启后所有未执行任务丢失。
- **单 worker**：只有一个 `asyncio.Task` 消费队列，无并发控制。
- **无持久化**：任务不落盘，不备份。

**生产环境务必替换为 Redis 实现**（见第 4 节）。

### 3.4 底层实现

`InMemoryTaskQueue` 内部使用 `asyncio.PriorityQueue`，按 `(run_at, seq)` 排序。`seq` 是单调递增计数器，保证同时间戳任务按入队顺序执行。worker 用 `asyncio.wait_for + asyncio.Event` 处理队首睡眠竞争：新任务入队时唤醒 worker，worker 重新评估队首截止时间。

---

## 4. 仍延后

协议已经留缝，实现尚未换生产后端。不要把下面几行当成「还在 P8 排队」。

| 能力 | 当前状态 | 说明 |
|------|---------|------|
| Redis Streams 事件桥接 | `register_handler` 是接缝 | 需要时注册 `"*"` 转发 handler，现有 `emit()` 调用方零改动 |
| Redis TaskQueue | `TaskQueue` 协议已有，线上仍是 `InMemoryTaskQueue` | 进程重启丢任务；多副本前必须替换 |
| Langfuse | 不进 FastAPI 后端 | 若做，放在后裔 runtime 层 |
| Metrics / OpenTelemetry | 未做 | 指标、trace、dashboard |

事件查询 **已有** `GET /api/v1/events`，不再延后。

---

## 参考

- [`api-architecture.md`](api-architecture.md) —— API 约定
- [`terminology.zh.md`](terminology.zh.md) —— 足迹 / 粮仓 / 后裔 等显示名
- `app/core/logging.py` / `events.py` / `event_types.py` / `queue.py`
- `app/core/middleware/logging.py`
- `app/models/event.py`
