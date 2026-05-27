---
title: 找不到韌體工作之亡羊補牢專案-Part3
date: 2026-05-27 03:00
slug: GB-Project-Part3
permalink: 20260525/GB-Project-Part3/
asset_folder: 找不到韌體工作之亡羊補牢專案
cover: '/gallery/cover/part3.png'
thumbnail: '/gallery/cover/part3.png'
tags:
    - GB-Project
categories:
    - Firmware
---

Part 2 終於把環境搭起來了🍵，接下來就是
最無聊最恐怖又有點有趣的練習FreeRTOS

<!-- more -->
---
## 系列文章
- {% post_link 找不到韌體工作之亡羊補牢專案-Part1 'Part 1：專案規劃與準備清單' %}
- {% post_link 找不到韌體工作之亡羊補牢專案-Part2 'Part 2：開發環境與 FreeRTOS 架構' %}
- Part 3：FreeRTOS 任務、同步與除錯實驗

---
## 本篇目標
queue、mutex、semaphore、software timer、task priority 與 stack 檢查

- Log service
  - 建立非同步 `logger_task`，統一處理 UART log 輸出
  - 使用 queue 將各 task 的 log message 傳給 `logger_task`
  
- FreeRTOS 同步實驗
  - 使用 producer / worker task 模擬事件流
  - 使用 mutex 保護共用資源，觀察多 task 存取的差異
  - 使用 software timer 產生週期性事件
  - 使用 User Button + EXTI 練習 ISR notify
  
- 除錯與觀察
  - 觀察 task priority、stack high water mark 與 debug GPIO

---
## Log Service：logger_task

### 為什麼需要 logger_task
Part 2 已經可以透過 USART3 / ST-LINK Virtual COM Port 印出 log。  
如果每個 task 都直接呼叫 `printf()` 或 `HAL_UART_Transmit()`，小範例還可以接受，但專案變大後會有幾個問題：

- 多個 task 同時印 log，輸出可能交錯
- `HAL_UART_Transmit()` 是 blocking，會卡住呼叫它的 task
- driver、service、task 如果都直接操作 UART，之後會很難管理
- log 格式、log level、timestamp 不容易統一

所以目前先做一個小型 log service。

### Logger 資料流
{% codeblock lang:c line_number:false %}
🌕Init side:🌕
    app_main_init()
        |
        | log_service_init()
        |   -> osMessageQueueNew(APP_LOG_QUEUE_DEPTH,
        |                        sizeof(log_service_message_t),
        |                        NULL)
        v
    log queue ready
------------------------
🌗Producer side:🌗
    debug_task
    heartbeat_task
    其他未來的 task
        |
        | #include "Log/log_service.h"
        | LOG_INFO(...)
        | LOG_WARN(...)
        | LOG_ERROR(...)
        v
    log_service_submit()
        |
        | osMessageQueuePut(logQueueHandle, ...)
        v
    log queue
------------------------
🌚Consumer side:🌚
    logger_task
        |
        | log_service_process()
        |   -> osMessageQueueGet(logQueueHandle, ...)
        |   -> format log line
        |   -> board_uart_write_debug()
        |      -> HAL_UART_Transmit()
        v
    USART3 / ST-LINK Virtual COM Port
{% endcodeblock %}
### 資料夾結構
{% codeblock lang:sh line_number:false %}
App/
├─ Services/
│  └─ Log/
│     ├─ log_service.c
│     └─ log_service.h
└─ Tasks/
   ├─ Inc/
   │  ├─ logger_task.h
   └─ Src/
      ├─ logger_task.c
{% endcodeblock %}

### LOG 格式定義
{% codeblock lang:text line_number:false %}
[00001234][INFO ][RTOS-debug_task] debug_task alive counter=0
[00001240][WARN ][game] state=IDLE action=FEED
[00001255][ERROR][lcd] spi_timeout retry=1
{% endcodeblock %}

欄位如下：

- `timestamp`：系統時間，目前使用 `HAL_GetTick()`，單位是 ms
- `level`：log 等級，目前有 `INFO`、`WARN`、`ERROR`
- `module`：log 來源，例如 `MAIN`、`RTOS`、`LCD`、`GAME`...
- `message`：實際訊息內容
  
### Logger 參數設定
{% codeblock App/Inc/app_config.h lang:c line_number:false %}
//是否啟用 log service
#define APP_LOG_ENABLE 1

//log queue 最多暫存幾筆 log message
#define APP_LOG_QUEUE_DEPTH 8

//module 名稱最大長度，包含字串結尾 '\0'
#define APP_LOG_MODULE_NAME_MAX_LEN 32

//message 最大長度，包含字串結尾 '\0'
#define APP_LOG_MESSAGE_MAX_LEN 80
{% endcodeblock %}

### LOG_INFO / LOG_WARN / LOG_ERROR 巨集
目前在 `log_service.h` 裡定義：

{% codeblock Services/Log/log_service.h lang:c line_number:false %}
#define LOG_INFO(module, format, ...) \
  log_service_submit(APP_LOG_LEVEL_INFO, module, format, ##__VA_ARGS__)

#define LOG_WARN(module, format, ...) \
  log_service_submit(APP_LOG_LEVEL_WARN, module, format, ##__VA_ARGS__)

#define LOG_ERROR(module, format, ...) \
  log_service_submit(APP_LOG_LEVEL_ERROR, module, format, ##__VA_ARGS__)
{% endcodeblock %}

{% codeblock anywhere lang:c line_number:false %}
#include "Log/log_service.h"

使用方式：
LOG_INFO("RTOS-log_service", "debug_task alive counter=%lu", counter++);
LOG_WARN("LCD", "spi_timeout retry=%lu", retry);
LOG_ERROR("GAME", "invalid_state=%lu", state);

{% endcodeblock %}

---
## Task 間同步實驗

### Queue 實驗：producer_task 與 logger_task

### Mutex 實驗：保護共用資源

### Task Priority 實驗

---

## 事件通知實驗

### Software Timer 實驗：週期性事件

### User Button + EXTI：ISR notify

### Semaphore / Task Notify：喚醒 worker_task

---

## 除錯與觀察

### Stack High Water Mark

### Debug GPIO

### Log timestamp 觀察

---

## 本篇小結