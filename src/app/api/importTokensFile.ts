/**
 * Opens a file picker and reads JSON tokens file
 * @returns Promise with parsed JSON data or null if cancelled/error
 */
export const importTokensFile = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    // Create file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    
    input.onchange = async (event: Event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      
      if (!file) {
        resolve(null);
        return;
      }
      
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        resolve(data);
      } catch (error) {
        reject(new Error(`Failed to parse JSON file: ${error.message}`));
      }
    };
    
    input.oncancel = () => {
      resolve(null);
    };
    
    // Trigger file picker
    input.click();
  });
};
