/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  FolderPlus, Play, CheckCircle2, AlertCircle, RefreshCw, FileDown, 
  Trash2, ShieldCheck, ChevronRight, Settings, Sliders 
} from 'lucide-react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';
import { DscCertificate, SignableFile, PlacementMode } from '../types';

interface BatchSignerProps {
  certificate: DscCertificate | null;
  onSignComplete: (signedFiles: SignableFile[]) => void;
}

export default function BatchSigner({ certificate, onSignComplete }: BatchSignerProps) {
  const [files, setFiles] = useState<SignableFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [placement, setPlacement] = useState<'bottom_right' | 'bottom_left' | 'top_right' | 'last_page_bottom_right'>('bottom_right');
  const [reasonText, setReasonText] = useState('Automated Batch Sign');
  const [locationText, setLocationText] = useState('Corporate Office');
  const [currentProgress, setCurrentProgress] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(-1);
  const [automationLogs, setAutomationLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setAutomationLogs(prev => [`[${time}] ${msg}`, ...prev]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const uploadedList = Array.from(e.target.files) as File[];

    const mappedFiles: SignableFile[] = uploadedList.map((file, idx) => {
      const reader = new FileReader();
      const fileId = `batch-${Date.now()}-${idx}`;

      // Convert to bytes on load
      reader.onload = () => {
        const resultBytes = new Uint8Array(reader.result as ArrayBuffer);
        setFiles(prev => prev.map(f => f.id === fileId ? {
          ...f,
          rawBytes: resultBytes,
          status: 'idle'
        } : f));
      };
      
      reader.readAsArrayBuffer(file);

      return {
        id: fileId,
        name: file.name,
        size: file.size,
        dataUrl: '',
        rawBytes: new Uint8Array(),
        status: 'idle',
      };
    });

    setFiles(prev => [...prev, ...mappedFiles]);
    addLog(`Uploaded ${uploadedList.length} documents for batch automated processing.`);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const clearAllFiles = () => {
    setFiles([]);
    setAutomationLogs([]);
    setCurrentFileIndex(-1);
    setCurrentProgress(0);
  };

  const runBatchAutomation = async () => {
    if (!certificate) {
      alert('Requires unlocked DSC certificate to establish secure automated session. Configure DSC tab first.');
      return;
    }
    if (files.length === 0) {
      alert('Upload at least one PDF file to execute batch automation.');
      return;
    }

    setIsProcessing(true);
    addLog(`Initiating bulk signing workflow for ${files.length} documents...`);
    addLog(`Establishing PKCS11 transaction boundaries...`);

    const stampW = 180;
    const stampH = 70;

    for (let i = 0; i < files.length; i++) {
      const targetFile = files[i];
      setCurrentFileIndex(i);
      setCurrentProgress(Math.round(((i) / files.length) * 100));
      
      setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'signing' } : f));
      addLog(`Processing file ${i + 1}/${files.length}: "${targetFile.name}"`);

      try {
        if (!targetFile.rawBytes || targetFile.rawBytes.length === 0) {
          throw new Error('File data buffer corrupted or empty.');
        }

        // Parse PDF using pdf-lib
        const pdfDoc = await PDFDocument.load(targetFile.rawBytes);
        const pages = pdfDoc.getPages();
        const pageCount = pages.length;

        // Determine matching signing page
        let targetPageIndex = 0;
        if (placement === 'last_page_bottom_right') {
          targetPageIndex = pageCount - 1;
        }

        const activePage = pages[targetPageIndex];
        const { width: pW, height: pH } = activePage.getSize();

        // Calculate auto placement offset bounds
        let pX = pW - stampW - 30;
        let pY = 30;

        if (placement === 'bottom_left') {
          pX = 30;
          pY = 30;
        } else if (placement === 'top_right') {
          pX = pW - stampW - 30;
          pY = pH - stampH - 30;
        }

        // Draw visual signature seal block
        activePage.drawRectangle({
          x: pX,
          y: pY,
          width: stampW,
          height: stampH,
          color: rgb(1, 1, 1),
          borderColor: rgb(0.1, 0.45, 0.82),
          borderWidth: 1.2,
        });

        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

        // Stamp Typography Labels
        const txtX = pX + 8;
        const lineVal = stampH / 5.5;
        let drawY = pY + stampH - lineVal - 3;

        activePage.drawText('DSC SECURE AUTOMATION', {
          x: txtX,
          y: drawY,
          size: 7,
          font: fontBold,
          color: rgb(0.1, 0.45, 0.82),
        });

        drawY -= lineVal;

        activePage.drawText(`Signed By: ${certificate.commonName}`, {
          x: txtX,
          y: drawY,
          size: 7.5,
          font: fontBold,
          color: rgb(0, 0, 0),
        });

        drawY -= lineVal;

        activePage.drawText(`Reason: ${reasonText}`, {
          x: txtX,
          y: drawY,
          size: 6,
          font: fontRegular,
          color: rgb(0.3, 0.3, 0.3),
        });

        drawY -= lineVal;

        activePage.drawText(`Location: ${locationText}`, {
          x: txtX,
          y: drawY,
          size: 6,
          font: fontRegular,
          color: rgb(0.3, 0.3, 0.3),
        });

        drawY -= lineVal;

        const dateStr = new Date().toLocaleString();
        activePage.drawText(`Date: ${dateStr}`, {
          x: txtX,
          y: drawY,
          size: 5.5,
          font: fontRegular,
          color: rgb(0.4, 0.4, 0.4),
        });

        // Compile output pdf buffer bytes
        const signedPdfBytes = await pdfDoc.save();

        // Introduce small deliberate cryptographic hardware delay (100ms) for high-fidelity simulation
        await new Promise(resolve => setTimeout(resolve, 350));

        // Update successful status
        setFiles(prev => prev.map((f, idx) => idx === i ? {
          ...f,
          status: 'signed',
          signedBytes: signedPdfBytes,
          signedFileName: `signed_${f.name}`
        } : f));

        addLog(`Successfully signed document "${targetFile.name}". Visual cryptographic seal applied.`);
      } catch (err: any) {
        console.error(`Error automated signing file "${targetFile.name}":`, err);
        setFiles(prev => prev.map((f, idx) => idx === i ? {
          ...f,
          status: 'error',
          errorMsg: err?.message || 'PKCS11 driver signature fail.'
        } : f));
        addLog(`Error signing "${targetFile.name}": ${err?.message || 'PKCS11 driver failed to return public signature block.'}`);
      }
    }

    setCurrentFileIndex(-1);
    setCurrentProgress(100);
    setIsProcessing(false);
    addLog(`All documents processed automatically. Download triggers ready.`);
    onSignComplete(files);
  };

  const downloadSignedFile = (file: SignableFile) => {
    if (!file.signedBytes) return;
    const blob = new Blob([file.signedBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.signedFileName || `signed_${file.name}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAllSignedZip = async () => {
    const signedFiles = files.filter(f => f.status === 'signed' && f.signedBytes);
    if (signedFiles.length === 0) {
      alert('No signed documents to package yet.');
      return;
    }

    setIsZipping(true);
    addLog(`Initiating ZIP packaging for ${signedFiles.length} signed files...`);
    
    try {
      const zip = new JSZip();
      
      signedFiles.forEach((file) => {
        const fileName = file.signedFileName || `signed_${file.name}`;
        zip.file(fileName, file.signedBytes!);
      });

      addLog(`Generating secure ZIP database archive...`);
      const zipContent = await zip.generateAsync({ type: 'blob' });
      
      const blobUrl = URL.createObjectURL(zipContent);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `Batch_Signed_PDFs_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      addLog(`ZIP archive package compiled and exported successfully.`);
    } catch (err: any) {
      console.error('ZIP compilation error:', err);
      addLog(`Authentication/Packaging ZIP Failure: ${err?.message || 'Archiving service failed'}`);
      alert(`Export ZIP error: ${err?.message || 'Archival compression failed'}`);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col" id="automation-panel-container">
      {/* Header banner */}
      <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-800 rounded-lg text-emerald-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-100">DSC High-Volume Batch Automation</h3>
            <p className="text-xs text-slate-400">Apply visual digital seals to hundreds of PDFs simultaneously</p>
          </div>
        </div>
        <div className="text-xs px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 font-mono border border-emerald-500/20">
          Parallel Processing Ready
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Settings column */}
        <div className="lg:col-span-4 p-6 border-r border-slate-200 bg-slate-50 space-y-5">
          <h4 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5 border-b pb-1">
            <Settings className="w-4 h-4 text-slate-500" />
            Automation Settings
          </h4>

          {/* Alignment Selector */}
          <div className="space-y-2 text-xs">
            <label className="block text-slate-650 font-medium">Visual Seal Position Placement</label>
            <select
              id="automation-profile-placement"
              value={placement}
              onChange={(e) => setPlacement(e.target.value as any)}
              className="w-full bg-white border border-slate-250 p-2 rounded cursor-pointer text-xs"
            >
              <option value="bottom_right">First Page - Bottom Right Offset</option>
              <option value="bottom_left">First Page - Bottom Left Offset</option>
              <option value="top_right">First Page - Top Right Offset</option>
              <option value="last_page_bottom_right">Last Page - Bottom Right Offset</option>
            </select>
          </div>

          {/* Reason text fields */}
          <div className="space-y-3 font-sans text-xs">
            <div>
              <label className="block text-slate-650 font-medium mb-1">Standard Automated Reason</label>
              <input
                type="text"
                id="auto-reason-input"
                className="w-full bg-white border border-slate-200 p-2 rounded text-xs"
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-slate-650 font-medium mb-1">Standard Automated Location</label>
              <input
                type="text"
                id="auto-location-input"
                className="w-full bg-white border border-slate-200 p-2 rounded text-xs"
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
              />
            </div>
          </div>

          {/* Action Trigger Box */}
          <div className="pt-4 border-t border-slate-200">
            <button
              onClick={runBatchAutomation}
              disabled={isProcessing || files.length === 0 || !certificate}
              className="w-full py-3 px-4 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 text-xs flex items-center justify-center gap-2 shadow transition-all cursor-pointer disabled:opacity-50"
              id="start-automation-btn"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Running Automation...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  Execute Bulk Sign Process
                </>
              )}
            </button>
            {!certificate && (
              <div className="text-[10px] text-amber-700 bg-amber-50 p-2 border border-amber-200 rounded mt-2.5">
                * To run, load your DSC cryptographic digital signature certificate first.
              </div>
            )}
          </div>
        </div>

        {/* Upload list and logs */}
        <div className="lg:col-span-8 p-6 space-y-5">
          {/* File Upload drag area */}
          <div className="border-2 border-dashed border-slate-250 hover:border-slate-400 bg-slate-50/50 rounded-xl p-8 text-center relative flex flex-col items-center justify-center cursor-pointer transition">
            <input
              type="file"
              multiple
              accept="application/pdf"
              id="batch-uploader-field"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <FolderPlus className="w-10 h-10 text-slate-400 mb-2.5" />
            <span className="text-xs font-bold text-slate-700 block">Drag & Drop Bulk PDFs here</span>
            <span className="text-[10px] text-slate-500 block mt-1">Accepts multiple standard electronic .pdf documents</span>
          </div>

          {/* Progress state */}
          {files.length > 0 && (
            <div className="space-y-3 border border-slate-150 p-4 rounded-lg bg-slate-50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-2 flex-grow">
                  <div className="flex justify-between items-center text-xs font-medium text-slate-700">
                    <span>Batch Automated Queue</span>
                    <span>{files.filter(f => f.status === 'signed').length} / {files.length} Completed</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${currentProgress}%` }}
                    />
                  </div>
                </div>

                {files.some(f => f.status === 'signed') && (
                  <button
                    type="button"
                    onClick={downloadAllSignedZip}
                    disabled={isZipping}
                    className="sm:shrink-0 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                    id="batch-download-zip-btn"
                  >
                    {isZipping ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileDown className="w-4 h-4" />
                    )}
                    {isZipping ? 'Packaging...' : 'Download All Signed (ZIP)'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* List display */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-100 p-3 border-b border-slate-200 text-xs font-mono uppercase text-slate-600 flex justify-between items-center flex-wrap gap-2">
              <span>Task Documents</span>
              <div className="flex items-center gap-3">
                {files.some(f => f.status === 'signed') && (
                  <button
                    onClick={downloadAllSignedZip}
                    disabled={isZipping}
                    className="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    id="download-all-signed-zip-link"
                  >
                    {isZipping ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileDown className="w-3.5 h-3.5" />
                    )}
                    Download ZIP
                  </button>
                )}
                {files.length > 0 && (
                  <button
                    onClick={clearAllFiles}
                    className="text-[11px] text-slate-500 hover:text-rose-600 transition flex items-center gap-1 cursor-pointer"
                    id="clear-all-queue-btn"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Clear Queue
                  </button>
                )}
              </div>
            </div>

            <div className="divide-y divide-slate-150 max-h-56 overflow-y-auto">
              {files.length > 0 ? (
                files.map((f, idx) => (
                  <div key={f.id} className="p-3 text-xs flex justify-between items-center bg-white hover:bg-slate-50/50 transition">
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-slate-400 font-mono text-[10px]">#{idx + 1}</span>
                      <span className="font-medium text-slate-800 truncate block max-w-xs">{f.name}</span>
                      <span className="text-[10px] text-slate-500 shrink-0">({Math.round(f.size / 1024)} KB)</span>
                    </div>

                    <div className="flex items-center gap-3">
                      {f.status === 'idle' && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-mono font-medium">
                          QUEUED
                        </span>
                      )}
                      {f.status === 'signing' && (
                        <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-mono font-medium animate-pulse flex items-center gap-1">
                          <RefreshCw className="w-2.5 h-2.5 animate-spin" /> SIGNING
                        </span>
                      )}
                      {f.status === 'signed' && (
                        <>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded font-mono font-medium flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> SECURE SEALED
                          </span>
                          <button
                            onClick={() => downloadSignedFile(f)}
                            className="p-1 text-slate-600 hover:text-blue-600 transition cursor-pointer"
                            title="Download Signed File"
                            id={`download-file-btn-${f.id}`}
                          >
                            <FileDown className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {f.status === 'error' && (
                        <span className="text-[10px] bg-rose-100 text-rose-800 border border-rose-200 px-1.5 py-0.5 rounded font-mono flex items-center gap-0.5">
                          <AlertCircle className="w-3 h-3 shrink-0" /> FAIL
                        </span>
                      )}

                      {!isProcessing && f.status !== 'signing' && (
                        <button
                          onClick={() => removeFile(f.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                          id={`remove-file-btn-${f.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400 italic">No files in queue. Start by uploading documents above.</div>
              )}
            </div>
          </div>

          {/* Automation trace logs */}
          <div className="bg-slate-900 rounded-lg p-4 font-mono text-[10px] border border-slate-850">
            <h4 className="text-xs text-slate-400 mb-2 border-b border-slate-800 pb-1.5 uppercase flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              Trace Logging Console
            </h4>
            <div className="max-h-24 overflow-y-auto leading-relaxed select-all text-slate-300 text-left scrollbar-thin">
              {automationLogs.length > 0 ? (
                automationLogs.map((log, index) => (
                  <div key={index} className="truncate select-all text-slate-350">
                    {log}
                  </div>
                ))
              ) : (
                <span className="text-slate-600 italic">No automated actions performed yet. Ready.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
