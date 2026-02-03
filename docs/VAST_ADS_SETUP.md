# VAST 广告集成配置指南

## 概述

本系统已预留 ExoClick 和 Adsterra 的 VAST 广告接口。当您申请到广告接口后，只需配置环境变量即可自动启用广告功能。

## 环境变量配置

在您的环境变量文件中（`.env.local` 或系统环境变量）添加以下配置：

### 1. 广告开关

```bash
# 是否启用广告（true/false 或 1/0）
ADS_ENABLED=true

# 广告提供商选择：exoclick | adsterra | both | none
AD_PROVIDER=exoclick
```

### 2. ExoClick VAST URL（如果选择 exoclick 或 both）

```bash
# ExoClick 前置广告 VAST URL
VAST_EXOCLICK_PRE_ROLL=https://your-exoclick-pre-roll-vast-url.com

# ExoClick 中置广告 VAST URL
VAST_EXOCLICK_MID_ROLL=https://your-exoclick-mid-roll-vast-url.com

# ExoClick 后置广告 VAST URL
VAST_EXOCLICK_POST_ROLL=https://your-exoclick-post-roll-vast-url.com
```

### 3. Adsterra VAST URL（如果选择 adsterra 或 both）

```bash
# Adsterra 前置广告 VAST URL
VAST_ADSTERRA_PRE_ROLL=https://your-adsterra-pre-roll-vast-url.com

# Adsterra 中置广告 VAST URL
VAST_ADSTERRA_MID_ROLL=https://your-adsterra-mid-roll-vast-url.com

# Adsterra 后置广告 VAST URL
VAST_ADSTERRA_POST_ROLL=https://your-adsterra-post-roll-vast-url.com
```

## 配置示例

### 示例 1：只使用 ExoClick

```bash
ADS_ENABLED=true
AD_PROVIDER=exoclick
VAST_EXOCLICK_PRE_ROLL=https://syndication.exoclick.com/vast.php?zone_id=123456
VAST_EXOCLICK_MID_ROLL=https://syndication.exoclick.com/vast.php?zone_id=123457
VAST_EXOCLICK_POST_ROLL=https://syndication.exoclick.com/vast.php?zone_id=123458
```

### 示例 2：只使用 Adsterra

```bash
ADS_ENABLED=true
AD_PROVIDER=adsterra
VAST_ADSTERRA_PRE_ROLL=https://delivery.adsterra.com/vast.php?zoneid=123456
VAST_ADSTERRA_MID_ROLL=https://delivery.adsterra.com/vast.php?zoneid=123457
VAST_ADSTERRA_POST_ROLL=https://delivery.adsterra.com/vast.php?zoneid=123458
```

### 示例 3：同时使用两个提供商（优先 ExoClick）

```bash
ADS_ENABLED=true
AD_PROVIDER=both
VAST_EXOCLICK_PRE_ROLL=https://syndication.exoclick.com/vast.php?zone_id=123456
VAST_EXOCLICK_MID_ROLL=https://syndication.exoclick.com/vast.php?zone_id=123457
VAST_ADSTERRA_PRE_ROLL=https://delivery.adsterra.com/vast.php?zoneid=123456
VAST_ADSTERRA_MID_ROLL=https://delivery.adsterra.com/vast.php?zoneid=123457
```

### 示例 4：禁用广告

```bash
ADS_ENABLED=false
# 或者
AD_PROVIDER=none
```

## 广告位置说明

- **前置广告（Pre-roll）**：视频播放前播放
- **中置广告（Mid-roll）**：视频播放到 50% 时播放
- **后置广告（Post-roll）**：视频播放结束后播放

## 如何获取 VAST URL

### ExoClick

1. 登录 ExoClick 账户
2. 进入 "Zones" 或 "广告位" 管理
3. 创建或选择视频广告位
4. 选择 VAST 格式
5. 复制生成的 VAST URL

### Adsterra

1. 登录 Adsterra 账户
2. 进入 "Zones" 管理
3. 创建或选择视频广告位
4. 选择 VAST 格式
5. 复制生成的 VAST URL

## 测试广告

配置完成后：

1. 重启开发服务器（`npm run dev`）
2. 访问视频播放页面
3. 打开浏览器控制台（F12）
4. 查看日志，应该能看到 `[Ads] Loading pre-roll ad from: ...` 等日志

## 注意事项

1. **环境变量格式**：确保 URL 使用完整的 `https://` 或 `http://` 协议
2. **重启服务器**：修改环境变量后需要重启 Next.js 开发服务器
3. **生产环境**：部署到生产环境时，确保在服务器环境变量中配置这些值
4. **安全**：不要将包含敏感信息的 `.env` 文件提交到 Git 仓库

## 当前状态

目前广告系统已预留接口，但实际的 VAST XML 解析和广告视频播放逻辑需要等申请到广告接口后实现。系统会记录日志，方便后续调试。

## 后续开发

当申请到广告接口后，可以：

1. 集成 `videojs-contrib-ads` 插件进行完整的广告播放
2. 或者集成 Google IMA SDK 进行广告管理
3. 实现广告跳过、广告统计等功能
