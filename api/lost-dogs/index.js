const { app } = require('@azure/functions')
const { TableClient, AzureNamedKeyCredential } = require('@azure/data-tables')

// ─────────────────────────────────────────────
// Azure Table Storage helper
// Set these in Azure Portal → Static Web App → Configuration:
//   AZURE_STORAGE_ACCOUNT_NAME
//   AZURE_STORAGE_ACCOUNT_KEY
// ─────────────────────────────────────────────
function getClient(tableName) {
  const account = process.env.AZURE_STORAGE_ACCOUNT_NAME
  const key     = process.env.AZURE_STORAGE_ACCOUNT_KEY
  if (!account || !key) throw new Error('Storage credentials not configured')
  const credential = new AzureNamedKeyCredential(account, key)
  return new TableClient(`https://${account}.table.core.windows.net`, tableName, credential)
}

async function ensureTable(client) {
  try { await client.createTable() } catch { /* already exists */ }
}

// ─────────────────────────────────────────────
// GET /api/lost-dogs  — list all reports
// GET /api/lost-dogs/stats — summary counts
// ─────────────────────────────────────────────
app.http('lost-dogs-get', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'lost-dogs',
  handler: async (request) => {
    const limit = parseInt(request.query.get('limit') || '50')
    try {
      const client = getClient('LostDogs')
      await ensureTable(client)
      const entities = client.listEntities()
      const dogs = []
      for await (const e of entities) {
        dogs.push(entityToDog(e))
      }
      // Sort newest first
      dogs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      return { jsonBody: { dogs: dogs.slice(0, limit), total: dogs.length } }
    } catch (err) {
      return { status: 500, jsonBody: { error: err.message } }
    }
  }
})

// GET /api/lost-dogs/stats
app.http('lost-dogs-stats', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'lost-dogs/stats',
  handler: async () => {
    try {
      const client = getClient('LostDogs')
      await ensureTable(client)
      const entities = client.listEntities()
      let total = 0, active = 0, reunited = 0, stolen = 0
      for await (const e of entities) {
        total++
        if (e.status === 'Found') reunited++
        else if (e.status === 'Lost') active++
        else if (e.status === 'Stolen') { active++; stolen++ }
      }
      return { jsonBody: { total, active, reunited, stolen } }
    } catch (err) {
      return { status: 500, jsonBody: { error: err.message } }
    }
  }
})

// ─────────────────────────────────────────────
// POST /api/lost-dogs — create a new report
// ─────────────────────────────────────────────
app.http('lost-dogs-post', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'lost-dogs',
  handler: async (request) => {
    try {
      const body = await request.json()
      const required = ['dogName', 'breed', 'color', 'status', 'dateLost', 'city', 'state', 'ownerName', 'phone', 'email']
      for (const field of required) {
        if (!body[field]) return { status: 400, jsonBody: { error: `Missing required field: ${field}` } }
      }
      const client = getClient('LostDogs')
      await ensureTable(client)
      const id = `dog-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const entity = {
        partitionKey: body.state || 'US',
        rowKey: id,
        id,
        name:             body.dogName,
        breed:            body.breed,
        color:            body.color,
        size:             body.size || '',
        age:              body.age || '',
        gender:           body.gender || '',
        microchip:        body.microchip || '',
        description:      body.description || '',
        status:           body.status,
        dateLost:         body.dateLost,
        city:             body.city,
        state:            body.state,
        zip:              body.zip || '',
        lastSeenLocation: body.lastSeenLocation || '',
        ownerName:        body.ownerName,
        phone:            body.phone,
        email:            body.email,
        photoUrl:         body.photoUrl || '',
        createdAt:        new Date().toISOString(),
      }
      await client.createEntity(entity)
      // TODO: send notification email here (see SETUP.md)
      return { status: 201, jsonBody: { id, message: 'Report submitted successfully' } }
    } catch (err) {
      return { status: 500, jsonBody: { error: err.message } }
    }
  }
})

// ─────────────────────────────────────────────
// GET /api/lost-dogs/{id}  — single report
// PUT /api/lost-dogs/{id}  — update status
// DELETE /api/lost-dogs/{id} — delete
// ─────────────────────────────────────────────
app.http('lost-dogs-single', {
  methods: ['GET', 'PUT', 'DELETE'],
  authLevel: 'anonymous',
  route: 'lost-dogs/{id}',
  handler: async (request) => {
    const id = request.params.id
    try {
      const client = getClient('LostDogs')
      await ensureTable(client)

      // Find the entity (we need to scan since we don't know partitionKey)
      let found = null
      for await (const e of client.listEntities()) {
        if (e.rowKey === id || e.id === id) { found = e; break }
      }
      if (!found) return { status: 404, jsonBody: { error: 'Report not found' } }

      if (request.method === 'GET') {
        return { jsonBody: entityToDog(found) }
      }

      if (request.method === 'PUT') {
        const body = await request.json()
        const updated = { ...found, ...body, partitionKey: found.partitionKey, rowKey: found.rowKey }
        await client.updateEntity(updated, 'Replace')
        return { jsonBody: { message: 'Updated' } }
      }

      if (request.method === 'DELETE') {
        await client.deleteEntity(found.partitionKey, found.rowKey)
        return { jsonBody: { message: 'Deleted' } }
      }
    } catch (err) {
      return { status: 500, jsonBody: { error: err.message } }
    }
  }
})

function entityToDog(e) {
  return {
    id:               e.rowKey,
    name:             e.name,
    breed:            e.breed,
    color:            e.color,
    size:             e.size,
    age:              e.age,
    gender:           e.gender,
    microchip:        e.microchip,
    description:      e.description,
    status:           e.status,
    dateLost:         e.dateLost,
    city:             e.city,
    state:            e.state,
    zip:              e.zip,
    lastSeenLocation: e.lastSeenLocation,
    ownerName:        e.ownerName,
    phone:            e.phone,
    email:            e.email,
    photoUrl:         e.photoUrl,
    createdAt:        e.createdAt,
  }
}
