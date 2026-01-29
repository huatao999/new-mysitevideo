/**
 * VAST 广告工具函数
 * 用于处理 VAST XML 解析和广告播放逻辑
 */

export interface VastAd {
  position: "pre-roll" | "mid-roll" | "post-roll";
  vastUrl: string;
}

/**
 * 验证 VAST URL 格式
 */
export function isValidVastUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === "http:" || urlObj.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * 获取广告位置的中文名称（用于调试）
 */
export function getAdPositionLabel(position: "pre-roll" | "mid-roll" | "post-roll"): string {
  const labels: Record<"pre-roll" | "mid-roll" | "post-roll", string> = {
    "pre-roll": "前置广告",
    "mid-roll": "中置广告",
    "post-roll": "后置广告",
  };
  return labels[position];
}
