export interface PexRTCConfig {
  nodeDomain: string
  conferenceAlias: string
  displayName: string
  bandwidth?: number
  registrationToken?: string
  oneTimeToken?: string
}

export interface PexRTCInstance {
  makeCall: (
    node: string,
    conference: string,
    name: string,
    bandwidth?: number,
    callType?: string,
  ) => void
  connect: (pin?: string, extension?: string) => void
  disconnect: (reason?: string) => void

  muteAudio: (mute: boolean) => void
  muteVideo: (mute: boolean) => void
  setAudioSource: (deviceId: string) => void
  setVideoSource: (deviceId: string) => void

  present: (presentationType: 'screen' | 'window' | null) => void
  getPresentation: () => void

  sendChatMessage: (message: string) => void
  setMessageText: (text: string) => void

  startConferenceRecording: () => void
  stopConferenceRecording: () => void

  sendDTMF: (digits: string) => void
  renegotiate: () => void
  requestAspectRatio: (aspectRatio: number) => void

  getMediaStatistics: () => MediaStatistics

  call?: {
    localStream: MediaStream | null
    remoteStream: MediaStream | null
    presentationStream: MediaStream | null
    mediaStream: MediaStream | null
  }
  screenshare_requested: boolean
  registration_token?: string
  oneTimeToken?: string

  audio_source?: boolean | string | MediaTrackConstraints
  video_source?: boolean | string | MediaTrackConstraints
  user_media_stream?: MediaStream | null
  user_presentation_stream?: MediaStream | null
  h264_enabled?: boolean
  vp9_enabled?: boolean
  default_stun?: string | string[]

  onSetup: (stream: MediaStream | null, pinStatus: string, extension?: string) => void
  onConnect: (stream: MediaStream | null) => void
  onDisconnect: (reason: string) => void
  onError: (error: string) => void
  onPresentation: (setting: boolean, presenter: string, uuid: string, source: string) => void
  onPresentationConnected: (stream: MediaStream) => void
  onPresentationDisconnected: (reason: string) => void
  onScreenshareConnected: (stream: MediaStream) => void
  onScreenshareStopped: (reason: string) => void
  onChatMessage: (message: ChatMessage) => void
  onDirectMessage?: (message: unknown) => void
  onApplicationMessage?: (message: unknown) => void
  onStageUpdate?: (stage: unknown[]) => void
  onParticipantCreate: (participant: Participant) => void
  onParticipantUpdate: (participant: Participant) => void
  onParticipantDelete: (participant: Participant) => void
}

export type PinStatus = 'none' | 'required' | 'optional'

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'pin_required'
  | 'pin_optional'
  | 'error'

export interface MediaStatistics {
  bitrate: {
    audio: { send: number; receive: number }
    video: { send: number; receive: number }
  }
  packetLoss: {
    audio: { send: number; receive: number }
    video: { send: number; receive: number }
  }
  resolution: {
    send: { width: number; height: number }
    receive: { width: number; height: number }
  }
}

export interface ChatMessage {
  origin: string
  uuid: string
  type: string
  payload: string
  timestamp?: number
}

export interface Participant {
  uuid: string
  display_name: string
  role: 'chair' | 'guest'
  is_muted: string
  is_client_muted?: boolean
  is_video_muted: boolean | string
  is_audio_only_call: string
  is_presenting: string
  protocol?: string
  call_direction?: string
  call_tag?: string
  uri?: string
  local_alias?: string
  overlay_text?: string
  is_video_call?: string
  has_media?: boolean
  spotlight?: number
  vendor?: string
  is_external?: boolean
  is_conjoined?: boolean
  is_idp_authenticated?: boolean
  service_type?: string
  buzz_time?: number
  start_time?: number
  encryption?: string
  supports_direct_chat?: boolean
}

export interface ConferenceState {
  connectionState: ConnectionState
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  presentationStream: MediaStream | null
  error: string | null
  participants: Participant[]
  chatMessages: ChatMessage[]
  isAudioMuted: boolean
  isVideoMuted: boolean
  isPresenting: boolean
  statistics: MediaStatistics | null
}

declare global {
  interface Window {
    PexRTC: new () => PexRTCInstance
  }
}
