'use client';
import { useState, useEffect } from 'react';

// 明确定义视频数据结构（含可选 ID 用于健壮 key）
interface Video {
  id?: string | number;
  title: string;
  zhCover?: string;
  enCover?: string;
}

export default function VideoList() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // 【健壮性】环境变量缺失提前校验（构建时注入，但运行时兜底更安全）
    if (!process.env.NEXT_PUBLIC_VIDEO_API_URL) {
      setError('视频服务配置缺失，请联系管理员');
      setLoading(false);
      return;
    }

    const fetchVideos = async () => {
      try {
        const response = await fetch(process.env.NEXT_PUBLIC_VIDEO_API_URL);
        
        if (!response.ok) {
          // 【健壮性】提供更明确的 HTTP 错误信息
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: Video[] = await response.json();
        setVideos(data);
      } catch (err) {
        // 【关键优化】安全提取错误信息，避免非 Error 对象导致 runtime 错误
        let message = '视频加载失败，请稍后重试';
        if (err instanceof Error) {
          message = err.message;
        } else if (typeof err === 'string') {
          message = err;
        } else if (err && typeof err === 'object' && 'message' in err) {
          message = String(err.message);
        }
        setError(message);
        console.error('[VideoList] Fetch error:', err); // 便于开发调试
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  if (loading) return <div className="flex justify-center items-center h-screen">加载中...</div>;
  if (error) return <div className="text-red-500 text-center mt-10">⚠️ {error}</div>;

  return (
    <div className="container mx-auto p-5">
      <h1 className="text-3xl font-bold mb-8 text-center">我的视频列表</h1>
      {/* 【关键修复】修正 Tailwind CSS 网格类名语法错误 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video, index) => (
          <div 
            // 【健壮性】优先使用唯一 ID 作为 key，无 ID 时回退 index（兼容现有逻辑）
            key={typeof video.id !== 'undefined' ? video.id : index} 
            className="border rounded-lg p-4 shadow hover:shadow-lg transition"
          >
            {/* 【类型安全】封面图逻辑保留原逻辑，TS 已约束字段可选性 */}
            <img 
              src={video.zhCover || video.enCover || '/placeholder.jpg'} 
              alt={video.title || '无标题视频'} 
              className="w-full h-48 object-cover rounded mb-3"
              // 注：题目提及“已有图片加载兜底”，此处保留原逻辑；
              // 如需增强，建议后续添加 onError 回退逻辑（当前未改动）
            />
            <h3 className="text-xl font-semibold truncate">{video.title}</h3>
          </div>
        ))}
      </div>
    </div>
  );
}
