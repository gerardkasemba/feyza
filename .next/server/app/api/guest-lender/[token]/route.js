"use strict";(()=>{var e={};e.id=2332,e.ids=[2332],e.modules={72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},6088:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>p,patchFetch:()=>g,requestAsyncStorage:()=>d,routeModule:()=>c,serverHooks:()=>m,staticGenerationAsyncStorage:()=>_});var a={};r.r(a),r.d(a,{GET:()=>u});var n=r(49303),o=r(88716),s=r(60670),i=r(87070),l=r(65655);async function u(e,{params:t}){try{let{token:e}=await t,r=await (0,l.k)(),{data:a,error:n}=await r.from("guest_lenders").select("*").eq("access_token",e).single();if(n||!a)return i.NextResponse.json({error:"Invalid or expired link"},{status:404});if(a.access_token_expires_at&&new Date(a.access_token_expires_at)<new Date)return i.NextResponse.json({error:"This link has expired"},{status:404});let{data:o,error:s}=await r.from("loans").select(`
        id,
        amount,
        currency,
        status,
        interest_rate,
        total_amount,
        amount_paid,
        amount_remaining,
        start_date,
        created_at,
        borrower_invite_email,
        borrower:users!borrower_id(full_name, email)
      `).eq("guest_lender_id",a.id).order("created_at",{ascending:!1}),{data:u}=await r.from("loans").select(`
        id,
        amount,
        currency,
        status,
        interest_rate,
        total_amount,
        amount_paid,
        amount_remaining,
        start_date,
        created_at,
        borrower_invite_email,
        borrower:users!borrower_id(full_name, email)
      `).eq("invite_email",a.email).is("guest_lender_id",null).order("created_at",{ascending:!1}),c=[...o||[],...u||[]].map(e=>e.id),{data:d}=await r.from("loan_requests").select("loan_id, borrower_name").in("loan_id",c),_=new Map((d||[]).map(e=>[e.loan_id,e.borrower_name])),m=[...o||[],...u||[]].map(e=>{let t=e.borrower,r=t?.full_name||t?.email;return r||(r=_.get(e.id)),!r&&e.borrower_invite_email&&(r=e.borrower_invite_email.split("@")[0]),{id:e.id,borrower_name:r||"Guest Borrower",amount:e.amount,currency:e.currency,status:e.status,interest_rate:e.interest_rate||0,total_amount:e.total_amount,amount_paid:e.amount_paid||0,amount_remaining:e.amount_remaining||e.total_amount,start_date:e.start_date,created_at:e.created_at}});return i.NextResponse.json({lender:{id:a.id,email:a.email,full_name:a.full_name,phone:a.phone,paypal_email:a.paypal_email,paypal_connected:a.paypal_connected,total_loans:a.total_loans,total_amount_lent:a.total_amount_lent},loans:m})}catch(e){return console.error("Error fetching guest lender data:",e),i.NextResponse.json({error:"Internal server error"},{status:500})}}let c=new n.AppRouteRouteModule({definition:{kind:o.x.APP_ROUTE,page:"/api/guest-lender/[token]/route",pathname:"/api/guest-lender/[token]",filename:"route",bundlePath:"app/api/guest-lender/[token]/route"},resolvedPagePath:"C:\\Users\\GerardKasemba\\feyza\\src\\app\\api\\guest-lender\\[token]\\route.ts",nextConfigOutput:"",userland:a}),{requestAsyncStorage:d,staticGenerationAsyncStorage:_,serverHooks:m}=c,p="/api/guest-lender/[token]/route";function g(){return(0,s.patchFetch)({serverHooks:m,staticGenerationAsyncStorage:_})}},65655:(e,t,r)=>{r.d(t,{f:()=>o,k:()=>s});var a=r(67721),n=r(71615);async function o(){let e=await (0,n.cookies)();return(0,a.createServerClient)("https://mregojhoivbxdvgjrixz.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yZWdvamhvaXZieGR2Z2pyaXh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1ODE1NDQsImV4cCI6MjA4MzE1NzU0NH0.I_jEMf00cFYAdF0akvD-HOqXWExxO3E0BV69EHEa5jI",{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:r,options:a})=>e.set(t,r,a))}catch{}}}})}async function s(){let e=await (0,n.cookies)();return(0,a.createServerClient)("https://mregojhoivbxdvgjrixz.supabase.co",process.env.SUPABASE_SERVICE_ROLE_KEY,{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:r,options:a})=>e.set(t,r,a))}catch{}}}})}}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),a=t.X(0,[9276,3786,9702,5972],()=>r(6088));module.exports=a})();