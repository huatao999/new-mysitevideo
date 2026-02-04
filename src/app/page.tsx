'use client';
import { useState, useEffect } from 'react';

// 定义视频类型接口，保留多语言封面、视频ID、标题，适配后台多语言上传逻辑
interface Video {
  id?: string | number;
  title: string;
  zhCover?: string; // 中文封面
  enCover?: string; // 英文封面
}

// 首页视频列表核心组件（和视频库页逻辑对齐，方便后续统一维护）
export default function Home() {
  // 视频列表、加载状态、错误状态管理
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // 接口地址：环境变量优先（线上部署用），兜底你的测试接口（本地/线上都能跑），保留硬编码注释方便后续调试
  const API_URL = process.env.NEXT_PUBLIC_VIDEO_API_URL || 'https://gentle-cell-74b9.ygy131419.workers.dev';

  // 初始化请求视频数据
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        // 跨域请求配置，和视频库页保持一致，避免跨域问题导致部署失败
        const response = await fetch(API_URL, {
          method: 'GET',
          mode: 'cors',
          headers: {
            'Accept': 'application/json',
          }
        });

        // 非200响应直接抛出错误，方便排查部署/接口问题
        if (!response.ok) {
          throw new Error(`接口请求失败: 状态码 ${response.status}`);
        }

        const rawData = await response.json();
        // 兼容后台多语言接口的多种数据结构（videos/data/直接数组），和你本地逻辑一致
        const videoList = Array.isArray(rawData) 
          ? rawData 
          : (rawData.videos || rawData.data || []);

        // 映射后台数据为前端统一格式，保留ID/标题/多语言封面，适配后续多语言筛选
        setVideos(videoList.map((item: any) => ({
          id: item.id || item._id, // 兼容MongoDB的_id和普通id，适配后台数据库
          title: item.title || '未命名视频', // 兜底标题，避免前端空值
          zhCover: item.zhCover,
          enCover: item.enCover
        })));
      } catch (err: any) {
        // 错误日志+前端提示，方便部署后排查问题
        console.error('首页视频加载失败:', err);
        setError(err.message || '视频列表加载失败，请稍后重试');
      } finally {
        // 无论成功/失败，结束加载状态
        setLoading(false);
      }
    };

    // 执行请求
    fetchVideos();
  }, [API_URL]); // 依赖API_URL，环境变量变化时重新请求

  // 加载中状态：简洁提示，和视频库页样式统一
  if (loading) return <div className="text-center p-10 text-xl">视频列表加载中...</div>;
  // 错误状态：红色提示，方便定位部署/接口问题
  if (error) return <div className="text-red-500 text-center p-10 text-xl">⚠️ {error}</div>;
  // 无视频时的兜底提示，避免前端空白
  if (videos.length === 0) return <div className="text-center p-10 text-xl">暂无视频资源</div>;

  // 核心渲染：视频列表网格布局，保留多语言封面优先级，适配移动端/PC端
  return (
    <div className="container mx-auto p-5">
      {/* 首页标题，预留广告接口位置（上下都有空位，后续直接加广告组件即可，不破坏现有布局） */}
      <h1 className="text-3xl font-bold mb-8 text-center">视频首页</h1>
      
      {/* 视频列表网格：移动端1列，PC端3列，和视频库页布局一致 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {videos.map((video) => (
          <div 
            key={video.id} // 用后台视频ID做key，比索引更稳定，适配后续视频点击/播放逻辑
            className="border rounded-lg p-4 shadow hover:shadow-md transition-shadow"
          >
            {/* 多语言封面优先级：先中文再英文，兜底占位图，避免图片加载失败 */}
            <img 
              src={video.zhCover || video.enCover || 'https://via.placeholder.com/300x200?text=VIDEO_COVER'} 
              alt={video.title} 
              className="w-full h-48 object-cover rounded-lg"
            />
            {/* 视频标题：截断处理，避免文字溢出，和视频库页样式统一 */}
            <h3 className="mt-3 font-semibold truncate text-lg">{video.title}</h3>
          </div>
        ))}
      </div>
    </div>
  );
}
