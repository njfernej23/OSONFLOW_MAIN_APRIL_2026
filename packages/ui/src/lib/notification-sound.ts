export const NOTIFICATION_SOUND_PATH = "/sounds/notification.mp3"

let notificationAudio: HTMLAudioElement | null = null

export const playNotificationSound = () => {
  if (typeof window === "undefined") {
    return
  }

  try {
    if (!notificationAudio) {
      notificationAudio = new Audio(NOTIFICATION_SOUND_PATH)
      notificationAudio.preload = "auto"
    }

    notificationAudio.currentTime = 0
    void notificationAudio.play().catch(() => {
      // Browsers may block autoplay until the user interacts with the page.
    })
  } catch {
    // Ignore playback failures in unsupported environments.
  }
}
