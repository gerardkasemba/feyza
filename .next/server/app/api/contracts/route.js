"use strict";(()=>{var e={};e.id=8326,e.ids=[8326],e.modules={72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},29642:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>b,patchFetch:()=>y,requestAsyncStorage:()=>g,routeModule:()=>u,serverHooks:()=>h,staticGenerationAsyncStorage:()=>m});var n={};r.r(n),r.d(n,{GET:()=>p,POST:()=>c});var a=r(49303),s=r(88716),o=r(60670),i=r(87070),d=r(65655),l=r(31787);async function p(e){try{let{searchParams:t}=new URL(e.url),r=t.get("loanId");if(!r)return i.NextResponse.json({error:"loanId is required"},{status:400});let n=await (0,d.f)(),{data:a,error:s}=await n.from("loans").select(`
        *,
        borrower:users!borrower_id(*),
        lender:users!lender_id(*),
        business_lender:business_profiles(*, owner:users!user_id(*)),
        schedule:payment_schedule(*)
      `).eq("id",r).single();if(s||!a)return i.NextResponse.json({error:"Loan not found"},{status:404});let o=function(e){let t=e.borrower;e.lender||e.business_lender;let r="business"===e.lender_type?e.business_lender?.business_name:e.lender?.full_name||e.invite_email||"Pending",n="business"===e.lender_type?"Business":"Individual",a=(0,l.WU)(new Date(e.start_date),"MMMM d, yyyy"),s=(0,l.WU)(new Date(e.created_at),"MMMM d, yyyy"),o=e.schedule?.sort((e,t)=>new Date(t.due_date).getTime()-new Date(e.due_date).getTime())[0],i=o?(0,l.WU)(new Date(o.due_date),"MMMM d, yyyy"):"TBD";return`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Loan Agreement - ${e.id}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Times New Roman', Times, serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      background: white;
    }
    .header {
      text-align: center;
      border-bottom: 3px double #333;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      font-size: 28px;
      margin-bottom: 5px;
    }
    .header p {
      color: #666;
    }
    .section {
      margin-bottom: 25px;
    }
    .section h2 {
      font-size: 16px;
      border-bottom: 1px solid #ccc;
      padding-bottom: 5px;
      margin-bottom: 15px;
      text-transform: uppercase;
    }
    .parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
    }
    .party {
      background: #f9f9f9;
      padding: 15px;
      border-radius: 8px;
    }
    .party h3 {
      font-size: 14px;
      color: #666;
      margin-bottom: 10px;
    }
    .party p {
      margin: 5px 0;
    }
    .terms-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    .terms-table th,
    .terms-table td {
      padding: 12px;
      text-align: left;
      border: 1px solid #ddd;
    }
    .terms-table th {
      background: #f5f5f5;
      font-weight: bold;
    }
    .schedule-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 14px;
    }
    .schedule-table th,
    .schedule-table td {
      padding: 8px 12px;
      text-align: left;
      border: 1px solid #ddd;
    }
    .schedule-table th {
      background: #f5f5f5;
    }
    .clause {
      margin-bottom: 15px;
    }
    .clause-number {
      font-weight: bold;
      margin-right: 5px;
    }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 50px;
      margin-top: 50px;
      padding-top: 30px;
      border-top: 2px solid #333;
    }
    .signature-block {
      text-align: center;
    }
    .signature-line {
      border-bottom: 1px solid #333;
      height: 60px;
      margin-bottom: 10px;
    }
    .signature-name {
      font-weight: bold;
      margin-bottom: 5px;
    }
    .signature-date {
      color: #666;
      font-size: 14px;
    }
    .signed-badge {
      background: #22c55e;
      color: white;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 12px;
      display: inline-block;
      margin-top: 10px;
    }
    .pending-badge {
      background: #f59e0b;
      color: white;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 12px;
      display: inline-block;
      margin-top: 10px;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #ccc;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>LOAN AGREEMENT</h1>
    <p>Contract ID: ${e.id}</p>
    <p>Date: ${s}</p>
  </div>

  <div class="section">
    <h2>Parties to this Agreement</h2>
    <div class="parties">
      <div class="party">
        <h3>BORROWER</h3>
        <p><strong>${t.full_name}</strong></p>
        <p>Email: ${t.email}</p>
        ${t.phone?`<p>Phone: ${t.phone}</p>`:""}
      </div>
      <div class="party">
        <h3>LENDER (${n})</h3>
        <p><strong>${r}</strong></p>
        ${"business"===e.lender_type&&e.business_lender?.location?`<p>Location: ${e.business_lender.location}</p>`:""}
        ${e.invite_email?`<p>Email: ${e.invite_email}</p>`:""}
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Loan Terms</h2>
    <table class="terms-table">
      <tr>
        <th>Principal Amount</th>
        <td>${e.currency} ${e.amount.toLocaleString()}</td>
      </tr>
      ${e.interest_rate>0?`
      <tr>
        <th>Interest Rate</th>
        <td>${e.interest_rate}% APR (${e.interest_type})</td>
      </tr>
      <tr>
        <th>Total Interest</th>
        <td>${e.currency} ${e.total_interest.toLocaleString()}</td>
      </tr>
      `:""}
      <tr>
        <th>Total Amount to Repay</th>
        <td><strong>${e.currency} ${e.total_amount.toLocaleString()}</strong></td>
      </tr>
      <tr>
        <th>Repayment Frequency</th>
        <td>${e.repayment_frequency.charAt(0).toUpperCase()+e.repayment_frequency.slice(1)}</td>
      </tr>
      <tr>
        <th>Installment Amount</th>
        <td>${e.currency} ${e.repayment_amount.toLocaleString()}</td>
      </tr>
      <tr>
        <th>Number of Installments</th>
        <td>${e.total_installments}</td>
      </tr>
      <tr>
        <th>Start Date</th>
        <td>${a}</td>
      </tr>
      <tr>
        <th>End Date</th>
        <td>${i}</td>
      </tr>
      ${e.purpose?`
      <tr>
        <th>Purpose</th>
        <td>${e.purpose}</td>
      </tr>
      `:""}
    </table>
  </div>

  ${e.schedule&&e.schedule.length>0?`
  <div class="section">
    <h2>Payment Schedule</h2>
    <table class="schedule-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Due Date</th>
          <th>Principal</th>
          ${e.interest_rate>0?"<th>Interest</th>":""}
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${e.schedule.sort((e,t)=>new Date(e.due_date).getTime()-new Date(t.due_date).getTime()).map((t,r)=>`
          <tr>
            <td>${r+1}</td>
            <td>${(0,l.WU)(new Date(t.due_date),"MMM d, yyyy")}</td>
            <td>${e.currency} ${(t.principal_amount||t.amount).toLocaleString()}</td>
            ${e.interest_rate>0?`<td>${e.currency} ${(t.interest_amount||0).toLocaleString()}</td>`:""}
            <td>${e.currency} ${t.amount.toLocaleString()}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  </div>
  `:""}

  <div class="section">
    <h2>Terms and Conditions</h2>
    
    <div class="clause">
      <span class="clause-number">1.</span>
      <strong>Loan Disbursement:</strong> The Lender agrees to disburse the principal amount to the Borrower upon execution of this agreement by both parties.
    </div>
    
    <div class="clause">
      <span class="clause-number">2.</span>
      <strong>Repayment:</strong> The Borrower agrees to repay the total amount according to the payment schedule specified above. Payments shall be made on or before each due date.
    </div>
    
    <div class="clause">
      <span class="clause-number">3.</span>
      <strong>Late Payment:</strong> In the event of late payment, the Borrower shall notify the Lender immediately. Continued failure to make payments may result in additional actions as permitted by law.
    </div>
    
    <div class="clause">
      <span class="clause-number">4.</span>
      <strong>Early Repayment:</strong> The Borrower may repay the loan in full at any time without penalty.
    </div>
    
    <div class="clause">
      <span class="clause-number">5.</span>
      <strong>Default:</strong> The loan shall be considered in default if the Borrower fails to make any scheduled payment within 30 days of its due date.
    </div>
    
    <div class="clause">
      <span class="clause-number">6.</span>
      <strong>Automatic Payments:</strong> If enabled, the Borrower authorizes automatic debit from their connected PayPal account on each payment due date.
    </div>
    
    <div class="clause">
      <span class="clause-number">7.</span>
      <strong>Governing Law:</strong> This agreement shall be governed by the laws of the jurisdiction in which the Lender is located.
    </div>
    
    <div class="clause">
      <span class="clause-number">8.</span>
      <strong>Entire Agreement:</strong> This document constitutes the entire agreement between the parties and supersedes all prior discussions and agreements.
    </div>
  </div>

  <div class="signatures">
    <div class="signature-block">
      <div class="signature-line"></div>
      <p class="signature-name">${t.full_name}</p>
      <p>Borrower</p>
      ${e.borrower_signed?`
        <span class="signed-badge">✓ Signed</span>
        <p class="signature-date">${(0,l.WU)(new Date(e.borrower_signed_at),"MMM d, yyyy h:mm a")}</p>
      `:`
        <span class="pending-badge">Pending Signature</span>
      `}
    </div>
    <div class="signature-block">
      <div class="signature-line"></div>
      <p class="signature-name">${r}</p>
      <p>Lender</p>
      ${e.lender_signed?`
        <span class="signed-badge">✓ Signed</span>
        <p class="signature-date">${(0,l.WU)(new Date(e.lender_signed_at),"MMM d, yyyy h:mm a")}</p>
      `:`
        <span class="pending-badge">Pending Signature</span>
      `}
    </div>
  </div>

  <div class="footer">
    <p>This loan agreement was generated by Feyza</p>
    <p>Document ID: ${e.id}</p>
    <p>Generated: ${(0,l.WU)(new Date,"MMMM d, yyyy h:mm a")}</p>
  </div>
</body>
</html>
  `}(a);return new i.NextResponse(o,{headers:{"Content-Type":"text/html"}})}catch(e){return console.error("Contract generation error:",e),i.NextResponse.json({error:"Internal server error"},{status:500})}}async function c(e){try{let t=await (0,d.f)(),{data:{user:r}}=await t.auth.getUser();if(!r)return i.NextResponse.json({error:"Unauthorized"},{status:401});let{loanId:n,role:a}=await e.json();if(!n||!a)return i.NextResponse.json({error:"loanId and role are required"},{status:400});let s=e.headers.get("x-forwarded-for"),o=s?s.split(",")[0]:e.headers.get("x-real-ip")||"unknown",{data:l,error:p}=await t.from("loans").select("*, business_lender:business_profiles(*)").eq("id",n).single();if(p||!l)return i.NextResponse.json({error:"Loan not found"},{status:404});let c=l.borrower_id===r.id,u=l.lender_id===r.id||l.business_lender&&l.business_lender.user_id===r.id;if("borrower"===a&&!c)return i.NextResponse.json({error:"Not authorized to sign as borrower"},{status:403});if("lender"===a&&!u)return i.NextResponse.json({error:"Not authorized to sign as lender"},{status:403});let g={contract_generated:!0};"borrower"===a?(g.borrower_signed=!0,g.borrower_signed_at=new Date().toISOString(),g.borrower_signature_ip=o):(g.lender_signed=!0,g.lender_signed_at=new Date().toISOString(),g.lender_signature_ip=o);let{error:m}=await t.from("loans").update(g).eq("id",n);if(m)return console.error("Error updating loan signature:",m),i.NextResponse.json({error:"Failed to sign contract"},{status:500});let{data:h}=await t.from("loans").select("borrower_signed, lender_signed, status").eq("id",n).single();return h?.borrower_signed&&h?.lender_signed&&h?.status==="pending"&&(await t.from("loans").update({status:"active"}).eq("id",n),await t.from("notifications").insert([{user_id:l.borrower_id,loan_id:n,type:"loan_accepted",title:"Contract signed - Loan active",message:"Both parties have signed the contract. Your loan is now active."}])),i.NextResponse.json({success:!0,bothSigned:h?.borrower_signed&&h?.lender_signed})}catch(e){return console.error("Contract signing error:",e),i.NextResponse.json({error:"Internal server error"},{status:500})}}let u=new a.AppRouteRouteModule({definition:{kind:s.x.APP_ROUTE,page:"/api/contracts/route",pathname:"/api/contracts",filename:"route",bundlePath:"app/api/contracts/route"},resolvedPagePath:"C:\\Users\\GerardKasemba\\feyza\\src\\app\\api\\contracts\\route.ts",nextConfigOutput:"",userland:n}),{requestAsyncStorage:g,staticGenerationAsyncStorage:m,serverHooks:h}=u,b="/api/contracts/route";function y(){return(0,o.patchFetch)({serverHooks:h,staticGenerationAsyncStorage:m})}},65655:(e,t,r)=>{r.d(t,{f:()=>s,k:()=>o});var n=r(67721),a=r(71615);async function s(){let e=await (0,a.cookies)();return(0,n.createServerClient)("https://mregojhoivbxdvgjrixz.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yZWdvamhvaXZieGR2Z2pyaXh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1ODE1NDQsImV4cCI6MjA4MzE1NzU0NH0.I_jEMf00cFYAdF0akvD-HOqXWExxO3E0BV69EHEa5jI",{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:r,options:n})=>e.set(t,r,n))}catch{}}}})}async function o(){let e=await (0,a.cookies)();return(0,n.createServerClient)("https://mregojhoivbxdvgjrixz.supabase.co",process.env.SUPABASE_SERVICE_ROLE_KEY,{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:r,options:n})=>e.set(t,r,n))}catch{}}}})}}};var t=require("../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),n=t.X(0,[9276,3786,9702,1199,5972,1787],()=>r(29642));module.exports=n})();