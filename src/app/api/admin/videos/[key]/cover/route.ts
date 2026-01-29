import {z} from "zod";
import {PutObjectCommand} from "@aws-sdk/client-s3";
import {getR2Client} from "@/lib/r2/client";
import {env} from "@/lib/env";
import {getAdminSessionFromRequest, verifyAdminSession} from "@/lib/admin/auth";
import {getVideoMetadata, upsertVideoMetadata} from "@/lib/video-metadata/store";
import {type Locale} from "@/i18n/locales";

const paramsSchema = z.object({
  key: z.string().min(1),
});

const postBodySchema = z.object({
  locale: z.string().min(1),
  coverData: z.string(), // Base64 encoded image data
  contentType: z.string().default("image/jpeg"),
});

/**
 * POST: 上传视频封面（需要认证）
 * 封面图片存储在 R2，路径格式：covers/{videoKey}-{locale}.{ext}
 */
export async function POST(req: Request, {params}: {params: Promise<{key: string}>}) {
  try {
    // 验证管理员身份
    const session = await getAdminSessionFromRequest();
    if (!(await verifyAdminSession(session))) {
      return Response.json({error: "Unauthorized"}, {status: 401});
    }

    const {key} = await params;
    const body = await req.json();
    const parsed = postBodySchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({error: "Invalid body", details: parsed.error.flatten()}, {status: 400});
    }

    if (!env.R2_BUCKET) {
      return Response.json({error: "R2_BUCKET missing"}, {status: 500});
    }

    const {locale, coverData, contentType} = parsed.data;

    // 确定文件扩展名
    const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
    const coverKey = `covers/${key}-${locale}.${ext}`;

    // 解码 Base64 数据
    const imageBuffer = Buffer.from(coverData.replace(/^data:image\/\w+;base64,/, ""), "base64");

    // 上传到 R2
    const client = getR2Client();
    const command = new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: coverKey,
      Body: imageBuffer,
      ContentType: contentType,
    });

    await client.send(command);

    // 生成封面 URL（使用预签名 URL 或公共 URL）
    // 这里先返回 key，前端可以通过 presign-play API 获取 URL
    const coverUrl = coverKey;

    // 更新元数据
    const metadata = await getVideoMetadata(key);
    if (metadata) {
      await upsertVideoMetadata(key, locale as Locale, {
        title: metadata.locales[locale as Locale]?.title || "",
        description: metadata.locales[locale as Locale]?.description || "",
        coverUrl,
      });
    } else {
      // 如果元数据不存在，创建默认元数据
      await upsertVideoMetadata(key, locale as Locale, {
        title: key,
        description: "",
        coverUrl,
      });
    }

    return Response.json({coverUrl, coverKey});
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    // eslint-disable-next-line no-console
    console.error("[admin/videos/cover] POST failed:", e);
    return Response.json({error: "Upload cover failed", message}, {status: 500});
  }
}
