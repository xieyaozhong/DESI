# DESI — 生成式數學探索

[開啟線上作品](https://xieyaozhong.github.io/DESI/) · [瀏覽原始碼](https://github.com/xieyaozhong/DESI)

DESI 是一件以「水晶組合」串連數學概念的互動網頁作品：使用原生 JavaScript、Canvas 2D 與 WebGL，把抽象公式轉化為可操作、可觀察的生成式視覺。

## 作品亮點

- 10 個生成式數學世界，涵蓋波動、碎形、吸引子、細胞自動機與數論等主題。
- 14 塊精確拼合的立體碎片，經接觸、壓縮、回彈與沉降後組成主題水晶。
- Canvas 2D 負責數學繪製，WebGL 負責空間、光影與粒子層次。
- 所有主視覺皆由程式即時生成，零外部圖片素材。
- 主題切換、參數控制、滑動組合與隨機演出，共同形成連續的探索敘事。

## 工程品質

- **效能**：只繪製進入視窗的場景；靜態主題依 dirty state 更新，動態場景限制更新頻率並控制 DPR；波動場景重用像素緩衝區。
- **可及性**：支援鍵盤操作、可見焦點、44px 觸控區、狀態宣告與 `prefers-reduced-motion`。
- **韌性**：初始化具備錯誤回復路徑；WebGL 不可用時仍保留可閱讀、可操作的內容。
- **SEO / 分享**：包含 canonical、Open Graph、Twitter Card、favicon、manifest、robots 與 sitemap。
- **持續整合**：GitHub Actions 會執行 JavaScript 語法檢查與 Node smoke tests，守住結構、資產、可及性標記與水晶幾何。

## 架構

```text
index.html                    語意結構、內容與 SEO metadata
styles.css                    基礎設計系統
desi-portfolio-polish.css     作品集層級的版面與響應式收斂
script.js                     入口與模組載入
desi-ten-worlds.js            10 個數學場景、互動與渲染排程
desi-crystal-assembly.js      14 碎片的幾何與組合物理
desi-crystal-cinema.css       水晶表面、深度與光學樣式
desi-director-v4/v6.*         轉場、視差與敘事導演層
```

此專案刻意不使用前端框架或外部執行期依賴，讓生成邏輯、渲染策略與互動設計保持透明，也能直接部署到 GitHub Pages。

## 本機執行

需要 Python 3。在專案根目錄啟動靜態伺服器：

```sh
python -m http.server 4173
```

開啟 <http://127.0.0.1:4173/>。

## Quality checks

需要 Node.js 22 或相容版本：

```sh
node --check script.js
node --check desi-ten-worlds.js
node --check desi-crystal-assembly.js
node --check desi-director-v4.js
node --check desi-director-v6.js
node --test tests/smoke.test.mjs
```

## 授權

本專案依 [MIT License](LICENSE) 授權。
