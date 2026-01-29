import {z} from "zod";
import {verifyAdminPassword, createAdminSession, setAdminSessionCookie} from "@/lib/admin/auth";

const bodySchema = z.object({
  password: z.string().min(1),
});

/**
 * POST: 管理员登录
 */
export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json);

    if (!parsed.success) {
      return Response.json({error: "Invalid body", details: parsed.error.flatten()}, {status: 400});
    }

    const {password} = parsed.data;

    // 验证密码
    if (!verifyAdminPassword(password)) {
      return Response.json({error: "Invalid password"}, {status: 401});
    }

    // 创建会话
    const sessionToken = await createAdminSession();
    await setAdminSessionCookie(sessionToken);

    return Response.json({
      success: true,
      message: "Login successful",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    // eslint-disable-next-line no-console
    console.error("[admin/login] failed:", e);
    return Response.json({error: "Login failed", message}, {status: 500});
  }
}
