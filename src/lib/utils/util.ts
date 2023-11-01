import { PreventHover } from "$utils/stores"


/**
 * A type that represents an indivisible union of two types.
 * 
 * It enforces that all properties of the second type must be either present in the
 * first type or completely absent.
 * 
 * @template T1 - The first type.
 * @template T2 - The second type.
 */
export type IndivisibleUnion<T1, T2> = (
  | T1 & { [K in keyof T2]?: undefined; } // make optional props : never
  | T1 & T2
)

export function readInput(
  inputOps: Pick<HTMLInputElement, 'accept' | 'multiple'>,
  readAsMethod: 'readAsDataURL' | 'readAsText' | 'readAsArrayBuffer' | 'readAsBinaryString',
  promiseTimeout = 5000,
) {
  type ReadInputStore = {
    file: File,
    data: FileReader['result']
  }

  return new Promise<ReadInputStore[]>((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    Object.assign(input, inputOps)

    input.oninput = () => {
      const files = input.files
      if (!files || !files.length) {
        reject(new Error('No files to read.'))
        return
      }
      // read filelist
      const promises: Promise<ReadInputStore>[] = []
      for (let i = 0; i < files.length; i++) {
        const promise = new Promise<ReadInputStore>((res, rej) => {
          const file = files[i]
          const reader = new FileReader()
          reader.onload = () => {
            const data = reader.result
            res({ file, data })
          }
          reader.onerror = () => {
            rej(new Error('Error reading the file: ' + file.name))
          }

          reader[readAsMethod](file)
        })
        promises.push(promise)
      }
      Promise.allSettled(promises).then((data) => {
        resolve(
          data.filter(
            (item): item is { value: ReadInputStore, status: 'fulfilled' } =>
              item.status === 'fulfilled'
          ).map(item => item.value)
        )
      })
    }
    input.click()
    // input dialog is closed event
    window.addEventListener('focus', () => {
      setTimeout(reject, promiseTimeout, new Error('Promise timed-out, no files selected.'))
    }, { once: true })
  })
}

export function getImageFromSrc(
  src: string,
  imgOpts?: Pick<HTMLImageElement, 'crossOrigin'>
) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    Object.assign(img, imgOpts)

    img.onload = () => { resolve(img) }
    img.onerror = () => { reject(new Error('Error loading the image.')) }
    img.src = src
  })
}

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

export const unexpectedReturnTypeError = (result: any, nameFunc: string, expectedType: string) => {
  return new Error(
    `${nameFunc} returned ${backtick(result?.constructor.name || result)
    } instead of ${backtick(expectedType)}`
  )
}

