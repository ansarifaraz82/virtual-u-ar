/**
 * @jest-environment jsdom
 */

import { describe, it, expect } from '@jest/globals';

// Define the structure of a PWA manifest for type safety
interface WebAppManifest {
  display?: 'fullscreen' | 'standalone' | 'minimal-ui' | 'browser';
  display_override?: ('fullscreen' | 'standalone' | 'minimal-ui' | 'browser' | 'window-controls-overlay')[];
  [key: string]: any;
}

/**
 * Simulates a browser's logic for determining the display mode of a PWA.
 * It prioritizes 'display_override' values, falling back to 'display',
 * and finally to a default of 'browser'.
 *
 * @param manifest The PWA manifest object.
 * @param supportedModes A list of display modes the simulated browser supports.
 * @returns The chosen display mode as a string.
 */
const getDisplayMode = (manifest: WebAppManifest, supportedModes: string[]): string => {
  // 1. Check the display_override property first
  if (manifest.display_override && manifest.display_override.length > 0) {
    for (const mode of manifest.display_override) {
      if (supportedModes.includes(mode)) {
        return mode; // Use the first supported mode
      }
    }
  }

  // 2. If no supported mode is found in display_override, fall back to the display property
  if (manifest.display && supportedModes.includes(manifest.display)) {
    return manifest.display;
  }

  // 3. If all else fails, default to 'browser'
  return 'browser';
};

describe('PWA Manifest Display Mode Logic', () => {

  it('should choose "window-controls-overlay" when it is supported and first in display_override', () => {
    const manifest: WebAppManifest = {
      display: 'standalone',
      display_override: ['window-controls-overlay', 'minimal-ui'],
    };
    const supportedModes = ['window-controls-overlay', 'minimal-ui', 'standalone', 'browser'];
    
    const result = getDisplayMode(manifest, supportedModes);
    expect(result).toBe('window-controls-overlay');
  });

  it('should fall back to "minimal-ui" when "window-controls-overlay" is not supported', () => {
    const manifest: WebAppManifest = {
      display: 'standalone',
      display_override: ['window-controls-overlay', 'minimal-ui'],
    };
    // This browser does not support 'window-controls-overlay'
    const supportedModes = ['minimal-ui', 'standalone', 'browser'];
    
    const result = getDisplayMode(manifest, supportedModes);
    expect(result).toBe('minimal-ui');
  });

  it('should fall back to the main "display" property when no display_override values are supported', () => {
    const manifest: WebAppManifest = {
      display: 'standalone',
      display_override: ['window-controls-overlay', 'fullscreen'],
    };
    // This browser only supports basic display modes
    const supportedModes = ['standalone', 'browser'];
    
    const result = getDisplayMode(manifest, supportedModes);
    expect(result).toBe('standalone');
  });

  it('should use the main "display" property if display_override is empty or missing', () => {
    const manifest: WebAppManifest = {
      display: 'standalone',
    };
    const supportedModes = ['standalone', 'browser'];
    
    const result = getDisplayMode(manifest, supportedModes);
    expect(result).toBe('standalone');
  });

  it('should default to "browser" if no specified modes are supported', () => {
    const manifest: WebAppManifest = {
      display: 'standalone',
      display_override: ['window-controls-overlay', 'fullscreen'],
    };
    // A very old browser
    const supportedModes = ['browser'];
    
    const result = getDisplayMode(manifest, supportedModes);
    expect(result).toBe('browser');
  });

});
