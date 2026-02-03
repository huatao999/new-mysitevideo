# Cloudflare R2 / CDN 准备工作（给零基础）

## 你需要注册/打开的页面

- Cloudflare 控制台（注册/登录）：在 Cloudflare 官网注册账号并进入 Dashboard

## 第一步：创建 R2 存储桶（Bucket）

1. 在 Cloudflare Dashboard 左侧找到 **R2**（如果没有看到，先开通 R2）。
2. 点击 **Create bucket**。
3. 填写 bucket 名（例如：`my-video-site`），创建完成。

## 第二步：创建 R2 API Token（给后端签名用）

1. 在 Cloudflare Dashboard 里进入 **R2** → **Manage R2 API tokens**（或类似入口）。
2. 点击 **Create API token**。
3. 权限建议：
   - 开发期：对你的 bucket 开启读写（Read/Write）。
   - 上线期：按最小权限（例如上传只给 PutObject / 播放只给 GetObject）。
4. 创建后你会拿到：
   - Access Key ID
   - Secret Access Key
   - Account ID（通常在 Dashboard 或 R2 页面能看到）

## 第三步：把密钥放到本地环境变量（Windows）

> 由于本仓库环境限制，暂时不提交 `.env.example`。你只需要在本机设置环境变量即可。

### 方法 A（推荐，图形界面）

1. Windows 搜索 **“环境变量”** → 打开 **“编辑系统环境变量”**
2. 点击 **“环境变量(N)…”**
3. 在“用户变量”里点 **新建**，依次添加：
   - `R2_ACCOUNT_ID`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET`
4. 关闭并重新打开终端（让变量生效）。

### 方法 B（PowerShell 临时设置，只在当前窗口有效）

```powershell
$env:R2_ACCOUNT_ID="xxxxx"
$env:R2_ACCESS_KEY_ID="xxxxx"
$env:R2_SECRET_ACCESS_KEY="xxxxx"
$env:R2_BUCKET="my-bucket"
```

## 第四步：配置 CORS（必须，否则浏览器无法直传）

1. 在 Cloudflare Dashboard → **R2** → 点击你的 bucket（例如 `my-video-site`）。
2. 找到 **Settings**（设置）标签页。
3. 找到 **CORS Policy**（CORS 策略）部分。
4. 点击 **Edit CORS Policy**（编辑 CORS 策略）。
5. 粘贴以下 JSON 配置（允许所有来源，开发期用；上线时改成你的域名）：

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

6. 点击 **Save**（保存）。

> **注意**：如果上线后要限制来源，把 `"AllowedOrigins": ["*"]` 改成 `"AllowedOrigins": ["https://yourdomain.com", "https://www.yourdomain.com"]`。

## 第五步：CDN/自定义域名（可选，但强烈建议上线时做）

1. 在 Cloudflare 里给你的域名接入（DNS 托管到 Cloudflare）。
2. 为静态资源/视频配置一个子域名，比如：
   - `cdn.yourdomain.com`
3. 后续我们会在代码里用 `PUBLIC_CDN_BASE_URL` 统一拼接播放地址，并配合缓存头做全球加速。

