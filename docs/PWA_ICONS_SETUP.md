# PWA 图标设置指南

## 图标要求

PWA 需要以下尺寸的图标：
- 192x192 像素 (icon-192.png)
- 512x512 像素 (icon-512.png)

## 生成图标的方法

### 方法 1：使用在线工具（推荐）

1. 访问 [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator) 或 [RealFaviconGenerator](https://realfavicongenerator.net/)
2. 上传你的 logo 或使用提供的 SVG 图标 (`public/icon.svg`)
3. 下载生成的 PNG 图标
4. 将图标文件放置到 `public/` 目录：
   - `icon-192.png`
   - `icon-512.png`

### 方法 2：使用 ImageMagick（如果已安装）

```bash
# 从 SVG 生成 PNG
magick convert public/icon.svg -resize 192x192 public/icon-192.png
magick convert public/icon.svg -resize 512x512 public/icon-512.png
```

### 方法 3：使用 Node.js 和 sharp（需要安装 sharp）

```bash
npm install --save-dev sharp
```

然后运行：
```bash
node scripts/generate-icons.js
```

### 方法 4：手动创建

使用任何图像编辑软件（如 Photoshop、GIMP、Figma）：
1. 打开 `public/icon.svg` 作为参考
2. 创建 192x192 和 512x512 像素的 PNG 图像
3. 保存为 `public/icon-192.png` 和 `public/icon-512.png`

## 临时占位符

在生成实际图标之前，项目会使用 SVG 图标作为占位符。这不会影响开发，但在生产环境中应该使用 PNG 图标以获得最佳兼容性。

## 验证

生成图标后，可以通过以下方式验证：
1. 访问 `http://localhost:3000/manifest.json` 查看 manifest
2. 在 Chrome DevTools 的 Application > Manifest 中检查图标
3. 在移动设备上测试 "添加到主屏幕" 功能
