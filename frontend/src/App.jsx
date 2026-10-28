import { useState, useCallback } from 'react'
import UploadZone from './components/UploadZone'
import ResultCard from './components/ResultCard'
import HeatmapViewer from './components/HeatmapViewer'
import ExamplesGallery from './components/ExamplesGallery'
import { predictImage } from './api'

export default function App() {
  const [preview, setPreview] = useState(null) // object URL
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleFile = useCallback((f) => {
    if (preview) URL.revokeObjectURL(preview)
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setResult(null)
    setError(null)
  }, [preview])

  const analyze = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await predictImage(file)
      setResult(data)
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-surface/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              AI Image Detector
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Is this image real or AI-generated? See what the model sees.
            </p>
          </div>
          <span className="hidden sm:inline-flex text-[10px] uppercase tracking-widest text-gray-600 border border-border rounded-full px-2.5 py-1">
            EfficientNet-B0 · Grad-CAM
          </span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left column – upload */}
          <div className="space-y-6">
            <UploadZone onFile={handleFile} onError={setError} disabled={loading} />

            {preview && (
              <div className="rounded-2xl overflow-hidden border border-border bg-surface">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full max-h-72 object-contain bg-bg"
                />
                <div className="p-4 flex gap-3">
                  <button
                    onClick={analyze}
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-xl font-medium text-sm
                               bg-ai hover:bg-ai/90 text-white
                               disabled:opacity-50 disabled:cursor-not-allowed
                               transition-colors duration-200
                               flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Spinner /> Analyzing…
                      </>
                    ) : (
                      'Analyze'
                    )}
                  </button>
                  <button
                    onClick={() => {
                      if (preview) URL.revokeObjectURL(preview)
                      setPreview(null)
                      setFile(null)
                      setResult(null)
                      setError(null)
                    }}
                    disabled={loading}
                    className="px-4 py-2.5 rounded-xl text-sm text-gray-400
                               border border-border hover:bg-border/50
                               transition-colors duration-200"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            <ExamplesGallery onSelect={handleFile} disabled={loading} />
          </div>

          {/* Right column – results */}
          <div className="space-y-6">
            {loading && <LoadingSkeleton />}

            {error && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-300">
                <p className="font-medium mb-1">Error</p>
                <p className="text-red-300/80">{error}</p>
                {!/image|MB|extension|decode/i.test(error) && (
                  <p className="text-xs text-red-400/60 mt-2">
                    If the backend is on Hugging Face Spaces it may need ~30 s to wake up. Try again.
                  </p>
                )}
              </div>
            )}

            {result && (
              <>
                <ResultCard result={result} />
                <HeatmapViewer
                  original={result.original}
                  heatmap={result.heatmap}
                />
              </>
            )}

            {!loading && !result && !error && (
              <div className="rounded-2xl border border-border bg-surface/50 p-10 text-center text-gray-500 text-sm">
                Upload an image and click <span className="text-gray-300">Analyze</span> to see
                the verdict and Grad-CAM explanation.
              </div>
            )}
          </div>
        </div>

        {/* How it works */}
        <section className="mt-16 border-t border-border pt-10">
          <h2 className="text-sm font-semibold text-gray-300 mb-6">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: 'Upload',
                body: 'Any JPEG, PNG or WebP. It is first reduced to a 32×32 JPEG (the CIFAKE training format), then resized to 224×224 and normalised with ImageNet statistics.',
              },
              {
                step: '02',
                title: 'Classify',
                body: 'A fine-tuned EfficientNet-B0 produces a single logit. Sigmoid → probability of AI-generated.',
              },
              {
                step: '03',
                title: 'Explain',
                body: 'Grad-CAM computes the gradient of the class score w.r.t. the last conv feature maps and overlays a heatmap.',
              },
            ].map((s) => (
              <div key={s.step} className="rounded-2xl bg-surface border border-border p-5">
                <span className="font-mono text-xs text-ai">{s.step}</span>
                <h3 className="font-medium mt-1 mb-2">{s.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Limitations */}
        <p className="mt-10 text-[11px] text-gray-600 leading-relaxed max-w-2xl">
          <strong className="text-gray-500">Limitations.</strong> Trained on CIFAKE
          (CIFAR-10 real photographs + Stable Diffusion v1.4 fakes at 32×32, upscaled to 224).
          Accuracy drops on images from newer generators (Midjourney, Flux, DALL·E) and on high-resolution photos.
          This is an educational detector, not a production forensic tool.
        </p>
      </main>

      <footer className="border-t border-border py-4 text-center text-[11px] text-gray-600">
        Deep Learning mini-project · Transfer Learning + Grad-CAM
      </footer>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="rounded-2xl bg-surface border border-border p-6 space-y-4">
        <div className="flex justify-between">
          <div className="h-7 w-28 skeleton" />
          <div className="h-7 w-14 skeleton" />
        </div>
        <div className="h-2.5 skeleton rounded-full" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-14 skeleton rounded-xl" />
          <div className="h-14 skeleton rounded-xl" />
        </div>
      </div>
      <div className="rounded-2xl bg-surface border border-border p-5">
        <div className="h-48 skeleton rounded-xl" />
      </div>
    </div>
  )
}
