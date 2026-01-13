"use strict";(()=>{var e={};e.id=5105,e.ids=[5105],e.modules={72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},61282:e=>{e.exports=require("child_process")},84770:e=>{e.exports=require("crypto")},80665:e=>{e.exports=require("dns")},17702:e=>{e.exports=require("events")},92048:e=>{e.exports=require("fs")},32615:e=>{e.exports=require("http")},35240:e=>{e.exports=require("https")},98216:e=>{e.exports=require("net")},19801:e=>{e.exports=require("os")},55315:e=>{e.exports=require("path")},76162:e=>{e.exports=require("stream")},82452:e=>{e.exports=require("tls")},17360:e=>{e.exports=require("url")},21764:e=>{e.exports=require("util")},71568:e=>{e.exports=require("zlib")},18405:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>h,patchFetch:()=>f,requestAsyncStorage:()=>x,routeModule:()=>c,serverHooks:()=>g,staticGenerationAsyncStorage:()=>u});var o={};r.r(o),r.d(o,{POST:()=>d});var a=r(49303),i=r(88716),n=r(60670),s=r(87070),l=r(65655),p=r(20471);async function d(e,{params:t}){try{let{id:r}=await t,o=await (0,l.f)(),{reason:a}=await e.json(),i="http://localhost:3000",{data:{user:n}}=await o.auth.getUser();if(!n)return s.NextResponse.json({error:"Unauthorized"},{status:401});let{data:d,error:c}=await o.from("loans").select("*, borrower:users!borrower_id(*), lender:users!lender_id(*)").eq("id",r).single();if(c||!d)return s.NextResponse.json({error:"Loan not found"},{status:404});if("pending"!==d.status)return s.NextResponse.json({error:"Only pending loans can be cancelled"},{status:400});if(d.borrower_id!==n.id)return s.NextResponse.json({error:"Only the borrower can cancel this loan"},{status:403});let{error:x}=await o.from("loans").update({status:"cancelled",cancelled_at:new Date().toISOString(),cancelled_reason:a||"Cancelled by borrower",updated_at:new Date().toISOString()}).eq("id",r);if(x)return console.error("Error cancelling loan:",x),s.NextResponse.json({error:"Failed to cancel loan"},{status:500});if(d.lender_id)try{await o.from("notifications").insert({user_id:d.lender_id,loan_id:r,type:"loan_cancelled",title:"Loan Request Cancelled",message:`${d.borrower?.full_name||"The borrower"} has cancelled their loan request for ${d.currency} ${d.amount}.`})}catch(e){console.error("Error creating notification:",e)}if(d.invite_email)try{await (0,p.Cz)({to:d.invite_email,subject:"Loan Request Cancelled",html:`
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
                  <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">❌ Loan Request Cancelled</h1>
                  <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">Request Update</p>
                </div>
                
                <!-- Content area -->
                <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
                  <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi there,</p>
                  
                  <!-- Cancellation notice -->
                  <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
                    <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 20px; font-weight: 600;">Loan Request Update</h3>
                    
                    <div style="display: flex; align-items: center; background: #fef2f2; padding: 16px; border-radius: 8px; border: 1px solid #fecaca; margin-bottom: 20px;">
                      <div style="color: #dc2626; font-size: 24px; margin-right: 12px;">⚠️</div>
                      <div>
                        <p style="margin: 0; color: #991b1b; font-weight: 500;">This loan request has been cancelled by the borrower.</p>
                      </div>
                    </div>
                    
                    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
                      <h4 style="margin: 0 0 12px 0; color: #475569; font-weight: 600;">Request Details:</h4>
                      <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px 16px; color: #64748b;">
                        <span style="font-weight: 500;">Borrower:</span>
                        <span style="color: #334155;">${d.borrower?.full_name||"Not specified"}</span>
                        
                        <span style="font-weight: 500;">Amount:</span>
                        <span style="color: #059669; font-weight: 600;">${d.currency} ${d.amount.toLocaleString()}</span>
                        
                        ${d.loan_term?`
                        <span style="font-weight: 500;">Term:</span>
                        <span style="color: #334155;">${d.loan_term} days</span>
                        `:""}
                        
                        ${d.purpose?`
                        <span style="font-weight: 500;">Purpose:</span>
                        <span style="color: #334155;">${d.purpose}</span>
                        `:""}
                      </div>
                    </div>
                    
                    ${a?`
                    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
                      <h4 style="margin: 0 0 12px 0; color: #475569; font-weight: 600;">Cancellation Reason:</h4>
                      <p style="margin: 0; color: #64748b; line-height: 1.6; font-style: italic;">"${a}"</p>
                    </div>
                    `:""}
                    
                    <!-- Status message -->
                    <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; border: 1px solid #86efac; margin-top: 20px;">
                      <div style="display: flex; align-items: center;">
                        <div style="color: #059669; font-size: 20px; margin-right: 12px;">✓</div>
                        <div>
                          <p style="margin: 0; color: #065f46; font-weight: 500;">No further action is required from you.</p>
                          <p style="margin: 8px 0 0 0; color: #047857; font-size: 14px;">This loan request has been removed from your dashboard.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Action buttons -->
                  <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
                    <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 20px; font-weight: 600;">Continue Lending</h3>
                    <p style="color: #166534; line-height: 1.6; margin-bottom: 20px;">
                      Other borrowers are actively seeking funding. Explore new opportunities to grow your portfolio.
                    </p>
                    
                    <div style="display: flex; gap: 15px; margin-top: 25px; flex-wrap: wrap;">
                      <a href="${i}/lend" 
                        style="display: inline-block; background: linear-gradient(to right, #059669, #047857); 
                                color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; 
                                font-weight: 600; text-align: center; font-size: 16px;
                                box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2); transition: all 0.2s ease;
                                flex: 1; min-width: 200px;"
                        onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(5, 150, 105, 0.3)';"
                        onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';">
                        Browse New Opportunities →
                      </a>
                      
                      <a href="${i}/dashboard" 
                        style="display: inline-block; background: white; 
                                color: #059669; text-decoration: none; padding: 14px 28px; border-radius: 8px; 
                                font-weight: 600; text-align: center; font-size: 16px; border: 2px solid #059669;
                                box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1); transition: all 0.2s ease;
                                flex: 1; min-width: 200px;"
                        onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';this.style.background='#f0fdf4';"
                        onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 8px rgba(5, 150, 105, 0.1)';this.style.background='white';">
                        View Dashboard
                      </a>
                    </div>
                  </div>
                  
                  <!-- Footer -->
                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0; color: #047857; font-size: 14px;">
                    <p style="margin: 0 0 10px 0;">Questions about this cancellation?</p>
                    <p style="margin: 0;">
                      <a href="${i}/help/loan-cancellations" style="color: #059669; text-decoration: none; font-weight: 500; margin-right: 15px;">
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
                  <p style="margin: 0;">Feyza • Professional Loan Marketplace</p>
                  <p style="margin: 5px 0 0 0; font-size: 11px;">This is an automated notification. Please do not reply to this email.</p>
                </div>
              </body>
            </html>
          `})}catch(e){console.error("Error sending cancellation email:",e)}return s.NextResponse.json({success:!0})}catch(e){return console.error("Error cancelling loan:",e),s.NextResponse.json({error:"Internal server error"},{status:500})}}let c=new a.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/loans/[id]/cancel/route",pathname:"/api/loans/[id]/cancel",filename:"route",bundlePath:"app/api/loans/[id]/cancel/route"},resolvedPagePath:"C:\\Users\\GerardKasemba\\feyza\\src\\app\\api\\loans\\[id]\\cancel\\route.ts",nextConfigOutput:"",userland:o}),{requestAsyncStorage:x,staticGenerationAsyncStorage:u,serverHooks:g}=c,h="/api/loans/[id]/cancel/route";function f(){return(0,n.patchFetch)({serverHooks:g,staticGenerationAsyncStorage:u})}},65655:(e,t,r)=>{r.d(t,{f:()=>i,k:()=>n});var o=r(67721),a=r(71615);async function i(){let e=await (0,a.cookies)();return(0,o.createServerClient)("https://mregojhoivbxdvgjrixz.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yZWdvamhvaXZieGR2Z2pyaXh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1ODE1NDQsImV4cCI6MjA4MzE1NzU0NH0.I_jEMf00cFYAdF0akvD-HOqXWExxO3E0BV69EHEa5jI",{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:r,options:o})=>e.set(t,r,o))}catch{}}}})}async function n(){let e=await (0,a.cookies)();return(0,o.createServerClient)("https://mregojhoivbxdvgjrixz.supabase.co",process.env.SUPABASE_SERVICE_ROLE_KEY,{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:r,options:o})=>e.set(t,r,o))}catch{}}}})}}};var t=require("../../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),o=t.X(0,[9276,3786,9702,5972,5245,471],()=>r(18405));module.exports=o})();