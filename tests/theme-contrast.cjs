const assert = require('node:assert/strict')
const fs = require('node:fs')
const css = fs.readFileSync('src/semantic-theme.css', 'utf8')
const light = css.match(/:root\s*\{([^}]+)\}/)[1]
const dark = css.match(/html\[data-theme='dark'\]\s*\{([^}]+)\}/)[1]
function color(block, name) {
  const match = block.match(new RegExp(`--theme-${name}:\\s*(#[0-9a-f]{6})`, 'i'))
  assert.ok(match, `missing ${name}`)
  return match[1]
}
function luminance(hex) {
  const components = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  return components[0] * .2126 + components[1] * .7152 + components[2] * .0722
}
function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (values[0] + .05) / (values[1] + .05)
}
for (const [name, block] of [['light', light], ['dark', dark]]) {
  for (const [foreground, background] of [['text-primary', 'background'], ['text-primary', 'surface'], ['text-secondary', 'surface'], ['text-secondary', 'surface-raised'], ['accent', 'surface'], ['button-text', 'button']]) {
    const ratio = contrast(color(block, foreground), color(block, background))
    assert.ok(ratio >= 4.5, `${name}: ${foreground} on ${background} has ${ratio.toFixed(2)}:1 contrast`)
  }
}
console.log('Light and dark semantic text/button colors meet 4.5:1 contrast')
