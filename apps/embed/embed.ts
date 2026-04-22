import { EMBED_CONFIG } from './config';
import { chatBubbleIcon, closeIcon, questionIcon, sparklesIcon } from './icons';

type WidgetPosition = 'bottom-right' | 'bottom-left';
type WidgetLauncherIcon = 'chat' | 'sparkles' | 'question';

type WidgetAppearancePayload = {
  launcherColor?: string;
  launcherLabel?: string;
  launcherIcon?: WidgetLauncherIcon;
  showPoweredBy?: boolean;
};

(function() {
  let iframe: HTMLIFrameElement | null = null;
  let container: HTMLDivElement | null = null;
  let button: HTMLButtonElement | null = null;
  let isOpen = false;

  const launcherAppearance: Required<Pick<WidgetAppearancePayload, 'launcherColor' | 'launcherLabel' | 'launcherIcon'>> = {
    launcherColor: '#3b82f6',
    launcherLabel: 'Chat with us',
    launcherIcon: 'chat',
  };
  
  // Get configuration from script tag
  let organizationId: string | null = null;
  let position: WidgetPosition = EMBED_CONFIG.DEFAULT_POSITION;

  const getLauncherIconMarkup = (icon: WidgetLauncherIcon): string => {
    switch (icon) {
      case 'sparkles':
        return sparklesIcon;
      case 'question':
        return questionIcon;
      default:
        return chatBubbleIcon;
    }
  };

  const parseLauncherIcon = (icon: unknown): WidgetLauncherIcon => {
    if (icon === 'sparkles' || icon === 'question' || icon === 'chat') {
      return icon;
    }

    return 'chat';
  };

  const normalizeHexColor = (value: string): string | null => {
    if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)) {
      return null;
    }

    if (value.length === 4) {
      const [hash, r, g, b] = value;
      return `${hash}${r}${r}${g}${g}${b}${b}`;
    }

    return value;
  };

  const getContrastingTextColor = (color: string): string => {
    const normalizedHex = normalizeHexColor(color);
    if (!normalizedHex) {
      return '#ffffff';
    }

    const red = parseInt(normalizedHex.slice(1, 3), 16);
    const green = parseInt(normalizedHex.slice(3, 5), 16);
    const blue = parseInt(normalizedHex.slice(5, 7), 16);
    const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

    return luminance > 0.6 ? '#111111' : '#ffffff';
  };

  const toShadowColor = (color: string): string => {
    const normalizedHex = normalizeHexColor(color);
    if (!normalizedHex) {
      return 'rgba(59, 130, 246, 0.35)';
    }

    const red = parseInt(normalizedHex.slice(1, 3), 16);
    const green = parseInt(normalizedHex.slice(3, 5), 16);
    const blue = parseInt(normalizedHex.slice(5, 7), 16);
    return `rgba(${red}, ${green}, ${blue}, 0.35)`;
  };

  const escapeHtml = (value: string): string => {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  };

  const applyLauncherAppearance = () => {
    if (!button) {
      return;
    }

    const cleanedLabel = launcherAppearance.launcherLabel.trim();
    const hasVisibleLabel = !isOpen && cleanedLabel.length > 0;
    const iconMarkup = isOpen
      ? closeIcon
      : getLauncherIconMarkup(launcherAppearance.launcherIcon);

    button.style.width = hasVisibleLabel ? 'auto' : '60px';
    button.style.padding = hasVisibleLabel ? '0 16px' : '0';
    button.style.borderRadius = hasVisibleLabel ? '9999px' : '50%';
    button.style.justifyContent = hasVisibleLabel ? 'flex-start' : 'center';
    button.style.background = launcherAppearance.launcherColor;
    button.style.color = getContrastingTextColor(launcherAppearance.launcherColor);
    button.style.boxShadow = `0 4px 24px ${toShadowColor(launcherAppearance.launcherColor)}`;
    button.setAttribute(
      'aria-label',
      isOpen ? 'Close chat widget' : hasVisibleLabel ? cleanedLabel : 'Open chat widget'
    );

    if (hasVisibleLabel) {
      button.innerHTML = `${iconMarkup}<span style="white-space: nowrap; line-height: 1;">${escapeHtml(cleanedLabel)}</span>`;
    } else {
      button.innerHTML = iconMarkup;
    }
  };

  const updateLauncherAppearance = (appearance: WidgetAppearancePayload) => {
    if (typeof appearance.launcherColor === 'string' && appearance.launcherColor.trim()) {
      launcherAppearance.launcherColor = appearance.launcherColor;
    }

    if (typeof appearance.launcherLabel === 'string') {
      launcherAppearance.launcherLabel = appearance.launcherLabel;
    }

    if (typeof appearance.launcherIcon === 'string') {
      launcherAppearance.launcherIcon = parseLauncherIcon(appearance.launcherIcon);
    }

    applyLauncherAppearance();
  };
  
  // Try to get the current script
  const currentScript = document.currentScript as HTMLScriptElement;
  if (currentScript) {
    organizationId = currentScript.getAttribute('data-organization-id');
    position = (currentScript.getAttribute('data-position') as WidgetPosition) || EMBED_CONFIG.DEFAULT_POSITION;
  } else {
    // Fallback: find script tag by src
    const scripts = document.querySelectorAll('script[src*="embed"]');
    const embedScript = Array.from(scripts).find(script => 
      script.hasAttribute('data-organization-id')
    ) as HTMLScriptElement;
    
    if (embedScript) {
      organizationId = embedScript.getAttribute('data-organization-id');
      position = (embedScript.getAttribute('data-position') as WidgetPosition) || EMBED_CONFIG.DEFAULT_POSITION;
    }
  }
  
  // Exit if no organization ID
  if (!organizationId) {
    console.error('Echo Widget: data-organization-id attribute is required');
    return;
  }
  
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', render);
    } else {
      render();
    }
  }
  
  function render() {
    // Create floating action button
    button = document.createElement('button');
    button.id = 'echo-widget-button';
    button.style.cssText = `
      position: fixed;
      ${position === 'bottom-right' ? 'right: 20px;' : 'left: 20px;'}
      bottom: 20px;
      width: auto;
      min-width: 60px;
      height: 60px;
      border-radius: 9999px;
      color: white;
      border: none;
      cursor: pointer;
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.2s ease;
    `;

    applyLauncherAppearance();
    
    button.addEventListener('click', toggleWidget);
    button.addEventListener('mouseenter', () => {
      if (button) button.style.transform = 'scale(1.05)';
    });
    button.addEventListener('mouseleave', () => {
      if (button) button.style.transform = 'scale(1)';
    });
    
    document.body.appendChild(button);
    
    // Create container (hidden by default)
    container = document.createElement('div');
    container.id = 'echo-widget-container';
    container.style.cssText = `
      position: fixed;
      ${position === 'bottom-right' ? 'right: 20px;' : 'left: 20px;'}
      bottom: 90px;
      width: 400px;
      height: 600px;
      max-width: calc(100vw - 40px);
      max-height: calc(100vh - 110px);
      z-index: 999998;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
      display: none;
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.3s ease;
    `;
    
    // Create iframe
    iframe = document.createElement('iframe');
    iframe.src = buildWidgetUrl();
    iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
    `;
    // Add permissions for microphone and clipboard
    iframe.allow = 'microphone; clipboard-read; clipboard-write';
    
    container.appendChild(iframe);
    document.body.appendChild(container);
    
    // Handle messages from widget
    window.addEventListener('message', handleMessage);
  }
  
  function buildWidgetUrl(): string {
    const params = new URLSearchParams();
    params.append('organizationId', organizationId!);
    return `${EMBED_CONFIG.WIDGET_URL}?${params.toString()}`;
  }
  
  function handleMessage(event: MessageEvent) {
    if (event.origin !== new URL(EMBED_CONFIG.WIDGET_URL).origin) return;
    
    const { type, payload } = event.data;
    
    switch (type) {
      case 'close':
        hide();
        break;
      case 'resize':
        if (payload.height && container) {
          container.style.height = `${payload.height}px`;
        }
        break;
      case 'widget-settings':
        if (payload?.appearance) {
          updateLauncherAppearance(payload.appearance as WidgetAppearancePayload);
        }
        break;
    }
  }
  
  function toggleWidget() {
    if (isOpen) {
      hide();
    } else {
      show();
    }
  }
  
  function show() {
    if (container && button) {
      isOpen = true;
      container.style.display = 'block';
      // Trigger animation
      setTimeout(() => {
        if (container) {
          container.style.opacity = '1';
          container.style.transform = 'translateY(0)';
        }
      }, 10);
      applyLauncherAppearance();
    }
  }
  
  function hide() {
    if (container && button) {
      isOpen = false;
      container.style.opacity = '0';
      container.style.transform = 'translateY(10px)';
      // Hide after animation
      setTimeout(() => {
        if (container) container.style.display = 'none';
      }, 300);
      applyLauncherAppearance();
    }
  }
  
  function destroy() {
    window.removeEventListener('message', handleMessage);
    if (container) {
      container.remove();
      container = null;
      iframe = null;
    }
    if (button) {
      button.remove();
      button = null;
    }
    isOpen = false;
  }
  
  // Function to reinitialize with new config
  function reinit(newConfig: { organizationId?: string; position?: WidgetPosition }) {
    // Destroy existing widget
    destroy();
    
    // Update config
    if (newConfig.organizationId) {
      organizationId = newConfig.organizationId;
    }
    if (newConfig.position) {
      position = newConfig.position;
    }
    
    // Reinitialize
    init();
  }
  
  // Expose API to global scope
  (window as any).EchoWidget = {
    init: reinit,
    show,
    hide,
    destroy,
    setAppearance: updateLauncherAppearance,
  };
  
  // Auto-initialize
  init();
})();