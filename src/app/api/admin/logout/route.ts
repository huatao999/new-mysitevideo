import {clearAdminSessionCookie} from "@/lib/admin/auth";

/**
 * POST: 管理员登出
 */
export async function POST() {
  try {
    await clearAdminSessionCookie();

    return Response.json({
      success: true,
      message: "Logout successful",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    // eslint-disable-next-line no-console
    console.error("[admin/logout] failed:", e);
    return Response.json({error: "Logout failed", message}, {status: 500});
  }
}
