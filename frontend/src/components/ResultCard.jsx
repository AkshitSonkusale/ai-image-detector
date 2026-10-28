/**
 * Verdict badge + animated confidence bar.
 */
export default function ResultCard({ result }) {
  if (!result) return null

  const { label, confidence, probabilities } = result
  const isAI = label === 'AI-GENERATED'
  const isUncertain = confidence >= 0.4 && confidence <= 0.6
  const pct = Math.round(confidence * 100)

  const badgeColor = isUncertain
    ? 'bg-uncertain/20 text-uncertain border-uncertain/40'
    : isAI
      ? 'bg-ai/20 text-ai border-ai/40'
      : 'bg-real/20 text-real border-real/40'

  const barColor = isUncertain ? 'bg-uncertain' : isAI ? 'bg-ai' : 'bg-real'

  return (
    <div className="rounded-2xl bg-surface border border-border p-6 space-y-5 shadow-lg">
      {/* Badge */}
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold border ${badgeColor}`}
        >
          {isUncertain ? 'UNCERTAIN' : label}
        </span>
        <span className="font-mono text-2xl font-medium tabular-nums">
          {pct}%
        </span>
      </div>

      {/* Confidence bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          <span>Confidence</span>
          <span className="font-mono">{pct}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-border overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Probabilities */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-bg/60 border border-border px-3 py-2">
          <div className="text-xs text-gray-500">Real</div>
          <div className="font-mono text-real">
            {(probabilities.real * 100).toFixed(1)}%
          </div>
        </div>
        <div className="rounded-xl bg-bg/60 border border-border px-3 py-2">
          <div className="text-xs text-gray-500">AI-Generated</div>
          <div className="font-mono text-ai">
            {(probabilities.ai_generated * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {isUncertain && (
        <p className="text-xs text-uncertain/90 bg-uncertain/10 rounded-lg px-3 py-2">
          Model is uncertain (40–60%). The image may contain mixed signals or come from an unseen generator.
        </p>
      )}

      <p className="text-[11px] text-gray-600 font-mono">
        Inference: {result.inference_ms} ms
      </p>
    </div>
  )
}
