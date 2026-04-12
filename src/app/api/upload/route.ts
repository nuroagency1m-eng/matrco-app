export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'

const IMAGE_MAX_BYTES = 5 * 1024 * 1024    // 5 MB
const VIDEO_MAX_BYTES = 150 * 1024 * 1024  // 150 MB
const AUDIO_MAX_BYTES = 300 * 1024 * 1024  // 300 MB

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/3gpp': '3gp',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/aac': 'aac',
  'audio/x-m4a': 'm4a',
  'audio/mp4': 'm4a',
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) return NextResponse.json({ error: 'No se subió ningún archivo' }, { status: 400 })

    const ext = ALLOWED_TYPES[file.type]
    if (!ext) return NextResponse.json({ error: 'Tipo de archivo no permitido' }, { status: 400 })

    const isVideo = file.type.startsWith('video/')
    const isAudio = file.type.startsWith('audio/')

    if (isAudio && file.size > AUDIO_MAX_BYTES) {
      return NextResponse.json({ error: 'El audio es demasiado pesado. Máximo 300MB.' }, { status: 400 })
    }
    if (isVideo && file.size > VIDEO_MAX_BYTES) {
      return NextResponse.json({ error: 'El video es demasiado pesado. Máximo 150MB.' }, { status: 400 })
    }
    if (!isVideo && !isAudio && file.size > IMAGE_MAX_BYTES) {
      return NextResponse.json({ error: 'La imagen es demasiado pesada. Máximo 5MB.' }, { status: 400 })
    }

    const fileName = `${user.id}/${randomUUID()}.${ext}`
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const { error } = await supabaseAdmin.storage
      .from('uploads')
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '31536000',
        upsert: false,
      })

    if (error) {
      console.error('[SUPABASE STORAGE ERROR]', error)
      return NextResponse.json({ error: error.message || 'Error al subir archivo' }, { status: 500 })
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('uploads')
      .getPublicUrl(fileName)

    return NextResponse.json({ url: publicUrl })
  } catch (err: any) {
    console.error('[POST /api/upload]', err)
    return NextResponse.json({ error: err?.message || 'Error al subir archivo' }, { status: 500 })
  }
}
