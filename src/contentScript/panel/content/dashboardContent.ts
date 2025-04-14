/**
 * Dashboard content for the side panel
 */

export function getDashboardContent(): string {
  return `
    <div class="panel-section">
      <div class="panel-section-title">Quick Stats</div>
      <div class="panel-section-content">
        Welcome to NovaReader! Select text on any webpage and use our tools to enhance your reading experience.
      </div>
    </div>
    
    <div class="panel-section">
      <div class="panel-section-title">Recent Activity</div>
      <div class="panel-section-content">
        Your reading activity will appear here.
      </div>
    </div>
    
    <div class="panel-section">
      <div class="panel-section-title">Favorites</div>
      <div class="panel-section-content">
        Your favorite passages will appear here.
      </div>
    </div>
    
    <div class="panel-section">
      <div class="panel-section-title">Tips</div>
      <div class="panel-section-content">
        Try highlighting any text on the page and click the play button that appears to have it read aloud.
      </div>
    </div>
  `;
}
