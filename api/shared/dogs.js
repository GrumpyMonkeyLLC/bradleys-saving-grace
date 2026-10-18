const { TableClient, AzureNamedKeyCredential } = require('@azure/data-tables')

function getDogsTable() {
  const account = process.env.AZURE_STORAGE_ACCOUNT_NAME
  const key     = process.env.AZURE_STORAGE_ACCOUNT_KEY
  if (!account || !key) throw new Error('Storage credentials not configured')
  return new TableClient(`https://${account}.table.core.windows.net`, 'LostDogs', new AzureNamedKeyCredential(account, key))
}

// Reports are partitioned by state, so look one up by its id
async function findDog(client, id) {
  for await (const e of client.listEntities()) {
    if (e.rowKey === id) return e
  }
  return null
}

module.exports = { getDogsTable, findDog }
