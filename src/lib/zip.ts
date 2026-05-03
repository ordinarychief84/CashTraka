/**
 * Tiny zero-dependency zip writer (STORE method, no compression).
 *
 * The accountant pack route hands us a small bag of CSV strings, at most a
 * few megabytes for a year of receipts. Pulling in a full deflate library
 * just for that is overkill, and STORE-compressed zip is a fully supported
 * subset of the spec that every consumer (Windows Explorer, Excel, macOS,
 * 7-Zip, Linux unzip) opens without complaint.
 *
 * The format we emit per entry:
 *
 *   1. Local file header     (signature 0x04034b50)
 *   2. Filename              (utf-8)
 *   3. File data             (raw bytes, since method=STORE)
 *
 * Then a central directory at the end:
 *
 *   1. One central-directory file header per entry (signature 0x02014b50)
 *   2. End-of-central-directory record (signature 0x06054b50)
 *
 * CRC32 is computed inline (table-based) so we don't need `zlib`.
 */

const CRC_TABLE: number[] = (() => {
  const table = new Array<number>(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

type ZipEntry = { name: string; data: string | Uint8Array };

/**
 * Build a STORE-method zip from `entries`. Returns a Buffer that can be
 * shipped as `application/zip`.
 */
export function buildZip(entries: ZipEntry[]): Buffer {
  const enc = new TextEncoder();
  // 1980-01-01 00:00:00 in MS-DOS format (date=0x0021, time=0x0000).
  // We don't expose modification times to the user, this is fine.
  const dosTime = 0x0000;
  const dosDate = 0x0021;

  type Prepared = {
    nameBytes: Uint8Array;
    body: Uint8Array;
    crc: number;
    localHeaderOffset: number;
  };

  const prepared: Prepared[] = [];
  const localChunks: Uint8Array[] = [];
  let offset = 0;

  for (const e of entries) {
    const body =
      typeof e.data === 'string' ? enc.encode(e.data) : e.data;
    const nameBytes = enc.encode(e.name);
    const crc = crc32(body);

    // Local file header: 30 bytes + name + body.
    const lh = new Uint8Array(30);
    const dv = new DataView(lh.buffer);
    dv.setUint32(0, 0x04034b50, true); // signature
    dv.setUint16(4, 20, true); // version needed
    dv.setUint16(6, 0x0800, true); // bit 11 = utf-8 names
    dv.setUint16(8, 0, true); // method = STORE
    dv.setUint16(10, dosTime, true);
    dv.setUint16(12, dosDate, true);
    dv.setUint32(14, crc, true);
    dv.setUint32(18, body.length, true); // compressed size
    dv.setUint32(22, body.length, true); // uncompressed size
    dv.setUint16(26, nameBytes.length, true);
    dv.setUint16(28, 0, true); // extra field length

    prepared.push({ nameBytes, body, crc, localHeaderOffset: offset });
    localChunks.push(lh, nameBytes, body);
    offset += lh.length + nameBytes.length + body.length;
  }

  // Central directory.
  const cdChunks: Uint8Array[] = [];
  let cdSize = 0;
  for (const p of prepared) {
    const cd = new Uint8Array(46);
    const dv = new DataView(cd.buffer);
    dv.setUint32(0, 0x02014b50, true); // signature
    dv.setUint16(4, 20, true); // version made by
    dv.setUint16(6, 20, true); // version needed
    dv.setUint16(8, 0x0800, true); // utf-8 names
    dv.setUint16(10, 0, true); // method
    dv.setUint16(12, dosTime, true);
    dv.setUint16(14, dosDate, true);
    dv.setUint32(16, p.crc, true);
    dv.setUint32(20, p.body.length, true);
    dv.setUint32(24, p.body.length, true);
    dv.setUint16(28, p.nameBytes.length, true);
    dv.setUint16(30, 0, true); // extra
    dv.setUint16(32, 0, true); // comment
    dv.setUint16(34, 0, true); // disk number start
    dv.setUint16(36, 0, true); // internal attrs
    dv.setUint32(38, 0, true); // external attrs
    dv.setUint32(42, p.localHeaderOffset, true);
    cdChunks.push(cd, p.nameBytes);
    cdSize += cd.length + p.nameBytes.length;
  }

  // End-of-central-directory record.
  const eocd = new Uint8Array(22);
  const dv = new DataView(eocd.buffer);
  dv.setUint32(0, 0x06054b50, true);
  dv.setUint16(4, 0, true); // disk number
  dv.setUint16(6, 0, true); // disk where CD starts
  dv.setUint16(8, prepared.length, true);
  dv.setUint16(10, prepared.length, true);
  dv.setUint32(12, cdSize, true);
  dv.setUint32(16, offset, true); // CD offset
  dv.setUint16(20, 0, true); // comment length

  const all = [...localChunks, ...cdChunks, eocd];
  const totalLen = all.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(totalLen);
  let pos = 0;
  for (const c of all) {
    out.set(c, pos);
    pos += c.length;
  }
  return Buffer.from(out);
}
