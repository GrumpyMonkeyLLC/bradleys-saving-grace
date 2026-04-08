const { app } = require('@azure/functions')
const { TableClient, AzureNamedKeyCredential } = require('@azure/data-tables')

function getClient() {
  const account = process.env.AZURE_STORAGE_ACCOUNT_NAME
  const key     = process.env.AZURE_STORAGE_ACCOUNT_KEY
  const credential = new AzureNamedKeyCredential(account, key)
  return new TableClient(`https://${account}.table.core.windows.net`, 'Subscribers', credential)
}

async function ensureTable(client) {
  try { await client.createTable() } catch { /* already exists */ }
}

// POST /api/subscribe — add subscriber
app.http('subscribe-post', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'subscribe',
  handler: async (request) => {
    try {
      const body = await request.json()
      const email = (body.email || '').trim().toLowerCase()
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { status: 400, jsonBody: { error: 'Please provide a valid email address.' } }
      }
      const client = getClient()
      await ensureTable(client)
      // Check duplicate
      try {
        await client.getEntity('subscribers', Buffer.from(email).toString('base64'))
        return { jsonBody: { message: 'You\'re already subscribed! We\'ll be in touch.' } }
      } catch { /* not found — proceed */ }
      const id = Buffer.from(email).toString('base64')
      await client.createEntity({
        partitionKey: 'subscribers',
        rowKey: id,
        id,
        email,
        createdAt: new Date().toISOString(),
      })
      return { status: 201, jsonBody: { message: 'You\'re subscribed! We\'ll notify you when we launch.' } }
    } catch (err) {
      return { status: 500, jsonBody: { error: err.message } }
    }
  }
})

// GET /api/subscribe — list (admin)
app.http('subscribe-get', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'subscribe',
  handler: async () => {
    try {
      const client = getClient()
      await ensureTable(client)
      const subscribers = []
      for await (const e of client.listEntities()) {
        subscribers.push({ id: e.rowKey, email: e.email, createdAt: e.createdAt })
      }
      subscribers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      return { jsonBody: { subscribers } }
    } catch (err) {
      return { status: 500, jsonBody: { error: err.message } }
    }
  }
})

// GET /api/subscribe/count
app.http('subscribe-count', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'subscribe/count',
  handler: async () => {
    try {
      const client = getClient()
      await ensureTable(client)
      let count = 0
      for await (const _ of client.listEntities()) count++
      return { jsonBody: { count } }
    } catch (err) {
      return { status: 500, jsonBody: { error: err.message } }
    }
  }
})

// DELETE /api/subscribe/{id}
app.http('subscribe-delete', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'subscribe/{id}',
  handler: async (request) => {
    try {
      const id = request.params.id
      const client = getClient()
      await client.deleteEntity('subscribers', id)
      return { jsonBody: { message: 'Removed' } }
    } catch {
      return { status: 404, jsonBody: { error: 'Subscriber not found' } }
    }
  }
})
