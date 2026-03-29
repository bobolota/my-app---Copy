import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import { AuthProvider } from './context/AuthContext.jsx'
import { AppProvider } from './context/AppContext.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>    
    <AuthProvider>
    <AppProvider>
    <App />
    </AppProvider>
    </AuthProvider>
  </StrictMode>,
)
