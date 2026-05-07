// Acquire camera + microphone, with an automatic audio-only fallback if the
// camera fails. Common reason: camera is in use by another app (Zoom, Teams,
// browser tab). We don't want a dropped video device to block the call —
// joining audio-only is better than failing to join.

import { log } from '@/utils/logger'

interface MediaSettings {
  audioInput?: string
  videoInput?: string
}

export async function acquireUserMedia(settings: MediaSettings): Promise<MediaStream | undefined> {
  const audioConstraint: MediaTrackConstraints | boolean = settings.audioInput
    ? { deviceId: { ideal: settings.audioInput } }
    : true
  const videoConstraint: MediaTrackConstraints | boolean = settings.videoInput
    ? { deviceId: { ideal: settings.videoInput }, width: { ideal: 1920 }, height: { ideal: 1080 } }
    : { width: { ideal: 1920 }, height: { ideal: 1080 } }

  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: audioConstraint,
      video: videoConstraint,
    })
  } catch {
    log.media.warn('getUserMedia with video failed, trying audio-only fallback')
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: audioConstraint,
        video: false,
      })
    } catch {
      log.media.warn('Audio-only getUserMedia fallback also failed')
      return undefined
    }
  }
}
