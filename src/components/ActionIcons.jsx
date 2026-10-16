// Material Symbols glyphs for the card action row (Back / Check / Skip).
const Svg = ({ size, children }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 -960 960 960"
    fill="currentColor" aria-hidden="true" focusable="false">
    {children}
  </svg>
);

export const ChevronLeftIcon = ({ size = '1.4em' }) => (
  <Svg size={size}><path d="M560-240 320-480l240-240 56 56-184 184 184 184-56 56Z" /></Svg>
);

export const ChevronRightIcon = ({ size = '1.4em' }) => (
  <Svg size={size}><path d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z" /></Svg>
);

export const TaskAltIcon = ({ size = '1.3em' }) => (
  <Svg size={size}>
    <path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q65 0 123 19t107 53l-58 59q-38-24-81-37.5T480-800q-133 0-226.5 93.5T160-480q0 133 93.5 226.5T480-160q133 0 226.5-93.5T800-480q0-18-2-36t-6-35l65-65q11 32 17 66t6 70q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm-56-216L254-466l56-56 114 114 400-401 56 56-456 457Z" />
  </Svg>
);

// Compass needle in a ring: the guided tour button.
export const TourIcon = ({ size = '1.25em' }) => (
  <Svg size={size}><path d="m319-280 161-73 161 73 15-15-176-425-176 425 15 15ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z" /></Svg>
);

export const RefreshIcon = ({ size = '1.3em' }) => (
  <Svg size={size}><path d="M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 132 28.5T720-690v-110h80v280H520v-80h168q-32-56-87.5-88T480-720q-100 0-170 70t-70 170q0 100 70 170t170 70q77 0 139-44t87-116h84q-28 106-114 173t-196 67Z" /></Svg>
);

export const CloseIcon = ({ size = '1.3em' }) => (
  <Svg size={size}><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" /></Svg>
);

export const FlagIcon = ({ size = '1.3em' }) => (
  <Svg size={size}><path d="M200-120v-680h360l16 80h224v400H520l-16-80H280v280h-80Zm300-440Z" /></Svg>
);

export const CheckIcon = ({ size = '1.3em' }) => (
  <Svg size={size}><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z" /></Svg>
);

export const ListIcon = ({ size = '1.3em' }) => (
  <Svg size={size}><path d="M360-200v-80h480v80H360Zm0-240v-80h480v80H360Zm0-240v-80h480v80H360ZM200-160q-33 0-56.500-23.500T120-240q0-33 23.500-56.500T200-320q33 0 56.500 23.500T280-240q0 33-23.500 56.500T200-160Zm0-240q-33 0-56.500-23.500T120-480q0-33 23.500-56.500T200-560q33 0 56.500 23.500T280-480q0 33-23.500 56.500T200-400Zm0-240q-33 0-56.500-23.500T120-720q0-33 23.500-56.500T200-800q33 0 56.500 23.500T280-720q0 33-23.500 56.500T200-640Z" /></Svg>
);

// Magnifier with a check: "take time to review your work".
export const SearchCheckIcon = ({ size = '1.3em' }) => (
  <Svg size={size}>
    <path d="M570-390q70-70 70-170t-70-170q-70-70-170-70t-170 70q-70 70-70 170t70 170q70 70 170 70t170-70Zm-212-28 226-227-57-57-169 170-85-84-57 56 142 142Zm42 178q-134 0-227-93T80-560q0-134 93-227t227-93q134 0 227 93t93 227q0 56-17.5 105.5T653-364l227 228-56 56-228-227q-41 32-90.5 49.5T400-240Zm0-320Z" />
  </Svg>
);
