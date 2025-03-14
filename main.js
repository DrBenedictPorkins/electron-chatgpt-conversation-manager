// main.js

const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const axios = require('axios');
const fs = require('fs');

// Store the ChatGPT API headers globally
let chatGptHeaders = null;

// Store the total number of conversations
let totalConversations = 0;

// App configuration
let appConfig = {
  openaiApiKey: null,
  customPrompt: null
};

// Config file path
const configFilePath = path.join(app.getPath('userData'), 'config.json');

// Load config
function loadConfig() {
  try {
    if (fs.existsSync(configFilePath)) {
      const configData = fs.readFileSync(configFilePath, 'utf8');
      appConfig = JSON.parse(configData);
      console.log('Config loaded successfully');
    }
  } catch (error) {
    console.error('Error loading config:', error);
  }
}

// Save config
function saveConfig() {
  try {
    fs.writeFileSync(configFilePath, JSON.stringify(appConfig, null, 2), 'utf8');
    console.log('Config saved successfully');
  } catch (error) {
    console.error('Error saving config:', error);
  }
}

function createWindow() {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    resizable: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Load index.html file into the window.
  win.loadFile('index.html');

  // Open DevTools for debugging
  if (process.env.NODE_ENV === 'development') {
    win.webContents.openDevTools();
  }
  
  // Configure to open links in external browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Called when Electron has finished initialization.
app.whenReady().then(() => {
  // Load config before creating the window
  loadConfig();
  
  createWindow();

  // On macOS it is common to re-create a window even after closing all windows.
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Function to parse cURL command and extract headers
function parseCurlCommand(curlCommand) {
  const headers = {};
  
  // Strip newlines and ensure we're working with a string
  const cleanCommand = String(curlCommand).replace(/\r?\n/g, ' ');
  
  // Match all -H or --header options with various quoting styles
  // This handles: -H "Name: Value", -H 'Name: Value', --header "Name: Value", --header 'Name: Value'
  const headerRegex = /(?:-H|--header)\s+(?:["']([^"']+)["']|(\S+))/g;
  let match;
  
  while ((match = headerRegex.exec(cleanCommand)) !== null) {
    // The header might be in the first or second capture group depending on if it was quoted
    const headerLine = match[1] || match[2];
    
    if (headerLine) {
      const separatorIndex = headerLine.indexOf(':');
      
      if (separatorIndex > 0) {
        const headerName = headerLine.substring(0, separatorIndex).trim();
        const headerValue = headerLine.substring(separatorIndex + 1).trim();
        headers[headerName] = headerValue;
      }
    }
  }
  
  // If we couldn't find any headers and the command looks like it's from a browser's copy as cURL
  if (Object.keys(headers).length === 0 && cleanCommand.includes('curl')) {
    console.log('No headers found with standard regex, trying alternative parsing methods');
    
    // Try another approach - look for patterns like `-H "header: value"` with various spacings
    const altHeaderRegex = /-H\s*['"](.+?):\s*(.+?)['"]/g;
    while ((match = altHeaderRegex.exec(cleanCommand)) !== null) {
      if (match[1] && match[2]) {
        headers[match[1].trim()] = match[2].trim();
      }
    }
  }
  
  return headers;
}

// Helper function to validate ChatGPT headers
function isAuthenticated() {
  return chatGptHeaders !== null && chatGptHeaders.Authorization;
}

// Handle the cURL processing from renderer
ipcMain.handle('process-curl', async (event, curlCommand) => {
  try {
    // Check if the command is for the correct endpoint
    if (!curlCommand.includes('chatgpt.com/backend-api/me')) {
      return {
        success: false,
        error: 'The cURL command does not contain the required ChatGPT API endpoint.'
      };
    }
    
    // Parse the cURL command to extract headers
    const headers = parseCurlCommand(curlCommand);
    
    // Log how many headers we found for debugging
    console.log(`Extracted ${Object.keys(headers).length} headers from cURL command`);
    
    // Check if we have enough headers
    if (Object.keys(headers).length < 3) {
      return {
        success: false,
        error: `Could not extract enough headers from the cURL command. Please make sure you're copying the complete cURL command from the browser's network tab.`
      };
    }
    
    // Check for required headers
    const requiredHeaders = ['Authorization'];
    const recommendedHeaders = ['User-Agent', 'Accept', 'Content-Type', 'Cookie'];
    
    const missingRequired = [];
    for (const header of requiredHeaders) {
      if (!headers[header]) {
        missingRequired.push(header);
      }
    }
    
    if (missingRequired.length > 0) {
      return {
        success: false,
        error: `Missing required headers: ${missingRequired.join(', ')}. Please copy a new cURL from an active ChatGPT session.`
      };
    }
    
    // Warn about recommended headers
    const missingRecommended = [];
    for (const header of recommendedHeaders) {
      if (!headers[header]) {
        missingRecommended.push(header);
      }
    }
    
    if (missingRecommended.length > 0) {
      console.log(`Missing recommended headers: ${missingRecommended.join(', ')}. Continuing anyway.`);
    }
    
    // Test the headers with a request to the ChatGPT API
    const response = await axios.get('https://chatgpt.com/backend-api/me', {
      headers: headers
    });
    
    // Even with a 200 status, we need to check for error responses
    const data = response.data;
    
    // Check for "Unauthorized" response
    if (data && data.detail === "Unauthorized") {
      return {
        success: false,
        error: "Authentication failed: Unauthorized. Please copy a new cURL from an active ChatGPT session."
      };
    }
    
    // Check for empty user profile data
    if (data && data.object === "" && 
        (!data.email || data.email === "") && 
        (!data.name || data.name === "")) {
      return {
        success: false,
        error: "Authentication failed: Received empty user profile. Please copy a new cURL from an active ChatGPT session."
      };
    }
    
    // If we reach here, the request was successful with valid data
    chatGptHeaders = headers;
    
    // Try to fetch conversation count immediately
    try {
      const convResponse = await axios.get('https://chatgpt.com/backend-api/conversations?offset=0&limit=1&order=updated', {
        headers: headers
      });
      
      if (convResponse.data && typeof convResponse.data.total === 'number') {
        totalConversations = convResponse.data.total;
        console.log(`Found ${totalConversations} conversations`);
      }
    } catch (convError) {
      console.error('Error fetching conversation count:', convError);
      // We don't want to fail the main request if this fails
    }
    
    return {
      success: true,
      userData: {
        email: data.email || "Unknown",
        name: data.name || "Unknown"
      },
      conversationsCount: totalConversations
    };
  } catch (error) {
    console.error('Error processing cURL command:', error);
    
    let errorMessage = 'Failed to connect to ChatGPT.';
    if (error.response) {
      errorMessage += ` Status: ${error.response.status}`;
    } else if (error.request) {
      errorMessage += ' No response received from server.';
    } else {
      errorMessage += ` ${error.message}`;
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
});

// Handle fetching conversations from renderer
ipcMain.handle('fetch-conversations', async (event, { offset, limit }) => {
  try {
    if (!isAuthenticated()) {
      return {
        success: false,
        error: 'Not authenticated. Please connect to ChatGPT first.'
      };
    }
    
    // Default values
    offset = offset || 0;
    limit = limit || 20;
    
    const response = await axios.get(`https://chatgpt.com/backend-api/conversations?offset=${offset}&limit=${limit}&order=updated`, {
      headers: chatGptHeaders
    });
    
    // Check if the response contains the expected data
    if (response.data && Array.isArray(response.data.items)) {
      return {
        success: true,
        conversations: response.data.items,
        total: response.data.total,
        offset: response.data.offset,
        limit: response.data.limit
      };
    } else {
      return {
        success: false,
        error: 'Invalid response from ChatGPT API'
      };
    }
  } catch (error) {
    console.error('Error fetching conversations:', error);
    
    let errorMessage = 'Failed to fetch conversations.';
    if (error.response) {
      errorMessage += ` Status: ${error.response.status}`;
    } else if (error.request) {
      errorMessage += ' No response received from server.';
    } else {
      errorMessage += ` ${error.message}`;
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
});

// Handle get OpenAI API key request
ipcMain.handle('get-openai-key', async (event) => {
  return {
    key: appConfig.openaiApiKey || null
  };
});

// Handle save OpenAI API key request
ipcMain.handle('save-openai-key', async (event, { apiKey }) => {
  try {
    // Validate the API key format (basic check for the format "sk-...")
    if (!apiKey || (apiKey && (!apiKey.startsWith('sk-') || apiKey.length < 10))) {
      return {
        success: false,
        error: 'Invalid API key format. OpenAI API keys should start with "sk-"'
      };
    }
    
    // Save the API key to config
    appConfig.openaiApiKey = apiKey;
    saveConfig();
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error saving OpenAI API key:', error);
    return {
      success: false,
      error: `Failed to save API key: ${error.message}`
    };
  }
});

// Handle get custom prompt request
ipcMain.handle('get-custom-prompt', async (event) => {
  return {
    customPrompt: appConfig.customPrompt || null
  };
});

// Handle save custom prompt request
ipcMain.handle('save-custom-prompt', async (event, { customPrompt, save }) => {
  try {
    if (save) {
      // Save the custom prompt to config
      appConfig.customPrompt = customPrompt;
      saveConfig();
    } else {
      // Use the prompt temporarily without saving to config
      appConfig.customPrompt = customPrompt;
    }
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error saving custom prompt:', error);
    return {
      success: false,
      error: `Failed to save custom prompt: ${error.message}`
    };
  }
});

// Handle get default prompt request
ipcMain.handle('get-default-prompt', async (event) => {
  const defaultPrompt = `
  I have a list of conversation titles, and I need you to categorize each title into one of the following categories. If a title doesn't clearly fit into any of these categories, please place it under 'Other.' If a title might belong to multiple categories, choose the category that best represents its main subject.

  Categories:
  - Technology & Software Development
  - Finance & Investments
  - Gaming & Entertainment
  - Food & Cooking
  - Lifestyle
  - Home Improvement
  - Automotive
  - Legal
  - Meeting Summaries
  - Education & Learning
  - Health & Wellness
  - Travel & Leisure
  - Business & Management
  - Arts, Culture & Entertainment
  - Sports & Recreation
  - News & Current Affairs
  - Other (for titles that are ambiguous or don't clearly fit into any of the above)

  Here are the conversation titles:
  {{TITLES}}
  
  Please respond with a JSON array where each element contains:
  1. "title": The original conversation title
  2. "category": The category you've assigned (must be exactly one of the categories listed above)
  
  Example format: 
  [
    {"title": "Create Electron App", "category": "Technology & Software Development"},
    {"title": "Dinner Ideas with Ground Beef", "category": "Food & Cooking"}
  ]
  
  Only respond with the JSON array, no additional text.
  `;
  
  return {
    defaultPrompt
  };
});

// Handle categorization request
ipcMain.handle('categorize-conversations', async (event, { titles }) => {
  try {
    if (!appConfig.openaiApiKey) {
      return {
        success: false,
        error: 'OpenAI API key is not set'
      };
    }
    
    if (!titles || !Array.isArray(titles) || titles.length === 0) {
      return {
        success: false,
        error: 'No conversation titles provided'
      };
    }
    
    // Define the prompt for categorization
    let prompt = `
    I have a list of conversation titles, and I need you to categorize each title into one of the following categories. If a title doesn't clearly fit into any of these categories, please place it under 'Other.' If a title might belong to multiple categories, choose the category that best represents its main subject.

    Categories:
    - Technology & Software Development
    - Finance & Investments
    - Gaming & Entertainment
    - Food & Cooking
    - Lifestyle
    - Home Improvement
    - Automotive
    - Legal
    - Meeting Summaries
    - Education & Learning
    - Health & Wellness
    - Travel & Leisure
    - Business & Management
    - Arts, Culture & Entertainment
    - Sports & Recreation
    - News & Current Affairs
    - Other (for titles that are ambiguous or don't clearly fit into any of the above)

    Here are the conversation titles:
    ${titles.map((title, index) => `${index + 1}. ${title}`).join('\n')}
    
    Please respond with a JSON array where each element contains:
    1. "title": The original conversation title
    2. "category": The category you've assigned (must be exactly one of the categories listed above)
    
    Example format: 
    [
      {"title": "Create Electron App", "category": "Technology & Software Development"},
      {"title": "Dinner Ideas with Ground Beef", "category": "Food & Cooking"}
    ]
    
    Only respond with the JSON array, no additional text.
    `;
    
    // Use custom prompt if available
    if (appConfig.customPrompt) {
      // Replace the title placeholder with actual titles
      const titlesFormatted = titles.map((title, index) => `${index + 1}. ${title}`).join('\n');
      prompt = appConfig.customPrompt.replace('{{TITLES}}', titlesFormatted);
    }
    
    console.log('Sending categorization request to OpenAI API...');
    
    // Use mock categorization if in development mode or if user sets USE_MOCK_API env var
    if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_API) {
      console.log('Using mock categorization data (development mode)');
      
      // Mock categorized data for testing
      const mockCategories = titles.map(title => {
        const lowercaseTitle = title.toLowerCase();
        let category = 'Other';
        
        // Technology & Software Development
        if (lowercaseTitle.includes('software') || lowercaseTitle.includes('code') || 
            lowercaseTitle.includes('programming') || lowercaseTitle.includes('python') ||
            lowercaseTitle.includes('javascript') || lowercaseTitle.includes('web') ||
            lowercaseTitle.includes('app') || lowercaseTitle.includes('developer') ||
            lowercaseTitle.includes('tech') || lowercaseTitle.includes('ai') ||
            lowercaseTitle.includes('computer') || lowercaseTitle.includes('data')) {
          category = 'Technology & Software Development';
        } 
        // Finance & Investments
        else if (lowercaseTitle.includes('finance') || lowercaseTitle.includes('invest') || 
                lowercaseTitle.includes('money') || lowercaseTitle.includes('stock') ||
                lowercaseTitle.includes('budget') || lowercaseTitle.includes('crypto') ||
                lowercaseTitle.includes('financial') || lowercaseTitle.includes('bank')) {
          category = 'Finance & Investments';
        } 
        // More categories...
        else if (lowercaseTitle.includes('food') || lowercaseTitle.includes('cook') || 
                lowercaseTitle.includes('recipe') || lowercaseTitle.includes('meal')) {
          category = 'Food & Cooking';
        }
        
        return {
          title: title,
          category: category
        };
      });
      
      return {
        success: true,
        categories: mockCategories
      };
    }
    
    // Make the actual OpenAI API call
    try {
      // Call OpenAI API
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that categorizes conversation titles."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent categorization
        max_tokens: 2000, // Adjust based on the expected response length
      }, {
        headers: {
          'Authorization': `Bearer ${appConfig.openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Extract the response content
      const responseContent = response.data.choices[0].message.content;
      console.log('OpenAI response:', responseContent);
      
      // Parse the JSON response
      let categories;
      try {
        // Clean up the response content to ensure it's valid JSON
        // Sometimes OpenAI might add backticks or text around the JSON
        const jsonMatch = responseContent.match(/\[\s*\{.*\}\s*\]/s);
        const jsonStr = jsonMatch ? jsonMatch[0] : responseContent;
        
        categories = JSON.parse(jsonStr);
        
        // Validate the structure of the parsed data
        if (!Array.isArray(categories)) {
          throw new Error('Response is not an array');
        }
        
        // Make sure each item has the expected properties
        categories = categories.map(item => {
          if (!item.title || !item.category) {
            console.warn('Invalid category item:', item);
            // Apply a default structure if needed
            return {
              title: item.title || 'Unknown title',
              category: item.category || 'Other'
            };
          }
          return item;
        });
        
      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError);
        throw new Error(`Failed to parse OpenAI response: ${parseError.message}`);
      }
      
      return {
        success: true,
        categories: categories
      };
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error categorizing conversations:', error);
    return {
      success: false,
      error: `Failed to categorize conversations: ${error.message}`
    };
  }
});
