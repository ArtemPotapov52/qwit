// Отправка push через Expo Push API (бесплатно, без настройки серверов)
export interface PushMessage {
  to: string;        // ExponentPushToken[...]
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function sendPushNotifications(messages: PushMessage[]): Promise<void> {
  if (!messages.length) return;
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(messages),
    });
  } catch {
    // Не мешаем основному флоу если уведомление не ушло
  }
}
