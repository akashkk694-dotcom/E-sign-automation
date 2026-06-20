/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ShieldCheck, FileSignature, Sliders, CheckCircle, Cpu, Radio, 
  HelpCircle, Sparkles, LogIn, HardDrive, KeyRound, AlertCircle, FileText, Check, Download, AlertTriangle, Settings 
} from 'lucide-react';
import LocalBridgeSetup from './components/LocalBridgeSetup';
import SoftCertificateUpload from './components/SoftCertificateUpload';
import SignatureDesigner from './components/SignatureDesigner';
import BatchSigner from './components/BatchSigner';
import SignatureVerifier from './components/SignatureVerifier';
import { DscCertificate, SignableFile } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'sign' | 'setup' | 'soft' | 'batch' | 'verify' | 'settings'>('sign');
  
  // SHARED STATES
  const [selectedCert, setSelectedCert] = useState<DscCertificate | null>(null);
  const [privateKey, setPrivateKey] = useState<any>(null);
  const [virtualCert, setVirtualCert] = useState<DscCertificate | null>(null);

  // Sign files state
  const [activeFile, setActiveFile] = useState<SignableFile | null>(null);

  const handleDocumentUploader = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    
    const reader = new FileReader();
    reader.onload = () => {
      const bytes = new Uint8Array(reader.result as ArrayBuffer);
      setActiveFile({
        id: `single-${Date.now()}`,
        name: file.name,
        size: file.size,
        dataUrl: '',
        rawBytes: bytes,
        status: 'idle'
      });
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSigningSuccess = (signedBytes: Uint8Array, signedFileName: string) => {
    if (!activeFile) return;
    
    // Automatically trigger visual download
    const blob = new Blob([signedBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = signedFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Update state to render success card
    setActiveFile({
      ...activeFile,
      status: 'signed',
      signedBytes: signedBytes,
      signedFileName: signedFileName
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-slate-900 selection:text-white" id="main-application-frame">
      {/* Top Professional Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 shrink-0 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20 text-white">
              <FileSignature className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] tracking-widest font-mono uppercase text-blue-400 font-bold block">
                Enterprise DSC Suite
              </span>
              <h1 className="text-base font-bold text-slate-100 tracking-tight block">
                PDF Digital Signer &amp; automation software
              </h1>
            </div>
          </div>

          {/* Active Credentials Panel */}
          <div className="flex items-center gap-3">
            {selectedCert ? (
              <div className="bg-slate-800 border border-slate-700/60 rounded-xl px-3.5 py-1.5 flex items-center gap-2 max-w-[280px]">
                <ShieldCheck className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
                <div className="truncate text-left">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-mono">DSC Credential Active</span>
                  <span className="font-bold text-white text-[11px] truncate block leading-tight">
                    {selectedCert.commonName}
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-amber-600/10 border border-amber-600/25 rounded-xl px-3.5 py-1.5 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse" />
                <div className="text-left">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-mono">Key Status Slot</span>
                  <span className="font-semibold text-amber-500 text-[10.5px] block leading-tight">
                    USB token disconnected
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap border-b border-slate-200 gap-1" id="main-navigation-row">
          {[
            { id: 'sign', label: 'Interactive Visual Sign', icon: FileSignature },
            { id: 'setup', label: 'Hardware DSC Token', icon: Cpu },
            { id: 'soft', label: 'Alternative Soft PFX', icon: KeyRound },
            { id: 'batch', label: 'Automated Bulk Sign', icon: Sliders },
            { id: 'verify', label: 'Verifier Auditor', icon: ShieldCheck },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  if (tab.id === 'sign' && activeFile?.status === 'signed') {
                    // Reset if signed so they can sign another file
                    setActiveFile(null);
                  }
                }}
                className={`py-3 px-5 text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 border-b-2 rounded-t-lg font-mono cursor-pointer ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 bg-white shadow-sm'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
                id={`nav-tab-${tab.id}`}
              >
                <Icon className="w-4.5 h-4.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB WORKSPACES */}

        {activeTab === 'sign' && (
          <div className="space-y-6" id="workspace-sign-screen">
            {!activeFile ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-2xl mx-auto shadow-sm flex flex-col items-center justify-center space-y-6">
                <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
                  <FileSignature className="w-12 h-12" />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-slate-900">Upload PDF to Apply Visual DSC Signature</h2>
                  <p className="text-sm text-slate-500 max-w-md mx-auto">
                    Choose a local PDF document to place your legally-binding security stamp, configuration reason, locality, and electronic handwriting.
                  </p>
                </div>

                <div className="w-full relative border-2 border-dashed border-slate-300 hover:border-blue-400 bg-slate-50/50 p-10 rounded-2xl cursor-pointer transition">
                  <input
                    type="file"
                    accept="application/pdf"
                    id="primary-pdf-uploader"
                    onChange={handleDocumentUploader}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <FileText className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <span className="text-xs font-bold text-slate-705 block">Choose/Drag your PDF document</span>
                  <span className="text-[11px] text-slate-400 block mt-1 font-mono">Adobe Standard PDF files</span>
                </div>

                {/* Setup warning if no token loaded */}
                {!selectedCert && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex items-start gap-3 max-w-md text-left text-xs leading-relaxed">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-slate-900 mb-0.5">Hardware DSC Token Required</span>
                      By default, secure signatures require keys. Go to the <strong>Hardware DSC Token</strong> tab to configure your physical USB or trigger the simulated ePass2003 Class 3 token instancy!
                    </div>
                  </div>
                )}
              </div>
            ) : activeFile.status === 'signed' ? (
              // Success download card
              <div className="bg-white border border-slate-205 rounded-xl p-8 max-w-lg mx-auto text-center shadow-md space-y-6" id="signing-success-frame">
                <div className="w-16 h-16 bg-emerald-100 border border-emerald-350 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 font-bold" />
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-lg text-slate-900">Document Cryptographically Signed!</h3>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                    The requested document has been compiled successfully. A valid X.509 Adobe-approved signature dictionary block was securely embedded in the document.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border rounded-lg text-left text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-mono">Original Document:</span>
                    <span className="font-medium text-slate-800 truncate max-w-[200px]">{activeFile.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-mono">Signing Certificate:</span>
                    <span className="font-bold text-slate-800">{selectedCert?.commonName || 'Virtual Certificate Authority'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-mono">Assigned Serial:</span>
                    <span className="font-mono text-slate-700 truncate max-w-[180px]">{selectedCert?.serialNumber}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      if (activeFile.signedBytes) {
                        const blob = new Blob([activeFile.signedBytes], { type: 'application/pdf' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = activeFile.signedFileName || 'signed.pdf';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }
                    }}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs cursor-pointer flex items-center justify-center gap-2 transition"
                    id="redownload-pdf-success-btn"
                  >
                    <Download className="w-4 h-4" /> Download Signed PDF
                  </button>
                  <button
                    onClick={() => {
                      setActiveFile(null);
                    }}
                    className="flex-1 py-1 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-250 font-bold text-xs cursor-pointer transition"
                    id="sign-another-file-btn"
                  >
                    Sign New File
                  </button>
                </div>
              </div>
            ) : (
              // Active stamp placement workshop
              <SignatureDesigner
                file={activeFile}
                certificate={selectedCert}
                onSignComplete={handleSigningSuccess}
                onCanceled={() => setActiveFile(null)}
                privateKey={privateKey}
              />
            )}
          </div>
        )}

        {activeTab === 'setup' && (
          <div className="space-y-6" id="workspace-setup-screen">
            <LocalBridgeSetup
              onSelectCertificate={setSelectedCert}
              selectedCert={selectedCert}
              virtualCert={virtualCert}
              setVirtualCert={setVirtualCert}
              setVirtualPrivateKey={setPrivateKey}
            />
          </div>
        )}

        {activeTab === 'soft' && (
          <div className="space-y-6" id="workspace-soft-screen">
            <SoftCertificateUpload
              onSelectCertificate={setSelectedCert}
              onSetPrivateKey={setPrivateKey}
              selectedCert={selectedCert}
            />
          </div>
        )}

        {activeTab === 'batch' && (
          <div className="space-y-6" id="workspace-batch-screen">
            <BatchSigner
              certificate={selectedCert}
              onSignComplete={() => {}}
            />
          </div>
        )}

        {activeTab === 'verify' && (
          <div className="space-y-6" id="workspace-verify-screen">
            <SignatureVerifier />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6" id="workspace-settings-screen">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Settings className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 font-sans">Visual Stamp Preferences</h3>
                <p className="text-xs text-slate-500">Configure and save your default visual signature configuration details saved to local browser storage.</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* STAMP OPACITY */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                  <label htmlFor="settings-stamp-opacity">Default Stamp Opacity</label>
                  <span className="font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    {Math.round((Number(localStorage.getItem('signature_stamp_opacity') || '1.0')) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  id="settings-stamp-opacity"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  value={localStorage.getItem('signature_stamp_opacity') || '1.0'}
                  onChange={(e) => {
                    localStorage.setItem('signature_stamp_opacity', e.target.value);
                    // Force state update to re-render settings page
                    setActiveTab('settings');
                  }}
                />
                <p className="text-[11px] text-slate-400">Controls transparency and overlay blend level of digital signature stamp in documents.</p>
              </div>

              {/* FONT CHOICE */}
              <div className="space-y-2 text-xs">
                <label htmlFor="settings-font-choice" className="block text-xs font-semibold text-slate-700">Preferred Font Choice Style</label>
                <select
                  id="settings-font-choice"
                  className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  value={localStorage.getItem('signature_font_choice') || 'Helvetica'}
                  onChange={(e) => {
                    localStorage.setItem('signature_font_choice', e.target.value);
                    setActiveTab('settings');
                  }}
                >
                  <option value="Helvetica">Helvetica (Standard Clean Sans)</option>
                  <option value="TimesRoman">Times Roman (Classical Serif)</option>
                  <option value="Courier">Courier (Monospace Technical)</option>
                </select>
                <p className="text-[11px] text-slate-400">Determines the core font face of metadata text layer printed on signed PDFs.</p>
              </div>

              {/* BORDER WIDTH */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                  <label htmlFor="settings-border-width">Default Border Width</label>
                  <span className="font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    {localStorage.getItem('signature_border_width') || '1.5'} px
                  </span>
                </div>
                <input
                  type="range"
                  id="settings-border-width"
                  min="0.5"
                  max="4.0"
                  step="0.5"
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  value={localStorage.getItem('signature_border_width') || '1.5'}
                  onChange={(e) => {
                    localStorage.setItem('signature_border_width', e.target.value);
                    setActiveTab('settings');
                  }}
                />
                <p className="text-[11px] text-slate-400">Adjusts the outer border thickness surround bounding box.</p>
              </div>

              {/* COLOURED ACCENT PREFERENCES */}
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div className="space-y-1.5">
                  <label htmlFor="settings-border-color" className="block text-xs font-semibold text-slate-700">Border Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      id="settings-border-color"
                      className="w-10 h-8 rounded border border-slate-200 cursor-pointer bg-white"
                      value={localStorage.getItem('signature_border_color') || '#1e3a8a'}
                      onChange={(e) => {
                        localStorage.setItem('signature_border_color', e.target.value);
                        setActiveTab('settings');
                      }}
                    />
                    <span className="font-mono text-[10px] uppercase text-slate-500">{localStorage.getItem('signature_border_color') || '#1e3a8a'}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="settings-bg-color" className="block text-xs font-semibold text-slate-700">Background Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      id="settings-bg-color"
                      className="w-10 h-8 rounded border border-slate-200 cursor-pointer bg-white"
                      value={localStorage.getItem('signature_background_color') || '#ffffff'}
                      onChange={(e) => {
                        localStorage.setItem('signature_background_color', e.target.value);
                        setActiveTab('settings');
                      }}
                    />
                    <span className="font-mono text-[10px] uppercase text-slate-500">{localStorage.getItem('signature_background_color') || '#ffffff'}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="settings-font-color" className="block text-xs font-semibold text-slate-700">Label Text Color</label>
                  <div className="flex items-center gap-2 font-mono">
                    <input
                      type="color"
                      id="settings-font-color"
                      className="w-10 h-8 rounded border border-slate-200 cursor-pointer bg-white"
                      value={localStorage.getItem('signature_font_color') || '#030712'}
                      onChange={(e) => {
                        localStorage.setItem('signature_font_color', e.target.value);
                        setActiveTab('settings');
                      }}
                    />
                    <span className="font-mono text-[10px] uppercase text-slate-500">{localStorage.getItem('signature_font_color') || '#030712'}</span>
                  </div>
                </div>
              </div>

              {/* CURRENT LIVE STAMP WORKSPACE DEMO PREVIEW */}
              <div className="pt-4 border-t border-slate-200 text-xs text-slate-600">
                <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">Live Stamp Sandbox Preview</span>
                <div 
                  className="rounded-xl p-4 flex items-center justify-center border border-dashed border-slate-300"
                  style={{
                    backgroundColor: '#f8fafc',
                  }}
                >
                  <div
                    className="rounded border select-none flex items-center p-2.5 overflow-hidden shadow-sm"
                    style={{
                      width: '240px',
                      height: '80px',
                      opacity: Number(localStorage.getItem('signature_stamp_opacity') || '1.0'),
                      fontFamily: (localStorage.getItem('signature_font_choice') || 'Helvetica') === 'TimesRoman' ? 'Georgia, serif' : (localStorage.getItem('signature_font_choice') || 'Helvetica') === 'Courier' ? 'Courier New, monospace' : 'inherit',
                      borderColor: localStorage.getItem('signature_border_color') || '#1e3a8a',
                      backgroundColor: localStorage.getItem('signature_background_color') || '#ffffff',
                      borderWidth: `${localStorage.getItem('signature_border_width') || '1.5'}px`,
                      color: localStorage.getItem('signature_font_color') || '#030712',
                    }}
                  >
                    <div className="w-[30%] border-r pr-1 flex flex-col items-center justify-center shrink-0 animate-pulse" style={{ borderColor: localStorage.getItem('signature_border_color') || 'rgba(0,0,0,0.1)' }}>
                      <span className="text-[10px]">🖋️</span>
                      <span className="text-[5px] text-slate-400 mt-0.5 font-mono">INK LAYER</span>
                    </div>

                    <div className="flex-1 flex flex-col justify-between overflow-hidden pl-2 text-[8px] leading-tight" style={{ color: 'inherit' }}>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-0.5 font-bold text-[6px]" style={{ color: localStorage.getItem('signature_border_color') || '#1e3a8a' }}>
                          <Check className="w-1.5 h-1.5 shrink-0 border rounded-full p-0 bg-blue-50" style={{ borderColor: localStorage.getItem('signature_border_color') || '#1e3a8a' }} />
                          <span>DIGITALLY SIGNED</span>
                        </div>
                        <div className="font-bold truncate" style={{ color: 'inherit' }}>
                          {selectedCert?.commonName || 'Dr. Akash Kumar K'}
                        </div>
                      </div>

                      <div className="space-y-[1px] text-[6px] shrink-0 opacity-85" style={{ color: 'inherit' }}>
                        <div>Date: {new Date().toLocaleDateString()}</div>
                        <div className="truncate">Reason: Approved & Bound</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SAVE STATUS ACTION BANNER */}
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] rounded-xl p-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                <div className="font-medium font-mono leading-tight">
                  Preferences Synced! Opacity, font style choices, colored accents, and container border widths are stored dynamically to browser local storage.
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Decorative footer */}
      <footer className="bg-slate-900 text-slate-400 text-center py-6 text-xs border-t border-slate-800 shrink-0 mt-auto" id="app-footer-bar">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <div className="font-semibold text-slate-300">
            &copy; {new Date().getFullYear()} Akash k k. All Rights Reserved.
          </div>
          <div className="text-slate-500 text-xs">
            Support: <a href="mailto:akashkk694@gmail.com" className="text-emerald-400 hover:text-emerald-300 underline font-medium transition-colors">akashkk694@gmail.com</a>
          </div>
          <div className="text-[10px] text-slate-600 flex justify-center items-center gap-1.5 uppercase font-mono tracking-wider pt-1">
            <span>Class 3 Certified</span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
            <span>FIPS 140-2 Level 3 Hardware Approved</span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
            <span>AES-GCM SHA-256</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
