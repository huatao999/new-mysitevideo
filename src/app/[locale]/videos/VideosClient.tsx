"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";
import VideoThumbnail from "@/components/video/VideoThumbnail";

type VideoItem = {
  key: string;
  size: number;
  lastModified: string;
  title: string;
  description?: string;
  coverUrl?: string;
  videoPreviewUrl?: string; // 视频文件的预签名 URL（用于生成封面预览）
  // 新增多语言封面的兼容类型，避免TS报错
  zhCover?: string;
  enCover?: string;
};

type VideosResponse = {
  videos: VideoItem[];
  isTruncated: boolean;
  nextContinuationToken: string | null;
  keyCount: number;
};

export default function VideosClient() {
  const t = useTranslations("videos");
  const locale = useLocale(); // 当前语言（zh/en/其他）
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  // 【新增1】定义播放器状态，存点击后获取的真实播放URL
  const [playVideoUrl, setPlayVideoUrl] = useState<string | null>(null);

  // 加载封面图片的预签名 URL（保留原有逻辑，未修改）
  async function loadCoverUrl(coverKey: string): Promise<string | null> {
    try {
      const res = await fetch(`/api/videos/presign-play?key=${encodeURIComponent(coverKey)}&expires=3600`);
      if (res.ok) {
        const data = await res.json();
        return data.url;
      }
    } catch (e) {
      console.error("Failed to load cover:", e);
    }
    return null;
  }

  // 加载视频文件的预签名 URL（保留原有逻辑，未修改）
  async function loadVideoUrl(videoKey: string): Promise<string | null> {
    try {
      console.log('【视频播放key参数】:', videoKey);
      const res = await fetch(`/api/videos/presign-play?key=${encodeURIComponent(videoKey)}&expires=3600`);
      if (res.ok) {
        const data = await res.json();
        return data.url;
      }
    } catch (e) {
      console.error("Failed to load video URL:", e);
    }
    return null;
  }

  // 【新增2】点击封面的播放处理函数（核心！触发预签名请求）
  const handleVideoPlay = async (videoKey: string, e: React.MouseEvent) => {
    // 阻止跳转到详情页，只触发播放
    e.preventDefault();
    e.stopPropagation();
    try {
      console.log(`【触发播放】视频key: ${videoKey}`);
      // 调用你原有已写好的loadVideoUrl，获取真实播放预签名URL
      const realVideoUrl = await loadVideoUrl(videoKey);
      if (realVideoUrl) {
        setPlayVideoUrl(realVideoUrl); // 赋值给播放器状态
        console.log(`【播放成功】获取到URL: ${realVideoUrl}`);
        // 自动聚焦播放器并播放（可选）
        setTimeout(() => {
          const videoPlayer = document.getElementById("video-player") as HTMLVideoElement;
          if (videoPlayer) {
            videoPlayer.play().catch(err => console.warn("自动播放失败（浏览器策略）:", err));
          }
        }, 100);
      } else {
        alert(t("videoLoadFailed"));
        console.error(`【播放失败】未获取到${videoKey}的播放URL`);
      }
    } catch (err) {
      alert(t("videoLoadFailed"));
      console.error(`【播放异常】${videoKey}:`, err);
    }
  };

  async function loadVideos(prefix?: string, continuationToken?: string) {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (prefix) params.set("prefix", prefix);
      if (continuationToken) params.set("continuationToken", continuationToken);
      params.set("maxKeys", "20");
      params.set("locale", locale); // 多语言过滤参数

      // 沿用你测试成功的fetch地址，正确拼接请求参数，保留无缓存配置
      const fetchUrl = `https://gentle-cell-74b9.ygy131419.workers.dev?${params.toString()}`;
      const res = await fetch(fetchUrl, { cache: "no-store" });
      console.log("🔍 发起视频请求：", fetchUrl);

      // 沿用你测试成功的响应校验逻辑，非2xx直接抛错
      if (!res.ok) throw new Error(`HTTP错误：${res.status} ${res.statusText}`);
      
      // 解析响应并做类型断言，和原有类型匹配
      const data = { videos: await res.json() } as VideosResponse;
      console.log("📥 原始响应数据：", data);

      // 严格数据校验，确保videos是数组再处理
      if (!data || !Array.isArray(data.videos)) {
        throw new Error("返回数据格式错误，videos不是有效数组");
      }

      // 动态获取多语言封面（zhCover/enCover/其他Cover）
      const videosWithCovers = await Promise.all(
        data.videos.map(async (video) => {
          // 动态拼接当前语言的封面字段：zh -> zhCover，en -> enCover
          const langCoverKey = `${locale}Cover` as keyof VideoItem;
          // 优先取当前语言的封面，没有则兜底（可选）
          const currentLangCover = video[langCoverKey];

          if (currentLangCover) { // 用动态的多语言封面替换固定的coverUrl
            let coverUrl = currentLangCover as string;
            // 原有预签名URL逻辑不变
            if (!((coverUrl as string).startsWith("http://") || (coverUrl as string).startsWith("https://") || (coverUrl as string).startsWith("data:"))) {
              const presignedCoverUrl = await loadCoverUrl(coverUrl);
              if (presignedCoverUrl) coverUrl = presignedCoverUrl;
              else console.warn(`Failed to load cover URL for ${video.key}`);
            }
            return { ...video, coverUrl }; // 挂载到coverUrl，让后续组件能识别
          } else {
            // 原有视频预览逻辑不变（无封面时用视频地址生成预览）
            const videoUrl = await loadVideoUrl(video.key);
            if (!videoUrl) console.warn(`Failed to load video URL for ${video.key}`);
            return { ...video, videoPreviewUrl: videoUrl || undefined };
          }
        })
      );

      console.log("✅ 处理后视频数据：", videosWithCovers);
      // 保留原有分页逻辑（追加/替换数据）
      if (continuationToken) {
        setVideos((prev) => [...prev, ...videosWithCovers]);
      } else {
        setVideos(videosWithCovers);
      }
      setNextToken(data.nextContinuationToken || null);
      setHasMore(data.isTruncated);
    } catch (e) {
      // 沿用你测试成功的错误处理，统一捕获并设置错误信息
      const errMsg = e instanceof Error ? e.message : "加载视频出现未知错误";
      console.error("❌ 加载视频失败：", errMsg);
      setError(errMsg);
    } finally {
      // 无论成功失败，最终都关闭加载状态
      setLoading(false);
    }
  }

  // 保留原有副作用逻辑：语言切换时重新加载视频（未修改）
  useEffect(() => {
    loadVideos();
    console.log("🔄 组件挂载/语言切换，调用loadVideos");
  }, [locale]);

  // 保留原有搜索逻辑（未修改）
  function handleSearch() {
    if (loading) return;
    const prefix = searchQuery.trim() || undefined;
    setNextToken(null);
    setHasMore(false);
    loadVideos(prefix);
  }

  // 保留原有加载更多逻辑（未修改）
  function handleLoadMore() {
    if (nextToken && !loading) {
      loadVideos(searchQuery.trim() || undefined, nextToken);
    }
  }

  // 保留原有视频详情页地址生成逻辑（未修改）
  function getVideoUrl(videoKey: string): string {
    return `/${locale}/videos/${encodeURIComponent(videoKey)}`;
  }

  // 保留原有文件大小格式化（未修改）
  function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  // 保留原有日期格式化（未修改）
  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  // 保留原有所有UI渲染逻辑，仅修改VideoThumbnail和新增播放器
  return (
    <div className="space-y-4">
      {/* 【新增3】视频播放器（放在最顶部，点击封面后显示） */}
      {playVideoUrl && (
        <div className="rounded-xl overflow-hidden border border-neutral-700">
          <video
            id="video-player"
            src={playVideoUrl}
            controls
            autoPlay
            className="w-full aspect-video"
            onClose={() => setPlayVideoUrl(null)} // 关闭播放器
          />
        </div>
      )}

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

      {/* Video List Empty */}
      {!loading && videos.length === 0 && !error && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-8 text-center">
          <p className="text-sm text-neutral-400">{t("noVideos")}</p>
        </div>
      )}

      {/* Video List */}
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
                  className="h-full w-full cursor-pointer"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleVideoPlay(video.key, e); }}
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
