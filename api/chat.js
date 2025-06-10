import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "Chave da API OpenAI não configurada." });
  }

  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Mensagem é obrigatória." });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: message }],
    });

    const reply = completion.choices[0].message.content;
    return res.status(200).json({ reply });
  } catch (error) {
    console.error("Erro na chamada OpenAI:", error);

    // Erros da API da OpenAI (com estrutura conhecida)
    if (error?.code === "insufficient_quota") {
      return res.status(429).json({
        error: "Limite de uso da API da OpenAI excedido. Verifique sua conta ou plano.",
      });
    }

    if (error?.status === 429) {
      return res.status(429).json({
        error: "Você está enviando muitas requisições. Tente novamente em instantes.",
      });
    }

    return res.status(500).json({
      error: "Erro ao chamar a API da OpenAI.",
      details: error?.message || "Erro desconhecido.",
    });
  }
}
