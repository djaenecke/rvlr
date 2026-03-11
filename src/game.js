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
    this.animatingTiles = []  // Tiles being animated out
    this.grid = null  // 2D grid for edge matching

    this.tileSize = 80
    this.tabSize = 16  // Scales with tile size
    this.tileColors = ['#e63946', '#f4a261', '#2a9d8f', '#264653', '#e9c46a', '#8338ec']

    this.onTilesChanged = null
    this.animationId = null

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

  setTileSize(size) {
    this.tileSize = size
    this.tabSize = Math.round(size * 0.2)  // Tab proportional to tile
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
    const cols = Math.ceil(imgRect.width / this.tileSize)
    const rows = Math.ceil(imgRect.height / this.tileSize)

    // Center tiles over image (equal overlap on all sides)
    const totalTileWidth = cols * this.tileSize
    const totalTileHeight = rows * this.tileSize
    const offsetX = imgRect.x - (totalTileWidth - imgRect.width) / 2
    const offsetY = imgRect.y - (totalTileHeight - imgRect.height) / 2

    // Create grid to track edge configurations
    // edges: 0 = flat, 1 = tab out, -1 = blank in
    this.grid = []

    for (let row = 0; row < rows; row++) {
      this.grid[row] = []
      for (let col = 0; col < cols; col++) {
        const x = offsetX + col * this.tileSize
        const y = offsetY + row * this.tileSize
        const color = this.tileColors[Math.floor(Math.random() * this.tileColors.length)]

        // Determine edges: top, right, bottom, left
        const edges = {
          top: row === 0 ? 0 : -this.grid[row - 1][col].edges.bottom,
          right: col === cols - 1 ? 0 : (Math.random() > 0.5 ? 1 : -1),
          bottom: row === rows - 1 ? 0 : (Math.random() > 0.5 ? 1 : -1),
          left: col === 0 ? 0 : -this.grid[row][col - 1].edges.right
        }

        const tile = {
          x, y,
          row, col,
          width: this.tileSize,
          height: this.tileSize,
          color,
          edges
        }

        this.grid[row][col] = tile
        this.tiles.push(tile)
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
    const tile = this.tiles.splice(idx, 1)[0]

    // Start animation
    tile.animation = {
      progress: 0,
      rotation: (Math.random() - 0.5) * 2,  // Random rotation direction
      velocityY: -2 - Math.random() * 3,    // Initial upward velocity
      velocityX: (Math.random() - 0.5) * 4  // Random horizontal velocity
    }
    this.animatingTiles.push(tile)
    this.startAnimationLoop()

    this.notifyTilesChanged()
    return this.tiles.length > 0
  }

  clear() {
    // Animate all tiles out with staggered timing
    const tilesToAnimate = [...this.tiles]
    this.tiles = []

    tilesToAnimate.forEach((tile, i) => {
      setTimeout(() => {
        tile.animation = {
          progress: 0,
          rotation: (Math.random() - 0.5) * 2,
          velocityY: -3 - Math.random() * 4,
          velocityX: (Math.random() - 0.5) * 6
        }
        this.animatingTiles.push(tile)
        this.startAnimationLoop()
      }, i * 15)  // Stagger by 15ms
    })

    this.notifyTilesChanged()
  }

  startAnimationLoop() {
    if (this.animationId) return

    const animate = () => {
      this.updateAnimations()
      this.render()

      if (this.animatingTiles.length > 0) {
        this.animationId = requestAnimationFrame(animate)
      } else {
        this.animationId = null
      }
    }

    this.animationId = requestAnimationFrame(animate)
  }

  updateAnimations() {
    const gravity = 0.3
    const fadeSpeed = 0.03

    this.animatingTiles = this.animatingTiles.filter(tile => {
      const anim = tile.animation
      anim.progress += fadeSpeed
      anim.velocityY += gravity
      tile.x += anim.velocityX
      tile.y += anim.velocityY

      return anim.progress < 1
    })
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

    // Draw static tiles
    for (const tile of this.tiles) {
      this.drawJigsawTile(tile)
    }

    // Draw animating tiles
    for (const tile of this.animatingTiles) {
      this.drawJigsawTile(tile, tile.animation)
    }
  }

  drawJigsawTile(tile, animation = null) {
    const ctx = this.ctx
    const { x, y, width, height, edges, color } = tile
    const tab = this.tabSize

    ctx.save()

    // Apply exit animation transforms
    if (animation) {
      const scale = 1 - animation.progress * 0.5
      const opacity = 1 - animation.progress
      const rotation = animation.rotation * animation.progress * Math.PI

      ctx.globalAlpha = opacity
      ctx.translate(x + width / 2, y + height / 2)
      ctx.rotate(rotation)
      ctx.scale(scale, scale)
      ctx.translate(-(x + width / 2), -(y + height / 2))
    }

    ctx.beginPath()

    // Start at top-left
    ctx.moveTo(x, y)

    // Top edge
    this.drawEdge(ctx, x, y, width, 0, edges.top, tab)

    // Right edge
    this.drawEdge(ctx, x + width, y, height, 1, edges.right, tab)

    // Bottom edge (reverse)
    this.drawEdge(ctx, x + width, y + height, width, 2, edges.bottom, tab)

    // Left edge (reverse)
    this.drawEdge(ctx, x, y + height, height, 3, edges.left, tab)

    ctx.closePath()

    // Fill with gradient for 3D effect
    const gradient = ctx.createLinearGradient(x, y, x + width, y + height)
    gradient.addColorStop(0, this.lightenColor(color, 20))
    gradient.addColorStop(0.5, color)
    gradient.addColorStop(1, this.darkenColor(color, 20))
    ctx.fillStyle = gradient
    ctx.fill()

    // Border
    ctx.strokeStyle = this.darkenColor(color, 40)
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Inner highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.restore()
  }

  drawEdge(ctx, startX, startY, length, direction, edgeType, tab) {
    // direction: 0=right, 1=down, 2=left, 3=up
    const dx = [1, 0, -1, 0][direction]
    const dy = [0, 1, 0, -1][direction]
    // perpendicular direction for tab
    const px = [0, -1, 0, 1][direction]
    const py = [1, 0, -1, 0][direction]

    const seg = length / 3
    const tabDepth = tab * edgeType

    if (edgeType === 0) {
      // Flat edge
      ctx.lineTo(startX + dx * length, startY + dy * length)
    } else {
      // First segment
      ctx.lineTo(startX + dx * seg, startY + dy * seg)

      // Tab/blank curve using bezier
      const midX = startX + dx * (length / 2)
      const midY = startY + dy * (length / 2)

      // Control points for smooth curve
      const cp1x = startX + dx * seg + px * tabDepth * 0.2
      const cp1y = startY + dy * seg + py * tabDepth * 0.2
      const cp2x = midX - dx * (seg * 0.3) + px * tabDepth
      const cp2y = midY - dy * (seg * 0.3) + py * tabDepth

      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, midX + px * tabDepth, midY + py * tabDepth)

      // Second half of curve
      const cp3x = midX + dx * (seg * 0.3) + px * tabDepth
      const cp3y = midY + dy * (seg * 0.3) + py * tabDepth
      const cp4x = startX + dx * (seg * 2) + px * tabDepth * 0.2
      const cp4y = startY + dy * (seg * 2) + py * tabDepth * 0.2

      ctx.bezierCurveTo(cp3x, cp3y, cp4x, cp4y, startX + dx * (seg * 2), startY + dy * (seg * 2))

      // Final segment
      ctx.lineTo(startX + dx * length, startY + dy * length)
    }
  }

  lightenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16)
    const amt = Math.round(2.55 * percent)
    const R = Math.min(255, (num >> 16) + amt)
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt)
    const B = Math.min(255, (num & 0x0000FF) + amt)
    return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`
  }

  darkenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16)
    const amt = Math.round(2.55 * percent)
    const R = Math.max(0, (num >> 16) - amt)
    const G = Math.max(0, ((num >> 8) & 0x00FF) - amt)
    const B = Math.max(0, (num & 0x0000FF) - amt)
    return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`
  }

  get remainingImages() {
    return this.images.length
  }

  get remainingTiles() {
    return this.tiles.length
  }
}
