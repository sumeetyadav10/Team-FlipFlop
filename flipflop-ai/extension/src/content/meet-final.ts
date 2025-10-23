// Google Meet Transcript Capture - Final Working Version
console.log('[FlipFlop] Loading transcript capture...');

class MeetTranscript {
  private meetingId: string;
  private isCapturing = false;
  private observer: MutationObserver | null = null;
  private lastCaption = '';
  private transcripts: any[] = [];

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
          z-index: 9999999;
          font-family: Arial, sans-serif;
          min-width: 300px;
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
      </style>
      <div id="ff-title">🎯 FlipFlop Transcript</div>
      <button id="ff-btn">Start Recording</button>
      <div id="ff-status">Click Start, then enable CC in Meet</div>
      <div id="ff-captions" style="max-height: 200px; overflow-y: auto; margin-top: 10px;"></div>
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
        this.updateStatus('⚠️ Not logged in - Use extension popup to login');
      }
    } catch (e) {
      console.log('[FlipFlop] Auth check failed:', e);
    }
  }

  private setupObserver() {
    // Create observer for DOM changes
    this.observer = new MutationObserver(() => {
      if (this.isCapturing) {
        this.findCaptions();
      }
    });
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

    const btn = document.getElementById('ff-btn');
    if (btn) {
      btn.textContent = 'Stop Recording';
      btn.className = 'stop';
    }

    this.updateStatus('Recording... Make sure CC is ON');

    // Start observing entire document for changes
    if (this.observer) {
      this.observer.observe(document.body, {
        subtree: true,
        childList: true,
        characterData: true
      });
    }

    // Also check periodically
    this.captureInterval = setInterval(() => this.findCaptions(), 1000);
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
    
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
    }

    // Save meeting
    if (this.transcripts.length > 0) {
      this.updateStatus(`Saving ${this.transcripts.length} captions...`);
      this.saveMeeting();
    } else {
      this.updateStatus('No captions captured');
    }
  }

  private findCaptions() {
    // Try multiple strategies to find captions
    
    // Strategy 1: Look for divs with specific Meet classes
    const selectors = [
      '.a4cQT', // Caption container
      '.Mz6pEf', // Caption text
      '.U3A9Ac', // Alt caption
      'div[jsname="YSxPC"]',
      'div[jsname="tgaKEf"]',
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        this.processElement(el as HTMLElement);
      });
    }

    // Strategy 2: Look for any div in caption area with text
    const allDivs = document.getElementsByTagName('div');
    for (let i = 0; i < allDivs.length; i++) {
      const div = allDivs[i];
      
      // Check if it's in the caption area (bottom of screen)
      const rect = div.getBoundingClientRect();
      if (rect.bottom > window.innerHeight * 0.5 && rect.bottom < window.innerHeight * 0.9) {
        this.processElement(div);
      }
    }
  }

  private processElement(element: HTMLElement) {
    const text = element.innerText?.trim();
    
    if (!text || text === this.lastCaption) return;
    if (text.length < 2 || text.length > 500) return;
    
    // Skip UI elements
    const skipPatterns = [
      'Turn on captions',
      'Turn off captions',
      'Captions',
      'Settings',
      'More options',
      'Present now',
      'Leave call',
      'Meeting details'
    ];
    
    if (skipPatterns.some(pattern => text.includes(pattern))) return;
    
    // Extract actual caption text
    let captionText = text;
    
    // Handle "Speaker: text" format
    if (text.includes(':')) {
      const parts = text.split(':');
      if (parts.length === 2 && parts[0].length < 50) {
        captionText = parts[1].trim();
      }
    }
    
    // Handle "Speaker\ntext" format
    if (text.includes('\n')) {
      const lines = text.split('\n');
      if (lines.length === 2 && lines[0].length < 50) {
        captionText = lines[1].trim();
      }
    }
    
    // Save if it's new
    if (captionText && captionText !== this.lastCaption) {
      this.lastCaption = captionText;
      this.saveCaption(captionText);
    }
  }

  private saveCaption(text: string) {
    console.log('[FlipFlop] Caption:', text);
    
    const caption = {
      text: text,
      timestamp: Date.now(),
      speaker: 'Speaker'
    };
    
    this.transcripts.push(caption);
    
    // Display in UI
    const display = document.getElementById('ff-captions');
    if (display) {
      const line = document.createElement('div');
      line.className = 'caption-line';
      line.textContent = text;
      display.appendChild(line);
      display.scrollTop = display.scrollHeight;
    }
    
    // Send to backend
    chrome.runtime.sendMessage({
      type: 'SEND_TRANSCRIPT',
      chunk: {
        text: text,
        speaker: 'Speaker',
        timestamp: Date.now(),
        confidence: 1.0
      },
      meetingId: this.meetingId
    }).then(response => {
      if (response?.success) {
        this.updateStatus(`✓ Saved: ${text.substring(0, 30)}...`);
      }
    }).catch(err => {
      console.error('[FlipFlop] Save error:', err);
    });
  }

  private saveMeeting() {
    chrome.runtime.sendMessage({
      type: 'END_MEETING',
      meetingId: this.meetingId,
      summary: `Meeting with ${this.transcripts.length} captions`,
      transcripts: this.transcripts.map(t => t.text)
    }).then(response => {
      if (response?.success) {
        this.updateStatus(`✅ Meeting saved (${this.transcripts.length} captions)`);
      } else {
        this.updateStatus('❌ Failed to save meeting');
      }
    }).catch(err => {
      console.error('[FlipFlop] Meeting save error:', err);
      this.updateStatus('❌ Error saving meeting');
    });
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