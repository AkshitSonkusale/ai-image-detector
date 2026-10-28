import { useState } from 'react'

/**
 * Real CIFAKE test images served from /public/examples/.
 * Export them with the last cell of notebooks/04_gradcam_and_eval.ipynb
 * (real_1.jpg … real_3.jpg, ai_1.jpg … ai_3.jpg).
 * Clicking one loads it as a File, same as a user upload.
 */
const EXAMPLES = [
  { id: 'real_1', label: 'REAL' },
  { id: 'real_2', label: 'REAL' },
  { id: 'real_3', label: 'REAL' },
  { id: 'ai_1', label: 'AI' },
  { id: 'ai_2', label: 'AI' },
  { id: 'ai_3', label: 'AI' },
]

export default function ExamplesGallery({ onSelect, disabled }) {
  const [missing, setMissing] = useState({})

  const available = EXAMPLES.filter((ex) => !missing[ex.id])
  if (available.length === 0) return null // no example images shipped → hide section

  const handleClick = async (ex) => {
    if (disabled) return
    const res = await fetch(`/examples/${ex.id}.jpg`)
    const blob = await res.blob()
    onSelect(new File([blob], `${ex.id}.jpg`, { type: 'image/jpeg' }))
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-300 mb-3">Try a CIFAKE test image</h3>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {available.map((ex) => (
          <button
            key={ex.id}
            onClick={() => handleClick(ex)}
            disabled={disabled}
            className="group relative aspect-square rounded-xl overflow-hidden border border-border
                       bg-surface hover:border-gray-500 transition-all duration-200
                       disabled:opacity-40 disabled:pointer-events-none"
            title={`Ground truth: ${ex.label}`}
          >
            <img
              src={`/examples/${ex.id}.jpg`}
              alt={ex.label}
              className="w-full h-full object-cover [image-rendering:pixelated]"
              onError={() => setMissing((m) => ({ ...m, [ex.id]: true }))}
            />
            <span
              className={`absolute bottom-1 left-1 text-[9px] font-semibold uppercase tracking-wider
                          px-1.5 py-0.5 rounded bg-black/70 ${ex.label === 'AI' ? 'text-ai' : 'text-real'}`}
            >
              {ex.label}
            </span>
          </button>
        ))}
      </div>
      <p className="text-[11px] text-gray-600 mt-2">
        Labels show the ground truth. Compare them with the model's verdict.
      </p>
    </div>
  )
}
