"use strict";(()=>{var e={};e.id=5055,e.ids=[5055],e.modules={72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},61282:e=>{e.exports=require("child_process")},84770:e=>{e.exports=require("crypto")},80665:e=>{e.exports=require("dns")},17702:e=>{e.exports=require("events")},92048:e=>{e.exports=require("fs")},32615:e=>{e.exports=require("http")},35240:e=>{e.exports=require("https")},98216:e=>{e.exports=require("net")},19801:e=>{e.exports=require("os")},55315:e=>{e.exports=require("path")},76162:e=>{e.exports=require("stream")},82452:e=>{e.exports=require("tls")},17360:e=>{e.exports=require("url")},21764:e=>{e.exports=require("util")},71568:e=>{e.exports=require("zlib")},54013:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>x,patchFetch:()=>h,requestAsyncStorage:()=>_,routeModule:()=>m,serverHooks:()=>f,staticGenerationAsyncStorage:()=>g});var a={};r.r(a),r.d(a,{GET:()=>c,POST:()=>p});var n=r(49303),s=r(88716),i=r(60670),o=r(87070),d=r(65655),l=r(20471);async function p(e,{params:t}){try{let{id:r}=await t,{action:a,decline_reason:n}=await e.json();if(!["accept","decline"].includes(a))return o.NextResponse.json({error:'Invalid action. Use "accept" or "decline"'},{status:400});let s=await (0,d.f)(),i=await (0,d.k)(),{data:{user:p}}=await s.auth.getUser();if(!p)return o.NextResponse.json({error:"Unauthorized"},{status:401});let{data:c,error:m}=await i.from("loan_matches").select(`
        *,
        loan:loans(
          *,
          borrower:users!borrower_id(id, email, full_name)
        )
      `).eq("id",r).single();if(m||!c)return o.NextResponse.json({error:"Match not found"},{status:404});let _=c.lender_user_id===p.id;if(!_&&c.lender_business_id){let{data:e}=await s.from("business_profiles").select("user_id").eq("id",c.lender_business_id).single();_=e?.user_id===p.id}if(!_)return o.NextResponse.json({error:"Not authorized"},{status:403});if("pending"!==c.status)return o.NextResponse.json({error:`Match already ${c.status}`,status:c.status},{status:400});if(new Date(c.expires_at)<new Date)return await i.from("loan_matches").update({status:"expired"}).eq("id",r),o.NextResponse.json({error:"Match has expired"},{status:400});let g=c.loan;if("accept"===a){let e="Lender",t=null,a=10;if(c.lender_user_id){let{data:r}=await i.from("lender_preferences").select("interest_rate").eq("user_id",c.lender_user_id).single(),{data:n}=await i.from("users").select("full_name, email").eq("id",c.lender_user_id).single();a=r?.interest_rate||10,e=n?.full_name||"Lender",t=n?.email||null}else if(c.lender_business_id){let{data:r}=await i.from("lender_preferences").select("interest_rate").eq("business_id",c.lender_business_id).single(),{data:n}=await i.from("business_profiles").select("business_name, contact_email").eq("id",c.lender_business_id).single();a=r?.interest_rate||10,e=n?.business_name||"Lender",t=n?.contact_email||null}let n=g.amount||0,s=g.total_installments||1,d=g.repayment_frequency||"monthly",p=4;"weekly"===d?p=1:"biweekly"===d?p=2:"monthly"===d&&(p=4);let u=s*p,m=Math.round(a/100*n*(u/52)*100)/100,_=Math.round((n+m)*100)/100,f=Math.round(_/s*100)/100,x={status:"active",match_status:"matched",matched_at:new Date().toISOString(),interest_rate:a,total_interest:m,total_amount:_,repayment_amount:f,amount_remaining:_,invite_accepted:!0,lender_signed:!0,lender_signed_at:new Date().toISOString(),funds_sent:!1};if(c.lender_user_id?x.lender_id=c.lender_user_id:c.lender_business_id&&(x.business_lender_id=c.lender_business_id),await i.from("loans").update(x).eq("id",g.id),s>0){let e=Math.round(n/s*100)/100,t=Math.round(m/s*100)/100,{data:r}=await i.from("payment_schedule").select("id").eq("loan_id",g.id).order("due_date",{ascending:!0});if(r&&r.length>0)for(let a of r)await i.from("payment_schedule").update({amount:f,principal_amount:e,interest_amount:t}).eq("id",a.id)}await i.from("loan_matches").update({status:"accepted",responded_at:new Date().toISOString()}).eq("id",r),await i.from("loan_matches").update({status:"skipped"}).eq("loan_id",g.id).neq("id",r).eq("status","pending");let h=c.lender_user_id?"user_id":"business_id",b=c.lender_user_id||c.lender_business_id,{data:y}=await i.from("lender_preferences").select("capital_reserved, total_loans_funded, total_amount_funded").eq(h,b).single();y&&await i.from("lender_preferences").update({capital_reserved:(y.capital_reserved||0)+g.amount,total_loans_funded:(y.total_loans_funded||0)+1,total_amount_funded:(y.total_amount_funded||0)+g.amount,last_loan_assigned_at:new Date().toISOString()}).eq(h,b);let w="https://feyza.app";return t&&await (0,l.Cz)({to:t,subject:"✅ You Accepted a Loan!",html:`
            <!DOCTYPE html>
            <html>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                  <h1 style="color: white; margin: 0;">✅ Loan Accepted!</h1>
                </div>
                <div style="background: #f5f3ff; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #c4b5fd;">
                  <p style="font-size: 18px;">Hi ${e}! 👋</p>
                  <p>You have successfully accepted a loan request.</p>
                  
                  <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #c4b5fd;">
                    <div style="text-align: center; margin-bottom: 15px;">
                      <p style="color: #6b7280; margin: 0;">Loan Amount</p>
                      <p style="font-size: 32px; font-weight: bold; color: #4f46e5; margin: 5px 0;">${g.currency} ${n.toLocaleString()}</p>
                      <p style="color: #6b7280; margin: 5px 0;">Interest Rate: ${a}% p.a.</p>
                      <p style="color: #6b7280; margin: 5px 0;">Total Repayment: ${g.currency} ${_.toLocaleString()}</p>
                    </div>
                    <div style="border-top: 1px solid #e5e7eb; padding-top: 15px;">
                      <p style="margin: 5px 0;"><strong>Borrower:</strong> ${g.borrower?.full_name||"Anonymous"}</p>
                      <p style="margin: 5px 0;"><strong>Purpose:</strong> ${g.purpose||"Not specified"}</p>
                    </div>
                  </div>
                  
                  <div style="background: #fef9c3; border: 1px solid #fde047; border-radius: 8px; padding: 16px; margin: 20px 0;">
                    <p style="margin: 0; color: #854d0e; font-size: 14px;">
                      <strong>💰 Next Step:</strong> Please send <strong>${g.currency} ${n.toLocaleString()}</strong> to the borrower via PayPal.
                    </p>
                  </div>
                  
                  <a href="${w}/loans/${g.id}" style="display: block; background: #4f46e5; color: white; text-decoration: none; padding: 16px; border-radius: 8px; text-align: center;">
                    View Loan & Send Payment →
                  </a>
                </div>
              </body>
            </html>
          `}),g.borrower?.email&&await (0,l.Cz)({to:g.borrower.email,subject:"\uD83C\uDF89 Your Loan Has Been Accepted!",html:`
            <!DOCTYPE html>
            <html>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                  <h1 style="color: white; margin: 0;">🎉 Loan Accepted!</h1>
                </div>
                <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0;">
                  <p>Hi ${g.borrower.full_name||"there"}!</p>
                  <p>Great news! <strong>${e}</strong> has accepted your loan request.</p>
                  <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center;">
                    <p style="color: #6b7280; margin: 0;">Loan Amount</p>
                    <p style="font-size: 32px; font-weight: bold; color: #22c55e; margin: 5px 0;">${g.currency} ${n.toLocaleString()}</p>
                    <p style="color: #6b7280; margin: 5px 0;">Interest Rate: ${a}% p.a.</p>
                    <p style="color: #6b7280; margin: 5px 0;">Total Repayment: ${g.currency} ${_.toLocaleString()}</p>
                  </div>
                  <div style="background: #dbeafe; border: 1px solid #93c5fd; border-radius: 8px; padding: 16px; margin: 20px 0;">
                    <p style="margin: 0; color: #1e40af; font-size: 14px;">
                      <strong>💰 Next:</strong> The lender will send ${g.currency} ${n.toLocaleString()} to your PayPal account. You'll be notified when payment is sent!
                    </p>
                  </div>
                  <a href="${w}/loans/${g.id}" style="display: block; background: #22c55e; color: white; text-decoration: none; padding: 16px; border-radius: 8px; text-align: center;">
                    View Your Loan →
                  </a>
                </div>
              </body>
            </html>
          `}),await i.from("notifications").insert({user_id:g.borrower_id,loan_id:g.id,type:"loan_accepted",title:"Loan Accepted! \uD83C\uDF89",message:`${e} has accepted your loan request for ${g.currency} ${g.amount}.`}),o.NextResponse.json({success:!0,action:"accepted",loan_id:g.id,message:"Loan accepted successfully"})}{await i.from("loan_matches").update({status:"declined",responded_at:new Date().toISOString(),decline_reason:n}).eq("id",r),c.lender_user_id,c.lender_user_id||c.lender_business_id;let{data:e}=await i.from("loan_matches").select("*").eq("loan_id",g.id).eq("status","pending").order("match_rank",{ascending:!0}).limit(1).single();if(e)return await u(i,g,e),await i.from("loans").update({current_match_id:e.id}).eq("id",g.id),o.NextResponse.json({success:!0,action:"declined",message:"Loan declined. Offering to next matching lender.",next_lender_notified:!0});return await i.from("loans").update({match_status:"no_match",current_match_id:null}).eq("id",g.id),g.borrower?.email&&await (0,l.Cz)({to:g.borrower.email,subject:"\uD83D\uDE14 No Matching Lenders Available",html:`
              <body style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: #fef9c3; padding: 30px; border-radius: 16px; border: 1px solid #fde047;">
                  <h2 style="color: #854d0e;">No Matching Lenders</h2>
                  <p>Hi ${g.borrower.full_name||"there"},</p>
                  <p>Unfortunately, we couldn't find a lender for your ${g.currency} ${g.amount} loan request at this time.</p>
                  <p>You can try again later or adjust your loan terms.</p>
                </div>
              </body>
            `}),o.NextResponse.json({success:!0,action:"declined",message:"Loan declined. No more matching lenders available.",next_lender_notified:!1})}}catch(e){return console.error("Error processing match response:",e),o.NextResponse.json({error:"Internal server error"},{status:500})}}async function u(e,t,r){let a=null,n="Lender";if(r.lender_user_id){let{data:t}=await e.from("users").select("email, full_name").eq("id",r.lender_user_id).single();a=t?.email,n=t?.full_name||"Lender"}else if(r.lender_business_id){let{data:t}=await e.from("business_profiles").select("contact_email, business_name").eq("id",r.lender_business_id).single();a=t?.contact_email,n=t?.business_name||"Lender"}a&&await (0,l.Cz)({to:a,subject:`🎯 New Loan Match: ${t.currency} ${t.amount}`,html:`
        <body style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0;">🎯 You've Been Matched!</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e5e7eb;">
            <p>Hi ${n}!</p>
            <p>A loan matching your preferences is now available:</p>
            <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center;">
              <p style="font-size: 32px; font-weight: bold; color: #4f46e5;">${t.currency} ${t.amount.toLocaleString()}</p>
            </div>
            <p style="color: #854d0e; background: #fef9c3; padding: 12px; border-radius: 8px;">
              ⏰ You have 24 hours to respond before it's offered to another lender.
            </p>
            <a href="https://feyza.app/lender/matches/${r.id}" style="display: block; background: #4f46e5; color: white; text-decoration: none; padding: 16px; border-radius: 8px; text-align: center; margin-top: 20px;">
              Review & Accept →
            </a>
          </div>
        </body>
      `}),r.lender_user_id&&await e.from("notifications").insert({user_id:r.lender_user_id,loan_id:t.id,type:"loan_match_offer",title:"\uD83C\uDFAF New Loan Match!",message:`A ${t.currency} ${t.amount} loan is now available. You have 24h to respond.`})}async function c(e,{params:t}){try{let{id:e}=await t,r=await (0,d.f)(),{data:{user:a}}=await r.auth.getUser();if(!a)return o.NextResponse.json({error:"Unauthorized"},{status:401});let n=await (0,d.k)(),{data:s,error:i}=await n.from("loan_matches").select(`
        *,
        loan:loans(
          *,
          borrower:users!borrower_id(
            id, 
            full_name, 
            borrower_rating, 
            verification_status,
            total_payments_made,
            payments_on_time,
            payments_early
          )
        )
      `).eq("id",e).single();if(i||!s)return o.NextResponse.json({error:"Match not found"},{status:404});let l=s.lender_user_id===a.id;if(!l&&s.lender_business_id){let{data:e}=await r.from("business_profiles").select("user_id").eq("id",s.lender_business_id).single();l=e?.user_id===a.id}if(!l)return o.NextResponse.json({error:"Not authorized"},{status:403});return o.NextResponse.json({match:s})}catch(e){return console.error("Error fetching match:",e),o.NextResponse.json({error:"Internal server error"},{status:500})}}let m=new n.AppRouteRouteModule({definition:{kind:s.x.APP_ROUTE,page:"/api/matching/[id]/route",pathname:"/api/matching/[id]",filename:"route",bundlePath:"app/api/matching/[id]/route"},resolvedPagePath:"C:\\Users\\GerardKasemba\\feyza\\src\\app\\api\\matching\\[id]\\route.ts",nextConfigOutput:"",userland:a}),{requestAsyncStorage:_,staticGenerationAsyncStorage:g,serverHooks:f}=m,x="/api/matching/[id]/route";function h(){return(0,i.patchFetch)({serverHooks:f,staticGenerationAsyncStorage:g})}},65655:(e,t,r)=>{r.d(t,{f:()=>s,k:()=>i});var a=r(67721),n=r(71615);async function s(){let e=await (0,n.cookies)();return(0,a.createServerClient)("https://mregojhoivbxdvgjrixz.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yZWdvamhvaXZieGR2Z2pyaXh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1ODE1NDQsImV4cCI6MjA4MzE1NzU0NH0.I_jEMf00cFYAdF0akvD-HOqXWExxO3E0BV69EHEa5jI",{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:r,options:a})=>e.set(t,r,a))}catch{}}}})}async function i(){let e=await (0,n.cookies)();return(0,a.createServerClient)("https://mregojhoivbxdvgjrixz.supabase.co",process.env.SUPABASE_SERVICE_ROLE_KEY,{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:r,options:a})=>e.set(t,r,a))}catch{}}}})}}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),a=t.X(0,[9276,3786,9702,5972,5245,471],()=>r(54013));module.exports=a})();