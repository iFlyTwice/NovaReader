/**
 * Text highlighting Paint Worklet for NovaReader
 * Uses CSS Painting API (Houdini) to create customizable text highlighting effects
 */

// Register our paint worklet with the name "textHighlight"
registerPaint('textHighlight', class {
  // Define the properties we want to access from CSS
  static get inputProperties() {
    return [
      '--highlight-color',       // Base color for the highlight
      '--highlight-opacity',     // Opacity level
      '--highlight-style',       // Style type: 'solid', 'underline', 'glow', etc.
      '--highlight-active',      // If this is an active (currently spoken) word
      '--highlight-border-radius', // Rounded corners
    ];
  }
  
  // Allow transparency
  static get contextOptions() {
    return { alpha: true };
  }
  
  /**
   * Paint function that draws the highlight
   * @param {PaintRenderingContext2D} ctx - 2D drawing context
   * @param {PaintSize} size - The size of the element being painted
   * @param {StylePropertyMapReadOnly} props - CSS properties for this element
   */
  paint(ctx, size, props) {
    // Get CSS properties with defaults
    const color = props.get('--highlight-color').toString() || '#7d8aef';
    const opacity = parseFloat(props.get('--highlight-opacity').toString() || '0.3');
    const style = props.get('--highlight-style').toString() || 'solid';
    const isActive = props.get('--highlight-active').toString() === 'true';
    const borderRadius = parseFloat(props.get('--highlight-border-radius').toString() || '3');
    
    // Set up the context
    ctx.globalAlpha = isActive ? opacity * 1.5 : opacity;
    
    // Apply different styles based on the highlight-style property
    switch (style) {
      case 'solid':
        this.drawSolidHighlight(ctx, size, color, borderRadius);
        break;
        
      case 'underline':
        this.drawUnderlineHighlight(ctx, size, color);
        break;
        
      case 'glow':
        this.drawGlowHighlight(ctx, size, color);
        break;
        
      default:
        this.drawSolidHighlight(ctx, size, color, borderRadius);
    }
    
    // Add subtle inset shadow for active highlighting
    if (isActive) {
      this.addInsetShadow(ctx, size, color, borderRadius);
    }
  }
  
  /**
   * Draw a solid background highlight
   */
  drawSolidHighlight(ctx, size, color, borderRadius) {
    // Create rounded rectangle for the background
    if (borderRadius > 0) {
      // Top-left corner
      ctx.beginPath();
      ctx.moveTo(0 + borderRadius, 0);
      // Top-right corner
      ctx.lineTo(size.width - borderRadius, 0);
      ctx.quadraticCurveTo(size.width, 0, size.width, 0 + borderRadius);
      // Bottom-right corner
      ctx.lineTo(size.width, size.height - borderRadius);
      ctx.quadraticCurveTo(size.width, size.height, size.width - borderRadius, size.height);
      // Bottom-left corner
      ctx.lineTo(0 + borderRadius, size.height);
      ctx.quadraticCurveTo(0, size.height, 0, size.height - borderRadius);
      // Back to top-left
      ctx.lineTo(0, 0 + borderRadius);
      ctx.quadraticCurveTo(0, 0, 0 + borderRadius, 0);
      ctx.closePath();
      
      ctx.fillStyle = color;
      ctx.fill();
    } else {
      // Simple rectangle if no border radius
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, size.width, size.height);
    }
  }
  
  /**
   * Draw an underline-style highlight
   */
  drawUnderlineHighlight(ctx, size, color) {
    // Draw a thicker line at the bottom of the text
    const lineHeight = Math.max(2, size.height * 0.1);
    const yPosition = size.height - lineHeight;
    
    ctx.fillStyle = color;
    ctx.fillRect(0, yPosition, size.width, lineHeight);
    
    // Add a subtle background tint
    ctx.globalAlpha = 0.15;
    ctx.fillRect(0, 0, size.width, size.height);
  }
  
  /**
   * Draw a glowing highlight effect
   */
  drawGlowHighlight(ctx, size, color) {
    // Create a radial gradient for the glow effect
    const gradient = ctx.createRadialGradient(
      size.width / 2, size.height / 2, 0,
      size.width / 2, size.height / 2, size.width / 2
    );
    
    // Parse the color to get RGB components
    let r, g, b;
    const hexMatch = color.match(/#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
    if (hexMatch) {
      r = parseInt(hexMatch[1], 16);
      g = parseInt(hexMatch[2], 16);
      b = parseInt(hexMatch[3], 16);
    } else {
      // Default if color parsing fails
      r = 90; g = 104; b = 227; // Darker blue color for better visibility
    }
    
    // Create a more vibrant glow with smoother gradients
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.8)`);
    gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, 0.6)`);
    gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, 0.3)`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size.width, size.height);
    
    // Add a more solid center with slightly rounded corners
    const padding = size.height * 0.1;
    const centerWidth = size.width - (padding * 2);
    const centerHeight = size.height - (padding * 2);
    
    // Create rounded rectangle for the center
    const cornerRadius = Math.min(4, centerHeight / 4);
    
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = color;
    
    // Draw rounded rectangle
    ctx.beginPath();
    ctx.moveTo(padding + cornerRadius, padding);
    ctx.lineTo(padding + centerWidth - cornerRadius, padding);
    ctx.quadraticCurveTo(padding + centerWidth, padding, padding + centerWidth, padding + cornerRadius);
    ctx.lineTo(padding + centerWidth, padding + centerHeight - cornerRadius);
    ctx.quadraticCurveTo(padding + centerWidth, padding + centerHeight, padding + centerWidth - cornerRadius, padding + centerHeight);
    ctx.lineTo(padding + cornerRadius, padding + centerHeight);
    ctx.quadraticCurveTo(padding, padding + centerHeight, padding, padding + centerHeight - cornerRadius);
    ctx.lineTo(padding, padding + cornerRadius);
    ctx.quadraticCurveTo(padding, padding, padding + cornerRadius, padding);
    ctx.closePath();
    
    ctx.fill();
    
    // Add subtle inner glow
    ctx.globalAlpha = 0.2;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.7)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fill();
  }
  
  /**
   * Add an inset shadow effect for active words
   */
  addInsetShadow(ctx, size, color, borderRadius) {
    // Save the current drawing state
    ctx.save();
    
    // Create clipping path for the shadow (same as the highlight shape)
    if (borderRadius > 0) {
      ctx.beginPath();
      ctx.moveTo(0 + borderRadius, 0);
      ctx.lineTo(size.width - borderRadius, 0);
      ctx.quadraticCurveTo(size.width, 0, size.width, 0 + borderRadius);
      ctx.lineTo(size.width, size.height - borderRadius);
      ctx.quadraticCurveTo(size.width, size.height, size.width - borderRadius, size.height);
      ctx.lineTo(0 + borderRadius, size.height);
      ctx.quadraticCurveTo(0, size.height, 0, size.height - borderRadius);
      ctx.lineTo(0, 0 + borderRadius);
      ctx.quadraticCurveTo(0, 0, 0 + borderRadius, 0);
      ctx.closePath();
      ctx.clip();
    }
    
    // Draw subtle shadow inside the shape
    ctx.globalAlpha = 0.2;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 1;
    
    // Draw a rectangle slightly inside the shape
    const padding = 2;
    ctx.fillStyle = 'transparent';
    ctx.fillRect(padding, padding, 
                 size.width - (padding * 2), 
                 size.height - (padding * 2));
    
    // Restore the original drawing state
    ctx.restore();
  }
});
