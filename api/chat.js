// api/chat.js
import { GoogleGenerativeAI } from "@google/generative-ai";

// Função para criar um contato no HubSpot
async function createHubSpotContact(email, firstname = '', phone = '', properties = {}) {
  const hubspotAccessToken = process.env.HUBSPOT_ACCESS_TOKEN;

  if (!hubspotAccessToken) {
    console.error('Erro: HUBSPOT_ACCESS_TOKEN não configurada.');
    return { success: false, message: 'Token de acesso do HubSpot não configurado.' };
  }

  const url = 'https://api.hubapi.com/crm/v3/objects/contacts';
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${hubspotAccessToken}`
  };

  // As propriedades padrão
  let contactProperties = {
    email: email,
    firstname: firstname,
    phone: phone
    // Você pode adicionar mais campos aqui, como 'what_they_are_looking_for' se criar um campo customizado no HubSpot
  };

  // Mesclar com propriedades adicionais (como a busca do usuário)
  // Certifique-se de que 'what_they_are_looking_for' seja um campo customizado existente no seu HubSpot
  // Se não existir, crie-o ou remova essa linha.
  if (properties.busca) {
    contactProperties.what_they_are_looking_for = properties.busca; // Exemplo de campo customizado
  }


  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ properties: contactProperties })
    });

    const data = await response.json();

    if (response.ok) {
      console.log('Contato HubSpot criado com sucesso:', data);
      return { success: true, contactId: data.id };
    } else {
      console.error('Erro ao criar contato no HubSpot:', data);
      if (data.category === 'CONFLICT' && data.message.includes('already exists')) {
        return { success: false, message: 'Este contato já existe no HubSpot.', isDuplicate: true };
      }
      return { success: false, message: data.message || 'Erro desconhecido ao criar contato no HubSpot.' };
    }
  } catch (error) {
    console.error('Erro na requisição para HubSpot:', error);
    return { success: false, message: `Erro de rede ao conectar com HubSpot: ${error.message}` };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { action, message, history, busca, nome, whatsapp } = req.body;

  // --- Lógica para Criar Lead no HubSpot ---
  if (action === 'create_lead') {
    if (!busca || !nome || !whatsapp) {
      return res.status(400).json({ success: false, message: 'Informações de lead incompletas. Busca, nome e WhatsApp são necessários.' });
    }

    // Simplificação: Usar o WhatsApp como email para o HubSpot se não houver um campo de email
    // OU, se você tiver um campo de email no frontend, colete-o também.
    // Para criar um contato no HubSpot, o 'email' é um campo obrigatório.
    // Vamos usar um email genérico se não tivermos um, ou solicitar um.
    // Melhor prática: Sempre pedir um email do usuário.
    // Por enquanto, vamos criar um email fake com o nome e o whatsapp, se não tiver email real.
    const leadEmail = `${nome.replace(/\s/g, '').toLowerCase()}${whatsapp}@chat.imobiliaria.com`;
    // Ou, se você realmente coletar o email, use ele aqui.

    // Chama a função para criar o contato no HubSpot
    const result = await createHubSpotContact(
        leadEmail, // Email é obrigatório para HubSpot
        nome,
        whatsapp,
        { busca: busca } // Passa a busca como propriedade adicional (se você tiver o campo customizado)
    );

    if (result.success) {
      return res.status(200).json({ success: true, message: 'Lead criado com sucesso no HubSpot!' });
    } else {
      return res.status(500).json({ success: false, message: result.message });
    }
  }

  // --- Lógica do Chatbot Gemini (se não for uma ação de criar lead) ---
  // Esta parte só será executada se 'action' não for 'create_lead'
  if (!message) {
    return res.status(400).json({ error: 'Message is required for general chat.' });
  }

  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

  if (!apiKey) {
    console.error('Erro: GOOGLE_GEMINI_API_KEY não configurada nas variáveis de ambiente.');
    return res.status(500).json({ error: 'Erro de configuração do servidor: Chave da API do Gemini não encontrada.' });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Usando o modelo FLASH

  try {
    // Para este fluxo, o Gemini só será usado para um chat "normal" depois que o lead for capturado
    // ou se você decidir ter um fluxo misto.
    // Por agora, o bot está focado na coleta. Se você quiser que o Gemini responda a perguntas
    // após a coleta do lead, você pode adicionar um prompt aqui.
    const chat = model.startChat({
      history: history, // Agora o histórico vem do frontend e começa com 'user'
      generationConfig: {
        maxOutputTokens: 500,
      },
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const aiText = response.text();

    res.status(200).json({ reply: aiText });

  } catch (error) {
    console.error('Erro na chamada Gemini ou na lógica:', error);
    res.status(500).json({ error: `Erro interno do servidor: ${error.message || error}` });
  }
}
