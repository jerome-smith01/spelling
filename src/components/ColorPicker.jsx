import React, { useState, useEffect, useRef } from 'react';

const COLOR_STORAGE_KEY = 'spelling_tutor_success_color_v1';
const CUSTOM_COLORS_STORAGE_KEY = 'spelling_tutor_custom_colors_v1';

export const COLOR_PRESETS = [
  { name: 'Emerald', hex: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: '#059669' },
  { name: 'Sky Blue', hex: '#0284c7', bg: 'rgba(2, 132, 199, 0.15)', border: '#0369a1' },
  { name: 'Violet', hex: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)', border: '#7c3aed' },
  { name: 'Amber', hex: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: '#d97706' },
  { name: 'Rose', hex: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)', border: '#e11d48' },
  { name: 'Indigo', hex: '#6366f1', bg: 'rgba(99, 102, 241, 0.15)', border: '#4f46e5' }
];

const DEFAULT_CUSTOM_COLORS = ['#06b6d4', '#ec4899']; // Cyan and Pink defaults

export function hexToRgba(hex, alpha = 0.15) {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  const num = parseInt(cleanHex, 16);
  if (isNaN(num)) return `rgba(16, 185, 129, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const HEX_RE = /^#[0-9a-f]{6}$/i;

export function hexToHsl(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const l = (max + min) / 2;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const sat = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  return { h: Math.round(h), s: Math.round(sat * 100), l: Math.round(l * 100) };
}

export function hslToHex({ h, s, l }) {
  const sat = s / 100, lig = l / 100;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const c = lig - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Same on every device (the native <input type="color"> on Android only offers a short fixed palette)
function ColorEditor({ color, onChange, onClose }) {
  const [hsl, setHsl] = useState(() => hexToHsl(color));
  const [hexText, setHexText] = useState(color);

  const update = (patch) => {
    const next = { ...hsl, ...patch };
    const hex = hslToHex(next);
    setHsl(next);
    setHexText(hex);
    onChange(hex);
  };

  const onHexInput = (e) => {
    let v = e.target.value.trim();
    if (v && !v.startsWith('#')) v = `#${v}`;
    setHexText(v);
    if (HEX_RE.test(v)) {
      setHsl(hexToHsl(v));
      onChange(v.toLowerCase());
    }
  };

  const slider = (label, key, max, track) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
      <span style={{ width: '1.25rem' }}>{label}</span>
      <input
        type="range"
        min="0"
        max={max}
        value={hsl[key]}
        onChange={(e) => update({ [key]: Number(e.target.value) })}
        aria-label={`${label === 'H' ? 'Hue' : label === 'S' ? 'Saturation' : 'Lightness'}`}
        style={{ flex: 1, height: '1.5rem', accentColor: 'var(--selected-color)', background: track, borderRadius: '9999px' }}
      />
    </label>
  );

  return (
    <div
      role="dialog"
      aria-label="Customize color"
      style={{
        position: 'absolute',
        top: 'calc(100% + 0.5rem)',
        left: 0,
        zIndex: 60,
        width: 'min(16rem, calc(100vw - 2rem))',
        padding: '0.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem',
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.25)'
      }}
    >
      <div style={{ height: '2rem', borderRadius: '0.5rem', backgroundColor: hslToHex(hsl), border: '1px solid var(--card-border)' }} />
      {slider('H', 'h', 360, 'linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)')}
      {slider('S', 's', 100, `linear-gradient(to right,${hslToHex({ ...hsl, s: 0 })},${hslToHex({ ...hsl, s: 100 })})`)}
      {slider('L', 'l', 100, `linear-gradient(to right,#000,${hslToHex({ ...hsl, l: 50 })},#fff)`)}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <input
          type="text"
          value={hexText}
          onChange={onHexInput}
          maxLength={7}
          spellCheck={false}
          aria-label="Hex color"
          style={{
            flex: 1,
            minWidth: 0,
            padding: '0.4rem 0.5rem',
            fontFamily: 'monospace',
            fontSize: '1rem',
            color: 'var(--foreground)',
            backgroundColor: 'var(--muted)',
            border: '1px solid var(--card-border)',
            borderRadius: '0.5rem'
          }}
        />
        <button type="button" className="btn-secondary-sm" onClick={onClose} style={{ fontWeight: 700 }}>
          Done
        </button>
      </div>
    </div>
  );
}

export function applyColorTokens(colorHex) {
  const root = document.documentElement;
  const preset = COLOR_PRESETS.find(p => p.hex.toLowerCase() === colorHex.toLowerCase());
  const hex = preset ? preset.hex : colorHex;
  const bg = preset ? preset.bg : hexToRgba(colorHex, 0.15);
  const border = preset ? preset.border : colorHex;

  root.style.setProperty('--selected-color', hex);
  root.style.setProperty('--selected-color-bg', bg);
  root.style.setProperty('--selected-color-border', border);
}

export default function ColorPicker() {
  const [selectedColor, setSelectedColor] = useState(() => {
    try {
      return localStorage.getItem(COLOR_STORAGE_KEY) || COLOR_PRESETS[0].hex;
    } catch {
      return COLOR_PRESETS[0].hex;
    }
  });

  const [customColors, setCustomColors] = useState(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_COLORS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 2) {
          return [parsed[0], parsed[1]];
        }
      }
    } catch {
      // Ignore
    }
    return DEFAULT_CUSTOM_COLORS;
  });

  // Apply CSS tokens whenever selectedColor changes
  useEffect(() => {
    applyColorTokens(selectedColor);
    try {
      localStorage.setItem(COLOR_STORAGE_KEY, selectedColor);
    } catch {
      // Ignore
    }
  }, [selectedColor]);

  // Persist customColors when updated
  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_COLORS_STORAGE_KEY, JSON.stringify(customColors));
    } catch {
      // Ignore
    }
  }, [customColors]);

  const [editingIdx, setEditingIdx] = useState(null);
  const editorRef = useRef(null);

  // Close the editor on outside click or Escape
  useEffect(() => {
    if (editingIdx === null) return undefined;
    const onDown = (e) => {
      if (editorRef.current && !editorRef.current.contains(e.target)) setEditingIdx(null);
    };
    const onKey = (e) => { if (e.key === 'Escape') setEditingIdx(null); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [editingIdx]);

  const handleUpdateCustomColor = (index, newHex) => {
    const updated = [...customColors];
    updated[index] = newHex;
    setCustomColors(updated);
    setSelectedColor(newHex); // Automatically select newly chosen custom color
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      flexWrap: 'wrap'
    }}>
      <span style={{
        fontSize: '0.8rem',
        fontWeight: 600,
        color: 'var(--muted-foreground)'
      }}>
        Color:
      </span>

      {/* Preset Swatches */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        {COLOR_PRESETS.map(preset => {
          const isSelected = selectedColor.toLowerCase() === preset.hex.toLowerCase();
          return (
            <button
              key={preset.hex}
              type="button"
              onClick={() => setSelectedColor(preset.hex)}
              aria-label={`Select ${preset.name} success color`}
              title={preset.name}
              style={{
                width: '1.4rem',
                height: '1.4rem',
                borderRadius: '50%',
                backgroundColor: preset.hex,
                border: isSelected ? '2px solid var(--foreground)' : '2px solid transparent',
                transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                cursor: 'pointer',
                padding: 0,
                boxShadow: isSelected ? '0 0 0 1px var(--background)' : 'none',
                transition: 'transform 0.15s ease'
              }}
            />
          );
        })}
      </div>

      {/* Divider */}
      <span style={{
        fontSize: '0.75rem',
        color: 'var(--card-border)',
        userSelect: 'none'
      }}>
        |
      </span>

      {/* Two Saved Custom Color Slots */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
        {customColors.map((color, idx) => {
          const isSelected = selectedColor.toLowerCase() === color.toLowerCase();
          return (
            <div
              key={idx}
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {/* Swatch Button */}
              <button
                type="button"
                onClick={() => setSelectedColor(color)}
                aria-label={`Select Custom Color ${idx + 1} (${color})`}
                title={`Custom Color ${idx + 1}: Click to select, click ✏️ to customize`}
                style={{
                  width: '1.4rem',
                  height: '1.4rem',
                  borderRadius: '50%',
                  backgroundColor: color,
                  border: isSelected ? '2px solid var(--foreground)' : '2px dashed var(--card-border)',
                  transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                  cursor: 'pointer',
                  padding: 0,
                  boxShadow: isSelected ? '0 0 0 1px var(--background)' : 'none',
                  transition: 'transform 0.15s ease'
                }}
              />

              {/* Edit Trigger (opens the in-app color editor) */}
              <button
                type="button"
                onClick={() => setEditingIdx(editingIdx === idx ? null : idx)}
                title={`Customize Color ${idx + 1}`}
                aria-label={`Customize Custom Color ${idx + 1}`}
                aria-expanded={editingIdx === idx}
                style={{
                  position: 'absolute',
                  bottom: '-5px',
                  right: '-5px',
                  width: '16px',
                  height: '16px',
                  padding: 0,
                  borderRadius: '50%',
                  backgroundColor: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '9px',
                  lineHeight: 1,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}
              >
                ✏️
              </button>
              {editingIdx === idx && (
                <div ref={editorRef}>
                  <ColorEditor
                    color={color}
                    onChange={(hex) => handleUpdateCustomColor(idx, hex)}
                    onClose={() => setEditingIdx(null)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
