import { z } from "zod";
import { locales, type Locale } from "@/i18n/locales";

// 保留原查询参数校验规则，保证前端传参兼容
const querySchema = z.object({
  prefix: z.string().optional(),
  title: z.string().optional(), // 按视频标题搜索
  maxKeys: z.coerce.number().int().min(1).max(1000).default(100),
  continuationToken: z.string().optional(),
  locale: z.enum([...locales] as [Locale, ...Locale[]]).optional(), // 语言过滤
});

// 视频文件后缀白名单（和原逻辑一致，保证过滤有效视频）
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
    // 1. 校验Worker接口环境变量是否存在（核心）
    const API_URL = process.env.NEXT_PUBLIC_VIDEO_API_URL;
    if (!API_URL) {
      return Response.json(
        { error: "NEXT_PUBLIC_VIDEO_API_URL 环境变量未配置" },
        { status: 500 }
      );
    }

    // 2. 解析并校验前端传的查询参数（和原逻辑一致，不改动）
    const url = new URL(req.url);
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) {
      return Response.json(
        { error: "参数格式错误", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { title, locale } = parsed.data;

    // 3. 纯请求Cloudflare Worker接口（核心改造：删掉所有R2相关逻辑）
    const apiResponse = await fetch(API_URL, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-cache", // 禁用缓存，保证拿最新数据
    });

    // 4. 校验Worker接口响应状态
    if (!apiResponse.ok) {
      return Response.json(
        { error: "Worker接口请求失败", status: apiResponse.status },
        { status: apiResponse.status }
      );
    }

    // 5. 解析Worker返回的视频数据
    const videoObjects = await apiResponse.json();
    // 非数组直接返回空列表，避免后续报错
    if (!Array.isArray(videoObjects)) {
      return Response.json({
        videos: [],
        isTruncated: false,
        nextContinuationToken: null,
        keyCount: 0,
      });
    }

    // 6. 过滤有效视频（仅保留视频文件，兼容key/Key字段）
    const validVideos = videoObjects.filter((obj: any) => {
      const fileKey = obj?.key || obj?.Key;
      return fileKey && isVideoFile(fileKey);
    });

    // 7. 基础格式化（统一字段名，保证前端能解析，极简版）
    let formattedVideos = validVideos.map((obj: any) => {
      const key = obj?.key || obj?.Key || "";
      // 兜底标题：用文件名（去掉后缀）
      const defaultTitle = key.split("/").pop()?.replace(/\.[^.]+$/, "") || "未知视频";
      // 统一核心字段（Worker返回啥就用啥，兜底默认值）
      return {
        key,
        size: obj?.size || obj?.Size || 0,
        lastModified: obj?.lastModified || obj?.LastModified?.toISOString() || new Date().toISOString(),
        title: obj?.title || defaultTitle, // 优先用Worker返回的标题，兜底文件名
        description: obj?.description || "",
        coverUrl: obj?.coverUrl || undefined,
      };
    });

    // 8. 保留原有的【标题搜索】和【语言过滤】轻量逻辑（极简版，避免复杂报错）
    // 标题搜索
    if (title && title.trim()) {
      const searchKey = title.trim().toLowerCase();
      formattedVideos = formattedVideos.filter(v => 
        v.title.toLowerCase().includes(searchKey)
      );
    }

    // 语言过滤（极简版：如果Worker返回了locale字段，才过滤）
    if (locale) {
      formattedVideos = formattedVideos.filter(v => 
        v?.metadata?.locales?.includes(locale) || v?.locale === locale
      );
    }

    // 9. 按原格式返回，保证前端能正常解析（字段和原接口完全一致）
    return Response.json({
      videos: formattedVideos,
      isTruncated: false,
      nextContinuationToken: null,
      keyCount: formattedVideos.length,
    });

  } catch (e) {
    // 错误捕获：打印详细日志，返回友好信息
    const errorMsg = e instanceof Error ? e.message : "未知服务器错误";
    console.error("[视频列表接口] 异常：", e);
    return Response.json(
      { error: "获取视频列表失败", message: errorMsg },
      { status: 500 }
    );
  }
}
