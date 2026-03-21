'use client'

import React, { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"

function applyLights(scene, rimColor = "#FFF4E0", rimIntensity = 0.28) {
  const col = new THREE.Color(rimColor)
  scene.add(new THREE.AmbientLight(0xffffff, 0.4))
  const sideL = new THREE.DirectionalLight(col, rimIntensity)
  sideL.position.set(-5, 0, -4)
  scene.add(sideL)
  const sideR = new THREE.DirectionalLight(col, rimIntensity)
  sideR.position.set(5, 0, -4)
  scene.add(sideR)
  const topL = new THREE.DirectionalLight(col, rimIntensity * 1.4)
  topL.position.set(0, 8, 1)
  scene.add(topL)
}

function buildEnvMap(renderer, scene) {
  const cubeRT = new THREE.WebGLCubeRenderTarget(128)
  cubeRT.texture.type = THREE.HalfFloatType
  const sides = [0xffffff, 0xffffff, 0x444444, 0x222222, 0x050505, 0x050505]
  const envBox = new THREE.Mesh(
    new THREE.BoxGeometry(8, 8, 8),
    sides.map((c) => new THREE.MeshBasicMaterial({ color: c, side: THREE.BackSide }))
  )
  scene.add(envBox)
  const cubeCamera = new THREE.CubeCamera(0.1, 10, cubeRT)
  scene.add(cubeCamera)
  cubeCamera.update(renderer, scene)
  scene.remove(envBox)
  scene.remove(cubeCamera)
  const pmrem = new THREE.PMREMGenerator(renderer)
  const env = pmrem.fromCubemap(cubeRT.texture).texture
  pmrem.dispose()
  cubeRT.dispose()
  scene.environment = env
}

const CAMERA_FOV = 40

/**
 * Zentriert und skaliert das Modell so, dass es bei beliebiger Rotation
 * garantiert im Viewport bleibt. cameraDistance: kleiner = Modell wirkt größer.
 */
function centerAndScaleModel(group, aspectRatio, cameraDistance, sizeMultiplier = 1) {
  const box = new THREE.Box3().setFromObject(group)
  const center = box.getCenter(new THREE.Vector3())
  group.position.sub(center)
  const size = box.getSize(new THREE.Vector3())
  const diagonal = Math.sqrt(size.x * size.x + size.y * size.y + size.z * size.z)

  const halfFov = (CAMERA_FOV * Math.PI) / 360
  const visibleAtOrigin = cameraDistance * Math.tan(halfFov)
  const limit = Math.min(1, aspectRatio) * visibleAtOrigin * 0.97
  const safeMultiplier = Math.min(1, Math.max(0.5, sizeMultiplier))
  const scale = (2 * limit * safeMultiplier) / diagonal
  group.scale.setScalar(scale)
  return group
}

export default function SpinModelViewer({
  modelUrl = "/web/kerze_web/candle.glb",
  rimColor = "#FFF4E0",
  rimIntensity = 0.28,
  className = "",
  /** Modellgröße 0.5–1 (Standard 1). 1 = max. ohne Abschneiden, kleiner = mehr Rand. */
  modelScale = 1,
  /** Kamera-Abstand (Standard 3.5). Kleiner = Modell wirkt größer (z. B. 2.8), größer = kleiner. */
  cameraDistance = 1,
  /** Nach dem Zentrieren: Verschiebung in X (positiv = weiter rechts im Bild). */
  modelOffsetX = 0,
}) {
  const containerRef = useRef(null)
  const [loadState, setLoadState] = useState({ status: "loading", progress: 0 })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let disposed = false
    let raf = 0
    let ro = null
    let renderer = null
    let scene = null
    let camera = null
    let modelGroup = null

    const wrapper = document.createElement("div")
    Object.assign(wrapper.style, {
      width: "100%",
      height: "100%",
      minHeight: "400px",
      cursor: "grab",
      touchAction: "none",
      userSelect: "none",
      WebkitUserSelect: "none",
      WebkitTouchCallout: "none",
      WebkitTapHighlightColor: "transparent",
    })

    let isDragging = false
    let lastPointerX = 0
    let lastPointerY = 0
    let rotX = 0
    let rotY = 0

    const applyRotation = () => {
      if (!modelGroup) return
      modelGroup.rotation.order = "YXZ"
      modelGroup.rotation.y = rotY
      modelGroup.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotX))
    }

    const onPointerDown = (e) => {
      e.preventDefault()
      isDragging = true
      lastPointerX = e.clientX ?? e.touches?.[0]?.clientX ?? 0
      lastPointerY = e.clientY ?? e.touches?.[0]?.clientY ?? 0
      wrapper.style.cursor = "grabbing"
    }

    const onPointerMove = (e) => {
      if (!isDragging || !modelGroup) return
      const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? lastPointerX
      const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? lastPointerY
      const dx = (clientX - lastPointerX) * 0.005
      const dy = (clientY - lastPointerY) * 0.005
      lastPointerX = clientX
      lastPointerY = clientY
      rotY += dx
      rotX += dy
      applyRotation()
    }

    const onPointerUp = () => {
      isDragging = false
      wrapper.style.cursor = "grab"
    }

    const onPointerLeave = () => {
      if (isDragging) onPointerUp()
    }

  // Scroll: Mausrad dreht das Modell
    const onWheel = (e) => {
      e.preventDefault()
      if (!modelGroup) return
      const speed = 0.002
      rotY += e.deltaY * speed
      applyRotation()
    }

    wrapper.addEventListener("pointerdown", onPointerDown, { passive: false })
    wrapper.addEventListener("wheel", onWheel, { passive: false })
    window.addEventListener("pointermove", onPointerMove, { passive: true })
    window.addEventListener("pointerup", onPointerUp)
    window.addEventListener("pointerleave", onPointerLeave)

    container.appendChild(wrapper)

    const waitForSize = () =>
      new Promise((resolve) => {
        let attempts = 0
        const maxAttempts = 180
        const check = () => {
          if (disposed) return
          const w = container.offsetWidth
          const h = container.offsetHeight
          if (w > 0 && h > 0) {
            resolve()
            return
          }
          attempts++
          if (attempts >= maxAttempts) {
            resolve()
            return
          }
          raf = requestAnimationFrame(check)
        }
        check()
      })

    ;(async () => {
      await waitForSize()
      if (disposed) return

      let w = container.offsetWidth
      let h = container.offsetHeight
      if (!w || !h) {
        w = Math.max(w, 320)
        h = Math.max(h, 400)
      }

      // Modell-Download und Setup parallel starten
      const modelPromise = new Promise((resolve, reject) => {
        const loader = new GLTFLoader()
        loader.load(
          modelUrl,
          resolve,
          (e) => {
            if (disposed) return
            const pct = e.lengthComputable ? Math.round((e.loaded / e.total) * 100) : 0
            setLoadState((s) => ({ ...s, progress: pct }))
          },
          reject
        )
      })

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" })
      renderer.setSize(w, h)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      renderer.setClearColor(0x000000, 0)

      const canvas = renderer.domElement
      Object.assign(canvas.style, { display: "block", width: "100%", height: "100%" })
      wrapper.appendChild(canvas)

      scene = new THREE.Scene()
      camera = new THREE.PerspectiveCamera(CAMERA_FOV, w / h, 0.001, 100)
      camera.position.set(0, 0, cameraDistance)

      applyLights(scene, rimColor, rimIntensity)
      buildEnvMap(renderer, scene)

      ro = new ResizeObserver(() => {
        if (!renderer || disposed) return
        const nw = container.offsetWidth
        const nh = container.offsetHeight
        if (!nw || !nh) return
        renderer.setSize(nw, nh)
        camera.aspect = nw / nh
        camera.updateProjectionMatrix()
      })
      ro.observe(container)

      try {
        const gltf = await modelPromise
        if (disposed) return

        modelGroup = new THREE.Group()
        if (gltf.scene) modelGroup.add(gltf.scene)
        modelGroup = centerAndScaleModel(modelGroup, w / h, cameraDistance, modelScale)
        if (modelOffsetX) modelGroup.position.x += modelOffsetX
        scene.add(modelGroup)

        rotX = 0
        rotY = 0
        if (!disposed) setLoadState({ status: "loaded", progress: 100 })
      } catch (err) {
        console.error("SpinModelViewer: failed to load", modelUrl, err)
        return
      }

      const tick = () => {
        if (disposed) return
        renderer.render(scene, camera)
        raf = requestAnimationFrame(tick)
      }
      tick()
    })()

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      if (ro) ro.disconnect()
      wrapper.removeEventListener("pointerdown", onPointerDown)
      wrapper.removeEventListener("wheel", onWheel)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
      window.removeEventListener("pointerleave", onPointerLeave)
      if (renderer) {
        renderer.dispose()
        const el = renderer.domElement
        if (el?.parentNode) el.parentNode.removeChild(el)
      }
      if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper)
    }
  }, [modelUrl, rimColor, rimIntensity, modelScale, cameraDistance, modelOffsetX])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", minHeight: "400px", flex: "1", position: "relative" }}
    >
      {loadState.status === "loading" && (
        <div
          className="model-loading-overlay"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.75rem",
            background: "rgba(0,0,0,0.4)",
            color: "#fff",
            fontSize: "0.9rem",
            zIndex: 10,
          }}
        >
          <div
            className="model-loading-spinner"
            style={{
              width: 36,
              height: 36,
              border: "3px solid rgba(255,255,255,0.3)",
              borderTopColor: "#fff",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          {loadState.progress > 0 && loadState.progress < 100 && (
            <span>{loadState.progress}%</span>
          )}
        </div>
      )}
    </div>
  )
}
