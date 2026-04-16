export type ResourceType = 'bible' | 'commentary'
export type SplitMode = 1 | 2 | 3
export type ReaderLayout = 'columns' | 'stacked'
export type AppTabKey = 'home' | 'read' | 'resources' | 'notes' | 'more'

export interface Resource {
  id: string
  name: string
  type: ResourceType
}

export interface ManifestBook {
  id: string
  name: string
  chapters: number
}

export interface ManifestTestament {
  id: 'old' | 'new'
  name: string
  books: ManifestBook[]
}

export interface ManifestData {
  resources: Resource[]
  testaments: ManifestTestament[]
}

export interface ChapterTextVerse {
  number: number
  text: string
}

export interface ChapterTextData {
  bookId: string
  chapterNumber: number
  verses: ChapterTextVerse[]
}

export interface ReaderSelection {
  testamentId: string
  bookId: string
  chapterNumber: number
  verseNumber: number
}

export interface ReaderDisplaySettings {
  fontSize: 'sm' | 'md' | 'lg'
  lineHeight: 'normal' | 'relaxed'
  showVerseNumbers: boolean
}

export interface ReaderState {
  selection: ReaderSelection
  splitMode: SplitMode
  layout: ReaderLayout
  isSynced: boolean
  isFocusMode: boolean
  isNavigatorOpen: boolean
  paneResourceIds: [string, string, string]
  paneVerseNumbers: [number, number, number]
  showResourcePanel: boolean
  showSettingsPanel: boolean
  settings: ReaderDisplaySettings
}

export interface Bookmark {
  id: string
  testamentId: string
  bookId: string
  chapterNumber: number
  verseNumber: number
  label: string
  createdAt: number
}

export interface RecentPassage {
  id: string
  testamentId: string
  bookId: string
  chapterNumber: number
  verseNumber: number
  label: string
  lastViewedAt: number
}

export interface AppState {
  activeTab: AppTabKey
  bookmarks: Bookmark[]
  recentPassages: RecentPassage[]
  reader: ReaderState
}