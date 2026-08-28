export class Bot {
  constructor(options = {}) {
    this.token = typeof options === 'string' ? options : options.token;
    this.baseUrl = options.baseUrl || 'https://chat.markanm.com/api/bot/v1';
    this.commands = new Map();
  }

  command(name, handler) {
    this.commands.set(name.replace(/^\//, ''), handler);
  }

  async sendMessage(roomId, text) {
    const res = await fetch(`${this.baseUrl}/rooms/${roomId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    });
    return await res.json();
  }
}
