import { toPng } from "html-to-image";

type CaptureResult = {
  base64Png: string;
  widthPx: number;
  heightPx: number;
};

export async function captureEquationImage(
  node: HTMLElement | null,
): Promise<CaptureResult | null> {
  if (!node) return null;

  try {
    const rect = node.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    const dataUrl = await toPng(node, {
      cacheBust: true,
      pixelRatio: 1,
      filter: (domNode) => {
        if (!(domNode instanceof HTMLElement)) return true;
        return domNode.getAttribute("data-visual-hint-overlay") !== "true";
      },
    });

    const base64Png = dataUrl.split(",")[1];
    if (!base64Png) return null;

    return {
      base64Png,
      widthPx: Math.round(rect.width),
      heightPx: Math.round(rect.height),
    };
  } catch (error) {
    console.warn("[captureEquationImage] Failed to capture equation", error);
    return null;
  }
}
