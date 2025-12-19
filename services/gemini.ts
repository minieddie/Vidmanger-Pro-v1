
// Always use standard import from @google/genai as per guidelines
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Generates professional video metadata (description and tags) using the Gemini API.
 * Uses the recommended gemini-3-flash-preview model for text-based tasks.
 */
export const generateVideoMetadata = async (videoTitle: string) => {
  // Use the API key exclusively from process.env.API_KEY.
  // Initialization is done within the call context to ensure the freshest environment state.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

  const prompt = `
    I have a video file named "${videoTitle}". 
    Please generate a professional, concise description (max 2 sentences) for this video content, assuming standard context based on the title.
    Also, suggest 5 relevant tags for organizing this video.
  `;

  try {
    // Generate content using the recommended Gemini 3 Flash model
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: {
              type: Type.STRING,
              description: "A professional summary of the video content based on the title."
            },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "A list of 5 relevant tags."
            }
          },
          required: ["description", "tags"]
        }
      }
    });

    // Access the text output via the .text property (not a method)
    const text = response.text;
    if (!text) return { description: '', tags: [] };
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini API Error:", error);
    // Propagate the error to be handled gracefully by the UI component
    throw error;
  }
};
