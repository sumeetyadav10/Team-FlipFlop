// Google Meet Caption Capture - Based on proven implementation patterns
console.log('[FlipFlop] Content script loaded on', window.location.href);

// Caption observer
let captionObserver: MutationObserver | null = null;
let isCapturing = false;
let captionContainer: HTMLElement | null = null;
let meetingId = '';
let lastProcessedText = '';
let capturedTranscripts: string[] = [];
let processedElements = new WeakSet<Element>();
let lastProcessedTime = 0;

// UI elements
let uiContainer: HTMLElement | null = null;
let statusElement: HTMLElement | null = null;
let toggleButton: HTMLButtonElement | null = null;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
  console.log('[FlipFlop] Initializing...');
  
  // Extract meeting ID from URL
  meetingId = window.location.pathname.split('/').pop() || `meet_${Date.now()}`;
  
  // Wait for Meet to fully load
  setTimeout(() => {
    injectUI();
    setupCaptionDetection();
  }, 3000);
}

function injectUI() {
  // Don't inject if already exists
  if (document.getElementById('flipflop-ui')) return;
  
  console.log('[FlipFlop] Injecting UI...');
  
  // Create container
  uiContainer = document.createElement('div');
  uiContainer.id = 'flipflop-ui';
  uiContainer.innerHTML = `
    <div id="flipflop-header">
      <span id="flipflop-title">FlipFlop Transcript</span>
      <button id="flipflop-toggle">Start</button>
    </div>
    <div id="flipflop-status">Ready - Enable CC first!</div>
  `;
  
  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    #flipflop-ui {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: white;
      border: 2px solid #6366F1;
      border-radius: 12px;
      padding: 16px;
      min-width: 280px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    #flipflop-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    
    #flipflop-title {
      font-weight: 600;
      color: #6366F1;
      font-size: 16px;
    }
    
    #flipflop-toggle {
      background: #6366F1;
      color: white;
      border: none;
      padding: 6px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }
    
    #flipflop-toggle:hover {
      background: #4F46E5;
      transform: translateY(-1px);
    }
    
    #flipflop-toggle.active {
      background: #DC2626;
    }
    
    #flipflop-status {
      font-size: 13px;
      color: #6B7280;
      line-height: 1.5;
    }
    
    .caption-saved {
      color: #10B981;
    }
    
    .caption-error {
      color: #EF4444;
    }
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(uiContainer);
  
  // Get references
  statusElement = document.getElementById('flipflop-status');
  toggleButton = document.getElementById('flipflop-toggle') as HTMLButtonElement;
  
  // Add click handler
  if (toggleButton) {
    toggleButton.addEventListener('click', toggleCapture);
  }
  
  console.log('[FlipFlop] UI injected successfully');
}

function setupCaptionDetection() {
  console.log('[FlipFlop] Setting up caption detection...');
  
  // Create observer that watches for DOM changes
  captionObserver = new MutationObserver((mutations) => {
    if (!isCapturing) return;
    
    // Look for caption elements
    findAndProcessCaptions();
  });
}

function toggleCapture() {
  if (isCapturing) {
    stopCapture();
  } else {
    startCapture();
  }
}

function startCapture() {
  console.log('[FlipFlop] Starting capture...');
  isCapturing = true;
  
  // Clear previous transcripts and tracking
  capturedTranscripts = [];
  lastProcessedText = '';
  processedElements = new WeakSet<Element>();
  lastProcessedTime = 0;
  
  // Update UI
  if (toggleButton) {
    toggleButton.textContent = 'Stop';
    toggleButton.classList.add('active');
  }
  updateStatus('Capturing... Speak to see captions');
  
  // Start observing
  if (captionObserver) {
    captionObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }
  
  // Also poll periodically as backup
  captionInterval = setInterval(findAndProcessCaptions, 500);
}

function stopCapture() {
  console.log('[FlipFlop] Stopping capture...');
  isCapturing = false;
  
  // Update UI
  if (toggleButton) {
    toggleButton.textContent = 'Start';
    toggleButton.classList.remove('active');
  }
  
  // Stop observing
  if (captionObserver) {
    captionObserver.disconnect();
  }
  
  if (captionInterval) {
    clearInterval(captionInterval);
    captionInterval = null;
  }
  
  // Send meeting end summary
  if (capturedTranscripts.length > 0) {
    updateStatus(`Saving meeting summary (${capturedTranscripts.length} captions)...`);
    
    chrome.runtime.sendMessage({
      type: 'END_MEETING',
      meetingId: meetingId,
      summary: `Meeting ended with ${capturedTranscripts.length} captions captured`,
      transcripts: capturedTranscripts
    }).then(response => {
      if (response?.success) {
        console.log('[FlipFlop] Meeting summary saved');
        updateStatus(`✓ Meeting saved (${capturedTranscripts.length} captions)`, 'caption-saved');
        // Clear transcripts after successful save
        capturedTranscripts = [];
      } else {
        console.error('[FlipFlop] Failed to save meeting summary:', response?.error);
        updateStatus(`✗ Failed to save meeting summary`, 'caption-error');
      }
    }).catch(err => {
      console.error('[FlipFlop] Error saving meeting:', err);
      updateStatus(`✗ Error saving meeting`, 'caption-error');
    });
  } else {
    updateStatus('Stopped (no captions captured)');
  }
}

let captionInterval: number | null = null;

function findAndProcessCaptions() {
  // Prevent running too frequently
  const now = Date.now();
  if (now - lastProcessedTime < 100) return; // Wait at least 100ms between checks
  
  // Look for caption elements using specific selectors first
  const captionSelectors = [
    'div.a4cQT',  // Main caption container
    'div.Mz6pEf', // Caption text
    'span.CNusmb' // Caption span
  ];
  
  for (const selector of captionSelectors) {
    const elements = document.querySelectorAll(selector);
    
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      
      // Skip if already processed
      if (processedElements.has(element)) continue;
      
      const text = (element as HTMLElement).innerText?.trim();
      
      if (!text || text.length < 2) continue;
      
      // Check position - must be in bottom 40% of screen
      const rect = element.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.6) continue;
      
      // Extract caption text
      let captionText = '';
      
      // Pattern 1: "You\n<text>"
      if (text.startsWith('You\n')) {
        captionText = text.substring(4).trim();
      }
      // Pattern 2: "<Speaker>\n<text>"
      else if (text.includes('\n')) {
        const lines = text.split('\n');
        if (lines.length === 2 && lines[0].length < 50) {
          captionText = lines[1].trim();
        }
      }
      // Pattern 3: Just the text (if it doesn't contain UI elements)
      else if (!text.includes('settings') && !text.includes('Font') && !text.includes('circle')) {
        captionText = text;
      }
      
      // Process if valid and different from last
      if (captionText && captionText !== lastProcessedText && captionText.length > 1) {
        // Mark element as processed
        processedElements.add(element);
        lastProcessedText = captionText;
        lastProcessedTime = now;
        
        processCaption(captionText);
        return; // Process one at a time
      }
    }
  }
}

function processCaption(text: string) {
  console.log('[FlipFlop] Caption:', text);
  updateStatus(`Captured: ${text.substring(0, 50)}...`);
  
  // Add to local transcript array
  capturedTranscripts.push(text);
  
  // Send to background for storage
  chrome.runtime.sendMessage({
    type: 'SEND_TRANSCRIPT',
    chunk: {
      text: text,
      speaker: 'Speaker',
      timestamp: Date.now(),
      confidence: 1.0
    },
    meetingId: meetingId
  }).then(response => {
    if (response?.success) {
      console.log('[FlipFlop] Saved successfully');
      updateStatus(`✓ ${text.substring(0, 50)}...`, 'caption-saved');
    } else {
      console.error('[FlipFlop] Save failed:', response?.error);
      updateStatus(`✗ Failed to save`, 'caption-error');
    }
  }).catch(err => {
    console.error('[FlipFlop] Error:', err);
    updateStatus(`✗ Connection error`, 'caption-error');
  });
}

function updateStatus(text: string, className?: string) {
  if (statusElement) {
    statusElement.textContent = text;
    statusElement.className = className || '';
  }
}

// Check for authentication on load
chrome.runtime.sendMessage({ type: 'VERIFY_SESSION' }).then(response => {
  if (!response?.authenticated) {
    updateStatus('⚠️ Not authenticated - Login via extension popup', 'caption-error');
  }
}).catch(() => {
  // Ignore errors on initial check
});