/**
 * The capture panel runs in its own borderless, transparent Tauri window (W17),
 * so it opts out of the app's painted backdrop and page background. Everything
 * the user sees is the panel card itself; the rest of the window is see-through.
 */
export default function CaptureLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        html, body { background: transparent !important; overflow: hidden; }
        .kash-backdrop { display: none !important; }
      `}</style>
      {children}
    </>
  );
}
