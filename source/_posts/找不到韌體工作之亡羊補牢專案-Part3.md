---
title: 找不到韌體工作之亡羊補牢專案-Part3
date: 2026-05-27 03:00
slug: GB-Project-Part3
permalink: 20260525/GB-Project-Part3/
asset_folder: 找不到韌體工作之亡羊補牢專案
cover: '/gallery/cover/default.png'
thumbnail: '/gallery/cover/default.png'
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
- FreeRTOS 任務、同步與除錯實驗

---
## 本篇目標
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
Part 2 已經可以透過 UART 印出 log，但目前還是直接在 task 裡呼叫 `printf()`。

這種方式在小範例很方便，但專案變大後會有幾個問題：
  - 多個 task 同時印 log，輸出可能交錯
  - `HAL_UART_Transmit()` 是 blocking，會卡住呼叫它的 task
  - driver、app、task 如果都直接印 log，之後會很難管理
  - 無法統一 log 格式、log level 與 timestamp

因此先做一個小型 log service，用這個 log service 練習 FreeRTOS 裡最常用的 queue、mutex、semaphore、software timer、task priority 與 stack 檢查。

### Logger 資料流
{% codeblock lang:c line_number:true %}
producer_task
worker_task
timer_callback
    |
    | LOG_INFO(...)
    v
log service
    |
    | osMessageQueuePut(log_queue, ...) xQueueSend(log_queue, ...)
    v
logger_task
    |
    | printf / HAL_UART_Transmit
    v
USART3 debug console
{% endcodeblock %}


### Logger 架構設計

### 建立 log queue

### 實作 logger_task

### LOG_INFO / LOG_WARN / LOG_ERROR 巨集

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