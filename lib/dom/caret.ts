// Lightweight caret measurement for <textarea>/<input>
// Returns viewport-relative coordinates for a collapsed caret at `position`.
// Strategy:
// - Create an offscreen mirror element positioned fixed at the textarea's
//   viewport coordinates, with matching text/layout styles.
// - Fill it with the textarea's value and use a Range collapsed at `position`
//   to measure the caret rect. Mirror scroll position to account for
//   horizontal/vertical scrolling inside the textarea.

export type CaretRect = {
  top: number
  left: number
  height: number
  bottom: number
}

const STYLE_PROPS = [
  // Sizing and spacing
  'boxSizing',
  'width',
  'height',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  // Typography
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'letterSpacing',
  'textTransform',
  'textAlign',
  'textIndent',
  'lineHeight',
  'tabSize',
  'wordSpacing',
  // Text behavior
  'whiteSpace',
  'wordBreak',
  'overflowWrap',
] as const

function createMirror(base: HTMLTextAreaElement | HTMLInputElement) {
  const doc = base.ownerDocument
  const win = doc.defaultView!
  const mirror = doc.createElement('div')
  const style = win.getComputedStyle(base)
  const rect = base.getBoundingClientRect()

  mirror.setAttribute('data-gn-caret-mirror', 'true')
  const s = mirror.style
  // Place the mirror at the same viewport position as the textarea
  s.position = 'fixed'
  s.left = `${rect.left}px`
  s.top = `${rect.top}px`
  s.zIndex = '-2147483648' // as back as possible
  s.visibility = 'hidden'
  s.pointerEvents = 'none'
  s.overflow = 'auto'

  // Ensure wrapping matches the textarea
  // Most textareas behave like pre-wrap with soft wrap at box width
  ;(mirror as HTMLDivElement).style.whiteSpace = 'pre-wrap'
  ;(mirror as HTMLDivElement).style.wordBreak = 'break-word'
  ;(mirror as HTMLDivElement).style.overflowWrap = 'anywhere'

  // Copy critical layout/typography styles
  for (const prop of STYLE_PROPS) {
    // Copy as string; CSSStyleDeclaration index typing is loose across TS DOM lib
    ;(s as unknown as Record<string, string>)[prop] =
      (style as unknown as Record<string, string | undefined>)[prop] ?? ''
  }

  // Ensure the mirror width tracks the content box of the textarea
  // Using clientWidth avoids subtle rounding issues from borders.
  s.width = `${base.clientWidth}px`
  s.height = `${base.clientHeight}px`

  return mirror
}

export function getTextareaCaretRect(
  element: HTMLTextAreaElement | HTMLInputElement,
  position: number
): CaretRect {
  console.log('🚀 ~ position:', position)
  const doc = element.ownerDocument
  console.log('🚀 ~ doc:', doc)
  const mirror = createMirror(element)
  console.log('🚀 ~ mirror:', mirror)

  // Sync scroll so the caret position reflects what the user sees
  mirror.scrollTop = (element as HTMLTextAreaElement).scrollTop || 0
  mirror.scrollLeft = (element as HTMLTextAreaElement).scrollLeft || 0

  // Populate mirror with the full value so Range metrics are exact
  const value =
    (element as HTMLTextAreaElement).value ??
    (element as HTMLInputElement).value ??
    ''
  // Use a text node to allow Range indexing directly into the content
  const textNode = doc.createTextNode(value)
  mirror.appendChild(textNode)

  // Append to DOM (body) before measuring
  doc.body.appendChild(mirror)

  const range = doc.createRange()
  try {
    const idx = Math.max(0, Math.min(position, value.length))
    range.setStart(textNode, idx)
    range.setEnd(textNode, idx)
  } catch {
    // If positioning fails (shouldn’t), collapse to end
    range.selectNodeContents(mirror)
    range.collapse(false)
  }

  // For empty or edge positions, some browsers return 0-height rects.
  // Insert a zero-width element so we always get a rect.
  let rect = range.getBoundingClientRect()
  const isZeroRect =
    rect &&
    rect.x === 0 &&
    rect.y === 0 &&
    rect.width === 0 &&
    rect.height === 0
  if (!rect || isZeroRect) {
    const probe = doc.createElement('span')
    probe.textContent = '\u200b' // zero-width space
    mirror.insertBefore(probe, textNode.nextSibling)
    const r = doc.createRange()
    r.selectNodeContents(probe)
    rect = r.getBoundingClientRect()
    probe.remove()
  }

  // Cleanup mirror
  mirror.remove()

  const top = rect.top
  const left = rect.left
  const height = Math.max(1, rect.height)
  return { top, left, height, bottom: top + height }
}
