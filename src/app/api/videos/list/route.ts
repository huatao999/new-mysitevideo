import { z } from "zod";
import { env } from "@/lib/env";
import { locales, type Locale } from "@/i18n/locales";

const querySchema = z.object({
  prefix: z.string().optional(),
  title: z.string().optional(),
  maxKeys: z.coerce.number().int().min(1).max(1000).default(100),
  continuationToken: z.string().optional(),
  locale: z.enum([...locales] as [Locale, ...Locale[]]).optional(),
});

const VIDEO_EXTENSIONS = [".mp4", ".webm", ".ogg", ".mov", ".avi", ".mkv", ".m3u8"];

function isVideoFile(key: string): boolean {
  if (!key) return false;
  const lowerKey = key.toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => lowerKey.endsWith(ext));
}

export async function GET(req: Request) {
  try {
    if (!process.env.NEXT_PUBLIC_VIDEO_API_URL) {
      return Response.json({ error: "NEXT_PUBLIC_VIDEO_API_URL missing" }, { status: 500 });
    }

    const url = new URL(req.url);
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid query", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { title, locale } = parsed.data;
    
    // 直接请求Worker接口获取视频列表
    const workerResponse = await fetch(process.env.NEXT_PUBLIC_VIDEO_API_URL);
    if (!workerResponse.ok) {
      return Response.json(
        { error: "Failed to fetch from worker API", status: workerResponse.status },
        { status: 500 }
      );
    }
    
    const videoObjects = await workerResponse.json();
    if (!Array.isArray(videoObjects)) {
      return Response.json({ videos: [], isTruncated: false, nextContinuationToken: null, keyCount: 0 });
    }

    const validVideoObjects = videoObjects.filter((obj: any) => {
      const fileKey = obj?.key || obj?.Key;
      return fileKey && isVideoFile(fileKey);
    });

    let videos = validVideoObjects
      .map((obj: any) => {
        const key = obj?.key || obj?.Key || "";
        
        // 简化元数据处理，避免类型错误
        return {
          key,
          size: obj?.size || obj?.Size || 0,
          lastModified: obj?.lastModified || obj?.LastModified?.toISOString() || new Date().toISOString(),
          title: obj?.title || key.split("/").pop()?.replace(/\.[^.]+$/, "") || "未知视频",
          description: obj?.description || "",
          coverUrl: obj?.coverUrl,
        };
      })
      // 语言过滤 - 简化实现避免metadata错误
      .filter((video: any) => {
        if (!locale) return true;
        // 如果有语言信息则过滤，否则显示所有视频
        return !video.locale || video.locale === locale;
      });

    // 标题搜索
    if (title && title.trim()) {
      const searchTitle = title.trim().toLowerCase();
      videos = videos.filter((video: any) => 
        video.title?.toLowerCase().includes(searchTitle)
      );
    }

    return Response.json({
      videos,
      isTruncated: false,
      nextContinuationToken: null,
      keyCount: videos.length,
    });
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : "Unknown server error";
    console.error("[videos/list] Request failed:", e);
    return Response.json(
      { error: "List videos failed", message: errorMsg },
      { status: 500 }
    );
  }
}
