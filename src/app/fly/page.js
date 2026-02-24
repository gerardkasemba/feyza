'use client'
import { useState, useRef, useCallback } from "react";

const LOGO = "https://www.feyza.app/feyza.png";

const Logo = () => (
  <div style={{ width:"85px", height:"30px", flexShrink:0 }}>
    <img src={LOGO} alt="Feyza" width="85" height="30" style={{ display:"block", objectFit:"contain" }} />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// WEEK 1
// ─────────────────────────────────────────────────────────────────────────────
const F1 = () => (
  <div data-capture-area="true" style={{ width:500,height:500,position:"relative",overflow:"hidden",background:"#fff",fontFamily:"'Arial Black',sans-serif",flexShrink:0,boxSizing:"border-box" }}>
    <div style={{ position:"absolute",top:0,left:0,right:0,height:245,background:"#facc15" }} />
    <svg style={{ position:"absolute",top:228,left:0,width:500,height:36 }} viewBox="0 0 500 36">
      <polyline points="0,0 25,28 50,0 75,28 100,0 125,28 150,0 175,28 200,0 225,28 250,0 275,28 300,0 325,28 350,0 375,28 400,0 425,28 450,0 475,28 500,0 500,36 0,36" fill="#facc15"/>
    </svg>
    <div style={{ position:"relative",padding:"34px 38px",height:"100%",boxSizing:"border-box",display:"flex",flexDirection:"column",justifyContent:"space-between" }}>
      <div style={{ display:"flex",alignItems:"center",gap:8 }}><Logo /></div>
      <div>
        <div style={{ fontSize:30,fontWeight:900,color:"#000",lineHeight:1.05,letterSpacing:"-0.02em" }}>Your bank<br/>said no.</div>
        <div style={{ fontSize:62,fontWeight:900,color:"#000",lineHeight:0.9,letterSpacing:"-0.04em",marginTop:6 }}>Cool. 😎</div>
      </div>
      <div>
        <div style={{ fontSize:40,fontWeight:900,color:"#fff",background:"#000",display:"inline-block",padding:"6px 14px",marginBottom:14,transform:"rotate(-1.5deg)" }}>We said yes.</div>
        <div style={{ fontSize:12,color:"#555",fontFamily:"monospace",lineHeight:1.9,marginTop:8 }}>Borrow from real people on Feyza.<br/>No credit score. No drama. No fees.</div>
        <div style={{ marginTop:14,display:"inline-block",background:"#000",color:"#facc15",fontSize:12,fontWeight:900,fontFamily:"monospace",padding:"11px 22px",letterSpacing:"0.06em" }}>APPLY NOW →</div>
      </div>
    </div>
  </div>
);

const F2 = () => (
  <div data-capture-area="true" style={{ width:500,height:500,position:"relative",overflow:"hidden",background:"#0f172a",fontFamily:"'Arial Black',sans-serif",flexShrink:0,boxSizing:"border-box" }}>
    <div style={{ position:"absolute",top:-60,right:-60,width:280,height:280,background:"radial-gradient(circle,rgba(99,102,241,0.3) 0%,transparent 70%)",borderRadius:"50%" }} />
    <div style={{ position:"absolute",bottom:-40,left:-40,width:200,height:200,background:"radial-gradient(circle,rgba(34,197,94,0.2) 0%,transparent 70%)",borderRadius:"50%" }} />
    <div style={{ position:"relative",padding:"36px 38px",height:"100%",boxSizing:"border-box",display:"flex",flexDirection:"column",justifyContent:"space-between" }}>
      <div style={{ display:"flex",alignItems:"center",gap:8 }}><Logo /></div>
      <div>
        <div style={{ fontSize:15,color:"#6366f1",fontFamily:"monospace",letterSpacing:"0.1em",marginBottom:14 }}>POV:</div>
        <div style={{ fontSize:54,fontWeight:900,color:"#fff",lineHeight:0.95,letterSpacing:"-0.03em" }}>You actually<br/><span style={{ color:"#22c55e",textShadow:"0 0 30px rgba(34,197,94,0.5)" }}>got approved.</span></div>
        <div style={{ marginTop:20,fontSize:13,color:"#475569",fontFamily:"monospace",lineHeight:1.8 }}>No long wait. No judgement.<br/>Just a real lender who said yes.</div>
      </div>
      <div style={{ display:"flex",gap:10 }}>
        {["✓ Verified lenders","✓ Fast approval","✓ Fair rates"].map(t=>(
          <div key={t} style={{ flex:1,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,padding:"10px 6px",fontSize:9,color:"#94a3b8",fontFamily:"monospace",textAlign:"center" }}>{t}</div>
        ))}
      </div>
    </div>
  </div>
);

const F3 = () => (
  <div data-capture-area="true" style={{ width:500,height:500,position:"relative",overflow:"hidden",background:"#fef9c3",fontFamily:"'Georgia',serif",flexShrink:0,boxSizing:"border-box" }}>
    <div style={{ position:"absolute",top:0,left:0,right:0,height:130,background:"#000" }} />
    <svg style={{ position:"absolute",top:114,left:0,width:500,height:28 }} viewBox="0 0 500 28">
      <path d="M0,0 Q20,22 40,8 Q60,0 80,18 Q100,28 120,8 Q140,0 160,16 Q180,28 200,6 Q220,0 240,20 Q260,28 280,10 Q300,0 320,18 Q340,28 360,8 Q380,0 400,16 Q420,28 440,8 Q460,0 480,14 L500,8 L500,0 Z" fill="#000"/>
    </svg>
    <div style={{ position:"relative",height:"100%",boxSizing:"border-box" }}>
      <div style={{ padding:"26px 36px",height:130,boxSizing:"border-box",display:"flex",flexDirection:"column",justifyContent:"space-between" }}>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}><Logo /></div>
        <div style={{ fontSize:10,color:"#555",fontFamily:"monospace",letterSpacing:"0.12em" }}>THE LENDING APP THAT GETS IT</div>
      </div>
      <div style={{ padding:"18px 36px 0" }}>
        <div style={{ fontSize:13,color:"#78716c",fontFamily:"monospace",marginBottom:10 }}>sound familiar? 👇</div>
        <div style={{ background:"#fff",border:"2px solid #e5e7eb",borderRadius:"18px 18px 18px 4px",padding:"14px 18px",marginBottom:18,maxWidth:300,boxShadow:"3px 3px 0 #d1d5db" }}>
          <div style={{ fontSize:13,color:"#111",lineHeight:1.6 }}>heyy sooo random lol but does<br/>anyone have like $200?? 😅🙏<br/>asking for a friend lmaooo</div>
          <div style={{ fontSize:10,color:"#9ca3af",marginTop:6,fontFamily:"monospace" }}>seen by 14 · 0 replies 💀</div>
        </div>
        <div style={{ fontSize:28,fontWeight:900,color:"#000",lineHeight:1.1,letterSpacing:"-0.02em" }}>There's a better way.</div>
        <div style={{ fontSize:13,color:"#78716c",marginTop:8,lineHeight:1.7 }}>Borrow from verified lenders on Feyza.<br/>No group chat needed.</div>
      </div>
      <div style={{ padding:"14px 36px 24px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <div style={{ fontSize:11,fontFamily:"monospace",color:"#555",lineHeight:1.9 }}>
          <div>✓ Real lenders</div><div>✓ Zero fees</div><div>✓ No awkward texts</div>
        </div>
        <div style={{ background:"#000",color:"#facc15",padding:"11px 18px",fontSize:11,fontWeight:900,fontFamily:"monospace",letterSpacing:"0.06em",transform:"rotate(-1deg)" }}>APPLY →</div>
      </div>
    </div>
  </div>
);

// ─── WEEK 2 ───────────────────────────────────────────────────────────────────
const F4 = () => (
  <div data-capture-area="true" style={{ width:500,height:500,position:"relative",overflow:"hidden",background:"#09090b",fontFamily:"'Arial Black',sans-serif",flexShrink:0,boxSizing:"border-box" }}>
    <div style={{ position:"absolute",top:-40,left:-40,width:220,height:220,background:"radial-gradient(circle,rgba(134,239,172,0.25) 0%,transparent 70%)",borderRadius:"50%" }} />
    <div style={{ position:"absolute",bottom:-40,right:-40,width:220,height:220,background:"radial-gradient(circle,rgba(250,204,21,0.2) 0%,transparent 70%)",borderRadius:"50%" }} />
    <div style={{ position:"absolute",inset:0,opacity:0.03,backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 3px,#fff 3px,#fff 4px)" }} />
    <div style={{ position:"relative",padding:"34px 36px",height:"100%",boxSizing:"border-box",display:"flex",flexDirection:"column",justifyContent:"space-between" }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <Logo /><span style={{ border:"1px solid #4ade80",color:"#4ade80",fontSize:9,padding:"3px 10px",fontFamily:"monospace",letterSpacing:"0.1em" }}>TRUST-BASED</span>
      </div>
      <div>
        <div style={{ fontSize:18,color:"#facc15",fontFamily:"monospace",letterSpacing:"0.08em",marginBottom:14 }}>credit score?</div>
        <div style={{ fontSize:68,fontWeight:900,color:"#fff",lineHeight:0.92,letterSpacing:"-0.03em" }}>never<br/>heard<br/><span style={{ color:"#4ade80",textShadow:"0 0 30px rgba(74,222,128,0.6)" }}>of her.</span></div>
        <div style={{ marginTop:18,fontSize:13,color:"#52525b",fontFamily:"monospace",lineHeight:1.8 }}>We use trust & vouches.<br/>(Mostly trust. Also vouches.)</div>
      </div>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <div style={{ fontSize:11,fontFamily:"monospace",lineHeight:2 }}>
          <div style={{ color:"#3f3f46" }}>❌ credit check</div>
          <div style={{ color:"#3f3f46" }}>❌ hidden fees</div>
          <div style={{ color:"#3f3f46" }}>❌ bank drama</div>
          <div style={{ color:"#4ade80" }}>✅ feyza</div>
        </div>
        <div style={{ background:"#4ade80",color:"#000",padding:"14px 20px",fontSize:12,fontFamily:"monospace",fontWeight:900,letterSpacing:"0.08em",boxShadow:"0 0 30px rgba(74,222,128,0.4)" }}>LET'S GO →</div>
      </div>
    </div>
  </div>
);

const F5 = () => (
  <div data-capture-area="true" style={{ width:500,height:500,position:"relative",overflow:"hidden",background:"#fdf4ff",fontFamily:"'Arial Black',sans-serif",flexShrink:0,boxSizing:"border-box" }}>
    <div style={{ position:"absolute",top:0,left:0,right:0,height:5,background:"linear-gradient(90deg,#a855f7,#ec4899,#f97316)" }} />
    <div style={{ position:"absolute",top:-80,right:-80,width:260,height:260,background:"radial-gradient(circle,rgba(168,85,247,0.15) 0%,transparent 70%)",borderRadius:"50%" }} />
    <div style={{ position:"relative",padding:"38px",height:"100%",boxSizing:"border-box",display:"flex",flexDirection:"column",justifyContent:"space-between" }}>
      <Logo />
      <div>
        <div style={{ marginBottom:10 }}>
          <div style={{ display:"inline-block",background:"#e5e7eb",borderRadius:"16px 16px 16px 4px",padding:"10px 16px",fontSize:13,color:"#111",lineHeight:1.5,marginBottom:6 }}>hi I'd like a small loan please 🙂</div>
        </div>
        <div style={{ display:"flex",justifyContent:"flex-end",marginBottom:6 }}>
          <div style={{ display:"inline-block",background:"#1d4ed8",color:"#fff",borderRadius:"16px 16px 4px 16px",padding:"10px 16px",fontSize:13,lineHeight:1.5 }}>denied 🙂</div>
        </div>
        <div style={{ fontFamily:"monospace",fontSize:11,color:"#9ca3af",textAlign:"center",padding:"8px 0",borderTop:"1px solid #f3f4f6",borderBottom:"1px solid #f3f4f6",marginBottom:14 }}>The Bank has left the chat</div>
        <div style={{ display:"inline-block",background:"#a855f7",color:"#fff",borderRadius:"16px 16px 16px 4px",padding:"10px 16px",fontSize:13,lineHeight:1.5 }}>hey 👋 Feyza here. we read your<br/>application and you're approved. 💚</div>
      </div>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <div style={{ fontSize:12,color:"#6b7280",fontFamily:"monospace",lineHeight:1.8 }}>Real lenders.<br/>Real approvals.<br/>feyza.app</div>
        <div style={{ background:"linear-gradient(135deg,#a855f7,#ec4899)",color:"#fff",padding:"12px 20px",fontSize:12,fontWeight:900,fontFamily:"monospace",letterSpacing:"0.06em",borderRadius:4 }}>APPLY FREE →</div>
      </div>
    </div>
  </div>
);

const F6 = () => (
  <div data-capture-area="true" style={{ width:500,height:500,position:"relative",overflow:"hidden",background:"#fff7ed",fontFamily:"'Georgia',serif",flexShrink:0,boxSizing:"border-box" }}>
    <div style={{ position:"absolute",bottom:-60,right:-60,width:260,height:260,background:"radial-gradient(circle,rgba(249,115,22,0.15) 0%,transparent 70%)",borderRadius:"50%" }} />
    <div style={{ position:"absolute",top:0,right:0,width:0,height:0,borderLeft:"120px solid transparent",borderTop:"120px solid #fed7aa" }} />
    <div style={{ position:"relative",padding:"36px 40px",height:"100%",boxSizing:"border-box",display:"flex",flexDirection:"column",justifyContent:"space-between" }}>
      <Logo />
      <div>
        <div style={{ fontSize:52,lineHeight:1,marginBottom:14 }}>😮‍💨</div>
        <div style={{ fontSize:44,fontWeight:900,color:"#000",lineHeight:1.05,letterSpacing:"-0.025em" }}>Borrow money<br/>without the<br/><span style={{ color:"#ea580c" }}>guilt trip.</span></div>
        <div style={{ marginTop:18,fontSize:13,color:"#92400e",lineHeight:1.8,fontStyle:"italic" }}>No "so when are you paying me back?"<br/>No awkward family dinners. Just a loan.</div>
      </div>
      <div style={{ display:"flex",gap:10 }}>
        {["Verified lenders","Clear terms","No drama"].map((t,i)=>(
          <div key={t} style={{ flex:1,textAlign:"center",background:"#fff",border:"2px solid #fed7aa",borderRadius:10,padding:"10px 4px",fontSize:9,color:"#c2410c",fontFamily:"monospace",fontWeight:700 }}>{["💼","📄","✌️"][i]} {t}</div>
        ))}
      </div>
    </div>
  </div>
);

// ─── WEEK 3 ───────────────────────────────────────────────────────────────────
const F7 = () => (
  <div data-capture-area="true" style={{ width:500,height:500,position:"relative",overflow:"hidden",background:"#000",fontFamily:"'Arial Black',sans-serif",flexShrink:0,boxSizing:"border-box" }}>
    <div style={{ position:"absolute",inset:0,background:"repeating-linear-gradient(135deg,transparent,transparent 30px,rgba(255,255,255,0.012) 30px,rgba(255,255,255,0.012) 60px)" }} />
    <div style={{ position:"relative",padding:"36px",height:"100%",boxSizing:"border-box",display:"flex",flexDirection:"column",justifyContent:"space-between" }}>
      <Logo />
      <div>
        <div style={{ fontSize:11,color:"#555",fontFamily:"monospace",letterSpacing:"0.15em",marginBottom:18 }}>TRADITIONAL BANK VS FEYZA</div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:8,alignItems:"center" }}>
          <div style={{ background:"#111",border:"1px solid #1e1e1e",borderRadius:10,padding:"16px 14px" }}>
            <div style={{ fontSize:28,marginBottom:10 }}>🏦</div>
            {["Credit check","Weeks of waiting","Rejection letter","Hidden fees","Judge-y vibes"].map(t=>(
              <div key={t} style={{ fontSize:10,color:"#ef4444",fontFamily:"monospace",lineHeight:2.2 }}>✗ {t}</div>
            ))}
          </div>
          <div style={{ fontSize:22,fontWeight:900,color:"#555",fontFamily:"monospace",textAlign:"center" }}>VS</div>
          <div style={{ background:"#052e16",border:"1px solid #166534",borderRadius:10,padding:"16px 14px" }}>
            <div style={{ fontSize:28,marginBottom:10 }}>💚</div>
            {["Trust-based","Fast approval","Real humans","0 hidden fees","Good vibes only"].map(t=>(
              <div key={t} style={{ fontSize:10,color:"#22c55e",fontFamily:"monospace",lineHeight:2.2 }}>✓ {t}</div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display:"flex",justifyContent:"center" }}>
        <div style={{ background:"#22c55e",color:"#000",padding:"12px 32px",fontSize:13,fontWeight:900,fontFamily:"monospace",letterSpacing:"0.08em" }}>CHOOSE FEYZA →</div>
      </div>
    </div>
  </div>
);

const F8 = () => (
  <div data-capture-area="true" style={{ width:500,height:500,position:"relative",overflow:"hidden",background:"#0c0a09",fontFamily:"'Arial Black',sans-serif",flexShrink:0,boxSizing:"border-box" }}>
    <div style={{ position:"absolute",top:0,left:0,right:0,height:5,background:"#ef4444" }} />
    <div style={{ position:"absolute",top:-40,right:-40,width:200,height:200,background:"radial-gradient(circle,rgba(239,68,68,0.2) 0%,transparent 70%)",borderRadius:"50%" }} />
    <div style={{ position:"relative",padding:"36px 38px",height:"100%",boxSizing:"border-box",display:"flex",flexDirection:"column",justifyContent:"space-between" }}>
      <Logo />
      <div>
        <div style={{ fontSize:13,color:"#ef4444",fontFamily:"monospace",letterSpacing:"0.12em",marginBottom:16 }}>WE GET IT.</div>
        <div style={{ fontSize:48,fontWeight:900,color:"#fff",lineHeight:0.97,letterSpacing:"-0.03em" }}>Rent's due<br/>Friday.<br/><span style={{ color:"#ef4444" }}>It's Wednesday.</span></div>
        <div style={{ marginTop:22,fontSize:14,color:"#78716c",fontFamily:"monospace",lineHeight:1.8 }}>Apply on Feyza today.<br/>Get a decision fast.<br/>Breathe again. 😮‍💨</div>
      </div>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <div style={{ fontSize:11,color:"#555",fontFamily:"monospace",lineHeight:1.9 }}>
          <div>⚡ Fast decisions</div><div>🔒 Secure & verified</div><div>💚 Real lenders</div>
        </div>
        <div style={{ background:"#ef4444",color:"#fff",padding:"13px 22px",fontSize:12,fontWeight:900,fontFamily:"monospace",letterSpacing:"0.06em" }}>APPLY NOW →</div>
      </div>
    </div>
  </div>
);

const F9 = () => (
  <div data-capture-area="true" style={{ width:500,height:500,position:"relative",overflow:"hidden",background:"#f0fdf4",fontFamily:"'Georgia',serif",flexShrink:0,boxSizing:"border-box" }}>
    <div style={{ position:"absolute",inset:0,backgroundImage:"radial-gradient(circle,#bbf7d0 1.5px,transparent 1.5px)",backgroundSize:"24px 24px",opacity:0.5 }} />
    <div style={{ position:"absolute",bottom:-80,left:-80,width:300,height:300,background:"radial-gradient(circle,rgba(34,197,94,0.12) 0%,transparent 70%)",borderRadius:"50%" }} />
    <div style={{ position:"relative",padding:"38px",height:"100%",boxSizing:"border-box",display:"flex",flexDirection:"column",justifyContent:"space-between" }}>
      <Logo />
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:56,lineHeight:1,marginBottom:16 }}>🌱</div>
        <div style={{ fontSize:11,color:"#15803d",fontFamily:"monospace",letterSpacing:"0.2em",textTransform:"uppercase",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
          <div style={{ width:24,height:1,background:"#15803d" }}/> real talk <div style={{ width:24,height:1,background:"#15803d" }}/>
        </div>
        <div style={{ fontSize:38,fontWeight:900,color:"#111",lineHeight:1.1,letterSpacing:"-0.02em" }}>Your credit score<br/>doesn't<br/><span style={{ color:"#15803d" }}>define you.</span></div>
        <div style={{ marginTop:18,fontSize:13,color:"#64748b",lineHeight:1.8,fontStyle:"italic" }}>Feyza looks at the whole picture.<br/>Trust, character, and your community.</div>
      </div>
      <div style={{ display:"flex",justifyContent:"center" }}>
        <div style={{ background:"#15803d",color:"#fff",padding:"12px 30px",fontSize:12,fontWeight:700,fontFamily:"monospace",letterSpacing:"0.08em",borderRadius:4 }}>START YOUR APPLICATION →</div>
      </div>
    </div>
  </div>
);

// ─── WEEK 4 ───────────────────────────────────────────────────────────────────
const F10 = () => (
  <div data-capture-area="true" style={{ width:500,height:500,position:"relative",overflow:"hidden",background:"#fff",fontFamily:"'Arial Black',sans-serif",flexShrink:0,boxSizing:"border-box" }}>
    <div style={{ position:"absolute",top:0,left:0,right:0,height:5,background:"linear-gradient(90deg,#22c55e,#3b82f6,#a855f7)" }} />
    <div style={{ position:"relative",padding:"36px 40px",height:"100%",boxSizing:"border-box",display:"flex",flexDirection:"column",justifyContent:"space-between" }}>
      <Logo />
      <div>
        <div style={{ fontSize:13,color:"#94a3b8",fontFamily:"monospace",letterSpacing:"0.1em",marginBottom:14 }}>the tweet that lives in our heads:</div>
        <div style={{ border:"1.5px solid #e5e7eb",borderRadius:16,padding:"20px",marginBottom:20,background:"#fafafa" }}>
          <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:12 }}>
            <div style={{ width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,#22c55e,#15803d)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>🫣</div>
            <div>
              <div style={{ fontSize:13,fontWeight:900,color:"#0f172a" }}>anonymous bestie</div>
              <div style={{ fontSize:11,color:"#94a3b8",fontFamily:"monospace" }}>@justneeditnow</div>
            </div>
          </div>
          <div style={{ fontSize:16,color:"#0f172a",lineHeight:1.6,fontFamily:"'Georgia',serif",fontWeight:400 }}>"me, refreshing my bank account<br/>for the 47th time today" 👁️👁️</div>
          <div style={{ marginTop:12,fontSize:11,color:"#94a3b8",fontFamily:"monospace" }}>💬 47.3k  🔁 12.1k  ❤️ 198k</div>
        </div>
        <div style={{ fontSize:22,fontWeight:900,color:"#000",letterSpacing:"-0.02em" }}>We see you. 👀</div>
        <div style={{ fontSize:13,color:"#64748b",fontFamily:"monospace",marginTop:8,lineHeight:1.7 }}>Apply on Feyza. Stop refreshing.</div>
      </div>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <div style={{ fontSize:11,color:"#94a3b8",fontFamily:"monospace" }}>feyza.app</div>
        <div style={{ background:"#000",color:"#fff",padding:"12px 22px",fontSize:12,fontWeight:900,fontFamily:"monospace",letterSpacing:"0.06em" }}>GET APPROVED →</div>
      </div>
    </div>
  </div>
);

const F11 = () => (
  <div data-capture-area="true" style={{ width:500,height:500,position:"relative",overflow:"hidden",background:"#18181b",fontFamily:"'Arial Black',sans-serif",flexShrink:0,boxSizing:"border-box" }}>
    <div style={{ position:"absolute",top:-60,left:-60,width:260,height:260,background:"radial-gradient(circle,rgba(239,68,68,0.15) 0%,transparent 70%)",borderRadius:"50%" }} />
    <div style={{ position:"absolute",bottom:-60,right:-60,width:260,height:260,background:"radial-gradient(circle,rgba(34,197,94,0.15) 0%,transparent 70%)",borderRadius:"50%" }} />
    <div style={{ position:"relative",padding:"36px 38px",height:"100%",boxSizing:"border-box",display:"flex",flexDirection:"column",justifyContent:"space-between" }}>
      <Logo />
      <div>
        <div style={{ fontSize:13,color:"#52525b",fontFamily:"monospace",letterSpacing:"0.1em",marginBottom:20 }}>let's compare real quick 👇</div>
        <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
          {[
            { thing:"Credit checks",bank:true,feyza:false},
            { thing:"Hidden fees",bank:true,feyza:false},
            { thing:"3-week wait",bank:true,feyza:false},
            { thing:"Verified lenders",bank:false,feyza:true},
            { thing:"Fast approval",bank:false,feyza:true},
            { thing:"0 drama",bank:false,feyza:true},
          ].map(({thing,bank,feyza})=>(
            <div key={thing} style={{ display:"grid",gridTemplateColumns:"1fr 2fr 1fr",alignItems:"center",gap:8 }}>
              <div style={{ textAlign:"center",fontSize:18 }}>{bank?"✅":"❌"}</div>
              <div style={{ fontSize:11,color:"#a1a1aa",fontFamily:"monospace",textAlign:"center" }}>{thing}</div>
              <div style={{ textAlign:"center",fontSize:18 }}>{feyza?"✅":"❌"}</div>
            </div>
          ))}
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 2fr 1fr",marginTop:4 }}>
          <div style={{ fontSize:10,color:"#ef4444",fontFamily:"monospace",textAlign:"center" }}>BANK 🏦</div>
          <div/>
          <div style={{ fontSize:10,color:"#22c55e",fontFamily:"monospace",textAlign:"center" }}>FEYZA 💚</div>
        </div>
      </div>
      <div style={{ display:"flex",justifyContent:"center" }}>
        <div style={{ background:"#22c55e",color:"#000",padding:"12px 32px",fontSize:13,fontWeight:900,fontFamily:"monospace",letterSpacing:"0.08em" }}>OBVIOUS CHOICE →</div>
      </div>
    </div>
  </div>
);

const F12 = () => (
  <div data-capture-area="true" style={{ width:500,height:500,position:"relative",overflow:"hidden",background:"#fdf4ff",fontFamily:"'Georgia',serif",flexShrink:0,boxSizing:"border-box" }}>
    <div style={{ position:"absolute",top:0,left:0,bottom:0,width:5,background:"linear-gradient(to bottom,#a855f7,#ec4899)" }} />
    <div style={{ position:"absolute",top:-60,right:-60,width:240,height:240,background:"radial-gradient(circle,rgba(168,85,247,0.12) 0%,transparent 70%)",borderRadius:"50%" }} />
    <div style={{ position:"relative",padding:"38px 40px 38px 46px",height:"100%",boxSizing:"border-box",display:"flex",flexDirection:"column",justifyContent:"space-between" }}>
      <Logo />
      <div>
        <div style={{ fontSize:52,lineHeight:1,marginBottom:16 }}>🤲💜</div>
        <div style={{ fontSize:42,fontWeight:900,color:"#111",lineHeight:1.05,letterSpacing:"-0.025em" }}>Borrow from<br/>people who<br/><span style={{ color:"#a855f7" }}>actually trust you.</span></div>
        <div style={{ marginTop:18,fontSize:13,color:"#6b7280",lineHeight:1.8,fontStyle:"italic" }}>Real verified lenders, not algorithms.<br/>Loans based on trust, not a three-digit number.</div>
      </div>
      <div style={{ display:"flex",gap:10 }}>
        {["💼 Verified","⚡ Fast","💚 Fair"].map(t=>(
          <div key={t} style={{ flex:1,textAlign:"center",background:"#fff",border:"1.5px solid #e9d5ff",borderRadius:10,padding:"10px 6px",fontSize:11,color:"#7c3aed",fontFamily:"monospace",fontWeight:700 }}>{t}</div>
        ))}
      </div>
    </div>
  </div>
);

const F13 = () => (
  <div data-capture-area="true" style={{ width:500,height:500,position:"relative",overflow:"hidden",background:"#000",fontFamily:"'Arial Black',sans-serif",flexShrink:0,boxSizing:"border-box" }}>
    <div style={{ position:"absolute",top:-30,left:-30,width:200,height:200,background:"radial-gradient(circle,rgba(250,204,21,0.3) 0%,transparent 70%)",borderRadius:"50%" }} />
    <div style={{ position:"absolute",bottom:-60,right:-60,width:280,height:280,background:"radial-gradient(circle,rgba(34,197,94,0.2) 0%,transparent 70%)",borderRadius:"50%" }} />
    <div style={{ position:"absolute",inset:0,backgroundImage:"radial-gradient(circle,#1a1a1a 1px,transparent 1px)",backgroundSize:"20px 20px" }} />
    <div style={{ position:"relative",padding:"36px 38px",height:"100%",boxSizing:"border-box",display:"flex",flexDirection:"column",justifyContent:"space-between" }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <Logo /><span style={{ color:"#333",fontSize:10,fontFamily:"monospace" }}>feyza.app</span>
      </div>
      <div>
        <div style={{ fontSize:15,color:"#facc15",fontFamily:"monospace",letterSpacing:"0.1em",marginBottom:14 }}>plot twist:</div>
        <div style={{ fontSize:60,fontWeight:900,color:"#fff",lineHeight:0.93,letterSpacing:"-0.03em" }}>you actually<br/><span style={{ color:"#facc15",textShadow:"0 0 40px rgba(250,204,21,0.4)" }}>got</span><br/><span style={{ color:"#22c55e" }}>the money.</span></div>
        <div style={{ marginTop:20,fontSize:13,color:"#555",fontFamily:"monospace",lineHeight:1.8 }}>No rejection. No waiting.<br/>Just a lender on Feyza who said yes.</div>
      </div>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <div style={{ fontSize:22 }}>🎉💸✅</div>
        <div style={{ background:"#facc15",color:"#000",padding:"13px 22px",fontSize:12,fontWeight:900,fontFamily:"monospace",letterSpacing:"0.06em" }}>BE THE PLOT TWIST →</div>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// COMING SOON SERIES
// ─────────────────────────────────────────────────────────────────────────────

// CS1 "Your bank is nervous rn"
const F14 = () => (
  <div data-capture-area="true" style={{ width:500,height:500,position:"relative",overflow:"hidden",background:"#fff",fontFamily:"'Arial Black',sans-serif",boxSizing:"border-box" }}>
    {/* Background grid */}
    <div style={{ position:"absolute",inset:0,backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 39px,#f3f4f6 39px,#f3f4f6 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,#f3f4f6 39px,#f3f4f6 40px)" }} />
    {/* Top border */}
    <div style={{ position:"absolute",top:0,left:0,right:0,height:6,background:"#000" }} />
    {/* Header */}
    <div style={{ position:"absolute",top:28,left:32,right:32,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
      <Logo />
      <div style={{ background:"#facc15",color:"#000",fontSize:11,padding:"14px 24px",fontFamily:"monospace",fontWeight:900,letterSpacing:"0.1em",whiteSpace:"nowrap" }}>COMING SOON...</div>
    </div>
    {/* Main content */}
    <div style={{ position:"absolute",top:110,left:32,right:32 }}>
      <div style={{ fontSize:13,color:"#9ca3af",fontFamily:"monospace",marginBottom:10 }}>breaking news 🗞️</div>
      <div style={{ fontSize:48,fontWeight:900,color:"#000",lineHeight:1,letterSpacing:"-0.03em" }}>
        Your bank<br/>is nervous<br/>
        <span style={{ position:"relative",display:"inline-block",color:"#fff",zIndex:1 }}>
          rn.
          <span style={{ position:"absolute",left:-4,bottom:3,width:"120%",height:"100%",background:"#16a34a", zIndex:-1 }} />
        </span>
      </div>
      <div style={{ marginTop:16,fontSize:13,color:"#6b7280",fontFamily:"monospace",lineHeight:1.75 }}>
        Feyza is a peer-to-peer lending app<br/>where real people lend to real people.<br/>No banks. No algorithms. No drama.
      </div>
    </div>
    {/* Footer left */}
    <div style={{ position:"absolute",bottom:32,left:32,fontSize:12,fontFamily:"monospace",color:"#9ca3af",lineHeight:1.8 }}>
      <div>🏦 banks: sweating</div>
      <div>💚 feyza: almost here</div>
    </div>
    {/* Footer right */}
    <div style={{ position:"absolute",bottom:32,right:32,textAlign:"right" }}>
      <div style={{ fontSize:11,color:"#9ca3af",fontFamily:"monospace",marginBottom:6 }}>get notified</div>
      <div style={{ background:"#16a34a",color:"#fff",fontSize:12,fontWeight:900,fontFamily:"monospace",padding:"12px 20px",letterSpacing:"0.05em",whiteSpace:"nowrap" }}>feyza.app →</div>
    </div>
  </div>
);

// CS2 "We're building something the banks don't want you to know about"
const F15 = () => (
  <div data-capture-area="true" style={{ width:500,height:500,position:"relative",overflow:"hidden",background:"#09090b",fontFamily:"'Arial Black',sans-serif",boxSizing:"border-box" }}>
    <div style={{ position:"absolute",inset:0,backgroundImage:"repeating-linear-gradient(45deg,rgba(255,255,255,0.015) 0px,rgba(255,255,255,0.015) 1px,transparent 1px,transparent 50%)",backgroundSize:"8px 8px" }} />
    <div style={{ position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:400,height:400,background:"radial-gradient(circle,rgba(250,204,21,0.08) 0%,transparent 70%)",borderRadius:"50%" }} />
    {/* Header */}
    <div style={{ position:"absolute",top:38,left:38,right:38,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
      <Logo />
      <div style={{ border:"1px solid #facc15",color:"#facc15",fontSize:10,padding:"6px 14px",fontFamily:"monospace",fontWeight:900,letterSpacing:"0.1em",whiteSpace:"nowrap" }}>TOP SECRET 🤫</div>
    </div>
    {/* Main content */}
    <div style={{ position:"absolute",top:130,left:38,right:38 }}>
      <div style={{ fontSize:12,color:"#555",fontFamily:"monospace",letterSpacing:"0.12em",marginBottom:16,textTransform:"uppercase" }}>what the banks don't want you to know:</div>
      <div style={{ fontSize:42,fontWeight:900,color:"#fff",lineHeight:1.05,letterSpacing:"-0.025em" }}>
        you can borrow<br/>from real people.<br/><span style={{ color:"#facc15",textShadow:"0 0 30px rgba(250,204,21,0.4)" }}>without them.</span>
      </div>
      <div style={{ marginTop:18,fontSize:12,color:"#3f3f46",fontFamily:"monospace",lineHeight:1.9 }}>
        Feyza connects borrowers directly<br/>with verified lenders. Peer to peer.<br/>No middleman. No nonsense.
      </div>
    </div>
    {/* Footer left */}
    <div style={{ position:"absolute",bottom:38,left:38,fontSize:11,fontFamily:"monospace",lineHeight:2,color:"#3f3f46" }}>
      <div style={{ color:"#facc15" }}>⚡ Launching soon</div>
      <div>📍 feyza.app</div>
    </div>
    {/* Footer right */}
    <div style={{ position:"absolute",bottom:38,right:38 }}>
      <div style={{ background:"#facc15",color:"#000",fontSize:11,fontWeight:900,fontFamily:"monospace",padding:"11px 20px",letterSpacing:"0.08em" }}>JOIN WAITLIST →</div>
    </div>
  </div>
);

// CS3 "We're the app your loan officer had nightmares about"
const F16 = () => (
  <div data-capture-area="true" style={{ width:500,height:500,position:"relative",overflow:"hidden",background:"#fef9c3",fontFamily:"'Arial Black',sans-serif",boxSizing:"border-box" }}>
    <div style={{ position:"absolute",bottom:0,left:0,right:0,height:180,background:"#000" }} />
    {/* Header */}
    <div style={{ position:"absolute",top:38,left:38,right:38,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
      <Logo />
      <div style={{ background:"#000",color:"#facc15",fontSize:10,padding:"6px 14px",fontFamily:"monospace",fontWeight:900,letterSpacing:"0.1em",whiteSpace:"nowrap" }}>COMING SOON</div>
    </div>
    {/* Main content */}
    <div style={{ position:"absolute",top:130,left:38,right:38 }}>
      <div style={{ fontSize:13,color:"#78716c",fontFamily:"monospace",marginBottom:14,letterSpacing:"0.06em" }}>👻 scary for banks. great for you.</div>
      <div style={{ fontSize:44,fontWeight:900,color:"#000",lineHeight:1,letterSpacing:"-0.03em" }}>
        We're the app<br/>your loan officer<br/>had nightmares<br/>
        <span style={{ color:"#fff",background:"#000",padding:"2px 8px",display:"inline-block",marginTop:4 }}>about.</span>
      </div>
    </div>
    {/* Footer text */}
    <div style={{ position:"absolute",bottom:76,left:38,right:38 }}>
      <div style={{ fontSize:13,fontFamily:"monospace",lineHeight:1.9,color:"#9ca3af" }}>
        Peer-to-peer loans. Real people. Zero bank fees.<br/>Feyza is almost here.
      </div>
    </div>
    {/* Footer bottom row */}
    <div style={{ position:"absolute",bottom:38,left:38,right:38,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
      <div style={{ fontSize:11,fontFamily:"monospace",color:"#555",lineHeight:2 }}>
        <div>✓ No credit gatekeeping</div>
        <div>✓ Verified lenders</div>
      </div>
      <div style={{ background:"#facc15",color:"#000",fontSize:11,fontWeight:900,fontFamily:"monospace",padding:"11px 18px",letterSpacing:"0.08em" }}>NOTIFY ME →</div>
    </div>
  </div>
);

// CS4 "Launching soon. Your wallet is ready. Are you?"
const F17 = () => (
  <div data-capture-area="true" style={{ width:500,height:500,position:"relative",overflow:"hidden",background:"#0f172a",fontFamily:"'Arial Black',sans-serif",boxSizing:"border-box" }}>
    <div style={{ position:"absolute",top:-80,right:-80,width:320,height:320,background:"radial-gradient(circle,rgba(99,102,241,0.25) 0%,transparent 70%)",borderRadius:"50%" }} />
    <div style={{ position:"absolute",bottom:-80,left:-80,width:320,height:320,background:"radial-gradient(circle,rgba(34,197,94,0.15) 0%,transparent 70%)",borderRadius:"50%" }} />
    {/* Header */}
    <div style={{ position:"absolute",top:38,left:38,right:38,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
      <Logo />
      <div style={{ border:"1px solid #6366f1",color:"#6366f1",fontSize:10,padding:"6px 14px",fontFamily:"monospace",fontWeight:900,letterSpacing:"0.1em",whiteSpace:"nowrap" }}>COMING SOON</div>
    </div>
    {/* Checklist card */}
    <div style={{ position:"absolute",top:120,left:38,right:38 }}>
      <div style={{ background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:"20px",marginBottom:20 }}>
        <div style={{ fontSize:10,color:"#6366f1",fontFamily:"monospace",letterSpacing:"0.12em",marginBottom:10 }}>FEYZA APP STATUS UPDATE</div>
        <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
          {[
            { label:"Bank alternatives built", done:true },
            { label:"Real lenders verified", done:true },
            { label:"Credit checks removed", done:true },
            { label:"Hidden fees eliminated", done:true },
            { label:"Launching to the world", done:false },
          ].map(({label,done})=>(
            <div key={label} style={{ display:"flex",alignItems:"center",gap:10 }}>
              <div style={{ width:16,height:16,borderRadius:4,background:done?"#22c55e":"rgba(255,255,255,0.06)",border:done?"none":"1px solid #333",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,flexShrink:0 }}>{done?"✓":""}</div>
              <div style={{ fontSize:11,color:done?"#94a3b8":"#475569",fontFamily:"monospace",textDecoration:done?"line-through":"none" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ fontSize:32,fontWeight:900,color:"#fff",lineHeight:1.1,letterSpacing:"-0.025em" }}>
        Almost ready.<br/><span style={{ color:"#22c55e" }}>Are you?</span>
      </div>
    </div>
    {/* Footer */}
    <div style={{ position:"absolute",bottom:38,left:38 }}>
      <div style={{ fontSize:11,color:"#334155",fontFamily:"monospace" }}>feyza.app</div>
    </div>
    <div style={{ position:"absolute",bottom:38,right:38 }}>
      <div style={{ background:"#22c55e",color:"#000",fontSize:11,fontWeight:900,fontFamily:"monospace",padding:"11px 20px",letterSpacing:"0.08em" }}>GET EARLY ACCESS →</div>
    </div>
  </div>
);

// CS5 "Who is Feyza?" explainer
const F18 = () => (
  <div data-capture-area="true" style={{ width:500,height:500,position:"relative",overflow:"hidden",background:"#f0fdf4",fontFamily:"'Georgia',serif",boxSizing:"border-box" }}>
    <div style={{ position:"absolute",inset:0,backgroundImage:"radial-gradient(circle,#bbf7d0 1.5px,transparent 1.5px)",backgroundSize:"24px 24px",opacity:0.6 }} />
    <div style={{ position:"absolute",top:0,left:0,right:0,height:5,background:"linear-gradient(90deg,#22c55e,#16a34a)" }} />
    {/* Header */}
    <div style={{ position:"absolute",top:28,left:32,right:32,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
      <Logo />
      <div style={{ background:"#15803d",color:"#fff",fontSize:10,padding:"6px 14px",fontFamily:"monospace",fontWeight:900,letterSpacing:"0.1em",whiteSpace:"nowrap" }}>COMING SOON</div>
    </div>
    {/* Main content */}
    <div style={{ position:"absolute",top:100,left:32,right:32 }}>
      <div style={{ fontSize:10,color:"#15803d",fontFamily:"monospace",letterSpacing:"0.2em",textTransform:"uppercase",marginBottom:10,display:"flex",alignItems:"center",gap:8 }}>
        <div style={{ width:20,height:1,background:"#15803d" }}/> who is feyza? <div style={{ width:20,height:1,background:"#15803d" }}/>
      </div>
      <div style={{ fontSize:30,fontWeight:900,color:"#111",lineHeight:1.1,letterSpacing:"-0.02em",marginBottom:14 }}>
        A lending app<br/>built for the<br/><span style={{ color:"#15803d" }}>people banks forgot.</span>
      </div>
      <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
        {[
          { icon:"🤝", text:"Real people lending to real people" },
          { icon:"🚫", text:"No credit score required" },
          { icon:"💸", text:"Zero hidden fees, ever" },
          { icon:"⚡", text:"Fast decisions, not weeks" },
        ].map(({icon,text})=>(
          <div key={text} style={{ display:"flex",alignItems:"center",gap:10,background:"#fff",border:"1.5px solid #bbf7d0",borderRadius:10,padding:"8px 12px" }}>
            <span style={{ fontSize:16,flexShrink:0 }}>{icon}</span>
            <span style={{ fontSize:12,color:"#374151",fontFamily:"monospace" }}>{text}</span>
          </div>
        ))}
      </div>
    </div>
    {/* Footer */}
    <div style={{ position:"absolute",bottom:28,left:32 }}>
      <div style={{ fontSize:11,color:"#9ca3af",fontFamily:"monospace" }}>feyza.app</div>
    </div>
    <div style={{ position:"absolute",bottom:28,right:32 }}>
      <div style={{ background:"#15803d",color:"#fff",fontSize:11,fontWeight:700,fontFamily:"monospace",padding:"11px 20px",letterSpacing:"0.08em",borderRadius:4,whiteSpace:"nowrap" }}>JOIN THE WAITLIST →</div>
    </div>
  </div>
);

// CS6 "The waitlist is giving main character energy"
const F19 = () => (
  <div data-capture-area="true" style={{ width:500,height:500,position:"relative",overflow:"hidden",background:"#18181b",fontFamily:"'Arial Black',sans-serif",boxSizing:"border-box" }}>
    <div style={{ position:"absolute",top:0,left:0,right:0,height:5,background:"linear-gradient(90deg,#a855f7,#ec4899,#f97316)" }} />
    <div style={{ position:"absolute",top:-60,right:-60,width:260,height:260,background:"radial-gradient(circle,rgba(168,85,247,0.2) 0%,transparent 70%)",borderRadius:"50%" }} />
    <div style={{ position:"absolute",bottom:-60,left:-60,width:260,height:260,background:"radial-gradient(circle,rgba(236,72,153,0.15) 0%,transparent 70%)",borderRadius:"50%" }} />
    {/* Header */}
    <div style={{ position:"absolute",top:28,left:32,right:32,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
      <Logo />
      <div style={{ border:"1px solid #a855f7",color:"#a855f7",fontSize:10,padding:"6px 14px",fontFamily:"monospace",fontWeight:900,letterSpacing:"0.1em",whiteSpace:"nowrap" }}>COMING SOON</div>
    </div>
    {/* Main content */}
    <div style={{ position:"absolute",top:105,left:32,right:32 }}>
      <div style={{ fontSize:12,color:"#52525b",fontFamily:"monospace",letterSpacing:"0.1em",marginBottom:12 }}>no pressure but—</div>
      <div style={{ fontSize:44,fontWeight:900,color:"#fff",lineHeight:0.97,letterSpacing:"-0.03em",marginBottom:16 }}>
        the waitlist<br/>is giving<br/><span style={{ color:"#a855f7",textShadow:"0 0 30px rgba(168,85,247,0.5)" }}>main character</span><br/>energy. ✨
      </div>
      <div style={{ background:"rgba(168,85,247,0.08)",border:"1px solid rgba(168,85,247,0.2)",borderRadius:10,padding:"12px 16px" }}>
        <div style={{ fontSize:10,color:"#a855f7",fontFamily:"monospace",letterSpacing:"0.1em",marginBottom:6 }}>WHAT YOU'RE SIGNING UP FOR:</div>
        <div style={{ fontSize:11,color:"#71717a",fontFamily:"monospace",lineHeight:1.8 }}>
          ✓ Early access to Feyza<br/>
          ✓ Borrow from real people<br/>
          ✓ No credit score drama<br/>
          ✓ The satisfaction of being first
        </div>
      </div>
    </div>
    {/* Footer */}
    <div style={{ position:"absolute",bottom:28,left:32 }}>
      <div style={{ fontSize:11,color:"#3f3f46",fontFamily:"monospace" }}>feyza.app</div>
    </div>
    <div style={{ position:"absolute",bottom:28,right:32 }}>
      <div style={{ background:"linear-gradient(135deg,#a855f7,#ec4899)",color:"#fff",fontSize:11,fontWeight:900,fontFamily:"monospace",padding:"11px 20px",letterSpacing:"0.08em",borderRadius:4,whiteSpace:"nowrap" }}>I'M IN →</div>
    </div>
  </div>
);

// ─── COMING SOON · LENDER SERIES ─────────────────────────────────────────────

// CS7 "POV: You're the bank now"
const F20 = () => (
  <div data-capture-area="true" style={{ width:500,height:500,position:"relative",overflow:"hidden",background:"#0a0900",fontFamily:"'Arial Black',sans-serif",boxSizing:"border-box" }}>
    <div style={{ position:"absolute",inset:0,backgroundImage:"repeating-linear-gradient(45deg,rgba(250,204,21,0.03) 0px,rgba(250,204,21,0.03) 1px,transparent 1px,transparent 50%)",backgroundSize:"12px 12px" }} />
    <div style={{ position:"absolute",top:-60,left:-60,width:320,height:320,background:"radial-gradient(circle,rgba(250,204,21,0.18) 0%,transparent 70%)",borderRadius:"50%" }} />
    <div style={{ position:"absolute",top:0,left:0,right:0,height:4,background:"linear-gradient(90deg,#78350f,#facc15,#78350f)" }} />
    <div style={{ position:"absolute",top:28,left:32,right:32,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
      <Logo />
      <div style={{ border:"1px solid #b45309",color:"#facc15",fontSize:10,padding:"6px 14px",fontFamily:"monospace",fontWeight:900,letterSpacing:"0.1em",whiteSpace:"nowrap" }}>FOR LENDERS 💰</div>
    </div>
    <div style={{ position:"absolute",top:105,left:32,right:32 }}>
      <div style={{ fontSize:12,color:"#78716c",fontFamily:"monospace",marginBottom:12,letterSpacing:"0.1em" }}>pov:</div>
      <div style={{ fontSize:58,fontWeight:900,color:"#fff",lineHeight:0.93,letterSpacing:"-0.03em",marginBottom:16 }}>
        you're<br/>the <span style={{ color:"#facc15",textShadow:"0 0 40px rgba(250,204,21,0.5)" }}>bank</span><br/>now. 🏦
      </div>
      <div style={{ fontSize:12,color:"#57534e",fontFamily:"monospace",lineHeight:1.8,marginBottom:14 }}>
        No more begging banks for scraps.<br/>On Feyza, YOU lend the money.
      </div>
      <div style={{ display:"flex",gap:8 }}>
        {["💰 Earn interest","🔒 Verified borrowers","⚡ You decide"].map(t=>(
          <div key={t} style={{ flex:1,background:"rgba(250,204,21,0.06)",border:"1px solid rgba(250,204,21,0.15)",borderRadius:8,padding:"8px 4px",fontSize:9,color:"#a16207",fontFamily:"monospace",textAlign:"center" }}>{t}</div>
        ))}
      </div>
    </div>
    <div style={{ position:"absolute",bottom:28,left:32 }}>
      <div style={{ fontSize:11,color:"#44403c",fontFamily:"monospace" }}>feyza.app</div>
    </div>
    <div style={{ position:"absolute",bottom:28,right:32 }}>
      <div style={{ background:"#facc15",color:"#000",fontSize:11,fontWeight:900,fontFamily:"monospace",padding:"11px 20px",letterSpacing:"0.08em",whiteSpace:"nowrap" }}>JOIN WAITLIST →</div>
    </div>
  </div>
);

// CS8 "Your money has been benched"
const F21 = () => (
  <div data-capture-area="true" style={{ width:500,height:500,position:"relative",overflow:"hidden",background:"#052e16",fontFamily:"'Arial Black',sans-serif",boxSizing:"border-box" }}>
    <div style={{ position:"absolute",inset:0,backgroundImage:"repeating-linear-gradient(90deg,rgba(255,255,255,0.015) 0px,rgba(255,255,255,0.015) 1px,transparent 1px,transparent 60px)" }} />
    <div style={{ position:"absolute",top:0,left:0,right:0,height:5,background:"#22c55e" }} />
    <div style={{ position:"absolute",top:28,left:32,right:32,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
      <Logo />
      <div style={{ background:"#22c55e",color:"#000",fontSize:10,padding:"6px 14px",fontFamily:"monospace",fontWeight:900,letterSpacing:"0.1em",whiteSpace:"nowrap" }}>FOR LENDERS 🏆</div>
    </div>
    <div style={{ position:"absolute",top:105,left:32,right:32 }}>
      <div style={{ fontSize:10,color:"#166534",fontFamily:"monospace",marginBottom:10,letterSpacing:"0.12em",textTransform:"uppercase" }}>coach's honest feedback:</div>
      <div style={{ background:"rgba(0,0,0,0.5)",border:"1px solid #166534",borderRadius:10,padding:"12px 14px",marginBottom:14 }}>
        <div style={{ fontSize:12,color:"#4ade80",fontFamily:"monospace",lineHeight:1.75 }}>
          "0.1% APY? You're benched. 🪑<br/>
          Get off the field. You are<br/>NOT playing right now."
        </div>
      </div>
      <div style={{ fontSize:46,fontWeight:900,color:"#fff",lineHeight:0.97,letterSpacing:"-0.03em",marginBottom:12 }}>
        Put your money<br/>back in the<br/><span style={{ color:"#22c55e" }}>game. 🏆</span>
      </div>
      <div style={{ fontSize:12,color:"#166534",fontFamily:"monospace",lineHeight:1.7 }}>
        Lend on Feyza. Earn real returns.
      </div>
    </div>
    <div style={{ position:"absolute",bottom:28,left:32 }}>
      <div style={{ fontSize:11,color:"#166534",fontFamily:"monospace" }}>feyza.app</div>
    </div>
    <div style={{ position:"absolute",bottom:28,right:32 }}>
      <div style={{ background:"#22c55e",color:"#000",fontSize:11,fontWeight:900,fontFamily:"monospace",padding:"11px 20px",letterSpacing:"0.08em",whiteSpace:"nowrap" }}>GET IN THE GAME →</div>
    </div>
  </div>
);

// CS9 "Slay. Lend. Collect. Repeat."
const F22 = () => (
  <div data-capture-area="true" style={{ width:500,height:500,position:"relative",overflow:"hidden",background:"#0f0009",fontFamily:"'Arial Black',sans-serif",boxSizing:"border-box" }}>
    <div style={{ position:"absolute",top:-60,right:-60,width:280,height:280,background:"radial-gradient(circle,rgba(236,72,153,0.3) 0%,transparent 70%)",borderRadius:"50%" }} />
    <div style={{ position:"absolute",bottom:-60,left:-60,width:200,height:200,background:"radial-gradient(circle,rgba(168,85,247,0.2) 0%,transparent 70%)",borderRadius:"50%" }} />
    <div style={{ position:"absolute",top:0,left:0,right:0,height:4,background:"linear-gradient(90deg,#ec4899,#a855f7,#ec4899)" }} />
    <div style={{ position:"absolute",top:28,left:32,right:32,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
      <Logo />
      <div style={{ border:"1px solid #ec4899",color:"#ec4899",fontSize:10,padding:"6px 14px",fontFamily:"monospace",fontWeight:900,letterSpacing:"0.1em",whiteSpace:"nowrap" }}>FOR LENDERS 💅</div>
    </div>
    <div style={{ position:"absolute",top:105,left:32,right:32 }}>
      <div style={{ fontSize:12,color:"#6b21a8",fontFamily:"monospace",marginBottom:10,letterSpacing:"0.08em" }}>your financial glow-up era:</div>
      <div style={{ fontSize:48,fontWeight:900,color:"#fff",lineHeight:1.0,letterSpacing:"-0.03em",marginBottom:16 }}>
        Slay.<br/>Lend.<br/><span style={{ color:"#ec4899",textShadow:"0 0 30px rgba(236,72,153,0.5)" }}>Collect.</span><br/>Repeat. 💅
      </div>
      <div style={{ background:"rgba(236,72,153,0.08)",border:"1px solid rgba(236,72,153,0.2)",borderRadius:10,padding:"11px 14px" }}>
        <div style={{ fontSize:11,color:"#9d174d",fontFamily:"monospace",lineHeight:1.8 }}>
          ✓ Lend to verified borrowers<br/>
          ✓ Get paid back with interest<br/>
          ✓ Become that girl financially 💗
        </div>
      </div>
    </div>
    <div style={{ position:"absolute",bottom:28,left:32 }}>
      <div style={{ fontSize:11,color:"#500724",fontFamily:"monospace" }}>feyza.app</div>
    </div>
    <div style={{ position:"absolute",bottom:28,right:32 }}>
      <div style={{ background:"linear-gradient(135deg,#ec4899,#a855f7)",color:"#fff",fontSize:11,fontWeight:900,fontFamily:"monospace",padding:"11px 20px",letterSpacing:"0.08em",borderRadius:4,whiteSpace:"nowrap" }}>START SLAYING →</div>
    </div>
  </div>
);

// CS10 "NPC behavior detected"
const F23 = () => (
  <div data-capture-area="true" style={{ width:500,height:500,position:"relative",overflow:"hidden",background:"#030712",fontFamily:"'Arial Black',sans-serif",boxSizing:"border-box" }}>
    <div style={{ position:"absolute",inset:0,backgroundImage:"radial-gradient(circle,#0f172a 1.5px,transparent 1.5px)",backgroundSize:"20px 20px" }} />
    <div style={{ position:"absolute",top:-40,right:-40,width:200,height:200,background:"radial-gradient(circle,rgba(74,222,128,0.15) 0%,transparent 70%)",borderRadius:"50%" }} />
    <div style={{ position:"absolute",top:28,left:32,right:32,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
      <Logo />
      <div style={{ border:"1px solid #4ade80",color:"#4ade80",fontSize:10,padding:"6px 14px",fontFamily:"monospace",fontWeight:900,letterSpacing:"0.1em",whiteSpace:"nowrap" }}>FOR LENDERS 🎮</div>
    </div>
    <div style={{ position:"absolute",top:105,left:32,right:32 }}>
      <div style={{ fontSize:10,color:"#374151",fontFamily:"monospace",letterSpacing:"0.15em",marginBottom:10,textTransform:"uppercase" }}>⚠️ npc behavior detected</div>
      <div style={{ background:"#0f172a",border:"2px solid #1e293b",borderRadius:8,padding:"12px 14px",marginBottom:14,fontFamily:"monospace" }}>
        <div style={{ fontSize:9,color:"#4ade80",letterSpacing:"0.1em",marginBottom:8 }}>[YOUR SAVINGS ACCOUNT]</div>
        <div style={{ fontSize:12,color:"#94a3b8",lineHeight:1.8 }}>
          "i have 0.1% APY."<br/>
          "i do nothing."<br/>
          "this is fine." 🤖
        </div>
        <div style={{ marginTop:10,display:"flex",gap:8 }}>
          <div style={{ border:"1px solid #1e293b",color:"#475569",padding:"4px 10px",fontSize:9,fontFamily:"monospace" }}>[STAY NPC]</div>
          <div style={{ background:"#4ade80",color:"#000",padding:"4px 10px",fontSize:9,fontFamily:"monospace",fontWeight:900 }}>[BECOME LENDER]</div>
        </div>
      </div>
      <div style={{ fontSize:42,fontWeight:900,color:"#fff",lineHeight:1.05,letterSpacing:"-0.025em",marginBottom:8 }}>
        Main character<br/>arc: lend on<br/><span style={{ color:"#4ade80",textShadow:"0 0 20px rgba(74,222,128,0.4)" }}>Feyza. 🎮</span>
      </div>
      <div style={{ fontSize:10,color:"#1e293b",fontFamily:"monospace" }}>side quest: watch your money actually do something.</div>
    </div>
    <div style={{ position:"absolute",bottom:28,left:32 }}>
      <div style={{ fontSize:11,color:"#1e293b",fontFamily:"monospace" }}>feyza.app</div>
    </div>
    <div style={{ position:"absolute",bottom:28,right:32 }}>
      <div style={{ background:"#4ade80",color:"#000",fontSize:11,fontWeight:900,fontFamily:"monospace",padding:"11px 20px",letterSpacing:"0.08em",whiteSpace:"nowrap" }}>UNLOCK LENDER →</div>
    </div>
  </div>
);

// CS11 "No cap: your money is not that girl"
const F24 = () => (
  <div data-capture-area="true" style={{ width:500,height:500,position:"relative",overflow:"hidden",background:"#fefce8",fontFamily:"'Arial Black',sans-serif",boxSizing:"border-box" }}>
    <div style={{ position:"absolute",top:0,left:0,right:0,height:5,background:"#000" }} />
    <div style={{ position:"absolute",bottom:0,left:0,right:0,height:90,background:"#000" }} />
    <div style={{ position:"absolute",top:28,left:32,right:32,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
      <Logo />
      <div style={{ background:"#000",color:"#facc15",fontSize:10,padding:"6px 14px",fontFamily:"monospace",fontWeight:900,letterSpacing:"0.1em",whiteSpace:"nowrap" }}>FOR LENDERS 💛</div>
    </div>
    <div style={{ position:"absolute",top:105,left:32,right:32 }}>
      <div style={{ fontSize:12,color:"#78716c",fontFamily:"monospace",marginBottom:10 }}>no cap bestie,</div>
      <div style={{ fontSize:46,fontWeight:900,color:"#000",lineHeight:1.0,letterSpacing:"-0.03em",marginBottom:14 }}>
        your savings<br/>account is<br/><span style={{ background:"#facc15",padding:"0 6px" }}>not that girl.</span> 😭
      </div>
      <div style={{ fontSize:12,color:"#57534e",fontFamily:"monospace",lineHeight:1.8 }}>
        0.1% APY is not the bag.<br/>
        It's literally a sad coin purse. 💀<br/>
        Feyza lenders? Actually eating. 🍽️
      </div>
    </div>
    <div style={{ position:"absolute",bottom:52,left:32 }}>
      <div style={{ fontSize:11,color:"#9ca3af",fontFamily:"monospace" }}>become that girl financially → feyza.app</div>
    </div>
    <div style={{ position:"absolute",bottom:22,right:32 }}>
      <div style={{ background:"#facc15",color:"#000",fontSize:11,fontWeight:900,fontFamily:"monospace",padding:"10px 20px",letterSpacing:"0.08em",whiteSpace:"nowrap" }}>BE THAT GIRL →</div>
    </div>
  </div>
);

// CS12 "It's giving... passive income"
const F25 = () => (
  <div data-capture-area="true" style={{ width:500,height:500,position:"relative",overflow:"hidden",background:"#1e1b4b",fontFamily:"'Arial Black',sans-serif",boxSizing:"border-box" }}>
    <div style={{ position:"absolute",top:0,left:0,right:0,height:4,background:"linear-gradient(90deg,#818cf8,#c084fc,#f472b6)" }} />
    <div style={{ position:"absolute",top:-60,right:-60,width:260,height:260,background:"radial-gradient(circle,rgba(129,140,248,0.25) 0%,transparent 70%)",borderRadius:"50%" }} />
    <div style={{ position:"absolute",bottom:-40,left:-40,width:180,height:180,background:"radial-gradient(circle,rgba(244,114,182,0.2) 0%,transparent 70%)",borderRadius:"50%" }} />
    <div style={{ position:"absolute",top:28,left:32,right:32,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
      <Logo />
      <div style={{ border:"1px solid #818cf8",color:"#818cf8",fontSize:10,padding:"6px 14px",fontFamily:"monospace",fontWeight:900,letterSpacing:"0.1em",whiteSpace:"nowrap" }}>FOR LENDERS ✨</div>
    </div>
    <div style={{ position:"absolute",top:105,left:32,right:32 }}>
      <div style={{ fontSize:12,color:"#4338ca",fontFamily:"monospace",marginBottom:12,letterSpacing:"0.06em" }}>vibe check just came back positive:</div>
      <div style={{ fontSize:48,fontWeight:900,color:"#fff",lineHeight:0.97,letterSpacing:"-0.03em",marginBottom:16 }}>
        it's giving...<br/><span style={{ color:"#c084fc",textShadow:"0 0 30px rgba(192,132,252,0.5)" }}>passive</span><br/>income. ✨
      </div>
      <div style={{ display:"flex",flexDirection:"column",gap:7 }}>
        {[
          "💸 Lend money to real verified people",
          "📈 They pay you back with interest",
          "😌 You do literally nothing else",
        ].map(t=>(
          <div key={t} style={{ background:"rgba(129,140,248,0.08)",border:"1px solid rgba(129,140,248,0.15)",borderRadius:8,padding:"9px 12px",fontSize:11,color:"#a5b4fc",fontFamily:"monospace" }}>{t}</div>
        ))}
      </div>
    </div>
    <div style={{ position:"absolute",bottom:28,left:32 }}>
      <div style={{ fontSize:11,color:"#312e81",fontFamily:"monospace" }}>feyza.app</div>
    </div>
    <div style={{ position:"absolute",bottom:28,right:32 }}>
      <div style={{ background:"linear-gradient(135deg,#818cf8,#c084fc)",color:"#fff",fontSize:11,fontWeight:900,fontFamily:"monospace",padding:"11px 20px",letterSpacing:"0.08em",borderRadius:4,whiteSpace:"nowrap" }}>GET THIS VIBE →</div>
    </div>
  </div>
);

// ─── REGULAR · BORROWER MEME SERIES ──────────────────────────────────────────

// B-Meme 1 "Understood the assignment"
const F26 = () => (
  <div data-capture-area="true" style={{ width:500,height:500,position:"relative",overflow:"hidden",background:"#000",fontFamily:"'Arial Black',sans-serif",flexShrink:0,boxSizing:"border-box" }}>
    <div style={{ position:"absolute",inset:0,backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 39px,#0d0d0d 39px,#0d0d0d 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,#0d0d0d 39px,#0d0d0d 40px)" }} />
    <div style={{ position:"absolute",top:0,left:0,right:0,height:4,background:"#22c55e" }} />
    <div style={{ position:"relative",padding:"28px 32px",height:"100%",boxSizing:"border-box",display:"flex",flexDirection:"column",justifyContent:"space-between" }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <Logo />
        <span style={{ border:"1px solid #22c55e",color:"#22c55e",fontSize:9,padding:"3px 10px",fontFamily:"monospace",letterSpacing:"0.1em",whiteSpace:"nowrap" }}>FOR BORROWERS 📋</span>
      </div>
      <div>
        <div style={{ fontSize:13,color:"#374151",fontFamily:"monospace",marginBottom:12 }}>assignment: get funded without the bs</div>
        <div style={{ fontSize:56,fontWeight:900,color:"#fff",lineHeight:0.95,letterSpacing:"-0.03em",marginBottom:18 }}>
          understood<br/>the<br/><span style={{ color:"#22c55e",textShadow:"0 0 30px rgba(34,197,94,0.4)" }}>assignment.</span> ✅
        </div>
        <div style={{ background:"rgba(34,197,94,0.06)",border:"1px solid rgba(34,197,94,0.15)",borderRadius:10,padding:"12px 16px" }}>
          <div style={{ fontSize:11,color:"#166534",fontFamily:"monospace",lineHeight:1.85 }}>
            ✓ No credit check · ✓ Real lenders<br/>
            ✓ Zero bank drama · ✓ Actually approved
          </div>
        </div>
      </div>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <div style={{ fontSize:11,color:"#1a1a1a",fontFamily:"monospace" }}>feyza.app</div>
        <div style={{ background:"#22c55e",color:"#000",fontSize:11,fontWeight:900,fontFamily:"monospace",padding:"11px 20px",letterSpacing:"0.08em",whiteSpace:"nowrap" }}>APPLY FREE →</div>
      </div>
    </div>
  </div>
);

// B-Meme 2 "Bank fumbled. Say less."
const F27 = () => (
  <div data-capture-area="true" style={{ width:500,height:500,position:"relative",overflow:"hidden",background:"#0c0a09",fontFamily:"'Arial Black',sans-serif",flexShrink:0,boxSizing:"border-box" }}>
    <div style={{ position:"absolute",top:-40,left:-40,width:220,height:220,background:"radial-gradient(circle,rgba(239,68,68,0.15) 0%,transparent 70%)",borderRadius:"50%" }} />
    <div style={{ position:"absolute",bottom:-60,right:-60,width:240,height:240,background:"radial-gradient(circle,rgba(34,197,94,0.12) 0%,transparent 70%)",borderRadius:"50%" }} />
    <div style={{ position:"relative",padding:"28px 32px",height:"100%",boxSizing:"border-box",display:"flex",flexDirection:"column",justifyContent:"space-between" }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <Logo />
        <span style={{ background:"#ef4444",color:"#fff",fontSize:9,padding:"3px 10px",fontFamily:"monospace",letterSpacing:"0.1em",whiteSpace:"nowrap" }}>FOR BORROWERS 🫡</span>
      </div>
      <div>
        <div style={{ fontSize:12,color:"#57534e",fontFamily:"monospace",marginBottom:12,letterSpacing:"0.06em" }}>the play-by-play:</div>
        <div style={{ display:"flex",flexDirection:"column",gap:10,marginBottom:16 }}>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <div style={{ fontSize:20,flexShrink:0 }}>🏦</div>
            <div style={{ background:"#111",border:"1px solid #1a1a1a",borderRadius:"12px 12px 12px 4px",padding:"8px 14px",fontSize:12,color:"#9ca3af",fontFamily:"monospace" }}>denied. next. 🙂</div>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:10,justifyContent:"flex-end" }}>
            <div style={{ background:"#1a0505",border:"1px solid #2a0a0a",borderRadius:"12px 12px 4px 12px",padding:"8px 14px",fontSize:12,color:"#ef4444",fontFamily:"monospace" }}>bank fumbled. hard. 💀</div>
            <div style={{ fontSize:20,flexShrink:0 }}>😭</div>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <div style={{ fontSize:20,flexShrink:0 }}>💚</div>
            <div style={{ background:"#050f05",border:"1px solid #0a2a0a",borderRadius:"12px 12px 12px 4px",padding:"8px 14px",fontSize:12,color:"#22c55e",fontFamily:"monospace" }}>Feyza: say less. you're approved. 🤌</div>
          </div>
        </div>
        <div style={{ fontSize:44,fontWeight:900,color:"#fff",lineHeight:1.05,letterSpacing:"-0.025em" }}>
          Say less.<br/><span style={{ color:"#22c55e" }}>Get funded. 🤌</span>
        </div>
      </div>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <div style={{ fontSize:11,color:"#292524",fontFamily:"monospace" }}>feyza.app</div>
        <div style={{ background:"#22c55e",color:"#000",fontSize:11,fontWeight:900,fontFamily:"monospace",padding:"11px 20px",letterSpacing:"0.08em",whiteSpace:"nowrap" }}>SAY LESS →</div>
      </div>
    </div>
  </div>
);

// ─── REGULAR · LENDER SERIES ─────────────────────────────────────────────────

// L1 "Imagine getting paid to help people"
const F28 = () => (
  <div data-capture-area="true" style={{ width:500,height:500,position:"relative",overflow:"hidden",background:"#0f172a",fontFamily:"'Arial Black',sans-serif",flexShrink:0,boxSizing:"border-box" }}>
    <div style={{ position:"absolute",top:-40,right:-40,width:220,height:220,background:"radial-gradient(circle,rgba(250,204,21,0.2) 0%,transparent 70%)",borderRadius:"50%" }} />
    <div style={{ position:"absolute",bottom:-40,left:-40,width:180,height:180,background:"radial-gradient(circle,rgba(34,197,94,0.15) 0%,transparent 70%)",borderRadius:"50%" }} />
    <div style={{ position:"relative",padding:"28px 32px",height:"100%",boxSizing:"border-box",display:"flex",flexDirection:"column",justifyContent:"space-between" }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <Logo />
        <span style={{ border:"1px solid #facc15",color:"#facc15",fontSize:9,padding:"3px 10px",fontFamily:"monospace",letterSpacing:"0.1em",whiteSpace:"nowrap" }}>FOR LENDERS 💰</span>
      </div>
      <div>
        <div style={{ fontSize:13,color:"#475569",fontFamily:"monospace",marginBottom:14 }}>imagine this 🤯</div>
        <div style={{ fontSize:46,fontWeight:900,color:"#fff",lineHeight:1.05,letterSpacing:"-0.025em",marginBottom:16 }}>
          Getting paid<br/>to help<br/><span style={{ color:"#facc15",textShadow:"0 0 30px rgba(250,204,21,0.4)" }}>real people.</span>
        </div>
        <div style={{ fontSize:13,color:"#475569",fontFamily:"monospace",lineHeight:1.8,marginBottom:14 }}>
          That's literally what Feyza lenders do.<br/>
          Lend to verified borrowers. Earn interest.
        </div>
        <div style={{ display:"flex",gap:8 }}>
          {["💰 Earn returns","✅ Verified people","🤝 Real impact"].map(t=>(
            <div key={t} style={{ flex:1,background:"rgba(250,204,21,0.06)",border:"1px solid rgba(250,204,21,0.12)",borderRadius:8,padding:"8px 4px",fontSize:9,color:"#a16207",fontFamily:"monospace",textAlign:"center" }}>{t}</div>
          ))}
        </div>
      </div>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <div style={{ fontSize:11,color:"#1e293b",fontFamily:"monospace" }}>feyza.app</div>
        <div style={{ background:"#facc15",color:"#000",fontSize:11,fontWeight:900,fontFamily:"monospace",padding:"11px 20px",letterSpacing:"0.08em",whiteSpace:"nowrap" }}>START LENDING →</div>
      </div>
    </div>
  </div>
);

// L2 "Hot take: idle money is a character flaw"
const F29 = () => (
  <div data-capture-area="true" style={{ width:500,height:500,position:"relative",overflow:"hidden",background:"#fff",fontFamily:"'Arial Black',sans-serif",flexShrink:0,boxSizing:"border-box" }}>
    <div style={{ position:"absolute",top:0,left:0,right:0,height:4,background:"linear-gradient(90deg,#22c55e,#4ade80)" }} />
    <div style={{ position:"absolute",inset:0,backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 39px,#f9fafb 39px,#f9fafb 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,#f9fafb 39px,#f9fafb 40px)" }} />
    <div style={{ position:"relative",padding:"28px 32px",height:"100%",boxSizing:"border-box",display:"flex",flexDirection:"column",justifyContent:"space-between" }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <Logo />
        <span style={{ background:"#22c55e",color:"#000",fontSize:9,padding:"3px 10px",fontFamily:"monospace",letterSpacing:"0.1em",whiteSpace:"nowrap" }}>FOR LENDERS 🔥</span>
      </div>
      <div>
        <div style={{ display:"inline-block",background:"#ef4444",color:"#fff",fontSize:10,padding:"4px 12px",fontFamily:"monospace",fontWeight:900,letterSpacing:"0.1em",marginBottom:14,transform:"rotate(-1deg)" }}>🔥 HOT TAKE</div>
        <div style={{ fontSize:42,fontWeight:900,color:"#000",lineHeight:1.05,letterSpacing:"-0.025em",marginBottom:14 }}>
          Idle money<br/>is a<br/><span style={{ background:"#22c55e",padding:"2px 6px" }}>character flaw.</span>
        </div>
        <div style={{ fontSize:12,color:"#6b7280",fontFamily:"monospace",lineHeight:1.8,marginBottom:14 }}>
          Not literally. But also kind of literally.<br/>
          Become a Feyza lender. Fix your arc. 💅
        </div>
        <div style={{ display:"flex",gap:8 }}>
          {["0.1% APY 👎","Feyza lending 💚","Math hits 📈"].map(t=>(
            <div key={t} style={{ flex:1,textAlign:"center",background:"#f9fafb",border:"1.5px solid #e5e7eb",borderRadius:8,padding:"8px 4px",fontSize:9,color:"#374151",fontFamily:"monospace" }}>{t}</div>
          ))}
        </div>
      </div>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <div style={{ fontSize:11,color:"#9ca3af",fontFamily:"monospace" }}>feyza.app</div>
        <div style={{ background:"#000",color:"#fff",fontSize:11,fontWeight:900,fontFamily:"monospace",padding:"11px 20px",letterSpacing:"0.08em",whiteSpace:"nowrap" }}>FIX YOUR ARC →</div>
      </div>
    </div>
  </div>
);

// L3 "The math is mathing"
const F30 = () => (
  <div data-capture-area="true" style={{ width:500,height:500,position:"relative",overflow:"hidden",background:"#022c22",fontFamily:"'Arial Black',sans-serif",flexShrink:0,boxSizing:"border-box" }}>
    <div style={{ position:"absolute",inset:0,backgroundImage:"radial-gradient(circle,#0f3d2e 1.5px,transparent 1.5px)",backgroundSize:"22px 22px",opacity:0.7 }} />
    <div style={{ position:"absolute",top:0,left:0,right:0,height:4,background:"#22c55e" }} />
    <div style={{ position:"relative",padding:"28px 32px",height:"100%",boxSizing:"border-box",display:"flex",flexDirection:"column",justifyContent:"space-between" }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <Logo />
        <span style={{ background:"#22c55e",color:"#000",fontSize:9,padding:"3px 10px",fontFamily:"monospace",letterSpacing:"0.1em",whiteSpace:"nowrap" }}>FOR LENDERS 📈</span>
      </div>
      <div>
        <div style={{ fontSize:12,color:"#166534",fontFamily:"monospace",marginBottom:12,letterSpacing:"0.1em" }}>the math is mathing:</div>
        <div style={{ background:"rgba(0,0,0,0.5)",border:"1px solid #166534",borderRadius:12,padding:"14px 16px",marginBottom:16,fontFamily:"monospace" }}>
          {[
            { label:"you lend", val:"$500", color:"#fff" },
            { label:"they pay back", val:"$550", color:"#22c55e" },
            { label:"you earned", val:"+$50 🎉", color:"#facc15" },
          ].map(({label,val,color},i)=>(
            <div key={label}>
              {i>0 && <div style={{ height:1,background:"#166534",margin:"8px 0" }} />}
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                <div style={{ fontSize:12,color:"#4ade80" }}>{label}</div>
                <div style={{ fontSize:20,fontWeight:900,color }}>{val}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontSize:40,fontWeight:900,color:"#fff",lineHeight:1.05,letterSpacing:"-0.025em",marginBottom:10 }}>
          Your money works<br/>while <span style={{ color:"#22c55e" }}>you don't.</span> 💸
        </div>
        <div style={{ fontSize:11,color:"#166534",fontFamily:"monospace",lineHeight:1.7 }}>
          Become a Feyza lender. Help real people. Get paid back.
        </div>
      </div>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <div style={{ fontSize:11,color:"#052e16",fontFamily:"monospace" }}>feyza.app</div>
        <div style={{ background:"#22c55e",color:"#000",fontSize:11,fontWeight:900,fontFamily:"monospace",padding:"11px 20px",letterSpacing:"0.08em",whiteSpace:"nowrap" }}>LEND NOW →</div>
      </div>
    </div>
  </div>
);


const CALENDAR = [
  // ─── MARCH · COMING SOON ─────────────────────────────────────────────────
  {
    week:1, month:"march", day:"Mon", date:"Mar 3", type:"cs-borrow",
    label:"Your Bank Is Nervous Rn", sub:"CS · Newspaper energy · Borrowers", Component:F14,
    caption:"Breaking news: your bank is nervous. 🗞️😅\n\nFeyza is a peer-to-peer lending app where real people lend to real people. No banks. No algorithms. No drama.\n\nWe're almost here and the banks already know it.\n\nGet notified when we launch → feyza.app",
    hashtags:"#Feyza #ComingSoon #BankIsScared #PeerLending #FinTech #NoBanks #BankingRevolution #AlternativeFinance #WaitlistOpen #FeyzaApp",
  },
  {
    week:1, month:"march", day:"Wed", date:"Mar 5", type:"cs-borrow",
    label:"What Banks Don't Want You To Know", sub:"CS · Dark secret energy · Borrowers", Component:F15,
    caption:"Top secret 🤫 (don't tell your bank)\n\nYou can borrow from real people. Without them.\n\nFeyza connects borrowers directly with verified lenders peer to peer, no middleman, no nonsense.\n\nLaunching soon. Join the waitlist at feyza.app 👇",
    hashtags:"#Feyza #ComingSoon #PeerToPeer #NoBanks #TopSecret #FinancialFreedom #BorrowDirect #WaitlistOpen #FeyzaApp #FinTech",
  },
  {
    week:1, month:"march", day:"Fri", date:"Mar 7", type:"cs-borrow",
    label:"The App Your Loan Officer Fears", sub:"CS · Yellow chaos energy · Borrowers", Component:F16,
    caption:"👻 scary for banks. great for you.\n\nWe're the app your loan officer had nightmares about.\n\nPeer-to-peer loans. Real people. Zero bank fees. No credit gatekeeping.\n\nFeyza is almost here. Get notified → feyza.app",
    hashtags:"#Feyza #ComingSoon #LoanOfficerNightmares #BankDisruptor #PeerLending #ZeroFees #NoCreditCheck #AlternativeLending #FeyzaApp #FinTok",
  },
  {
    week:2, month:"march", day:"Mon", date:"Mar 10", type:"cs-borrow",
    label:"Almost Ready. Are You?", sub:"CS · Dark checklist · Borrowers", Component:F17,
    caption:"Status update from Feyza HQ ✅\n\n✓ Bank alternatives built\n✓ Real lenders verified\n✓ Credit checks removed\n✓ Hidden fees eliminated\n⏳ Launching to the world...\n\nAlmost ready. Are you?\n\nGet early access → feyza.app",
    hashtags:"#Feyza #ComingSoon #StatusUpdate #EarlyAccess #PeerLending #NoBanks #FinTech #LaunchingSoon #WaitlistOpen #FeyzaApp",
  },
  {
    week:2, month:"march", day:"Wed", date:"Mar 12", type:"cs-borrow",
    label:"Who Is Feyza?", sub:"CS · Green explainer · Borrowers", Component:F18,
    caption:"So… who is Feyza? 🌱\n\nFeyza is a lending app built for the people banks forgot.\n\n🤝 Real people lending to real people\n🚫 No credit score required\n💸 Zero hidden fees, ever\n⚡ Fast decisions, not weeks\n\nWe're almost here. Join the waitlist at feyza.app 👇",
    hashtags:"#Feyza #WhoIsFeyza #ComingSoon #PeerLending #NoCreditScore #ZeroFees #FinancialInclusion #BorrowBetter #WaitlistOpen #FeyzaApp",
  },
  {
    week:2, month:"march", day:"Fri", date:"Mar 14", type:"cs-borrow",
    label:"Main Character Waitlist Energy", sub:"CS · Purple FOMO · Borrowers", Component:F19,
    caption:"No pressure but… the waitlist is giving main character energy. ✨\n\nWhat you're signing up for:\n✓ Early access to Feyza\n✓ Borrow from real people\n✓ No credit score drama\n✓ The satisfaction of being first\n\nI'm in → feyza.app",
    hashtags:"#Feyza #ComingSoon #MainCharacter #WaitlistVibes #EarlyAccess #FOMO #PeerLending #NoCreditCheck #FeyzaApp #FinTok",
  },
  {
    week:3, month:"march", day:"Mon", date:"Mar 17", type:"cs-lend",
    label:"POV: You're The Bank Now", sub:"CS · Gold dark · Lenders", Component:F20,
    caption:"POV: you're the bank now. 🏦\n\nOn Feyza, YOU decide who gets funded. Lend to verified borrowers, set your own terms, earn real interest.\n\nYour money. Your rules. No bank degree required.\n\nJoin the lender waitlist → feyza.app",
    hashtags:"#Feyza #ComingSoon #BeTheBank #FeyzaLender #P2PLending #EarnInterest #MoneyMoves #FinancialFreedom #WaitlistOpen #FinTech",
  },
  {
    week:3, month:"march", day:"Wed", date:"Mar 19", type:"cs-lend",
    label:"Your Money Is Benched", sub:"CS · Dark green coach energy · Lenders", Component:F21,
    caption:"Your savings account coach just called. 🪑\n\n\"0.1% APY? You're benched. You are NOT playing right now.\"\n\nGet your money off the sidelines. Become a Feyza lender.\n\nGet in the game → feyza.app",
    hashtags:"#Feyza #ComingSoon #MoneyBenched #FeyzaLender #P2PLending #SavingsAccount #EarnInterest #GetInTheGame #WaitlistOpen #FinTok",
  },
  {
    week:3, month:"march", day:"Fri", date:"Mar 21", type:"cs-lend",
    label:"Slay. Lend. Collect. Repeat.", sub:"CS · Pink gradient · Lenders", Component:F22,
    caption:"Your financial glow-up era is calling. 💅\n\nSlay. Lend. Collect. Repeat.\n\n✓ Lend to verified borrowers\n✓ Get paid back with interest\n✓ Become that girl financially 💗\n\nStart slaying → feyza.app",
    hashtags:"#Feyza #ComingSoon #FinancialGlowUp #Slay #FeyzaLender #P2PLending #ThatGirl #EarnInterest #WaitlistOpen #FinTok",
  },
  {
    week:4, month:"march", day:"Mon", date:"Mar 24", type:"cs-lend",
    label:"NPC Behavior Detected", sub:"CS · Dark gaming aesthetic · Lenders", Component:F23,
    caption:"⚠️ NPC behavior detected in your savings account.\n\n\"I have 0.1% APY. I do nothing. This is fine.\" 🤖\n\nMain character arc: become a Feyza lender.\n\nUnlock lender mode → feyza.app",
    hashtags:"#Feyza #ComingSoon #NPCBehavior #MainCharacter #FeyzaLender #P2PLending #EarnInterest #MoneyMoves #WaitlistOpen #FinTok",
  },
  {
    week:4, month:"march", day:"Wed", date:"Mar 26", type:"cs-lend",
    label:"Your Savings Is Not That Girl", sub:"CS · Yellow & black · Lenders", Component:F24,
    caption:"No cap bestie, your savings account is NOT that girl. 😭\n\n0.1% APY is not the bag. It's literally a sad coin purse. 💀\n\nFeyza lenders? Actually eating. 🍽️\n\nBecome that girl financially → feyza.app",
    hashtags:"#Feyza #ComingSoon #NoCap #ThatGirl #FeyzaLender #P2PLending #SavingsAccount #EarnInterest #WaitlistOpen #FinTok",
  },
  {
    week:4, month:"march", day:"Fri", date:"Mar 28", type:"cs-lend",
    label:"It's Giving Passive Income", sub:"CS · Indigo gradient · Lenders", Component:F25,
    caption:"Vibe check just came back positive ✨\n\nIt's giving... passive income.\n\n💸 Lend to real verified people\n📈 They pay you back with interest\n😌 You do literally nothing else\n\nGet this vibe → feyza.app",
    hashtags:"#Feyza #ComingSoon #PassiveIncome #ItsGiving #FeyzaLender #P2PLending #EarnInterest #VibeCheck #WaitlistOpen #FinTok",
  },
  // ─── APRIL · BORROWERS & LENDERS ─────────────────────────────────────────
  {
    week:5, month:"april", day:"Mon", date:"Apr 1", type:"borrow",
    label:"Your Bank Said No", sub:"Meme energy · Yellow punch · Borrowers", Component:F1,
    caption:"Your bank said no. That's cool we said yes. 😎\n\nAt Feyza, you borrow from real people who actually want to help. No credit score gatekeeping. No hidden fees. No drama.\n\nReady to stop being rejected by an algorithm? Apply today at feyza.app 👇",
    hashtags:"#Feyza #PersonalLoans #BankSaidNo #AlternativeLending #PeerLending #NoCreditCheck #FinancialFreedom #BorrowSmart #MoneyTok #FinTok",
  },
  {
    week:5, month:"april", day:"Wed", date:"Apr 3", type:"lend",
    label:"Getting Paid To Help People", sub:"Gold dark · Lenders", Component:F28,
    caption:"Imagine getting paid to help real people 🤯\n\nThat's literally what Feyza lenders do.\n\n💰 Earn real returns\n✅ Lend to verified borrowers\n🤝 Make actual impact\n\nStart lending at feyza.app",
    hashtags:"#Feyza #FeyzaLender #P2PLending #EarnInterest #HelpPeople #MoneyMoves #PassiveIncome #VerifiedBorrowers #FinancialFreedom #FinTok",
  },
  {
    week:5, month:"april", day:"Fri", date:"Apr 5", type:"borrow",
    label:"POV: You Got Approved", sub:"Dark + hopeful · Indigo glow · Borrowers", Component:F2,
    caption:"POV: you applied for a loan and actually got approved. 💚\n\nNo long wait. No judgement. Just a real lender on Feyza who looked at your application and said yes.\n\nThat feeling? You deserve it. Find your lender at feyza.app",
    hashtags:"#Feyza #GotApproved #LoanApproved #POV #PeerToPeerLending #RealPeople #FinancialWin #BorrowBetter #MoneyMoves #FinTech",
  },
  {
    week:6, month:"april", day:"Mon", date:"Apr 7", type:"borrow",
    label:"Understood The Assignment", sub:"Dark grid · Meme · Borrowers", Component:F26,
    caption:"Assignment: get funded without the BS. ✅\n\nFeyza understood the assignment.\n\n✓ No credit check · ✓ Real lenders\n✓ Zero bank drama · ✓ Actually approved\n\nApply free at feyza.app",
    hashtags:"#Feyza #UnderstoodTheAssignment #Borrower #NoCreditCheck #RealLenders #PeerLending #GetFunded #MoneyMoves #FinancialFreedom #FinTok",
  },
  {
    week:6, month:"april", day:"Wed", date:"Apr 9", type:"lend",
    label:"Hot Take: Idle Money Is A Character Flaw", sub:"Grid white · Hot take · Lenders", Component:F29,
    caption:"🔥 Hot take: idle money is a character flaw.\n\nNot literally. But also kind of literally.\n\n0.1% APY is not it. Become a Feyza lender. Fix your financial arc. 💅\n\nfeyza.app",
    hashtags:"#Feyza #HotTake #IdleMoney #FeyzaLender #P2PLending #EarnInterest #FinancialArc #MoneyMoves #FixYourArc #FinTok",
  },
  {
    week:6, month:"april", day:"Fri", date:"Apr 11", type:"borrow",
    label:"Stop Group-Chatting", sub:"Funny & relatable · Chat bubble · Borrowers", Component:F3,
    caption:"We've all sent that message 😅🙏\n\n\"heyy sooo random lol but does anyone have like $200?? asking for a friend lmaooo\"\n\nSeen by 14. Zero replies. 💀\n\nThere's a better way borrow from verified lenders on Feyza. feyza.app",
    hashtags:"#Feyza #Relatable #BorrowMoney #NoMoreGroupChat #PersonalLoan #FinancialHelp #RealLoans #MoneyProblems #FriendZoned #FinTok",
  },
  {
    week:7, month:"april", day:"Mon", date:"Apr 14", type:"borrow",
    label:"Bank Fumbled. Say Less.", sub:"Dark chat UI · Meme · Borrowers", Component:F27,
    caption:"The play-by-play 📋\n\n🏦 Bank: denied. next. 🙂\n😭 Bank fumbled. hard. 💀\n💚 Feyza: say less. you're approved. 🤌\n\nGet funded without the drama. feyza.app",
    hashtags:"#Feyza #BankFumbled #SayLess #GetFunded #NoCreditCheck #RealLenders #PeerLending #MoneyMoves #BorrowSmart #FinTok",
  },
  {
    week:7, month:"april", day:"Wed", date:"Apr 16", type:"lend",
    label:"The Math Is Mathing", sub:"Dark green · Numbers · Lenders", Component:F30,
    caption:"The math is mathing 📈\n\nYou lend: $500\nThey pay back: $550\nYou earned: +$50 🎉\n\nYour money works while you don't. Become a Feyza lender today.\n\nLend now → feyza.app",
    hashtags:"#Feyza #TheMathIsMathing #FeyzaLender #P2PLending #EarnInterest #PassiveIncome #MoneyWorks #FinancialFreedom #MoneyTok #FinTok",
  },
  {
    week:7, month:"april", day:"Fri", date:"Apr 18", type:"borrow",
    label:"Never Heard of Her", sub:"Gen Z neon · Credit score roast · Borrowers", Component:F4,
    caption:"Credit score? Never heard of her. 🙅‍♀️\n\nFeyza uses trust and community vouches not a three-digit number made up by a corporation to connect you with real lenders.\n\n❌ Credit check\n❌ Hidden fees\n❌ Bank drama\n✅ Feyza\n\nLet's go → feyza.app",
    hashtags:"#Feyza #CreditScore #NoCreditCheck #TrustBasedLending #GenZFinance #AlternativeCredit #FinancialInclusion #BorrowDifferently #MoneyTok #FinTech",
  },
  {
    week:8, month:"april", day:"Mon", date:"Apr 22", type:"borrow",
    label:"The Bank Left the Chat", sub:"Chat UI humor · Purple vibe · Borrowers", Component:F5,
    caption:"The bank: denied 🙂\nFeyza: you're approved 💚\n\nThe bank has officially left the chat.\n\nReal lenders. Real approvals. Zero judgement. Apply free at feyza.app 👋",
    hashtags:"#Feyza #BankLeftTheChat #LoanApproved #PeerLending #ByeBank #AlternativeFinance #RealLenders #ApplyNow #FinancialGlow #MoneyTok",
  },
  {
    week:8, month:"april", day:"Wed", date:"Apr 24", type:"borrow",
    label:"No Guilt Trip", sub:"Warm & funny · Orange accents · Borrowers", Component:F6,
    caption:"Tired of borrowing money and getting a side of guilt with it? 😮‍💨\n\nNo more \"so when are you paying me back?\" texts. No awkward family dinners. Just a loan.\n\nClear terms. Zero drama. feyza.app",
    hashtags:"#Feyza #NoGuiltTrip #BorrowWithDignity #FamilyMoney #PersonalLoan #VerifiedLenders #ClearTerms #FinancialPeace #MoneyAndMentalHealth #FinTok",
  },
  {
    week:8, month:"april", day:"Fri", date:"Apr 26", type:"borrow",
    label:"You vs The Bank", sub:"Side-by-side · Bold comparison · Borrowers", Component:F7,
    caption:"Traditional bank vs Feyza let's be real.\n\n🏦 Credit check, weeks of waiting, rejections, hidden fees, judge-y vibes.\n💚 Trust-based, fast approval, real humans, 0 fees, good vibes only.\n\nThe choice is obvious. feyza.app",
    hashtags:"#Feyza #BankVsFeyza #ChooseBetter #NoBanks #PeerLending #FastApproval #NoHiddenFees #RealHumans #FinancialChoice #BorrowSmart",
  },
  // ─── MAY · KEEP THE MOMENTUM ─────────────────────────────────────────────
  {
    week:9, month:"may", day:"Mon", date:"Apr 28", type:"borrow",
    label:"Rent's Due Friday", sub:"Urgent & real · Red energy · Borrowers", Component:F8,
    caption:"Rent's due Friday. It's Wednesday. We get it. 😮‍💨\n\nApply on Feyza today, get a decision fast, and breathe again.\n\n⚡ Fast decisions\n🔒 Secure & verified\n💚 Real lenders\n\nDon't wait feyza.app",
    hashtags:"#Feyza #RentIsDue #EmergencyLoan #FastCash #QuickApproval #RentMoney #FinancialStress #BorrowFast #MoneyUrgent #FinTok",
  },
  {
    week:9, month:"may", day:"Wed", date:"Apr 30", type:"borrow",
    label:"You're Not Your Score", sub:"Inspiring · Green dots · Borrowers", Component:F9,
    caption:"Real talk your credit score doesn't define you. 🌱\n\nFeyza looks at the whole picture. Your trust, your character, your community. Not just a number some algorithm assigned you.\n\nStart your application at feyza.app",
    hashtags:"#Feyza #YouAreMoreThanYourScore #CreditScore #FinancialInclusion #RealTalk #TrustBasedLending #BorrowWithDignity #CommunityFirst #MoneyMindset #FinTok",
  },
  {
    week:9, month:"may", day:"Fri", date:"May 2", type:"borrow",
    label:"We See You 👀", sub:"Fake tweet · Witty · Borrowers", Component:F10,
    caption:"\"me, refreshing my bank account for the 47th time today\" 👁️👁️\n\n47.3k likes and we all felt that.\n\nWe see you. Apply on Feyza and stop refreshing. feyza.app 💸",
    hashtags:"#Feyza #WeSeeYou #BrokeTwitter #Relatable #RefreshingMyAccount #PersonalLoan #GetApproved #MoneyMoves #FinanciallyFunny #FinTok",
  },
  {
    week:10, month:"may", day:"Mon", date:"May 5", type:"borrow",
    label:"Normal Banks vs Feyza", sub:"Checklist · Dark contrast · Borrowers", Component:F11,
    caption:"Let's compare real quick 👇\n\n✅ Credit checks Bank YES, Feyza NO\n✅ Hidden fees Bank YES, Feyza NO\n✅ 3-week wait Bank YES, Feyza NO\n✅ Verified lenders Bank NO, Feyza YES\n✅ Fast approval Bank NO, Feyza YES\n✅ 0 drama Bank NO, Feyza YES\n\nObvious choice → feyza.app",
    hashtags:"#Feyza #ObviousChoice #BankVsFeyza #NoBanks #FastApproval #ZeroDrama #PeerLending #FinancialComparison #SmartBorrowing #FinTech",
  },
  {
    week:10, month:"may", day:"Wed", date:"May 7", type:"borrow",
    label:"People Who Trust You", sub:"Heartfelt · Purple warm · Borrowers", Component:F12,
    caption:"What if you could borrow from people who actually trust you? 🤲💜\n\nReal verified lenders on Feyza who believe your story matters more than your score.\n\nLoans based on trust, not a three-digit number. feyza.app",
    hashtags:"#Feyza #PeopleTrustYou #HumanFirstFinance #TrustBasedLending #VerifiedLenders #BorrowWithHeart #CommunityLending #FinancialEmpathy #RealPeople #FinTok",
  },
  {
    week:10, month:"may", day:"Fri", date:"May 9", type:"borrow",
    label:"Plot Twist: You Got It", sub:"Celebratory · Black & gold · Borrowers", Component:F13,
    caption:"Plot twist: you actually got the money. 🎉💸\n\nNo rejection. No waiting. No drama. Just a lender on Feyza who read your application and said yes.\n\nBe the plot twist. Apply at feyza.app ✅",
    hashtags:"#Feyza #PlotTwist #LoanApproved #YouGotThis #FinancialWin #BorrowSmart #PeerLending #MoneyMoves #GlowUp #FinTok",
  },
]

const WEEK_COLORS = {
  1:"#f97316", 2:"#f97316", 3:"#f97316", 4:"#f97316",
  5:"#22c55e", 6:"#6366f1", 7:"#ef4444", 8:"#a855f7",
  9:"#facc15", 10:"#ec4899",
};

// ─── PNG Export Hook ──────────────────────────────────────────────────────────
function useExportPNG(label, captureRef) {
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState("");

  const exportPNG = useCallback(async () => {
    if (!captureRef.current) return;
    setExporting(true);
    setStatus("");
    try {
      // 1. Load html-to-image
      if (!window.htmlToImage) {
        await new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://unpkg.com/html-to-image@1.11.11/dist/html-to-image.js";
          s.onload = resolve; s.onerror = reject;
          document.head.appendChild(s);
        });
      }

      // 2. Pre-fetch logo as base64 to bypass CORS
      const logoResp = await fetch(LOGO);
      const logoBlob = await logoResp.blob();
      const base64Logo = await new Promise((res) => {
        const r = new FileReader();
        r.onloadend = () => res(r.result);
        r.readAsDataURL(logoBlob);
      });

      // 3. Swap logo src directly on the live DOM, capture, then restore
      const imgs = captureRef.current.querySelectorAll("img");
      const origSrcs = [];
      imgs.forEach(img => {
        origSrcs.push(img.src);
        if (img.src.includes("feyza.svg") || img.src.includes("feyza.png")) img.src = base64Logo;
      });

      const dataUrl = await window.htmlToImage.toPng(captureRef.current, {
        pixelRatio: 4,
        width: 500,
        height: 500,
        backgroundColor: null,
      });

      // 4. Restore original srcs
      imgs.forEach((img, i) => { img.src = origSrcs[i]; });

      // 5. Download
      const link = document.createElement("a");
      const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      link.download = `feyza-${slug}.png`;
      link.href = dataUrl;
      link.click();
      setStatus("success");
      setTimeout(() => setStatus(""), 3000);
    } catch (err) {
      console.error(err);
      setStatus("error");
      setTimeout(() => setStatus(""), 4000);
    } finally {
      setExporting(false);
    }
  }, [label, captureRef]);

  return { exportPNG, exporting, status };
}

// ─── Caption Panel Component ──────────────────────────────────────────────────
function CaptionPanel({ caption, hashtags, accentColor }) {
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedHashtags, setCopiedHashtags] = useState(false);

  const copy = (text, setter) => {
    navigator.clipboard.writeText(text).then(() => {
      setter(true);
      setTimeout(() => setter(false), 2000);
    });
  };

  return (
    <div style={{ width:500,maxWidth:"100%",marginBottom:28,display:"flex",flexDirection:"column",gap:12 }}>
      {/* Caption */}
      <div style={{ background:"#111",border:"1px solid #1a1a1a",borderRadius:10,overflow:"hidden" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px",borderBottom:"1px solid #1a1a1a" }}>
          <span style={{ fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:"#555" }}>📝 Caption</span>
          <button
            onClick={() => copy(caption, setCopiedCaption)}
            style={{ background:copiedCaption ? accentColor : "transparent",border:`1px solid ${copiedCaption ? accentColor : "#2a2a2a"}`,color:copiedCaption ? "#000" : "#555",padding:"3px 12px",fontSize:9,letterSpacing:"0.1em",cursor:"pointer",borderRadius:3,fontFamily:"monospace",transition:"all 0.2s" }}
          >
            {copiedCaption ? "✓ COPIED" : "COPY"}
          </button>
        </div>
        <div style={{ padding:"14px 16px",fontSize:12,color:"#888",lineHeight:1.9,whiteSpace:"pre-line",fontFamily:"monospace" }}>
          {caption}
        </div>
      </div>

      {/* Hashtags */}
      <div style={{ background:"#111",border:"1px solid #1a1a1a",borderRadius:10,overflow:"hidden" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px",borderBottom:"1px solid #1a1a1a" }}>
          <span style={{ fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:"#555" }}># Hashtags</span>
          <button
            onClick={() => copy(hashtags, setCopiedHashtags)}
            style={{ background:copiedHashtags ? accentColor : "transparent",border:`1px solid ${copiedHashtags ? accentColor : "#2a2a2a"}`,color:copiedHashtags ? "#000" : "#555",padding:"3px 12px",fontSize:9,letterSpacing:"0.1em",cursor:"pointer",borderRadius:3,fontFamily:"monospace",transition:"all 0.2s" }}
          >
            {copiedHashtags ? "✓ COPIED" : "COPY"}
          </button>
        </div>
        <div style={{ padding:"14px 16px",display:"flex",flexWrap:"wrap",gap:6 }}>
          {hashtags.split(" ").map(tag => (
            <span key={tag} style={{ background:"#1a1a1a",border:`1px solid #222`,color:accentColor,fontSize:10,padding:"3px 9px",borderRadius:20,fontFamily:"monospace",letterSpacing:"0.04em" }}>{tag}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FeyzaContentCalendar() {
  const [active, setActive] = useState(0);
  const [view, setView] = useState("preview");
  const { Component, label, sub, week, day, date, caption, hashtags } = CALENDAR[active];

  // Separate ref for the clean capture target (no wrapper styling)
  const captureRef = useRef(null);
  const { exportPNG, exporting, status } = useExportPNG(label, captureRef);

  const go = (dir) => setActive(a => (a + dir + CALENDAR.length) % CALENDAR.length);

  return (
    <div style={{ minHeight:"100vh",background:"#080808",color:"#fff",fontFamily:"monospace",boxSizing:"border-box" }}>
      {/* Header */}
      <div style={{ borderBottom:"1px solid #111",padding:"16px 24px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <img src={LOGO} style={{ width:50,height:30,objectFit:"contain" }} alt="Feyza" />
        <div style={{ display:"flex",gap:6 }}>
          {["preview","calendar"].map(v=>(
            <button key={v} onClick={()=>setView(v)} style={{
              background:view===v?"#22c55e":"transparent",
              border:"1px solid "+(view===v?"#22c55e":"#222"),
              color:view===v?"#000":"#555",
              padding:"5px 14px",fontSize:9,letterSpacing:"0.1em",
              textTransform:"uppercase",cursor:"pointer",borderRadius:3,
            }}>{v}</button>
          ))}
        </div>
      </div>

      {view === "preview" ? (
        <div style={{ display:"flex",flexDirection:"column",alignItems:"center",padding:"32px 20px 60px" }}>

          {/* Hidden clean capture target no border-radius, no box-shadow */}
          <div style={{ position:"fixed", top:"-9999px", left:"-9999px", width:500, height:500, overflow:"hidden" }}>
            <div ref={captureRef} style={{ width:500, height:500 }}>
              <Component />
            </div>
          </div>

          {/* ── Visible flyer (display only) ── */}
          <div
            style={{
              borderRadius:8,overflow:"hidden",
              boxShadow:"0 30px 80px rgba(0,0,0,0.8),0 0 0 1px rgba(255,255,255,0.05)",
              marginBottom:20,width:500,maxWidth:"100%",flexShrink:0,
            }}
          >
            <Component />
          </div>

          {/* Info strip */}
          <div style={{ display:"flex",alignItems:"center",gap:16,marginBottom:16,background:"#111",padding:"10px 20px",borderRadius:8,border:"1px solid #1a1a1a" }}>
            <div style={{ width:8,height:8,borderRadius:"50%",background:WEEK_COLORS[week],flexShrink:0 }} />
            <div>
              <div style={{ fontSize:12,fontWeight:700,color:"#fff",letterSpacing:"0.04em" }}>{label}</div>
              <div style={{ fontSize:9,color:"#444",letterSpacing:"0.1em",textTransform:"uppercase",marginTop:2 }}>
                Week {week} · {day} ({date}) · {sub}
              </div>
            </div>
            <div style={{ marginLeft:"auto",display:"flex",gap:8,fontSize:9,color:"#333" }}>
              <span>{active+1}</span><span>/</span><span>{CALENDAR.length}</span>
            </div>
          </div>

          {/* ── DOWNLOAD BUTTON ── */}
          <div style={{ marginBottom:20,display:"flex",flexDirection:"column",alignItems:"center",gap:8 }}>
            <button
              onClick={exportPNG}
              disabled={exporting}
              style={{
                background: exporting ? "#1a1a1a" : status==="success" ? "#166534" : "#22c55e",
                border:"none",
                color: exporting ? "#555" : status==="success" ? "#bbf7d0" : "#000",
                padding:"10px 28px",
                fontSize:11,
                fontWeight:900,
                fontFamily:"monospace",
                letterSpacing:"0.1em",
                cursor: exporting ? "not-allowed" : "pointer",
                borderRadius:4,
                transition:"all 0.2s",
                minWidth:200,
              }}
            >
              {exporting
                ? "⏳ CAPTURING..."
                : status==="success"
                  ? "✅ DOWNLOADED!"
                  : status==="error"
                    ? "❌ ERROR TRY AGAIN"
                    : "⬇ DOWNLOAD PNG (2000×2000)"}
            </button>
            <div style={{ fontSize:9,color:"#333",letterSpacing:"0.08em" }}>
              Saves as <code style={{ color:"#555" }}>feyza-{label.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"")}.png</code>
            </div>
          </div>

          {/* ── Caption & Hashtags Panel ── */}
          <CaptionPanel caption={caption} hashtags={hashtags} accentColor={WEEK_COLORS[week]} />

          {/* Arrow nav */}
          <div style={{ display:"flex",gap:10,marginBottom:28 }}>
            {["←","→"].map((arrow,i)=>(
              <button key={arrow} onClick={()=>go(i===0?-1:1)} style={{ background:"#111",border:"1px solid #1e1e1e",color:"#555",width:38,height:38,borderRadius:"50%",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s" }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor="#22c55e";e.currentTarget.style.color="#22c55e"}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="#1e1e1e";e.currentTarget.style.color="#555"}}>{arrow}</button>
            ))}
          </div>

          {/* Thumbnail strip */}
          <div style={{ display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center",maxWidth:520 }}>
            {CALENDAR.map((f,i)=>{
              const T = f.Component;
              const isActive = active===i;
              return (
                <button key={i} onClick={()=>setActive(i)} title={f.label} style={{
                  position:"relative",background:"none",border:"none",padding:0,
                  borderRadius:6,overflow:"hidden",cursor:"pointer",
                  outline:isActive?`2px solid ${WEEK_COLORS[f.week]}`:"2px solid #1a1a1a",
                  outlineOffset:"2px",
                  transform:isActive?"scale(1.15) translateY(-3px)":"scale(1)",
                  transition:"all 0.18s",
                  width:62,height:62,flexShrink:0,
                }}>
                  <div style={{ width:500,height:500,transform:"scale(0.124)",transformOrigin:"top left",pointerEvents:"none" }}>
                    <T />
                  </div>
                  <div style={{ position:"absolute",top:3,left:3,width:6,height:6,borderRadius:"50%",background:WEEK_COLORS[f.week] }} />
                </button>
              );
            })}
          </div>
          <div style={{ fontSize:9,color:"#222",letterSpacing:"0.1em",marginTop:16,textTransform:"uppercase" }}>
            Dots = week color · Click to preview
          </div>
        </div>
      ) : (
        // Calendar view
        <div style={{ padding:"28px 24px 60px",maxWidth:680,margin:"0 auto" }}>
          <div style={{ fontSize:10,color:"#333",letterSpacing:"0.15em",marginBottom:28,textTransform:"uppercase" }}>
            Posting schedule Mon / Wed / Fri
          </div>
          {[
            { key:"march", label:"March 2026", sub:"Coming Soon 🚀", months:["march"], accent:"#f97316" },
            { key:"april", label:"April 2026", sub:"Borrowers & Lenders 💚", months:["april"], accent:"#22c55e" },
            { key:"may",   label:"May 2026",   sub:"Keep the Momentum 🔥", months:["may"],   accent:"#facc15" },
          ].map(({key,label,sub,months,accent})=>{
            const posts = CALENDAR.filter(c=>months.includes(c.month));
            if(!posts.length) return null;
            return (
              <div key={key} style={{ marginBottom:36 }}>
                <div style={{ marginBottom:14,paddingBottom:12,borderBottom:`1px solid #111` }}>
                  <div style={{ fontSize:14,fontWeight:900,color:accent,letterSpacing:"0.03em" }}>{label}</div>
                  <div style={{ fontSize:9,color:"#333",letterSpacing:"0.14em",textTransform:"uppercase",marginTop:3 }}>{sub}</div>
                </div>
                <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                  {posts.map((p,i)=>{
                    const idx = CALENDAR.indexOf(p);
                    const isActive = active===idx;
                    const badgeColor =
                      p.type==="cs-lend"   ? "#f59e0b" :
                      p.type==="cs-borrow" ? "#fb923c" :
                      p.type==="lend"      ? "#22c55e" : "#6366f1";
                    const badgeLabel =
                      p.type==="cs-lend"   ? "CS · LEND 💰" :
                      p.type==="cs-borrow" ? "CS · BORROW 📋" :
                      p.type==="lend"      ? "LENDER 💰" : "BORROWER 📋";
                    return (
                      <div key={i} onClick={()=>{setActive(idx);setView("preview")}} style={{
                        display:"flex",alignItems:"center",gap:14,
                        background:isActive?"rgba(255,255,255,0.03)":"#0d0d0d",
                        border:`1px solid ${isActive?accent:"#151515"}`,
                        borderRadius:8,padding:"12px 16px",cursor:"pointer",transition:"all 0.15s",
                      }}>
                        <div style={{ width:44,height:44,borderRadius:5,overflow:"hidden",flexShrink:0 }}>
                          <div style={{ width:500,height:500,transform:"scale(0.088)",transformOrigin:"top left" }}>
                            <p.Component />
                          </div>
                        </div>
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ fontSize:12,fontWeight:700,color:isActive?accent:"#fff",letterSpacing:"0.03em",marginBottom:4 }}>{p.label}</div>
                          <div style={{ display:"flex",alignItems:"center",gap:6,flexWrap:"wrap" }}>
                            <span style={{ fontSize:9,color:"#444",letterSpacing:"0.06em",fontFamily:"monospace" }}>{p.day} · {p.date}</span>
                            <span style={{ fontSize:8,color:badgeColor,border:`1px solid ${badgeColor}22`,background:`${badgeColor}11`,borderRadius:3,padding:"2px 7px",letterSpacing:"0.08em",fontFamily:"monospace",whiteSpace:"nowrap" }}>{badgeLabel}</span>
                          </div>
                        </div>
                        <div style={{ fontSize:9,color:"#333",flexShrink:0 }}>{isActive?"← viewing":""}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
