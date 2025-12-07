import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { v4 as uuid } from 'uuid'

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

app.use(cors())
app.use(express.json())

const sessions = new Map()
const socketToSession = new Map()

const createSession = (sessionId = uuid()) => {
  const session = {
    id: sessionId,
    code: '// Start coding together...\n',
    language: 'javascript',
    users: new Set()
  }
  sessions.set(sessionId, session)
  return session
}

io.on('connection', (socket) => {
    console.log(`[server] socket connected ${socket.id}`)

    socket.on('create_session', () => {
        console.log(`[server] create_session from ${socket.id}`)
        const session = createSession()
        session.users.add(socket.id)
        socketToSession.set(socket.id, session.id)
        socket.join(session.id)
        socket.emit('session_created', { sessionId: session.id })
        emitUserCount(session.id)
    })

    socket.on('join_session', ({ sessionId }) => {
        console.log(`[server] join_session ${sessionId} from ${socket.id}`)
        const target = sessions.get(sessionId) || createSession(sessionId)
        target.users.add(socket.id)
        socketToSession.set(socket.id, target.id)
        socket.join(target.id)
        socket.emit('session_joined', {
      sessionId: target.id,
      code: target.code,
      language: target.language
    })
    emitUserCount(target.id)
  })

    socket.on('update_code', ({ code }) => {
        console.log(`[server] update_code from ${socket.id}`)
        const sessionId = socketToSession.get(socket.id)
        if (!sessionId) return
        const session = sessions.get(sessionId)
        if (!session) return
        session.code = code
        socket.to(sessionId).emit('code_updated', { code })
        emitUserCount(sessionId)
    })

    socket.on('update_language', ({ language }) => {
        console.log(`[server] update_language from ${socket.id} -> ${language}`)
        const sessionId = socketToSession.get(socket.id)
        if (!sessionId) return
        const session = sessions.get(sessionId)
        if (!session) return
        session.language = language
        socket.to(sessionId).emit('language_updated', { language })
        emitUserCount(sessionId)
    })

    socket.on('disconnect', () => {
        console.log(`[server] socket disconnected ${socket.id}`)
        const sessionId = socketToSession.get(socket.id)
        if (!sessionId) return
        socketToSession.delete(socket.id)
    const session = sessions.get(sessionId)
    if (!session) return
    session.users.delete(socket.id)
    if (session.users.size === 0) {
      sessions.delete(sessionId)
    } else {
      emitUserCount(sessionId)
    }
  })
})

function emitUserCount(sessionId) {
  const session = sessions.get(sessionId)
  if (!session) return
  io.to(sessionId).emit('users_count', { count: session.users.size })
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// Explicitly disable server-side code execution; handled in-browser via WASM
app.post('/execute', (_req, res) => {
  res.status(400).json({
    success: false,
    error: 'Server-side execution disabled. Run code in the browser (WASM).'
  })
})

const PORT = process.env.PORT || 3000

if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
}

export { app, httpServer, io }
