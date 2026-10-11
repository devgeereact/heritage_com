/**
 * Responsive image with a reserved aspect ratio (no layout shift).
 * `avif` and `webp` are optional srcset strings ("a-480.webp 480w, ...");
 * `src` is the JPEG or PNG fallback. `alt` is required ("" only for
 * decorative images). `priority` is for the one above-the-fold hero image.
 */
const HcImage = ({ src, avif, webp, alt, width, height, sizes = '100vw', ratio, priority = false, className = '', imgClassName = '' }) => {
  if (!src) return null;
  const img = (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={avif || webp ? sizes : undefined}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchPriority={priority ? 'high' : undefined}
      className={imgClassName || undefined}
    />
  );
  return (
    <span className={`hc-img ${className}`.trim()} style={ratio ? { aspectRatio: ratio } : undefined}>
      {avif || webp ? (
        <picture>
          {avif && <source type="image/avif" srcSet={avif} sizes={sizes} />}
          {webp && <source type="image/webp" srcSet={webp} sizes={sizes} />}
          {img}
        </picture>
      ) : img}
    </span>
  );
};

export default HcImage;
