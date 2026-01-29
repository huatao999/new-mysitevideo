"use client";

import {useEffect, useRef, useState} from "react";
import videojs from "video.js";
import type Player from "video.js/dist/types/player";
import "video.js/dist/video-js.css";
import {createAdManager} from "@/lib/ads/manager";
import type {AdConfig} from "@/lib/ads/config";

export type VideoPlayerProps = {
  src: string;
  poster?: string;
  /**
   * 预留 VAST Tag URL（ExoClick / Adsterra）。
   * 如果提供，会覆盖环境变量中的配置。
   * 如果为 null，则使用环境变量中的配置。
   */
  vastTagUrl?: string | null;
  /**
   * 是否启用广告（默认从环境变量读取）
   */
  enableAds?: boolean;
};

// Playback speed options
const PLAYBACK_SPEEDS = [
  {value: 1, label: "Normal"},
  {value: 1.25, label: "1.25x"},
  {value: 1.5, label: "1.5x"},
  {value: 2, label: "2x"},
];

export default function VideoPlayer({src, poster, vastTagUrl, enableAds}: VideoPlayerProps) {
  const playerRef = useRef<Player | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const playerIdRef = useRef(`video-player-${Math.random().toString(36).substring(2, 9)}`);
  const adManagerRef = useRef<ReturnType<typeof createAdManager> | null>(null);
  const [adConfig, setAdConfig] = useState<AdConfig | null>(null);

  // 从 API 获取广告配置（客户端组件无法直接访问服务端环境变量）
  useEffect(() => {
    // 如果明确禁用广告，不获取配置
    if (enableAds === false) {
      setAdConfig(null);
      adManagerRef.current = null;
      return;
    }

    async function fetchAdConfig() {
      try {
        // 如果有自定义 vastTagUrl，直接使用它
        if (vastTagUrl) {
          setAdConfig({
            preRoll: vastTagUrl,
            midRoll: null,
            postRoll: null,
          });
          return;
        }

        // 否则从 API 获取环境变量中的配置
        const configRes = await fetch("/api/ads/config");
        if (configRes.ok) {
          const configData = await configRes.json();
          if (configData.enabled) {
            // 获取实际的 VAST URL
            const positions: Array<"pre-roll" | "mid-roll" | "post-roll"> = ["pre-roll", "mid-roll", "post-roll"];
            const adConfig: AdConfig = {};

            for (const pos of positions) {
              // 将位置名称转换为 API 返回的格式
              const positionKey = pos === "pre-roll" ? "preRoll" : pos === "mid-roll" ? "midRoll" : "postRoll";
              if (configData.positions[positionKey]) {
                try {
                  const vastRes = await fetch(`/api/ads/vast?position=${pos}`);
                  if (vastRes.ok) {
                    const vastData = await vastRes.json();
                    if (vastData.vastUrl) {
                      adConfig[positionKey] = vastData.vastUrl;
                    }
                  }
                } catch (e) {
                  // eslint-disable-next-line no-console
                  console.error(`[VideoPlayer] Failed to fetch ${pos} VAST URL:`, e);
                }
              }
            }

            // 如果至少有一个位置配置了，设置广告配置
            if (adConfig.preRoll || adConfig.midRoll || adConfig.postRoll) {
              setAdConfig(adConfig);
            } else {
              setAdConfig(null);
            }
          } else {
            setAdConfig(null);
          }
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[VideoPlayer] Failed to fetch ad config:", e);
        setAdConfig(null);
      }
    }

    fetchAdConfig();
  }, [enableAds, vastTagUrl]);

  // 初始化广告管理器
  useEffect(() => {
    if (adConfig) {
      adManagerRef.current = createAdManager(
        adConfig,
        () => {
          // 广告开始播放
          if (playerRef.current) {
            playerRef.current.pause();
          }
        },
        () => {
          // 广告结束播放
          // 继续播放视频（如果需要）
        },
      );
    } else {
      adManagerRef.current = null;
    }
  }, [adConfig]);

  useEffect(() => {
    if (!src) return;

    // Initialize player if not exists
    if (!playerRef.current && videoElRef.current) {
      // Wait for next tick to ensure DOM is ready
      const initTimer = setTimeout(() => {
        if (!videoElRef.current || playerRef.current) return;

        // Verify element is in DOM
        if (!videoElRef.current.isConnected) {
          // eslint-disable-next-line no-console
          console.warn("[VideoPlayer] Element not connected to DOM");
          return;
        }

        try {
          const player = (playerRef.current = videojs(videoElRef.current, {
            controls: true,
            preload: "metadata", // 移动端使用 metadata 以减少数据消耗
            fluid: true,
            autoplay: false,
            muted: false,
            playsinline: true,
            poster,
            sources: [{src, type: "video/mp4"}],
            playbackRates: PLAYBACK_SPEEDS.map((s) => s.value),
            // 移动端优化
            responsive: true,
            // 触摸优化
            touch: true,
            // 移动端使用原生控件（如果支持）
            nativeControlsForTouch: false,
          }));

          // 设置广告相关事件监听
          if (adManagerRef.current) {
            // 播放前检查前置广告
            player.one("play", async () => {
              if (adManagerRef.current?.hasPreRoll()) {
                await adManagerRef.current.playPreRoll();
              }
            });

            // 视频播放到中间时检查中置广告（50% 位置）
            player.on("timeupdate", async () => {
              const currentTime = player.currentTime();
              const duration = player.duration();
              if (duration && duration > 0 && currentTime && currentTime >= duration * 0.5 && adManagerRef.current?.hasMidRoll()) {
                // 只播放一次中置广告
                const midRollPlayed = (player as any).__midRollPlayed;
                if (!midRollPlayed) {
                  (player as any).__midRollPlayed = true;
                  await adManagerRef.current.playMidRoll();
                }
              }
            });

            // 视频播放结束时检查后置广告
            player.on("ended", async () => {
              if (adManagerRef.current?.hasPostRoll()) {
                await adManagerRef.current.playPostRoll();
              }
            });
          }

          // 如果提供了自定义 vastTagUrl，记录日志
          if (vastTagUrl) {
            // eslint-disable-next-line no-console
            console.info("[Ads] Custom VAST tag URL provided:", vastTagUrl);
            // 注意：如果提供了自定义 vastTagUrl，可以在这里实现自定义广告逻辑
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error("[VideoPlayer] Initialization error:", e);
        }
      }, 0);

      return () => {
        clearTimeout(initTimer);
      };
    } else if (playerRef.current) {
      // Update src when it changes
      const player = playerRef.current;
      try {
        const currentSrc = player.currentSrc();
        if (currentSrc !== src) {
          player.src({src, type: "video/mp4"});
          if (poster !== undefined) {
            player.poster(poster || "");
          }
          player.load();
          // 重置中置广告标记
          (player as any).__midRollPlayed = false;
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[VideoPlayer] Update error:", e);
      }
    }
  }, [poster, src, vastTagUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.dispose();
        } catch (e) {
          // Ignore dispose errors
        } finally {
          playerRef.current = null;
        }
      }
    };
  }, []);

  return (
    <div className="w-full overflow-hidden rounded-lg bg-black touch-manipulation">
      <video
        id={playerIdRef.current}
        ref={videoElRef}
        className="video-js vjs-big-play-centered"
        playsInline
        data-setup="{}"
      />
    </div>
  );
}

