import { PreventHover } from "$lib/stores"

export function backtick(val: any) {
  return '`' + val + '`'
}

export function attachMouseMoveListener(
  callback: (e: MouseEvent) => void,
  cursor?: string,
) {
  let styleElem: HTMLStyleElement | undefined

  if (cursor) {
    styleElem = document.createElement('style')
    styleElem.innerHTML = `* { cursor: ${cursor} !important; }`
    document.head.append(styleElem)
  }
  PreventHover.set(true)

  window.addEventListener('mousemove', callback)
  window.addEventListener(
    'mouseup',
    (e) => {
      e.stopPropagation()
      callback(e)
      styleElem?.remove()
      window.removeEventListener('mousemove', callback)
      PreventHover.set(false)
    },
    { once: true },
  )
}

export function encodeString(string: string) {
  if (!isString(string)) throw new Error('Input should be of type: string')

  return new Uint8Array([...string].map((_, i) => string.charCodeAt(i)))
}
export function decodeBytes(bytes: Uint8Array) {
  return bytes.reduce(
    (acc, charCode) => acc + String.fromCharCode(charCode),
    '',
  )
}

export function isString(obj: any) {
  return Object.prototype.toString.call(obj) === '[object String]'
}

export function hexToRgb(hex: string): [number, number, number] {
  let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) throw Error('Unexp error.')

  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
  ]
}

export const isCmd = (evt: KeyboardEvent | MouseEvent) => {
  return evt.metaKey || evt.ctrlKey
}
export const isCmdEnter = (evt: KeyboardEvent) => {
  return evt.key === 'Enter' && (evt.metaKey || evt.ctrlKey)
}
export const isCmdShift = (evt: KeyboardEvent | MouseEvent) => {
  return evt.shiftKey && (evt.metaKey || evt.ctrlKey)
}
export const isCmdBackspace = (evt: KeyboardEvent) => {
  return evt.key === 'Backspace' && (evt.metaKey || evt.ctrlKey)
}

export function throttle(callback: Function, delay: number) {
  let wait = false

  return (...args: any[]) => {
    if (wait) return

    callback(...args)

    wait = true
    setTimeout(() => {
      wait = false
    }, delay)
  }
}

export const canvasCtxNotSupportedError = new Error(
  "canvas.getContext() returned 'null': context identifier is not supported.",
)

