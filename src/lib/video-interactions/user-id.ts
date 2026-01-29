/**
 * 获取用户标识符
 * 在生产环境中，应该使用真实的用户认证系统
 * 当前使用 IP 地址 + User-Agent 作为临时标识
 */

export function getUserIdFromRequest(req: Request): string {
  // 尝试从请求头获取 IP 地址
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0] || realIp || "unknown";

  // 获取 User-Agent 作为额外标识
  const userAgent = req.headers.get("user-agent") || "unknown";

  // 生成简单的用户 ID（生产环境应使用 session 或 JWT）
  // 注意：这只是一个临时方案，不能用于真实的生产环境
  return `${ip}-${userAgent.substring(0, 20)}`.replace(/[^a-zA-Z0-9-]/g, "-");
}
