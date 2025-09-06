export function extensionFromMime(mime: string): string {
  if (!mime) return 'bin'
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
  }
  return map[mime] || mime.split('/')[1] || 'bin'
}

export async function measureImage(
  file: File
): Promise<{ width?: number; height?: number }> {
  try {
    const url = URL.createObjectURL(file)
    const img = new Image()
    const dims = await new Promise<{ width: number; height: number }>(
      (resolve, reject) => {
        img.onload = () =>
          resolve({ width: img.naturalWidth, height: img.naturalHeight })
        img.onerror = reject
        img.src = url
      }
    )
    URL.revokeObjectURL(url)
    return dims
  } catch {
    return {}
  }
}
