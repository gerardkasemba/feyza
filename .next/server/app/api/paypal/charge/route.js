"use strict";(()=>{var e={};e.id=3106,e.ids=[3106],e.modules={72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},61282:e=>{e.exports=require("child_process")},84770:e=>{e.exports=require("crypto")},80665:e=>{e.exports=require("dns")},17702:e=>{e.exports=require("events")},92048:e=>{e.exports=require("fs")},32615:e=>{e.exports=require("http")},35240:e=>{e.exports=require("https")},98216:e=>{e.exports=require("net")},19801:e=>{e.exports=require("os")},55315:e=>{e.exports=require("path")},76162:e=>{e.exports=require("stream")},82452:e=>{e.exports=require("tls")},17360:e=>{e.exports=require("url")},21764:e=>{e.exports=require("util")},71568:e=>{e.exports=require("zlib")},86847:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>w,patchFetch:()=>v,requestAsyncStorage:()=>h,routeModule:()=>y,serverHooks:()=>b,staticGenerationAsyncStorage:()=>f});var a={};r.r(a),r.d(a,{POST:()=>g});var o=r(49303),n=r(88716),i=r(60670),s=r(87070),p=r(65655),l=r(20471);let d=process.env.PAYPAL_SECRET,c="https://api-m.paypal.com",u="https://feyza.app";async function m(){let e=Buffer.from(`your_paypal_client_id:${d}`).toString("base64"),t=await fetch(`${c}/v1/oauth2/token`,{method:"POST",headers:{Authorization:`Basic ${e}`,"Content-Type":"application/x-www-form-urlencoded"},body:"grant_type=client_credentials"});return(await t.json()).access_token}async function x(e,t,r,a,o,n){return(await fetch(`${c}/v1/payments/payouts`,{method:"POST",headers:{Authorization:`Bearer ${e}`,"Content-Type":"application/json"},body:JSON.stringify({sender_batch_header:{sender_batch_id:`Feyza_${Date.now()}`,email_subject:"Feyza Payment",email_message:n},items:[{recipient_type:"EMAIL",amount:{value:a.toFixed(2),currency:o},receiver:r,note:n,sender_item_id:`payment_${Date.now()}`}]})})).json()}async function g(e){try{let t=e.headers.get("authorization"),r=process.env.CRON_SECRET;if(r&&t!==`Bearer ${r}`){let e=await (0,p.f)(),{data:{user:t}}=await e.auth.getUser();if(!t)return s.NextResponse.json({error:"Unauthorized"},{status:401})}let{scheduleId:a,loanId:o}=await e.json();if(!a||!o)return s.NextResponse.json({error:"scheduleId and loanId are required"},{status:400});let n=await (0,p.f)(),{data:i}=await n.from("loans").select(`
        *,
        borrower:users!borrower_id(*),
        lender:users!lender_id(*),
        business_lender:business_profiles(*, owner:users!user_id(*))
      `).eq("id",o).single();if(!i)return s.NextResponse.json({error:"Loan not found"},{status:404});let{data:d}=await n.from("payment_schedule").select("*").eq("id",a).single();if(!d)return s.NextResponse.json({error:"Schedule item not found"},{status:404});if(d.is_paid)return s.NextResponse.json({error:"Payment already made"},{status:400});if(!i.borrower?.paypal_connected||!i.borrower?.paypal_email)return s.NextResponse.json({error:"Borrower PayPal not connected"},{status:400});let c=null;if("personal"===i.lender_type&&i.lender?.paypal_email?c=i.lender.paypal_email:"business"===i.lender_type&&i.business_lender?.owner?.paypal_email&&(c=i.business_lender.owner.paypal_email),!c)return s.NextResponse.json({error:"Lender PayPal not connected"},{status:400});let g=await m(),y=await x(g,i.borrower.paypal_email,c,d.amount,i.currency,`Feyza payment for loan ${i.id}`);if(y.error)return console.error("PayPal payout error:",y),s.NextResponse.json({error:"PayPal payment failed",details:y},{status:500});let{data:h,error:f}=await n.from("payments").insert({loan_id:i.id,schedule_id:a,amount:d.amount,payment_date:new Date().toISOString(),status:"confirmed",confirmed_by:i.lender_id||i.business_lender?.user_id,confirmation_date:new Date().toISOString(),note:"Automatic PayPal payment",paypal_transaction_id:y.batch_header?.payout_batch_id}).select().single();f&&console.error("Error creating payment record:",f),await n.from("payment_schedule").update({is_paid:!0,payment_id:h?.id}).eq("id",a);let b=i.amount_paid+d.amount,w=i.amount_remaining-d.amount,v=w<=0;await n.from("loans").update({amount_paid:b,amount_remaining:Math.max(0,w),status:v?"completed":i.status}).eq("id",i.id),await (0,l.Cz)({to:i.borrower.email,subject:`Payment processed - ${i.currency} ${d.amount}`,html:function(e){let{recipientName:t,amount:r,currency:a,loanId:o,isCompleted:n,remainingAmount:i}=e;return`
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <!-- Header with logo and gradient -->
      <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
        <!-- Logo -->
        <div style="margin-bottom: 15px;">
          <img src="https://raw.githubusercontent.com/gerardkasemba/feyza/442387cc7eaefdd8a38e999b7dc42a0d526137e6/public/feyza.svg" 
              alt="Feyza Logo" 
              style="height: 40px; width: auto; filter: brightness(0) invert(1);">
        </div>
        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">✅ Payment Processed Successfully</h1>
      </div>
      
      <!-- Main content -->
      <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
        <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi ${t}! 👋</p>
        
        <p style="color: #166534; line-height: 1.6; margin-bottom: 20px;">Your automatic payment has been processed successfully.</p>
        
        <!-- Payment amount card -->
        <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; text-align: center; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
          <p style="color: #047857; margin: 0 0 10px 0; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; font-size: 14px;">Amount Charged</p>
          <span style="font-weight: bold; font-size: 36px; color: #059669; display: block; margin: 10px 0;">${a} ${r.toLocaleString()}</span>
          <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 14px;">Payment Date: ${new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}</p>
        </div>
        
        <!-- Payment status -->
        ${n?`
          <div style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); padding: 20px; border-radius: 12px; margin: 25px 0; text-align: center; border: 1px solid #86efac;">
            <div style="font-size: 48px; margin-bottom: 10px;">🎉</div>
            <p style="color: #065f46; font-weight: 600; margin: 0 0 10px 0; font-size: 18px;">Congratulations!</p>
            <p style="color: #166534; margin: 0; line-height: 1.5;">Your loan is now fully paid off! Well done on completing your repayment journey.</p>
          </div>
        `:`
          <div style="background: white; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5,150,105,0.1);">
            <h3 style="color: #065f46; margin: 0 0 15px 0; font-weight: 600; font-size: 18px;">Payment Summary</h3>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid #e5e7eb;">
              <span style="color: #6b7280;">Remaining Balance:</span>
              <span style="color: #059669; font-weight: 600; font-size: 18px;">${a} ${i.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0;">
              <span style="color: #6b7280;">Progress:</span>
              <span style="color: #059669; font-weight: 600;">${Math.round(r/(r+i)*100)}% Complete</span>
            </div>
          </div>
        `}
        
        <!-- CTA Button -->
        <a href="${u}/loans/${o}" 
          style="display: block; background: linear-gradient(to right, #059669, #047857); 
                  color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; 
                  font-weight: 600; text-align: center; margin: 30px 0; font-size: 16px;
                  box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2); transition: all 0.2s ease;"
          onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(5, 150, 105, 0.3)';"
          onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';">
          View Loan Details →
        </a>
        
        <!-- Next payment info (only if loan is ongoing) -->
        ${n?"":`
          <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #d1d5db;">
            <p style="color: #4b5563; margin: 0; font-size: 14px; text-align: center;">
              <strong>Next Payment:</strong> Your next automatic payment is scheduled for the same date next month.
            </p>
          </div>
        `}
        
        <!-- Help section -->
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0;">
          <p style="color: #047857; font-size: 14px; margin: 0 0 10px 0;">Questions about this payment?</p>
          <p style="margin: 0;">
            <a href="${u}/help/payments" style="color: #059669; text-decoration: none; font-weight: 500; margin-right: 15px; font-size: 14px;">
              Payment Help Center
            </a>
            <a href="mailto:support@feyza.com" style="color: #059669; text-decoration: none; font-weight: 500; font-size: 14px;">
              Contact Support
            </a>
          </p>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
        <p style="margin: 0;">Feyza • Simple loan tracking for everyone</p>
        <p style="margin: 5px 0 0 0; font-size: 11px;">This is an automated payment confirmation email</p>
      </div>
    </body>
  </html>
  `}({recipientName:i.borrower.full_name,amount:d.amount,currency:i.currency,loanId:i.id,isCompleted:v,remainingAmount:Math.max(0,w)})});let _=i.lender?.email||i.business_lender?.contact_email||i.business_lender?.owner?.email,z=i.lender?.full_name||i.business_lender?.business_name;return _&&await (0,l.Cz)({to:_,subject:`Payment received - ${i.currency} ${d.amount}`,html:function(e){let{recipientName:t,borrowerName:r,amount:a,currency:o,loanId:n,isCompleted:i}=e;return`
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
      <!-- Header with logo -->
      <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
        <!-- Logo -->
        <div style="margin-bottom: 15px;">
          <img src="https://raw.githubusercontent.com/gerardkasemba/feyza/442387cc7eaefdd8a38e999b7dc42a0d526137e6/public/feyza.svg" 
               alt="Feyza Logo" 
               style="height: 40px; width: auto; filter: brightness(0) invert(1);">
        </div>
        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">💰 Payment Received</h1>
        <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 16px;">Successfully processed</p>
      </div>
      
      <!-- Content area -->
      <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
        <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi ${t}! 👋</p>
        
        <p style="color: #166534; line-height: 1.6; margin-bottom: 20px;">Great news! You've received a payment from <strong style="color: #059669;">${r}</strong>.</p>
        
        <!-- Payment amount card -->
        <div style="background: white; padding: 30px; border-radius: 12px; margin: 25px 0; border: 1px solid #bbf7d0; text-align: center; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
          <p style="color: #047857; margin: 0 0 10px 0; font-weight: 500; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Amount Received</p>
          <div style="font-weight: bold; font-size: 36px; color: #059669; margin: 15px 0; text-shadow: 0 2px 4px rgba(5, 150, 105, 0.1);">
            ${o} ${a.toLocaleString()}
          </div>
          <div style="display: inline-block; background: #dcfce7; color: #065f46; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 500; margin-top: 10px;">
            ✅ Successfully transferred
          </div>
        </div>
        
        <!-- Loan status if completed -->
        ${i?`
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2);">
            <div style="display: inline-block; background: white; width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 15px;">
              <span style="color: #059669; font-size: 24px;">✓</span>
            </div>
            <p style="color: white; font-weight: 600; font-size: 18px; margin: 0 0 8px 0;">Loan Fully Repaid! 🎉</p>
            <p style="color: rgba(255, 255, 255, 0.9); font-size: 14px; margin: 0;">Congratulations! This loan has been completely paid off.</p>
          </div>
        `:""}
        
        <!-- Payment details -->
        <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0;">
          <h3 style="color: #065f46; margin: 0 0 15px 0; font-weight: 600; font-size: 18px;">Payment Details</h3>
          <ul style="margin: 0; padding-left: 20px; color: #166534;">
            <li style="margin-bottom: 10px; line-height: 1.6;">Sent via PayPal to your registered account</li>
            <li style="margin-bottom: 10px; line-height: 1.6;">Processing time may vary by payment provider</li>
            <li style="line-height: 1.6;">You will receive a separate confirmation from PayPal</li>
          </ul>
        </div>
        
        <!-- CTA Button -->
        <a href="${u}/loans/${n}" 
           style="display: block; background: linear-gradient(to right, #059669, #047857); 
                  color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; 
                  font-weight: 600; text-align: center; margin: 30px 0; font-size: 16px;
                  box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2); transition: all 0.2s ease;"
           onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(5, 150, 105, 0.3)';"
           onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';">
          View Loan Details →
        </a>
        
        <!-- Additional actions -->
        <div style="display: flex; gap: 15px; margin: 20px 0; flex-wrap: wrap;">
          <a href="${u}/transactions" 
             style="display: inline-block; flex: 1; background: white; color: #059669; text-decoration: none; 
                    padding: 14px 20px; border-radius: 8px; font-weight: 500; text-align: center; 
                    border: 2px solid #059669; min-width: 180px; font-size: 14px;"
             onmouseover="this.style.background='#f0fdf4';"
             onmouseout="this.style.background='white';">
            View All Transactions
          </a>
          <a href="${u}/dashboard" 
             style="display: inline-block; flex: 1; background: white; color: #059669; text-decoration: none; 
                    padding: 14px 20px; border-radius: 8px; font-weight: 500; text-align: center; 
                    border: 2px solid #059669; min-width: 180px; font-size: 14px;"
             onmouseover="this.style.background='#f0fdf4';"
             onmouseout="this.style.background='white';">
            Go to Dashboard
          </a>
        </div>
        
        <!-- Footer -->
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0; color: #047857; font-size: 14px;">
          <p style="margin: 0 0 10px 0;">Need help with this transaction?</p>
          <p style="margin: 0;">
            <a href="mailto:support@feyza.com" style="color: #059669; text-decoration: none; font-weight: 500; margin-right: 15px;">
              Contact Support
            </a>
            <a href="${u}/help/payments" style="color: #059669; text-decoration: none; font-weight: 500;">
              Payment FAQ
            </a>
          </p>
        </div>
      </div>
      
      <!-- Signature -->
      <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
        <p style="margin: 0;">Feyza • Secure Payment Processing</p>
        <p style="margin: 5px 0 0 0; font-size: 11px; color: #9ca3af;">
          This is an automated notification. Please do not reply to this email.
        </p>
      </div>
    </body>
  </html>
`}({recipientName:z||"Lender",borrowerName:i.borrower.full_name,amount:d.amount,currency:i.currency,loanId:i.id,isCompleted:v})}),await n.from("notifications").insert([{user_id:i.borrower_id,loan_id:i.id,type:"payment_confirmed",title:"Payment processed",message:`Your automatic payment of ${i.currency} ${d.amount} was processed successfully.`}]),s.NextResponse.json({success:!0,payoutId:y.batch_header?.payout_batch_id,isCompleted:v})}catch(e){return console.error("Auto-charge error:",e),s.NextResponse.json({error:"Internal server error"},{status:500})}}let y=new o.AppRouteRouteModule({definition:{kind:n.x.APP_ROUTE,page:"/api/paypal/charge/route",pathname:"/api/paypal/charge",filename:"route",bundlePath:"app/api/paypal/charge/route"},resolvedPagePath:"C:\\Users\\GerardKasemba\\feyza\\src\\app\\api\\paypal\\charge\\route.ts",nextConfigOutput:"",userland:a}),{requestAsyncStorage:h,staticGenerationAsyncStorage:f,serverHooks:b}=y,w="/api/paypal/charge/route";function v(){return(0,i.patchFetch)({serverHooks:b,staticGenerationAsyncStorage:f})}},65655:(e,t,r)=>{r.d(t,{f:()=>n,k:()=>i});var a=r(67721),o=r(71615);async function n(){let e=await (0,o.cookies)();return(0,a.createServerClient)("https://mregojhoivbxdvgjrixz.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yZWdvamhvaXZieGR2Z2pyaXh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1ODE1NDQsImV4cCI6MjA4MzE1NzU0NH0.I_jEMf00cFYAdF0akvD-HOqXWExxO3E0BV69EHEa5jI",{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:r,options:a})=>e.set(t,r,a))}catch{}}}})}async function i(){let e=await (0,o.cookies)();return(0,a.createServerClient)("https://mregojhoivbxdvgjrixz.supabase.co",process.env.SUPABASE_SERVICE_ROLE_KEY,{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:r,options:a})=>e.set(t,r,a))}catch{}}}})}}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),a=t.X(0,[9276,3786,9702,5972,5245,471],()=>r(86847));module.exports=a})();