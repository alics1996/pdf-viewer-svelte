import { PDFDocument } from "pdf-lib"
import { writable } from "svelte/store"
import { unexpectedReturnTypeError } from "../utils/util"

export type LoadedFileT = {
  readonly id: number
  readonly file: File
  readonly filelistIdx: number
  isMounted: boolean
  readonly fileName: string
  readonly pdfDoc: PDFDocument | undefined
  readonly deleteItem: () => void
  readonly promise: Promise<void>
}

export const LoadedFiles = writable<LoadedFileT[]>([])

let incr = 0

export function pushToLoadedFiles(fileList: FileList) {
  const promiseArr: Promise<void>[] = []

  for (let i = 0; i < fileList.length; i++) {
    const id = incr++
    const file = fileList[i]
    let _pdfDoc: PDFDocument | undefined = undefined

    function deleteItem() {
      LoadedFiles.update(files => files.filter(item => item.id !== id))
    }

    const promise = new Promise<void>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const data = reader.result
        if (!(data instanceof ArrayBuffer)) {
          reject()
          throw unexpectedReturnTypeError(data, 'FileReader', 'ArrayBuffer')
        }
        PDFDocument.load(data, { throwOnInvalidObject: true })
          .then((pdf) => {
            _pdfDoc = pdf
            resolve()
          })
          .catch((err: unknown) => {
            const msg = err instanceof Error ? err.message : err?.toString() ?? 'unknown error'
            reject(new Error('Error parsing the pdf file: ' + msg))
          })
          .finally(() => LoadedFiles.update(array => array))
      }
      reader.onerror = () => {
        reject(new Error('Error occurred reading the file'))
      }

      reader.readAsArrayBuffer(file)
    })

    LoadedFiles.update(files => {
      files.push({
        id,
        file,
        filelistIdx: i,
        isMounted: false,
        fileName: file.name,
        get pdfDoc() {
          return _pdfDoc
        },
        deleteItem,
        promise,
      })
      return files
    })
  }
  return Promise.allSettled(promiseArr)
}
