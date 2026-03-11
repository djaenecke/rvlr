/**
 * RVLR - Picture Reveal Game
 */
export class Game {
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')

    this.images = []
    this.currentImage = null
    this.tiles = []

    this.tileSize = 80
    this.tileGap = -10  // Overlap
    this.tileColors = ['#e63946', '#f4a261', '#2a9d8f', '#264653', '#e9c46a', '#8338ec']

    this.onTilesChanged = null

    this.setupCanvas()
    window.addEventListener('resize', () => this.setupCanvas())
  }

  setupCanvas() {
    const dpr = window.devicePixelRatio || 1
    const rect = this.canvas.getBoundingClientRect()

    this.canvas.width = rect.width * dpr
    this.canvas.height = rect.height * dpr
    this.ctx.scale(dpr, dpr)

    this.width = rect.width
    this.height = rect.height

    if (this.currentImage) {
      this.render()
    }
  }

  async loadImages(urls) {
    this.images = []

    for (const url of urls) {
      try {
        const img = await this.loadImage(url)
        this.images.push(img)
      } catch (e) {
        console.warn(`Failed to load image: ${url}`)
      }
    }

    return this.images.length
  }

  loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = url
    })
  }

  nextImage() {
    if (this.images.length === 0) {
      return false
    }

    const idx = Math.floor(Math.random() * this.images.length)
    this.currentImage = this.images[idx]
    this.images.splice(idx, 1)

    this.generateTiles()
    this.render()

    return true
  }

  generateTiles() {
    this.tiles = []

    const imgRect = this.getImageRect()
    const effectiveSize = this.tileSize + this.tileGap

    const cols = Math.ceil((imgRect.width - this.tileGap) / effectiveSize)
    const rows = Math.ceil((imgRect.height - this.tileGap) / effectiveSize)

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = imgRect.x + col * effectiveSize
        const y = imgRect.y + row * effectiveSize
        const color = this.tileColors[Math.floor(Math.random() * this.tileColors.length)]

        this.tiles.push({ x, y, width: this.tileSize, height: this.tileSize, color })
      }
    }

    this.notifyTilesChanged()
  }

  getImageRect() {
    if (!this.currentImage) {
      return { x: 0, y: 0, width: 0, height: 0 }
    }

    const imgAspect = this.currentImage.width / this.currentImage.height
    const canvasAspect = this.width / this.height

    let width, height

    if (imgAspect > canvasAspect) {
      width = this.width
      height = width / imgAspect
    } else {
      height = this.height
      width = height * imgAspect
    }

    const x = (this.width - width) / 2
    const y = (this.height - height) / 2

    return { x, y, width, height }
  }

  dropTile() {
    if (this.tiles.length === 0) {
      return false
    }

    const idx = Math.floor(Math.random() * this.tiles.length)
    this.tiles.splice(idx, 1)
    this.render()
    this.notifyTilesChanged()

    return this.tiles.length > 0
  }

  clear() {
    this.tiles = []
    this.render()
    this.notifyTilesChanged()
  }

  notifyTilesChanged() {
    if (this.onTilesChanged) {
      this.onTilesChanged(this.tiles.length)
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.width, this.height)

    // Draw image
    if (this.currentImage) {
      const rect = this.getImageRect()
      this.ctx.drawImage(this.currentImage, rect.x, rect.y, rect.width, rect.height)
    }

    // Draw tiles
    for (const tile of this.tiles) {
      this.ctx.fillStyle = tile.color
      this.ctx.fillRect(tile.x, tile.y, tile.width, tile.height)

      // Subtle border
      this.ctx.strokeStyle = 'rgba(0,0,0,0.2)'
      this.ctx.lineWidth = 1
      this.ctx.strokeRect(tile.x, tile.y, tile.width, tile.height)
    }
  }

  get remainingImages() {
    return this.images.length
  }

  get remainingTiles() {
    return this.tiles.length
  }
}
