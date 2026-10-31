---
title: 少一点 JavaScript，多一点恰到好处
description: 并不是所有细节都需要一个库。关于原生交互、渐进增强，以及让网页回到简单。
pubDate: 2026-08-17
category: 技术笔记
tags: [前端, JavaScript]
cover: sea
demo: true
---

## 从一个按钮说起

这是一篇用于展示代码排版的示例文章。一个主题切换按钮的需求很简单：点一下，页面颜色改变，下次打开还记得。

为它选择工具之前，不妨先写下真正需要的状态：用户选择了什么、系统偏好是什么、现在应该显示哪一种外观。

## 把偏好和结果分开

「自动」是用户的选择；「深色」或「浅色」才是当前结果。把这两件事混在一起，常常会导致系统偏好变化后，页面不再跟随。

```js
function resolveTheme(mode, systemIsDark) {
  if (mode === 'auto') return systemIsDark ? 'dark' : 'light';
  return mode;
}

console.log(resolveTheme('auto', true)); // dark
console.log(resolveTheme('light', true)); // light
```

### 边界也属于功能

浏览器可能阻止本地存储；网络可能没能取回搜索索引；用户也可能关掉 JavaScript。

这些情况不意味着整个页面应该停止工作。一个博客可以先把文章列表写进 HTML，再用脚本增加搜索。即使脚本暂时失效，文章依然在那里。

## 让动效知道什么时候停下来

适当的过渡可以解释状态变化。但如果用户偏好减少动画，页面应当尊重这一点。

```css
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .opening-cover { transition: none; }
  .hero-character { animation: none; }
}
```

一个好的动效，不是始终在动，而是在需要的时候，帮人理解发生了什么。

## 简单并不是少做一点

简单的实现也需要把键盘、焦点、失败状态和可读性考虑进去。省去的是不必要的复杂度，不是使用者应当得到的体验。

让每一段脚本都有一个清晰的理由，网页就会慢慢变得轻盈。
