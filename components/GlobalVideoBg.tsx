'use client'

import { useEffect, useRef, useState } from 'react'

/** 全局视频背景 */
export function GlobalVideoBg() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [currentVideo, setCurrentVideo] = useState(0)

  // 按 3→2→1 顺序：bg3 → bg2 → bg1
  const videos = [
    '/videos/bg3.mp4',
    '/videos/bg2.mp4',
    '/videos/bg1.mp4',
  ]

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.play().catch(() => {})
  }, [currentVideo])

  const handleEnded = () => {
    setCurrentVideo((prev) => (prev + 1) % videos.length)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        overflow: 'hidden',
      }}
    >
      <video
        key={currentVideo}
        ref={videoRef}
        autoPlay
        muted
        loop={false}
        playsInline
        onEnded={handleEnded}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      >
        <source src={videos[currentVideo]} type="video/mp4" />
      </video>
      {/* 半透明白色遮罩，让内容可读 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(255, 245, 248, 0.85)',
        }}
      />
    </div>
  )
}
