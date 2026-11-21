// A plugin screenshot in the theme the reader has picked. The files live in
// ../docs/src/assets/screenshots (regenerate them there with `pnpm shots`)
// and are copied to /screenshots/ by the build.
import { withBase } from '@rspress/core/runtime';

interface Props {
  name: string;
  alt: string;
}

// Captured at 2x: the `2x` descriptor shows them at half their pixel size
const srcSet = (name: string, theme: 'light' | 'dark') =>
  `${withBase(`/screenshots/${name}-${theme}.webp`)} 2x`;

export default function Screenshot({ name, alt }: Props) {
  return (
    <figure className="tb-screenshot">
      <img
        srcSet={srcSet(name, 'light')}
        alt={alt}
        className="tb-light"
        loading="lazy"
        decoding="async"
      />
      <img
        srcSet={srcSet(name, 'dark')}
        alt={alt}
        className="tb-dark"
        loading="lazy"
        decoding="async"
      />
    </figure>
  );
}
