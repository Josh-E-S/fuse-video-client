// Patches for browser APIs that lib.dom hasn't caught up to yet. Both are
// real Chromium APIs we depend on, just not yet in the TS standard lib.

interface DocumentPictureInPicture {
  requestWindow(options?: {
    width?: number
    height?: number
    preferInitialWindowPlacement?: boolean
  }): Promise<Window>
}

interface HTMLMediaElement {
  setSinkId?(sinkId: string): Promise<void>
}

interface Window {
  documentPictureInPicture?: DocumentPictureInPicture
}
