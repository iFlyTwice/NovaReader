import { useState, useEffect } from 'react'
import './NewTab.css'

export const NewTab = () => {
  // Get the current time
  const getTime = () => {
    const date = new Date()
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    return `${hour}:${minute}`
  }

  // State for the current time
  const [time, setTime] = useState(getTime())

  // Update the time every second
  useEffect(() => {
    let intervalId = setInterval(() => {
      setTime(getTime())
    }, 1000)

    return () => {
      clearInterval(intervalId)
    }
  }, [])

  // Function to open the landing page
  const openLandingPage = () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL('welcome.html')
    });
  }

  // Function to start text selection
  const startSelection = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleSidePlayer' });
      }
    });
  }

  // Function to open settings
  const openSettings = () => {
    chrome.runtime.openOptionsPage();
  }

  return (
    <div className="newtab-container">
      <div className="logo-section">
        <div className="logo-icon">
          <img src="/img/logo-128.png" alt="NovaReader" className="logo-img" />
        </div>
        <h1 className="brand-name">NovaReader</h1>
      </div>
      
      <h2 className="time-display">{time}</h2>
      
      <p className="tagline">Transform any text into natural-sounding speech with AI technology</p>
      
      <div className="quick-actions">
        <button className="action-button" onClick={startSelection}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          Start Reading
        </button>
        <button className="action-button" onClick={openSettings}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Settings
        </button>
        <button className="action-button" onClick={openLandingPage}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          About
        </button>
      </div>
      
      <div className="footer">
        <span>© {new Date().getFullYear()} NovaReader</span>
      </div>
    </div>
  )
}

export default NewTab
