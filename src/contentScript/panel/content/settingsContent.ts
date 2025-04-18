/**
 * Settings content for the side panel
 */

import { TTS_PROVIDER } from '../../../config';

// Define the provider type for type safety
type Provider = 'speechify';
const provider = TTS_PROVIDER as Provider;

export function getSettingsContent(): string {
  return `
    <div class="panel-section">
      <div class="panel-section-title">API Settings</div>
      <div class="panel-section-content">
        <div class="form-group speechify-settings">
          <label class="form-label">Speechify API Key</label>
          <input type="password" id="speechify-api-key-input" placeholder="Enter Speechify API Key" class="form-control" />
          <button id="save-speechify-api-key" class="btn-primary">Save Key</button>
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
        <div class="form-group speechify-settings">
          <label class="form-label">Speechify Model</label>
          <div class="custom-select">
            <select id="speechify-model-selector" class="form-control">
              <option value="simba-english">Simba English</option>
              <option value="simba-multilingual">Simba Multilingual</option>
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
    
    <div class="panel-section">
      <div class="panel-section-title">Highlight to Listen</div>
      <div class="panel-section-content">
        <div class="switch-container">
          <span class="switch-label">Enable Text Selection Button</span>
          <label class="switch">
            <input type="checkbox" id="highlight-toggle" checked>
            <span class="slider"></span>
          </label>
        </div>
        
        <div class="form-group">
          <label class="form-label">Button Color</label>
          <div class="color-picker-container">
            <input type="color" id="selection-button-color" value="#27272a" class="color-picker" />
            <div id="color-preview" class="color-preview" style="background-color: #27272a;"></div>
          </div>
        </div>
        
        <button id="reset-highlight-settings" class="btn-secondary">Reset to Defaults</button>
      </div>
    </div>
  `;
}
