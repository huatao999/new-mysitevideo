import {DeleteObjectCommand} from "@aws-sdk/client-s3";
import {z} from "zod";
import {env} from "@/lib/env";
import {getR2Client} from "@/lib/r2/client";
import {getAdminSessionFromRequest, verifyAdminSession} from "@/lib/admin/auth";

const bodySchema = z.object({
  key: z.string().min(1),
});

/**
 * DELETE: 删除视频
 */
export async function DELETE(req: Request) {
  try {
    // 验证管理员权限
    const sessionToken = await getAdminSessionFromRequest();
    const isAuthenticated = await verifyAdminSession(sessionToken);

    if (!isAuthenticated) {
      return Response.json({error: "Unauthorized"}, {status: 401});
    }

    if (!env.R2_BUCKET) {
      return Response.json({error: "R2_BUCKET missing"}, {status: 500});
    }

    const json = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json);

    if (!parsed.success) {
      return Response.json({error: "Invalid body", details: parsed.error.flatten()}, {status: 400});
    }

    const {key} = parsed.data;
    const client = getR2Client();

    await client.send(
      new DeleteObjectCommand({
        Bucket: env.R2_BUCKET,
        Key: key,
      }),
    );

    return Response.json({
      success: true,
      message: "Video deleted successfully",
      key,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    // eslint-disable-next-line no-console
    console.error("[admin/videos/delete] failed:", e);
    return Response.json({error: "Delete video failed", message}, {status: 500});
  }
}
