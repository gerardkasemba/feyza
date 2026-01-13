"use strict";(()=>{var e={};e.id=1500,e.ids=[1500],e.modules={72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},61282:e=>{e.exports=require("child_process")},84770:e=>{e.exports=require("crypto")},80665:e=>{e.exports=require("dns")},17702:e=>{e.exports=require("events")},92048:e=>{e.exports=require("fs")},32615:e=>{e.exports=require("http")},35240:e=>{e.exports=require("https")},98216:e=>{e.exports=require("net")},19801:e=>{e.exports=require("os")},55315:e=>{e.exports=require("path")},76162:e=>{e.exports=require("stream")},82452:e=>{e.exports=require("tls")},17360:e=>{e.exports=require("url")},21764:e=>{e.exports=require("util")},71568:e=>{e.exports=require("zlib")},51140:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>h,patchFetch:()=>f,requestAsyncStorage:()=>g,routeModule:()=>x,serverHooks:()=>b,staticGenerationAsyncStorage:()=>y});var o={};r.r(o),r.d(o,{POST:()=>m});var a=r(49303),n=r(88716),s=r(60670),i=r(87070),p=r(65655),l=r(20471),d=r(84770);let u="https://feyza.app";function c(){return(0,d.randomBytes)(32).toString("hex")}async function m(e,{params:t}){try{let r=await (0,p.k)(),{id:o}=await t,{lender_email:a,lender_name:n}=await e.json();if(!a||!n)return i.NextResponse.json({error:"Lender email and name are required"},{status:400});let{data:s,error:d}=await r.from("loan_requests").select("*").eq("id",o).single();if(d||!s)return i.NextResponse.json({error:"Loan request not found"},{status:404});if("pending"!==s.status)return i.NextResponse.json({error:"This loan request is no longer available"},{status:400});let{data:m}=await r.from("users").select("id").eq("email",a.toLowerCase()).single(),x=c(),g=c(),y=new Date(Date.now()+6048e5),{data:b,error:h}=await r.from("loans").insert({amount:s.amount,currency:s.currency,purpose:s.purpose,borrower_id:s.borrower_user_id,borrower_invite_email:s.borrower_email,lender_id:m?.id||null,lender_type:"personal",invite_email:a.toLowerCase(),invite_token:x,invite_accepted:!0,borrower_access_token:g,borrower_access_token_expires:y.toISOString(),status:"pending",interest_rate:0,interest_type:"simple",total_interest:0,total_amount:s.amount,repayment_frequency:s.proposed_frequency||"monthly",repayment_amount:s.proposed_payment_amount||s.amount,total_installments:s.proposed_installments||1,start_date:new Date().toISOString(),borrower_payment_method:s.borrower_payment_method,borrower_payment_username:s.borrower_payment_username}).select().single();if(h)throw console.error("Create loan error:",h),h;return await r.from("loan_requests").update({status:"accepted",accepted_by_email:a.toLowerCase(),accepted_by_name:n,accepted_at:new Date().toISOString(),loan_id:b.id}).eq("id",o),await (0,l.Cz)({to:a,subject:"\uD83E\uDD1D You accepted a loan request - Set your terms",html:`
        <!DOCTYPE html>
        <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0;">🤝 Thank You!</h1>
            </div>
            
            <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0;">
              <p style="font-size: 18px; color: #374151;">Hi ${n},</p>
              
              <p style="color: #374151;">
                Thank you for agreeing to help <strong>${s.borrower_name}</strong> with their loan request!
              </p>
              
              <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0;">
                <p style="color: #6b7280; margin: 0 0 10px 0;">Loan Amount</p>
                <p style="font-size: 32px; font-weight: bold; color: #10b981; margin: 0;">
                  ${s.currency} ${s.amount.toLocaleString()}
                </p>
              </div>
              
              <p style="color: #374151;">
                <strong>Next step:</strong> Set your loan terms (interest rate, repayment schedule, etc.)
              </p>
              
              <a href="${u}/lender/setup-loan/${b.id}?token=${x}" style="display: block; background: #10b981; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; text-align: center; margin: 24px 0;">
                Set Loan Terms →
              </a>
              
              <p style="color: #6b7280; font-size: 14px;">
                This link expires in 7 days. You don't need an account to continue.
              </p>
            </div>
          </body>
        </html>
      `}),await (0,l.Cz)({to:s.borrower_email,subject:"\uD83C\uDF89 Great news! Your loan request was accepted",html:`
        <!DOCTYPE html>
        <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0;">🎉 Request Accepted!</h1>
            </div>
            
            <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0;">
              <p style="font-size: 18px; color: #374151;">Hi ${s.borrower_name},</p>
              
              <p style="color: #374151;">
                Great news! <strong>${n}</strong> has agreed to help you with your loan request!
              </p>
              
              <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #e2e8f0;">
                <p style="color: #6b7280; margin: 0 0 10px 0;">Loan Amount</p>
                <p style="font-size: 32px; font-weight: bold; color: #2563eb; margin: 0;">
                  ${s.currency} ${s.amount.toLocaleString()}
                </p>
              </div>
              
              <p style="color: #374151;">
                <strong>What happens next?</strong>
              </p>
              <ol style="color: #374151; padding-left: 20px;">
                <li style="margin-bottom: 8px;">Your lender will set the loan terms (interest, repayment schedule)</li>
                <li style="margin-bottom: 8px;">You'll receive the terms to review and sign</li>
                <li style="margin-bottom: 8px;">Once both parties sign, the loan begins!</li>
              </ol>
              
              <a href="${u}/borrower/${g}" style="display: block; background: #2563eb; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; text-align: center; margin: 24px 0;">
                View Your Loan →
              </a>
              
              <p style="color: #6b7280; font-size: 14px;">
                We'll notify you when the loan terms are ready for your review.
              </p>
            </div>
          </body>
        </html>
      `}),i.NextResponse.json({success:!0,loan_id:b.id,lender_token:x,message:"Loan request accepted successfully"})}catch(e){return console.error("Accept loan request error:",e),i.NextResponse.json({error:"Failed to accept loan request"},{status:500})}}let x=new a.AppRouteRouteModule({definition:{kind:n.x.APP_ROUTE,page:"/api/guest-loan-request/[id]/accept/route",pathname:"/api/guest-loan-request/[id]/accept",filename:"route",bundlePath:"app/api/guest-loan-request/[id]/accept/route"},resolvedPagePath:"C:\\Users\\GerardKasemba\\feyza\\src\\app\\api\\guest-loan-request\\[id]\\accept\\route.ts",nextConfigOutput:"",userland:o}),{requestAsyncStorage:g,staticGenerationAsyncStorage:y,serverHooks:b}=x,h="/api/guest-loan-request/[id]/accept/route";function f(){return(0,s.patchFetch)({serverHooks:b,staticGenerationAsyncStorage:y})}},65655:(e,t,r)=>{r.d(t,{f:()=>n,k:()=>s});var o=r(67721),a=r(71615);async function n(){let e=await (0,a.cookies)();return(0,o.createServerClient)("https://mregojhoivbxdvgjrixz.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yZWdvamhvaXZieGR2Z2pyaXh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1ODE1NDQsImV4cCI6MjA4MzE1NzU0NH0.I_jEMf00cFYAdF0akvD-HOqXWExxO3E0BV69EHEa5jI",{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:r,options:o})=>e.set(t,r,o))}catch{}}}})}async function s(){let e=await (0,a.cookies)();return(0,o.createServerClient)("https://mregojhoivbxdvgjrixz.supabase.co",process.env.SUPABASE_SERVICE_ROLE_KEY,{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:r,options:o})=>e.set(t,r,o))}catch{}}}})}}};var t=require("../../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),o=t.X(0,[9276,3786,9702,5972,5245,471],()=>r(51140));module.exports=o})();