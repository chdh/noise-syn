// Application state management

import * as Utils from "./Utils.ts";
import {Point} from "function-curve-editor";
import * as Fflate from "fflate";
import Varint from "varint";

const defaultSampleRate                = 44100;
const defaultAgcRmsLevel               = 0.18;
const defaultSpectrumCurveKnots        = convertKnotsArray([[70, -62], [1100, -25], [2600, -68], [4200, -40], [5500, -71]]);
const defaultAmplitudeCurveKnots       = convertKnotsArray([[0, -50], [0.15, -27], [0.4, -10], [1, -5], [2, -5], [2.7, -12], [2.9, -30], [3, -50]]);

function convertKnotsArray (a: number[][]) : Point[] {
   return a.map((e) => <Point>{x: e[0], y: e[1]}); }

//--- Curve knot compression ---------------------------------------------------

const enum CurveDataType {
   timeAsc,                  // time values in seconds, ascending
   freqAsc,                  // frequency values in Hz, ascending
   db }                      // dB values

interface CurveDataTypeSpec {
   decDigits:                number;
   ascending:                boolean;
   minValue:                 number;
   maxValue:                 number; }

// Note: The x coordinates of the points are guaranteed to be ascending for all data types.
const curveDataTypeSpecMap : Record<CurveDataType, CurveDataTypeSpec> = {
   [CurveDataType.timeAsc]: {decDigits: 3, ascending: true,  minValue: 0,    maxValue: 36000 },
   [CurveDataType.freqAsc]: {decDigits: 0, ascending: true,  minValue: 0,    maxValue: 100000},
   [CurveDataType.db]:      {decDigits: 1, ascending: false, minValue: -200, maxValue: 200   }};

// Returns an integer.
function quantize (x: number, decDigits: number, minValue: number, maxValue: number) : number {
   const x2 = Math.max(minValue, Math.min(maxValue, x));
   return Math.round(x2 * 10 ** decDigits); }

// Returns a float value.
function dequantize (i: number, decDigits: number) : number {
   return i / 10 ** decDigits; }

function quantizeArray (a: ArrayLike<number>, decDigits: number, minValue: number, maxValue: number) : Int32Array {
   const n = a.length;
   const a2 = new Int32Array(n);
   for (let i = 0; i < n; i++) {
      a2[i] = quantize(a[i], decDigits, minValue, maxValue); }
   return a2; }

function dequantizeArray (a: Int32Array, decDigits: number) : Float64Array {
   const n = a.length;
   const a2 = new Float64Array(n);
   for (let i = 0; i < n; i++) {
      a2[i] = dequantize(a[i], decDigits); }
   return a2; }

function differentiate (a: Int32Array) : Int32Array {
   const n = a.length;
   const a2 = new Int32Array(n);
   for (let i = 0; i < n; i++) {
      a2[i] = a[i] - ((i > 0) ? a[i - 1] : 0); }
   return a2; }

function integrate (a: Int32Array) : Int32Array {
   const n = a.length;
   const a2 = new Int32Array(n);
   for (let i = 0; i < n; i++) {
      a2[i] = a[i] + ((i > 0) ? a2[i - 1] : 0); }
   return a2; }

function wrapSign (i: number) : number {
   return (i < 0) ? -i * 2 + 1 : i * 2; }

function unwrapSign (i: number) : number {
   return (i & 1) ? - (i >>> 1) : (i >>> 1); }

function varIntEncodeArray (inp: Int32Array) : Uint8Array {
   const outLen = inp.reduce((acc, x) => acc + Varint.encodingLength(x), 0);
   const out = new Uint8Array(outLen);
   let p = 0;
   for (const x of inp) {
      Varint.encode(x, out, p);
      p += Varint.encode.bytes!; }
   if (p != outLen) {
      throw new Error("Program logic error: VarInt encode output buffer size mismatch."); }
   return out; }

function varIntDecodeArray (inp: Uint8Array) : Int32Array {
   const outLen = inp.reduce((acc, x) => acc + ((x & 0x80) ? 0 : 1), 0);
   const out = new Int32Array(outLen);
   let p1 = 0;
   let p2 = 0;
   while (p1 < inp.length) {
      out[p2++] = Varint.decode(inp, p1);
      p1 += Varint.decode.bytes!; }
   if (p2 != outLen) {
      throw new Error("Program logic error: VarInt decode output buffer size mismatch."); }
   return out; }

function encodeCurveDataByType (curveData: ArrayLike<number>, dataType: CurveDataType) : string {
   const dts = curveDataTypeSpecMap[dataType];
   const a1 = quantizeArray(curveData, dts.decDigits, dts.minValue, dts.maxValue);
   const a2 = differentiate(a1);
   const a3 = dts.ascending ? a2 : a2.map(wrapSign);
   const a4 = varIntEncodeArray(a3);
   const a5 = Fflate.deflateSync(a4, {level: 9});
   const b64 = Utils.encodeBase64UrlBuf(a5);
   return b64; }

function decodeCurveDataByType (b64: string, dataType: CurveDataType) : Float64Array {
   const dts = curveDataTypeSpecMap[dataType];
   const a1 = Utils.decodeBase64UrlBuf(b64);
   const a2 = Fflate.inflateSync(a1);
   const a3 = varIntDecodeArray(a2);
   const a4 = dts.ascending ? a3 : a3.map(unwrapSign);
   const a5 = integrate(a4);
   const a6 = dequantizeArray(a5, dts.decDigits);
   return a6; }

//--- URL set/get --------------------------------------------------------------

function setNum (usp: URLSearchParams, parmName: string, parmValue: number, defaultValue = NaN) {
   if (isNaN(parmValue) || parmValue == defaultValue) {
      return; }
   usp.set(parmName, String(parmValue)); }

function getNum (usp: URLSearchParams, parmName: string, defaultValue = NaN) : number {
   const s = usp.get(parmName);
   if (!s) {
      return defaultValue; }
   const v = Number(s);
   if (isNaN(v)) {
      throw new Error(`Invalid value "${s}" for numeric URL parameter "${parmName}".`); }
   return v; }

function compareKnots (knots1: Point[], knots2: Point[]) : boolean {
   if (knots1.length != knots2.length) {
      return false; }
   const eps = 1E-6;
   for (let i = 0; i < knots1.length; i++) {
      const p1 = knots1[i];
      const p2 = knots2[i];
      if (Math.abs(p1.x - p2.x) > eps || Math.abs(p1.y - p2.y) > eps) {
         return false; }}
   return true; }

function setKnots (usp: URLSearchParams, parmName: string, knots: Point[], xDataType: CurveDataType, yDataType: CurveDataType, defaultValue: Point[]) {
   if (!knots || compareKnots(knots, defaultValue)) {
      return; }
   const xVals = knots.map((e) => e.x);
   const yVals = knots.map((e) => e.y);
   const xStr = encodeCurveDataByType(xVals, xDataType);
   const yStr = encodeCurveDataByType(yVals, yDataType);
   usp.set(parmName, xStr + "*" + yStr); }

function getKnots (usp: URLSearchParams, parmName: string, xDataType: CurveDataType, yDataType: CurveDataType, defaultValue: Point[]) : Point[] {
   const s = usp.get(parmName);
   if (!s) {
      return defaultValue; }
   const sa = s.split("*");
   if (sa.length != 2) {
      throw new Error("Invalid encoded curve knots value structure."); }
   const xStr = sa[0];
   const yStr = sa[1];
   const xVals = decodeCurveDataByType(xStr, xDataType);
   const yVals = decodeCurveDataByType(yStr, yDataType);
   if (xVals.length != yVals.length) {
      throw new Error("Length mismatch of encoded curve knots x/y components."); }
   const knots = Array.from(xVals, (x, i) => ({x, y: yVals[i]}));
   return knots; }

//------------------------------------------------------------------------------

export interface AppState {
   sampleRate:               number;
   agcRmsLevel:              number;
   spectrumCurveKnots:       Point[];
   amplitudeCurveKnots:      Point[]; }

export function encodeAppStateUrlParms (appState: AppState) : string {
   const usp = new URLSearchParams();
   setNum(usp, "sampleRate",  appState.sampleRate,  defaultSampleRate);
   setNum(usp, "agcRmsLevel", appState.agcRmsLevel, defaultAgcRmsLevel);
   setKnots(usp, "spectrumCurve",  appState.spectrumCurveKnots,  CurveDataType.freqAsc, CurveDataType.db, defaultSpectrumCurveKnots);
   setKnots(usp, "amplitudeCurve", appState.amplitudeCurveKnots, CurveDataType.timeAsc, CurveDataType.db, defaultAmplitudeCurveKnots);
   return usp.toString(); }

export function decodeAppStateUrlParms (urlParmsString: string) : AppState {
   const usp = new URLSearchParams(urlParmsString);
   const appState = <AppState>{};
   appState.sampleRate  = getNum(usp, "sampleRate", defaultSampleRate);
   appState.agcRmsLevel = getNum(usp, "agcRmsLevel", defaultAgcRmsLevel);
   appState.spectrumCurveKnots  = getKnots(usp, "spectrumCurve",  CurveDataType.freqAsc, CurveDataType.db, defaultSpectrumCurveKnots);
   appState.amplitudeCurveKnots = getKnots(usp, "amplitudeCurve", CurveDataType.timeAsc, CurveDataType.db, defaultAmplitudeCurveKnots);
   return appState; }
