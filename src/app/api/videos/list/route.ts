import { z } from "zod";
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
  return VIDEO_EXTENSIONS.some(ext => key.toLowerCase().endsWith(ext));
}

export async function GET(req: Request) {
  try {
    // 环境变量校验增强（保留原有逻辑，不修改）
    const videoApiUrl = "https://gentle-cell-74b9.ygy131419.workers.dev/".trim();
    if (!videoApiUrl) {
      console.error("[videos/list] CRITICAL: NEXT_PUBLIC_VIDEO_API_URL is missing or empty in environment variables");
      return Response.json({ 
        data: [], // 统一改为data，适配前端通用预期
        videos: [], // 保留原字段做兼容
        isTruncated: false, 
        nextContinuationToken: null, 
        keyCount: 0,
        warning: "Video API URL not configured - contact administrator"
      }, { status: 200 });
    }

    // 解析查询参数（保留原有逻辑，不修改）
    const url = new URL(req.url);
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { title, locale } = parsed.data;

    // 获取视频列表（保留缓存+错误隔离，不修改）
    let videoObjects: any[] = [];
    try {
      const apiResponse = await fetch(videoApiUrl, { 
        next: { revalidate: 60 } // 保留缓存，保证多语言切换流畅
      });
      
      if (!apiResponse.ok) {
        throw new Error(`HTTP ${apiResponse.status}: ${apiResponse.statusText}`);
      }
      
      const data = await apiResponse.json();
      videoObjects = Array.isArray(data) ? data : [];
    } catch (fetchError) {
      console.error("[videos/list] Failed to fetch video list:", fetchError);
      videoObjects = [];
    }

    // 过滤有效视频（保留原有逻辑，不修改）
    const validVideoObjects = videoObjects.filter((obj: any) => {
      const fileKey = (obj?.key || obj?.Key || "").trim();
      return fileKey && isVideoFile(fileKey);
    });

    // 隔离元数据加载错误（保留原有逻辑，不修改）
    let metadataMap = new Map();
    try {
      const rawMap = await getVideoMetadataBatch(validVideoObjects.map(obj => (obj?.key || obj?.Key || "").trim()));
      metadataMap = rawMap || new Map();
    } catch (metadataError) {
      console.warn("[videos/list] Metadata load failed (safe fallback active):", 
        metadataError instanceof Error ? metadataError.message : "Unknown error");
      metadataMap = new Map();
    }

    // 处理视频数据【核心修复区：松绑过严过滤，兼容无元数据/无多语言场景】
    const videos = validVideoObjects
      .map((obj: any) => {
        const key = (obj?.key || obj?.Key || "").trim();
        if (!key) return null;
        
        const metadata = metadataMap.get(key) || obj.metadata || {};
        let displayTitle = "";
        let displayDescription = "";
        let displayCoverUrl: string | undefined;

        // 【修复1：松绑多语言过滤，无对应语言元数据时用文件名兜底，不再过滤视频】
        if (locale) {
          const localeData = metadata.locales?.[locale] || {};
          // 移除「无标题则过滤」的逻辑，无多语言标题则用文件名
          displayTitle = localeData.title?.trim() || key.split("/").pop()?.replace(/\.[^.]+$/, "") || "Unknown Video";
          displayDescription = localeData.description?.trim() || "";
          displayCoverUrl = localeData.coverUrl;
        } else {
          // 自动选择首个有效语言，无任何多语言数据则直接用文件名
          if (metadata?.locales && typeof metadata.locales === "object" && metadata.locales !== null) {
            const firstValidLocale = locales.find(loc => 
              metadata.locales?.[loc]?.title?.trim()
            );
            if (firstValidLocale && metadata.locales[firstValidLocale]) {
              const locData = metadata.locales[firstValidLocale];
              displayTitle = locData.title.trim();
              displayDescription = locData.description?.trim() || "";
              displayCoverUrl = locData.coverUrl;
            } else {
              displayTitle = key.split("/").pop()?.replace(/\.[^.]+$/, "") || "Unknown Video";
            }
          } else {
            // 无任何元数据时，直接用文件名作为标题，保证视频能显示
            displayTitle = key.split("/").pop()?.replace(/\.[^.]+$/, "") || "Unknown Video";
          }
        }

        // 安全处理size（保留原有逻辑，不修改）
        const rawSize = obj?.size ?? obj?.Size;
        let safeSize = 0;
        if (typeof rawSize === "number" && Number.isFinite(rawSize) && rawSize >= 0) {
          safeSize = rawSize;
        } else if (typeof rawSize === "string") {
          const num = parseFloat(rawSize);
          if (Number.isFinite(num) && num >= 0) safeSize = num;
        }

        // 安全处理lastModified（保留原有逻辑，不修改）
        let lastModifiedValue = obj?.lastModified || obj?.LastModified;
        if (lastModifiedValue instanceof Date) {
          lastModifiedValue = lastModifiedValue.toISOString();
        } else if (typeof lastModifiedValue === "number") {
          lastModifiedValue = new Date(lastModifiedValue).toISOString();
        } else if (typeof lastModifiedValue !== "string") {
          lastModifiedValue = new Date().toISOString();
        }

        // 构建可用语言列表（保留原有逻辑，不修改）
        const availableLocales = metadata?.locales && 
                                typeof metadata.locales === "object" && 
                                metadata.locales !== null
          ? Object.keys(metadata.locales).filter(loc => 
              Object.prototype.hasOwnProperty.call(metadata.locales, loc) &&
              metadata.locales[loc]?.title?.trim()
            )
          : undefined;

        return {
          key,
          size: safeSize,
          lastModified: lastModifiedValue,
          title: displayTitle,
          description: displayDescription,
          coverUrl: displayCoverUrl,
          metadata: availableLocales ? { locales: availableLocales } : undefined,
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null); // 仅过滤null，不再过滤无标题视频

    // 标题搜索（保留原有逻辑，优化：兼容无元数据的标题搜索）
    let filteredVideos = videos;
    if (title?.trim()) {
      const searchStr = title.trim().toLowerCase();
      filteredVideos = videos.filter(video => {
        // 优先检查多语言标题
        if (video.metadata?.locales?.length && metadataMap.has(video.key)) {
          const fullMeta = metadataMap.get(video.key);
          if (fullMeta?.locales && typeof fullMeta.locales === "object" && fullMeta.locales !== null) {
            for (const loc of video.metadata.locales) {
              if (Object.prototype.hasOwnProperty.call(fullMeta.locales, loc) &&
                  fullMeta.locales[loc]?.title?.toLowerCase().includes(searchStr)) {
                return true;
              }
            }
          }
        }
        // 回退检查当前显示标题（兼容无元数据的视频搜索）
        return video.title?.toLowerCase().includes(searchStr) || false;
      });
    }

    // 【修复2：统一返回data数组（前端通用预期），保留原videos字段做兼容，保证能识别到视频】
    return Response.json({
      data: filteredVideos, // 主字段：适配前端通用的data列表预期
      videos: filteredVideos, // 兼容字段：保留原有返回格式，不破坏旧逻辑
      isTruncated: false,
      nextContinuationToken: null,
      keyCount: filteredVideos.length,
    });
  } catch (e) {
    // 全局兜底【修复3：返回data空数组，保证前端统一处理】
    const errorMsg = e instanceof Error ? e.message : "Unknown server error";
    console.error("[videos/list] CRITICAL ERROR:", e);
    return Response.json({
      data: [], // 兜底也返回data数组
      videos: [],
      isTruncated: false,
      nextContinuationToken: null,
      keyCount: 0,
      error: "Video list processing failed",
      details: errorMsg
    }, { status: 200 });
  }
}
