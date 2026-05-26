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
## 本篇目標
- STM32CubeIDE / CubeMX 專案設定
- FreeRTOS task 分工
- input、display、game task 的初步架構
- 周邊 driver 的資料夾規劃
- debug console 與 log 格式

---
## STM32CubeIDE / CubeMX 專案設定
因為新版的 STM32CubeIDE 已經跟 STM32CubeMX 脫鉤，
用 CubeMX 建好專案，再匯入 CubeIDE。

### 1. 建立 STM32CubeMX 專案
1. Start My Project from Board
2. Board Selector -> NUCLEO-F767ZI
3. Project Manager
   - Project Name: gb_f767zi
   - Project Location : `\Desktop\gb_project\firmware`
   - Toolchain / IDE: STM32CubeIDE
4. Generate Code

### 2. 匯入 STM32CubeIDE
1. File -> Import
2. Select STM32CubeMX/STM32CubeIDE Project
3. Directory Select : `\Desktop\gb_project\firmware`
4. Finish

### 3. 確認專案可以簡單編譯
1. 在 STM32CubeIDE 中選取 `gb_f767zi`
2. Project -> Build Project
3. 確認沒有 error

### 4. 啟用 FreeRTOS
1. 用 STM32CubeMX 打開：
   - `firmware/gb_f767zi/gb_f767zi.ioc`

2. 啟用 FreeRTOS：
   - Categories: Middleware and Software Packs -> FREERTOS
   - Interface: CMSIS_V2
   - Advanced Settings: USE_NEWLIB_REENTRANT: Enabled

3. 修改 HAL timebase：
   - Categories: System Core -> SYS
   - Timebase Source: TIM6

4. Generate Code

5. 回到 STM32CubeIDE build：
   - Project -> Build Project

#### 設定原因
- FreeRTOS 使用 CMSIS_V2，是因為 CMSIS-RTOS v2 API 較新，介面也比較適合之後建立多 task 架構。

- 啟用 USE_NEWLIB_REENTRANT，是為了讓 newlib C library 在多 task 環境下比較安全，尤其之後可能會使用 `printf`、`snprintf`、字串處理等功能。不過這會增加 RAM 使用量。

- HAL timebase 改成 TIM6，是因為 FreeRTOS 通常會使用 SysTick 作為 RTOS tick。如果 HAL 也使用 SysTick，兩者會共用同一個 tick 來源，容易造成 timing 或 delay 行為混淆。改用 TIM6 後，SysTick 給 FreeRTOS 使用，TIM6 給 HAL timebase 使用，責任比較清楚。

### 5. 此時的資料夾架構

{% codeblock lang:sh line_number:true %}
gb_project/
└─ firmware/
   └─ gb_f767zi/
      ├─ gb_f767zi.ioc            # CubeMX 設定檔，管理 pinout、clock、peripheral、FreeRTOS
      ├─ STM32F767ZITX_FLASH.ld   # Flash linker script
      ├─ STM32F767ZITX_RAM.ld     # RAM linker script
      ├─ Core/
      │  ├─ Inc/                  # 專案 header、HAL config、FreeRTOSConfig
      │  ├─ Src/                  # main、FreeRTOS task、interrupt、HAL init
      │  └─ Startup/              # MCU startup assembly
      ├─ Drivers/
      │  ├─ CMSIS/                # ARM / STM32 CMSIS device definitions
      │  └─ STM32F7xx_HAL_Driver/ # STM32F7 HAL driver
      └─ Middlewares/
         └─ Third_Party/
            └─ FreeRTOS/          # FreeRTOS kernel source
{% endcodeblock %}

## FreeRTOS task 架構分工
- **input task**：負責按鍵掃描、debounce 與輸入事件
- **display task**：負責畫面更新、sprite / UI refresh
- **game task**：負責寵物狀態、互動邏輯與事件處理
- **BLE / NFC task**：負責外部模組通訊與資料解析
- **sensor task**：負責週期性讀取 IMU 與環境感測器
- **storage task**：負責外部 Flash 存取、紀錄與狀態保存
- **audio / haptic task**：負責音效與震動回饋

---
## 下載連結
- [STM32CubeIDE](https://www.st.com/en/development-tools/stm32cubeide.html)
- [STM32CubeMX](https://www.st.com/en/development-tools/stm32cubemx.html)
  - 用 STM32CubeMX 的版本，STM32CubeMX2是新MCU用的



