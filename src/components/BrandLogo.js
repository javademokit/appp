import React from 'react';
import './BrandLogo.css';

export default function BrandLogo({ className = '', alt = 'Medora AI — Intelligent care, simplified' }) {
  return (
    <img
      className={`brand-logo ${className}`.trim()}
      src="/medora_ai_logo.svg"
      alt={alt}
    />
  );
}
