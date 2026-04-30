'use client'

interface ToggleProps {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
}

export function Toggle({ checked, onChange, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative shrink-0 w-9 h-5 rounded-full border transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed ${
        checked
          ? 'bg-violet-400/40 border-violet-400/50'
          : 'bg-white/8 border-white/15'
      }`}
    >
      <span
        className={`absolute top-[1px] left-[1px] w-[15px] h-[15px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-[16px]' : 'translate-x-0'
        }`}
      />
    </button>
  )
}
