// Noise synthesizer

import ComplexArray from "dsp-collection/math/ComplexArray";
import * as Fft from "dsp-collection/signal/Fft";
import {convertDbToAmplitude} from "dsp-collection/utils/DspUtils";

type UniFunction = (x: number) => number;

function convertDbToAmplitudeOr0 (x: number) : number {
   return (!Number.isFinite(x) || x <= -90) ? 0 : convertDbToAmplitude(x); }

export function synthesize (spectrumCurveFunction: UniFunction, amplitudeCurveFunction: UniFunction, duration: number, sampleRate: number, agcRmsLevel: number) : Float64Array {
   let n = Math.round(duration * sampleRate);
   if (n % 2 == 1 && n > 4096) {
      n--; }                                                                   // make it even for faster FFT processing
   const n2 = Math.floor(n / 2);
   const specAmplitudes = Float64Array.from({length: n2}, (_x, i) => convertDbToAmplitudeOr0(spectrumCurveFunction(i * sampleRate / n)));
   const timeAmplitudes = Float64Array.from({length: n}, (_x, i) => convertDbToAmplitudeOr0(amplitudeCurveFunction(i / sampleRate)));
   const noise = generateNoise(specAmplitudes, timeAmplitudes);
   if (agcRmsLevel > 0) {
      adjustSignalGain(noise, agcRmsLevel); }
   return noise; }

function generateNoise (specAmplitudes: Float64Array, timeAmplitudes: Float64Array) : Float64Array {
   const n = timeAmplitudes.length;
   const n2 = specAmplitudes.length;
   const specPhases = Float64Array.from({length: n2}, () => Math.random() * 2 * Math.PI);
   const spectrum = ComplexArray.fromPolar(specAmplitudes, specPhases);
   const signal1 = Fft.iFftRealHalf(spectrum, n);
   const signal2 = signal1.map((x, i) => x * timeAmplitudes[i]);
   return signal2; }

function adjustSignalGain (buf: Float64Array, targetRms: number) {
   const n = buf.length;
   if (!n) {
      return; }
   const rms = computeRms(buf);
   if (!rms) {
      return; }
   let r = targetRms / rms;
   const maxAbs = findMaxAbsValue(buf);
   if (r * maxAbs >= 1) {                                                      // prevent clipping
      r = 0.99 / maxAbs; }
   for (let i = 0; i < n; i++) {
      buf[i] *= r; }}

function computeRms (buf: Float64Array) : number {
   const n = buf.length;
   let acc = 0;
   for (let i = 0; i < n; i++) {
      acc += buf[i] ** 2; }
   return Math.sqrt(acc / n); }

function findMaxAbsValue (buf: Float64Array) : number {
   const n = buf.length;
   let maxAbs = 0;
   for (let i = 0; i < n; i++) {
      maxAbs = Math.max(maxAbs, Math.abs(buf[i])); }
   return maxAbs; }
