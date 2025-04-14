/**
 * Settings content for the side panel
 */

export function getSettingsContent(): string {
  return `
    <div class="panel-section">
      <div class="panel-section-title">API Settings</div>
      <div class="panel-section-content">
        <div class="form-group">
          <label class="form-label">ElevenLabs API Key</label>
          <input type="password" id="api-key-input" placeholder="Enter ElevenLabs API Key" class="form-control" />
          <button id="save-api-key" class="btn-primary">Save Key</button>
          <div class="api-key-status"></div>
        </div>
      </div>
    </div>
    
    <div class="panel-section">
      <div class="panel-section-title">UI Settings</div>
      <div class="panel-section-content">
        <div class="switch-container">
          <span class="switch-label">Show Top Player</span>
          <label class="switch">
            <input type="checkbox" id="top-player-toggle">
            <span class="slider"></span>
          </label>
        </div>
        <p class="small-text">The top player provides easy access to play the entire page.</p>
      </div>
    </div>
    
    <div class="panel-section">
      <div class="panel-section-title">Voice Options</div>
      <div class="panel-section-content">
        <div class="form-group">
          <label class="form-label">Text-to-Speech Model</label>
          <div class="custom-select">
            <select id="model-selector" class="form-control">
              <option value="eleven_turbo_v2">Turbo (Fast)</option>
              <option value="eleven_monolingual_v1">Standard</option>
              <option value="eleven_multilingual_v2">Multilingual</option>
            </select>
          </div>
        </div>
      </div>
    </div>
    
    <div class="panel-section">
      <div class="panel-section-title">Playback Settings</div>
      <div class="panel-section-content">
        <div class="form-group">
          <label class="form-label">Playback Speed: <span id="speed-value">1.0x</span></label>
          <input type="range" min="0.5" max="2" step="0.1" value="1" id="speed-slider" class="form-control" />
        </div>
      </div>
    </div>
  `;
}
