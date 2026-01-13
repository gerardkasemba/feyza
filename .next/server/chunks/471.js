"use strict";exports.id=471,exports.ids=[471],exports.modules={20471:(e,t,o)=>{o.d(t,{$H:()=>y,AN:()=>c,Cz:()=>s,FJ:()=>x,H5:()=>p,O7:()=>l,SN:()=>g,uw:()=>d});var i=o(55245);let n="http://localhost:3000",a=i.createTransport({host:process.env.SMTP_HOST||"smtp.gmail.com",port:parseInt(process.env.SMTP_PORT||"587"),secure:!1,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}}),r=process.env.SMTP_FROM||'"Feyza" <noreply@loantrack.app>';async function s({to:e,subject:t,html:o}){if(!process.env.SMTP_USER||!process.env.SMTP_PASS)return console.warn("=== EMAIL NOT SENT (SMTP not configured) ==="),console.warn("To:",e),console.warn("Subject:",t),console.warn("Set SMTP_USER and SMTP_PASS in your .env.local"),console.warn("============================================="),{success:!0,data:{id:"dev-mode-no-email"}};try{console.log("Sending email to:",e),console.log("From:",r),console.log("Subject:",t);let i=await a.sendMail({from:r,to:e,subject:t,html:o});return console.log("Email sent successfully! Message ID:",i.messageId),{success:!0,data:{id:i.messageId}}}catch(e){return console.error("Email send error:",e?.message||e),{success:!1,error:e?.message||"Unknown error"}}}function p(e){let{borrowerName:t,amount:o,currency:i,inviteToken:a,purpose:r}=e,s=`${n}/invite/${a}`;return{subject:`${t} is requesting a loan from you`,html:`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Loan Request - Feyza</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header with logo -->
        <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 40px 30px 30px 30px; border-radius: 16px 16px 0 0; text-align: center;">
          <!-- Logo -->
          <div style="margin-bottom: 20px;">
            <img src="https://raw.githubusercontent.com/gerardkasemba/feyza/442387cc7eaefdd8a38e999b7dc42a0d526137e6/public/feyza.svg" 
                 alt="Feyza Logo" 
                 style="height: 45px; width: auto; filter: brightness(0) invert(1);">
          </div>
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">💰 New Loan Request</h1>
          <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">You've received a loan request</p>
        </div>
        
        <!-- Main content -->
        <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
          <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi there! 👋</p>
          
          <p style="color: #166534; line-height: 1.6; margin-bottom: 25px;">
            <strong style="color: #065f46;">${t}</strong> has sent you a loan request through Feyza:
          </p>
          
          <!-- Loan details card -->
          <div style="background: white; padding: 25px; border-radius: 12px; margin: 25px 0; border: 1px solid #bbf7d0; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.08);">
            <h3 style="color: #065f46; margin: 0 0 20px 0; font-size: 20px; font-weight: 600; text-align: center;">Loan Request Details</h3>
            
            <div style="background: linear-gradient(to right, #f0fdf4, #dcfce7); padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #86efac;">
              <div style="text-align: center;">
                <div style="color: #065f46; font-size: 14px; margin-bottom: 8px; font-weight: 500;">REQUESTED AMOUNT</div>
                <div style="font-weight: bold; font-size: 32px; color: #059669; margin: 10px 0;">${i} ${o.toLocaleString()}</div>
              </div>
            </div>
            
            ${r?`
            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 20px;">
              <div style="color: #065f46; font-weight: 600; margin-bottom: 10px; display: flex; align-items: center;">
                <span style="background: #d1fae5; padding: 4px 12px; border-radius: 20px; font-size: 14px; margin-right: 10px;">📋</span>
                Loan Purpose
              </div>
              <div style="background: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb;">
                <p style="margin: 0; color: #4b5563; line-height: 1.5;">${r}</p>
              </div>
            </div>
            `:""}
            
            ${t?`
            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 20px;">
              <div style="color: #065f46; font-weight: 600; margin-bottom: 10px; display: flex; align-items: center;">
                <span style="background: #d1fae5; padding: 4px 12px; border-radius: 20px; font-size: 14px; margin-right: 10px;">👤</span>
                Borrower
              </div>
              <p style="margin: 0; color: #4b5563; padding-left: 34px;">${t}</p>
            </div>
            `:""}
          </div>
          
          <!-- Action section -->
          <div style="background: white; padding: 25px; border-radius: 12px; margin: 25px 0; border: 1px solid #bbf7d0; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.08);">
            <h3 style="color: #065f46; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">Next Steps</h3>
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
              Review this loan request and decide whether to accept or decline it. 
              <strong style="color: #059669;">No account is required</strong> to review and respond.
            </p>
            
            <div style="text-align: center;">
              <a href="${s}" 
                 style="display: inline-block; background: linear-gradient(to right, #059669, #047857); 
                        color: white; text-decoration: none; padding: 18px 40px; border-radius: 10px; 
                        font-weight: 600; text-align: center; font-size: 18px; margin: 10px 0;
                        box-shadow: 0 6px 16px rgba(5, 150, 105, 0.25); transition: all 0.3s ease;"
                 onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 10px 25px rgba(5, 150, 105, 0.35)';"
                 onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 6px 16px rgba(5, 150, 105, 0.25)';">
                🔍 View Full Request Details →
              </a>
            </div>
            
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 25px; border: 1px solid #fcd34d;">
              <p style="color: #92400e; margin: 0; font-size: 14px; text-align: center;">
                ⏰ <strong>This link expires in 7 days</strong> • Respond promptly to secure this opportunity
              </p>
            </div>
          </div>
          
          <!-- Benefits section -->
          <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #86efac;">
            <h4 style="color: #065f46; margin: 0 0 15px 0; font-weight: 600; font-size: 16px;">🌟 Why Use Feyza?</h4>
            <ul style="margin: 0; padding-left: 20px; color: #065f46;">
              <li style="margin-bottom: 8px; font-size: 14px;"><strong>Secure:</strong> End-to-end encrypted communication</li>
              <li style="margin-bottom: 8px; font-size: 14px;"><strong>Simple:</strong> No account needed to review requests</li>
              <li style="font-size: 14px;"><strong>Transparent:</strong> Clear terms and automatic documentation</li>
            </ul>
          </div>
          
          <!-- Footer -->
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0; color: #047857; font-size: 14px;">
            <p style="margin: 0 0 10px 0;">Have questions about this request?</p>
            <p style="margin: 0;">
              <a href="mailto:support@feyza.com" style="color: #059669; text-decoration: none; font-weight: 500; margin-right: 15px;">
                📧 Contact Support
              </a>
              <a href="${n}/lender/faq" style="color: #059669; text-decoration: none; font-weight: 500;">
                ❓ View FAQ
              </a>
            </p>
          </div>
        </div>
        
        <!-- Signature -->
        <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
          <p style="margin: 0; padding: 10px;">
            Sent via <strong style="color: #059669;">Feyza</strong> • Modern loan management platform<br>
            <span style="font-size: 11px; color: #9ca3af;">This is an automated notification. Please do not reply to this email.</span>
          </p>
        </div>
      </body>
    </html>
  `}}function d(e){let{borrowerName:t,amount:o,currency:i,dueDate:a,loanId:r,loanLink:s,isManual:p,lenderName:d}=e,l=s?`${n}${s}`:`${n}/loans/${r}`;return{subject:p&&d?`💬 Payment Reminder from ${d}`:`Friendly reminder: Payment due ${a}`,html:`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <!-- Header with gradient and logo -->
          <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <!-- Logo -->
            <div style="margin-bottom: 20px;">
              <img src="https://raw.githubusercontent.com/gerardkasemba/feyza/442387cc7eaefdd8a38e999b7dc42a0d526137e6/public/feyza.svg" 
                  alt="Feyza Logo" 
                  style="height: 40px; width: auto; filter: brightness(0) invert(1);">
            </div>
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">
              ${p?`💬 Reminder from ${d}`:"\uD83D\uDCC5 Payment Reminder"}
            </h1>
            ${p&&d?'<p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">Personal reminder from your lender</p>':'<p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">Friendly payment reminder</p>'}
          </div>
          
          <!-- Content area -->
          <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
            <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi ${t}! 👋</p>
            
            ${p&&d?`<p style="color: #166534; line-height: 1.6; margin-bottom: 20px;">
                  <strong style="color: #059669;">${d}</strong> has sent you a friendly reminder about your upcoming payment:
                </p>`:`<p style="color: #166534; line-height: 1.6; margin-bottom: 20px;">
                  Just a friendly reminder about your upcoming payment:
                </p>`}
            
            <!-- Payment details card -->
            <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
              <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 20px; font-weight: 600;">Payment Details</h3>
              
              <div style="margin-bottom: 15px; display: flex; align-items: center;">
                <div style="width: 24px; height: 24px; background: #059669; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
                  <span style="color: white; font-size: 12px; font-weight: bold;">$$</span>
                </div>
                <div>
                  <span style="color: #047857; font-weight: 500;">Amount Due:</span>
                  <span style="font-weight: bold; font-size: 24px; color: #065f46; margin-left: 10px;">${i} ${o.toLocaleString()}</span>
                </div>
              </div>
              
              <div style="margin-bottom: 15px; display: flex; align-items: center;">
                <div style="width: 24px; height: 24px; background: #059669; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
                  <span style="color: white; font-size: 12px; font-weight: bold;">📅</span>
                </div>
                <div>
                  <span style="color: #047857; font-weight: 500;">Due Date:</span>
                  <span style="font-weight: bold; color: #065f46; margin-left: 10px; font-size: 18px;">${a}</span>
                </div>
              </div>
              
              ${p&&d?`<div style="display: flex; align-items: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                    <div style="width: 24px; height: 24px; background: #059669; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
                      <span style="color: white; font-size: 12px; font-weight: bold;">👤</span>
                    </div>
                    <div>
                      <span style="color: #047857; font-weight: 500;">From:</span>
                      <span style="font-weight: bold; color: #065f46; margin-left: 10px;">${d}</span>
                    </div>
                  </div>`:""}
            </div>
            
            <!-- Action section -->
            <div style="background: #dcfce7; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #86efac;">
              <h4 style="color: #065f46; margin: 0 0 10px 0; font-weight: 600; font-size: 16px;">💡 Important Reminder:</h4>
              <p style="color: #065f46; font-size: 14px; line-height: 1.5; margin: 0;">
                Once you've made the payment, don't forget to mark it as paid in the app so your lender can confirm it.
                This helps maintain accurate records and ensures timely confirmation.
              </p>
            </div>
            
            <!-- CTA Button -->
            <a href="${l}" 
              style="display: block; background: linear-gradient(to right, #059669, #047857); 
                      color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; 
                      font-weight: 600; text-align: center; margin: 24px 0; font-size: 16px;
                      box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2); transition: all 0.2s ease;"
              onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(5, 150, 105, 0.3)';"
              onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';">
              View Loan Details & Payment Instructions →
            </a>
            
            <!-- Help section -->
            <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #bbf7d0;">
              <h4 style="color: #065f46; margin: 0 0 15px 0; font-weight: 600; font-size: 16px;">Need Assistance?</h4>
              <div style="display: flex; flex-wrap: wrap; gap: 15px;">
                <a href="${n}/help/making-payments" 
                  style="display: inline-block; background: white; color: #059669; text-decoration: none; 
                          padding: 10px 20px; border-radius: 6px; font-weight: 500; font-size: 14px;
                          border: 1px solid #059669; transition: all 0.2s ease;"
                  onmouseover="this.style.background='#f0fdf4';this.style.transform='translateY(-1px)';"
                  onmouseout="this.style.background='white';this.style.transform='translateY(0)';">
                  Payment Help Guide
                </a>
                <a href="${n}/contact" 
                  style="display: inline-block; background: white; color: #059669; text-decoration: none; 
                          padding: 10px 20px; border-radius: 6px; font-weight: 500; font-size: 14px;
                          border: 1px solid #059669; transition: all 0.2s ease;"
                  onmouseover="this.style.background='#f0fdf4';this.style.transform='translateY(-1px)';"
                  onmouseout="this.style.background='white';this.style.transform='translateY(0)';">
                  Contact Support
                </a>
              </div>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="text-align: center; margin-top: 20px; color: #047857; font-size: 12px;">
            <p style="margin: 0 0 5px 0;">Sent via Feyza • Simple loan tracking for everyone</p>
            <p style="margin: 0;">
              <a href="${n}/privacy" style="color: #059669; text-decoration: none; margin: 0 10px;">Privacy</a> • 
              <a href="${n}/terms" style="color: #059669; text-decoration: none; margin: 0 10px;">Terms</a> • 
              <a href="${n}/unsubscribe" style="color: #059669; text-decoration: none; margin: 0 10px;">Unsubscribe</a>
            </p>
          </div>
        </body>
      </html>
    `}}function l(e){let{recipientName:t,amount:o,currency:i,loanId:a,role:r}=e,s=`${n}/loans/${a}`;return{subject:"borrower"===r?"Payment confirmed! \uD83C\uDF89":"Payment needs confirmation",html:`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <!-- Header with logo -->
          <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <!-- Logo -->
            <div style="margin-bottom: 15px;">
              <img src="https://raw.githubusercontent.com/gerardkasemba/feyza/442387cc7eaefdd8a38e999b7dc42a0d526137e6/public/feyza.svg" 
                  alt="Feyza Logo" 
                  style="height: 40px; width: auto; filter: brightness(0) invert(1);">
            </div>
            
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">
              ${"borrower"===r?"✅ Payment Confirmed!":"⏳ Payment Requires Confirmation"}
            </h1>
            
            <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 14px;">
              ${"borrower"===r?"Your payment has been successfully processed":"Action required to complete payment"}
            </p>
          </div>
          
          <!-- Main content -->
          <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
            <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi ${t}! 👋</p>
            
            <p style="color: #166534; line-height: 1.6; margin-bottom: 20px;">${"borrower"===r?"Your payment has been confirmed by your lender! \uD83C\uDF89":"A payment has been marked as paid and needs your confirmation."}</p>
            
            <!-- Payment amount card -->
            <div style="background: white; padding: 24px; border-radius: 12px; margin: 25px 0; border: 1px solid #bbf7d0; text-align: center; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
              <p style="color: #065f46; margin: 0 0 10px 0; font-weight: 600; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Payment Amount</p>
              <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 10px;">
                <span style="font-weight: bold; font-size: 36px; color: #059669; font-family: monospace;">
                  ${i} ${o.toLocaleString()}
                </span>
              </div>
              <div style="display: flex; align-items: center; justify-content: center; gap: 5px; margin-top: 8px;">
                <span style="width: 12px; height: 12px; background: ${"borrower"===r?"#059669":"#f59e0b"}; border-radius: 50%; display: inline-block;"></span>
                <span style="color: #047857; font-size: 14px; font-weight: 500;">
                  ${"borrower"===r?"✓ Confirmed":"⏳ Pending Confirmation"}
                </span>
              </div>
            </div>
            
            <!-- Next steps -->
            <div style="background: white; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
              <h3 style="color: #065f46; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
                ${"borrower"===r?"\uD83C\uDF89 Payment Complete!":"\uD83D\uDCDD Next Steps:"}
              </h3>
              <p style="color: #166534; line-height: 1.6; margin: 0;">
                ${"borrower"===r?"Your payment has been successfully recorded. Thank you for your timely payment!":"Please review and confirm this payment to update the loan status."}
              </p>
            </div>
            
            <!-- CTA Button -->
            <a href="${s}" 
              style="display: block; background: linear-gradient(to right, #059669, #047857); 
                      color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; 
                      font-weight: 600; text-align: center; margin: 30px 0; font-size: 16px;
                      box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2); transition: all 0.2s ease;"
              onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(5, 150, 105, 0.3)';"
              onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';">
              ${"lender"===r?"Review & Confirm Payment →":"View Loan Details →"}
            </a>
            
            <!-- Additional info -->
            <div style="background: #dcfce7; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #86efac;">
              <p style="color: #065f46; margin: 0; font-size: 14px; display: flex; align-items: flex-start; gap: 10px;">
                <span style="font-size: 16px;">📋</span>
                <span>
                  <strong>Note:</strong> ${"borrower"===r?"This payment has been added to your transaction history.":"Unconfirmed payments may affect loan tracking and reporting."}
                </span>
              </p>
            </div>
            
            <!-- Footer links -->
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0;">
              <p style="color: #047857; margin: 0 0 10px 0; font-size: 14px;">Need help with payments?</p>
              <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                <a href="${n}/help/payments" style="color: #059669; text-decoration: none; font-weight: 500; font-size: 14px;">
                  Payment Help Center
                </a>
                <a href="${n}/transactions" style="color: #059669; text-decoration: none; font-weight: 500; font-size: 14px;">
                  View All Transactions
                </a>
                <a href="mailto:support@feyza.com" style="color: #059669; text-decoration: none; font-weight: 500; font-size: 14px;">
                  Contact Support
                </a>
              </div>
            </div>
          </div>
          
          <!-- Signature -->
          <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
            <p style="margin: 0;">Feyza • Secure Payment Processing</p>
            <p style="margin: 5px 0 0 0; font-size: 11px;">This is an automated notification. Please do not reply to this email.</p>
          </div>
        </body>
      </html>
    `}}function g(e){let{borrowerName:t,lenderName:o,amount:i,currency:a,loanId:r}=e,s=`${n}/loans/${r}`;return{subject:`Great news! ${o} accepted your loan request`,html:`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header with logo and gradient -->
        <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center; position: relative;">
          <!-- Logo -->
          <div style="margin-bottom: 15px;">
            <img src="https://raw.githubusercontent.com/gerardkasemba/feyza/442387cc7eaefdd8a38e999b7dc42a0d526137e6/public/feyza.svg" 
                 alt="Feyza Logo" 
                 style="height: 40px; width: auto; filter: brightness(0) invert(1);">
          </div>
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">🎉 Loan Accepted!</h1>
          <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">Your funding is confirmed</p>
        </div>
        
        <!-- Content area -->
        <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
          <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi ${t}! 👋</p>
          
          <p style="color: #166534; line-height: 1.6; margin-bottom: 20px;">
            Great news! <strong style="color: #059669;">${o}</strong> has accepted your loan request.
          </p>
          
          <!-- Loan details card -->
          <div style="background: white; padding: 24px; border-radius: 12px; margin: 25px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1); text-align: center;">
            <p style="color: #047857; margin: 0 0 10px 0; font-weight: 500; font-size: 14px;">Loan Amount</p>
            <div style="font-weight: bold; font-size: 36px; color: #059669; margin-bottom: 5px;">
              ${a} ${i.toLocaleString()}
            </div>
            <div style="display: flex; justify-content: center; gap: 30px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <div>
                <p style="color: #6b7280; margin: 0 0 5px 0; font-size: 12px; font-weight: 500;">Lender</p>
                <p style="color: #065f46; margin: 0; font-weight: 600;">${o}</p>
              </div>
              <div>
                <p style="color: #6b7280; margin: 0 0 5px 0; font-size: 12px; font-weight: 500;">Status</p>
                <p style="color: #059669; margin: 0; font-weight: 600;">✅ Active</p>
              </div>
            </div>
          </div>
          
          <!-- Next steps -->
          <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0;">
            <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 18px; font-weight: 600;">📋 What's Next?</h3>
            <ul style="margin: 0; padding-left: 20px; color: #065f46;">
              <li style="margin-bottom: 8px; line-height: 1.5;">Your loan is now active and funds will be processed</li>
              <li style="margin-bottom: 8px; line-height: 1.5;">View your repayment schedule in the app</li>
              <li style="margin-bottom: 8px; line-height: 1.5;">Track your payment progress</li>
              <li style="line-height: 1.5;">Contact your lender if you have questions</li>
            </ul>
          </div>
          
          <!-- Important note -->
          <div style="background: #dcfce7; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #86efac;">
            <p style="color: #065f46; margin: 0; font-size: 14px; line-height: 1.5;">
              <strong>💡 Important:</strong> Make sure to review the loan agreement and repayment terms in your dashboard.
            </p>
          </div>
          
          <!-- CTA Button -->
          <a href="${s}" 
             style="display: inline-block; background: linear-gradient(to right, #059669, #047857); 
                    color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; 
                    font-weight: 600; text-align: center; margin: 24px 0; font-size: 16px;
                    box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2); transition: all 0.2s ease;"
             onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(5, 150, 105, 0.3)';"
             onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';">
            View Your Loan Details →
          </a>
          
          <!-- Additional actions -->
          <div style="display: flex; gap: 15px; margin-top: 20px; flex-wrap: wrap;">
            <a href="${n}/dashboard" 
               style="display: inline-block; background: white; 
                      color: #059669; text-decoration: none; padding: 12px 24px; border-radius: 8px; 
                      font-weight: 500; text-align: center; font-size: 14px; border: 1.5px solid #059669;
                      box-shadow: 0 2px 6px rgba(5, 150, 105, 0.1); transition: all 0.2s ease; flex: 1;"
               onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 3px 8px rgba(5, 150, 105, 0.2)';this.style.background='#f0fdf4';"
               onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 6px rgba(5, 150, 105, 0.1)';this.style.background='white';">
              Go to Dashboard
            </a>
            <a href="${n}/help/loans" 
               style="display: inline-block; background: white; 
                      color: #047857; text-decoration: none; padding: 12px 24px; border-radius: 8px; 
                      font-weight: 500; text-align: center; font-size: 14px; border: 1.5px solid #bbf7d0;
                      box-shadow: 0 2px 6px rgba(5, 150, 105, 0.1); transition: all 0.2s ease; flex: 1;"
               onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 3px 8px rgba(5, 150, 105, 0.2)';this.style.background='#f0fdf4';"
               onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 6px rgba(5, 150, 105, 0.1)';this.style.background='white';">
              Need Help?
            </a>
          </div>
          
          <!-- Footer -->
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0; color: #047857; font-size: 14px;">
            <p style="margin: 0 0 10px 0;">Questions about your loan?</p>
            <p style="margin: 0;">
              <a href="mailto:support@feyza.com" style="color: #059669; text-decoration: none; font-weight: 500;">
                Contact Feyza Support
              </a>
            </p>
          </div>
        </div>
        
        <!-- Signature -->
        <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
          <p style="margin: 0;">Feyza • Simple loan tracking for everyone</p>
          <p style="margin: 5px 0 0 0; font-size: 11px;">This is an automated notification</p>
        </div>
      </body>
    </html>
  `}}function x(e){let{borrowerName:t,lenderName:o,amount:i,currency:a,dueDate:r,daysOverdue:s,loanId:p,loanLink:d}=e,l=d?`${n}${d}`:`${n}/loans/${p}`;return{subject:`⚠️ OVERDUE: Your payment is ${s} day${s>1?"s":""} late`,html:`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header with logo - keeping red for urgency but adding logo -->
        <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
          <!-- Logo -->
          <div style="margin-bottom: 15px;">
            <img src="https://raw.githubusercontent.com/gerardkasemba/feyza/442387cc7eaefdd8a38e999b7dc42a0d526137e6/public/feyza.svg" 
                 alt="Feyza Logo" 
                 style="height: 35px; width: auto; filter: brightness(0) invert(1);">
          </div>
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">⚠️ Overdue Payment Notice</h1>
        </div>
        
        <div style="background: #fef2f2; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #fecaca; border-top: none;">
          <p style="font-size: 18px; margin-bottom: 20px; color: #166534;">Hi ${t},</p>
          
          <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #fecaca; box-shadow: 0 2px 8px rgba(220, 38, 38, 0.1);">
            <h2 style="color: #dc2626; margin: 0 0 15px 0; font-size: 20px; font-weight: 600;">⚠️ Payment Overdue</h2>
            <p style="color: #dc2626; font-weight: 600; font-size: 16px; line-height: 1.5; margin-bottom: 15px;">
              Your payment to ${o} is <strong>${s} day${s>1?"s":""} overdue</strong>.
            </p>
            
            <!-- Payment details -->
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fecaca;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <span style="color: #6b7280;">Amount Due:</span>
                <span style="font-weight: bold; font-size: 20px; color: #dc2626;">${a} ${i.toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <span style="color: #6b7280;">Original Due Date:</span>
                <span style="font-weight: bold; color: #991b1b;">${r}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #6b7280;">Days Overdue:</span>
                <span style="font-weight: bold; color: #991b1b;">${s}</span>
              </div>
            </div>
            
            <!-- Urgent warning -->
            <div style="background: linear-gradient(to right, #fee2e2, #fecaca); border: 1px solid #fca5a5; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <div style="display: flex; align-items: flex-start;">
                <span style="font-size: 24px; margin-right: 12px; color: #dc2626;">⚠️</span>
                <div>
                  <p style="margin: 0; color: #991b1b; font-size: 14px; font-weight: 600; margin-bottom: 5px;">Immediate Attention Required</p>
                  <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.5;">
                    Late payments negatively affect your borrower rating and may limit your ability to borrow in the future. Immediate payment is required.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Action buttons -->
          <div style="margin: 30px 0;">
            <a href="${l}" 
               style="display: block; background: linear-gradient(to right, #dc2626, #b91c1c); 
                      color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; 
                      font-weight: 600; text-align: center; font-size: 16px; margin-bottom: 15px;
                      box-shadow: 0 4px 12px rgba(220, 38, 38, 0.2); transition: all 0.2s ease;"
               onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(220, 38, 38, 0.3)';"
               onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(220, 38, 38, 0.2)';">
              Make Payment Now →
            </a>
            
            <a href="${n}/help/payment-issues" 
               style="display: block; background: white; 
                      color: #059669; text-decoration: none; padding: 14px 32px; border-radius: 8px; 
                      font-weight: 600; text-align: center; font-size: 16px; border: 2px solid #059669;
                      box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1); transition: all 0.2s ease;"
               onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';this.style.background='#f0fdf4';"
               onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 8px rgba(5, 150, 105, 0.1)';this.style.background='white';">
              Need Payment Assistance?
            </a>
          </div>
          
          <!-- Additional information -->
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #e2e8f0;">
            <h4 style="color: #065f46; margin: 0 0 10px 0; font-weight: 600;">📋 Important Information:</h4>
            <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 14px;">
              <li style="margin-bottom: 8px;">If you've already made this payment, please mark it as paid in your account</li>
              <li style="margin-bottom: 8px;">Contact your lender directly if you need to discuss payment arrangements</li>
              <li>Late fees may apply as per your loan agreement</li>
            </ul>
          </div>
          
          <!-- Footer -->
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #fecaca; color: #991b1b; font-size: 14px;">
            <p style="margin: 0 0 10px 0;">For questions about your loan terms:</p>
            <p style="margin: 0;">
              <a href="mailto:support@feyza.com" style="color: #059669; text-decoration: none; font-weight: 500; margin-right: 15px;">
                Contact Feyza Support
              </a>
              <a href="${n}/help" style="color: #059669; text-decoration: none; font-weight: 500;">
                Help Center
              </a>
            </p>
          </div>
        </div>
        
        <!-- Signature with green branding -->
        <div style="text-align: center; margin-top: 20px; padding: 15px; border-radius: 8px; background: #f0fdf4; border: 1px solid #bbf7d0;">
          <p style="margin: 0; color: #047857; font-size: 12px;">
            <strong>Feyza</strong> • Building Financial Relationships • <span style="color: #059669;">support@feyza.com</span>
          </p>
        </div>
      </body>
    </html>
  `}}function c(e){let{lenderName:t,borrowerName:o,amount:i,currency:a,dueDate:r,daysOverdue:s,loanId:p}=e,d=`${n}/loans/${p}`;return{subject:`Payment missed: ${o}'s payment is ${s} days overdue`,html:`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header with logo and gradient -->
        <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
          <div style="margin-bottom: 15px;">
            <img src="https://raw.githubusercontent.com/gerardkasemba/feyza/442387cc7eaefdd8a38e999b7dc42a0d526137e6/public/feyza.svg" 
                 alt="Feyza Logo" 
                 style="height: 40px; width: auto; filter: brightness(0) invert(1);">
          </div>
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">⚠️ Missed Payment Notice</h1>
        </div>
        
        <!-- Content area -->
        <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
          <p style="font-size: 18px; margin-bottom: 20px; color: #166534;">Hi ${t},</p>
          
          <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #dc2626; box-shadow: 0 2px 8px rgba(220, 38, 38, 0.1);">
            <h3 style="margin: 0 0 15px 0; color: #dc2626; font-size: 20px; font-weight: 600;">
              ⚠️ Overdue Payment Alert
            </h3>
            <p style="color: #166534; margin-bottom: 20px;">
              We're writing to inform you that <strong style="color: #065f46;">${o}</strong> has a payment that is now 
              <strong style="color: #dc2626;">${s} day${s>1?"s":""} overdue</strong>.
            </p>
            
            <!-- Payment details -->
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; border: 1px solid #fecaca; margin: 20px 0;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <div>
                  <div style="color: #6b7280; font-size: 14px;">Amount Due</div>
                  <div style="font-weight: bold; font-size: 24px; color: #dc2626;">
                    ${a} ${i.toLocaleString()}
                  </div>
                </div>
                <div style="background: #dc2626; color: white; padding: 6px 12px; border-radius: 20px; font-size: 14px; font-weight: 600;">
                  ${s} DAY${s>1?"S":""} LATE
                </div>
              </div>
              
              <div style="border-top: 1px solid #fecaca; padding-top: 15px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                  <span style="color: #6b7280;">Due Date</span>
                  <span style="font-weight: 600; color: #065f46;">${r}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #6b7280;">Days Overdue</span>
                  <span style="font-weight: 600; color: #dc2626;">${s} day${s>1?"s":""}</span>
                </div>
              </div>
            </div>
            
            <!-- Action information -->
            <div style="background: #fffbeb; padding: 16px; border-radius: 8px; border: 1px solid #fde68a; margin: 20px 0;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>📢 Notification Sent:</strong> We've automatically sent the borrower a payment reminder. 
                You can also contact them directly through the app.
              </p>
            </div>
          </div>
          
          <!-- Recommended actions -->
          <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0;">
            <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 18px; font-weight: 600;">Next Steps</h3>
            <ul style="margin: 0; padding-left: 20px; color: #166534;">
              <li style="margin-bottom: 10px;">Review the loan details and payment history</li>
              <li style="margin-bottom: 10px;">Contact the borrower through the secure messaging system</li>
              <li style="margin-bottom: 10px;">Consider your options based on the loan agreement terms</li>
            </ul>
          </div>
          
          <!-- CTA Button -->
          <a href="${d}" 
             style="display: inline-block; background: linear-gradient(to right, #059669, #047857); 
                    color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; 
                    font-weight: 600; text-align: center; margin: 24px 0; font-size: 16px; width: 100%;
                    box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2); transition: all 0.2s ease;"
             onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(5, 150, 105, 0.3)';"
             onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';">
            View Loan Details & Contact Borrower →
          </a>
          
          <!-- Support information -->
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0; color: #047857; font-size: 14px;">
            <p style="margin: 0 0 10px 0; font-weight: 600;">Need assistance with overdue payments?</p>
            <p style="margin: 0;">
              <a href="${n}/help/overdue-payments" style="color: #059669; text-decoration: none; font-weight: 500; margin-right: 15px;">
                📚 Overdue Payment Guide
              </a>
              <a href="mailto:support@feyza.com" style="color: #059669; text-decoration: none; font-weight: 500;">
                📧 Contact Support
              </a>
            </p>
          </div>
        </div>
        
        <!-- Signature -->
        <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
          <p style="margin: 0;">Feyza • Payment Tracking System</p>
          <p style="margin: 5px 0 0 0; font-size: 11px;">
            This is an automated notification. Please do not reply to this email.
          </p>
        </div>
      </body>
    </html>
  `}}function y(e){let{borrowerName:t,recipientName:o,amount:i,currency:a,pickupLocation:r,pickupCode:s,daysWaiting:p}=e;return{subject:`⏰ Reminder: Cash waiting for ${o} (${p} days)`,html:`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header with logo -->
        <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
          <div style="margin-bottom: 15px;">
            <img src="https://raw.githubusercontent.com/gerardkasemba/feyza/442387cc7eaefdd8a38e999b7dc42a0d526137e6/public/feyza.svg" 
                 alt="Feyza Logo" 
                 style="height: 40px; width: auto; filter: brightness(0) invert(1);">
          </div>
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">⏰ Cash Pickup Reminder</h1>
        </div>
        
        <!-- Content area -->
        <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
          <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi ${t},</p>
          
          <p style="color: #166534; line-height: 1.6; margin-bottom: 20px;">
            This is a friendly reminder that <strong style="color: #059669;">${a} ${i.toLocaleString()}</strong> has been waiting for <strong style="color: #059669;">${o}</strong> to pick up for <strong style="color: #059669;">${p} days</strong>.
          </p>
          
          <!-- Cash details card -->
          <div style="background: white; padding: 24px; border-radius: 12px; margin: 25px 0; border: 1px solid #bbf7d0; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.1);">
            <div style="text-align: center; margin-bottom: 20px;">
              <p style="color: #047857; margin: 0; font-weight: 500; font-size: 14px;">AMOUNT WAITING</p>
              <p style="font-size: 36px; font-weight: bold; color: #059669; margin: 10px 0 5px 0;">
                ${a} ${i.toLocaleString()}
              </p>
              <p style="color: #065f46; margin: 0; font-size: 14px;">Has been waiting for ${p} days</p>
            </div>
            
            <div style="border-top: 2px solid #f0fdf4; padding-top: 20px;">
              <div style="display: grid; grid-template-columns: 1fr; gap: 15px; margin-bottom: 20px;">
                <div>
                  <p style="color: #047857; margin: 0 0 5px 0; font-weight: 500; font-size: 14px;">📍 PICKUP LOCATION</p>
                  <p style="color: #166534; margin: 0; font-size: 16px;">${r}</p>
                </div>
                
                <div>
                  <p style="color: #047857; margin: 0 0 5px 0; font-weight: 500; font-size: 14px;">👤 RECIPIENT</p>
                  <p style="color: #166534; margin: 0; font-size: 16px;">${o}</p>
                </div>
              </div>
              
              <!-- Pickup code section -->
              <div>
                <p style="color: #047857; margin: 0 0 10px 0; font-weight: 500; font-size: 14px;">🔑 PICKUP CODE</p>
                <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 20px; border-radius: 10px; text-align: center; border: 2px dashed #059669;">
                  <span style="font-size: 36px; font-weight: bold; letter-spacing: 4px; color: #065f46; font-family: 'Courier New', monospace;">
                    ${s}
                  </span>
                  <p style="color: #047857; margin: 10px 0 0 0; font-size: 12px;">Share this code with the recipient</p>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Important note -->
          <div style="background: #dcfce7; border: 1px solid #86efac; border-left: 4px solid #059669; border-radius: 8px; padding: 20px; margin: 25px 0;">
            <div style="display: flex; align-items: flex-start; gap: 12px;">
              <div style="color: #059669; font-size: 20px;">💡</div>
              <div>
                <p style="margin: 0 0 8px 0; color: #065f46; font-weight: 600; font-size: 15px;">Important Information</p>
                <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.5;">
                  The cash will be held indefinitely until ${o} picks it up. Please remind them to bring:
                </p>
                <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #166534; font-size: 14px;">
                  <li>Valid government-issued photo ID</li>
                  <li>This pickup code: <strong style="color: #059669;">${s}</strong></li>
                </ul>
              </div>
            </div>
          </div>
          
          <!-- Action buttons -->
          <div style="display: flex; gap: 15px; margin: 30px 0; flex-wrap: wrap;">
            <a href="${n}/loans" 
               style="display: inline-block; background: linear-gradient(to right, #059669, #047857); 
                      color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; 
                      font-weight: 600; text-align: center; font-size: 16px;
                      box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2); transition: all 0.2s ease;
                      flex: 1; min-width: 200px;"
               onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(5, 150, 105, 0.3)';"
               onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';">
              View Loan Details →
            </a>
            
            <a href="${n}/help/pickup" 
               style="display: inline-block; background: white; 
                      color: #059669; text-decoration: none; padding: 14px 28px; border-radius: 8px; 
                      font-weight: 600; text-align: center; font-size: 16px; border: 2px solid #059669;
                      box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1); transition: all 0.2s ease;
                      flex: 1; min-width: 200px;"
               onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';this.style.background='#f0fdf4';"
               onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 8px rgba(5, 150, 105, 0.1)';this.style.background='white';">
              Pickup Instructions
            </a>
          </div>
          
          <!-- Support section -->
          <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #bbf7d0;">
            <p style="color: #047857; margin: 0 0 10px 0; font-weight: 500; font-size: 15px;">Need assistance?</p>
            <div style="display: flex; gap: 20px; font-size: 14px;">
              <div>
                <p style="color: #166534; margin: 0 0 5px 0;">📞 Contact Support</p>
                <a href="mailto:support@feyza.com" style="color: #059669; text-decoration: none; font-weight: 500;">
                  support@feyza.com
                </a>
              </div>
              <div>
                <p style="color: #166534; margin: 0 0 5px 0;">📋 Issues with pickup?</p>
                <a href="${n}/support/pickup-issues" style="color: #059669; text-decoration: none; font-weight: 500;">
                  Report an issue
                </a>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px;">
          <p style="margin: 0; color: #047857;">Feyza • Simple loan tracking for everyone</p>
          <p style="margin: 5px 0 0 0;">This is an automated reminder. Please do not reply to this email.</p>
        </div>
      </body>
    </html>
  `}}}};