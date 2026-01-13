"use strict";(()=>{var e={};e.id=319,e.ids=[319],e.modules={20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},61282:e=>{e.exports=require("child_process")},84770:e=>{e.exports=require("crypto")},80665:e=>{e.exports=require("dns")},17702:e=>{e.exports=require("events")},92048:e=>{e.exports=require("fs")},32615:e=>{e.exports=require("http")},35240:e=>{e.exports=require("https")},98216:e=>{e.exports=require("net")},19801:e=>{e.exports=require("os")},55315:e=>{e.exports=require("path")},76162:e=>{e.exports=require("stream")},82452:e=>{e.exports=require("tls")},17360:e=>{e.exports=require("url")},21764:e=>{e.exports=require("util")},71568:e=>{e.exports=require("zlib")},2261:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>b,patchFetch:()=>h,requestAsyncStorage:()=>x,routeModule:()=>g,serverHooks:()=>m,staticGenerationAsyncStorage:()=>f});var o={};r.r(o),r.d(o,{GET:()=>c,POST:()=>u});var s=r(49303),i=r(88716),n=r(60670),a=r(87070),p=r(37857),l=r(20471);function d(){let e="https://mregojhoivbxdvgjrixz.supabase.co",t=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!e||!t)throw Error("Missing Supabase credentials");return(0,p.eI)(e,t,{auth:{autoRefreshToken:!1,persistSession:!1}})}async function u(e){try{let{business_id:t,action:r,notes:o,admin_user_id:s}=await e.json();if(console.log("Admin approval request:",{business_id:t,action:r,notes:o,admin_user_id:s}),!t)return a.NextResponse.json({error:"business_id is required"},{status:400});if(!r||!["approve","reject"].includes(r))return a.NextResponse.json({error:'action must be "approve" or "reject"'},{status:400});let i=d(),{data:n,error:p}=await i.from("business_profiles").select("*, owner:users!user_id(id, email, full_name)").eq("id",t).single();if(console.log("Fetched business:",n,"Error:",p),p)return console.error("Fetch error:",p),a.NextResponse.json({error:"Business not found",details:p.message},{status:404});if(!n)return a.NextResponse.json({error:"Business not found"},{status:404});let u="approve"===r,c=new Date().toISOString();try{let e={verification_status:u?"approved":"rejected",verification_notes:o||null,verified_at:u?c:null,verified_by:s||null,is_verified:u};console.log("Attempting full update with:",e);let{data:r,error:n}=await i.from("business_profiles").update(e).eq("id",t).select().single();if(n){console.error("Full update error:",n),console.log("Trying minimal update with just is_verified");let{data:e,error:r}=await i.from("business_profiles").update({is_verified:u}).eq("id",t).select().single();if(r)return console.error("Minimal update error:",r),a.NextResponse.json({error:"Failed to update business profile",details:r.message,hint:"Check if the columns exist in the database"},{status:500});console.log("Minimal update successful:",e)}else console.log("Full update successful:",r)}catch(e){return console.error("Update exception:",e),a.NextResponse.json({error:"Exception during update",details:e.message},{status:500})}if(u){let{error:e}=await i.from("lender_preferences").update({is_active:!0}).eq("business_id",t);e?console.error("Lender prefs update error:",e):console.log("Lender preferences activated")}let g=n.owner?.email,x=n.owner?.full_name||"Business Owner",f="http://localhost:3000";if(g){try{u?(await (0,l.Cz)({to:g,subject:"\uD83C\uDF89 Your Business Account Has Been Approved!",html:`
              <!DOCTYPE html>
              <html>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <!-- Header with gradient background and logo -->
                  <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center; position: relative;">
                    <!-- Logo -->
                    <div style="margin-bottom: 20px;">
                      <img src="https://raw.githubusercontent.com/gerardkasemba/feyza/442387cc7eaefdd8a38e999b7dc42a0d526137e6/public/feyza.svg" 
                          alt="Feyza Logo" 
                          style="height: 40px; width: auto; filter: brightness(0) invert(1);">
                    </div>
                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">🎉 You're Approved!</h1>
                    <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">Welcome to Feyza</p>
                  </div>
                  
                  <!-- Content area -->
                  <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
                    <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi ${x}! 👋</p>
                    
                    <p style="color: #166534; line-height: 1.6; margin-bottom: 20px;">Great news! Your business account <strong style="color: #059669;">${n.business_name}</strong> has been approved and is now active on Feyza.</p>
                    
                    <!-- Information box -->
                    <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
                      <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 20px; font-weight: 600;">What's Next?</h3>
                      <ul style="margin: 0; padding-left: 20px; color: #065f46;">
                        <li style="margin-bottom: 10px; line-height: 1.6;">Set your capital pool in <a href="${f}/lender/preferences" style="color: #059669; font-weight: 500; text-decoration: none; border-bottom: 1px solid #059669;">Lender Preferences</a></li>
                        <li style="margin-bottom: 10px; line-height: 1.6;">Configure your matching settings</li>
                        <li style="margin-bottom: 10px; line-height: 1.6;">Start receiving loan requests from verified borrowers</li>
                        ${n.public_profile_enabled&&n.slug?`
                        <li style="line-height: 1.6;">Share your profile: 
                          <a href="${f}/lend/${n.slug}" style="color: #059669; font-weight: 500; text-decoration: none; border-bottom: 1px solid #059669;">
                            ${f}/lend/${n.slug}
                          </a>
                        </li>`:""}
                      </ul>
                    </div>
                    
                    <!-- CTA Button -->
                    <a href="${f}/business" 
                      style="display: inline-block; background: linear-gradient(to right, #059669, #047857); 
                              color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; 
                              font-weight: 600; text-align: center; margin: 24px 0; font-size: 16px;
                              box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2); transition: all 0.2s ease;"
                      onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(5, 150, 105, 0.3)';"
                      onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';">
                      Go to Business Dashboard →
                    </a>
                    
                    <!-- Footer -->
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0; color: #047857; font-size: 14px;">
                      <p style="margin: 0;">Need help? <a href="mailto:support@feyza.com" style="color: #059669; text-decoration: none; font-weight: 500;">Contact our support team</a></p>
                    </div>
                  </div>
                  
                  <!-- Signature -->
                  <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
                    <p style="margin: 0;">This is an automated message from Feyza</p>
                  </div>
                </body>
              </html>
            `}),console.log("Approval email sent to:",g)):(await (0,l.Cz)({to:g,subject:"\uD83D\uDCCB Update on Your Business Application",html:`
              <!DOCTYPE html>
              <html>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <!-- Header with gradient background and logo -->
                  <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center; position: relative;">
                    <!-- Logo -->
                    <div style="margin-bottom: 20px;">
                      <img src="https://raw.githubusercontent.com/gerardkasemba/feyza/442387cc7eaefdd8a38e999b7dc42a0d526137e6/public/feyza.svg" 
                          alt="Feyza Logo" 
                          style="height: 40px; width: auto; filter: brightness(0) invert(1);">
                    </div>
                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">📋 Application Update</h1>
                    <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">Feyza Business Portal</p>
                  </div>
                  
                  <!-- Content area -->
                  <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
                    <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi ${x},</p>
                    
                    <p style="color: #166534; line-height: 1.6; margin-bottom: 20px;">
                      After reviewing your application for <strong style="color: #059669;">${n.business_name}</strong>, 
                      we were unable to approve it at this time.
                    </p>
                    
                    ${o?`
                    <!-- Feedback box -->
                    <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
                      <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 20px; font-weight: 600;">📝 Feedback:</h3>
                      <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; border-left: 4px solid #059669;">
                        <p style="margin: 0; color: #166534; line-height: 1.6; font-style: italic;">${o}</p>
                      </div>
                    </div>
                    `:""}
                    
                    <!-- Next steps information -->
                    <div style="background: white; padding: 20px; border-radius: 12px; margin: 24px 0; border: 1px solid #bbf7d0;">
                      <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 18px; font-weight: 600;">What You Can Do:</h3>
                      <ul style="margin: 0; padding-left: 20px; color: #166534;">
                        <li style="margin-bottom: 10px; line-height: 1.6;">Review the feedback provided above</li>
                        <li style="margin-bottom: 10px; line-height: 1.6;">Update your application with additional information</li>
                        <li style="line-height: 1.6;">Contact our support team for clarification</li>
                      </ul>
                    </div>
                    
                    <!-- Support contact -->
                    <div style="background: #dcfce7; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #86efac; text-align: center;">
                      <p style="margin: 0 0 10px 0; color: #166534; font-weight: 600;">Need assistance?</p>
                      <a href="mailto:support@feyza.app" 
                        style="color: #059669; font-weight: 600; text-decoration: none; font-size: 16px; border-bottom: 2px solid #059669;">
                        support@feyza.app
                      </a>
                    </div>
                    
                    <!-- CTA Button to resubmit or contact -->
                    <div style="text-align: center; margin-top: 30px;">
                      <a href="mailto:support@feyza.app" 
                        style="display: inline-block; background: linear-gradient(to right, #059669, #047857); 
                                color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; 
                                font-weight: 600; text-align: center; font-size: 16px;
                                box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2); transition: all 0.2s ease;"
                        onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(5, 150, 105, 0.3)';"
                        onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';">
                        Contact Support
                      </a>
                    </div>
                    
                    <!-- Footer -->
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0; color: #047857; font-size: 14px;">
                      <p style="margin: 0;">You can reply to this email or contact support for more details</p>
                    </div>
                  </div>
                  
                  <!-- Signature -->
                  <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
                    <p style="margin: 0;">This is an automated message from Feyza</p>
                  </div>
                </body>
              </html>
            `}),console.log("Rejection email sent to:",g))}catch(e){console.error("Email send error:",e)}try{await i.from("notifications").insert({user_id:n.user_id,type:u?"business_approved":"business_rejected",title:u?"\uD83C\uDF89 Business Account Approved!":"\uD83D\uDCCB Business Application Update",message:u?`Your business "${n.business_name}" has been approved. You can now start lending!`:`Your business application for "${n.business_name}" requires attention.${o?` Reason: ${o}`:""}`}),console.log("Notification created")}catch(e){console.error("Notification error:",e)}}return a.NextResponse.json({success:!0,action:r,business_id:t,message:u?"Business approved successfully":"Business application rejected"})}catch(e){return console.error("Error in admin business approval:",e),a.NextResponse.json({error:"Internal server error",details:e.message},{status:500})}}async function c(e){try{let{searchParams:t}=new URL(e.url),r=t.get("status")||"pending",o=d().from("business_profiles").select("*, owner:users!user_id(id, email, full_name, phone)").eq("profile_completed",!0).order("created_at",{ascending:!1});"pending"===r?o=o.or("verification_status.eq.pending,verification_status.is.null").eq("is_verified",!1):"approved"===r?o=o.eq("is_verified",!0):"rejected"===r&&(o=o.eq("verification_status","rejected"));let{data:s,error:i}=await o;if(i)return console.error("Fetch businesses error:",i),a.NextResponse.json({error:"Failed to fetch businesses",details:i.message},{status:500});return a.NextResponse.json({businesses:s||[],count:s?.length||0})}catch(e){return console.error("Error fetching businesses:",e),a.NextResponse.json({error:"Internal server error",details:e.message},{status:500})}}let g=new s.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/admin/business/approve/route",pathname:"/api/admin/business/approve",filename:"route",bundlePath:"app/api/admin/business/approve/route"},resolvedPagePath:"C:\\Users\\GerardKasemba\\feyza\\src\\app\\api\\admin\\business\\approve\\route.ts",nextConfigOutput:"",userland:o}),{requestAsyncStorage:x,staticGenerationAsyncStorage:f,serverHooks:m}=g,b="/api/admin/business/approve/route";function h(){return(0,n.patchFetch)({serverHooks:m,staticGenerationAsyncStorage:f})}}};var t=require("../../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),o=t.X(0,[9276,3786,5972,5245,471],()=>r(2261));module.exports=o})();