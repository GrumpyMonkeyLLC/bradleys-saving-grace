const { app } = require('@azure/functions')
const { BlobServiceClient, StorageSharedKeyCredential } = require('@azure/storage-blob')

function getBlobClient() {
  const account = process.env.AZURE_STORAGE_ACCOUNT_NAME
  const key     = process.env.AZURE_STORAGE_ACCOUNT_KEY
  if (!account || !key) throw new Error('Storage credentials not configured')
  const credential = new StorageSharedKeyCredential(account, key)
  return new BlobServiceClient(`https://${account}.blob.core.windows.net`, credential)
}

// POST /api/upload-photo
// Accepts: multipart form data with a single 'photo' field
// Returns: { url: 'https://...' }
app.http('upload-photo', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'upload-photo',
  handler: async (request) => {
    try {
      const contentType = request.headers.get('content-type') || ''

      // Must be multipart or octet-stream
      if (!contentType.includes('multipart/form-data') && !contentType.includes('application/octet-stream')) {
        return { status: 400, jsonBody: { error: 'Expected multipart/form-data or application/octet-stream' } }
      }

      let imageBuffer
      let mimeType = 'image/jpeg'
      let originalName = `photo-${Date.now()}.jpg`

      if (contentType.includes('multipart/form-data')) {
        // Parse multipart form
        const formData = await request.formData()
        const file = formData.get('photo')
        if (!file) return { status: 400, jsonBody: { error: 'No photo field in form data' } }

        // Hard limit: 2MB
        const arrayBuffer = await file.arrayBuffer()
        if (arrayBuffer.byteLength > 2 * 1024 * 1024) {
          return { status: 400, jsonBody: { error: 'Photo must be under 2MB. Please compress before uploading.' } }
        }

        imageBuffer = Buffer.from(arrayBuffer)
        mimeType = file.type || 'image/jpeg'
        originalName = file.name || originalName

      } else {
        // Raw binary upload
        const arrayBuffer = await request.arrayBuffer()
        if (arrayBuffer.byteLength > 2 * 1024 * 1024) {
          return { status: 400, jsonBody: { error: 'Photo must be under 2MB.' } }
        }
        imageBuffer = Buffer.from(arrayBuffer)
        mimeType = contentType
      }

      // Validate it's actually an image by checking magic bytes
      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      if (!allowedMimes.includes(mimeType)) {
        return { status: 400, jsonBody: { error: 'Only JPG, PNG, WEBP, and GIF images are allowed.' } }
      }

      // Check magic bytes (first few bytes of file)
      const magicBytes = imageBuffer.slice(0, 4)
      const isJpeg = magicBytes[0] === 0xFF && magicBytes[1] === 0xD8
      const isPng  = magicBytes[0] === 0x89 && magicBytes[1] === 0x50
      const isWebp = imageBuffer.slice(0, 12).toString('ascii').includes('WEBP')
      const isGif  = magicBytes[0] === 0x47 && magicBytes[1] === 0x49

      if (!isJpeg && !isPng && !isWebp && !isGif) {
        return { status: 400, jsonBody: { error: 'File does not appear to be a valid image.' } }
      }

      // Generate unique filename
      const ext = mimeType.split('/')[1].replace('jpeg', 'jpg')
      const blobName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

      // Upload to Blob Storage
      const blobServiceClient = getBlobClient()
      const containerClient = blobServiceClient.getContainerClient('dog-photos')
      const blockBlobClient = containerClient.getBlockBlobClient(blobName)

      await blockBlobClient.upload(imageBuffer, imageBuffer.length, {
        blobHTTPHeaders: { blobContentType: mimeType }
      })

      const url = blockBlobClient.url

      return { status: 201, jsonBody: { url } }

    } catch (err) {
      return { status: 500, jsonBody: { error: err.message } }
    }
  }
})
