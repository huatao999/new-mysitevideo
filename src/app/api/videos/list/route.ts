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

    const apiResponse = await fetch(process.env.NEXT_PUBLIC_VIDEO_API_URL);
    if (!apiResponse.ok) {
      return Response.json(
        { error: "Failed to fetch video list", status: apiResponse.status },
        { status: 500 }
      );
    }
    const videoObjects = await apiResponse.json();
    if (!Array.isArray(videoObjects)) {
      return Response.json({ videos: [], isTruncated: false, nextContinuationToken: null, keyCount: 0 });
    }

    const validVideoObjects = videoObjects.filter((obj: any) => {
      const fileKey = obj?.key || obj?.Key;
      return fileKey && isVideoFile(fileKey);
    });

    const videoKeys = validVideoObjects.map((obj: any) => obj?.key || obj?.Key);
    const metadataMap = await getVideoMetadataBatch(videoKeys) || new Map();

    console.log("[videos/list] Loaded metadata:", {
      videoCount: videoKeys.length,
      metadataCount: metadataMap.size,
      videoKeys: videoKeys.slice(0, 5),
      metadataKeys: Array.from(metadataMap.keys()).slice(0, 5),
    });

    let videos = validVideoObjects
      .map((obj: any) => {
        const key = obj?.key || obj?.Key || "";
        const metadata = metadataMap.get(key) || obj.metadata || {};

        let displayTitle: string;
        let displayDescription: string = "";
        let displayCoverUrl: string | undefined;

        if (locale) {
          const localeData = metadata.locales?.[locale] || {};
          if (!localeData.title || localeData.title.trim() === "") return null;
          displayTitle = localeData.title.trim();
          displayDescription = localeData.description?.trim() || "";
          displayCoverUrl = localeData.coverUrl;
        } else {
          if (metadata?.locales) {
            const firstLocaleWithTitle = locales.find((loc) => {
              const locData = metadata.locales[loc];
              return locData && locData.title && locData.title.trim() !== "";
            });
            if (firstLocaleWithTitle) {
              const locData = metadata.locales[firstLocaleWithTitle];
              displayTitle = locData.title.trim();
              displayDescription = locData.description?.trim() || "";
              displayCoverUrl = locData.coverUrl;
            } else {
              displayTitle = key.split("/").pop()?.replace(/\.[^.]+$/, "") || "未知视频";
            }
          } else {
            displayTitle = key.split("/").pop()?.replace(/\.[^.]+$/, "") || "未知视频";
          }
        }

        return {
          key,
          size: obj?.size || obj?.Size || 0,
          lastModified: obj?.lastModified || obj?.LastModified?.toISOString() || new Date().toISOString(),
          title: displayTitle,
          description: displayDescription,
          coverUrl: displayCoverUrl,
          metadata: metadata?.locales
            ? {
                locales: Object.keys(metadata.locales).filter((loc) => {
                  const locData = metadata.locales[loc];
                  return locData && locData.title && locData.title.trim() !== "";
                }),
              }
            : undefined,
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);

    if (title?.trim()) {
      const searchTitle = title.trim().toLowerCase();
      videos = videos.filter((video) => {
        if (video.metadata?.locales) {
          const videoMeta = (metadataMap.get(video.key) || {}) as { locales?: Record<string, { title?: string }> };
          if (videoMeta.locales && typeof videoMeta.locales === "object" && !Array.isArray(videoMeta.locales)) {
            for (const loc of video.metadata.locales) {
              if (videoMeta.locales[loc]?.title?.toLowerCase().includes(searchTitle)) {
                return true;
              }
            }
          }
        }
        return (video.title?.toLowerCase().includes(searchTitle)) || false;
      });
      return Response.json({ videos, isTruncated: false, nextContinuationToken: null, keyCount: videos.length });
    }

    return Response.json({ videos, isTruncated: false, nextContinuationToken: null, keyCount: videos.length });
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : "Unknown server error";
    console.error("[videos/list] Request failed:", e);
    return Response.json({ error: "List videos failed", message: errorMsg }, { status: 500 });
  }
}
