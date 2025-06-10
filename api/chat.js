import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("A variável de ambiente OPENAI_API_KEY não está configurada.");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido. Use POST." });
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

    const reply = completion.choices[0]?.message?.content || "Sem resposta do modelo.";
    return res.status(200).json({ reply });

  } catch (error) {
    console.error("Erro na chamada OpenAI:", error);

    // Tratamento de erro por limite de cota
    if (error?.code === "insufficient_quota" || error?.status === 429) {
      return res.status(429).json({
        error: "Limite de uso da API da OpenAI excedido ou muitas requisições. Verifique sua conta ou tente mais tarde.",
      });
    }

    return res.status(500).json({
      error: "Erro ao chamar a API da OpenAI.",
      details: error?.message || "Erro desconhecido.",
    });
  }
}
