import { useState, useEffect } from "react"

/**
 * usePWAInstall
 * Captures the browser's beforeinstallprompt event so you can
 * trigger the native PWA install dialog from anywhere in your app.
 *
 * Returns:
 *  isInstallable  – boolean: true when the prompt is ready to fire
 *  isInstalled    – boolean: true after the user accepts the install
 *  handleInstall  – async fn: shows the native prompt; returns "accepted" | "dismissed" | null
 */
const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already running as installed PWA
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    if (isStandalone) {
      setIsInstalled(true)
      return
    }

    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing automatically
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }

    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setIsInstallable(false)
      setIsInstalled(true)
      console.log("SmartDriller PWA installed successfully!")
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return null

    // Show the native browser install dialog
    deferredPrompt.prompt()

    const { outcome } = await deferredPrompt.userChoice
    console.log(`PWA install prompt outcome: ${outcome}`)

    // The prompt can only be used once — discard it
    setDeferredPrompt(null)
    setIsInstallable(false)

    if (outcome === "accepted") {
      setIsInstalled(true)
    }

    return outcome // "accepted" | "dismissed"
  }

  return { isInstallable, isInstalled, handleInstall }
}

export default usePWAInstall
