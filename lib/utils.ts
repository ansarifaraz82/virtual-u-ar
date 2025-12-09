/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper to convert image URL to a File object using a canvas to bypass potential CORS issues.
export const urlToFile = (url: string, filename: string): Promise<File> => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.setAttribute('crossOrigin', 'anonymous');

        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context.'));
            }
            ctx.drawImage(image, 0, 0);

            canvas.toBlob((blob) => {
                if (!blob) {
                    return reject(new Error('Canvas toBlob failed.'));
                }
                const mimeType = blob.type || 'image/png';
                const file = new File([blob], filename, { type: mimeType });
                resolve(file);
            }, 'image/png');
        };

        image.onerror = (error) => {
            reject(new Error(`Could not load image from URL for canvas conversion. Error: ${error}`));
        };

        image.src = url;
    });
};

export function getFriendlyErrorMessage(error: unknown, context: string): string {
    let rawMessage = 'An unknown error occurred.';
    if (error instanceof Error) {
        rawMessage = error.message;
    } else if (typeof error === 'string') {
        rawMessage = error;
    } else if (error) {
        rawMessage = String(error);
    }

    // Check for specific unsupported MIME type error from Gemini API
    if (rawMessage.includes("Unsupported MIME type")) {
        try {
            // It might be a JSON string like '{"error":{"message":"..."}}'
            const errorJson = JSON.parse(rawMessage);
            const nestedMessage = errorJson?.error?.message;
            if (typeof nestedMessage === 'string' && nestedMessage.includes("Unsupported MIME type")) {
                const mimeType = nestedMessage.split(': ')[1] || 'unsupported';
                return `File type '${mimeType}' is not supported. Please use a format like PNG, JPEG, or WEBP.`;
            }
        } catch (e) {
            // Not a JSON string, but contains the text. Fallthrough to generic message.
        }
        // Generic fallback for any "Unsupported MIME type" error
        return `Unsupported file format. Please upload an image format like PNG, JPEG, or WEBP.`;
    }
    
    return `${context}. ${rawMessage}`;
}

/**
 * Adds a "Virtual U AR" watermark to the bottom right of an image.
 * @param imageUrl The data URL of the image to watermark.
 * @returns A promise that resolves with the data URL of the watermarked image.
 */
export const addWatermark = (imageUrl: string): Promise<string> => {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        // Return original image if canvas context is not available
        console.error('Could not get canvas context for watermarking.');
        return resolve(imageUrl);
      }

      // Draw the original image
      ctx.drawImage(image, 0, 0);

      // --- Watermark styling ---
      const watermarkText = "Virtual U AR";
      // Make font size responsive to image width, with min/max caps
      const baseFontSize = Math.max(18, Math.min(60, canvas.width / 40));
      ctx.font = `600 ${baseFontSize}px Inter, sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)'; // White with some transparency
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      
      // Add a subtle shadow for better readability on any background
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 2;

      // Position at bottom right with some padding
      const padding = baseFontSize * 0.8;
      ctx.fillText(watermarkText, canvas.width - padding, canvas.height - padding);

      // Resolve with the new data URL
      resolve(canvas.toDataURL('image/png'));
    };

    image.onerror = () => {
      // Return original image if it fails to load
      console.error('Could not load image for watermarking.');
      resolve(imageUrl);
    };

    image.src = imageUrl;
  });
};

/**
 * Robustly downloads media from a URL (Data URL or Remote URL).
 * Converts Data URLs to Blobs to avoid size limits and browser issues.
 */
export const downloadMedia = async (url: string, filename: string) => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
    } catch (error) {
        console.error("Download failed using fetch/blob technique, falling back to direct link:", error);
        // Fallback for simple data URLs if fetch fails (e.g. strict CSP or cross-origin)
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
