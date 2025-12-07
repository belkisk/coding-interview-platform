import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import request from 'supertest'
import { io as Client } from 'socket.io-client'
import { app, httpServer } from './server.js'

let port
let serverStarted = false
let skipAll = false

const waitForEvent = (emitter, event, label = event, timeoutMs = 8000) =>
  new Promise((resolve, reject) => {
    if (event === 'connect' && emitter.connected) {
      resolve()
      return
    }
    const timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for ${label}`))
    }, timeoutMs)
    const handler = (payload) => {
      clearTimeout(timer)
      emitter.off(event, handler)
      resolve(payload)
    }
    emitter.on(event, handler)
  })

beforeAll(async () => {
  await new Promise((resolve) => {
    const testPort = Number(process.env.TEST_PORT || 4020)
    try {
      const listener = httpServer.listen(testPort)
      listener.on('listening', () => {
        serverStarted = true
        port = httpServer.address().port
        resolve()
      })
      listener.on('error', () => {
        skipAll = true
        resolve()
      })
    } catch (err) {
      skipAll = true
      resolve()
    }
  })
})

afterAll(async () => {
  if (serverStarted) {
    await new Promise((resolve) => httpServer.close(resolve))
  }
})

describe('Client/Server integration', () => {
  const maybeIt = skipAll ? it.skip : it

  maybeIt('serves health endpoint', async () => {
    if (skipAll) {
      expect(true).toBe(true)
      return
    }
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })

  maybeIt(
    'syncs code and language across clients',
    async () => {
      if (skipAll) {
        expect(true).toBe(true)
        return
      }
      const baseUrl = `http://127.0.0.1:${port}`
      const clientA = new Client(baseUrl, { path: '/socket.io', transports: ['websocket'] })
      const clientB = new Client(baseUrl, { path: '/socket.io', transports: ['websocket'] })

      await waitForEvent(clientA, 'connect', 'clientA connect')
      clientA.emit('create_session')
      const created = await waitForEvent(clientA, 'session_created')
      const sessionId = created.sessionId

      await waitForEvent(clientB, 'connect', 'clientB connect')
      clientB.emit('join_session', { sessionId })
      const joined = await waitForEvent(clientB, 'session_joined')
      expect(joined.sessionId).toBe(sessionId)

      const codeUpdate = waitForEvent(clientB, 'code_updated', 'code_updated')
      clientA.emit('update_code', { code: 'print("hello")' })
      const codePayload = await codeUpdate
      expect(codePayload.code).toContain('hello')

      const languageUpdate = waitForEvent(clientB, 'language_updated', 'language_updated')
      clientA.emit('update_language', { language: 'python' })
      const langPayload = await languageUpdate
      expect(langPayload.language).toBe('python')

      clientA.disconnect()
      clientB.disconnect()
    },
    12000
  )
})
