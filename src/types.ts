/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DscCertificate {
  commonName: string;
  organization?: string;
  organizationalUnit?: string;
  country?: string;
  issuerCN: string;
  serialNumber: string;
  validFrom: string;
  validTo: string;
  publicKeyAlgorithm: string;
  keyUsage: string[];
  sha256Fingerprint: string;
  isVirtual?: boolean;
}

export type PlacementMode = 'visual' | 'page_start' | 'page_end' | 'regex_anchor';

export interface SignatureStampConfig {
  width: number;
  height: number;
  pageIndex: number; // 0-indexed
  x: number; // in PDF points (72 points/inch), offset from bottom-left or top-left
  y: number;
  showName: boolean;
  showReason: boolean;
  showLocation: boolean;
  showDate: boolean;
  showSerialNumber: boolean;
  reasonText: string;
  locationText: string;
  signerName: string;
  customText: string;
  includeGraphic: boolean;
  graphicDataUrl?: string; // handwritten or logo image
  borderWidth: number;
  borderColor: string;
  backgroundColor: string;
  fontColor: string;
  placementMode: PlacementMode;
  regexAnchorText?: string;
  stampOpacity?: number;
  fontChoice?: 'Helvetica' | 'TimesRoman' | 'Courier';
}

export interface DscBridgeStatus {
  state: 'disconnected' | 'connecting' | 'connected' | 'error';
  url: string;
  errorMsg?: string;
  detectedDevices: string[];
}

export interface SignableFile {
  id: string;
  name: string;
  size: number;
  dataUrl: string; // original file object representation
  rawBytes: Uint8Array;
  status: 'idle' | 'signing' | 'signed' | 'error';
  errorMsg?: string;
  signedBytes?: Uint8Array;
  signedFileName?: string;
}

export interface VerificationResult {
  isValid: boolean;
  integrityOk: boolean;
  sha256Hash: string;
  signers: {
    name: string;
    signingTime: string;
    reason?: string;
    location?: string;
    certificate: DscCertificate;
  }[];
  errors: string[];
}
