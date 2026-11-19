import { safeName } from '../../common/transform/splitTokensIntoFiles';

export const DEFAULT_DOWNLOAD_NAME = 'design.tokens';

/**
 * The names Download JSON saves under, from the profile's "File name".
 * The extension is optional: `brand` and `brand.json` both give
 * `brand.json`, and a split export gives `brand.zip`. An empty name falls
 * back to `design.tokens.json` / `design.tokens.zip`.
 */
export const getDownloadFileNames = (fileName = '') => {
  const baseName =
    safeName(fileName.trim())
      .replace(/\.(json|zip)$/i, '')
      // Windows drops trailing dots and spaces, which would leave `brand..json`
      .replace(/[.\s]+$/, '') || DEFAULT_DOWNLOAD_NAME;

  return {
    json: `${baseName}.json`,
    zip: `${baseName}.zip`,
  };
};
