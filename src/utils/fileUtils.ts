import fs from 'fs';
import path from 'path';

/**
 * Save data to a JSON file
 * This utility function should be called from an API endpoint to update JSON files
 * It's not meant to be called directly from the client-side
 */
export const saveJsonToFile = async (data: any, filePath: string): Promise<boolean> => {
  try {
    // Format the data with proper indentation for readability
    const jsonData = JSON.stringify(data, null, 2);
    const fullPath = path.resolve(process.cwd(), filePath);
    
    // Write the data to file
    fs.writeFileSync(fullPath, jsonData, 'utf8');
    console.log(`Data successfully saved to ${fullPath}`);
    return true;
  } catch (error) {
    console.error(`Error saving data to ${filePath}:`, error);
    return false;
  }
};

/**
 * Read data from a JSON file
 */
export const readJsonFromFile = async (filePath: string): Promise<any> => {
  try {
    const fullPath = path.resolve(process.cwd(), filePath);
    const data = fs.readFileSync(fullPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading data from ${filePath}:`, error);
    return null;
  }
};
