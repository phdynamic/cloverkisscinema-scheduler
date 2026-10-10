import React from 'react';

// Drop the real logo at client/public/logo.png; the built-in clover is the fallback.
export function Logo() {
  return (
    <img
      className="logo"
      src="/logo.png"
      alt="Clover Kiss Cinema logo"
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = '/clover.svg';
      }}
    />
  );
}

export function LoreStats() {
  return (
    <p className="stats">
      <b>6</b> seats &nbsp; <b>1</b> screen (both sides) &nbsp; <b>1</b> microwave &nbsp; <b>0</b> refunds
    </p>
  );
}

// The big sign shown on the login screen.
export function Hero() {
  return (
    <header className="marquee hero">
      <Logo />
      <p className="eyebrow" style={{ marginTop: 18 }}>
        Now showing, at sundown
      </p>
      <h1 className="display">
        <span className="green">Clover</span> <span className="cream">Kiss Cinema</span>
      </h1>
      <p className="tagline">The Projection Booth. Where posts wait their turn.</p>
      <LoreStats />
    </header>
  );
}
