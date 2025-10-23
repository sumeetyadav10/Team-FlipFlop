import api from '../shared/api';
import { StorageData, Team } from '../shared/types';

class PopupController {
  private loginView: HTMLElement;
  private mainView: HTMLElement;

  constructor() {
    this.loginView = document.getElementById('login-view')!;
    this.mainView = document.getElementById('main-view')!;
    
    this.init();
  }

  private async init() {
    // Check authentication status
    const isAuthenticated = await api.verifySession();
    
    if (isAuthenticated) {
      await this.showMainView();
      // Attach main view listeners after showing the view
      setTimeout(() => {
        this.attachMainViewListeners();
      }, 100);
    } else {
      this.showLoginView();
      this.attachLoginListeners();
    }
  }

  private showLoginView() {
    this.loginView.style.display = 'block';
    this.mainView.style.display = 'none';
  }

  private async showMainView() {
    this.loginView.style.display = 'none';
    this.mainView.style.display = 'block';

    // Load user data
    const storage = await api.getStorageData();
    if (storage.user) {
      document.getElementById('user-email')!.textContent = storage.user.email;
    }

    // Load teams
    if (storage.teams) {
      this.loadTeams(storage.teams, storage.selectedTeamId);
    }

    // Load stats
    await this.loadStats();
    
    // Attach main view listeners after showing the view
    this.attachMainViewListeners();
  }

  private attachLoginListeners() {
    console.log('Attaching login listeners');
    
    // Google OAuth login
    const googleBtn = document.getElementById('google-login');
    if (googleBtn) {
      googleBtn.addEventListener('click', async () => {
        console.log('Google button clicked');
        await this.handleGoogleLogin();
      });
    }

    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      console.log('Login form found');
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Form submitted');
        await this.handleLogin();
      });
    }

    // Sign up link
    const signupLink = document.getElementById('signup-link');
    if (signupLink) {
      signupLink.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: 'https://flipflop.ai/signup' });
      });
    }
  }
  
  private attachMainViewListeners() {
    console.log('Attaching main view listeners');
    
    // Team selector
    const teamSelect = document.getElementById('team-select');
    if (teamSelect) {
      teamSelect.addEventListener('change', async (e) => {
        const teamId = (e.target as HTMLSelectElement).value;
        await chrome.storage.sync.set({ selectedTeamId: teamId });
      });
    }

    // Action buttons
    const captureBtn = document.getElementById('capture-btn');
    const meetBtn = document.getElementById('meet-btn');
    
    if (captureBtn) {
      console.log('Adding capture button listener');
      captureBtn.addEventListener('click', () => {
        console.log('Capture button clicked');
        this.handleCapture();
      });
    } else {
      console.error('Capture button not found!');
    }

    if (meetBtn) {
      console.log('Adding meet button listener');
      meetBtn.addEventListener('click', () => {
        console.log('Meet button clicked - opening Google Meet');
        chrome.tabs.create({ url: 'https://meet.google.com' });
      });
    } else {
      console.error('Meet button not found!');
    }

    // Settings and logout
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: 'https://flipflop.ai/settings' });
      });
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await this.handleLogout();
      });
    }
  }

  private async handleGoogleLogin() {
    try {
      // Show loading state
      const googleBtn = document.getElementById('google-login') as HTMLButtonElement;
      const originalText = googleBtn.innerHTML;
      googleBtn.innerHTML = 'Signing in...';
      googleBtn.disabled = true;

      await api.authenticateWithGoogle();
      
      // Notify background script
      await chrome.runtime.sendMessage({ type: 'AUTH_SUCCESS' });
      
      // Show main view
      await this.showMainView();
    } catch (error) {
      console.error('Google login failed:', error);
      alert('Google login failed. Please try again.');
      
      // Reset button
      const googleBtn = document.getElementById('google-login') as HTMLButtonElement;
      googleBtn.innerHTML = `<img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHZpZXdCb3g9IjAgMCAxOCAxOCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE2LjUxIDkuMTYzNjRIMTUuNzVWOS4wOTA5MUg5VjEwLjkwOTFIMTMuMzNDMTIuNzUgMTIuNzY4MiAxMS4wNyAxNC4xODE4IDkgMTQuMTgxOEM2LjM4IDE0LjE4MTggNC4xOCA2LjM4IDQuMTggOVM2LjM4IDMuODE4MTggOSAzLjgxODE4QzEwLjI1IDMuODE4MTggMTEuNCA0LjMgMTIuMjUgNS4wOUwxMy41NyAzLjc3QzEyLjM1IDIuNjMgMTAuNzUgMS45MDkwOSA9IDEuOTA5MDlDNS4xNiAxLjkwOTA5IDIuMDkgNC45OCAyLjA5IDkuMDA5MDlDMi4wOSAxMy4wMjkxIDUuMTYgMTYuMDkwOSA5IDE2LjA5MDlDMTIuODQgMTYuMDkwOSAxNS45MSAxMy4wMjkxIDE1LjkxIDkuMDA5MDlDMTUuOTEgOC43MyAxNS44NyA4LjQ2IDE1LjggOC4yVjguMThINS45MVY5LjE2MzY0SDE2LjUxWiIgZmlsbD0iIzQyODVGNCIvPgo8L3N2Zz4K" alt="Google" /> Continue with Google`;
      googleBtn.disabled = false;
    }
  }

  private async handleLogin() {
    const email = (document.getElementById('email') as HTMLInputElement).value;
    const password = (document.getElementById('password') as HTMLInputElement).value;

    try {
      console.log('Attempting login with:', email);
      await api.authenticate(email, password);
      
      // Notify background script
      await chrome.runtime.sendMessage({ type: 'AUTH_SUCCESS' });
      
      // Show main view
      await this.showMainView();
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed: ' + (error as any).message);
    }
  }

  private async handleLogout() {
    await api.logout();
    this.showLoginView();
    
    // Clear form
    (document.getElementById('email') as HTMLInputElement).value = '';
    (document.getElementById('password') as HTMLInputElement).value = '';
  }

  private loadTeams(teams: Team[], selectedTeamId?: string) {
    const select = document.getElementById('team-select') as HTMLSelectElement;
    select.innerHTML = '';

    teams.forEach(team => {
      const option = document.createElement('option');
      option.value = team.id;
      option.textContent = team.name;
      if (team.id === selectedTeamId) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  }

  private async handleCapture() {
    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.id) return;

    // Inject content script if needed
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content-universal.js']
      });

      // Send capture message
      chrome.tabs.sendMessage(tab.id, { type: 'SHOW_CAPTURE_MENU' });
      
      // Close popup
      window.close();
    } catch (error) {
      console.error('Failed to inject script:', error);
      alert('Cannot capture from this page');
    }
  }

  private async loadStats() {
    try {
      const statsContent = document.getElementById('stats-content')!;
      
      // Show static stats for now
      statsContent.innerHTML = `
        <div class="stat-item">
          <span class="stat-label">Memories Today:</span>
          <span class="stat-value">0</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Decisions Captured:</span>
          <span class="stat-value">0</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Active Team:</span>
          <span class="stat-value">Test Team</span>
        </div>
      `;
    } catch (error) {
      console.error('Failed to load stats:', error);
      const statsContent = document.getElementById('stats-content')!;
      statsContent.innerHTML = '<p>Failed to load stats</p>';
    }
  }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  console.log('Popup loaded');
  try {
    new PopupController();
  } catch (error) {
    console.error('Failed to initialize popup:', error);
    alert('Failed to initialize: ' + error);
  }
});