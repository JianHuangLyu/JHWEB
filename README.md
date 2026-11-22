# 呂建篁 Jian-Huang Lyu｜個人作品集

這個網站整理我的學歷、技能、活動與精選專案，涵蓋電腦視覺、多模態 AI、醫學影像分析和邊緣推論。網站以 HTML、CSS 和 JavaScript 建置，並透過 GitHub Pages 發布。[瀏覽個人網站](https://jianhuanglyu.github.io/)

## 精選專案

- **醫學病理影像病灶定位與結構化分析系統** 使用 YOLO 定位病灶，透過視覺語言模型產生結構化分析報告，並用 Microsoft SkillOpt 最佳化提示詞與技能。主要技術包括 PyTorch、vLLM、FastAPI 和 Gradio。[查看實習專案](https://jianhuanglyu.github.io/#project-pathology)
- **邊緣 AI 即時影像風格轉換系統** 在 Jetson Xavier NX 部署 INT8 量化模型，支援單張影像與即時攝影機推論。主要技術包括 ONNX、TensorRT、Docker、Gradio 和 PyTorch。[查看邊緣 AI 專案](https://jianhuanglyu.github.io/#project-edge)
- **即時人臉微表情辨識偵測系統** 融合影格靜態特徵與光流動態特徵，辨識四類微表情。主要技術包括 MediaPipe、CNN、TV-L1 光流和 Self-Attention。[查看畢業專題](https://jianhuanglyu.github.io/#project-expression)

## 網站功能

- 支援手機、平板與桌面版面，手機和平板可使用右下角的浮動章節選單。
- 「網站配色」提供十套主題，預設為霧藍，瀏覽器會記住選取的配色。
- 專案架構圖、示範圖與實驗圖可在站內視窗查看。大型圖片先顯示預覽，放大時載入原圖。圖片支援縮放、拖曳和手機雙指縮放。

## 本機預覽

在儲存庫根目錄開啟 `index.html`，或執行下列指令啟動本機預覽。

```sh
python -m http.server 8000 --bind 127.0.0.1
```

[開啟本機預覽](http://127.0.0.1:8000/)

## 檔案與維護方式

| 檔案 | 用途 |
| --- | --- |
| `index.html` | 個人介紹、學歷、技能、活動和專案內容 |
| `css/portfolio.css` | 版面、配色與響應式樣式 |
| `js/scripts.js` | 章節選單與瀏覽配色設定 |
| `js/image-viewer.js` | 站內圖片檢視、縮放與實驗圖切換 |
| `assets/img/` | 個人照片、專案圖片與實驗圖 |

工作區若已有 `portfolio-editor.local.html`，可使用設計器調整文字、配色與版面，再匯出為 `portfolio-changes.json`。這兩個本機檔案已列入 `.gitignore`。將確認後的變更套用至網站檔案並推送到 `main`，GitHub Pages 會發布更新。

## 版型

網站建立於 2026 年 11 月 21 日。版型採用 Start Bootstrap 的 SB Admin，套件版本與授權資訊可在 `css/styles.css` 的檔頭查閱。[SB Admin 版型](https://startbootstrap.com/template/sb-admin)
