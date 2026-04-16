interface MediaSettings {
  audioInput?: string
  videoInput?: string
}

export async function acquireUserMedia(settings: MediaSettings): Promise<MediaStream | undefined> {
  const audioConstraint: MediaTrackConstraints | boolean = settings.audioInput
    ? { deviceId: { ideal: settings.audioInput } }
    : true
  const videoConstraint: MediaTrackConstraints | boolean = settings.videoInput
    ? { deviceId: { ideal: settings.videoInput } }
    : true

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
