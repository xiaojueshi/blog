import { inflateRawSync } from 'node:zlib'
const crcTable = Uint32Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
function crc32(data: Buffer): number { let crc = 0xffffffff; for (const byte of data) crc = crcTable[(crc ^ byte) & 255]! ^ (crc >>> 8); return (crc ^ 0xffffffff) >>> 0 }
/** 生成标准无压缩 ZIP，保留 UTF-8 文件名并避免额外平台依赖。
 * @param files 文件路径与原始数据。
 * @returns ZIP 字节。
 * @throws 总大小超限时抛出错误。
 */
export function zipFiles(files: { name: string; data: Buffer }[]): Buffer {
  const local: Buffer[] = []; const central: Buffer[] = []; let offset = 0
  if (files.length > 60000) throw new Error('导出文件数量超过限制')
  for (const file of files) {
    if (file.name.startsWith('/') || file.name.includes('..') || file.name.includes('\\')) throw new Error('归档路径不安全')
    const name = Buffer.from(file.name); const crc = crc32(file.data); const head = Buffer.alloc(30)
    head.writeUInt32LE(0x04034b50); head.writeUInt16LE(20, 4); head.writeUInt16LE(0x800, 6); head.writeUInt32LE(crc, 14); head.writeUInt32LE(file.data.length, 18); head.writeUInt32LE(file.data.length, 22); head.writeUInt16LE(name.length, 26)
    local.push(head, name, file.data)
    const index = Buffer.alloc(46); index.writeUInt32LE(0x02014b50); index.writeUInt16LE(20, 4); index.writeUInt16LE(20, 6); index.writeUInt16LE(0x800, 8); index.writeUInt32LE(crc, 16); index.writeUInt32LE(file.data.length, 20); index.writeUInt32LE(file.data.length, 24); index.writeUInt16LE(name.length, 28); index.writeUInt32LE(offset, 42); central.push(index, name)
    offset += head.length + name.length + file.data.length
    if (offset > 100 * 1024 * 1024) throw new Error('导出包超过 100MB，请分批导出')
  }
  const directory = Buffer.concat(central); const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16)
  return Buffer.concat([...local, directory, end])
}
/** 读取导出 ZIP 中的恢复清单，校验压缩方式、大小与 CRC。
 * @param zip ZIP 字节。
 * @returns 解析前的清单文本。
 * @throws 归档损坏、路径危险或大小超限时抛出错误。
 */
export function readZipManifest(zip: Buffer): string {
  if (zip.length > 100 * 1024 * 1024 || zip.length < 22) throw new Error('ZIP 最大 100MB，或文件不完整')
  let end = zip.length - 22
  while (end >= Math.max(0, zip.length - 65557) && zip.readUInt32LE(end) !== 0x06054b50) end--
  if (end < 0 || zip.readUInt32LE(end) !== 0x06054b50) throw new Error('ZIP 目录无效')
  const count = zip.readUInt16LE(end + 10); let position = zip.readUInt32LE(end + 16)
  if (count > 60000) throw new Error('ZIP 文件数量过多')
  for (let i = 0; i < count; i++) {
    if (position + 46 > zip.length || zip.readUInt32LE(position) !== 0x02014b50) throw new Error('ZIP 目录损坏')
    const nameLength = zip.readUInt16LE(position + 28); const extra = zip.readUInt16LE(position + 30); const comment = zip.readUInt16LE(position + 32)
    if (position + 46 + nameLength + extra + comment > zip.length) throw new Error('ZIP 路径无效')
    const name = zip.subarray(position + 46, position + 46 + nameLength).toString('utf8')
    if (name.startsWith('/') || name.includes('..') || name.includes('\\')) throw new Error('ZIP 路径不安全')
    if (name === 'backup.json') {
      const size = zip.readUInt32LE(position + 24); const compressed = zip.readUInt32LE(position + 20); const method = zip.readUInt16LE(position + 10); const local = zip.readUInt32LE(position + 42)
      if (zip.readUInt16LE(position + 8) & 1 || size > 100 * 1024 * 1024 || local + 30 > zip.length || zip.readUInt32LE(local) !== 0x04034b50) throw new Error('ZIP 清单无效或超过限制')
      const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28)
      if (start + compressed > zip.length) throw new Error('ZIP 内容不完整')
      const data = zip.subarray(start, start + compressed)
      const result = method === 0 ? data : method === 8 ? inflateRawSync(data, { maxOutputLength: 100 * 1024 * 1024 }) : null
      if (!result || result.length !== size || crc32(result) !== zip.readUInt32LE(position + 16)) throw new Error('ZIP 校验失败')
      return result.toString('utf8')
    }
    position += 46 + nameLength + extra + comment
  }
  throw new Error('此 ZIP 不包含本站的 backup.json 恢复清单')
}
