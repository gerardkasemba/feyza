"use strict";(()=>{var e={};e.id=7056,e.ids=[7056],e.modules={72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},61282:e=>{e.exports=require("child_process")},84770:e=>{e.exports=require("crypto")},80665:e=>{e.exports=require("dns")},17702:e=>{e.exports=require("events")},92048:e=>{e.exports=require("fs")},32615:e=>{e.exports=require("http")},35240:e=>{e.exports=require("https")},98216:e=>{e.exports=require("net")},19801:e=>{e.exports=require("os")},55315:e=>{e.exports=require("path")},76162:e=>{e.exports=require("stream")},82452:e=>{e.exports=require("tls")},17360:e=>{e.exports=require("url")},21764:e=>{e.exports=require("util")},71568:e=>{e.exports=require("zlib")},24325:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>f,patchFetch:()=>h,requestAsyncStorage:()=>m,routeModule:()=>u,serverHooks:()=>x,staticGenerationAsyncStorage:()=>g});var o={};r.r(o),r.d(o,{POST:()=>c});var a=r(49303),i=r(88716),n=r(60670),s=r(87070),l=r(65655),d=r(20471),p=r(9576);async function c(e){try{let t;let{token:r,paypalEmail:o,lenderName:a,interestRate:i,interestType:n}=await e.json();if(!r)return s.NextResponse.json({error:"Token is required"},{status:400});if(!o)return s.NextResponse.json({error:"PayPal email is required"},{status:400});if(!a)return s.NextResponse.json({error:"Lender name is required"},{status:400});let c=await (0,l.k)(),{data:u,error:m}=await c.from("loans").select(`
        *,
        borrower:users!borrower_id(*)
      `).eq("invite_token",r).single();if(m||!u)return s.NextResponse.json({error:"Invalid or expired token"},{status:404});if(u.invite_accepted)return s.NextResponse.json({error:"Already accepted"},{status:400});if(!u.borrower_signed)return s.NextResponse.json({error:"Borrower must sign the agreement first"},{status:400});let{data:g}=await c.from("guest_lenders").select("*").eq("email",u.invite_email).single();if(g){let{data:e,error:r}=await c.from("guest_lenders").update({full_name:a,paypal_email:o,paypal_connected:!0,total_loans:g.total_loans+1,total_amount_lent:g.total_amount_lent+u.amount,updated_at:new Date().toISOString()}).eq("id",g.id).select().single();t=e}else{let e=(0,p.Z)(),{data:r,error:i}=await c.from("guest_lenders").insert({email:u.invite_email,full_name:a,paypal_email:o,paypal_connected:!0,total_loans:1,total_amount_lent:u.amount,access_token:e,access_token_expires_at:new Date(Date.now()+31536e6).toISOString()}).select().single();t=r}let x=u.total_interest||0,f=u.total_amount,h=u.repayment_amount;if(void 0!==i&&i>0){let e=u.total_installments*("weekly"===u.repayment_frequency?.25:"biweekly"===u.repayment_frequency?.5:1);if("simple"===n)x=u.amount*(i/100/12)*e;else{let t=i/100;x=u.amount*Math.pow(1+t/12,e/12*12)-u.amount}h=(f=u.amount+x)/u.total_installments}let{error:y}=await c.from("loans").update({invite_accepted:!0,status:"active",guest_lender_id:t?.id,lender_interest_rate:i||0,lender_interest_type:n||"simple",interest_set_by_lender:i>0,interest_rate:i||u.interest_rate,interest_type:n||u.interest_type,total_interest:Math.round(100*x)/100,total_amount:Math.round(100*f)/100,repayment_amount:Math.round(100*h)/100,amount_remaining:Math.round(100*f)/100,lender_signed:!0,lender_signed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",u.id);if(y)return console.error("Error updating loan:",y),s.NextResponse.json({error:"Failed to accept loan"},{status:500});if(i>0){await c.from("payment_schedule").delete().eq("loan_id",u.id);let e=[],t=u.amount/u.total_installments,r=x/u.total_installments;for(let o=0;o<u.total_installments;o++){let a=new Date(u.start_date);"weekly"===u.repayment_frequency?a.setDate(a.getDate()+7*o):"biweekly"===u.repayment_frequency?a.setDate(a.getDate()+14*o):a.setMonth(a.getMonth()+o),e.push({loan_id:u.id,due_date:a.toISOString(),amount:Math.round(100*h)/100,principal_amount:Math.round(100*t)/100,interest_amount:Math.round(100*r)/100,is_paid:!1})}await c.from("payment_schedule").insert(e)}if(u.borrower?.email)try{let{subject:e,html:t}=(0,d.SN)({borrowerName:u.borrower.full_name,lenderName:a,amount:u.amount,currency:u.currency,loanId:u.id});await (0,d.Cz)({to:u.borrower.email,subject:e,html:t})}catch(e){console.error("Error sending acceptance email:",e)}try{await c.from("notifications").insert({user_id:u.borrower_id,loan_id:u.id,type:"loan_accepted",title:"Loan Accepted! \uD83C\uDF89",message:`${a} has accepted your loan request for ${u.currency} ${u.amount}.${i>0?` Interest rate: ${i}% APR.`:""}`})}catch(e){console.error("Error creating notification:",e)}if(t?.access_token){let e="https://feyza.app",r=`${e}/lender/${t.access_token}`;try{await (0,d.Cz)({to:u.invite_email,subject:"Your Lending Dashboard - Feyza",html:`
            <!DOCTYPE html>
            <html>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <!-- Header with logo and gradient -->
                <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                  <!-- Logo -->
                  <div style="margin-bottom: 20px;">
                    <img src="https://raw.githubusercontent.com/gerardkasemba/feyza/442387cc7eaefdd8a38e999b7dc42a0d526137e6/public/feyza.svg" 
                        alt="Feyza Logo" 
                        style="height: 40px; width: auto; filter: brightness(0) invert(1);">
                  </div>
                  <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">📊 Your Lending Dashboard</h1>
                  <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">Track & Manage Your Loans</p>
                </div>
                
                <!-- Content area -->
                <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
                  <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi ${a},</p>
                  
                  <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
                    <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 20px; font-weight: 600;">Welcome to Your Dashboard</h3>
                    <p style="color: #166534; line-height: 1.6; margin-bottom: 15px;">
                      Thanks for accepting the loan request! You can now track all your loans and repayments using your personal dashboard.
                    </p>
                    <p style="color: #166534; line-height: 1.6;">
                      Your dashboard gives you complete visibility into:
                    </p>
                    <ul style="margin: 15px 0; padding-left: 20px; color: #065f46;">
                      <li style="margin-bottom: 8px; line-height: 1.6;">Active loan status and details</li>
                      <li style="margin-bottom: 8px; line-height: 1.6;">Repayment schedules and history</li>
                      <li style="margin-bottom: 8px; line-height: 1.6;">Borrower information and communication</li>
                      <li style="line-height: 1.6;">Financial reports and analytics</li>
                    </ul>
                  </div>
                  
                  <!-- Main CTA Button -->
                  <a href="${r}" 
                    style="display: block; background: linear-gradient(to right, #059669, #047857); 
                            color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; 
                            font-weight: 600; text-align: center; margin: 30px 0; font-size: 16px;
                            box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2); transition: all 0.2s ease;"
                    onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(5, 150, 105, 0.3)';"
                    onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';">
                    View Your Dashboard →
                  </a>
                  
                  <!-- Quick access tips -->
                  <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #86efac;">
                    <h4 style="color: #065f46; margin: 0 0 10px 0; font-weight: 600; font-size: 16px;">🔗 Quick Access Tips:</h4>
                    <ul style="margin: 0; padding-left: 20px; color: #065f46;">
                      <li style="margin-bottom: 8px; font-size: 14px;">Bookmark the dashboard link for easy access</li>
                      <li style="margin-bottom: 8px; font-size: 14px;">Set up notifications for repayment reminders</li>
                      <li style="font-size: 14px;">Download the mobile app for on-the-go access</li>
                    </ul>
                  </div>
                  
                  <!-- Dashboard features preview -->
                  <div style="background: white; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #bbf7d0;">
                    <h4 style="color: #065f46; margin: 0 0 15px 0; font-weight: 600; font-size: 18px;">Dashboard Features:</h4>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 15px;">
                      <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border: 1px solid #bbf7d0;">
                        <div style="color: #059669; font-weight: 600; margin-bottom: 5px;">📈 Overview</div>
                        <div style="color: #047857; font-size: 13px;">Total portfolio and performance metrics</div>
                      </div>
                      <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border: 1px solid #bbf7d0;">
                        <div style="color: #059669; font-weight: 600; margin-bottom: 5px;">💰 Loans</div>
                        <div style="color: #047857; font-size: 13px;">Active and completed loan details</div>
                      </div>
                      <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border: 1px solid #bbf7d0;">
                        <div style="color: #059669; font-weight: 600; margin-bottom: 5px;">📅 Schedule</div>
                        <div style="color: #047857; font-size: 13px;">Upcoming repayment dates</div>
                      </div>
                      <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border: 1px solid #bbf7d0;">
                        <div style="color: #059669; font-weight: 600; margin-bottom: 5px;">📊 Reports</div>
                        <div style="color: #047857; font-size: 13px;">Financial reports and statements</div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Footer -->
                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0; color: #047857; font-size: 14px;">
                    <p style="margin: 0 0 10px 0; font-weight: 600;">Need Help?</p>
                    <p style="margin: 0;">
                      <a href="${e}/help/dashboard" style="color: #059669; text-decoration: none; font-weight: 500; margin-right: 15px;">
                        Dashboard Guide
                      </a>
                      <a href="${e}/contact" style="color: #059669; text-decoration: none; font-weight: 500; margin-right: 15px;">
                        Contact Support
                      </a>
                      <a href="${e}/resources" style="color: #059669; text-decoration: none; font-weight: 500;">
                        Resources
                      </a>
                    </p>
                  </div>
                </div>
                
                <!-- Signature -->
                <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
                  <p style="margin: 0;">Feyza • Your Trusted Lending Platform</p>
                  <p style="margin: 5px 0 0 0; font-size: 11px;">This link is unique to your account. Keep it secure.</p>
                </div>
              </body>
            </html>
          `})}catch(e){console.error("Error sending dashboard email:",e)}}return s.NextResponse.json({success:!0})}catch(e){return console.error("Error accepting invite:",e),s.NextResponse.json({error:"Internal server error"},{status:500})}}let u=new a.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/invite/accept/route",pathname:"/api/invite/accept",filename:"route",bundlePath:"app/api/invite/accept/route"},resolvedPagePath:"C:\\Users\\GerardKasemba\\feyza\\src\\app\\api\\invite\\accept\\route.ts",nextConfigOutput:"",userland:o}),{requestAsyncStorage:m,staticGenerationAsyncStorage:g,serverHooks:x}=u,f="/api/invite/accept/route";function h(){return(0,n.patchFetch)({serverHooks:x,staticGenerationAsyncStorage:g})}},9576:(e,t,r)=>{r.d(t,{Z:()=>d});var o=r(84770),a=r.n(o);let i={randomUUID:a().randomUUID},n=new Uint8Array(256),s=n.length,l=[];for(let e=0;e<256;++e)l.push((e+256).toString(16).slice(1));let d=function(e,t,r){if(i.randomUUID&&!t&&!e)return i.randomUUID();let o=(e=e||{}).random||(e.rng||function(){return s>n.length-16&&(a().randomFillSync(n),s=0),n.slice(s,s+=16)})();if(o[6]=15&o[6]|64,o[8]=63&o[8]|128,t){r=r||0;for(let e=0;e<16;++e)t[r+e]=o[e];return t}return function(e,t=0){return l[e[t+0]]+l[e[t+1]]+l[e[t+2]]+l[e[t+3]]+"-"+l[e[t+4]]+l[e[t+5]]+"-"+l[e[t+6]]+l[e[t+7]]+"-"+l[e[t+8]]+l[e[t+9]]+"-"+l[e[t+10]]+l[e[t+11]]+l[e[t+12]]+l[e[t+13]]+l[e[t+14]]+l[e[t+15]]}(o)}},65655:(e,t,r)=>{r.d(t,{f:()=>i,k:()=>n});var o=r(67721),a=r(71615);async function i(){let e=await (0,a.cookies)();return(0,o.createServerClient)("https://mregojhoivbxdvgjrixz.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yZWdvamhvaXZieGR2Z2pyaXh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1ODE1NDQsImV4cCI6MjA4MzE1NzU0NH0.I_jEMf00cFYAdF0akvD-HOqXWExxO3E0BV69EHEa5jI",{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:r,options:o})=>e.set(t,r,o))}catch{}}}})}async function n(){let e=await (0,a.cookies)();return(0,o.createServerClient)("https://mregojhoivbxdvgjrixz.supabase.co",process.env.SUPABASE_SERVICE_ROLE_KEY,{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:r,options:o})=>e.set(t,r,o))}catch{}}}})}}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),o=t.X(0,[9276,3786,9702,5972,5245,471],()=>r(24325));module.exports=o})();