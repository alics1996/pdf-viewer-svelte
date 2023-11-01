import { writable } from 'svelte/store'
import type { PDFPage, PDFDocument } from 'pdf-lib'
import type { Annotation } from '$annotations/classes'
import { updatePagesCache } from '$utils/pdf_utils'

export const FileName = writable('document.pdf')

export const PDFLibDoc = writable<PDFDocument | undefined>()

let _PDFLibDoc: PDFDocument | undefined = undefined
PDFLibDoc.subscribe((pdfDoc) => { _PDFLibDoc = pdfDoc })

export type PDFLibPageType = {
  id: number
  pageObj: PDFPage
  pageDiv?: HTMLElement
}
export const PDFLibPages = writable<PDFLibPageType[]>()

let pageIdIncr = 0
PDFLibDoc.subscribe((pdfDoc) => {
  if (!pdfDoc) return

  PDFLibPages.set(pdfDoc.getPages().map(pageObj => (
    { id: pageIdIncr++, pageObj }
  )))
})

export function insertPage(insertAfterIdx: number) {
  if (!_PDFLibDoc) return

  const i = insertAfterIdx + 1
  const pageObj = _PDFLibDoc.insertPage(i)

  PDFLibPages.update(pagesArray => {
    pagesArray.splice(i, 0, { id: pageIdIncr++, pageObj })
    return pagesArray
  })
}
export function deletePage(index: number) {
  if (!_PDFLibDoc) return

  _PDFLibDoc.removePage(index)
  updatePagesCache(_PDFLibDoc)
  PDFLibPages.update(pagesArray => pagesArray.filter((_, i) => i !== index))
}

export const AnnotTools = ['', 'square', 'arrow', 'checkmark', 'signature', 'image'] as const

export const AnnotColor = writable<string>('#eb1a30')

export const SelectedTool = writable<typeof AnnotTools[number]>('')

export const IntObserver = writable<IntersectionObserver>()

export const StoredAnnotations = writable<Annotation[]>([])

export const PreventHover = writable<boolean>(false)
