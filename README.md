# 島嶼方塊

一款以《Minecraft》式方塊操作為參考、以縮小版台灣與離島為地圖的 3D 沙盒建造遊戲構想。

- [遊戲願景與路線圖](knowledge/plan.md)
- [網站首頁](site/index.html)

## GitHub Pages

網站靜態檔案位於 `site/`。`.github/workflows/deploy.yml` 會在推送至 `main` 或手動執行時，透過 GitHub Actions 發佈到 GitHub Pages。

建立 GitHub repository 後，請在 **Settings → Pages → Build and deployment** 將來源設為 **GitHub Actions**。之後推送至 `main` 即會自動部署。
