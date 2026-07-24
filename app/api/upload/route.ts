import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "text/plain",
  "text/csv",
  "application/json",
])

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get("file") as File
    
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File exceeds 10MB limit" }, { status: 400 })
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    
    await mkdir(uploadDir, { recursive: true })
    await writeFile(path.join(uploadDir, fileName), buffer)
    
    const url = `/uploads/${fileName}`

    return NextResponse.json({ 
      url, 
      mimeType: file.type, 
      sizeBytes: file.size 
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
  }
}
