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
