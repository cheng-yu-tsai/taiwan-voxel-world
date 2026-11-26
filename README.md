# 島嶼方塊

一款以《Minecraft》式方塊操作為參考、以縮小版台灣與離島為地圖的 3D 沙盒建造遊戲。GitHub Pages 上有可操作的瀏覽器原型，遊戲持續開發中。

**目前遊玩：** https://cheng-yu-tsai.github.io/taiwan-voxel-world/

- [遊戲願景與路線圖](knowledge/plan.md)
- [技術、效能與素材流程建議](knowledge/tech-roadmap.md)
- [待決策事項與建議](knowledge/decision.md)
- [遊戲入口](site/index.html)

## 目前原型

- WASD 移動、空白鍵跳躍、滑鼠轉向；左鍵挖掘，右鍵放置方塊；按 1–9、0 選擇十種方塊。
- 以物品欄選擇台灣街景方塊，在台中海岸街角自由建造。
- 從交通地圖搭船或搭飛機前往本島與離島。
- 方塊修改會存在瀏覽器的 localStorage；設定可調整滑鼠靈敏度與畫面品質。
- 本機自動存檔和 JSON 備份匯入共用嚴格驗證；可在設定中匯出備份，匯入前會確認並完整取代目前世界。
- 支援 100 步工作階段內的方塊復原／重做；快捷鍵為 Ctrl+Z、Ctrl+Y，觸控裝置也有操作按鈕。

## 保持好修改

- `site/game/config.js`：島嶼位置、地形種類、方塊材質、操作速度與儲存版本。
- `site/game/terrain.js`：台灣本島與各離島的確定性地形高度輪廓。
- `site/game/chunk-index.js`：維護方塊到渲染區塊的索引，讓局部編輯只掃描受影響區塊。
- `site/game/world.js`：方塊資料、街景範例、分塊渲染與存檔。
- `site/game/player.js`：第一人稱移動、視角與跳躍。
- `site/game/ui.js`：物品欄、交通地圖、設定和操作提示。
- `site/game/main.js`：場景燈光、渲染器，以及各模組的組合。

遊戲用 Three.js ES modules，版本固定於 `site/index.html` 的 import map；網站不需要建置步驟。

地形與區塊索引的 Node 測試可直接執行：

```sh
node --experimental-test-coverage --test tests/*.test.mjs
```

## GitHub Pages

網站靜態檔案位於 `site/`。`.github/workflows/deploy.yml` 會在推送至 `main` 或手動執行時，透過 GitHub Actions 發佈到 GitHub Pages。

建立 GitHub repository 後，請在 **Settings → Pages → Build and deployment** 將來源設為 **GitHub Actions**。之後推送至 `main` 即會自動部署。


