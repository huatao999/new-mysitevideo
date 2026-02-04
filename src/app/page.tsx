'use client';
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";

// 注释：如果VideoThumbnail组件在 @/components/video/ 下，解开下面这行注释即可
import VideoThumbnail from "@/components/video/VideoThumbnail";

// 视频项类型定义
type VideoItem = {
  key: string;
  size: number;
  lastModified: string;
  title: string;
  description?: string;
  coverUrl?: string;
  videoPreviewUrl?: string;
  zhCover?: string;
  enCover?: string;
};

// 视频列表响应类型
type VideosResponse = {
  videos: VideoItem[];
  isTruncated: boolean;
  nextContinuationToken: string | null;
  keyCount: number;
};

// Worker根地址（和视频库页面保持一致，不用改）
const WORKER_BASE_URL = "https://gentle-cell-74b9.ygy131419.workers.dev";

// 首页默认组件
export default function Home() {
  const t = useTranslations("videos"); // 复用videos的国际化文案
  const locale = useLocale(); // 获取当前语言（zh/en）
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [playVideoUrl, setPlayVideoUrl] = useState<string | null>(null);

  // 加载封面预签名URL（指向Worker）
  async function loadCoverUrl(coverKey: string): Promise<string | null> {
    try {
      console.log(`【加载封面】请求Worker: ${coverKey}`);
      const res = await fetch(
        `${WORKER_BASE_URL}/presign-play?key=${encodeURIComponent(coverKey)}&expires=3600`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        console.log(`【封面成功】${coverKey} → ${data.url}`);
        return data.url;
      } else {
        console.error(`【封面失败】HTTP${res.status}`, await res.text());
      }
    } catch (e) {
      console.error("Failed to load cover:", e);
    }
    return null;
  }

  // 加载视频播放预签名URL（指向Worker）
  async function loadVideoUrl(videoKey: string): Promise<string | null> {
    try {
      console.log(`【播放请求】开始获取${videoKey}的预签名URL`);
      const res = await fetch(
        `${WORKER_BASE_URL}/presign-play?key=${encodeURIComponent(videoKey)}&expires=3600`,
        { cache: "no-store", method: "GET" }
      );
      console.log(`【播放响应】状态: ${res.status}`, await res.clone().text());
      if (res.ok) {
        const data = await res.json();
        console.log(`【播放成功】${videoKey} → ${data.playUrl}`);
        return data.playUrl;
      }
    } catch (e) {
      console.error(`【播放异常】获取${videoKey}URL失败:`, e);
    }
    return null;
  }

  // 视频播放点击处理
  const handleVideoPlay = async (videoKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      console.log(`\n==========【触发视频播放】${videoKey}==========`);
      const realVideoUrl = await loadVideoUrl(videoKey);
      if (realVideoUrl) {
        setPlayVideoUrl(realVideoUrl);
        setTimeout(() => {
          const videoPlayer = document.getElementById("video-player") as HTMLVideoElement;
          if (videoPlayer) {
            videoPlayer.play().catch(err => console.warn("自动播放失败（浏览器策略）:", err));
          }
        }, 100);
      } else {
        alert(t("videoLoadFailed"));
        console.error(`【播放失败】未获取到${videoKey}的有效URL`);
      }
    } catch (err) {
      alert(t("videoLoadFailed"));
      console.error(`【播放崩溃】${videoKey}:`, err);
    }
  };

  // 加载视频列表核心方法
  async function loadVideos(prefix?: string, continuationToken?: string) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (prefix) params.set("prefix", prefix);
      if (continuationToken) params.set("continuationToken", continuationToken);
      params.set("maxKeys", "20");
      params.set("locale", locale);
      const fetchUrl = `${WORKER_BASE_URL}?${params.toString()}`;
      console.log("🔍 发起视频列表请求：", fetchUrl);
      const res = await fetch(fetchUrl, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP错误：${res.status} ${res.statusText}`);
      // 兼容Worker返回的纯数组格式
      const rawData = await res.json();
      const data = Array.isArray(rawData) 
        ? { videos: rawData, isTruncated: false, nextContinuationToken: null, keyCount: rawData.length } 
        : (rawData as VideosResponse);
      console.log("📥 视频列表原始数据：", data);
      if (!data || !Array.isArray(data.videos)) {
        throw new Error("返回数据格式错误，videos不是有效数组");
      }
      // 批量处理封面URL
      const videosWithCovers = await Promise.all(
        data.videos.map(async (video) => {
          const langCoverKey = `${locale}Cover` as keyof VideoItem;
          const currentLangCover = video[langCoverKey];
          if (currentLangCover) {
            let coverUrl = currentLangCover as string;
            if (!coverUrl.startsWith("http://") && !coverUrl.startsWith("https://") && !coverUrl.startsWith("data:")) {
              const presignedCoverUrl = await loadCoverUrl(coverUrl);
              if (presignedCoverUrl) coverUrl = presignedCoverUrl;
              else console.warn(`Failed to load cover URL for ${video.key}`);
            }
            return { ...video, coverUrl };
          } else {
            const videoUrl = await loadVideoUrl(video.key);
            if (!videoUrl) console.warn(`Failed to load video URL for ${video.key}`);
            return { ...video, videoPreviewUrl: videoUrl || undefined };
          }
        })
      );
      console.log("✅ 处理后视频数据：", videosWithCovers);
      // 分页逻辑：加载更多则追加，否则重置
      if (continuationToken) {
        setVideos((prev) => [...prev, ...videosWithCovers]);
      } else {
        setVideos(videosWithCovers);
      }
      setNextToken(data.nextContinuationToken || null);
      setHasMore(data.isTruncated);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : "加载视频出现未知错误";
      console.error("❌ 加载视频失败：", errMsg);
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  }

  // 组件挂载/语言切换时加载视频
  useEffect(() => {
    loadVideos();
    console.log("🔄 组件挂载/语言切换，重新加载视频");
  }, [locale]);

  // 搜索按钮点击/回车处理
  function handleSearch() {
    if (loading) return;
    const prefix = searchQuery.trim() || undefined;
    setNextToken(null);
    setHasMore(false);
    loadVideos(prefix);
  }

  // 加载更多视频处理
  function handleLoadMore() {
    if (nextToken && !loading) {
      loadVideos(searchQuery.trim() || undefined, nextToken);
    }
  }

  // 生成视频详情页链接
  function getVideoUrl(videoKey: string): string {
    return `/${locale}/videos/${encodeURIComponent(videoKey)}`;
  }

  // 格式化文件大小（B/KB/MB/GB）
  function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  // 格式化时间
  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  // 临时替代VideoThumbnail组件（如果你的组件丢失/报错，用这个兜底，不影响显示）
  const VideoThumbnailFallback = ({ coverUrl, videoUrl, alt, className }: {
    coverUrl?: string;
    videoUrl?: string;
    alt: string;
    className?: string;
  }) => {
    if (coverUrl) {
      return <img src={coverUrl} alt={alt} className={className} loading="lazy" />;
    } else if (videoUrl) {
      return <video src={videoUrl} alt={alt} className={className} muted loop playsInline />;
    } else {
      return <div className={`${className} bg-neutral-800 flex items-center justify-center text-neutral-500`}>{alt}</div>;
    }
  };

  // 页面渲染
  return (
    <div className="container mx-auto p-5 space-y-4">
      {/* 视频播放器 */}
      {playVideoUrl && (
        <div className="rounded-xl overflow-hidden border border-neutral-700">
          <video
            id="video-player"
            src={playVideoUrl}
            controls
            autoPlay
            className="w-full aspect-video"
            onClose={() => setPlayVideoUrl(null)}
          />
        </div>
      )}

      {/* 搜索框 */}
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
          placeholder={t("searchPlaceholder") || "搜索视频标题..."}
          className="flex-1 rounded-md border border-neutral-700 bg-neutral-950 px-3 py-3 text-sm text-neutral-50 placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none touch-manipulation min-h-[44px]"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="rounded-md bg-white px-4 py-3 text-sm font-semibold text-black disabled:opacity-50 touch-manipulation min-h-[44px] min-w-[80px] active:bg-neutral-200 transition-colors"
        >
          {t("search") || "搜索"}
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="rounded-md bg-red-900/20 border border-red-800 px-4 py-3 text-sm text-red-300">
          ⚠️ {error}
        </div>
      )}

      {/* 加载中 */}
      {loading && videos.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="text-sm text-neutral-400">{t("loading") || "加载中..."}</div>
        </div>
      )}

      {/* 无视频提示 */}
      {!loading && videos.length === 0 && !error && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-8 text-center">
          <p className="text-sm text-neutral-400">{t("noVideos") || "暂无视频数据"}</p>
        </div>
      )}

      {/* 视频列表卡片 */}
      {videos.length > 0 && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <Link
              key={video.key}
              href={getVideoUrl(video.key)}
              className="group rounded-xl border border-neutral-800 bg-neutral-900/30 p-4 text-left transition-all hover:border-neutral-700 hover:bg-neutral-900/50 active:bg-neutral-900/60 touch-manipulation"
            >
              <div 
                className="mb-3 aspect-video w-full overflow-hidden cursor-pointer"
                onClick={(e) => handleVideoPlay(video.key, e)}
              >
                {/* 优先用你的VideoThumbnail组件，不存在则用兜底组件 */}
                {typeof VideoThumbnail !== 'undefined' ? (
                  <VideoThumbnail
                    coverUrl={video.coverUrl}
                    videoUrl={video.videoPreviewUrl}
                    alt={video.title}
                    className="h-full w-full"
                  />
                ) : (
                  <VideoThumbnailFallback
                    coverUrl={video.coverUrl}
                    videoUrl={video.videoPreviewUrl}
                    alt={video.title}
                    className="h-full w-full object-cover rounded"
                  />
                )}
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

      {/* 加载更多按钮 */}
      {hasMore && videos.length > 0 && (
        <div className="flex justify-center pt-4">
          <button
            onClick={handleLoadMore}
            disabled={loading || !nextToken}
            className="rounded-md border border-neutral-700 bg-neutral-900/50 px-6 py-3 text-sm text-neutral-300 transition-colors hover:bg-neutral-900 active:bg-neutral-800 disabled:opacity-50 touch-manipulation min-h-[44px]"
          >
            {loading ? (t("loading") || "加载中...") : (t("loadMore") || "加载更多")}
          </button>
        </div>
      )}
    </div>
  );
}
