"use strict";(()=>{var e={};e.id=3967,e.ids=[3967],e.modules={72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},61282:e=>{e.exports=require("child_process")},84770:e=>{e.exports=require("crypto")},80665:e=>{e.exports=require("dns")},17702:e=>{e.exports=require("events")},92048:e=>{e.exports=require("fs")},32615:e=>{e.exports=require("http")},35240:e=>{e.exports=require("https")},98216:e=>{e.exports=require("net")},19801:e=>{e.exports=require("os")},55315:e=>{e.exports=require("path")},76162:e=>{e.exports=require("stream")},82452:e=>{e.exports=require("tls")},17360:e=>{e.exports=require("url")},21764:e=>{e.exports=require("util")},71568:e=>{e.exports=require("zlib")},19234:(e,t,o)=>{o.r(t),o.d(t,{originalPathname:()=>y,patchFetch:()=>b,requestAsyncStorage:()=>u,routeModule:()=>g,serverHooks:()=>m,staticGenerationAsyncStorage:()=>f});var r={};o.r(r),o.d(r,{GET:()=>c,POST:()=>x});var n=o(49303),a=o(88716),i=o(60670),s=o(87070),d=o(65655),p=o(20471);let l={paypal:"PayPal",cashapp:"Cash App",venmo:"Venmo"};async function x(e,{params:t}){try{let{id:o}=await t,{method:r,reference:n,proof_url:a}=await e.json(),i=await (0,d.f)(),x=await (0,d.k)(),{data:{user:c}}=await i.auth.getUser();if(!c)return s.NextResponse.json({error:"Unauthorized"},{status:401});let{data:g,error:u}=await x.from("loans").select(`
        *,
        borrower:users!borrower_id(id, email, full_name, paypal_email, cashapp_username, venmo_username),
        lender:users!lender_id(id, email, full_name),
        business_lender:business_profiles!business_lender_id(id, business_name, contact_email, user_id)
      `).eq("id",o).single();if(u||!g)return s.NextResponse.json({error:"Loan not found"},{status:404});let f=g.lender_id===c.id;if(f||g.business_lender?.user_id!==c.id||(f=!0),!f)return s.NextResponse.json({error:"Only the lender can confirm payment sent"},{status:403});if(g.funds_sent)return s.NextResponse.json({error:"Payment already confirmed"},{status:400});let{error:m}=await x.from("loans").update({funds_sent:!0,funds_sent_at:new Date().toISOString(),funds_sent_method:r||"paypal",funds_sent_reference:n||null,funds_sent_proof_url:a||null}).eq("id",o);if(m)return console.error("Error updating loan:",m),s.NextResponse.json({error:"Failed to update loan"},{status:500});let y=g.lender?.full_name||g.business_lender?.business_name||"Your lender",b=g.lender?.email||g.business_lender?.contact_email,h=g.borrower?.email,v=g.borrower?.full_name||"Borrower",w=l[r]||r||"PayPal",_="http://localhost:3000";return h&&await (0,p.Cz)({to:h,subject:`💰 Payment Sent via ${w}!`,html:`
          <!DOCTYPE html>
          <html>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <!-- Header with logo and gradient -->
              <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center; position: relative;">
                <!-- Logo -->
                <div style="margin-bottom: 15px;">
                  <img src="https://raw.githubusercontent.com/gerardkasemba/feyza/442387cc7eaefdd8a38e999b7dc42a0d526137e6/public/feyza.svg" 
                      alt="Feyza Logo" 
                      style="height: 40px; width: auto; filter: brightness(0) invert(1);">
                </div>
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">💰 Payment Sent!</h1>
                <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 16px;">via ${w}</p>
              </div>
              
              <!-- Content area -->
              <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
                <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi ${v}! 👋</p>
                
                <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
                  <p style="color: #166534; line-height: 1.6; margin-bottom: 20px;">
                    <strong style="color: #059669;">${y}</strong> has sent your loan payment via 
                    <strong style="color: #059669;">${w}</strong>!
                  </p>
                  
                  <!-- Amount display -->
                  <div style="background: linear-gradient(135deg, #f0fdf4 0%, #e6f7ed 100%); padding: 25px; border-radius: 12px; margin: 20px 0; text-align: center; border: 2px dashed #86efac;">
                    <p style="color: #047857; margin: 0 0 5px 0; font-weight: 600; font-size: 14px;">AMOUNT SENT</p>
                    <p style="font-size: 36px; font-weight: bold; color: #059669; margin: 10px 0; letter-spacing: -0.5px;">
                      ${g.currency} ${g.amount.toLocaleString()}
                    </p>
                    <div style="display: inline-block; background: #dcfce7; padding: 6px 16px; border-radius: 20px; margin: 10px 0;">
                      <p style="color: #065f46; margin: 0; font-weight: 500; font-size: 14px;">
                        via ${w}
                      </p>
                    </div>
                    ${n?`
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #bbf7d0;">
                      <p style="color: #047857; margin: 0 0 5px 0; font-size: 13px; font-weight: 500;">REFERENCE</p>
                      <p style="color: #065f46; margin: 0; font-family: 'Monaco', 'Courier New', monospace; font-size: 14px; background: #f0fdf4; padding: 8px 12px; border-radius: 6px; display: inline-block;">
                        ${n}
                      </p>
                    </div>
                    `:""}
                  </div>
                </div>
                
                <!-- Payment Proof Section -->
                ${a?`
                <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
                  <div style="display: flex; align-items: center; margin-bottom: 15px;">
                    <div style="background: #059669; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
                      <span style="color: white; font-size: 16px;">📸</span>
                    </div>
                    <h3 style="margin: 0; color: #065f46; font-size: 18px; font-weight: 600;">Payment Proof</h3>
                  </div>
                  <img src="${a}" 
                      alt="Payment proof" 
                      style="max-width: 100%; border-radius: 8px; border: 1px solid #bbf7d0; margin-top: 15px;"
                      onerror="this.style.display='none';" />
                  <p style="color: #047857; font-size: 14px; margin: 10px 0 0 0; font-style: italic;">
                    Proof of payment provided by ${y}
                  </p>
                </div>
                `:""}
                
                <!-- Next Steps -->
                <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border: 1px solid #93c5fd; border-radius: 12px; padding: 20px; margin: 20px 0; position: relative;">
                  <div style="position: absolute; top: -12px; left: 20px; background: #3b82f6; color: white; padding: 4px 16px; border-radius: 20px; font-weight: 600; font-size: 14px;">
                    📅 Next Steps
                  </div>
                  <div style="margin-top: 10px;">
                    <p style="margin: 0; color: #1e40af; font-size: 15px; line-height: 1.6;">
                      Check your <strong>${w}</strong> account to confirm receipt. 
                      Your repayment schedule starts on 
                      <strong style="color: #1d4ed8;">${new Date(g.start_date).toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</strong>.
                    </p>
                  </div>
                </div>
                
                <!-- CTA Button -->
                <a href="${_}/loans/${g.id}" 
                  style="display: inline-block; background: linear-gradient(to right, #059669, #047857); 
                          color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; 
                          font-weight: 600; text-align: center; margin: 24px 0; font-size: 16px;
                          box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2); transition: all 0.2s ease;"
                  onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(5, 150, 105, 0.3)';"
                  onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';">
                  View Loan Details →
                </a>
                
                <!-- Additional Info -->
                <div style="background: #dcfce7; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #86efac;">
                  <p style="margin: 0; color: #065f46; font-size: 14px; line-height: 1.5;">
                    <strong>💡 Important:</strong> If you don't see the payment in your ${w} account within 24 hours, 
                    please check your transaction history or contact ${w} support directly.
                  </p>
                </div>
                
                <!-- Footer -->
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0; color: #047857; font-size: 14px;">
                  <p style="margin: 0 0 10px 0;">Have questions about this payment?</p>
                  <p style="margin: 0;">
                    <a href="${_}/loans/${g.id}/messages" style="color: #059669; text-decoration: none; font-weight: 500; margin-right: 15px;">
                      Message ${y}
                    </a>
                    <a href="mailto:support@feyza.com" style="color: #059669; text-decoration: none; font-weight: 500;">
                      Contact Support
                    </a>
                  </p>
                </div>
              </div>
              
              <!-- Signature -->
              <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
                <p style="margin: 0;">Feyza • Secure Payment Notification</p>
              </div>
            </body>
          </html>
        `}),b&&await (0,p.Cz)({to:b,subject:"✅ Payment Confirmed!",html:`
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
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">✅ Payment Confirmed!</h1>
                <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">Transaction Successful</p>
              </div>
              
              <!-- Content area -->
              <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
                <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi ${y}! 👋</p>
                
                <p style="color: #166534; line-height: 1.6; margin-bottom: 25px;">Your <strong style="color: #059669;">${w}</strong> payment has been successfully confirmed and processed.</p>
                
                <!-- Payment details card -->
                <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
                  <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 18px; font-weight: 600; text-align: center;">Payment Summary</h3>
                  
                  <div style="text-align: center; margin-bottom: 20px;">
                    <p style="color: #6b7280; margin: 0; font-size: 14px;">Amount Sent</p>
                    <p style="font-size: 36px; font-weight: bold; color: #059669; margin: 5px 0; letter-spacing: -0.5px;">
                      ${g.currency} ${g.amount.toLocaleString()}
                    </p>
                  </div>
                  
                  <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-top: 15px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                      <span style="color: #6b7280;">To:</span>
                      <span style="color: #065f46; font-weight: 500;">${v}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                      <span style="color: #6b7280;">Payment Method:</span>
                      <span style="color: #065f46; font-weight: 500;">${w}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                      <span style="color: #6b7280;">Status:</span>
                      <span style="color: #059669; font-weight: 500; background: #f0fdf4; padding: 2px 8px; border-radius: 4px;">✅ Confirmed</span>
                    </div>
                    ${n?`
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                      <span style="color: #6b7280; flex-shrink: 0;">Reference:</span>
                      <span style="color: #065f46; font-weight: 500; text-align: right; font-size: 13px; word-break: break-all; padding-left: 10px;">${n}</span>
                    </div>
                    `:""}
                  </div>
                </div>
                
                <!-- Repayment schedule card -->
                <div style="background: #dcfce7; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #86efac;">
                  <div style="display: flex; align-items: flex-start; gap: 15px;">
                    <div style="background: #059669; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 14px;">
                      📅
                    </div>
                    <div>
                      <h4 style="margin: 0 0 8px 0; color: #065f46; font-weight: 600;">Expected Repayment Schedule</h4>
                      <p style="margin: 0; color: #166534; font-size: 15px; line-height: 1.5;">
                        <strong>${v}</strong> will repay <strong>${g.currency} ${g.total_amount?.toLocaleString()||g.amount.toLocaleString()}</strong> 
                        over <strong>${g.total_installments} ${g.repayment_frequency}</strong> payments.
                      </p>
                    </div>
                  </div>
                </div>
                
                <!-- Important notes -->
                <div style="background: white; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #fde68a; background: #fffbeb;">
                  <div style="display: flex; align-items: flex-start; gap: 12px;">
                    <div style="color: #92400e; font-size: 14px; flex-shrink: 0;">📌</div>
                    <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                      <strong>Important:</strong> You will receive email notifications for each repayment as they occur.
                    </p>
                  </div>
                </div>
                
                <!-- CTA Button -->
                <a href="${_}/loans/${g.id}" 
                  style="display: block; background: linear-gradient(to right, #059669, #047857); 
                          color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; 
                          font-weight: 600; text-align: center; margin: 24px 0; font-size: 16px;
                          box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2); transition: all 0.2s ease;"
                  onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(5, 150, 105, 0.3)';"
                  onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';">
                  View Loan Details & Repayment Schedule →
                </a>
                
                <!-- Additional actions -->
                <div style="display: flex; gap: 15px; margin-top: 25px; flex-wrap: wrap;">
                  <a href="${_}/dashboard" 
                    style="display: inline-block; background: white; 
                            color: #059669; text-decoration: none; padding: 12px 24px; border-radius: 8px; 
                            font-weight: 500; text-align: center; font-size: 14px; border: 1px solid #059669;
                            box-shadow: 0 2px 6px rgba(5, 150, 105, 0.1); transition: all 0.2s ease;
                            flex: 1; min-width: 150px;"
                    onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 10px rgba(5, 150, 105, 0.15)';this.style.background='#f0fdf4';"
                    onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 6px rgba(5, 150, 105, 0.1)';this.style.background='white';">
                    Go to Dashboard
                  </a>
                  
                  <a href="${_}/transactions" 
                    style="display: inline-block; background: white; 
                            color: #059669; text-decoration: none; padding: 12px 24px; border-radius: 8px; 
                            font-weight: 500; text-align: center; font-size: 14px; border: 1px solid #059669;
                            box-shadow: 0 2px 6px rgba(5, 150, 105, 0.1); transition: all 0.2s ease;
                            flex: 1; min-width: 150px;"
                    onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 10px rgba(5, 150, 105, 0.15)';this.style.background='#f0fdf4';"
                    onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 6px rgba(5, 150, 105, 0.1)';this.style.background='white';">
                    View Transactions
                  </a>
                </div>
                
                <!-- Footer -->
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0; color: #047857; font-size: 14px;">
                  <p style="margin: 0;">Questions about this transaction? <a href="mailto:support@feyza.com" style="color: #059669; text-decoration: none; font-weight: 500;">Contact our support team</a></p>
                </div>
              </div>
              
              <!-- Signature -->
              <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
                <p style="margin: 0;">This is an automated confirmation from Feyza</p>
              </div>
            </body>
          </html>
        `}),await x.from("notifications").insert({user_id:g.borrower_id,loan_id:g.id,type:"loan_accepted",title:"\uD83D\uDCB0 Payment Received!",message:`${y} has sent you ${g.currency} ${g.amount} via ${w}. Check your account!`}),s.NextResponse.json({success:!0,message:"Payment confirmed",loan_id:o})}catch(e){return console.error("Error confirming payment:",e),s.NextResponse.json({error:"Internal server error"},{status:500})}}async function c(e,{params:t}){try{let{id:e}=await t,o=await (0,d.f)(),{data:{user:r}}=await o.auth.getUser();if(!r)return s.NextResponse.json({error:"Unauthorized"},{status:401});let n=await (0,d.k)(),{data:a,error:i}=await n.from("loans").select("id, funds_sent, funds_sent_at, funds_sent_method, funds_sent_reference").eq("id",e).single();if(i||!a)return s.NextResponse.json({error:"Loan not found"},{status:404});return s.NextResponse.json({funds_sent:a.funds_sent,funds_sent_at:a.funds_sent_at,funds_sent_method:a.funds_sent_method,funds_sent_reference:a.funds_sent_reference})}catch(e){return console.error("Error getting funds status:",e),s.NextResponse.json({error:"Internal server error"},{status:500})}}let g=new n.AppRouteRouteModule({definition:{kind:a.x.APP_ROUTE,page:"/api/loans/[id]/funds/route",pathname:"/api/loans/[id]/funds",filename:"route",bundlePath:"app/api/loans/[id]/funds/route"},resolvedPagePath:"C:\\Users\\GerardKasemba\\feyza\\src\\app\\api\\loans\\[id]\\funds\\route.ts",nextConfigOutput:"",userland:r}),{requestAsyncStorage:u,staticGenerationAsyncStorage:f,serverHooks:m}=g,y="/api/loans/[id]/funds/route";function b(){return(0,i.patchFetch)({serverHooks:m,staticGenerationAsyncStorage:f})}},65655:(e,t,o)=>{o.d(t,{f:()=>a,k:()=>i});var r=o(67721),n=o(71615);async function a(){let e=await (0,n.cookies)();return(0,r.createServerClient)("https://mregojhoivbxdvgjrixz.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yZWdvamhvaXZieGR2Z2pyaXh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1ODE1NDQsImV4cCI6MjA4MzE1NzU0NH0.I_jEMf00cFYAdF0akvD-HOqXWExxO3E0BV69EHEa5jI",{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:o,options:r})=>e.set(t,o,r))}catch{}}}})}async function i(){let e=await (0,n.cookies)();return(0,r.createServerClient)("https://mregojhoivbxdvgjrixz.supabase.co",process.env.SUPABASE_SERVICE_ROLE_KEY,{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:o,options:r})=>e.set(t,o,r))}catch{}}}})}}};var t=require("../../../../../webpack-runtime.js");t.C(e);var o=e=>t(t.s=e),r=t.X(0,[9276,3786,9702,5972,5245,471],()=>o(19234));module.exports=r})();