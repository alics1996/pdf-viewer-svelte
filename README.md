# PDF viewer (Svelte + TS + Vite)

A basic pdf viewer for merging and annotating pdf documents, tested to work in Chrome and Firefox, there are some issues in Safari (doesn't register pointer events on elements that overflow svg).

*Annotations* are baked into the pdf content stream as regular drawing instructions and may not be hid or removed ocne added as is the case with regular pdf annotations.

Also, it is possible to delete / insert blank pages. 

## Usage

1. clone the repo ```git clone https://github.com/alics1996/pdf-viewer-svelte.git```
2. cd into the project directory ```cd pdf-viewer-svelte```
3. install all modules ```npm i```
4. run local server ```npm run dev```
5. server should start on default port 5173 - [localhost:5173](http://localhost:5173/)

## Shapes available

- rectangle (s)
- arrow (a)
- checkmark (c)
- image (i)
- custom signature (shift + s, replace default image in './public/signature.png')

### TODO
- add functionality to insert text as well as headers and footers for things like page numbers etc...
