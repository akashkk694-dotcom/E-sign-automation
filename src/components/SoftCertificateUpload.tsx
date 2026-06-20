/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Key, FileKey, CheckCircle2, AlertCircle, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { parseP12Certificate } from '../utils/crypto';
import { DscCertificate } from '../types';

interface SoftCertificateUploadProps {
  onSelectCertificate: (cert: DscCertificate | null) => void;
  onSetPrivateKey: (privateKey: any) => void;
  selectedCert: DscCertificate | null;
}

export default function SoftCertificateUpload({
  onSelectCertificate,
  onSetPrivateKey,
  selectedCert,
}: SoftCertificateUploadProps) {
  const [pfxBytes, setPfxBytes] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successCert, setSuccessCert] = useState<DscCertificate | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    setFileName(file.name);
    setErrorMsg(null);
    setSuccessCert(null);

    const reader = new FileReader();
    reader.onload = () => {
      const bytes = new Uint8Array(reader.result as ArrayBuffer);
      setPfxBytes(bytes);
    };
    reader.readAsArrayBuffer(file);
  };

  const decryptAndLoadCertificate = () => {
    if (!pfxBytes) {
      setErrorMsg('Please select a valid PKCS#12 (.pfx or .p12) certificate file.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    setTimeout(() => {
      try {
        const { cert, privateKey } = parseP12Certificate(pfxBytes, password);
        setSuccessCert(cert);
        onSelectCertificate(cert);
        onSetPrivateKey(privateKey);
      } catch (err: any) {
        setErrorMsg(err?.message || 'Failed to decrypt certificate store. Verify password.');
        onSelectCertificate(null);
        onSetPrivateKey(null);
      } finally {
        setLoading(false);
      }
    }, 600); // Small fluid loader
  };

  const handleClearSoftCertificate = () => {
    setPfxBytes(null);
    setFileName('');
    setPassword('');
    setSuccessCert(null);
    setErrorMsg(null);
    onSelectCertificate(null);
    onSetPrivateKey(null);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm font-sans" id="soft-cert-upload-panel">
      {/* Banner */}
      <div className="bg-slate-900 border-b border-slate-800 p-5 text-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-800 rounded-lg text-emerald-400">
            <FileKey className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider">Soft Token Credentials (.pfx/.p12)</h3>
            <p className="text-xs text-slate-400">Decrypt and sign locally using your software certificate files</p>
          </div>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 bg-white text-xs">
        {/* File selection and password input */}
        <div className="md:col-span-7 space-y-4">
          <div className="space-y-1">
            <label className="block text-slate-500 font-bold uppercase tracking-wider text-[10px]">Select Cryptographic Keystore</label>
            <div className="relative border border-dashed border-slate-250 p-4 rounded-lg bg-slate-50/50 hover:bg-slate-50 transition flex items-center justify-between">
              <input
                type="file"
                accept=".pfx,.p12"
                id="pfx-file-uploader"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="flex items-center gap-3">
                <FileKey className="w-8 h-8 text-slate-400 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-800 truncate block max-w-sm">
                    {fileName || 'Choose certificate (.pfx, .p12)'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    PKCS#12 Standard Crypto Format
                  </span>
                </div>
              </div>
              {pfxBytes && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleClearSoftCertificate();
                  }}
                  className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 cursor-pointer z-10 transition text-[11px]"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-slate-500 font-bold uppercase tracking-wider text-[10px]">Keystore Password Protection</label>
            <div className="relative flex">
              <input
                type={showPassword ? 'text' : 'password'}
                id="pfx-password-field"
                placeholder="Enter password to decrypt cryptographic keys"
                className="w-full border border-slate-250 bg-white rounded-md pl-3 pr-10 py-2.5 font-sans"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            onClick={decryptAndLoadCertificate}
            disabled={loading || !pfxBytes}
            className="w-full py-2.5 bg-slate-900 text-white rounded hover:bg-slate-800 disabled:opacity-40 transition-all font-bold cursor-pointer text-xs flex items-center justify-center gap-2 shadow"
            id="decrypt-safebox-btn"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Decrypting Certificate Payload...
              </>
            ) : (
              <>
                <Key className="w-4 h-4" />
                Unlock Soft Keystore Certificate
              </>
            )}
          </button>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-start gap-2 leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Certificate read verification display */}
        <div className="md:col-span-5 border border-slate-200 bg-slate-50/50 rounded-lg overflow-hidden flex flex-col justify-between">
          <div className="bg-slate-100 p-2 text-[10px] font-mono uppercase text-slate-600 border-b border-slate-200">
            Extracted Key Details
          </div>

          <div className="p-4 flex-1 flex flex-col justify-center space-y-3">
            {successCert ? (
              <div className="space-y-2" id="soft-cert-details">
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded p-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-bold">Keystore unlocked! Active</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-400">Common Name (CN)</span>
                  <span className="font-bold text-slate-800 block text-sm">{successCert.commonName}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-400">Issuer Authority</span>
                  <span className="text-slate-650 block truncate">{successCert.issuerCN}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-dashed border-slate-250">
                  <div>
                    <span className="text-[9px] uppercase font-mono text-slate-400 block">Valid From</span>
                    <span className="text-slate-600 block">{new Date(successCert.validFrom).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-mono text-slate-400 block">Valid To</span>
                    <span className="text-amber-700 block font-bold">{new Date(successCert.validTo).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-400 py-6 space-y-1">
                <FileKey className="w-8 h-8 mx-auto text-slate-300" />
                <span className="font-semibold block text-[11px]">No Private Key Unlocked</span>
                <p className="text-[10px] text-slate-500 font-sans max-w-xs mx-auto">
                  Provide password for uploaded keystore file to parse X.509 values securely.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
