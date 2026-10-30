'use client'

import { useEffect, useState } from 'react'

const TYPED_TEXTS = [
  'characteristic · 全栈开发',
  'characteristic · 单片机嵌入式',
  'characteristic · 机器视觉',
  'characteristic · 硬件爱好者',
]

/** Hero 打字机效果 */
export function TypeWriter() {
  const [textIndex, setTextIndex] = useState(0)
  const [displayText, setDisplayText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const currentText = TYPED_TEXTS[textIndex]
    let timeout: NodeJS.Timeout

    if (!isDeleting && displayText === currentText) {
      timeout = setTimeout(() => setIsDeleting(true), 2000)
    } else if (isDeleting && displayText === '') {
      setIsDeleting(false)
      setTextIndex((prev) => (prev + 1) % TYPED_TEXTS.length)
    } else {
      timeout = setTimeout(() => {
        setDisplayText(
          currentText.substring(0, displayText.length + (isDeleting ? -1 : 1))
        )
      }, isDeleting ? 50 : 100)
    }

    return () => clearTimeout(timeout)
  }, [displayText, isDeleting, textIndex])

  return (
    <span style={{
      background: 'linear-gradient(135deg, var(--brand), #f9a8d4)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    }}>
      {displayText}
      <span style={{
        display: 'inline-block',
        width: 2,
        height: '0.9em',
        background: 'var(--brand)',
        marginLeft: 4,
        verticalAlign: 'middle',
        animation: 'blink 1s infinite',
      }} />
      <style>{`@keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }`}</style>
    </span>
  )
}
