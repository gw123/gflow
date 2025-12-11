import { GoogleGenAI, Modality } from "@google/genai";
import { NodeRunner, NodeDefinition, NodeRunnerContext, NodeExecutionResult } from '../../types';
import { interpolate } from '../utils';

export class TtsNodeRunner implements NodeRunner {
  async run(node: NodeDefinition, context: NodeRunnerContext): Promise<Partial<NodeExecutionResult>> {
    const { log } = context;
    const params = interpolate(node.parameters, context, node);
    
    const text = params.text || params.prompt;
    const voiceName = params.voice || 'Puck'; // Puck, Charon, Kore, Fenrir, Zephyr

    if (!text) {
        return { status: 'error', error: "Text is required", logs: ["Missing 'text' parameter"] };
    }

    if (!process.env.API_KEY) {
        return { status: 'error', error: "API Key missing", logs: ["Environment variable API_KEY is not set"] };
    }

    log(`[TTS] Generating speech for: "${text.substring(0, 30)}..." (Voice: ${voiceName})`);

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voiceName },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (!base64Audio) {
            throw new Error("No audio data received from API");
        }

        log(`[TTS] Audio generated successfully (${Math.round(base64Audio.length / 1024)}KB).`);

        return {
            status: 'success',
            inputs: params,
            output: {
                audioData: [base64Audio], // Array format for PlayMedia compatibility
                data: base64Audio,       // Single string format for other uses
                voice: voiceName,
                text: text
            },
            logs: [`Generated speech successfully.`]
        };

    } catch (e: any) {
        return {
            status: 'error',
            inputs: params,
            error: e.message,
            logs: [`TTS Generation failed: ${e.message}`]
        };
    }
  }
}