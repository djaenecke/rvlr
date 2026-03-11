import './style.css'
import { Game } from './game.js'

// Elements - Setup
const setupScreen = document.getElementById('setup')
const fileInput = document.getElementById('file-input')
const fileCount = document.getElementById('file-count')
const urlInput = document.getElementById('url-input')
const btnAddUrl = document.getElementById('btn-add-url')
const urlList = document.getElementById('url-list')
const tileSizeButtons = document.querySelectorAll('.tile-size')
const btnStart = document.getElementById('btn-start')
const btnInstall = document.getElementById('btn-install')
const btnRefresh = document.getElementById('btn-refresh')

// Elements - Game
const appScreen = document.getElementById('app')
const canvas = document.getElementById('game')
const btnNext = document.getElementById('btn-next')
const btnClear = document.getElementById('btn-clear')
const btnBack = document.getElementById('btn-back')
const counter = document.getElementById('counter')

// State
let selectedFiles = []
let imageUrls = []
let tileSize = 80

const game = new Game(canvas)

// Setup: File selection
fileInput.addEventListener('change', (e) => {
  selectedFiles = Array.from(e.target.files)
  updateFileCount()
  updateStartButton()
})

function updateFileCount() {
  if (selectedFiles.length > 0) {
    fileCount.textContent = `${selectedFiles.length} image${selectedFiles.length > 1 ? 's' : ''} selected`
  } else {
    fileCount.textContent = ''
  }
}

// Setup: URL input
btnAddUrl.addEventListener('click', addUrl)
urlInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addUrl()
})

function addUrl() {
  const url = urlInput.value.trim()
  if (url && isValidUrl(url)) {
    imageUrls.push(url)
    urlInput.value = ''
    renderUrlList()
    updateStartButton()
  }
}

function isValidUrl(string) {
  try {
    new URL(string)
    return true
  } catch {
    return false
  }
}

function renderUrlList() {
  urlList.innerHTML = imageUrls.map((url, i) => `
    <div class="url-item">
      <span>${truncateUrl(url)}</span>
      <button data-index="${i}">X</button>
    </div>
  `).join('')

  urlList.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      imageUrls.splice(parseInt(btn.dataset.index), 1)
      renderUrlList()
      updateStartButton()
    })
  })
}

function truncateUrl(url) {
  return url.length > 40 ? url.substring(0, 37) + '...' : url
}

// Setup: Tile size
tileSizeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    tileSizeButtons.forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    tileSize = parseInt(btn.dataset.size)
  })
})

// Setup: Start button
function updateStartButton() {
  btnStart.disabled = selectedFiles.length === 0 && imageUrls.length === 0
}

btnStart.addEventListener('click', startGame)

btnRefresh.addEventListener('click', () => {
  location.reload(true)
})

// PWA Install prompt
let deferredPrompt = null
const iosInstall = document.getElementById('ios-install')

// Detect iOS Safari (not in standalone mode)
const isIos = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase())
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone
if (isIos && !isStandalone) {
  iosInstall.classList.remove('hidden')
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt = e
  btnInstall.classList.remove('hidden')
})

btnInstall.addEventListener('click', async () => {
  if (!deferredPrompt) return

  deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice

  if (outcome === 'accepted') {
    btnInstall.classList.add('hidden')
  }
  deferredPrompt = null
})

window.addEventListener('appinstalled', () => {
  btnInstall.classList.add('hidden')
  deferredPrompt = null
})

async function startGame() {
  // Build image list
  const imageSources = []

  // Add file URLs (object URLs)
  for (const file of selectedFiles) {
    imageSources.push(URL.createObjectURL(file))
  }

  // Add remote URLs
  imageSources.push(...imageUrls)

  if (imageSources.length === 0) return

  // Configure game
  game.setTileSize(tileSize)

  // Load images
  const loaded = await game.loadImages(imageSources)

  if (loaded > 0) {
    setupScreen.classList.add('hidden')
    appScreen.classList.remove('hidden')
    game.setupCanvas()
    game.nextImage()
    updateNextButton()
  } else {
    alert('Failed to load images')
  }
}

// Game callbacks
game.onTilesChanged = (count) => {
  if (count > 0) {
    counter.textContent = `${count} tiles`
  } else {
    counter.textContent = ''
  }
}

function updateNextButton() {
  const remaining = game.remainingImages
  btnNext.textContent = remaining > 0 ? `Next (${remaining})` : 'Next'
  btnNext.disabled = remaining === 0 && game.remainingTiles === 0
}

// Game controls
canvas.addEventListener('click', () => {
  if (game.remainingTiles > 0) {
    game.dropTile()
  }
})

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault()
  if (game.remainingTiles > 0) {
    game.dropTile()
  }
}, { passive: false })

btnNext.addEventListener('click', () => {
  if (!game.nextImage()) {
    btnNext.disabled = true
    btnNext.textContent = 'No more images'
  }
  updateNextButton()
})

btnClear.addEventListener('click', () => {
  game.clear()
})

btnBack.addEventListener('click', () => {
  // Reset and go back to setup
  appScreen.classList.add('hidden')
  setupScreen.classList.remove('hidden')
  selectedFiles = []
  imageUrls = []
  fileInput.value = ''
  updateFileCount()
  renderUrlList()
  updateStartButton()
})
