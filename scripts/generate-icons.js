/**
 * 生成 PWA 图标的脚本
 * 需要先安装 sharp: npm install --save-dev sharp
 */

const fs = require('fs');
const path = require('path');

// 检查是否安装了 sharp
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('❌ 错误: 需要先安装 sharp');
  console.log('请运行: npm install --save-dev sharp');
  process.exit(1);
}

const publicDir = path.join(__dirname, '..', 'public');
const svgPath = path.join(publicDir, 'icon.svg');

// 检查 SVG 文件是否存在
if (!fs.existsSync(svgPath)) {
  console.error(`❌ 错误: 找不到 ${svgPath}`);
  console.log('请确保 public/icon.svg 文件存在');
  process.exit(1);
}

// 生成图标的尺寸
const sizes = [192, 512];

async function generateIcons() {
  console.log('🎨 开始生成 PWA 图标...\n');

  try {
    for (const size of sizes) {
      const outputPath = path.join(publicDir, `icon-${size}.png`);
      
      await sharp(svgPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 10, g: 10, b: 10, alpha: 1 } // #0a0a0a
        })
        .png()
        .toFile(outputPath);

      console.log(`✅ 已生成: icon-${size}.png (${size}x${size})`);
    }

    console.log('\n✨ 图标生成完成！');
    console.log('现在可以更新 manifest.json 以使用这些图标。');
  } catch (error) {
    console.error('❌ 生成图标时出错:', error.message);
    process.exit(1);
  }
}

generateIcons();
