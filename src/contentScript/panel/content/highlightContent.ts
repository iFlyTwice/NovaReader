/**
 * Highlight to Listen content for the side panel
 */

export function getHighlightToListenContent(): string {
  // First render without the checked attribute - we'll set it properly when storage loads
  return `
    <div class="panel-section">
      <div class="panel-section-title">Highlight to Listen</div>
      <div class="panel-section-content">
        <div class="switch-container">
          <span class="switch-label">Enable highlighting feature</span>
          <label class="switch">
            <input type="checkbox" id="highlight-toggle">
            <span class="slider"></span>
          </label>
        </div>
        <p>Select any text on the page to hear it read aloud.</p>
        <p>Use the player controls to adjust volume and playback speed.</p>
      </div>
    </div>
    
    <div class="panel-section">
      <div class="panel-section-title">Selection Button Style</div>
      <div class="panel-section-content">
        <div class="form-group">
          <label class="form-label">Selection Button Color</label>
          <div class="color-picker-container">
            <input type="color" id="selection-button-color" value="#27272a" class="form-control">
            <div class="color-preview" id="color-preview" style="background-color: #27272a;"></div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="panel-section">
      <div class="panel-section-title">Voice Selection</div>
      <div class="panel-section-content">
        <p>Click the voice icon in the player to choose from different voice options.</p>
      </div>
    </div>
    
    <div class="panel-section">
      <div class="panel-section-title">Reset Settings</div>
      <div class="panel-section-content">
        <button id="reset-highlight-settings" class="btn-secondary">Reset Highlighting Settings</button>
        <p class="small-text">This will reset all highlighting settings for this tab.</p>
      </div>
    </div>
    
    <div class="panel-section">
      <div class="panel-section-title">Keyboard Shortcuts</div>
      <div class="panel-section-content">
        <p>Alt+P: Toggle player</p>
        <p>Alt+R: Toggle panel</p>
      </div>
    </div>
  `;
}
