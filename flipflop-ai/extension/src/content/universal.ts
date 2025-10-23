import api from '../shared/api';

class UniversalCapture {
  private captureButton: HTMLElement | null = null;
  private isAuthenticated = false;

  constructor() {
    this.init();
  }

  private async init() {
    // Check authentication
    const response = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
    this.isAuthenticated = response.isAuthenticated;

    if (this.isAuthenticated) {
      this.createCaptureButton();
    }

    // Listen for auth updates
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'AUTH_UPDATED') {
        window.location.reload();
      }
    });
  }

  private createCaptureButton() {
    // Don't add button to certain pages
    if (window.location.hostname === 'meet.google.com' || 
        window.location.href.includes('flipflop.ai')) {
      return;
    }

    // Create floating button
    this.captureButton = document.createElement('div');
    this.captureButton.id = 'flipflop-capture-button';
    this.captureButton.innerHTML = `
      <img src="${chrome.runtime.getURL('icons/icon-48.png')}" alt="Capture" />
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      #flipflop-capture-button {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 48px;
        height: 48px;
        background: #6366F1;
        border-radius: 50%;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        cursor: pointer;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
      }
      
      #flipflop-capture-button:hover {
        transform: scale(1.1);
        background: #5558E3;
      }
      
      #flipflop-capture-button img {
        width: 28px;
        height: 28px;
        filter: brightness(0) invert(1);
      }
      
      #flipflop-capture-menu {
        position: fixed;
        bottom: 80px;
        right: 20px;
        width: 200px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        padding: 8px;
        z-index: 9999;
        display: none;
      }
      
      .flipflop-menu-item {
        padding: 8px 12px;
        cursor: pointer;
        border-radius: 4px;
        transition: background 0.2s;
      }
      
      .flipflop-menu-item:hover {
        background: #F3F4F6;
      }
      
      #flipflop-capture-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 9998;
        display: none;
      }
    `;
    document.head.appendChild(style);

    // Create capture menu
    const menu = document.createElement('div');
    menu.id = 'flipflop-capture-menu';
    menu.innerHTML = `
      <div class="flipflop-menu-item" data-action="selection">Capture Selection</div>
      <div class="flipflop-menu-item" data-action="screenshot">Capture Screenshot</div>
      <div class="flipflop-menu-item" data-action="full">Capture Full Page</div>
      <div class="flipflop-menu-item" data-action="note">Quick Note</div>
    `;

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'flipflop-capture-overlay';

    // Add to page
    document.body.appendChild(this.captureButton);
    document.body.appendChild(menu);
    document.body.appendChild(overlay);

    // Event listeners
    this.captureButton.addEventListener('click', () => this.toggleMenu());
    overlay.addEventListener('click', () => this.hideMenu());
    
    menu.querySelectorAll('.flipflop-menu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const action = (e.target as HTMLElement).dataset.action;
        if (action) {
          this.handleCapture(action);
        }
      });
    });
  }

  private toggleMenu() {
    const menu = document.getElementById('flipflop-capture-menu');
    const overlay = document.getElementById('flipflop-capture-overlay');
    
    if (menu && overlay) {
      const isVisible = menu.style.display === 'block';
      menu.style.display = isVisible ? 'none' : 'block';
      overlay.style.display = isVisible ? 'none' : 'block';
    }
  }

  private hideMenu() {
    const menu = document.getElementById('flipflop-capture-menu');
    const overlay = document.getElementById('flipflop-capture-overlay');
    
    if (menu && overlay) {
      menu.style.display = 'none';
      overlay.style.display = 'none';
    }
  }

  private async handleCapture(action: string) {
    this.hideMenu();

    switch (action) {
      case 'selection':
        await this.captureSelection();
        break;
      case 'screenshot':
        await this.captureScreenshot();
        break;
      case 'full':
        await this.captureFullPage();
        break;
      case 'note':
        await this.quickNote();
        break;
    }
  }

  private async captureSelection() {
    const selection = window.getSelection();
    if (!selection || selection.toString().trim() === '') {
      alert('Please select some text first');
      return;
    }

    const selectedText = selection.toString();
    
    // Get page content
    const content = document.body.innerText.substring(0, 5000); // Limit size
    
    await chrome.runtime.sendMessage({
      type: 'CAPTURE_PAGE',
      payload: {
        content,
        url: window.location.href,
        title: document.title,
        selection: selectedText,
      },
    });

    this.showNotification('Selection saved to FlipFlop!');
  }

  private async captureScreenshot() {
    const content = document.body.innerText.substring(0, 5000);
    
    await chrome.runtime.sendMessage({
      type: 'CAPTURE_PAGE',
      payload: {
        content,
        url: window.location.href,
        title: document.title,
      },
    });

    this.showNotification('Screenshot saved to FlipFlop!');
  }

  private async captureFullPage() {
    const content = document.body.innerText;
    
    await api.captureContent({
      content,
      url: window.location.href,
      title: document.title,
    });

    this.showNotification('Page saved to FlipFlop!');
  }

  private async quickNote() {
    const note = prompt('Enter your note:');
    if (!note) return;

    await api.captureContent({
      content: note,
      url: window.location.href,
      title: `Note from ${document.title}`,
    });

    this.showNotification('Note saved to FlipFlop!');
  }

  private showNotification(message: string) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 20px;
      background: #10B981;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// Initialize capture
new UniversalCapture();