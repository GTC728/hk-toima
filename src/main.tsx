import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyStoredBoardPrefs } from './ui/boardPrefs'
import { applyStoredExtraPrefs } from './ui/extraPrefs'
import { applyStoredLeftoverPrefs } from './ui/leftoverPrefs'
import { applyStoredUiPrefs } from './ui/uiPrefs'

applyStoredUiPrefs()
applyStoredBoardPrefs()
applyStoredExtraPrefs()
applyStoredLeftoverPrefs()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
