// Debug version to find Google Meet caption elements
console.log('[FlipFlop Debug] Starting caption element detection...');

let debugInterval: number;
let isDebugging = false;

// Inject debug UI
function injectDebugUI() {
  const ui = document.createElement('div');
  ui.innerHTML = `
    <div id="flipflop-debug" style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: black;
      color: white;
      padding: 20px;
      border-radius: 8px;
      z-index: 999999;
      max-width: 400px;
      max-height: 500px;
      overflow-y: auto;
      font-family: monospace;
      font-size: 12px;
    ">
      <h3 style="margin-top: 0;">FlipFlop Caption Debug</h3>
      <button id="debug-start" style="
        background: #4CAF50;
        color: white;
        border: none;
        padding: 8px 16px;
        cursor: pointer;
        margin-bottom: 10px;
      ">Start Debug</button>
      <div id="debug-output"></div>
    </div>
  `;
  document.body.appendChild(ui);

  document.getElementById('debug-start')?.addEventListener('click', toggleDebug);
}

function toggleDebug() {
  const btn = document.getElementById('debug-start') as HTMLButtonElement;
  const output = document.getElementById('debug-output')!;
  
  if (isDebugging) {
    isDebugging = false;
    btn.textContent = 'Start Debug';
    clearInterval(debugInterval);
    output.innerHTML += '<div style="color: #ff5252;">Debug stopped</div>';
  } else {
    isDebugging = true;
    btn.textContent = 'Stop Debug';
    output.innerHTML = '<div style="color: #4CAF50;">Debug started - Enable CC and speak!</div>';
    
    debugInterval = window.setInterval(findCaptionElements, 1000);
  }
}

function findCaptionElements() {
  const output = document.getElementById('debug-output')!;
  output.innerHTML = '<div style="color: #4CAF50;">Scanning for captions...</div>';
  
  // Look for elements in the bottom 50% of screen with text
  const allElements = document.querySelectorAll('div, span');
  const potentialCaptions: any[] = [];
  
  for (let i = 0; i < allElements.length; i++) {
    const el = allElements[i] as HTMLElement;
    const text = el.innerText?.trim();
    
    if (!text || text.length < 2) continue;
    
    const rect = el.getBoundingClientRect();
    
    // Must be visible
    if (rect.width === 0 || rect.height === 0) continue;
    
    // Must be in bottom half of screen
    if (rect.top < window.innerHeight * 0.5) continue;
    
    // Must not be a known UI element
    if (text.includes('Turn on captions') || 
        text.includes('settings') || 
        text.includes('More options') ||
        text.includes('Present now')) continue;
    
    // Looks like it could be a caption
    if (text.length > 2 && text.length < 300) {
      const styles = window.getComputedStyle(el);
      
      potentialCaptions.push({
        text: text.substring(0, 100),
        tag: el.tagName,
        class: el.className || 'none',
        jsname: el.getAttribute('jsname') || 'none',
        fontSize: styles.fontSize,
        color: styles.color,
        position: `${Math.round(rect.top)}, ${Math.round(rect.left)}`,
        parent: el.parentElement?.tagName + '.' + (el.parentElement?.className || 'none')
      });
    }
  }
  
  // Display findings
  output.innerHTML = `
    <div style="color: #2196F3;">Found ${potentialCaptions.length} potential caption elements:</div>
    <div style="max-height: 400px; overflow-y: auto;">
  `;
  
  potentialCaptions.forEach((item, idx) => {
    output.innerHTML += `
      <div style="
        margin: 10px 0;
        padding: 10px;
        background: rgba(255,255,255,0.1);
        border-radius: 4px;
      ">
        <div style="color: #FFC107;">#${idx + 1}</div>
        <div><b>Text:</b> ${item.text}</div>
        <div><b>Tag:</b> ${item.tag}</div>
        <div><b>Class:</b> ${item.class}</div>
        <div><b>JSName:</b> ${item.jsname}</div>
        <div><b>Font:</b> ${item.fontSize}</div>
        <div><b>Color:</b> ${item.color}</div>
        <div><b>Pos:</b> ${item.position}</div>
        <div><b>Parent:</b> ${item.parent}</div>
      </div>
    `;
  });
  
  output.innerHTML += '</div>';
}

// Initialize after page loads
setTimeout(() => {
  injectDebugUI();
  console.log('[FlipFlop Debug] Debug UI injected - Click "Start Debug" to find caption elements');
}, 2000);