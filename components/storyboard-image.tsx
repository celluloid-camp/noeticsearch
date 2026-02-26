import Image, { type ImageProps } from "next/image";

type StoryboardImageProps = ImageProps;

function parseSpriteFragment(src: string): {
  baseUrl: string;
  x: number;
  y: number;
  w: number;
  h: number;
  totalW: number;
  totalH: number;
} | null {
  const [baseUrl, fragment] = src.split("#sprite=");
  if (!fragment) {
    return null;
  }

  const parts = fragment.split(",").map(Number);
  if (parts.length < 6 || parts.some(Number.isNaN)) {
    return null;
  }

  const [x, y, w, h, totalW, totalH] = parts;
  if (w <= 0 || h <= 0 || totalW <= 0 || totalH <= 0) {
    return null;
  }

  return { baseUrl, x, y, w, h, totalW, totalH };
}

export function StoryboardImage({
  src,
  className,
  style,
  alt,
  ...rest
}: StoryboardImageProps) {
  const parsed = parseSpriteFragment(String(src));

  if (!parsed) {
    return (
      <Image
        alt={alt}
        className={className}
        fill
        src={src}
        style={{ objectFit: "cover", ...style }}
        {...rest}
      />
    );
  }

  const { baseUrl, x, y, w, h, totalW, totalH } = parsed;

  const bgSizeX = (totalW / w) * 100;
  const bgSizeY = (totalH / h) * 100;

  const bgPosX = totalW === w ? 0 : (x / (totalW - w)) * 100;
  const bgPosY = totalH === h ? 0 : (y / (totalH - h)) * 100;

  return (
    <div
      aria-label={typeof alt === "string" ? alt : undefined}
      className={className}
      role="img"
      style={{
        backgroundImage: `url(${baseUrl})`,
        backgroundSize: `${bgSizeX}% ${bgSizeY}%`,
        backgroundPosition: `${bgPosX}% ${bgPosY}%`,
        backgroundRepeat: "no-repeat",
        ...style,
      }}
    />
  );
}
