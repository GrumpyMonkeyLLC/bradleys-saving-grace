const { app } = require('@azure/functions')
const { BlobServiceClient, StorageSharedKeyCredential } = require('@azure/storage-blob')
const PDFDocument = require('pdfkit')

function getBlobClient() {
  const account = process.env.AZURE_STORAGE_ACCOUNT_NAME
  const key     = process.env.AZURE_STORAGE_ACCOUNT_KEY
  if (!account || !key) throw new Error('Storage credentials not configured')
  const credential = new StorageSharedKeyCredential(account, key)
  return new BlobServiceClient(`https://${account}.blob.core.windows.net`, credential)
}

async function ensureContainer(containerClient) {
  try { await containerClient.createIfNotExists({ access: 'blob' }) } catch { /* already exists */ }
}

async function fetchPhoto(photoUrl) {
  if (!photoUrl) return null
  try {
    const res = await fetch(photoUrl)
    if (!res.ok) return null
    const arrayBuffer = await res.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch {
    return null
  }
}

function buildFlyer(doc, dog, photoBuffer) {
  const pageWidth = doc.page.width
  const margin = 40
  const contentWidth = pageWidth - margin * 2

  const isStolen = (dog.status || '').toLowerCase() === 'stolen'
  const headline = isStolen ? 'STOLEN DOG' : 'LOST DOG'
  const accent = isStolen ? '#333333' : '#c0392b'

  // Header banner
  doc.rect(0, 0, pageWidth, 90).fill(accent)
  doc.fillColor('#ffffff')
     .font('Helvetica-Bold').fontSize(44)
     .text(headline, margin, 24, { width: contentWidth, align: 'center' })

  let y = 110

  // Dog name
  doc.fillColor('#2b1c10')
     .font('Helvetica-Bold').fontSize(30)
     .text(dog.name || 'Unknown Dog', margin, y, { width: contentWidth, align: 'center' })
  y = doc.y + 12

  // Photo
  if (photoBuffer) {
    const photoSize = 260
    try {
      doc.image(photoBuffer, (pageWidth - photoSize) / 2, y, {
        fit: [photoSize, photoSize],
        align: 'center',
      })
      y += photoSize + 20
    } catch {
      // corrupt/unsupported image data — skip photo, continue with text flyer
    }
  }

  // Details
  const details = [
    ['Breed', dog.breed],
    ['Color / Markings', dog.color],
    ['Size', dog.size],
    ['Age', dog.age],
    ['Last Seen', [dog.city, dog.state].filter(Boolean).join(', ')],
    ['Date Lost', dog.dateLost],
  ].filter(([, v]) => v)

  doc.font('Helvetica').fontSize(13).fillColor('#2b1c10')
  details.forEach(([label, value]) => {
    doc.font('Helvetica-Bold').text(`${label}: `, margin, y, { continued: true, width: contentWidth })
    doc.font('Helvetica').text(value)
    y = doc.y + 4
  })

  y += 16

  // Call to action
  doc.rect(margin, y, contentWidth, 90).fill('#f4ead9')
  doc.fillColor(accent).font('Helvetica-Bold').fontSize(20)
     .text('IF FOUND, PLEASE CALL:', margin, y + 14, { width: contentWidth, align: 'center' })
  doc.fillColor('#2b1c10').font('Helvetica-Bold').fontSize(28)
     .text(dog.phone || 'Contact via Bradley\'s Hugs', margin, y + 42, { width: contentWidth, align: 'center' })

  y += 110
  if (dog.email) {
    doc.font('Helvetica').fontSize(11).fillColor('#5c3d1e')
       .text(dog.email, margin, y, { width: contentWidth, align: 'center' })
    y = doc.y + 10
  }

  // Footer
  doc.font('Helvetica').fontSize(9).fillColor('#8a8a8a')
     .text("Shared by Bradley's Hugs — helping lost and stolen dogs find their way home", margin, doc.page.height - 40, {
       width: contentWidth,
       align: 'center',
     })
}

app.http('generate-flyer', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'generate-flyer',
  handler: async (request) => {
    try {
      const body = await request.json()
      if (!body.name && !body.dogName) {
        return { status: 400, jsonBody: { error: 'Missing dog name' } }
      }

      const dog = {
        name:     body.name || body.dogName,
        breed:    body.breed,
        color:    body.color,
        size:     body.size,
        age:      body.age,
        status:   body.status,
        dateLost: body.dateLost,
        city:     body.city,
        state:    body.state,
        phone:    body.phone,
        email:    body.email,
      }

      const photoBuffer = await fetchPhoto(body.photoUrl)

      const doc = new PDFDocument({ size: 'LETTER', margin: 0 })
      const chunks = []
      const pdfDone = new Promise((resolve, reject) => {
        doc.on('data', chunk => chunks.push(chunk))
        doc.on('end', resolve)
        doc.on('error', reject)
      })

      buildFlyer(doc, dog, photoBuffer)
      doc.end()
      await pdfDone

      const pdfBuffer = Buffer.concat(chunks)

      const blobServiceClient = getBlobClient()
      const containerClient = blobServiceClient.getContainerClient('flyers')
      await ensureContainer(containerClient)

      const dogId = body.dogId || `dog-${Date.now()}`
      const blobName = `${dogId}-flyer.pdf`
      const blockBlobClient = containerClient.getBlockBlobClient(blobName)

      await blockBlobClient.upload(pdfBuffer, pdfBuffer.length, {
        blobHTTPHeaders: { blobContentType: 'application/pdf' }
      })

      return { status: 201, jsonBody: { flyerUrl: blockBlobClient.url } }
    } catch (err) {
      return { status: 500, jsonBody: { error: err.message } }
    }
  }
})
