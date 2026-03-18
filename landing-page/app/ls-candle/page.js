'use client'

import { useEffect } from "react"
import dynamic from "next/dynamic"
import { logoConfig } from "@/lib/landing-config"

const LogoViewer = dynamic(
  () => import("@/components/LogoViewer"),
  { ssr: false, loading: () => <div className="logo-placeholder" /> }
)

const SpinModelViewer = dynamic(
  () => import("@/components/3DspinModelViewer"),
  { ssr: false, loading: () => <div className="model-viewer-placeholder" /> }
)

export default function LsCandlePage() {
  useEffect(() => {
    const link = document.createElement("link")
    link.rel = "preload"
    link.href = "/web/kerze_web/candle.glb"
    link.as = "fetch"
    document.head.appendChild(link)
    return () => link.remove()
  }, [])

  return (
    <div className="page-ls-candle">
      <header>
        <LogoViewer config={{ ...logoConfig, followMouse: false }} />
      </header>
      <main className="project-page-main">
        <div className="model-viewer-frame">
          <SpinModelViewer
            className="model-viewer-in-frame"
            modelUrl="/web/kerze_web/candle.glb"
            rimColor="#FFF4E0"
            rimIntensity={0.28}
            modelScale={1}
            cameraDistance={2.9}
          />
        </div>
      </main>
    </div>
  )
}
