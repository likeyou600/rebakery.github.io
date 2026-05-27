---
title: 找不到韌體工作之亡羊補牢專案-Part4
date: 2026-05-27 03:00
published: false
slug: GB-Project-Part4
permalink: 20260525/GB-Project-Part4/
asset_folder: 找不到韌體工作之亡羊補牢專案
cover: '/gallery/cover/part4.png'
thumbnail: '/gallery/cover/part4.png'
tags:
    - GB-Project
categories:
    - Firmware
---



<!-- more -->
---
## 系列文章
- {% post_link 找不到韌體工作之亡羊補牢專案-Part1 'Part 1：專案規劃與準備清單' %}
- {% post_link 找不到韌體工作之亡羊補牢專案-Part2 'Part 2：開發環境與 FreeRTOS 架構' %}
- {% post_link 找不到韌體工作之亡羊補牢專案-Part3 'Part 3：Logger Service 與 FreeRTOS 除錯觀察' %}
- Part4：輸入系統：按鍵、五向鍵與事件佇列

---
## 本篇目標
  
- FreeRTOS 同步實驗
  - 使用 software timer 產生週期性事件
  - 使用 User Button + EXTI 練習 ISR notify
  
## 事件通知實驗

### Software Timer 實驗：週期性事件

### User Button + EXTI：ISR notify

### Semaphore / Task Notify：喚醒 worker_task

## 本篇小結