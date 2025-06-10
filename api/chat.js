// api/chat.js
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { message, history } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Debugging: Log the incoming request body
  console.log('Requisição recebida:', req.body);

  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

  if (!apiKey) {
    console.error('Erro: GOOGLE_GEMINI_API_KEY não configurada nas variáveis de ambiente.');
    return res.status(500).json({ error: 'Erro de configuração do servidor: Chave da API do Gemini não encontrada.' });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  try {
    const chat = model.startChat({
      history: history, // Agora o frontend envia histórico vazio ou começando com 'user'
      generationConfig: {
        maxOutputTokens: 500, // Ajuste conforme necessário
      },
    });

    // Debugging: Log the history being sent to Gemini
    console.log('Histórico enviado ao Gemini:', history);
    console.log('Mensagem atual enviada ao Gemini:', message);

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    // Debugging: Log the successful response from Gemini
    console.log('Resposta do Gemini:', text);

    res.status(200).json({ reply: text });

  } catch (error) {
    console.error('Erro na chamada Gemini:', error); // Este log é CRUCIAL!
    // Aqui, o erro é capturado e enviado de volta ao frontend
    res.status(500).json({ error: `Erro ao chamar a API do Gemini. Detalhes: ${error.message || error}` });
  }
}
