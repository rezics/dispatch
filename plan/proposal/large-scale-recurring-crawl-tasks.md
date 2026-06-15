---
title: 大規模週期性爬蟲任務調度
status: active
created: 2026-06-15
completed:
supersededBy:
tags: [hub, queue, worker, crawler, recurrence]
---

## Why

Rezics 需要主動收集 wiki 內容之外的補充信息。這些採集目標數量目前是幾百萬級，未來還會增長；每個目標對應一個可重複執行的 task，通常每 10-30 天更新一次，且更新週期可能被調整。任務到期後進入可分發狀態，由 worker 領取並執行爬蟲；任務完成後重新沉寂到下一個週期；如果 worker 一直沒有完成或明確失敗，任務進入重試，直到耗盡次數後進入 error/failed 隊列。

這不是高一致性 workflow 問題。單個採集任務失敗可以接受，因為爬蟲結果只是對 wiki 數據的補充；真正需要保障的是大規模任務池的穩定推進、可控重試、可觀測錯誤隊列，以及不讓幾百萬個長期任務把 active queue 或 worker 調度壓垮。現有代碼已經有 `Task.scheduledAt`、`recurrenceInterval`、lease、reaper、priority aging、worker heartbeat、result plugin 等基礎，因此本計劃優先延展現有 Postgres-backed queue，而不是引入 Temporal、Hatchet 或其他外部工作流平台。

## Durable constraints & decisions

- `(type)` `Task.status` 需要保留現有 `pending | running | done | failed` 兼容語義，並為週期性採集明確區分「下次未到期的沉寂 pending」和「已到期可被 claim 的 pending」；claimable 條件仍由 `status = 'pending' AND scheduledAt <= now` 表達。
- `(type)` 週期性採集的長期狀態歸屬於 `Task` 本身；不為每次週期新增獨立長壽命 workflow。`TaskResult` 只保存最後一次成功結果，歷史明細若需要應另建 lightweight event/history，而不是把每輪結果塞進核心 claim path。
- `(comment)` 幾百萬個週期任務大多數時間只是「睡眠中的 pending」，這是刻意設計；不要額外維護一個與 `Task` 表重複的全量 active queue。
- `(test)` 只有 `scheduledAt <= now` 的 pending task 可以被 claim；未到期的週期 task 即使 priority 很高也不能被 worker 領走。
- `(test)` 完成一個帶 `recurrenceInterval` 的 task 後，必須在 result plugin 已運行之後把它重置為下一輪 pending，並重置 `attempts`、`workerId`、lease、started time、priority。
- `(test)` retryable failure 或 lease timeout 應在 `attempts < maxAttempts` 時回到 pending；耗盡次數後進入 failed/error 隊列，並保留足夠錯誤信息供 dashboard 和人工排查。
- `(test)` 重試重新入隊時需要能調整 priority 或 scheduledAt/backoff，避免大量失敗任務立即重複搶占正常到期任務。
- `(comment)` 週期抖動不是裝飾功能；它用來避免幾百萬任務因批量導入或統一週期在同一時間爆發。
- `(test)` priority aging 只能提升已到期且仍 pending 的任務；不要讓未到期睡眠任務因 aging 提前變成高優先級。
- `(type)` 任務週期使用秒級存儲以兼容現有 `recurrenceInterval`，但 API/docs 應提供天級語義示例，避免 crawler 使用者直接手算出錯。
- `(comment)` 本計劃不引入 Temporal/Hatchet/pg-boss 作為第一階段依賴；現有 Postgres `FOR UPDATE SKIP LOCKED` claim path 已經符合當前一致性要求，外部隊列只在後續證明管理面或吞吐成為瓶頸時再評估。
- `(test)` 大批量 claim、reaper、recurrence reset 必須保持批量 SQL 路徑，不在熱路徑中對每個 task 做無必要的逐行查詢。

## 1. Schema and Model

- [ ] 1.1 在 `package/hub/prisma/schema.prisma` 補強 `Task` 的週期採集字段和索引；至少檢查 `project/status/scheduledAt/priority`、`status/leaseExpiresAt` 是否滿足幾百萬 pending 任務下的 claim、list、reaper 查詢。
- [ ] 1.2 明確 error queue 是否直接使用 `status = 'failed'`，或新增更具語義的錯誤分類字段，例如 `failureReason` / `lastErrorAt` / `lastAttemptAt`；把最終決策落到 Prisma model 和生成類型。
- [ ] 1.3 檢查 `TaskResult` 的保留策略：週期任務完成後覆蓋最後結果即可；若 dashboard 需要最近 N 次結果，另設獨立 history 表，不改變 claim 熱路徑。
- [ ] 1.4 為 `recurrenceInterval` / `recurrenceJitter` 補清楚單位和 nullable 語義，保持現有秒級字段兼容，同時允許 API/docs 用 10-30 天示例表達。

## 2. Queue Semantics

- [ ] 2.1 在 `package/hub/src/queue/claim.ts` 保持 claim 條件以 `pending + scheduledAt <= now` 為唯一到期判斷，並確認排序是 priority desc、scheduledAt asc。
- [ ] 2.2 在 `package/hub/src/queue/complete.ts` 將週期 reset 邏輯收斂為可測試的純行為：成功完成後計算 `next scheduledAt = now + interval + jitter`，清空 lease/running 字段，重置 attempts 和 priority。
- [ ] 2.3 為 retryable failure 增加 backoff/priority 調整策略；策略需要能區分 worker 明確失敗、lease timeout、max hold timeout。
- [ ] 2.4 在 `package/hub/src/reaper/reaper.ts` 讓 lease timeout 走同一套 retry/backoff 規則；耗盡 `maxAttempts` 時進入 failed/error，保留錯誤原因。
- [ ] 2.5 檢查 `package/hub/src/reaper/aging.ts`，確保 priority aging 不會推高尚未到期的睡眠任務。

## 3. API and Worker Contract

- [ ] 3.1 在 `package/hub/src/api/tasks.ts` 補齊週期任務創建/更新所需字段；如果週期可以被調整，需要提供安全的 task patch API，而不是要求刪除重建。
- [ ] 3.2 在 `package/hub/src/api/claim.ts` 的 `/tasks/complete` 保持「worker 完成即視為 task 完成」的當前語義；本計劃不引入第三方 callback 才完成的等待狀態。
- [ ] 3.3 在 `package/worker/src/core/lease.ts` 確認 worker 不需要知道 recurrence；worker 只負責 claim、執行、done/failed 回報。
- [ ] 3.4 如果 crawler task 需要按來源/domain 限流，先在 task payload/type/capability 設計預留 routing key，不在第一階段實作全局限流器。

## 4. Tests

- [ ] 4.1 在 `package/hub/test/queue.test.ts` 增加「未到期週期 task 不可 claim、到期後可 claim」測試。
- [ ] 4.2 在 `package/hub/test/queue.test.ts` 增加「成功完成週期 task 後重置到下一週期，且 attempts/priority/lease 清空」測試，覆蓋 jitter 邊界。
- [ ] 4.3 在 `package/hub/test/reaper.test.ts` 增加「lease timeout 後 retryable task 以 backoff/priority 規則回到 pending」測試。
- [ ] 4.4 在 `package/hub/test/reaper.test.ts` 增加「耗盡 maxAttempts 後進入 failed/error 並保存錯誤原因」測試。
- [ ] 4.5 在 `package/hub/test/reaper.test.ts` 增加「priority aging 不作用於未到期 scheduledAt」測試。
- [ ] 4.6 視需要增加一個批量測試，至少驗證 claim/reaper/recurrence reset 使用批量查詢時行為不依賴逐行順序。

## 5. Dashboard and Docs

- [ ] 5.1 在 `package/hub-dashboard` 的任務列表或項目視圖中暴露 pending-due、sleeping-pending、running、failed/error 的數量，避免幾百萬 sleeping pending 被誤讀為積壓。
- [ ] 5.2 在 `docs/guide/task-lifecycle.md` 更新週期性採集狀態圖，明確 `pending` 同時承載 sleeping 和 claimable，由 `scheduledAt` 判斷。
- [ ] 5.3 在 `docs/api/tasks.md` 補齊 `recurrenceInterval`、`recurrenceJitter`、週期調整、error queue 查詢方式。
- [ ] 5.4 在 `docs/reference/worker-sdk.md` 補一句 worker contract：worker 不需要處理週期 reset，只回報 done/failed。

## Out of scope

- 不引入 Temporal、Hatchet、pg-boss、River、Faktory 或其他外部調度平台。
- 不把每一輪採集拆成獨立長壽命 workflow。
- 不要求每個爬蟲任務必定成功；失敗重試耗盡後可進入 error/failed，等待後續人工或批量修復。
- 不在第一階段實作跨 domain/source 的精細全局限流，只保留 routing key/capability 的設計空間。
- 不建立新的 spec corpus；本 proposal 是一次性實施腳手架， durable 規則應在 apply 時落到 types、tests、必要 comments 和 docs。
