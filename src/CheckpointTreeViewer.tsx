import React, { useState, useEffect, useCallback } from 'react';

// Define types for the tree data
interface TreeItem {
  title: string;
  duration: string;
  children?: TreeItem[];
}

interface TreeNodeProps {
  item: TreeItem;
  level?: number;
  expandAllState?: boolean;
}

interface TreeViewContentProps {
  data: TreeItem[];
  isLoading: boolean;
  expandAll: boolean;
  setExpandAll: React.Dispatch<React.SetStateAction<boolean>>;
}

// TreeNode component for rendering individual nodes in the hierarchy
const TreeNode = ({ item, level = 0, expandAllState = false }: TreeNodeProps) => {
  const [expanded, setExpanded] = useState(false);
  
  // Update expanded state when expandAllState changes
  useEffect(() => {
    setExpanded(expandAllState);
  }, [expandAllState]);
  
  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };
  
  // Parse duration string and determine color
  const formatDuration = (durationStr: string | undefined) => {
    if (!durationStr) return { text: "0s", className: "" };
    
    // Helper function to extract time value in milliseconds
    const extractTimeInMs = (durationStr: string) => {
      let timeStr = durationStr;
      if (typeof durationStr === 'string') {
        // Remove any HTML tags if present
        timeStr = durationStr.replace(/<[^>]*>/g, '');
      }
      
      // Convert various time formats to milliseconds
      if (timeStr.includes('s') && !timeStr.includes('ms') && !timeStr.includes('μs')) {
        // Handle seconds format: "33.17s" -> 33170ms
        return parseFloat(timeStr) * 1000;
      } else if (timeStr.includes('ms')) {
        // Handle milliseconds format: "431.98ms" -> 431.98ms
        return parseFloat(timeStr);
      } else if (timeStr.includes('μs')) {
        // Handle microseconds format: "25.03μs" -> 0.02503ms
        return parseFloat(timeStr) / 1000;
      } else {
        // Try to parse as raw number
        const num = parseFloat(timeStr);
        return isNaN(num) ? 0 : num;
      }
    };
    
    if (typeof durationStr === 'string') {
      // First check for existing HTML class indicators
      if (durationStr.includes("error")) {
        return { text: durationStr.replace('<span class="error">', '').replace('</span>', ''), className: "text-red-600 font-bold" };
      } else if (durationStr.includes("warn")) {
        return { text: durationStr.replace('<span class="warn">', '').replace('</span>', ''), className: "text-amber-500 font-bold" };
      } else if (durationStr.includes("orange")) {
        return { text: durationStr.replace('<span class="orange">', '').replace('</span>', ''), className: "text-orange-500 font-bold" };
      }
    }
    
    // Apply automatic highlighting based on timing thresholds
    const timeInMs = extractTimeInMs(durationStr);
    
    if (timeInMs >= 1000) {
      // Error: Anything >= 1 second (1000ms)
      return { text: durationStr, className: "text-red-600 font-bold" };
    } else if (timeInMs >= 250) {
      // Warning: 250ms - 999ms
      return { text: durationStr, className: "text-amber-500 font-bold" };
    } else if (timeInMs >= 100) {
      // Moderate delay: 100ms - 249ms
      return { text: durationStr, className: "text-orange-500 font-bold" };
    }
    
    return { text: durationStr, className: "" };
  };
  
  // Check if this node has children
  const hasChildren = item.children && item.children.length > 0;
  
  // Format the time duration
  const duration = formatDuration(item.duration);
  
  return (
    <div className="font-mono">
      <div 
        className={`flex items-center py-1 hover:bg-gray-100 rounded ${level > 0 ? 'pl-' + (level * 4) : ''}`}
        onClick={hasChildren ? toggleExpand : undefined}
        style={{ cursor: hasChildren ? 'pointer' : 'default' }}
      >
        {hasChildren && (
          <div className="w-4 h-4 mr-2 flex items-center justify-center">
            <svg 
              className={`w-3 h-3 transform transition-transform ${expanded ? 'rotate-90' : ''}`} 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path 
                fillRule="evenodd" 
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" 
                clipRule="evenodd" 
              />
            </svg>
          </div>
        )}
        {!hasChildren && <div className="w-4 h-4 mr-2"></div>}
        
        <div className="flex-1 truncate">{item.title}</div>
        <div className={`ml-4 ${duration.className}`}>{duration.text}</div>
      </div>
      
      {expanded && hasChildren && (
        <div className="ml-4">
          {item.children?.map((child, index) => (
            <TreeNode 
              key={index} 
              item={child} 
              level={level + 1} 
              expandAllState={expandAllState}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Main tab content component for tree view display
const TreeViewContent = ({ data, isLoading, expandAll, setExpandAll }: TreeViewContentProps) => {
  return (
    <div>
      <div className="mb-4">
        <button 
          onClick={() => setExpandAll(!expandAll)} 
          className="px-3 py-1 bg-blue-100 hover:bg-blue-200 rounded text-blue-800 text-sm font-medium transition"
        >
          {expandAll ? 'Collapse All' : 'Expand All'}
        </button>
      </div>
      
      {isLoading ? (
        <div className="text-gray-500">Loading...</div>
      ) : data && data.length > 0 ? (
        <div className="overflow-auto">
          {data.map((item, index) => (
            <TreeNode 
              key={index} 
              item={item} 
              expandAllState={expandAll}
            />
          ))}
        </div>
      ) : (
        <div className="text-gray-500">No data available</div>
      )}
    </div>
  );
};

// Custom tab content component
const CustomTabContent = ({ initialUrl = '', setCustomUrlParam }: { initialUrl?: string, setCustomUrlParam: (url: string) => void }) => {
  const [inputValue, setInputValue] = useState('');
  const [urlValue, setUrlValue] = useState(initialUrl);
  const [parsedData, setParsedData] = useState<TreeItem[]>([]);
  const [expandAll, setExpandAll] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Pre-process the data to ensure it has the right structure
  const processNode = useCallback((node: any): TreeItem => {
    // Convert numbers to duration strings for display
    if (typeof node.duration === 'number') {
      node.duration = `${node.duration.toFixed(2)}ms`;
    }
    
    // Ensure name exists
    if (!node.name) {
      node.name = 'Unnamed Node';
    }
    
    // Process children recursively
    if (node.children && Array.isArray(node.children)) {
      node.children = node.children.map(processNode);
    }
    
    return node;
  }, []);

  // Define handleFetchFromUrl with useCallback to avoid dependencies issues
  const handleFetchFromUrl = useCallback(async (url: string = urlValue) => {
    if (!url) return;
    
    setLoading(true);
    setShowError(false);
    
    try {
      // Fetch data from the URL
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Process the data the same way as pasted data
      const processedData = Array.isArray(data) 
        ? data.map(processNode) 
        : [processNode(data)];
      
      setParsedData(processedData);
      
      // Update the URL parameter for the parent component to update the hash
      setCustomUrlParam(url);
    } catch (error) {
      console.error("Error fetching or parsing data:", error);
      setParsedData([]);
      setShowError(true);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to fetch or parse data');
    } finally {
      setLoading(false);
    }
  }, [processNode, setCustomUrlParam, urlValue]);

  // Load data from URL on initial render if provided
  useEffect(() => {
    if (initialUrl) {
      setUrlValue(initialUrl);
      handleFetchFromUrl(initialUrl);
    }
  }, [initialUrl, handleFetchFromUrl]);

  const handleDisplay = useCallback(() => {
    setLoading(true);
    
    try {
      // Parse the input
      const data = JSON.parse(inputValue);
      
      // Handle both single object and array inputs
      const processedData = Array.isArray(data) 
        ? data.map(processNode) 
        : [processNode(data)];
      
      setParsedData(processedData);
      setShowError(false);
    } catch (error) {
      console.error("Error parsing JSON:", error);
      setParsedData([]);
      setShowError(true);
      setErrorMessage('Error parsing JSON data. Please check your input and try again.');
    } finally {
      setLoading(false);
    }
  }, [inputValue, processNode]);
  
  const handleReset = useCallback(() => {
    setInputValue('');
    setUrlValue('');
    setParsedData([]);
    setShowError(false);
    // Also clear the URL hash if it's present
    if (window.location.hash) {
      window.location.hash = '';
    }
    // Clear the custom URL parameter in the parent component
    setCustomUrlParam('');
  }, [setCustomUrlParam]);
  
  // Example input
  const exampleInput = `{
  "title": "block_creation",
  "duration": "33.17s",
  "children": [
    {
      "title": "init_block",
      "duration": "52.04μs"
    },
    {
      "title": "collect_transactions",
      "duration": "25.18s",
      "children": [
        {
          "title": "sort_and_filter",
          "duration": "431.98ms"
        },
        {
          "title": "dedup_txns",
          "duration": "15.03s"
        }
      ]
    },
    {
      "title": "validation",
      "duration": "8.12s",
      "children": [
        {
          "title": "check_signatures",
          "duration": "7.83s"
        },
        {
          "title": "verify_balances",
          "duration": "245.67ms"
        }
      ]
    }
  ]
}`;

  return (
    <div>
      <div className="mb-4">
        <div className="flex flex-col space-y-4">
          {/* URL Input Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fetch checkpoint tree JSON from URL:
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={urlValue}
                onChange={(e) => {
                  setUrlValue(e.target.value);
                }}
                className="flex-grow p-2 border border-gray-300 rounded font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://example.com/data.json"
              />
              <button 
                onClick={() => handleFetchFromUrl()}
                disabled={!urlValue || loading}
                className={`px-4 py-2 rounded font-medium transition ${
                  urlValue && !loading
                    ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                {loading ? 'Fetching...' : 'Fetch'}
              </button>
            </div>
          </div>
          
          {/* Or Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-2 bg-white text-sm text-gray-500">OR</span>
            </div>
          </div>
          
          {/* Paste Input Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Paste your checkpoint tree JSON data:
            </label>
            <div className="flex space-x-2 mb-2">
              <button 
                onClick={() => setInputValue(exampleInput)}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-800 text-xs font-medium transition"
              >
                Load Example
              </button>
              {inputValue && (
                <button 
                  onClick={handleReset}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-800 text-xs font-medium transition"
                >
                  Clear
                </button>
              )}
            </div>
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full h-40 p-2 border border-gray-300 rounded font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Paste JSON data here..."
            />
          </div>
        </div>
      </div>
      
      <div className="mb-4">
        <button 
          onClick={handleDisplay}
          disabled={!inputValue || loading}
          className={`px-4 py-2 rounded font-medium transition ${
            inputValue && !loading
              ? 'bg-blue-500 hover:bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          {loading ? 'Processing...' : 'Display Tree'}
        </button>
      </div>
      
      {showError && (
        <div className="mb-4 p-2 bg-red-100 border border-red-300 rounded text-red-800">
          {errorMessage || 'Error parsing JSON data. Please check your input and try again.'}
        </div>
      )}
      
      {loading ? (
        <div className="text-gray-500">Processing...</div>
      ) : parsedData.length > 0 && (
        <div className="border-t pt-4">
          <TreeViewContent 
            data={parsedData} 
            isLoading={false}
            expandAll={expandAll}
            setExpandAll={setExpandAll}
          />
        </div>
      )}
    </div>
  );
};

// Creation tab content with fetched JSON data
const CreationTabContent = () => {
  const [data, setData] = useState<TreeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandAll, setExpandAll] = useState(false);
  
  useEffect(() => {
    // Simulating data loading
    setTimeout(() => {
      // This would normally be a fetch call to a real API endpoint
    fetch('https://gist.githubusercontent.com/georgeee/39c8cae9914d4c438f565c450dbe4156/raw/740c45bccd6f8d3df4f934f3aced5653b824a314/creation.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        setData(data);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error fetching data:', error);
        setIsLoading(false);
      });
    }, 500);
  }, []);

  return (
    <TreeViewContent 
      data={data} 
      isLoading={isLoading}
      expandAll={expandAll}
      setExpandAll={setExpandAll}
    />
  );
};

// Main application component
const CheckpointTreeViewer = () => {
  const [data, setData] = useState<TreeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandAll, setExpandAll] = useState(false);
  const [activeTab, setActiveTab] = useState('application');
  const [customUrlParam, setCustomUrlParam] = useState('');

  // Parse URL hash on initial load to restore state
  useEffect(() => {
    // Check for hash in URL
    const hash = window.location.hash;
    if (hash) {
      try {
        // Format: #tab=custom&url=https://example.com/data.json
        const params = new URLSearchParams(hash.substring(1));
        const tab = params.get('tab');
        const url = params.get('url');
        
        if (tab === 'custom' && url) {
          setActiveTab('custom');
          setCustomUrlParam(decodeURIComponent(url));
        }
      } catch (error) {
        console.error('Error parsing URL hash:', error);
      }
    }
  }, []);

  // Update URL hash when tab changes
  useEffect(() => {
    if (activeTab === 'custom' && customUrlParam) {
      // Update URL with hash
      const params = new URLSearchParams();
      params.set('tab', 'custom');
      params.set('url', encodeURIComponent(customUrlParam));
      window.location.hash = params.toString();
    } else if (activeTab !== 'custom') {
      // Clear hash if not on custom tab or no URL specified
      window.location.hash = '';
    }
  }, [activeTab, customUrlParam]);

  // Function to handle tab switching
  const TabButton = ({ id, label, active }: { id: string; label: string; active: boolean }) => {
    return (
      <button
        className={`px-4 py-2 ${
          active 
            ? 'border-b-2 border-blue-500 text-blue-600 font-medium' 
            : 'text-gray-600 hover:text-blue-500'
        }`}
        onClick={() => handleTabChange(id)}
      >
        {label}
      </button>
    );
  };

  // Update tab state
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  // Simulating data loading
  useEffect(() => {
    // Simulating data loading
    setTimeout(() => {
      // This would normally be a fetch call to a real API endpoint
    fetch('https://gist.githubusercontent.com/georgeee/39c8cae9914d4c438f565c450dbe4156/raw/740c45bccd6f8d3df4f934f3aced5653b824a314/application.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        setData(data);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error fetching data:', error);
        setIsLoading(false);
      });
    }, 500);
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="flex items-center space-x-3 mb-6">
        <div className="flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="42" viewBox="0 0 256 166" fill="none">
            <mask id="a" width="256" height="166" x="0" y="0" maskUnits="userSpaceOnUse" style={{maskType: "luminance"}}>
              <path fill="#fff" d="M122.24 141.13v-15.155c0-4.57.86-6.856 2.591-6.856h.471c1.571 0 2.359 2.286 2.359 6.856v15.155c0 4.575-.788 6.861-2.359 6.861h-.471c-1.731 0-2.591-2.286-2.591-6.861Zm.803-93.6c-6.604 0-11.987 2.21-16.15 6.618-4.168 4.418-6.247 10.408-6.247 17.972v24.354h21.689v-23.88c0-4.57.783-6.855 2.356-6.855h.472c1.729 0 2.594 2.285 2.594 6.854v31.45c-4.089-2.838-7.86-4.257-11.317-4.257h-.705c-3.301 0-5.935.594-7.897 1.777-1.967 1.183-3.46 2.834-4.481 4.962-1.024 2.129-1.731 4.696-2.12 7.686-.397 3-.589 6.387-.589 10.171v17.021c0 3.785.112 7.177.349 10.172.235 2.995.78 5.557 1.643 7.685.863 2.129 2.193 3.78 3.989 4.963 1.798 1.182 4.34 1.777 7.624 1.777h.705c3.911 0 8.134-1.5 12.672-4.494l.128 3.784h21.689V72.358c0-7.72-2.021-13.79-6.066-17.736-4.044-4.409-9.33-6.618-16.385-6.618h-2.12Zm106.083 0c-6.601 0-11.947 2.244-16.032 6.739-4.09 4.494-6.129 10.368-6.129 17.615v11.35c0 6.31 1.412 11.469 4.242 15.49 2.83 4.022 5.93 7.646 9.313 10.877 3.377 3.231 6.483 6.502 9.312 9.814 2.828 3.311 4.243 7.413 4.243 12.295v9.22c0 2.209-.198 3.906-.589 5.089-.395 1.176-1.378 1.77-2.949 1.77h-.471c-1.412 0-2.356-.594-2.828-1.77-.472-1.183-.707-2.88-.707-5.089v-21.752h-19.566v22.225c0 7.569 2.039 13.563 6.129 17.972 4.084 4.413 9.506 6.623 16.267 6.623h4.007c6.6 0 12.022-2.21 16.267-6.623 4.242-4.409 6.365-10.403 6.365-17.972V130.29c0-4.097-.67-7.72-2.004-10.876-1.338-3.151-3.029-5.949-5.068-8.395a68.558 68.558 0 0 0-6.601-6.859 100.609 100.609 0 0 1-6.601-6.503c-2.044-2.205-3.735-4.57-5.07-7.091-1.337-2.522-2.002-5.44-2.002-8.753v-9.22c0-1.891.193-3.507.59-4.846.389-1.339.978-2.008 1.765-2.008h.472c1.099 0 1.807.67 2.123 2.008.313 1.339.472 2.955.472 4.846v21.758h19.803V71.884c0-7.41-2.085-13.318-6.248-17.736-4.167-4.409-9.629-6.618-16.385-6.618h-2.12Zm-207.437 93.4V72.594c0-4.57.86-6.855 2.592-6.855h.47c1.572 0 2.36 2.285 2.36 6.855v68.336c0 4.575-.788 6.859-2.36 6.859h-.47c-1.732 0-2.592-2.284-2.592-6.859Zm.236-93.4c-6.6 0-11.907 2.244-15.914 6.619C2 58.567 0 64.557 0 72.121v69.282c0 7.57 2.002 13.564 6.01 17.973 4.007 4.413 9.314 6.623 15.915 6.623h4.478c6.53 0 11.897-2.21 16.097-6.623 4.2-4.409 6.299-10.403 6.299-17.973V72.121c0-7.565-2.1-13.554-6.3-17.972-4.199-4.409-9.565-6.619-16.096-6.619h-4.478ZM53.06 0c0 9.404-6.826 17.736-15.991 17.736v21.79h16.042v74.894l-.015 50.99.015-46.149v46.045l-.015.105H96.51v-21.794H74.78V0H53.043Zm122.527 141.112V72.776c0-4.57.861-6.855 2.592-6.855h.472c1.571 0 2.359 2.286 2.359 6.855v68.336c0 4.575-.788 6.86-2.359 6.86h-.472c-1.731 0-2.592-2.285-2.592-6.86ZM153.688 0v165.289h19.569l-.002-5.914c2.039 2.054 4.125 3.664 6.247 4.846 2.123 1.182 4.28 1.777 6.483 1.777h.707c6.601 0 10.921-2.21 12.966-6.623 2.043-4.409 3.066-10.403 3.066-17.972V72.12c0-3.784-.198-7.172-.59-10.166-.394-2.995-1.102-5.556-2.122-7.685a11.27 11.27 0 0 0-4.596-4.968c-2.045-1.182-4.714-1.77-8.016-1.77h-.472c-2.044 0-4.049.473-6.01 1.418-1.967.947-3.814 2.21-5.54 3.78V0h-21.69Z" />
            </mask>
            <g mask="url(#a)">
              <path fill="url(#b)" d="m19.242-67.684-62.865 221.211 280.39 80.166 62.865-221.21-280.39-80.167Z" />
            </g>
            <mask id="c" width="60" height="166" x="37" y="0" maskUnits="userSpaceOnUse" style={{maskType: "luminance"}}>
              <path fill="#fff" d="M53.043 0c0 9.412-6.832 17.75-16.004 17.75v21.79h16.042v74.894l-.015 50.99.015-46.149v46.045l-.015.105H96.51v-21.794H74.78V0H53.043Z" />
            </mask>
            <g mask="url(#c)">
              <path fill="url(#d)" d="M84.982-23.577-28.156 32.066l76.72 156.94 113.138-55.643-76.72-156.94Z" />
            </g>
            <defs>
              <linearGradient id="b" x1="3.391" x2="379.431" y1="48.422" y2="155.287" gradientUnits="userSpaceOnUse">
                <stop stopColor="#0473FF" />
                <stop offset=".61" stopColor="#1900FF" />
                <stop offset="1" stopColor="#000" />
              </linearGradient>
              <linearGradient id="d" x1="111.361" x2="25.108" y1="172.073" y2="-3.304" gradientUnits="userSpaceOnUse">
                <stop stopColor="#1900FF" />
                <stop offset=".23" stopColor="#1900FF" />
                <stop offset=".25" stopColor="#1A1CFF" />
                <stop offset=".33" stopColor="#2194FF" />
                <stop offset=".39" stopColor="#26E0FF" />
                <stop offset=".42" stopColor="#27FDFB" />
                <stop offset=".48" stopColor="#23FDA3" />
                <stop offset=".53" stopColor="#20FD5D" />
                <stop offset=".57" stopColor="#1EFD2A" />
                <stop offset=".6" stopColor="#1CFD0B" />
                <stop offset=".62" stopColor="#1CFD00" />
                <stop offset="1" stopColor="#1CFD00" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-800">Block creation cost centers</h1>
      </div>
      
      <div className="flex space-x-1 mb-4 border-b">
        <TabButton 
          id="application" 
          label="Application" 
          active={activeTab === 'application'} 
        />
        <TabButton 
          id="creation" 
          label="Creation" 
          active={activeTab === 'creation'} 
        />
        <TabButton 
          id="custom" 
          label="Custom" 
          active={activeTab === 'custom'} 
        />
      </div>
      
      <div className="py-2">
        {activeTab === 'application' ? (
          <TreeViewContent 
            data={data} 
            isLoading={isLoading} 
            expandAll={expandAll} 
            setExpandAll={setExpandAll} 
          />
        ) : activeTab === 'creation' ? (
          <CreationTabContent />
        ) : (
          <CustomTabContent initialUrl={customUrlParam} setCustomUrlParam={setCustomUrlParam} />
        )}
      </div>
    </div>
  );
};

export default CheckpointTreeViewer;
