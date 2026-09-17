// three.js materials and 2D canvas contexts take colours as strings, so the
// palette is read out of tokens.css rather than written a second time in JS.
// styles/tokens.css stays the only place a colour is spelled out.
export function readToken(name, element = document.documentElement) {
  return getComputedStyle(element).getPropertyValue(name).trim()
}
