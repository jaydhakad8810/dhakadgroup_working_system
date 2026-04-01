const webpush = require('web-push');

webpush.setVapidDetails(
  'mailto:dgsystem8810@gmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

async function sendPush(subscription, title, body, url) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify({ title, body, url: url || '/' }));
  } catch (e) {
    // Subscription expired or invalid — caller should handle cleanup
    if (e.statusCode === 410 || e.statusCode === 404) throw e;
  }
}

module.exports = { sendPush };
