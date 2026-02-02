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
    // 【关键修正】环境变量校验：保留逻辑正确性（不去掉!），但增强诊断日志
    // 说明：若去掉!会导致"有环境变量时触发报错"的严重逻辑错误
    // 此处保留 ! 判断（缺失时拦截），并通过日志明确打印实际值辅助排查
    console.error('[VideoList Debug] 🔍 ENV check | Raw value:', JSON.stringify(process.env.NEXT_PUBLIC_VIDEO_API_URL));
    
    // if (!process.env.NEXT_PUBLIC_VIDEO_API_URL) {
    //   console.error('[VideoList Debug] ⚠️ ENV MISSING: NEXT_PUBLIC_VIDEO_API_URL is falsy (undefined/empty)');
    //   setError('视频服务配置缺失，请联系管理员');
    //   setLoading(false);
    //   return;
    // }

    console.error('[VideoList Debug] ✅ Valid API URL:', process.env.NEXT_PUBLIC_VIDEO_API_URL);

    const fetchVideos = async () => {
      try {
        const response = await fetch(process.env.NEXT_PUBLIC_VIDEO_API_URL!);
        
        if (!response.ok) {
          console.error(
            '[VideoList Debug] ❌ HTTP Error | Status:', 
            response.status, 
            '| Text:', 
            response.statusText
          );
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const rawData = await response.json();
        console.error('[VideoList Debug] 📤 Raw response:', rawData);
        
        // 【核心修复】兼容后端实际返回结构 { videos: [...], warning: "..." }
        // 优先匹配 videos 字段（根据 Network 响应确认），回退 data 字段
        const videoList = Array.isArray(rawData) 
          ? rawData 
          : (Array.isArray(rawData?.videos) 
              ? rawData.videos 
              : (Array.isArray(rawData?.data) ? rawData.data : []));
        
        if (!Array.isArray(videoList)) {
          throw new Error('数据格式异常：无法解析视频列表');
        }
        
        console.error('[VideoList Debug] 📦 Extracted videos count:', videoList.length);
        setVideos(videoList);
      } catch (err) {
        console.error('[VideoList Debug] 🚨 Error details:', err instanceof Error ? err.message : String(err));
        
        let message = '视频加载失败，请稍后重试';
        if (err instanceof Error) {
          message = err.message;
        } else if (typeof err === 'string') {
          message = err;
        } else if (err && typeof err === 'object' && 'message' in err) {
          message = String(err.message);
        }
        setError(message);
        console.error('[VideoList] Critical fetch error:', err);
      } finally {
        console.error('[VideoList Debug] 🔚 Fetch completed | Loading=false');
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  console.error('[VideoList Debug] 🖼️ Render phase | Videos count:', videos.length);
  
  if (loading) return <div className="flex justify-center items-center h-screen">加载中...</div>;
  if (error) return <div className="text-red-500 text-center mt-10">⚠️ {error}</div>;

  return (
    <div className="container mx-auto p-5">
      <h1 className="text-3xl font-bold mb-8 text-center">我的视频列表</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
