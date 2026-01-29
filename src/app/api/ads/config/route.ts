import {getAdConfig, hasAds} from "@/lib/ads/config";

/**
 * 获取广告配置 API
 * 返回当前启用的广告配置
 * 注意：出于安全考虑，不返回实际的 VAST URL，只返回配置状态
 * 实际的 VAST URL 在服务端环境变量中，由 VideoPlayer 通过服务端逻辑获取
 */
export async function GET() {
  try {
    const config = getAdConfig();
    const adsEnabled = hasAds();

    return Response.json({
      enabled: adsEnabled,
      positions: {
        preRoll: !!config?.preRoll,
        midRoll: !!config?.midRoll,
        postRoll: !!config?.postRoll,
      },
      // 不返回实际的 URL，由服务端处理
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    // eslint-disable-next-line no-console
    console.error("[ads/config] failed:", e);
    return Response.json({error: "Get ad config failed", message}, {status: 500});
  }
}
