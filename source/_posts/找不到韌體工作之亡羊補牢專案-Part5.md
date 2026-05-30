---
title: 找不到韌體工作之亡羊補牢專案-Part5
date: 2026-06-01 03:00
slug: GB-Project-Part5
permalink: 20260525/GB-Project-Part5/
asset_folder: 找不到韌體工作之亡羊補牢專案
cover: '/gallery/cover/part5.png'
thumbnail: '/gallery/cover/part5.png'
tags:
    - GB-Project
categories:
    - Firmware
---
Part 4 練習了 Polling 版本的 Input，想當然學過 OS 的各位肯定也很懷念 Interrupt。
沒有錯，就是有一天要讓自己的胃滿足 大滿足，所以今天的企劃就是，
早餐吃到飽

<!-- more -->
---
## 系列文章
- {% post_link 找不到韌體工作之亡羊補牢專案-Part1 'Part 1：專案規劃與準備清單' %}
- {% post_link 找不到韌體工作之亡羊補牢專案-Part2 'Part 2：開發環境與 FreeRTOS 架構' %}
- {% post_link 找不到韌體工作之亡羊補牢專案-Part3 'Part 3：Logger Service 與 FreeRTOS 除錯觀察' %}
- {% post_link 找不到韌體工作之亡羊補牢專案-Part4 'Part 4：Input System：GPIO、Polling Debounce 與 Event Queue' %}
- Part 5：Input System：EXTI、ISR Notify 與 Software Timer Debounce

---
## 本篇目標
  - 使用 NUCLEO-F767ZI User Button + EXTI，練習 interrupt 只負責通知，不直接處理完整按鍵邏輯
  - 實作 EXTI + software timer debounce，將中斷觸發後的按鍵狀態整理成穩定的 input event

---
## 專案下載

本篇文章對應的完整範例專案已整理在 GitHub Release 中，
如果想直接對照程式碼或跳過環境建立流程，可以從以下連結下載

[🍦下載本篇範例專案-Part 5🍦](https://github.com/likeyou600/gb_project/releases/tag/Part5)

---
## 輸入系統設計 EXTI

前面 Polling 版本的做法，是由 `input_task` 固定週期掃描 GPIO。
這種方式很適合方向鍵、A/B 鍵、選單鍵這類會持續被玩家操作的按鍵，邏輯單純，也容易和 debounce、event queue 整合。

不過在 FreeRTOS 專案裡，也很常遇到另一種情境：
外部事件先透過 interrupt 通知系統，接著再把真正要處理的事情交給 task 執行。

這種做法的好處是 ISR 可以保持很短，只負責「通知有事情發生」，而不是在中斷裡做太多複雜邏輯。
實際的 debounce、狀態判斷、event queue 發送，仍然可以放回 task 或 software timer 裡處理。

所以這一段先用 NUCLEO-F767ZI 板上的 User Button 練習 EXTI，目標不是把所有按鍵都改成 interrupt，而是先熟悉：

- GPIO 如何設定成 EXTI
- 中斷發生後如何進入 callback
- ISR 裡如何通知 `input_task`
- 如何搭配 software timer 做 debounce
- 最後如何把穩定後的按鍵狀態轉成 input event

在進入實作前，先整理幾個這段會一直出現的名詞。
- `EXTI`
  - External Interrupt/Event Controller，用來讓外部 GPIO 或內部 peripheral event 觸發 interrupt / event
- `IRQ`
  - Interrupt Request，中斷請求。可以把它想成某個硬體或事件對 CPU 發出的「我要中斷」訊號
- `NVIC` 
  - Nested Vectored Interrupt Controller，Cortex-M 裡負責管理中斷優先權、啟用/停用中斷的控制器
- `ISR`
  - Interrupt Service Routine，也就是中斷服務程式。中斷發生時，CPU 會先跳進 ISR 處理

原因是流程上可以這樣理解：
{% codeblock lang:c line_number:false %}
GPIO 狀態變化
    |
    v
EXTI 偵測到外部事件
    |
    v
產生 IRQ
    |
    v
NVIC 判斷這個 IRQ 是否啟用、優先權怎麼排
    |
    v
CPU 進入對應 ISR
{% endcodeblock %}

### 0. 輸入事件資料流

{% codeblock lang:c line_number:false %}
🌕Init side:🌕
    app_main_init()
        |
        | input_service_init() 這邊採用跟 Polling 一樣的
        |   -> osMessageQueueNew(APP_INPUT_EVENT_QUEUE_DEPTH,
        |                        sizeof(input_event_t),
        |                        NULL)
        v
    input event queue ready
------------------------
🌗Interrupt side:🌗
    User Button pressed / released
        |
        | PC13 GPIO level changed
        v
    EXTI detects selected edge
        |
        | PC13 -> EXTI13
        | Rising / Falling edge triggered
        |
        | 設定來源：
        |   - CubeMX .ioc
        |   - Core/Src/gpio.c
        |   - MX_GPIO_Init()
        |   - HAL_GPIO_Init(USER_Btn_GPIO_Port, &GPIO_InitStruct)
        v
    EXTI generates IRQ
        |
        | EXTI13 belongs to EXTI line[15:10]
        |
        | 這段是 EXTI peripheral 硬體行為，
        | 不是一般 user code function。
        | CubeMX / HAL 會在初始化時設定 EXTI line、trigger edge。
        v
    NVIC receives IRQ
        |
        | NVIC checks:
        |   - Is EXTI line[15:10] interrupt enabled?
        |   - What is its priority?
        |
        | 設定來源：
        |   - Core/Src/gpio.c
        |   - MX_GPIO_Init()
        |   - HAL_NVIC_SetPriority(EXTI15_10_IRQn, ...)
        |   - HAL_NVIC_EnableIRQ(EXTI15_10_IRQn)
        v
    CPU enters ISR
        |
        | 程式碼位置：
        |   - Core/Src/stm32f7xx_it.c
        |
        | EXTI15_10_IRQHandler()
        |   -> HAL_GPIO_EXTI_IRQHandler(USER_Btn_Pin)
        v
    HAL GPIO EXTI callback
        |
        | 程式碼位置：
        |   - 自己實作 callback 的檔案
        |   - 例如 App/Tasks/Src/input_task.c
        |   - 或 Core/Src/main.c
        |
        | HAL_GPIO_EXTI_Callback(GPIO_Pin)
        |   -> check GPIO_Pin == USER_Btn_Pin
        v
    notify input_task from ISR context
        |
        | input_task_notify_user_button_from_isr()
        |   -> osThreadFlagsSet(inputTaskHandle,
        |                       INPUT_THREAD_FLAG_USER_BTN_IRQ)
        v
    input_task notified
------------------------
🌓Debounce side:🌓
    input_task
        |
        | 收到 INPUT_THREAD_FLAG_USER_BTN_IRQ
        |   -> osTimerStart(userButtonDebounceTimerHandle,
        |                   APP_INPUT_DEBOUNCE_MS)
        v
    software timer delay
        |
        v
    input_task_user_button_timer_cb()
        |
        | board_input_is_pressed(BOARD_INPUT_INT_USER)
        |   -> HAL_GPIO_ReadPin(...)
        v
    stable GPIO state
        |
        | pressed state changed
        v
    input_service_post_event(INPUT_KEY_TEST, INPUT_ACTION_SHORT)
        |
        | osMessageQueuePut(inputEventQueueHandle, ...)
        v
    input event queue
------------------------
🌚Consumer side:🌚
    input_debug_task
    game_task，之後 Part 6 實作
        |
        | input_service_get_event(&event, osWaitForever)
        v
    input_event_t
        |
        | event.key
        | event.action
        | event.timestamp
        v
    LOG_INFO("input", ...)
{% endcodeblock %}

### 1. CubeMX EXTI 設定

在開始設定 EXTI 之前，先看一下 STM32F767ZIT6 的 External interrupt/event GPIO mapping。

[STM32F767ZIT6_spec](找不到韌體工作之亡羊補牢專案/spec/rm0410-stm32f76xxx-and-stm32f77xxx-advanced-armbased-32bit-mcus-stmicroelectronics.pdf)

在 Reference Manual 的 `11.8 External interrupt/event line mapping` 章節裡，可以看到 GPIO 和 EXTI line 的對應關係。

![External interrupt/event GPIO mapping](找不到韌體工作之亡羊補牢專案/exti_gpoi.png)

STM32 的 EXTI 不是每一顆 GPIO 都有一條獨立的 interrupt line，而是依照 GPIO 的 pin number 對應到 `EXTI0 ~ EXTI15`。

例如：

- `PA0 / PB0 / PC0 ...` 會共用 `EXTI0`
- `PA1 / PB1 / PC1 ...` 會共用 `EXTI1`
- `PA13 / PB13 / PC13 / PE13 ...` 會共用 `EXTI13`
- `PA15 / PB15 / PC15 ...` 會共用 `EXTI15`

也就是說，`EXTI13` 同時間只能從其中一個 GPIO port 接進來。

以 NUCLEO-F767ZI 板上的 User Button 為例，這顆按鍵通常已經在 CubeMX 裡被命名成 `USER_Btn`，而且接在 `PC13`。
因為 `PC13` 對應的是 `EXTI13`，所以如果外部按鍵剛好也接在 `PE13`，就不能同時把 `PC13` 和 `PE13` 都設定成 GPIO EXTI。

這也是為什麼這篇裡外接五向鍵仍然維持 Polling，而 EXTI 只拿板子上的 User Button 來練習。

![PC13 EXTI 設定](找不到韌體工作之亡羊補牢專案/PC_13_Interrupt.png)

在 CubeMX 裡，選到 `PC13` 之後，可以看到 GPIO mode 有幾種跟 EXTI 有關的選項：

- `External Interrupt Mode with Rising edge trigger detection`
- `External Interrupt Mode with Falling edge trigger detection`
- `External Interrupt Mode with Rising/Falling edge trigger detection`
- `External Event Mode with Rising edge trigger detection`
- `External Event Mode with Falling edge trigger detection`
- `External Event Mode with Rising/Falling edge trigger detection`

這裡要選的是 **External Interrupt Mode**，因為我們希望 GPIO 狀態變化時可以進到 interrupt handler，後面再透過 ISR 通知 `input_task`。

至於 **External Event Mode**，它比較像是產生事件訊號，不一定會進入 CPU 的中斷處理流程。這篇的目標是練習 GPIO interrupt notify task，所以先不使用 Event Mode。

觸發邊緣可以依照需求選擇：

- 只想處理「按下」那一瞬間，可以選 Rising edge 或 Falling edge，實際要看按鍵電路按下時是變成 HIGH 還是 LOW
- 想同時觀察按下與放開，可以選 Rising/Falling edge

這篇為了搭配 software timer debounce，會先使用 `Rising/Falling edge`。
這樣按下和放開都會進 interrupt，但 ISR 裡不直接判斷按鍵事件，而是啟動 debounce timer。等 timer 到期後，再重新讀一次 GPIO，確認目前狀態是否真的穩定。

接著還要到 NVIC 裡啟用對應的 EXTI interrupt。

![NVIC Interrupt Table](找不到韌體工作之亡羊補牢專案/NVIC_Interrupt_table.png)

因為 User Button 接在 `PC13`，所以它對應到的是 `EXTI13`。
在 NVIC 裡要 enable 的中斷項目是：

```text
EXTI line[15:10] interrupts
```

這裡不會看到單獨的 `EXTI13 interrupt`，是因為 STM32 的 EXTI line 在 NVIC 裡會依照編號分組。

大致上可以分成：

- `EXTI0 ~ EXTI4`：各自有獨立的 interrupt handler
- `EXTI5 ~ EXTI9`：共用 `EXTI9_5_IRQHandler`
- `EXTI10 ~ EXTI15`：共用 `EXTI15_10_IRQHandler`

所以 User Button 的中斷路徑可以理解成：

```text
PC13 → EXTI13 → EXTI15_10_IRQHandler
```

也就是說，當 `PC13` 觸發外部中斷時，最後會進到 `EXTI15_10_IRQHandler` 這組中斷入口。

另外，CubeMX 的 NVIC Interrupt Table 不一定會把所有 EXTI interrupt 都列出來。
它通常會根據目前專案裡有被設定成 `GPIO_EXTI` 的腳位，顯示對應需要啟用的 interrupt。

以目前設定來說，只有 `PC13` 被設定成 `GPIO_EXTI13`，所以畫面上只會看到 `EXTI line[15:10] interrupts`。
如果之後把 `PE9` 改成 `GPIO_EXTI9`，NVIC 裡才會出現 `EXTI line[9:5] interrupts`。

設定完成後，CubeMX 產生的 code 裡就會包含對應的 EXTI IRQ handler。
後面我們只需要在 HAL 提供的 callback 裡判斷是不是 `USER_Btn_Pin` 觸發，再通知 `input_task` 或啟動 software timer debounce。


### 2. ISR 只做通知，不直接處理按鍵

在 interrupt 裡面不適合做太多事情。

例如：

- 不在 ISR 裡做 debounce
- 不在 ISR 裡印 log
- 不在 ISR 裡跑遊戲邏輯
- 不在 ISR 裡直接做複雜的 queue 操作

這邊的 ISR 只做一件事：通知 `input_irq_task` 有 User Button 的 EXTI 事件發生。

HAL 的 EXTI callback 裡面判斷是哪一個 GPIO pin 觸發：

{% codeblock Core/Src/stm32f7xx_it.c lang:c line_number:true %}
void HAL_GPIO_EXTI_Callback(uint16_t GPIO_Pin)
{
  if (GPIO_Pin == USER_Btn_Pin)
  {
    input_task_notify_user_button_from_isr();
  }
}
{% endcodeblock %}

這樣 EXTI callback 不需要知道 input event 的格式，也不需要知道 queue 怎麼運作。  
它只把「User Button 有 interrupt」這件事往上通知，剩下交給 `input_task`。


{% codeblock App/Tasks/Src/input_irq_task.c lang:c line_number:true %}
#define INPUT_THREAD_FLAG_USER_BTN_IRQ (1UL << 0)

static osThreadId_t inputTaskHandle = NULL;

void input_task_notify_user_button_from_isr(void)
{
  if (inputTaskHandle != NULL)
  {
    (void)osThreadFlagsSet(inputTaskHandle, INPUT_THREAD_FLAG_USER_BTN_IRQ);
  }
}
{% endcodeblock %}

### 3. 建立 software timer debounce

Polling 版本的 debounce 是靠每次掃描 GPIO 時，比對 `HAL_GetTick()` 和上次變化時間。

EXTI 版本的 debounce 則改成：

1. EXTI 發生
2. 通知 `input_task`
3. `input_task` 啟動一次性 software timer
4. timer 到期後重新讀 GPIO
5. 如果狀態真的改變，再送出 input event

先建立 User Button 專用的 debounce timer：

{% codeblock App/Tasks/Src/input_task.c lang:c line_number:true %}
#define APP_INPUT_EXTI_DEBOUNCE_MS 30U

static osTimerId_t userButtonDebounceTimerHandle = NULL;
static bool userButtonStablePressed = false;

static void input_task_user_button_timer_cb(void *argument)
{
  (void)argument;

  bool pressed = board_input_is_pressed(BOARD_INPUT_INT_USER);

  if (pressed != userButtonStablePressed)
  {
    userButtonStablePressed = pressed;

    if (userButtonStablePressed)
    {
      (void)input_service_post_event(INPUT_KEY_TEST, INPUT_ACTION_SHORT);
    }
  }
}
{% endcodeblock %}

這裡的重點是：timer callback 到期後才讀 GPIO。

因為機械按鍵剛觸發 interrupt 的瞬間，訊號可能還在彈跳。  
如果 ISR 一進來就立刻判斷按鍵狀態，很容易把彈跳誤判成多次輸入。

等 `APP_INPUT_EXTI_DEBOUNCE_MS` 之後再讀一次，就比較有機會拿到穩定狀態。

### 4. input_task 同時保留 Polling 與 EXTI 處理

這一版不把原本 Polling 架構拆掉。

方向鍵、OK 鍵還是照原本的 polling loop 掃描；User Button 則額外支援 EXTI 通知。  
所以 `input_task` 會做兩件事：

- 固定掃描 `buttonMap[]`
- 在等待下一次掃描期間，順便接收 EXTI thread flag

{% codeblock App/Tasks/Src/input_task.c lang:c line_number:true %}
void input_task(void *argument)
{
  (void)argument;

  inputTaskHandle = osThreadGetId();

  userButtonDebounceTimerHandle = osTimerNew(
      input_task_user_button_timer_cb,
      osTimerOnce,
      NULL,
      NULL);

  for (;;)
  {
    for (size_t i = 0U; i < (sizeof(buttonMap) / sizeof(buttonMap[0])); i++)
    {
      bool raw_pressed = board_input_is_pressed(buttonMap[i].board_input);
      input_task_debounce_button(&buttonMap[i], &buttonState[i], raw_pressed);
    }

    uint32_t flags = osThreadFlagsWait(
        INPUT_THREAD_FLAG_USER_BTN_IRQ,
        osFlagsWaitAny,
        APP_INPUT_SCAN_PERIOD_MS);

    if ((flags & INPUT_THREAD_FLAG_USER_BTN_IRQ) != 0U)
    {
      if (userButtonDebounceTimerHandle != NULL)
      {
        (void)osTimerStart(userButtonDebounceTimerHandle, APP_INPUT_EXTI_DEBOUNCE_MS);
      }
    }
  }
}
{% endcodeblock %}

這裡把原本的 `osDelay(APP_INPUT_SCAN_PERIOD_MS)` 換成 `osThreadFlagsWait(..., APP_INPUT_SCAN_PERIOD_MS)`。

效果類似：

- 沒有 EXTI 事件時：timeout 到期，繼續下一輪 polling
- 有 EXTI 事件時：提早醒來，啟動 debounce timer

所以整體仍然保留 Polling 的設計，只是讓 User Button 可以透過 interrupt 提早通知 `input_task`。

### 5. 為什麼不是在 ISR 裡直接送 input event？

一開始很容易想成：

> User Button interrupt 進來了，那就直接 `input_service_post_event()` 不就好了？

但這樣會把幾件事情混在 interrupt 裡：

- button debounce
- event 判斷
- queue 操作
- 可能還會接著印 log 或做更多處理

這會讓 ISR 越來越重，也比較難維護。

這篇先採用比較保守的切法：

| 階段                    | 負責內容                  |
| ----------------------- | ------------------------- |
| EXTI ISR                | 只通知 `input_task`       |
| `input_task`            | 啟動 debounce timer       |
| software timer callback | 重新讀 GPIO，確認穩定狀態 |
| Input Service           | 統一送出 input event      |
| Consumer task           | 取出 input event 並處理   |

這樣底層中斷、debounce、event queue 和遊戲邏輯就不會全部混在一起。

### 6. 測試結果

完成後，按下 User Button 時，預期會看到類似下面的 log：

{% codeblock lang:text line_number:false %}
[00001800][INFO ][INPUT] user button irq
[00001832][INFO ][INPUT] key=TEST action=SHORT tick=1832
{% endcodeblock %}

如果有開 Rising/Falling edge，放開按鍵時也會觸發一次 EXTI。  
不過目前 timer callback 只有在穩定狀態變成 pressed 時才送出 `INPUT_ACTION_SHORT`，所以 release 不會印出 input event。

之後如果要支援更完整的行為，可以再把這裡擴充成：

- `INPUT_ACTION_PRESS`
- `INPUT_ACTION_RELEASE`
- `INPUT_ACTION_SHORT`
- `INPUT_ACTION_LONG`

目前這篇先做到「User Button 透過 EXTI 觸發，經過 software timer debounce 後，送出一個 short event」就好。
