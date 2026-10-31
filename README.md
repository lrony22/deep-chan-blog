# 深蓝来信

deep酱的个人博客，使用 Astro 与原生 JavaScript、CSS，输出静态网站。
当前文章包含明确标注的示例内容。

## 构建与预览

使用 Node.js 24，在项目目录运行：

```sh
npm ci
npm run dev
npm run build
npm run preview
```

构建产物位于 `dist/`。本地设置正式站点地址时，复制 `.env.example` 为 `.env`，填写 `SITE_URL` 和 `BASE_PATH`；根站点或自定义域名的路径为 `/`。

## GitHub Pages

在仓库 Settings → Pages 中选择 GitHub Actions。在默认分支包含工作流后，从 Actions 手动运行 Deploy to GitHub Pages，选择 `main`。
工作流使用 Node.js 24，自动读取 Pages 的域名和子路径，也支持仓库变量 `SITE_URL`、`BASE_PATH` 覆盖。推送不会自动部署。

## 人设与素材署名

- 银蓝人设来源：Bilibili UP 主 [小叶子XIYZ](https://space.bilibili.com/372185270/)。
- 深海人设来源：上善无形 / ZipZipPipe，依 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans) 非商业使用。已作 AI 重绘、透明背景处理及尺寸适配，改编部分沿用同一许可。
- 该许可仅适用于深海人设及其改编，不作为本站代码、文章或其他素材的统一许可。其他视觉素材为 AI 生成。
- Noto Sans SC、Noto Serif SC 字体保留各自许可证，见 `public/fonts/`。
