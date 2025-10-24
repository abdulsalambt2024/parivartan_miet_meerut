
import { GoogleGenAI, Modality } from "@google/genai";

// Assume process.env.API_KEY is configured in the environment
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("Gemini API key not found. AI features will be disabled.");
}

// FIX: Conditionally initialize GoogleGenAI to prevent a runtime crash if API_KEY is not set.
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

const checkAi = () => {
    if (!ai) {
        throw new Error("AI service is unavailable. Please configure the API key.");
    }
    return ai;
}

// --- Helper Functions ---
const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
}

export const dataUrlToGenerativePart = (dataUrl: string) => {
    const [mimeTypePart, base64Data] = dataUrl.split(';base64,');
    const mimeType = mimeTypePart.split(':')[1];
    return {
        inlineData: { data: base64Data, mimeType }
    };
}

// --- Text Generation ---
export const generatePostContent = async (prompt: string): Promise<string> => {
  const ai = checkAi();
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are a content writer for a college NGO that teaches underprivileged students. Write a social media post based on the following idea. Keep it positive, engaging, and under 100 words. Idea: "${prompt}"`,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating content with Gemini:", error);
    return "An error occurred while generating content. Please try again.";
  }
};

export const quickEdit = async (text: string, instruction: string): Promise<string> => {
    const ai = checkAi();
    const prompts = {
        hashtags: `Suggest 3-5 relevant and engaging hashtags for the following social media post:\n\n"${text}"`,
        grammar: `Check and correct the grammar and spelling of the following text:\n\n"${text}"`,
        engaging: `Rewrite the following text to make it more engaging and impactful for a social media audience:\n\n"${text}"`
    }
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-lite',
            contents: prompts[instruction] || text,
        });
        return response.text;
    } catch (error) {
        console.error("Error with quick edit:", error);
        return "An error occurred during quick edit.";
    }
}

// --- Image Understanding ---
export const analyzeImage = async (imageDataUrl: string, prompt: string): Promise<string> => {
    const ai = checkAi();
    try {
        const imagePart = dataUrlToGenerativePart(imageDataUrl);
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, { text: prompt }] },
        });
        return response.text;
    } catch (error) {
        console.error("Error analyzing image:", error);
        return "An error occurred while analyzing the image.";
    }
};

// --- Image Editing & Generation ---
export const editImage = async (imageDataUrl: string, prompt: string): Promise<string> => {
    const ai = checkAi();
    try {
        const imagePart = dataUrlToGenerativePart(imageDataUrl);
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [imagePart, { text: prompt }] },
            config: { responseModalities: [Modality.IMAGE] },
        });
        const editedImagePart = response.candidates[0].content.parts.find(part => part.inlineData);
        if (editedImagePart && editedImagePart.inlineData) {
            return `data:${editedImagePart.inlineData.mimeType};base64,${editedImagePart.inlineData.data}`;
        }
        throw new Error("No image was returned from the edit request.");
    } catch (error) {
        console.error("Error editing image:", error);
        throw new Error("Failed to edit the image.");
    }
};

export const generateImage = async (prompt: string, aspectRatio: string): Promise<string> => {
    const ai = checkAi();
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/png',
                aspectRatio: aspectRatio as any,
            },
        });
        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        return `data:image/png;base64,${base64ImageBytes}`;
    } catch (error) {
        console.error("Error generating image:", error);
        throw new Error("Failed to generate image.");
    }
};

// --- Search Grounding ---
export const groundedSearch = async (query: string) => {
    const ai = checkAi();
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: query,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        return {
            text: response.text,
            sources: groundingChunks.map(c => c.web).filter(Boolean),
        };
    } catch (error) {
        console.error("Error with grounded search:", error);
        throw new Error("Failed to perform grounded search.");
    }
};

// --- Audio Features ---
export const generateSpeech = async (text: string): Promise<string> => {
    const ai = checkAi();
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) throw new Error("No audio data returned.");
        return base64Audio;
    } catch (error) {
        console.error("Error generating speech:", error);
        throw new Error("Failed to generate speech.");
    }
};

export const transcribeAudio = (audioBlob: Blob): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    const ai = checkAi();
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBytes = new Uint8Array(arrayBuffer);

      // Simple base64 encode
      let binary = '';
      for (let i = 0; i < audioBytes.byteLength; i++) {
        binary += String.fromCharCode(audioBytes[i]);
      }
      const base64Audio = btoa(binary);

      let fullTranscription = '';

      const session = await ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            session.sendRealtimeInput({
              media: { data: base64Audio, mimeType: 'audio/webm' },
            });
            // Since we sent the whole blob, we can close the stream.
            // This is a simplified use of the Live API for one-shot transcription.
            setTimeout(() => session.close(), 1000);
          },
          onmessage: (message) => {
            if (message.serverContent?.inputTranscription) {
              fullTranscription += message.serverContent.inputTranscription.text;
            }
          },
          onerror: (e) => reject(new Error('Transcription service error.')),
          onclose: () => resolve(fullTranscription.trim()),
        },
      });
    } catch (error) {
      console.error("Error during transcription:", error);
      reject(new Error("Failed to transcribe audio."));
    }
  });
};