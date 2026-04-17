interface MediaSettings {
  audioInput?: string
  videoInput?: string
}

export async function acquireUserMedia(settings: MediaSettings): Promise<MediaStream | undefined> {
  const audioConstraint: MediaTrackConstraints | boolean = settings.audioInput
    ? { deviceId: { ideal: settings.audioInput } }
    : true
  const videoConstraint: MediaTrackConstraints | boolean = settings.videoInput
    ? { deviceId: { exact: settings.videoInput }, width: { ideal: 1920 }, height: { ideal: 1080 } }
    : { width: { ideal: 1920 }, height: { ideal: 1080 } }

  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: audioConstraint,
      video: videoConstraint,
    })
  } catch {
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: audioConstraint,
        video: false,
      })
    } catch {
      return undefined
    }
  }
}
