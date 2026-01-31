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

// 视频格式校验数组
const VIDEO_EXTENSIONS = [".mp4", ".webm", ".ogg", ".mov", ".avi", ".mkv", ".m3u8"];

/**
 * 校验是否为有效视频文件
 * @param key 文件路径/名称
 * @returns 是否为视频文件
 */
function isVideoFile(key: string): boolean {
  if (!key) return false;
  const lowerKey = key.toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => lowerKey.endsWith(ext));
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parsed = querySchema.parse(Object.fromEntries(url.searchParams.entries()));

    // 校验Cloudflare Worker接口地址（避免空值请求）
    if (!process.env.NEXT_PUBLIC_VIDEO_API_URL) {
      throw new Error("视频接口地址未配置：NEXT_PUBLIC_VIDEO_API_URL");
    }

    // 从Cloudflare Worker获取视频列表
    const workerResponse = await fetch(process.env.NEXT_PUBLIC_VIDEO_API_URL, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!workerResponse.ok) {
      throw new Error(`Worker请求失败，状态码：${workerResponse.status}`);
    }

    const videoObjects = await workerResponse.json();
    // 过滤有效视频文件（严格类型判断，避免any隐式报错）
    const validVideoObjects = Array.isArray(videoObjects) 
      ? videoObjects.filter((obj: Record<string, any>) => {
          const fileKey = obj?.key || obj?.Key;
          return typeof fileKey === "string" && isVideoFile(fileKey);
        })
      : [];

    // 获取视频元数据用于多语言展示（处理getVideoMetadataBatch返回null的情况）
    const videoKeys = validVideoObjects.map((obj: Record<string, any>) => obj?.key || obj?.Key);
    const metadataMap = (await getVideoMetadataBatch(videoKeys)) ?? new Map<string, Record<string, any>>();

    // 【仅修改此处1】const改let，解决后续赋值报错，其余完全不变
    let videos = validVideoObjects.map((obj: Record<string, any>) => {
      const key = (obj?.key || obj?.Key || "") as string;
      // 获取当前视频元数据，无则返回空对象（避免null操作）
      const metadata = metadataMap.get(key) ?? {};
      
      // 初始标题：取文件名（去掉路径和后缀）
      let displayTitle: string = key.split("/").pop()?.replace(/\.[^.]+$/, "") || "未知视频";
      let displayDescription: string = "";
      let displayCoverUrl: string | undefined;

      // 多语言核心逻辑：保证切换正常，分两步判断
      // 1. 优先使用请求指定的语言（修复：metadata?.locales 可选链，解决第58行TS报错）
      if (parsed.locale && metadata?.locales && typeof metadata.locales === "object" && !Array.isArray(metadata.locales)) {
        const locData = metadata.locales[parsed.locale];
        if (locData && typeof locData === "object") {
          displayTitle = locData.title || displayTitle;
          displayDescription = locData.description || "";
          displayCoverUrl = locData.coverUrl || undefined;
        }
      } 
      // 2. 未指定语言时，使用第一个可用的语言信息（再次加固可选链）
      else if (metadata?.locales && typeof metadata.locales === "object" && !Array.isArray(metadata.locales)) {
        // 获取所有可用语言key，过滤有效key
        const availableLocaleKeys = Object.keys(metadata.locales).filter(loc => locales.includes(loc as Locale));
        const firstLocaleKey = availableLocaleKeys[0];
        if (firstLocaleKey) {
          const locData = metadata.locales[firstLocaleKey];
          if (locData && typeof locData === "object") {
            displayTitle = locData.title || displayTitle;
            displayDescription = locData.description || "";
            displayCoverUrl = locData.coverUrl || undefined;
          }
        }
      }

      // 处理可用语言列表（去重+匹配全局locales，保证多语言切换的选项有效）
      const availableLocales = metadata?.locales && typeof metadata.locales === "object" 
        ? Object.keys(metadata.locales).filter(loc => locales.includes(loc as Locale)) 
        : [];

      return {
        key,
        size: (obj?.size || obj?.Size || 0) as number,
        lastModified: (obj?.lastModified || obj?.LastModified?.toISOString() || new Date().toISOString()) as string,
        title: displayTitle,
        description: displayDescription,
        coverUrl: displayCoverUrl,
        availableLocales, // 给前端的多语言切换选项
      };
    });

    // 标题搜索过滤逻辑（加固：处理metadata.locales空值，避免搜索时报错）
    if (parsed.title && parsed.title.trim()) {
      const searchTerm = parsed.title.trim().toLowerCase();
      // 【此处2】无修改，仅因上一行const改let，此处赋值不再报错
      videos = videos.filter((video) => {
        // 检查所有可用语言的标题（多语言搜索，匹配任意语言标题即命中）
        const hasMatchingTitle = video.availableLocales.some((locale) => {
          const videoMeta = metadataMap.get(video.key) ?? {};
          const locData = videoMeta?.locales?.[locale];
          return typeof locData?.title === "string" && locData.title.toLowerCase().includes(searchTerm);
        });

        // 兜底：匹配视频文件名（兼容无多语言标题的情况）
        const fileNameMatches = video.key.toLowerCase().includes(searchTerm);
        return hasMatchingTitle || fileNameMatches;
      });
    }

    // 返回成功响应
    return new Response(JSON.stringify({
      data: videos,
      total: videos.length
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("获取视频列表失败：", error);
    // 统一错误响应，返回具体错误信息
    return new Response(JSON.stringify({
      error: "获取视频列表失败",
      message: error instanceof Error ? error.message : "未知错误"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
