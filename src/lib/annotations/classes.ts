import {
  rgb,
  PDFDocument,
  pushGraphicsState,
  setStrokingColor,
  setLineWidth,
  moveTo,
  lineTo,
  stroke,
  popGraphicsState,
  translate,
  concatTransformationMatrix,
  scale,
  rectangle,
  setFillingColor,
  PDFOperator,
  fillAndStroke,
  setLineCap,
  drawObject
} from 'pdf-lib'
import tinycolor from 'tinycolor2'
import { PDFLibPages, type PDFLibPageType } from '$utils/stores'
import { canvasCtxNotSupportedError } from '$utils/util'

let storedPages: PDFLibPageType[] = []
PDFLibPages.subscribe((val) => { storedPages = val })

type Pos = { x: number; y: number }

export class AnnotPos {
  start: Pos
  end: Pos
  ratio: Pos

  constructor() {
    this.start = { x: 0, y: 0 }
    this.end = { x: 0, y: 0 }
    this.ratio = { x: 0, y: 0 }
  }

  get size() {
    const { start, end } = this
    return {
      width: Math.abs(start.x - end.x),
      height: Math.abs(start.y - end.y)
    }
  }
  get transform() {
    const { start, end } = this
    return {
      scaleX: start.x > end.x ? -1 : 1,
      scaleY: start.y < end.y ? -1 : 1,
    }
  }

}

let annotIdIncr = 0

export abstract class Annotation {
  id: number

  constructor(
    public pageId: number,
    public annotPos: AnnotPos,
    public pageDiv: HTMLElement,
  ) {
    this.id = annotIdIncr++
    this.annotPos = annotPos
    this.pageId = pageId
    this.pageDiv = pageDiv
  }

  get boundingRect() {
    return this.pageDiv.getBoundingClientRect()
  }
  get pageIdx() {
    return storedPages.findIndex((pageStore) => pageStore.id === this.pageId)
  }

  getCoords(e: MouseEvent) {
    const boundingRect = this.boundingRect
    return {
      x: e.clientX - boundingRect.left,
      y: boundingRect.height - (e.clientY - boundingRect.top)
    }
  }

  abstract embeddAnnot(pdfDoc: PDFDocument): void | Promise<void>
}

export class SquareAnnot extends Annotation {
  opts: {
    color: string,
    strokeWidth: number
    fillColor: string
  }

  constructor(
    pageId: number,
    annotPos: AnnotPos,
    pageDiv: HTMLElement,
    opts: {
      color?: string
      strokeWidth?: number
      fillColor?: string
    } = {},
  ) {
    super(pageId, annotPos, pageDiv)

    this.opts = {
      strokeWidth: opts.strokeWidth ?? 2.5,
      color: opts.color ?? '#000',
      fillColor: opts.fillColor ?? 'none'
    }
  }

  embeddAnnot(pdfDoc: PDFDocument): void {
    const pdfPage = pdfDoc.getPage(this.pageIdx)

    const { start, end, ratio, size } = this.annotPos
    const strokeWidth = this.opts.strokeWidth
    const color = tinycolor(this.opts.color).toRgb()
    const fillColor = tinycolor(this.opts.fillColor)

    const oppArray: PDFOperator[] = []
    oppArray.push(
      pushGraphicsState(),
      scale(ratio.x, ratio.y),
      setStrokingColor(rgb(color.r / 255, color.g / 255, color.b / 255)),
      setLineWidth(strokeWidth),
    )

    if (fillColor.isValid()) {
      const { r, g, b } = fillColor.toRgb()
      oppArray.push(setFillingColor(rgb(r / 255, g / 255, b / 255)))
    }

    oppArray.push(rectangle(
      Math.min(start.x, end.x),
      Math.min(start.y, end.y),
      size.width,
      size.height
    ))

    if (fillColor.isValid()) {
      oppArray.push(fillAndStroke())
    } else {
      oppArray.push(stroke())
    }

    oppArray.push(popGraphicsState())

    pdfPage.pushOperators(...oppArray)
  }
}

export class ArrowAnnot extends Annotation {
  opts: {
    color: string,
    strokeWidth: number
    headLength: number
  }

  constructor(
    pageId: number,
    annotPos: AnnotPos,
    pageDiv: HTMLElement,
    opts: {
      color?: string
      strokeWidth?: number
      headLength?: number
    } = {},
  ) {
    super(pageId, annotPos, pageDiv)

    this.opts = {
      strokeWidth: opts.strokeWidth ?? 2.5,
      color: opts.color ?? '#000',
      headLength: opts.headLength ?? 6
    }
  }

  get arrowTip() {
    const headLength = this.headLength
    const { width, height } = this.annotPos.size
    const angle = Math.atan2(height, width)

    return {
      xLeft: width - headLength * Math.cos(angle - Math.PI / 6),
      yLeft: height - headLength * Math.sin(angle - Math.PI / 6),
      xRight: width - headLength * Math.cos(angle + Math.PI / 6),
      yRight: height - headLength * Math.sin(angle + Math.PI / 6),
    }
  }
  get headLength() {
    const { headLength, strokeWidth } = this.opts
    return headLength * strokeWidth
  }

  embeddAnnot(pdfDoc: PDFDocument): void {
    const pdfPage = pdfDoc.getPage(this.pageIdx)

    const { start, end, ratio, size, transform } = this.annotPos
    const arrowTip = this.arrowTip
    const strokeWidth = this.opts.strokeWidth
    const color = tinycolor(this.opts.color).toRgb()

    pdfPage.pushOperators(
      pushGraphicsState(),
      scale(ratio.x, ratio.y),
      translate(Math.min(start.x, end.x), Math.min(start.y, end.y)),

      concatTransformationMatrix(
        transform.scaleX,
        0,
        0,
        -transform.scaleY,
        transform.scaleX === 1 ? 0 : size.width,
        -transform.scaleY === 1 ? 0 : size.height
      ),

      setStrokingColor(rgb(color.r / 255, color.g / 255, color.b / 255)),
      setLineWidth(strokeWidth),

      moveTo(0, 0),
      lineTo(size.width, size.height),
      moveTo(arrowTip.xLeft, arrowTip.yLeft),
      lineTo(size.width, size.height),
      lineTo(arrowTip.xRight, arrowTip.yRight),
      stroke(),
      popGraphicsState(),
    )
  }
}

export class CheckMarkAnnot extends Annotation {
  opts: {
    color: string, strokeWidth: number
  }

  constructor(
    pageId: number,
    annotPos: AnnotPos,
    pageDiv: HTMLElement,
    opts: {
      color?: string,
    } = {}
  ) {
    super(pageId, annotPos, pageDiv)

    this.opts = {
      color: opts.color ?? '#000',
      get strokeWidth() {
        return annotPos.size.width * 0.13
      }
    }
  }

  embeddAnnot(pdfDoc: PDFDocument): void {
    const pdfPage = pdfDoc.getPage(this.pageIdx)

    const { start, end, ratio, size, transform } = this.annotPos
    const strokeWidth = this.opts.strokeWidth
    const color = tinycolor(this.opts.color).toRgb()

    pdfPage.pushOperators(
      pushGraphicsState(),
      scale(ratio.x, ratio.y),
      translate(Math.min(start.x, end.x), Math.min(start.y, end.y)),

      concatTransformationMatrix(
        transform.scaleX,
        0,
        0,
        -transform.scaleY,
        transform.scaleX === 1 ? 0 : size.width,
        -transform.scaleY === 1 ? 0 : size.height
      ),

      setStrokingColor(rgb(color.r / 255, color.g / 255, color.b / 255)),
      setLineWidth(strokeWidth),
      setLineCap(1),

      moveTo(0, size.height / 2),
      lineTo(size.width / 3, size.height),
      lineTo(size.width, 0),

      stroke(),
      popGraphicsState()
    )
  }
}

export class ImageAnnot extends Annotation {
  image: HTMLImageElement
  opts: {
    border?: boolean,
    borderColor?: string,
    borderWidth?: number,
    borderStyle?: "solid" | 'dashed'
  }

  constructor(
    pageId: number,
    annotPos: AnnotPos,
    pageDiv: HTMLElement,
    image: HTMLImageElement,
    opts: {
      border?: boolean,
      borderColor?: string,
      borderWidth?: number,
      borderStyle?: "solid" | 'dashed'
    } = {}) {
    if (!image.complete) {
      throw Error("Image hasn't loaded.")
    }

    super(pageId, annotPos, pageDiv)

    this.image = image
    this.opts = opts
  }

  private _base64Img: string | null = null

  get base64Img() {
    if (this._base64Img === null) {
      const canvas = document.createElement('canvas')
      canvas.width = this.image.width
      canvas.height = this.image.height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw canvasCtxNotSupportedError
      }

      ctx.drawImage(this.image, 0, 0)
      this._base64Img = canvas.toDataURL('image/png')
    }
    return this._base64Img
  }

  async embeddAnnot(pdfDoc: PDFDocument): Promise<void> {
    const pdfPage = pdfDoc.getPage(this.pageIdx)

    const { start, end, ratio, size, transform } = this.annotPos

    const image = await pdfPage.doc.embedPng(this.base64Img)
    const xObjectKey = pdfPage.node.newXObject('Image', image.ref);

    pdfPage.pushOperators(
      pushGraphicsState(),
      scale(ratio.x, ratio.y),
      translate(Math.min(start.x, end.x), Math.min(start.y, end.y)),

      concatTransformationMatrix(
        transform.scaleX,
        0,
        0,
        transform.scaleY,
        transform.scaleX === 1 ? 0 : size.width,
        transform.scaleY === 1 ? 0 : size.height
      ),

      scale(size.width, size.height),
      drawObject(xObjectKey),

      popGraphicsState()
    )
  }
}
