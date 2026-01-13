"use strict";(()=>{var e={};e.id=620,e.ids=[620],e.modules={72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},61282:e=>{e.exports=require("child_process")},84770:e=>{e.exports=require("crypto")},80665:e=>{e.exports=require("dns")},17702:e=>{e.exports=require("events")},92048:e=>{e.exports=require("fs")},32615:e=>{e.exports=require("http")},35240:e=>{e.exports=require("https")},98216:e=>{e.exports=require("net")},19801:e=>{e.exports=require("os")},55315:e=>{e.exports=require("path")},76162:e=>{e.exports=require("stream")},82452:e=>{e.exports=require("tls")},17360:e=>{e.exports=require("url")},21764:e=>{e.exports=require("util")},71568:e=>{e.exports=require("zlib")},39217:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>w,patchFetch:()=>_,requestAsyncStorage:()=>h,routeModule:()=>f,serverHooks:()=>v,staticGenerationAsyncStorage:()=>b});var o={};r.r(o),r.d(o,{GET:()=>g,POST:()=>y});var n=r(49303),a=r(88716),s=r(60670),i=r(87070),l=r(65655),p=r(20471),d=r(84770),u=r(31787),c=r(55606),m=r(96797);let x="https://feyza.app";async function g(e,{params:t}){try{let r=await (0,l.k)(),{id:o}=await t,{searchParams:n}=new URL(e.url),a=n.get("token");if(!a)return i.NextResponse.json({error:"Token is required"},{status:400});let{data:s,error:p}=await r.from("loans").select(`
        id, 
        amount, 
        currency, 
        purpose, 
        borrower_invite_email, 
        status, 
        invite_token,
        repayment_frequency,
        total_installments,
        repayment_amount,
        borrower_payment_method,
        borrower_payment_username
      `).eq("id",o).single();if(p||!s)return i.NextResponse.json({error:"Loan not found"},{status:404});if(s.invite_token!==a)return i.NextResponse.json({error:"Invalid token"},{status:403});let d=null,{data:u}=await r.from("loan_requests").select("borrower_name").eq("loan_id",o).single();u?.borrower_name?d=u.borrower_name:s.borrower_invite_email&&(d=s.borrower_invite_email.split("@")[0]);let c={...s,borrower_name:d,proposed_frequency:s.repayment_frequency,proposed_installments:s.total_installments,proposed_payment_amount:s.repayment_amount};return i.NextResponse.json({loan:c})}catch(e){return console.error("Fetch loan for setup error:",e),i.NextResponse.json({error:"Internal server error"},{status:500})}}async function y(e,{params:t}){try{var r,o;let n=await (0,l.k)(),{id:a}=await t,s=await e.json();console.log("Setup loan request body:",s);let{token:g,interest_rate:y,interest_type:f,repayment_frequency:h,total_installments:b,start_date:v,payment_method:w,payment_username:_}=s;if(!g)return i.NextResponse.json({error:"Token is required"},{status:400});let{data:k,error:q}=await n.from("loans").select("*").eq("id",a).single();if(q||!k)return console.error("Loan fetch error:",q),i.NextResponse.json({error:"Loan not found"},{status:404});if(k.invite_token!==g)return i.NextResponse.json({error:"Invalid token"},{status:403});let R=k.borrower_invite_email,j="there";if(k.borrower_id){let{data:e}=await n.from("users").select("email, full_name").eq("id",k.borrower_id).single();e&&(R=e.email,j=e.full_name||"there")}let z=(0,m.R)(k.amount,h,b);z.valid||console.warn("Repayment schedule validation warning:",z.message);let S=k.amount,I=(y||0)/100,E=0;if("simple"===f)E=S*I*(b/12);else if(I>0){let e="weekly"===h?52:"biweekly"===h?26:12;E=S*Math.pow(1+I/e,b)-S}let M=S+E,N=M/b,L=(0,d.randomBytes)(32).toString("hex"),A={interest_rate:y||0,interest_type:f||"simple",total_interest:Math.round(100*E)/100,total_amount:Math.round(100*M)/100,repayment_frequency:h,repayment_amount:Math.round(100*N)/100,total_installments:b,start_date:v,status:"active",invite_token:L,invite_accepted:!0,lender_preferred_payment_method:w||null};"paypal"===w?A.lender_paypal_email=_:"cashapp"===w?A.lender_cashapp_username=_:"venmo"===w&&(A.lender_venmo_username=_);let{error:C}=await n.from("loans").update(A).eq("id",a);if(C)return console.error("Loan update error:",C),i.NextResponse.json({error:"Failed to update loan terms",details:C.message,hint:C.hint||"Check that all status values are valid"},{status:500});await n.from("payment_schedule").delete().eq("loan_id",a);let $=[],F=new Date(v),P=S/b,D=E/b;for(let e=0;e<b;e++)($.push({loan_id:a,due_date:(0,u.WU)(F,"yyyy-MM-dd"),amount:Math.round(100*N)/100,principal_amount:Math.round(100*P)/100,interest_amount:Math.round(100*D)/100,is_paid:!1,status:"pending"}),"weekly"===h)?(r=F,F=(0,c.E)(r,7)):"biweekly"===h?(o=F,F=(0,c.E)(o,14)):F=(0,c.E)(F,30);let{error:O}=await n.from("payment_schedule").insert($);if(O&&console.error("Schedule insert error:",O),R)try{await (0,p.Cz)({to:R,subject:"\uD83D\uDCCB Loan terms are ready for your review",html:`
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
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">📋 Loan Terms Ready</h1>
                <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">Review Your Loan Agreement</p>
              </div>
              
              <!-- Content area -->
              <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
                <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi ${j},</p>
                
                <p style="color: #166534; line-height: 1.6; margin-bottom: 20px;">
                  Great news! Your lender has set the terms for your loan. Please review them carefully before proceeding.
                </p>
                
                <!-- Loan Terms Summary Card -->
                <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
                  <h3 style="margin: 0 0 20px 0; color: #065f46; font-size: 20px; font-weight: 600; padding-bottom: 10px; border-bottom: 2px solid #f0fdf4;">
                    📊 Loan Terms Summary
                  </h3>
                  
                  <div style="display: grid; gap: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f0fdf4;">
                      <span style="color: #047857; font-weight: 500;">Loan Amount:</span>
                      <strong style="color: #059669; font-size: 18px;">${k.currency} ${k.amount.toLocaleString()}</strong>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f0fdf4;">
                      <span style="color: #047857; font-weight: 500;">Interest Rate:</span>
                      <strong style="color: #059669;">${y||0}% (${f})</strong>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f0fdf4;">
                      <span style="color: #047857; font-weight: 500;">Total Repayment:</span>
                      <strong style="color: #059669; font-size: 18px;">${k.currency} ${Math.round(M).toLocaleString()}</strong>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f0fdf4;">
                      <span style="color: #047857; font-weight: 500;">Payment Amount:</span>
                      <strong style="color: #059669;">${k.currency} ${Math.round(N).toLocaleString()} ${h}</strong>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0;">
                      <span style="color: #047857; font-weight: 500;">First Payment Due:</span>
                      <strong style="color: #059669;">${(0,u.WU)(new Date(v),"MMM d, yyyy")}</strong>
                    </div>
                  </div>
                  
                  <!-- Important Note -->
                  <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #d97706;">
                    <p style="color: #92400e; margin: 0; font-size: 14px; line-height: 1.5;">
                      ⚠️ <strong>Important:</strong> Review all terms carefully. Once accepted, these terms become legally binding.
                    </p>
                  </div>
                </div>
                
                <!-- Action Buttons -->
                <div style="display: flex; gap: 15px; margin: 30px 0; flex-wrap: wrap;">
                  <a href="${x}/borrower/${k.borrower_access_token}" 
                    style="display: inline-block; background: linear-gradient(to right, #059669, #047857); 
                            color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; 
                            font-weight: 600; text-align: center; font-size: 16px; flex: 1;
                            box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2); transition: all 0.2s ease; min-width: 200px;"
                    onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(5, 150, 105, 0.3)';"
                    onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';">
                    Review & Accept Terms →
                  </a>
                  
                  <a href="${x}/help/loan-agreements" 
                    style="display: inline-block; background: white; 
                            color: #059669; text-decoration: none; padding: 16px 32px; border-radius: 8px; 
                            font-weight: 600; text-align: center; font-size: 16px; border: 2px solid #059669;
                            box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1); transition: all 0.2s ease; flex: 1;
                            min-width: 200px;"
                    onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';this.style.background='#f0fdf4';"
                    onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 8px rgba(5, 150, 105, 0.1)';this.style.background='white';">
                    Need Help?
                  </a>
                </div>
                
                <!-- Next Steps -->
                <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #86efac;">
                  <h4 style="color: #065f46; margin: 0 0 15px 0; font-weight: 600;">📝 What Happens Next:</h4>
                  <ul style="margin: 0; padding-left: 20px; color: #065f46;">
                    <li style="margin-bottom: 8px; line-height: 1.5;">Review all terms and conditions carefully</li>
                    <li style="margin-bottom: 8px; line-height: 1.5;">Accept the terms to proceed with funding</li>
                    <li style="line-height: 1.5;">Once accepted, funds will be disbursed according to the agreed timeline</li>
                  </ul>
                </div>
                
                <!-- Deadline Reminder -->
                <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #d97706;">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="color: #92400e; font-size: 18px;">⏰</span>
                    <div>
                      <p style="color: #92400e; margin: 0; font-weight: 600;">Response Required</p>
                      <p style="color: #92400e; margin: 5px 0 0 0; font-size: 14px;">Please review and respond within 48 hours to avoid expiration of these terms.</p>
                    </div>
                  </div>
                </div>
                
                <!-- Footer -->
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0; color: #047857; font-size: 14px;">
                  <p style="margin: 0 0 10px 0;">Questions about these terms?</p>
                  <p style="margin: 0;">
                    <a href="mailto:support@feyza.com" style="color: #059669; text-decoration: none; font-weight: 500;">
                      Contact our support team for assistance
                    </a>
                  </p>
                </div>
              </div>
              
              <!-- Signature -->
              <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
                <p style="margin: 0;">Feyza • Secure Loan Management</p>
              </div>
            </body>
          </html>
        `})}catch(e){console.error("Email send error:",e)}return i.NextResponse.json({success:!0,lender_token:L,message:"Loan terms saved successfully"})}catch(e){return console.error("Save loan terms error:",e),i.NextResponse.json({error:"Internal server error",details:String(e)},{status:500})}}let f=new n.AppRouteRouteModule({definition:{kind:a.x.APP_ROUTE,page:"/api/lender/setup-loan/[id]/route",pathname:"/api/lender/setup-loan/[id]",filename:"route",bundlePath:"app/api/lender/setup-loan/[id]/route"},resolvedPagePath:"C:\\Users\\GerardKasemba\\feyza\\src\\app\\api\\lender\\setup-loan\\[id]\\route.ts",nextConfigOutput:"",userland:o}),{requestAsyncStorage:h,staticGenerationAsyncStorage:b,serverHooks:v}=f,w="/api/lender/setup-loan/[id]/route";function _(){return(0,s.patchFetch)({serverHooks:v,staticGenerationAsyncStorage:b})}},96797:(e,t,r)=>{r.d(t,{R:()=>o});function o(e,t,r){let o;let n=Math.max(10,.05*e);return e/r<n?{valid:!1,message:`Payment amount is too small. Each payment should be at least $${n.toFixed(0)}.`}:r>(o=e<=100?"weekly"===t?4:1:e<=500?"weekly"===t?8:3:e<=2e3?"monthly"===t?6:24:e<=1e4?"monthly"===t?12:52:"monthly"===t?24:104)?{valid:!1,message:`Repayment period is too long. Maximum ${o} ${t} payments for this loan amount.`}:{valid:!0}}},65655:(e,t,r)=>{r.d(t,{f:()=>a,k:()=>s});var o=r(67721),n=r(71615);async function a(){let e=await (0,n.cookies)();return(0,o.createServerClient)("https://mregojhoivbxdvgjrixz.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yZWdvamhvaXZieGR2Z2pyaXh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1ODE1NDQsImV4cCI6MjA4MzE1NzU0NH0.I_jEMf00cFYAdF0akvD-HOqXWExxO3E0BV69EHEa5jI",{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:r,options:o})=>e.set(t,r,o))}catch{}}}})}async function s(){let e=await (0,n.cookies)();return(0,o.createServerClient)("https://mregojhoivbxdvgjrixz.supabase.co",process.env.SUPABASE_SERVICE_ROLE_KEY,{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:r,options:o})=>e.set(t,r,o))}catch{}}}})}},55606:(e,t,r)=>{r.d(t,{E:()=>a});var o=r(79109),n=r(44549);function a(e,t){let r=(0,o.Q)(e);return isNaN(t)?(0,n.L)(e,NaN):(t&&r.setDate(r.getDate()+t),r)}}};var t=require("../../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),o=t.X(0,[9276,3786,9702,1199,5972,5245,1787,471],()=>r(39217));module.exports=o})();