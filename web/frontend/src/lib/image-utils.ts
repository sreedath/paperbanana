const THUMBNAIL_SIZE = 256;

export function createThumbnail(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(THUMBNAIL_SIZE / img.width, THUMBNAIL_SIZE / img.height, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUrl;
  });
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const LOGO_URL = "https://vizuara.ai/logo.png";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

/** Overlay Vizuara branding (logo + URL) at bottom-left of the image. */
export async function applyBranding(
  imageDataUrl: string,
  options: { showLogo: boolean; showUrl: boolean; urlText: string }
): Promise<string> {
  if (!options.showLogo && !options.showUrl) return imageDataUrl;

  const baseImg = await loadImage(imageDataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = baseImg.width;
  canvas.height = baseImg.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return imageDataUrl;

  ctx.drawImage(baseImg, 0, 0);

  const padding = Math.round(baseImg.width * 0.02);
  const logoSize = Math.round(baseImg.height * 0.05);
  const fontSize = Math.round(baseImg.height * 0.025);
  let x = padding;
  const y = baseImg.height - padding;

  if (options.showLogo) {
    try {
      const logo = await loadImage(LOGO_URL);
      ctx.drawImage(logo, x, y - logoSize, logoSize, logoSize);
      x += logoSize + Math.round(padding * 0.5);
    } catch {
      // Logo failed to load — continue without it
    }
  }

  if (options.showUrl && options.urlText) {
    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillStyle = "#555555";
    ctx.textBaseline = "bottom";
    ctx.fillText(options.urlText, x, y);
  }

  return canvas.toDataURL("image/png");
}
