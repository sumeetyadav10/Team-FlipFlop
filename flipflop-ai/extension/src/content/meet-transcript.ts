import api from '../shared/api';
import { TranscriptChunk } from '../shared/types';

class MeetTranscriptCapture {
  private observer: MutationObserver | null = null;
  private lastCaption = '';
  private meetingId = '';
  private isCapturing = false;
  private uiContainer: HTMLElement | null = null;
  private transcripts: TranscriptChunk[] = [];

  constructor() {
    console.log('FlipFlop: Initializing Meet Transcript Capture');
    this.init();
    
    // Bind methods to ensure correct 'this' context
    this.toggleCapture = this.toggleCapture.bind(this);
    this.startCapture = this.startCapture.bind(this);
    this.stopCapture = this.stopCapture.bind(this);
  }

  private init() {
    console.log('FlipFlop: Document readyState:', document.readyState);
    // Wait for page to load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        console.log('FlipFlop: DOMContentLoaded fired');
        this.setup();
      });
    } else {
      console.log('FlipFlop: Document already loaded, setting up');
      this.setup();
    }
  }

  private setup() {
    // Extract meeting ID
    this.meetingId = window.location.pathname.split('/').pop() || `meet_${Date.now()}`;
    
    // Inject UI after a delay
    setTimeout(() => {
      this.injectUI();
      this.startObserving();
    }, 3000);
  }

  private injectUI() {
    if (document.getElementById('flipflop-ui')) return;

    this.uiContainer = document.createElement('div');
    this.uiContainer.id = 'flipflop-ui';
    this.uiContainer.innerHTML = `
      <style>
        #flipflop-ui {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 320px;
          max-height: 400px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
          z-index: 2147483647;
          font-family: Arial, sans-serif;
          overflow: hidden;
        }
        .ff-header {
          background: #6366F1;
          color: white;
          padding: 12px 16px;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .ff-toggle {
          background: white;
          color: #6366F1;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          font-weight: bold;
          transition: all 0.2s;
        }
        .ff-toggle:hover {
          transform: scale(1.05);
        }
        .ff-toggle:active {
          transform: scale(0.95);
        }
        .ff-toggle.active {
          background: #EF4444;
          color: white;
        }
        .ff-status {
          padding: 12px 16px;
          background: #F3F4F6;
          font-size: 13px;
          color: #666;
        }
        .ff-transcripts {
          max-height: 280px;
          overflow-y: auto;
          padding: 12px 16px;
        }
        .ff-transcript-item {
          margin-bottom: 8px;
          padding: 8px;
          background: #F9FAFB;
          border-radius: 6px;
          font-size: 13px;
        }
        .ff-speaker {
          font-weight: bold;
          color: #6366F1;
          margin-bottom: 4px;
        }
        .ff-text {
          color: #374151;
          line-height: 1.4;
        }
        .ff-time {
          font-size: 11px;
          color: #9CA3AF;
          margin-top: 4px;
        }
      </style>
      <div class="ff-header">
        <span>🎯 FlipFlop Transcript</span>
        <button type="button" class="ff-toggle" id="ff-toggle">Start</button>
      </div>
      <div class="ff-status" id="ff-status">
        Ready to capture. Enable CC in Meet first!
      </div>
      <div class="ff-transcripts" id="ff-transcripts"></div>
    `;

    document.body.appendChild(this.uiContainer);
    
    // Add event delegation as fallback
    this.uiContainer.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.id === 'ff-toggle' || target.classList.contains('ff-toggle'))) {
        console.log('FlipFlop: Button clicked via delegation!');
        e.preventDefault();
        e.stopPropagation();
        this.toggleCapture();
      }
    }, true);

    // Add toggle listener with proper event handling
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      const toggleBtn = document.getElementById('ff-toggle') as HTMLButtonElement;
      if (toggleBtn) {
        // Direct event listener - simplest approach
        toggleBtn.addEventListener('click', (e: MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('FlipFlop: Button clicked!');
          this.toggleCapture();
        }, { capture: true });
        
        // Add pointer events too for better compatibility
        toggleBtn.addEventListener('pointerdown', (e: PointerEvent) => {
          console.log('FlipFlop: Button pointer down');
        });
        
        // Verify button is interactive
        const computed = window.getComputedStyle(toggleBtn);
        console.log('FlipFlop: Button computed style:', {
          display: computed.display,
          pointerEvents: computed.pointerEvents,
          cursor: computed.cursor,
          zIndex: computed.zIndex,
          position: computed.position
        });
        
        // Also check if button is visible and clickable
        const rect = toggleBtn.getBoundingClientRect();
        console.log('FlipFlop: Button position:', {
          top: rect.top,
          right: rect.right,
          visible: rect.width > 0 && rect.height > 0
        });
        
        console.log('FlipFlop: Button listener attached successfully');
      } else {
        console.error('FlipFlop: Toggle button not found!');
      }
    });

    console.log('FlipFlop: UI injected');
  }

  private toggleCapture() {
    console.log('FlipFlop: Toggle capture called, current state:', this.isCapturing);
    if (this.isCapturing) {
      this.stopCapture();
    } else {
      this.startCapture();
    }
  }

  private startCapture() {
    console.log('FlipFlop: Starting capture...');
    this.isCapturing = true;
    
    const btn = document.getElementById('ff-toggle') as HTMLButtonElement;
    if (btn) {
      btn.textContent = 'Stop';
      btn.classList.add('active');
      // Don't override CSS with inline styles
      console.log('FlipFlop: Button updated to Stop');
    }
    
    this.updateStatus('Capturing... Speak to see transcripts');
    console.log('FlipFlop: Started capturing, isCapturing =', this.isCapturing);
    
    // Test capture immediately
    setTimeout(() => {
      if (this.isCapturing) {
        console.log('FlipFlop: Test capture after 2 seconds');
        this.checkForCaptions();
      }
    }, 2000);
  }

  private stopCapture() {
    this.isCapturing = false;
    const btn = document.getElementById('ff-toggle');
    if (btn) {
      btn.textContent = 'Start';
      btn.classList.remove('active');
    }
    this.updateStatus('Stopped. ' + this.transcripts.length + ' transcripts captured');
    
    // Send meeting end
    if (this.transcripts.length > 0) {
      api.endMeeting(this.meetingId, 'Meeting ended', [], [])
        .catch(err => console.error('Failed to end meeting:', err));
    }
  }

  private startObserving() {
    console.log('FlipFlop: Starting observer...');
    
    // Create observer
    this.observer = new MutationObserver(() => {
      if (!this.isCapturing) return;
      
      // Look for Meet's caption container whenever DOM changes
      this.checkForCaptions();
    });

    // Start observing
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    // Also poll periodically as backup
    setInterval(() => {
      if (this.isCapturing) {
        this.checkForCaptions();
      }
    }, 500);
  }

  private checkForCaptions() {
    // Multiple strategies to find captions
    
    // Strategy 1: Look for divs with specific patterns
    const allDivs = document.querySelectorAll('div');
    allDivs.forEach(div => {
      const text = div.innerText?.trim();
      if (!text || text === this.lastCaption) return;
      
      // Check if it looks like a caption (position, size, content)
      const rect = div.getBoundingClientRect();
      const isBottomArea = rect.top > window.innerHeight * 0.5;
      const isReasonableWidth = rect.width > 200 && rect.width < window.innerWidth * 0.8;
      const isReasonableText = text.length > 5 && text.length < 300;
      const notUI = !text.match(/^(Turn on|Turn off|Settings|More options|Present now)/i);
      
      if (isBottomArea && isReasonableWidth && isReasonableText && notUI) {
        // Check if this div has caption-like properties
        const styles = window.getComputedStyle(div);
        const hasWhiteText = styles.color === 'rgb(255, 255, 255)' || styles.color === 'white';
        const hasDarkBg = styles.backgroundColor.includes('0, 0, 0') || styles.backgroundColor === 'black';
        
        if (hasWhiteText || hasDarkBg || div.className.includes('caption')) {
          this.processCaptionText(text);
        }
      }
    });
    
    // Strategy 2: Look for specific Meet selectors
    const selectors = [
      // Known Meet caption selectors
      '[jsname="YSxPC"]',
      '[jsname="dsyhDe"]',
      '[jscontroller="D1tHje"]',
      '.a4cQT',
      '.iTTPOb',
      '.TBMuR',
      '.Mz6pEf',
      '.CNusmb',
      '.U3A9Ac',
      // Generic patterns
      '[class*="caption" i]',
      '[class*="subtitle" i]',
      '[class*="transcript" i]',
      '[aria-live="polite"]',
      '[role="region"][aria-live]'
    ];
    
    selectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          const text = (el as HTMLElement).innerText?.trim();
          if (text && text !== this.lastCaption && text.length > 5) {
            this.processCaptionText(text);
          }
        });
      } catch (e) {
        // Ignore selector errors
      }
    });
  }

  private processCaptionText(text: string) {
    // Avoid duplicates
    if (text === this.lastCaption) return;
    this.lastCaption = text;
    
    console.log('FlipFlop: Caption detected:', text);
    
    // Create transcript chunk
    const chunk: TranscriptChunk = {
      text: text,
      speaker: this.detectSpeaker() || 'Speaker',
      timestamp: Date.now(),
      confidence: 1.0
    };
    
    this.transcripts.push(chunk);
    this.displayTranscript(chunk);
    
    // Send to backend
    api.sendTranscript(chunk, this.meetingId)
      .then(() => console.log('FlipFlop: Transcript sent'))
      .catch(err => {
        console.error('FlipFlop: Failed to send:', err);
        console.log('FlipFlop: Checking session...');
        api.getStorageData().then(data => {
          console.log('FlipFlop: Storage data:', {
            hasToken: !!data.sessionToken,
            hasTeam: !!data.selectedTeamId,
            teamId: data.selectedTeamId
          });
        });
      });
    
    this.updateStatus('Captured: ' + text.substring(0, 30) + '...');
  }

  private detectSpeaker(): string {
    // Try to find speaker name from UI
    const nameElements = document.querySelectorAll('[data-participant-id], [data-sender-name], .GDhqjd, .zs7s8d');
    for (let i = 0; i < nameElements.length; i++) {
      const el = nameElements[i];
      const name = el.textContent?.trim();
      if (name && name.length > 0 && name.length < 50) {
        return name;
      }
    }
    return 'Speaker';
  }

  private displayTranscript(chunk: TranscriptChunk) {
    const container = document.getElementById('ff-transcripts');
    if (!container) return;
    
    const item = document.createElement('div');
    item.className = 'ff-transcript-item';
    item.innerHTML = `
      <div class="ff-speaker">${chunk.speaker}</div>
      <div class="ff-text">${chunk.text}</div>
      <div class="ff-time">${new Date(chunk.timestamp).toLocaleTimeString()}</div>
    `;
    
    container.appendChild(item);
    container.scrollTop = container.scrollHeight;
  }

  private updateStatus(text: string) {
    const status = document.getElementById('ff-status');
    if (status) {
      status.textContent = text;
    }
  }
}

// Initialize
new MeetTranscriptCapture();