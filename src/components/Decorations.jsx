import React from 'react';
import './Decorations.css';

export default function Decorations() {
  return (
    <div className="decor-layer" aria-hidden>
      {/* Pixel Sun */}
      <div className="sun">
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" shapeRendering="crispEdges">
          <rect x="30" y="30" width="40" height="40" fill="#ffdf3e" stroke="#e7c72a" strokeWidth="4" />
        </svg>
      </div>

      {/* Pixel Clouds */}
      <div className="cloud cloud-a">
        <svg viewBox="0 0 160 60" xmlns="http://www.w3.org/2000/svg" shapeRendering="crispEdges">
          <rect x="10" y="24" width="40" height="20" fill="#fff" stroke="#dcd9ff" strokeWidth="4" />
          <rect x="40" y="12" width="48" height="20" fill="#fff" stroke="#dcd9ff" strokeWidth="4" />
          <rect x="72" y="24" width="40" height="20" fill="#fff" stroke="#dcd9ff" strokeWidth="4" />
        </svg>
      </div>
      <div className="cloud cloud-b">
        <svg viewBox="0 0 160 60" xmlns="http://www.w3.org/2000/svg" shapeRendering="crispEdges">
          <rect x="10" y="24" width="36" height="20" fill="#fff" stroke="#dcd9ff" strokeWidth="4" />
          <rect x="38" y="12" width="44" height="20" fill="#fff" stroke="#dcd9ff" strokeWidth="4" />
          <rect x="70" y="24" width="36" height="20" fill="#fff" stroke="#dcd9ff" strokeWidth="4" />
        </svg>
      </div>

      {/* Generic green pillar (pipe-like, original) and hole */}
      <div className="flag">
        <svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg" shapeRendering="crispEdges">
          <rect x="86" y="70" width="40" height="60" fill="#22b14c" stroke="#11943a" strokeWidth="6" />
          <rect x="82" y="64" width="48" height="12" fill="#22b14c" stroke="#11943a" strokeWidth="6" />
          <rect x="24" y="100" width="60" height="8" fill="#8a4e1d" />
          <rect x="24" y="92" width="60" height="8" fill="#c77b2a" />
        </svg>
      </div>

      {/* Cartoon robots (original, simple shapes) */}
      <div className="robot robot-left">
        <svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg" shapeRendering="crispEdges">
          <rect x="20" y="40" width="80" height="70" fill="#8cc5ff" stroke="#1b1633" strokeWidth="6"/>
          <rect x="38" y="20" width="44" height="20" fill="#ffd86b" stroke="#1b1633" strokeWidth="6"/>
          <rect x="44" y="56" width="10" height="10" fill="#fff" stroke="#1b1633" strokeWidth="4"/>
          <rect x="66" y="56" width="10" height="10" fill="#fff" stroke="#1b1633" strokeWidth="4"/>
          <rect x="44" y="78" width="32" height="10" fill="#1b1633" />
        </svg>
      </div>

      <div className="robot robot-right">
        <svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg" shapeRendering="crispEdges">
          <rect x="20" y="40" width="80" height="70" fill="#ffb3c1" stroke="#1b1633" strokeWidth="6"/>
          <rect x="38" y="20" width="44" height="20" fill="#b8ffd8" stroke="#1b1633" strokeWidth="6"/>
          <rect x="44" y="56" width="10" height="10" fill="#fff" stroke="#1b1633" strokeWidth="4"/>
          <rect x="66" y="56" width="10" height="10" fill="#fff" stroke="#1b1633" strokeWidth="4"/>
          <rect x="42" y="78" width="36" height="10" fill="#1b1633" />
        </svg>
      </div>
    </div>
  );
}
