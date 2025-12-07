import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import Editor from './components/Editor'
import OutputPanel from './components/OutputPanel'
import { executeCode } from './utils/codeExecutor'
import './styles/App.css'

const languages = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'cpp', label: 'C++' },
  { value: 'java', label: 'Java' },
  { value: 'sql', label: 'SQL' },
  { value: 'html', label: 'HTML/CSS' }
]

function App() {
  const [sessionId, setSessionId] = useState('')
  const [code, setCode] = useState('// Start coding together...\n')
  const [language, setLanguage] = useState('javascript')
  const [output, setOutput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [connectedUsers, setConnectedUsers] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  const [statusMessage, setStatusMessage] = useState('Connecting to server...')
  const socketRef = useRef(null)
  const backendUrlRef = useRef(
    import.meta.env.VITE_BACKEND_URL ||
    (window.location.port && window.location.port !== '3000'
      ? `${window.location.protocol}//${window.location.hostname}:3000`
      : window.location.origin)
  )

  const querySessionId = useRef(new URLSearchParams(window.location.search).get('session'))

  useEffect(() => {
    const socket = io(backendUrlRef.current, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      timeout: 8000,
      reconnectionAttempts: 5
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setIsConnected(true)
      setStatusMessage('')
      if (querySessionId.current) {
        socket.emit('join_session', { sessionId: querySessionId.current })
      } else {
        socket.emit('create_session')
      }
    })

    socket.on('session_created', ({ sessionId: id }) => {
      setSessionId(id)
      const url = new URL(window.location.href)
      url.searchParams.set('session', id)
      window.history.replaceState({}, '', url.toString())
    })

    socket.on('session_joined', ({ sessionId: id, code: joinedCode, language: joinedLanguage }) => {
      setSessionId(id)
      setCode(joinedCode)
      setLanguage(joinedLanguage)
      setStatusMessage('')
    })

    socket.on('code_updated', ({ code: newCode }) => {
      setCode(newCode)
    })

    socket.on('language_updated', ({ language: newLanguage }) => {
      setLanguage(newLanguage)
    })

    socket.on('users_count', ({ count }) => {
      setConnectedUsers(count)
    })

    socket.on('error', (err) => {
      console.error('Socket error:', err)
      setStatusMessage(typeof err === 'string' ? err : 'Connection error')
    })

    socket.on('connect_error', (err) => {
      console.error('Socket connect_error:', err)
      setStatusMessage(
        `Unable to reach backend at ${backendUrlRef.current}. Is the server running?`
      )
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
      setStatusMessage('Disconnected from server')
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  const handleCodeChange = (newCode) => {
    setCode(newCode)
    socketRef.current?.emit('update_code', { code: newCode })
  }

  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage)
    socketRef.current?.emit('update_language', { language: newLanguage })
  }

  const handleRunCode = async () => {
    setIsRunning(true)
    setOutput('Running...')
    try {
      const result = await executeCode(code, language)
      setOutput(result)
    } catch (err) {
      setOutput(`Error: ${err.message}`)
    } finally {
      setIsRunning(false)
    }
  }

  const handleCopyLink = async () => {
    if (!sessionId) return
    const url = new URL(window.location.href)
    url.searchParams.set('session', sessionId)
    await navigator.clipboard.writeText(url.toString())
    setStatusMessage('Session link copied')
    setTimeout(() => setStatusMessage(''), 2000)
  }

  if (!isConnected || !sessionId) {
    return (
      <div className="loading-screen">
        <h2>{statusMessage || 'Setting up session...'}</h2>
        <p className="hint">Ensure the backend server is running on port 3000.</p>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>Coding Interview Platform</h1>
          <p className="subtitle">Real-time collaborative coding with safe browser execution.</p>
        </div>
        <div className="session-meta">
          <div className="pill">
            <span className={`dot ${isConnected ? 'online' : 'offline'}`}></span>
            {connectedUsers} online
          </div>
          <div className="pill">Session: {sessionId.slice(0, 8)}</div>
          <button className="primary" onClick={handleCopyLink}>Share Link</button>
        </div>
      </header>

      {statusMessage && <div className="banner info">{statusMessage}</div>}

      <main className="layout">
        <section className="panel editor-panel">
          <div className="panel-header">
            <span>Editor</span>
            <select value={language} onChange={(e) => handleLanguageChange(e.target.value)}>
              {languages.map((lang) => (
                <option key={lang.value} value={lang.value}>{lang.label}</option>
              ))}
            </select>
          </div>
          <Editor
            value={code}
            language={language}
            onChange={handleCodeChange}
          />
        </section>

        <section className="panel output-panel">
          <div className="panel-header">
            <span>Output</span>
            <div className="actions">
              <button className="ghost" onClick={() => setOutput('')}>Clear</button>
              <button className="primary" disabled={isRunning} onClick={handleRunCode}>
                {isRunning ? 'Running...' : 'Run Code'}
              </button>
            </div>
          </div>
          <OutputPanel output={output} />
        </section>
      </main>
    </div>
  )
}

export default App
