import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { BottomTabs } from './components/layout/BottomTabs'
import { ReaderPane } from './components/reader/ReaderPane'
import { ReaderTopBar } from './components/reader/ReaderTopBar'
import { SidebarNavigator } from './components/reader/SidebarNavigator'
import { useLocalStorageState } from './hooks/useLocalStorageState'
import type {
  AppState,
  AppTabKey,
  Bookmark,
  ChapterTextData,
  ManifestBook,
  ManifestData,
  ManifestTestament,
  ReaderSelection,
  RecentPassage,
  Resource,
} from './types/bible'

const STORAGE_KEY = 'bible-study-webapp-state'

const defaultAppState: AppState = {
  activeTab: 'read',
  bookmarks: [],
  recentPassages: [],
  reader: {
    selection: {
      testamentId: 'new',
      bookId: 'john',
      chapterNumber: 1,
      verseNumber: 1,
    },
    splitMode: 2,
    layout: 'columns',
    isSynced: true,
    isFocusMode: false,
    isNavigatorOpen: false,
    paneResourceIds: ['krv', 'easy', 'mcd'],
    paneVerseNumbers: [1, 1, 1],
    showResourcePanel: false,
    showSettingsPanel: false,
    settings: {
      fontSize: 'md',
      lineHeight: 'normal',
      showVerseNumbers: true,
    },
  },
}

function repeatVerse(verseNumber: number): [number, number, number] {
  return [verseNumber, verseNumber, verseNumber]
}

function makePassageId(selection: ReaderSelection) {
  return `${selection.testamentId}:${selection.bookId}:${selection.chapterNumber}:${selection.verseNumber}`
}

function getBookName(manifest: ManifestData, selection: ReaderSelection) {
  const testament =
    manifest.testaments.find((item) => item.id === selection.testamentId) ??
    manifest.testaments[0]

  const book =
    testament.books.find((item) => item.id === selection.bookId) ?? testament.books[0]

  return book.name
}

function buildPassageLabel(manifest: ManifestData, selection: ReaderSelection) {
  const bookName = getBookName(manifest, selection)
  return `${bookName} ${selection.chapterNumber}:${selection.verseNumber}`
}

function SurfaceCard({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="border border-stone-200 bg-white p-6">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {children}
    </section>
  )
}

function normalizeSelection(manifest: ManifestData, selection: ReaderSelection) {
  const testament =
    manifest.testaments.find((item) => item.id === selection.testamentId) ??
    manifest.testaments[0]

  const book =
    testament.books.find((item) => item.id === selection.bookId) ?? testament.books[0]

  const chapterNumber = Math.min(
    Math.max(1, selection.chapterNumber),
    Math.max(1, book.chapters),
  )

  return {
    testamentId: testament.id,
    bookId: book.id,
    chapterNumber,
    verseNumber: Math.max(1, selection.verseNumber),
  }
}

function App() {
  const [manifest, setManifest] = useState<ManifestData | null>(null)
  const [chapterMap, setChapterMap] = useState<Record<string, ChapterTextData>>({})
  const [loading, setLoading] = useState(true)
  const [chapterLoading, setChapterLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [appState, setAppState] = useLocalStorageState<AppState>(
    STORAGE_KEY,
    defaultAppState,
  )

  const bookmarks = appState.bookmarks ?? []
  const recentPassages = appState.recentPassages ?? []

  const [isCompactLayout, setIsCompactLayout] = useState(false)
  useEffect(() => {
    const handleResize = () => {
      setIsCompactLayout(window.innerWidth < 1200)
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    return () => {
     window.removeEventListener('resize', handleResize)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadManifest = async () => {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}data/manifest.json`)

        if (!response.ok) {
          throw new Error('manifest.json을 불러오지 못했습니다.')
        }

        const data = (await response.json()) as ManifestData

        if (!isMounted) return
        setManifest(data)
      } catch (err) {
        if (!isMounted) return
        setError(
          err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.',
        )
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadManifest()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!manifest) return

    setAppState((prev) => ({
      ...prev,
      bookmarks: prev.bookmarks ?? [],
      recentPassages: prev.recentPassages ?? [],
      reader: {
        ...prev.reader,
        selection: normalizeSelection(manifest, prev.reader.selection),
      },
    }))
  }, [manifest, setAppState])

  useEffect(() => {
    if (!manifest) return

    const normalizedSelection = normalizeSelection(manifest, appState.reader.selection)
    const passageId = makePassageId(normalizedSelection)
    const label = buildPassageLabel(manifest, normalizedSelection)

    setAppState((prev) => {
      const prevRecent = prev.recentPassages ?? []

      if (prevRecent[0]?.id === passageId) {
        if (prev.recentPassages) {
          return prev
        }

        return {
          ...prev,
          recentPassages: prevRecent,
        }
      }

      const newRecent: RecentPassage = {
        id: passageId,
        testamentId: normalizedSelection.testamentId,
        bookId: normalizedSelection.bookId,
        chapterNumber: normalizedSelection.chapterNumber,
        verseNumber: normalizedSelection.verseNumber,
        label,
        lastViewedAt: Date.now(),
      }

      return {
        ...prev,
        bookmarks: prev.bookmarks ?? [],
        recentPassages: [
          newRecent,
          ...prevRecent.filter((item) => item.id !== passageId),
        ].slice(0, 20),
      }
    })
  }, [manifest, appState.reader.selection, setAppState])

  useEffect(() => {
    if (!manifest) return

    const selection = normalizeSelection(manifest, appState.reader.selection)
    const resourceIds = Array.from(new Set(appState.reader.paneResourceIds))

    let isMounted = true
    setChapterLoading(true)

    const loadChapters = async () => {
      try {
        const entries = await Promise.all(
          resourceIds.map(async (resourceId) => {
            const path = `${import.meta.env.BASE_URL}data/texts/${resourceId}/${selection.bookId}/${selection.chapterNumber}.json`

            try {
              const response = await fetch(path)

              if (!response.ok) {
                return [
                  resourceId,
                  {
                    bookId: selection.bookId,
                    chapterNumber: selection.chapterNumber,
                    verses: [],
                  } satisfies ChapterTextData,
                ] as const
              }

              const data = (await response.json()) as ChapterTextData
              return [resourceId, data] as const
            } catch {
              return [
                resourceId,
                {
                  bookId: selection.bookId,
                  chapterNumber: selection.chapterNumber,
                  verses: [],
                } satisfies ChapterTextData,
              ] as const
            }
          }),
        )

        if (!isMounted) return
        setChapterMap(Object.fromEntries(entries))
      } finally {
        if (isMounted) {
          setChapterLoading(false)
        }
      }
    }

    loadChapters()

    return () => {
      isMounted = false
    }
  }, [manifest, appState.reader.selection, appState.reader.paneResourceIds])

  const visiblePaneResourceIds = appState.reader.paneResourceIds.slice(
    0,
    appState.reader.splitMode,
  )

  const verseNumbers = useMemo(() => {
    for (const resourceId of visiblePaneResourceIds) {
      const verses = chapterMap[resourceId]?.verses ?? []
      if (verses.length > 0) {
        return verses.map((verse) => verse.number)
      }
    }
    return []
  }, [chapterMap, visiblePaneResourceIds])

  useEffect(() => {
    if (verseNumbers.length === 0) return

    const hasCurrentVerse = verseNumbers.includes(appState.reader.selection.verseNumber)
    if (hasCurrentVerse) return

    const firstVerse = verseNumbers[0]

    setAppState((prev) => ({
      ...prev,
      bookmarks: prev.bookmarks ?? [],
      recentPassages: prev.recentPassages ?? [],
      reader: {
        ...prev.reader,
        selection: {
          ...prev.reader.selection,
          verseNumber: firstVerse,
        },
        paneVerseNumbers: repeatVerse(firstVerse),
      },
    }))
  }, [verseNumbers, appState.reader.selection.verseNumber, setAppState])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f5ef] px-4">
        <div className="border border-stone-200 bg-white px-6 py-5 text-center">
          <p className="text-sm font-medium text-slate-500">Bible Study Webapp</p>
          <p className="mt-2 text-lg font-bold text-slate-900">목차를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error || !manifest) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f5ef] px-4">
        <div className="max-w-md border border-rose-200 bg-white px-6 py-5 text-center">
          <p className="text-sm font-medium text-rose-500">오류</p>
          <p className="mt-2 text-lg font-bold text-slate-900">
            {error ?? '데이터를 불러오지 못했습니다.'}
          </p>
        </div>
      </div>
    )
  }

  const selection = normalizeSelection(manifest, appState.reader.selection)
  const isFocusMode = appState.activeTab === 'read' && appState.reader.isFocusMode
  const isNavigatorOpen = appState.reader.isNavigatorOpen ?? false
  const showDesktopNavigator = !isFocusMode && !isCompactLayout
  const showCompactNavigator = !isFocusMode && isCompactLayout

  const selectedTestament: ManifestTestament =
    manifest.testaments.find((item) => item.id === selection.testamentId) ??
    manifest.testaments[0]

  const selectedBook: ManifestBook =
    selectedTestament.books.find((item) => item.id === selection.bookId) ??
    selectedTestament.books[0]

  const referenceLabel = `${selectedBook.name} ${selection.chapterNumber}:${selection.verseNumber}`

  const paneGridStyle =
    appState.reader.layout === 'columns'
      ? {
          gridTemplateColumns: `repeat(${appState.reader.splitMode}, minmax(0, 1fr))`,
        }
      : {
          gridTemplateRows: `repeat(${appState.reader.splitMode}, minmax(0, 1fr))`,
        }

  const getResourceById = (resourceId: string): Resource =>
    manifest.resources.find((item) => item.id === resourceId) ?? manifest.resources[0]

  const setGlobalSelection = (nextSelection: ReaderSelection) => {
    const normalized = normalizeSelection(manifest, nextSelection)

    setAppState((prev) => ({
      ...prev,
      bookmarks: prev.bookmarks ?? [],
      recentPassages: prev.recentPassages ?? [],
      reader: {
        ...prev.reader,
        selection: normalized,
        paneVerseNumbers: repeatVerse(normalized.verseNumber),
      },
    }))
  }

const handleTestamentChange = (testamentId: string) => {
  const testament =
    manifest.testaments.find((item) => item.id === testamentId) ?? manifest.testaments[0]
  const firstBook = testament.books[0]

  setGlobalSelection({
    testamentId: testament.id,
    bookId: firstBook.id,
    chapterNumber: 1,
    verseNumber: 1,
  })

  closeNavigatorIfCompact()
}

const handleBookChange = (bookId: string) => {
  const book =
    selectedTestament.books.find((item) => item.id === bookId) ?? selectedTestament.books[0]

  setGlobalSelection({
    testamentId: selectedTestament.id,
    bookId: book.id,
    chapterNumber: 1,
    verseNumber: 1,
  })

  closeNavigatorIfCompact()
}

const handleChapterChange = (chapterNumber: number) => {
  setGlobalSelection({
    testamentId: selectedTestament.id,
    bookId: selectedBook.id,
    chapterNumber,
    verseNumber: 1,
  })

  closeNavigatorIfCompact()
}

const handleVerseChange = (verseNumber: number) => {
  setGlobalSelection({
    ...selection,
    verseNumber,
  })

  closeNavigatorIfCompact()
}

  const handlePaneVerseChange = (paneIndex: 0 | 1 | 2, verseNumber: number) => {
    setAppState((prev) => {
      if (prev.reader.isSynced) {
        return {
          ...prev,
          bookmarks: prev.bookmarks ?? [],
          recentPassages: prev.recentPassages ?? [],
          reader: {
            ...prev.reader,
            selection: {
              ...prev.reader.selection,
              verseNumber,
            },
            paneVerseNumbers: repeatVerse(verseNumber),
          },
        }
      }

      const nextPaneVerseNumbers: [number, number, number] = [
        paneIndex === 0 ? verseNumber : prev.reader.paneVerseNumbers[0],
        paneIndex === 1 ? verseNumber : prev.reader.paneVerseNumbers[1],
        paneIndex === 2 ? verseNumber : prev.reader.paneVerseNumbers[2],
      ]

      return {
        ...prev,
        bookmarks: prev.bookmarks ?? [],
        recentPassages: prev.recentPassages ?? [],
        reader: {
          ...prev.reader,
          selection:
            paneIndex === 0
              ? {
                  ...prev.reader.selection,
                  verseNumber,
                }
              : prev.reader.selection,
          paneVerseNumbers: nextPaneVerseNumbers,
        },
      }
    })
  }

  const currentBookmarkId = makePassageId(selection)
  const isBookmarked = bookmarks.some((item) => item.id === currentBookmarkId)

  const handleToggleBookmark = () => {
    setAppState((prev) => {
      const prevBookmarks = prev.bookmarks ?? []
      const bookmarkId = makePassageId(prev.reader.selection)
      const label = buildPassageLabel(manifest, prev.reader.selection)

      const exists = prevBookmarks.some((item) => item.id === bookmarkId)

      if (exists) {
        return {
          ...prev,
          bookmarks: prevBookmarks.filter((item) => item.id !== bookmarkId),
        }
      }

      const newBookmark: Bookmark = {
        id: bookmarkId,
        testamentId: prev.reader.selection.testamentId,
        bookId: prev.reader.selection.bookId,
        chapterNumber: prev.reader.selection.chapterNumber,
        verseNumber: prev.reader.selection.verseNumber,
        label,
        createdAt: Date.now(),
      }

      return {
        ...prev,
        bookmarks: [newBookmark, ...prevBookmarks],
      }
    })
  }

  const handleToggleFocusMode = () => {
    setAppState((prev) => ({
      ...prev,
      bookmarks: prev.bookmarks ?? [],
      recentPassages: prev.recentPassages ?? [],
      activeTab: 'read',
      reader: {
        ...prev.reader,
        isFocusMode: !prev.reader.isFocusMode,
        showResourcePanel: false,
        showSettingsPanel: false,
      },
    }))
  }

const handleToggleNavigator = () => {
  setAppState((prev) => ({
    ...prev,
    bookmarks: prev.bookmarks ?? [],
    recentPassages: prev.recentPassages ?? [],
    reader: {
      ...prev.reader,
      isNavigatorOpen: !(prev.reader.isNavigatorOpen ?? false),
    },
  }))
}

const closeNavigatorIfCompact = () => {
  if (!isCompactLayout) return

  setAppState((prev) => ({
    ...prev,
    bookmarks: prev.bookmarks ?? [],
    recentPassages: prev.recentPassages ?? [],
    reader: {
      ...prev.reader,
      isNavigatorOpen: false,
    },
  }))
}

  const handlePrevChapter = () => {
    if (selection.chapterNumber <= 1) return

    setGlobalSelection({
      ...selection,
      chapterNumber: selection.chapterNumber - 1,
      verseNumber: 1,
    })
  }

  const handleNextChapter = () => {
    if (selection.chapterNumber >= selectedBook.chapters) return

    setGlobalSelection({
      ...selection,
      chapterNumber: selection.chapterNumber + 1,
      verseNumber: 1,
    })
  }

  const handleOpenBookmark = (bookmark: Bookmark) => {
    setAppState((prev) => ({
      ...prev,
      bookmarks: prev.bookmarks ?? [],
      recentPassages: prev.recentPassages ?? [],
      activeTab: 'read',
      reader: {
        ...prev.reader,
        selection: {
          testamentId: bookmark.testamentId,
          bookId: bookmark.bookId,
          chapterNumber: bookmark.chapterNumber,
          verseNumber: bookmark.verseNumber,
        },
        paneVerseNumbers: repeatVerse(bookmark.verseNumber),
      },
    }))
  }

  const handleOpenRecent = (recent: RecentPassage) => {
    setAppState((prev) => ({
      ...prev,
      bookmarks: prev.bookmarks ?? [],
      recentPassages: prev.recentPassages ?? [],
      activeTab: 'read',
      reader: {
        ...prev.reader,
        selection: {
          testamentId: recent.testamentId,
          bookId: recent.bookId,
          chapterNumber: recent.chapterNumber,
          verseNumber: recent.verseNumber,
        },
        paneVerseNumbers: repeatVerse(recent.verseNumber),
      },
    }))
  }

  const handleRemoveBookmark = (bookmarkId: string) => {
    setAppState((prev) => ({
      ...prev,
      bookmarks: (prev.bookmarks ?? []).filter((item) => item.id !== bookmarkId),
      recentPassages: prev.recentPassages ?? [],
    }))
  }

  const handleClearRecentPassages = () => {
    setAppState((prev) => ({
      ...prev,
      bookmarks: prev.bookmarks ?? [],
      recentPassages: [],
    }))
  }

  const renderHomeTab = () => {
    const recentTop5 = recentPassages.slice(0, 5)

    return (
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <SurfaceCard
          title="빠른 시작"
          description="마지막으로 읽던 위치와 현재 레이아웃 정보를 보여줍니다."
        >
          <div className="grid gap-3">
            <div className="bg-stone-50 p-4">
              <p className="text-sm text-slate-500">최근 본문</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{referenceLabel}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="border border-stone-200 p-4">
                <p className="text-sm text-slate-500">분할</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {appState.reader.splitMode}분할
                </p>
              </div>
              <div className="border border-stone-200 p-4">
                <p className="text-sm text-slate-500">레이아웃</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {appState.reader.layout === 'columns' ? '열 보기' : '행 보기'}
                </p>
              </div>
              <div className="border border-stone-200 p-4">
                <p className="text-sm text-slate-500">최근 본문 개수</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {recentPassages.length}개
                </p>
              </div>
            </div>

            <div className="border border-stone-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-semibold text-slate-900">최근 본문 바로가기</p>
                {recentPassages.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearRecentPassages}
                    className="border border-stone-300 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-stone-50"
                  >
                    비우기
                  </button>
                )}
              </div>

              {recentTop5.length === 0 ? (
                <p className="text-sm text-slate-500">아직 최근 본문이 없습니다.</p>
              ) : (
                <div className="grid gap-2">
                  {recentTop5.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleOpenRecent(item)}
                      className="border border-stone-200 px-4 py-3 text-left transition hover:bg-stone-50"
                    >
                      <p className="font-medium text-slate-900">{item.label}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {new Date(item.lastViewedAt).toLocaleString('ko-KR')}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard
          title="앱 개요"
          description="북마크, 최근 본문, 집중 모드를 추가한 버전입니다."
        >
          <div className="space-y-3 text-sm leading-7 text-slate-600">
            <p>• 본문 중심 레이아웃</p>
            <p>• 장별 JSON 동적 로딩</p>
            <p>• 이전 장 / 다음 장 이동</p>
            <p>• 절 단위 북마크</p>
            <p>• 최근 본문 자동 저장</p>
            <p>• 집중 모드</p>
          </div>
        </SurfaceCard>
      </div>
    )
  }

  const renderResourcesTab = () => (
    <div className="grid gap-4 lg:grid-cols-2">
      <SurfaceCard
        title="사용 가능한 자료"
        description="현재 앱에 연결된 자료 목록입니다."
      >
        <div className="grid gap-3">
          {manifest.resources.map((resource) => (
            <div
              key={resource.id}
              className="flex items-center justify-between border border-stone-200 p-4"
            >
              <div>
                <p className="font-semibold text-slate-900">{resource.name}</p>
                <p className="text-sm text-slate-500">
                  {resource.type === 'commentary' ? '주석 자료' : '본문 자료'}
                </p>
              </div>
              <span className="bg-stone-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {resource.id}
              </span>
            </div>
          ))}
        </div>
      </SurfaceCard>

      <SurfaceCard
        title="데이터 구조"
        description="전권 확장을 위한 구조입니다."
      >
        <div className="space-y-3 text-sm leading-7 text-slate-600">
          <p>• `public/data/manifest.json`</p>
          <p>• `public/data/texts/krv/책ID/장번호.json`</p>
          <p>• `public/data/texts/easy/책ID/장번호.json`</p>
          <p>• `public/data/texts/mcd/책ID/장번호.json`</p>
        </div>
      </SurfaceCard>
    </div>
  )

  const renderNotesTab = () => {
    const sortedBookmarks = [...bookmarks].sort((a, b) => b.createdAt - a.createdAt)
    const sortedRecent = [...recentPassages].sort((a, b) => b.lastViewedAt - a.lastViewedAt)

    return (
      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <SurfaceCard
          title="북마크"
          description="개인 묵상용으로 먼저 북마크 흐름을 만듭니다."
        >
          {sortedBookmarks.length === 0 ? (
            <div className="border border-dashed border-stone-300 bg-stone-50 p-6 text-sm leading-7 text-slate-600">
              아직 북마크가 없습니다.
              <br />
              읽기 화면에서 원하는 절을 선택한 뒤 상단의 북마크 버튼을 눌러보세요.
            </div>
          ) : (
            <div className="grid gap-3">
              {sortedBookmarks.map((bookmark) => (
                <div
                  key={bookmark.id}
                  className="flex items-center gap-3 border border-stone-200 p-4"
                >
                  <button
                    type="button"
                    onClick={() => handleOpenBookmark(bookmark)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="font-semibold text-slate-900">{bookmark.label}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {new Date(bookmark.createdAt).toLocaleString('ko-KR')}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemoveBookmark(bookmark.id)}
                    className="border border-stone-300 px-3 py-2 text-sm text-slate-600 transition hover:bg-stone-50"
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard
          title="최근 본문"
          description="읽은 본문이 자동으로 저장됩니다."
        >
          {sortedRecent.length === 0 ? (
            <div className="border border-dashed border-stone-300 bg-stone-50 p-6 text-sm leading-7 text-slate-600">
              아직 최근 본문이 없습니다.
            </div>
          ) : (
            <div className="grid gap-3">
              {sortedRecent.slice(0, 10).map((recent) => (
                <button
                  key={recent.id}
                  type="button"
                  onClick={() => handleOpenRecent(recent)}
                  className="border border-stone-200 px-4 py-4 text-left transition hover:bg-stone-50"
                >
                  <p className="font-semibold text-slate-900">{recent.label}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {new Date(recent.lastViewedAt).toLocaleString('ko-KR')}
                  </p>
                </button>
              ))}
            </div>
          )}
        </SurfaceCard>
      </div>
    )
  }

  const renderMoreTab = () => (
    <div className="grid gap-4 lg:grid-cols-2">
      <SurfaceCard
        title="앱 정보"
        description="현재 빌드 상태 요약입니다."
      >
        <div className="grid gap-3 text-sm text-slate-600">
          <div className="border border-stone-200 p-4">
            <p className="font-semibold text-slate-900">앱 이름</p>
            <p className="mt-1">Bible Study Webapp</p>
          </div>
          <div className="border border-stone-200 p-4">
            <p className="font-semibold text-slate-900">데이터 방식</p>
            <p className="mt-1">manifest + 장별 JSON</p>
          </div>
          <div className="border border-stone-200 p-4">
            <p className="font-semibold text-slate-900">상태 저장</p>
            <p className="mt-1">localStorage</p>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard
        title="현재 저장 상태"
        description="마지막 사용 설정이 브라우저에 저장됩니다."
      >
        <div className="space-y-3 text-sm leading-7 text-slate-600">
          <p>• 현재 탭: {appState.activeTab}</p>
          <p>• 현재 본문: {referenceLabel}</p>
          <p>• 패널 자료: {visiblePaneResourceIds.join(' / ')}</p>
          <p>• 북마크 개수: {bookmarks.length}개</p>
          <p>• 최근 본문 개수: {recentPassages.length}개</p>
          <p>• 집중 모드: {appState.reader.isFocusMode ? 'ON' : 'OFF'}</p>
          <p>• 장 로딩 상태: {chapterLoading ? '불러오는 중' : '완료'}</p>
        </div>
      </SurfaceCard>
    </div>
  )

const renderReadTab = () => (
  <div
    className={[
      'relative h-full min-h-0 bg-white',
      isFocusMode
        ? 'border-0'
        : 'border border-stone-200',
    ].join(' ')}
  >
    <div
      className={[
        'grid h-full min-h-0 bg-white',
        showDesktopNavigator
          ? 'grid-cols-[290px_minmax(0,1fr)]'
          : 'grid-cols-[minmax(0,1fr)]',
      ].join(' ')}
    >
      {showDesktopNavigator && (
        <SidebarNavigator
          testaments={manifest.testaments}
          selection={selection}
          verseNumbers={verseNumbers}
          onTestamentChange={handleTestamentChange}
          onBookChange={handleBookChange}
          onChapterChange={handleChapterChange}
          onVerseChange={handleVerseChange}
        />
      )}

      <section className="flex min-h-0 min-w-0 flex-col bg-white">
        <ReaderTopBar
          referenceLabel={referenceLabel}
          splitMode={appState.reader.splitMode}
          layout={appState.reader.layout}
          isSynced={appState.reader.isSynced}
          isFocusMode={appState.reader.isFocusMode}
          isCompactLayout={isCompactLayout}
          isNavigatorOpen={isNavigatorOpen}
          paneResourceIds={appState.reader.paneResourceIds}
          resources={manifest.resources}
          showResourcePanel={appState.reader.showResourcePanel}
          showSettingsPanel={appState.reader.showSettingsPanel}
          settings={appState.reader.settings}
          canGoPrevChapter={selection.chapterNumber > 1}
          canGoNextChapter={selection.chapterNumber < selectedBook.chapters}
          isBookmarked={isBookmarked}
          onPrevChapter={handlePrevChapter}
          onNextChapter={handleNextChapter}
          onToggleBookmark={handleToggleBookmark}
          onToggleFocusMode={handleToggleFocusMode}
          onToggleNavigator={handleToggleNavigator}
          onSplitModeChange={(mode) =>
            setAppState((prev) => ({
              ...prev,
              bookmarks: prev.bookmarks ?? [],
              recentPassages: prev.recentPassages ?? [],
              reader: {
                ...prev.reader,
                splitMode: mode,
              },
            }))
          }
          onLayoutChange={(layout) =>
            setAppState((prev) => ({
              ...prev,
              bookmarks: prev.bookmarks ?? [],
              recentPassages: prev.recentPassages ?? [],
              reader: {
                ...prev.reader,
                layout,
              },
            }))
          }
          onToggleSync={() =>
            setAppState((prev) => {
              const nextIsSynced = !prev.reader.isSynced
              return {
                ...prev,
                bookmarks: prev.bookmarks ?? [],
                recentPassages: prev.recentPassages ?? [],
                reader: {
                  ...prev.reader,
                  isSynced: nextIsSynced,
                  paneVerseNumbers: nextIsSynced
                    ? repeatVerse(prev.reader.selection.verseNumber)
                    : prev.reader.paneVerseNumbers,
                },
              }
            })
          }
          onToggleResourcePanel={() =>
            setAppState((prev) => ({
              ...prev,
              bookmarks: prev.bookmarks ?? [],
              recentPassages: prev.recentPassages ?? [],
              reader: {
                ...prev.reader,
                showResourcePanel: !prev.reader.showResourcePanel,
                showSettingsPanel: false,
              },
            }))
          }
          onToggleSettingsPanel={() =>
            setAppState((prev) => ({
              ...prev,
              bookmarks: prev.bookmarks ?? [],
              recentPassages: prev.recentPassages ?? [],
              reader: {
                ...prev.reader,
                showSettingsPanel: !prev.reader.showSettingsPanel,
                showResourcePanel: false,
              },
            }))
          }
          onPaneResourceChange={(index, resourceId) =>
            setAppState((prev) => {
              const nextPaneResourceIds = [...prev.reader.paneResourceIds] as [
                string,
                string,
                string,
              ]
              nextPaneResourceIds[index] = resourceId

              return {
                ...prev,
                bookmarks: prev.bookmarks ?? [],
                recentPassages: prev.recentPassages ?? [],
                reader: {
                  ...prev.reader,
                  paneResourceIds: nextPaneResourceIds,
                },
              }
            })
          }
          onSettingsChange={(nextSettings) =>
            setAppState((prev) => ({
              ...prev,
              bookmarks: prev.bookmarks ?? [],
              recentPassages: prev.recentPassages ?? [],
              reader: {
                ...prev.reader,
                settings: {
                  ...prev.reader.settings,
                  ...nextSettings,
                },
              },
            }))
          }
        />

        <div
          className={[
            'grid min-h-0 flex-1 gap-[1px] bg-stone-200',
            isFocusMode ? 'p-0' : '',
          ].join(' ')}
          style={paneGridStyle}
        >
          {visiblePaneResourceIds.map((resourceId, index) => {
            const paneIndex = index as 0 | 1 | 2
            const resource = getResourceById(resourceId)
            const verses = chapterMap[resourceId]?.verses ?? []
            const selectedVerseNumber = appState.reader.isSynced
              ? selection.verseNumber
              : appState.reader.paneVerseNumbers[paneIndex]

            return (
              <div key={`${resource.id}-${paneIndex}`} className="min-h-0 bg-white">
                <ReaderPane
                  resource={resource}
                  verses={verses}
                  selectedVerseNumber={selectedVerseNumber}
                  onSelectVerse={(verseNumber) =>
                    handlePaneVerseChange(paneIndex, verseNumber)
                  }
                  settings={appState.reader.settings}
                />
              </div>
            )
          })}
        </div>
      </section>
    </div>

    {showCompactNavigator && isNavigatorOpen && (
      <>
        <button
          type="button"
          aria-label="탐색 패널 닫기"
          onClick={handleToggleNavigator}
          className="absolute inset-0 z-20 bg-black/30"
        />
        <div className="absolute inset-y-0 left-0 z-30 w-[290px] max-w-[86vw] bg-[#fcfbf7] shadow-2xl">
          <SidebarNavigator
            testaments={manifest.testaments}
            selection={selection}
            verseNumbers={verseNumbers}
            onTestamentChange={handleTestamentChange}
            onBookChange={handleBookChange}
            onChapterChange={handleChapterChange}
            onVerseChange={handleVerseChange}
          />
        </div>
      </>
    )}
  </div>
)

  const renderActiveTab = (tab: AppTabKey) => {
    switch (tab) {
      case 'home':
        return renderHomeTab()
      case 'read':
        return renderReadTab()
      case 'resources':
        return renderResourcesTab()
      case 'notes':
        return renderNotesTab()
      case 'more':
        return renderMoreTab()
      default:
        return renderReadTab()
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f5ef] text-slate-900">
      <div className="mx-auto flex h-screen max-w-[1680px] flex-col">
        {!isFocusMode && (
          <header className="border-b border-stone-200 bg-white">
            <div className="px-6 py-3">
              <div className="flex flex-wrap items-center gap-6">
                <div className="mr-auto">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">
                    Bible Reading
                  </p>
                  <h1 className="mt-1 text-2xl font-bold text-slate-900">
                    Bible Study Webapp
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="border border-stone-300 px-3 py-1.5 text-slate-600">
                    홈
                  </span>
                  <span className="border border-stone-300 bg-stone-50 px-3 py-1.5 font-semibold text-slate-900">
                    성경읽기
                  </span>
                  <span className="border border-stone-300 px-3 py-1.5 text-slate-600">
                    대역읽기
                  </span>
                  <span className="border border-stone-300 px-3 py-1.5 text-slate-600">
                    책선택
                  </span>
                  <span className="border border-stone-300 px-3 py-1.5 text-slate-600">
                    구절비교
                  </span>
                  <span className="border border-stone-300 px-3 py-1.5 text-slate-600">
                    통합검색
                  </span>
                </div>
              </div>
            </div>
          </header>
        )}

        <main className={['min-h-0 flex-1', isFocusMode ? 'p-0' : 'p-4'].join(' ')}>
          {renderActiveTab(appState.activeTab)}
        </main>

        {!isFocusMode && (
          <BottomTabs
            activeTab={appState.activeTab}
            onChange={(tab) =>
              setAppState((prev) => ({
                ...prev,
                bookmarks: prev.bookmarks ?? [],
                recentPassages: prev.recentPassages ?? [],
                activeTab: tab,
              }))
            }
          />
        )}
      </div>
    </div>
  )
}

export default App