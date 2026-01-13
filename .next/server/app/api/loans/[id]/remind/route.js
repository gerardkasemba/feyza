"use strict";(()=>{var e={};e.id=1765,e.ids=[1765],e.modules={72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},61282:e=>{e.exports=require("child_process")},84770:e=>{e.exports=require("crypto")},80665:e=>{e.exports=require("dns")},17702:e=>{e.exports=require("events")},92048:e=>{e.exports=require("fs")},32615:e=>{e.exports=require("http")},35240:e=>{e.exports=require("https")},98216:e=>{e.exports=require("net")},19801:e=>{e.exports=require("os")},55315:e=>{e.exports=require("path")},76162:e=>{e.exports=require("stream")},82452:e=>{e.exports=require("tls")},17360:e=>{e.exports=require("url")},21764:e=>{e.exports=require("util")},71568:e=>{e.exports=require("zlib")},53797:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>y,patchFetch:()=>f,requestAsyncStorage:()=>m,routeModule:()=>u,serverHooks:()=>g,staticGenerationAsyncStorage:()=>x});var o={};r.r(o),r.d(o,{POST:()=>c});var a=r(49303),i=r(88716),n=r(60670),s=r(87070),d=r(65655),l=r(20471);let p="https://feyza.app";async function c(e,{params:t}){try{let r=await (0,d.k)(),{id:o}=await t;if(console.log("Remind API called for loan:",o),!o)return s.NextResponse.json({error:"Loan ID is required"},{status:400});let a={};try{a=await e.json()}catch{}let{payment_id:i,message:n}=a,{data:c,error:u}=await r.from("loans").select(`
        *,
        borrower:users!borrower_id(id, email, full_name),
        lender:users!lender_id(id, email, full_name),
        business_lender:business_profiles!business_lender_id(id, business_name, contact_email)
      `).eq("id",o).single();if(u)return console.error("Loan query error:",u),s.NextResponse.json({error:"Loan not found",details:u.message},{status:404});if(!c)return s.NextResponse.json({error:"Loan not found"},{status:404});let m=null,x="there";if(c.borrower?.email?(m=c.borrower.email,x=c.borrower.full_name||"there"):c.borrower_invite_email&&(m=c.borrower_invite_email),!m)return s.NextResponse.json({error:"Borrower email not found"},{status:400});let g=c.lender?.full_name||c.business_lender?.business_name||"Your lender",y=c.borrower_access_token?`${p}/borrower/${c.borrower_access_token}`:`${p}/loans/${o}`,f=null;if(i){let{data:e}=await r.from("payment_schedule").select("*").eq("id",i).eq("loan_id",o).single();f=e}else{let{data:e}=await r.from("payment_schedule").select("*").eq("loan_id",o).eq("is_paid",!1).order("due_date",{ascending:!0}).limit(1).single();f=e}if(!f)return s.NextResponse.json({error:"No pending payments found"},{status:400});let b=new Date(f.due_date),h=new Date,w=Math.ceil((b.getTime()-h.getTime())/864e5),$=w<0;return await (0,l.Cz)({to:m,subject:$?`⚠️ Payment Overdue - Reminder from ${g}`:`💰 Payment Reminder from ${g}`,html:`
        <!DOCTYPE html>
        <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <!-- Header with logo and dynamic gradient -->
            <div style="background: linear-gradient(135deg, ${$?"#dc2626":"#059669"} 0%, ${$?"#b91c1c":"#047857"} 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center; position: relative;">
              <!-- Logo -->
              <div style="margin-bottom: 20px;">
                <img src="https://raw.githubusercontent.com/gerardkasemba/feyza/442387cc7eaefdd8a38e999b7dc42a0d526137e6/public/feyza.svg" 
                    alt="Feyza Logo" 
                    style="height: 40px; width: auto; filter: brightness(0) invert(1);">
              </div>
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">
                ${$?"⚠️ Payment Overdue":"\uD83D\uDCB0 Payment Reminder"}
              </h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">Feyza Payment System</p>
            </div>
            
            <!-- Content area with dynamic background -->
            <div style="background: ${$?"#fef2f2":"#f0fdf4"}; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid ${$?"#fecaca":"#bbf7d0"}; border-top: none;">
              <p style="font-size: 18px; color: ${$?"#991b1b":"#166534"}; margin-bottom: 20px;">Hi ${x},</p>
              
              <p style="color: ${$?"#991b1b":"#166534"}; line-height: 1.6;">
                <strong style="color: ${$?"#dc2626":"#059669"};">${g}</strong> has sent you a payment reminder.
              </p>
              
              <!-- Payment Details Card -->
              <div style="background: white; padding: 24px; border-radius: 12px; margin: 25px 0; border: 1px solid ${$?"#fecaca":"#bbf7d0"}; box-shadow: 0 2px 8px rgba(${$?"220, 38, 38":"5, 150, 105"}, 0.1);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                  <div>
                    <p style="color: #6b7280; margin: 0 0 8px 0; font-size: 14px; font-weight: 500;">Payment Amount</p>
                    <p style="font-size: 36px; font-weight: bold; color: ${$?"#dc2626":"#059669"}; margin: 0;">
                      ${c.currency} ${f.amount.toLocaleString()}
                    </p>
                  </div>
                  
                  <!-- Status Badge -->
                  <div style="background: ${$?"#fee2e2":"#dcfce7"}; padding: 8px 16px; border-radius: 20px; border: 1px solid ${$?"#fecaca":"#bbf7d0"};">
                    <p style="color: ${$?"#dc2626":"#059669"}; margin: 0; font-weight: 600; font-size: 14px;">
                      ${$?`⚠️ ${Math.abs(w)} day${1!==Math.abs(w)?"s":""} overdue`:0===w?"Due Today":`Due in ${w} day${1!==w?"s":""}`}
                    </p>
                  </div>
                </div>
                
                <!-- Due Date -->
                <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-top: 20px;">
                  <p style="color: #6b7280; margin: 0 0 8px 0; font-size: 14px; font-weight: 500;">Due Date</p>
                  <p style="color: ${$?"#991b1b":"#166534"}; margin: 0; font-size: 16px; font-weight: 500;">
                    ${b.toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}
                  </p>
                </div>
              </div>
              
              <!-- Lender Message -->
              ${n?`
                <div style="background: white; padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 4px solid ${$?"#dc2626":"#059669"}; box-shadow: 0 2px 8px rgba(${$?"220, 38, 38":"5, 150, 105"}, 0.1);">
                  <p style="color: #6b7280; margin: 0 0 12px 0; font-size: 14px; font-weight: 500;">
                    Message from <span style="color: ${$?"#dc2626":"#059669"};">${g}</span>:
                  </p>
                  <div style="background: #f9fafb; padding: 16px; border-radius: 8px;">
                    <p style="color: #1f2937; margin: 0; font-style: italic; line-height: 1.6;">"${n}"</p>
                  </div>
                </div>
              `:""}
              
              <!-- Action Buttons -->
              <div style="display: flex; gap: 15px; margin: 30px 0; flex-wrap: wrap;">
                <a href="${y}" 
                  style="display: inline-block; background: linear-gradient(to right, ${$?"#dc2626":"#059669"}, ${$?"#b91c1c":"#047857"}); 
                          color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; 
                          font-weight: 600; text-align: center; font-size: 16px;
                          box-shadow: 0 4px 12px rgba(${$?"220, 38, 38":"5, 150, 105"}, 0.2); transition: all 0.2s ease;
                          flex: 2; min-width: 250px;"
                  onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(${$?"220, 38, 38":"5, 150, 105"}, 0.3)';"
                  onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(${$?"220, 38, 38":"5, 150, 105"}, 0.2)';">
                  View Loan & Make Payment →
                </a>
                
                <a href="${p}/help/payments" 
                  style="display: inline-block; background: white; 
                          color: ${$?"#dc2626":"#059669"}; text-decoration: none; padding: 16px 24px; border-radius: 8px; 
                          font-weight: 600; text-align: center; font-size: 16px; border: 2px solid ${$?"#dc2626":"#059669"};
                          box-shadow: 0 2px 8px rgba(${$?"220, 38, 38":"5, 150, 105"}, 0.1); transition: all 0.2s ease;
                          flex: 1; min-width: 150px;"
                  onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(${$?"220, 38, 38":"5, 150, 105"}, 0.2)';this.style.background='${$?"#fef2f2":"#f0fdf4"}';"
                  onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 8px rgba(${$?"220, 38, 38":"5, 150, 105"}, 0.1)';this.style.background='white';">
                  Payment Help
                </a>
              </div>
              
              <!-- Important Information -->
              <div style="background: ${$?"#fee2e2":"#dcfce7"}; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid ${$?"#fecaca":"#bbf7d0"};">
                <h4 style="color: ${$?"#991b1b":"#065f46"}; margin: 0 0 10px 0; font-weight: 600; font-size: 16px;">
                  ${$?"⚠️ Important:":"\uD83D\uDCA1 Important:"}
                </h4>
                <ul style="margin: 0; padding-left: 20px; color: ${$?"#991b1b":"#065f46"};">
                  <li style="margin-bottom: 8px; line-height: 1.5; font-size: 14px;">
                    ${$?"Late payments may affect your credit score and future loan eligibility.":"Timely payments help maintain good standing with lenders."}
                  </li>
                  <li style="margin-bottom: 8px; line-height: 1.5; font-size: 14px;">
                    If you've already made this payment, please mark it as paid in your account.
                  </li>
                  <li style="line-height: 1.5; font-size: 14px;">
                    Contact your lender directly if you need to discuss payment arrangements.
                  </li>
                </ul>
              </div>
              
              <!-- Footer -->
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid ${$?"#fecaca":"#bbf7d0"}; color: ${$?"#b91c1c":"#047857"}; font-size: 14px;">
                <p style="margin: 0 0 10px 0;">Need assistance with payment?</p>
                <p style="margin: 0;">
                  <a href="${p}/help/payments" style="color: ${$?"#dc2626":"#059669"}; text-decoration: none; font-weight: 500; margin-right: 15px;">
                    Payment FAQ
                  </a>
                  <a href="mailto:support@feyza.com" style="color: ${$?"#dc2626":"#059669"}; text-decoration: none; font-weight: 500;">
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
      `}),await r.from("payment_schedule").update({last_manual_reminder_at:new Date().toISOString(),manual_reminder_count:(f.manual_reminder_count||0)+1}).eq("id",f.id),c.borrower_id&&await r.from("notifications").insert({user_id:c.borrower_id,type:"payment_reminder",title:$?"Payment Overdue Reminder":"Payment Reminder",message:`${g} sent you a reminder. ${c.currency} ${f.amount.toLocaleString()} is ${$?"overdue":"due soon"}.`,loan_id:o}),s.NextResponse.json({success:!0,message:"Reminder sent successfully",sent_to:m,payment_amount:f.amount,due_date:f.due_date})}catch(e){return console.error("Error sending reminder:",e),s.NextResponse.json({error:"Internal server error"},{status:500})}}let u=new a.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/loans/[id]/remind/route",pathname:"/api/loans/[id]/remind",filename:"route",bundlePath:"app/api/loans/[id]/remind/route"},resolvedPagePath:"C:\\Users\\GerardKasemba\\feyza\\src\\app\\api\\loans\\[id]\\remind\\route.ts",nextConfigOutput:"",userland:o}),{requestAsyncStorage:m,staticGenerationAsyncStorage:x,serverHooks:g}=u,y="/api/loans/[id]/remind/route";function f(){return(0,n.patchFetch)({serverHooks:g,staticGenerationAsyncStorage:x})}},65655:(e,t,r)=>{r.d(t,{f:()=>i,k:()=>n});var o=r(67721),a=r(71615);async function i(){let e=await (0,a.cookies)();return(0,o.createServerClient)("https://mregojhoivbxdvgjrixz.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yZWdvamhvaXZieGR2Z2pyaXh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1ODE1NDQsImV4cCI6MjA4MzE1NzU0NH0.I_jEMf00cFYAdF0akvD-HOqXWExxO3E0BV69EHEa5jI",{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:r,options:o})=>e.set(t,r,o))}catch{}}}})}async function n(){let e=await (0,a.cookies)();return(0,o.createServerClient)("https://mregojhoivbxdvgjrixz.supabase.co",process.env.SUPABASE_SERVICE_ROLE_KEY,{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:r,options:o})=>e.set(t,r,o))}catch{}}}})}}};var t=require("../../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),o=t.X(0,[9276,3786,9702,5972,5245,471],()=>r(53797));module.exports=o})();