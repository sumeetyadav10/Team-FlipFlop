// Google Meet Transcript Capture - Final Working Version
console.log('[FlipFlop] Loading transcript capture...');

class MeetTranscript {
  private meetingId: string;
  private isCapturing = false;
  private observer: MutationObserver | null = null;
  private subtitleObserver: MutationObserver | null = null;
  private parentObserver: MutationObserver | null = null;
  private lastCaption = '';
  private transcripts: any[] = [];
  private processedElements = new WeakSet<Element>();
  private captionCount = 0;
  private lastSaveTime = 0;

  constructor() {
    this.meetingId = window.location.pathname.split('/').pop() || `meet_${Date.now()}`;
    this.init();
  }

  private init() {
    // Wait for Meet to load
    setTimeout(() => {
      this.injectUI();
      this.setupObserver();
    }, 3000);
  }


  private findLiveCaptions() {
    console.log('[FlipFlop] Looking for live captions...');
    
    // Look for elements that might contain live caption text
    const allDivs = document.querySelectorAll('div');
    const potentialCaptions: HTMLElement[] = [];
    
    allDivs.forEach(div => {
      const text = div.textContent?.trim();
      const rect = div.getBoundingClientRect();
      
      // Check if this div might contain live captions
      if (text && 
          text.length > 3 && 
          text.length < 200 && 
          rect.bottom > window.innerHeight * 0.3 && // In bottom 70% of screen
          rect.bottom < window.innerHeight && // But not below screen
          !text.includes('button') &&
          !text.includes('Turn off') &&
          !text.includes('Audio settings') &&
          !text.includes('keyboard_arrow') &&
          !div.closest('#flipflop-box')) {
        
        potentialCaptions.push(div as HTMLElement);
        console.log('[FlipFlop] POTENTIAL CAPTION:', {
          text: text.substring(0, 50),
          classes: div.className,
          position: `${rect.top}px top, ${rect.bottom}px bottom`,
          element: div
        });
      }
    });
    
    console.log(`[FlipFlop] Found ${potentialCaptions.length} potential live caption elements`);
    
    // If we found potential captions, set up observers on them
    if (potentialCaptions.length > 0) {
      this.setupGenericCaptionObserver(potentialCaptions);
    }
  }

  private setupGenericCaptionObserver(elements: HTMLElement[]) {
    console.log('[FlipFlop] Setting up generic caption observer on', elements.length, 'elements');
    
    elements.forEach((element, index) => {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' || mutation.type === 'characterData') {
            const newText = element.textContent?.trim();
            if (newText && 
                newText !== this.lastCaption && 
                newText.length > 3 && 
                newText.length < 200 &&
                !this.isTimestamp(newText) &&
                !this.isUIElement(newText) &&
                this.isActualSpeech(newText)) {
              
              console.log(`[FlipFlop] REAL CAPTION detected from element ${index}:`, newText);
              this.lastCaption = newText;
              this.saveCaption(newText, 'Speaker');
            }
          }
        });
      });
      
      observer.observe(element, {
        childList: true,
        subtree: true,
        characterData: true
      });
      
      // Also observe parent in case captions are added as siblings
      if (element.parentElement) {
        observer.observe(element.parentElement, {
          childList: true,
          subtree: true
        });
      }
    });
  }

  private injectUI() {
    if (document.getElementById('flipflop-box')) return;

    const ui = document.createElement('div');
    ui.id = 'flipflop-box';
    ui.innerHTML = `
      <style>
        #flipflop-box {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: white;
          border: 2px solid #4285f4;
          border-radius: 8px;
          padding: 16px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.2);
          z-index: 9999999 !important;
          font-family: Arial, sans-serif;
          min-width: 300px;
          max-width: 350px;
        }
        #ff-title {
          font-weight: bold;
          margin-bottom: 10px;
          color: #4285f4;
        }
        #ff-btn {
          background: #4285f4;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          width: 100%;
          margin-bottom: 10px;
        }
        #ff-btn:hover {
          background: #3367d6;
        }
        #ff-btn.stop {
          background: #ea4335;
        }
        #ff-status {
          font-size: 14px;
          color: #666;
          margin-top: 10px;
        }
        .caption-line {
          padding: 4px 0;
          border-bottom: 1px solid #eee;
          font-size: 13px;
        }
        #ff-title {
          font-weight: bold;
          margin-bottom: 10px;
          color: #4285f4;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        #ff-icon {
          width: 20px;
          height: 20px;
          fill: #4285f4;
        }
      </style>
      <div id="ff-title">
        <svg id="ff-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        FlipFlop Transcript
      </div>
      <button id="ff-btn">Start Recording</button>
      <div id="ff-status">Click Start, then enable CC in Meet</div>
      <div id="ff-captions" style="height: 100px; overflow: hidden; margin-top: 10px; background: #f9f9f9; border: 1px solid #eee; border-radius: 4px; padding: 8px;"></div>
    `;

    document.body.appendChild(ui);

    // Button handler
    const btn = document.getElementById('ff-btn');
    btn?.addEventListener('click', () => this.toggle());

    // Check auth
    this.checkAuth();
  }

  private async checkAuth() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'VERIFY_SESSION' });
      if (!response?.authenticated) {
        this.updateStatus('Not logged in - Use extension popup to login');
      }
    } catch (e) {
      console.log('[FlipFlop] Auth check failed:', e);
    }
  }

  private setupObserver() {
    // Not needed anymore - we observe captions directly
  }

  private toggle() {
    if (this.isCapturing) {
      this.stop();
    } else {
      this.start();
    }
  }

  private start() {
    console.log('[FlipFlop] Starting capture...');
    this.isCapturing = true;
    this.transcripts = [];
    this.lastCaption = '';
    this.captionCount = 0;
    this.lastSaveTime = Date.now();

    const btn = document.getElementById('ff-btn');
    if (btn) {
      btn.textContent = 'Stop Recording';
      btn.className = 'stop';
    }

    this.updateStatus('Recording... Make sure CC is ON');

    // Find captions immediately
    this.findCaptions();
  }

  private captureInterval?: number;

  private stop() {
    console.log('[FlipFlop] Stopping capture...');
    this.isCapturing = false;

    const btn = document.getElementById('ff-btn');
    if (btn) {
      btn.textContent = 'Start Recording';
      btn.className = '';
    }

    // Stop observing
    this.observer?.disconnect();
    this.subtitleObserver?.disconnect();
    this.parentObserver?.disconnect();
    
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
    }

    // Save meeting
    if (this.transcripts.length > 0) {
      const duration = Math.floor((Date.now() - (this.transcripts[0]?.timestamp || Date.now())) / 60000);
      const statusMsg = this.transcripts.length > 100 
        ? `Saving ${this.transcripts.length} captions from ${duration}m recording... (this may take a moment)`
        : `Saving ${this.transcripts.length} captions... (this may take a moment)`;
      this.updateStatus(statusMsg);
      this.saveMeeting();
    } else {
      this.updateStatus('No captions captured');
    }
  }

  private findCaptions() {
    console.log('[FlipFlop] Looking for Google Meet captions...');
    
    // Current Google Meet uses these patterns for captions
    let captionObserver: MutationObserver;
    let captionFound = false;
    
    // Function to check all possible caption containers
    const checkForCaptions = () => {
      // Try multiple selectors that Google Meet uses
      const selectors = [
        // Primary caption containers
        'div.a4cQT',
        'div.iOzk7', 
        'div[jsname="tgaKEf"]',
        'div[jscontroller="TEjq6e"]',
        // Caption text elements
        'span.CNusmb',
        'span.oJeWuf',
        // Live transcription area
        'div[role="region"][aria-live="polite"]',
        'div[aria-live="assertive"]',
        // Fallback patterns
        'div[class*="caption"]',
        'div[class*="subtitle"]'
      ];
      
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        Array.from(elements).forEach(element => {
          const text = element.textContent?.trim();
          // Check if this looks like a caption (not UI text)
          if (text && text.length > 2 && text.length < 300 && 
              !text.includes('Turn off') && 
              !text.includes('settings') &&
              !/^\d{1,2}:\d{2}/.test(text)) {
            console.log(`[FlipFlop] Found caption element with selector: ${selector}`);
            captionFound = true;
            this.watchCaptionElement(element);
          }
        });
        if (captionFound) return true;
      }
      return false;
    };
    
    // First try immediately
    if (!checkForCaptions()) {
      console.log('[FlipFlop] No captions found yet, setting up observer...');
      
      // Set up observer to watch for caption elements being added
      captionObserver = new MutationObserver((mutations) => {
        if (!captionFound && checkForCaptions()) {
          captionObserver.disconnect();
        }
      });
      
      captionObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      // Also try periodically in case captions appear later
      const interval = setInterval(() => {
        if (checkForCaptions()) {
          clearInterval(interval);
          if (captionObserver) {
            captionObserver.disconnect();
          }
        }
      }, 1000);
      
      // Stop trying after 30 seconds
      setTimeout(() => {
        clearInterval(interval);
        if (captionObserver) {
          captionObserver.disconnect();
        }
        if (!captionFound) {
          console.log('[FlipFlop] Could not find captions after 30s');
          this.updateStatus('Could not detect captions - make sure they are enabled');
        }
      }, 30000);
    }
  }
  
  private watchCaptionElement(element: Element) {
    console.log('[FlipFlop] Watching caption element for changes');
    
    let lastText = '';
    
    const observer = new MutationObserver(() => {
      const currentText = element.textContent?.trim() || '';
      
      // Only process if text changed and is valid
      if (currentText !== lastText && 
          currentText.length > 2 && 
          !/^\d{1,2}:\d{2}/.test(currentText) &&
          !currentText.includes('Turn off')) {
        
        console.log('[FlipFlop] New caption:', currentText);
        lastText = currentText;
        
        // Save the caption
        const caption = {
          text: currentText,
          timestamp: Date.now(),
          speaker: 'Speaker'
        };
        
        this.transcripts.push(caption);
        this.sendToBackend(caption);
        
        // Update UI
        const display = document.getElementById('ff-captions');
        if (display) {
          const line = document.createElement('div');
          line.className = 'caption-line';
          line.textContent = currentText;
          display.insertBefore(line, display.firstChild);
          if (display.children.length > 4) {
            display.removeChild(display.lastChild!);
          }
        }
        
        this.updateStatus(`Recording... (${this.transcripts.length} captions)`);
      }
    });
    
    observer.observe(element, {
      childList: true,
      subtree: true,
      characterData: true
    });
    
    // Also observe parent in case element gets replaced
    if (element.parentElement) {
      observer.observe(element.parentElement, {
        childList: true
      });
    }
  }

  private observeCaptions(container: Element) {
    const observer = new MutationObserver((mutations) => {
      const text = container.textContent?.trim();
      if (text && text !== this.lastCaption && text.length > 3) {
        this.lastCaption = text;
        this.saveAndSendCaption(text);
      }
    });
    
    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  private saveAndSendCaption(text: string) {
    console.log('[FlipFlop] Saving caption:', text);
    
    // Save to memory
    const caption = {
      text: text,
      timestamp: Date.now(),
      speaker: 'Speaker'
    };
    this.transcripts.push(caption);
    
    // Send to backend immediately
    this.sendToBackend(caption);
    
    // Update UI
    const display = document.getElementById('ff-captions');
    if (display) {
      display.innerHTML = `<div class="caption-line">${text}</div>` + display.innerHTML;
      if (display.children.length > 4) {
        display.removeChild(display.lastChild!);
      }
    }
  }

  private async sendToBackend(caption: any) {
    try {
      // Get auth data
      const data = await new Promise<any>((resolve) => {
        chrome.storage.sync.get(['sessionToken', 'selectedTeamId'], resolve);
      });
      
      if (!data.sessionToken || !data.selectedTeamId) {
        console.error('[FlipFlop] Not authenticated');
        return;
      }
      
      // Send directly to API
      const response = await fetch('https://flipflop.scanlyf.com/api/extension/meet/transcription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Extension-Key': 'ext_secret_key_123',
          'X-Session-Token': data.sessionToken,
          'X-Team-ID': data.selectedTeamId,
        },
        body: JSON.stringify({
          meetingId: this.meetingId,
          chunk: caption
        })
      });
      
      if (response.ok) {
        console.log('[FlipFlop] ✅ Saved to database');
      } else {
        console.error('[FlipFlop] ❌ Failed to save:', response.status);
      }
    } catch (error) {
      console.error('[FlipFlop] Error:', error);
    }
  }

  private setupSubtitleObserver(subtitleDiv: Element) {
    if (this.subtitleObserver) return; // Already set up
    
    this.subtitleObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.target instanceof HTMLElement && 
            mutation.target.classList && 
            mutation.target.classList.contains("iTTPOb")) {
          if (mutation.addedNodes.length) {
            const newNodes = mutation.addedNodes;
            const textNode = newNodes[0] as HTMLElement;
            
            // Extract speaker name
            const speaker = textNode?.parentNode?.parentNode?.parentNode?.querySelector(".zs7s8d.jxFHg")?.textContent;
            
            if (textNode && textNode.innerText) {
              const captionText = textNode.innerText.trim();
              if (captionText && captionText !== this.lastCaption) {
                this.lastCaption = captionText;
                this.saveCaption(captionText, speaker || 'Speaker');
              }
            }
          }
        }
      });
    });

    this.subtitleObserver.observe(subtitleDiv, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    });
    
    console.log('[FlipFlop] Subtitle observer set up on jscontroller=TEjq6e');
  }

  private setupParentContainerObserver(parentContainer: Element) {
    if (this.parentObserver) return; // Already set up
    
    let lastProcessedText = '';
    
    this.parentObserver = new MutationObserver(() => {
      const subtitleDiv = parentContainer.querySelector('div[jsname="tgaKEf"]');
      
      if (subtitleDiv) {
        // Extract subtitle text from all span elements
        const subtitleText = Array.from(subtitleDiv.querySelectorAll('span'))
          .map(span => span.innerText.trim())
          .join(" ")
          .trim();

        // Capture speaker's name
        const speakerDiv = parentContainer.querySelector('div.KcIKyf.jxFHg') as HTMLElement;
        const speakerName = speakerDiv ? speakerDiv.innerText : "Speaker";

        // Process new subtitle text
        if (subtitleText && subtitleText !== lastProcessedText) {
          const newText = subtitleText.slice(lastProcessedText.length).trim();
          if (newText && newText !== this.lastCaption) {
            this.lastCaption = newText;
            this.saveCaption(newText, speakerName);
          }
          lastProcessedText = subtitleText;
        }
      }
    });

    this.parentObserver.observe(parentContainer, { 
      childList: true, 
      subtree: true 
    });
    
    console.log('[FlipFlop] Parent container observer set up on jsname=dsyhDe');
  }

  private processElement(element: HTMLElement) {
    // Skip if already processed
    if (this.processedElements.has(element)) return;
    
    // Skip our own UI
    if (element.closest('#flipflop-box')) return;
    
    const text = element.innerText?.trim();
    
    if (!text || text === this.lastCaption) return;
    if (text.length < 2 || text.length > 500) return;
    
    // Skip UI elements - expanded list
    const skipPatterns = [
      'Turn on captions',
      'Turn off captions',
      'Captions',
      'Settings',
      'More options',
      'Present now',
      'Leave call',
      'Meeting details',
      'Font size',
      'Font colour',
      'Open caption settings',
      'format_size',
      'language',
      'English',
      'circle',
      'settings',
      'FlipFlop Transcript',
      'Recording... Make sure CC is ON',
      'Sumeet Yadav'
    ];
    
    if (skipPatterns.some(pattern => text.includes(pattern))) return;
    
    // Skip if it contains multiple UI elements
    if (text.includes('Font size') || text.includes('settings') || text.includes('format_size')) return;
    
    // Extract actual caption text
    let captionText = text;
    
    // Handle "You\ntext" format specifically
    if (text.startsWith('You\n')) {
      captionText = text.substring(4).trim();
      // Skip if it's just "You" or empty
      if (!captionText || captionText === 'You') return;
    }
    // Handle other speaker formats
    else if (text.includes('\n')) {
      const lines = text.split('\n');
      // If first line is a name/speaker and second is text
      if (lines.length === 2 && lines[0].length < 50 && !lines[1].includes('Font')) {
        captionText = lines[1].trim();
      } else {
        // Skip multi-line UI text
        return;
      }
    }
    
    // Final validation - must be actual speech
    if (!captionText || captionText.length < 2) return;
    if (captionText === 'You' || captionText === 'Speaker') return;
    
    // Save if it's new and looks like actual speech
    if (captionText !== this.lastCaption && !captionText.includes('Font') && !captionText.includes('settings')) {
      // Mark this element as processed
      this.processedElements.add(element);
      this.lastCaption = captionText;
      this.saveCaption(captionText);
    }
  }

  private saveCaption(text: string, speaker: string = 'Speaker') {
    console.log('[FlipFlop] Caption:', text);
    
    const caption = {
      text: text,
      timestamp: Date.now(),
      speaker: speaker
    };
    
    this.transcripts.push(caption);
    this.captionCount++;
    
    // Send transcript immediately to backend
    this.sendTranscriptChunk(caption);
    
    // For long recordings, only update UI every few captions to improve performance
    if (this.captionCount % 3 === 0 || this.transcripts.length <= 20) {
      this.updateDisplayAndStatus();
    }
    
    // Auto-save checkpoint for very long recordings (every 100 captions or 10 minutes)
    const now = Date.now();
    if (this.transcripts.length % 100 === 0 || (now - this.lastSaveTime > 600000)) {
      this.lastSaveTime = now;
      console.log(`[FlipFlop] Long recording checkpoint: ${this.transcripts.length} captions`);
    }
  }

  private isTimestamp(text: string): boolean {
    // Check for time patterns like "06:26", "12:34", "1:23 PM", etc.
    return /^(\d{1,2}:\d{2}(\s?(AM|PM))?|\d{1,2}:\d{2}:\d{2})$/.test(text);
  }

  private isUIElement(text: string): boolean {
    const uiPatterns = [
      'button', 'Turn off', 'Audio settings', 'keyboard_arrow',
      'settings', 'mic', 'camera', 'more_vert', 'present_to_all',
      'call_end', 'volume_up', 'volume_off', 'Developing an extension',
      'add-on would', 'Call controls', 'Meeting details'
    ];
    
    return uiPatterns.some(pattern => text.includes(pattern));
  }

  private isActualSpeech(text: string): boolean {
    // Must contain letters (not just numbers/symbols)
    if (!/[a-zA-Z]/.test(text)) return false;
    
    // Must have some word-like content
    if (text.split(' ').length < 1) return false;
    
    // Skip single characters or very short non-words
    if (text.length < 3 && !/\b(I|a|to|of|in|it|is|be|we|he|me)\b/i.test(text)) return false;
    
    return true;
  }

  private async sendTranscriptChunk(chunk: any) {
    try {
      console.log('[FlipFlop] Sending transcript chunk:', chunk.text.substring(0, 50) + '...');
      
      const response = await chrome.runtime.sendMessage({
        type: 'SEND_TRANSCRIPT',
        chunk: chunk,
        meetingId: this.meetingId
      });
      
      if (!response?.success) {
        console.warn('[FlipFlop] Failed to send transcript chunk:', response?.error);
        console.warn('[FlipFlop] Check if extension is logged in and team is selected');
      } else {
        console.log('[FlipFlop] ✅ Transcript chunk sent successfully');
      }
    } catch (error) {
      console.error('[FlipFlop] Error sending transcript chunk:', error);
    }
  }

  private updateDisplayAndStatus() {
    // Display only last 4 captions for clean UI
    const display = document.getElementById('ff-captions');
    if (display) {
      const maxDisplay = 4;
      
      // Remove old captions to keep only 4 visible
      while (display.children.length >= maxDisplay) {
        display.removeChild(display.firstChild!);
      }
      
      // Add latest caption
      const latestCaption = this.transcripts[this.transcripts.length - 1];
      if (latestCaption) {
        const line = document.createElement('div');
        line.className = 'caption-line';
        line.textContent = latestCaption.text;
        display.appendChild(line);
        display.scrollTop = display.scrollHeight;
      }
    }
    
    // Update status with time info for long recordings
    const duration = Math.floor((Date.now() - (this.transcripts[0]?.timestamp || Date.now())) / 60000);
    const statusText = duration > 0 
      ? `Recording... (${this.transcripts.length} captions, ${duration}m)`
      : `Recording... (${this.transcripts.length} captions captured)`;
    this.updateStatus(statusText);
  }

  private async saveMeeting() {
    console.log('[FlipFlop] Ending meeting with', this.transcripts.length, 'captions');
    
    try {
      // Get stored data directly
      const data = await new Promise<any>((resolve) => {
        chrome.storage.sync.get(['sessionToken', 'selectedTeamId'], resolve);
      });
      
      if (!data.sessionToken || !data.selectedTeamId) {
        this.updateStatus('Not logged in - use extension popup');
        return;
      }
      
      // End meeting (transcripts already saved individually)
      const response = await fetch('https://flipflop.scanlyf.com/api/extension/meet/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Extension-Key': 'ext_secret_key_123',
          'X-Session-Token': data.sessionToken,
          'X-Team-ID': data.selectedTeamId,
        },
        body: JSON.stringify({
          meetingId: this.meetingId,
          summary: `Meeting ended with ${this.transcripts.length} transcript segments captured`,
          decisions: [],
          actionItems: [],
        }),
      });
      
      console.log('[FlipFlop] API response:', response.status);
      
      if (response.ok) {
        this.updateStatus(`Meeting saved successfully (${this.transcripts.length} transcript segments saved to database)`);
      } else {
        const error = await response.text();
        console.error('[FlipFlop] API Error:', error);
        this.updateStatus(`Failed to end meeting: ${response.status}`);
      }
    } catch (err: any) {
      console.error('[FlipFlop] Save error:', err);
      this.updateStatus(`Error: ${err.message || 'Failed to save'}`);
    }
  }

  private updateStatus(text: string) {
    const status = document.getElementById('ff-status');
    if (status) {
      status.textContent = text;
    }
  }
}

// Only run on Google Meet
if (window.location.hostname === 'meet.google.com') {
  new MeetTranscript();
}