# PHASE 2: REPUTATION FEEDBACK LOOPS
## Add Consequences for Bad Vouching (4-Week Implementation)

**Version:** Phase 2 v1.0  
**Timeline:** 4 weeks  
**Prerequisites:** Phase 1 validated (100+ loans, tier-default correlation proven)  
**Target:** Add reputation layer that creates skin in the game  

---

## 🚦 **VALIDATION GATE - DO NOT START PHASE 2 UNTIL:**

### **✅ Required Validation from Phase 1:**

**Data Requirements:**
- ✓ 100+ completed loans
- ✓ 500+ total users
- ✓ 50+ lenders with active policies
- ✓ **Clear evidence:** Tier 3-4 default < 8%, Tier 1 default > 10%

**Operational Requirements:**
- ✓ Phase 1 system stable (no major bugs)
- ✓ Users understand tier system
- ✓ Lenders satisfied with tier policies

**Business Requirements:**
- ✓ Default rate data statistically significant
- ✓ Vouch acquisition active (users ARE getting vouches)
- ✓ Lending volume stable or growing

### **❌ Do NOT Start Phase 2 If:**
- ❌ Less than 100 completed loans
- ❌ No clear tier-default correlation
- ❌ Phase 1 has major bugs or confusion
- ❌ Users not getting vouches

**If gates not met:** Fix Phase 1, don't add complexity

---

## 🎯 **PHASE 2 OBJECTIVES**

### **Primary Goal:**
Create true skin in the game - bad vouching has consequences

### **What You're Adding:**
✅ Track vouch success/failure  
✅ Calculate voucher reputation score  
✅ Reputation affects YOUR trust tier  
✅ Display reputation prominently  
✅ Reputation tier badges  

### **What You're Still NOT Building:**
❌ Vouch weighting (save for Phase 3)  
❌ Network diversity scoring (save for Phase 3)  
❌ Graph analysis (save for Phase 3)  

**Why Add Reputation Now:**
- Phase 1 proved vouches predict defaults
- Now incentivize QUALITY vouching (not just quantity)
- Create feedback loop: bad vouching → lower tier for YOU

---

## 🔄 **THE REPUTATION FEEDBACK LOOP**

### **How It Works:**

```
YOU vouch for borrower Alice
  ↓
Alice's loan outcome tracked
  ↓
IF Alice defaults:
  • Your vouch_success_rate drops
  • Your reputation_score drops (0.7× to 0.9×)
  • Your trust_points = vouches × reputation_score
  • Your tier may DROP
  • YOU pay higher rates on YOUR next loan
  ↓
IF Alice repays:
  • Your vouch_success_rate improves
  • Your reputation_score improves (1.0× to 1.2×)
  • Your tier may RISE
  • YOU get better rates on YOUR next loan
```

### **The Formula:**

```typescript
// Phase 2 - Add reputation multiplier
trust_points = vouch_count × reputation_score

Where:
reputation_score = f(vouch_success_rate)
  • 0-50% success: 0.7× (penalty)
  • 51-79% success: 0.9× (slight penalty)
  • 80-89% success: 1.0× (neutral)
  • 90-94% success: 1.1× (boost)
  • 95-100% success: 1.2× (strong boost)
```

### **Example Impact:**

| User | Vouches | Success Rate | Reputation | Trust Points | Tier |
|------|---------|-------------|------------|--------------|------|
| Alice | 10 | 90% | 1.1× | 10 × 1.1 = 11 | Tier 4 ✅ |
| Bob | 10 | 50% | 0.7× | 10 × 0.7 = 7 | Tier 3 ⚠️ |
| Charlie | 6 | 95% | 1.2× | 6 × 1.2 = 7.2 | Tier 3 ✅ |

**Key:** Bob has more vouches but lower tier due to bad reputation

---

## 🗄️ **DATABASE CHANGES (Phase 2)**

### **Add to Users Table:**

```sql
-- Reputation tracking
ALTER TABLE users ADD COLUMN vouch_success_rate DECIMAL(5,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN reputation_score DECIMAL(5,2) DEFAULT 1.0;
ALTER TABLE users ADD COLUMN total_vouches_given INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN successful_vouches INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN defaulted_vouches INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN reputation_tier VARCHAR(20) DEFAULT 'neutral';

-- Rename trust_tier column for clarity
ALTER TABLE users RENAME COLUMN vouch_count TO raw_vouch_count;
ALTER TABLE users ADD COLUMN effective_trust_points DECIMAL(5,2) DEFAULT 0;
```

### **Create Reputation Tiers Reference:**

```sql
CREATE TABLE reputation_tiers (
  tier_id VARCHAR(20) PRIMARY KEY,
  tier_name VARCHAR(50),
  min_score DECIMAL(5,2),
  max_score DECIMAL(5,2),
  badge_emoji VARCHAR(10),
  description TEXT
);

INSERT INTO reputation_tiers VALUES
  ('risky', 'Risky Voucher', 0.0, 0.79, '⚠️', 'History of vouching for defaults'),
  ('neutral', 'Neutral', 0.8, 1.09, '○', 'Average vouching record'),
  ('trusted', 'Trusted Voucher', 1.1, 1.19, '✓', 'Good vouching record'),
  ('power', 'Power Voucher', 1.2, 2.0, '⭐', 'Excellent vouching record');
```

### **Create Database Function to Update Reputation:**

```sql
CREATE OR REPLACE FUNCTION update_voucher_reputation(
  p_voucher_id UUID,
  p_loan_outcome VARCHAR(20)
) RETURNS VOID AS $$
BEGIN
  -- Update counters
  IF p_loan_outcome = 'completed' THEN
    UPDATE users
    SET successful_vouches = successful_vouches + 1
    WHERE id = p_voucher_id;
  ELSIF p_loan_outcome = 'defaulted' THEN
    UPDATE users
    SET defaulted_vouches = defaulted_vouches + 1
    WHERE id = p_voucher_id;
  END IF;
  
  -- Recalculate success rate
  UPDATE users
  SET vouch_success_rate = 
    CASE 
      WHEN (successful_vouches + defaulted_vouches) = 0 THEN 0
      ELSE (successful_vouches::DECIMAL / (successful_vouches + defaulted_vouches) * 100)
    END
  WHERE id = p_voucher_id;
  
  -- Update reputation score
  UPDATE users
  SET reputation_score = 
    CASE
      WHEN vouch_success_rate < 50 THEN 0.7
      WHEN vouch_success_rate < 80 THEN 0.9
      WHEN vouch_success_rate < 90 THEN 1.0
      WHEN vouch_success_rate < 95 THEN 1.1
      ELSE 1.2
    END,
    reputation_tier = 
    CASE
      WHEN vouch_success_rate < 80 THEN 'risky'
      WHEN vouch_success_rate < 90 THEN 'neutral'
      WHEN vouch_success_rate < 95 THEN 'trusted'
      ELSE 'power'
    END
  WHERE id = p_voucher_id;
  
  -- Recalculate their trust points
  UPDATE users
  SET effective_trust_points = raw_vouch_count * reputation_score
  WHERE id = p_voucher_id;
  
  -- Recalculate their tier
  UPDATE users
  SET trust_tier = 
    CASE
      WHEN effective_trust_points >= 11 THEN 'tier_4'
      WHEN effective_trust_points >= 6 THEN 'tier_3'
      WHEN effective_trust_points >= 3 THEN 'tier_2'
      ELSE 'tier_1'
    END
  WHERE id = p_voucher_id;
END;
$$ LANGUAGE plpgsql;
```

### **Add Trigger to Update Reputation on Loan Completion:**

```sql
CREATE OR REPLACE FUNCTION trigger_update_voucher_reputations()
RETURNS TRIGGER AS $$
DECLARE
  v_vouch RECORD;
BEGIN
  -- Only run when loan status changes to completed or defaulted
  IF NEW.status IN ('completed', 'defaulted') AND OLD.status != NEW.status THEN
    -- Update reputation for all vouchers of this borrower
    FOR v_vouch IN 
      SELECT voucher_user_id 
      FROM vouches 
      WHERE vouched_for_user_id = NEW.borrower_id 
        AND status = 'active'
    LOOP
      PERFORM update_voucher_reputation(v_vouch.voucher_user_id, NEW.status);
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_reputations_on_loan_outcome
AFTER UPDATE ON loans
FOR EACH ROW
EXECUTE FUNCTION trigger_update_voucher_reputations();
```

---

## 💻 **IMPLEMENTATION CODE (Phase 2)**

### **File 1: src/lib/trust/reputation-tier.ts**

```typescript
export interface ReputationTier {
  tier: 'risky' | 'neutral' | 'trusted' | 'power';
  tierName: string;
  score: number;
  badge: string;
  successRate: number;
  totalVouches: number;
  successfulVouches: number;
  defaultedVouches: number;
}

export async function calculateReputationScore(
  vouchSuccessRate: number
): number {
  if (vouchSuccessRate < 50) return 0.7;
  if (vouchSuccessRate < 80) return 0.9;
  if (vouchSuccessRate < 90) return 1.0;
  if (vouchSuccessRate < 95) return 1.1;
  return 1.2;
}

export async function getUserReputation(
  userId: string
): Promise<ReputationTier> {
  const supabase = await createClient();
  
  const { data: user } = await supabase
    .from('users')
    .select('vouch_success_rate, reputation_score, reputation_tier, successful_vouches, defaulted_vouches, total_vouches_given')
    .eq('id', userId)
    .single();
  
  const tierMap = {
    risky: { name: 'Risky Voucher', badge: '⚠️' },
    neutral: { name: 'Neutral', badge: '○' },
    trusted: { name: 'Trusted Voucher', badge: '✓' },
    power: { name: 'Power Voucher', badge: '⭐' }
  };
  
  const tierInfo = tierMap[user.reputation_tier] || tierMap.neutral;
  
  return {
    tier: user.reputation_tier,
    tierName: tierInfo.name,
    score: user.reputation_score,
    badge: tierInfo.badge,
    successRate: user.vouch_success_rate,
    totalVouches: user.total_vouches_given,
    successfulVouches: user.successful_vouches,
    defaultedVouches: user.defaulted_vouches
  };
}
```

### **File 2: src/lib/trust/tier-with-reputation.ts**

```typescript
export interface TrustTierWithReputation {
  tier: 'tier_1' | 'tier_2' | 'tier_3' | 'tier_4';
  tierNumber: number;
  tierName: string;
  rawVouchCount: number;
  reputationScore: number;
  effectiveTrustPoints: number;
  reputationTier: ReputationTier;
  nextTierPoints: number;
}

export async function calculateTrustTierWithReputation(
  userId: string
): Promise<TrustTierWithReputation> {
  const supabase = await createClient();
  
  // Get vouch count (raw)
  const { count: rawVouchCount } = await supabase
    .from('vouches')
    .select('*', { count: 'exact', head: true })
    .eq('vouched_for_user_id', userId)
    .eq('status', 'active');
  
  // Get user's reputation as voucher
  const { data: user } = await supabase
    .from('users')
    .select('reputation_score, reputation_tier')
    .eq('id', userId)
    .single();
  
  const reputationScore = user?.reputation_score || 1.0;
  const effectiveTrustPoints = (rawVouchCount || 0) * reputationScore;
  
  // Get reputation details
  const reputationTier = await getUserReputation(userId);
  
  // Assign tier based on effective points
  let tier: string;
  let tierNumber: number;
  let tierName: string;
  let nextTierPoints: number;
  
  if (effectiveTrustPoints >= 11) {
    tier = 'tier_4';
    tierNumber = 4;
    tierName = 'High Trust';
    nextTierPoints = 0;
  } else if (effectiveTrustPoints >= 6) {
    tier = 'tier_3';
    tierNumber = 3;
    tierName = 'Established Trust';
    nextTierPoints = 11 - effectiveTrustPoints;
  } else if (effectiveTrustPoints >= 3) {
    tier = 'tier_2';
    tierNumber = 2;
    tierName = 'Building Trust';
    nextTierPoints = 6 - effectiveTrustPoints;
  } else {
    tier = 'tier_1';
    tierNumber = 1;
    tierName = 'Low Trust';
    nextTierPoints = 3 - effectiveTrustPoints;
  }
  
  // Store in database
  await supabase
    .from('users')
    .update({
      trust_tier: tier,
      raw_vouch_count: rawVouchCount || 0,
      effective_trust_points: effectiveTrustPoints,
      trust_tier_updated_at: new Date().toISOString()
    })
    .eq('id', userId);
  
  return {
    tier,
    tierNumber,
    tierName,
    rawVouchCount: rawVouchCount || 0,
    reputationScore,
    effectiveTrustPoints,
    reputationTier,
    nextTierPoints
  };
}
```

---

## 🎨 **UI COMPONENTS (Phase 2)**

### **Component 1: ReputationBadge.tsx**

```typescript
export function ReputationBadge({ userId }: { userId: string }) {
  const [reputation, setReputation] = useState<ReputationTier | null>(null);
  
  useEffect(() => {
    getUserReputation(userId).then(setReputation);
  }, [userId]);
  
  if (!reputation) return null;
  
  const badgeColors = {
    risky: 'bg-red-100 text-red-800 border-red-300',
    neutral: 'bg-gray-100 text-gray-800 border-gray-300',
    trusted: 'bg-green-100 text-green-800 border-green-300',
    power: 'bg-purple-100 text-purple-800 border-purple-300'
  };
  
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border-2 ${badgeColors[reputation.tier]}`}>
      <span className="text-lg">{reputation.badge}</span>
      <span className="font-semibold text-sm">{reputation.tierName}</span>
      <span className="text-xs opacity-75">
        {reputation.successRate.toFixed(0)}% success
      </span>
    </div>
  );
}
```

### **Component 2: TrustTierWithReputationCard.tsx**

```typescript
export function TrustTierWithReputationCard({ userId }: { userId: string }) {
  const [trust, setTrust] = useState<TrustTierWithReputation | null>(null);
  
  useEffect(() => {
    calculateTrustTierWithReputation(userId).then(setTrust);
  }, [userId]);
  
  if (!trust) return <div>Loading...</div>;
  
  return (
    <div className="space-y-4">
      {/* Trust Tier Display */}
      <div className="border-2 rounded-lg p-6 bg-gradient-to-br from-blue-50 to-purple-50">
        <h3 className="text-2xl font-bold mb-2">
          Your Trust Tier: {trust.tierName}
        </h3>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-sm text-gray-600">Raw Vouches</div>
            <div className="text-3xl font-black">{trust.rawVouchCount}</div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600">Effective Points</div>
            <div className="text-3xl font-black">{trust.effectiveTrustPoints.toFixed(1)}</div>
          </div>
        </div>
        
        <div className="bg-white/50 rounded-lg p-3">
          <div className="text-sm mb-1">Reputation Multiplier:</div>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold">
              {trust.reputationScore.toFixed(2)}×
            </div>
            <ReputationBadge userId={userId} />
          </div>
        </div>
        
        {trust.reputationScore < 1.0 && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="font-semibold text-red-800 mb-1">
              ⚠️ Your reputation is reducing your tier
            </div>
            <div className="text-sm text-red-700">
              With {trust.rawVouchCount} vouches but {trust.reputationScore}× reputation, 
              your effective points are {trust.effectiveTrustPoints.toFixed(1)}.
              Vouch more carefully to improve your reputation.
            </div>
          </div>
        )}
        
        {trust.reputationScore > 1.0 && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="font-semibold text-green-800 mb-1">
              ✓ Your reputation is boosting your tier
            </div>
            <div className="text-sm text-green-700">
              Your {trust.reputationScore}× reputation multiplier is increasing 
              your effective trust points!
            </div>
          </div>
        )}
      </div>
      
      {/* Reputation Details */}
      <div className="border rounded-lg p-4 bg-white">
        <h4 className="font-bold mb-3">Your Vouching Track Record</h4>
        
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">
              {trust.reputationTier.successfulVouches}
            </div>
            <div className="text-xs text-gray-600">Successful</div>
          </div>
          
          <div>
            <div className="text-2xl font-bold text-red-600">
              {trust.reputationTier.defaultedVouches}
            </div>
            <div className="text-xs text-gray-600">Defaulted</div>
          </div>
          
          <div>
            <div className="text-2xl font-bold">
              {trust.reputationTier.successRate.toFixed(0)}%
            </div>
            <div className="text-xs text-gray-600">Success Rate</div>
          </div>
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          💡 Tip: Vouch for people you trust. Their defaults hurt your reputation.
        </div>
      </div>
    </div>
  );
}
```

### **Component 3: ReputationImpactWarning.tsx**

```typescript
// Show this when someone is about to vouch
export function ReputationImpactWarning({ voucherId, borrowerId }: Props) {
  const [reputation, setReputation] = useState<ReputationTier | null>(null);
  
  useEffect(() => {
    getUserReputation(voucherId).then(setReputation);
  }, [voucherId]);
  
  if (!reputation) return null;
  
  return (
    <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="text-2xl">⚠️</div>
        <div className="flex-1">
          <div className="font-bold text-yellow-900 mb-2">
            Vouching Affects Your Reputation
          </div>
          <div className="text-sm text-yellow-800 space-y-2">
            <p>
              Your current reputation: <b>{reputation.tierName}</b> ({reputation.successRate.toFixed(0)}% success rate)
            </p>
            <p>
              <b>If this borrower repays:</b> Your reputation improves
            </p>
            <p>
              <b>If this borrower defaults:</b> Your reputation drops, which may lower YOUR trust tier and increase YOUR borrowing rates
            </p>
            <p className="font-semibold">
              Only vouch for people you trust to repay.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 📋 **4-WEEK IMPLEMENTATION CHECKLIST**

### **Week 1: Database & Core Logic**
- [ ] Add reputation columns to users table
- [ ] Create reputation_tiers table
- [ ] Create update_voucher_reputation() function
- [ ] Create trigger on loans table
- [ ] Test reputation calculation logic

### **Week 2: Backend Integration**
- [ ] Update calculateTrustTier() to use reputation
- [ ] Build getUserReputation() function
- [ ] Update loan creation to store reputation at time
- [ ] Test reputation affects tier correctly

### **Week 3: UI Components**
- [ ] Build ReputationBadge component
- [ ] Build TrustTierWithReputationCard
- [ ] Build ReputationImpactWarning
- [ ] Update dashboards to show reputation

### **Week 4: Testing & Launch**
- [ ] Test all reputation scenarios
- [ ] Backfill reputation for existing users
- [ ] User communication (email, in-app)
- [ ] Deploy and monitor

---

## 🧪 **TESTING CHECKLIST (Phase 2)**

### **Reputation Calculation:**
- [ ] User vouches for borrower who repays → Success rate increases
- [ ] User vouches for borrower who defaults → Success rate decreases
- [ ] Reputation score updates correctly based on success rate
- [ ] Reputation tier badge displays correctly

### **Tier Impact:**
- [ ] User with 10 vouches, 90% success → Tier 4 (11 effective points)
- [ ] User with 10 vouches, 50% success → Tier 3 (7 effective points)
- [ ] Reputation change triggers tier recalculation
- [ ] Lower reputation → lower tier → higher rates from lenders

### **UI Display:**
- [ ] Reputation badge shows on profile
- [ ] Trust tier card shows raw vs effective points
- [ ] Warning shows before vouching
- [ ] Track record visible in dashboard

### **Edge Cases:**
- [ ] New user (no vouching history) → 1.0× reputation (neutral)
- [ ] User with 100% success but only 1 vouch → Don't over-reward
- [ ] Loan outcome changes (e.g., admin override) → Reputation recalcs

---

## 📧 **USER COMMUNICATION (Phase 2 Launch)**

### **Email to All Users:**

```
Subject: 🎯 New Feature: Voucher Reputation - Your Vouching Now Affects YOUR Rates

Hi [Name],

We're introducing Voucher Reputation - a system that rewards careful vouching and creates consequences for vouching without discretion.

How It Works:
• When you vouch for someone, we track the outcome
• If they repay → Your reputation improves
• If they default → Your reputation drops
• Your reputation affects YOUR trust tier

Your Current Reputation:
• Success Rate: [X]%
• Reputation: [Tier Name]
• Impact: [Effect on your tier]

Why This Matters:
✓ Vouch carefully → Better reputation → Better rates for YOU
✗ Vouch carelessly → Lower reputation → Higher rates for YOU

This creates true skin in the game. Your vouching behavior directly affects your borrowing costs.

[View Your Reputation →]

Questions? Reply to this email.
```

---

## 📊 **SUCCESS METRICS (3-Month Validation)**

### **Adoption Metrics:**
- Target: 90%+ users see reputation displayed
- Target: 80%+ understand reputation affects them
- Target: Vouch acceptance rate changes (users more selective)

### **Behavioral Changes:**
Track these to validate reputation is working:

**Before Phase 2:**
- Average vouches per request: X
- Vouch acceptance rate: Y%

**After Phase 2 (Expected):**
- Average vouches per request: Slightly lower (more selective)
- Vouch acceptance rate: 10-20% lower (users think twice)
- Default rate: Lower for highly-vouched borrowers (quality > quantity)

### **Reputation Distribution:**
After 3 months, expect:
- 60-70% neutral reputation (most users)
- 10-15% risky reputation (bad vouchers)
- 15-20% trusted/power (good vouchers)

---

## 🚦 **VALIDATION GATE - When to Move to Phase 3**

### **Required Before Phase 3:**

✅ **Adoption:**
- 80%+ users have reputation calculated
- Users understand reputation system
- No major confusion or complaints

✅ **Behavioral Evidence:**
- Users ARE more selective about vouching
- Vouch acceptance rate dropped 10-20%
- Anecdotal: "I thought twice before vouching"

✅ **Data Evidence:**
- Reputation correlates with tier
- Bad vouchers DO have lower tiers
- System is self-correcting (bad vouchers get consequences)

✅ **Operational:**
- No major bugs
- Reputation calculation accurate
- No gaming or exploits found

### **Decision Tree:**

```
After 3 months:

IF users more selective AND reputation working:
  ✅ Move to Phase 3 (add advanced fraud prevention)

IF no behavioral change:
  ⚠️ Investigate:
     - Reputation not visible enough?
     - Consequences not clear?
     - Need stronger feedback loop?

IF gaming/exploits found:
  🚨 Fix exploits before Phase 3
```

---

## ⚠️ **KNOWN LIMITATIONS (Phase 2)**

### **What Phase 2 Does NOT Prevent:**

❌ **Circular vouching:** Group of friends vouch for each other (Phase 3)  
❌ **Fake high-quality vouches:** Power voucher with 1 vouch = high weight (Phase 3)  
❌ **Sybil attacks:** Creating multiple accounts (Phase 3 - KYC + time requirements)  

**These are intentional.** Don't over-engineer Phase 2.

### **What to Monitor:**

Watch for gaming patterns:
- Clusters of users with perfect reputation but low volume
- Users who only vouch within small circles
- Sudden spikes in vouch activity before loan requests

**If detected:** Document for Phase 3 fraud prevention

---

## 💡 **PHASE 2 INVESTOR LANGUAGE**

### **What to Say:**

"We've added reputation feedback loops to Phase 1's trust tiers.

**What Changed:**
- Launched reputation system in Week X
- Your vouching behavior now affects YOUR borrowing tier
- Bad vouching → Lower reputation → Higher rates for YOU

**Early Results (after 3 months):**
- [X]% of users have reputation calculated
- Vouch acceptance rate dropped [Y]% (users more selective)
- Users with <80% success rate are in lower tiers
- Creating true skin in the game

**Data Validation:**
We're tracking whether reputation reduces defaults further:
- Tier 3 with good reputation: [X]% default
- Tier 3 with bad reputation: [Y]% default
- Hypothesis: Reputation adds another layer of risk reduction

**Next Phase:**
If validated, Phase 3 adds advanced fraud prevention (vouch weighting, network diversity) to prevent gaming."

---

## 🎯 **PHASE 2 SUMMARY**

### **What You Built:**
Reputation feedback loop - bad vouching has consequences

### **What You're Validating:**
Does reputation make users vouch more carefully?

### **Timeline:**
4 weeks to build, 3 months to validate

### **Success Criteria:**
- 80%+ adoption
- Users more selective (vouch rate drops 10-20%)
- Reputation correlates with tier
- No major exploits

### **Next Step:**
If validated → Move to Phase 3 (advanced fraud prevention)
If not → Strengthen feedback loop or investigate

---

**PHASE 2 = SKIN IN THE GAME** 🎯

Add reputation only AFTER Phase 1 proves vouches work.
Validate behavior changes before adding complexity.
