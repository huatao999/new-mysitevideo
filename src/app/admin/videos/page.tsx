"use client";

import {useEffect, useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import VideoThumbnail from "@/components/video/VideoThumbnail";

type VideoItem = {
  key: string;
  size: number;
  lastModified: string;
  title: string;
  description?: string;
  coverUrl?: string;
  videoPreviewUrl?: string; // 视频文件的预签名 URL（用于生成封面预览）
  metadata?: {
    locales: string[];
  };
};

type VideosResponse = {
  videos: VideoItem[];
  isTruncated: boolean;
  nextContinuationToken: string | null;
  keyCount: number;
};

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

export default function AdminVideosPage() {
  const router = useRouter();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  async function loadVideos(title?: string, continuationToken?: string) {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (title) params.set("title", title);
      if (continuationToken) params.set("continuationToken", continuationToken);
      params.set("maxKeys", "50");

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
        setVideos((prev) => [...prev, ...videosWithCovers]);
      } else {
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
  }, []);

  function handleSearch() {
    if (loading) return;
    const title = searchQuery.trim() || undefined;
    setNextToken(null);
    setHasMore(false);
    setError(null);
    loadVideos(title);
  }

  function handleLoadMore() {
    if (nextToken && !loading) {
      const title = searchQuery.trim() || undefined;
      loadVideos(title, nextToken);
    }
  }

  async function handleDelete(key: string) {
    if (!confirm(`确定要删除视频 "${key}" 吗？此操作不可恢复。`)) {
      return;
    }

    setDeletingKey(key);

    try {
      const res = await fetch("/api/admin/videos/delete", {
        method: "DELETE",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({key}),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "删除失败");
      }

      // 从列表中移除
      setVideos((prev) => prev.filter((v) => v.key !== key));
    } catch (e) {
      alert(e instanceof Error ? e.message : "删除失败");
    } finally {
      setDeletingKey(null);
    }
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
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">视频管理</h1>
          <p className="mt-1 text-sm text-neutral-400">管理所有视频文件</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/upload"
            className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-neutral-200 active:bg-neutral-300 touch-manipulation min-h-[44px]"
          >
            上传视频
          </Link>
          <Link
            href="/admin"
            className="rounded-md border border-neutral-700 bg-neutral-900/50 px-4 py-2 text-sm text-neutral-300 transition-colors hover:bg-neutral-900 active:bg-neutral-800 touch-manipulation min-h-[44px]"
          >
            返回
          </Link>
        </div>
      </div>

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
          placeholder="搜索视频（按视频标题）"
          className="flex-1 rounded-md border border-neutral-700 bg-neutral-950 px-3 py-3 text-sm text-neutral-50 placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none touch-manipulation min-h-[44px]"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="rounded-md bg-white px-4 py-3 text-sm font-semibold text-black disabled:opacity-50 touch-manipulation min-h-[44px] min-w-[80px] active:bg-neutral-200 transition-colors"
        >
          搜索
        </button>
      </div>

      {/* Error Message */}
      {error && <div className="rounded-md bg-red-900/20 border border-red-800 px-4 py-3 text-sm text-red-300">{error}</div>}

      {/* Loading State */}
      {loading && videos.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="text-sm text-neutral-400">加载中...</div>
        </div>
      )}

      {/* Video List */}
      {!loading && videos.length === 0 && !error && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-8 text-center">
          <p className="text-sm text-neutral-400">暂无视频</p>
        </div>
      )}

      {videos.length > 0 && (
        <div className="space-y-3">
          {videos.map((video) => (
            <div
              key={video.key}
              className="flex gap-4 rounded-xl border border-neutral-800 bg-neutral-900/30 p-4"
            >
              {/* Cover Image or Video Preview */}
              <div className="flex-shrink-0">
                <VideoThumbnail
                  coverUrl={video.coverUrl}
                  videoUrl={video.videoPreviewUrl}
                  alt={video.title}
                  className="h-24 w-40"
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="mb-1 flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-neutral-50 truncate">{video.title}</h3>
                  <span className="text-xs text-neutral-500 flex-shrink-0">{video.key}</span>
                </div>
                {video.description && (
                  <p className="mb-2 line-clamp-2 text-xs text-neutral-400">{video.description}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-neutral-400">
                  <span>{formatFileSize(video.size)}</span>
                  <span>{formatDate(video.lastModified)}</span>
                  {video.metadata?.locales && video.metadata.locales.length > 0 && (
                    <span className="text-neutral-500">
                      语言: {video.metadata.locales.join(", ")}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 flex-shrink-0">
                <Link
                  href={`/admin/videos/${encodeURIComponent(video.key)}/edit`}
                  className="rounded-md border border-neutral-700 bg-neutral-900/50 px-3 py-2 text-xs text-neutral-300 transition-colors hover:bg-neutral-900 active:bg-neutral-800 touch-manipulation min-h-[36px] text-center"
                >
                  编辑
                </Link>
                <Link
                  href={`/en/videos/${encodeURIComponent(video.key)}`}
                  target="_blank"
                  className="rounded-md border border-neutral-700 bg-neutral-900/50 px-3 py-2 text-xs text-neutral-300 transition-colors hover:bg-neutral-900 active:bg-neutral-800 touch-manipulation min-h-[36px] text-center"
                >
                  查看
                </Link>
                <button
                  onClick={() => handleDelete(video.key)}
                  disabled={deletingKey === video.key}
                  className="rounded-md border border-red-800 bg-red-900/20 px-3 py-2 text-xs text-red-300 transition-colors hover:bg-red-900/30 active:bg-red-900/40 disabled:opacity-50 touch-manipulation min-h-[36px]"
                >
                  {deletingKey === video.key ? "删除中..." : "删除"}
                </button>
              </div>
            </div>
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
            {loading ? "加载中..." : "加载更多"}
          </button>
        </div>
      )}
    </div>
  );
}
