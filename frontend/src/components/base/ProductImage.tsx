import { useState, type ImgHTMLAttributes } from 'react';

type ProductImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'onError'> & {
  src?: string | null;
  alt: string;
};

export default function ProductImage({
  src,
  alt,
  className,
  width,
  height,
  style,
  loading = 'lazy',
  ...props
}: ProductImageProps) {
  const [failedSource, setFailedSource] = useState<string>();
  const source = src && (src.startsWith('/images/') || src.startsWith('https://')) ? src : undefined;

  if (!source || failedSource === source) {
    return (
      <span
        role={alt ? 'img' : undefined}
        aria-label={alt ? alt + ' — image unavailable' : undefined}
        aria-hidden={alt ? undefined : true}
        className={`inline-grid shrink-0 place-items-center overflow-hidden bg-background-100 text-foreground-400 ${className ?? ''}`}
        style={{ width, height, ...style }}
      >
        <i aria-hidden="true" className="ri-image-line" />
      </span>
    );
  }

  return (
    <img
      {...props}
      src={source}
      alt={alt}
      className={className}
      width={width}
      height={height}
      style={style}
      loading={loading}
      decoding={props.decoding ?? 'async'}
      referrerPolicy="no-referrer"
      onError={() => setFailedSource(source)}
    />
  );
}
