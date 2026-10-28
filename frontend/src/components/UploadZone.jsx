import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Drag-and-drop + click + paste upload zone.
 */
export default function UploadZone({ onFile, onError, disabled }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const handleFiles = useCallback(
    (files) => {
      if (!files?.length || disabled) return
      const file = files[0]
      if (!file.type.startsWith('image/')) {
        onError?.('Please select an image (JPEG, PNG or WebP).')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        onError?.('File is larger than 5 MB.')
        return
      }
      onFile(file)
    },
    [onFile, onError, disabled],
  )

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const onPaste = useCallback(
    (e) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) handleFiles([file])
          break
        }
      }
    },
    [handleFiles],
  )

  // Listen for paste on window
  useEffect(() => {
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [onPaste])

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`
        relative flex flex-col items-center justify-center gap-3
        rounded-2xl border-2 border-dashed p-10 cursor-pointer
        transition-all duration-200
        ${dragging
          ? 'border-ai bg-ai/10 scale-[1.01]'
          : 'border-border bg-surface hover:border-gray-500 hover:bg-surface/80'}
        ${disabled ? 'opacity-50 pointer-events-none' : ''}
      `}
    >
      <div className="w-14 h-14 rounded-full bg-border/60 flex items-center justify-center">
        <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-gray-200">
          Drop an image, click to browse, or paste from clipboard
        </p>
        <p className="text-xs text-gray-500 mt-1">JPEG · PNG · WebP · max 5 MB</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  )
}
