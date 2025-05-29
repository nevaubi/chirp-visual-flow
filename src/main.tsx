import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Disable all console logging to prevent unwanted messages in the browser
/* eslint-disable no-console */
console.log = () => {};
console.error = () => {};
console.warn = () => {};
/* eslint-enable no-console */

createRoot(document.getElementById('root')!).render(<App />)