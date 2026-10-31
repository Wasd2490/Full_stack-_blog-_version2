'use client'

import { useState, useRef, useEffect } from 'react'

const PLAYLIST = [
  { title: '无间渡', url: '/music/1.mp3' },
  { title: '你要的全拿走', url: '/music/2.mp3' },
  { title: '忘不掉的你', url: '/music/3.mp3' },
  { title: '把回忆拼好给你', url: '/music/4.mp3' },
]

export function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null)
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

    audio.addEventListener('timeupdate', updateProgress)
    audio.addEventListener('loadedmetadata', updateProgress)
    audio.addEventListener('ended', () => playNext())

    return () => {
      audio.removeEventListener('timeupdate', updateProgress)
      audio.removeEventListener('loadedmetadata', updateProgress)
    }
  }, [])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }

  const loadTrack = (index: number) => {
    setCurrentTrack(index)
    setProgress(0)
    const audio = audioRef.current
    if (audio) {
      audio.load()
      if (isPlaying) audio.play()
    }
  }

  const playNext = () => {
    const next = (currentTrack + 1) % PLAYLIST.length
    loadTrack(next)
  }

  const playPrev = () => {
    const prev = (currentTrack - 1 + PLAYLIST.length) % PLAYLIST.length
    loadTrack(prev)
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
    }}>
      {/* 歌单弹窗 */}
      {showPlaylist && (
        <div style={{
          position: 'absolute',
          bottom: '72px',
          right: '0',
          width: '260px',
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(12px)',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(255,107,157,0.25)',
          padding: '14px',
          marginBottom: '8px',
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

      {/* 进度条 */}
      <div
        onClick={handleProgressClick}
        style={{
          position: 'absolute',
          bottom: '66px',
          right: '4px',
          width: '52px',
          height: '4px',
          background: 'rgba(0,0,0,0.1)',
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

      {/* 主按钮 */}
      <div style={{
        width: '52px',
        height: '52px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #ff6b9d, #e14b7e)',
        boxShadow: '0 4px 16px rgba(255,107,157,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: 'white',
        fontSize: '18px',
      }}>
        <button
          onClick={playPrev}
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.95)',
            border: 'none',
            color: '#e14b7e',
            fontSize: '11px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(255,107,157,0.2)',
            marginRight: '4px',
          }}
        >
          ⏮
        </button>
        <button
          onClick={togglePlay}
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.95)',
            border: 'none',
            color: '#e14b7e',
            fontSize: '12px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(255,107,157,0.2)',
          }}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button
          onClick={() => setShowPlaylist(!showPlaylist)}
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.95)',
            border: 'none',
            color: '#e14b7e',
            fontSize: '11px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(255,107,157,0.2)',
            marginLeft: '4px',
          }}
        >
          ☰
        </button>
      </div>

      {/* 当前歌曲名 */}
      <div style={{
        position: 'absolute',
        bottom: '78px',
        right: '0',
        fontSize: '11px',
        color: '#e14b7e',
        background: 'rgba(255,255,255,0.9)',
        padding: '2px 8px',
        borderRadius: '10px',
        whiteSpace: 'nowrap',
        boxShadow: '0 2px 8px rgba(255,107,157,0.15)',
      }}>
        {PLAYLIST[currentTrack].title} · {formatTime(progress)}
      </div>

      <audio ref={audioRef} src={PLAYLIST[currentTrack].url} preload="metadata" />
    </div>
  )
}
