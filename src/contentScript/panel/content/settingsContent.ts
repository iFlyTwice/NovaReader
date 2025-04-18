/**
 * Settings content for the side panel
 */

import { TTS_PROVIDER } from '../../../config';

// Define the provider type for type safety
type Provider = 'elevenlabs' | 'speechify';
const provider = TTS_PROVIDER as Provider;

export function getSettingsContent(): string {
  return `
    <div class="panel-section">
      <div class="panel-section-title">TTS Provider</div>
      <div class="panel-section-content">
        <div class="form-group">
          <label class="form-label">Select TTS Provider</label>
          <div class="custom-select">
            <select id="provider-selector" class="form-control">
              <option value="elevenlabs" ${provider === 'elevenlabs' ? 'selected' : ''}>ElevenLabs</option>
              <option value="speechify" ${provider === 'speechify' ? 'selected' : ''}>Speechify</option>
            </select>
          </div>
        </div>
      </div>
    </div>
    
    <div class="panel-section">
      <div class="panel-section-title">API Settings</div>
      <div class="panel-section-content">
        <div class="form-group elevenlabs-settings" ${provider === 'speechify' ? 'style="display: none;"' : ''}>
          <label class="form-label">ElevenLabs API Key</label>
          <input type="password" id="elevenlabs-api-key-input" placeholder="Enter ElevenLabs API Key" class="form-control" />
          <button id="save-elevenlabs-api-key" class="btn-primary">Save Key</button>
          <div class="api-key-status"></div>
        </div>
        
        <div class="form-group speechify-settings" ${provider === 'elevenlabs' ? 'style="display: none;"' : ''}>
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
        <div class="form-group elevenlabs-settings" ${provider === 'speechify' ? 'style="display: none;"' : ''}>
          <label class="form-label">ElevenLabs Model</label>
          <div class="custom-select">
            <select id="elevenlabs-model-selector" class="form-control">
              <option value="eleven_turbo_v2">Turbo (Fast)</option>
              <option value="eleven_monolingual_v1">Standard</option>
              <option value="eleven_multilingual_v2">Multilingual</option>
            </select>
          </div>
        </div>
        
        <div class="form-group speechify-settings" ${provider === 'elevenlabs' ? 'style="display: none;"' : ''}>
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
    
    <script>
      // Show/hide provider-specific settings based on selected provider
      document.getElementById('provider-selector')?.addEventListener('change', function() {
        const provider = this.value;
        const elevenLabsSettings = document.querySelectorAll('.elevenlabs-settings');
        const speechifySettings = document.querySelectorAll('.speechify-settings');
        
        if (provider === 'elevenlabs') {
          elevenLabsSettings.forEach(el => el.style.display = 'block');
          speechifySettings.forEach(el => el.style.display = 'none');
        } else {
          elevenLabsSettings.forEach(el => el.style.display = 'none');
          speechifySettings.forEach(el => el.style.display = 'block');
        }
      });
    </script>
  `;
}
