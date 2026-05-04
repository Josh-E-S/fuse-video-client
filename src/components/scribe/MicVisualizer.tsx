'use client'

import { useEffect, useRef } from 'react'

interface MicVisualizerProps {
  stream: MediaStream | null
  active: boolean
  remoteStream?: MediaStream | null
}

const HEIGHT = 44
const BAR_COUNT = 48
const BAR_WIDTH = 3
const BAR_GAP = 4
const MIN_BAR_HEIGHT = 2
const NEAR_COLOR = 'rgb(196, 181, 253)'   // violet — local mic
const FAR_COLOR = 'rgb(125, 211, 252)'    // cyan  — remote audio
const SMOOTHING = 0.78
const CENTER_GAP = 2 // pixels between near (top) and far (bottom) bars

export function MicVisualizer({ stream, active, remoteStream }: MicVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1

    const resize = () => {
      const rect = container.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = HEIGHT * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${HEIGHT}px`
      ctx.scale(dpr, dpr)
    }
    resize()

    const ro = new ResizeObserver(resize)
    ro.observe(container)

    let raf = 0
    let audioCtx: AudioContext | null = null
    let nearAnalyser: AnalyserNode | null = null
    let farAnalyser: AnalyserNode | null = null
    let nearSource: MediaStreamAudioSourceNode | null = null
    let farSource: MediaStreamAudioSourceNode | null = null
    let nearData: Uint8Array<ArrayBuffer> | null = null
    let farData: Uint8Array<ArrayBuffer> | null = null

    const hasRemote = Boolean(remoteStream)

    const drawIdle = () => {
      const w = canvas.width / dpr
      ctx.clearRect(0, 0, w, HEIGHT)
      const totalWidth = BAR_COUNT * BAR_WIDTH + (BAR_COUNT - 1) * BAR_GAP
      const startX = (w - totalWidth) / 2

      if (hasRemote) {
        // Two flat lines, one above center one below
        ctx.fillStyle = 'rgba(196, 181, 253, 0.2)'
        for (let i = 0; i < BAR_COUNT; i++) {
          const x = startX + i * (BAR_WIDTH + BAR_GAP)
          roundedBar(ctx, x, HEIGHT / 2 - CENTER_GAP / 2 - MIN_BAR_HEIGHT, BAR_WIDTH, MIN_BAR_HEIGHT)
        }
        ctx.fillStyle = 'rgba(125, 211, 252, 0.2)'
        for (let i = 0; i < BAR_COUNT; i++) {
          const x = startX + i * (BAR_WIDTH + BAR_GAP)
          roundedBar(ctx, x, HEIGHT / 2 + CENTER_GAP / 2, BAR_WIDTH, MIN_BAR_HEIGHT)
        }
      } else {
        ctx.fillStyle = 'rgba(196, 181, 253, 0.2)'
        for (let i = 0; i < BAR_COUNT; i++) {
          const x = startX + i * (BAR_WIDTH + BAR_GAP)
          const y = (HEIGHT - MIN_BAR_HEIGHT) / 2
          roundedBar(ctx, x, y, BAR_WIDTH, MIN_BAR_HEIGHT)
        }
      }
    }

    const sampleBar = (data: Uint8Array, i: number) => {
      const startBinOffset = 2
      const usefulBins = Math.floor(data.length * 0.32) - startBinOffset
      const binsPerBar = usefulBins / BAR_COUNT
      const startBin = startBinOffset + Math.floor(i * binsPerBar)
      const endBin = startBinOffset + Math.floor((i + 1) * binsPerBar)
      let sum = 0
      for (let j = startBin; j < endBin; j++) sum += data[j]
      const avg = sum / Math.max(1, endBin - startBin)
      const norm = avg / 255
      const positionBoost = 1 + (i / BAR_COUNT) * 0.6
      return Math.pow(Math.min(1, norm * positionBoost), 0.65)
    }

    const draw = () => {
      const w = canvas.width / dpr
      ctx.clearRect(0, 0, w, HEIGHT)

      const totalWidth = BAR_COUNT * BAR_WIDTH + (BAR_COUNT - 1) * BAR_GAP
      const startX = (w - totalWidth) / 2

      if (hasRemote) {
        // Mirrored layout: near grows up from center, far grows down
        const halfHeight = (HEIGHT - CENTER_GAP) / 2
        const maxBarHeight = halfHeight - 1
        const nearBaseline = HEIGHT / 2 - CENTER_GAP / 2
        const farBaseline = HEIGHT / 2 + CENTER_GAP / 2

        if (nearAnalyser && nearData) {
          nearAnalyser.getByteFrequencyData(nearData)
          ctx.fillStyle = NEAR_COLOR
          for (let i = 0; i < BAR_COUNT; i++) {
            const eased = sampleBar(nearData, i)
            const barHeight = Math.max(MIN_BAR_HEIGHT, eased * maxBarHeight)
            const x = startX + i * (BAR_WIDTH + BAR_GAP)
            roundedBar(ctx, x, nearBaseline - barHeight, BAR_WIDTH, barHeight)
          }
        }

        if (farAnalyser && farData) {
          farAnalyser.getByteFrequencyData(farData)
          ctx.fillStyle = FAR_COLOR
          for (let i = 0; i < BAR_COUNT; i++) {
            const eased = sampleBar(farData, i)
            const barHeight = Math.max(MIN_BAR_HEIGHT, eased * maxBarHeight)
            const x = startX + i * (BAR_WIDTH + BAR_GAP)
            roundedBar(ctx, x, farBaseline, BAR_WIDTH, barHeight)
          }
        }
      } else {
        // Single-stream centered (used by local scribe)
        if (!nearAnalyser || !nearData) return
        nearAnalyser.getByteFrequencyData(nearData)
        const centerY = HEIGHT / 2
        const maxBarHeight = HEIGHT - 4
        ctx.fillStyle = NEAR_COLOR
        for (let i = 0; i < BAR_COUNT; i++) {
          const eased = sampleBar(nearData, i)
          const barHeight = Math.max(MIN_BAR_HEIGHT, eased * maxBarHeight)
          const x = startX + i * (BAR_WIDTH + BAR_GAP)
          const y = centerY - barHeight / 2
          roundedBar(ctx, x, y, BAR_WIDTH, barHeight)
        }
      }

      raf = requestAnimationFrame(draw)
    }

    if (active && (stream || remoteStream)) {
      try {
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        audioCtx = new Ctx()

        if (stream) {
          nearAnalyser = audioCtx.createAnalyser()
          nearAnalyser.fftSize = 512
          nearAnalyser.smoothingTimeConstant = SMOOTHING
          nearData = new Uint8Array(new ArrayBuffer(nearAnalyser.frequencyBinCount))
          nearSource = audioCtx.createMediaStreamSource(stream)
          nearSource.connect(nearAnalyser)
        }

        if (remoteStream) {
          farAnalyser = audioCtx.createAnalyser()
          farAnalyser.fftSize = 512
          farAnalyser.smoothingTimeConstant = SMOOTHING
          farData = new Uint8Array(new ArrayBuffer(farAnalyser.frequencyBinCount))
          farSource = audioCtx.createMediaStreamSource(remoteStream)
          farSource.connect(farAnalyser)
        }

        raf = requestAnimationFrame(draw)
      } catch {
        drawIdle()
      }
    } else {
      drawIdle()
    }

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      try {
        nearSource?.disconnect()
      } catch {}
      try {
        farSource?.disconnect()
      } catch {}
      try {
        nearAnalyser?.disconnect()
      } catch {}
      try {
        farAnalyser?.disconnect()
      } catch {}
      audioCtx?.close().catch(() => {})
    }
  }, [stream, active, remoteStream])

  return (
    <div
      ref={containerRef}
      className="w-full flex items-center justify-center"
      style={{ height: HEIGHT }}
    >
      <canvas ref={canvasRef} />
    </div>
  )
}

function roundedBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const r = Math.min(width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + r)
  ctx.lineTo(x + width, y + height - r)
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  ctx.lineTo(x + r, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
  ctx.fill()
}
