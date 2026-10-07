import { useEffect, useState } from "react";
import type { Frame } from "./context";

/** Tamanho da foto depois do giro: de lado (90°/270°), largura e altura se trocam. */
export function orientedSize(width: number, height: number, rotate: number) {
  return rotate % 180 === 0
    ? { width, height }
    : { width: height, height: width };
}

const MAX_CACHE = 8;
// Resultado por (foto + giro + espelho), para não redesenhar a cada renderização.
const cache = new Map<string, string>();

function remember(key: string, url: string) {
  cache.delete(key);
  cache.set(key, url);
  if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value as string);
}

/**
 * Redesenha a foto girada e/ou espelhada. Parte sempre da foto original, então
 * girar várias vezes não vai perdendo qualidade. O espelhamento vale na tela
 * (esquerda/direita, cima/baixo), qualquer que seja o giro.
 */
export function orientImage(
  src: string,
  rotate: number,
  flipX: boolean,
  flipY: boolean,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const size = orientedSize(img.naturalWidth, img.naturalHeight, rotate);
      const canvas = document.createElement("canvas");
      canvas.width = size.width;
      canvas.height = size.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas indisponível"));
      ctx.translate(size.width / 2, size.height / 2);
      ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
      ctx.rotate((rotate * Math.PI) / 180);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      const type = src.startsWith("data:image/png") ? "image/png" : "image/jpeg";
      resolve(canvas.toDataURL(type, 0.92));
    };
    img.onerror = () => reject(new Error("Imagem inválida"));
    img.src = src;
  });
}

/**
 * Devolve a foto pronta para exibir: a própria foto quando não há giro nem
 * espelho, ou a versão redesenhada (a original aparece enquanto ela fica pronta).
 */
export function useOrientedImage(src: string | undefined, frame?: Frame) {
  const rotate = frame?.rotate ?? 0;
  const flipX = !!frame?.flipX;
  const flipY = !!frame?.flipY;
  const needed = !!src && (rotate !== 0 || flipX || flipY);
  const key = needed
    ? `${rotate}|${+flipX}|${+flipY}|${src.length}|${src.slice(-40)}`
    : "";
  const [ready, setReady] = useState<{ key: string; url: string } | null>(null);

  useEffect(() => {
    if (!needed || !src) return;
    const hit = cache.get(key);
    if (hit) {
      setReady({ key, url: hit });
      return;
    }
    let cancelled = false;
    orientImage(src, rotate, flipX, flipY)
      .then((url) => {
        remember(key, url);
        if (!cancelled) setReady({ key, url });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // `key` já resume src, giro e espelho.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!needed) return src;
  return ready?.key === key ? ready.url : src;
}
