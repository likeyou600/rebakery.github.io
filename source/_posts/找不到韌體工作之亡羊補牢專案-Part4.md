---
title: 找不到韌體工作之亡羊補牢專案-Part4
date: 2026-05-29 03:00
slug: GB-Project-Part4
permalink: 20260529/GB-Project-Part4/
asset_folder: 找不到韌體工作之亡羊補牢專案
cover: '/gallery/cover/part4.png'
thumbnail: '/gallery/cover/part4.png'
tags:
- GB-Project
categories:
- Firmware
---

Part 3 練習了 FreeRTOS Queue 和 Logger Service。
雖然除錯很重要啦，但，沒有接任何外部設備就超無聊。
這 Part 就把買的一堆不同類型按鈕、搖桿試著接接看!!

<!-- more -->

---
# Input System：GPIO、Debounce 與 Event Queue
## 系列文章

- {% post_link 找不到韌體工作之亡羊補牢專案-Part1 'Part 1：專案規劃與準備清單' %}
- {% post_link 找不到韌體工作之亡羊補牢專案-Part2 'Part 2：開發環境與 FreeRTOS 架構' %}
- {% post_link 找不到韌體工作之亡羊補牢專案-Part3 'Part 3：Logger Service 與 FreeRTOS 除錯觀察' %}
- Part 4：Input System：GPIO、Debounce 與 Event Queue
---
## 前言
這一篇的目標不是單純讀到 GPIO high / low，而是建立一個 input system。

硬體按鍵會先經過 debounce，再被轉成 `input_event_t`，最後丟進 FreeRTOS queue。  
後面的 `game_task` 不需要知道按鍵接在哪個 GPIO，只要處理像 `INPUT_UP_SHORT`、`INPUT_A_LONG` 這類事件即可。

---
## 本篇目標
- 整理目前手上的輸入模組：五向鍵、輕觸開關、Joystick Shield
- 使用 GPIO input 讀取按鍵狀態
- 使用 polling + timestamp 實作第一版 debounce
- 定義 `input_event_t`，將實體按鍵轉成軟體事件
- 使用 FreeRTOS queue 建立 `input_event_queue`
- 使用 Part 3 的 `logger_task` 觀察按鍵事件
- 初步規劃 short press / long press 的處理方式
- 使用 User Button + EXTI 練習從 interrupt 通知 `input_task`
- 補一版 EXTI + software timer debounce 的事件驅動做法

---

## 目前有的輸入模組

### 五向導航按鍵模組

![](找不到韌體工作之亡羊補牢專案/5d_button.png)

預計用途：
- `COM`：common pin
- `UP / DOWN / LEFT / RIGHT`：方向操作
- `MID`：確認鍵
- `SET`：選單鍵
- `RST`：目前先不一定使用，避免和系統 reset 混淆

### 12×12 輕觸開關

![](找不到韌體工作之亡羊補牢專案/normal_button.png)

預計用途：
- `A`：確認 / 互動
- `B`：返回 / 取消
- `START`：打開選單
- `BACK`：返回上一層

這類按鍵接法很單純，可以用 GPIO input 搭配 internal pull-up 或 pull-down。
目前第一版會先用 internal pull-up，按下時讀到低電位。

### Joystick Shield
![](找不到韌體工作之亡羊補牢專案/game_button.png)

這塊原本是 Arduino 用的 Joystick Shield，上面有類比搖桿和多顆按鍵。

雖然它不是最後掌機外觀會使用的形式，但很適合拿來快速測試多按鍵輸入。
目前先把它當作測試用輸入板，之後真正做外殼時，再改成獨立按鍵或五向鍵配置。

這一篇會先以五向鍵和輕觸開關為主，Joystick Shield 暫時當作備用測試模組。

---
## 輸入系統設計
這一篇的重點不是「某個 GPIO 有沒有被按下」，而是建立一層 input abstraction。

也就是把實體按鍵：

{% codeblock lang:text line_number:false %}
GPIO high / low
{% endcodeblock %}

轉成軟體事件：

{% codeblock lang:text line_number:false %}
INPUT_UP_SHORT
INPUT_A_SHORT
INPUT_B_LONG
INPUT_MENU_SHORT
{% endcodeblock %}

之後 `game_task` 不需要知道按鍵接在哪個 GPIO，也不需要自己處理 debounce。
它只要從 input queue 收到事件，再根據目前遊戲狀態決定要做什麼。

### 輸入事件資料流
整體資料流預計如下：

{% codeblock lang:text line_number:false %}
GPIO input / EXTI
    |
    v
input driver
    |
    v
debounce
    |
    v
input_event_t
    |
    v
input_event_queue
    |
    v
game_task，之後 Part 6 實作
{% endcodeblock %}

目前 Part 4 先不實作真正的 `game_task`，只用 Part 3 的 `logger_task` 印出 input event。

### input_event_t 設計
先定義一個簡單的 input event。

{% codeblock lang:c line_number:true %}
typedef enum
{
    INPUT_KEY_UP,
    INPUT_KEY_DOWN,
    INPUT_KEY_LEFT,
    INPUT_KEY_RIGHT,
    INPUT_KEY_OK,
    INPUT_KEY_A,
    INPUT_KEY_B,
    INPUT_KEY_START,
    INPUT_KEY_BACK,
} input_key_t;

typedef enum
{
    INPUT_ACTION_PRESS,
    INPUT_ACTION_RELEASE,
    INPUT_ACTION_SHORT,
    INPUT_ACTION_LONG,
} input_action_t;

typedef struct
{
    input_key_t key;
    input_action_t action;
    uint32_t timestamp;
} input_event_t;
{% endcodeblock %}

第一版可以先只做 `INPUT_ACTION_SHORT`。
等基本按鍵穩定後，再補 `PRESS`、`RELEASE`、`LONG`。

### input_event_queue 設計

按鍵事件會透過 FreeRTOS queue 傳給後續 task。

{% codeblock lang:c line_number:true %}
#define INPUT_EVENT_QUEUE_DEPTH 8

osMessageQueueId_t inputEventQueueHandle;

void input_service_init(void) 
{
    inputEventQueueHandle = osMessageQueueNew(
        INPUT_EVENT_QUEUE_DEPTH,
        sizeof(input_event_t),
        NULL
    );
}
{% endcodeblock %}

之後當 input task 偵測到按鍵事件時，就把 event 丟進 queue：

{% codeblock lang:c line_number:true %}
static void input_post_event(input_key_t key, input_action_t action)
{
    input_event_t event =
    {
        .key = key,
        .action = action,
        .timestamp = HAL_GetTick(),
    };
    osMessageQueuePut(inputEventQueueHandle, &event, 0, 0);
}
{% endcodeblock %}

Part 4 目前先讓測試用 task 從 `input_event_queue` 取出 event，並用 log 印出來。

{% codeblock lang:c line_number:true %}
void input_debug_task(void *argument)
{
    input_event_t event;
    while (1)
    {
        if (osMessageQueueGet(inputEventQueueHandle, &event, NULL, osWaitForever) == osOK)
        {
            LOG_INFO("INPUT", "key=%d action=%d tick=%lu",
                    event.key,
                    event.action,
                    event.timestamp);
        }
    }
}
{% endcodeblock %}

---
## 按鍵 debounce 實作策略

按鍵輸入最麻煩的地方不是讀 GPIO，而是按鍵彈跳。

機械按鍵按下或放開時，訊號不會是完美的一次 high / low 切換。  
它可能會在幾毫秒內抖動很多次，如果不做 debounce，按一次按鍵可能會被判斷成很多次。

這篇會整理三種做法：

| 做法                               | 簡單功用                                                                  | 適合情境 / 模組                                                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Polling + timestamp debounce**   | 週期性掃描 GPIO，確認按鍵狀態穩定後產生 `input_event`                     | 最適合一般按鍵、方向鍵、A/B 鍵、選單鍵；可以用在五向導航按鍵模組、12×12 輕觸開關、Joystick Shield 上的按鍵                  |
| **EXTI notify**                    | 按鍵觸發中斷後，只通知 `input_task`，真正處理交給 task                    | 適合單一重要按鍵、低功耗喚醒、需要即時反應的外部事件；可以用在 NUCLEO-F767ZI User Button、電源鍵、特殊功能鍵                |
| **EXTI + software timer debounce** | 按鍵中斷後啟動 debounce timer，等彈跳結束再通知 `input_task` 讀取穩定狀態 | 適合事件驅動 debounce、低功耗設計、不想讓 input task 固定週期掃描的情境；可以用在 User Button、電源鍵、喚醒鍵或少數重要按鍵 |

這篇的主線會先用 **Polling + timestamp debounce**。

原因是這個版本最直覺，適合先確認 GPIO 接線、按鍵狀態、debounce 邏輯和 `input_event_queue` 都能正常運作。  
對一般按鍵、方向鍵、A/B 鍵來說，固定每 5 ~ 10 ms 掃描一次通常已經足夠。

另外會用 NUCLEO-F767ZI 板上的 User Button 做一個 **EXTI notify** 小實驗。  
這個實驗的重點不是取代 polling，而是練習 interrupt 發生後，不在 ISR 裡做太多事情，只通知 `input_task` 處理。

最後再補一個 **EXTI + software timer debounce** 的事件驅動版本。  
這個版本會把 EXTI 和 debounce timer 結合起來，按鍵中斷發生後先啟動 software timer，等彈跳結束再通知 `input_task` 讀取穩定狀態。

所以這一章會練到：

- GPIO input
- debounce
- FreeRTOS queue
- EXTI interrupt
- software timer
- ISR notify / task notification

### Polling 版本：GPIO + timestamp debounce

第一版先用 polling，不急著一開始就上 EXTI interrupt。

原因是 polling 比較直覺，適合先確認接線、GPIO 設定和 debounce 邏輯。

#### GPIO 讀取

假設目前使用 internal pull-up，按下時 GPIO 會讀到 `GPIO_PIN_RESET`。

{% codeblock lang:c line_number:true %}
static bool input_is_pressed(GPIO_TypeDef *port, uint16_t pin)
{
    return HAL_GPIO_ReadPin(port, pin) == GPIO_PIN_RESET;
}
{% endcodeblock %}

之後可以針對每顆按鍵建立 mapping：

{% codeblock lang:c line_number:true %}
typedef struct
{
    input_key_t key;
    GPIO_TypeDef *port;
    uint16_t pin;
} input_button_hw_t;
{% endcodeblock %}

例如：

{% codeblock lang:c line_number:true %}
static const input_button_hw_t button_map[] = {
    { INPUT_KEY_UP,    GPIOx, GPIO_PIN_x },
    { INPUT_KEY_DOWN,  GPIOx, GPIO_PIN_x },
    { INPUT_KEY_LEFT,  GPIOx, GPIO_PIN_x },
    { INPUT_KEY_RIGHT, GPIOx, GPIO_PIN_x },
    { INPUT_KEY_OK,    GPIOx, GPIO_PIN_x },
};
{% endcodeblock %}

這裡的 GPIO port / pin 之後要依照實際接線修改。


#### Timestamp debounce

機械按鍵按下或放開時，訊號不會是完美的一次 high / low 切換。
它可能會在幾毫秒內抖動很多次，這就是按鍵彈跳。

如果不做 debounce，按一次按鍵可能會被判斷成很多次。

第一版先用簡單的時間判斷：

{% codeblock lang:c line_number:true %}
#define INPUT_DEBOUNCE_MS 30
{% endcodeblock %}

概念是：
同一顆按鍵在短時間內重複變化時，先忽略，等狀態穩定超過 debounce 時間後，才產生 event。

先設計一個狀態：

{% codeblock lang:c line_number:true %}
typedef struct
{
    bool stable_pressed;
    bool last_raw_pressed;
    uint32_t last_change_tick;
} input_button_state_t;
{% endcodeblock %}

掃描流程大概如下：

{% codeblock lang:c line_number:true %}
static void input_scan_button(input_button_hw_t *hw, input_button_state_t *state)
{
    bool raw_pressed = input_is_pressed(hw->port, hw->pin);
    uint32_t now = HAL_GetTick();

    if (raw_pressed != state->last_raw_pressed)
    {
        state->last_raw_pressed = raw_pressed;
        state->last_change_tick = now;
    }

    if ((now - state->last_change_tick) >= INPUT_DEBOUNCE_MS)
    {
        if (raw_pressed != state->stable_pressed)
        {
            state->stable_pressed = raw_pressed;

            if (state->stable_pressed)
            {
                input_post_event(hw->key, INPUT_ACTION_SHORT);
            }
        }
    }
}
{% endcodeblock %}

這版先只在按下穩定後送出 `INPUT_ACTION_SHORT`。
之後如果要區分 short press / long press，需要記錄 press 起始時間。

#### input_task

`input_task` 會週期性掃描所有按鍵。

{% codeblock lang:c line_number:true %}
void input_task(void *argument)
{
    while (1)
    {
        for (size_t i = 0; i < BUTTON_COUNT; i++)
        {
            input_scan_button(&button_map[i], &button_state[i]);
        }
        osDelay(10);
    }
}
{% endcodeblock %}

這裡每 10 ms 掃描一次按鍵。
搭配 30 ms debounce，對一般按鍵操作已經足夠。

#### Short Press / Long Press 規劃

目前第一版只做 short press。
之後可以用按下時間判斷 long press。

概念是：

{% codeblock lang:text line_number:false %}
按下時間 < 800 ms  -> short press
按下時間 >= 800 ms -> long press
{% endcodeblock %}

需要多記錄一個 press start tick：

{% codeblock lang:c line_number:true %}
typedef struct
{
    bool stable_pressed;
    bool last_raw_pressed;
    uint32_t last_change_tick;
    uint32_t press_start_tick;
} input_button_state_t;
{% endcodeblock %}

release 時根據按住多久決定事件：

{% codeblock lang:c line_number:true %}
if (!state->stable_pressed)
{
    uint32_t press_duration = now - state->press_start_tick;
    if (press_duration >= INPUT_LONG_PRESS_MS)
    {
        input_post_event(hw->key, INPUT_ACTION_LONG);
    }
    else
    {
        input_post_event(hw->key, INPUT_ACTION_SHORT);
    }
}
{% endcodeblock %}

這段可以等後面整理完基本 input task 後再補。

---

### EXTI 版本：用 User Button 通知 input_task

Polling 版本比較簡單，但 FreeRTOS 專案裡也很常遇到 interrupt 通知 task 的情境。

所以這一篇先用 NUCLEO-F767ZI 板上的 User Button 練習 EXTI。

概念是：

{% codeblock lang:text line_number:false %}
User Button pressed
    |
    v
EXTI interrupt
    |
    v
HAL_GPIO_EXTI_Callback()
    |
    v
osThreadFlagsSet(inputTaskHandle, INPUT_FLAG_BUTTON_IRQ)
    |
    v
input_task
{% endcodeblock %}

ISR 裡面不要做太多事情。
它只負責通知 task，真正的 debounce、讀取 GPIO、產生 event 交給 `input_task` 處理。

{% codeblock lang:c line_number:true %}
#define INPUT_FLAG_BUTTON_IRQ (1U << 0)

void HAL_GPIO_EXTI_Callback(uint16_t GPIO_Pin)
{
    if (GPIO_Pin == USER_Btn_Pin)
    {
        osThreadFlagsSet(inputTaskHandle, INPUT_FLAG_BUTTON_IRQ);
    }
}
{% endcodeblock %}

`input_task` 裡等待 flag：

{% codeblock lang:c line_number:true %}
void input_task(void *argument)
{
    while (1)
    {
        osThreadFlagsWait(INPUT_FLAG_BUTTON_IRQ, osFlagsWaitAny, osWaitForever);
        LOG_INFO("INPUT", "user button irq");
    }
}
{% endcodeblock %}

這一版先確認 ISR notify 可以動。
下一步再把它整合進 debounce 流程。

---

### EXTI + Software Timer 版本：事件驅動 debounce

前面 User Button 的 EXTI 版本只是確認 interrupt 可以通知 task。
如果要把 debounce 也整合進來，可以用 software timer。

資料流會變成：

{% codeblock lang:text line_number:false %}
button edge
    |
    v
EXTI ISR
    |
    v
start debounce software timer
    |
    v
timer callback
    |
    v
notify input_task
    |
    v
input_task reads stable GPIO state
    |
    v
input_event_queue
    |
    v
logger_task
{% endcodeblock %}

這種做法的重點是：
  - EXTI ISR 只處理「按鍵有變化」
  - software timer 等待彈跳結束
  - debounce timer 到期後，再通知 `input_task`
  - `input_task` 讀取穩定後的 GPIO 狀態並產生事件

#### 建立 debounce timer

{% codeblock lang:c line_number:true %}
osTimerId_t debounceTimerHandle;

#define INPUT_FLAG_DEBOUNCE_TIMEOUT (1U << 1)

static void debounce_timer_callback(void *argument)
{
    osThreadFlagsSet(inputTaskHandle, INPUT_FLAG_DEBOUNCE_TIMEOUT);
}
{% endcodeblock %}

初始化時建立 timer：

{% codeblock lang:c line_number:true %}
void input_timer_init(void)
{
    debounceTimerHandle = osTimerNew(
        debounce_timer_callback,
        osTimerOnce,
        NULL,
        NULL
    );
}
{% endcodeblock %}

#### EXTI 裡啟動 debounce timer

在 EXTI callback 裡不直接產生 input event，只重新啟動 debounce timer：

{% codeblock lang:c line_number:true %}
void HAL_GPIO_EXTI_Callback(uint16_t GPIO_Pin)
{
    if (GPIO_Pin == USER_Btn_Pin)
    {
        osTimerStart(debounceTimerHandle, INPUT_DEBOUNCE_MS);
    }
}
{% endcodeblock %}

這樣每次按鍵邊緣觸發 interrupt，都會把 debounce timer 重新啟動。
等按鍵彈跳結束後，timer 才會真的到期。

#### timer 到期後通知 input_task

當 software timer 到期後，callback 通知 `input_task`：

{% codeblock lang:c line_number:true %}
static void debounce_timer_callback(void *argument)
{
    osThreadFlagsSet(inputTaskHandle, INPUT_FLAG_DEBOUNCE_TIMEOUT);
}
{% endcodeblock %}

`input_task` 收到 flag 後，再去讀取穩定狀態：

{% codeblock lang:c line_number:true %}
void input_task(void *argument)
{
    while (1)
    {
        uint32_t flags = osThreadFlagsWait(
            INPUT_FLAG_DEBOUNCE_TIMEOUT,
            osFlagsWaitAny,
            osWaitForever
        );
        if (flags & INPUT_FLAG_DEBOUNCE_TIMEOUT)
        {
            if (input_is_pressed(USER_Btn_GPIO_Port, USER_Btn_Pin))
            {
                input_post_event(INPUT_KEY_A, INPUT_ACTION_SHORT);
                LOG_INFO("INPUT", "user button short");
            }
        }
    }
}
{% endcodeblock %}

這個版本比 polling 複雜，但更接近事件驅動設計。
之後如果要處理多顆按鍵，可以再為每顆按鍵記錄 pending state，或共用一個 debounce timer 後掃描全部按鍵。

---
## 測試結果

接線完成後，預期按下按鍵時可以在 terminal 看到 log：

{% codeblock lang:text line_number:false %}
[00001234][INFO ][INPUT] key=0 action=2 tick=1234
[00001420][INFO ][INPUT] key=4 action=2 tick=1420
[00001800][INFO ][INPUT] user button irq
[00001900][INFO ][INPUT] user button short
{% endcodeblock %}

目前先不用急著讓按鍵控制遊戲畫面。
Part 4 的目標是先確認：
  - GPIO 可以正確讀到按鍵
  - debounce 後不會一次按下觸發多次
  - input event 可以丟進 queue
  - log 可以觀察到按鍵事件
  - EXTI 可以通知 task
  - software timer 可以用來延遲 debounce 判斷
等這些穩定後，Part 6 的 `game_task` 才會開始消化這些 input event。

---
## 本篇小結

這一篇開始把實體輸入接進專案。

目前完成的目標是把 GPIO 按鍵轉成軟體事件：

{% codeblock lang:text line_number:false %}
GPIO input
-> debounce
-> input_event_t
-> input_event_queue
-> log output
{% endcodeblock %}

同時也試了兩種 debounce 方式：
  - polling + timestamp
  - EXTI + software timer

這樣之後 `game_task` 不需要知道按鍵接在哪個 GPIO，也不需要處理 debounce。
它只要從 queue 收到 `input_event_t`，再決定要讓小貓移動、餵食、打開選單或返回上一頁。

下一步可以開始把這些 input event 接到簡單的狀態機，或先進入顯示系統，把按鍵事件反映到 TFT 畫面上。
