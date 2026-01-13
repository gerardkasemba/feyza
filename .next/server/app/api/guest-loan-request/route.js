"use strict";(()=>{var e={};e.id=5085,e.ids=[5085],e.modules={72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},61282:e=>{e.exports=require("child_process")},84770:e=>{e.exports=require("crypto")},80665:e=>{e.exports=require("dns")},17702:e=>{e.exports=require("events")},92048:e=>{e.exports=require("fs")},32615:e=>{e.exports=require("http")},35240:e=>{e.exports=require("https")},98216:e=>{e.exports=require("net")},19801:e=>{e.exports=require("os")},55315:e=>{e.exports=require("path")},76162:e=>{e.exports=require("stream")},82452:e=>{e.exports=require("tls")},17360:e=>{e.exports=require("url")},21764:e=>{e.exports=require("util")},71568:e=>{e.exports=require("zlib")},69664:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>b,patchFetch:()=>w,requestAsyncStorage:()=>y,routeModule:()=>h,serverHooks:()=>m,staticGenerationAsyncStorage:()=>f});var o={};r.r(o),r.d(o,{GET:()=>g,POST:()=>c});var s=r(49303),i=r(88716),a=r(60670),n=r(87070),l=r(65655),p=r(20471),d=r(84770),x=r(96797);let u="https://feyza.app";async function c(e){try{let t=await (0,l.k)(),{amount:r,currency:o,purpose:s,full_name:i,email:a,description:c,proposed_frequency:g,proposed_installments:h,proposed_payment_amount:y,payment_method:f,payment_username:m}=await e.json();if(!r||!o||!s||!i||!a)return n.NextResponse.json({error:"Missing required fields"},{status:400});if(r<=0)return n.NextResponse.json({error:"Amount must be greater than 0"},{status:400});if(!f||!m)return n.NextResponse.json({error:"Please specify how you want to receive the loan"},{status:400});if(g&&h){let e=(0,x.R)(r,g,h);if(!e.valid)return n.NextResponse.json({error:e.message},{status:400})}let{data:b}=await t.from("users").select("id").eq("email",a.toLowerCase()).single(),w=(0,d.randomBytes)(32).toString("hex"),v=new Date(Date.now()+6048e5),{data:q,error:k}=await t.from("loan_requests").insert({amount:r,currency:o,purpose:s,description:c,borrower_name:i,borrower_email:a.toLowerCase(),borrower_user_id:b?.id||null,status:"pending",access_token:w,access_token_expires:v.toISOString(),proposed_frequency:g||"monthly",proposed_installments:h||1,proposed_payment_amount:y||r,borrower_payment_method:f,borrower_payment_username:m}).select().single();if(k)throw console.error("Create loan request error:",k),k;return await (0,p.Cz)({to:a,subject:"✅ Loan Request Submitted - Feyza",html:`
        <!DOCTYPE html>
        <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <!-- Header with logo -->
            <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
              <!-- Logo -->
              <div style="margin-bottom: 20px;">
                <img src="https://raw.githubusercontent.com/gerardkasemba/feyza/442387cc7eaefdd8a38e999b7dc42a0d526137e6/public/feyza.svg" 
                    alt="Feyza Logo" 
                    style="height: 40px; width: auto; filter: brightness(0) invert(1);">
              </div>
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">✅ Request Submitted!</h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">Your loan request is now active</p>
            </div>
            
            <!-- Content area -->
            <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
              <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi ${i},</p>
              
              <p style="color: #166534; line-height: 1.6; margin-bottom: 20px;">
                Your loan request has been submitted successfully! Here's what happens next:
              </p>
              
              <!-- Loan details card -->
              <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
                <div style="text-align: center;">
                  <p style="color: #047857; margin: 0 0 8px 0; font-size: 14px; font-weight: 500;">REQUEST AMOUNT</p>
                  <p style="font-size: 36px; font-weight: bold; color: #059669; margin: 0; line-height: 1.2;">
                    ${o} ${r.toLocaleString()}
                  </p>
                  <div style="display: inline-block; background: #dcfce7; color: #065f46; padding: 6px 16px; border-radius: 20px; margin-top: 12px; font-weight: 500; font-size: 14px;">
                    ${s.charAt(0).toUpperCase()+s.slice(1)}
                  </div>
                </div>
              </div>
              
              <!-- Process steps -->
              <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
                <h3 style="color: #065f46; margin: 0 0 20px 0; font-size: 20px; font-weight: 600;">What's Next?</h3>
                
                <div style="display: flex; flex-direction: column; gap: 20px;">
                  <!-- Step 1 -->
                  <div style="display: flex; gap: 15px; align-items: flex-start;">
                    <div style="background: #059669; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; flex-shrink: 0;">1</div>
                    <div>
                      <p style="color: #065f46; margin: 0 0 5px 0; font-weight: 600;">Share Your Request</p>
                      <p style="color: #166534; margin: 0; font-size: 14px; line-height: 1.5;">
                        Send your request link to friends, family, or anyone who might be willing to lend you money.
                      </p>
                    </div>
                  </div>
                  
                  <!-- Step 2 -->
                  <div style="display: flex; gap: 15px; align-items: flex-start;">
                    <div style="background: #059669; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; flex-shrink: 0;">2</div>
                    <div>
                      <p style="color: #065f46; margin: 0 0 5px 0; font-weight: 600;">Wait for a Lender</p>
                      <p style="color: #166534; margin: 0; font-size: 14px; line-height: 1.5;">
                        When someone accepts your request, you'll receive an email notification immediately.
                      </p>
                    </div>
                  </div>
                  
                  <!-- Step 3 -->
                  <div style="display: flex; gap: 15px; align-items: flex-start;">
                    <div style="background: #059669; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; flex-shrink: 0;">3</div>
                    <div>
                      <p style="color: #065f46; margin: 0 0 5px 0; font-weight: 600;">Finalize the Loan</p>
                      <p style="color: #166534; margin: 0; font-size: 14px; line-height: 1.5;">
                        Set up your payment method to receive funds and start your repayment journey.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Primary CTA -->
              <a href="${u}/loan-request/${q.id}?token=${w}" 
                style="display: block; background: linear-gradient(to right, #059669, #047857); 
                        color: white; text-decoration: none; padding: 18px 32px; border-radius: 8px; 
                        font-weight: 600; text-align: center; margin: 24px 0; font-size: 16px;
                        box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2); transition: all 0.2s ease;"
                onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(5, 150, 105, 0.3)';"
                onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';">
                View & Share Your Request →
              </a>
              
              <!-- Tip box -->
              <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #86efac;">
                <div style="display: flex; gap: 12px; align-items: flex-start;">
                  <div style="color: #059669; font-size: 20px; flex-shrink: 0;">💡</div>
                  <div>
                    <p style="color: #065f46; margin: 0 0 8px 0; font-weight: 600;">Sharing Tip</p>
                    <p style="color: #166534; margin: 0; font-size: 14px; line-height: 1.5;">
                      Share your loan request link with people you trust. The more people see it, the faster you'll find a lender!
                    </p>
                  </div>
                </div>
              </div>
              
              <!-- Additional options -->
              <div style="display: flex; gap: 15px; margin-top: 20px; flex-wrap: wrap;">
                <a href="${u}/loans" 
                  style="display: inline-block; background: white; 
                          color: #059669; text-decoration: none; padding: 12px 24px; border-radius: 8px; 
                          font-weight: 500; text-align: center; font-size: 14px; border: 1px solid #059669;
                          box-shadow: 0 2px 6px rgba(5, 150, 105, 0.1); transition: all 0.2s ease;
                          flex: 1; min-width: 150px;"
                  onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 4px 8px rgba(5, 150, 105, 0.15)';this.style.background='#f0fdf4';"
                  onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 6px rgba(5, 150, 105, 0.1)';this.style.background='white';">
                  View All Loans
                </a>
                
                <a href="${u}/help/loan-process" 
                  style="display: inline-block; background: white; 
                          color: #059669; text-decoration: none; padding: 12px 24px; border-radius: 8px; 
                          font-weight: 500; text-align: center; font-size: 14px; border: 1px solid #059669;
                          box-shadow: 0 2px 6px rgba(5, 150, 105, 0.1); transition: all 0.2s ease;
                          flex: 1; min-width: 150px;"
                  onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 4px 8px rgba(5, 150, 105, 0.15)';this.style.background='#f0fdf4';"
                  onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 6px rgba(5, 150, 105, 0.1)';this.style.background='white';">
                  How It Works
                </a>
              </div>
              
              <!-- Footer -->
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0; color: #047857; font-size: 14px;">
                <p style="margin: 0 0 10px 0;">If you have any questions, just reply to this email.</p>
                <p style="margin: 0; font-size: 13px; color: #047857;">
                  <strong>Note:</strong> This link expires in 7 days.
                </p>
              </div>
            </div>
            
            <!-- Signature -->
            <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
              <p style="margin: 0;">Feyza • Loan Request System</p>
            </div>
          </body>
        </html>
      `}),n.NextResponse.json({success:!0,request_id:q.id,message:"Loan request submitted successfully"})}catch(e){return console.error("Guest loan request error:",e),n.NextResponse.json({error:"Failed to submit loan request"},{status:500})}}async function g(e){try{let t=await (0,l.k)(),{searchParams:r}=new URL(e.url),o=parseInt(r.get("limit")||"20"),s=parseInt(r.get("offset")||"0"),{data:i,error:a,count:p}=await t.from("loan_requests").select("*",{count:"exact"}).eq("status","pending").order("created_at",{ascending:!1}).range(s,s+o-1);if(a)throw a;return n.NextResponse.json({requests:i,total:p,limit:o,offset:s})}catch(e){return console.error("Fetch loan requests error:",e),n.NextResponse.json({error:"Failed to fetch loan requests"},{status:500})}}let h=new s.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/guest-loan-request/route",pathname:"/api/guest-loan-request",filename:"route",bundlePath:"app/api/guest-loan-request/route"},resolvedPagePath:"C:\\Users\\GerardKasemba\\feyza\\src\\app\\api\\guest-loan-request\\route.ts",nextConfigOutput:"",userland:o}),{requestAsyncStorage:y,staticGenerationAsyncStorage:f,serverHooks:m}=h,b="/api/guest-loan-request/route";function w(){return(0,a.patchFetch)({serverHooks:m,staticGenerationAsyncStorage:f})}},96797:(e,t,r)=>{r.d(t,{R:()=>o});function o(e,t,r){let o;let s=Math.max(10,.05*e);return e/r<s?{valid:!1,message:`Payment amount is too small. Each payment should be at least $${s.toFixed(0)}.`}:r>(o=e<=100?"weekly"===t?4:1:e<=500?"weekly"===t?8:3:e<=2e3?"monthly"===t?6:24:e<=1e4?"monthly"===t?12:52:"monthly"===t?24:104)?{valid:!1,message:`Repayment period is too long. Maximum ${o} ${t} payments for this loan amount.`}:{valid:!0}}},65655:(e,t,r)=>{r.d(t,{f:()=>i,k:()=>a});var o=r(67721),s=r(71615);async function i(){let e=await (0,s.cookies)();return(0,o.createServerClient)("https://mregojhoivbxdvgjrixz.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yZWdvamhvaXZieGR2Z2pyaXh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1ODE1NDQsImV4cCI6MjA4MzE1NzU0NH0.I_jEMf00cFYAdF0akvD-HOqXWExxO3E0BV69EHEa5jI",{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:r,options:o})=>e.set(t,r,o))}catch{}}}})}async function a(){let e=await (0,s.cookies)();return(0,o.createServerClient)("https://mregojhoivbxdvgjrixz.supabase.co",process.env.SUPABASE_SERVICE_ROLE_KEY,{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:r,options:o})=>e.set(t,r,o))}catch{}}}})}}};var t=require("../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),o=t.X(0,[9276,3786,9702,5972,5245,471],()=>r(69664));module.exports=o})();