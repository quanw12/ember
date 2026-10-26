import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs'

const svg = readFileSync('src/assets/brand/icon.svg', 'utf8')
mkdirSync('public', { recursive: true })

const targets = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180]
]

for (const [file, width] of targets) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: width } })
  writeFileSync(`public/${file}`, resvg.render().asPng())
  console.log(`public/${file} (${width}px)`)
}

copyFileSync('src/assets/brand/icon.svg', 'public/favicon.svg')
console.log('public/favicon.svg')
