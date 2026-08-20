import { mkdirSync, createWriteStream } from 'node:fs'
import { unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { Writable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { UPLOADS_DIR } from '#helpers/uploads'

const MAX_BYTES = 20 * 1024 * 1024
const TIMEOUT_MS = 10_000
const MAX_REDIRECTS = 3

/** content-type -> extension, for the image types the app already accepts. */
const IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
}

/**
 * Addresses a server-side fetch must never reach: loopback, private LAN ranges,
 * link-local (which includes cloud metadata endpoints such as 169.254.169.254),
 * and carrier-grade NAT space.
 */
function isBlockedAddress(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v6 = ip.toLowerCase()
    if (v6 === '::1' || v6 === '::') return true
    // Unique-local (fc00::/7) and link-local (fe80::/10)
    if (/^f[cd]/.test(v6) || /^fe[89ab]/.test(v6)) return true
    // IPv4-mapped, e.g. ::ffff:127.0.0.1
    const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    if (mapped) return isBlockedAddress(mapped[1])
    return false
  }

  const [a, b] = ip.split('.').map(Number)
  if (a === 127 || a === 0 || a === 10) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 169 && b === 254) return true
  if (a === 100 && b >= 64 && b <= 127) return true
  if (a >= 224) return true
  return false
}

/**
 * Rejects anything that is not a public http(s) address.
 *
 * DNS is resolved here rather than trusting the hostname, so a name that points
 * at an internal address cannot be used to make the server fetch from its own
 * network. Every redirect hop is checked the same way.
 */
async function assertPublicUrl(raw: string): Promise<URL> {
  const url = new URL(raw)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Unsupported protocol: ${url.protocol}`)
  }

  const host = url.hostname.replace(/^\[|\]$/g, '')
  const addresses = isIP(host)
    ? [{ address: host }]
    : await lookup(host, { all: true })

  for (const { address } of addresses) {
    if (isBlockedAddress(address)) {
      throw new Error(`Refusing to fetch a non-public address (${address})`)
    }
  }

  return url
}

/**
 * Downloads a remote image into the uploads directory and returns its local
 * path, so the board no longer depends on the original link staying alive.
 *
 * Returns null when the URL cannot be safely or successfully mirrored; callers
 * fall back to storing the original URL rather than losing the image.
 */
export async function mirrorRemoteImage(rawUrl: string): Promise<string | null> {
  try {
    let target = await assertPublicUrl(rawUrl)
    let response: Response | null = null

    // Follow redirects manually so each hop is re-validated.
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      response = await fetch(target, {
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { accept: 'image/*' },
      })

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location')
        if (!location) break
        target = await assertPublicUrl(new URL(location, target).toString())
        continue
      }
      break
    }

    if (!response?.ok || !response.body) return null

    const contentType = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
    const extension = IMAGE_TYPES[contentType]
    if (!extension) return null

    const declaredLength = Number(response.headers.get('content-length') ?? 0)
    if (declaredLength > MAX_BYTES) return null

    mkdirSync(UPLOADS_DIR, { recursive: true })
    const filename = `${Date.now()}-remote.${extension}`
    const filePath = join(UPLOADS_DIR, filename)

    // Cap the write, since content-length can be absent or untruthful.
    let written = 0
    const sink = createWriteStream(filePath)
    const limiter = new Writable({
      write(chunk, _enc, cb) {
        written += chunk.length
        if (written > MAX_BYTES) return cb(new Error('Remote file exceeds the size limit'))
        sink.write(chunk, cb)
      },
      final(cb) {
        sink.end(cb)
      },
    })

    try {
      await pipeline(response.body as any, limiter)
    } catch (error) {
      await unlink(filePath).catch(() => {})
      throw error
    }

    return `/uploads/${filename}`
  } catch {
    // Mirroring is best-effort: the caller keeps the original URL.
    return null
  }
}
