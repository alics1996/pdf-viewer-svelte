import {
  getDocument,
  version,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
} from 'pdfjs-dist'
GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.js`

import {
  PDFArray,
  PDFContext,
  PDFDocument,
  PDFName,
  StandardFonts,
  PDFPageLeaf,
  PDFRawStream,
  rgb,
  PDFRef,
  PDFContentStream,
  scale,
  pushGraphicsState,
  PDFDict,
  Cache,
} from 'pdf-lib'

import { encodeString, decodeBytes } from '$utils/util'
import Pako from 'pako'

export async function getPDFJsDocument(
  src: PDFDocument | ArrayBuffer | Uint8Array,
): Promise<PDFDocumentProxy> {
  if (src instanceof PDFDocument) {
    const doc = await src.copy()
    return getDocument(await doc.save()).promise
  }
  return getDocument(src.slice(0)).promise
}

export function lightscalePDF(pdfDoc: PDFDocument): void {
  const context = pdfDoc.context
  const contentStreams = getContentStreams(pdfDoc)

  const processString = (str: string): string =>
    str.replace(/\d*(\.\d+)? \d*(\.\d+)? \d*(\.\d+)?(?= rg)/g, (m) => {
      const [r, g, b] = m.split(' ').map((c) => +c)
      const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b
      return gray > 0.9 ? `1 1 1` : `${r} ${g} ${b}`
    })

  contentStreams.forEach((stream) => {
    processStream({ context, stream, processString })
  })
}

export function resizeToA4(pdfDoc: PDFDocument): void {
  const context = pdfDoc.context
  const pages = pdfDoc.getPages()

  const scaledPatterns: { obj: PDFDict; scale: [number, number] }[] = []

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]
    const { width, height } = page.getSize()

    const a4_width = 594.95,
      a4_height = 840.95
    const scaleX = +(a4_width / width).toFixed(2)
    const scaleY = +(a4_height / height).toFixed(2)

    if (scaleX === 1 && scaleY === 1) continue

    // SCALE PAGE SIZE
    page.setSize(a4_width, a4_height)

    // SCALE CONTENT
    const start = PDFContentStream.of(context.obj({}), [
      pushGraphicsState(),
      scale(scaleX, scaleY),
    ])
    const startRef = context.register(start)
    const endRef = context.getPopGraphicsStateContentStream()
    page.node.normalize()
    page.node.wrapContentStreams(startRef, endRef)

    // SCALE ANNOT
    const annots = page.node.Annots()
    if (annots) {
      for (let j = 0; j < annots.size(); j++) {
        const annot = annots.lookup(j)
        if (annot instanceof PDFDict) {
          const selectors = [
            'RD',
            'CL',
            'Vertices',
            'QuadPoints',
            'L',
            'Rect',
          ]
          for (let k = 0; k < selectors.length; k++) {
            const list = annot.lookup(PDFName.of(selectors[k]))
            if (list instanceof PDFArray)
              list.scalePDFNumbers(scaleX, scaleY)
          }
          const inkLists = annot.lookup(PDFName.of('InkList'))
          if (inkLists instanceof PDFArray) {
            for (let k = 0, len = inkLists.size(); k < len; k++) {
              const arr = inkLists.lookup(k)
              if (arr instanceof PDFArray)
                arr.scalePDFNumbers(scaleX, scaleY)
            }
          }
        }
      }
    }

    // SCALE PATTERNS
    const resources = page.node.Resources()
    if (resources) {
      const patterns = resources.get(PDFName.of('Pattern')) as
        | PDFRef
        | PDFDict
        | undefined
      if (!patterns) continue
      const patternObjs = (function() {
        if (patterns instanceof PDFDict) {
          return patterns.values().map((ref) => {
            if (!(ref instanceof PDFRef)) {
              throw createTypeError(ref, 'patternRef', [PDFRef])
            }
            return ref
          })
        } else if (patterns instanceof PDFRef) {
          return [patterns]
        }
        throw createTypeError(patterns, 'patterns', [PDFRef, PDFDict])
      })()
        .map((ref) => {
          const obj = context.lookup(ref)
          const dict = obj instanceof PDFRawStream ? obj.dict : obj
          if (dict instanceof PDFDict) {
            return dict
          }
          throw createTypeError(dict, 'pattenDict', [PDFDict])
        })
        .filter(Boolean)

      for (let j = 0; j < patternObjs.length; j++) {
        const pattern = patternObjs[j]
        const matrix = pattern.get(PDFName.of('Matrix'))
        if (matrix instanceof PDFArray) {
          const alreadyScaled = scaledPatterns.some(
            ({ obj }) => obj === pattern,
          )
          if (alreadyScaled) {
            const diffScalingNeedsToBeApplied = scaledPatterns.some(
              ({ scale }) =>
                scaleX !== scale[0] || scaleY !== scale[1],
            )
            if (diffScalingNeedsToBeApplied) {
              console.warn(
                'Same pattern obj accross different pages with diff scaling to be applied.\nOnly scaled on 1st iteration',
              )
              // TODO, clone pattern obj if code reaches here and rescale accordingly
            }
            continue
          }
          matrix.scalePDFNumbers(scaleX, scaleY)
          scaledPatterns.push({
            obj: pattern,
            scale: [scaleX, scaleY],
          })
        }
      }
    }
  }
}

export async function addPageNumbers(
  pdfDoc: PDFDocument,
  {
    startFromPage,
    offset,
  }: {
    startFromPage?: number
    offset?: number
  } = {},
) {
  ; (startFromPage ??= 1), (offset ??= 1)

  const myFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fontSize = 13

  const pdfPages = pdfDoc.getPages()

  for (let i = 0; i < pdfPages.length; i++) {
    const page = pdfPages[i]

    const j = i + 1
    if (j < startFromPage) continue

    const { width, height } = page.getSize()
    const string = `${j + offset}`
    const textboxWidth = myFont.widthOfTextAtSize(string, fontSize)

    page.drawText(string, {
      x: width - textboxWidth - 17,
      y: height - 22,
      size: fontSize,
      font: myFont,
      color: rgb(0, 0, 0),
    })
  }
}

type ContentStream = {
  ref: PDFRef
  pdfObj: PDFRawStream | PDFContentStream
}
export function getContentStreams(
  pageOrDoc: PDFDocument | PDFPageLeaf,
): ContentStream[] {
  if (pageOrDoc instanceof PDFDocument) {
    const pages = pageOrDoc.getPages()

    return pages
      .map((page) => getContentStreams(page.node))
      .flat(Infinity as 20)
  }
  if (pageOrDoc instanceof PDFPageLeaf) {
    const context = pageOrDoc.context
    const Contents = pageOrDoc.get(PDFName.Contents)

    if (Contents instanceof PDFRef) {
      const pdfObj = context.lookup(Contents)

      if (
        pdfObj instanceof PDFRawStream ||
        pdfObj instanceof PDFContentStream
      ) {
        return [{ ref: Contents, pdfObj: pdfObj }]
      }
      if (pdfObj instanceof PDFArray) {
        return lookupInPDFArray(pdfObj)
      }
      throw createTypeError(pdfObj, 'pdfObj', [
        PDFRawStream,
        PDFArray,
        PDFContentStream,
      ])
    }
    if (Contents instanceof PDFArray) {
      return lookupInPDFArray(Contents)
    }

    throw createTypeError(Contents, 'Contents', [PDFRef, PDFArray])
  }
  throw createTypeError(pageOrDoc, 'pageOrDoc', [PDFDocument, PDFPageLeaf])
}

export function processStream({
  context,
  stream,
  processString,
}: {
  context: PDFContext
  stream: ContentStream
  processString: (str: string) => string
}) {
  const { ref, pdfObj } = stream

  const contents =
    pdfObj instanceof PDFRawStream ? pdfObj.contents : pdfObj.getContents()
  if (contents.length === 0) return

  const filter = pdfObj.dict.get(PDFName.of('Filter')) as PDFName | undefined

  const string = getStreamString(pdfObj)
  const newString = processString(string)

  switch (filter) {
    case undefined: {
      const newBytes = encodeString(newString)

      context.delete(ref)
      context.assign(
        ref,
        context.stream(newBytes, {
          Lenght: newBytes.length,
        }),
      )
      break
    }
    case PDFName.FlateDecode: {
      const bytes = encodeString(newString)
      const deflatedBytes = Pako.deflate(bytes)

      context.delete(ref)
      context.assign(
        ref,
        context.stream(deflatedBytes, {
          Lenght: deflatedBytes.length,
          Filter: 'FlateDecode',
        }),
      )
      break
    }
    default: {
      throw Error(`Invalid or unsupported filter: ${filter.toString()}`)
    }
  }
}

export function updateContentStreamCache(pageLeaf: PDFPageLeaf) {
  for (const { pdfObj } of getContentStreams(pageLeaf)) {
    if (pdfObj instanceof PDFContentStream) {
      // @ts-ignore
      pdfObj.contentsCache = Cache.populatedBy(pdfObj.computeContents)
    }
  }
}

export function updatePagesCache(pdfDoc: PDFDocument) {
  // @ts-ignore
  pdfDoc.pageCache = Cache.populatedBy(pdfDoc.computePages);
}

export function getStreamString(
  pdfObj: PDFRawStream | PDFContentStream,
): string {
  const contents =
    pdfObj instanceof PDFRawStream
      ? pdfObj.contents
      : pdfObj.computeContents()

  if (contents.length === 0) {
    return ''
  }

  const filter = pdfObj.dict.get(PDFName.of('Filter')) as PDFName | undefined

  switch (filter) {
    case undefined: {
      return pdfObj.getContentsString()
    }
    case PDFName.FlateDecode: {
      const inflatedBytes = Pako.inflate(contents)
      return decodeBytes(inflatedBytes)
    }
    default: {
      throw Error(`Invalid or unsupported filter: ${filter.toString()}`)
    }
  }
}

export function lookupInPDFArray(pdfArray: PDFArray): ContentStream[] {
  const len = pdfArray.size()
  const accArray = Array.from(Array(len))

  return accArray
    .map((_, i) => {
      const ref = pdfArray.get(i)
      const pdfObj = pdfArray.lookup(i)

      if (ref instanceof PDFRef) {
        if (
          pdfObj instanceof PDFRawStream ||
          pdfObj instanceof PDFContentStream
        ) {
          return { ref, pdfObj }
        }
        if (pdfObj instanceof PDFArray) {
          return lookupInPDFArray(pdfObj)
        }
        throw createTypeError(pdfObj, 'pdfObj', [
          PDFRawStream,
          PDFArray,
          PDFContentStream,
        ])
      }
      throw createTypeError(ref, 'ref', [PDFRef])
    })
    .flat(Infinity as 20)
}

export function createTypeError(
  value: any,
  valueName: string,
  types: Function[],
): TypeError {
  if (value === null || value === undefined) {
    return TypeError(`\`${valueName}\` is 'null' or 'undefined'.`)
  }

  if (!Array.isArray(types) || types.length === 0) {
    return TypeError('`types` must be a non-empty array.')
  }

  let isOneOfAllowedTypes = false

  for (const type of types) {
    if (value instanceof type) {
      isOneOfAllowedTypes = true
      break
    }
  }

  const typeNames = types.map((type) => type.name).join(', ')

  return !isOneOfAllowedTypes
    ? TypeError(
      `\`${valueName}\` must be one of: ${typeNames} but was actually: ${value?.constructor.name}`,
    )
    : TypeError(
      `\`${valueName}\` matched the expected: ${value.constructor.name}`,
    )
}
