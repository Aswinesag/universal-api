const OpenAI = require('openai');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf-8');
const match = envContent.match(/^GROQ_API_KEY=["']?([^"'\r\n]+)["']?/m);
const apiKey = match[1].trim();

const groq = new OpenAI({
  apiKey,
  baseURL: 'https://api.groq.com/openai/v1',
});

async function run() {
  try {
    const res = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [
        {
          role: 'system',
          content: 'You are an extraction assistant. You must respond in valid JSON format. Provide a JSON object adhering to this schema: {"name": "string", "company": "string", "designation": "string", "phone": "string", "email": "string", "website": "string"}'
        },
        {
          role: 'user',
          content: 'Process this input and return JSON: John Doe, Principal Architect at Acme Corp. Email: john@acme.com, Phone: +1 415 555 2671, Website: acme.com'
        }
      ],
      response_format: { type: 'json_object' }
    });
    console.log('SUCCESS Result:\n', res.choices[0].message.content);
  } catch (e) {
    console.error('Error status:', e.status, 'error:', e.error || e.message);
  }
}
run();
