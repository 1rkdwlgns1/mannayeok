import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const PRETENDARD_VERSION = '1.3.9'
const CDN_ROOT = `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v${PRETENDARD_VERSION}`
const SOURCE_URL = `${CDN_ROOT}/dist/web/static/pretendard-dynamic-subset.min.css`
const INCLUDED_WEIGHTS = new Set(['400', '500', '600', '700', '800', '900'])
const EXPECTED_SUBSETS_PER_WEIGHT = 92

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const outputPath = resolve(scriptDirectory, '../src/styles/pretendard-dynamic-subset.css')

const response = await fetch(SOURCE_URL)

if (!response.ok) {
  throw new Error(`Pretendard CSS download failed: ${response.status} ${response.statusText}`)
}

const sourceCss = await response.text()
const fontFaces = sourceCss.match(/@font-face\{[^}]+\}/g) ?? []
const selectedFontFaces = fontFaces.filter((fontFace) => {
  const weight = fontFace.match(/font-weight:(\d+)/)?.[1]
  return weight && INCLUDED_WEIGHTS.has(weight)
})

const expectedCount = INCLUDED_WEIGHTS.size * EXPECTED_SUBSETS_PER_WEIGHT

if (selectedFontFaces.length !== expectedCount) {
  throw new Error(
    `Unexpected Pretendard subset count: expected ${expectedCount}, received ${selectedFontFaces.length}`,
  )
}

const localizedCss = selectedFontFaces
  .map((fontFace) => fontFace.replaceAll('url(../../../packages/', `url(${CDN_ROOT}/packages/`))
  .join('\n')

const header = [
  '/*',
  ` * Pretendard ${PRETENDARD_VERSION} dynamic subset (weights 400-900).`,
  ` * Generated from ${SOURCE_URL}`,
  ' * Font files remain pinned to the official jsDelivr distribution.',
  ' */',
  '',
].join('\n')

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${header}${localizedCss}\n`, 'utf8')

console.log(`Wrote ${selectedFontFaces.length} font-face rules to ${outputPath}`)
