import './style.css'
import { RhythmTrainerApp } from './RhythmTrainerApp'

// Initialize the app
const appContainer = document.querySelector<HTMLDivElement>('#app')!
new RhythmTrainerApp(appContainer)
