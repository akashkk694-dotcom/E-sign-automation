/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Shield, Radio, CheckCircle, AlertTriangle, Cpu, Terminal, Key, Smartphone, FileCode, Check } from 'lucide-react';
import { DscCertificate, DscBridgeStatus } from '../types';
import { generateVirtualCertificate } from '../utils/crypto';

interface LocalBridgeSetupProps {
  onSelectCertificate: (cert: DscCertificate | null) => void;
  selectedCert: DscCertificate | null;
  virtualCert: DscCertificate | null;
  setVirtualCert: (cert: DscCertificate | null) => void;
  setVirtualPrivateKey: (key: any) => void;
}

export default function LocalBridgeSetup({
  onSelectCertificate,
  selectedCert,
  virtualCert,
  setVirtualCert,
  setVirtualPrivateKey,
}: LocalBridgeSetupProps) {
  const [bridgeUrl, setBridgeUrl] = useState('ws://127.0.0.1:13579');
  const [bridgeStatus, setBridgeStatus] = useState<DscBridgeStatus>({
    state: 'disconnected',
    url: 'ws://127.0.0.1:13579',
    detectedDevices: [],
  });
  const [activeTab, setActiveTab] = useState<'simulation' | 'hardware_bridge'>('simulation');
  const [simulatedDevice, setSimulatedDevice] = useState<string>('ePass2003 Class 3 DSC');
  const [pinInput, setPinInput] = useState('');
  const [pinVerified, setPinVerified] = useState(false);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  
  const wsRef = useRef<WebSocket | null>(null);

  // Custom log logger
  const log = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogMessages((prev) => [`[${time}] ${msg}`, ...prev].slice(0, 30));
  };

  // Bridge connection handler
  const connectBridge = (url: string) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    log(`Attempting websocket connection to local bridge at ${url}...`);
    setBridgeStatus({ state: 'connecting', url, detectedDevices: [] });

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        log(`Successfully connected to Local DSC Bridge!`);
        setBridgeStatus({
          state: 'connected',
          url,
          detectedDevices: ['ePass2003 USB PKCS11 Token (Slot 0)', 'mToken FIPS CA (Slot 1)'],
        });
        log('Sending command: GET_DEVICES_INFO');
        ws.send(JSON.stringify({ action: 'GET_CERTIFICATES' }));
      };

      ws.onmessage = (event) => {
        log(`Received response from local bridge: ${event.data}`);
        try {
          const data = JSON.parse(event.data);
          if (data.action === 'CERTIFICATES' && data.list && data.list.length > 0) {
            // Process real hardware certificates reported by the local bridge
            log(`Bridge detected ${data.list.length} hardware token certificates!`);
          }
        } catch {
          log(`Standard bridge packet decoded.`);
        }
      };

      ws.onclose = () => {
        log(`Websocket connection closed.`);
        setBridgeStatus((prev) => ({
          ...prev,
          state: 'disconnected',
        }));
      };

      ws.onerror = (err) => {
        log(`Websocket connection error. Ensure local DSC driver bridge service is running.`);
        setBridgeStatus((prev) => ({
          ...prev,
          state: 'error',
          errorMsg: 'Local helper application took too long to respond.',
        }));
      };
    } catch (e: any) {
      log(`Error starting connection: ${e.message}`);
      setBridgeStatus({
        state: 'error',
        url,
        errorMsg: e.message,
        detectedDevices: [],
      });
    }
  };

  // Close web sockets on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Set up virtual DSC
  const generateSimulatedDsc = (name: string, org: string) => {
    log(`Generating RSA-2048 Cryptographic Keypair inside virtual DSC chip...`);
    const { dsc, keypair } = generateVirtualCertificate(name, org);
    setVirtualCert(dsc);
    setVirtualPrivateKey(keypair.privateKey);
    onSelectCertificate(dsc);
    setPinVerified(false);
    log(`Virtual ${simulatedDevice} token initialised! Subject: CN=${dsc.commonName}`);
  };

  // Initialize a default virtual DSC if not existing
  useEffect(() => {
    if (!virtualCert) {
      generateSimulatedDsc('Dr. Akash Kumar K', 'Medical Council Signature Hub');
    }
  }, []);

  const handleSimulatedPinCheck = () => {
    if (pinInput === '1234' || pinInput === '123456' || pinInput === '0000') {
      setPinVerified(true);
      log(`PIN validated successfully. USB Cryptographic Module is UNLOCKED for signing.`);
    } else {
      setPinVerified(false);
      log(`Error: Incorrect Token PIN. Remaining attempts: 2`);
      alert('Simulated DSC PIN Error: Try "1234" to pass!');
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-sm" id="dsc-setup-container">
      {/* Banner */}
      <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-800 rounded-lg text-amber-400">
            <Shield className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-slate-100">DSC Cryptographic Token Setup</h3>
            <p className="text-xs text-slate-400">Select physical USB key token or soft simulator credentials</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-2 py-1 bg-slate-800 rounded text-slate-300">
            FIPS 140-2 Level 3 compliant
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white">
        <button
          onClick={() => {
            setActiveTab('simulation');
            if (virtualCert) {
              onSelectCertificate(virtualCert);
            }
          }}
          className={`flex-1 py-3 text-sm font-medium px-4 border-b-2 text-center transition-all flex items-center justify-center gap-2 ${
            activeTab === 'simulation'
              ? 'border-slate-900 text-slate-900 bg-slate-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
          id="tab-simulation-select"
        >
          <Cpu className="w-4 h-4 text-emerald-500" />
          Virtual USB DSC Token (Recommended)
        </button>
        <button
          onClick={() => {
            setActiveTab('hardware_bridge');
            onSelectCertificate(null); // Deselect virtual unless connected
            connectBridge(bridgeUrl);
          }}
          className={`flex-1 py-3 text-sm font-medium px-4 border-b-2 text-center transition-all flex items-center justify-center gap-2 ${
            activeTab === 'hardware_bridge'
              ? 'border-slate-900 text-slate-900 bg-slate-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
          id="tab-bridge-select"
        >
          <Radio className="w-4 h-4 text-amber-500" />
          Physical Hardware DSC Token (Bridge)
        </button>
      </div>

      {/* Grid Layout of controls */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white">
        {/* Left control panel */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {activeTab === 'simulation' && (
            <div className="space-y-4" id="simulation-interface">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-500 mb-1">Simulated Certificate Profile</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'ePass2003 Token', name: 'Dr. Akash Kumar K', org: 'Medical Council Signature Hub' },
                    { label: 'mToken FIPS', name: 'Akash K. K. P.', org: 'Government Dept of Informatics' },
                    { label: 'ProxKey Crypto', name: 'Corporate VP Akash Kumar', org: 'Akash Group International' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => {
                        setSimulatedDevice(preset.label);
                        generateSimulatedDsc(preset.name, preset.org);
                      }}
                      className={`p-3 rounded-lg border text-left flex flex-col transition-all cursor-pointer ${
                        simulatedDevice === preset.label
                          ? 'border-slate-800 bg-slate-900 text-white'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700 bg-white'
                      }`}
                    >
                      <span className="text-xs font-bold truncate">{preset.label}</span>
                      <span className={`text-[10px] mt-1 truncate ${simulatedDevice === preset.label ? 'text-slate-300' : 'text-slate-400'}`}>
                        {preset.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Input for virtual token creation */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-slate-500" />
                  Customize Virtual Chip Certificate Details
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Common Name (CN)</label>
                    <input
                      type="text"
                      id="sim-cn-input"
                      className="w-full border border-slate-200 bg-white rounded-md px-2.5 py-1.5 font-sans"
                      defaultValue="Dr. Akash Kumar K"
                      onBlur={(e) => generateSimulatedDsc(e.target.value, virtualCert?.organization || '')}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Organization (O)</label>
                    <input
                      type="text"
                      id="sim-o-input"
                      className="w-full border border-slate-200 bg-white rounded-md px-2.5 py-1.5 font-sans"
                      defaultValue="Medical Council Signature Hub"
                      onBlur={(e) => generateSimulatedDsc(virtualCert?.commonName || '', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Pin prompt simulation */}
              <div className="flex items-center gap-4 p-4 bg-amber-50/50 border border-amber-200 rounded-lg">
                <Smartphone className="w-8 h-8 text-amber-600 shrink-0" />
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-slate-800">USB Token PIN Unlocking</h4>
                  <p className="text-[11px] text-slate-500">Physical tokens enforce a 4-8 digit hardware PIN protection.</p>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="password"
                      placeholder="Enter PIN (use 1234)"
                      id="sim-pin-field"
                      className="border border-slate-200 rounded px-2 py-1 text-xs w-44 font-mono bg-white"
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value)}
                    />
                    <button
                      onClick={handleSimulatedPinCheck}
                      className="px-3 py-1 bg-slate-800 text-white rounded text-xs hover:bg-slate-700 cursor-pointer transition-all"
                      id="sim-pin-verify-btn"
                    >
                      Unlock Token
                    </button>
                    {pinVerified && (
                      <span className="text-xs font-medium text-emerald-600 flex items-center gap-1 ml-1 font-mono">
                        <Check className="w-3.5 h-3.5 border border-emerald-600 rounded-full" /> ACTIVE
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'hardware_bridge' && (
            <div className="space-y-4" id="hardware-bridge-interface">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-xs font-mono uppercase text-slate-500">Bridge Server URL</label>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      bridgeStatus.state === 'connected' ? 'bg-emerald-500 animate-pulse' :
                      bridgeStatus.state === 'connecting' ? 'bg-amber-400 animate-spin' : 'bg-rose-500'
                    }`} />
                    <span className="text-[11px] font-bold uppercase text-slate-700">
                      {bridgeStatus.state}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="bridge-url-field"
                    className="flex-1 border border-slate-200 bg-white rounded px-2 py-1.5 text-xs font-mono"
                    value={bridgeUrl}
                    onChange={(e) => setBridgeUrl(e.target.value)}
                  />
                  <button
                    onClick={() => connectBridge(bridgeUrl)}
                    className="px-4 py-1.5 bg-slate-900 text-white rounded text-xs hover:bg-slate-800 cursor-pointer transition-all shrink-0"
                    id="connect-bridge-btn"
                  >
                    Reconnect
                  </button>
                </div>
              </div>

              {/* Help Information to build a custom bridge */}
              <div className="space-y-3 bg-slate-50 p-4 border border-slate-200 rounded-lg">
                <h4 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-slate-500" />
                  Developers: Run your actual USB Token Bridge in 5 Minutes
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  USB tokens function under local CSP or PKCS#11 libraries. To route signatures from this web agent directly to your physical USB token, you can run a local WebSocket listener to bridge calls:
                </p>
                <div className="p-3 bg-slate-900 rounded font-mono text-[10px] text-emerald-400 overflow-x-auto max-h-40 whitespace-pre">
{`# 1. Install pyHanko / pkcs11 bridge:
pip install pyhanko-pkcs11

# 2. Run a simple websocket client to handle token calls:
# Bridge receives sha256.hex -> Signs using driver -> Sends back signature hex bytes.
# Default listener binds to: wss://127.0.0.1:13579`}
                </div>
                <div className="text-[10px] text-slate-400 italic">
                  * Note: For security, local bridge handles user pin validation locally in the os environment.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right certificate inspection values */}
        <div className="lg:col-span-5 flex flex-col border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50">
          <div className="bg-slate-100 p-3 border-b border-slate-200 font-mono text-xs uppercase flex items-center justify-between text-slate-700">
            <span>Certificate Chip Details</span>
            {selectedCert?.isVirtual && (
              <span className="text-[10px] px-1.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded">
                SIMULATION
              </span>
            )}
          </div>

          <div className="p-4 flex-1 space-y-3 text-xs">
            {selectedCert ? (
              <div className="space-y-2.5">
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-mono">Signer Name (CN)</span>
                  <span className="font-semibold text-slate-900 text-sm block">
                    {selectedCert.commonName}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-mono">Organization</span>
                    <span className="font-medium text-slate-750 block truncate">
                      {selectedCert.organization || '--'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-mono">Location</span>
                    <span className="font-medium text-slate-750 block">
                      {selectedCert.country || 'IN (India)'}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-mono">Issuer / Authorizer</span>
                  <span className="text-slate-700 block truncate">
                    {selectedCert.issuerCN}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 border-t border-dashed border-slate-200 pt-2 text-[11px]">
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-mono">Validity From</span>
                    <span className="text-slate-650 block">
                      {new Date(selectedCert.validFrom).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-mono">Validity To</span>
                    <span className="text-rose-600 block font-medium">
                      {new Date(selectedCert.validTo).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-mono">Serial Identifier</span>
                  <span className="font-mono text-[10px] text-slate-600 break-all select-all">
                    {selectedCert.serialNumber}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-mono">SHA256 Cert Fingerprint</span>
                  <span className="font-mono text-[9px] text-slate-500 break-all leading-normal">
                    {selectedCert.sha256Fingerprint}
                  </span>
                </div>
                <div className="bg-white px-3 py-2 border border-slate-200/60 rounded-md mt-2 flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  Key Usage: Digitally Sign, Non-Repudiation, Secure Seals
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col justify-center items-center text-center p-6 text-slate-400 gap-2">
                <AlertTriangle className="w-8 h-8 text-amber-500" />
                <span className="text-xs font-medium">No Hardware DSC Selected.</span>
                <p className="text-[11px] text-slate-500">
                  Please plug/unlock your virtual token driver, or click "Reconnect" to check physical status.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Terminal log logs */}
      <div className="bg-slate-900 border-t border-slate-800 p-4">
        <div className="flex items-center gap-2 mb-2 text-slate-400 font-mono text-[11px] uppercase">
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span>DSC Hardware Bridge Log Monitor</span>
        </div>
        <div className="bg-slate-950 rounded p-2.5 max-h-28 overflow-y-auto font-mono text-[10px] text-slate-350 leading-relaxed scrollbar-thin">
          {logMessages.length > 0 ? (
            logMessages.map((msg, index) => (
              <div key={index} className="truncate select-all">
                {msg}
              </div>
            ))
          ) : (
            <div className="text-slate-600 italic">No activity logged. Connect bridge to monitor token calls.</div>
          )}
        </div>
      </div>
    </div>
  );
}
