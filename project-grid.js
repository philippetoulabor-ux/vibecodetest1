/**
 * ProjectGrid – Standalone Projekt-Kacheln Component
 * Kein Framework, kein Framer – reines Vanilla JS
 *
 * preview kann sein:
 *   - Pfad zu einem Video (.mp4, .webm, .mov) → wird als Video abgespielt
 *   - Pfad zu einem Bild (.jpg, .png, .webp)  → wird als Bild gezeigt
 *   - null / ""                                → keine Vorschau
 */

;(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory()
  } else {
    root.ProjectGrid = factory()
  }
})(typeof self !== "undefined" ? self : this, function () {

  const VIDEO_EXTS = ["mp4", "webm", "mov", "ogg"]

  function isVideo(src) {
    if (!src) return false
    const ext = src.split("?")[0].split(".").pop().toLowerCase()
    return VIDEO_EXTS.includes(ext)
  }

  function isTouchDevice() {
    return window.matchMedia("(hover: none)").matches
  }

  class ProjectGrid {
    constructor(container, options = {}) {
      this._container = container
      this._opts = Object.assign(
        {
          projects: [
            { name: "Projekt A", category: "Branding",  preview: null, href: "/" },
            { name: "Projekt B", category: "Editorial", preview: null, href: "/" },
            { name: "Projekt C", category: "UX / Web",  preview: null, href: "/" },
            { name: "Projekt D", category: "Foto",      preview: null, href: "/" },
          ],
          columns:              4,
          fontFamily:           "sans-serif",
          fontSize:             36,
          textColor:            "#1a1814",
          hoverTextColor:       "#c8401a",
          categoryColor:        "#9e9a92",
          categoryFontFamily:   "monospace",
          backgroundColor:      "transparent",
          hoverBackgroundColor: "rgba(0,0,0,0.04)",
          cellHeight:           160,
          previewHeight:        200,
        },
        options
      )

      this._activeIndex = null
      this._imgRatio    = null
      this._onMouseMove = null
      this._cells       = []

      this._build()
    }

    _build() {
      this._wrapper = document.createElement("div")
      Object.assign(this._wrapper.style, {
        width:    "100%",
        position: "relative",
      })
      this._container.appendChild(this._wrapper)

      this._grid = document.createElement("div")
      this._grid.className = "project-grid"
      Object.assign(this._grid.style, {
        display:             "grid",
        gridTemplateColumns: `repeat(${this._opts.columns}, 1fr)`,
        width:               "100%",
      })
      this._wrapper.appendChild(this._grid)

      // Vorschau nur auf nicht-Touch-Geräten
      if (!isTouchDevice()) {
        this._previewEl = document.createElement("div")
        Object.assign(this._previewEl.style, {
          position:      "fixed",
          pointerEvents: "none",
          zIndex:        "9999",
          borderRadius:  "2px",
          overflow:      "hidden",
          boxShadow:     "0 12px 48px rgba(0,0,0,0.2)",
          display:       "none",
        })
        document.body.appendChild(this._previewEl)

        this._previewImg = document.createElement("img")
        Object.assign(this._previewImg.style, {
          width:     "100%",
          height:    "100%",
          objectFit: "cover",
          display:   "none",
        })
        this._previewEl.appendChild(this._previewImg)

        this._previewVideo = document.createElement("video")
        Object.assign(this._previewVideo.style, {
          width:     "100%",
          height:    "100%",
          objectFit: "cover",
          display:   "none",
        })
        this._previewVideo.muted       = true
        this._previewVideo.playsInline = true
        this._previewVideo.loop        = true
        this._previewEl.appendChild(this._previewVideo)

        this._onMouseMove = (e) => this._updatePreviewPos(e)
        document.addEventListener("mousemove", this._onMouseMove)
      }

      this._renderCells()
    }

    _renderCells() {
      const o       = this._opts
      const isTouch = isTouchDevice()
      this._grid.innerHTML = ""
      this._cells = []

      o.projects.forEach((project, i) => {
        const cell = document.createElement("a")
        if (project.href) cell.href = project.href
        Object.assign(cell.style, {
          display:         "flex",
          flexDirection:   "column",
          alignItems:      "center",
          justifyContent:  "center",
          padding:         "2rem 1.5rem",
          minHeight:       o.cellHeight + "px",
          minWidth:        "0",
          cursor:          project.href ? "pointer" : "default",
          backgroundColor: o.backgroundColor,
          transition:      "background 0.25s",
          textAlign:       "center",
          textDecoration:  "none",
          boxSizing:       "border-box",
        })

        const nameEl = document.createElement("span")
        nameEl.textContent = project.name
        Object.assign(nameEl.style, {
          fontFamily: o.fontFamily,
          fontSize:   o.fontSize + "px",
          lineHeight: "1",
          color:      o.textColor,
          transition: "color 0.2s",
          fontWeight: "normal",
        })

        const catEl = document.createElement("span")
        catEl.textContent = project.category
        Object.assign(catEl.style, {
          fontFamily:    o.categoryFontFamily,
          fontSize:      "9px",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color:         o.categoryColor,
          opacity:       isTouch ? "1" : "0", // auf Touch immer sichtbar
          transition:    "opacity 0.2s",
          marginTop:     "0.7rem",
        })

        cell.appendChild(nameEl)
        cell.appendChild(catEl)

        if (!isTouch) {
          cell.addEventListener("mouseenter", () => {
            this._activeIndex = i
            cell.style.backgroundColor = o.hoverBackgroundColor
            nameEl.style.color  = o.hoverTextColor
            catEl.style.opacity = "1"
            this._showPreview(project)
          })
          cell.addEventListener("mouseleave", () => {
            this._activeIndex = null
            cell.style.backgroundColor = o.backgroundColor
            nameEl.style.color  = o.textColor
            catEl.style.opacity = "0"
            this._hidePreview()
          })
        }

        this._grid.appendChild(cell)
        this._cells.push({ cell, nameEl, catEl })
      })
    }

    _showPreview(project) {
      if (!this._previewEl) return
      const src = project.preview
      if (!src) return

      this._stopVideo()

      if (isVideo(src)) {
        this._previewImg.style.display   = "none"
        this._previewVideo.style.display = "block"
        this._previewVideo.src           = src
        this._previewVideo.currentTime   = 0
        this._previewVideo.play().catch(() => {})
        this._imgRatio = null
        this._previewVideo.onloadedmetadata = () => {
          this._imgRatio = this._previewVideo.videoWidth / this._previewVideo.videoHeight
          this._updatePreviewSize()
        }
      } else {
        this._previewVideo.style.display = "none"
        this._previewImg.style.display   = "block"
        this._previewImg.src             = src
        this._imgRatio = null
        const img = new Image()
        img.onload = () => {
          this._imgRatio = img.naturalWidth / img.naturalHeight
          this._updatePreviewSize()
        }
        img.src = src
      }

      this._updatePreviewSize()
      this._previewEl.style.display = "block"
    }

    _hidePreview() {
      if (!this._previewEl) return
      this._stopVideo()
      this._previewEl.style.display    = "none"
      this._previewImg.style.display   = "none"
      this._previewVideo.style.display = "none"
      this._imgRatio = null
    }

    _stopVideo() {
      if (!this._previewVideo) return
      if (!this._previewVideo.paused) this._previewVideo.pause()
      this._previewVideo.currentTime = 0
      this._previewVideo.src = ""
    }

    _updatePreviewSize() {
      if (!this._previewEl) return
      const h = this._opts.previewHeight
      const w = this._imgRatio ? Math.round(h * this._imgRatio) : 300
      this._previewEl.style.width  = w + "px"
      this._previewEl.style.height = h + "px"
    }

    _updatePreviewPos(e) {
      if (this._activeIndex === null || !this._previewEl) return
      const h   = this._opts.previewHeight
      const w   = this._imgRatio ? Math.round(h * this._imgRatio) : 300
      const OFF = 12
      const vw  = window.innerWidth
      const vh  = window.innerHeight
      let x = e.clientX + OFF
      let y = e.clientY + OFF
      if (x + w > vw - 12) x = e.clientX - w - OFF
      if (y + h > vh - 12) y = e.clientY - h - OFF
      if (y < 12) y = 12
      if (x < 12) x = 12
      this._previewEl.style.left = x + "px"
      this._previewEl.style.top  = y + "px"
    }

    update(newOptions) {
      Object.assign(this._opts, newOptions)
      if (this._grid) {
        this._grid.style.gridTemplateColumns = `repeat(${this._opts.columns}, 1fr)`
      }
      this._renderCells()
    }

    destroy() {
      if (this._onMouseMove) document.removeEventListener("mousemove", this._onMouseMove)
      this._stopVideo()
      if (this._previewEl && this._previewEl.parentNode)
        this._previewEl.parentNode.removeChild(this._previewEl)
      if (this._container.contains(this._wrapper))
        this._container.removeChild(this._wrapper)
    }
  }

  return ProjectGrid
})