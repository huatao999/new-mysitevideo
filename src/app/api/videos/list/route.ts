import { z } from "zod";
import { env } from "@/lib/env";
import { getVideoMetadataBatch } from "@/lib/video-metadata/store";
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
    const url = new URL(req.url);
    const parsed = querySchema.parse(Object.fromEntries(url.searchParams.entries()));

    // 从Cloudflare Worker获取视频列表
    const workerResponse = await fetch(process.env.NEXT_PUBLIC_VIDEO_API_URL!, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!workerResponse.ok) {
      throw new Error(`Worker request failed: ${workerResponse.status}`);
    }

    const videoObjects = await workerResponse.json();
    const validVideoObjects = Array.isArray(videoObjects) 
      ? videoObjects.filter((obj: any) => {
          const fileKey = obj?.key || obj?.Key;
          return fileKey && isVideoFile(fileKey);
        })
      : [];

    // 获取视频元数据用于多语言展示
    const videoKeys = validVideoObjects.map((obj: any) => obj?.key || obj?.Key);
    const metadataMap = await getVideoMetadataBatch(videoKeys) || new Map();

    // 处理视频数据和多语言信息
    let videos = validVideoObjects.map((obj: any) => {
      const key = obj?.key || obj?.Key || "";
      const metadata = metadataMap.get(key) || {};
      
      let displayTitle: string = key.split("/").pop()?.replace(/\.[^.]+$/, "") || "未知视频";
      let displayDescription: string = "";
      let displayCoverUrl: string | undefined;

      // 根据请求的语言展示对应内容
      if (parsed.locale && metadata.locales?.[parsed.locale]) {
        const locData = metadata.locales[parsed.locale];
        displayTitle = locData.title || displayTitle;
        displayDescription = locData.description || "";
        displayCoverUrl = locData.coverUrl;
      } 
      // 未指定语言时使用第一个可用语言的信息
      else if (metadata.locales) {
        const firstLocaleKey = Object.keys(metadata.locales)[0];
        if (firstLocaleKey) {
          const locData = metadata.locales[firstLocaleKey];
          displayTitle = locData.title || displayTitle;
          displayDescription = locData.description || "";
          displayCoverUrl = locData.coverUrl;
        }
      }

      return {
        key,
        size: obj?.size || obj?.Size || 0,
        lastModified: obj?.lastModified || obj?.LastModified?.toISOString() || new Date().toISOString(),
        title: displayTitle,
        description: displayDescription,
        coverUrl: displayCoverUrl,
        availableLocales: metadata.locales ? Object.keys(metadata.locales) : [],
      };
    });

    // 标题搜索过滤逻辑
    if (parsed.title && parsed.title.trim()) {
      const searchTerm = parsed.title.trim().toLowerCase();
      videos = videos.filter((video) => {
        // 检查所有可用语言的标题
        const hasMatchingTitle = video.availableLocales.some((locale) => {
          const videoMeta = metadataMap.get(video.key) || {};
          const locData = videoMeta.locales?.[locale];
          return locData?.title?.toLowerCase().includes(searchTerm);
        });

        // 同时检查文件名作为 fallback
        const fileNameMatches = video.key.toLowerCase().includes(searchTerm);
        return hasMatchingTitle || fileNameMatches;
      });
    }

    return new Response(JSON.stringify({
      data: videos,
      total: videos.length
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Video list error:", error);
    return new Response(JSON.stringify({
      error: "Failed to fetch video list",
      message: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
