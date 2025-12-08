// queue/rabbit.js
const amqp = require("amqplib");

let channel;

// Connect once and reuse
async function connectQueue() {
  if (channel) return channel;

  const connection = await amqp.connect("amqp://localhost");
  channel = await connection.createChannel();
  await channel.assertQueue("celery");
  return channel;
}

// Send task to celery
async function sendToCelery(taskName, payload) {
  const ch = await connectQueue();

  const message = {
    task: taskName,
    id: Date.now().toString(),
    args: [payload],
    kwargs: {},
  };

  ch.sendToQueue("celery", Buffer.from(JSON.stringify(message)));
}

module.exports = { sendToCelery };
