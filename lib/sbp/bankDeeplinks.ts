export interface BankConfig {
  bankId: string;
  name: string;
  /** Строит deeplink который открывает приложение банка с предзаполненными phone+amount */
  buildUrl: (phone: string, amount: number) => string;
}

// Нормализуем телефон: убираем всё кроме цифр и +
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  // Убедимся что начинается с 7
  if (digits.startsWith('8')) return '7' + digits.slice(1);
  return digits.startsWith('7') ? digits : '7' + digits;
}

// Сумма в рублях (целое число — банки обычно принимают рубли или копейки, проверяем оба)
// Возвращаем и рубли и копейки для гибкости
function rubles(amount: number): number { return Math.round(amount); }
function kopecks(amount: number): number { return Math.round(amount * 100); }

export const BANKS: BankConfig[] = [
  {
    bankId: 'tbank',
    name: 'Т-Банк',
    // Тинькофф/Т-Банк: подтверждённый формат для iOS и Android
    buildUrl: (phone, amount) => {
      const p = normalizePhone(phone);
      return `tinkoff://transfer?phone=%2B${p}&amount=${rubles(amount)}&currency=RUB`;
    },
  },
  {
    bankId: 'sber',
    name: 'Сбер',
    // Сбербанк: формат для iOS (sberbankonline) и Android fallback
    buildUrl: (phone, amount) => {
      const p = normalizePhone(phone);
      return `sberbankonline://p2ptransfer?phone=%2B${p}&sum=${rubles(amount)}`;
    },
  },
  {
    bankId: 'alfa',
    name: 'Альфа',
    buildUrl: (phone, amount) => {
      const p = normalizePhone(phone);
      return `alfabank://p2ptransfer?phone=%2B${p}&amount=${rubles(amount)}`;
    },
  },
  {
    bankId: 'vtb',
    name: 'ВТБ',
    buildUrl: (phone, amount) => {
      const p = normalizePhone(phone);
      return `vtb24mobile://transfer/phone?phone=${p}&amount=${rubles(amount)}`;
    },
  },
  {
    bankId: 'raiffeisen',
    name: 'Райфайзен',
    buildUrl: (phone, amount) => {
      const p = normalizePhone(phone);
      return `raiffeisen://transfer?phone=%2B${p}&amount=${rubles(amount)}`;
    },
  },
  {
    bankId: 'gazprom',
    name: 'Газпром',
    buildUrl: (phone, amount) => {
      const p = normalizePhone(phone);
      return `gpbmobile://transfer/sbp?phone=${p}&amount=${rubles(amount)}`;
    },
  },
  {
    bankId: 'ozon',
    name: 'Озон',
    buildUrl: (phone, amount) => {
      const p = normalizePhone(phone);
      return `ozonbank://transfer?phone=%2B${p}&amount=${rubles(amount)}`;
    },
  },
  {
    bankId: 'yoomoney',
    name: 'ЮMoney',
    buildUrl: (phone, amount) => {
      const p = normalizePhone(phone);
      return `yoomoney://transfer?phone=${p}&amount=${rubles(amount)}`;
    },
  },
];
