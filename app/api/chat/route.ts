import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/index.mjs';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ERROR_MESSAGES = {
  MISSING_API_KEY: 'Missing OpenAI API key in server configuration.',
  INVALID_REQUEST: 'Invalid request format or empty message.',
  PROCESSING_ERROR: 'An error occurred while processing your request.',
  MEDIA_ERROR: 'Unable to process the uploaded media. Please try again.',
  NO_RESPONSE: 'Unable to generate a response. Please try again.',
  MODEL_ERROR: 'The language model is currently unavailable. Please try again later.',
  NETWORK_ERROR: 'Network connection error. Please check your connection and try again.',
  INVALID_RESPONSE: 'Received an invalid response from the model.',
  RATE_LIMIT: 'Rate limit exceeded. Please try again in a moment.',
  INVALID_API_KEY: 'Invalid API key. Please check your OpenAI API key configuration.',
  CONTENT_POLICY: 'Your request could not be processed due to content policy restrictions.',
  SAFETY_ERROR: 'The request was flagged by our safety system.',
  INVALID_HISTORY: 'Invalid conversation history format.'
} as const;

const RETRY_OPTIONS = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 5000
} as const;

async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  retryCount = 0
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retryCount >= RETRY_OPTIONS.maxRetries) {
      throw error;
    }

    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) throw new Error(ERROR_MESSAGES.INVALID_API_KEY);
      if (error.status === 429) throw new Error(ERROR_MESSAGES.RATE_LIMIT);
      if (error.code === 'content_policy_violation') {
        throw new Error(ERROR_MESSAGES.CONTENT_POLICY);
      }
    }

    const delay = Math.min(
      RETRY_OPTIONS.initialDelay * Math.pow(2, retryCount),
      RETRY_OPTIONS.maxDelay
    );

    await wait(delay);
    return retryWithBackoff(operation, retryCount + 1);
  }
}

function sanitizePrompt(prompt: string): string {
  return prompt
    .replace(/[^\w\s.,!?'-]/g, '')
    .trim();
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

async function generateText(messages: Message[]) {
  try {
    const conversationWithContext: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: 'You are a helpful assistant. Maintain context from the conversation history and provide relevant responses based on the entire discussion.'
      },
      ...messages
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: conversationWithContext,
      temperature: 0.7,
      max_tokens: 1000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error(ERROR_MESSAGES.NO_RESPONSE);
    return content;
  } catch (error) {
    console.error('Text generation error:', error);
    throw error;
  }
}

async function generateImage(prompt: string) {
  try {
    const safePrompt = `Create a safe, appropriate image of: ${sanitizePrompt(prompt)}`;
    
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: safePrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      response_format: "b64_json",
      style: "natural",
    });

    const base64Image = response.data[0]?.b64_json;
    if (!base64Image) throw new Error(ERROR_MESSAGES.NO_RESPONSE);
    
    return `data:image/png;base64,${base64Image}`;
  } catch (error) {
    console.error('Image generation error:', error);
    if (error instanceof OpenAI.APIError && error.code === 'content_policy_violation') {
      throw new Error(ERROR_MESSAGES.CONTENT_POLICY);
    }
    throw error;
  }
}

async function generateSpeech(messages: Message[]) {
  try {
    const conversationWithContext: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: 'Generate a natural, conversational response that maintains context from the entire conversation history. Keep it concise and engaging.'
      },
      ...messages
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: conversationWithContext,
      temperature: 0.7,
      max_tokens: 150,
    });

    const speechText = completion.choices[0]?.message?.content;
    if (!speechText) throw new Error(ERROR_MESSAGES.NO_RESPONSE);

    const cleanText = sanitizePrompt(speechText);

    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: cleanText,
      speed: 1.0,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    return {
      url: `data:audio/mp3;base64,${buffer.toString('base64')}`,
      text: cleanText
    };
  } catch (error) {
    console.error('Speech generation error:', error);
    throw error;
  }
}

function determineResponseType(prompt: string): 'image' | 'audio' | 'text' {
  const normalizedPrompt = prompt.toLowerCase();
  
  const imagePatterns = [
    /\b(draw|create|generate|make)\b.+\b(picture|image|photo|artwork|visual|drawing|illustration)\b/i,
    /\b(show|display|visualize)\b.+\b(as|in|with)\b.+\b(image|picture|photo|drawing)\b/i,
    /\b(picture|image|photo|drawing|artwork)\b.+\b(of|showing|depicting)\b/i
  ];

  const audioPatterns = [
    /\b(speak|say|pronounce|read|narrate)\b.+/i,
    /\b(convert|transform)\b.+\b(to|into)\b.+\b(speech|audio|voice)\b/i,
    /\b(generate|create|make)\b.+\b(audio|speech|voice|sound)\b/i,
    /how does.+sound\b/i,
    /\b(tell|read).+\b(me|us|out loud)\b/i
  ];

  for (const pattern of audioPatterns) {
    if (pattern.test(normalizedPrompt)) {
      return 'audio';
    }
  }

  for (const pattern of imagePatterns) {
    if (pattern.test(normalizedPrompt)) {
      return 'image';
    }
  }

  return 'text';
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.MISSING_API_KEY },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const message = formData.get('message');
    const historyJson = formData.get('history');
    
    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.INVALID_REQUEST },
        { status: 400 }
      );
    }

    let history: Message[] = [];
    if (historyJson && typeof historyJson === 'string') {
      try {
        const parsedHistory = JSON.parse(historyJson);
        if (Array.isArray(parsedHistory)) {
          history = parsedHistory
            .filter((msg: any) => msg && typeof msg === 'object')
            .map((msg: any) => ({
              role: msg.role === 'user' || msg.role === 'assistant' ? msg.role : 'user',
              content: String(msg.content || '')
            }));
        }
      } catch (error) {
        console.error('Error parsing history:', error);
      }
    }

    const messageText = message.trim();
    const responseType = determineResponseType(messageText);
    history.push({ role: 'user', content: messageText });

    try {
      let response;

      switch (responseType) {
        case 'image': {
          const imageUrl = await retryWithBackoff(() => generateImage(messageText));
          response = {
            type: 'image',
            content: 'Here\'s the image you requested:',
            url: imageUrl
          };
          break;
        }

        case 'audio': {
          const audioResult = await retryWithBackoff(() => generateSpeech(history));
          response = {
            type: 'audio',
            content: `Generated speech response:`,
            url: audioResult.url
          };
          break;
        }

        default: {
          const textResponse = await retryWithBackoff(() => generateText(history));
          response = {
            type: 'text',
            content: textResponse
          };
        }
      }

      if (!response?.content) {
        throw new Error(ERROR_MESSAGES.NO_RESPONSE);
      }

      return new NextResponse(JSON.stringify(response), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });

    } catch (error) {
      console.error('Generation error:', error);
      
      if (error instanceof OpenAI.APIError) {
        const status = error.status || 500;
        let errorMessage: string = ERROR_MESSAGES.MODEL_ERROR;

        if (error.status === 401) errorMessage = ERROR_MESSAGES.INVALID_API_KEY;
        if (error.status === 429) errorMessage = ERROR_MESSAGES.RATE_LIMIT;
        if (error.code === 'content_policy_violation') {
          errorMessage = ERROR_MESSAGES.CONTENT_POLICY;
          return NextResponse.json({ error: errorMessage }, { status: 400 });
        }

        return NextResponse.json({ error: errorMessage }, { status });
      }

      const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.PROCESSING_ERROR;
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Chat API Error:', error);
    const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.PROCESSING_ERROR;
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}