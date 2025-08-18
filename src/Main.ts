// Main GUI application.

import * as Utils from "./Utils.ts";
import {catchError} from "./Utils.ts";
import InternalAudioPlayer from "./InternalAudioPlayer.js";
import * as DomUtils from "./DomUtils.ts";
import * as UrlUtils from "./UrlUtils.ts";
import * as NoiseSyn from "./NoiseSyn.ts";
import * as WavFileEncoder from "wav-file-encoder";
import * as FunctionCurveViewer from "function-curve-viewer";
import * as FunctionCurveEditor from "function-curve-editor";
import {Point} from "function-curve-editor";

var audioPlayer:                       InternalAudioPlayer;

// GUI components:
var spectrumEditorWidget:              FunctionCurveEditor.Widget;
var amplitudeEditorWidget:             FunctionCurveEditor.Widget;
var outputSignalViewerWidget:          FunctionCurveViewer.Widget;

// Output signal:
var outputSignalValid:                 boolean = false;
var outputSignal:                      Float64Array;
var outputSampleRate:                  number;

// Demo parms:
// const demoAmplitudeCurveKnots = [[0, -50], [0.1, -30], [0.3, -7], [1, -5], [2, -5], [2.7, -7], [2.9, -30], [3, -50]];
// e 260Hz (testSound1.wav):
// const demoSpectrumCurveKnots  = [[50, -83.06], [100, -70.23], [150, -58.51], [200, -54.04], [250, -53.42], [300, -52.25], [350, -48.41], [400, -43.89], [450, -41.13], [500, -40.96], [550, -41.26], [600, -46.81], [650, -56.38], [700, -63.91], [750, -65.05], [800, -65.13], [850, -65.82], [900, -66.75], [950, -67.35], [1000, -67.40], [1050, -67.52], [1100, -69.11], [1150, -71.66], [1200, -73.57], [1250, -73.82], [1300, -73.53], [1350, -71.90], [1400, -69.61], [1450, -68.14], [1500, -67.94], [1550, -68.02], [1600, -68.90], [1650, -70.36], [1700, -71.43], [1750, -71.48], [1800, -70.44], [1850, -66.43], [1900, -61.24], [1950, -58.11], [2000, -57.57], [2050, -57.21], [2100, -56.09], [2150, -54.62], [2200, -53.72], [2250, -53.53], [2300, -53.58], [2350, -53.68], [2400, -53.54], [2450, -53.24], [2500, -53.05], [2550, -52.99], [2600, -53.18], [2650, -53.99], [2700, -54.91], [2750, -55.34], [2800, -55.68], [2850, -57.01], [2900, -58.99], [2950, -60.33], [3000, -60.60], [3050, -60.60], [3100, -60.91], [3150, -61.78], [3200, -62.66], [3250, -62.95], [3300, -62.07], [3350, -59.56], [3400, -56.27], [3450, -54.09], [3500, -53.40], [3550, -53.30], [3600, -53.58], [3650, -54.53], [3700, -55.70], [3750, -56.37], [3800, -56.96], [3850, -58.68], [3900, -62.19], [3950, -65.88], [4000, -68.02], [4050, -69.18], [4100, -71.67], [4150, -77.12], [4200, -83.77], [4250, -88.34], [4300, -89.91], [4350, -90.60], [4400, -91.48], [4450, -92.39], [4500, -92.91], [4550, -92.65], [4600, -91.57], [4650, -89.72], [4700, -87.76], [4750, -86.55], [4800, -86.22], [4850, -86.30], [4900, -86.77], [4950, -87.74], [5000, -88.66], [5050, -88.87], [5100, -88.06], [5150, -86.54], [5200, -85.11], [5250, -84.41], [5300, -84.13], [5350, -84.09], [5400, -84.23], [5450, -84.39]];
// const demoAmplitudeCurveKnots = [[0.01, -67.07], [0.03, -71.18], [0.05, -69.27], [0.07, -68.13], [0.09, -64.76], [0.11, -25.24], [0.13, -18.82], [0.15, -15.45], [0.17, -16.31], [0.19, -16.15], [0.21, -17.85], [0.23, -18.24], [0.25, -18.11], [0.27, -16.91], [0.29, -15.94], [0.31, -15.84], [0.33, -15.77], [0.35, -15.73], [0.37, -15.37], [0.39, -15.55], [0.41, -15.02], [0.43, -13.80], [0.45, -14.21], [0.47, -14.02], [0.49, -13.59], [0.51, -13.86], [0.53, -14.68], [0.55, -14.71], [0.57, -13.40], [0.59, -13.46], [0.61, -14.64], [0.63, -15.25], [0.65, -14.98], [0.67, -14.81], [0.69, -14.26], [0.71, -14.11], [0.73, -13.66], [0.75, -14.11], [0.77, -14.49], [0.79, -14.45], [0.81, -14.96], [0.83, -15.64], [0.85, -15.59], [0.87, -14.77], [0.89, -13.78], [0.91, -13.63], [0.93, -14.37], [0.95, -14.93], [0.97, -14.85], [0.99, -13.88], [1.01, -14.43], [1.03, -14.12], [1.05, -14.38], [1.07, -14.66], [1.09, -15.72], [1.11, -14.72], [1.13, -13.86], [1.15, -12.98], [1.17, -14.26], [1.19, -14.56], [1.21, -14.00], [1.23, -13.83], [1.25, -14.75], [1.27, -14.67], [1.29, -14.13], [1.31, -13.77], [1.33, -13.74], [1.35, -13.84], [1.37, -14.24], [1.39, -14.34], [1.41, -15.31], [1.43, -15.85], [1.45, -15.59], [1.47, -15.00], [1.49, -13.41], [1.51, -13.43], [1.53, -13.54], [1.55, -14.31], [1.57, -15.25], [1.59, -15.58], [1.61, -16.51], [1.63, -18.05], [1.65, -17.55], [1.67, -17.58], [1.69, -22.93], [1.71, -25.34], [1.73, -30.65], [1.75, -34.75], [1.77, -45.99], [1.79, -45.72], [1.81, -52.53], [1.83, -55.23], [1.85, -56.40], [1.87, -60.12], [1.89, -60.52], [1.91, -66.04], [1.93, -65.28]];
// ZHCorpus 122756:
const demoSpectrumCurveKnots  = [[50, -86.39], [150, -61.04], [250, -55.89], [350, -49.89], [450, -42.51], [550, -42.53], [650, -48.63], [750, -52.49], [850, -51.6], [950, -51.68], [1050, -53.1], [1150, -62.43], [1250, -70.52], [1350, -72.36], [1450, -77.33], [1550, -81.49], [1650, -83.23], [1750, -83.82], [1850, -85.59], [1950, -87.21], [2050, -86.16], [2150, -84.01], [2250, -81.35], [2350, -78.14], [2450, -71.38], [2550, -67.28], [2650, -63.12], [2750, -57.67], [2850, -55.63], [2950, -55.87], [3050, -57.29], [3150, -57.74], [3250, -58.2], [3350, -60.83], [3450, -69.91], [3550, -82.53], [3650, -88.85]];
const demoAmplitudeCurveKnots = [[0.01, -86.52], [0.03, -86.63], [0.05, -86.75], [0.07, -86.87], [0.09, -86.91], [0.11, -76.65], [0.13, -69.80], [0.15, -59.49], [0.17, -33.46], [0.19, -29.12], [0.21, -27.60], [0.23, -26.23], [0.25, -24.80], [0.27, -23.71], [0.29, -22.41], [0.31, -21.45], [0.33, -19.85], [0.35, -18.19], [0.37, -17.08], [0.39, -16.62], [0.41, -16.89], [0.43, -17.72], [0.45, -17.68], [0.47, -16.79], [0.49, -16.15], [0.51, -15.63], [0.53, -15.13], [0.55, -14.51], [0.57, -14.53], [0.59, -15.56], [0.61, -16.69], [0.63, -16.02], [0.65, -15.29], [0.67, -14.59], [0.69, -13.62], [0.71, -13.37], [0.73, -14.82], [0.75, -13.90], [0.77, -13.11], [0.79, -15.01], [0.81, -15.66], [0.83, -14.87], [0.85, -15.81], [0.87, -14.84], [0.89, -15.46], [0.91, -13.94], [0.93, -14.24], [0.95, -14.61], [0.97, -13.75], [0.99, -15.39], [1.01, -15.13], [1.03, -15.64], [1.05, -15.19], [1.07, -15.47], [1.09, -15.28], [1.11, -13.98], [1.13, -15.30], [1.15, -14.73], [1.17, -15.35], [1.19, -14.17], [1.21, -16.20], [1.23, -15.44], [1.25, -15.76], [1.27, -15.14], [1.29, -15.48], [1.31, -14.14], [1.33, -15.59], [1.35, -14.15], [1.37, -15.63], [1.39, -14.17], [1.41, -16.44], [1.43, -16.14], [1.45, -16.44], [1.47, -15.86], [1.49, -15.81], [1.51, -14.96], [1.53, -16.14], [1.55, -15.35], [1.57, -16.55], [1.59, -14.92], [1.61, -16.80], [1.63, -17.01], [1.65, -17.42], [1.67, -17.49], [1.69, -17.76], [1.71, -16.69], [1.73, -17.01], [1.75, -16.62], [1.77, -18.33], [1.79, -18.63], [1.81, -19.56], [1.83, -20.12], [1.85, -20.56], [1.87, -21.27], [1.89, -23.37], [1.91, -27.70], [1.93, -33.91], [1.95, -47.12], [1.97, -57.18], [1.99, -86.86], [2.01, -86.94], [2.03, -86.76], [2.05, -87.10]];

//--- Curve editors -----------------------------------------------------------

function convertKnotsArray (a: number[][]) : Point[] {
   return a.map((e) => <Point>{x: e[0], y: e[1]}); }

function getLastKnotX (knots: Point[]) : number | undefined {
   return knots.length ? knots[knots.length - 1].x : undefined; }

function loadSpectrumCurveEditor (knots: Point[]) {
   const editorState = <FunctionCurveEditor.EditorState>{
      knots:           knots,
      xMin:            0,
      xMax:            5500,
      yMin:            -100,
      yMax:            0,
      extendedDomain:  false,
      relevantXMin:    0,
      gridEnabled:     true,
      primaryZoomMode: FunctionCurveEditor.ZoomMode.x,
      focusShield:     true };
   spectrumEditorWidget.setEditorState(editorState); }

function loadAmplitudeCurveEditor (knots: Point[]) {
   const xMax = getLastKnotX(knots) ?? 5;
   const editorState = <FunctionCurveEditor.EditorState>{
      knots:           knots,
      xMin:            0,
      xMax,
      yMin:            -70,
      yMax:            0,
      extendedDomain:  false,
      relevantXMin:    0,
      gridEnabled:     true,
      primaryZoomMode: FunctionCurveEditor.ZoomMode.x,
      focusShield:     true };
   amplitudeEditorWidget.setEditorState(editorState); }

//--- Curve viewer ------------------------------------------------------------

function loadSignalViewer (widget: FunctionCurveViewer.Widget, signal: ArrayLike<number>, sampleRate: number) {
   const viewerFunction = FunctionCurveViewer.createViewerFunctionForArray(signal, {scalingFactor: sampleRate});
   const yRange = 1.2;
   const viewerState : Partial<FunctionCurveViewer.ViewerState> = {
      viewerFunction:  viewerFunction,
      xMin:            0,
      xMax:            signal.length / sampleRate,
      yMin:            -yRange,
      yMax:            yRange,
      gridEnabled:     true,
      primaryZoomMode: FunctionCurveViewer.ZoomMode.x,
      xAxisUnit:       "s",
      focusShield:     true };
   widget.setViewerState(viewerState); }

//-----------------------------------------------------------------------------

function loadParmsFromUrl() {
   const urlParmsString = window.location.hash.substring(1);
   const usp = new URLSearchParams(urlParmsString);
   //
   const sampleRate  = UrlUtils.getNum(usp, "sampleRate",  44100);
   const agcRmsLevel = UrlUtils.getNum(usp, "agcRmsLevel", 0.18);
   //
   DomUtils.setValueNum("sampleRate",  sampleRate);
   DomUtils.setValueNum("agcRmsLevel", agcRmsLevel);
   //
   loadSpectrumCurveEditor(convertKnotsArray(demoSpectrumCurveKnots));
   loadAmplitudeCurveEditor(convertKnotsArray(demoAmplitudeCurveKnots)); }

function synthesizeButton_click() {
   audioPlayer.stop();
   outputSampleRate = DomUtils.getValueNum("sampleRate");
   const agcRmsLevel = DomUtils.getValueNum("agcRmsLevel");
   const spectrumCurveFunction = spectrumEditorWidget.getFunction();
   const amplitudeCurveFunction = amplitudeEditorWidget.getFunction();
   const ampliduteEditorState = amplitudeEditorWidget.getEditorState();
   const duration = getLastKnotX(ampliduteEditorState.knots) ?? 1;
   outputSignal = NoiseSyn.synthesize(spectrumCurveFunction, amplitudeCurveFunction, duration, outputSampleRate, agcRmsLevel);
   outputSignalValid = true;
   loadSignalViewer(outputSignalViewerWidget, outputSignal, outputSampleRate);
   refreshMainGui(); }

async function synthesizeAndPlayButton_click() {
   if (audioPlayer.isPlaying()) {
      audioPlayer.stop();
      return; }
   synthesizeButton_click();
   await playOutputButton_click(); }

async function playOutputButton_click() {
   if (audioPlayer.isPlaying()) {
      audioPlayer.stop();
      return; }
   await audioPlayer.playSamples(outputSignal, outputSampleRate); }

function saveOutputWavFileButton_click() {
   audioPlayer.stop();
   const wavFileData = WavFileEncoder.encodeWavFile2([outputSignal], outputSampleRate, WavFileEncoder.WavFileType.float32);
   const fileName = "noise.wav";
   Utils.openSaveAsDialog(wavFileData, fileName, "audio/wav", "wav", "WAV audio file"); }

function refreshMainGui() {
   outputSignalViewerWidget.disabled = !outputSignalValid;
   DomUtils.setText("synthesizeAndPlayButton", audioPlayer.isPlaying() ? "Stop" : "Synth + Play");
   DomUtils.enableElement("playOutputButton", outputSignalValid);
   DomUtils.setText("playOutputButton", audioPlayer.isPlaying() ? "Stop" : "Play");
   DomUtils.enableElement("saveOutputWavFileButton", outputSignalValid); }

function functionCurveEditorHelpButton_click() {
   const t = document.getElementById("functionCurveEditorHelpText")!;
   t.innerHTML = spectrumEditorWidget.getFormattedHelpText();
   t.classList.toggle("hidden"); }

function functionCurveViewerHelpButton_click() {
   const t = document.getElementById("functionCurveViewerHelpText")!;
   t.innerHTML = outputSignalViewerWidget.getFormattedHelpText();
   t.classList.toggle("hidden"); }

function startup() {
   audioPlayer = new InternalAudioPlayer();
   audioPlayer.addEventListener("stateChange", refreshMainGui);
   const spectrumEditorCanvas     = <HTMLCanvasElement>document.getElementById("spectrumEditorCanvas")!;
   const amplitudeEditorCanvas    = <HTMLCanvasElement>document.getElementById("amplitudeEditorCanvas")!;
   const outputSignalViewerCanvas = <HTMLCanvasElement>document.getElementById("outputSignalViewerCanvas")!;
   spectrumEditorWidget     = new FunctionCurveEditor.Widget(spectrumEditorCanvas);
   amplitudeEditorWidget    = new FunctionCurveEditor.Widget(amplitudeEditorCanvas);
   outputSignalViewerWidget = new FunctionCurveViewer.Widget(outputSignalViewerCanvas);
   DomUtils.addClickEventListener("synthesizeButton", synthesizeButton_click);
   DomUtils.addClickEventListener("synthesizeAndPlayButton", synthesizeAndPlayButton_click);
   DomUtils.addClickEventListener("playOutputButton", playOutputButton_click);
   DomUtils.addClickEventListener("saveOutputWavFileButton", saveOutputWavFileButton_click);
   DomUtils.addClickEventListener("functionCurveEditorHelpButton", functionCurveEditorHelpButton_click);
   DomUtils.addClickEventListener("functionCurveViewerHelpButton", functionCurveViewerHelpButton_click);
   loadParmsFromUrl();
   refreshMainGui(); }

document.addEventListener("DOMContentLoaded", () => catchError(startup));
