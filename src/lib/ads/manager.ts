/**
 * VAST 广告管理器
 * 预留接口：当申请到 ExoClick/Adsterra 的 VAST URL 后，填入环境变量即可自动启用
 */

import type {AdConfig} from "./config";

export interface AdManager {
  playPreRoll: () => Promise<void>;
  playMidRoll: () => Promise<void>;
  playPostRoll: () => Promise<void>;
  hasPreRoll: () => boolean;
  hasMidRoll: () => boolean;
  hasPostRoll: () => boolean;
}

/**
 * 创建广告管理器
 * @param config 广告配置（从 getAdConfig() 获取）
 * @param onAdStart 广告开始播放回调
 * @param onAdEnd 广告结束播放回调
 */
export function createAdManager(
  config: AdConfig | null,
  onAdStart?: () => void,
  onAdEnd?: () => void,
): AdManager | null {
  if (!config) {
    return null;
  }

  /**
   * 加载并播放 VAST 广告
   */
  async function playVastAd(vastUrl: string | null | undefined, position: string): Promise<void> {
    if (!vastUrl) {
      return;
    }

    try {
      onAdStart?.();
      // eslint-disable-next-line no-console
      console.info(`[Ads] Loading ${position} ad from:`, vastUrl);

      // TODO: 当申请到广告接口后，这里会集成实际的 VAST 解析和播放逻辑
      // 目前只是预留接口，记录日志
      // 后续可以集成 videojs-contrib-ads 或 IMA SDK
      //
      // 实现步骤（申请到接口后）：
      // 1. 使用 fetch 获取 VAST XML: const response = await fetch(vastUrl);
      // 2. 解析 VAST XML 获取广告视频 URL 和时长
      // 3. 在 Video.js 播放器中播放广告视频（暂停主视频）
      // 4. 监听广告播放完成事件
      // 5. 广告播放完成后调用 onAdEnd()，恢复主视频播放

      // eslint-disable-next-line no-console
      console.info(`[Ads] ${position} ad ready (VAST URL configured: ${vastUrl})`);
      // eslint-disable-next-line no-console
      console.info(`[Ads] Note: Actual ad playback will be implemented after obtaining ad API credentials`);

      // 模拟广告时长（实际会从 VAST XML 中获取）
      await new Promise((resolve) => setTimeout(resolve, 100));

      onAdEnd?.();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`[Ads] Failed to play ${position} ad:`, error);
      onAdEnd?.();
    }
  }

  return {
    playPreRoll: () => playVastAd(config.preRoll, "pre-roll"),
    playMidRoll: () => playVastAd(config.midRoll, "mid-roll"),
    playPostRoll: () => playVastAd(config.postRoll, "post-roll"),
    hasPreRoll: () => !!config.preRoll,
    hasMidRoll: () => !!config.midRoll,
    hasPostRoll: () => !!config.postRoll,
  };
}
