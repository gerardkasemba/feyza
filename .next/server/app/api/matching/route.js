"use strict";(()=>{var e={};e.id=7001,e.ids=[7001],e.modules={72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},61282:e=>{e.exports=require("child_process")},84770:e=>{e.exports=require("crypto")},80665:e=>{e.exports=require("dns")},17702:e=>{e.exports=require("events")},92048:e=>{e.exports=require("fs")},32615:e=>{e.exports=require("http")},35240:e=>{e.exports=require("https")},98216:e=>{e.exports=require("net")},19801:e=>{e.exports=require("os")},55315:e=>{e.exports=require("path")},76162:e=>{e.exports=require("stream")},82452:e=>{e.exports=require("tls")},17360:e=>{e.exports=require("url")},21764:e=>{e.exports=require("util")},71568:e=>{e.exports=require("zlib")},38858:(e,t,o)=>{o.r(t),o.d(t,{originalPathname:()=>_,patchFetch:()=>w,requestAsyncStorage:()=>h,routeModule:()=>f,serverHooks:()=>b,staticGenerationAsyncStorage:()=>y});var r={};o.r(r),o.d(r,{GET:()=>x,POST:()=>p});var n=o(49303),i=o(88716),a=o(60670),s=o(87070),l=o(65655),d=o(20471);async function p(e){try{let{loan_id:t}=await e.json();if(console.log("Starting matching for loan:",t),!t)return s.NextResponse.json({error:"loan_id is required"},{status:400});let o=await (0,l.k)(),{data:r,error:n}=await o.from("loans").select(`
        *,
        borrower:users!borrower_id(id, email, full_name, borrower_rating, verification_status)
      `).eq("id",t).single();if(n||!r)return console.error("Loan not found:",n),s.NextResponse.json({error:"Loan not found"},{status:404});if(console.log("Loan details:",{amount:r.amount,currency:r.currency,borrower:r.borrower?.full_name}),r.lender_id||r.business_lender_id)return s.NextResponse.json({error:"Loan already has a lender assigned",status:"already_matched"},{status:400});await o.from("loans").update({match_status:"matching"}).eq("id",t);let i=[];console.log("Attempting to find matching lenders for loan:",t);let{count:a}=await o.from("loans").select("*",{count:"exact",head:!0}).eq("borrower_id",r.borrower_id).eq("status","completed"),p=0===(a||0);console.log("Borrower first-time status:",{borrowerId:r.borrower_id,completedLoans:a,isFirstTimeBorrower:p});let{data:u,error:m}=await o.rpc("find_matching_lenders",{p_loan_id:t,p_limit:5});if(m){console.log("Database function not available, using fallback query:",m.message);let{data:e,error:n}=await o.from("lender_preferences").select(`
          *,
          business:business_profiles!business_id(id, business_name, contact_email)
        `).eq("is_active",!0).gte("capital_pool",r.amount).lte("min_amount",r.amount).gte("max_amount",r.amount);if(n)return console.error("Fallback query error:",n),await o.from("loans").update({match_status:"no_match"}).eq("id",t),s.NextResponse.json({error:"Matching failed: "+n.message},{status:500});e&&e.length>0&&(i=e.filter(e=>{if((e.capital_pool||0)-(e.capital_reserved||0)<r.amount)return!1;if(p){if(!1===e.allow_first_time_borrowers)return console.log(`Skipping lender ${e.business?.business_name||e.user_id}: doesn't allow first-time borrowers`),!1;let t=e.first_time_borrower_limit??e.max_amount;if(r.amount>t)return console.log(`Skipping lender ${e.business?.business_name||e.user_id}: first-time limit ${t} < requested ${r.amount}`),!1}return!0}).map(e=>({lender_user_id:e.user_id,lender_business_id:e.business_id,match_score:80,auto_accept:e.auto_accept||!1,interest_rate:e.interest_rate||10,lender_name:e.business?.business_name||"Lender",first_time_borrower_limit:e.first_time_borrower_limit})).slice(0,5))}else i=u||[];if(console.log("Matching result:",{matchCount:i.length,matches:i}),!i||0===i.length){if(console.log("No matching lenders found"),await o.from("loans").update({match_status:"no_match"}).eq("id",t),r.borrower?.email){let e="https://feyza.app";await (0,d.Cz)({to:r.borrower.email,subject:"\uD83D\uDCCB Loan Request Update - No Matching Lenders Found",html:`
            <!DOCTYPE html>
            <html>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                  <h1 style="color: white; margin: 0;">📋 Loan Request Update</h1>
                </div>
                
                <div style="background: #fff7ed; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #fed7aa;">
                  <p style="font-size: 18px;">Hi ${r.borrower.full_name||"there"}! 👋</p>
                  
                  <p>We couldn't find a matching business lender for your loan request at this time.</p>
                  
                  <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #fed7aa;">
                    <p style="margin: 0;"><strong>Requested Amount:</strong> ${r.currency} ${r.amount.toLocaleString()}</p>
                    ${r.purpose?`<p style="margin: 10px 0 0 0;"><strong>Purpose:</strong> ${r.purpose}</p>`:""}
                  </div>
                  
                  ${p?`
                  <div style="background: #dbeafe; border: 1px solid #93c5fd; border-radius: 8px; padding: 16px; margin: 20px 0;">
                    <p style="margin: 0; color: #1e40af; font-size: 14px;">
                      <strong>💡 First-time borrower tip:</strong> As a new user, some lenders have limits on how much they'll lend to first-timers. 
                      Try requesting a smaller amount (e.g., $100-$300) to build your borrowing history first.
                    </p>
                  </div>
                  `:""}
                  
                  <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
                    <p style="margin: 0; color: #166534; font-size: 14px;">
                      <strong>What you can do:</strong>
                    </p>
                    <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #166534; font-size: 14px;">
                      <li>Try a smaller loan amount</li>
                      <li>Request from a friend or family member instead</li>
                      <li>Check back later as new lenders join regularly</li>
                    </ul>
                  </div>
                  
                  <a href="${e}/loans/new" style="display: block; background: #10b981; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; text-align: center; margin: 24px 0;">
                    Try a Different Amount →
                  </a>
                  
                  <a href="${e}/loans/${r.id}" style="display: block; color: #6b7280; text-decoration: none; text-align: center; font-size: 14px;">
                    View your loan request
                  </a>
                </div>
                
                <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
                  Sent via Feyza • Simple loan tracking for everyone
                </p>
              </body>
            </html>
          `}),await o.from("notifications").insert({user_id:r.borrower_id,loan_id:r.id,type:"no_match_found",title:"\uD83D\uDCCB No Matching Lenders",message:p?`No lenders found for your ${r.currency} ${r.amount} request. As a first-time borrower, try a smaller amount to build history.`:`No lenders currently available for your ${r.currency} ${r.amount} request. Try a smaller amount or ask a friend.`})}return s.NextResponse.json({success:!1,message:"No matching lenders found",status:"no_match",isFirstTimeBorrower:p})}console.log("Found",i.length,"matching lenders");let x=i.map((e,o)=>({loan_id:t,lender_user_id:e.lender_user_id,lender_business_id:e.lender_business_id,match_score:e.match_score,match_rank:o+1,status:"pending",expires_at:new Date(Date.now()+864e5).toISOString()})),{data:f,error:h}=await o.from("loan_matches").insert(x).select();h&&console.error("Error creating match records:",h);let y=i[0],b=f?.[0];if(console.log("Best match:",{name:y.lender_name,score:y.match_score,autoAccept:y.auto_accept}),y.auto_accept)return console.log("Auto-accepting loan..."),await c(o,r,y,b?.id,!0),s.NextResponse.json({success:!0,status:"auto_accepted",match:{lender_name:y.lender_name,interest_rate:y.interest_rate,match_score:y.match_score},loan_id:t});return await g(o,r,y,b?.id),await o.from("loans").update({match_status:"matching",current_match_id:b?.id,match_attempts:(r.match_attempts||0)+1}).eq("id",t),s.NextResponse.json({success:!0,status:"pending_acceptance",message:`Loan offered to ${y.lender_name}. Waiting for response (24h timeout).`,match:{lender_name:y.lender_name,match_score:y.match_score,expires_at:x[0].expires_at},total_matches:i.length})}catch(e){return console.error("Error in matching engine:",e),s.NextResponse.json({error:"Internal server error"},{status:500})}}async function c(e,t,o,r,n){console.log("Assigning loan to lender:",{loanId:t.id,match:o,isAutoAccept:n});let i=o.interest_rate||0,a=t.amount||0,s=t.total_installments||1,l=t.repayment_frequency||"monthly",d=4;"weekly"===l?d=1:"biweekly"===l?d=2:"monthly"===l&&(d=4);let p=s*d/52,c=Math.round(i/100*a*p*100)/100,g=Math.round((a+c)*100)/100,x=Math.round(g/s*100)/100;console.log("Interest calculation:",{lenderInterestRate:i,loanAmount:a,totalInstallments:s,loanTermYears:p,totalInterest:c,totalAmount:g,repaymentAmount:x});let f={status:"active",match_status:"matched",matched_at:new Date().toISOString(),interest_rate:i,total_interest:c,total_amount:g,repayment_amount:x,amount_remaining:g,invite_accepted:!0,lender_signed:!0,lender_signed_at:new Date().toISOString(),funds_sent:!1};o.lender_user_id?f.lender_id=o.lender_user_id:o.lender_business_id&&(f.business_lender_id=o.lender_business_id);let{error:h}=await e.from("loans").update(f).eq("id",t.id);if(h)throw console.error("Error updating loan:",h),h;if(s>0){let o=Math.round(a/s*100)/100,r=Math.round(c/s*100)/100,{data:n}=await e.from("payment_schedule").select("id").eq("loan_id",t.id).order("due_date",{ascending:!0});if(n&&n.length>0)for(let t of n)await e.from("payment_schedule").update({amount:x,principal_amount:o,interest_amount:r}).eq("id",t.id)}r&&await e.from("loan_matches").update({status:n?"auto_accepted":"accepted",responded_at:new Date().toISOString(),was_auto_accepted:n}).eq("id",r);let y={last_loan_assigned_at:new Date().toISOString()};return o.lender_user_id?await e.from("lender_preferences").update(y).eq("user_id",o.lender_user_id):o.lender_business_id&&await e.from("lender_preferences").update(y).eq("business_id",o.lender_business_id),await u(e,o,t.amount),await m(e,t,o,n),await e.from("notifications").insert({user_id:t.borrower_id,loan_id:t.id,type:"loan_matched",title:n?"Loan Matched & Approved! \uD83C\uDF89":"Loan Accepted! \uD83C\uDF89",message:`Your loan of ${t.currency} ${t.amount} has been matched with ${o.lender_name}.`}),console.log("Loan successfully assigned to lender"),!0}async function u(e,t,o){let r=t.lender_user_id?"user_id":"business_id",n=t.lender_user_id||t.lender_business_id,{data:i}=await e.from("lender_preferences").select("capital_pool, capital_reserved, total_loans_funded, total_amount_funded").eq(r,n).single();i&&await e.from("lender_preferences").update({capital_reserved:(i.capital_reserved||0)+o,total_loans_funded:(i.total_loans_funded||0)+1,total_amount_funded:(i.total_amount_funded||0)+o}).eq(r,n)}async function g(e,t,o,r){let n=null,i=o.lender_name;if(o.lender_user_id){let{data:t}=await e.from("users").select("email, full_name").eq("id",o.lender_user_id).single();n=t?.email,i=t?.full_name||i}else if(o.lender_business_id){let{data:t}=await e.from("business_profiles").select("contact_email, business_name").eq("id",o.lender_business_id).single();n=t?.contact_email,i=t?.business_name||i}if(n){let e="https://feyza.app",o=`${e}/lender/matches/${r}`;await (0,d.Cz)({to:n,subject:`🎯 New Loan Match: ${t.currency} ${t.amount}`,html:`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <!-- Header with logo -->
            <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
              <!-- Logo -->
              <div style="margin-bottom: 20px;">
                <img src="https://raw.githubusercontent.com/gerardkasemba/feyza/442387cc7eaefdd8a38e999b7dc42a0d526137e6/public/feyza.svg" 
                    alt="Feyza Logo" 
                    style="height: 40px; width: auto; filter: brightness(0) invert(1);">
              </div>
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">🎯 You've Been Matched!</h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">New Loan Opportunity</p>
            </div>
            
            <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
              <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi ${i}! 👋</p>
              
              <p style="color: #166534; line-height: 1.6; margin-bottom: 20px;">
                A borrower matches your lending preferences. Here are the details:
              </p>
              
              <!-- Loan Details Card -->
              <div style="background: white; padding: 25px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.08);">
                <!-- Loan Amount Highlight -->
                <div style="text-align: center; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #e5e7eb;">
                  <p style="color: #047857; margin: 0; font-size: 14px; font-weight: 500;">Loan Amount</p>
                  <p style="font-size: 36px; font-weight: bold; color: #059669; margin: 10px 0;">
                    ${t.currency} ${t.amount.toLocaleString()}
                  </p>
                </div>
                
                <!-- Borrower Details Grid -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                  <div>
                    <p style="color: #047857; margin: 0 0 5px 0; font-size: 14px; font-weight: 500;">Borrower</p>
                    <p style="color: #065f46; margin: 0; font-size: 16px; font-weight: 600;">
                      ${t.borrower?.full_name||"Anonymous"}
                    </p>
                  </div>
                  
                  <div>
                    <p style="color: #047857; margin: 0 0 5px 0; font-size: 14px; font-weight: 500;">Rating</p>
                    <div style="display: inline-block; background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 600;">
                      ${t.borrower?.borrower_rating||"Neutral"}
                    </div>
                  </div>
                  
                  ${t.recipient_country?`
                  <div>
                    <p style="color: #047857; margin: 0 0 5px 0; font-size: 14px; font-weight: 500;">Recipient Country</p>
                    <p style="color: #065f46; margin: 0; font-size: 16px; font-weight: 500;">
                      ${t.recipient_country}
                    </p>
                  </div>
                  `:""}
                  
                  ${t.purpose?`
                  <div>
                    <p style="color: #047857; margin: 0 0 5px 0; font-size: 14px; font-weight: 500;">Purpose</p>
                    <p style="color: #065f46; margin: 0; font-size: 16px; font-weight: 500;">
                      ${t.purpose}
                    </p>
                  </div>
                  `:""}
                </div>
              </div>
              
              <!-- Time Sensitive Alert -->
              <div style="background: linear-gradient(to right, #fef9c3, #fef3c7); border: 1px solid #fde047; border-radius: 8px; padding: 18px; margin: 25px 0; position: relative;">
                <div style="position: absolute; left: 15px; top: 50%; transform: translateY(-50%);">
                  <span style="background: #059669; color: white; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px;">⏰</span>
                </div>
                <div style="margin-left: 35px;">
                  <p style="margin: 0; color: #854d0e; font-size: 14px; line-height: 1.5;">
                    <strong style="color: #059669;">Time Sensitive:</strong> You have 24 hours to accept or decline this loan. 
                    If you don't respond, it will be offered to the next matching lender.
                  </p>
                </div>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${o}" 
                  style="display: inline-block; background: linear-gradient(to right, #059669, #047857); 
                          color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; 
                          font-weight: 600; text-align: center; font-size: 16px;
                          box-shadow: 0 4px 15px rgba(5, 150, 105, 0.25); transition: all 0.2s ease;"
                  onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(5, 150, 105, 0.35)';"
                  onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 15px rgba(5, 150, 105, 0.25)';">
                  Review & Accept Loan →
                </a>
                
                <p style="color: #047857; font-size: 14px; margin-top: 15px; text-align: center;">
                  <a href="${e}/lender/preferences" style="color: #059669; text-decoration: none; font-weight: 500;">
                    💡 Enable auto-accept in your preferences
                  </a>
                </p>
              </div>
              
              <!-- Quick Actions -->
              <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #bbf7d0; margin: 25px 0;">
                <h3 style="color: #065f46; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">Quick Actions</h3>
                <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                  <a href="${e}/lender/loans" 
                    style="display: inline-block; background: #f0fdf4; color: #059669; text-decoration: none; 
                            padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 500; 
                            border: 1px solid #059669; transition: all 0.2s ease;"
                    onmouseover="this.style.background='#dcfce7';"
                    onmouseout="this.style.background='#f0fdf4';">
                    View All Matches
                  </a>
                  <a href="${e}/lender/preferences" 
                    style="display: inline-block; background: #f0fdf4; color: #059669; text-decoration: none; 
                            padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 500; 
                            border: 1px solid #059669; transition: all 0.2s ease;"
                    onmouseover="this.style.background='#dcfce7';"
                    onmouseout="this.style.background='#f0fdf4';">
                    Update Preferences
                  </a>
                </div>
              </div>
              
              <!-- Footer -->
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0; color: #047857; font-size: 14px;">
                <p style="margin: 0 0 10px 0;">Questions about this match?</p>
                <p style="margin: 0;">
                  <a href="${e}/help/lender-matches" style="color: #059669; text-decoration: none; font-weight: 500; margin-right: 15px;">
                    Help Center
                  </a>
                  <a href="mailto:support@feyza.com" style="color: #059669; text-decoration: none; font-weight: 500;">
                    Contact Support
                  </a>
                </p>
              </div>
            </div>
            
            <!-- Signature -->
            <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
              <p style="margin: 0;">Feyza • Smart Loan Matching System</p>
            </div>
          </body>
        </html>
      `})}o.lender_user_id&&await e.from("notifications").insert({user_id:o.lender_user_id,loan_id:t.id,type:"loan_match_offer",title:"\uD83C\uDFAF New Loan Match!",message:`A ${t.currency} ${t.amount} loan matches your preferences. You have 24h to respond.`})}async function m(e,t,o,r){let n="https://feyza.app",i=null,a=o.lender_name;if(o.lender_user_id){let{data:t}=await e.from("users").select("email, full_name").eq("id",o.lender_user_id).single();i=t?.email,a=t?.full_name||a}else if(o.lender_business_id){let{data:t}=await e.from("business_profiles").select("contact_email, business_name").eq("id",o.lender_business_id).single();i=t?.contact_email,a=t?.business_name||a}i&&await (0,d.Cz)({to:i,subject:r?"✅ Loan Auto-Accepted!":"✅ You Accepted a Loan!",html:`
        <!DOCTYPE html>
        <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <!-- Header with gradient background and logo -->
            <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center; position: relative;">
              <!-- Logo -->
              <div style="margin-bottom: 20px;">
                <img src="https://raw.githubusercontent.com/gerardkasemba/feyza/442387cc7eaefdd8a38e999b7dc42a0d526137e6/public/feyza.svg" 
                    alt="Feyza Logo" 
                    style="height: 40px; width: auto; filter: brightness(0) invert(1);">
              </div>
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">${r?"✅ Loan Auto-Accepted!":"✅ Loan Accepted!"}</h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">${r?"Automated matching complete":"Successfully matched with borrower"}</p>
            </div>
            
            <!-- Content area -->
            <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
              <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi ${a}! 👋</p>
              
              <p style="color: #166534; line-height: 1.6; margin-bottom: 20px;">
                ${r?"Your auto-accept setting has successfully matched you with a new loan!":"You have successfully accepted a loan request from a verified borrower."}
              </p>
              
              <!-- Loan details card -->
              <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
                <h3 style="margin: 0 0 20px 0; color: #065f46; font-size: 20px; font-weight: 600; text-align: center;">Loan Details</h3>
                
                <!-- Amount highlight -->
                <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
                  <p style="color: #166534; margin: 0 0 8px 0; font-size: 14px; font-weight: 500;">Loan Amount</p>
                  <p style="font-size: 36px; font-weight: bold; color: #059669; margin: 0 0 8px 0; letter-spacing: -0.5px;">
                    ${t.currency} ${t.amount.toLocaleString()}
                  </p>
                  <p style="color: #047857; margin: 0; font-size: 16px; font-weight: 500;">
                    Interest Rate: <strong>${o.interest_rate}%</strong> p.a.
                  </p>
                </div>
                
                <!-- Borrower info -->
                <div style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
                  <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 15px;">
                    <div>
                      <p style="color: #6b7280; margin: 0 0 5px 0; font-size: 14px;">Borrower</p>
                      <p style="color: #166534; margin: 0; font-weight: 500; font-size: 16px;">
                        ${t.borrower?.full_name||"Anonymous Borrower"}
                      </p>
                    </div>
                    <div>
                      <p style="color: #6b7280; margin: 0 0 5px 0; font-size: 14px;">Loan Purpose</p>
                      <p style="color: #166534; margin: 0; font-weight: 500; font-size: 16px;">
                        ${t.purpose||"Not specified"}
                      </p>
                    </div>
                  </div>
                  
                  ${t.repayment_term?`
                  <div style="margin-top: 20px;">
                    <p style="color: #6b7280; margin: 0 0 5px 0; font-size: 14px;">Repayment Term</p>
                    <p style="color: #166534; margin: 0; font-weight: 500; font-size: 16px;">
                      ${t.repayment_term} ${t.repayment_term_unit||"months"}
                    </p>
                  </div>
                  `:""}
                </div>
              </div>
              
              <!-- Action required notice -->
              <div style="background: linear-gradient(to right, #fef3c7, #fde68a); border: 1px solid #fbbf24; border-radius: 8px; padding: 20px; margin: 20px 0; position: relative;">
                <div style="position: absolute; top: -10px; left: 20px; background: #f59e0b; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                  Action Required
                </div>
                <div style="margin-top: 10px;">
                  <p style="margin: 0 0 10px 0; color: #92400e; font-size: 16px; font-weight: 600;">
                    💰 Send Payment to Borrower
                  </p>
                  <p style="margin: 0; color: #92400e; font-size: 15px;">
                    Please send <strong>${t.currency} ${t.amount.toLocaleString()}</strong> 
                    to the borrower via PayPal within the next 24 hours.
                  </p>
                </div>
              </div>
              
              <!-- CTA Buttons -->
              <div style="display: flex; gap: 15px; margin: 24px 0; flex-wrap: wrap;">
                <a href="${n}/loans/${t.id}" 
                  style="display: inline-block; background: linear-gradient(to right, #059669, #047857); 
                          color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; 
                          font-weight: 600; text-align: center; font-size: 16px; flex: 1; min-width: 200px;
                          box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2); transition: all 0.2s ease;"
                  onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(5, 150, 105, 0.3)';"
                  onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';">
                  View Loan & Send Payment →
                </a>
                
                <a href="${n}/dashboard" 
                  style="display: inline-block; background: white; 
                          color: #059669; text-decoration: none; padding: 16px 32px; border-radius: 8px; 
                          font-weight: 600; text-align: center; font-size: 16px; border: 2px solid #059669;
                          box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1); transition: all 0.2s ease; flex: 1; min-width: 200px;"
                  onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';this.style.background='#f0fdf4';"
                  onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 8px rgba(5, 150, 105, 0.1)';this.style.background='white';">
                  Go to Dashboard
                </a>
              </div>
              
              <!-- Auto-accept info (if applicable) -->
              ${r?`
              <div style="background: #dcfce7; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #86efac;">
                <p style="margin: 0; color: #065f46; font-size: 14px;">
                  ℹ️ <strong>Auto-accept enabled:</strong> This loan was automatically accepted based on your matching preferences. 
                  You can adjust these settings in your <a href="${n}/lender/preferences" style="color: #059669; font-weight: 500; text-decoration: none;">Lender Preferences</a>.
                </p>
              </div>
              `:""}
              
              <!-- Footer -->
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0; color: #047857; font-size: 14px;">
                <p style="margin: 0 0 10px 0;">Need help with the payment process?</p>
                <p style="margin: 0;">
                  <a href="${n}/help/payment-process" style="color: #059669; text-decoration: none; font-weight: 500; margin-right: 15px;">
                    Payment Guide
                  </a>
                  <a href="mailto:support@feyza.com" style="color: #059669; text-decoration: none; font-weight: 500;">
                    Contact Support
                  </a>
                </p>
              </div>
            </div>
            
            <!-- Signature -->
            <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
              <p style="margin: 0;">Feyza • Automated Loan Matching System</p>
            </div>
          </body>
        </html>
      `}),t.borrower?.email&&await (0,d.Cz)({to:t.borrower.email,subject:r?"⚡ Loan Instantly Matched!":"\uD83C\uDF89 Your Loan Has Been Accepted!",html:`
      <!DOCTYPE html>
      <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <!-- Header with logo -->
          <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center; position: relative;">
            <!-- Logo -->
            <div style="margin-bottom: 20px;">
              <img src="https://raw.githubusercontent.com/gerardkasemba/feyza/442387cc7eaefdd8a38e999b7dc42a0d526137e6/public/feyza.svg" 
                  alt="Feyza Logo" 
                  style="height: 40px; width: auto; filter: brightness(0) invert(1);">
            </div>
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">
              ${r?"⚡ Instant Match!":"\uD83C\uDF89 Loan Accepted!"}
            </h1>
            ${r?'<p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">Automatically approved by our system</p>':""}
          </div>
          
          <!-- Content area -->
          <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
            <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi ${t.borrower.full_name||"there"}! 👋</p>
            
            <p style="color: #166534; line-height: 1.6; margin-bottom: 20px;">
              Great news! Your loan has been ${r?"instantly matched and approved":"accepted"} by 
              <strong style="color: #059669;">${a}</strong>.
            </p>
            
            <!-- Loan details card -->
            <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
              <h3 style="margin: 0 0 20px 0; color: #065f46; font-size: 20px; font-weight: 600; text-align: center;">Loan Details</h3>
              
              <div style="text-align: center; margin-bottom: 20px;">
                <p style="color: #6b7280; margin: 0; font-size: 14px;">Loan Amount</p>
                <p style="font-size: 40px; font-weight: bold; color: #059669; margin: 10px 0; letter-spacing: -0.5px;">
                  ${t.currency} ${t.amount.toLocaleString()}
                </p>
              </div>
              
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 25px;">
                <div style="text-align: center; padding: 15px; background: #f0fdf4; border-radius: 8px;">
                  <p style="color: #065f46; margin: 0; font-size: 13px; font-weight: 600;">Interest Rate</p>
                  <p style="color: #059669; margin: 8px 0 0 0; font-size: 22px; font-weight: bold;">${o.interest_rate}%</p>
                  <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 12px;">per annum</p>
                </div>
                
                <div style="text-align: center; padding: 15px; background: #f0fdf4; border-radius: 8px;">
                  <p style="color: #065f46; margin: 0; font-size: 13px; font-weight: 600;">Lender</p>
                  <p style="color: #059669; margin: 8px 0 0 0; font-size: 18px; font-weight: bold;">${a}</p>
                  <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 12px;">Verified Partner</p>
                </div>
              </div>
            </div>
            
            <!-- Next steps -->
            <div style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border: 1px solid #86efac; border-radius: 12px; padding: 20px; margin: 25px 0;">
              <div style="display: flex; align-items: flex-start; gap: 15px;">
                <div style="background: #059669; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                  <span style="font-size: 18px;">💰</span>
                </div>
                <div>
                  <h4 style="margin: 0 0 8px 0; color: #065f46; font-weight: 600;">Next Steps</h4>
                  <p style="margin: 0; color: #166534; line-height: 1.6;">
                    The lender will send <strong>${t.currency} ${t.amount.toLocaleString()}</strong> to your PayPal account. 
                    You'll receive another notification when the payment is sent!
                  </p>
                </div>
              </div>
            </div>
            
            <!-- Timeline -->
            <div style="background: white; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #bbf7d0;">
              <h4 style="color: #065f46; margin: 0 0 15px 0; font-weight: 600;">📋 What Happens Next:</h4>
              <div style="display: flex; flex-direction: column; gap: 15px;">
                <div style="display: flex; align-items: center; gap: 15px;">
                  <div style="background: #059669; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; flex-shrink: 0;">
                    1
                  </div>
                  <div>
                    <p style="color: #166534; margin: 0; font-weight: 500;">Lender prepares payment</p>
                    <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 14px;">Typically within 24 hours</p>
                  </div>
                </div>
                
                <div style="display: flex; align-items: center; gap: 15px;">
                  <div style="background: #86efac; color: #065f46; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; flex-shrink: 0;">
                    2
                  </div>
                  <div>
                    <p style="color: #166534; margin: 0; font-weight: 500;">Payment sent to PayPal</p>
                    <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 14px;">You'll receive payment notification</p>
                  </div>
                </div>
                
                <div style="display: flex; align-items: center; gap: 15px;">
                  <div style="background: #bbf7d0; color: #065f46; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; flex-shrink: 0;">
                    3
                  </div>
                  <div>
                    <p style="color: #166534; margin: 0; font-weight: 500;">Funds available</p>
                    <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 14px;">Start repaying according to schedule</p>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- CTA Button -->
            <a href="${n}/loans/${t.id}" 
              style="display: block; background: linear-gradient(to right, #059669, #047857); 
                      color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; 
                      font-weight: 600; text-align: center; margin: 24px 0; font-size: 16px;
                      box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2); transition: all 0.2s ease;"
              onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(5, 150, 105, 0.3)';"
              onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';">
              View Your Loan Details →
            </a>
            
            <!-- Footer -->
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0; color: #047857; font-size: 14px;">
              <p style="margin: 0 0 10px 0;">Questions about your loan?</p>
              <p style="margin: 0;">
                <a href="${n}/help/loan-acceptance" style="color: #059669; text-decoration: none; font-weight: 500; margin-right: 15px;">
                  Help Center
                </a>
                <a href="mailto:support@feyza.com" style="color: #059669; text-decoration: none; font-weight: 500; margin-right: 15px;">
                  Contact Support
                </a>
                <a href="${n}/contact/${a}" style="color: #059669; text-decoration: none; font-weight: 500;">
                  Contact Lender
                </a>
              </p>
            </div>
          </div>
          
          <!-- Signature -->
          <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
            <p style="margin: 0;">Feyza • Secure Loan Matching</p>
          </div>
        </body>
      </html>
    `})}async function x(e){let{searchParams:t}=new URL(e.url),o=t.get("loan_id");if(!o)return s.NextResponse.json({error:"loan_id is required"},{status:400});let r=await (0,l.k)(),{data:n,error:i}=await r.from("loans").select(`
      id,
      status,
      match_status,
      matched_at,
      match_attempts,
      lender_id,
      business_lender_id,
      current_match_id
    `).eq("id",o).single();if(i||!n)return s.NextResponse.json({error:"Loan not found"},{status:404});let{data:a}=await r.from("loan_matches").select("*").eq("loan_id",o).order("match_rank",{ascending:!0});return s.NextResponse.json({loan_id:n.id,status:n.status,match_status:n.match_status,matched_at:n.matched_at,match_attempts:n.match_attempts,has_lender:!!(n.lender_id||n.business_lender_id),matches:a||[]})}let f=new n.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/matching/route",pathname:"/api/matching",filename:"route",bundlePath:"app/api/matching/route"},resolvedPagePath:"C:\\Users\\GerardKasemba\\feyza\\src\\app\\api\\matching\\route.ts",nextConfigOutput:"",userland:r}),{requestAsyncStorage:h,staticGenerationAsyncStorage:y,serverHooks:b}=f,_="/api/matching/route";function w(){return(0,a.patchFetch)({serverHooks:b,staticGenerationAsyncStorage:y})}},65655:(e,t,o)=>{o.d(t,{f:()=>i,k:()=>a});var r=o(67721),n=o(71615);async function i(){let e=await (0,n.cookies)();return(0,r.createServerClient)("https://mregojhoivbxdvgjrixz.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yZWdvamhvaXZieGR2Z2pyaXh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1ODE1NDQsImV4cCI6MjA4MzE1NzU0NH0.I_jEMf00cFYAdF0akvD-HOqXWExxO3E0BV69EHEa5jI",{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:o,options:r})=>e.set(t,o,r))}catch{}}}})}async function a(){let e=await (0,n.cookies)();return(0,r.createServerClient)("https://mregojhoivbxdvgjrixz.supabase.co",process.env.SUPABASE_SERVICE_ROLE_KEY,{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:o,options:r})=>e.set(t,o,r))}catch{}}}})}}};var t=require("../../../webpack-runtime.js");t.C(e);var o=e=>t(t.s=e),r=t.X(0,[9276,3786,9702,5972,5245,471],()=>o(38858));module.exports=r})();