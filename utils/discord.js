const db = require('../config/database');

const WEBHOOK_RE = /^https:\/\/(discord|discordapp)\.com\/api\/webhooks\/\d+\/[\w-]+$/;

function isValidWebhookUrl(url) {
  return WEBHOOK_RE.test(String(url || ''));
}

/**
 * Send an embed to the configured Discord webhook. Fire-and-forget:
 * never throws, never blocks the caller on failure.
 *
 * @param {object} embed { title, description, color, url? }
 */
async function sendDiscordEmbed(embed) {
  try {
    const s = db.getCachedSettings('discord_webhook_url');
    const url = s.discord_webhook_url;
    if (!isValidWebhookUrl(url)) return false;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: String(embed.title || '').slice(0, 256),
          description: String(embed.description || '').slice(0, 2000),
          color: embed.color || 0x00e5ff,
          url: embed.url || undefined,
          timestamp: new Date().toISOString()
        }]
      }),
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) console.error('[discord] webhook responded', res.status);
    return res.ok;
  } catch (e) {
    console.error('[discord]', e.message);
    return false;
  }
}

/** Notify about a server going up/down (if enabled in settings). */
function notifyServerStatus(server, newStatus) {
  const s = db.getCachedSettings('discord_notify_status');
  if (String(s.discord_notify_status) !== '1') return;
  const up = newStatus === 'online';
  sendDiscordEmbed({
    title: up ? `🟢 ${server.name} is back online` : `🔴 ${server.name} went offline`,
    description: `\`${server.ip}:${server.port}\` · ${server.game}`,
    color: up ? 0x2be08a : 0xff5d6b
  });
}

/** Notify about a published news article (if enabled in settings). */
function notifyNews(title, shortText, url) {
  const s = db.getCachedSettings('discord_notify_news');
  if (String(s.discord_notify_news) !== '1') return;
  sendDiscordEmbed({
    title: `📰 ${title}`,
    description: shortText,
    url,
    color: 0x8f6fff
  });
}

module.exports = { isValidWebhookUrl, sendDiscordEmbed, notifyServerStatus, notifyNews };
