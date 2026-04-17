'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

interface BackgroundEngineProps {
  active: boolean
  isLate: boolean
  isCancelling: boolean
  isAudioOnly: boolean
  waveRgb: string
  accentColor: string
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

export function BackgroundEngine({
  active,
  isLate,
  isCancelling,
  isAudioOnly,
  waveRgb,
  accentColor,
}: BackgroundEngineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const waveRgbRef = useRef(waveRgb)

  useEffect(() => {
    waveRgbRef.current = waveRgb
  }, [waveRgb])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const waves = [
      { amplitude: 80, frequency: 0.003, speed: 0.015, yOffset: 0.5, opacity: 0.2, lineWidth: 2 },
      {
        amplitude: 60,
        frequency: 0.004,
        speed: -0.012,
        yOffset: 0.52,
        opacity: 0.14,
        lineWidth: 1.5,
      },
      {
        amplitude: 100,
        frequency: 0.002,
        speed: 0.008,
        yOffset: 0.48,
        opacity: 0.08,
        lineWidth: 1,
      },
    ]

    let phase = 0

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const waveColor = `rgb(${waveRgbRef.current})`
      const w = canvas.width
      const h = canvas.height

      for (const wave of waves) {
        const grad = ctx.createLinearGradient(0, 0, w, 0)
        grad.addColorStop(0, waveColor)
        grad.addColorStop(0.5, waveColor)
        grad.addColorStop(1, waveColor)

        ctx.strokeStyle = grad
        ctx.lineWidth = wave.lineWidth
        ctx.globalAlpha = wave.opacity
        ctx.beginPath()

        for (let x = 0; x <= w; x += 2) {
          const y =
            h * wave.yOffset +
            Math.sin(x * wave.frequency + phase * wave.speed) * wave.amplitude +
            Math.sin(x * wave.frequency * 0.5 + phase * wave.speed * 1.3) * wave.amplitude * 0.3

          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }

      ctx.globalAlpha = 1
      phase += 1
      animFrameRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <motion.div
        animate={{ x: ['-5%', '5%', '-5%'], y: ['-5%', '8%', '-5%'] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-[-15%] left-[-10%] w-[55%] h-[55%] rounded-full blur-[120px] transition-colors duration-1000"
        style={{ backgroundColor: hexToRgba(accentColor, 0.07) }}
      />

      <motion.div
        animate={{ x: ['5%', '-5%', '5%'], y: ['5%', '-8%', '5%'] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] transition-colors duration-1000"
        style={{ backgroundColor: hexToRgba(accentColor, 0.06) }}
      />

      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-10" />

      <div className="absolute inset-0 z-20 opacity-[0.03] mix-blend-overlay bg-[url('/noise.svg')]" />
    </div>
  )
}
