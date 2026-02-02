'use client';
export default function VideoList() {
  const videos = [{id:1,title:'测试视频1'},{id:2,title:'测试视频2'}];
  return (
    <div className="container mx-auto p-5">
      <h1 className="text-3xl font-bold mb-8 text-center">视频列表</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {videos.map((video) => (
          <div key={video.id} className="border rounded-lg p-4 shadow">
            <h3 className="mt-2 font-bold truncate">{video.title}</h3>
          </div>
        ))}
      </div>
    </div>
  );
}
