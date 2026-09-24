import fs from 'node:fs';
import path from 'node:path';
import { GoogleGenAI, Type } from '@google/genai';

/**
 * VibeFeed AI - Instagram Post Curator Engine (JavaScript / Node.js)
 * 
 * Este módulo processa fotos e intenções de post do Instagram,
 * utilizando o modelo Gemini para gerar legendas, interpretações,
 * receitas de filtros e sugestões musicais.
 */

const vibeFeedSchema = {
  type: Type.OBJECT,
  properties: {
    overallAura: {
      type: Type.STRING,
      description: "Nome poético e marcante da aura visual da imagem (ex: Soft Sun-kissed Glow)"
    },
    musicVibe: {
      type: Type.STRING,
      description: "Estilo de música ou áudio em alta ideal para Reels/Stories"
    },
    interpretations: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "3 a 4 percepções e sentimentos que a foto transmite aos seguidores"
    },
    captions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          style: { type: Type.STRING, description: "Estilo da legenda: Aesthetic, Boss Babe, Poética, Descontraída, etc." },
          text: { type: Type.STRING, description: "Texto envolvente da legenda com emojis de bom gosto" },
          hashtags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "5 a 8 hashtags estratégicas" }
        },
        required: ["style", "text", "hashtags"]
      }
    },
    filterSuggestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Nome do filtro ou receita de edição" },
          type: { type: Type.STRING, description: "Instagram ou Lightroom" },
          settings: { type: Type.STRING, description: "Valores numéricos de ajuste (ex: Brilho +10, Contraste -15)" },
          whyItWorks: { type: Type.STRING, description: "Explicação técnica e estética do filtro" }
        },
        required: ["name", "type", "settings", "whyItWorks"]
      }
    }
  },
  required: ["overallAura", "musicVibe", "interpretations", "captions", "filterSuggestions"]
};

/**
 * Analisa uma imagem do Instagram e gera conteúdo curado.
 * 
 * @param {Object} options
 * @param {string} options.imagePath - Caminho para o arquivo de imagem no disco.
 * @param {string} [options.userContext] - Descrição opcional da intenção/sensação desejada.
 * @param {Array<string>} [options.vibes] - Lista de tags de vibe selecionadas (ex: ['✨ Aesthetic', '👑 Boss Babe']).
 * @param {string} [options.apiKey] - Chave da API do Gemini (ou via variável de ambiente GEMINI_API_KEY).
 * @returns {Promise<Object>} Dados curados em formato JSON.
 */
export async function analyzeInstagramPhoto({ imagePath, userContext = '', vibes = [], apiKey }) {
  const geminiApiKey = apiKey || process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    throw new Error('Chave de API do Gemini não informada. Configure a variável GEMINI_API_KEY ou passe apiKey no objeto de opções.');
  }

  // Inicializa o cliente oficial da SDK
  const ai = new GoogleGenAI({ apiKey: geminiApiKey });

  // Valida e lê a imagem
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Arquivo de imagem não encontrado no caminho: ${imagePath}`);
  }

  const fileBuffer = fs.readFileSync(imagePath);
  const base64Data = fileBuffer.toString('base64');
  
  // Determina o tipo MIME
  const ext = path.extname(imagePath).toLowerCase();
  let mimeType = 'image/jpeg';
  if (ext === '.png') mimeType = 'image/png';
  else if (ext === '.webp') mimeType = 'image/webp';
  else if (ext === '.heic') mimeType = 'image/heic';

  const systemInstruction = `Você é um curador de conteúdo do Instagram de nível mundial, especialista em psicologia visual, estética de feed e engajamento em redes sociais.
Análise a imagem fornecida e os desejos da usuária. Responda ESTRITAMENTE em Português do Brasil no formato JSON especificado.

Diretrizes de Qualidade:
- Crie legendas autênticas, femininas, elegantes e sem clichês artificiais.
- As interpretações devem explicar o impacto psicológico e social da foto no público.
- Sugira ajustes práticos de filtros (Instagram e Lightroom).
- Sugira o estilo de trilha sonora perfeita.`;

  const promptText = `
Vibes Selecionadas: ${vibes.length > 0 ? vibes.join(', ') : 'Nenhuma vibe específica selecionada'}
Contexto/Descrição da Usuária: ${userContext || 'Sem contexto adicional fornecido.'}

Por favor, analise o conteúdo visual da imagem fornecida em anexo e retorne a curadoria completa.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          role: 'user',
          parts: [
            { text: promptText },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data
              }
            }
          ]
        }
      ],
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: vibeFeedSchema,
        temperature: 0.7
      }
    });

    const resultText = response.text;
    return JSON.parse(resultText);
  } catch (error) {
    console.error('Erro durante a chamada da API Gemini:', error);
    throw error;
  }
}

// Exemplo de execução via linha de comando (Node.js)
if (process.argv[1] && process.argv[1].endsWith('vibeFeedAI.js')) {
  async function runDemo() {
    const sampleImagePath = process.argv[2];

    if (!sampleImagePath) {
      console.log('\n📌 Uso via linha de comando:');
      console.log('   node vibeFeedAI.js <caminho-da-foto.jpg> ["vibe1, vibe2"] ["descrição"]');
      console.log('   Exemplo: node vibeFeedAI.js ./minha_foto.jpg "✨ Aesthetic, 👑 Boss Babe" "Café da tarde em Paris"\n');
      return;
    }

    const vibesArg = process.argv[3] ? process.argv[3].split(',').map(s => s.trim()) : ['✨ Aesthetic & Clean'];
    const contextArg = process.argv[4] || 'Foto espontânea do dia';

    console.log('🔮 VibeFeed AI Engine iniciando...');
    console.log(`🖼️  Imagem: ${sampleImagePath}`);
    console.log(`✨ Vibes: ${vibesArg.join(', ')}`);
    console.log(`📝 Contexto: "${contextArg}"\n`);

    try {
      const result = await analyzeInstagramPhoto({
        imagePath: sampleImagePath,
        userContext: contextArg,
        vibes: vibesArg
      });

      console.log('================ RESULTS ================');
      console.log(`🌟 Aura Identificada: ${result.overallAura}`);
      console.log(`🎵 Áudio Sugerido:    ${result.musicVibe}\n`);

      console.log('👀 O Que as Pessoas Vão Interpretar:');
      result.interpretations.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item}`);
      });

      console.log('\n✍️ Legendas Geradas:');
      result.captions.forEach((cap, i) => {
        console.log(`\n--- [Option ${i + 1}: ${cap.style}] ---`);
        console.log(cap.text);
        console.log(`Hashtags: ${cap.hashtags.join(' ')}`);
      });

      console.log('\n🎛️  Sugestões de Filtros & Ajustes:');
      result.filterSuggestions.forEach(filter => {
        console.log(`\n• ${filter.name} (${filter.type})`);
        console.log(`  Ajustes: ${filter.settings}`);
        console.log(`  Por quê:  ${filter.whyItWorks}`);
      });
      console.log('\n=========================================');

    } catch (err) {
      console.error('❌ Erro na execução:', err.message);
    }
  }

  runDemo();
}