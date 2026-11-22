export async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      textarea.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export function openExternal(url: string): void {
  const value = url.trim();
  if (!value) return;
  if (/^https?:\/\//i.test(value)) {
    void chrome.tabs.create({ url: value });
    return;
  }
  if (/^(mailto|tel):/i.test(value)) {
    window.open(value, '_blank');
  }
}
