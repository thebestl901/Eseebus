# ESeebus

大字體、無廣告的香港巴士到站查詢 PWA（[ESeebus.app](https://eseebus.app)），支援 **九巴、城巴、專線小巴**。資料來自政府開放 API。

## 功能

- 使用說明首頁（首次進入）
- 收藏車站主頁，自動刷新 ETA
- 收藏頁離線暫存：無網絡時顯示上次刷新到站時間
- 收藏頁左上角天氣：溫度及天文台警告信號（點擊開啟天文台官網）
- 搜尋頁左上角天氣及設定按鈕
- 路線詳情頁設定按鈕
- 路線搜尋（自訂大鍵盤，含城巴/小巴字母）
- 路線詳情（地圖 + 站點列表；點選站點原位展開 ETA 與操作）
- 路線詳情：鄰近路線（同名站牌的其他路線）
- 齒輪設定：字體、背景色、高亮色、高對比、資料備份
- 版本更新提示：比對 GitHub main 分支，落後時顯示更新教學

## 更新說明

> 每次發布新版本時，請同步更新本節內容及 `package.json` 的 `version` 欄位。應用程式會比對 GitHub **main** 分支上的版本，判斷是否需要更新。

### v1.2.4

**設定與更新**

- 搜尋頁及路線詳情頁頂部加入設定按鈕
- 搜尋頁左上角顯示天氣組件
- 版本檢查改為讀取 GitHub main 分支
- 設定頁顯示更新提示，內含更新教學、匯出備份及 eseebus.app 連結

**介面改進**

- 天氣圖示改用天文台官方透明圖示（HKOWxIconOutline）
- 點擊 header 天氣：依語言開啟香港天文台官網首頁
- 路線詳情：地圖固定於列表上方；點選站點在列表原位展開 ETA 與操作
- 路線詳情：「鄰近路線」浮窗，列出同名站牌的其他路線並可跳轉
- 路線詳情：移除不準確的站點連線，只保留站點標記
- 搜尋鍵盤：數字鍵全部顯示，點擊前後鍵盤高度一致

**安全性**

- Nginx / Vercel 加入安全標頭（CSP、防點擊劫持、nosniff 等）
- 備份匯入時驗證自訂色碼，拒絕非法 hex 值
- 正式域名統一為 eseebus.app

### v1.2.3

**新大嶼山巴士及港鐵巴士**

- 搜尋及路線詳情支援 NLB（新大嶼山巴士）
- 搜尋及路線詳情支援 MTR Bus（港鐵巴士）
- 收藏頁可加入 NLB / 港鐵巴士車站

### v1.2.2

**收藏頁天氣改進**

- 改用香港天文台官方天氣圖示
- 圖示及溫度顯示優化
- 警告信號輪播體驗改進

### v1.2.1

**穩定版**

- 合併收藏離線暫存及天氣功能至主線

### v1.2.0

**收藏頁離線暫存**

- 收藏路線到站時間會在本機暫存
- 無網絡時仍顯示上次成功刷新的 ETA
- 標題改為「上次刷新時間」及「沒有網絡」狀態
- 暫存僅作用於收藏頁面，不影響搜尋及路線詳情

**收藏頁天氣**

- 左上角顯示香港天文台即時溫度
- 沒有警告時只顯示溫度
- 8 號及以上暴風、紅色及黑色暴雨警告生效時，只顯示警告信號
- 多個嚴重警告同時生效時，每 10 秒輪換
- 其他警告（如酷熱、雷暴、黃色暴雨等）每 10 秒與溫度交替顯示

### v1.0.4

**顯示設定**

- 新增 12 小時及 24 小時時鐘格式選項（顯示實際時間模式）

### v1.0.3

**圖示及備份**

- 新增 ESeeBus 圖示選項
- 改善備份匯入時的圖示處理

### v1.0.1

**品牌及首次使用**

- 應用更名為「易看站」
- 首次使用可選擇主畫面圖示
- 新增使用說明及 onboarding 流程

## 開發

```bash
npm install
npm run dev
```

開發模式透過 Vite proxy 轉發以下 API，避免 CORS：

| 路徑 | 資料來源 |
|------|----------|
| `/api/kmb/*` | 九巴／龍運 ETA |
| `/api/citybus/*` | 城巴 ETA |
| `/api/gmb/*` | 專線小巴 ETA |
| `/api/hko/*` | 香港天文台天氣及警告 |

## 建置

```bash
npm run build
```

## 部署（Docker，推薦）

容器內使用 **Nginx** 提供靜態 PWA，並代理上述三個 API（與 `vercel.json` 設定一致）。

### 快速啟動

```bash
docker compose up -d --build
```

瀏覽器開啟：**http://localhost**（預設埠 80；本機開發可用 `PORT=8080`）

健康檢查：**http://localhost/health**（應回傳 `ok`）

### 常用指令

```bash
# 建置映像
npm run docker:build

# 背景啟動（含重新建置）
npm run docker:up

# 停止
npm run docker:down

# 查看日誌
npm run docker:logs

# 重新部署
npm run docker:restart

# 指定埠口（例如 3000）
PORT=3000 docker compose up -d --build
```

亦可複製 `.env.example` 為 `.env` 後修改 `PORT`。

### 僅用 Docker（不用 Compose）

```bash
docker build -t eseebus .
docker run -d -p 8080:80 --name eseebus --restart unless-stopped eseebus
```

### NAS / 家用伺服器

1. 將專案複製到 NAS，執行 `docker compose up -d --build`
2. 手機連同一 Wi‑Fi，以區網 IP 存取（例如 `http://192.168.1.10:8080`）
3. Safari / Chrome → 加入主畫面

> 容器需能連線至 `data.etabus.gov.hk`、`rt.data.gov.hk`、`data.etagmb.gov.hk`、`data.weather.gov.hk` 才能顯示到站時間及天氣。

### 疑難排解

| 問題 | 處理 |
|------|------|
| 頁面空白 | 確認埠口未被佔用，執行 `docker compose logs` |
| 無到站時間 | 檢查 NAS/防火牆是否允許對外 HTTPS |
| 更新後仍見舊版 | `docker compose up -d --build` 強制重建；手機清除 PWA 快取後重開 |

## 技術

- React + Vite + TypeScript
- React Router
- Leaflet + OpenStreetMap
- IndexedDB 快取（路線/站點列表）
- localStorage（收藏、設定）
- vite-plugin-pwa
- Docker + Nginx
