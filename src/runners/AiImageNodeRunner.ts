
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { NodeRunner, NodeDefinition, NodeRunnerContext, NodeExecutionResult } from '../types';
import { interpolate } from './utils';

export class AiImageNodeRunner implements NodeRunner {
  async run(node: NodeDefinition, context: NodeRunnerContext): Promise<Partial<NodeExecutionResult>> {
    const { log } = context;
    const params = interpolate(node.parameters, context);
    const prompt = params.prompt;
    
    // Validate and normalize aspectRatio
    const validRatios = ["1:1", "3:4", "4:3", "9:16", "16:9"];
    let aspectRatio = params.aspectRatio;
    if (!validRatios.includes(aspectRatio)) {
        aspectRatio = "1:1";
    }

    const outputFormat = params.outputFormat || 'data_uri';
    const shouldDownload = params.download === true;

    if (!prompt) {
        return { status: 'error', error: "Prompt is required", logs: ["Prompt parameter is missing"] };
    }

    if (!process.env.API_KEY) {
        return { status: 'error', error: "API Key missing", logs: ["Environment variable API_KEY is not set"] };
    }

    log(`[1/5] Prompt: "${prompt}" (Ratio: ${aspectRatio})`);

    // Initialize with environment API key as per instructions
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
        log(`[2/5] Sending request to model: gemini-2.5-flash-image...`);
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: [
                { 
                    parts: [{ text: prompt }] 
                }
            ],
            config: {
                imageConfig: {
                    aspectRatio: aspectRatio
                }
            }
        });

        log(`[3/5] Response received. Analyzing candidates...`);

        let base64Image = null;
        let mimeType = 'image/png'; // Default guess

        // Iterate through parts to find the image
        if (response.candidates && response.candidates.length > 0) {
             const content = response.candidates[0].content;
             if (content && content.parts) {
                 for (const part of content.parts) {
                     if (part.inlineData) {
                         base64Image = part.inlineData.data;
                         mimeType = part.inlineData.mimeType || 'image/png';
                         break; 
                     }
                 }
             }
        }

        if (!base64Image) {
            throw new Error("No image data found in the response. The model may have blocked the request or returned text only.");
        }

        log(`[4/5] Image decoded successfully. Size: ${Math.round(base64Image.length / 1024)}KB`);

        const dataUri = `data:${mimeType};base64,${base64Image}`;

        // Auto-download logic
        if (shouldDownload && typeof window !== 'undefined') {
            log("[5/5] Downloading image file...");
            const link = document.createElement('a');
            link.href = dataUri;
            link.download = `gemini_image_${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            log("[5/5] Processing complete.");
        }

        // Determine main output format based on selection
        const mainOutput = outputFormat === 'base64' ? base64Image : dataUri;

        return {
            status: 'success',
            inputs: params,
            output: {
                result: mainOutput, // The primary output based on format choice
                image: dataUri, // Always provide Data URI for UI preview compatibility
                rawBase64: base64Image, // Always provide raw base64 for advanced use
                mimeType: mimeType
            },
            logs: [`Generated image successfully. Size: ${Math.round(base64Image.length / 1024)}KB`]
        };

    } catch (e: any) {
        return {
            status: 'error',
            inputs: params,
            error: e.message,
            logs: [`Generation failed: ${e.message}`]
        };
    }
  }
}
