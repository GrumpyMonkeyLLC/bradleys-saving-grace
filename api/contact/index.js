const { app } = require('@azure/functions')
const { TableClient, AzureNamedKeyCredential } = require('@azure/data-tables')

function getClient() {
  const account = process.env.AZURE_STORAGE_ACCOUNT_NAME
  const key     = process.env.AZURE_STORAGE_ACCOUNT_KEY
  const credential = new AzureNamedKeyCredential(account, key)
  return new TableClient(`https://${account}.table.core.windows.net`, 'ContactMessages', credential)
}

async function ensureTable(client) {
  try { await client.createTable() } catch { /* already exists */ }
}

// GET /api/contact — list messages (admin)
app.http('contact-get', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'contact',
  handler: async () => {
    try {
      const client = getClient()
      await ensureTable(client)
      const messages = []
      for await (const e of client.listEntities()) {
        messages.push(entityToMsg(e))
      }
      messages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      return { jsonBody: { messages } }
    } catch (err) {
      return { status: 500, jsonBody: { error: err.message } }
    }
  }
})

// POST /api/contact — submit contact form
app.http('contact-post', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'contact',
  handler: async (request) => {
    try {
      const body = await request.json()
      if (!body.name || !body.email || !body.message) {
        return { status: 400, jsonBody: { error: 'Name, email, and message are required.' } }
      }
      const client = getClient()
      await ensureTable(client)
      const id = `msg-${Date.now()}`
      await client.createEntity({
        partitionKey: 'messages',
        rowKey: id,
        id,
        name:      body.name,
        email:     body.email,
        subject:   body.subject || '',
        phone:     body.phone || '',
        message:   body.message,
        read:      false,
        createdAt: new Date().toISOString(),
      })
      // TODO: send email notification (see SETUP.md for SendGrid/Communication Services)
      return { status: 201, jsonBody: { message: 'Message received! We\'ll get back to you soon.' } }
    } catch (err) {
      return { status: 500, jsonBody: { error: err.message } }
    }
  }
})

// GET /api/contact/{id} — single message
app.http('contact-single-get', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'contact/{id}',
  handler: async (request) => {
    try {
      const id = request.params.id
      const client = getClient()
      const e = await client.getEntity('messages', id)
      return { jsonBody: entityToMsg(e) }
    } catch {
      return { status: 404, jsonBody: { error: 'Message not found' } }
    }
  }
})

// DELETE /api/contact/{id}
app.http('contact-single-delete', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'contact/{id}',
  handler: async (request) => {
    try {
      const id = request.params.id
      const client = getClient()
      await client.deleteEntity('messages', id)
      return { jsonBody: { message: 'Deleted' } }
    } catch {
      return { status: 404, jsonBody: { error: 'Message not found' } }
    }
  }
})

function entityToMsg(e) {
  return { id: e.rowKey, name: e.name, email: e.email, subject: e.subject, phone: e.phone, message: e.message, read: e.read, createdAt: e.createdAt }
}
