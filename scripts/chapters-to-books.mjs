import fs from 'node:fs/promises'
import path from 'node:path'

const rootDir = process.cwd()
const textsDir = path.join(rootDir, 'public', 'data', 'texts')

async function fileExists(targetPath) {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

async function main() {
  const resourceEntries = await fs.readdir(textsDir, { withFileTypes: true })

  for (const resourceEntry of resourceEntries) {
    if (!resourceEntry.isDirectory()) continue

    const resourceId = resourceEntry.name
    const resourceDir = path.join(textsDir, resourceId)
    const bookEntries = await fs.readdir(resourceDir, { withFileTypes: true })

    for (const bookEntry of bookEntries) {
      if (!bookEntry.isDirectory()) continue

      const bookId = bookEntry.name
      const bookDir = path.join(resourceDir, bookId)
      const chapterEntries = await fs.readdir(bookDir, { withFileTypes: true })

      const chapters = []

      for (const chapterEntry of chapterEntries) {
        if (!chapterEntry.isFile()) continue
        if (!chapterEntry.name.endsWith('.json')) continue

        const chapterPath = path.join(bookDir, chapterEntry.name)
        const raw = await fs.readFile(chapterPath, 'utf-8')

        let data

        try {
          data = JSON.parse(raw)
        } catch (error) {
          console.error(`JSON 오류 파일: ${chapterPath}`)
          throw error
        }

        const chapterNumber =
          typeof data.chapterNumber === 'number'
            ? data.chapterNumber
            : Number.parseInt(chapterEntry.name.replace('.json', ''), 10)

        if (!Number.isFinite(chapterNumber)) continue

        chapters.push({
          chapterNumber,
          verses: Array.isArray(data.verses) ? data.verses : [],
        })
      }

      chapters.sort((a, b) => a.chapterNumber - b.chapterNumber)

      const outputPath = path.join(resourceDir, `${bookId}.json`)
      const outputData = {
        bookId,
        chapters,
      }

      await fs.writeFile(outputPath, JSON.stringify(outputData, null, 2), 'utf-8')
      console.log(`created: ${path.relative(rootDir, outputPath)}`)
    }
  }

  console.log('done')
}

const exists = await fileExists(textsDir)

if (!exists) {
  console.error('public/data/texts 폴더를 찾지 못했습니다.')
  process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})