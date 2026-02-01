'use client';
import { useState, useEffect } from 'react';

export default function VideoList() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await fetch(process.env.NEXT_PUBLIC_VIDEO_API_URL);
        if (!response.ok) throw new Error('Failed to fetch videos');
        const data = await response.json();
        setVideos(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos()
  }, []);

  if (loading) return <div className="flex justify-center items-center h-screen">加载中...</div>;
  if (error) return <div className="text-red-500 text-center mt-10">{error}</div>;

  return (
    <div className="container mx-auto p-5">
      <h1 className="text-3xl font-bold mb-8 text-center">我的视频列表</h1>
      <div className="grid grid-cols-1 md:cols-2 lg:cols-3 gap-6">
        {videos.map((video, index) => (
          <div key={index} className="border rounded-lg p-4 shadow hover:shadow-lg transition">
            <img 
              src={video.zhCover || video.enCover} 
              alt={video.title} 
              className="w-full h-48 object-cover rounded mb-3"
            />
            <h3 className="text-xl font-semibold">{video.title}</h3>
          </div>
        ))}
      </div>
    </div>
  );
}
