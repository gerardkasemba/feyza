"use strict";(()=>{var e={};e.id=8795,e.ids=[8795],e.modules={72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},61282:e=>{e.exports=require("child_process")},84770:e=>{e.exports=require("crypto")},80665:e=>{e.exports=require("dns")},17702:e=>{e.exports=require("events")},92048:e=>{e.exports=require("fs")},32615:e=>{e.exports=require("http")},35240:e=>{e.exports=require("https")},98216:e=>{e.exports=require("net")},19801:e=>{e.exports=require("os")},55315:e=>{e.exports=require("path")},76162:e=>{e.exports=require("stream")},82452:e=>{e.exports=require("tls")},17360:e=>{e.exports=require("url")},21764:e=>{e.exports=require("util")},71568:e=>{e.exports=require("zlib")},90022:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>h,patchFetch:()=>y,requestAsyncStorage:()=>x,routeModule:()=>g,serverHooks:()=>f,staticGenerationAsyncStorage:()=>b});var o={};r.r(o),r.d(o,{GET:()=>u,PATCH:()=>m});var i=r(49303),a=r(88716),n=r(60670),s=r(87070),d=r(65655),p=r(71615),l=r(20471);async function c(){let e=await (0,p.cookies)(),t=e.get("agent_id")?.value,r=e.get("agent_token")?.value;if(!t||!r)return null;let o=await (0,d.k)(),{data:i}=await o.from("agents").select("*").eq("id",t).eq("is_active",!0).single();return i}async function u(e,{params:t}){try{if(!await c())return s.NextResponse.json({error:"Unauthorized"},{status:401});let{id:e}=await t,r=await (0,d.k)(),{data:o,error:i}=await r.from("disbursements").select(`
        *,
        loan:loans(
          id,
          amount,
          currency,
          purpose,
          status,
          created_at,
          borrower:users!borrower_id(id, email, full_name, phone)
        ),
        history:disbursement_history(*)
      `).eq("id",e).single();if(i||!o)return s.NextResponse.json({error:"Disbursement not found"},{status:404});return s.NextResponse.json({disbursement:o})}catch(e){return console.error("Error fetching disbursement:",e),s.NextResponse.json({error:"Internal server error"},{status:500})}}async function m(e,{params:t}){try{var r,o;let i=await c();if(!i)return s.NextResponse.json({error:"Unauthorized"},{status:401});let{id:a}=await t,{action:n,notes:p,proof_url:u,local_amount:m,local_currency:g,exchange_rate:x}=await e.json(),b=await (0,d.k)(),{data:f,error:h}=await b.from("disbursements").select(`
        *,
        loan:loans(
          id,
          amount,
          currency,
          borrower:users!borrower_id(id, email, full_name, phone)
        )
      `).eq("id",a).single();if(h||!f)return s.NextResponse.json({error:"Disbursement not found"},{status:404});let y=f.loan?.borrower?.email,v=f.loan?.borrower?.full_name||"there",w=f.recipient_name,k=f.amount,_=f.currency,I={updated_at:new Date().toISOString(),processed_by_agent_id:i.id},S=null;switch(n){case"assign":I.assigned_agent_id=i.id,I.status="processing";break;case"verify":I.recipient_verified=!0,I.recipient_verified_at=new Date().toISOString(),I.verification_notes=p;break;case"ready_for_pickup":if("cash_pickup"!==f.disbursement_method)return s.NextResponse.json({error:"Not a cash pickup disbursement"},{status:400});I.status="ready_for_pickup",y&&((r={borrowerName:v,recipientName:w,amount:k,currency:_,pickupLocation:f.pickup_location,pickupCode:f.pickup_code},S={to:"",subject:`💰 Cash Ready for Pickup - ${r.recipientName}`,html:`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">💰 Cash Ready for Pickup!</h1>
          </div>
          
          <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0;">
            <p style="font-size: 18px; margin-bottom: 20px;">Hi ${r.borrowerName}! 👋</p>
            
            <p>Great news! The cash is ready for <strong>${r.recipientName}</strong> to pick up.</p>
            
            <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0;">
              <div style="text-align: center; margin-bottom: 15px;">
                <p style="color: #6b7280; margin: 0;">Amount</p>
                <p style="font-size: 28px; font-weight: bold; color: #22c55e; margin: 5px 0;">${r.currency} ${r.amount.toLocaleString()}</p>
              </div>
              
              <div style="border-top: 1px solid #e5e7eb; padding-top: 15px;">
                <p style="margin: 5px 0;"><strong>📍 Pickup Location:</strong> ${r.pickupLocation}</p>
                <p style="margin: 5px 0;"><strong>🔑 Pickup Code:</strong></p>
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; margin-top: 10px;">
                  <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #1f2937;">${r.pickupCode}</span>
                </div>
              </div>
            </div>
            
            <div style="background: #fef9c3; border: 1px solid #fde047; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0; color: #854d0e; font-size: 14px;">
                <strong>📝 Important:</strong> Please share this pickup code with ${r.recipientName}. They'll need to present this code along with valid ID to collect the cash.
              </p>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              The cash will be held indefinitely until picked up. If there are any issues, please contact our support team.
            </p>
          </div>
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
            Sent via Feyza • Simple loan tracking for everyone
          </p>
        </body>
      </html>
    `}).to=y);break;case"complete":if(I.status="completed",I.completed_at=new Date().toISOString(),I.completion_proof_url=u,I.completion_notes=p,m&&(I.local_amount=m),g&&(I.local_currency=g),x&&(I.exchange_rate=x),console.log("Completing disbursement, updating loan:",f.loan_id),f.loan_id){let{data:e,error:t}=await b.from("loans").update({status:"active",funds_disbursed:!0,funds_disbursed_at:new Date().toISOString(),funds_disbursed_reference:p||"Disbursed by agent"}).eq("id",f.loan_id).select().single();if(t)return console.error("Error updating loan status:",t),s.NextResponse.json({error:"Failed to activate loan: "+t.message,details:t},{status:500});console.log("Loan updated to active:",e);let r=f.loan?.borrower?.id;if(r){let{error:e}=await b.from("notifications").insert({user_id:r,loan_id:f.loan_id,type:"loan_accepted",title:"✅ Money Delivered to "+w+"!",message:`Great news! ${_} ${k.toLocaleString()} has been delivered to ${w}. Your repayment schedule is now active.`});e&&console.error("Error creating notification:",e)}}y&&((S=function(e){let t={mobile_money:"via Mobile Money",bank_transfer:"via Bank Transfer",cash_pickup:"in cash"}[e.method]||"";return{to:"",subject:`✅ Money Delivered to ${e.recipientName}!`,html:`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">✅ Money Delivered!</h1>
          </div>
          
          <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0;">
            <p style="font-size: 18px; margin-bottom: 20px;">Hi ${e.borrowerName}! 👋</p>
            
            <p>Great news! We've successfully delivered the money to <strong>${e.recipientName}</strong>!</p>
            
            <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; text-align: center;">
              <p style="color: #6b7280; margin: 0 0 10px 0;">Amount Delivered</p>
              <p style="font-size: 32px; font-weight: bold; color: #22c55e; margin: 0;">${e.currency} ${e.amount.toLocaleString()}</p>
              <p style="color: #6b7280; margin: 10px 0 0 0;">${t}</p>
            </div>
            
            <div style="background: #dbeafe; border: 1px solid #93c5fd; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0; color: #1e40af; font-size: 14px;">
                <strong>📅 Your Loan is Now Active!</strong><br>
                Your repayment schedule has started. Please make sure to keep up with your scheduled payments to maintain a good borrower rating.
              </p>
            </div>
            
            <a href="http://localhost:3000/loans/${e.loanId}" style="display: block; background: #22c55e; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; text-align: center; margin: 24px 0;">
              View Your Loan & Schedule →
            </a>
          </div>
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
            Sent via Feyza • Simple loan tracking for everyone
          </p>
        </body>
      </html>
    `}}({borrowerName:v,recipientName:w,amount:k,currency:_,method:f.disbursement_method,loanId:f.loan_id})).to=y);break;case"fail":I.status="failed",I.completion_notes=p,y&&((o={borrowerName:v,recipientName:w,amount:k,currency:_,reason:p||"Unknown reason"},S={to:"",subject:`⚠️ Disbursement Issue - Action Required`,html:`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Disbursement Issue</h1>
          </div>
          
          <div style="background: #fffbeb; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #fde68a;">
            <p style="font-size: 18px; margin-bottom: 20px;">Hi ${o.borrowerName},</p>
            
            <p>We encountered an issue delivering the funds to <strong>${o.recipientName}</strong>.</p>
            
            <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #fde68a;">
              <p style="margin: 5px 0;"><strong>Amount:</strong> ${o.currency} ${o.amount.toLocaleString()}</p>
              <p style="margin: 5px 0;"><strong>Reason:</strong> ${o.reason}</p>
            </div>
            
            <p>Please contact our support team to resolve this issue and ensure ${o.recipientName} receives the funds.</p>
            
            <a href="mailto:support@loantrack.app" style="display: block; background: #d97706; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; text-align: center; margin: 24px 0;">
              Contact Support
            </a>
          </div>
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
            Sent via Feyza • Simple loan tracking for everyone
          </p>
        </body>
      </html>
    `}).to=y);break;case"hold":I.status="on_hold",I.completion_notes=p;break;default:return s.NextResponse.json({error:"Invalid action"},{status:400})}let{error:j}=await b.from("disbursements").update(I).eq("id",a);if(j)return console.error("Error updating disbursement:",j),s.NextResponse.json({error:"Failed to update disbursement"},{status:500});if(await b.from("disbursement_history").insert({disbursement_id:a,action:n,performed_by:i.id,notes:p||`Action: ${n}`,metadata:{agent_name:i.full_name}}),S)try{await (0,l.Cz)(S)}catch(e){console.error("Failed to send email:",e)}return s.NextResponse.json({success:!0,action:n})}catch(e){return console.error("Error updating disbursement:",e),s.NextResponse.json({error:"Internal server error"},{status:500})}}let g=new i.AppRouteRouteModule({definition:{kind:a.x.APP_ROUTE,page:"/api/agent/disbursements/[id]/route",pathname:"/api/agent/disbursements/[id]",filename:"route",bundlePath:"app/api/agent/disbursements/[id]/route"},resolvedPagePath:"C:\\Users\\GerardKasemba\\feyza\\src\\app\\api\\agent\\disbursements\\[id]\\route.ts",nextConfigOutput:"",userland:o}),{requestAsyncStorage:x,staticGenerationAsyncStorage:b,serverHooks:f}=g,h="/api/agent/disbursements/[id]/route";function y(){return(0,n.patchFetch)({serverHooks:f,staticGenerationAsyncStorage:b})}},65655:(e,t,r)=>{r.d(t,{f:()=>a,k:()=>n});var o=r(67721),i=r(71615);async function a(){let e=await (0,i.cookies)();return(0,o.createServerClient)("https://mregojhoivbxdvgjrixz.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yZWdvamhvaXZieGR2Z2pyaXh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1ODE1NDQsImV4cCI6MjA4MzE1NzU0NH0.I_jEMf00cFYAdF0akvD-HOqXWExxO3E0BV69EHEa5jI",{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:r,options:o})=>e.set(t,r,o))}catch{}}}})}async function n(){let e=await (0,i.cookies)();return(0,o.createServerClient)("https://mregojhoivbxdvgjrixz.supabase.co",process.env.SUPABASE_SERVICE_ROLE_KEY,{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:r,options:o})=>e.set(t,r,o))}catch{}}}})}}};var t=require("../../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),o=t.X(0,[9276,3786,9702,5972,5245,471],()=>r(90022));module.exports=o})();