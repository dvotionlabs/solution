export default function ReferralField() {
  return <label className="referral-field">
    Were you referred by a current client? (optional)
    <input name="referredBy" maxLength={100} autoComplete="off" placeholder="Their full name" aria-describedby="referral-help" />
    <span id="referral-help" className="field-hint">If you join a monthly Direct Debit plan, they’ll receive 50% off one month of training.</span>
  </label>;
}
