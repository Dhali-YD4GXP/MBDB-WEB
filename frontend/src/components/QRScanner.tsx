'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: string) => void;
}

export default function QRScanner({
  isOpen,
  onClose,
  onScanSuccess,
  onScanError,
}: QRScannerProps) {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const qrCodeInstanceRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'qr-reader-element';

  useEffect(() => {
    if (!isOpen) return;

    setIsInitializing(true);
    setCameraError(null);

    // Give the DOM a tiny bit of time to mount the container element
    const timer = setTimeout(() => {
      const html5Qrcode = new Html5Qrcode(containerId);
      qrCodeInstanceRef.current = html5Qrcode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      };

      // Start the scanner using the back/rear camera ("environment")
      html5Qrcode
        .start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            // Success callback
            onScanSuccess(decodedText);
            
            // Beep sound feedback
            try {
              const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const oscillator = audioCtx.createOscillator();
              const gainNode = audioCtx.createGain();
              oscillator.connect(gainNode);
              gainNode.connect(audioCtx.destination);
              oscillator.type = 'sine';
              oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
              gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
              oscillator.start();
              oscillator.stop(audioCtx.currentTime + 0.15);
            } catch (e) {
              console.log('Audio feedback error:', e);
            }
          },
          (errorMessage) => {
            // Verbose logging of scan failures can clutter logs,
            // we pass it only if required for debugging.
            if (onScanError) {
              onScanError(errorMessage);
            }
          }
        )
        .then(() => {
          setIsInitializing(false);
        })
        .catch((err) => {
          console.error('Camera initialization failed:', err);
          setCameraError(
            'Gagal mengakses kamera belakang. Pastikan izin kamera telah diberikan.'
          );
          setIsInitializing(false);
        });
    }, 300);

    return () => {
      clearTimeout(timer);
      const scanner = qrCodeInstanceRef.current;
      if (scanner && scanner.isScanning) {
        scanner
          .stop()
          .then(() => {
            console.log('Scanner stopped successfully');
          })
          .catch((err) => {
            console.error('Failed to stop scanner:', err);
          });
      }
    };
  }, [isOpen, onScanSuccess, onScanError]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(11, 15, 25, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        className="card glass"
        style={{
          width: '100%',
          maxWidth: '450px',
          padding: '2rem',
          borderRadius: 'var(--radius-lg)',
          textAlign: 'center',
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
          }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
            Pindai QR Code Alat
          </h2>
          <button
            onClick={onClose}
            style={{
              fontSize: '1.5rem',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>

        <p
          style={{
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
            marginBottom: '1.5rem',
          }}
        >
          Posisikan QR Code alat musik di dalam kotak target pemindaian.
        </p>

        {cameraError ? (
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'var(--danger-light)',
              color: 'var(--danger)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              marginBottom: '1.5rem',
            }}
          >
            {cameraError}
          </div>
        ) : (
          <div
            className="qr-scanner-container"
            style={{
              width: '100%',
              backgroundColor: '#000000',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              marginBottom: '1.5rem',
              border: '2px solid var(--border-color)',
            }}
          >
            {isInitializing && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  zIndex: 2,
                }}
              >
                Memulai Kamera...
              </div>
            )}
            <div className="qr-scanner-line" />
            <div id={containerId} style={{ width: '100%', height: '100%' }} />
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{ flex: 1 }}
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
