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

// The big sign shown on the login screen.
export function Hero() {
  return (
    <header className="marquee hero">
      <Logo />
      <h1 className="display" style={{ marginTop: 18 }}>
        <span className="green">Clover Kiss Cinema</span> <span className="cream">Post Scheduler</span>
      </h1>
    </header>
  );
}
