---
title: 找不到韌體工作之亡羊補牢專案-Part6
date: 2026-05-27 03:00
published: false
slug: GB-Project-Part6
permalink: 20260525/GB-Project-Part6/
asset_folder: 找不到韌體工作之亡羊補牢專案
cover: '/gallery/cover/part6.png'
thumbnail: '/gallery/cover/part6.png'
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
- {% post_link 找不到韌體工作之亡羊補牢專案-Part4 'Part 4：Input System：GPIO、Polling Debounce 與 Event Queue' %}
- {% post_link 找不到韌體工作之亡羊補牢專案-Part5 'Part 5：Input System：EXTI、ISR Notify 與 Software Timer Debounce' %}
- Part 6：顯示系統：ILI9341 TFT 與 SPI 繪圖
---
## 本篇目標

## Task 間同步實驗

### Mutex 實驗：保護共用資源
如果 TFT 和 W25Q128 共用 SPI bus，就需要：

spi_bus_mutex

這時候 mutex 很自然。
## 本篇小結
