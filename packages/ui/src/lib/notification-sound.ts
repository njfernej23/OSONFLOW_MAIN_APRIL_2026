export const NOTIFICATION_SOUND_PATH = "/sounds/notification.mp3"

let notificationAudio: HTMLAudioElement | null = null
let unlockAudio: HTMLAudioElement | null = null
let isAudioUnlocked = false
let isUnlocking = false
// Timestamp of a notification that arrived while playback was still blocked. It
// is replayed on the next successful unlock so the first message is not
// silently dropped, but only while it is still recent enough to be meaningful.
let missedNotificationAt: number | null = null

const MISSED_NOTIFICATION_MAX_AGE_MS = 60_000

/**
 * Returns true when it has taken responsibility for playing the sound. Used by
 * the embedded widget to hand playback to the host page, which is the only
 * frame guaranteed to hold audio permission when the widget is closed.
 */
type NotificationSoundDelegate = () => boolean

let delegate: NotificationSoundDelegate | null = null

export const setNotificationSoundDelegate = (
  next: NotificationSoundDelegate | null
) => {
  delegate = next
}

const createAudio = () => {
  const audio = new Audio(NOTIFICATION_SOUND_PATH)
  audio.preload = "auto"
  return audio
}

const getNotificationAudio = () => {
  if (!notificationAudio) {
    notificationAudio = createAudio()
  }

  return notificationAudio
}

const play = (): Promise<void> => {
  const audio = getNotificationAudio()

  audio.muted = false
  audio.currentTime = 0

  const played = audio.play()

  return played instanceof Promise ? played : Promise.resolve()
}

/**
 * Warms up playback while a user gesture is still active. Browsers only grant
 * audio permission from inside a gesture, so this must be called from an event
 * handler (or right after the host page relays its own activation).
 */
export const unlockNotificationSound = () => {
  if (typeof window === "undefined" || isAudioUnlocked || isUnlocking) {
    return
  }

  isUnlocking = true

  try {
    // Unlock on a throwaway element so a real notification firing mid-unlock is
    // never muted or paused by this warmup.
    if (!unlockAudio) {
      unlockAudio = createAudio()
    }

    unlockAudio.muted = true
    unlockAudio.currentTime = 0

    const played = unlockAudio.play()

    if (!(played instanceof Promise)) {
      isUnlocking = false
      return
    }

    void played
      .then(() => {
        unlockAudio?.pause()
        isAudioUnlocked = true
        isUnlocking = false

        const missedAt = missedNotificationAt
        missedNotificationAt = null

        if (
          missedAt !== null &&
          Date.now() - missedAt < MISSED_NOTIFICATION_MAX_AGE_MS
        ) {
          void play().catch(() => {
            // Still blocked; nothing more we can do here.
          })
        }
      })
      .catch(() => {
        isUnlocking = false
      })
  } catch {
    isUnlocking = false
  }
}

export const playNotificationSound = () => {
  if (typeof window === "undefined") {
    return
  }

  try {
    if (delegate?.()) {
      return
    }
  } catch {
    // Fall through to local playback.
  }

  try {
    void play().catch(() => {
      // Autoplay is still blocked (no user gesture yet, or the embedding page
      // has not delegated the `autoplay` permission to this frame). Remember it
      // so the chime is not lost once playback becomes available.
      missedNotificationAt = Date.now()
    })
  } catch {
    missedNotificationAt = Date.now()
  }
}
