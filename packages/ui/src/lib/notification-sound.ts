export const NOTIFICATION_SOUND_PATH = "/sounds/notification.mp3"

let notificationAudio: HTMLAudioElement | null = null
let isAudioUnlocked = false

const getNotificationAudio = () => {
  if (!notificationAudio) {
    notificationAudio = new Audio(NOTIFICATION_SOUND_PATH)
    notificationAudio.preload = "auto"
  }

  return notificationAudio
}

export const unlockNotificationSound = () => {
  if (typeof window === "undefined" || isAudioUnlocked) {
    return
  }

  try {
    const audio = getNotificationAudio()
    audio.muted = true

    void audio.play().then(() => {
      audio.pause()
      audio.currentTime = 0
      audio.muted = false
      isAudioUnlocked = true
    }).catch(() => {
      audio.muted = false
    })
  } catch {
    // Ignore playback failures in unsupported environments.
  }
}

export const playNotificationSound = () => {
  if (typeof window === "undefined") {
    return
  }

  try {
    const audio = getNotificationAudio()

    audio.currentTime = 0
    void audio.play().catch(() => {
      // Browsers may block autoplay until the user interacts with the page.
    })
  } catch {
    // Ignore playback failures in unsupported environments.
  }
}
