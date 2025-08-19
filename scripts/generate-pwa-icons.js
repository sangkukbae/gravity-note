const fs = require('fs')
const path = require('path')

// Simple SVG icon generator for PWA assets
// This creates basic placeholder icons - replace with actual design assets

const createSVGIcon = (size, color = '#0ea5e9') => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size * 0.1}" fill="${color}"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.3}" font-weight="bold" text-anchor="middle" dominant-baseline="central" fill="white">G</text>
</svg>`

const createFavicon = size => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="#0ea5e9"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.6}" font-weight="bold" text-anchor="middle" dominant-baseline="central" fill="white">G</text>
</svg>`

const sizes = [
  { name: 'android-chrome-192x192.png', size: 192 },
  { name: 'android-chrome-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-16x16.png', size: 16, isFavicon: true },
  { name: 'favicon-32x32.png', size: 32, isFavicon: true },
  { name: 'mstile-150x150.png', size: 150 },
]

const publicDir = path.join(__dirname, '..', 'public')

console.log('Generating PWA icon placeholders...')

sizes.forEach(({ name, size, isFavicon }) => {
  const svgContent = isFavicon ? createFavicon(size) : createSVGIcon(size)
  const svgPath = path.join(publicDir, name.replace('.png', '.svg'))

  try {
    fs.writeFileSync(svgPath, svgContent.trim())
    console.log(`Created: ${name.replace('.png', '.svg')}`)
  } catch (error) {
    console.error(`Error creating ${name}:`, error.message)
  }
})

console.log(
  'SVG placeholders generated. Install sharp or use online converter to create PNG versions.'
)
console.log(
  'Recommended: Use a proper design tool to create professional icons.'
)
