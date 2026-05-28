export type Song = {
  id: string
  title: string
  body: string
  /**
   * Number the song carried in the legacy printed songbook.
   * Optional — only present for songs that had one. When set, the UI
   * shows it as a chip next to the title.
   */
  songNumber?: number
}
