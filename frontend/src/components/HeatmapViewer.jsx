import { useState } from 'react'

/**
 * Toggle between Original / Heatmap / Side-by-side + opacity slider.
 */
export default function HeatmapViewer({ original, heatmap }) {
  const [mode, setMode] = useState('side') // original | heatmap | side
  const [opacity, setOpacity] = useState(0.55)

  if (!original || !heatmap) return null

  const modes = [
    { id: 'original', label: 'Original' },
    { id: 'heatmap', label: 'Heatmap' },
    { id: 'side', label: 'Side-by-side' },
  ]

  return (
    <div className="rounded-2xl bg-surface border border-border p-5 space-y-4 shadow-lg">
      {/* Mode toggle */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex rounded-lg bg-bg border border-border p-0.5">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-200
                ${mode === m.id
                  ? 'bg-border text-white'
                  : 'text-gray-400 hover:text-gray-200'}`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Opacity – only meaningful for overlay views */}
        {mode !== 'original' && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>Overlay</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={opacity}
              onChange={(e) => setOpacity(+e.target.value)}
              className="w-24 accent-ai"
            />
            <span className="font-mono w-8">{Math.round(opacity * 100)}%</span>
          </div>
        )}
      </div>

      {/* Images */}
      <div
        className={`grid gap-3 ${
          mode === 'side' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
        }`}
      >
        {(mode === 'original' || mode === 'side') && (
          <div className="relative rounded-xl overflow-hidden bg-bg border border-border">
            <img src={original} alt="Original" className="w-full h-auto block" />
            {mode === 'side' && (
              <span className="absolute bottom-2 left-2 text-[10px] uppercase tracking-wider bg-black/60 px-2 py-0.5 rounded text-gray-300">
                Original
              </span>
            )}
          </div>
        )}

        {(mode === 'heatmap' || mode === 'side') && (
          <div className="relative rounded-xl overflow-hidden bg-bg border border-border">
            {/* Base original + heatmap on top with controllable opacity */}
            <div className="relative">
              <img src={original} alt="" className="w-full h-auto block" />
              <img
                src={heatmap}
                alt="Grad-CAM heatmap"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ opacity }}
              />
            </div>
            {mode === 'side' && (
              <span className="absolute bottom-2 left-2 text-[10px] uppercase tracking-wider bg-black/60 px-2 py-0.5 rounded text-gray-300">
                Grad-CAM
              </span>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[11px] text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-red-500" />
          High influence
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-blue-500" />
          Low influence
        </div>
      </div>
    </div>
  )
}
