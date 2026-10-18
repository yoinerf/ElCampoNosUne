import { supabase } from './supabase'

// Subida de imágenes públicas (product-images, experience-images).
// Los límites coinciden con los del bucket en Supabase, que es quien realmente los aplica.

export type ImageBucket = 'product-images' | 'experience-images'

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
}

export const ACCEPTED_IMAGE_TYPES = Object.keys(EXTENSIONS)
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const MAX_IMAGE_MB = MAX_IMAGE_BYTES / (1024 * 1024)

export function validateImage(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return 'Solo se permiten JPG y PNG'
  if (file.size > MAX_IMAGE_BYTES) return `"${file.name}" supera los ${MAX_IMAGE_MB} MB`
  return null
}

/** Imagen ya subida que un formulario entrega para guardar en public.images */
export interface SavedImage {
  storagePath: string
  imageUrl: string
  isPrimary: boolean
  sortOrder: number
}

type UploadResult = { storagePath: string; publicUrl: string; error?: undefined } | { error: string }

/**
 * Sube la imagen a `<carpeta>/<archivo>`. Por defecto la carpeta es el id del usuario,
 * que es lo que exigen las políticas de Storage para productores y anfitriones.
 * La extensión sale del tipo MIME, no del nombre del archivo.
 */
export async function uploadPublicImage(bucket: ImageBucket, file: File, folder?: string): Promise<UploadResult> {
  const invalid = validateImage(file)
  if (invalid) return { error: invalid }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Debes iniciar sesión para subir imágenes' }

  const storagePath = `${folder ?? user.id}/${Date.now()}-${crypto.randomUUID()}.${EXTENSIONS[file.type]}`
  const { error } = await supabase.storage.from(bucket).upload(storagePath, file, { contentType: file.type, upsert: false })
  if (error) return { error: error.message }

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(storagePath)
  return { storagePath, publicUrl }
}
