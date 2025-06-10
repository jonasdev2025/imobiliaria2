import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

// Função auxiliar para detectar e-mail
function pareceEmail(texto) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto);
}

// Consulta HubSpot por email
async function consultarLeadNoHubSpot(email) {
  const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
  const url = `https://api.hubapi.com/crm/v3/objects/contacts/search`;

  const body = {
    filterGroups: [{
      filters: [{
        propertyName: "email",
        operator: "EQ",
        value: email,
      }],
    }],
    properties: ["firstname", "lastname", "email", "hs_lead_status", "favoritos"], // ajuste os campos conforme seu HubSpot
    limit: 1,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${HUBSPOT_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) throw new Error("Erro ao consultar HubSpot");

  const data = await response.json();
  const lead = data.results?.[0];

  if (!lead) return null;

  const props = lead.properties;
  return {
    nome: `${props.firstname || ""} ${props.lastname || ""}`,
    email: props.email,
    status: props.hs_lead_status || "não informado",
    favoritos: props.favoritos || "", // ajuste se for campo personalizado
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Mensagem é obrigatória" });
  }

  try {
    // Se for um email, consultar no HubSpot
    if (pareceEmail(message)) {
      const lead = await consultarLeadNoHubSpot(message);
      if (lead) {
        const resposta = `Encontrei seu cadastro, ${lead.nome}. Status do lead: ${lead.status}. Favoritos: ${lead.favoritos || "nenhum"}.`;
        return res.status(200).json({ reply: resposta });
      } else {
        return res.status(200).json({ reply: "Não encontrei um cadastro com esse email no HubSpot." });
      }
    }

    // Caso comum, conversa com IA
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: message }],
    });

    const reply = completion.data.choices[0].message.content;
    res.status(200).json({ reply });
  } catch (error) {
    console.error("Erro:", error);
    res.status(500).json({ error: "Erro no servidor" });
  }
}
