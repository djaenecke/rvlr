import './style.css'
import { Game } from './game.js'

const canvas = document.getElementById('game')
const btnNext = document.getElementById('btn-next')
const btnClear = document.getElementById('btn-clear')
const counter = document.getElementById('counter')

const game = new Game(canvas)

// Sample images - replace with your own
const sampleImages = [
  'images/sample-1.jpg',
  'images/sample-2.jpg',
  'images/sample-3.jpg'
]

game.onTilesChanged = (count) => {
  if (count > 0) {
    counter.textContent = `${count} tiles`
  } else {
    counter.textContent = ''
  }
}

async function init() {
  const loaded = await game.loadImages(sampleImages)

  if (loaded > 0) {
    game.nextImage()
    updateNextButton()
  } else {
    counter.textContent = 'No images loaded'
  }
}

function updateNextButton() {
  const remaining = game.remainingImages
  btnNext.textContent = remaining > 0 ? `Next (${remaining})` : 'Next'
  btnNext.disabled = remaining === 0 && game.remainingTiles === 0
}

// Tap on canvas removes a random tile
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

init()
