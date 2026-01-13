"use strict";(()=>{var e={};e.id=5061,e.ids=[5061],e.modules={72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},61282:e=>{e.exports=require("child_process")},84770:e=>{e.exports=require("crypto")},80665:e=>{e.exports=require("dns")},17702:e=>{e.exports=require("events")},92048:e=>{e.exports=require("fs")},32615:e=>{e.exports=require("http")},35240:e=>{e.exports=require("https")},98216:e=>{e.exports=require("net")},19801:e=>{e.exports=require("os")},55315:e=>{e.exports=require("path")},76162:e=>{e.exports=require("stream")},82452:e=>{e.exports=require("tls")},17360:e=>{e.exports=require("url")},21764:e=>{e.exports=require("util")},71568:e=>{e.exports=require("zlib")},64722:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>f,patchFetch:()=>y,requestAsyncStorage:()=>h,routeModule:()=>g,serverHooks:()=>m,staticGenerationAsyncStorage:()=>u});var i={};r.r(i),r.d(i,{GET:()=>x,POST:()=>p});var o=r(49303),a=r(88716),n=r(60670),s=r(87070),l=r(65655),d=r(20471);async function p(e){try{let t=e.headers.get("authorization"),r=process.env.CRON_SECRET;if(r&&t!==`Bearer ${r}`)return s.NextResponse.json({error:"Unauthorized"},{status:401});let i=await (0,l.k)(),o=new Date,a=0,n=0,p=0,{data:x,error:g}=await i.from("loan_matches").select(`
        *,
        loan:loans(
          id,
          amount,
          currency,
          borrower_id,
          match_status,
          borrower:users!borrower_id(email, full_name)
        )
      `).eq("status","pending").lt("expires_at",o.toISOString());if(g)return console.error("Error fetching expired matches:",g),s.NextResponse.json({error:"Failed to fetch expired matches"},{status:500});if(!x||0===x.length)return s.NextResponse.json({success:!0,message:"No expired matches to process",processed:0});for(let e of Array.from(new Set(x.map(e=>e.loan_id)))){let t=x.filter(t=>t.loan_id===e),r=t[0]?.loan;if(!r||"matched"===r.match_status)continue;let o=t.map(e=>e.id);for(let e of(await i.from("loan_matches").update({status:"expired"}).in("id",o),a+=o.length,t)){let t=e.lender_user_id?"user_id":"business_id",r=e.lender_user_id||e.lender_business_id,{data:o}=await i.from("lender_preferences").select("acceptance_rate, total_loans_funded").eq(t,r).single();if(o){let e=(o.total_loans_funded||0)+1,a=(o.acceptance_rate||100)*(o.total_loans_funded||0)/e;await i.from("lender_preferences").update({acceptance_rate:Math.max(0,a)}).eq(t,r)}}let{data:s}=await i.from("loan_matches").select("*").eq("loan_id",e).eq("status","pending").order("match_rank",{ascending:!0}).limit(1).single();if(s)await c(i,r,s),await i.from("loans").update({current_match_id:s.id}).eq("id",e),n++;else{if(await i.from("loans").update({match_status:"no_match",current_match_id:null}).eq("id",e),r.borrower?.email){let e="https://feyza.app";await (0,d.Cz)({to:r.borrower.email,subject:"\uD83D\uDE14 Unable to Find a Matching Lender",html:`
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
                    <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">😔 Unable to Find a Matching Lender</h1>
                  </div>
                  
                  <!-- Content area with green theme -->
                  <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
                    <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi ${r.borrower.full_name||"there"},</p>
                    
                    <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
                      <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 20px; font-weight: 600;">Loan Request Status</h3>
                      <p style="color: #166534; line-height: 1.6; margin-bottom: 20px;">
                        We were unable to find a lender for your 
                        <strong style="color: #059669;">${r.currency} ${r.amount.toLocaleString()}</strong> 
                        loan request.
                      </p>
                      
                      <h4 style="color: #065f46; margin: 25px 0 15px 0; font-weight: 600;">Why this might happen:</h4>
                      <ul style="margin: 0; padding-left: 20px; color: #065f46;">
                        <li style="margin-bottom: 10px; line-height: 1.6; padding-left: 5px;">No lenders matched your criteria at this time</li>
                        <li style="margin-bottom: 10px; line-height: 1.6; padding-left: 5px;">Available lenders didn't respond within the required timeframe</li>
                        <li style="margin-bottom: 10px; line-height: 1.6; padding-left: 5px;">The loan amount or terms didn't match current lender preferences</li>
                        <li style="line-height: 1.6; padding-left: 5px;">Market conditions may have temporarily affected lender availability</li>
                      </ul>
                    </div>
                    
                    <!-- Action section -->
                    <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
                      <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 20px; font-weight: 600;">What You Can Do</h3>
                      <p style="color: #166534; line-height: 1.6; margin-bottom: 20px;">
                        You can submit a new loan request with different terms, or try again later when more lenders are available.
                      </p>
                      
                      <!-- CTA Buttons -->
                      <div style="display: flex; gap: 15px; margin-top: 25px; flex-wrap: wrap;">
                        <a href="${e}/loans/new" 
                          style="display: inline-block; background: linear-gradient(to right, #059669, #047857); 
                                  color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; 
                                  font-weight: 600; text-align: center; font-size: 16px;
                                  box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2); transition: all 0.2s ease;
                                  flex: 1; min-width: 200px;"
                          onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(5, 150, 105, 0.3)';"
                          onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';">
                          Submit New Request →
                        </a>
                        
                        <a href="${e}/loans" 
                          style="display: inline-block; background: white; 
                                  color: #059669; text-decoration: none; padding: 14px 28px; border-radius: 8px; 
                                  font-weight: 600; text-align: center; font-size: 16px; border: 2px solid #059669;
                                  box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1); transition: all 0.2s ease;
                                  flex: 1; min-width: 200px;"
                          onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';this.style.background='#f0fdf4';"
                          onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 8px rgba(5, 150, 105, 0.1)';this.style.background='white';">
                          View My Loans
                        </a>
                      </div>
                    </div>
                    
                    <!-- Tips section -->
                    <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #86efac;">
                      <h4 style="color: #065f46; margin: 0 0 10px 0; font-weight: 600;">💡 Tips for Success:</h4>
                      <ul style="margin: 0; padding-left: 20px; color: #065f46;">
                        <li style="margin-bottom: 8px; font-size: 14px;">Consider adjusting the loan amount or repayment terms</li>
                        <li style="margin-bottom: 8px; font-size: 14px;">Try during business hours when lenders are most active</li>
                        <li style="font-size: 14px;">Ensure your profile information is complete and up-to-date</li>
                      </ul>
                    </div>
                    
                    <!-- Footer -->
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0; color: #047857; font-size: 14px;">
                      <p style="margin: 0 0 10px 0;">Need assistance with your loan request?</p>
                      <p style="margin: 0;">
                        <a href="${e}/help/loan-requests" style="color: #059669; text-decoration: none; font-weight: 500; margin-right: 15px;">
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
                    <p style="margin: 0;">Feyza • Automated Loan Matching System</p>
                  </div>
                </body>
              </html>
            `})}await i.from("notifications").insert({user_id:r.borrower_id,loan_id:e,type:"no_match",title:"Unable to Find a Lender",message:`We couldn't find a matching lender for your ${r.currency} ${r.amount} loan request.`}),p++}}return s.NextResponse.json({success:!0,timestamp:o.toISOString(),expiredMatches:a,cascadedToNextLender:n,noMatchLoans:p})}catch(e){return console.error("Error processing expired matches:",e),s.NextResponse.json({error:"Internal server error"},{status:500})}}async function c(e,t,r){let i=null,o="Lender";if(r.lender_user_id){let{data:t}=await e.from("users").select("email, full_name").eq("id",r.lender_user_id).single();i=t?.email,o=t?.full_name||"Lender"}else if(r.lender_business_id){let{data:t}=await e.from("business_profiles").select("contact_email, business_name").eq("id",r.lender_business_id).single();i=t?.contact_email,o=t?.business_name||"Lender"}let a=r.lender_user_id?"user_id":"business_id",n=r.lender_user_id||r.lender_business_id,{data:s}=await e.from("lender_preferences").select("auto_accept, interest_rate").eq(a,n).single();if(s?.auto_accept){let i={status:"active",match_status:"matched",matched_at:new Date().toISOString(),interest_rate:s.interest_rate};if(r.lender_user_id?i.lender_id=r.lender_user_id:i.business_lender_id=r.lender_business_id,await e.from("loans").update(i).eq("id",t.id),await e.from("loan_matches").update({status:"auto_accepted",was_auto_accepted:!0,responded_at:new Date().toISOString()}).eq("id",r.id),t.borrower?.email){let e="https://feyza.app";await (0,d.Cz)({to:t.borrower.email,subject:"⚡ Loan Matched with New Lender!",html:`
          <!DOCTYPE html>
          <html>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <!-- Header with gradient background and logo -->
              <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center; position: relative;">
                <!-- Logo -->
                <div style="margin-bottom: 15px;">
                  <img src="https://raw.githubusercontent.com/gerardkasemba/feyza/442387cc7eaefdd8a38e999b7dc42a0d526137e6/public/feyza.svg" 
                      alt="Feyza Logo" 
                      style="height: 40px; width: auto; filter: brightness(0) invert(1);">
                </div>
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">⚡ Loan Matched!</h1>
                <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 16px;">Your request has been connected with a lender</p>
              </div>
              
              <!-- Content area -->
              <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
                <p style="font-size: 18px; color: #166534; margin-bottom: 10px;">Hi ${t.borrower.full_name||"there"}! 👋</p>
                <p style="color: #166534; line-height: 1.6; margin-bottom: 25px;">
                  Great news! Your loan has been successfully matched with 
                  <strong style="color: #059669; font-weight: 600;">${o}</strong>.
                </p>
                
                <!-- Loan details card -->
                <div style="background: white; padding: 30px; border-radius: 16px; margin: 25px 0; border: 1px solid #bbf7d0; text-align: center; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.1);">
                  <div style="margin-bottom: 20px;">
                    <div style="display: inline-block; background: #dcfce7; padding: 10px 20px; border-radius: 50px; margin-bottom: 15px;">
                      <span style="color: #059669; font-weight: 600; font-size: 14px;">MATCHED</span>
                    </div>
                    <p style="color: #065f46; margin: 5px 0; font-size: 14px;">Connected with: <strong>${o}</strong></p>
                  </div>
                  
                  <div style="margin: 25px 0;">
                    <p style="color: #6b7280; margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Loan Amount</p>
                    <p style="font-size: 42px; font-weight: 700; color: #059669; margin: 10px 0; line-height: 1;">
                      ${t.currency} ${t.amount.toLocaleString()}
                    </p>
                  </div>
                  
                  <div style="display: flex; justify-content: center; gap: 30px; margin-top: 30px; flex-wrap: wrap;">
                    <div style="text-align: center;">
                      <div style="background: #f0fdf4; width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; border: 2px solid #059669;">
                        <span style="color: #059669; font-size: 20px;">📋</span>
                      </div>
                      <p style="color: #065f46; margin: 0; font-size: 14px; font-weight: 600;">Review Details</p>
                    </div>
                    
                    <div style="text-align: center;">
                      <div style="background: #f0fdf4; width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; border: 2px solid #059669;">
                        <span style="color: #059669; font-size: 20px;">🤝</span>
                      </div>
                      <p style="color: #065f46; margin: 0; font-size: 14px; font-weight: 600;">Connect with Lender</p>
                    </div>
                    
                    <div style="text-align: center;">
                      <div style="background: #f0fdf4; width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; border: 2px solid #059669;">
                        <span style="color: #059669; font-size: 20px;">📄</span>
                      </div>
                      <p style="color: #065f46; margin: 0; font-size: 14px; font-weight: 600;">Next Steps</p>
                    </div>
                  </div>
                </div>
                
                <!-- CTA Button -->
                <a href="${e}/loans/${t.id}" 
                  style="display: block; background: linear-gradient(to right, #059669, #047857); 
                          color: white; text-decoration: none; padding: 18px 32px; border-radius: 10px; 
                          font-weight: 600; text-align: center; margin: 30px 0; font-size: 18px;
                          box-shadow: 0 6px 16px rgba(5, 150, 105, 0.25); transition: all 0.3s ease;"
                  onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 10px 25px rgba(5, 150, 105, 0.35)';"
                  onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 6px 16px rgba(5, 150, 105, 0.25)';">
                  View Your Loan Details →
                </a>
                
                <!-- Next steps -->
                <div style="background: #dcfce7; padding: 20px; border-radius: 10px; margin: 25px 0; border: 1px solid #86efac;">
                  <h4 style="color: #065f46; margin: 0 0 15px 0; font-weight: 600; font-size: 16px;">📋 What happens next:</h4>
                  <ol style="margin: 0; padding-left: 20px; color: #065f46;">
                    <li style="margin-bottom: 10px; line-height: 1.5;">Review the loan terms and lender details</li>
                    <li style="margin-bottom: 10px; line-height: 1.5;">Communicate with ${o} to finalize arrangements</li>
                    <li style="line-height: 1.5;">Complete any required documentation</li>
                  </ol>
                </div>
                
                <!-- Footer -->
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0; color: #047857; font-size: 14px;">
                  <p style="margin: 0 0 10px 0;">Need help with your matched loan?</p>
                  <p style="margin: 0;">
                    <a href="${e}/help/matched-loans" style="color: #059669; text-decoration: none; font-weight: 500; margin-right: 15px;">
                      View Help Guide
                    </a>
                    <a href="mailto:support@feyza.com" style="color: #059669; text-decoration: none; font-weight: 500;">
                      Contact Support
                    </a>
                  </p>
                </div>
              </div>
              
              <!-- Signature -->
              <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
                <p style="margin: 0;">Feyza • Smart Loan Matching Platform</p>
                <p style="margin: 5px 0 0 0; font-size: 11px; color: #9ca3af;">This is an automated message. Please do not reply directly.</p>
              </div>
            </body>
          </html>
        `})}return}if(i){let e="https://feyza.app";await (0,d.Cz)({to:i,subject:`🎯 New Loan Available: ${t.currency} ${t.amount.toLocaleString()}`,html:`
        <!DOCTYPE html>
        <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <!-- Header with logo and gradient -->
            <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
              <!-- Logo -->
              <div style="margin-bottom: 15px;">
                <img src="https://raw.githubusercontent.com/gerardkasemba/feyza/442387cc7eaefdd8a38e999b7dc42a0d526137e6/public/feyza.svg" 
                    alt="Feyza Logo" 
                    style="height: 40px; width: auto; filter: brightness(0) invert(1);">
              </div>
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">🎯 Loan Match Available!</h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 16px;">A new opportunity awaits</p>
            </div>
            
            <!-- Main content -->
            <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
              <p style="font-size: 18px; color: #166534; margin-bottom: 15px;">Hi ${o}! 👋</p>
              
              <p style="color: #166534; line-height: 1.6; margin-bottom: 25px;">
                A loan that matches your preferences is now available <strong style="color: #059669;">(the previous lender didn't respond)</strong>.
              </p>
              
              <!-- Loan amount highlight -->
              <div style="background: white; padding: 30px; border-radius: 12px; margin: 25px 0; text-align: center; border: 2px solid #059669; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.1);">
                <p style="font-size: 14px; color: #047857; margin: 0 0 10px 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">AVAILABLE LOAN AMOUNT</p>
                <p style="font-size: 48px; font-weight: 700; color: #059669; margin: 0; line-height: 1;">
                  ${t.currency} ${t.amount.toLocaleString()}
                </p>
                <div style="height: 4px; width: 60px; background: linear-gradient(to right, #059669, #047857); margin: 15px auto; border-radius: 2px;"></div>
                <p style="color: #065f46; font-size: 14px; margin: 15px 0 0 0;">
                  Matches your lending preferences
                </p>
              </div>
              
              <!-- Urgency notice -->
              <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 18px; border-radius: 8px; margin: 25px 0; border: 1px solid #fbbf24;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <div style="background: #d97706; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;">
                    ⏰
                  </div>
                  <div>
                    <h3 style="margin: 0 0 5px 0; color: #92400e; font-size: 16px; font-weight: 600;">Time-Sensitive Opportunity</h3>
                    <p style="margin: 0; color: #92400e; font-size: 14px;">
                      You have <strong>24 hours</strong> to review and respond to this loan request.
                    </p>
                  </div>
                </div>
              </div>
              
              <!-- Additional info (optional - could include borrower details if available) -->
              <div style="background: white; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #bbf7d0;">
                <h3 style="color: #065f46; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">Why this is a great match:</h3>
                <ul style="margin: 0; padding-left: 20px; color: #166534;">
                  <li style="margin-bottom: 8px; line-height: 1.5;">Matches your preferred loan amount range</li>
                  <li style="margin-bottom: 8px; line-height: 1.5;">Fits within your risk tolerance parameters</li>
                  <li style="line-height: 1.5;">Aligns with your selected industry preferences</li>
                </ul>
              </div>
              
              <!-- Primary CTA -->
              <a href="${e}/lender/matches/${r.id}" 
                style="display: block; background: linear-gradient(to right, #059669, #047857); 
                        color: white; text-decoration: none; padding: 18px 32px; border-radius: 8px; 
                        font-weight: 600; text-align: center; margin: 30px 0; font-size: 18px;
                        box-shadow: 0 6px 16px rgba(5, 150, 105, 0.25); transition: all 0.2s ease;"
                onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 20px rgba(5, 150, 105, 0.35)';"
                onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 6px 16px rgba(5, 150, 105, 0.25)';">
                Review & Accept Loan Match →
              </a>
              
              <!-- Secondary action -->
              <div style="text-align: center; margin-top: 20px;">
                <p style="color: #047857; font-size: 14px; margin: 0 0 10px 0;">
                  Need to adjust your matching preferences?
                </p>
                <a href="${e}/lender/preferences" 
                  style="color: #059669; text-decoration: none; font-weight: 500; font-size: 14px;
                          border-bottom: 1px solid #059669;">
                  Update Lender Preferences
                </a>
              </div>
              
              <!-- Footer -->
              <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #bbf7d0; color: #047857; font-size: 14px;">
                <p style="margin: 0 0 10px 0;">This is an exclusive opportunity based on your matching criteria.</p>
                <p style="margin: 0;">
                  <a href="${e}/lender/matches" style="color: #059669; text-decoration: none; font-weight: 500; margin-right: 15px;">
                    View All Matches
                  </a>
                  <a href="mailto:support@feyza.com" style="color: #059669; text-decoration: none; font-weight: 500;">
                    Get Help
                  </a>
                </p>
              </div>
            </div>
            
            <!-- Signature -->
            <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
              <p style="margin: 0;">Feyza • Smart Loan Matching • This is an automated notification</p>
            </div>
          </body>
        </html>
      `})}r.lender_user_id&&await e.from("notifications").insert({user_id:r.lender_user_id,loan_id:t.id,type:"loan_match_offer",title:"\uD83C\uDFAF Loan Match Available!",message:`A ${t.currency} ${t.amount.toLocaleString()} loan is now available. You have 24h to respond.`})}async function x(e){return s.NextResponse.json({status:"ok",message:"Match expiry cron endpoint. POST to process expired matches."})}let g=new o.AppRouteRouteModule({definition:{kind:a.x.APP_ROUTE,page:"/api/cron/match-expiry/route",pathname:"/api/cron/match-expiry",filename:"route",bundlePath:"app/api/cron/match-expiry/route"},resolvedPagePath:"C:\\Users\\GerardKasemba\\feyza\\src\\app\\api\\cron\\match-expiry\\route.ts",nextConfigOutput:"",userland:i}),{requestAsyncStorage:h,staticGenerationAsyncStorage:u,serverHooks:m}=g,f="/api/cron/match-expiry/route";function y(){return(0,n.patchFetch)({serverHooks:m,staticGenerationAsyncStorage:u})}},65655:(e,t,r)=>{r.d(t,{f:()=>a,k:()=>n});var i=r(67721),o=r(71615);async function a(){let e=await (0,o.cookies)();return(0,i.createServerClient)("https://mregojhoivbxdvgjrixz.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yZWdvamhvaXZieGR2Z2pyaXh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1ODE1NDQsImV4cCI6MjA4MzE1NzU0NH0.I_jEMf00cFYAdF0akvD-HOqXWExxO3E0BV69EHEa5jI",{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:r,options:i})=>e.set(t,r,i))}catch{}}}})}async function n(){let e=await (0,o.cookies)();return(0,i.createServerClient)("https://mregojhoivbxdvgjrixz.supabase.co",process.env.SUPABASE_SERVICE_ROLE_KEY,{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:r,options:i})=>e.set(t,r,i))}catch{}}}})}}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),i=t.X(0,[9276,3786,9702,5972,5245,471],()=>r(64722));module.exports=i})();