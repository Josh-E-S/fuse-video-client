'use client'

import { useState, useEffect } from 'react'

export function ClockDisplay() {
  const [clockStr, setClockStr] = useState('')
  const [dateStr, setDateStr] = useState('')

  useEffect(() => {
    function tick() {
      const now = new Date()
      let h = now.getHours()
      const m = String(now.getMinutes()).padStart(2, '0')
      h = h % 12 || 12
      setClockStr(`${h}:${m}`)
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const months = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ]
      setDateStr(`${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`)
    }
    tick()
    const interval = setInterval(tick, 10_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="text-center pb-1">
      <div className="text-[56px] font-extralight tracking-[-0.04em] leading-none text-white/90">
        {clockStr}
      </div>
      <div className="text-sm text-white/28 mt-1.5">{dateStr}</div>
    </div>
  )
}
