/**
 * Erweiterbar für Detailseiten (description, images, modelUrl).
 * Grid-Styling: app/globals.css .pg-wrapper vars.
 */
export const projects = [
  {
    slug: "step_spun",
    name: "step_spun",
    category: "LIGHTING",
    preview: "/web/step_web/IMG_9586.jpg",
    href: "/step_spun",
    images: [
      "/web/step_web/IMG_2368.jpg",
      "/web/step_web/IMG_2369.jpg",
      "/web/step_web/IMG_2370.jpg",
      "/web/step_web/IMG_2371.jpg",
      "/web/step_web/IMG_2372.jpg",
      "/web/step_web/IMG_2373.jpg",
      "/web/step_web/IMG_8996.jpg",
      "/web/step_web/IMG_9055.jpg",
      "/web/step_web/IMG_9070.jpg",
      "/web/step_web/IMG_9075.jpg",
      "/web/step_web/IMG_9578.jpg",
      "/web/step_web/IMG_9586.jpg",
    ],
  },
  {
    slug: "projekt-b",
    name: "middlemen",
    category: "FURNITURE",
    preview:
      "/web/mm-series/WhatsApp%20Image%202025-02-17%20at%2019.34.23%20Kopie.jpeg",
    href: "/projekt-b",
  },
  {
    slug: "contact",
    name: "contact",
    category: "",
    preview: "",
    href: "/contact",
  },
  {
    slug: "projekt-c",
    name: "step_drawn",
    category: "LIGHTING",
    preview: "/web/step_web/IMG_9586.jpg",
    href: "/projekt-c",
  },
  {
    slug: "clay",
    name: "clay",
    category: "CERAMICS",
    preview: "/web/clay_web/IMG_7627.jpg",
    href: "/clay",
  },
  {
    slug: "ls-candle",
    name: "ls-candle",
    category: "CANDLES",
    preview: "/web/kerze_web/DSCF5505-2.jpg",
    href: "/ls-candle",
    modelUrl: "/web/kerze_web/candle.glb",
    timelapseVideoUrl: "/web/kerze_web/ls-candle-zeitraffer.mov",
    viewerProps: {
      rimColor: "#FFF4E0",
      rimIntensity: 0.28,
      cameraDistance: 2.9,
      modelOffsetX: 0.18,
    },
  },
  {
    slug: "ls-radio",
    name: "LSradio",
    category: "ENTERTAINMENT SYSTEM",
    preview: "/web/LSradio_web/DSCF9166.jpg",
    href: "/ls-radio",
  },
  {
    slug: "projekt-b",
    name: "stamping",
    category: "",
    preview: "/web/step_web/IMG_9586.jpg",
    href: "/projekt-b",
  },
  {
    slug: "projekt-c",
    name: "grillz",
    category: "JEWELRY",
    preview: "/web/step_web/IMG_9586.jpg",
    href: "/projekt-c",
  },
  {
    slug: "projekt-d",
    name: "gargoyle",
    category: "JEWELRY",
    preview: "/web/step_web/IMG_9586.jpg",
    href: "/projekt-d",
  },
]

/** Für ProjectGrid: name, category, preview, href */
export const gridProjects = projects.map(({ name, category, preview, href }) => ({
  name,
  category,
  preview,
  href,
}))

export function getProjectBySlug(slug) {
  return projects.find((p) => p.slug === slug) ?? null
}
