# 功能 Stub 与未闭环清单

> 审查日期：2026-09-07
>
> 本文记录当前源码中已经存在、但功能尚未真正闭环的实现。后续补全功能时，以本文作为问题清单；完成后必须补充测试、验收证据，并从对应条目移除或更新状态。
>
> 审查范围：`eyot-backend/app/`、`eyot-instance-host/`、`eyot-artifacts/`。这是静态源码审查，未验证 orbstack 现场行为。

## 判定口径

- **明确 Stub**：用户路径可调用，但返回固定文案、只写状态或明确跳过真实动作。
- **接线未闭环**：数据结构、API 或事件已经存在，但没有贯通到真实 Instance / pi 执行端。
- **条件性模拟**：特定配置缺失时，为了开发或演示返回固定结果；配置完整时存在真实路径。
- 不把抽象接口、测试 mock、正常空态、已明确拒绝的未来方向列为 stub。

## 清单

### S1：无兽道时的小脑转交仍是模板回复

- **类型**：明确 Stub
- **优先级**：P0
- **当前行为**：没有 Passage 时保存用户消息，返回固定提示“消息已转交小脑”，并创建一个 `notify` 注入队列项。
- **实际缺口**：不会启动或调用小脑处理任务，不会分析请求、协调其它后裔，也不会产生真实业务结果。
- **源码依据**：[`message_router.py:71`](../eyot-backend/app/core/message_router.py#L71)、[`message_router.py:113`](../eyot-backend/app/core/message_router.py#L113)、[`message_router.py:129`](../eyot-backend/app/core/message_router.py#L129)。
- **补全验收**：无 Passage 的 `@target` 请求必须进入小脑真实处理路径；处理结果可追踪；不得静默代理到目标 Host；失败必须有可观察的错误状态。
- **状态**：未补全

### S2：协作、基因、能力注入没有进入模型上下文

- **类型**：接线未闭环
- **优先级**：P0
- **当前行为**：后端有持久化注入队列、`notify / soft_inject / wake` 三种模式、轮询、ACK 和 `harness.inject_applied` 事件。Python 运行时消费到队列项目后只记录日志并 ACK。
- **实际缺口**：注入载荷没有被加入 pi 的对话上下文，也没有真正动态应用 gene / capability；当前 Node Host 未消费后端注入轮询接口。
- **源码依据**：队列实现 [`inject_queue.py:59`](../eyot-backend/app/core/inject_queue.py#L59)、ACK 实现 [`inject_queue.py:173`](../eyot-backend/app/core/inject_queue.py#L173)、运行时占位 [`loop.py:239`](../eyot-backend/app/agent_runtime/loop.py#L239)、Host 当前只处理 Tunnel chat/control [`chat-bridge.ts:76`](../eyot-instance-host/src/chat-bridge.ts#L76)。
- **补全验收**：三种投递模式都能在 Host 侧被消费；`soft_inject` 不打断 tool-use/tool-result 配对；`wake` 能启动 idle/completed Instance；能力或基因注入对后续 turn 可见；ACK 只有在实际应用成功后产生。
- **状态**：未补全

### S3：暂停、恢复、中断没有完整控制真实 pi 进程

- **类型**：接线未闭环
- **优先级**：P0
- **当前行为**：API 修改 `InstanceLoopState` 并记录事件；恢复会启动后端 Python runtime task。Tunnel 定义了通用 control frame，Host 当前只实现 `interrupt` 到 `pi.kill()` 的映射。
- **实际缺口**：控制面状态与真实 pi Host 没有完整贯通；Host 没有处理 `pause` / `resume`，且 `send_control()` 当前没有找到生产调用方。
- **源码依据**：控制状态 [`harness_supervisor.py:150`](../eyot-backend/app/core/harness_supervisor.py#L150)、API resume [`harness.py:128`](../eyot-backend/app/api/v1/harness.py#L128)、Tunnel 发送接口 [`tunnel_hub.py:104`](../eyot-backend/app/services/tunnel/tunnel_hub.py#L104)、Host 控制处理 [`chat-bridge.ts:76`](../eyot-instance-host/src/chat-bridge.ts#L76)。
- **补全验收**：API 返回成功后，真实 Host 能收到并执行对应控制；暂停不会继续产生 turn；恢复会恢复或重新启动正确的 Host；中断后进程、loop state、审计事件三者一致。
- **状态**：未补全

### S4：Boulder 自动续跑只有事件和计时，没有恢复执行

- **类型**：明确 Stub
- **优先级**：P1
- **当前行为**：定时任务检查 checkpoint 超时，发出 `harness.continuation_injected`；事件处理器只更新内存 registry 的时间。
- **实际缺口**：没有读取 `boulder_snapshot` 恢复任务，没有把续跑上下文传给 pi，也没有重新触发真实 provider turn。
- **源码依据**：超时事件 [`continuation.py:70`](../eyot-backend/app/core/continuation.py#L70)、事件处理 [`harness_handlers.py:166`](../eyot-backend/app/core/harness_handlers.py#L166)。
- **补全验收**：超时后能够从有效 snapshot 恢复；恢复过程可重试、可中断；恢复失败进入明确的 failed 状态并产生审计事件；不会只更新时间戳伪造恢复成功。
- **状态**：未补全

### S5：删除大陆不会清理关联 Pod / K8s 运行资源

- **类型**：明确 Stub
- **优先级**：P1
- **当前行为**：删除接口软删除大陆及层级数据，也软删除关联 Instance，然后返回 `204`。
- **实际缺口**：关联 Pod / Instance namespace 的删除是明确的 no-op；数据库记录消失不代表运行资源停止或释放。
- **源码依据**：接口文档 [`organizations.py:1237`](../eyot-backend/app/api/v1/organizations.py#L1237)、no-op 声明 [`organizations.py:1243`](../eyot-backend/app/api/v1/organizations.py#L1243)、Instance 软删除 [`organizations.py:1380`](../eyot-backend/app/api/v1/organizations.py#L1380)。
- **补全验收**：删除请求触发可追踪的资源清理任务；所有关联运行体停止；清理失败不会伪装成完整成功；重复执行安全；数据库软删除规则保持不变。
- **状态**：未补全

### S6：Composer 离线时返回固定 Stub 回复

- **类型**：条件性模拟
- **优先级**：P2
- **触发条件**：Tunnel 未连接或发送失败，并且 `OPENAI_API_KEY` 为空或值为 `stub`。
- **当前行为**：把输入包装成 `[stub] <user_content>`，拆成多个 token 模拟流式输出，再标记为 completed。
- **实际缺口**：该路径不调用 LLM，也不执行后裔的 pi runtime；用户会收到看似成功的固定回显。
- **源码依据**：离线 fallback [`composer_turns.py:204`](../eyot-backend/app/core/composer_turns.py#L204)、固定回复 [`composer_turns.py:349`](../eyot-backend/app/core/composer_turns.py#L349)。
- **补全验收**：生产配置下不应静默返回 `[stub]`；无可用 Host / LLM 时应明确返回不可用状态或排队状态；开发测试仍可显式启用模拟模式。
- **状态**：保留开发 fallback；生产语义未收紧

### S7：后端 Python agent loop 是 checkpoint 演示循环，不是完整任务执行器

- **类型**：条件性模拟 / 功能降级
- **优先级**：P2
- **当前行为**：无 API key 时使用固定 `stub checkpoint`；有 API key 时反复请求模型生成“checkpoint 状态更新”，写入 Memory / Notepad，但不执行用户任务。
- **实际缺口**：没有真实的任务上下文、工具调用、Boulder 恢复或完整 pi 对话循环。真实 pi Host 路径与该 Python fallback 的行为不一致。
- **源码依据**：Stub client [`loop.py:60`](../eyot-backend/app/agent_runtime/loop.py#L60)、checkpoint prompt [`loop.py:340`](../eyot-backend/app/agent_runtime/loop.py#L340)、运行时启动 [`loop.py:425`](../eyot-backend/app/agent_runtime/loop.py#L425)。
- **补全验收**：明确 Python fallback 的产品定位；若保留，必须以 degraded / demo 状态暴露；若作为生产 runtime，则需支持真实任务上下文、工具执行、注入和恢复，并与 pi Host 的协议语义一致。
- **状态**：未决定；当前不应视为完整生产 agent runtime

## 已排除项目

以下项目本次不列为 stub：

- **LLM 领悟路径**：`engine=llm` 已调用 `LLMDistiller`；没有 provider 时是有记录的 heuristic 降级，不是隐藏的固定回复。见 [`learning.py:380`](../eyot-backend/app/api/v1/learning.py#L380)。
- **会议与定时任务 API**：当前已有真实 CRUD、调度和参与者唤醒路径；但其最终注入效果受 S2 影响。
- **小脑 restart**：已经调用实例重启服务，不属于旧的状态跳变占位。
- **pi Host 聊天与 subagent**：Host 确实启动 pi RPC，subagent 扩展也存在真实进程调用路径。
- **Session engine v2、Voice、外接运行时等**：属于明确的未来方向，不是当前代码中宣称已可用的 stub。

## 后续处理顺序

1. **P0：S2、S3、S1**。先打通真实 Instance / pi 的输入、控制和无 Passage 小脑路径。
2. **P1：S4、S5**。补齐可靠恢复和租户删除后的运行资源生命周期。
3. **P2：S6、S7**。明确离线 fallback 的生产语义，再决定 Python loop 是收敛为真实 runtime 还是降级为测试/开发 harness。

每项关闭时至少需要：源码改动、自动化测试、orbstack 部署验证，以及必要的 `.omo/evidence/` 现场证据。
