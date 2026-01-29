import {getAdminSessionFromRequest, verifyAdminSession} from "@/lib/admin/auth";

/**
 * GET: 检查管理员认证状态
 */
export async function GET() {
  try {
    const sessionToken = await getAdminSessionFromRequest();
    const isAuthenticated = await verifyAdminSession(sessionToken);

    return Response.json({
      authenticated: isAuthenticated,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    // eslint-disable-next-line no-console
    console.error("[admin/auth] failed:", e);
    return Response.json({error: "Auth check failed", message}, {status: 500});
  }
}
