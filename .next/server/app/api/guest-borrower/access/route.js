"use strict";(()=>{var e={};e.id=6418,e.ids=[6418],e.modules={72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},61282:e=>{e.exports=require("child_process")},84770:e=>{e.exports=require("crypto")},80665:e=>{e.exports=require("dns")},17702:e=>{e.exports=require("events")},92048:e=>{e.exports=require("fs")},32615:e=>{e.exports=require("http")},35240:e=>{e.exports=require("https")},98216:e=>{e.exports=require("net")},19801:e=>{e.exports=require("os")},55315:e=>{e.exports=require("path")},76162:e=>{e.exports=require("stream")},82452:e=>{e.exports=require("tls")},17360:e=>{e.exports=require("url")},21764:e=>{e.exports=require("util")},71568:e=>{e.exports=require("zlib")},97104:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>f,patchFetch:()=>h,requestAsyncStorage:()=>g,routeModule:()=>x,serverHooks:()=>y,staticGenerationAsyncStorage:()=>m});var o={};r.r(o),r.d(o,{POST:()=>u});var s=r(49303),i=r(88716),n=r(60670),a=r(87070),l=r(65655),p=r(20471),d=r(84770);let c="https://feyza.app";async function u(e){try{let t=await (0,l.k)(),{email:r}=await e.json();if(!r)return a.NextResponse.json({error:"Email is required"},{status:400});let{data:o}=await t.from("users").select("id, email, full_name").eq("email",r.toLowerCase()).single(),s=[];if(o){let{data:e}=await t.from("loans").select(`
          *,
          lender:users!lender_id(full_name, email),
          business_lender:business_profiles!business_lender_id(business_name)
        `).eq("borrower_id",o.id).in("status",["pending","pending_funds","active"]);s=e||[]}let{data:i}=await t.from("loans").select(`
        *,
        lender:users!lender_id(full_name, email),
        business_lender:business_profiles!business_lender_id(business_name)
      `).eq("borrower_invite_email",r.toLowerCase()).in("status",["pending","pending_funds","active"]);i&&(s=[...s,...i]);let n=s.filter((e,t,r)=>t===r.findIndex(t=>t.id===e.id));if(0===n.length)return a.NextResponse.json({error:"No active loans found for this email address"},{status:404});let u=[];for(let e of n){let r=(0,d.randomBytes)(32).toString("hex"),o=new Date(Date.now()+864e5);await t.from("loans").update({borrower_access_token:r,borrower_access_token_expires:o.toISOString()}).eq("id",e.id);let s=e.lender?.full_name||e.business_lender?.business_name||"Your lender";u.push({loanId:e.id,token:r,lenderName:s})}let x=u.map(({token:e,lenderName:t})=>`<li style="margin-bottom: 10px;">
        <strong>${t}</strong><br>
        <a href="${c}/borrower/${e}" style="color: #2563eb;">Access Loan →</a>
      </li>`).join("");return await (0,p.Cz)({to:r,subject:"\uD83D\uDD11 Access Your Loan(s) on Feyza",html:`
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
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">🔑 Access Your Loan(s)</h1>
                <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">Secure Loan Portal Access</p>
              </div>
              
              <!-- Content area -->
              <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
                <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi there,</p>
                
                <p style="color: #166534; line-height: 1.6; margin-bottom: 20px;">
                  You requested access to your loan(s) on Feyza. Click the link(s) below to view and manage your loans:
                </p>
                
                <!-- Loan Links Container -->
                <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
                  <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 20px; font-weight: 600;">Your Loan Access Links</h3>
                  <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; border: 1px solid #86efac;">
                    <ul style="list-style: none; padding: 0; margin: 0;">
                      ${x}
                    </ul>
                  </div>
                </div>

                <!-- Warning/Info Box -->
                <div style="background: linear-gradient(to right, #fef3c7, #fef9c3); padding: 18px; border-radius: 8px; margin: 20px 0; border: 1px solid #fde047;">
                  <div style="display: flex; align-items: flex-start; gap: 12px;">
                    <div style="color: #92400e; font-size: 20px;">⏰</div>
                    <div>
                      <p style="color: #92400e; margin: 0; font-size: 15px; line-height: 1.5;">
                        <strong style="color: #854d0e;">These links will expire in 24 hours.</strong><br>
                        You can always request new links from the access page if needed.
                      </p>
                    </div>
                  </div>
                </div>
                
                <!-- Features Section -->
                <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
                  <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 20px; font-weight: 600;">From your loan page you can:</h3>
                  <ul style="margin: 0; padding-left: 20px; color: #065f46;">
                    <li style="margin-bottom: 10px; line-height: 1.6; padding-left: 5px;">View your loan details and payment schedule</li>
                    <li style="margin-bottom: 10px; line-height: 1.6; padding-left: 5px;">Set up your payment method securely</li>
                    <li style="margin-bottom: 10px; line-height: 1.6; padding-left: 5px;">Track your payments and view history</li>
                    <li style="line-height: 1.6; padding-left: 5px;">Make payments directly to your lender</li>
                  </ul>
                </div>
                
                <!-- Security Tips -->
                <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #86efac;">
                  <h4 style="color: #065f46; margin: 0 0 10px 0; font-weight: 600;">🔒 Security Tips:</h4>
                  <ul style="margin: 0; padding-left: 20px; color: #065f46;">
                    <li style="margin-bottom: 8px; font-size: 14px;">Never share these links with anyone</li>
                    <li style="margin-bottom: 8px; font-size: 14px;">Ensure you're on a secure connection when accessing</li>
                    <li style="font-size: 14px;">Log out after completing your session</li>
                  </ul>
                </div>
                
                <!-- CTA Button -->
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${c}/loans" 
                    style="display: inline-block; background: linear-gradient(to right, #059669, #047857); 
                            color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; 
                            font-weight: 600; text-align: center; font-size: 16px;
                            box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2); transition: all 0.2s ease;"
                    onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(5, 150, 105, 0.3)';"
                    onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';">
                    Manage All Loans →
                  </a>
                </div>
                
                <!-- Footer -->
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0; color: #047857; font-size: 14px;">
                  <p style="margin: 0 0 10px 0;">If you didn't request this, you can safely ignore this email.</p>
                  <p style="margin: 0;">
                    <a href="${c}/help/security" style="color: #059669; text-decoration: none; font-weight: 500; margin-right: 15px;">
                      Security Help
                    </a>
                    <a href="mailto:support@feyza.com" style="color: #059669; text-decoration: none; font-weight: 500;">
                      Contact Support
                    </a>
                  </p>
                </div>
              </div>
              
              <!-- Signature -->
              <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
                <p style="margin: 0;">Feyza • Secure Loan Management System</p>
                <p style="margin: 5px 0 0 0; font-size: 11px; color: #9ca3af;">This link expires in 24 hours for your security</p>
              </div>
            </body>
          </html>
        `}),a.NextResponse.json({success:!0,message:"Access link sent to your email",loansFound:n.length})}catch(e){return console.error("Guest borrower access error:",e),a.NextResponse.json({error:"Internal server error"},{status:500})}}let x=new s.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/guest-borrower/access/route",pathname:"/api/guest-borrower/access",filename:"route",bundlePath:"app/api/guest-borrower/access/route"},resolvedPagePath:"C:\\Users\\GerardKasemba\\feyza\\src\\app\\api\\guest-borrower\\access\\route.ts",nextConfigOutput:"",userland:o}),{requestAsyncStorage:g,staticGenerationAsyncStorage:m,serverHooks:y}=x,f="/api/guest-borrower/access/route";function h(){return(0,n.patchFetch)({serverHooks:y,staticGenerationAsyncStorage:m})}},65655:(e,t,r)=>{r.d(t,{f:()=>i,k:()=>n});var o=r(67721),s=r(71615);async function i(){let e=await (0,s.cookies)();return(0,o.createServerClient)("https://mregojhoivbxdvgjrixz.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yZWdvamhvaXZieGR2Z2pyaXh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1ODE1NDQsImV4cCI6MjA4MzE1NzU0NH0.I_jEMf00cFYAdF0akvD-HOqXWExxO3E0BV69EHEa5jI",{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:r,options:o})=>e.set(t,r,o))}catch{}}}})}async function n(){let e=await (0,s.cookies)();return(0,o.createServerClient)("https://mregojhoivbxdvgjrixz.supabase.co",process.env.SUPABASE_SERVICE_ROLE_KEY,{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:r,options:o})=>e.set(t,r,o))}catch{}}}})}}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),o=t.X(0,[9276,3786,9702,5972,5245,471],()=>r(97104));module.exports=o})();