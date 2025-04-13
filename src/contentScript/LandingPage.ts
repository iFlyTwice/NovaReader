// Import styles
import '../../css/landingPage.css';
import '../../css/fonts.css';

/**
 * LandingPage Class
 * Creates and manages the landing page for NovaReader
 */
export class LandingPage {
  private container: HTMLDivElement | null = null;
  
  /**
   * Creates the landing page
   */
  public create(): void {
    // Check if landing page already exists
    if (document.getElementById('nova-reader-landing-page')) {
      console.warn('Landing page already exists');
      return;
    }
    
    // Create container
    this.container = document.createElement('div');
    this.container.id = 'nova-reader-landing-page';
    this.container.className = 'landing-page';
    
    // Build the page content
    this.container.innerHTML = this.buildPageContent();
    
    // Append to body
    document.body.appendChild(this.container);
    
    // Setup event listeners
    this.setupEventListeners();
    
    console.log('Landing page created');
  }
  
  /**
   * Removes the landing page
   */
  public remove(): void {
    if (this.container && document.body.contains(this.container)) {
      document.body.removeChild(this.container);
      this.container = null;
      console.log('Landing page removed');
    }
  }
  
  /**
   * Setup event listeners for the landing page
   */
  private setupEventListeners(): void {
    // FAQ toggle
    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(question => {
      question.addEventListener('click', (e) => {
        const answer = (e.currentTarget as HTMLElement).nextElementSibling as HTMLElement;
        
        if (answer.style.display === 'none' || answer.style.display === '') {
          answer.style.display = 'block';
          (e.currentTarget as HTMLElement).querySelector('.toggle-icon')!.innerHTML = '−';
        } else {
          answer.style.display = 'none';
          (e.currentTarget as HTMLElement).querySelector('.toggle-icon')!.innerHTML = '+';
        }
      });
    });
    
    // CTA buttons
    const ctaButtons = document.querySelectorAll('.cta-buttons .btn');
    ctaButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const target = (e.currentTarget as HTMLElement).getAttribute('data-target');
        
        if (target === 'download') {
          window.open('https://chrome.google.com/webstore/detail/your-extension-id', '_blank');
        } else if (target === 'learn-more') {
          document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
    
    // Navigation
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = (e.currentTarget as HTMLElement).getAttribute('href')?.substring(1);
        
        if (target) {
          document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }
  
  /**
   * Builds the HTML content for the landing page
   */
  private buildPageContent(): string {
    return `
      <!-- Header with Navigation -->
      <header class="landing-header">
        <div class="nav-container">
          <div class="logo-container">
            <div class="logo-icon">
              <img src="./assets/icon-128.png" alt="NovaReader" class="logo-img" />
            </div>
            <h1 class="brand-name">NovaReader</h1>
          </div>
          <nav class="nav-links">
            <a href="#features" class="nav-link">Features</a>
            <a href="#how-it-works" class="nav-link">How It Works</a>
            <a href="#pricing" class="nav-link">Pricing</a>
            <a href="#faq" class="nav-link">FAQ</a>
          </nav>
        </div>
      </header>

      <!-- Hero Section -->
      <section class="hero">
        <div class="hero-content">
          <h2 class="hero-title">Transform Text into Natural Speech</h2>
          <p class="hero-subtitle">
            NovaReader uses state-of-the-art AI voice technology to convert any website text into natural-sounding speech. 
            Read articles, documents, and more with our intuitive browser extension.
          </p>
          <div class="cta-buttons">
            <a href="#" class="btn btn-primary" data-target="download">Get Extension</a>
            <a href="#" class="btn btn-secondary" data-target="learn-more">Learn More</a>
          </div>
        </div>
        <div class="hero-image">
          <img src="./assets/hero-image.png" alt="NovaReader Extension Demo" class="hero-img" />
        </div>
      </section>

      <!-- Features Section -->
      <section class="features" id="features">
        <h2 class="section-title">Powerful Features</h2>
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h3 class="feature-title">Natural AI Voices</h3>
            <p class="feature-description">
              Choose from a variety of high-quality AI voices that sound natural and expressive. Customize pitch, speed, and more.
            </p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </div>
            <h3 class="feature-title">Text Selection</h3>
            <p class="feature-description">
              Simply select any text on a webpage and let NovaReader start speaking. No more copying and pasting into separate tools.
            </p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <h3 class="feature-title">Customizable Settings</h3>
            <p class="feature-description">
              Adjust playback speed, volume, and voice characteristics to your preferences. Save your settings for future use.
            </p>
          </div>
        </div>
      </section>

      <!-- How It Works Section -->
      <section class="how-it-works" id="how-it-works">
        <h2 class="section-title">How It Works</h2>
        <div class="steps">
          <div class="step">
            <div class="step-number">1</div>
            <div class="step-content">
              <h3 class="step-title">Install the Extension</h3>
              <p class="step-description">
                Add NovaReader to your browser with a single click from the Chrome Web Store or Firefox Add-ons.
              </p>
            </div>
          </div>
          <div class="step">
            <div class="step-number">2</div>
            <div class="step-content">
              <h3 class="step-title">Select Text</h3>
              <p class="step-description">
                Highlight any text on a webpage that you want to listen to. A small button will appear.
              </p>
            </div>
          </div>
          <div class="step">
            <div class="step-number">3</div>
            <div class="step-content">
              <h3 class="step-title">Listen & Enjoy</h3>
              <p class="step-description">
                Click the button and NovaReader will immediately start converting the text to speech. 
                Control playback with the intuitive player interface.
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- Testimonials Section -->
      <section class="testimonials">
        <h2 class="section-title">What Our Users Say</h2>
        <div class="testimonials-grid">
          <div class="testimonial-card">
            <p class="testimonial-content">
              "NovaReader has completely changed how I consume content online. The voices sound incredibly natural, 
              and I love being able to listen to articles while doing other tasks."
            </p>
            <div class="testimonial-author">
              <div class="author-avatar">
                <img src="./assets/testimonial1.jpg" alt="Sarah L." />
              </div>
              <div class="author-info">
                <div class="author-name">Sarah L.</div>
                <div class="author-title">Marketing Professional</div>
              </div>
            </div>
          </div>
          <div class="testimonial-card">
            <p class="testimonial-content">
              "As someone with dyslexia, this tool has been a game-changer. I can now easily listen to 
              any online content without struggling to read long articles."
            </p>
            <div class="testimonial-author">
              <div class="author-avatar">
                <img src="./assets/testimonial2.jpg" alt="Michael T." />
              </div>
              <div class="author-info">
                <div class="author-name">Michael T.</div>
                <div class="author-title">Software Engineer</div>
              </div>
            </div>
          </div>
          <div class="testimonial-card">
            <p class="testimonial-content">
              "The voice quality is stunning! I've tried many TTS solutions, but NovaReader stands out 
              with its natural-sounding speech and easy-to-use interface."
            </p>
            <div class="testimonial-author">
              <div class="author-avatar">
                <img src="./assets/testimonial3.jpg" alt="Priya K." />
              </div>
              <div class="author-info">
                <div class="author-name">Priya K.</div>
                <div class="author-title">Content Creator</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Pricing Section -->
      <section class="pricing" id="pricing">
        <h2 class="section-title">Simple Pricing</h2>
        <div class="pricing-grid">
          <div class="pricing-card">
            <h3 class="pricing-title">Basic</h3>
            <div class="pricing-price">Free</div>
            <ul class="pricing-features">
              <li class="pricing-feature">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                10,000 characters per month
              </li>
              <li class="pricing-feature">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                Standard voices
              </li>
              <li class="pricing-feature">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                Basic playback controls
              </li>
            </ul>
            <a href="#" class="btn btn-primary">Get Started</a>
          </div>
          <div class="pricing-card">
            <div class="popular-badge">Popular</div>
            <h3 class="pricing-title">Premium</h3>
            <div class="pricing-price">$4.99<span class="pricing-period">/month</span></div>
            <ul class="pricing-features">
              <li class="pricing-feature">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                100,000 characters per month
              </li>
              <li class="pricing-feature">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                Premium voices
              </li>
              <li class="pricing-feature">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                Advanced playback controls
              </li>
              <li class="pricing-feature">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                Voice customization
              </li>
            </ul>
            <a href="#" class="btn btn-primary">Subscribe Now</a>
          </div>
          <div class="pricing-card">
            <h3 class="pricing-title">Enterprise</h3>
            <div class="pricing-price">$12.99<span class="pricing-period">/month</span></div>
            <ul class="pricing-features">
              <li class="pricing-feature">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                Unlimited characters
              </li>
              <li class="pricing-feature">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                All voices + priority access to new voices
              </li>
              <li class="pricing-feature">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                Full customization options
              </li>
              <li class="pricing-feature">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                Priority support
              </li>
              <li class="pricing-feature">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                API access
              </li>
            </ul>
            <a href="#" class="btn btn-primary">Contact Sales</a>
          </div>
        </div>
      </section>

      <!-- FAQ Section -->
      <section class="faq" id="faq">
        <h2 class="section-title">Frequently Asked Questions</h2>
        <div class="faq-container">
          <div class="faq-item">
            <div class="faq-question">
              <span>How does NovaReader work?</span>
              <span class="toggle-icon">+</span>
            </div>
            <div class="faq-answer" style="display: none;">
              NovaReader uses advanced AI text-to-speech technology to convert written text into natural-sounding speech. 
              When you select text on a webpage, our extension processes it through AI voice models to generate high-quality audio.
            </div>
          </div>
          <div class="faq-item">
            <div class="faq-question">
              <span>Is my data secure?</span>
              <span class="toggle-icon">+</span>
            </div>
            <div class="faq-answer" style="display: none;">
              Yes, your privacy is our priority. The text you select is processed securely and is not stored permanently. 
              We don't track your browsing history or collect personal information beyond what's necessary for the service to function.
            </div>
          </div>
          <div class="faq-item">
            <div class="faq-question">
              <span>Can I use NovaReader offline?</span>
              <span class="toggle-icon">+</span>
            </div>
            <div class="faq-answer" style="display: none;">
              Currently, NovaReader requires an internet connection to process text through our advanced AI voice models. 
              We're exploring options for limited offline functionality in future updates.
            </div>
          </div>
          <div class="faq-item">
            <div class="faq-question">
              <span>What browsers are supported?</span>
              <span class="toggle-icon">+</span>
            </div>
            <div class="faq-answer" style="display: none;">
              NovaReader is currently available for Google Chrome, Mozilla Firefox, and Microsoft Edge. 
              We're working on support for Safari and other browsers in the future.
            </div>
          </div>
          <div class="faq-item">
            <div class="faq-question">
              <span>Can I change voices or languages?</span>
              <span class="toggle-icon">+</span>
            </div>
            <div class="faq-answer" style="display: none;">
              Yes! NovaReader offers multiple voices and supports various languages. Premium subscribers get access 
              to more voice options and customization features.
            </div>
          </div>
        </div>
      </section>

      <!-- CTA Section -->
      <section class="cta-section">
        <h2 class="cta-title">Ready to Transform Your Reading Experience?</h2>
        <p class="cta-subtitle">Join thousands of users who've already discovered the power of NovaReader.</p>
        <a href="#" class="btn btn-primary" data-target="download">Get NovaReader Now</a>
      </section>

      <!-- Footer -->
      <footer class="footer">
        <div class="footer-container">
          <div class="footer-logo">
            <div class="footer-logo-container">
              <div class="logo-icon">
                <img src="./assets/icon-128.png" alt="NovaReader" class="logo-img" />
              </div>
              <h3 class="brand-name">NovaReader</h3>
            </div>
            <p class="footer-description">
              Transform any text into natural-sounding speech with our powerful browser extension.
            </p>
            <div class="social-links">
              <a href="#" class="social-link">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                </svg>
              </a>
              <a href="#" class="social-link">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
              <a href="#" class="social-link">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
                </svg>
              </a>
            </div>
          </div>
          <div class="footer-links-column">
            <h3 class="footer-heading">Product</h3>
            <ul class="footer-links">
              <li class="footer-link"><a href="#features">Features</a></li>
              <li class="footer-link"><a href="#pricing">Pricing</a></li>
              <li class="footer-link"><a href="#faq">FAQ</a></li>
              <li class="footer-link"><a href="#">Download</a></li>
            </ul>
          </div>
          <div class="footer-links-column">
            <h3 class="footer-heading">Company</h3>
            <ul class="footer-links">
              <li class="footer-link"><a href="#">About Us</a></li>
              <li class="footer-link"><a href="#">Careers</a></li>
              <li class="footer-link"><a href="#">Blog</a></li>
              <li class="footer-link"><a href="#">Contact</a></li>
            </ul>
          </div>
          <div class="footer-links-column">
            <h3 class="footer-heading">Legal</h3>
            <ul class="footer-links">
              <li class="footer-link"><a href="#">Terms of Service</a></li>
              <li class="footer-link"><a href="#">Privacy Policy</a></li>
              <li class="footer-link"><a href="#">Cookies</a></li>
              <li class="footer-link"><a href="#">Licenses</a></li>
            </ul>
          </div>
        </div>
        <div class="copyright">
          <p>&copy; ${new Date().getFullYear()} NovaReader. All rights reserved.</p>
        </div>
      </footer>
    `;
  }
}

// Export the LandingPage class
export default LandingPage;
