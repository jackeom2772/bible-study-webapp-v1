import fs from 'node:fs/promises'
import path from 'node:path'

const rootDir = process.cwd()
const rawDir = path.join(rootDir, 'raw')
const publicDataDir = path.join(rootDir, 'public', 'data')
const textsDir = path.join(publicDataDir, 'texts')
const manifestPath = path.join(publicDataDir, 'manifest.json')

async function ensureDir(targetPath) {
  await fs.mkdir(targetPath, { recursive: true })
}

async function fileExists(targetPath) {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

function normalizeBook(book) {
  return {
    id: String(book.id),
    name: String(book.name),
    testamentId: book.testamentId === 'old' ? 'old' : 'new',
    chapters: Array.isArray(book.chapters)
      ? book.chapters
          .map((chapter) => ({
            chapterNumber: Number(chapter.chapterNumber),
            verses: Array.isArray(chapter.verses)
              ? chapter.verses.map((verse) => ({
                  number: Number(verse.number),
                  text: String(verse.text ?? ''),
                }))
              : [],
          }))
          .filter((chapter) => Number.isFinite(chapter.chapterNumber))
      : [],
  }
}

async function readMasterFiles() {
  const exists = await fileExists(rawDir)

  if (!exists) {
    throw new Error('raw 폴더를 찾지 못했습니다. 프로젝트 루트에 raw 폴더를 만들어 주세요.')
  }

  const entries = await fs.readdir(rawDir, { withFileTypes: true })
  const masterFiles = entries.filter(
    (entry) => entry.isFile() && entry.name.endsWith('-master.json'),
  )

  if (masterFiles.length === 0) {
    throw new Error('raw 폴더 안에 *-master.json 파일이 없습니다.')
  }

  const masters = []

  for (const entry of masterFiles) {
    const filePath = path.join(rawDir, entry.name)
    const raw = await fs.readFile(filePath, 'utf-8')
    const data = JSON.parse(raw)

    if (!data.resource || !Array.isArray(data.books)) {
      throw new Error(`${entry.name} 형식이 올바르지 않습니다.`)
    }

    masters.push({
      resource: {
        id: String(data.resource.id),
        name: String(data.resource.name),
        type: data.resource.type === 'commentary' ? 'commentary' : 'bible',
      },
      books: data.books.map(normalizeBook),
    })
  }

  return masters
}

function getMaxChapterNumber(book) {
  if (!Array.isArray(book.chapters) || book.chapters.length === 0) {
    return 0
  }

  return Math.max(...book.chapters.map((chapter) => Number(chapter.chapterNumber) || 0))
}

function buildManifestFromMaster(primaryMaster, resources) {
  const oldBooks = primaryMaster.books
    .filter((book) => book.testamentId === 'old')
    .map((book) => ({
      id: book.id,
      name: book.name,
      chapters: getMaxChapterNumber(book),
    }))

  const newBooks = primaryMaster.books
    .filter((book) => book.testamentId === 'new')
    .map((book) => ({
      id: book.id,
      name: book.name,
      chapters: getMaxChapterNumber(book),
    }))

  return {
    resources,
    testaments: [
      {
        id: 'old',
        name: '구약',
        books: oldBooks,
      },
      {
        id: 'new',
        name: '신약',
        books: newBooks,
      },
    ],
  }
}

async function writeBookFiles(master) {
  const resourceDir = path.join(textsDir, master.resource.id)
  await ensureDir(resourceDir)

  for (const book of master.books) {
    const outputPath = path.join(resourceDir, `${book.id}.json`)
    const outputData = {
      bookId: book.id,
      chapters: book.chapters,
    }

    await fs.writeFile(outputPath, JSON.stringify(outputData, null, 2), 'utf-8')
    console.log(`created: ${path.relative(rootDir, outputPath)}`)
  }
}

async function main() {
  await ensureDir(textsDir)

  const masters = await readMasterFiles()

  for (const master of masters) {
    await writeBookFiles(master)
  }

  const resources = masters.map((master) => master.resource)
  const primaryMaster = masters[0]
  const manifest = buildManifestFromMaster(primaryMaster, resources)

  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')
  console.log(`created: ${path.relative(rootDir, manifestPath)}`)

  console.log('done')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})