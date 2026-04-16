export interface MeetingProvider {
  id: string
  label: string
  color: string
  icon: string
}

const PROVIDERS: MeetingProvider[] = [
  {
    id: 'google-meet',
    label: 'Google Meet',
    color: '#34A853',
    icon: '/icons/meeting-providers/google-meet.svg',
  },
  {
    id: 'microsoft-teams',
    label: 'Microsoft Teams',
    color: '#6264A7',
    icon: '/icons/meeting-providers/microsoft-teams.svg',
  },
  { id: 'pexip', label: 'Pexip', color: '#0099FF', icon: '/icons/meeting-providers/pexip.svg' },
  { id: 'zoom', label: 'Zoom', color: '#2D8CFF', icon: '/icons/meeting-providers/zoom.svg' },
  { id: 'webex', label: 'Webex', color: '#00CF4F', icon: '/icons/meeting-providers/webex.svg' },
]

function buildDomainMap(): [string, MeetingProvider][] {
  const map: [string, MeetingProvider][] = []
  const googleDomain = process.env.NEXT_PUBLIC_GOOGLE_DOMAIN?.toLowerCase().trim()
  if (googleDomain) map.push([googleDomain, PROVIDERS[0]])
  const teamsDomain = process.env.NEXT_PUBLIC_TEAMS_DOMAIN?.toLowerCase().trim()
  if (teamsDomain) map.push([teamsDomain, PROVIDERS[1]])
  const pexipDomain = process.env.NEXT_PUBLIC_PEXIP_DOMAIN?.toLowerCase().trim()
  if (pexipDomain) map.push([pexipDomain, PROVIDERS[2]])
  map.push(['zoomcrc.com', PROVIDERS[3]])
  map.push(['webex.com', PROVIDERS[4]])
  return map
}

export function getMeetingProvider(alias: string | null | undefined): MeetingProvider | null {
  if (!alias) return null
  const lower = alias.toLowerCase()
  for (const [domain, provider] of buildDomainMap()) {
    if (lower.includes(domain)) return provider
  }
  return null
}

export function getProviderById(id: string | null | undefined): MeetingProvider | null {
  if (!id) return null
  return PROVIDERS.find((p) => p.id === id) || null
}
