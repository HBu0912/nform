import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, addDoc, onSnapshot,
  orderBy, query, serverTimestamp, doc, updateDoc,
  arrayUnion, arrayRemove, setDoc, getDoc
} from "firebase/firestore";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from "firebase/auth";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

const PAYPAL_CLIENT_ID = "AW-I2drjTIjWKk_XUJ_5JcMCU9C1oAENsS9eP1lN-_DzxquyRKurYA7h1LHO0aeUXtE2PerOUnXBlz0z";

const firebaseConfig = {
  apiKey: "AIzaSyBlk6Gs3uzk1lO0trtzCJUWGUQ_9kS5Zeg",
  authDomain: "nform-7a719.firebaseapp.com",
  projectId: "nform-7a719",
  storageBucket: "nform-7a719.firebasestorage.app",
  messagingSenderId: "464572678359",
  appId: "1:464572678359:web:84165b72b4962094113092",
  measurementId: "G-227EZT0PLS"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);
const provider = new GoogleAuthProvider();

const CATEGORIES = [
  { id: "all",         label: "All",              emoji: "🌐", color: "#e2e8f0" },
  { id: "politics",    label: "Politics",          emoji: "🏛️", color: "#fecaca" },
  { id: "finance",     label: "Finance",           emoji: "💰", color: "#bbf7d0" },
  { id: "stocks",      label: "Stock Market",      emoji: "📈", color: "#a7f3d0" },
  { id: "education",   label: "Education",         emoji: "🎓", color: "#bfdbfe" },
  { id: "worldnews",   label: "World News",        emoji: "🌍", color: "#fde68a" },
  { id: "health",      label: "Health & Science",  emoji: "🏥", color: "#fbcfe8" },
  { id: "law",         label: "Law & Justice",     emoji: "⚖️", color: "#ddd6fe" },
  { id: "environment", label: "Environment",       emoji: "🌱", color: "#d1fae5" },
  { id: "technology",  label: "Technology",        emoji: "💻", color: "#e0e7ff" },
  { id: "sports",      label: "Sports",            emoji: "🏆", color: "#fed7aa" },
  { id: "business",    label: "Business",          emoji: "🏢", color: "#e2e8f0" },
  { id: "culture",     label: "Culture & Society", emoji: "🎭", color: "#fce7f3" },
];

const BAD_WORDS = ["damn","hell","crap","ass","bastard","shit","fuck","bitch","piss","dick","cunt","cock"];
function containsProfanity(t) { return BAD_WORDS.some(w => new RegExp(`\\b${w}\\b`,"i").test(t)); }

function timeAgo(timestamp) {
  if (!timestamp) return "Just now";
  const now = new Date();
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

// ── Avatar ────────────────────────────────────────────────────────
function Avatar({ name, size = 44 }) {
  const initials = (name || "?").split(" ").map(p => p[0]).join("").slice(0,2).toUpperCase();
  return (
    <div style={{ width:size, height:size, borderRadius:"2px", background:"#1a1a1a", color:"#f8f7f4", display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.38, fontWeight:"900", flexShrink:0, fontStyle:"italic", letterSpacing:"-1px" }}>
      {initials}
    </div>
  );
}

// ── Sign-in Prompt ────────────────────────────────────────────────
function SignInPrompt({ message, onLogin, onClose }) {
  return (
    <div style={{ position:"fixed",inset:0,zIndex:400,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px" }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:"#f8f7f4",border:"2px solid #1a1a1a",borderRadius:"4px",width:"100%",maxWidth:"400px",padding:"32px",textAlign:"center",boxShadow:"6px 6px 0 #1a1a1a" }}>
        <div style={{ fontSize:"36px",marginBottom:"12px" }}>📰</div>
        <h2 style={{ margin:"0 0 8px",fontSize:"20px",fontWeight:"900",fontStyle:"italic" }}>Join Nform</h2>
        <p style={{ color:"#666",fontSize:"14px",margin:"0 0 24px",lineHeight:"1.6" }}>{message}</p>
        <button onClick={onLogin} style={{ width:"100%",background:"#1a1a1a",color:"#f8f7f4",border:"none",borderRadius:"2px",padding:"14px 24px",fontSize:"14px",fontWeight:"700",cursor:"pointer",fontFamily:"inherit",letterSpacing:"1px",display:"flex",alignItems:"center",justifyContent:"center",gap:"10px" }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Sign in with Google
        </button>
        <button onClick={onClose} style={{ marginTop:"12px",background:"none",border:"none",cursor:"pointer",fontSize:"13px",color:"#888",fontFamily:"inherit" }}>Maybe later</button>
      </div>
    </div>
  );
}

// ── Action Button ─────────────────────────────────────────────────
function ActionBtn({ onClick, active, activeColor, icon, activeIcon, count, label }) {
  return (
    <button onClick={onClick} title={label} style={{ background:"none",border:"none",cursor:"pointer",color:active?activeColor:"#888",fontSize:"13px",display:"flex",alignItems:"center",gap:"5px",fontFamily:"inherit",padding:"4px 8px",borderRadius:"4px",fontWeight:active?"700":"400" }}
      onMouseEnter={e=>e.currentTarget.style.background="#f0ede8"}
      onMouseLeave={e=>e.currentTarget.style.background="none"}>
      <span style={{ fontSize:"16px" }}>{active&&activeIcon?activeIcon:icon}</span>
      {count!==undefined&&<span>{count}</span>}
    </button>
  );
}

// ── Three-dot Post Menu ───────────────────────────────────────────
function PostMenu({ post, user, onOffer, onSetListing, onClose }) {
  const isOwner = post.currentOwnerId===user?.uid||(!post.currentOwnerId&&post.userId===user?.uid);
  return (
    <div style={{ position:"absolute",right:0,top:"24px",zIndex:50,background:"#f8f7f4",border:"2px solid #1a1a1a",borderRadius:"4px",minWidth:"180px",boxShadow:"4px 4px 0 #1a1a1a" }}
      onClick={e=>e.stopPropagation()}>
      {isOwner ? (
        <>
          <button onClick={()=>{ onSetListing(); onClose(); }} style={{ display:"block",width:"100%",padding:"12px 16px",background:"none",border:"none",cursor:"pointer",fontSize:"13px",fontFamily:"inherit",textAlign:"left",fontWeight:"600" }}>
            {post.forSale?"✏️ Edit Listing":"💲 List for Sale"}
          </button>
          {post.forSale&&(
            <button onClick={async()=>{ await updateDoc(doc(db,"posts",post.id),{forSale:false,listPrice:null}); onClose(); }}
              style={{ display:"block",width:"100%",padding:"12px 16px",background:"none",border:"none",borderTop:"1px solid #e0ddd8",cursor:"pointer",fontSize:"13px",fontFamily:"inherit",textAlign:"left",color:"#888" }}>
              Remove Listing
            </button>
          )}
        </>
      ):(
        <button onClick={()=>{ onOffer(); onClose(); }} style={{ display:"block",width:"100%",padding:"12px 16px",background:"none",border:"none",cursor:"pointer",fontSize:"13px",fontFamily:"inherit",textAlign:"left",fontWeight:"600" }}>
          💰 Make an Offer
        </button>
      )}
    </div>
  );
}

// ── Profile Page ──────────────────────────────────────────────────
function ProfilePage({ profileUserId, currentUser, posts, offers, onClose, onOpenProfile }) {
  const [profileData, setProfileData] = useState(null);
  const [activeTab, setActiveTab] = useState("posts");
  const isOwnProfile = currentUser?.uid === profileUserId;

  useEffect(() => {
    if (!profileUserId) return;
    getDoc(doc(db,"users",profileUserId)).then(snap => {
      if (snap.exists()) setProfileData(snap.data());
    });
  }, [profileUserId]);

  const displayName = profileData?.displayName || posts.find(p=>p.userId===profileUserId)?.username || "User";
  const handle = "@" + displayName.toLowerCase().replace(/\s/g,"");
  const bio = profileData?.bio || "";
  const privacy = profileData?.privacy || { likes:true, holdings:true };

  const userPosts = posts.filter(p=>p.userId===profileUserId).sort((a,b)=>{
    const aT = a.timestamp?.toDate?.()?.getTime()||0;
    const bT = b.timestamp?.toDate?.()?.getTime()||0;
    return bT-aT;
  });

  const userComments = [];
  posts.forEach(p=>{
    (p.comments||[]).forEach(c=>{
      if (c.userId===profileUserId) userComments.push({...c,postId:p.id,postContent:p.content,postHandle:p.handle});
    });
  });
  userComments.sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));

  const userHoldings = posts.filter(p=>p.currentOwnerId===profileUserId);
  const userLikes    = posts.filter(p=>p.likes?.includes(profileUserId));
  const userOffers   = offers.filter(o=>o.originalPosterId===profileUserId||o.currentOwnerId===profileUserId);

  const showHoldings = isOwnProfile || privacy.holdings;
  const showLikes    = isOwnProfile || privacy.likes;

  const TABS = [
    { id:"posts",    label:`Posts (${userPosts.length})` },
    { id:"comments", label:`Comments (${userComments.length})` },
    ...(showHoldings?[{ id:"holdings", label:`Holdings (${userHoldings.length})` }]:[]),
    ...(showLikes   ?[{ id:"likes",    label:`Likes (${userLikes.length})` }]:[]),
    ...(isOwnProfile?[{ id:"offers",   label:`Offers (${userOffers.length})` }]:[]),
  ];

  const getCat = id => CATEGORIES.find(c=>c.id===id)||CATEGORIES[1];

  function MiniPost({ p }) {
    const cat = getCat(p.category);
    return (
      <div style={{ padding:"16px 0",borderBottom:"1px solid #e0ddd8" }}>
        <div style={{ display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap",marginBottom:"6px" }}>
          <span style={{ color:"#888",fontSize:"12px" }}>{timeAgo(p.timestamp)}</span>
          <span style={{ background:cat.color,border:"1px solid rgba(0,0,0,0.15)",borderRadius:"2px",padding:"2px 8px",fontSize:"11px",fontWeight:"700",textTransform:"uppercase" }}>{cat.emoji} {cat.label}</span>
          {p.forSale&&<span style={{ background:"#d1fae5",color:"#065f46",border:"1px solid #6ee7b7",borderRadius:"2px",padding:"2px 8px",fontSize:"11px",fontWeight:"700" }}>💲 ${p.listPrice}</span>}
        </div>
        <p style={{ margin:0,fontSize:"15px",lineHeight:"1.65" }}>{p.content}</p>
        <div style={{ marginTop:"8px",fontSize:"12px",color:"#888" }}>❤️ {p.likes?.length||0} · 💬 {p.comments?.length||0}</div>
      </div>
    );
  }

  return (
    <div style={{ position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"20px",overflowY:"auto" }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:"#f8f7f4",border:"2px solid #1a1a1a",borderRadius:"4px",width:"100%",maxWidth:"640px",marginTop:"20px",boxShadow:"6px 6px 0 #1a1a1a",overflow:"hidden" }}>
        {/* Header */}
        <div style={{ padding:"28px",borderBottom:"2px solid #1a1a1a",background:"#fff" }}>
          <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:"16px" }}>
            <div style={{ display:"flex",alignItems:"center",gap:"16px" }}>
              <Avatar name={displayName} size={64}/>
              <div>
                <div style={{ fontWeight:"900",fontSize:"20px",marginBottom:"2px" }}>{displayName}</div>
                <div style={{ color:"#888",fontSize:"14px",marginBottom:"6px" }}>{handle}</div>
                {bio&&<div style={{ fontSize:"14px",lineHeight:"1.5",maxWidth:"360px",color:"#444" }}>{bio}</div>}
              </div>
            </div>
            <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",fontSize:"22px",color:"#888",padding:0 }}>×</button>
          </div>
          <div style={{ display:"flex",gap:"24px",fontSize:"14px" }}>
            <span><strong>{userPosts.length}</strong> <span style={{ color:"#888" }}>posts</span></span>
            {showHoldings&&<span><strong>{userHoldings.length}</strong> <span style={{ color:"#888" }}>holdings</span></span>}
            {showLikes&&<span><strong>{userLikes.length}</strong> <span style={{ color:"#888" }}>likes</span></span>}
          </div>
        </div>
        {/* Tabs */}
        <div style={{ display:"flex",borderBottom:"2px solid #1a1a1a",overflowX:"auto" }}>
          {TABS.map(tab=>(
            <button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={{ padding:"12px 20px",background:activeTab===tab.id?"#1a1a1a":"transparent",color:activeTab===tab.id?"#f8f7f4":"#1a1a1a",border:"none",borderRight:"1px solid #e0ddd8",cursor:"pointer",fontSize:"13px",fontWeight:activeTab===tab.id?"700":"400",whiteSpace:"nowrap",fontFamily:"inherit",flexShrink:0 }}>
              {tab.label}
            </button>
          ))}
        </div>
        {/* Content */}
        <div style={{ padding:"0 24px 24px",maxHeight:"60vh",overflowY:"auto" }}>
          {activeTab==="posts"&&(userPosts.length===0
            ?<p style={{ color:"#888",padding:"24px 0",textAlign:"center" }}>No posts yet.</p>
            :userPosts.map(p=><MiniPost key={p.id} p={p}/>)
          )}
          {activeTab==="comments"&&(userComments.length===0
            ?<p style={{ color:"#888",padding:"24px 0",textAlign:"center" }}>No comments yet.</p>
            :userComments.map((c,i)=>(
              <div key={i} style={{ padding:"14px 0",borderBottom:"1px solid #e0ddd8" }}>
                <div style={{ fontSize:"12px",color:"#888",marginBottom:"4px" }}>
                  Replying to <span onClick={()=>onOpenProfile(posts.find(p=>p.id===c.postId)?.userId)} style={{ cursor:"pointer",fontWeight:"700",color:"#1a1a1a" }}>{c.postHandle}</span> · {c.timestamp?timeAgo({toDate:()=>new Date(c.timestamp)}):"Just now"}
                </div>
                <div style={{ background:"#f0ede8",borderRadius:"2px",padding:"8px 12px",fontSize:"14px",lineHeight:"1.5",marginBottom:"6px",borderLeft:"3px solid #1a1a1a" }}>
                  "{c.postContent?.slice(0,80)}{c.postContent?.length>80?"...":""}"
                </div>
                <p style={{ margin:0,fontSize:"14px",lineHeight:"1.5" }}>{c.text}</p>
              </div>
            ))
          )}
          {activeTab==="holdings"&&showHoldings&&(userHoldings.length===0
            ?<p style={{ color:"#888",padding:"24px 0",textAlign:"center" }}>No holdings yet.</p>
            :userHoldings.map(p=>(
              <div key={p.id} style={{ borderBottom:"1px solid #e0ddd8" }}>
                <div style={{ fontSize:"12px",color:"#888",paddingTop:"16px",marginBottom:"-8px" }}>Originally by {p.handle}</div>
                <MiniPost p={p}/>
              </div>
            ))
          )}
          {activeTab==="likes"&&showLikes&&(userLikes.length===0
            ?<p style={{ color:"#888",padding:"24px 0",textAlign:"center" }}>No liked posts yet.</p>
            :userLikes.map(p=>(
              <div key={p.id} style={{ borderBottom:"1px solid #e0ddd8" }}>
                <div style={{ fontSize:"12px",paddingTop:"16px",marginBottom:"-8px",cursor:"pointer",fontWeight:"700",color:"#1a1a1a" }} onClick={()=>onOpenProfile(p.userId)}>{p.handle}</div>
                <MiniPost p={p}/>
              </div>
            ))
          )}
          {activeTab==="offers"&&isOwnProfile&&(userOffers.length===0
            ?<p style={{ color:"#888",padding:"24px 0",textAlign:"center" }}>No offer history yet.</p>
            :userOffers.map(o=>(
              <div key={o.id} style={{ padding:"14px 0",borderBottom:"1px solid #e0ddd8" }}>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"4px" }}>
                  <span style={{ fontSize:"13px",color:"#888" }}>
                    {o.buyerId===profileUserId?"You offered to":"Offer from"} <strong style={{ color:"#1a1a1a" }}>{o.buyerId===profileUserId?o.originalPosterHandle:o.buyerHandle}</strong>
                  </span>
                  <span style={{ fontSize:"11px",fontWeight:"700",padding:"2px 8px",borderRadius:"2px",
                    background:o.status==="completed"?"#d1fae5":o.status==="accepted"?"#bfdbfe":o.status==="declined"?"#fecaca":"#fde68a",
                    color:o.status==="completed"?"#065f46":o.status==="accepted"?"#1e40af":o.status==="declined"?"#991b1b":"#92400e" }}>
                    {o.status?.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize:"13px",marginBottom:"4px" }}>"{o.postContent?.slice(0,80)}{o.postContent?.length>80?"...":""}"</div>
                <div style={{ fontWeight:"900",fontSize:"16px" }}>${o.amount}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Edit Profile Modal ────────────────────────────────────────────
function EditProfileModal({ user, currentData, onClose, onSave }) {
  const [displayName,     setDisplayName]     = useState(currentData?.displayName||user?.displayName||"");
  const [bio,             setBio]             = useState(currentData?.bio||"");
  const [privacyLikes,    setPrivacyLikes]    = useState(currentData?.privacy?.likes??true);
  const [privacyHoldings, setPrivacyHoldings] = useState(currentData?.privacy?.holdings??true);
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState("");

  async function save() {
    setErr("");
    if (!displayName.trim()) { setErr("Display name cannot be empty."); return; }
    setSaving(true);
    try {
      await setDoc(doc(db,"users",user.uid), {
        displayName: displayName.trim(),
        bio: bio.trim(),
        privacy: { likes:privacyLikes, holdings:privacyHoldings },
        updatedAt: serverTimestamp(),
      }, { merge:true });
      onSave({ displayName:displayName.trim(), bio:bio.trim(), privacy:{ likes:privacyLikes, holdings:privacyHoldings } });
      onClose();
    } catch(e) { setErr("Failed to save. Try again."); }
    setSaving(false);
  }

  function Toggle({ value, onChange }) {
    return (
      <button onClick={()=>onChange(!value)} style={{ width:"44px",height:"24px",borderRadius:"12px",border:"2px solid #1a1a1a",background:value?"#1a1a1a":"#e0ddd8",cursor:"pointer",position:"relative",transition:"background 0.2s",flexShrink:0,padding:0 }}>
        <span style={{ position:"absolute",top:"2px",left:value?"20px":"2px",width:"16px",height:"16px",borderRadius:"50%",background:"#f8f7f4",transition:"left 0.2s",display:"block" }}/>
      </button>
    );
  }

  return (
    <div style={{ position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px" }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:"#f8f7f4",border:"2px solid #1a1a1a",borderRadius:"4px",width:"100%",maxWidth:"460px",padding:"28px",boxShadow:"6px 6px 0 #1a1a1a" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px" }}>
          <h2 style={{ margin:0,fontSize:"18px",fontWeight:"900",fontStyle:"italic" }}>Edit Profile</h2>
          <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",fontSize:"22px",color:"#888" }}>×</button>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:"16px",marginBottom:"20px" }}>
          <Avatar name={displayName||"?"} size={56}/>
          <div style={{ fontSize:"13px",color:"#888" }}>Your avatar is generated from your initials.</div>
        </div>
        <label style={{ fontSize:"11px",fontWeight:"700",letterSpacing:"2px",textTransform:"uppercase",color:"#666",display:"block",marginBottom:"6px" }}>Display Name</label>
        <input value={displayName} onChange={e=>setDisplayName(e.target.value)}
          style={{ width:"100%",padding:"10px 14px",border:"2px solid #1a1a1a",borderRadius:"2px",fontSize:"15px",fontFamily:"inherit",outline:"none",boxSizing:"border-box",marginBottom:"16px" }}/>
        <label style={{ fontSize:"11px",fontWeight:"700",letterSpacing:"2px",textTransform:"uppercase",color:"#666",display:"block",marginBottom:"6px" }}>Bio</label>
        <textarea value={bio} onChange={e=>setBio(e.target.value)} placeholder="Tell the world about yourself..." rows={3}
          style={{ width:"100%",padding:"10px 14px",border:"2px solid #1a1a1a",borderRadius:"2px",fontSize:"14px",fontFamily:"Georgia,serif",outline:"none",resize:"none",boxSizing:"border-box",marginBottom:"20px" }}/>
        <div style={{ borderTop:"1px solid #e0ddd8",paddingTop:"16px",marginBottom:"20px" }}>
          <div style={{ fontSize:"11px",fontWeight:"700",letterSpacing:"2px",textTransform:"uppercase",color:"#666",marginBottom:"12px" }}>Privacy Settings</div>
          {[
            { label:"Show Likes on my profile",    value:privacyLikes,    set:setPrivacyLikes },
            { label:"Show Holdings on my profile", value:privacyHoldings, set:setPrivacyHoldings },
          ].map(({ label,value,set })=>(
            <div key={label} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"12px" }}>
              <span style={{ fontSize:"14px" }}>{label}</span>
              <Toggle value={value} onChange={set}/>
            </div>
          ))}
        </div>
        {err&&<div style={{ color:"#991b1b",fontSize:"13px",marginBottom:"12px",fontWeight:"600" }}>{err}</div>}
        <div style={{ display:"flex",gap:"10px" }}>
          <button onClick={onClose} style={{ flex:1,padding:"10px",background:"none",border:"2px solid #1a1a1a",cursor:"pointer",fontSize:"13px",fontWeight:"700",fontFamily:"inherit" }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ flex:1,padding:"10px",background:"#1a1a1a",color:"#f8f7f4",border:"2px solid #1a1a1a",cursor:"pointer",fontSize:"13px",fontWeight:"700",fontFamily:"inherit",opacity:saving?0.6:1 }}>
            {saving?"Saving...":"Save Changes →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  MAIN APP
// ═══════════════════════════════════════════════════════════════════
export default function NformApp() {
  const [user,           setUser]           = useState(null);
  const [userProfile,    setUserProfile]    = useState(null);
  const [posts,          setPosts]          = useState([]);
  const [offers,         setOffers]         = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeFeed,     setActiveFeed]     = useState("home");
  const [search,         setSearch]         = useState("");
  const [postContent,    setPostContent]    = useState("");
  const [postCategory,   setPostCategory]   = useState("politics");
  const [error,          setError]          = useState("");
  const [success,        setSuccess]        = useState(false);
  const [showCompose,    setShowCompose]    = useState(false);
  const [expandedComments, setExpandedComments] = useState(new Set());
  const [commentInputs,  setCommentInputs]  = useState({});
  const [commentErrors,  setCommentErrors]  = useState({});
  const [showProfileMenu,setShowProfileMenu]= useState(false);
  const [showNavMenu,    setShowNavMenu]    = useState(false);
  const [sidebarOpen,    setSidebarOpen]    = useState(false);
  const [loading,        setLoading]        = useState(true);
  const [bookmarks,      setBookmarks]      = useState([]);
  const [signInPrompt,   setSignInPrompt]   = useState(null);
  const [copiedPostId,   setCopiedPostId]   = useState(null);
  const [openMenuPostId, setOpenMenuPostId] = useState(null);
  const [viewingProfileId,  setViewingProfileId]  = useState(null);
  const [showEditProfile,   setShowEditProfile]   = useState(false);
  const [offerModal,     setOfferModal]     = useState(null);
  const [offerAmount,    setOfferAmount]    = useState("");
  const [offerError,     setOfferError]     = useState("");
  const [showPayPal,     setShowPayPal]     = useState(false);
  const [listingModal,   setListingModal]   = useState(null);
  const [listPrice,      setListPrice]      = useState("");
  const [listError,      setListError]      = useState("");

  // ── Auth ────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      setUser(u);
      if (u) {
        const saved = localStorage.getItem(`nform_bookmarks_${u.uid}`);
        setBookmarks(saved ? JSON.parse(saved) : []);
        const snap = await getDoc(doc(db,"users",u.uid));
        setUserProfile(snap.exists() ? snap.data() : null);
      } else { setBookmarks([]); setUserProfile(null); }
    });
    return unsub;
  }, []);

  // ── Posts ───────────────────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db,"posts"), orderBy("timestamp","desc"));
    return onSnapshot(q, snap => { setPosts(snap.docs.map(d=>({id:d.id,...d.data()}))); setLoading(false); });
  }, []);

  // ── Offers ──────────────────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db,"offers"), orderBy("createdAt","desc"));
    return onSnapshot(q, snap => setOffers(snap.docs.map(d=>({id:d.id,...d.data()}))));
  }, []);

  // ── Close dropdowns on outside click ───────────────────────────
  useEffect(() => {
    const h = () => { setOpenMenuPostId(null); setShowProfileMenu(false); setShowNavMenu(false); };
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, []);

  // ── Derived state ───────────────────────────────────────────────
  const getCat = id => CATEGORIES.find(c=>c.id===id)||CATEGORIES[1];
  const displayName = userProfile?.displayName || user?.displayName || "";

  const filtered = posts.filter(p => {
    const matchCat    = activeCategory==="all"||p.category===activeCategory;
    const matchSearch = search===""||p.content?.toLowerCase().includes(search.toLowerCase())||p.username?.toLowerCase().includes(search.toLowerCase());
    return matchCat&&matchSearch;
  });

  const bookmarkedPosts = bookmarks.slice().sort((a,b)=>b.bookmarkedAt-a.bookmarkedAt).map(bm=>posts.find(p=>p.id===bm.postId)).filter(Boolean);
  const holdingsPosts   = posts.filter(p=>p.currentOwnerId===user?.uid);
  const likedPosts      = posts.filter(p=>p.likes?.includes(user?.uid));

  // Pending offers where current user is the owner
  const myIncomingOffers = offers.filter(o=>
    o.status==="pending" &&
    (o.currentOwnerId===user?.uid||(!o.currentOwnerId&&o.originalPosterId===user?.uid))
  );

  // Accepted offers where current user is the buyer — needs to pay
  const myAcceptedOffers = offers.filter(o=>o.status==="accepted"&&o.buyerId===user?.uid);

  const displayedPosts = activeFeed==="bookmarks" ? bookmarkedPosts
    : activeFeed==="holdings"  ? holdingsPosts
    : activeFeed==="likes"     ? likedPosts
    : filtered;

  // ── Handlers ────────────────────────────────────────────────────
  async function handleLogin() {
    try { await signInWithPopup(auth,provider); setSignInPrompt(null); } catch(e) { console.error(e); }
  }
  async function handleLogout() { await signOut(auth); setShowProfileMenu(false); setActiveFeed("home"); }

  async function handlePost() {
    setError("");
    if (!user)                  { setSignInPrompt("Sign in to share your news!"); return; }
    if (!postContent.trim())    { setError("Post cannot be empty."); return; }
    if (postContent.length>500) { setError("Max 500 characters."); return; }
    if (containsProfanity(postContent)) { setError("⚠️ Prohibited language detected."); return; }
    try {
      await addDoc(collection(db,"posts"), {
        content:postContent, category:postCategory,
        username: displayName||user.displayName,
        handle: "@"+(displayName||user.displayName).toLowerCase().replace(/\s/g,""),
        avatar: (displayName||user.displayName)[0].toUpperCase(),
        userId: user.uid, timestamp: serverTimestamp(),
        likes:[], comments:[], forSale:false, listPrice:null, currentOwnerId:null, currentOwnerHandle:null,
      });
      setPostContent(""); setSuccess(true); setTimeout(()=>setSuccess(false),3000);
    } catch(e) { setError("Failed to post."); }
  }

  async function handleLike(postId, currentLikes) {
    if (!user) { setSignInPrompt("Sign in to like posts!"); return; }
    const liked = currentLikes?.includes(user.uid);
    await updateDoc(doc(db,"posts",postId), { likes:liked?arrayRemove(user.uid):arrayUnion(user.uid) });
  }

  async function handleComment(postId) {
    const text = commentInputs[postId]||"";
    setCommentErrors(prev=>({...prev,[postId]:""}));
    if (!user)          { setSignInPrompt("Sign in to comment!"); return; }
    if (!text.trim())   { setCommentErrors(prev=>({...prev,[postId]:"Cannot be empty."})); return; }
    if (containsProfanity(text)) { setCommentErrors(prev=>({...prev,[postId]:"⚠️ Prohibited language."})); return; }
    await updateDoc(doc(db,"posts",postId), {
      comments: arrayUnion({ text, username:displayName||user.displayName, avatar:(displayName||user.displayName)[0].toUpperCase(), userId:user.uid, timestamp:new Date().toISOString() })
    });
    setCommentInputs(prev=>({...prev,[postId]:""}));
  }

  function toggleComments(postId) {
    if (!user) { setSignInPrompt("Sign in to view comments!"); return; }
    setExpandedComments(prev=>{ const n=new Set(prev); n.has(postId)?n.delete(postId):n.add(postId); return n; });
  }

  function handleBookmark(postId) {
    if (!user) { setSignInPrompt("Sign in to bookmark posts!"); return; }
    const has = bookmarks.some(b=>b.postId===postId);
    const nb  = has ? bookmarks.filter(b=>b.postId!==postId) : [...bookmarks,{postId,bookmarkedAt:Date.now()}];
    setBookmarks(nb); localStorage.setItem(`nform_bookmarks_${user.uid}`,JSON.stringify(nb));
  }

  function handleShare(postId) {
    const url = `${window.location.origin}${window.location.pathname}?post=${postId}`;
    navigator.clipboard.writeText(url).then(()=>{ setCopiedPostId(postId); setTimeout(()=>setCopiedPostId(null),2500); });
  }

  // Submit offer — always sends to owner, never immediate PayPal
  async function submitOffer() {
    setOfferError("");
    if (!offerAmount||isNaN(offerAmount)||Number(offerAmount)<=0) { setOfferError("Enter a valid amount."); return; }
    if (offerModal.post.listPrice&&Number(offerAmount)>=Number(offerModal.post.listPrice)) {
      setOfferError(`To buy at or above the listing price, use the Buy Now button.`); return;
    }
    await addDoc(collection(db,"offers"), {
      postId:           offerModal.post.id,
      postContent:      offerModal.post.content,
      originalPosterId: offerModal.post.userId,
      originalPosterHandle: offerModal.post.handle,
      currentOwnerId:   offerModal.post.currentOwnerId||offerModal.post.userId,
      buyerId:          user.uid,
      buyerHandle:      "@"+(displayName||user.displayName).toLowerCase().replace(/\s/g,""),
      buyerName:        displayName||user.displayName,
      amount:           Number(offerAmount),
      status:           "pending",
      createdAt:        serverTimestamp(),
    });
    setOfferModal(null); setOfferAmount(""); setOfferError("");
    alert("✅ Offer sent! You'll be notified when the owner responds.");
  }
  
  // After PayPal payment approved (Buy Now flow)
  async function onPayPalApprove(post, amount) {
    await updateDoc(doc(db,"posts",post.id), {
      currentOwnerId:    user.uid,
      currentOwnerHandle:"@"+(displayName||user.displayName).toLowerCase().replace(/\s/g,""),
      forSale:false, listPrice:null,
    });
    await addDoc(collection(db,"offers"), {
      postId:post.id, postContent:post.content,
      originalPosterId:post.userId, originalPosterHandle:post.handle,
      currentOwnerId:post.currentOwnerId||post.userId,
      buyerId:user.uid,
      buyerHandle:"@"+(displayName||user.displayName).toLowerCase().replace(/\s/g,""),
      buyerName:displayName||user.displayName,
      amount:Number(amount), status:"completed", createdAt:serverTimestamp(),
    });
    setOfferModal(null); setShowPayPal(false); setOfferAmount("");
    alert("🎉 You now own this post! Find it in your Holdings.");
  }

  // After PayPal payment approved (accepted offer flow)
  async function onAcceptedOfferPayPalApprove(offer) {
    await updateDoc(doc(db,"posts",offer.postId), {
      currentOwnerId:    user.uid,
      currentOwnerHandle:offer.buyerHandle,
      forSale:false, listPrice:null,
    });
    await updateDoc(doc(db,"offers",offer.id), { status:"completed" });
    alert("🎉 Payment complete! The post is now in your Holdings.");
  }

  // Owner accepts offer — buyer must then pay
  async function acceptOffer(offer) {
    await updateDoc(doc(db,"offers",offer.id), { status:"accepted" });
  }

  async function declineOffer(offerId) {
    await updateDoc(doc(db,"offers",offerId), { status:"declined" });
  }

  async function saveListing() {
    setListError("");
    if (!listPrice||isNaN(listPrice)||Number(listPrice)<=0) { setListError("Enter a valid price."); return; }
    await updateDoc(doc(db,"posts",listingModal.post.id), { forSale:true, listPrice:Number(listPrice) });
    setListingModal(null); setListPrice("");
  }

  // ── Render ──────────────────────────────────────────────────────
  return (
    <PayPalScriptProvider options={{ "client-id":PAYPAL_CLIENT_ID }}>
    <div style={{ fontFamily:"'Georgia','Times New Roman',serif",background:"#f8f7f4",minHeight:"100vh",color:"#1a1a1a" }}>

      {/* Sign-in prompt */}
      {signInPrompt&&<SignInPrompt message={signInPrompt} onLogin={handleLogin} onClose={()=>setSignInPrompt(null)}/>}

      {/* Profile view */}
      {viewingProfileId&&(
        <ProfilePage profileUserId={viewingProfileId} currentUser={user} posts={posts} offers={offers}
          onClose={()=>setViewingProfileId(null)} onOpenProfile={id=>setViewingProfileId(id)}/>
      )}

      {/* Edit profile */}
      {showEditProfile&&user&&(
        <EditProfileModal user={user} currentData={userProfile}
          onClose={()=>setShowEditProfile(false)}
          onSave={data=>setUserProfile(prev=>({...prev,...data}))}/>
      )}

      {/* Offer Modal */}
      {offerModal&&(
        <div style={{ position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px" }}
          onClick={e=>{ if(e.target===e.currentTarget){setOfferModal(null);setShowPayPal(false);setOfferAmount("");setOfferError("");} }}>
          <div style={{ background:"#f8f7f4",border:"2px solid #1a1a1a",borderRadius:"4px",width:"100%",maxWidth:"440px",padding:"28px",boxShadow:"6px 6px 0 #1a1a1a" }}>
            <h2 style={{ margin:"0 0 6px",fontSize:"18px",fontWeight:"900",fontStyle:"italic" }}>{showPayPal?"Complete Purchase":"Make an Offer"}</h2>
            <p style={{ margin:"0 0 16px",color:"#888",fontSize:"13px" }}>Post by {offerModal.post.handle}</p>
            <div style={{ background:"#f0ede8",borderRadius:"2px",padding:"12px 14px",marginBottom:"16px",fontSize:"14px",lineHeight:"1.5",borderLeft:"3px solid #1a1a1a" }}>
              {offerModal.post.content.slice(0,120)}{offerModal.post.content.length>120?"...":""}
            </div>
            {offerModal.post.listPrice&&!showPayPal&&(
              <div style={{ marginBottom:"12px",fontSize:"13px",color:"#666" }}>
                Listed at: <strong style={{ color:"#1a1a1a" }}>${offerModal.post.listPrice}</strong> — offers must be below this price.
              </div>
            )}
            {!showPayPal ? (
              <>
                <label style={{ fontSize:"11px",fontWeight:"700",letterSpacing:"2px",textTransform:"uppercase",color:"#666",display:"block",marginBottom:"8px" }}>Your Offer (USD)</label>
                <input type="number" min="0.01" step="0.01" value={offerAmount} onChange={e=>setOfferAmount(e.target.value)} placeholder="e.g. 25.00"
                  style={{ width:"100%",padding:"10px 14px",border:"2px solid #1a1a1a",borderRadius:"2px",fontSize:"16px",fontFamily:"inherit",outline:"none",boxSizing:"border-box",marginBottom:"8px" }}/>
                {offerError&&<div style={{ color:"#991b1b",fontSize:"12px",marginBottom:"10px",fontWeight:"600" }}>{offerError}</div>}
                <div style={{ display:"flex",gap:"10px",marginTop:"8px" }}>
                  <button onClick={()=>{setOfferModal(null);setOfferAmount("");setOfferError("");}} style={{ flex:1,padding:"10px",background:"none",border:"2px solid #1a1a1a",cursor:"pointer",fontSize:"13px",fontWeight:"700",fontFamily:"inherit" }}>Cancel</button>
                  <button onClick={submitOffer} style={{ flex:1,padding:"10px",background:"#1a1a1a",color:"#f8f7f4",border:"2px solid #1a1a1a",cursor:"pointer",fontSize:"13px",fontWeight:"700",fontFamily:"inherit" }}>Send Offer →</button>
                </div>
                {offerModal.post.forSale&&offerModal.post.listPrice&&(
                  <div style={{ marginTop:"14px",borderTop:"1px solid #e0ddd8",paddingTop:"14px" }}>
                    <div style={{ fontSize:"13px",color:"#666",marginBottom:"8px" }}>Or skip the wait and buy immediately at the listed price:</div>
                    <button onClick={()=>{ setOfferAmount(String(offerModal.post.listPrice)); setShowPayPal(true); }}
                      style={{ width:"100%",padding:"10px",background:"#065f46",color:"#f8f7f4",border:"2px solid #065f46",cursor:"pointer",fontSize:"13px",fontWeight:"700",fontFamily:"inherit",borderRadius:"2px" }}>
                      ⚡ Buy Now for ${offerModal.post.listPrice}
                    </button>
                  </div>
                )}
              </>
            ):(
              <>
                <div style={{ marginBottom:"12px",fontSize:"14px",fontWeight:"600" }}>
                  Pay <span style={{ color:"#1a1a1a" }}>${Number(offerAmount).toFixed(2)}</span> via PayPal:
                </div>
                <PayPalButtons style={{ layout:"vertical",shape:"rect",label:"pay" }}
                  createOrder={(d,a)=>a.order.create({ purchase_units:[{amount:{value:Number(offerAmount).toFixed(2)},description:`Nform post: ${offerModal.post.id}`}] })}
                  onApprove={(d,a)=>a.order.capture().then(()=>onPayPalApprove(offerModal.post,offerAmount))}
                  onCancel={()=>setShowPayPal(false)}
                  onError={()=>setOfferError("Payment failed. Please try again.")}/>
                <button onClick={()=>setShowPayPal(false)} style={{ marginTop:"10px",background:"none",border:"none",cursor:"pointer",fontSize:"13px",color:"#888",fontFamily:"inherit" }}>← Back</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Listing Modal */}
      {listingModal&&(
        <div style={{ position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px" }}
          onClick={e=>{ if(e.target===e.currentTarget){setListingModal(null);setListPrice("");setListError("");} }}>
          <div style={{ background:"#f8f7f4",border:"2px solid #1a1a1a",borderRadius:"4px",width:"100%",maxWidth:"400px",padding:"28px",boxShadow:"6px 6px 0 #1a1a1a" }}>
            <h2 style={{ margin:"0 0 16px",fontSize:"18px",fontWeight:"900",fontStyle:"italic" }}>💲 List Post for Sale</h2>
            <div style={{ background:"#f0ede8",borderRadius:"2px",padding:"12px 14px",marginBottom:"16px",fontSize:"14px",lineHeight:"1.5",borderLeft:"3px solid #1a1a1a" }}>
              {listingModal.post.content.slice(0,120)}{listingModal.post.content.length>120?"...":""}
            </div>
            <label style={{ fontSize:"11px",fontWeight:"700",letterSpacing:"2px",textTransform:"uppercase",color:"#666",display:"block",marginBottom:"8px" }}>Listing Price (USD)</label>
            <input type="number" min="0.01" step="0.01" value={listPrice} onChange={e=>setListPrice(e.target.value)} placeholder="e.g. 50.00"
              style={{ width:"100%",padding:"10px 14px",border:"2px solid #1a1a1a",borderRadius:"2px",fontSize:"16px",fontFamily:"inherit",outline:"none",boxSizing:"border-box",marginBottom:"8px" }}/>
            <p style={{ fontSize:"12px",color:"#888",margin:"0 0 16px" }}>Buyers can offer below this price, or buy instantly at this price.</p>
            {listError&&<div style={{ color:"#991b1b",fontSize:"12px",marginBottom:"10px",fontWeight:"600" }}>{listError}</div>}
            <div style={{ display:"flex",gap:"10px" }}>
              <button onClick={()=>{setListingModal(null);setListPrice("");setListError("");}} style={{ flex:1,padding:"10px",background:"none",border:"2px solid #1a1a1a",cursor:"pointer",fontSize:"13px",fontWeight:"700",fontFamily:"inherit" }}>Cancel</button>
              <button onClick={saveListing} style={{ flex:1,padding:"10px",background:"#1a1a1a",color:"#f8f7f4",border:"2px solid #1a1a1a",cursor:"pointer",fontSize:"13px",fontWeight:"700",fontFamily:"inherit" }}>List It →</button>
            </div>
          </div>
        </div>
      )}

      {/* Compose Modal */}
      {showCompose&&(
        <div style={{ position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px" }}
          onClick={e=>{ if(e.target===e.currentTarget){setShowCompose(false);setError("");setPostContent("");} }}>
          <div style={{ background:"#f8f7f4",border:"2px solid #1a1a1a",borderRadius:"4px",width:"100%",maxWidth:"560px",padding:"28px",boxShadow:"6px 6px 0 #1a1a1a" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px" }}>
              <h2 style={{ margin:0,fontSize:"18px",fontWeight:"900",fontStyle:"italic" }}>New Post</h2>
              <button onClick={()=>{setShowCompose(false);setError("");setPostContent("");}} style={{ background:"none",border:"none",cursor:"pointer",fontSize:"22px",color:"#888" }}>×</button>
            </div>
            <div style={{ display:"flex",gap:"6px",flexWrap:"wrap",marginBottom:"14px" }}>
              {CATEGORIES.filter(c=>c.id!=="all").map(cat=>(
                <button key={cat.id} onClick={()=>setPostCategory(cat.id)} style={{ padding:"6px 12px",background:postCategory===cat.id?"#1a1a1a":cat.color,color:postCategory===cat.id?"#f8f7f4":"#1a1a1a",border:"1px solid rgba(0,0,0,0.15)",borderRadius:"2px",cursor:"pointer",fontSize:"12px",fontWeight:"600",fontFamily:"inherit" }}>{cat.emoji} {cat.label}</button>
              ))}
            </div>
            <div style={{ border:"2px solid #1a1a1a",borderRadius:"4px",background:"#f8f7f4",overflow:"hidden" }}>
              <textarea value={postContent} onChange={e=>{ setPostContent(e.target.value); setError(""); }} placeholder="Share your news with the world!" rows={4}
                style={{ width:"100%",padding:"14px 16px",border:"none",outline:"none",fontSize:"15px",lineHeight:"1.6",resize:"none",fontFamily:"Georgia,serif",background:"transparent",boxSizing:"border-box",display:"block" }} autoFocus/>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 16px",borderTop:"1px solid #e0ddd8",background:"#f0ede8" }}>
                <span style={{ fontSize:"11px",color:"#888" }}>⚠️ No profanity • Keep it informational</span>
                <div style={{ display:"flex",alignItems:"center",gap:"12px" }}>
                  <span style={{ fontSize:"11px",color:postContent.length>450?"#dc2626":"#888" }}>{postContent.length}/500</span>
                  <button onClick={async()=>{ await handlePost(); if(!error) setShowCompose(false); }}
                    style={{ background:"#1a1a1a",color:"#f8f7f4",border:"none",borderRadius:"2px",padding:"8px 20px",fontSize:"13px",fontWeight:"700",cursor:"pointer",letterSpacing:"1px",fontFamily:"inherit" }}>Publish →</button>
                </div>
              </div>
            </div>
            {error&&<div style={{ background:"#fef2f2",border:"1px solid #fecaca",borderRadius:"2px",padding:"8px 12px",color:"#991b1b",fontSize:"12px",marginTop:"8px",fontWeight:"600" }}>{error}</div>}
            {success&&<div style={{ background:"#d1fae5",border:"1px solid #6ee7b7",borderRadius:"2px",padding:"8px 12px",color:"#065f46",fontSize:"12px",marginTop:"8px",fontWeight:"600" }}>✓ Post published!</div>}
          </div>
        </div>
      )}

      {/* ── HEADER ───────────────────────────────────────────────── */}
      <header style={{ position:"sticky",top:0,zIndex:100,background:"rgba(248,247,244,0.97)",backdropFilter:"blur(12px)",borderBottom:"2px solid #1a1a1a",padding:"0 20px",display:"flex",alignItems:"center",justifyContent:"space-between",height:"60px",gap:"12px" }}>
        <div style={{ display:"flex",alignItems:"center",gap:"12px",flexShrink:0 }}>
          <button onClick={()=>setSidebarOpen(!sidebarOpen)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:"20px" }}>☰</button>
          <span style={{ fontSize:"22px",fontWeight:"900",letterSpacing:"-1px",fontStyle:"italic" }}>Nform</span>
          <span style={{ background:"#1a1a1a",color:"#f8f7f4",fontSize:"10px",fontWeight:"700",letterSpacing:"2px",padding:"2px 8px",textTransform:"uppercase" }}>LIVE</span>
        </div>
        <div style={{ flex:1,maxWidth:"400px" }}>
          <input value={search} onChange={e=>{ setSearch(e.target.value); setActiveFeed("home"); }} placeholder="🔍 Search posts..."
            style={{ width:"100%",padding:"8px 14px",border:"2px solid #1a1a1a",borderRadius:"2px",fontSize:"13px",fontFamily:"inherit",background:"#fff",outline:"none",boxSizing:"border-box" }}/>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:"8px",flexShrink:0 }}>
          {user ? (
            <>
              {/* ⋮ Nav menu */}
              <div style={{ position:"relative" }}>
                <button onClick={e=>{ e.stopPropagation(); setShowNavMenu(!showNavMenu); setShowProfileMenu(false); }}
                  style={{ background:"none",border:"2px solid #1a1a1a",borderRadius:"2px",padding:"5px 10px",cursor:"pointer",fontSize:"16px",fontWeight:"900",lineHeight:1,color:"#1a1a1a",letterSpacing:"1px" }}>⋮</button>
                {showNavMenu&&(
                  <div onClick={e=>e.stopPropagation()} style={{ position:"absolute",right:0,top:"40px",zIndex:200,background:"#f8f7f4",border:"2px solid #1a1a1a",borderRadius:"4px",minWidth:"180px",boxShadow:"4px 4px 0 #1a1a1a" }}>
                    {[
                      { label:"◆ Bookmarks", feed:"bookmarks" },
                      { label:"❤️ Likes",    feed:"likes" },
                      { label:"🏦 Holdings", feed:"holdings" },
                    ].map(item=>(
                      <button key={item.feed} onClick={()=>{ setActiveFeed(item.feed); setShowNavMenu(false); }}
                        style={{ display:"block",width:"100%",padding:"12px 16px",background:activeFeed===item.feed?"#1a1a1a":"none",color:activeFeed===item.feed?"#f8f7f4":"#1a1a1a",border:"none",borderBottom:"1px solid #e0ddd8",cursor:"pointer",fontSize:"13px",fontFamily:"inherit",textAlign:"left",fontWeight:"600" }}>
                        {item.label}
                        {item.feed==="holdings"&&(myIncomingOffers.length+myAcceptedOffers.length)>0&&(
                          <span style={{ marginLeft:"6px",background:"#dc2626",color:"#fff",borderRadius:"10px",padding:"1px 6px",fontSize:"11px" }}>{myIncomingOffers.length+myAcceptedOffers.length}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Profile avatar */}
              <div style={{ position:"relative" }}>
                <button onClick={e=>{ e.stopPropagation(); setShowProfileMenu(!showProfileMenu); setShowNavMenu(false); }}
                  style={{ background:"#1a1a1a",color:"#f8f7f4",border:"none",borderRadius:"50%",width:"34px",height:"34px",fontSize:"14px",fontWeight:"700",cursor:"pointer",fontFamily:"inherit",flexShrink:0 }}>
                  {(displayName||user.displayName||"?")[0].toUpperCase()}
                </button>
                {showProfileMenu&&(
                  <div onClick={e=>e.stopPropagation()} style={{ position:"absolute",right:0,top:"42px",zIndex:200,background:"#f8f7f4",border:"2px solid #1a1a1a",borderRadius:"4px",minWidth:"200px",boxShadow:"4px 4px 0 #1a1a1a" }}>
                    <div style={{ padding:"14px 16px",borderBottom:"1px solid #e0ddd8" }}>
                      <div style={{ fontWeight:"700",fontSize:"15px" }}>{displayName||user.displayName}</div>
                      <div style={{ color:"#888",fontSize:"12px" }}>{user.email}</div>
                    </div>
                    <button onClick={()=>{ setViewingProfileId(user.uid); setShowProfileMenu(false); }}
                      style={{ display:"block",width:"100%",padding:"12px 16px",background:"none",border:"none",borderBottom:"1px solid #e0ddd8",cursor:"pointer",fontSize:"13px",fontFamily:"inherit",textAlign:"left",fontWeight:"600" }}>
                      👤 View Profile
                    </button>
                    <button onClick={()=>{ setShowEditProfile(true); setShowProfileMenu(false); }}
                      style={{ display:"block",width:"100%",padding:"12px 16px",background:"none",border:"none",borderBottom:"1px solid #e0ddd8",cursor:"pointer",fontSize:"13px",fontFamily:"inherit",textAlign:"left",fontWeight:"600" }}>
                      ✏️ Edit Profile
                    </button>
                    <button onClick={handleLogout}
                      style={{ display:"block",width:"100%",padding:"12px 16px",background:"none",border:"none",cursor:"pointer",fontSize:"13px",fontFamily:"inherit",textAlign:"left",color:"#888" }}>
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ):(
            <button onClick={handleLogin} style={{ background:"#1a1a1a",color:"#f8f7f4",border:"none",borderRadius:"2px",padding:"8px 16px",fontSize:"13px",fontWeight:"700",cursor:"pointer",letterSpacing:"1px",fontFamily:"inherit" }}>
              Sign in with Google
            </button>
          )}
        </div>
      </header>

      <div style={{ display:"flex",maxWidth:"1200px",margin:"0 auto" }}>

        {/* ── SIDEBAR ──────────────────────────────────────────── */}
        <aside style={{ width:sidebarOpen?"240px":"0",overflow:"hidden",transition:"width 0.3s ease",borderRight:sidebarOpen?"2px solid #1a1a1a":"none",background:"#f8f7f4",position:"sticky",top:"60px",height:"calc(100vh - 60px)",flexShrink:0 }}>
          <div style={{ padding:"20px 16px 12px",fontSize:"11px",fontWeight:"700",letterSpacing:"2px",color:"#666",textTransform:"uppercase" }}>Categories</div>
          {CATEGORIES.map(cat=>(
            <button key={cat.id} onClick={()=>{ setActiveCategory(cat.id); setActiveFeed("home"); setSidebarOpen(false); }}
              style={{ display:"flex",alignItems:"center",gap:"10px",width:"100%",padding:"10px 16px",background:activeCategory===cat.id&&activeFeed==="home"?"#1a1a1a":"none",color:activeCategory===cat.id&&activeFeed==="home"?"#f8f7f4":"#1a1a1a",border:"none",cursor:"pointer",fontSize:"14px",textAlign:"left",fontFamily:"inherit" }}>
              <span>{cat.emoji}</span><span style={{ fontWeight:activeCategory===cat.id?"700":"400" }}>{cat.label}</span>
            </button>
          ))}
          {user&&(
            <>
              {[
                { label:"◆ Bookmarks", feed:"bookmarks" },
                { label:"❤️ Likes",    feed:"likes" },
                { label:"🏦 Holdings", feed:"holdings" },
              ].map((item,i)=>(
                <button key={item.feed} onClick={()=>{ setActiveFeed(item.feed); setSidebarOpen(false); }}
                  style={{ display:"flex",alignItems:"center",gap:"10px",width:"100%",padding:"10px 16px",background:activeFeed===item.feed?"#1a1a1a":"none",color:activeFeed===item.feed?"#f8f7f4":"#1a1a1a",border:"none",borderTop:i===0?"2px solid #e0ddd8":"none",cursor:"pointer",fontSize:"14px",textAlign:"left",fontFamily:"inherit",marginTop:i===0?"8px":"0" }}>
                  <span>{item.label}</span>
                  {item.feed==="holdings"&&(myIncomingOffers.length+myAcceptedOffers.length)>0&&(
                    <span style={{ background:"#dc2626",color:"#fff",borderRadius:"10px",padding:"1px 6px",fontSize:"11px" }}>{myIncomingOffers.length+myAcceptedOffers.length}</span>
                  )}
                </button>
              ))}
            </>
          )}
        </aside>

        {/* ── MAIN ─────────────────────────────────────────────── */}
        <main style={{ flex:1 }}>

          {/* Category bar */}
          {activeFeed==="home"&&(
            <div style={{ display:"flex",flexWrap:"wrap",borderBottom:"2px solid #1a1a1a" }}>
              {CATEGORIES.map(cat=>(
                <button key={cat.id} onClick={()=>setActiveCategory(cat.id)} style={{ padding:"12px 16px",background:activeCategory===cat.id?"#1a1a1a":"transparent",color:activeCategory===cat.id?"#f8f7f4":"#1a1a1a",border:"none",borderRight:"1px solid #e0ddd8",borderBottom:"1px solid #e0ddd8",cursor:"pointer",fontSize:"12px",fontWeight:activeCategory===cat.id?"700":"400",whiteSpace:"nowrap",fontFamily:"inherit",flexShrink:0 }}>
                  {cat.emoji} {cat.id==="all"?"All":cat.label}
                </button>
              ))}
            </div>
          )}

          {/* Section header for non-home feeds */}
          {activeFeed!=="home"&&(
            <div style={{ padding:"20px 24px",borderBottom:"2px solid #1a1a1a",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
              <div>
                <h2 style={{ margin:0,fontSize:"20px",fontWeight:"900",fontStyle:"italic" }}>
                  {activeFeed==="bookmarks"?"◆ Bookmarks":activeFeed==="likes"?"❤️ Likes":"🏦 Holdings"}
                </h2>
                <p style={{ margin:"4px 0 0",color:"#888",fontSize:"13px" }}>
                  {activeFeed==="bookmarks"?`${bookmarks.length} saved`
                  :activeFeed==="likes"?`${likedPosts.length} liked`
                  :`${holdingsPosts.length} owned`}
                </p>
              </div>
              <button onClick={()=>setActiveFeed("home")} style={{ background:"none",border:"2px solid #1a1a1a",padding:"8px 16px",cursor:"pointer",fontSize:"13px",fontWeight:"700",fontFamily:"inherit" }}>← Back</button>
            </div>
          )}

          {/* Accepted offers — buyer needs to pay */}
          {activeFeed==="holdings"&&myAcceptedOffers.length>0&&(
            <div style={{ margin:"16px 24px",background:"#d1fae5",border:"2px solid #065f46",borderRadius:"4px",padding:"16px" }}>
              <div style={{ fontSize:"11px",fontWeight:"700",letterSpacing:"2px",textTransform:"uppercase",color:"#065f46",marginBottom:"12px" }}>✅ Offers Accepted — Complete Your Payment</div>
              {myAcceptedOffers.map(offer=>{
                const op = posts.find(p=>p.id===offer.postId);
                return (
                  <div key={offer.id} style={{ borderBottom:"1px solid #a7f3d0",paddingBottom:"12px",marginBottom:"12px" }}>
                    <div style={{ fontSize:"13px",marginBottom:"4px" }}>"{op?.content?.slice(0,80)}..."</div>
                    <div style={{ fontSize:"13px",color:"#065f46",marginBottom:"10px" }}>Your offer of <strong>${offer.amount}</strong> was accepted!</div>
                    <PayPalButtons style={{ layout:"vertical",shape:"rect",label:"pay" }}
                      createOrder={(d,a)=>a.order.create({ purchase_units:[{amount:{value:Number(offer.amount).toFixed(2)},description:`Nform post: ${offer.postId}`}] })}
                      onApprove={(d,a)=>a.order.capture().then(()=>onAcceptedOfferPayPalApprove(offer))}
                      onError={()=>alert("Payment failed. Please try again.")}/>
                  </div>
                );
              })}
            </div>
          )}

          {/* Incoming offers — owner accepts/declines */}
          {activeFeed==="holdings"&&myIncomingOffers.length>0&&(
            <div style={{ margin:"16px 24px",background:"#fff",border:"2px solid #1a1a1a",borderRadius:"4px",padding:"16px" }}>
              <div style={{ fontSize:"11px",fontWeight:"700",letterSpacing:"2px",textTransform:"uppercase",color:"#666",marginBottom:"12px" }}>📬 Incoming Offers</div>
              {myIncomingOffers.map(offer=>{
                const op = posts.find(p=>p.id===offer.postId);
                return (
                  <div key={offer.id} style={{ borderBottom:"1px solid #e0ddd8",paddingBottom:"12px",marginBottom:"12px" }}>
                    <div style={{ fontSize:"13px",color:"#888",marginBottom:"4px" }}>From <strong style={{ color:"#1a1a1a" }}>{offer.buyerHandle}</strong></div>
                    <div style={{ fontSize:"13px",marginBottom:"8px" }}>"{op?.content?.slice(0,80)}..."</div>
                    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                      <span style={{ fontWeight:"900",fontSize:"18px" }}>${offer.amount}</span>
                      <div style={{ display:"flex",gap:"8px" }}>
                        <button onClick={()=>declineOffer(offer.id)} style={{ padding:"6px 14px",background:"none",border:"2px solid #1a1a1a",cursor:"pointer",fontSize:"12px",fontWeight:"700",fontFamily:"inherit" }}>Decline</button>
                        <button onClick={()=>acceptOffer(offer)} style={{ padding:"6px 14px",background:"#1a1a1a",color:"#f8f7f4",border:"2px solid #1a1a1a",cursor:"pointer",fontSize:"12px",fontWeight:"700",fontFamily:"inherit" }}>Accept ✓</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Post bubble */}
          {activeFeed==="home"&&(
            <div style={{ borderBottom:"2px solid #1a1a1a",padding:"16px 24px",background:"#fff" }}>
              <div style={{ border:"2px solid #1a1a1a",borderRadius:"4px",overflow:"hidden",cursor:"pointer" }}
                onClick={()=>user?setShowCompose(true):setSignInPrompt("Sign in to share your news with the world!")}>
                <div style={{ padding:"16px 20px",background:"#fff",fontSize:"15px",color:"#aaa",fontFamily:"Georgia,serif",fontStyle:"italic" }}>
                  Share your news with the world!
                </div>
              </div>
            </div>
          )}

          {/* Search results bar */}
          {search&&activeFeed==="home"&&(
            <div style={{ padding:"10px 24px",background:"#f0ede8",fontSize:"13px",color:"#666",borderBottom:"1px solid #e0ddd8" }}>
              {filtered.length} result{filtered.length!==1?"s":""} for "<strong>{search}</strong>"
              <button onClick={()=>setSearch("")} style={{ marginLeft:"10px",background:"none",border:"none",cursor:"pointer",color:"#1a1a1a",fontWeight:"700",fontSize:"13px" }}>✕ Clear</button>
            </div>
          )}

          {/* ── POSTS ────────────────────────────────────────────── */}
          {loading ? (
            <div style={{ padding:"60px",textAlign:"center",color:"#888" }}>Loading posts...</div>
          ) : displayedPosts.length===0 ? (
            <div style={{ padding:"60px",textAlign:"center",color:"#888",fontSize:"16px" }}>
              {activeFeed==="bookmarks"?"No bookmarks yet. Tap ◇ on any post."
              :activeFeed==="likes"?"No liked posts yet."
              :activeFeed==="holdings"?"You don't own any posts yet. Browse the feed and make an offer!"
              :search?"No posts match your search."
              :"No posts in this category yet. Be the first!"}
            </div>
          ) : displayedPosts.map(post=>{
            const cat        = getCat(post.category);
            const liked      = post.likes?.includes(user?.uid);
            const bookmarked = bookmarks.some(b=>b.postId===post.id);
            const commentsOpen = expandedComments.has(post.id);
            const copied     = copiedPostId===post.id;
            const menuOpen   = openMenuPostId===post.id;

            return (
              <article key={post.id} style={{ padding:"24px 28px",borderBottom:"1px solid #e0ddd8",background:"#f8f7f4" }}>
                <div style={{ display:"flex",gap:"14px" }}>
                  <div onClick={()=>setViewingProfileId(post.userId)} style={{ cursor:"pointer",flexShrink:0 }}>
                    <Avatar name={post.username} size={44}/>
                  </div>
                  <div style={{ flex:1 }}>
                    {/* Post header */}
                    <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between" }}>
                      <div style={{ display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap",marginBottom:"6px" }}>
                        <span onClick={()=>setViewingProfileId(post.userId)} style={{ fontWeight:"700",fontSize:"15px",cursor:"pointer" }}>{post.username}</span>
                        <span style={{ color:"#888",fontSize:"13px" }}>{post.handle}</span>
                        {post.currentOwnerId&&(
                          <span style={{ background:"#e8e8e8",color:"#666",border:"1px solid #ccc",borderRadius:"20px",padding:"1px 8px",fontSize:"11px",fontStyle:"italic" }}>
                            owned by {post.currentOwnerHandle}
                          </span>
                        )}
                        <span style={{ color:"#aaa" }}>·</span>
                        <span style={{ color:"#888",fontSize:"12px" }}>{timeAgo(post.timestamp)}</span>
                        <span style={{ background:cat.color,border:"1px solid rgba(0,0,0,0.15)",borderRadius:"2px",padding:"2px 8px",fontSize:"11px",fontWeight:"700",letterSpacing:"0.5px",textTransform:"uppercase" }}>{cat.emoji} {cat.label}</span>
                        {post.forSale&&<span style={{ background:"#d1fae5",color:"#065f46",border:"1px solid #6ee7b7",borderRadius:"2px",padding:"2px 8px",fontSize:"11px",fontWeight:"700" }}>💲 ${post.listPrice}</span>}
                      </div>
                      {/* ··· menu */}
                      <div style={{ position:"relative",flexShrink:0 }}>
                        <button onClick={e=>{ e.stopPropagation(); setOpenMenuPostId(menuOpen?null:post.id); }}
                          style={{ background:"none",border:"none",cursor:"pointer",fontSize:"18px",color:"#888",padding:"0 4px",lineHeight:1,fontFamily:"inherit" }}>···</button>
                        {menuOpen&&(
                          <PostMenu post={post} user={user}
                            onOffer={()=>{ if(!user){setSignInPrompt("Sign in to make an offer!");return;} setOfferModal({post});setOfferAmount("");setOfferError("");setShowPayPal(false); }}
                            onSetListing={()=>{ setListingModal({post});setListPrice(post.listPrice||"");setListError(""); }}
                            onClose={()=>setOpenMenuPostId(null)}/>
                        )}
                      </div>
                    </div>

                    <p style={{ margin:"0 0 2px",lineHeight:"1.65",fontSize:"15px" }}>{post.content}</p>

                    {/* Action buttons */}
                    <div style={{ display:"flex",gap:"4px",alignItems:"center" }}>
                      <ActionBtn onClick={()=>handleLike(post.id,post.likes)} active={liked} activeColor="#dc2626" icon="🤍" activeIcon="❤️" count={post.likes?.length||0} label="Like"/>
                      <ActionBtn onClick={()=>toggleComments(post.id)} active={commentsOpen} activeColor="#1a1a1a" icon="💬" count={post.comments?.length||0} label="Comment"/>
                      <ActionBtn onClick={()=>handleBookmark(post.id)} active={bookmarked} activeColor="#888" icon="◇" activeIcon="◆" label={bookmarked?"Bookmarked":"Bookmark"}/>
                      <button onClick={()=>handleShare(post.id)} style={{ background:copied?"#d1fae5":"none",border:"none",cursor:"pointer",color:copied?"#065f46":"#888",fontSize:"13px",display:"flex",alignItems:"center",gap:"5px",fontFamily:"inherit",padding:"4px 8px",borderRadius:"4px",fontWeight:copied?"700":"400" }}
                        onMouseEnter={e=>{ if(!copied) e.currentTarget.style.background="#f0ede8"; }}
                        onMouseLeave={e=>{ if(!copied) e.currentTarget.style.background=copied?"#d1fae5":"none"; }}>
                        <span style={{ fontSize:"16px" }}>{copied?"✅":"🔗"}</span>
                        <span>{copied?"Copied!":"Share"}</span>
                      </button>
                    </div>

                    {/* Comments section */}
                    {commentsOpen&&(
                      <div style={{ marginTop:"16px",borderTop:"1px solid #e0ddd8",paddingTop:"16px" }}>
                        {post.comments?.length>0 ? post.comments.map((c,i)=>(
                          <div key={i} style={{ display:"flex",gap:"10px",marginBottom:"12px" }}>
                            <div onClick={()=>setViewingProfileId(c.userId)} style={{ cursor:"pointer" }}>
                              <Avatar name={c.username} size={32}/>
                            </div>
                            <div style={{ background:"#f0ede8",borderRadius:"2px",padding:"10px 12px",flex:1 }}>
                              <span onClick={()=>setViewingProfileId(c.userId)} style={{ fontWeight:"700",fontSize:"13px",cursor:"pointer" }}>{c.username}</span>
                              <span style={{ color:"#888",fontSize:"11px",marginLeft:"8px" }}>{c.timestamp?timeAgo({toDate:()=>new Date(c.timestamp)}):"Just now"}</span>
                              <p style={{ margin:"4px 0 0",fontSize:"14px",lineHeight:"1.5" }}>{c.text}</p>
                            </div>
                          </div>
                        )):<p style={{ color:"#888",fontSize:"13px",marginBottom:"12px" }}>No comments yet. Be the first!</p>}
                        <div style={{ display:"flex",gap:"10px",alignItems:"flex-start" }}>
                          <Avatar name={displayName||user?.displayName||"?"} size={32}/>
                          <div style={{ flex:1 }}>
                            <textarea value={commentInputs[post.id]||""} onChange={e=>setCommentInputs(prev=>({...prev,[post.id]:e.target.value}))} placeholder="Add a comment..."
                              style={{ width:"100%",padding:"8px 12px",border:"2px solid #1a1a1a",borderRadius:"2px",fontSize:"13px",fontFamily:"inherit",resize:"none",minHeight:"60px",background:"#fff",outline:"none",boxSizing:"border-box" }}/>
                            {commentErrors[post.id]&&<div style={{ color:"#991b1b",fontSize:"12px",marginTop:"4px" }}>{commentErrors[post.id]}</div>}
                            <button onClick={()=>handleComment(post.id)} style={{ marginTop:"6px",background:"#1a1a1a",color:"#f8f7f4",border:"none",padding:"6px 16px",fontSize:"12px",fontWeight:"700",cursor:"pointer",fontFamily:"inherit",letterSpacing:"1px" }}>Reply →</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </main>
      </div>
    </div>
    </PayPalScriptProvider>
  );
}
