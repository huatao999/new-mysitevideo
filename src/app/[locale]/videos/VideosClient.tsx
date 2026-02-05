"use client";

import {useEffect, useState} from "react";
import Link from "next/link";
import {useLocale} from "next-intl";
import {useTranslations} from "next-intl";
import VideoThumbnail from "@/components/video/VideoThumbnail";

type VideoItem = {
  key: string;
  size: number;
  lastModified: string;
  title: string;
  description?: string;
  coverUrl?: string;
  videoPreviewUrl?: string; // 视频文件的预签名 URL（用于生成封面预览）
};

type VideosResponse = {
  videos: VideoItem[];
  isTruncated: boolean;
  nextContinuationToken: string | null;
  keyCount: number;
};

export default function VideosClient() {
  const t = useTranslations("videos");
  const locale = useLocale();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // 加载封面图片的预签名 URL
  async function loadCoverUrl(coverKey: string): Promise<string | null> {
    try {
      const res = await fetch(`/api/videos/presign-play?key=${encodeURIComponent(coverKey)}&expires=3600`);
      if (res.ok) {
        const data = await res.json();
        return data.url;
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Failed to load cover:", e);
    }
    return null;
  }

  // 加载视频文件的预签名 URL（用于生成封面预览）
  async function loadVideoUrl(videoKey: string): Promise<string | null> {
    try {
      const res = await fetch(`/api/videos/presign-play?key=${encodeURIComponent(videoKey)}&expires=3600`);
      if (res.ok) {
        const data = await res.json();
        return data.url;
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Failed to load video URL:", e);
    }
    return null;
  }

  async function loadVideos(prefix?: string, continuationToken?: string) {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (prefix) params.set("prefix", prefix);
      if (continuationToken) params.set("continuationToken", continuationToken);
      params.set("maxKeys", "20");
      // 添加语言过滤参数，确保只显示当前语言的视频
      params.set("locale", locale);

      const res = await fetch(`/api/videos/list?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `加载视频列表失败：${res.status}`);
      }

      const data = (await res.json()) as VideosResponse;
      
      // 加载封面图片或视频文件的预签名 URL
      const videosWithCovers = await Promise.all(
        data.videos.map(async (video) => {
          if (video.coverUrl) {
            // 如果有封面 URL（可能是 R2 key），加载封面的预签名 URL
            // coverUrl 可能是完整的 URL 或者是 R2 key
            let coverUrl = video.coverUrl;
            if (!coverUrl.startsWith("http://") && !coverUrl.startsWith("https://") && !coverUrl.startsWith("data:")) {
              // 如果是 R2 key，需要获取预签名 URL
              const presignedCoverUrl = await loadCoverUrl(coverUrl);
              if (presignedCoverUrl) {
                coverUrl = presignedCoverUrl;
              } else {
                // eslint-disable-next-line no-console
                console.warn(`Failed to load cover URL for ${video.key}, coverUrl: ${video.coverUrl}`);
              }
            }
            return {...video, coverUrl};
          } else {
            // 如果没有封面，使用视频文件本身作为预览
            const videoUrl = await loadVideoUrl(video.key);
            if (!videoUrl) {
              // eslint-disable-next-line no-console
              console.warn(`Failed to load video URL for ${video.key}`);
            }
            return {...video, videoPreviewUrl: videoUrl || undefined};
          }
        })
      );
      
      if (continuationToken) {
        // Append to existing videos (pagination)
        setVideos((prev) => [...prev, ...videosWithCovers]);
      } else {
        // Replace videos (new search)
        setVideos(videosWithCovers);
      }
      setNextToken(data.nextContinuationToken || null);
      setHasMore(data.isTruncated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "未知错误");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVideos();
  }, [locale]);

  function handleSearch() {
    if (loading) return; // Prevent search while loading
    const prefix = searchQuery.trim() || undefined;
    setNextToken(null);
    setHasMore(false);
    setError(null); // Clear previous errors
    loadVideos(prefix);
  }

  function handleLoadMore() {
    if (nextToken && !loading) {
      loadVideos(searchQuery.trim() || undefined, nextToken);
    }
  }

  // Generate video detail URL with locale
  function getVideoUrl(videoKey: string): string {
    return `/${locale}/videos/${encodeURIComponent(videoKey)}`;
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !loading) {
              handleSearch();
            }
          }}
          placeholder={t("searchPlaceholder")}
          className="flex-1 rounded-md border border-neutral-700 bg-neutral-950 px-3 py-3 text-sm text-neutral-50 placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none touch-manipulation min-h-[44px]"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="rounded-md bg-white px-4 py-3 text-sm font-semibold text-black disabled:opacity-50 touch-manipulation min-h-[44px] min-w-[80px] active:bg-neutral-200 transition-colors"
        >
          {t("search")}
        </button>
      </div>

      {/* Error Message */}
      {error && <div className="rounded-md bg-red-900/20 border border-red-800 px-4 py-3 text-sm text-red-300">{error}</div>}

      {/* Loading State */}
      {loading && videos.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="text-sm text-neutral-400">{t("loading")}</div>
        </div>
      )}

      {/* Video List */}
      {!loading && videos.length === 0 && !error && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-8 text-center">
          <p className="text-sm text-neutral-400">{t("noVideos")}</p>
        </div>
      )}

      {videos.length > 0 && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <Link
              key={video.key}
              href={getVideoUrl(video.key)}
              className="group rounded-xl border border-neutral-800 bg-neutral-900/30 p-4 text-left transition-all hover:border-neutral-700 hover:bg-neutral-900/50 active:bg-neutral-900/60 touch-manipulation"
            >
              <div className="mb-3 aspect-video w-full overflow-hidden">
                <VideoThumbnail
                  coverUrl={video.coverUrl}
                  videoUrl={video.videoPreviewUrl}
                  alt={video.title}
                  className="h-full w-full"
                />
              </div>
              <h3 className="mb-2 line-clamp-2 text-sm font-semibold text-neutral-50 group-hover:text-white">
                {video.title}
              </h3>
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>{formatFileSize(video.size)}</span>
                <span>{formatDate(video.lastModified)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Load More Button */}
      {hasMore && videos.length > 0 && (
        <div className="flex justify-center pt-4">
          <button
            onClick={handleLoadMore}
            disabled={loading || !nextToken}
            className="rounded-md border border-neutral-700 bg-neutral-900/50 px-6 py-3 text-sm text-neutral-300 transition-colors hover:bg-neutral-900 active:bg-neutral-800 disabled:opacity-50 touch-manipulation min-h-[44px]"
          >
            {loading ? t("loading") : t("loadMore")}
          </button>
        </div>
      )}
    </div>
  );
}
