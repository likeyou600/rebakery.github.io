---
title: 找不到韌體工作之亡羊補牢專案-Part7
date: 2026-06-02 03:00
permalink: posts/gb-project/part7/
asset_folder: 找不到韌體工作之亡羊補牢專案
cover: '/gallery/cover/part7.png'
thumbnail: '/gallery/cover/part7.png'
tags:
    - GB-Project
categories:
    - Firmware
---

前一 Part 只先把 ILI9341 的基本繪圖 API 做起來。  
雖然 `draw_pixel()`、`fill_rect()`、`draw_bitmap()` 很重要，但畫面看起來還是有點工程測試感。

這一篇想試試看用 Lopaka 這類 UI 工具來設計畫面，看看能不能把畫面變得比較像真的產品。  
順便整理一下 Display Service，讓 UI 畫面不要直接散落在底層 driver 裡。

<!-- more -->

# Lopaka UI 與像素風畫面設計

---

## 系列文章

- {% post_link 找不到韌體工作之亡羊補牢專案-Part1 'Part 1：專案規劃與準備清單' %}
- {% post_link 找不到韌體工作之亡羊補牢專案-Part2 'Part 2：開發環境與 FreeRTOS 架構' %}
- {% post_link 找不到韌體工作之亡羊補牢專案-Part3 'Part 3：Logger Service 與 FreeRTOS 除錯觀察' %}
- {% post_link 找不到韌體工作之亡羊補牢專案-Part4 'Part 4：Input System：GPIO、Polling Debounce 與 Event Queue' %}
- {% post_link 找不到韌體工作之亡羊補牢專案-Part5 'Part 5：Input System：EXTI、ISR Notify 與 Software Timer Debounce' %}
- {% post_link 找不到韌體工作之亡羊補牢專案-Part6 'Part 6：顯示系統：ILI9341 TFT、SPI 與像素繪圖' %}
- Part 7：Lopaka UI 與像素風畫面設計

---

## 本篇目標

- 了解 Lopaka 在這個專案中扮演的角色
- 確認 Lopaka 不是跑在 STM32 上，而是電腦端的 UI / bitmap 產生工具
- 將 Lopaka 產生的畫面資料接到 Part 6 的基本繪圖 API
- 建立 Display Service，避免 UI 邏輯直接操作 ILI9341 driver
- 規劃電子寵物的主畫面、狀態欄與選單畫面
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

真正跑在 NUCLEO-F767ZI 或未來 STM32WB55 上的，仍然是我自己的 firmware：

{% codeblock lang:text line_number:false %}
FreeRTOS
    -> display_task
    -> display_service
    -> ili9341_draw_bitmap()
    -> SPI
    -> ILI9341 TFT
{% endcodeblock %}

所以 Lopaka 不會取代 Part 6 寫的 ILI9341 driver。  
它比較像是幫忙產生漂亮的 UI 畫面、icon、bitmap 或 layout。

---

## 為什麼不直接在 Part 6 用 Lopaka

Part 6 的重點是底層顯示能力：

- SPI 有沒有通
- ILI9341 有沒有初始化成功
- RGB565 顏色對不對
- `draw_pixel()` 能不能畫點
- `fill_rect()` 能不能填區塊
- `draw_bitmap()` 能不能顯示圖片

如果這些還沒確認，就直接導入 Lopaka，很容易搞不清楚問題在哪裡。

例如螢幕沒顯示時，可能是：

- SPI 接線問題
- ILI9341 init sequence 問題
- RGB565 endian 問題
- bitmap 資料格式問題
- Lopaka 產生的 code 不符合目前 driver API

所以 Part 6 先把底層顯示打通。  
Part 7 再把 Lopaka 放進來，會比較好 debug。

---

## Lopaka 會影響基本繪圖 API 嗎？

基本上不應該。

比較好的分層是：

{% codeblock lang:text line_number:false %}
Lopaka / UI tool
    |
    v
UI layout / bitmap data
    |
    v
Display Service
    |
    v
Basic Graphics API
    |
    v
ILI9341 Driver
    |
    v
SPI
{% endcodeblock %}

Part 6 做的基本繪圖 API 仍然是地基：

{% codeblock lang:c line_number:false %}
ili9341_draw_pixel(x, y, color);
ili9341_fill_rect(x, y, w, h, color);
ili9341_draw_bitmap(x, y, w, h, bitmap);
{% endcodeblock %}

Lopaka 產生的資料，最後還是要轉成某種 draw call：

{% codeblock lang:c line_number:false %}
display_draw_icon(x, y, icon_data);
display_draw_status_bar();
display_draw_pet_home_screen();
display_draw_menu();
{% endcodeblock %}

所以 Lopaka 可能會影響的是：

- UI layout 怎麼設計
- bitmap / icon 資料格式
- 字型與圖示來源
- 畫面素材怎麼管理

但不應該改變最底層的 ILI9341 driver 架構。

---

## Display Service 分層

前一篇的 ILI9341 driver 比較偏底層。

例如：

{% codeblock lang:c line_number:false %}
ili9341_write_command();
ili9341_write_data();
ili9341_set_window();
ili9341_fill_rect();
ili9341_draw_bitmap();
{% endcodeblock %}

這一篇開始希望多一層 Display Service。

Display Service 不直接處理 SPI command，而是用比較接近應用層的語意來畫畫面：

{% codeblock lang:c line_number:false %}
display_init();

display_clear();
display_draw_home_screen();
display_draw_status_bar();
display_draw_pet_sprite();
display_draw_menu();
display_present();
{% endcodeblock %}

這樣之後 `game_task` 不需要知道 ILI9341 怎麼設定 window，也不需要自己組 bitmap data。

`game_task` 只要說：

{% codeblock lang:c line_number:false %}
display_draw_pet_home_screen(&pet_state);
{% endcodeblock %}

真正怎麼畫，由 Display Service 處理。

---

## 資料夾規劃

目前可以先把 display 相關檔案分成幾層：

{% codeblock lang:sh line_number:false %}
App/
├─ Services/
│  └─ Display/
│     ├─ display_service.c
│     ├─ display_service.h
│     ├─ display_assets.c
│     └─ display_assets.h
│
├─ Components/
│  └─ ILI9341/
│     ├─ ili9341.c
│     └─ ili9341.h
│
└─ Tasks/
   ├─ Inc/
   │  └─ display_task.h
   └─ Src/
      └─ display_task.c
{% endcodeblock %}

目前先暫定：

- `Components/ILI9341/`
  - 放底層 display driver
  - 負責 command、data、window、RGB565 寫入

- `Services/Display/`
  - 放上層畫面邏輯
  - 負責主畫面、狀態欄、選單、icon、sprite

- `display_assets`
  - 放 Lopaka 匯出後整理過的 bitmap / icon / font data

- `display_task`
  - 之後負責接收畫面更新 request
  - 目前可以先不做太複雜

---

## Lopaka 匯出資料怎麼接進來

Lopaka 可能匯出的是某種 C / C++ array、bitmap、XBMP 或特定 graphics library 的 draw code。

但我的 ILI9341 driver 目前最想吃的是 RGB565 bitmap：

{% codeblock lang:c line_number:false %}
const uint16_t bitmap_pet_idle[] = {
    0x0000, 0xFFFF, 0xF800,
    ...
};
{% endcodeblock %}

然後用：

{% codeblock lang:c line_number:false %}
ili9341_draw_bitmap(x, y, w, h, bitmap_pet_idle);
{% endcodeblock %}

所以中間可能需要一個轉換流程：

{% codeblock lang:text line_number:false %}
Lopaka export
    -> 檢查資料格式
    -> 轉成 RGB565 / indexed bitmap
    -> 放進 display_assets.c
    -> display_service 呼叫 draw_bitmap
{% endcodeblock %}

第一版可以先不要做到很完美。  
只要能把一個小圖示或一個小 UI 畫面顯示在 TFT 上，就算成功。

---

## UI 畫面規劃

這個電子寵物裝置之後至少會需要幾個基本畫面。

### 主畫面

主畫面會顯示：

- 寵物 sprite
- 狀態欄
- 背景
- 目前時間或簡單狀態
- A / B 鍵提示

概念：

{% codeblock lang:text line_number:false %}
+------------------------------+
| HP  ♥♥♥   Mood 🙂   BLE --   |
|                              |
|          /\_/\              |
|         ( o.o )              |
|          > ^ <               |
|                              |
| A: Feed        B: Menu       |
+------------------------------+
{% endcodeblock %}

---

### 狀態欄

狀態欄可以放在畫面上方：

{% codeblock lang:text line_number:false %}
HP / Mood / Hunger / BLE / NFC
{% endcodeblock %}

這一塊很適合用 Lopaka 先設計 layout，再轉成 Display Service 的 draw calls。

---

### 選單畫面

選單畫面可以先做簡單版本：

{% codeblock lang:text line_number:false %}
> Feed
  Play
  Status
  Settings
{% endcodeblock %}

之後 Part 8 的 `game_task` 可以根據 input event 切換選單項目。

---

### 彈窗 / 提示

例如：

{% codeblock lang:text line_number:false %}
NFC touched!
BLE friend nearby!
Saved!
{% endcodeblock %}

這些都可以先用簡單 `fill_rect()` + `draw_text()` 做出來。

---

## 像素風畫面策略

這塊 TFT 是 320×240。  
如果直接用 320×240 做素材，圖會比較大，也比較不像復古掌機。

所以我想先用一個比較低解析度的 logical canvas：

{% codeblock lang:text line_number:false %}
logical canvas : 160 x 120
scale          : 2x
physical TFT   : 320 x 240
{% endcodeblock %}

也就是說，UI 或 sprite 可以先以 160×120 設計。  
輸出到 TFT 時，每個 logical pixel 放大成 2×2 physical pixel。

這樣有幾個好處：

- 比較有像素風
- 素材比較小
- 畫面更新量比較少
- 也比較接近復古掌機的感覺

後續可以考慮：

{% codeblock lang:text line_number:false %}
tile size  : 8 x 8
sprite size: 16 x 16 或 32 x 32
scale      : 2x
{% endcodeblock %}

---

## display_task 初步規劃

目前 Part 7 不一定要完整實作 `display_task`，但可以先規劃它的角色。

之後希望畫面更新不是到處直接呼叫 display API，而是透過 display request。

概念：

{% codeblock lang:text line_number:false %}
game_task
    |
    | display request
    v
display_queue
    |
    v
display_task
    |
    v
display_service
    |
    v
ILI9341 driver
{% endcodeblock %}

第一版可以先定義幾種 request：

{% codeblock lang:c line_number:false %}
typedef enum
{
    DISPLAY_REQ_HOME_SCREEN,
    DISPLAY_REQ_MENU_SCREEN,
    DISPLAY_REQ_STATUS_BAR,
    DISPLAY_REQ_PET_SPRITE,
} display_request_type_t;

typedef struct
{
    display_request_type_t type;
    uint32_t param;
} display_request_t;
{% endcodeblock %}

這樣後面 `game_task` 要更新畫面時，可以先送 request，不一定直接碰 display driver。

不過這一篇先不要太複雜。  
如果一開始只是測 Lopaka 匯出的 bitmap，可以先直接呼叫 `display_draw_home_screen()`。

---

## 測試步驟

第一版測試可以這樣排：

1. Part 6 的 `ili9341_fill_screen()` 仍然可以正常使用
2. 顯示一個手刻的 `fill_rect()` UI 框
3. 從 `display_assets.c` 顯示一個小 bitmap icon
4. 嘗試匯入 Lopaka 產生的 icon / bitmap
5. 將它轉成目前 driver 可用的 RGB565 格式
6. 顯示第一個主畫面草稿
7. 用 input button 切換兩個簡單畫面

預期 log：

{% codeblock lang:text line_number:false %}
[00001234][INFO ][DISPLAY] display service init
[00001300][INFO ][DISPLAY] draw home screen
[00001350][INFO ][DISPLAY] draw status bar
[00001420][INFO ][DISPLAY] draw pet bitmap
[00001500][INFO ][DISPLAY] home screen done
{% endcodeblock %}

---

## Lopaka 導入時要注意的事

### 1. 匯出的 code 不一定能直接用

Lopaka 可能針對某些 graphics library 產生 code。  
如果它產生的是 `tft.drawBitmap()`、`display.drawXBitmap()` 之類的呼叫，就不一定能直接貼到目前的 ILI9341 driver 裡。

這時候要做的不是硬改 driver，而是把它轉成自己的 Display Service 可以使用的資料格式。

---

### 2. 顏色格式要確認

ILI9341 常用 RGB565。  
如果 Lopaka 匯出的資料是 monochrome bitmap、XBMP、RGB888 或其他格式，就需要轉換。

常見轉換方向：

{% codeblock lang:text line_number:false %}
RGB888 -> RGB565
1-bit bitmap -> foreground / background RGB565
indexed color -> palette -> RGB565
{% endcodeblock %}

---

### 3. 素材大小要控制

STM32F767ZI 資源比 STM32WB55 充裕，但也不能毫無限制地放大圖。

例如一張 320×240 RGB565 全螢幕圖：

{% codeblock lang:text line_number:false %}
320 x 240 x 2 bytes = 153,600 bytes
{% endcodeblock %}

如果放很多張全螢幕圖片，Flash 很快就會變大。  
之後比較合理的方式是用：

- 小 icon
- tile
- sprite
- palette
- 外部 SPI Flash 存素材

---

### 4. 先做小畫面，不要一開始就做完整 UI

第一版先讓一個小 icon 或一個小 panel 顯示出來就好。

例如：

{% codeblock lang:text line_number:false %}
32 x 32 icon
80 x 24 status bar
160 x 120 logical canvas prototype
{% endcodeblock %}

等資料格式確認後，再做完整畫面。

---

## 本篇小結

這一篇的重點不是重寫 ILI9341 driver，而是開始把畫面從「測試圖案」推向「產品畫面」。

目前規劃是：

- Part 6 先完成底層 ILI9341 driver 與基本繪圖 API
- Part 7 用 Lopaka 或類似工具設計 UI / icon / bitmap
- 將匯出的資料轉成 Display Service 可以使用的格式
- 初步建立主畫面、狀態欄、選單畫面的繪圖流程

Lopaka 不會直接跑在 STM32 / FreeRTOS 上。  
它比較像是電腦端的 UI / bitmap 產生工具。

真正跑在板子上的仍然是：

{% codeblock lang:text line_number:false %}
FreeRTOS
    -> display_task
    -> display_service
    -> ILI9341 driver
    -> SPI
    -> TFT
{% endcodeblock %}

等這一篇完成後，下一步就可以正式把 input event、display service 和電子寵物狀態機串起來。
