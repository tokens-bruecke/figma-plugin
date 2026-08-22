// code to download a json object as a file
// https://stackoverflow.com/questions/19721439/download-json-object-as-a-file-from-browser

import JSZip from 'jszip';
import { splitTokensIntoFiles } from '../../common/transform/splitTokensIntoFiles';

const triggerDownload = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const downloadTokensFile = async (
  objectToSave: Record<string, any>,
  splitByCollection = false,
  splitByMode = false
) => {
  const files = splitTokensIntoFiles(objectToSave, {
    splitByCollection,
    splitByMode,
  });

  if (files.length === 1 && !splitByCollection && !splitByMode) {
    const blob = new Blob([files[0].content], { type: 'application/json' });
    triggerDownload(blob, files[0].path);
    return;
  }

  const zip = new JSZip();

  files.forEach((file) => zip.file(file.path, file.content));

  const blob = await zip.generateAsync({ type: 'blob' });
  triggerDownload(blob, 'design.tokens.zip');
};
