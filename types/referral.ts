export interface ReferralCode {
  id: string;
  user_id: string;
  code: string;
  created_at: string;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  code: string | null;
  created_at: string;
  rewarded_at: string | null;
}

export interface UseReferralCodeResult {
  success: boolean;
  error?: string;
  referrer_id?: string;
}
