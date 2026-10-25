import { useEffect, useState } from 'react'
import { setSoundCaptionSink } from './audio'
import { loadSoundCaptions } from './leftoverPrefs'

/** 音效文字字幕（無障礙） */
export function SoundCaptions() {
  const [text, setText] = useState<string | null>(null)

  useEffect(() => {
    if (!loadSoundCaptions()) {
      setSoundCaptionSink(null)
      return
    }
    setSoundCaptionSink((t) => {
      setText(t)
      window.setTimeout(() => setText(null), 1800)
    })
    return () => setSoundCaptionSink(null)
  }, [])

  if (!text) return null
  return (
    <p className="sound-caption" role="status" aria-live="polite">
      {text}
    </p>
  )
}
