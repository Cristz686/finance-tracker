// 生成 PWA 应用图标 PNG 文件
// 纯 Node.js 实现,无外部依赖
// 手写最小 PNG 编码器(支持 RGBA 像素 + zlib 压缩)
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(__dirname, '../public')

// === 最小 PNG 编码器 ===
// 输入:width, height, RGBA 像素数组(Uint8Array,长度 = w*h*4)
// 输出:PNG 文件 Buffer
function encodePng(width, height, rgba) {
  function crc32(buf) {
    let c
    const table = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      c = n
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      }
      table[n] = c
    }
    c = 0xffffffff
    for (let i = 0; i < buf.length; i++) {
      c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
    }
    return (c ^ 0xffffffff) >>> 0
  }

  function chunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii')
    const lenBuf = Buffer.alloc(4)
    lenBuf.writeUInt32BE(data.length, 0)
    const crcBuf = Buffer.alloc(4)
    const crc = crc32(Buffer.concat([typeBuf, data]))
    crcBuf.writeUInt32BE(crc, 0)
    return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
  }

  // PNG 签名
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

  // IHDR
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // 位深度
  ihdr[9] = 6 // 颜色类型:RGBA
  ihdr[10] = 0 // 压缩
  ihdr[11] = 0 // 滤波
  ihdr[12] = 0 // 隔行

  // IDAT:每行前置 filter byte (0 = None)
  const stride = width * 4
  const rawBytes = new Uint8Array((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    rawBytes[y * (stride + 1)] = 0
    for (let i = 0; i < stride; i++) {
      rawBytes[y * (stride + 1) + 1 + i] = rgba[y * stride + i]
    }
  }
  const idatData = deflateSync(Buffer.from(rawBytes))
  const idat = chunk('IDAT', idatData)

  const iend = chunk('IEND', Buffer.alloc(0))

  return Buffer.concat([sig, chunk('IHDR', ihdr), idat, iend])
}

// === 像素绘制工具 ===
function createCanvas(size) {
  return {
    size,
    pixels: new Uint8Array(size * size * 4)
  }
}

function fillRect(canvas, x, y, w, h, r, g, b, a = 255) {
  const { size, pixels } = canvas
  for (let py = y; py < y + h && py < size; py++) {
    for (let px = x; px < x + w && px < size; px++) {
      if (px < 0 || py < 0) continue
      const i = (py * size + px) * 4
      pixels[i] = r
      pixels[i + 1] = g
      pixels[i + 2] = b
      pixels[i + 3] = a
    }
  }
}

// 圆角矩形填充(简单方法:扫描每个像素判断是否在圆角内)
function fillRoundRect(canvas, x, y, w, h, radius, r, g, b, a = 255) {
  const { size, pixels } = canvas
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      if (px < x || px >= x + w || py < y || py >= y + h) continue
      // 判断是否在圆角外
      let inside = true
      const corners = [
        [x + radius, y + radius],
        [x + w - radius, y + radius],
        [x + radius, y + h - radius],
        [x + w - radius, y + h - radius]
      ]
      for (const [cx, cy] of corners) {
        const dx = Math.abs(px - cx)
        const dy = Math.abs(py - cy)
        // 是否在该角的影响区
        if ((px < x + radius || px > x + w - radius - 1) &&
            (py < y + radius || py > y + h - radius - 1)) {
          if (dx * dx + dy * dy > radius * radius) {
            inside = false
            break
          }
        }
      }
      if (inside) {
        const i = (py * size + px) * 4
        pixels[i] = r
        pixels[i + 1] = g
        pixels[i + 2] = b
        pixels[i + 3] = a
      }
    }
  }
}

// 绘制 ¥ 符号(用位图字体方式,简化为几个矩形组合)
function drawYuan(canvas, size, color = [255, 255, 255]) {
  const [r, g, b] = color
  // ¥ 符号简化绘制:用几何图形组合
  // 思路:大写 Y 形 + 横线 + 竖线
  const cx = size / 2
  const top = size * 0.28
  const bottom = size * 0.72
  const mid = size * 0.5
  const strokeW = Math.max(2, Math.round(size * 0.045))

  // 两条斜线(上半部分 Y)
  const leftTop = [size * 0.32, top]
  const rightTop = [size * 0.68, top]
  // 斜线交于中点
  drawLine(canvas, leftTop[0], leftTop[1], cx, mid, strokeW, r, g, b)
  drawLine(canvas, rightTop[0], rightTop[1], cx, mid, strokeW, r, g, b)
  // 竖线(下半部分)
  fillRect(canvas, Math.round(cx - strokeW / 2), Math.round(mid), strokeW, Math.round(bottom - mid), r, g, b)
  // 两条横线
  const y1 = size * 0.45
  const y2 = size * 0.55
  const xL = size * 0.34
  const xR = size * 0.66
  fillRect(canvas, Math.round(xL), Math.round(y1 - strokeW / 2), Math.round(xR - xL), strokeW, r, g, b)
  fillRect(canvas, Math.round(xL), Math.round(y2 - strokeW / 2), Math.round(xR - xL), strokeW, r, g, b)
}

// 画线(Bresenham 简化版,带粗度)
function drawLine(canvas, x0, y0, x1, y1, width, r, g, b) {
  const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0))
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = x0 + (x1 - x0) * t
    const y = y0 + (y1 - y0) * t
    // 画一个 width x width 的方块
    fillRect(canvas, Math.round(x - width / 2), Math.round(y - width / 2), width, width, r, g, b)
  }
}

// === 生成各种图标 ===
function generateIcon(size, { maskable = false, ios = false } = {}) {
  const canvas = createCanvas(size)

  // 背景
  if (ios) {
    // iOS apple-touch-icon:实心方形
    fillRect(canvas, 0, 0, size, size, 0x4b, 0x3f, 0xe3)
  } else if (maskable) {
    // maskable:全填充背景(系统会自动裁圆角)
    fillRect(canvas, 0, 0, size, size, 0x4b, 0x3f, 0xe3)
  } else {
    // 普通:圆角矩形
    const radius = Math.round(size * 0.22)
    fillRoundRect(canvas, 0, 0, size, size, radius, 0x4b, 0x3f, 0xe3)
  }

  // ¥ 符号
  drawYuan(canvas, size)

  return encodePng(size, size, canvas.pixels)
}

const targets = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-512-maskable.png', size: 512, opts: { maskable: true } },
  { name: 'apple-touch-icon.png', size: 180, opts: { ios: true } },
  { name: 'icon-167.png', size: 167 }
]

for (const t of targets) {
  const png = generateIcon(t.size, t.opts || {})
  const outPath = resolve(publicDir, t.name)
  writeFileSync(outPath, png)
  console.log(`✓ 生成 ${t.name} (${t.size}x${t.size})`)
}

console.log('\n所有图标已生成到 public/ 目录')
