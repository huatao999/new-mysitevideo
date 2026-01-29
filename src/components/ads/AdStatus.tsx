"use client";

import {useEffect, useState} from "react";

interface AdConfigResponse {
  enabled: boolean;
  positions: {
    preRoll: boolean;
    midRoll: boolean;
    postRoll: boolean;
  };
}

/**
 * 广告状态显示组件（用于调试和测试）
 * 显示当前广告配置状态
 */
export default function AdStatus() {
  const [config, setConfig] = useState<AdConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAdConfig() {
      try {
        const res = await fetch("/api/ads/config");
        if (res.ok) {
          const data = (await res.json()) as AdConfigResponse;
          setConfig(data);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[AdStatus] Failed to fetch ad config:", e);
      } finally {
        setLoading(false);
      }
    }

    fetchAdConfig();
  }, []);

  if (loading) {
    return null;
  }

  if (!config || !config.enabled) {
    return (
      <div className="rounded-md border border-neutral-800 bg-neutral-900/30 px-3 py-2 text-xs text-neutral-400">
        <span className="font-semibold">广告状态：</span>
        <span className="text-yellow-400">未配置</span>
        <span className="ml-2 text-neutral-500">
          （申请到 ExoClick/Adsterra 接口后，在环境变量中配置 VAST URL 即可启用）
        </span>
      </div>
    );
  }

  const positions = [];
  if (config.positions.preRoll) positions.push("前置");
  if (config.positions.midRoll) positions.push("中置");
  if (config.positions.postRoll) positions.push("后置");

  return (
    <div className="rounded-md border border-green-800 bg-green-900/20 px-3 py-2 text-xs">
      <span className="font-semibold text-green-300">广告状态：</span>
      <span className="text-green-400">已启用</span>
      {positions.length > 0 && (
        <span className="ml-2 text-neutral-300">
          （{positions.join("、")}广告已配置）
        </span>
      )}
    </div>
  );
}
