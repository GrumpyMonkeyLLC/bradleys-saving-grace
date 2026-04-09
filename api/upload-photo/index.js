const { app } = require('@azure/functions')
const { BlobServiceClient, StorageSharedKeyCredential } = require('@azure/storage-blob')

function getBlobClient() {
  const account = process.env.AZURE_STORAGE_ACCOUNT_NAME
  const key     = process.env.AZURE_STORAGE_ACCOUNT_KEY
  if (!account || !key) throw new Error('Storage credentials not configured')
  const credential = new StorageSharedKeyCredential(account, key)
  return new BlobServiceClient(`https://${account}.blob.core.windows.net`, credential)
}

// Parse multipart/form-data manually — Azure Functions v4 doesn't support request.formData()
function parseMultipart(buffer, boundary) {
  const boundaryBuf = Buffer.from('--' + boundary)
  const parts = []
  let start = 0

  while (start < buffer.length) {
    const boundaryIdx = buffer.indexOf(boundaryBuf, start)
    if (boundaryIdx === -1) break

    const headerStart = boundaryIdx + boundaryBuf.length + 2 // skip \r\n
    const headerEnd = buffer.indexOf(Buffer.from('\r\n\r\n'), headerStart)
    if (headerEnd === -1) break

    const headers = buffer.slice(headerStart, headerEnd).toString()
    const dataStart = headerEnd + 4 // skip \r\n\r\n

    const nextBoundary = buffer.indexOf(boundaryBuf, dataStart)
    const dataEnd = nextBoundary === -1 ? buffer.length : nextBoundary - 2 // strip \r\n before boundary

    const data = buffer.slice(dataStart, dataEnd)

    const nameMatch = headers.match(/name="([^"]+)"/)
    const typeMatch = headers.match(/Content-Type:\s*([^\r\n]+)/i)

    if (nameMatch) {
      parts.push({
        name: nameMatch[1],
        contentType: typeMatch ? typeMatch[1].trim() : 'application/octet-stream',
        data
      })
    }

    start = nextBoundary === -1 ? buffer.length : nextBoundary
  }
  return parts
}

app.http('upload-photo', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'upload-photo',
  handler: async (request) => {
    try {
      const contentType = request.headers.get('content-type') || ''

      if (!contentType.includes('multipart/form-data')) {
        return { status: 400, jsonBody: { error: 'Expected multipart/form-data' } }
      }

      // Extract boundary from content-type header
      const boundaryMatch = contentType.match(/boundary=([^\s;]+)/)
      if (!boundaryMatch) {
        return { status: 400, jsonBody: { error: 'Missing multipart boundary' } }
      }
      const boundary = boundaryMatch[1]

      // Read raw body as buffer
      const arrayBuffer = await request.arrayBuffer()

      // Hard size limit: 3MB raw upload max
      if (arrayBuffer.byteLength > 5 * 1024 * 1024) {
        return { status: 400, jsonBody: { error: 'Upload too large. Maximum 3MB.' } }
      }

      const buffer = Buffer.from(arrayBuffer)
      const parts = parseMultipart(buffer, boundary)

      const photoPart = parts.find(p => p.name === 'photo')
      if (!photoPart || !photoPart.data || photoPart.data.length === 0) {
        return { status: 400, jsonBody: { error: 'No photo found in upload' } }
      }

      const imageBuffer = photoPart.data
      const mimeType = photoPart.contentType || 'image/jpeg'

      // Validate MIME type
      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      const safeMime = allowedMimes.includes(mimeType) ? mimeType : 'image/jpeg'

      // Validate magic bytes — reject non-images
      const magic = imageBuffer.slice(0, 4)
      const isJpeg = magic[0] === 0xFF && magic[1] === 0xD8
      const isPng  = magic[0] === 0x89 && magic[1] === 0x50
      const isWebp = imageBuffer.slice(0, 12).toString('latin1').includes('WEBP')
      const isGif  = magic[0] === 0x47 && magic[1] === 0x49

      if (!isJpeg && !isPng && !isWebp && !isGif) {
        return { status: 400, jsonBody: { error: 'File does not appear to be a valid image.' } }
      }

      // Generate unique blob name
      const ext = safeMime.split('/')[1].replace('jpeg', 'jpg')
      const blobName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

      // Upload to Azure Blob Storage
      const blobServiceClient = getBlobClient()
      const containerClient = blobServiceClient.getContainerClient('dog-photos')
      const blockBlobClient = containerClient.getBlockBlobClient(blobName)

      await blockBlobClient.upload(imageBuffer, imageBuffer.length, {
        blobHTTPHeaders: { blobContentType: safeMime }
      })

      return { status: 201, jsonBody: { url: blockBlobClient.url } }

    } catch (err) {
      return { status: 500, jsonBody: { error: err.message } }
    }
  }
})
