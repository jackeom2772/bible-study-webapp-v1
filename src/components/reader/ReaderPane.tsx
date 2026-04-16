import type {
  ChapterTextVerse,
  ReaderDisplaySettings,
  Resource,
} from '../../types/bible'

interface ReaderPaneProps {
  resource: Resource
  verses: ChapterTextVerse[]
  selectedVerseNumber: number
  onSelectVerse: (verseNumber: number) => void
  settings: ReaderDisplaySettings
}

function getFontSizeClass(size: ReaderDisplaySettings['fontSize']) {
  switch (size) {
    case 'sm':
      return 'text-[15px]'
    case 'lg':
      return 'text-[19px]'
    case 'md':
    default:
      return 'text-[17px]'
  }
}

function getLineHeightClass(lineHeight: ReaderDisplaySettings['lineHeight']) {
  return lineHeight === 'relaxed' ? 'leading-9' : 'leading-8'
}

export function ReaderPane({
  resource,
  verses,
  selectedVerseNumber,
  onSelectVerse,
  settings,
}: ReaderPaneProps) {
  const fontSizeClass = getFontSizeClass(settings.fontSize)
  const lineHeightClass = getLineHeightClass(settings.lineHeight)

  return (
    <section className="flex min-h-0 flex-col border border-stone-200 bg-white">
      <div className="border-b border-stone-200 px-6 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
          {resource.type === 'commentary' ? 'Commentary' : 'Text'}
        </p>
        <h3 className="mt-1 text-xl font-bold text-slate-900">{resource.name}</h3>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <div className="space-y-1">
          {verses.map((verse) => {
            const isSelected = verse.number === selectedVerseNumber

            return (
              <button
                key={verse.number}
                type="button"
                onClick={() => onSelectVerse(verse.number)}
                className={[
                  'block w-full border-l-2 px-4 py-3 text-left transition',
                  isSelected
                    ? 'border-slate-900 bg-stone-50'
                    : 'border-transparent hover:border-stone-300 hover:bg-stone-50/70',
                ].join(' ')}
              >
                <div className="flex items-start gap-3">
                  {settings.showVerseNumbers && (
                    <span className="min-w-[28px] pt-0.5 text-sm font-semibold text-stone-400">
                      {verse.number}
                    </span>
                  )}

                  <p
                    className={[
                      'text-slate-800',
                      fontSizeClass,
                      lineHeightClass,
                      resource.type === 'commentary' ? 'text-slate-700' : '',
                    ].join(' ')}
                  >
                    {verse.text}
                  </p>
                </div>
              </button>
            )
          })}

          {verses.length === 0 && (
            <div className="border border-dashed border-stone-300 px-4 py-6 text-sm text-slate-500">
              이 장에 대한 데이터가 아직 없습니다.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}