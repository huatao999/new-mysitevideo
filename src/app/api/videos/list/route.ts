import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { z } from "zod";
import { env } from "@/lib/env";
import { getR2Client } from "@/lib/r2/client";
import { getVideoMetadataBatch } from "@/lib/video-metadata/store";
import { locales, type Locale } from "@/i18n/locales";

const querySchema = z.object({
  prefix: z.string().optional(),
  title: z.string().optional(), // 按视频标题搜索
  maxKeys: z.coerce.number().int().min(1).max(1000).default(100),
  continuationToken: z.string().optional(),
  locale: z.enum([...locales] as [Locale, ...Locale[]]).optional(), // 语言过滤
});

// 视频文件后缀白名单
const VIDEO_EXTENSIONS = [".mp4", ".webm", ".ogg", ".mov", ".avi", ".mkv", ".m3u8"];

/**
 * 校验是否为有效视频文件
 * @param key 视频文件key/路径
 * @returns 布尔值
 */
function isVideoFile(key: string): boolean {
  if (!key) return false;
  const lowerKey = key.toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => lowerKey.endsWith(ext));
}

export async function GET(req: Request) {
  try {
    // 校验环境变量，缺失直接返回500
    if (!env.R2_BUCKET) {
      return Response.json({ error: "R2_BUCKET missing" }, { status: 500 });
    }
    // 校验API地址环境变量，缺失直接返回500
    if (!process.env.NEXT_PUBLIC_VIDEO_API_URL) {
      return Response.json({ error: "NEXT_PUBLIC_VIDEO_API_URL missing" }, { status: 500 });
    }

    // 解析并校验URL查询参数
    const url = new URL(req.url);
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid query", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    // 核心修复1：解构查询参数，解决locale/title/maxKeys等未定义问题
    const { title, locale } = parsed.data;

    // 调用外部API获取视频列表，增加响应校验
    const apiResponse = await fetch(process.env.NEXT_PUBLIC_VIDEO_API_URL);
    if (!apiResponse.ok) {
      return Response.json(
        { error: "Failed to fetch video list", status: apiResponse.status },
        { status: 500 }
      );
    }
    const videoObjects = await apiResponse.json();
    // 校验返回数据是否为数组，非数组直接返回空列表
    if (!Array.isArray(videoObjects)) {
      return Response.json({ videos: [], isTruncated: false, nextContinuationToken: null, keyCount: 0 });
    }

    // 核心修复2：兼容key/Key字段，过滤无效视频（非视频文件/无key），避免后续报错
    const validVideoObjects = videoObjects.filter((obj: any) => {
      const fileKey = obj?.key || obj?.Key;
      return fileKey && isVideoFile(fileKey);
    });

    // 核心修复3：兼容key/Key字段获取视频key，为获取元数据做准备
    const videoKeys = validVideoObjects.map((obj: any) => obj?.key || obj?.Key);
    // 获取视频元数据，兜底空对象避免后续解构报错
    const metadataMap = await getVideoMetadataBatch(videoKeys) || new Map();

    // 日志打印（保留，方便部署后调试）
    // eslint-disable-next-line no-console
    console.log("[videos/list] Loaded metadata:", {
      videoCount: videoKeys.length,
      metadataCount: metadataMap.size,
      videoKeys: videoKeys.slice(0, 5),
      metadataKeys: Array.from(metadataMap.keys()).slice(0, 5),
    });

    // 格式化视频数据，拼接元数据
    let videos = validVideoObjects
      .map((obj: any) => {
        // 统一key字段：优先obj.key，兜底obj.Key，确保非空
        const key = obj?.key || obj?.Key || "";
        // 核心修复4：元数据优先级（缓存Map > 自身metadata > 空对象），避免undefined
        const metadata = metadataMap.get(key) || obj.metadata || {};
        // 核心修复5：删除无效的obj.locale判断（原代码无该字段，导致过滤逻辑失效）

        let localeData: any = {};
        let displayTitle: string;
        let displayDescription: string = "";
        let displayCoverUrl: string | undefined;

        // 语言过滤逻辑：指定了语言则过滤对应语言的有效数据
        if (locale) {
          // 取指定语言的元数据，兜底空对象
          localeData = metadata.locales?.[locale] || {};
          // 无有效标题则过滤掉该视频
          if (!localeData.title || localeData.title.trim() === "") {
            return null;
          }
          displayTitle = localeData.title.trim();
          displayDescription = localeData.description?.trim() || "";
          displayCoverUrl = localeData.coverUrl;
        } else {
          // 未指定语言：优先取第一个有有效标题的语言，兜底用文件名
          if (metadata && metadata.locales) {
            // 找到第一个有非空标题的语言
            const firstLocaleWithTitle = locales.find((loc) => {
              const locData = metadata.locales[loc];
              return locData && locData.title && locData.title.trim() !== "";
            });
            if (firstLocaleWithTitle) {
              localeData = metadata.locales[firstLocaleWithTitle];
              displayTitle = localeData.title.trim();
              displayDescription = localeData.description?.trim() || "";
              displayCoverUrl = localeData.coverUrl;
            } else {
              // 无有效语言元数据，用文件名作为标题
              displayTitle = key.split("/").pop()?.replace(/\.[^.]+$/, "") || "未知视频";
            }
          } else {
            // 无任何元数据，用文件名作为标题
            displayTitle = key.split("/").pop()?.replace(/\.[^.]+$/, "") || "未知视频";
          }
        }

        // 核心修复6：兼容size/Size、lastModified/LastModified字段，兜底默认值
        return {
          key,
          size: obj?.size || obj?.Size || 0,
          lastModified: obj?.lastModified || obj?.LastModified?.toISOString() || new Date().toISOString(),
          title: displayTitle,
          description: displayDescription,
          coverUrl: displayCoverUrl,
          // 构造精简元数据：仅保留有有效标题的语言
          metadata: metadata?.locales
            ? {
                locales: Object.keys(metadata.locales).filter((loc) => {
                  const locData = metadata.locales[loc as Locale];
                  return locData && locData.title && locData.title.trim() !== "";
                }),
              }
            : undefined,
        };
      })
      // 过滤掉null值（语言过滤无效的视频）
      .filter((v) => v !== null) as Array<{
      key: string;
      size: number;
      lastModified: string;
      title: string;
      description: string;
      coverUrl?: string;
      metadata?: { locales: string[] };
    }>;

    // 标题搜索逻辑：修复title未定义问题，增加非空校验
    if (title && title.trim()) {
      const searchTitle = title.trim().toLowerCase();
      videos = videos.filter((video) => {
        // 先在所有语言的标题中搜索
        if (video.metadata?.locales) {
          const videoMetadata = metadataMap.get(video.key) || {};
          if (videoMetadata.locales) {
            for (const loc of video.metadata.locales) {
              const locData = videoMetadata.locales[loc as Locale];
              if (locData?.title && locData.title.toLowerCase().includes(searchTitle)) {
                return true;
              }
            }
          }
        }
        // 再在当前显示的标题中搜索
        return video.title.toLowerCase().includes(searchTitle);
      });
      // 搜索结果返回，分页字段兜底默认值
      return Response.json({
        videos,
        isTruncated: false,
        nextContinuationToken: null,
        keyCount: videos.length,
      });
    }

    // 正常结果返回，分页字段兜底默认值（外部API无分页，直接返回false/null）
    return Response.json({
      videos,
      isTruncated: false,
      nextContinuationToken: null,
      keyCount: videos.length,
    });
  } catch (e) {
    // 核心修复7：完善错误捕获，打印详细错误日志，返回友好错误信息
    const errorMsg = e instanceof Error ? e.message : "Unknown server error";
    // eslint-disable-next-line no-console
    console.error("[videos/list] Request failed:", e);
    return Response.json(
      { error: "List videos failed", message: errorMsg },
      { status: 500 }
    );
  }
}
