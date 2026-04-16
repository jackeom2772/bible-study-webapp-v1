import { useMemo, useState } from 'react'
import type { ManifestTestament, ReaderSelection } from '../../types/bible'

interface SidebarNavigatorProps {
  testaments: ManifestTestament[]
  selection: ReaderSelection
  verseNumbers: number[]
  onTestamentChange: (testamentId: string) => void
  onBookChange: (bookId: string) => void
  onChapterChange: (chapterNumber: number) => void
  onVerseChange: (verseNumber: number) => void
}

export function SidebarNavigator({
  testaments,
  selection,
  verseNumbers,
  onTestamentChange,
  onBookChange,
  onChapterChange,
  onVerseChange,
}: SidebarNavigatorProps) {
  const [bookSearch, setBookSearch] = useState('')

  const selectedTestament =
    testaments.find((item) => item.id === selection.testamentId) ?? testaments[0]

  const selectedBook =
    selectedTestament.books.find((item) => item.id === selection.bookId) ??
    selectedTestament.books[0]

  const chapterNumbers = Array.from(
    { length: selectedBook.chapters },
    (_, index) => index + 1,
  )

  const filteredBooks = useMemo(() => {
    const keyword = bookSearch.trim().toLowerCase()

    if (!keyword) {
      return selectedTestament.books
    }

    return selectedTestament.books.filter((book) => {
      const name = book.name.toLowerCase()
      const id = book.id.toLowerCase()
      return name.includes(keyword) || id.includes(keyword)
    })
  }, [bookSearch, selectedTestament.books])

  return (
    <aside className="flex h-full min-h-0 w-[290px] min-w-[270px] flex-col border-r border-stone-200 bg-[#fcfbf7]">
      <div className="border-b border-stone-200 px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
          책 선택
        </p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">본문 탐색</h2>
      </div>

      <div className="border-b border-stone-200 p-4">
        <div className="grid grid-cols-2 gap-2">
          {testaments.map((testament) => {
            const isActive = testament.id === selectedTestament.id

            return (
              <button
                key={testament.id}
                type="button"
                onClick={() => {
                  setBookSearch('')
                  onTestamentChange(testament.id)
                }}
                className={[
                  'px-4 py-3 text-sm font-medium transition',
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700 hover:bg-stone-100',
                ].join(' ')}
              >
                {testament.name}
              </button>
            )
          })}
        </div>
      </div>

      <div className="border-b border-stone-200 p-4">
        <div className="grid gap-3">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">
              검색
            </label>
            <input
              type="text"
              value={bookSearch}
              onChange={(event) => setBookSearch(event.target.value)}
              placeholder="책 이름 검색"
              className="w-full border border-stone-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-stone-400 focus:border-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">
                빠른 책 이동
              </label>
              <select
                value={selection.bookId}
                onChange={(event) => onBookChange(event.target.value)}
                className="w-full border border-stone-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-900"
              >
                {selectedTestament.books.map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">
                빠른 장 이동
              </label>
              <select
                value={selection.chapterNumber}
                onChange={(event) => onChapterChange(Number(event.target.value))}
                className="w-full border border-stone-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-900"
              >
                {chapterNumbers.map((chapterNumber) => (
                  <option key={chapterNumber} value={chapterNumber}>
                    {chapterNumber}장
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-[1.15fr_0.9fr_0.85fr]">
        <section className="flex min-h-0 flex-col border-b border-stone-200">
          <div className="shrink-0 px-5 py-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">책</h3>
              {bookSearch.trim() && (
                <button
                  type="button"
                  onClick={() => setBookSearch('')}
                  className="text-xs text-stone-500 transition hover:text-slate-800"
                >
                  검색 지우기
                </button>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
            {filteredBooks.length === 0 ? (
              <div className="border border-dashed border-stone-300 bg-white px-4 py-4 text-sm text-slate-500">
                검색 결과가 없습니다.
              </div>
            ) : (
              <div className="grid gap-2">
                {filteredBooks.map((book) => {
                  const isActive = book.id === selectedBook.id

                  return (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() => onBookChange(book.id)}
                      className={[
                        'px-4 py-3 text-left text-sm transition',
                        isActive
                          ? 'bg-slate-900 font-semibold text-white'
                          : 'bg-white text-slate-700 hover:bg-stone-100',
                      ].join(' ')}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span>{book.name}</span>
                        <span
                          className={[
                            'text-xs',
                            isActive ? 'text-white/70' : 'text-stone-400',
                          ].join(' ')}
                        >
                          {book.chapters}장
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        <section className="flex min-h-0 flex-col border-b border-stone-200">
          <div className="shrink-0 px-5 py-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">장</h3>
              <p className="text-xs text-stone-400">{selectedBook.chapters}장</p>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
            <div className="grid grid-cols-4 gap-2">
              {chapterNumbers.map((chapterNumber) => {
                const isActive = chapterNumber === selection.chapterNumber

                return (
                  <button
                    key={chapterNumber}
                    type="button"
                    onClick={() => onChapterChange(chapterNumber)}
                    className={[
                      'px-2 py-2 text-sm transition',
                      isActive
                        ? 'bg-slate-900 font-semibold text-white'
                        : 'bg-white text-slate-700 hover:bg-stone-100',
                    ].join(' ')}
                  >
                    {chapterNumber}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        <section className="flex min-h-0 flex-col">
          <div className="shrink-0 px-5 py-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">절</h3>
              <p className="text-xs text-stone-400">{verseNumbers.length}절</p>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
            <div className="grid grid-cols-4 gap-2">
              {verseNumbers.map((verseNumber) => {
                const isActive = verseNumber === selection.verseNumber

                return (
                  <button
                    key={verseNumber}
                    type="button"
                    onClick={() => onVerseChange(verseNumber)}
                    className={[
                      'px-2 py-2 text-sm transition',
                      isActive
                        ? 'bg-slate-900 font-semibold text-white'
                        : 'bg-white text-slate-700 hover:bg-stone-100',
                    ].join(' ')}
                  >
                    {verseNumber}
                  </button>
                )
              })}
            </div>
          </div>
        </section>
      </div>
    </aside>
  )
}