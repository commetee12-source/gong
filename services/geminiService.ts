import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { UploadedFile } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";

export const generateReport = async (
  textInput: string,
  files: UploadedFile[],
  templateStructure: string,
  templateFile?: UploadedFile | null
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Determine model based on complexity. Using Pro for better reasoning on official documents.
  const modelName = 'gemini-3-pro-preview'; 

  // 1. Process Data Files (Analysis Targets)
  const dataFileParts = files.map(file => {
    const base64Data = file.data.includes('base64,') 
      ? file.data.split('base64,')[1] 
      : file.data;

    return {
      inlineData: {
        mimeType: file.type,
        data: base64Data
      }
    };
  });

  // 2. Process Template File (Formatting Target)
  let templateFilePart = null;
  let templateInstruction = "";

  if (templateFile) {
    const base64Data = templateFile.data.includes('base64,')
      ? templateFile.data.split('base64,')[1]
      : templateFile.data;
    
    templateFilePart = {
      inlineData: {
        mimeType: templateFile.type,
        data: base64Data
      }
    };
    templateInstruction = `\n[중요] 별첨된 서식 파일("${templateFile.name}")은 작성해야 할 문서의 '서식(Template)'입니다. 해당 파일의 목차 구성, 표 형식, 말투, 스타일을 완벽하게 모방하여 문서를 작성하십시오. 단, 서식 내의 언어가 영어인 경우에도, 최종 결과물은 반드시 '한글'로 변환하여 작성해야 합니다.`;
  }

  const prompt = `
[사용자 입력 데이터]
${textInput}

[작성 요청 서식]
${templateStructure}
${templateInstruction}

위 [사용자 입력 데이터]와 첨부된 파일들을 분석하여, [작성 요청 서식]에 맞춰 공문서를 작성해 주십시오. 

[필수 준수 사항]
1. 시스템 지시사항(페르소나, 문체, 형식)을 엄격히 따를 것.
2. **문서 양식 및 구조적 텍스트에 영어를 절대 사용하지 말 것.** (예: Date -> 일자, Subject -> 제목)
3. 모든 내용은 한국 행정 공공기관 표준 용어로 작성할 것.
4. 입력 데이터에 URL(링크)이 포함되어 있다면, 반드시 검색 도구를 통해 실제 내용을 확인하고 반영할 것. (링크 내용을 상상하여 작성 금지)
`;

  // Combine parts: Prompt -> Data Files -> Template File (if exists)
  const contentParts: any[] = [{ text: prompt }, ...dataFileParts];
  
  if (templateFilePart) {
    contentParts.push(templateFilePart);
  }

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelName,
      contents: {
        role: 'user',
        parts: contentParts
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.2, // Low temperature for factual, consistent output
        tools: [{ googleSearch: {} }] // Enable Google Search for grounding
      }
    });

    let generatedText = response.text || "문서를 생성할 수 없습니다. 다시 시도해 주세요.";

    // Extract and append Grounding Metadata (Sources)
    // @ts-ignore
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    if (groundingMetadata?.groundingChunks) {
      const chunks = groundingMetadata.groundingChunks;
      const sources = chunks
        // @ts-ignore
        .map((chunk: any) => chunk.web?.uri)
        .filter((uri: string) => uri);
      
      const uniqueSources = [...new Set(sources)];

      if (uniqueSources.length > 0) {
        generatedText += "\n\n---\n\n#### 🔗 참조 링크 (Reference Links)\n";
        uniqueSources.forEach((uri: unknown) => {
          generatedText += `- <${uri}>\n`;
        });
      }
    }

    return generatedText;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};