/**
 * 简单的管理员认证
 * 生产环境应使用更安全的认证方案（如 JWT、Session、OAuth 等）
 */

import {env} from "@/lib/env";
import {cookies} from "next/headers";

const ADMIN_SESSION_COOKIE = "admin_session";
const SESSION_SECRET = "admin_secret_key"; // 生产环境应使用环境变量

/**
 * 验证管理员密码
 */
export function verifyAdminPassword(password: string): boolean {
  const adminPassword = env.ADMIN_PASSWORD;
  if (!adminPassword) {
    // 如果没有设置密码，默认不允许登录
    return false;
  }
  return password === adminPassword;
}

/**
 * 创建管理员会话
 */
export async function createAdminSession(): Promise<string> {
  // 简单的会话 token（生产环境应使用 JWT）
  const sessionToken = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
  return sessionToken;
}

/**
 * 验证管理员会话
 */
export async function verifyAdminSession(sessionToken: string | null | undefined): Promise<boolean> {
  if (!sessionToken) {
    return false;
  }
  // 简单的会话验证（生产环境应使用 JWT 验证）
  // 这里只检查 token 格式是否正确
  return sessionToken.includes("-") && sessionToken.length > 10;
}

/**
 * 从请求中获取管理员会话
 */
export async function getAdminSessionFromRequest(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_SESSION_COOKIE)?.value || null;
}

/**
 * 设置管理员会话 Cookie
 */
export async function setAdminSessionCookie(sessionToken: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 天
  });
}

/**
 * 清除管理员会话 Cookie
 */
export async function clearAdminSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}
