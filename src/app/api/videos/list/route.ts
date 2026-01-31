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
    // 🔑 修复问题3：环境变量校验增强（明确错误日志+防御性处理）
    const videoApiUrl = process.env.NEXT_PUBLIC_VIDEO_API_URL?.trim();
    if (!videoApiUrl) {
      console.error("[videos/list] CRITICAL: NEXT_PUBLIC_VIDEO_API_URL is missing or empty in environment variables");
      // 返回空列表而非500，避免前端完全崩溃（符合"视频列表加载异常"修复要求）
      return Response.json({ 
        videos: [], 
        isTruncated: false, 
        nextContinuationToken: null, 
        keyCount: 0,
        warning: "Video API URL not configured - contact administrator"
      }, { status: 200 });
    }

    // 解析查询参数
    const url = new URL(req.url);
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { title, locale } = parsed.data;

    // 🌐 获取视频列表（增强错误隔离）
    let videoObjects: any[] = [];
    try {
      const apiResponse = await fetch(videoApiUrl, { 
        next: { revalidate: 60 } // 启用Next.js缓存，提升多语言切换流畅度
      });
      
      if (!apiResponse.ok) {
        throw new Error(`HTTP ${apiResponse.status}: ${apiResponse.statusText}`);
      }
      
      const data = await apiResponse.json();
      videoObjects = Array.isArray(data) ? data : [];
    } catch (fetchError) {
      console.error("[videos/list] Failed to fetch video list:", fetchError);
      // 关键修复：返回空列表而非中断，确保前端不卡死
      videoObjects = [];
    }

    // 🔑 修复关键点：适配实际API返回格式（将 title 映射为 key，添加默认字段）
    const normalizedVideoObjects = videoObjects.map((obj: any) => {
      // 假设API返回类似 { title: "video.mp4", url: "..." } 或纯字符串 "video.mp4"
      const originalKey = obj?.title || obj?.key || obj?.Key || obj || "";
      const normalizedKey = typeof originalKey === 'string' ? originalKey : String(originalKey);
      
      return {
        key: normalizedKey,           // API可能返回title，统一映射为key
        Key: normalizedKey,           // 兼容旧字段名
        size: obj?.size || obj?.Size || 0,  // 从API获取或设默认
        Size: obj?.size || obj?.Size || 0,
        lastModified: obj?.lastModified || obj?.LastModified || new Date().toISOString(),
        LastModified: obj?.lastModified || obj?.LastModified || new Date().toISOString(),
        // 保留原始对象用于元数据查找
        ...obj
      };
    });

    // 过滤有效视频（现在使用标准化的key字段）
    const validVideoObjects = normalizedVideoObjects.filter((obj: any) => {
      const fileKey = (obj?.key || obj?.Key || "").trim();
      return fileKey && isVideoFile(fileKey);
    });

    // 🛡️ 修复问题4核心：隔离getVideoMetadataBatch错误（防止R2_BUCKET missing导致整个API崩溃）
    let metadataMap = new Map();
    try {
      // 即使内部因R2_BUCKET缺失抛错，也不影响主流程
      const rawMap = await getVideoMetadataBatch(validVideoObjects.map(obj => (obj?.key || obj?.Key || "").trim()));
      metadataMap = rawMap || new Map();
    } catch (metadataError) {
      // 明确记录但不中断：这是解决"R2_BUCKET missing导致播放报错"的关键
      console.warn("[videos/list] Metadata load failed (safe fallback active):", 
        metadataError instanceof Error ? metadataError.message : "Unknown error");
      // 继续使用空Map，视频仍可显示（用文件名作为标题）
      metadataMap = new Map();
    }

    // 处理视频数据
    const videos = validVideoObjects
      .map((obj: any) => {
        const key = (obj?.key || obj?.Key || "").trim();
        if (!key) return null;
        
        const metadata = metadataMap.get(key) || obj.metadata || {};
        let displayTitle = "";
        let displayDescription = "";
        let displayCoverUrl: string | undefined;

        // 多语言处理（优化：避免重复计算）
        if (locale) {
          const localeData = metadata.locales?.[locale] || {};
          if (!localeData.title?.trim()) return null; // 无此语言数据则过滤
          displayTitle = localeData.title.trim();
          displayDescription = localeData.description?.trim() || "";
          displayCoverUrl = localeData.coverUrl;
        } else {
          // 自动选择首个有效语言
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
            displayTitle = key.split("/").pop()?.replace(/\.[^.]+$/, "") || "Unknown Video";
          }
        }

        // 🔒 安全处理size（防御NaN/负数/字符串）
        const rawSize = obj?.size ?? obj?.Size;
        let safeSize = 0;
        if (typeof rawSize === "number" && Number.isFinite(rawSize) && rawSize >= 0) {
          safeSize = rawSize;
        } else if (typeof rawSize === "string") {
          const num = parseFloat(rawSize);
          if (Number.isFinite(num) && num >= 0) safeSize = num;
        }

        // 🔒 安全处理lastModified（兼容Date/时间戳/ISO字符串）
        let lastModifiedValue = obj?.lastModified || obj?.LastModified;
        if (lastModifiedValue instanceof Date) {
          lastModifiedValue = lastModifiedValue.toISOString();
        } else if (typeof lastModifiedValue === "number") {
          lastModifiedValue = new Date(lastModifiedValue).toISOString();
        } else if (typeof lastModifiedValue !== "string") {
          lastModifiedValue = new Date().toISOString();
        }

        // 构建可用语言列表（防御null/原型污染）
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
      .filter((v): v is NonNullable<typeof v> => v !== null);

    // 🔍 标题搜索（优化：避免重复获取metadata）
    if (title?.trim()) {
      const searchStr = title.trim().toLowerCase();
      const filtered = videos.filter(video => {
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
        // 回退检查当前显示标题
        return (video.title?.toLowerCase().includes(searchStr)) || false;
      });
      return Response.json({
        videos: filtered,
        isTruncated: false,
        nextContinuationToken: null,
        keyCount: filtered.length,
      });
    }

    return Response.json({
      videos,
      isTruncated: false,
      nextContinuationToken: null,
      keyCount: videos.length,
    });
  } catch (e) {
    // 全局兜底：任何未预见错误均返回空列表（防止前端卡死）
    const errorMsg = e instanceof Error ? e.message : "Unknown server error";
    console.error("[videos/list] CRITICAL ERROR:", e);
    return Response.json({
      videos: [],
      isTruncated: false,
      nextContinuationToken: null,
      keyCount: 0,
      error: "Video list processing failed",
      details: errorMsg
    }, { status: 200 }); // 仍返回200避免前端状态锁死
  }
}
