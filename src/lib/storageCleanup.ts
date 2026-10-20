// Limpieza del Storage: al borrar un producto, una imagen o la foto de una variante también se
// borra su archivo. Supabase no permite borrar archivos desde SQL (solo con la API de Storage),
// por eso se hace desde aquí. Las políticas de Storage dejan borrar al dueño de la carpeta
// (<id del usuario>/...) y a los superadministradores.
import { supabase } from './supabase'
import type { ImageBucket } from './imageUpload'

const BUCKETS: ImageBucket[] = ['product-images', 'experience-images']

/** Rutas sin vacíos ni repetidos */
export function uniquePaths(paths: (string | null | undefined)[]) {
  return [...new Set(paths.map((p) => p?.trim()).filter((p): p is string => !!p))]
}

/**
 * Borra archivos del Storage. Nunca bloquea lo que el usuario está haciendo: si falla (p. ej. el
 * archivo está en la carpeta de otro usuario) queda en consola y la limpieza de huérfanos lo recoge.
 */
export async function removeStoredFiles(bucket: ImageBucket, paths: (string | null | undefined)[]) {
  const unique = uniquePaths(paths)
  if (unique.length === 0) return
  const { error } = await supabase.storage.from(bucket).remove(unique)
  if (error) console.error(`No se pudieron borrar archivos de ${bucket}:`, error.message)
}

/** Fotos de un producto: galería (images) y fotos de sus variantes */
export async function productStoragePaths(productId: string) {
  const [{ data: images }, { data: variants }] = await Promise.all([
    supabase.from('images').select('storage_path').eq('product_id', productId),
    supabase.from('product_variants').select('image_storage_path').eq('product_id', productId),
  ])
  return uniquePaths([...(images ?? []).map((i) => i.storage_path), ...(variants ?? []).map((v) => v.image_storage_path)])
}

/**
 * Borra un producto y después sus archivos. Si la base no lo borró (error o sin permiso),
 * los archivos se conservan.
 */
export async function deleteProductWithFiles(productId: string) {
  const paths = await productStoragePaths(productId)
  const { data, error } = await supabase.from('products').delete().eq('id', productId).select('id')
  if (error) return { error: error.message }
  if (!data?.length) return { error: 'No tienes permiso para borrar este producto.' }
  await removeStoredFiles('product-images', paths)
  return { error: null }
}

/** Igual que deleteProductWithFiles, para experiencias */
export async function deleteExperienceWithFiles(experienceId: string) {
  const { data: images } = await supabase.from('images').select('storage_path').eq('experience_id', experienceId)
  const { data, error } = await supabase.from('experiences').delete().eq('id', experienceId).select('id')
  if (error) return { error: error.message }
  if (!data?.length) return { error: 'No tienes permiso para borrar esta experiencia.' }
  await removeStoredFiles('experience-images', (images ?? []).map((i) => i.storage_path))
  return { error: null }
}

/** Borra una imagen de la galería de un producto (fila y archivo); si era la principal, pasa a serlo la siguiente */
export async function deleteProductImage(image: { id: string; storage_path: string; is_primary: boolean; product_id: string | null }) {
  const { data, error } = await supabase.from('images').delete().eq('id', image.id).select('id')
  if (error) return { error: error.message }
  if (!data?.length) return { error: 'No tienes permiso para borrar esta imagen.' }
  await removeStoredFiles('product-images', [image.storage_path])
  if (image.is_primary && image.product_id) {
    const { data: next } = await supabase
      .from('images')
      .select('id')
      .eq('product_id', image.product_id)
      .order('sort_order', { ascending: true })
      .limit(1)
    if (next?.[0]) await supabase.from('images').update({ is_primary: true }).eq('id', next[0].id)
  }
  return { error: null }
}

// ─── Huérfanos (superadmin) ──────────────────────────────────────────────────

export interface StoredFile {
  bucket: ImageBucket
  path: string
  createdAt: string | null
}

/**
 * Archivos que ya no usa ningún registro. No se tocan los subidos hace menos de minAgeHours
 * (pueden estar en un formulario abierto que aún no se ha guardado).
 */
export function findOrphans(files: StoredFile[], referenced: Set<string>, now: Date, minAgeHours = 24) {
  const limit = now.getTime() - minAgeHours * 3600 * 1000
  // Sin fecha no se sabe si es reciente: no se borra
  return files.filter((f) => !referenced.has(f.path) && !!f.createdAt && new Date(f.createdAt).getTime() < limit)
}

async function listBucket(bucket: ImageBucket): Promise<StoredFile[]> {
  const files: StoredFile[] = []
  // Raíz: una carpeta por usuario (las entradas sin id son carpetas)
  const { data: root, error } = await supabase.storage.from(bucket).list('', { limit: 1000 })
  if (error) throw new Error(`${bucket}: ${error.message}`)
  for (const entry of root ?? []) {
    if (entry.id) {
      files.push({ bucket, path: entry.name, createdAt: entry.created_at ?? null })
      continue
    }
    for (let offset = 0; ; offset += 1000) {
      const { data, error: listError } = await supabase.storage.from(bucket).list(entry.name, { limit: 1000, offset })
      if (listError) throw new Error(`${bucket}/${entry.name}: ${listError.message}`)
      for (const f of data ?? []) if (f.id) files.push({ bucket, path: `${entry.name}/${f.name}`, createdAt: f.created_at ?? null })
      if (!data || data.length < 1000) break
    }
  }
  return files
}

/**
 * Rutas que usan las imágenes y las variantes guardadas. Se pide por páginas: la API devuelve
 * máximo 1000 filas por consulta y una lista incompleta haría borrar archivos en uso.
 */
async function referencedPaths() {
  const paths: string[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('images').select('storage_path').order('id').range(from, from + 999)
    if (error) throw new Error(error.message)
    paths.push(...(data ?? []).map((i) => i.storage_path))
    if (!data || data.length < 1000) break
  }
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('product_variants')
      .select('image_storage_path')
      .not('image_storage_path', 'is', null)
      .order('id')
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    paths.push(...(data ?? []).map((v) => v.image_storage_path ?? ''))
    if (!data || data.length < 1000) break
  }
  return new Set(uniquePaths(paths))
}

/** Archivos huérfanos de productos y experiencias (solo superadmin puede listarlos todos) */
export async function listOrphanImages(minAgeHours = 24) {
  const [referenced, ...lists] = await Promise.all([referencedPaths(), ...BUCKETS.map(listBucket)])
  return findOrphans(lists.flat(), referenced, new Date(), minAgeHours)
}

/** Borra los huérfanos por bucket; devuelve cuántos se borraron */
export async function removeOrphanImages(orphans: StoredFile[]) {
  let removed = 0
  for (const bucket of BUCKETS) {
    const paths = orphans.filter((o) => o.bucket === bucket).map((o) => o.path)
    for (let i = 0; i < paths.length; i += 100) {
      const { data, error } = await supabase.storage.from(bucket).remove(paths.slice(i, i + 100))
      if (error) throw new Error(`${bucket}: ${error.message}`)
      removed += data?.length ?? 0
    }
  }
  return removed
}
