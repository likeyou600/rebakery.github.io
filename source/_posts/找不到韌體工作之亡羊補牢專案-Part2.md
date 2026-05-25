---
title: 找不到韌體工作之亡羊補牢專案-Part2
date: 2026-05-25 03:00
slug: GB-Project-Part2
permalink: 20260525/GB-Project-Part2/
asset_folder: 找不到韌體工作之亡羊補牢專案
cover: '/gallery/cover/default.png'
thumbnail: '/gallery/cover/default.png'
tags:
    - GB-Project
categories:
    - Firmware
---

Part 2 先開坑，這篇預計會整理開發環境、專案架構，以及 FreeRTOS task 怎麼切。

<!-- more -->
---
## 系列文章

- {% post_link 找不到韌體工作之亡羊補牢專案-Part1 'Part 1：專案規劃與準備清單' %}
- Part 2：開發環境與 FreeRTOS 架構

---
## 預計整理
[STM32CubeIDE](https://www.st.com/en/development-tools/stm32cubeide.html)
[STM32CubeMX](https://www.st.com/en/development-tools/stm32cubemx.html)
  - 用 STM32CubeMX 的版本，STM32CubeMX2是新MCU用的

---
## 實作過程

### 開專案

#### STM32CubeMX
1. Start My Project from Board
2. Board Selector -> NUCLEO-F767ZI
3. Project Manager
   - Project Name: gb_f767zi
   - Project Location: `\Desktop\gb_project\firmware`
   - Toolchain / IDE: STM32CubeIDE
4. Generate Code

#### STM32CubeIDE
1. File -> Import
2. Existing Projects into Workspace
3. Select root directory:
   - `\Desktop\gb_project\firmware\gb_f767zi`
4. Finish


- STM32CubeIDE / CubeMX 專案設定
- FreeRTOS task 分工
- input、display、game task 的初步架構
- 周邊 driver 的資料夾規劃
- debug console 與 log 格式

