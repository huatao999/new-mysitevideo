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
  const lowerKey = key.toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => lowerKey.endsWith(ext));
}

// 🔑 新增：安全获取视频播放URL（修复问题3核心）
function getVideoPlayUrl(key: string): string {
  // 优先使用环境变量配置的R2公开访问前缀（Netlify已配置R2_BUCKET）
  const r2PublicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "") || "";
  // 兼容Cloudflare Worker代理路径（若前端通过/api/video代理）
  const workerProxyUrl = `/api/video?key=${encodeURIComponent(key)}`;
  
  // 策略：若配置了R2_PUBLIC_URL则直链（性能最优），否则走Worker代理
  return r2PublicUrl 
    ? `${r2PublicUrl}/${key.replace(/^\/+/, "")}` 
    : workerProxyUrl;
}

// 🔑 新增：安全推断MIME类型（修复播放报错）
function getMimeType(key: string): string {
  const ext = key.toLowerCase().split('.').pop() || "mp4";
  const mimeMap: Record<string, string> = {
    mp4: "video/mp4",
    webm: "video/webm",
    ogg: "video/ogg",
    mov: "video/quicktime",
    avi: "video/x-msvideo",
    mkv: "video/x-matroska",
    m3u8: "application/x-mpegURL"
  };
  return mimeMap[ext] || "video/mp4";
}

export async function GET(req: Request) {
  try {
    // 🔑 修复问题1：环境变量校验增强（关键！）
    const videoApiUrl = process.env.NEXT_PUBLIC_VIDEO_API_URL?.trim();
    if (!videoApiUrl) {
      console.error("[videos/list] Missing NEXT_PUBLIC_VIDEO_API_URL in environment");
      return Response.json({ 
        error: "Video API endpoint not configured", 
        hint: "Check Netlify environment variables: NEXT_PUBLIC_VIDEO_API_URL" 
      }, { status: 500 });
    }

    const url = new URL(req.url);
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { title, locale } = parsed.data;

    // 🔑 修复问题1：增强Worker响应处理（关键！）
    let videoObjects: any[] = [];
    try {
      const apiResponse = await fetch(videoApiUrl, { 
        next: { revalidate: 60 } // 避免频繁请求Worker
      });
      
      if (!apiResponse.ok) {
        throw new Error(`Worker returned ${apiResponse.status}: ${apiResponse.statusText}`);
      }
      
      const rawData = await apiResponse.json();
      
      // 🔑 兼容两种常见Worker响应格式（修复问题1核心）
      if (Array.isArray(rawData)) {
        videoObjects = rawData;
      } else if (Array.isArray(rawData.objects) || Array.isArray(rawData.items)) {
        videoObjects = rawData.objects || rawData.items;
      } else if (rawData && typeof rawData === "object" && Object.keys(rawData).length > 0) {
        // 尝试提取可能的数组字段（防御性编程）
        const possibleArrays = Object.values(rawData).filter(Array.isArray);
        videoObjects = possibleArrays[0] || [];
      }
      
      console.log(`[videos/list] Worker returned ${videoObjects.length} raw objects`);
    } catch (fetchError) {
      console.error("[videos/list] Failed to fetch from Worker:", fetchError);
      return Response.json({ 
        error: "Video source unavailable", 
        details: fetchError instanceof Error ? fetchError.message : "Unknown error" 
      }, { status: 503 });
    }

    // 🔑 修复问题1：严格过滤视频文件（避免空列表）
    const validVideoObjects = videoObjects.filter((obj: any) => {
      const fileKey = (obj?.key || obj?.Key || "").trim();
      return fileKey && isVideoFile(fileKey);
    });

    if (validVideoObjects.length === 0) {
      console.warn("[videos/list] No valid video files found in Worker response");
      // 返回空列表但不报错（前端可友好提示）
      return Response.json({ 
        videos: [], 
        isTruncated: false, 
        nextContinuationToken: null, 
        keyCount: 0,
        warning: "No video files detected. Check R2 bucket content and Worker response format."
      });
    }

    const videoKeys = validVideoObjects.map((obj: any) => (obj?.key || obj?.Key || "").trim());
    const metadataMap = await getVideoMetadataBatch(videoKeys) || new Map();

    console.log("[videos/list] Metadata loaded:", {
      requested: videoKeys.length,
      found: metadataMap.size,
      sampleKeys: videoKeys.slice(0, 3)
    });

    // 🔑 修复问题2：优化多语言处理（消除卡死风险）
    let videos = validVideoObjects
      .map((obj: any) => {
        const key = (obj?.key || obj?.Key || "").trim();
        if (!key) return null;
        
        const metadata = metadataMap.get(key) || obj.metadata || {};
        let displayTitle = "";
        let displayDescription = "";
        let displayCoverUrl: string | undefined;

        // 🔑 修复问题2：安全处理locale（避免循环/空值）
        if (locale && metadata.locales?.[locale]?.title?.trim()) {
          const locData = metadata.locales[locale];
          displayTitle = locData.title.trim();
          displayDescription = locData.description?.trim() || "";
          displayCoverUrl = locData.coverUrl;
        } else {
          // 优先使用默认语言（避免遍历所有locale）
          const defaultLocale = (process.env.NEXT_PUBLIC_DEFAULT_LOCALE as Locale) || "zh-CN";
          if (metadata.locales?.[defaultLocale]?.title?.trim()) {
            const locData = metadata.locales[defaultLocale];
            displayTitle = locData.title.trim();
            displayDescription = locData.description?.trim() || "";
            displayCoverUrl = locData.coverUrl;
          } else {
            // 最终回退：文件名（安全处理路径）
            displayTitle = decodeURIComponent(
              key.split("/").pop()?.replace(/\.[^.]+$/, "") || "Untitled Video"
            );
          }
        }

        // 🔑 修复问题3：返回完整播放所需字段
        return {
          key,
          url: getVideoPlayUrl(key), // ✅ 关键：前端直接使用此URL播放
          mimeType: getMimeType(key), // ✅ 关键：video标签需type属性
          size: obj?.size || obj?.Size || 0,
          lastModified: obj?.lastModified || obj?.LastModified?.toISOString?.() || new Date().toISOString(),
          title: displayTitle,
          description: displayDescription,
          coverUrl: displayCoverUrl,
          // 语言可用性（供前端语言切换器使用）
          availableLocales: metadata?.locales 
            ? Object.keys(metadata.locales).filter(loc => 
                metadata.locales[loc]?.title?.trim()
              )
            : [],
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null && v.title?.trim() !== "");

    // 🔑 修复问题2：标题搜索优化（避免阻塞）
    if (title?.trim()) {
      const searchTitle = title.trim().toLowerCase();
      videos = videos.filter(video => 
        video.title.toLowerCase().includes(searchTitle) ||
        video.description?.toLowerCase().includes(searchTitle) ||
        video.availableLocales.some(loc => {
          const meta = metadataMap.get(video.key)?.locales?.[loc as Locale];
          return meta?.title?.toLowerCase().includes(searchTitle) || 
                 meta?.description?.toLowerCase().includes(searchTitle);
        })
      );
    }

    // 🔑 修复问题2：分页安全处理（避免前端卡死）
    const maxResults = Math.min(parsed.data.maxKeys, 1000);
    const paginatedVideos = videos.slice(0, maxResults);
    
    return Response.json({ 
      videos: paginatedVideos, 
      isTruncated: videos.length > maxResults, 
      nextContinuationToken: null, 
      keyCount: paginatedVideos.length,
      // 调试信息（生产环境可移除）
      _debug: {
        workerUrl: videoApiUrl.replace(/token=[^&]+/i, "token=***"),
        totalProcessed: videos.length
      }
    });
    
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : "Unknown server error";
    console.error("[videos/list] Critical error:", e);
    return Response.json({ 
      error: "Video list generation failed", 
      message: errorMsg,
      hint: "Check server logs for details. Common causes: Worker timeout, metadata store error."
    }, { status: 500 });
  }
}
