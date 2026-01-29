import {env} from "@/lib/env";

export type AdPosition = "pre-roll" | "mid-roll" | "post-roll";
export type AdProvider = "exoclick" | "adsterra";

export interface AdConfig {
  preRoll?: string | null;
  midRoll?: string | null;
  postRoll?: string | null;
}

/**
 * 获取广告配置
 * 根据环境变量中的 AD_PROVIDER 和 ADS_ENABLED 返回对应的 VAST URL
 */
export function getAdConfig(): AdConfig | null {
  // 如果广告未启用，返回 null
  if (!env.ADS_ENABLED) {
    return null;
  }

  const provider = env.AD_PROVIDER || "none";
  if (provider === "none") {
    return null;
  }

  const config: AdConfig = {};

  // ExoClick 配置
  if (provider === "exoclick" || provider === "both") {
    config.preRoll = env.VAST_EXOCLICK_PRE_ROLL || null;
    config.midRoll = env.VAST_EXOCLICK_MID_ROLL || null;
    config.postRoll = env.VAST_EXOCLICK_POST_ROLL || null;
  }

  // Adsterra 配置
  if (provider === "adsterra" || provider === "both") {
    // 如果使用 both，优先使用 ExoClick，如果 ExoClick 没有则使用 Adsterra
    if (provider === "both") {
      config.preRoll = config.preRoll || env.VAST_ADSTERRA_PRE_ROLL || null;
      config.midRoll = config.midRoll || env.VAST_ADSTERRA_MID_ROLL || null;
      config.postRoll = config.postRoll || env.VAST_ADSTERRA_POST_ROLL || null;
    } else {
      config.preRoll = env.VAST_ADSTERRA_PRE_ROLL || null;
      config.midRoll = env.VAST_ADSTERRA_MID_ROLL || null;
      config.postRoll = env.VAST_ADSTERRA_POST_ROLL || null;
    }
  }

  // 如果所有位置都没有配置，返回 null
  if (!config.preRoll && !config.midRoll && !config.postRoll) {
    return null;
  }

  return config;
}

/**
 * 检查是否有可用的广告
 */
export function hasAds(): boolean {
  const config = getAdConfig();
  return config !== null && (!!config.preRoll || !!config.midRoll || !!config.postRoll);
}
