// Material Symbols glyphs for the session dots (check, close, question mark).
const Svg = ({ size, children }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 -960 960 960"
    fill="currentColor" aria-hidden="true" focusable="false">
    {children}
  </svg>
);

export const CheckIcon = ({ size = '1em' }) => (
  <Svg size={size}><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z" stroke="currentColor" strokeWidth="70" strokeLinejoin="round" /></Svg>
);

export const CloseIcon = ({ size = '1em' }) => (
  <Svg size={size}><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" /></Svg>
);

export const QuestionIcon = ({ size = '1em' }) => (
  <Svg size={size}><path d="M424-320q0-81 14.5-116.500T500-514q41-36 62.5-62.500T584-637q0-41-27.500-68T480-732q-51 0-77.500 31T365-638l-103-44q21-64 77-111t141-47q105 0 161.500 58.500T698-641q0 50-21.500 85.500T609-475q-49 47-59.500 71.500T539-320H424Zm56 240q-33 0-56.500-23.500T400-160q0-33 23.500-56.500T480-240q33 0 56.500 23.500T560-160q0 33-23.500 56.500T480-80Z" /></Svg>
);
