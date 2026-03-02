import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
});

export const moderateContent = async (text) => {
  const response = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 10,
    messages: [
      {
        role: "user",
        content: `Is this text free of hate speech, slurs, racism, homophobia, sexual content, and extreme toxicity? Reply with only "yes" or "no".
        
Text: "${text}"`,
      },
    ],
  });

  const result = response.content[0].text.trim().toLowerCase();
  return result === "yes";
};
