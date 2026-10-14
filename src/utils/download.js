/** Save text as a file in the browser (a click on a temporary link to a blob). */
export function downloadText(name, text, type = 'text/html;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Print an HTML document through a hidden frame (the browser's print dialog: choose "Save as PDF").
 * The frame has no scripts, only what the document itself contains.
 */
export function printHtml(html) {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.setAttribute('sandbox', 'allow-modals allow-same-origin');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  frame.srcdoc = html;
  frame.onload = () => {
    const win = frame.contentWindow;
    if (win) { win.focus(); win.print(); }
    setTimeout(() => frame.remove(), 60_000);
  };
  document.body.appendChild(frame);
  return frame;
}
