"use strict";(()=>{var e={};e.id=9472,e.ids=[9472],e.modules={72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},61282:e=>{e.exports=require("child_process")},84770:e=>{e.exports=require("crypto")},80665:e=>{e.exports=require("dns")},17702:e=>{e.exports=require("events")},92048:e=>{e.exports=require("fs")},32615:e=>{e.exports=require("http")},35240:e=>{e.exports=require("https")},98216:e=>{e.exports=require("net")},19801:e=>{e.exports=require("os")},55315:e=>{e.exports=require("path")},76162:e=>{e.exports=require("stream")},82452:e=>{e.exports=require("tls")},17360:e=>{e.exports=require("url")},21764:e=>{e.exports=require("util")},71568:e=>{e.exports=require("zlib")},83476:(e,r,t)=>{t.r(r),t.d(r,{originalPathname:()=>_,patchFetch:()=>h,requestAsyncStorage:()=>y,routeModule:()=>x,serverHooks:()=>g,staticGenerationAsyncStorage:()=>f});var o={};t.r(o),t.d(o,{GET:()=>u,PATCH:()=>c,POST:()=>m});var n=t(49303),s=t(88716),a=t(60670),i=t(87070),d=t(65655),p=t(20471);let l="http://localhost:3000";async function u(e,{params:r}){try{let e=await (0,d.k)(),{token:t}=await r;if(!t)return i.NextResponse.json({error:"Token is required"},{status:400});let{data:o,error:n}=await e.from("loans").select(`
        id,
        amount,
        amount_paid,
        amount_remaining,
        currency,
        interest_rate,
        interest_type,
        total_interest,
        total_amount,
        status,
        purpose,
        start_date,
        repayment_frequency,
        repayment_amount,
        total_installments,
        funds_sent,
        borrower_payment_method,
        borrower_payment_username,
        borrower_access_token_expires,
        lender_paypal_email,
        lender_cashapp_username,
        lender_venmo_username,
        lender_preferred_payment_method,
        lender:users!lender_id(
          full_name,
          email,
          paypal_email,
          cashapp_username,
          venmo_username,
          preferred_payment_method
        ),
        business_lender:business_profiles!business_lender_id(
          business_name,
          paypal_email,
          cashapp_username,
          venmo_username,
          preferred_payment_method
        ),
        schedule:payment_schedule(
          id,
          due_date,
          amount,
          principal_amount,
          interest_amount,
          is_paid,
          status,
          payment_id
        )
      `).eq("borrower_access_token",t).single();if(n||!o)return i.NextResponse.json({error:"Invalid or expired access link"},{status:404});if(o.borrower_access_token_expires&&new Date(o.borrower_access_token_expires)<new Date)return i.NextResponse.json({error:"Access link has expired. Please request a new one."},{status:401});return o.schedule&&o.schedule.sort((e,r)=>new Date(e.due_date).getTime()-new Date(r.due_date).getTime()),i.NextResponse.json({loan:o})}catch(e){return console.error("Guest borrower GET error:",e),i.NextResponse.json({error:"Internal server error"},{status:500})}}async function c(e,{params:r}){try{let t=await (0,d.k)(),{token:o}=await r,n=await e.json();if(!o)return i.NextResponse.json({error:"Token is required"},{status:400});let{data:s,error:a}=await t.from("loans").select("id, borrower_access_token_expires").eq("borrower_access_token",o).single();if(a||!s)return i.NextResponse.json({error:"Invalid access link"},{status:404});if(s.borrower_access_token_expires&&new Date(s.borrower_access_token_expires)<new Date)return i.NextResponse.json({error:"Access link has expired"},{status:401});let{action:p,payment_method:l,payment_username:u}=n;if("set_payment_method"===p){if(!l||!u)return i.NextResponse.json({error:"Payment method and username are required"},{status:400});let{error:e}=await t.from("loans").update({borrower_payment_method:l,borrower_payment_username:u}).eq("id",s.id);if(e)throw e;return i.NextResponse.json({success:!0,message:"Payment method saved"})}return i.NextResponse.json({error:"Invalid action"},{status:400})}catch(e){return console.error("Guest borrower PATCH error:",e),i.NextResponse.json({error:"Internal server error"},{status:500})}}async function m(e,{params:r}){try{let t=await (0,d.k)(),{token:o}=await r,n=await e.json();if(!o)return i.NextResponse.json({error:"Token is required"},{status:400});let{data:s,error:a}=await t.from("loans").select(`
        id,
        currency,
        borrower_access_token_expires,
        lender_id,
        business_lender_id,
        lender:users!lender_id(email, full_name),
        business_lender:business_profiles!business_lender_id(contact_email, business_name)
      `).eq("borrower_access_token",o).single();if(a||!s)return i.NextResponse.json({error:"Invalid access link"},{status:404});if(s.borrower_access_token_expires&&new Date(s.borrower_access_token_expires)<new Date)return i.NextResponse.json({error:"Access link has expired"},{status:401});let{action:u,schedule_id:c,note:m}=n;if("record_payment"===u){if(!c)return i.NextResponse.json({error:"Schedule ID is required"},{status:400});let{data:e,error:r}=await t.from("payment_schedule").select("*").eq("id",c).eq("loan_id",s.id).single();if(r||!e)return i.NextResponse.json({error:"Payment not found"},{status:404});if(e.is_paid)return i.NextResponse.json({error:"Payment already recorded"},{status:400});let{data:o,error:n}=await t.from("payments").insert({loan_id:s.id,schedule_id:c,amount:e.amount,status:"pending",note:m||"Payment recorded by borrower"}).select().single();if(n)throw n;await t.from("payment_schedule").update({is_paid:!0,payment_id:o.id,status:"pending"}).eq("id",c);let{data:a}=await t.from("payment_schedule").select("amount").eq("loan_id",s.id).eq("is_paid",!0),d=a?.reduce((e,r)=>e+r.amount,0)||0,{data:u}=await t.from("loans").select("amount").eq("id",s.id).single();await t.from("loans").update({amount_paid:d,amount_remaining:(u?.amount||0)-d}).eq("id",s.id);let x=s.lender?.email||s.business_lender?.contact_email,y=s.lender?.full_name||s.business_lender?.business_name||"Lender";return x&&await (0,p.Cz)({to:x,subject:"\uD83D\uDCB0 Payment Received - Confirmation Needed",html:`
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
                  <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">💰 Payment Received</h1>
                  <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 16px;">Confirmation Required</p>
                </div>
                
                <!-- Main content area -->
                <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
                  <p style="font-size: 18px; color: #166534; margin-bottom: 25px; line-height: 1.5;">Hi ${y},</p>
                  
                  <!-- Payment information card -->
                  <div style="background: white; padding: 25px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
                    <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 20px; font-weight: 600;">Payment Recorded</h3>
                    
                    <div style="display: flex; align-items: center; background: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #86efac;">
                      <div style="flex: 1;">
                        <p style="margin: 0 0 8px 0; color: #047857; font-size: 14px; font-weight: 500;">Payment Amount</p>
                        <p style="margin: 0; color: #059669; font-size: 28px; font-weight: 700;">${s.currency} ${e.amount}</p>
                      </div>
                      <div style="flex-shrink: 0; background: #059669; color: white; padding: 8px 16px; border-radius: 6px; font-size: 14px; font-weight: 600;">
                        Awaiting Confirmation
                      </div>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                      <p style="margin: 0 0 8px 0; color: #065f46; font-weight: 600;">Loan Details</p>
                      <p style="margin: 0; color: #166534;">Loan ID: <span style="font-weight: 500;">${s.id}</span></p>
                      ${s.borrower?`<p style="margin: 8px 0 0 0; color: #166534;">Borrower: <span style="font-weight: 500;">${s.borrower.full_name||s.borrower.email}</span></p>`:""}
                    </div>
                    
                    ${m?`
                    <!-- Payment note -->
                    <div style="background: #f0fdf4; padding: 18px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #059669;">
                      <p style="margin: 0 0 6px 0; color: #065f46; font-weight: 600; font-size: 14px;">📝 Payment Note</p>
                      <p style="margin: 0; color: #166534; font-style: italic; line-height: 1.5;">"${m}"</p>
                    </div>
                    `:""}
                  </div>
                  
                  <!-- Action required section -->
                  <div style="background: #fef3c7; padding: 20px; border-radius: 10px; margin: 25px 0; border: 1px solid #fbbf24;">
                    <h3 style="margin: 0 0 10px 0; color: #92400e; font-size: 18px; font-weight: 600;">⚠️ Action Required</h3>
                    <p style="margin: 0; color: #92400e; line-height: 1.6; font-size: 15px;">
                      Please verify this payment and confirm it in your Feyza dashboard to update the loan status.
                    </p>
                  </div>
                  
                  <!-- CTA Buttons -->
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${l}/loans/${s.id}" 
                      style="display: inline-block; background: linear-gradient(to right, #059669, #047857); 
                              color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; 
                              font-weight: 600; text-align: center; font-size: 16px; margin-bottom: 15px;
                              box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2); transition: all 0.2s ease;"
                      onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(5, 150, 105, 0.3)';"
                      onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';">
                      Review & Confirm Payment →
                    </a>
                    
                    <p style="color: #047857; font-size: 14px; margin: 10px 0 0 0;">
                      Expected confirmation: <strong style="color: #059669;">Within 48 hours</strong>
                    </p>
                  </div>
                  
                  <!-- Help information -->
                  <div style="background: white; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #bbf7d0;">
                    <h4 style="margin: 0 0 10px 0; color: #065f46; font-size: 16px; font-weight: 600;">🔍 What to Check:</h4>
                    <ul style="margin: 0; padding-left: 20px; color: #166534; font-size: 14px;">
                      <li style="margin-bottom: 8px;">Verify the payment amount matches your records</li>
                      <li style="margin-bottom: 8px;">Check the payment date and method</li>
                      <li style="margin-bottom: 8px;">Review any attached payment proof or documentation</li>
                      <li>Contact your borrower if you need clarification</li>
                    </ul>
                  </div>
                  
                  <!-- Footer -->
                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0; color: #047857; font-size: 14px;">
                    <p style="margin: 0 0 10px 0;">Need help with payment confirmation?</p>
                    <p style="margin: 0;">
                      <a href="${l}/help/payment-confirmation" style="color: #059669; text-decoration: none; font-weight: 500; margin-right: 15px;">
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
                  <p style="margin: 0;">Feyza • Secure Payment Processing</p>
                </div>
              </body>
            </html>
          `}),s.lender_id&&await t.from("notifications").insert({user_id:s.lender_id,type:"payment_received",title:"Payment Received",message:`Your borrower has recorded a payment of ${s.currency} ${e.amount}. Please confirm.`,loan_id:s.id}),i.NextResponse.json({success:!0,message:"Payment recorded successfully",payment_id:o.id})}return i.NextResponse.json({error:"Invalid action"},{status:400})}catch(e){return console.error("Guest borrower POST error:",e),i.NextResponse.json({error:"Internal server error"},{status:500})}}let x=new n.AppRouteRouteModule({definition:{kind:s.x.APP_ROUTE,page:"/api/guest-borrower/[token]/route",pathname:"/api/guest-borrower/[token]",filename:"route",bundlePath:"app/api/guest-borrower/[token]/route"},resolvedPagePath:"C:\\Users\\GerardKasemba\\feyza\\src\\app\\api\\guest-borrower\\[token]\\route.ts",nextConfigOutput:"",userland:o}),{requestAsyncStorage:y,staticGenerationAsyncStorage:f,serverHooks:g}=x,_="/api/guest-borrower/[token]/route";function h(){return(0,a.patchFetch)({serverHooks:g,staticGenerationAsyncStorage:f})}},65655:(e,r,t)=>{t.d(r,{f:()=>s,k:()=>a});var o=t(67721),n=t(71615);async function s(){let e=await (0,n.cookies)();return(0,o.createServerClient)("https://mregojhoivbxdvgjrixz.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yZWdvamhvaXZieGR2Z2pyaXh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1ODE1NDQsImV4cCI6MjA4MzE1NzU0NH0.I_jEMf00cFYAdF0akvD-HOqXWExxO3E0BV69EHEa5jI",{cookies:{getAll:()=>e.getAll(),setAll(r){try{r.forEach(({name:r,value:t,options:o})=>e.set(r,t,o))}catch{}}}})}async function a(){let e=await (0,n.cookies)();return(0,o.createServerClient)("https://mregojhoivbxdvgjrixz.supabase.co",process.env.SUPABASE_SERVICE_ROLE_KEY,{cookies:{getAll:()=>e.getAll(),setAll(r){try{r.forEach(({name:r,value:t,options:o})=>e.set(r,t,o))}catch{}}}})}}};var r=require("../../../../webpack-runtime.js");r.C(e);var t=e=>r(r.s=e),o=r.X(0,[9276,3786,9702,5972,5245,471],()=>t(83476));module.exports=o})();