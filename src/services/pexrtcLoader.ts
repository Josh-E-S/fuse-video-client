import { PexRTCInstance } from '@/types/pexrtc'

interface LoaderOptions {
  timeout?: number
  retries?: number
}

class PexRTCLoader {
  private static instance: PexRTCLoader
  private loadPromise: Promise<void> | null = null
  private isLoaded = false

  private constructor() {}

  static getInstance(): PexRTCLoader {
    if (!PexRTCLoader.instance) {
      PexRTCLoader.instance = new PexRTCLoader()
    }

    return PexRTCLoader.instance
  }

  async loadPexRTC(nodeDomain: string, options: LoaderOptions = {}): Promise<void> {
    if (this.loadPromise) {
      return this.loadPromise
    }

    if (this.isLoaded && window.PexRTC) {
      return Promise.resolve()
    }

    const { timeout = 30000, retries = 3 } = options

    this.loadPromise = this.loadWithRetries(nodeDomain, timeout, retries)

    try {
      await this.loadPromise
      this.isLoaded = true
    } catch (error) {
      this.loadPromise = null
      throw error
    }

    return this.loadPromise
  }

  private async loadWithRetries(
    nodeDomain: string,
    timeout: number,
    retries: number,
  ): Promise<void> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        await this.loadScript(nodeDomain, timeout)
        return
      } catch (error) {
        lastError = error as Error
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)))
        }
      }
    }

    throw lastError || new Error('Failed to load PexRTC library')
  }

  private loadScript(nodeDomain: string, timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.PexRTC) {
        resolve()
        return
      }

      const script = document.createElement('script')
      script.src = `https://${nodeDomain}/static/webrtc/js/pexrtc.js`
      script.async = true

      const timeoutId = setTimeout(() => {
        script.remove()
        reject(new Error(`Timeout loading PexRTC from ${nodeDomain}`))
      }, timeout)

      script.onload = () => {
        clearTimeout(timeoutId)
        if (window.PexRTC) {
          resolve()
        } else {
          reject(new Error('PexRTC not available after script load'))
        }
      }

      script.onerror = () => {
        clearTimeout(timeoutId)
        script.remove()
        reject(new Error(`Failed to load PexRTC from ${nodeDomain}`))
      }

      document.head.appendChild(script)
    })
  }

  createInstance(): PexRTCInstance {
    if (!window.PexRTC) {
      throw new Error('PexRTC library not loaded. Call loadPexRTC first.')
    }

    return new window.PexRTC() as PexRTCInstance
  }

  isLibraryLoaded(): boolean {
    return this.isLoaded && !!window.PexRTC
  }

  reset(): void {
    this.loadPromise = null
    this.isLoaded = false
  }
}

export const pexRTCLoader = PexRTCLoader.getInstance()
