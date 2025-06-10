// Importe o cliente Gemini em vez do OpenAI
import { GoogleGenerativeAI } from "@google/generative-ai";

// A chave da API do Gemini será process.env.GOOGLE_GEMINI_API_KEY
// É uma boa prática lançar um erro logo no início se a chave não estiver presente
if (!process.env.GOOGLE_GEMINI_API_KEY) {
  throw new Error("A variável de ambiente GOOGLE_GEMINI_API_KEY não está configurada.");
}

// Inicialize o cliente Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);

// Defina o modelo Gemini a ser usado. "gemini-pro" é um bom ponto de partida.
// Para uso gratuito e menos latência, "gemini-1.5-flash" pode ser uma opção.
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido. Use POST." });
  }

  // Desestruture a mensagem e o histórico da conversa
  // O histórico é crucial para manter o contexto do chatbot
  const { message, history = [] } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Mensagem é obrigatória." });
  }

  try {
    // Inicia um chat com o histórico fornecido
    const chat = model.startChat({
      history: history, // Passe o array de histórico para o Gemini
      generationConfig: {
        maxOutputTokens: 200, // Ajuste conforme a necessidade de respostas mais longas
      },
    });

    // Envie a nova mensagem para o chat
    const result = await chat.sendMessage(message);
    const reply = result.response.text();

    // Retorne a resposta do Gemini
    return res.status(200).json({ reply });

  } catch (error) {
    console.error("Erro na chamada Gemini:", error);

    // Tratamento de erro específico para a API Gemini (ajuste conforme a documentação
    // do Gemini se encontrar códigos de erro mais específicos para limites)
    // Geralmente, erros de cota excedida ou muitas requisições terão status 429.
    if (error?.response?.status === 429 || error?.code === 429) { // Adicionado 'error.code' como fallback
      return res.status(429).json({
        error: "Limite de uso da API do Gemini excedido ou muitas requisições. Verifique sua conta ou tente mais tarde.",
      });
    }

    // Tratamento de erro geral
    return res.status(500).json({
      error: "Erro ao chamar a API do Gemini.",
      details: error?.message || "Erro desconhecido.",
    });
  }
}
