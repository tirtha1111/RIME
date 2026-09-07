import fs from 'fs';
import path from 'path';

const DATA_FILE = '/tmp/conversational_data.json';

export function logConversation(hostName: string, query: string, response: string, intent: string) {
  try {
    let data: Record<string, any[]> = {};
    if (fs.existsSync(DATA_FILE)) {
      data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
    
    if (!data[hostName]) {
      data[hostName] = [];
    }
    
    data[hostName].push({
      timestamp: new Date().toISOString(),
      query,
      response,
      intent
    });
    
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    console.log(`Saved conversation for ${hostName}`);
  } catch (e) {
    console.error("Failed to log conversation", e);
  }
}
