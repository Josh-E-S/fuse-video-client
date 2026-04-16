import { pexRTCLoader } from './pexrtcLoader'
import { PexRTCInstance } from '@/types/pexrtc'

export interface ConnectionConfig {
  nodeDomain: string
  conferenceAlias: string
  displayName: string
  pin?: string
  bandwidth?: number
  callType?: string
  registrationToken?: string
  audioOff?: boolean
  videoOff?: boolean
  audioDeviceId?: string
  videoDeviceId?: string
  userMediaStream?: MediaStream
}

export interface ConnectionCallbacks {
  onSetup?: (
    localStream: MediaStream | null,
    pinStatus: string,
    conferenceExtension?: string,
  ) => void
  onConnect?: (remoteStream: MediaStream | null) => void
  onError?: (error: string) => void
  onDisconnect?: (reason: string) => void
  onPresentation?: (setting: boolean, presenter: string, uuid: string) => void
  onPresentationConnected?: (stream: MediaStream) => void
  onPresentationDisconnected?: (reason: string) => void
  onScreenshareConnected?: (stream: MediaStream) => void
  onScreenshareStopped?: (reason: string) => void
  onChatMessage?: (message: any) => void
  onStageUpdate?: (stage: any[]) => void
  onParticipantCreate?: (participant: any) => void
  onParticipantUpdate?: (participant: any) => void
  onParticipantDelete?: (participant: any) => void
}

class PexRTCConnectionManager {
  private static instance: PexRTCConnectionManager
  private pexrtc: PexRTCInstance | null = null
  private isConnecting = false
  private isConnected = false
  private currentConfig: ConnectionConfig | null = null
  private cleanupHandler: (() => void) | null = null

  private constructor() {
    if (typeof window !== 'undefined') {
      this.setupBrowserEventHandlers()
    }
  }

  static getInstance(): PexRTCConnectionManager {
    if (!PexRTCConnectionManager.instance) {
      PexRTCConnectionManager.instance = new PexRTCConnectionManager()
    }

    return PexRTCConnectionManager.instance
  }

  private setupBrowserEventHandlers(): void {
    this.cleanupHandler = () => {
      if (this.isConnected || this.isConnecting) {
        this.forceDisconnect()
      }
    }

    window.addEventListener('beforeunload', this.cleanupHandler)
    window.addEventListener('unload', this.cleanupHandler)
  }

  async connect(config: ConnectionConfig, callbacks: ConnectionCallbacks): Promise<void> {
    if (this.isConnecting) {
      throw new Error('Connection already in progress')
    }

    if (this.isConnected) {
      await this.disconnect('New connection requested')
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    if (this.pexrtc) {
      this.cleanup()
    }

    this.isConnecting = true
    this.currentConfig = config

    try {
      await pexRTCLoader.loadPexRTC(config.nodeDomain)

      this.pexrtc = pexRTCLoader.createInstance()

      this.setupEventHandlers(callbacks)

      // Device selection is handled by passing a pre-acquired user_media_stream
      // from the caller. Do NOT set audio_source/video_source to constraint
      // objects -- PexRTC expects those to be deviceId strings or MediaStreams,
      // and passing objects breaks its internal getUserMedia.

      if (config.registrationToken) {
        this.pexrtc.registration_token = config.registrationToken
        this.pexrtc.oneTimeToken = config.registrationToken
      }

      if (config.userMediaStream) {
        this.pexrtc.user_media_stream = config.userMediaStream
      }

      await this.makeCall(config)
    } catch (error) {
      this.isConnecting = false
      this.cleanup()
      throw error
    }
  }

  private async makeCall(config: ConnectionConfig): Promise<void> {
    if (!this.pexrtc) {
      throw new Error('PexRTC instance not initialized')
    }

    return new Promise((resolve, reject) => {
      const originalOnSetup = this.pexrtc!.onSetup
      const originalOnError = this.pexrtc!.onError

      this.pexrtc!.onSetup = (
        localStream: MediaStream | null,
        pinStatus: string,
        conferenceExtension?: string,
      ) => {
        this.isConnecting = false

        if (originalOnSetup) {
          originalOnSetup(localStream, pinStatus, conferenceExtension)
        }

        if (pinStatus === 'none' || (pinStatus === 'required' && config.pin)) {
          this.completeConnection(config.pin)
        }

        resolve()

        // Restore the persistent error handler so errors after setup still
        // go through the normal disconnect/cleanup path
        if (originalOnError) {
          this.pexrtc!.onError = originalOnError
        }
      }

      this.pexrtc!.onError = (error: string) => {
        this.isConnecting = false

        if (originalOnError) {
          originalOnError(error)
        }

        this.forceDisconnect()

        reject(new Error(error))
      }

      this.pexrtc!.makeCall(config.nodeDomain, config.conferenceAlias, config.displayName)
    })
  }

  completeConnection(pin?: string, extension?: string): void {
    if (!this.pexrtc) {
      throw new Error('PexRTC instance not initialized')
    }

    this.pexrtc.connect(pin, extension)
  }

  private setupEventHandlers(callbacks: ConnectionCallbacks): void {
    if (!this.pexrtc) return

    if (callbacks.onSetup) {
      this.pexrtc.onSetup = callbacks.onSetup
    }
    this.pexrtc.onConnect = (remoteStream: MediaStream | null) => {
      this.isConnected = true

      // Apply initial mute state server-side now that connection is live
      if (this.currentConfig?.audioOff) {
        try {
          this.pexrtc!.muteAudio(true)
        } catch {
          /* ignore */
        }
      }
      if (this.currentConfig?.videoOff) {
        try {
          this.pexrtc!.muteVideo(true)
        } catch {
          /* ignore */
        }
      }

      if (callbacks.onConnect) {
        callbacks.onConnect(remoteStream)
      }
    }
    this.pexrtc.onError = (error: string) => {
      // PIN errors should not tear down the connection, let the user retry
      const isPinError = /invalid pin/i.test(error)
      if (!isPinError) {
        this.forceDisconnect()
      }

      if (callbacks.onError) {
        callbacks.onError(error)
      }
    }
    this.pexrtc.onDisconnect = (reason: string) => {
      this.isConnected = false
      if (callbacks.onDisconnect) {
        callbacks.onDisconnect(reason)
      }
      this.cleanup()
    }

    this.pexrtc.onPresentation = (setting: boolean, presenter: string, uuid: string) => {
      if (setting && this.pexrtc) {
        this.pexrtc.getPresentation()
      }
      if (callbacks.onPresentation) {
        callbacks.onPresentation(setting, presenter, uuid)
      }
    }
    this.pexrtc.onPresentationConnected = callbacks.onPresentationConnected || (() => {})
    this.pexrtc.onPresentationDisconnected = callbacks.onPresentationDisconnected || (() => {})

    this.pexrtc.onScreenshareConnected = callbacks.onScreenshareConnected || (() => {})
    this.pexrtc.onScreenshareStopped = callbacks.onScreenshareStopped || (() => {})

    this.pexrtc.onChatMessage = (message: any) => {
      if (callbacks.onChatMessage) {
        callbacks.onChatMessage(message)
      }
    }

    this.pexrtc.onDirectMessage = (message: any) => {
      if (callbacks.onChatMessage) {
        callbacks.onChatMessage(message)
      }
    }

    this.pexrtc.onApplicationMessage = (message: any) => {
      if (callbacks.onChatMessage) {
        callbacks.onChatMessage(message)
      }
    }

    if (callbacks.onStageUpdate) {
      this.pexrtc.onStageUpdate = callbacks.onStageUpdate
    }
    if (callbacks.onParticipantCreate) {
      this.pexrtc.onParticipantCreate = callbacks.onParticipantCreate
    }
    if (callbacks.onParticipantUpdate) {
      this.pexrtc.onParticipantUpdate = callbacks.onParticipantUpdate
    }
    if (callbacks.onParticipantDelete) {
      this.pexrtc.onParticipantDelete = callbacks.onParticipantDelete
    }
  }

  disconnect(reason?: string): Promise<void> {
    return new Promise((resolve) => {
      if (this.pexrtc) {
        try {
          this.pexrtc.disconnect(reason)
        } catch {
          // ignore disconnect errors
        }
      }
      this.cleanup()
      resolve()
    })
  }

  private forceDisconnect(): void {
    if (this.pexrtc) {
      try {
        this.pexrtc.disconnect()
      } catch {
        // ignore
      }
    }
    this.cleanup()
  }

  private cleanup(): void {
    if (this.pexrtc?.call?.localStream) {
      this.pexrtc.call.localStream.getTracks().forEach((track) => track.stop())
    }

    if (this.pexrtc?.call?.remoteStream) {
      this.pexrtc.call.remoteStream.getTracks().forEach((track) => track.stop())
    }

    if (this.pexrtc?.call?.presentationStream) {
      this.pexrtc.call.presentationStream.getTracks().forEach((track) => track.stop())
    }

    if (this.pexrtc) {
      this.pexrtc.onSetup = () => {}
      this.pexrtc.onConnect = () => {}
      this.pexrtc.onError = () => {}
      this.pexrtc.onDisconnect = () => {}
      this.pexrtc.onPresentation = () => {}
      this.pexrtc.onPresentationConnected = () => {}
      this.pexrtc.onPresentationDisconnected = () => {}
      this.pexrtc.onScreenshareConnected = () => {}
      this.pexrtc.onScreenshareStopped = () => {}
      this.pexrtc.onChatMessage = () => {}
      if (this.pexrtc.onDirectMessage) this.pexrtc.onDirectMessage = () => {}
      if (this.pexrtc.onApplicationMessage) this.pexrtc.onApplicationMessage = () => {}
      if (this.pexrtc.onStageUpdate) this.pexrtc.onStageUpdate = () => {}
      this.pexrtc.onParticipantCreate = () => {}
      this.pexrtc.onParticipantUpdate = () => {}
      this.pexrtc.onParticipantDelete = () => {}
    }

    this.isConnecting = false
    this.isConnected = false
    this.currentConfig = null
    this.pexrtc = null
  }

  muteAudio(mute: boolean): void {
    if (!this.pexrtc || !this.isConnected) {
      throw new Error('Not connected to conference')
    }

    this.pexrtc.muteAudio(mute)
  }

  muteVideo(mute: boolean): void {
    if (!this.pexrtc || !this.isConnected) {
      throw new Error('Not connected to conference')
    }

    this.pexrtc.muteVideo(mute)
  }

  async startScreenShare(stream?: MediaStream): Promise<void> {
    if (!this.pexrtc || !this.isConnected) {
      throw new Error('Not connected to conference')
    }

    if (stream) {
      this.pexrtc.user_presentation_stream = stream
    }
    this.pexrtc.present('screen')
  }

  stopScreenShare(): void {
    if (!this.pexrtc || !this.isConnected) {
      throw new Error('Not connected to conference')
    }
    this.pexrtc.present(null)
  }

  async switchMediaDevices(audioDeviceId?: string, videoDeviceId?: string): Promise<void> {
    if (!this.pexrtc || !this.isConnected) return

    // Stop previous user-provided stream if it exists
    if (this.currentConfig?.userMediaStream) {
      this.currentConfig.userMediaStream.getTracks().forEach((t) => t.stop())
    }

    const audioConstraint = audioDeviceId ? { deviceId: { ideal: audioDeviceId } } : true
    let videoConstraint: boolean | object = true
    if (this.currentConfig?.videoOff) {
      videoConstraint = false
    } else if (videoDeviceId) {
      videoConstraint = { deviceId: { ideal: videoDeviceId } }
    }

    let stream: MediaStream | undefined
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraint,
        video: videoConstraint,
      })
    } catch (err) {
      // Video acquisition failed, try audio-only
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraint, video: false })
      } catch {
        // Both audio+video and audio-only failed
      }
    }

    if (stream) {
      this.pexrtc.user_media_stream = stream
      if (this.currentConfig) {
        this.currentConfig.userMediaStream = stream
      }
    }

    this.pexrtc.renegotiate()
  }

  sendChatMessage(message: string): void {
    if (!this.pexrtc || !this.isConnected) {
      throw new Error('Not connected to conference')
    }
    this.pexrtc.sendChatMessage(message)
  }

  setMessageText(text: string): void {
    if (!this.pexrtc || !this.isConnected) return
    this.pexrtc.setMessageText(text)
  }

  sendDTMF(digits: string): void {
    if (!this.pexrtc || !this.isConnected) return
    this.pexrtc.sendDTMF(digits)
  }

  requestAspectRatio(ratio: number): void {
    if (!this.pexrtc || !this.isConnected) return
    this.pexrtc.requestAspectRatio(ratio)
  }

  getMediaStatistics(): Record<string, unknown> | null {
    if (!this.pexrtc || !this.isConnected) return null
    try {
      return this.pexrtc.getMediaStatistics() as unknown as Record<string, unknown>
    } catch {
      return null
    }
  }

  getInstance(): PexRTCInstance | null {
    return this.pexrtc
  }

  getConnectionStatus(): { isConnecting: boolean; isConnected: boolean } {
    return {
      isConnecting: this.isConnecting,
      isConnected: this.isConnected,
    }
  }
}

export const pexRTCConnectionManager = PexRTCConnectionManager.getInstance()
