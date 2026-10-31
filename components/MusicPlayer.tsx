'use client'

import { useState, useRef, useEffect } from 'react'

const PLAYLIST = [
  { title: '无间渡', url: '/music/1.mp3' },
  { title: '你要的全拿走', url: '/music/2.mp3' },
  { title: '忘不掉的你', url: '/music/3.mp3' },
  { title: '把回忆拼好给你', url: '/music/4.mp3' },
]

/* ── 图标（SVG，跟随 currentColor）── */
const IconPrev = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M7 6h2.2v12H7zM19 6l-9.5 6L19 18z" />
  </svg>
)
const IconNext = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M14.8 6H17v12h-2.2zM5 6l9.5 6L5 18z" />
  </svg>
)
const IconPlay = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M8 5.5v13l11-6.5z" />
  </svg>
)
const IconPause = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M7 5h3.4v14H7zM13.6 5H17v14h-3.4z" />
  </svg>
)
const IconList = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2.4" strokeLinecap="round" aria-hidden>
    <path d="M4 6.5h16M4 12h16M4 17.5h16" />
  </svg>
)

/* ── 通用小圆钮（白底粉图标，同截图中样式）── */
function CircleButton({
  onClick, label, children, size = 44,
}: {
  onClick: () => void
  label: string
  children: React.ReactNode
  size?: number
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="mp-circle-btn"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: '#ffffff',
        border: 'none',
        color: '#ec4899',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 4px 16px rgba(236,72,153,0.28)',
        transition: 'transform .18s ease, box-shadow .18s ease',
      }}
    >
      {children}
    </button>
  )
}

export function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const trackRef = useRef(0)
  const isPlayingRef = useRef(false)
  const [currentTrack, setCurrentTrack] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showPlaylist, setShowPlaylist] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateProgress = () => {
      setProgress(audio.currentTime)
      setDuration(audio.duration || 0)
    }
    // 播完自动下一曲（读取 ref，避免闭包拿到过期索引）
    const onEnded = () => {
      const next = (trackRef.current + 1) % PLAYLIST.length
      loadTrack(next, true)
    }

    audio.addEventListener('timeupdate', updateProgress)
    audio.addEventListener('loadedmetadata', updateProgress)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('timeupdate', updateProgress)
      audio.removeEventListener('loadedmetadata', updateProgress)
      audio.removeEventListener('ended', onEnded)
    }
  }, [])

  const loadTrack = (index: number, autoplay = isPlayingRef.current) => {
    trackRef.current = index
    setCurrentTrack(index)
    setProgress(0)
    const audio = audioRef.current
    if (audio) {
      audio.load()
      if (autoplay) audio.play().catch(() => {})
    }
  }

  const playNext = () => loadTrack((trackRef.current + 1) % PLAYLIST.length)
  const playPrev = () => loadTrack((trackRef.current - 1 + PLAYLIST.length) % PLAYLIST.length)

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
    } else {
      audio.play().catch(() => {})
    }
    isPlayingRef.current = !isPlaying
    setIsPlaying(!isPlaying)
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    audio.currentTime = percent * duration
    setProgress(audio.currentTime)
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 9999,
      fontFamily: "'Noto Sans SC', sans-serif",
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: '10px',
    }}>
      {/* 歌单弹窗 */}
      {showPlaylist && (
        <div style={{
          width: '260px',
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(12px)',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(236,72,153,0.25)',
          padding: '14px',
        }}>
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px', color: '#e14b7e' }}>
            🎵 我的歌单
          </div>
          {PLAYLIST.map((track, i) => (
            <div
              key={i}
              onClick={() => { loadTrack(i); setShowPlaylist(false) }}
              style={{
                padding: '8px 10px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                color: i === currentTrack ? '#e14b7e' : '#333',
                background: i === currentTrack ? '#fff0f5' : 'transparent',
                fontWeight: i === currentTrack ? 600 : 400,
              }}
            >
              {i + 1}. {track.title}
            </div>
          ))}
        </div>
      )}

      {/* 当前歌曲名 */}
      <div style={{
        fontSize: '11px',
        color: '#e14b7e',
        background: 'rgba(255,255,255,0.92)',
        padding: '3px 10px',
        borderRadius: '10px',
        whiteSpace: 'nowrap',
        boxShadow: '0 2px 10px rgba(236,72,153,0.18)',
      }}>
        {PLAYLIST[currentTrack].title} · {formatTime(progress)}
      </div>

      {/* 进度条（与按钮排等宽） */}
      <div
        onClick={handleProgressClick}
        title="播放进度"
        style={{
          width: '212px',
          height: '4px',
          background: 'rgba(236,72,153,0.18)',
          borderRadius: '2px',
          overflow: 'hidden',
          cursor: 'pointer',
        }}
      >
        <div style={{
          width: `${duration ? (progress / duration) * 100 : 0}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #ff6b9d, #e14b7e)',
          transition: 'width 0.1s linear',
        }} />
      </div>

      {/* 控制排：⏮ ▶ ⏭ ☰（同截图布局） */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
      }}>
        <CircleButton onClick={playPrev} label="上一曲">
          <IconPrev />
        </CircleButton>

        {/* 主播放键：粉色大圆 */}
        <button
          onClick={togglePlay}
          aria-label={isPlaying ? '暂停' : '播放'}
          title={isPlaying ? '暂停' : '播放'}
          className="mp-circle-btn"
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #ff6b9d, #e14b7e)',
            border: 'none',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 6px 22px rgba(236,72,153,0.45)',
            transition: 'transform .18s ease, box-shadow .18s ease',
          }}
        >
          {isPlaying ? <IconPause /> : <IconPlay />}
        </button>

        <CircleButton onClick={playNext} label="下一曲">
          <IconNext />
        </CircleButton>

        <CircleButton onClick={() => setShowPlaylist(!showPlaylist)} label="歌单">
          <IconList />
        </CircleButton>
      </div>

      {/* 悬停上浮（样式类统一放这里，避免内联 hover 写不了） */}
      <style>{`
        .mp-circle-btn:hover { transform: translateY(-2px); }
        .mp-circle-btn:active { transform: translateY(0) scale(.96); }
      `}</style>

      <audio ref={audioRef} src={PLAYLIST[currentTrack].url} preload="metadata" />
    </div>
  )
}
