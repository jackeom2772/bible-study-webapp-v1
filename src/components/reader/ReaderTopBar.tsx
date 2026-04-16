import type {
  ReaderDisplaySettings,
  ReaderLayout,
  Resource,
  SplitMode,
} from '../../types/bible'

interface ReaderTopBarProps {
  referenceLabel: string
  splitMode: SplitMode
  layout: ReaderLayout
  isSynced: boolean
  isFocusMode: boolean
  isCompactLayout: boolean
  isNavigatorOpen: boolean
  paneResourceIds: [string, string, string]
  resources: Resource[]
  showResourcePanel: boolean
  showSettingsPanel: boolean
  settings: ReaderDisplaySettings
  canGoPrevChapter: boolean
  canGoNextChapter: boolean
  isBookmarked: boolean
  onPrevChapter: () => void
  onNextChapter: () => void
  onToggleBookmark: () => void
  onToggleFocusMode: () => void
  onToggleNavigator: () => void
  onSplitModeChange: (mode: SplitMode) => void
  onLayoutChange: (layout: ReaderLayout) => void
  onToggleSync: () => void
  onToggleResourcePanel: () => void
  onToggleSettingsPanel: () => void
  onPaneResourceChange: (index: 0 | 1 | 2, resourceId: string) => void
  onSettingsChange: (next: Partial<ReaderDisplaySettings>) => void
}

function chipClass(isActive: boolean) {
  return [
    'inline-flex items-center rounded-full border px-3 py-1.5 text-sm transition',
    isActive
      ? 'border-slate-900 bg-slate-900 text-white'
      : 'border-stone-300 bg-white text-slate-700 hover:border-stone-400 hover:bg-stone-50',
  ].join(' ')
}

function navButtonClass(disabled: boolean) {
  return [
    'inline-flex items-center rounded-full border px-3 py-1.5 text-sm transition',
    disabled
      ? 'cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400'
      : 'border-stone-300 bg-white text-slate-700 hover:border-stone-400 hover:bg-stone-50',
  ].join(' ')
}

export function ReaderTopBar({
  referenceLabel,
  splitMode,
  layout,
  isSynced,
  isFocusMode,
  isCompactLayout,
  isNavigatorOpen,
  paneResourceIds,
  resources,
  showResourcePanel,
  showSettingsPanel,
  settings,
  canGoPrevChapter,
  canGoNextChapter,
  isBookmarked,
  onPrevChapter,
  onNextChapter,
  onToggleBookmark,
  onToggleFocusMode,
  onToggleNavigator,
  onSplitModeChange,
  onLayoutChange,
  onToggleSync,
  onToggleResourcePanel,
  onToggleSettingsPanel,
  onPaneResourceChange,
  onSettingsChange,
}: ReaderTopBarProps) {
  return (
    <div className="border-b border-stone-200 bg-white">
      <div className="flex flex-wrap items-center gap-3 px-5 py-4">
        <div className="mr-auto min-w-[220px]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
            Current Passage
          </p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">{referenceLabel}</h2>
        </div>

        {isCompactLayout && !isFocusMode && (
          <button
            type="button"
            onClick={onToggleNavigator}
            className={chipClass(isNavigatorOpen)}
          >
            {isNavigatorOpen ? '탐색 닫기' : '탐색 열기'}
          </button>
        )}

        <button
          type="button"
          onClick={onPrevChapter}
          disabled={!canGoPrevChapter}
          className={navButtonClass(!canGoPrevChapter)}
        >
          이전 장
        </button>

        <button
          type="button"
          onClick={onNextChapter}
          disabled={!canGoNextChapter}
          className={navButtonClass(!canGoNextChapter)}
        >
          다음 장
        </button>

        <button
          type="button"
          onClick={onToggleBookmark}
          className={chipClass(isBookmarked)}
        >
          {isBookmarked ? '북마크됨' : '북마크'}
        </button>

        <button
          type="button"
          onClick={onToggleFocusMode}
          className={chipClass(isFocusMode)}
        >
          {isFocusMode ? '집중 모드 ON' : '집중 모드'}
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-stone-500">분할</span>
          {[1, 2, 3].map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onSplitModeChange(mode as SplitMode)}
              className={chipClass(splitMode === mode)}
            >
              {mode}분할
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-stone-500">레이아웃</span>
          <button
            type="button"
            onClick={() => onLayoutChange('columns')}
            className={chipClass(layout === 'columns')}
          >
            열 보기
          </button>
          <button
            type="button"
            onClick={() => onLayoutChange('stacked')}
            className={chipClass(layout === 'stacked')}
          >
            행 보기
          </button>
        </div>

        <button
          type="button"
          onClick={onToggleSync}
          className={chipClass(isSynced)}
        >
          {isSynced ? '동기화 ON' : '동기화 OFF'}
        </button>

        <button
          type="button"
          onClick={onToggleResourcePanel}
          className={chipClass(showResourcePanel)}
        >
          자료 변경
        </button>

        <button
          type="button"
          onClick={onToggleSettingsPanel}
          className={chipClass(showSettingsPanel)}
        >
          설정
        </button>
      </div>

      {(showResourcePanel || showSettingsPanel) && (
        <div className="grid gap-4 border-t border-stone-200 bg-stone-50 px-5 py-4 lg:grid-cols-2">
          <div className="border border-stone-200 bg-white p-4">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-slate-900">자료 변경</h3>
              <p className="text-sm text-slate-500">
                각 패널에 표시할 본문/주석 자료를 선택합니다.
              </p>
            </div>

            <div className="grid gap-3">
              {([0, 1, 2] as const).map((index) => (
                <label
                  key={index}
                  className="grid gap-2 border border-stone-200 p-3"
                >
                  <span className="text-sm font-medium text-slate-700">
                    패널 {index + 1}
                  </span>
                  <select
                    value={paneResourceIds[index]}
                    onChange={(event) =>
                      onPaneResourceChange(index, event.target.value)
                    }
                    className="border border-stone-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-900"
                  >
                    {resources.map((resource) => (
                      <option key={resource.id} value={resource.id}>
                        {resource.name}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>

          <div className="border border-stone-200 bg-white p-4">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-slate-900">읽기 설정</h3>
              <p className="text-sm text-slate-500">
                글자 크기, 줄 간격, 절 번호 표시를 조정합니다.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">글자 크기</p>
                <div className="flex flex-wrap gap-2">
                  {(['sm', 'md', 'lg'] as const).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => onSettingsChange({ fontSize: size })}
                      className={chipClass(settings.fontSize === size)}
                    >
                      {size === 'sm' ? '작게' : size === 'md' ? '보통' : '크게'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">줄 간격</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onSettingsChange({ lineHeight: 'normal' })}
                    className={chipClass(settings.lineHeight === 'normal')}
                  >
                    기본
                  </button>
                  <button
                    type="button"
                    onClick={() => onSettingsChange({ lineHeight: 'relaxed' })}
                    className={chipClass(settings.lineHeight === 'relaxed')}
                  >
                    넓게
                  </button>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">절 번호</p>
                <button
                  type="button"
                  onClick={() =>
                    onSettingsChange({
                      showVerseNumbers: !settings.showVerseNumbers,
                    })
                  }
                  className={chipClass(settings.showVerseNumbers)}
                >
                  {settings.showVerseNumbers ? '표시 중' : '숨김'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}