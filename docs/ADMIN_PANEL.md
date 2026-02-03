# 后台管理系统使用指南

## 功能概述

后台管理系统提供了以下功能：
- **视频上传**：上传视频文件到 Cloudflare R2 存储
- **视频管理**：查看、搜索、删除视频文件
- **权限控制**：简单的密码认证保护

## 配置

### 1. 设置管理员密码

在 `.env` 文件中设置管理员密码：

```bash
ADMIN_PASSWORD=your_secure_password_here
```

**安全提示：**
- 使用强密码（至少 12 个字符，包含字母、数字和特殊字符）
- 不要将密码提交到 Git 仓库
- 生产环境建议使用更安全的认证方案（如 JWT、OAuth 等）

## 使用方法

### 1. 访问后台管理系统

启动开发服务器后，访问：
```
http://localhost:3000/admin/login
```

### 2. 登录

输入在 `.env` 中设置的 `ADMIN_PASSWORD` 进行登录。

### 3. 上传视频

1. 点击"上传视频"或访问 `/admin/upload`
2. 选择视频文件
3. 输入视频 Key（R2 中的文件名），例如：`videos/episode1.mp4`
4. 点击"开始上传"
5. 等待上传完成（会显示上传进度）

**注意事项：**
- 视频 Key 建议使用有意义的路径，如 `videos/episode1.mp4`
- 上传大文件时请耐心等待
- 上传成功后会自动跳转到视频管理页面

### 4. 管理视频

1. 访问 `/admin/videos` 查看所有视频
2. 使用搜索框按文件名前缀搜索视频
3. 点击"查看"在新标签页中预览视频
4. 点击"删除"删除视频（操作不可恢复）

## API 端点

### 认证相关

- `POST /api/admin/login` - 管理员登录
- `POST /api/admin/logout` - 管理员登出
- `GET /api/admin/auth` - 检查认证状态

### 视频管理

- `DELETE /api/admin/videos/delete` - 删除视频（需要认证）

## 安全注意事项

### 当前实现（开发环境）

- 使用简单的密码认证
- 会话存储在 Cookie 中
- 适合开发和小规模使用

### 生产环境建议

1. **使用 JWT 认证**
   - 生成和验证 JWT token
   - 设置合理的过期时间
   - 使用 HTTPS

2. **添加 CSRF 保护**
   - 使用 CSRF token
   - 验证请求来源

3. **添加速率限制**
   - 限制登录尝试次数
   - 防止暴力破解

4. **使用环境变量管理密钥**
   - 不要硬编码密码
   - 使用密钥管理服务

5. **添加操作日志**
   - 记录所有管理操作
   - 便于审计和追踪

## 文件结构

```
src/app/(admin)/
├── layout.tsx              # 后台管理布局（包含认证检查）
├── AdminAuthCheck.tsx      # 认证检查组件
├── LogoutButton.tsx        # 登出按钮组件
├── login/
│   └── page.tsx            # 登录页面
├── page.tsx                # 管理后台首页
├── upload/
│   └── page.tsx            # 视频上传页面
└── videos/
    └── page.tsx            # 视频管理列表页面

src/app/api/admin/
├── login/route.ts          # 登录 API
├── logout/route.ts         # 登出 API
├── auth/route.ts           # 认证检查 API
└── videos/
    └── delete/route.ts     # 删除视频 API

src/lib/admin/
└── auth.ts                 # 认证工具函数
```

## 故障排除

### 无法登录

1. 检查 `.env` 文件中是否设置了 `ADMIN_PASSWORD`
2. 确认密码输入正确
3. 检查浏览器控制台是否有错误

### 上传失败

1. 检查 R2 配置是否正确（`R2_ACCOUNT_ID`、`R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY`、`R2_BUCKET`）
2. 检查文件大小是否超过限制
3. 检查网络连接

### 删除失败

1. 确认已登录
2. 检查视频 Key 是否正确
3. 检查 R2 权限配置

## 后续改进计划

- [ ] 视频元数据编辑（标题、描述、封面）
- [ ] 批量操作（批量删除、批量上传）
- [ ] 视频预览和编辑
- [ ] 操作日志记录
- [ ] 更安全的认证方案（JWT）
- [ ] 多用户权限管理
