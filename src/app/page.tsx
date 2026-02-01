'use client';
import { useState, useEffect } from 'react';

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
    if (!process.env.NEXT_PUBLIC_VIDEO_API_URL) {
      setError('视频服务配置缺失，请联系管理员');
      setLoading(false);
      return;
    }

    const fetchVideos = async () => {
      try {
        const response = await fetch(process.env.NEXT_PUBLIC_VIDEO_API_URL!);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const rawData = await response.json();
        // 【关键修复1】安全提取视频数组：兼容 {data: [...]} 或纯数组结构
        const videoList = Array.isArray(rawData) 
          ? rawData 
          : (Array.isArray(rawData?.data) ? rawData.data : []);
        
        // 验证提取结果是否为有效数组
        if (!Array.isArray(videoList)) {
          throw new Error('数据格式异常：无法解析视频列表');
        }
        
        setVideos(videoList);
      } catch (err) {
        let message = '视频加载失败，请稍后重试';
        if (err instanceof Error) {
          message = err.message;
        } else if (typeof err === 'string') {
          message = err;
        } else if (err && typeof err === 'object' && 'message' in err) {
          message = String(err.message);
        }
        setError(message);
        console.error('[VideoList] Fetch error:', err);
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 【关键修复2】空状态友好提示 + 安全渲染保障 */}
        {videos.length === 0 ? (
          <div className="text-center col-span-full py-12 text-gray-500">
            暂无视频数据
          </div>
        ) : (
          videos.map((video, index) => (
            <div 
              key={video.id ?? index} 
              className="border rounded-lg p-4 shadow hover:shadow-lg transition"
            >
              <img 
                src={video.zhCover || video.enCover || '/placeholder.jpg'} 
                alt={video.title || '无标题视频'} 
                className="w-full h-48 object-cover rounded mb-3"
              />
              <h3 className="text-xl font-semibold truncate">{video.title}</h3>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
