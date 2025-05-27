/* eslint-disable no-console */
console.log = () => {};
console.error = () => {};
console.warn = () => {};
/* eslint-enable no-console */

import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(<App />)
