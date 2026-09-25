import React, { useState, useEffect } from 'react';

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

              {/* Edit Trigger (Opens Native Color Picker) */}
              <label
                title={`Customize Color ${idx + 1}`}
                style={{
                  position: 'absolute',
                  bottom: '-3px',
                  right: '-3px',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}
              >
                <span style={{ fontSize: '7px', lineHeight: 1, pointerEvents: 'none' }}>
                  ✏️
                </span>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => handleUpdateCustomColor(idx, e.target.value)}
                  style={{
                    position: 'absolute',
                    opacity: 0,
                    width: '100%',
                    height: '100%',
                    cursor: 'pointer',
                    padding: 0,
                    margin: 0,
                    border: 'none'
                  }}
                  aria-label={`Change Custom Color ${idx + 1} value`}
                />
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
