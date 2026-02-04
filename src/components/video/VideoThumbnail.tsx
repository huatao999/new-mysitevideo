"use client";

import { useEffect, useRef, useState } from "react";

// 类型定义更规范：给可选属性明确标注，避免隐式any
type VideoThumbnailProps = {
  videoUrl?: string | null;
  coverUrl?: string | null;
  alt: string;
  className?: string;
};

// 组件导出：保持命名规范，和文件名一致
export default function VideoThumbnail({
  videoUrl,
  coverUrl,
  alt,
  className = "",
}: VideoThumbnailProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // 前置判断：过滤空值/无效值，避免后续无效执行
    const validCoverUrl = coverUrl?.trim();
    const validVideoUrl = videoUrl?.trim();

    // 有有效封面：直接结束，不执行后续视频逻辑
    if (validCoverUrl) {
      setIsLoading(false);
      setHasError(false);
      return;
    }

    // 无封面但有有效视频：执行视频缩略图生成逻辑
    if (validVideoUrl) {
      setThumbnailUrl(null);
      setIsLoading(true);
      setHasError(false);

      // 定时器：等待DOM渲染完成，避免获取不到ref
      const timer = setTimeout(() => {
        if (!videoRef.current || !canvasRef.current) {
          setHasError(true);
          setIsLoading(false);
          return;
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          console.error("Canvas 获取2D上下文失败");
          setHasError(true);
          setIsLoading(false);
          return;
        }

        let metadataLoaded = false;
        let seeked = false;

        // 加载视频元数据
        const handleLoadedMetadata = () => {
          if (metadataLoaded) return;
          metadataLoaded = true;
          try {
            video.currentTime = 0.1; // 取0.1秒帧，避免首帧黑屏
          } catch (e) {
            console.error("设置视频播放时间失败:", e);
            setHasError(true);
            setIsLoading(false);
          }
        };

        // 视频帧定位完成：绘制Canvas生成缩略图
        const handleSeeked = () => {
          if (seeked) return;
          seeked = true;
          try {
            const width = video.videoWidth || 320;
            const height = video.videoHeight || 180;

            if (width === 0 || height === 0) {
              console.error("视频尺寸无效");
              setHasError(true);
              setIsLoading(false);
              return;
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(video, 0, 0, width, height);
            // 生成Base64缩略图，压缩质量0.85平衡清晰度和体积
            const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
            setThumbnailUrl(dataUrl);
            setIsLoading(false);
          } catch (e) {
            console.error("生成视频缩略图失败:", e);
            setHasError(true);
            setIsLoading(false);
          }
        };

        // 视频加载错误处理
        const handleError = (e: Event) => {
          console.error("视频加载失败:", e);
          setHasError(true);
          setIsLoading(false);
        };

        // 绑定事件（once: true 确保只执行一次，避免内存泄漏）
        video.addEventListener("loadedmetadata", handleLoadedMetadata, { once: true });
        video.addEventListener("seeked", handleSeeked, { once: true });
        video.addEventListener("error", handleError, { once: true });

        // 手动触发视频加载（兼容部分浏览器预加载策略）
        if (video.readyState >= 1) {
          handleLoadedMetadata();
        } else {
          video.load();
        }
      }, 100);

      // 清除定时器：组件卸载/依赖更新时，避免内存泄漏
      return () => clearTimeout(timer);
    } else {
      // 无封面且无视频：直接置为非加载状态，显示兜底
      setIsLoading(false);
      setHasError(true);
    }
    // 依赖项：只监听有效URL，避免无效重渲染
  }, [coverUrl, videoUrl]);

  // 渲染逻辑1：优先显示封面（有效封面+未报错，或封面报错但无视频）
  const validCoverUrl = coverUrl?.trim();
  if (validCoverUrl && !(hasError && videoUrl?.trim())) {
    return (
      <div className={`relative overflow-hidden rounded-lg border border-neutral-700 bg-neutral-950 ${className}`}>
        <img
          src={validCoverUrl}
          alt={alt}
          className="h-full w-full object-cover"
          // 封面加载失败：如果有视频，标记错误，自动降级为视频生成缩略图
          onError={() => {
            console.error("封面图片加载失败:", validCoverUrl);
            if (videoUrl?.trim()) setHasError(true);
          }}
          // 封面加载成功：重置状态
          onLoad={() => {
            setIsLoading(false);
            setHasError(false);
          }}
          loading="lazy" // 懒加载：优化页面加载速度，首屏更流畅
        />
      </div>
    );
  }

  // 渲染逻辑2：显示Canvas生成的视频缩略图（带播放图标）
  if (thumbnailUrl && thumbnailUrl.startsWith("data:")) {
    return (
      <div className={`relative overflow-hidden rounded-lg border border-neutral-700 bg-neutral-950 ${className}`}>
        <img
          src={thumbnailUrl}
          alt={alt}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        {/* 播放图标覆盖层：鼠标悬浮时显隐，优化交互 */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-80 group-hover:opacity-100 pointer-events-none transition-opacity">
          <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    );
  }

  // 渲染逻辑3：视频加载中/缩略图生成中，显示视频容器+加载动画
  const validVideoUrl = videoUrl?.trim();
  if (validVideoUrl && !hasError) {
    return (
      <div className={`relative overflow-hidden rounded-lg border border-neutral-700 bg-neutral-950 ${className}`}>
        <video
          ref={videoRef}
          src={validVideoUrl}
          preload="metadata" // 仅预加载元数据，不加载完整视频，优化性能
          muted
          playsInline // 移动端内联播放，避免自动全屏
          crossOrigin="anonymous" // 解决Canvas跨域绘制问题
          className="h-full w-full object-cover"
          style={{ display: thumbnailUrl ? "none" : "block" }}
        />
        <canvas ref={canvasRef} style={{ display: "none" }} />
        {/* 加载动画：仅在加载中显示 */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          </div>
        )}
      </div>
    );
  }

  // 渲染逻辑4：兜底显示（无封面/无视频/全部加载失败）
  return (
    <div className={`flex items-center justify-center rounded-lg border border-neutral-700 bg-neutral-950 ${className}`}>
      <svg className="h-10 w-10 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    </div>
  );
}
