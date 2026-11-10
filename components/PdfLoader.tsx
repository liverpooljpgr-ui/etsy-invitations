/** Shown while the keepsake PDF is being made (a few seconds): a heart flies out of an open envelope, again and again. */
export function PdfLoader() {
  return (
    <div className="pdf-loader" role="status" aria-live="polite">
      <div className="pdf-loader-card">
        <svg viewBox="0 0 160 140" width="190" height="166" aria-hidden="true">
          {/* the back of the envelope and its open flap */}
          <polygon points="22,62 80,18 138,62" fill="#e3cfdb" stroke="#c7a2b6" strokeWidth="1.5" strokeLinejoin="round" />
          <rect x="22" y="58" width="116" height="72" rx="7" fill="#efe2ea" stroke="#c7a2b6" strokeWidth="1.5" />
          {/* the heart: it rises out of the envelope and fades, over and over */}
          <g className="pdf-heart">
            <path d="M80 92 C58 74 64 52 80 63 C96 52 102 74 80 92 Z" fill="#e27d9f" stroke="#c9577f" strokeWidth="1.2" strokeLinejoin="round" />
            <path d="M71 63 C67 63 65 66 66 69" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity=".75" />
          </g>
          {/* the front of the envelope, drawn over the heart's lower part so it comes out of the pocket */}
          <path d="M22 62 L80 104 L138 62 L138 123 a7 7 0 0 1 -7 7 H29 a7 7 0 0 1 -7 -7 Z" fill="#f8eff4" stroke="#c7a2b6" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M22 125 L68 90 M138 125 L92 90" stroke="#d9bccb" strokeWidth="1.2" strokeLinecap="round" fill="none" />
          {/* little sparkles */}
          <g fill="#c9577f" className="pdf-spark">
            <circle cx="46" cy="30" r="2" />
            <circle cx="118" cy="26" r="2.4" />
            <circle cx="128" cy="48" r="1.6" />
          </g>
        </svg>
        <p className="pdf-loader-title">Preparing your PDF…</p>
        <p className="pdf-loader-sub">This takes a few seconds. Please keep this page open.</p>
      </div>
    </div>
  );
}
