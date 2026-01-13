"use strict";(()=>{var e={};e.id=9617,e.ids=[9617],e.modules={72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},61282:e=>{e.exports=require("child_process")},84770:e=>{e.exports=require("crypto")},80665:e=>{e.exports=require("dns")},17702:e=>{e.exports=require("events")},92048:e=>{e.exports=require("fs")},32615:e=>{e.exports=require("http")},35240:e=>{e.exports=require("https")},98216:e=>{e.exports=require("net")},19801:e=>{e.exports=require("os")},55315:e=>{e.exports=require("path")},76162:e=>{e.exports=require("stream")},82452:e=>{e.exports=require("tls")},17360:e=>{e.exports=require("url")},21764:e=>{e.exports=require("util")},71568:e=>{e.exports=require("zlib")},94554:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>f,patchFetch:()=>m,requestAsyncStorage:()=>x,routeModule:()=>g,serverHooks:()=>u,staticGenerationAsyncStorage:()=>h});var o={};r.r(o),r.d(o,{POST:()=>c});var i=r(49303),s=r(88716),a=r(60670),n=r(87070),d=r(65655),l=r(20471),p=r(9576);async function c(e){try{let t;let{email:r}=await e.json();if(!r||!r.includes("@"))return n.NextResponse.json({error:"Valid email is required"},{status:400});let o=await (0,d.k)(),i="http://localhost:3000",{data:s}=await o.from("loans").select("id").eq("invite_email",r.toLowerCase()).limit(1),{data:a}=await o.from("guest_lenders").select("*").eq("email",r.toLowerCase()).single();if(a){let e=(0,p.Z)(),{data:r}=await o.from("guest_lenders").update({access_token:e,access_token_expires_at:new Date(Date.now()+2592e6).toISOString(),updated_at:new Date().toISOString()}).eq("id",a.id).select().single();t=r}else if(s&&s.length>0){let{data:e}=await o.from("guest_lenders").insert({email:r.toLowerCase(),access_token:(0,p.Z)(),access_token_expires_at:new Date(Date.now()+2592e6).toISOString()}).select().single();t=e}else{try{await (0,l.Cz)({to:r,subject:"Feyza - Dashboard Access Request",html:`
            <!DOCTYPE html>
            <html>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <!-- Header with logo -->
                <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center; position: relative;">
                  <!-- Logo -->
                  <div style="margin-bottom: 15px;">
                    <img src="https://raw.githubusercontent.com/gerardkasemba/feyza/442387cc7eaefdd8a38e999b7dc42a0d526137e6/public/feyza.svg" 
                        alt="Feyza Logo" 
                        style="height: 40px; width: auto; filter: brightness(0) invert(1);">
                  </div>
                  <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Dashboard Access Request</h1>
                </div>
                
                <!-- Content area -->
                <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
                  <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi there,</p>
                  
                  <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
                    <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 20px; font-weight: 600;">Account Status</h3>
                    <p style="color: #166534; line-height: 1.6; margin-bottom: 15px;">
                      You requested access to your lending dashboard, but we don't have any loan requests associated with 
                      <strong style="color: #059669;">${r}</strong> yet.
                    </p>
                    
                    <div style="background: #dcfce7; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #86efac;">
                      <h4 style="margin: 0 0 10px 0; color: #065f46; font-size: 16px; font-weight: 600;">📨 How It Works:</h4>
                      <p style="color: #166534; margin: 0; font-size: 15px; line-height: 1.5;">
                        If someone wants to borrow from you, they'll send you an invite email with a link to review and accept the loan.
                      </p>
                    </div>
                    
                    <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #fde047;">
                      <h4 style="margin: 0 0 10px 0; color: #854d0e; font-size: 16px; font-weight: 600;">⚠️ Important:</h4>
                      <p style="color: #92400e; margin: 0; font-size: 14px; line-height: 1.5;">
                        If you think this is an error, the person requesting to borrow may have used a different email address.
                        Please check with the borrower to confirm the email address they used.
                      </p>
                    </div>
                  </div>
                  
                  <!-- Action section -->
                  <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
                    <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 20px; font-weight: 600;">What You Can Do</h3>
                    <ul style="margin: 0; padding-left: 20px; color: #065f46;">
                      <li style="margin-bottom: 10px; line-height: 1.6; padding-left: 5px;">
                        <strong>Wait for an invitation</strong> - Borrowers will send you loan requests directly
                      </li>
                      <li style="margin-bottom: 10px; line-height: 1.6; padding-left: 5px;">
                        <strong>Share your email</strong> - Make sure borrowers have the correct email address
                      </li>
                      <li style="line-height: 1.6; padding-left: 5px;">
                        <strong>Check spam folder</strong> - Sometimes invitation emails can get filtered
                      </li>
                    </ul>
                  </div>
                  
                  <!-- Resources -->
                  <div style="display: flex; flex-wrap: wrap; gap: 15px; margin: 25px 0;">
                    <a href="${i}/about/lenders" 
                      style="flex: 1; min-width: 150px; background: white; color: #059669; text-decoration: none; 
                              padding: 14px; border-radius: 8px; font-weight: 500; text-align: center; 
                              border: 2px solid #059669; font-size: 14px; transition: all 0.2s ease;"
                      onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.1)';this.style.background='#f0fdf4';"
                      onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='none';this.style.background='white';">
                      📚 Lender Guide
                    </a>
                    
                    <a href="${i}/help/dashboard-access" 
                      style="flex: 1; min-width: 150px; background: white; color: #059669; text-decoration: none; 
                              padding: 14px; border-radius: 8px; font-weight: 500; text-align: center; 
                              border: 2px solid #059669; font-size: 14px; transition: all 0.2s ease;"
                      onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.1)';this.style.background='#f0fdf4';"
                      onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='none';this.style.background='white';">
                      ❓ Help Center
                    </a>
                    
                    <a href="mailto:support@feyza.com" 
                      style="flex: 1; min-width: 150px; background: white; color: #059669; text-decoration: none; 
                              padding: 14px; border-radius: 8px; font-weight: 500; text-align: center; 
                              border: 2px solid #059669; font-size: 14px; transition: all 0.2s ease;"
                      onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.1)';this.style.background='#f0fdf4';"
                      onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='none';this.style.background='white';">
                      ✉️ Contact Us
                    </a>
                  </div>
                  
                  <!-- Footer -->
                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0; color: #047857; font-size: 14px;">
                    <p style="margin: 0 0 10px 0;"><strong>Feyza Lending Platform</strong></p>
                    <p style="margin: 0; font-size: 13px; color: #6b7280;">
                      This is an automated message. Please do not reply to this email.
                    </p>
                  </div>
                </div>
              </body>
            </html>
          `})}catch(e){console.error("Error sending no-loans email:",e)}return n.NextResponse.json({success:!0})}if(t){let e=`${i}/lender/${t.access_token}`;try{await (0,l.Cz)({to:r,subject:"Your Feyza Lending Dashboard",html:`
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
                  <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">📊 Your Lending Dashboard</h1>
                  <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">Secure Access Link</p>
                </div>
                
                <!-- Content area -->
                <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
                  <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi there,</p>
                  
                  <p style="color: #166534; line-height: 1.6; margin-bottom: 20px;">
                    Here's your secure link to access your lending dashboard where you can view and manage all your loans:
                  </p>
                  
                  <!-- Main CTA Section -->
                  <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1); text-align: center;">
                    <h3 style="margin: 0 0 20px 0; color: #065f46; font-size: 20px; font-weight: 600;">Direct Access to Your Dashboard</h3>
                    
                    <a href="${e}" 
                      style="display: inline-block; background: linear-gradient(to right, #059669, #047857); 
                              color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; 
                              font-weight: 600; text-align: center; margin: 20px 0; font-size: 18px;
                              box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2); transition: all 0.2s ease;"
                      onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(5, 150, 105, 0.3)';"
                      onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';">
                      Access Your Dashboard →
                    </a>
                    
                    <p style="color: #059669; font-size: 14px; margin: 15px 0 0 0;">
                      <strong>One-click access</strong> to all your lending activities
                    </p>
                  </div>
                  
                  <!-- Security Notice -->
                  <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #86efac;">
                    <h4 style="color: #065f46; margin: 0 0 10px 0; font-weight: 600; font-size: 16px;">🔒 Security Information</h4>
                    <p style="color: #166534; font-size: 14px; line-height: 1.5; margin: 0;">
                      This secure link expires in <strong>30 days</strong>. Keep it safe - anyone with this link can access your lending information.
                    </p>
                  </div>
                  
                  <!-- Dashboard Features -->
                  <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0;">
                    <h4 style="color: #065f46; margin: 0 0 15px 0; font-weight: 600; font-size: 18px;">What you can do in your dashboard:</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin-top: 15px;">
                      <div style="padding: 15px; background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
                        <div style="color: #059669; font-weight: 600; margin-bottom: 5px;">📈 Monitor Loans</div>
                        <div style="color: #166534; font-size: 14px;">Track active loans and performance metrics</div>
                      </div>
                      <div style="padding: 15px; background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
                        <div style="color: #059669; font-weight: 600; margin-bottom: 5px;">💰 Manage Funds</div>
                        <div style="color: #166534; font-size: 14px;">View and adjust your capital pool</div>
                      </div>
                      <div style="padding: 15px; background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
                        <div style="color: #059669; font-weight: 600; margin-bottom: 5px;">⚙️ Settings</div>
                        <div style="color: #166534; font-size: 14px;">Configure lending preferences and criteria</div>
                      </div>
                      <div style="padding: 15px; background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
                        <div style="color: #059669; font-weight: 600; margin-bottom: 5px;">📊 Analytics</div>
                        <div style="color: #166534; font-size: 14px;">View detailed reports and insights</div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Alternative Access -->
                  <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px dashed #059669;">
                    <p style="color: #065f46; margin: 0 0 10px 0; font-weight: 600;">Alternative Access Method:</p>
                    <p style="color: #166534; font-size: 14px; margin: 0; line-height: 1.5;">
                      You can also log in directly at 
                      <a href="${i}/login" style="color: #059669; font-weight: 500; text-decoration: none;">${i}/login</a> 
                      using your email credentials.
                    </p>
                  </div>
                  
                  <!-- Footer -->
                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0; color: #047857; font-size: 14px;">
                    <p style="margin: 0 0 10px 0;">Questions about your dashboard?</p>
                    <p style="margin: 0;">
                      <a href="${i}/help/dashboard" style="color: #059669; text-decoration: none; font-weight: 500; margin-right: 15px;">
                        Dashboard Guide
                      </a>
                      <a href="mailto:support@feyza.com" style="color: #059669; text-decoration: none; font-weight: 500;">
                        Contact Support
                      </a>
                    </p>
                  </div>
                </div>
                
                <!-- Signature -->
                <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
                  <p style="margin: 0 0 5px 0;">This is an automated message from Feyza</p>
                  <p style="margin: 0;">
                    If you didn't request this dashboard link, you can safely ignore this email.
                  </p>
                </div>
              </body>
            </html>
          `})}catch(e){console.error("Error sending dashboard link:",e)}}return n.NextResponse.json({success:!0})}catch(e){return console.error("Error in lender access:",e),n.NextResponse.json({error:"Internal server error"},{status:500})}}let g=new i.AppRouteRouteModule({definition:{kind:s.x.APP_ROUTE,page:"/api/lender/access/route",pathname:"/api/lender/access",filename:"route",bundlePath:"app/api/lender/access/route"},resolvedPagePath:"C:\\Users\\GerardKasemba\\feyza\\src\\app\\api\\lender\\access\\route.ts",nextConfigOutput:"",userland:o}),{requestAsyncStorage:x,staticGenerationAsyncStorage:h,serverHooks:u}=g,f="/api/lender/access/route";function m(){return(0,a.patchFetch)({serverHooks:u,staticGenerationAsyncStorage:h})}},9576:(e,t,r)=>{r.d(t,{Z:()=>l});var o=r(84770),i=r.n(o);let s={randomUUID:i().randomUUID},a=new Uint8Array(256),n=a.length,d=[];for(let e=0;e<256;++e)d.push((e+256).toString(16).slice(1));let l=function(e,t,r){if(s.randomUUID&&!t&&!e)return s.randomUUID();let o=(e=e||{}).random||(e.rng||function(){return n>a.length-16&&(i().randomFillSync(a),n=0),a.slice(n,n+=16)})();if(o[6]=15&o[6]|64,o[8]=63&o[8]|128,t){r=r||0;for(let e=0;e<16;++e)t[r+e]=o[e];return t}return function(e,t=0){return d[e[t+0]]+d[e[t+1]]+d[e[t+2]]+d[e[t+3]]+"-"+d[e[t+4]]+d[e[t+5]]+"-"+d[e[t+6]]+d[e[t+7]]+"-"+d[e[t+8]]+d[e[t+9]]+"-"+d[e[t+10]]+d[e[t+11]]+d[e[t+12]]+d[e[t+13]]+d[e[t+14]]+d[e[t+15]]}(o)}},65655:(e,t,r)=>{r.d(t,{f:()=>s,k:()=>a});var o=r(67721),i=r(71615);async function s(){let e=await (0,i.cookies)();return(0,o.createServerClient)("https://mregojhoivbxdvgjrixz.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yZWdvamhvaXZieGR2Z2pyaXh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1ODE1NDQsImV4cCI6MjA4MzE1NzU0NH0.I_jEMf00cFYAdF0akvD-HOqXWExxO3E0BV69EHEa5jI",{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:r,options:o})=>e.set(t,r,o))}catch{}}}})}async function a(){let e=await (0,i.cookies)();return(0,o.createServerClient)("https://mregojhoivbxdvgjrixz.supabase.co",process.env.SUPABASE_SERVICE_ROLE_KEY,{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:r,options:o})=>e.set(t,r,o))}catch{}}}})}}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),o=t.X(0,[9276,3786,9702,5972,5245,471],()=>r(94554));module.exports=o})();