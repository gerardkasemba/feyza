# PHASE 1: START HERE GUIDE
## Simple Trust-Based Lending MVP (2-Week Implementation)

**Version:** MVP v1.0  
**Timeline:** 2 weeks  
**Target:** Get to market fast, validate hypothesis  
**Current State:** 150 users, $187k funded  

---

## 🎯 **PHASE 1 OBJECTIVES**

### **Primary Goal:**
Validate that vouches correlate with lower default rates

### **What You're Building:**
✅ Simple trust tier system (count vouches only)  
✅ Lender tier-based policies  
✅ Replace first-time borrower limits  
✅ Basic UI for borrowers and lenders  

### **What You're NOT Building (Yet):**
❌ Reputation feedback loops  
❌ Vouch weight calculations  
❌ Network diversity scoring  
❌ Graph analysis  
❌ Complex fraud prevention (account age, behavior requirements, vouch limits)

### **What You MUST Build (Non-Negotiable):**
✅ **KYC requirement to vouch** - Only verified users can vouch for others

**Why Keep It Simple (But Not Unsafe):**
- ✅ Get to market in 2 weeks (not 5)
- ✅ Easy to explain to users
- ✅ Fast to debug
- ✅ Can iterate quickly
- ✅ Validate hypothesis before investing more
- ✅ **But protect against fake accounts from day 1**

---

## 📊 **THE SIMPLIFIED SYSTEM**

### **Trust Tier Formula (Phase 1 - Dead Simple):**

```typescript
function calculateTrustTier(userId: string): TrustTier {
  // Just count active vouches - NO weighting, NO complexity
  const vouchCount = countActiveVouches(userId);
  
  if (vouchCount >= 11) return { tier: 'tier_4', name: 'High Trust', points: vouchCount };
  if (vouchCount >= 6) return { tier: 'tier_3', name: 'Established Trust', points: vouchCount };
  if (vouchCount >= 3) return { tier: 'tier_2', name: 'Building Trust', points: vouchCount };
  return { tier: 'tier_1', name: 'Low Trust', points: vouchCount };
}
```

**That's it. No multiplication, no reputation, no graphs.**

### **The 4 Trust Tiers:**

| Tier | Vouches Needed | What It Means | Target Default Rate |
|------|---------------|---------------|-------------------|
| **Tier 1** | 0-2 | Low trust, few connections | ~15% (hypothesis) |
| **Tier 2** | 3-5 | Building network | ~10% (hypothesis) |
| **Tier 3** | 6-10 | Established connections | ~6% (hypothesis) |
| **Tier 4** | 11+ | Strong community support | ~3% (hypothesis) |

**Note:** These default rates are **hypotheses** to validate, not promises.

---

## 🗄️ **MINIMAL DATABASE CHANGES**

### **Add to Users Table:**

```sql
-- Trust tier tracking (simple)
ALTER TABLE users ADD COLUMN trust_tier VARCHAR(20);
ALTER TABLE users ADD COLUMN trust_tier_updated_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN vouch_count INTEGER DEFAULT 0;

-- MINIMUM FRAUD PREVENTION: KYC requirement
ALTER TABLE users ADD COLUMN kyc_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN active_vouches_count INTEGER DEFAULT 0;

-- Create trust tiers reference table
CREATE TABLE trust_tiers (
  tier_id VARCHAR(20) PRIMARY KEY,
  tier_name VARCHAR(50),
  tier_number INTEGER,
  min_vouches INTEGER,
  max_vouches INTEGER,
  description TEXT
);

INSERT INTO trust_tiers VALUES
  ('tier_1', 'Low Trust', 1, 0, 2, '0-2 vouches'),
  ('tier_2', 'Building Trust', 2, 3, 5, '3-5 vouches'),
  ('tier_3', 'Established Trust', 3, 6, 10, '6-10 vouches'),
  ('tier_4', 'High Trust', 4, 11, 999, '11+ vouches');
```

### **Add Lender Tier Policies Table:**

```sql
CREATE TABLE lender_tier_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lender_id UUID REFERENCES users(id),
  tier_id VARCHAR(20) REFERENCES trust_tiers(tier_id),
  
  -- Simple policy settings
  interest_rate DECIMAL(5,2) NOT NULL,
  max_loan_amount INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(lender_id, tier_id)
);
```

### **Add to Loans Table:**

```sql
-- Lock tier at loan creation
ALTER TABLE loans ADD COLUMN borrower_trust_tier VARCHAR(20);
ALTER TABLE loans ADD COLUMN borrower_vouch_count INTEGER;
ALTER TABLE loans ADD COLUMN was_first_time_borrower BOOLEAN;
```

**That's the complete database for Phase 1. Simple.**

---

## 💻 **IMPLEMENTATION CODE**

### **File 1: src/lib/trust/simple-tier.ts**

```typescript
import { createClient } from '@/lib/supabase/server';

export interface SimpleTrustTier {
  tier: 'tier_1' | 'tier_2' | 'tier_3' | 'tier_4';
  tierNumber: number;
  tierName: string;
  vouchCount: number;
  nextTierVouches: number;
}

export async function calculateSimpleTrustTier(
  userId: string
): Promise<SimpleTrustTier> {
  const supabase = await createClient();
  
  // Count active vouches (simple - no weighting)
  const { count: vouchCount } = await supabase
    .from('vouches')
    .select('*', { count: 'exact', head: true })
    .eq('vouched_for_user_id', userId)
    .eq('status', 'active');
  
  // Assign tier based on count
  let tier: string;
  let tierNumber: number;
  let tierName: string;
  let nextTierVouches: number;
  
  if ((vouchCount || 0) >= 11) {
    tier = 'tier_4';
    tierNumber = 4;
    tierName = 'High Trust';
    nextTierVouches = 0; // Max tier
  } else if ((vouchCount || 0) >= 6) {
    tier = 'tier_3';
    tierNumber = 3;
    tierName = 'Established Trust';
    nextTierVouches = 11 - (vouchCount || 0);
  } else if ((vouchCount || 0) >= 3) {
    tier = 'tier_2';
    tierNumber = 2;
    tierName = 'Building Trust';
    nextTierVouches = 6 - (vouchCount || 0);
  } else {
    tier = 'tier_1';
    tierNumber = 1;
    tierName = 'Low Trust';
    nextTierVouches = 3 - (vouchCount || 0);
  }
  
  // Store in database
  await supabase
    .from('users')
    .update({
      trust_tier: tier,
      vouch_count: vouchCount || 0,
      trust_tier_updated_at: new Date().toISOString()
    })
    .eq('id', userId);
  
  return {
    tier,
    tierNumber,
    tierName,
    vouchCount: vouchCount || 0,
    nextTierVouches
  };
}
```

### **File 2: src/lib/matching/find-lenders.ts**

```typescript
export async function findEligibleLenders(
  borrowerId: string,
  requestedAmount: number
) {
  const supabase = await createClient();
  
  // Calculate borrower's tier
  const tier = await calculateSimpleTrustTier(borrowerId);
  
  // Find lenders with policies for this tier
  const { data: policies } = await supabase
    .from('lender_tier_policies')
    .select(`
      *,
      lender:users!lender_id(id, full_name, avatar_url)
    `)
    .eq('tier_id', tier.tier)
    .eq('is_active', true)
    .gte('max_loan_amount', requestedAmount)
    .order('interest_rate', { ascending: true });
  
  return {
    tier: tier.tier,
    tierName: tier.tierName,
    vouchCount: tier.vouchCount,
    eligibleLenders: policies || [],
    totalLenders: policies?.length || 0,
    bestRate: policies?.[0]?.interest_rate,
    averageRate: policies?.length 
      ? policies.reduce((sum, p) => sum + p.interest_rate, 0) / policies.length
      : null
  };
}
```

### **File 3: src/lib/fraud-prevention/basic-eligibility.ts**

```typescript
import { createClient } from '@/lib/supabase/server';

export async function canUserVouch(userId: string): Promise<{
  canVouch: boolean;
  reason?: string;
}> {
  const supabase = await createClient();
  
  const { data: user } = await supabase
    .from('users')
    .select('kyc_verified_at')
    .eq('id', userId)
    .single();
  
  if (!user) {
    return { canVouch: false, reason: 'User not found' };
  }
  
  // MINIMUM FRAUD PREVENTION: KYC required
  if (!user.kyc_verified_at) {
    return {
      canVouch: false,
      reason: 'You must complete KYC verification to vouch for others'
    };
  }
  
  // Passed basic check
  return { canVouch: true };
}
```

**Why This Is Critical:**
- Prevents anonymous/fake accounts from vouching
- Requires real identity verification
- Minimal friction but maximum protection
- Non-negotiable even at 150 users

```typescript
export async function POST(request: Request) {
  const { voucherId, borrowerId } = await request.json();
  const supabase = await createServerClient();
  
  try {
    // CHECK ELIGIBILITY FIRST
    const eligibility = await canUserVouch(voucherId);
    
    if (!eligibility.canVouch) {
      return NextResponse.json({
        error: eligibility.reason
      }, { status: 403 });
    }
    
    // Create vouch
    const { data: vouch, error } = await supabase
      .from('vouches')
      .insert({
        voucher_user_id: voucherId,
        vouched_for_user_id: borrowerId,
        status: 'active',
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Recalculate borrower's tier
    await calculateSimpleTrustTier(borrowerId);
    
    return NextResponse.json({
      success: true,
      vouchId: vouch.id
    });
    
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### **File 5: src/app/api/loans/create/route.ts**

```typescript
export async function POST(request: Request) {
  const { amount, duration, borrowerId } = await request.json();
  const supabase = await createServerClient();
  
  try {
    // Calculate tier
    const tier = await calculateSimpleTrustTier(borrowerId);
    
    // Find lenders
    const match = await findEligibleLenders(borrowerId, amount);
    
    if (match.totalLenders === 0) {
      return NextResponse.json({
        error: 'No lenders available for your tier',
        tier: tier.tierName,
        suggestion: 'Get more vouches to access more lenders'
      }, { status: 400 });
    }
    
    // Check if first-time (for analytics)
    const { count } = await supabase
      .from('loans')
      .select('id', { count: 'exact', head: true })
      .eq('borrower_id', borrowerId)
      .eq('status', 'completed');
    
    // Create loan request
    const { data: loan } = await supabase
      .from('loans')
      .insert({
        borrower_id: borrowerId,
        amount,
        duration_months: duration,
        status: 'pending',
        borrower_trust_tier: tier.tier,
        borrower_vouch_count: tier.vouchCount,
        was_first_time_borrower: count === 0
      })
      .select()
      .single();
    
    // Notify lenders
    await notifyLenders(loan.id, match.eligibleLenders);
    
    return NextResponse.json({
      success: true,
      loanId: loan.id,
      tier: tier.tierName,
      vouchCount: tier.vouchCount,
      eligibleLenders: match.totalLenders,
      expectedRates: {
        best: match.bestRate,
        average: match.averageRate
      }
    });
    
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

## 🎨 **SIMPLE UI COMPONENTS**

### **Component 1: SimpleTrustTierCard.tsx**

```typescript
export function SimpleTrustTierCard({ userId }: { userId: string }) {
  const [tier, setTier] = useState<SimpleTrustTier | null>(null);
  
  useEffect(() => {
    calculateSimpleTrustTier(userId).then(setTier);
  }, [userId]);
  
  if (!tier) return <div>Loading...</div>;
  
  const tierColors = {
    tier_1: 'bg-red-100 border-red-400',
    tier_2: 'bg-yellow-100 border-yellow-400',
    tier_3: 'bg-green-100 border-green-400',
    tier_4: 'bg-emerald-100 border-emerald-400'
  };
  
  const tierIcons = {
    tier_1: '🔴',
    tier_2: '🟡',
    tier_3: '🟢',
    tier_4: '💚'
  };
  
  return (
    <div className={`border-2 rounded-lg p-6 ${tierColors[tier.tier]}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-2xl font-bold">
            {tierIcons[tier.tier]} {tier.tierName}
          </h3>
          <p className="text-sm">Your Trust Tier</p>
        </div>
        <div className="text-4xl font-black">{tier.tierNumber}</div>
      </div>
      
      <div className="mb-4">
        <p className="font-semibold mb-2">
          You have {tier.vouchCount} vouches
        </p>
        
        {tier.nextTierVouches > 0 && (
          <p className="text-sm">
            Get {tier.nextTierVouches} more vouches to reach next tier
          </p>
        )}
      </div>
      
      <div className="text-sm opacity-75">
        {tier.tier === 'tier_1' && '• Access to high-interest lenders\n• Small loan amounts'}
        {tier.tier === 'tier_2' && '• Better rates available\n• Moderate loan amounts'}
        {tier.tier === 'tier_3' && '• Good rates\n• Higher loan amounts'}
        {tier.tier === 'tier_4' && '• Best rates\n• Maximum loan amounts'}
      </div>
      
      <button 
        onClick={() => window.location.href = '/get-vouches'}
        className="w-full mt-4 bg-current text-white py-2 rounded-lg"
      >
        Get More Vouches
      </button>
    </div>
  );
}
```

### **Component 2: VouchButton.tsx (with KYC check)**

```typescript
export function VouchButton({ voucherId, borrowerId }: Props) {
  const [canVouch, setCanVouch] = useState<boolean>(false);
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Check eligibility when component mounts
    fetch('/api/vouches/check-eligibility', {
      method: 'POST',
      body: JSON.stringify({ voucherId })
    })
    .then(res => res.json())
    .then(data => {
      setCanVouch(data.canVouch);
      setReason(data.reason);
      setLoading(false);
    });
  }, [voucherId]);
  
  if (loading) return <div>Checking eligibility...</div>;
  
  // Show KYC requirement if not verified
  if (!canVouch && reason.includes('KYC')) {
    return (
      <div className="border-2 border-red-300 bg-red-50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">🔒</span>
          <h4 className="font-bold text-red-900">KYC Verification Required</h4>
        </div>
        <p className="text-sm text-red-800 mb-3">
          You must verify your identity before you can vouch for others.
        </p>
        <button
          onClick={() => window.location.href = '/kyc-verify'}
          className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold"
        >
          Complete KYC Verification
        </button>
      </div>
    );
  }
  
  // Show vouch button if eligible
  return (
    <button
      onClick={handleVouch}
      className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold"
    >
      Vouch for This Person
    </button>
  );
}
```

### **Component 3: LenderSimplePolicyConfig.tsx**

```typescript
export function LenderSimplePolicyConfig({ lenderId }: { lenderId: string }) {
  const [policies, setPolicies] = useState<Record<string, any>>({});
  
  const TIERS = [
    { id: 'tier_1', name: 'Tier 1', desc: '0-2 vouches' },
    { id: 'tier_2', name: 'Tier 2', desc: '3-5 vouches' },
    { id: 'tier_3', name: 'Tier 3', desc: '6-10 vouches' },
    { id: 'tier_4', name: 'Tier 4', desc: '11+ vouches' }
  ];
  
  async function savePolicies() {
    for (const [tierId, policy] of Object.entries(policies)) {
      await supabase
        .from('lender_tier_policies')
        .upsert({
          lender_id: lenderId,
          tier_id: tierId,
          interest_rate: policy.rate,
          max_loan_amount: policy.maxAmount,
          is_active: policy.isActive
        });
    }
    toast.success('Policy saved!');
  }
  
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Set Your Lending Policy</h2>
      <p className="text-gray-600">Configure rates by trust tier</p>
      
      {TIERS.map(tier => (
        <div key={tier.id} className="border rounded-lg p-4 bg-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold">{tier.name}</h3>
              <p className="text-sm text-gray-600">{tier.desc}</p>
            </div>
            <Toggle
              checked={policies[tier.id]?.isActive}
              onChange={(active) =>
                setPolicies({...policies, [tier.id]: {...policies[tier.id], isActive: active}})
              }
            />
          </div>
          
          {policies[tier.id]?.isActive && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm">Rate (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={policies[tier.id]?.rate}
                  onChange={(e) =>
                    setPolicies({
                      ...policies,
                      [tier.id]: {...policies[tier.id], rate: parseFloat(e.target.value)}
                    })
                  }
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              
              <div>
                <label className="text-sm">Max ($)</label>
                <input
                  type="number"
                  value={policies[tier.id]?.maxAmount}
                  onChange={(e) =>
                    setPolicies({
                      ...policies,
                      [tier.id]: {...policies[tier.id], maxAmount: parseInt(e.target.value)}
                    })
                  }
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
          )}
        </div>
      ))}
      
      <button
        onClick={savePolicies}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold"
      >
        Save Policy
      </button>
    </div>
  );
}
```

---

## 📋 **2-WEEK IMPLEMENTATION CHECKLIST**

### **Week 1: Backend**
- [ ] Day 1-2: Database schema (tables, columns including kyc_verified_at)
- [ ] Day 3: Build canUserVouch() (KYC check)
- [ ] Day 3: Build calculateSimpleTrustTier()
- [ ] Day 4: Build findEligibleLenders()
- [ ] Day 4: Build /api/vouches/create (with eligibility check)
- [ ] Day 5: Update /api/loans/create

### **Week 2: Frontend**
- [ ] Day 6-7: Build SimpleTrustTierCard component
- [ ] Day 8: Build LenderSimplePolicyConfig component
- [ ] Day 9: Update borrower dashboard
- [ ] Day 10: Update lender dashboard
- [ ] Day 11-12: Testing + bug fixes
- [ ] Day 13-14: Deploy + user communication

---

## 🧪 **TESTING CHECKLIST (Phase 1)**

### **Fraud Prevention (Minimum):**
- [ ] User without KYC tries to vouch → Blocked with clear message
- [ ] User with KYC can vouch → Success
- [ ] Vouch creation API checks KYC before allowing
- [ ] Error message displayed clearly in UI

### **Trust Tier Calculation:**
- [ ] User with 0 vouches → Tier 1
- [ ] User with 3 vouches → Tier 2
- [ ] User with 6 vouches → Tier 3
- [ ] User with 11 vouches → Tier 4
- [ ] Tier displays correctly on dashboard

### **Lender Policies:**
- [ ] Lender can set policy for each tier
- [ ] Lender can activate/deactivate tiers
- [ ] Policies save correctly
- [ ] Policies load correctly

### **Matching:**
- [ ] Tier 3 borrower sees only Tier 3 lenders
- [ ] Tier 1 borrower sees only Tier 1 lenders
- [ ] No lenders = appropriate error message
- [ ] Multiple lenders = sorted by rate

### **Migration:**
- [ ] First-time limit UI removed
- [ ] Old lenders have default policies created
- [ ] No breaking changes to existing loans

---

## 🔒 **CRITICAL: MINIMUM FRAUD PREVENTION (NON-NEGOTIABLE)**

### **Why KYC Verification Is Required Even in Phase 1:**

**Without KYC requirement, you're vulnerable to:**

❌ **Fake Account Farms:**
- Someone creates 50 fake accounts
- All 50 vouch for each other
- Instant Tier 4 for everyone
- Total system breakdown

❌ **Bot Networks:**
- Automated bots create accounts
- Bots vouch for bots
- Gaming at scale

❌ **Anonymous Coordination:**
- Bad actors coordinate without identity
- No accountability
- No recourse for fraud

### **With KYC Requirement:**

✅ **Real Identities:**
- Every voucher is a verified person
- Can't create fake accounts easily
- Accountability for bad vouching

✅ **Minimal Friction:**
- KYC already required for borrowing/lending
- No additional burden for vouching
- Just extends existing requirement

✅ **Scales Safely:**
- Works at 150 users
- Works at 10,000 users
- Foundation for future fraud prevention

### **Implementation:**

```typescript
// ALWAYS check this before allowing vouch
if (!user.kyc_verified_at) {
  return { canVouch: false, reason: 'KYC required' };
}
```

**This is non-negotiable. Even at 150 users. Even in Phase 1.**

---

## 📧 **USER COMMUNICATION**

### **Email to Borrowers:**

```
Subject: 🎉 Introducing Trust Tiers - Better Rates for Community Support

Hi [Name],

We're launching Trust Tiers - a new way to get better loan rates based on your community connections!

How It Works:
• More vouches = Lower rates
• 4 tiers: from Low Trust (0-2 vouches) to High Trust (11+ vouches)
• Each tier unlocks better rates and higher loan amounts

Your Current Status:
• You have [X] vouches
• You're at [Tier Name]
• Get [Y] more vouches to reach next tier

Why This Is Better:
✓ Fair: Rewards your community support
✓ Clear: Simple path to better rates
✓ Powerful: Strong community = stronger borrowing

[Check Your Trust Tier →]

Questions? Reply to this email.
```

### **Email to Lenders:**

```
Subject: Action Required: Set Your Trust Tier Lending Policy

Hi [Name],

We're introducing Trust Tiers to help you price risk better!

What's Changing:
• Borrowers now have Trust Tiers (1-4) based on vouches
• You set rates for each tier
• Better risk signals = better decisions

Action Required:
We've created default policies based on your previous settings, but please review and adjust:

[Set Your Tier Policy →]

Why This Helps You:
✓ Better risk assessment (vouches > time)
✓ More control (4 tiers vs 2 categories)
✓ Market-driven (you decide rates)

Questions? Call us at [phone]
```

---

## 📊 **SUCCESS METRICS (3-Month Validation)**

### **Adoption Metrics:**
- Target: 80%+ borrowers have tier assigned
- Target: 90%+ lenders set policies
- Target: 60%+ loans use tier-based matching

### **Hypothesis Validation:**
Track these metrics to validate hypothesis:

| Tier | Target Default Rate | Sample Size Needed |
|------|-------------------|-------------------|
| Tier 1 | 12-15% | 20+ completed loans |
| Tier 2 | 8-12% | 30+ completed loans |
| Tier 3 | 4-8% | 30+ completed loans |
| Tier 4 | 2-5% | 20+ completed loans |

**After 3 months with these sample sizes, you can say:**
- ✅ "We've validated that vouches correlate with defaults"
- ✅ "Tier 3-4 borrowers default at X%, vs Tier 1 at Y%"

---

## 🚦 **VALIDATION GATES - When to Move to Phase 2**

### **Required Before Phase 2:**

✅ **Adoption Gate:**
- 500+ total users
- 50+ lenders with policies set
- 100+ loans matched via tier system

✅ **Data Gate:**
- 50+ completed loans
- Clear trend showing tier correlation with defaults
- Statistical significance (p < 0.05)

✅ **Operational Gate:**
- No major bugs
- Users understand tier system
- Lenders satisfied with policies

### **Decision Tree:**

```
After 3 months, analyze data:

IF Tier 3-4 default < 8% AND Tier 1 default > 10%:
  ✅ Hypothesis validated → Move to Phase 2

IF No clear difference:
  ⚠️ Investigate why:
     - Not enough volume?
     - Vouches being gamed?
     - Need fraud prevention?
  
IF Tier 3-4 default WORSE:
  🚨 Pivot - vouches don't predict defaults
```

---

## ⚠️ **WHAT TO AVOID IN PHASE 1**

### **Don't Build:**
- ❌ Reputation feedback loops (too complex)
- ❌ Vouch weighting (premature optimization)
- ❌ Network graphs (over-engineering)
- ❌ Account age requirements (Phase 3)
- ❌ Vouch limits by tier (Phase 3)
- ❌ Behavior requirements (Phase 3)

### **DO Build (Minimum Security):**
- ✅ **KYC verification check** (non-negotiable!)

### **Don't Promise:**
- ❌ "2% default rate" (you haven't proven it)
- ❌ "Defensible moat" (too early)
- ❌ "Banks can't copy" (they could copy simple tiers)

### **Don't Delay:**
- ❌ Waiting for perfect system
- ❌ Building all features before launch
- ❌ Overthinking edge cases

**Ship Phase 1, learn, iterate.**

---

## 💡 **PHASE 1 INVESTOR LANGUAGE**

### **What to Say:**

"We've launched Trust Tiers - a simple system where borrowers with more vouches access better rates from lenders.

**Current Status:**
- Deployed in Week 1
- 150 users being migrated
- Early adoption: [X]% borrowers, [Y]% lenders

**Hypothesis:**
We believe vouches will correlate with 5× lower default rates. We're tracking 100+ loans over 3 months to validate.

**Early Indicators:**
- [X]% of borrowers are actively getting vouches
- Lenders report higher confidence in vouched borrowers
- Anecdotal feedback is positive

**Next Milestone:**
In 3 months, we'll have statistical proof that vouches predict creditworthiness. That's when we add reputation feedback loops (Phase 2)."

---

## 🎯 **PHASE 1 SUMMARY**

### **What You Built:**
Simple trust tier system based on vouch count

### **What You're Validating:**
Do vouches correlate with lower defaults?

### **Timeline:**
2 weeks to build, 3 months to validate

### **Success Criteria:**
- 80%+ adoption
- 100+ loans tracked
- Clear tier-default correlation

### **Next Step:**
If validated → Move to Phase 2 (reputation feedback loops)
If not → Investigate and adjust

---

**START HERE. Validate first. Complexity later.** 🚀
