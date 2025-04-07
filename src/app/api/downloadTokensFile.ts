// code to download a json object as a file
// https://stackoverflow.com/questions/19721439/download-json-object-as-a-file-from-browser

export const downloadTokensFile = (objectToSave) => {
  const fileName = "design.tokens.json";
  const json = JSON.stringify(objectToSave, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};
