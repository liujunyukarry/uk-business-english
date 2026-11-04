// Minimal gzip decoder (RFC 1951 / 1952), after zlib's "puff". Used only by
// browsers without DecompressionStream (iOS Safari before 16.4, e.g. iPhone
// 6s / 7 / SE on iOS 15), so the game still loads its models there.
const LBASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258],
  LEXT = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0],
  DBASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577],
  DEXT = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13],
  ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

// Canonical Huffman table: count of codes per length, symbols by code order.
function table(lengths) {
  const count = new Uint16Array(16),
    offs = new Uint16Array(16),
    symbol = new Uint16Array(lengths.length);
  for (const l of lengths) count[l]++;
  count[0] = 0;
  for (let len = 1; len < 15; len++) offs[len + 1] = offs[len] + count[len];
  for (let s = 0; s < lengths.length; s++) if (lengths[s]) symbol[offs[lengths[s]]++] = s;
  return { count, symbol };
}

function inflate(src, dst) {
  let ip = 0,
    op = 0,
    buf = 0,
    cnt = 0;
  const bits = (n) => {
    while (cnt < n) {
      if (ip >= src.length) throw Error("inflate: unexpected end of data");
      buf |= src[ip++] << cnt;
      cnt += 8;
    }
    const v = buf & ((1 << n) - 1);
    buf >>>= n;
    cnt -= n;
    return v;
  };
  const decode = (t) => {
    let code = 0,
      first = 0,
      index = 0;
    for (let len = 1; len < 16; len++) {
      code |= bits(1);
      const count = t.count[len];
      if (code - count < first) return t.symbol[index + (code - first)];
      index += count;
      first = (first + count) << 1;
      code <<= 1;
    }
    throw Error("inflate: bad code");
  };
  const codes = (lit, dist) => {
    for (;;) {
      let sym = decode(lit);
      if (sym < 256) dst[op++] = sym;
      else if (sym === 256) return;
      else {
        sym -= 257;
        const len = LBASE[sym] + bits(LEXT[sym]),
          d = decode(dist),
          back = DBASE[d] + bits(DEXT[d]);
        for (let i = 0; i < len; i++, op++) dst[op] = dst[op - back];
      }
    }
  };
  let fixed = null,
    last = 0;
  while (!last) {
    last = bits(1);
    const type = bits(2);
    if (type === 0) {
      buf = cnt = 0; // stored block: skip to the byte boundary
      const len = src[ip] | (src[ip + 1] << 8);
      ip += 4;
      dst.set(src.subarray(ip, ip + len), op);
      ip += len;
      op += len;
    } else if (type === 1) {
      if (!fixed) {
        const l = new Uint8Array(288);
        l.fill(8, 0, 144).fill(9, 144, 256).fill(7, 256, 280).fill(8, 280, 288);
        fixed = [table(l), table(new Uint8Array(30).fill(5))];
      }
      codes(fixed[0], fixed[1]);
    } else if (type === 2) {
      const nlen = bits(5) + 257,
        ndist = bits(5) + 1,
        ncode = bits(4) + 4,
        cl = new Uint8Array(19);
      for (let i = 0; i < ncode; i++) cl[ORDER[i]] = bits(3);
      const clt = table(cl),
        lengths = new Uint8Array(nlen + ndist);
      for (let i = 0; i < nlen + ndist; ) {
        const sym = decode(clt);
        if (sym < 16) lengths[i++] = sym;
        else {
          let len = 0,
            rep;
          if (sym === 16) {
            if (!i) throw Error("inflate: repeat with no length");
            len = lengths[i - 1];
            rep = 3 + bits(2);
          } else rep = sym === 17 ? 3 + bits(3) : 11 + bits(7);
          while (rep--) lengths[i++] = len;
        }
      }
      codes(table(lengths.subarray(0, nlen)), table(lengths.subarray(nlen)));
    } else throw Error("inflate: bad block type");
  }
  return op;
}

// Decompress a whole .gz file (one member) to bytes.
export function gunzip(bytes) {
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b || bytes[2] !== 8) throw Error("gunzip: not gzip data");
  const flags = bytes[3];
  let p = 10;
  if (flags & 4) p += 2 + (bytes[p] | (bytes[p + 1] << 8));
  if (flags & 8) while (bytes[p++]);
  if (flags & 16) while (bytes[p++]);
  if (flags & 2) p += 2;
  const n = bytes.length,
    size = (bytes[n - 4] | (bytes[n - 3] << 8) | (bytes[n - 2] << 16) | (bytes[n - 1] << 24)) >>> 0,
    out = new Uint8Array(size);
  const used = inflate(bytes.subarray(p, n - 8), out);
  if (used !== size) throw Error("gunzip: size mismatch");
  return out;
}
