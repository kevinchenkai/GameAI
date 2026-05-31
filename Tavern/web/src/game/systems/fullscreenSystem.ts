type WebkitFullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type WebkitFullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

const MOBILE_POINTER_QUERY = "(hover: none), (pointer: coarse)";

export function shouldShowFullscreenControl(): boolean {
  return isMobileLike() && isFullscreenSupported();
}

export function isFullscreenActive(): boolean {
  const documentWithWebkit = document as WebkitFullscreenDocument;
  return Boolean(document.fullscreenElement || documentWithWebkit.webkitFullscreenElement);
}

export async function enterTavernFullscreen(): Promise<boolean> {
  if (isFullscreenActive()) return true;
  const target = getFullscreenTarget();
  try {
    const request = target.requestFullscreen?.bind(target);
    if (request) {
      await request({ navigationUI: "hide" });
      return true;
    }
    const webkitRequest = (target as WebkitFullscreenElement).webkitRequestFullscreen?.bind(target);
    if (webkitRequest) {
      await webkitRequest();
      return true;
    }
  } catch (error) {
    console.warn("[tavern-coder] 浏览器拒绝进入全屏模式。", error);
  }
  return false;
}

export async function exitTavernFullscreen(): Promise<void> {
  const documentWithWebkit = document as WebkitFullscreenDocument;
  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }
  if (documentWithWebkit.webkitFullscreenElement) {
    await documentWithWebkit.webkitExitFullscreen?.();
  }
}

export async function toggleTavernFullscreen(): Promise<boolean> {
  if (isFullscreenActive()) {
    await exitTavernFullscreen();
    return false;
  }
  return enterTavernFullscreen();
}

function isMobileLike(): boolean {
  return window.matchMedia?.(MOBILE_POINTER_QUERY).matches ?? false;
}

function isFullscreenSupported(): boolean {
  const target = getFullscreenTarget();
  const documentWithWebkit = document as WebkitFullscreenDocument;
  return Boolean(document.fullscreenEnabled || documentWithWebkit.webkitFullscreenEnabled || target.requestFullscreen || (target as WebkitFullscreenElement).webkitRequestFullscreen);
}

function getFullscreenTarget(): HTMLElement {
  return document.getElementById("app") || document.documentElement;
}
