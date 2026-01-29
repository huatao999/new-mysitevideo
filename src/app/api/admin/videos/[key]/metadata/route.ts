import {z} from "zod";
import {getVideoMetadata, upsertVideoMetadata} from "@/lib/video-metadata/store";
import {getAdminSessionFromRequest, verifyAdminSession} from "@/lib/admin/auth";
import {locales, type Locale} from "@/i18n/locales";

const paramsSchema = z.object({
  key: z.string().min(1),
});

const putBodySchema = z.object({
  locale: z.enum([...locales] as [Locale, ...Locale[]]),
  title: z.string().min(1).max(200),
  description: z.string().max(2000),
  coverUrl: z.string().optional(),
});

/**
 * GET: 获取视频元数据
 * PUT: 更新视频元数据（需要认证）
 */
export async function GET(req: Request, {params}: {params: Promise<{key: string}>}) {
  try {
    const {key} = await params;
    const metadata = await getVideoMetadata(key);

    if (!metadata) {
      return Response.json({error: "Metadata not found"}, {status: 404});
    }

    return Response.json(metadata);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    // eslint-disable-next-line no-console
    console.error("[admin/videos/metadata] GET failed:", e);
    return Response.json({error: "Get metadata failed", message}, {status: 500});
  }
}

export async function PUT(req: Request, {params}: {params: Promise<{key: string}>}) {
  try {
    // 验证管理员身份
    const session = await getAdminSessionFromRequest();
    if (!(await verifyAdminSession(session))) {
      return Response.json({error: "Unauthorized"}, {status: 401});
    }

    const {key} = await params;
    const body = await req.json();
    const parsed = putBodySchema.safeParse(body);

    if (!parsed.success) {
      return Response.json({error: "Invalid body", details: parsed.error.flatten()}, {status: 400});
    }

    const {locale, title, description, coverUrl} = parsed.data;
    const metadata = await upsertVideoMetadata(key, locale, {title, description, coverUrl});

    return Response.json(metadata);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    // eslint-disable-next-line no-console
    console.error("[admin/videos/metadata] PUT failed:", e);
    return Response.json({error: "Update metadata failed", message}, {status: 500});
  }
}
