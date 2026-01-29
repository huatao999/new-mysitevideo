# 后台管理路由测试指南

## 问题排查

如果访问 `http://localhost:3000/admin/login` 显示"连接失败"，请按以下步骤排查：

### 1. 确认开发服务器正在运行

在项目根目录运行：
```bash
npm run dev
```

应该看到类似输出：
```
▲ Next.js 16.1.4 (Turbopack)
- Local: http://localhost:3000
```

### 2. 检查端口

如果 3000 端口被占用，Next.js 会自动使用其他端口（如 3001）。请检查终端输出的实际端口号。

### 3. 验证路由文件

确保以下文件存在：
- ✅ `src/app/admin/login/page.tsx`
- ✅ `src/app/admin/layout.tsx`
- ✅ `src/app/admin/page.tsx`
- ✅ `src/app/admin/upload/page.tsx`
- ✅ `src/app/admin/videos/page.tsx`

### 4. 测试路由

启动服务器后，访问以下 URL：

1. **登录页面**（不需要认证）：
   ```
   http://localhost:3000/admin/login
   ```
   应该显示登录表单

2. **管理首页**（需要认证，未登录会重定向）：
   ```
   http://localhost:3000/admin
   ```
   未登录时会自动重定向到 `/admin/login`

3. **上传页面**（需要认证）：
   ```
   http://localhost:3000/admin/upload
   ```
   未登录时会自动重定向到 `/admin/login`

4. **视频管理**（需要认证）：
   ```
   http://localhost:3000/admin/videos
   ```
   未登录时会自动重定向到 `/admin/login`

### 5. 配置管理员密码

在 `.env` 文件中设置：
```bash
ADMIN_PASSWORD=your_password_here
```

然后重启开发服务器。

## 路由结构

```
/admin/login      → 登录页面（公开访问）
/admin            → 管理首页（需要认证）
/admin/upload     → 视频上传（需要认证）
/admin/videos     → 视频管理（需要认证）
```

## 中间件配置

`middleware.ts` 已配置排除 `/admin` 路径，不会被 next-intl 处理，因此：
- `/admin/login` 不会重定向到 `/en/admin/login`
- `/admin` 路径保持原样

## 如果仍然无法访问

1. **清除 Next.js 缓存**：
   ```bash
   rm -rf .next
   npm run dev
   ```

2. **检查浏览器控制台**：
   - 打开浏览器开发者工具（F12）
   - 查看 Console 和 Network 标签
   - 检查是否有错误信息

3. **检查终端输出**：
   - 查看 `npm run dev` 的输出
   - 检查是否有编译错误

4. **重启开发服务器**：
   - 停止当前服务器（Ctrl+C）
   - 重新运行 `npm run dev`
