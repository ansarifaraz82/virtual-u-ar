
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import { addWatermark } from "../lib/utils";

const fileToPart = async (file: File) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    const { mimeType, data } = dataUrlToParts(dataUrl);
    return { inlineData: { mimeType, data } };
};

const dataUrlToParts = (dataUrl: string) => {
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    return { mimeType: mimeMatch[1], data: arr[1] };
}

const dataUrlToPart = (dataUrl: string) => {
    const { mimeType, data } = dataUrlToParts(dataUrl);
    return { inlineData: { mimeType, data } };
}

const handleApiResponse = async (response: GenerateContentResponse): Promise<string> => {
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        const errorMessage = `Request was blocked. Reason: ${blockReason}. ${blockReasonMessage || ''}`;
        throw new Error(errorMessage);
    }

    // Find the first image part in any candidate
    for (const candidate of response.candidates ?? []) {
        const imagePart = candidate.content?.parts?.find(part => part.inlineData);
        if (imagePart?.inlineData) {
            const { mimeType, data } = imagePart.inlineData;
            const originalImageUrl = `data:${mimeType};base64,${data}`;
            return await addWatermark(originalImageUrl);
        }
    }

    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
        const errorMessage = `Image generation stopped unexpectedly. Reason: ${finishReason}. This often relates to safety settings.`;
        throw new Error(errorMessage);
    }
    const textFeedback = response.text?.trim();
    const errorMessage = `The AI model did not return an image. ` + (textFeedback ? `The model responded with text: "${textFeedback}"` : "This can happen due to safety filters or if the request is too complex. Please try a different image.");
    throw new Error(errorMessage);
};

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY! });
// Using gemini-2.5-flash-image for general image generation and editing tasks
const model = 'gemini-2.5-flash-image';

export const generateModelImage = async (userImage: File): Promise<string> => {
    const userImagePart = await fileToPart(userImage);
    const prompt = "You are an expert fashion photographer AI. Transform the person in this image into a full-body fashion model photo suitable for an e-commerce website. The background must be an elegant, high-end studio setting featuring a white fluted column, soft sheer white fabric drapes, and a floral arrangement with white and peach flowers on a pedestal. The lighting should be soft, diffused, and flattering, creating a luxurious and airy atmosphere with a clean white floor. The person should have a neutral, professional model expression. Preserve the person's identity, unique features, and body type, but place them in a standard, relaxed standing model pose. The final image must be photorealistic and contain no text, logos, or watermarks. Return ONLY the final image.";
    const response = await ai.models.generateContent({
        model,
        contents: { parts: [userImagePart, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });
    return await handleApiResponse(response);
};

export const generateVirtualTryOnImage = async (modelImageUrl: string, garmentImage: File, backgroundDescription?: string): Promise<string> => {
    const modelImagePart = dataUrlToPart(modelImageUrl);
    const garmentImagePart = await fileToPart(garmentImage);
    
    const backgroundInstruction = backgroundDescription 
        ? `5. **Background Consistency:** The background MUST be: ${backgroundDescription}.` 
        : '5. **Background Consistency:** Keep the background consistent with the input image.';

    // Explicitly defining input roles and strict requirements to improve wardrobe accuracy
    const prompt = `You are an expert virtual try-on AI.
The FIRST image provided is the PERSON (Model).
The SECOND image provided is the GARMENT (Clothing).

TASK:
Replace the person's current outfit with the NEW GARMENT from the second image.

CRITICAL INSTRUCTIONS:
1. **FULL REPLACEMENT:** You must COMPLETELY remove and replace the person's existing clothing in the area where the new garment is worn. The old outfit must NOT be visible under, over, or blended with the new garment.
2. **Garment Fidelity:** The new garment on the model must look exactly like the reference garment in image 2 (same color, pattern, texture, shape, logos).
3. **Identity Preservation:** Keep the person's face, hair, body shape, and pose exactly as they are in image 1.
4. **Natural Fit:** The garment should drape realistically on the body, respecting the pose.
${backgroundInstruction}

Return ONLY the generated image.`;

    const response = await ai.models.generateContent({
        model,
        contents: { parts: [modelImagePart, garmentImagePart, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });
    return await handleApiResponse(response);
};

export const generatePoseVariation = async (tryOnImageUrl: string, poseInstruction: string, backgroundDescription?: string): Promise<string> => {
    const tryOnImagePart = dataUrlToPart(tryOnImageUrl);
    const backgroundInstruction = backgroundDescription 
        ? `The background MUST be: ${backgroundDescription}.` 
        : 'The background style must remain consistent with the input image.';

    const prompt = `You are an expert fashion photographer AI. 
    
INPUT: An image of a model wearing specific clothing.
TASK: Regenerate this image from a different perspective based on the instruction below.
INSTRUCTION: "${poseInstruction}"

REQUIREMENTS:
1. **Identity & Clothing Persistence:** The person and the CLOTHING they are wearing must remain IDENTICAL to the input image. Do not change the outfit.
2. **Background:** ${backgroundInstruction}
3. **Photorealism:** The output must be a high-quality, photorealistic image.

Return ONLY the final image.`;

    const response = await ai.models.generateContent({
        model,
        contents: { parts: [tryOnImagePart, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });
    return await handleApiResponse(response);
};

export const editImageWithPrompt = async (baseImageUrl: string, prompt: string): Promise<string> => {
    const baseImagePart = dataUrlToPart(baseImageUrl);
    const editPrompt = `You are an expert photo editing AI. 
    
INPUT: An image.
INSTRUCTION: "${prompt}"

TASK: Edit the image according to the instruction.
- Maintain photorealism.
- Preserve the model's identity and unaffected clothing details unless the prompt specifically asks to change them.
- Ensure the edit blends seamlessly.

Return ONLY the final, edited image.`;

    const response = await ai.models.generateContent({
        model,
        contents: { parts: [baseImagePart, { text: editPrompt }] },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });
    return await handleApiResponse(response);
};
