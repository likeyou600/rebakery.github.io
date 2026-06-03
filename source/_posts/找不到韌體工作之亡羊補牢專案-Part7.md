---
title: 找不到韌體工作之亡羊補牢專案-Part7
date: 2026-06-02 03:00
permalink: posts/gb-project/part7/
# published: false
asset_folder: 找不到韌體工作之亡羊補牢專案
cover: '/gallery/cover/part7.png'
thumbnail: '/gallery/cover/part7.png'
tags:
    - GB-Project
categories:
    - Firmware
---

前一 Part 做了一些基本繪圖 API，但怎麼可能用純寫程式來畫畫呢。
當然是要找神器來產 Bitmap 囉

<!-- more -->

# Bitmap 產生 Lopaka UI 與像素風畫面設計

---

## 系列文章

- {% post_link 找不到韌體工作之亡羊補牢專案-Part1 'Part 1：專案規劃與準備清單' %}
- {% post_link 找不到韌體工作之亡羊補牢專案-Part2 'Part 2：開發環境與 FreeRTOS 架構' %}
- {% post_link 找不到韌體工作之亡羊補牢專案-Part3 'Part 3：Logger Service 與 FreeRTOS 除錯觀察' %}
- {% post_link 找不到韌體工作之亡羊補牢專案-Part4 'Part 4：Input System：GPIO、Polling Debounce 與 Event Queue' %}
- {% post_link 找不到韌體工作之亡羊補牢專案-Part5 'Part 5：Input System：EXTI、ISR Notify 與 Software Timer Debounce' %}
- {% post_link 找不到韌體工作之亡羊補牢專案-Part6 'Part 6：Display System：ILI9341 TFT、SPI 與像素繪圖' %}
- Part 7：Display System：Bitmap 產生 Lopaka UI 與像素風畫面設計

---

## 本篇目標

- 了解 Lopaka UI / bitmap 產生工具
- 嘗試將 Lopaka 匯出的 bitmap / icon 顯示到 ILI9341 TFT
- 初步整理像素風畫面更新流程

---

## Lopaka 與 UI 工具

最近看到一個工具叫做 Lopaka，可以用比較視覺化的方式設計 embedded screen UI。

- [Lopaka GitHub](https://github.com/sbrin/lopaka)
- [Lopaka App](https://lopaka.app/)

Lopaka 是一個 embedded graphics editor。  
它不是要跑在 STM32 / FreeRTOS 上的程式，而是在電腦或瀏覽器上用來設計畫面，並產生 C / C++ 繪圖程式碼或 bitmap 資料。

也就是說，Lopaka 在這個專案裡比較像是：

{% codeblock lang:text line_number:false %}
UI design tool
    -> export code / bitmap / image data
    -> 放進 STM32 專案
    -> display service 呼叫繪圖 API
    -> ILI9341 TFT 顯示
{% endcodeblock %}

Part 6 做的基本繪圖 API 仍然是地基：

{% codeblock lang:c line_number:false %}
ili9341_draw_pixel(x, y, color);
ili9341_fill_rect(x, y, w, h, color);
ili9341_draw_bitmap(x, y, w, h, bitmap);
{% endcodeblock %}

---
## 0. 顯示資料流

---
## 1. 資料夾結構
{% codeblock lang:sh line_number:false %}
gb_f767zi/
    ├─ App/
    │    ├─ Services/
    │    │  └─ Display/
    │    │     ├─ display_service.c
    │    │     └─ display_service.h
    │    ├─ Tasks/
    │    │   ├─ Inc/
    │    │   │  └─ display_task.h
    │    │   └─ Src/
    │    │      └─ display_task.c 
    │    └─ UI/
    │        ├─ Inc/
    │        │  └─ lopaka_assets.h
    │        └─ Src/
    │           └─ lopaka_assets.c 
    │
    └─ Components
           └─ ili9341/
               ├─ Inc/
               │  └─ ili9341.h
               └─ Src/
                    └─ ili9341.c 
tools/
    └─ lopaka_to_assets.py
{% endcodeblock %}

---

## 2. Lopaka 匯出資料怎麼接進來

Lopaka 可能匯出的是某種 C / C++ array、bitmap、XBMP 或特定 graphics library 的 draw code。

但我的 ILI9341 driver 目前需要 RGB565 bitmap：


---
## 

---

## 本篇小結
