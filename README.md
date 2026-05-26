🍇🍈🍉🍊🍋🍋‍🟩🍌🍍🥭🍎🍏🍐🍑🍒🍓🫐🥝🍅🫒🥥🥑🍆🥔🥕🌽🌶️🫑🥒🥬🥦🧄🧅🥜🫘🌰🫚🫛🍄‍🟫🫜🍞🥐🥖🫓🥨🥯🥞🧇🧀🍖🍗🥩🥓🍔🍟🍕🌭🥪🌮🌯🫔🥙🧆🥚🍳🥘🍲🫕🥣🥗🍿🧈🧂🥫🍱🍘🍙🍚🍛🍜🍝🍠🍢🍣🍤🍥🥮🍡🥟🥠🥡🍦🍧🍨🍩🍪🎂🍰🧁🥧🍫🍬🍭🍮🍯🍼🥛☕🫖🍵🍶🍾🍷🍸🍹🍺🍻🥂🥃🫗🥤🧋🧃🧉🧊🥢🍽️🍴🥄🔪🫙🏺

Part 4：輸入系統：按鍵、五向鍵與事件佇列
GPIO、debounce、short/long press、EXTI、input event queue。
這篇開始讓「遊戲機」有手感。

Part 5：顯示系統：ILI9341 TFT 與 SPI 繪圖
SPI 初始化、ILI9341 driver、畫 pixel/rect/bitmap、DMA 或局部更新。
這篇是第一個很有成就感的畫面篇。

Part 6：Game Task：電子寵物狀態機
把 input 和 display 串起來，做寵物狀態、飢餓/心情/互動、簡單 animation。
這篇會讓專案從「板子測試」變成「作品」。

Part 7：感測器整合：MPU-6050 與 BME280
I2C register driver、校正資料、週期性 sensor task、motion / environment event。
可以順便練 timeout、retry、bus error。

Part 8：通訊模組：BLE 與 NFC 互動
UART AT command、BLE RSSI / proximity、PN532 UID 讀取。
也可以討論 NFC 走 UART / I2C / SPI 哪個比較適合。

Part 9：資料儲存：SPI Flash 與存檔格式
W25Q128 erase/write/read、CRC、A/B slot、防止寫到一半斷電。
這篇很適合展現「韌體不是只有能跑，還要能壞得漂亮」。

Part 10：音效、震動與回饋系統
Timer PWM 蜂鳴器、震動馬達、非阻塞 feedback task。
讓互動有完成度。

Part 11：系統整合與 Debug 筆記
邏輯分析儀看 SPI/I2C/UART、log 格式、常見 bug、task 卡死、stack 不夠、priority 設錯。
這篇會很像面試作品集的精華。