import * as Rfc4648 from "rfc4648";

const dummyResolvedPromise = Promise.resolve();
const numberFormat = new Intl.NumberFormat("en-US");

export function nextTick (callback: () => void) {
   void dummyResolvedPromise.then(callback); }

export function formatNumber (n: number | undefined, includeSign: boolean = false) : string {
   if (n === undefined || !isFinite(n)) {
      return ""; }
   const plusSign = (includeSign && n > 0) ? "+" : "";
   return plusSign + numberFormat.format(n).replace(/,/g, "\u202F"); }

// Returns undefined if the string does not contain a valid number.
export function decodeNumber (s: string) : number | undefined {
   if (!s) {
      return undefined; }
   const n = Number(s.replace(/[\u{2000}-\u{20FF}]/gu, ""));
   return isFinite(n) ? n : undefined; }

export function catchError (f: Function, ...args: any[]) {
   void catchErrorAsync(f, ...args); }

async function catchErrorAsync (f: Function, ...args: any[]) {
   try {
      const r = f(...args);
      if (r instanceof Promise) {
         await r; }}
    catch (error) {
      console.log(error);
      alert("Error: " + error); }}

export function openSaveAsDialog (data: ArrayBuffer, fileName: string, mimeType: string, fileNameExtension: string, fileTypeDescription: string) {
   if ((<any>window).showSaveFilePicker) {
      catchError(openSaveAsDialog_new, data, fileName, mimeType, fileNameExtension, fileTypeDescription); }
    else {
      openSaveAsDialog_old(data, fileName, mimeType); }}

async function openSaveAsDialog_new (data: ArrayBuffer, fileName: string, mimeType: string, fileNameExtension: string, fileTypeDescription: string) {
   const fileTypeDef: any = {};
   fileTypeDef[mimeType] = ["." + fileNameExtension];
   const pickerOpts = {
      suggestedName: fileName,
      types: [{
         description: fileTypeDescription,
         accept: fileTypeDef }]};
   let fileHandle: FileSystemFileHandle;
   try {
      fileHandle = await (<any>window).showSaveFilePicker(pickerOpts); }
    catch (e) {
      if (e.name == "AbortError") {
         return; }
      throw e; }
   const stream /* : FileSystemWritableFileStream */ = await (<any>fileHandle).createWritable();
   await stream.write(data);
   await stream.close(); }

function openSaveAsDialog_old (data: ArrayBuffer, fileName: string, mimeType: string) {
   const blob = new Blob([data], {type: mimeType});
   const url = URL.createObjectURL(blob);
   const element = document.createElement("a");
   element.href = url;
   element.download = fileName;
   const clickEvent = new MouseEvent("click");
   element.dispatchEvent(clickEvent);
   setTimeout(() => URL.revokeObjectURL(url), 60000);
   (<any>document).dummySaveAsElementHolder = element; }                       // to prevent garbage collection

export function encodeBase64UrlBuf (buf: Uint8Array) : string {
   if ((<any>buf).toBase64) {
      return (<any>buf).toBase64({alphabet: "base64url", omitPadding: true}); }
    else {                                                                     // fallback for old browsers
      return Rfc4648.base64url.stringify(buf, {pad: false}); }}

export function decodeBase64UrlBuf (s: string) : Uint8Array {
   if ((<any>Uint8Array).fromBase64) {
      return (<any>Uint8Array).fromBase64(s, {alphabet: "base64url"}); }
    else {                                                                     // fallback for old browsers
      return Rfc4648.base64url.parse(s, {loose: true}); }}
