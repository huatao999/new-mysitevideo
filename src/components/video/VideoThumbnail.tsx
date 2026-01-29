"use client";

import {useEffect, useRef, useState} from "react";

type VideoThumbnailProps = {
  videoUrl?: string;
  coverUrl?: string;
  alt: string;
  className?: string;
};

export default function VideoThumbnail({videoUrl, coverUrl, alt, className = ""}: VideoThumbnailProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // 如果有封面 URL，不需要处理视频
    if (coverUrl) {
      setIsLoading(false);
      setHasError(false);
      return;
    }

    // 如果没有封面但有视频 URL，从视频生成缩略图
    if (videoUrl) {
      // 重置状态
      setThumbnailUrl(null);
      setIsLoading(true);
      setHasError(false);

      // 等待 DOM 元素准备好
      const timer = setTimeout(() => {
        if (videoRef.current && canvasRef.current) {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            setHasError(true);
            setIsLoading(false);
            return;
          }

          let metadataLoaded = false;
          let seeked = false;

          const handleLoadedMetadata = () => {
            if (metadataLoaded) return;
            metadataLoaded = true;
            try {
              // 设置视频时间为第一帧（0.1秒确保能获取到有效帧）
              video.currentTime = 0.1;
            } catch (e) {
              // eslint-disable-next-line no-console
              console.error("Failed to set video time:", e);
              setHasError(true);
              setIsLoading(false);
            }
          };

          const handleSeeked = () => {
            if (seeked) return;
            seeked = true;
            try {
              // 确保视频尺寸有效
              const width = video.videoWidth || 320;
              const height = video.videoHeight || 180;
              
              if (width === 0 || height === 0) {
                setHasError(true);
                setIsLoading(false);
                return;
              }

              // 将视频帧绘制到 canvas
              canvas.width = width;
              canvas.height = height;
              ctx.drawImage(video, 0, 0, width, height);
              
              // 将 canvas 转换为图片 URL
              const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
              setThumbnailUrl(dataUrl);
              setIsLoading(false);
            } catch (e) {
              // eslint-disable-next-line no-console
              console.error("Failed to generate thumbnail:", e);
              setHasError(true);
              setIsLoading(false);
            }
          };

          const handleError = (e: Event) => {
            // eslint-disable-next-line no-console
            console.error("Video load error:", e);
            setHasError(true);
            setIsLoading(false);
          };

          // 绑定事件监听器
          video.addEventListener("loadedmetadata", handleLoadedMetadata, {once: true});
          video.addEventListener("seeked", handleSeeked, {once: true});
          video.addEventListener("error", handleError, {once: true});

          // 如果视频已经加载了元数据，直接处理
          if (video.readyState >= 1) {
            handleLoadedMetadata();
          } else {
            // 加载视频元数据
            video.load();
          }
        } else {
          setHasError(true);
          setIsLoading(false);
        }
      }, 100);

      return () => {
        clearTimeout(timer);
      };
    } else {
      // 既没有封面也没有视频 URL
      setIsLoading(false);
      setHasError(false);
    }
  }, [videoUrl, coverUrl]);

  // 如果有封面 URL，直接显示图片（除非加载失败且有视频 URL）
  if (coverUrl && !(hasError && videoUrl)) {
    return (
      <div className={`relative overflow-hidden rounded-lg border border-neutral-700 bg-neutral-950 ${className}`}>
        <img
          src={coverUrl}
          alt={alt}
          className="h-full w-full object-cover"
          onError={() => {
            // eslint-disable-next-line no-console
            console.error("Cover image load error:", coverUrl);
            // 如果封面加载失败且有视频 URL，标记错误以便使用视频生成缩略图
            if (videoUrl) {
              setHasError(true);
            }
          }}
          onLoad={() => {
            setIsLoading(false);
            setHasError(false);
          }}
        />
      </div>
    );
  }

  // 如果有生成的缩略图，显示缩略图
  if (thumbnailUrl && thumbnailUrl.startsWith("data:")) {
    return (
      <div className={`relative overflow-hidden rounded-lg border border-neutral-700 bg-neutral-950 ${className}`}>
        <img
          src={thumbnailUrl}
          alt={alt}
          className="h-full w-full object-cover"
        />
        {/* 播放图标覆盖层 */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
          <svg className="h-6 w-6 text-white/80" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    );
  }

  // 如果有视频 URL 但正在加载或未生成缩略图，显示视频元素
  if (videoUrl && !hasError) {
    return (
      <div className={`relative overflow-hidden rounded-lg border border-neutral-700 bg-neutral-950 ${className}`}>
        <video
          ref={videoRef}
          src={videoUrl}
          preload="metadata"
          muted
          playsInline
          crossOrigin="anonymous"
          className="h-full w-full object-cover"
          style={{display: thumbnailUrl ? "none" : "block"}}
        />
        <canvas ref={canvasRef} style={{display: "none"}} />
        {/* 加载指示器 */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white/80" />
          </div>
        )}
      </div>
    );
  }

  // 默认占位图标
  return (
    <div className={`flex items-center justify-center rounded-lg border border-neutral-700 bg-neutral-950 ${className}`}>
      <svg className="h-8 w-8 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    </div>
  );
}
