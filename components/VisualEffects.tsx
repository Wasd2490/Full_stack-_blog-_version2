'use client'

import { useEffect, useRef } from 'react'

/** 高级视觉特效：流动体渐变 + 鼠标光点跟随 */
export function VisualEffects() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = (canvas.width = window.innerWidth)
    let h = (canvas.height = window.innerHeight)
    const mouse = { x: w / 2, y: h / 2, smoothX: w / 2, smoothY: h / 2 }

    // 流动光斑
    class Blob {
      x: number; y: number; radius: number; hue: number; speedX: number; speedY: number; phase: number
      constructor() {
        this.x = Math.random() * w
        this.y = Math.random() * h
        this.radius = 200 + Math.random() * 200
        this.hue = 320 + Math.random() * 40
        this.speedX = (Math.random() - 0.5) * 0.3
        this.speedY = (Math.random() - 0.5) * 0.3
        this.phase = Math.random() * Math.PI * 2
      }
      update(time: number) {
        this.x += Math.sin(time * 0.001 + this.phase) * 0.5 + this.speedX
        this.y += Math.cos(time * 0.001 + this.phase) * 0.5 + this.speedY
        if (this.x < -this.radius) this.x = w + this.radius
        if (this.x > w + this.radius) this.x = -this.radius
        if (this.y < -this.radius) this.y = h + this.radius
        if (this.y > h + this.radius) this.y = -this.radius
      }
      draw() {
        const grad = ctx!.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius)
        grad.addColorStop(0, `hsla(${this.hue}, 85%, 75%, 0.1)`)
        grad.addColorStop(0.5, `hsla(${this.hue + 10}, 85%, 70%, 0.05)`)
        grad.addColorStop(1, 'transparent')
        ctx!.fillStyle = grad
        ctx!.fillRect(0, 0, w, h)
      }
    }

    // 鼠标光点拖尾
    class TrailDot {
      x: number; y: number; life: number; size: number
      constructor(x: number, y: number) {
        this.x = x
        this.y = y
        this.life = 1
        this.size = 8
      }
      update() {
        this.life -= 0.05
      }
      draw() {
        if (this.life <= 0) return
        ctx!.beginPath()
        ctx!.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(244, 114, 182, ${this.life * 0.6})`
        ctx!.fill()
      }
    }

    const trail: TrailDot[] = []

    const onMouse = (e: MouseEvent) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
      trail.push(new TrailDot(e.clientX, e.clientY))
    }
    const onResize = () => {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
    }

    window.addEventListener('mousemove', onMouse)
    window.addEventListener('resize', onResize)

    let animId: number
    const animate = () => {
      ctx.clearRect(0, 0, w, h)

      // 平滑跟随
      mouse.smoothX += (mouse.x - mouse.smoothX) * 0.15
      mouse.smoothY += (mouse.y - mouse.smoothY) * 0.15

      // 拖尾光点
      for (let i = trail.length - 1; i >= 0; i--) {
        trail[i].update()
        trail[i].draw()
        if (trail[i].life <= 0) trail.splice(i, 1)
      }

      // 中心光点
      ctx.beginPath()
      ctx.arc(mouse.smoothX, mouse.smoothY, 6, 0, Math.PI * 2)
      ctx.fillStyle = '#ec4899'
      ctx.fill()

      // 光点外圈光晕
      ctx.beginPath()
      ctx.arc(mouse.smoothX, mouse.smoothY, 12, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(244, 114, 182, 0.2)'
      ctx.fill()

      animId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      window.removeEventListener('mousemove', onMouse)
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(animId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    />
  )
}
