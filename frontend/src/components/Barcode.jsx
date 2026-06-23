import React from 'react';

// ── EAN-13 Barcode Renderer (pure SVG, zero dependencies) ────────────────────
// Encodes a 13-digit EAN-13 code into the standard bar pattern that any
// barcode scanner (camera app, USB/Bluetooth scanner) can read.

// Standard EAN-13 encoding tables
const L_CODES = ['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
const G_CODES = ['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111'];
const R_CODES = ['1110010','1100110','1101100','1000010','1011100','1001110','1010000','1000100','1001000','1110100'];

// First-digit parity patterns (which digits 2-7 use L vs G encoding)
const PARITY = [
  'LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG',
  'LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL',
];

function encodeEAN13(code) {
  if (!/^\d{13}$/.test(code)) return null;
  const first = parseInt(code[0], 10);
  const parity = PARITY[first];
  let bits = '101'; // start guard
  for (let i = 1; i <= 6; i++) {
    const d = parseInt(code[i], 10);
    bits += parity[i - 1] === 'L' ? L_CODES[d] : G_CODES[d];
  }
  bits += '01010'; // center guard
  for (let i = 7; i <= 12; i++) {
    const d = parseInt(code[i], 10);
    bits += R_CODES[d];
  }
  bits += '101'; // end guard
  return bits;
}

export default function Barcode({ value, width = 220, height = 70, showText = true, className = '' }) {
  const bits = encodeEAN13(value);
  if (!bits) {
    return (
      <div className={className} style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', borderRadius: 6, fontSize: 11, color: '#9ca3af' }}>
        Invalid barcode
      </div>
    );
  }
  const barWidth = width / bits.length;
  const barHeight = showText ? height - 18 : height;

  return (
    <div className={className} style={{ width, textAlign: 'center' }}>
      <svg width={width} height={barHeight} viewBox={`0 0 ${width} ${barHeight}`} style={{ display: 'block' }}>
        <rect x="0" y="0" width={width} height={barHeight} fill="#fff" />
        {bits.split('').map((bit, i) =>
          bit === '1' ? (
            <rect key={i} x={i * barWidth} y="0" width={barWidth} height={barHeight} fill="#000" />
          ) : null
        )}
      </svg>
      {showText && (
        <div style={{ fontFamily: 'monospace', fontSize: 13, letterSpacing: '2px', marginTop: 4, color: '#000' }}>
          {value}
        </div>
      )}
    </div>
  );
}
