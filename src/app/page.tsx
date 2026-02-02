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

  // 优先级：环境变量 > 硬编码兜底 (方便调试)
  const API_URL = process.env.NEXT_PUBLIC_VIDEO_API_URL || '';
  console.log('API_URL:', API_URL);
  // const API_URL = process.env.NEXT_PUBLIC_VIDEO_API_URL || 'https://gentle-cell-74b9.ygy131419.workers.dev';

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        // 添加 mode: 'cors' 显式声明
        const response = await fetch(API_URL, {
          method: 'GET',
          mode: 'cors',
          headers: {
            'Accept': 'application/json',
          }
        });

        if (!response.ok) {
          throw new Error(`服务器响应异常: ${response.status}`);
        }

        const rawData = await response.json();
        
        // 兼容多种数据结构
        const videoList = Array.isArray(rawData) 
          ? rawData 
          : (rawData.videos || rawData.data || []);

        // 核心修改：映射测试接口数据为前端Video格式，保留id、补全占位符
        setVideos(videoList.map(item => ({
          id: item.id, // 保留测试接口的id，让列表key更规范
          title: item.title,
          zhCover: '',
          enCover: ''
        })));
      } catch (err: any) {
        console.error('Fetch Error:', err);
        setError(err.message || '视频加载失败，请检查网络或跨域设置');
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [API_URL]);

  if (loading) return <div className="text-center p-10">加载中...</div>;
  if (error) return <div className="text-red-500 text-center p-10">⚠️ {error}</div>;

  return (
    <div className="container mx-auto p-5">
      <h1 className="text-3xl font-bold mb-8 text-center">视频列表</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {videos.map((video, idx) => (
          <div key={video.id || idx} className="border rounded-lg p-4 shadow">
            <img 
              // 补全占位符地址，避免图片加载失败，适配48px高度
              src={video.zhCover || video.enCover || 'https://via.placeholder.com/300x200'} 
              alt={video.title} 
              className="w-full h-48 object-cover rounded"
            />
            <h3 className="mt-2 font-bold truncate">{video.title}</h3>
          </div>
        ))}
      </div>
    </div>
  );
}
