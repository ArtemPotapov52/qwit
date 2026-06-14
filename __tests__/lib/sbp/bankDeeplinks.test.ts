import { BANKS } from '../../../lib/sbp/bankDeeplinks';

describe('bankDeeplinks', () => {
  const PHONE_RU = '+79001234567';
  const AMOUNT = 500;

  it('exports all 8 banks', () => {
    expect(BANKS).toHaveLength(8);
  });

  it('each bank has bankId, name, buildUrl', () => {
    for (const bank of BANKS) {
      expect(typeof bank.bankId).toBe('string');
      expect(typeof bank.name).toBe('string');
      expect(typeof bank.buildUrl).toBe('function');
    }
  });

  describe('Т-Банк (tbank)', () => {
    const bank = BANKS.find(b => b.bankId === 'tbank')!;

    it('builds tinkoff:// deeplink (scheme kept after rebrand)', () => {
      const url = bank.buildUrl(PHONE_RU, AMOUNT);
      expect(url).toMatch(/^tinkoff:\/\//);
    });

    it('contains phone without leading +', () => {
      const url = bank.buildUrl(PHONE_RU, AMOUNT);
      expect(url).toContain('79001234567');
    });

    it('contains amount in rubles', () => {
      const url = bank.buildUrl(PHONE_RU, AMOUNT);
      expect(url).toContain('amount=500');
    });

    it('normalises 8-prefix to 7', () => {
      const url = bank.buildUrl('89001234567', AMOUNT);
      expect(url).toContain('79001234567');
    });
  });

  describe('Сбер', () => {
    const bank = BANKS.find(b => b.bankId === 'sber')!;

    it('builds sberbankonline:// deeplink', () => {
      const url = bank.buildUrl(PHONE_RU, AMOUNT);
      expect(url).toMatch(/^sberbankonline:\/\//);
    });

    it('contains sum param', () => {
      const url = bank.buildUrl(PHONE_RU, AMOUNT);
      expect(url).toContain('sum=500');
    });
  });

  describe('Альфа', () => {
    const bank = BANKS.find(b => b.bankId === 'alfa')!;

    it('builds alfabank:// deeplink', () => {
      const url = bank.buildUrl(PHONE_RU, AMOUNT);
      expect(url).toMatch(/^alfabank:\/\//);
    });
  });

  describe('ВТБ', () => {
    const bank = BANKS.find(b => b.bankId === 'vtb')!;

    it('builds vtb24mobile:// deeplink', () => {
      const url = bank.buildUrl(PHONE_RU, AMOUNT);
      expect(url).toMatch(/^vtb24mobile:\/\//);
    });
  });

  describe('phone normalisation', () => {
    const bank = BANKS.find(b => b.bankId === 'tbank')!;

    it('handles 8-prefix', () => {
      const url = bank.buildUrl('89161234567', AMOUNT);
      expect(url).toContain('79161234567');
    });

    it('handles number without country code', () => {
      const url = bank.buildUrl('9161234567', AMOUNT);
      expect(url).toContain('79161234567');
    });

    it('handles number with +7 prefix', () => {
      const url = bank.buildUrl('+79161234567', AMOUNT);
      expect(url).toContain('79161234567');
    });

    it('strips non-digit characters from phone', () => {
      const url = bank.buildUrl('+7 (916) 123-45-67', AMOUNT);
      expect(url).toContain('79161234567');
    });
  });

  describe('amount rounding', () => {
    const bank = BANKS.find(b => b.bankId === 'tbank')!;

    it('rounds fractional rubles', () => {
      const url = bank.buildUrl(PHONE_RU, 100.9);
      expect(url).toContain('amount=101');
    });

    it('handles zero amount', () => {
      const url = bank.buildUrl(PHONE_RU, 0);
      expect(url).toContain('amount=0');
    });
  });
});
