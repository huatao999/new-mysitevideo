// 最顶部必须加，客户端组件标识
'use client'
import { useState, useEffect } from 'react'

// 定义视频数据的类型（TS语法，JS可删除这行）
type Video = {
  title: string;
  url: string;
  zhCover: string;
  enCover: string;
  fallbackZhCover: string;
  fallbackEnCover: string;
}

const VideosClient = () => {
  // 状态定义：初始值空数组，指定类型
  const [videos, setVideos] = useState<Video[]>([])

  // 加载视频数据的函数
  const loadVideos = async () => {
    try {
      const res = await fetch('https://gentle-cell-74b9.ygy131419.workers.dev/')
      if (!res.ok) throw new Error(`HTTP错误：${res.status}`)
      const videoList = await res.json()
      // 确保是数组再更新状态
      if (Array.isArray(videoList)) {
        setVideos(videoList)
        console.log('✅ 数据更新成功：', videoList)
      } else {
        throw new Error('返回数据不是数组')
      }
    } catch (err) {
      console.error('❌ 加载视频失败：', err)
    }
  }

  // 组件挂载后执行请求
  useEffect(() => {
    loadVideos()
    console.log('🔄 useEffect执行，调用loadVideos')
  }, [])

  // 渲染
  return (
    <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>视频列表</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '24px' }}>
        {videos.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', fontSize: '18px', color: '#666' }}>
            加载中...暂无视频数据
          </div>
        )}

        {videos?.map((item) => (
          <div
            key={item.title}
            style={{
              border: '1px solid #eee',
              borderRadius: '12px',
              overflow: 'hidden',
              transition: 'transform 0.2s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <img
              src={item.zhCover}
              alt={item.title}
              onError={(e: React.SyntheticEvent<HTMLImageElement>) => {(e.target as HTMLImageElement).src = item.fallbackZhCover}}
              style={{ width: '100%', height: '120px', objectFit: 'cover' }}
            />
            <div style={{ padding: '12px' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '500' }}>{item.title}</h3>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  padding: '6px 12px',
                  backgroundColor: '#165DFF',
                  color: 'white',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '14px'
                }}
              >
                立即播放
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default VideosClient
