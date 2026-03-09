/**
 * LogoViewer – Standalone 3D STL Logo Component
 * Kein Framework, kein Framer – reines Vanilla JS
 */

;(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory(require("three"))
  } else {
    root.LogoViewer = factory(root.THREE)
  }
})(typeof self !== "undefined" ? self : this, function (THREE) {

  const _cache = {}

  function parseBinarySTL(buffer) {
    const view = new DataView(buffer)
    const n = view.getUint32(80, true)
    const positions = []
    const normals = []
    for (let i = 0; i < n; i++) {
      const base = 84 + i * 50
      const nx = view.getFloat32(base, true)
      const ny = view.getFloat32(base + 4, true)
      const nz = view.getFloat32(base + 8, true)
      for (let v = 0; v < 3; v++) {
        const vb = base + 12 + v * 12
        positions.push(
          view.getFloat32(vb, true),
          view.getFloat32(vb + 4, true),
          view.getFloat32(vb + 8, true)
        )
        normals.push(nx, ny, nz)
      }
    }
    return {
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
    }
  }

  async function loadGeometry(url) {
    if (_cache[url]) return _cache[url]
    const res = await fetch(url)
    if (!res.ok) throw new Error(`STL fetch fehlgeschlagen: ${res.status}`)
    const buffer = await res.arrayBuffer()
    const { positions, normals } = parseBinarySTL(buffer)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    geo.setAttribute("normal", new THREE.BufferAttribute(normals, 3))
    geo.computeBoundingBox()
    const bb = geo.boundingBox
    geo.translate(
      -(bb.max.x + bb.min.x) / 2,
      -(bb.max.y + bb.min.y) / 2,
      -(bb.max.z + bb.min.z) / 2
    )
    const scale =
      1.6 / Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z)
    const result = { geo, scale }
    _cache[url] = result
    return result
  }

  class LogoViewer {
    constructor(container, options = {}) {
      this._container = container
      this._opts = Object.assign(
        {
          stlUrl:        "",
          href:          "/",
          rimColor:      "#FFF4E0",
          rimIntensity:  0.28,
          paddingTop:    0,
          paddingBottom: 0,
        },
        options
      )
      this._cleanedUp = false
      this._animId    = null
      this._renderer  = null
      this._ro        = null
      this._onMove    = null
      this._build()
    }

    _build() {
      const { href, paddingTop, paddingBottom } = this._opts

      this._wrapper = document.createElement("div")
      Object.assign(this._wrapper.style, {
        display:         "inline-block",
        paddingTop:      paddingTop + "px",
        paddingBottom:   paddingBottom + "px",
        lineHeight:      "0",
        cursor:          "pointer",
        transform:       "scale(1)",
        transition:      "transform 0.35s cubic-bezier(0.34,1.56,0.64,1)",
        transformOrigin: "center center",
      })

      this._wrapper.addEventListener("click", () => {
        window.location.href = href
      })
      this._wrapper.addEventListener("mouseenter", () => {
        this._wrapper.style.transform = "scale(1.06)"
      })
      this._wrapper.addEventListener("mouseleave", () => {
        this._wrapper.style.transform = "scale(1)"
      })

      this._container.appendChild(this._wrapper)
      this._initThree()
    }

    async _initThree() {
      // Warte bis Container eine Größe hat
      await new Promise((resolve) => {
        const check = () => {
          if (this._cleanedUp) return
          if (this._container.offsetWidth > 0) resolve()
          else this._animId = requestAnimationFrame(check)
        }
        check()
      })
      if (this._cleanedUp) return

      // Größe dynamisch vom Container lesen — responsiv
      const SIZE = this._container.offsetWidth

      this._renderer = new THREE.WebGLRenderer({
        alpha:           true,
        antialias:       true,
        powerPreference: "low-power",
      })
      this._renderer.setSize(SIZE, SIZE)
      this._renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
      this._renderer.setClearColor(0x000000, 0)

      const canvas = this._renderer.domElement
      Object.assign(canvas.style, {
        display: "block",
        width:   "100%",
        height:  "100%",
      })
      this._wrapper.appendChild(canvas)

      const scene  = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(35, 1, 0.001, 100)
      camera.position.set(0, 0, 3.5)
      this._scene  = scene
      this._camera = camera

      this._applyLights(scene)
      this._buildEnvMap(scene)

      // Resize Observer — Canvas passt sich an wenn Container sich ändert
      this._ro = new ResizeObserver(() => {
        if (!this._renderer) return
        const w = this._container.offsetWidth
        if (w === 0) return
        this._renderer.setSize(w, w)
      })
      this._ro.observe(this._container)

      let mouseX = 0, mouseY = 0
      this._onMove = (e) => {
        mouseX = (e.clientX / window.innerWidth)  * 2 - 1
        mouseY = -((e.clientY / window.innerHeight) * 2 - 1)
      }
      window.addEventListener("mousemove", this._onMove)

      if (!this._opts.stlUrl) {
        console.warn("LogoViewer: keine stlUrl angegeben")
        return
      }
      let geo, scale
      try {
        const result = await loadGeometry(this._opts.stlUrl)
        geo   = result.geo
        scale = result.scale
      } catch (err) {
        console.error("LogoViewer: STL konnte nicht geladen werden", err)
        return
      }
      if (this._cleanedUp) return

      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshPhysicalMaterial({
          color:              0x000000,
          roughness:          0.35,
          metalness:          0.8,
          reflectivity:       0.7,
          clearcoat:          0.4,
          clearcoatRoughness: 0.25,
        })
      )
      mesh.scale.setScalar(scale)
      scene.add(mesh)

      const edgeMesh = new THREE.Mesh(
        geo.clone(),
        new THREE.MeshPhysicalMaterial({
          color:       0x888888,
          roughness:   0.3,
          transparent: true,
          opacity:     0.18,
          side:        THREE.BackSide,
        })
      )
      edgeMesh.scale.setScalar(scale * 1.018)
      scene.add(edgeMesh)

      let curRotY = 0, curRotX = 0
      const tick = () => {
        if (this._cleanedUp) return
        curRotY += (mouseX * 0.6 - curRotY) * 0.06
        curRotX += (-mouseY * 0.3 - curRotX) * 0.06
        mesh.rotation.y     = curRotY
        mesh.rotation.x     = curRotX
        edgeMesh.rotation.y = curRotY
        edgeMesh.rotation.x = curRotX
        this._renderer.render(scene, camera)
        this._animId = requestAnimationFrame(tick)
      }
      tick()
    }

    _applyLights(scene) {
      const { rimColor, rimIntensity } = this._opts
      const col = new THREE.Color(rimColor)
      scene.add(new THREE.AmbientLight(0xffffff, 0.2))
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

    _buildEnvMap(scene) {
      const cubeRT  = new THREE.WebGLCubeRenderTarget(128)
      cubeRT.texture.type = THREE.HalfFloatType
      const sides = [0xffffff, 0xffffff, 0x444444, 0x222222, 0x050505, 0x050505]
      const envBox = new THREE.Mesh(
        new THREE.BoxGeometry(8, 8, 8),
        sides.map(c => new THREE.MeshBasicMaterial({ color: c, side: THREE.BackSide }))
      )
      scene.add(envBox)
      const cubeCamera = new THREE.CubeCamera(0.1, 10, cubeRT)
      scene.add(cubeCamera)
      cubeCamera.update(this._renderer, scene)
      scene.remove(envBox)
      scene.remove(cubeCamera)
      const pmrem = new THREE.PMREMGenerator(this._renderer)
      scene.environment = pmrem.fromCubemap(cubeRT.texture).texture
    }

    update(newOptions) {
      Object.assign(this._opts, newOptions)
      if (newOptions.href !== undefined)
        this._wrapper.onclick = () => { window.location.href = newOptions.href }
      if (newOptions.paddingTop !== undefined)
        this._wrapper.style.paddingTop = newOptions.paddingTop + "px"
      if (newOptions.paddingBottom !== undefined)
        this._wrapper.style.paddingBottom = newOptions.paddingBottom + "px"
      if (newOptions.rimColor !== undefined || newOptions.rimIntensity !== undefined) {
        if (this._scene) {
          const toRemove = []
          this._scene.traverse(obj => { if (obj.isLight) toRemove.push(obj) })
          toRemove.forEach(l => this._scene.remove(l))
          this._applyLights(this._scene)
        }
      }
    }

    destroy() {
      this._cleanedUp = true
      cancelAnimationFrame(this._animId)
      if (this._ro)     this._ro.disconnect()
      if (this._onMove) window.removeEventListener("mousemove", this._onMove)
      if (this._renderer) {
        this._renderer.dispose()
        const el = this._renderer.domElement
        if (el.parentNode) el.parentNode.removeChild(el)
      }
      if (this._container.contains(this._wrapper))
        this._container.removeChild(this._wrapper)
    }
  }

  return LogoViewer
})