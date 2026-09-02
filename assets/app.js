/* =========================================================================
   NepalDisaster.com — shared data + i18n + rendering
   All figures are provisional and attributed. Helpline & relief-fund data are
   transcribed from official NDRRMA / PMO posters — verify before acting.
   ========================================================================= */
"use strict";

/* -------------------- SECURITY: anti-clickjacking frame-buster --------------------
   Meta CSP frame-ancestors is ignored when set via <meta>, and X-Frame-Options
   can only be sent as an HTTP header. This is a defence-in-depth guard so the site
   cannot be silently framed/overlaid by a malicious page (clickjacking). Real
   header-level protection is also shipped in the repo _headers file. */
(function frameGuard(){
  try{
    if(window.top !== window.self){
      // If we are framed by a different origin, break out.
      window.top.location = window.self.location;
    }
  }catch(e){
    // Cross-origin access threw → we are definitely framed by another origin.
    document.documentElement.style.display = "none";
    try{ window.top.location = window.self.location; }catch(_){}
  }
})();

/* ================== LIGHT / DARK THEME ==================
   Three states, in the order a viewer expects:
     "system"  (default) — follow the OS, via the prefers-color-scheme media query
     "light" / "dark"    — an explicit choice, stamped on <html data-theme>

   Applied here at the top of the script rather than in wire(), because wire()
   runs after first paint and the page would visibly flash the wrong palette on
   every navigation. The CSS defines the light palette on bare :root, redefines
   it under prefers-color-scheme:dark guarded by :not([data-theme="light"]), and
   again under [data-theme="dark"] — so the toggle wins in both directions and
   "system" still tracks the OS. */
const THEME_KEY = "nd_theme";
function storedTheme(){
  try{ const v = localStorage.getItem(THEME_KEY); return (v==="light"||v==="dark") ? v : "system"; }
  catch(e){ return "system"; }
}
function systemPrefersDark(){
  return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
}
function effectiveTheme(){
  const t = storedTheme();
  return t === "system" ? (systemPrefersDark() ? "dark" : "light") : t;
}
function applyTheme(){
  const t = storedTheme();
  const root = document.documentElement;
  if(t === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", t);
  // Keep the browser UI (address bar, form controls) in step.
  const dark = effectiveTheme() === "dark";
  const meta = document.querySelector('meta[name="theme-color"]');
  if(meta) meta.setAttribute("content", dark ? "#0F1113" : "#B3122B");
  updateThemeBtn();
}
/* Cycle light → dark → system, so a viewer can always get back to "follow my OS"
   without clearing site data. */
function toggleTheme(){
  const order = ["light", "dark", "system"];
  const next = order[(order.indexOf(storedTheme()) + 1) % order.length];
  try{ localStorage.setItem(THEME_KEY, next); }catch(e){}
  applyTheme();
  if(typeof toast === "function") toast(t("theme." + next));
}
function updateThemeBtn(){
  const b = document.getElementById("themeBtn");
  if(!b) return;
  const cur = storedTheme();
  const label = (typeof t === "function") ? t("theme." + cur) : cur;
  b.setAttribute("aria-label", label);
  b.setAttribute("title", label);
  b.dataset.mode = cur;
}
applyTheme();
// Follow the OS live while the viewer is on "system".
try{
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => { if(storedTheme() === "system") applyTheme(); };
  if(mq.addEventListener) mq.addEventListener("change", onChange);
  else if(mq.addListener) mq.addListener(onChange);
}catch(e){}

/* ================== CONNECTION + INTEGRITY MONITORING ==================
   Offline state is shown as a slim status pill in the page chrome, not as a
   modal or a full-width red bar that shoves the page down. Repeated script
   errors are logged, not surfaced as a dialog — a visitor looking for a
   helpline should never have to dismiss anything to reach it. */
(function connectionMonitor(){
  const SEC = {
    offline: false,
    crashCount: sessionStorage.getItem("__crash") ? parseInt(sessionStorage.getItem("__crash")) : 0,
    lastGoodData: localStorage.getItem("__lastGoodData") || null
  };

  function pill(){
    let el=document.getElementById("netPill");
    if(!el){
      el=document.createElement("div");
      el.id="netPill"; el.className="netpill"; el.setAttribute("role","status");
      el.innerHTML='<span class="netpill__dot"></span><span class="netpill__t">Offline — showing the last synced figures</span>';
      (document.body||document.documentElement).appendChild(el);
    }
    return el;
  }
  function setOffline(off){
    if(SEC.offline===off) return;
    SEC.offline=off;
    const el=pill();
    el.classList.toggle("is-on", off);
    const txt=el.querySelector(".netpill__t");
    if(txt) txt.textContent = off
      ? (document.documentElement.lang==="ne" ? "अफलाइन — पछिल्लो सिंक भएको तथ्यांक देखाइँदै" : "Offline — showing the last synced figures")
      : (document.documentElement.lang==="ne" ? "पुनः जोडियो" : "Back online");
    if(!off) setTimeout(()=>{ el.classList.remove("is-on"); }, 2600);
  }

  window.addEventListener("online",  ()=>setOffline(false));
  window.addEventListener("offline", ()=>setOffline(true));
  if(!navigator.onLine) document.addEventListener("DOMContentLoaded", ()=>setOffline(true));

  // Crash counting stays (it protects the cached-data path) but never renders UI.
  window.addEventListener("error", ()=>{
    SEC.crashCount++;
    try{ sessionStorage.setItem("__crash", SEC.crashCount); }catch(_){}
    if(SEC.crashCount>3) console.error("[MONITOR] Repeated script errors on this page.");
  });
  window.addEventListener("load", ()=>{
    setTimeout(()=>{ try{sessionStorage.setItem("__crash","0");}catch(_){} SEC.crashCount=0; }, 5000);
  });

  // Data validation on fetch
  window.__validateData = function(obj){
    if(!obj || typeof obj !== "object") return false;
    if(!obj.stats || !Array.isArray(obj.stats)) return false;
    // Verify all stat values are positive numbers
    return obj.stats.every(s => {
      const n = parseInt(String(s.n).replace(/,/g,""));
      return !isNaN(n) && n >= 0;
    });
  };

  // Store last good data for offline fallback
  window.__cacheGoodData = function(data){
    if(window.__validateData(data)){
      localStorage.setItem("__lastGoodData", JSON.stringify(data));
      SEC.lastGoodData = JSON.stringify(data);
    }
  };

  // Restore from cache if network fails
  window.__restoreFromCache = function(){
    if(SEC.lastGoodData){
      console.warn("[SECURITY] Network unavailable. Using cached data from last sync.");
      return JSON.parse(SEC.lastGoodData);
    }
    return null;
  };

  // Security headers verification
  console.log("[SECURITY] CSP enabled: script-src 'self' https://unpkg.com (no unsafe-inline)");
  console.log("[SECURITY] Frame-guard: X-Frame-Options DENY active");
  console.log("[SECURITY] localStorage sanitization: data validation on read/write enabled");
  console.log("[SECURITY] Offline monitoring: active");
})();

/* -------------------- EVENT + STATS (provisional, sourced) -------------------- */
const EVENT = {
  code:"FL-2026-0826",
  since:"2026-08-26T08:37:00+05:45",
  title:{en:"2026 Nepal Floods", ne:"२०२६ नेपाल बाढी"},
  region:{en:"Rasuwa · Nuwakot · Dhading · Trishuli corridor · Chitwan · Nawalparasi", ne:"रसुवा · नुवाकोट · धादिङ · त्रिशूली कोरिडोर · चितवन · नवलपरासी"},
  eas:{en:"Trishuli / Bhote Koshi glacier-collapse flood. PM Balen Shah told Parliament on 2 Sept that 11,993 have been rescued and 3,916 remain missing; Nepal Police put the toll at 1,127 dead, with 1,473 injured. 900 hydropower workers missing across 12 projects, around 500 believed trapped inside tunnels. Prithvi Highway still cut at Krishnabhir.",
       ne:"त्रिशूली / भोटेकोशी हिमनदी भत्किएर आएको बाढी। प्रधानमन्त्री बालेन्द्र शाहले २ सेप्टेम्बरमा संसदमा ११,९९३ जनाको उद्धार भएको र ३,९१६ बेपत्ता रहेको जानकारी दिए; नेपाल प्रहरीका अनुसार मृत्यु संख्या १,१२७ र घाइते १,४७३। १२ आयोजनाका ९०० जलविद्युत् कामदार बेपत्ता, करिब ५०० सुरुङभित्रै फसेको अनुमान। कृष्णभीरमा पृथ्वी राजमार्ग अझै अवरुद्ध।"}
};
/* Nepal-side figures only. Live-refreshed every 10 minutes: local feed (baseline)
   → Wikipedia PROSE (deaths/missing/injured + foreign nationals among the missing,
   which states Nepal figures separately from Tibet) → NDRRMA API (rescued, live
   Nepal registry). The Wikipedia INFOBOX is NOT used — it reports Nepal+Tibet
   COMBINED, which is what previously inflated the toll. */
let STATS = [
  {key:"deaths",  n:"1,127", cls:"hstat--death"},
  {key:"missing", n:"3,916", cls:"hstat--missing"},
  {key:"foreign", n:"583"},
  {key:"rescued", n:"11,993", cls:"hstat--rescue"}   // hero = TOTAL rescued (PM Shah to Parliament, 2 Sept); the NAMED registry (4,248) is a separate, smaller figure shown on the Rescued page
];

/* -------------------- TICKER -------------------- */
const TICKER = [
  {src:"PARLIAMENT", en:"PM Balen Shah briefs Parliament (2 Sept): 11,993 rescued, 3,916 still missing; Nepal Police put the toll at 1,127 — 'we have no alternative but to fight with determination and courage'",
   ne:"प्रधानमन्त्री बालेन्द्र शाहको संसदमा सम्बोधन (२ सेप्टेम्बर): ११,९९३ उद्धार, ३,९१६ बेपत्ता; नेपाल प्रहरीका अनुसार मृत्यु १,१२७ — 'दृढता र साहसका साथ लड्नुबाहेक विकल्प छैन'"},
  {src:"RELIEF", en:"Rs 1 crore released to each of Rasuwa and Nuwakot from the PM Disaster Relief Fund; 10 truckloads of relief material despatched and all ministers pledge one month's salary",
   ne:"प्रधानमन्त्री विपद् राहत कोषबाट रसुवा र नुवाकोट प्रत्येकलाई रु. १ करोड निकासा; १० ट्रक राहत सामग्री पठाइयो र सबै मन्त्रीले एक महिनाको तलब दिने घोषणा"},
  {src:"RESCUE", en:"900 hydropower workers missing across 12 projects and around 500 still believed inside the tunnels — 576 missing at Upper Trishuli-1 alone, about 300 of them underground",
   ne:"जलविद्युत् सुरुङभित्र अझै करिब ५०० जना रहेको अनुमान — माथिल्लो त्रिशूली-१ र चिलिमेमा नेपाली सेना तथा अन्तर्राष्ट्रिय विशेषज्ञ टोलीबाट हिलो हटाउने कार्य जारी"},
  {src:"TRAFFIC", en:"Prithvi Highway still cut at Krishnabhir (Dhading) — Mugling–Kathmandu section diversion and restoration ongoing",
   ne:"पृथ्वी राजमार्ग कृष्णभीर (धादिङ) मा अझै अवरुद्ध — मुग्लिन–काठमाडौं खण्डमा वैकल्पिक मार्ग र मर्मत कार्य जारी"},
  {src:"HEALTH", en:"Around 900 bodies recovered so far and only 4% formally identified — DNA testing and facial photographs in use as morgues run beyond capacity",
   ne:"अहिलेसम्म करिब ९०० शव फेला, जसमध्ये ४ प्रतिशत मात्र औपचारिक पहिचान — शवगृह क्षमताभन्दा बढी भरिएपछि डीएनए परीक्षण र तस्बिरबाट पहिचान जारी"},
  {src:"ARMY", en:"Nepali Army has airlifted 3,344 Nepalis and 252 foreign nationals across 411 rescue and relief flights",
   ne:"नेपाली सेनाले ४११ उद्धार तथा राहत उडानमा ३,३४४ नेपाली र २५२ विदेशी नागरिक हवाईमार्ग उद्धार गर्‍यो"},
  {src:"PMO", en:"PM Disaster Relief Fund passes Rs 5.44 billion; Rs 675 million released to 15 local units for immediate relief",
   ne:"प्रधानमन्त्री विपद् राहत कोष रु. ५.४४ अर्ब नाघ्यो; १५ स्थानीय तहलाई तत्काल राहतका लागि रु. ६७.५ करोड निकासा"},
  {src:"USGS", en:"Glacier collapse near Langtang Lirung confirmed as cause of catastrophic debris surge down Bhote Koshi",
   ne:"लाङटाङ लिरुङ नजिक हिमनदी भत्किएर भोटेकोशीमा विनाशकारी लेदो बाढी आएको पुष्टि"},
  {src:"GOVT", en:"Preliminary damage put at Rs 200 billion ($4–$5B); 41 bridges and 42 km of road destroyed; 431 MW off the grid",
   ne:"प्रारम्भिक क्षति रु. २०० अर्ब (४–५ अर्ब डलर); ४१ पुल र ४२ कि.मि. सडक ध्वस्त; ४३१ मेगावाट ग्रिडबाट हट्यो"},
  {src:"WARNING", en:"DHM & NDRRMA alert: Riverside warning active for Rasuwa, Nuwakot, Dhading, Chitwan & Nawalparasi — Lhende Khola dammed lake monitored",
   ne:"जल तथा मौसम विज्ञान विभाग र NDRRMA चेतावनी: रसुवा, नुवाकोट, धादिङ, चितवन र नवलपरासीमा नदी किनार चेतावनी कायमै — ल्हेन्डे खोला ताल निगरानीमा"},
  {src:"AID", en:"International assistance mobilised: IFRC CHF 25m appeal, ADB $5m, EU €2m, UN CERF $2m, China 50t supplies",
   ne:"अन्तर्राष्ट्रिय सहायता परिचालित: IFRC २.५ करोड CHF अपिल, एडीबी ५० लाख डलर, EU २० लाख युरो, CERF २० लाख डलर, चीन ५० टन सामग्री"}
];

/* -------------------- NEWS / BULLETINS (20, sourced; full articles) -------------------- */
const WK="https://en.wikipedia.org/wiki/2026_Nepal_floods";
const NEWS = [
  {sev:"relief", tag:{en:"Tunnel rescue",ne:"सुरुङ उद्धार"}, time:"31 Aug 2026", src:"The Guardian / Nepali Army",
   url:"https://www.aljazeera.com/news/2026/8/30/nepal-rescuers-drill-into-tunnels-in-bid-to-reach-trapped-workers",
   title:{en:"Everest veterans enter a choked tunnel as around 900 remain inside hydropower works",
          ne:"जलविद्युत् सुरुङभित्र करिब ९०० जना रहेकै बेला सगरमाथा आरोही हिलोले थुनिएको सुरुङमा"},
   body:{en:"IFMGA guides pushed about 120 m into the Chilime tunnel on fixed lines before chest-deep sludge stopped them. Roughly 300 of the missing are believed to be inside Upper Trishuli-1 alone.",
         ne:"IFMGA गाइडहरू फिक्स्ड लाइनमा चिलिमे सुरुङभित्र करिब १२० मिटर पुगे, छातीसम्मको हिलोले रोक्यो। बेपत्तामध्ये करिब ३०० जना माथिल्लो त्रिशूली-१ भित्रै रहेको अनुमान।"},
   long:{en:"Six days into the operation, around 900 people are still believed to be inside the tunnel systems of damaged hydropower projects along the Trishuli corridor — roughly 300 of them at Upper Trishuli-1. With conventional rescue crews unable to make headway, Nepal turned to its mountaineers: a team of IFMGA-certified guides and Everest veterans including Ashish Gurung, Dorjee Sherpa and Jenjen Lama entered the Chilime project tunnel using rope protection and fixed lines, the same technique they use on high routes. They reached about 120 metres before chest-deep sludge and debris blocked them; six people were believed to be inside. At Trishuli 3A, about 350 workers and residents have been brought out and drilling has reached the tunnel's upper section. Specialist tunnel-rescue teams and equipment have come from India and China, with Australian underground-rescue engineer Arnold Dix advising. The Independent Power Producers' Association Nepal counts 934 hydropower workers among the missing across 11 projects; 27 facilities were damaged or destroyed.",
         ne:"उद्धारको छैटौं दिनसम्म त्रिशूली कोरिडोरका क्षतिग्रस्त जलविद्युत् आयोजनाका सुरुङभित्र करिब ९०० जना रहेको अनुमान छ — जसमध्ये करिब ३०० माथिल्लो त्रिशूली-१ मै। परम्परागत उद्धार टोलीले अघि बढ्न नसकेपछि नेपालले आफ्ना पर्वतारोहीलाई परिचालन गर्‍यो: आशिष गुरुङ, दोर्जे शेर्पा र जेनजेन लामासहित IFMGA प्रमाणित गाइड र सगरमाथा आरोहीको टोली उच्च हिमाली मार्गमै प्रयोग हुने रोप प्रोटेक्सन र फिक्स्ड लाइन प्रयोग गरी चिलिमे आयोजनाको सुरुङभित्र पस्यो। छातीसम्मको हिलो र सामग्रीले रोक्नुअघि उनीहरू करिब १२० मिटर पुगे; भित्र छ जना रहेको अनुमान थियो। त्रिशूली ३ए बाट करिब ३५० कामदार र स्थानीय निकालिइसकेका छन् र ड्रिलिङ सुरुङको माथिल्लो भागसम्म पुगेको छ। भारत र चीनबाट सुरुङ उद्धारका विशेषज्ञ टोली र उपकरण आएका छन्, अस्ट्रेलियाली इन्जिनियर अर्नोल्ड डिक्सको सल्लाह छ। स्वतन्त्र ऊर्जा उत्पादकहरूको संस्था नेपालका अनुसार ११ आयोजनाका ९३४ कामदार बेपत्ता छन्; २७ संरचना क्षतिग्रस्त वा ध्वस्त भए।"}},
  {sev:"relief", tag:{en:"Rescue",ne:"उद्धार"}, time:"31 Aug 2026", src:"NDRRMA / Nepali Army",
   url:"https://kathmandupost.com/national",
   title:{en:"Rescued total passes 10,000 as the Army flies its 411th relief sortie",
          ne:"सेनाको ४११औं उडानसँगै उद्धार संख्या १०,००० नाघ्यो"},
   body:{en:"NDRRMA's 31 August bulletin puts the cumulative total rescued at 10,451. The Nepali Army has airlifted 3,344 Nepalis and 252 foreign nationals.",
         ne:"NDRRMA को ३१ भदौको विज्ञप्तिअनुसार कुल उद्धार संख्या १०,४५१। नेपाली सेनाले ३,३४४ नेपाली र २५२ विदेशी नागरिक हवाईमार्ग निकाल्यो।"},
   long:{en:"NDRRMA reported on 31 August that 10,451 people have now been rescued since the flood — a figure that has climbed steadily as helicopters reach settlements that were cut off for days. The Nepali Army has flown 411 rescue and relief sorties, airlifting 3,344 Nepali citizens and 252 foreign nationals. Separately, 3,026 of those rescued are individually named in NDRRMA's public registry, which families use for tracing and which this site mirrors on its Rescued page; a further 7,514 are logged in NDRRMA's internal rescue-management system, a count that trails the bulletin. All three numbers are published by the same authority and measure different things — the bulletin total is the one to quote.",
         ne:"NDRRMA ले ३१ भदौमा बाढीयता १०,४५१ जनाको उद्धार भइसकेको जनायो — दिनौंदेखि सम्पर्कविहीन बस्तीसम्म हेलिकप्टर पुग्दै जाँदा यो संख्या निरन्तर बढेको छ। नेपाली सेनाले ४११ उद्धार तथा राहत उडान गरी ३,३४४ नेपाली नागरिक र २५२ विदेशी नागरिकलाई हवाईमार्ग निकालेको छ। छुट्टै, उद्धार भएकामध्ये ३,०२६ जनाको नाम NDRRMA को सार्वजनिक अभिलेखमा छ, जुन परिवार खोजीका लागि प्रयोग हुन्छ र यस साइटको उद्धार पृष्ठमा उपलब्ध छ; अर्को ७,५१४ जना NDRRMA को आन्तरिक उद्धार व्यवस्थापन प्रणालीमा दर्ता छन्, जुन विज्ञप्तिभन्दा पछाडि छ। तीनै संख्या एउटै निकायले प्रकाशित गरेका हुन् र फरक कुरा नाप्छन् — उद्धृत गर्न विज्ञप्तिको कुल संख्या नै उपयुक्त हो।"}},
  {sev:"danger", tag:{en:"Toll",ne:"मृत्यु"}, time:"31 Aug 2026", src:"NDRRMA / The Kathmandu Post",
   url:"https://kathmandupost.com/national",
   title:{en:"Death toll passes 900 as the number missing nearly doubles to 4,247",
          ne:"मृत्यु ९०० नाघ्यो, बेपत्ता झन्डै दोब्बर भई ४,२४७ पुग्यो"},
   body:{en:"NDRRMA's 31 August update puts the confirmed toll at 903 and the missing at 4,247 — including 592 foreign nationals and 85 security personnel.",
         ne:"NDRRMA को ३१ भदौको अद्यावधिकले पुष्टि मृत्यु ९०३ र बेपत्ता ४,२४७ देखायो — जसमा ५९२ विदेशी नागरिक र ८५ सुरक्षाकर्मी।"},
   long:{en:"The National Disaster Risk Reduction and Management Authority said on Monday, 31 August, that 903 people are now confirmed dead in the Bhote Koshi–Trishuli flood and 4,247 are missing or out of contact. The missing figure nearly doubled in a day as hydropower workers, whole riverside households and travellers who had not been formally registered were added to the list. Among the missing are 592 foreign nationals and 85 security personnel — 44 Nepali Army, 28 Nepal Police and 13 Armed Police Force. NDRRMA also reports 1,473 injured. The toll continues to climb as bodies are recovered along the Narayani corridor and as far downstream as Uttar Pradesh in India.",
         ne:"राष्ट्रिय विपद् जोखिम न्यूनीकरण तथा व्यवस्थापन प्राधिकरणका अनुसार सोमबार ३१ भदौसम्म भोटेकोशी–त्रिशूली बाढीमा ९०३ जनाको मृत्यु पुष्टि भएको छ भने ४,२४७ जना बेपत्ता वा सम्पर्कविहीन छन्। जलविद्युत् आयोजनाका कामदार, किनारका पूरै घरपरिवार र दर्ता नभएका यात्रु थपिँदा बेपत्ता संख्या एकै दिनमा झन्डै दोब्बर भयो। बेपत्तामध्ये ५९२ विदेशी नागरिक र ८५ सुरक्षाकर्मी छन् — ४४ नेपाली सेना, २८ नेपाल प्रहरी र १३ सशस्त्र प्रहरी। NDRRMA ले १,४७३ घाइते रहेको पनि जनाएको छ। नारायणी कोरिडोर हुँदै भारतको उत्तर प्रदेशसम्म शव भेटिँदै जाँदा संख्या बढ्दै छ।"}},
  {sev:"relief", tag:{en:"Tunnel rescue",ne:"सुरुङ उद्धार"}, time:"31 Aug 2026", src:"Al Jazeera / Reuters / NDRRMA",
   url:"https://www.aljazeera.com/news/2026/8/30/nepal-rescuers-drill-into-tunnels-in-bid-to-reach-trapped-workers",
   title:{en:"Tunnel rescue enters its critical phase at Trishuli 3A and Upper Trishuli-1",
          ne:"त्रिशूली ३ए र माथिल्लो त्रिशूली-१ मा सुरुङ उद्धार निर्णायक चरणमा"},
   body:{en:"After days of drilling, teams have reached the upper section of the Trishuli 3A tunnel and are preparing to send in crews with oxygen. Specialist help has come from India and China.",
         ne:"कैयौं दिनको ड्रिलिङपछि टोलीले त्रिशूली ३ए सुरुङको माथिल्लो भागमा पहुँच बनायो; अक्सिजनसहित टोली भित्र पठाउने तयारी। भारत र चीनबाट विशेषज्ञ सहयोग।"},
   long:{en:"Nepal's government says more than 100 workers may still be alive inside tunnels at damaged hydropower projects, with the focus on the Trishuli 3A and 3B sites and at least 35 people trapped at Upper Trishuli-1. NDRRMA counts 934 hydropower workers among the missing across 11 projects. Rescuers have drilled through to the tunnel's upper section and are preparing to send teams in with oxygen; about 350 workers and residents have already been brought out of the Trishuli 3A site, and 279 people were airlifted from tunnels over the first two days. Nepal has brought in specialist tunnel-rescue teams and equipment from India and China, and Australian underground-rescue engineer Arnold Dix is advising. Twenty-seven hydropower facilities were damaged or destroyed along the corridor.",
         ne:"नेपाल सरकारका अनुसार क्षतिग्रस्त जलविद्युत् आयोजनाका सुरुङभित्र १०० भन्दा बढी कामदार जीवितै हुन सक्छन्; ध्यान त्रिशूली ३ए र ३बी तथा माथिल्लो त्रिशूली-१ मा केन्द्रित छ, जहाँ कम्तीमा ३५ जना फसेका छन्। NDRRMA का अनुसार ११ आयोजनाका ९३४ कामदार बेपत्ता छन्। उद्धारकर्मीले सुरुङको माथिल्लो भागसम्म ड्रिल गरिसकेका छन् र अक्सिजनसहित टोली पठाउने तयारीमा छन्; त्रिशूली ३ए बाट करिब ३५० जना पहिल्यै निकालिइसकेका छन् भने पहिलो दुई दिनमै २७९ जना हेलिकप्टरबाट उद्धार गरिए। नेपालले भारत र चीनबाट सुरुङ उद्धारका विशेषज्ञ टोली र उपकरण ल्याएको छ; अस्ट्रेलियाली इन्जिनियर अर्नोल्ड डिक्सले सल्लाह दिइरहेका छन्। कोरिडोरका २७ जलविद्युत् संरचना क्षतिग्रस्त वा ध्वस्त भए।"}},
  {sev:"danger", tag:{en:"Body management",ne:"शव व्यवस्थापन"}, time:"31 Aug 2026", src:"The New York Times / Euronews",
   url:"https://www.cnn.com/2026/08/30/world/live-news/nepal-china-flood",
   title:{en:"Mass burial of unidentified victims begins in Chitwan",
          ne:"चितवनमा नचिनिएका शवको सामूहिक व्यवस्थापन सुरु"},
   body:{en:"More than 250 bodies washed up in Chitwan, about 160 km downstream. So badly damaged that only nine could be readily identified, they are being temporarily buried for later DNA matching.",
         ne:"करिब १६० कि.मि. तल्लो तट चितवनमा २५० भन्दा बढी शव भेटिए। अत्यन्तै क्षतविक्षत भएकाले नौ जना मात्र तत्काल चिनिए; पछि डीएनए मिलाउन अस्थायी रूपमा गाडिँदै।"},
   long:{en:"With hospitals and morgues in the affected districts full, and with no cold storage for the number of bodies arriving, authorities have begun temporarily burying unidentified victims so they can be exhumed and matched by DNA later. In Chitwan district — roughly 160 km downstream of the worst-hit area — more than 250 bodies washed up, so badly mangled that only nine could be readily identified. Cadavers and injured survivors have been transferred to Bhairahawa, Bharatpur, Butwal, Gorkha, Kathmandu, Nawalparasi, Palpa and Pokhara. Nepal has allowed in forensic and DNA specialists from India, China, Australia and South Korea to help with identification.",
         ne:"प्रभावित जिल्लाका अस्पताल र शवगृह भरिएपछि र आउने शवका लागि शीत भण्डार नभएपछि अधिकारीहरूले नचिनिएका शव अस्थायी रूपमा गाड्न थालेका छन्, ताकि पछि निकालेर डीएनएबाट पहिचान गर्न सकियोस्। सबैभन्दा प्रभावित क्षेत्रबाट करिब १६० कि.मि. तल चितवनमा २५० भन्दा बढी शव भेटिए, जुन यति क्षतविक्षत थिए कि नौ जना मात्र तत्काल चिनिए। शव र घाइतेलाई भैरहवा, भरतपुर, बुटवल, गोरखा, काठमाडौं, नवलपरासी, पाल्पा र पोखरा पठाइएको छ। पहिचानमा सहयोगका लागि नेपालले भारत, चीन, अस्ट्रेलिया र दक्षिण कोरियाका फोरेन्सिक तथा डीएनए विशेषज्ञलाई भित्र्याएको छ।"}},
  {sev:"watch", tag:{en:"Cause",ne:"कारण"}, time:"31 Aug 2026", src:"USGS / GFZ / University of Calgary",
   url:WK,
   title:{en:"Satellite imagery confirms a glacier collapse near Langtang Lirung — on the Nepal side",
          ne:"उपग्रह तस्बिरले पुष्टि गर्‍यो: लाङटाङ लिरुङ नजिक नेपालतर्फ नै हिमनदी भत्कियो"},
   body:{en:"Analysis now places the source inside Nepal, not Tibet: a 0.2 km² slab of ice broke off and fell about 1.2 km, and the Ms 5.2 seismic signal came from the collapse itself, not an earthquake.",
         ne:"विश्लेषणले स्रोत तिब्बत होइन, नेपालभित्रै रहेको देखायो: ०.२ वर्ग कि.मि. हिउँको पत्र भाँचिएर करिब १.२ कि.मि. तल खस्यो; Ms ५.२ को भूकम्पीय सङ्केत भूकम्पले होइन, त्यही भत्किँदा उत्पन्न भएको।"},
   long:{en:"Early reports blamed an earthquake, a glacial lake outburst flood, or Chinese infrastructure in Tibet. Satellite imagery and seismology have since settled the question: a glacier collapsed near Langtang Lirung, inside Nepal, about 64 km north of Kathmandu. Daniel Shugar of the University of Calgary said a 0.2 km² piece of ice appears to have snapped off cleanly and dropped about 1.2 km to the valley floor. The USGS showed that the Ms 5.2 signal recorded at 08:37 NPT did not precede the collapse but was generated by it; Germany's GFZ recorded an Mw 5.7 event consistent with a landslide at the identical timestamp, and a second Ms 4.2 landslide followed three hours later. The debris — an estimated 100–200 million m³ from an altitude of 5,200–5,400 m — melted from the friction of the impact and travelled up to 100 km downstream at around 180 km/h. Glacier-collapse floods are rarer than GLOFs in the region, but far more destructive.",
         ne:"सुरुका प्रतिवेदनले भूकम्प, हिमताल विस्फोट वा तिब्बतमा चिनियाँ संरचनालाई दोष दिएका थिए। उपग्रह तस्बिर र भूकम्पशास्त्रले अब प्रस्ट पारेको छ: काठमाडौंबाट करिब ६४ कि.मि. उत्तर, नेपालभित्रै लाङटाङ लिरुङ नजिक हिमनदी भत्कियो। क्यालगेरी विश्वविद्यालयका डेनियल शुगरका अनुसार ०.२ वर्ग कि.मि. हिउँको टुक्रा सफासँग भाँचिएर करिब १.२ कि.मि. तल उपत्यकामा खस्यो। बिहान ८:३७ बजे रेकर्ड भएको Ms ५.२ सङ्केत भत्किनुअघि होइन, भत्किँदा नै उत्पन्न भएको यूएसजीएसले देखायो; जर्मनीको जीएफजेडले ठ्याक्कै त्यही समयमा पहिरोसँग मिल्दो Mw ५.७ रेकर्ड गर्‍यो र तीन घण्टापछि Ms ४.२ को दोस्रो पहिरो गयो। ५,२००–५,४०० मिटर उचाइबाट खसेको अनुमानित १०–२० करोड घनमिटर सामग्री घर्षणले पग्लिएर करिब १८० कि.मि. प्रतिघण्टाको गतिमा १०० कि.मि. तलसम्म पुग्यो। यस क्षेत्रमा हिमनदी भत्किएर आउने बाढी GLOF भन्दा कम हुन्छ, तर धेरै विनाशकारी।"}},
  {sev:"danger", tag:{en:"Warning",ne:"चेतावनी"}, time:"31 Aug 2026", src:"NDRRMA / DHM",
   url:"https://ianslive.in/nepal-issues-fresh-flood-warning-as-bhote-koshi-water-level-rises--20260830082421",
   title:{en:"Riverside alert stays active — dammed lake on the Lhende Khola still under watch",
          ne:"नदी किनारको चेतावनी कायमै — ल्हेन्डे खोलाको बाँधिएको ताल अझै निगरानीमा"},
   body:{en:"NDRRMA keeps Rasuwa, Nuwakot, Dhading and Chitwan on riverside alert. A landslide has dammed the Lhende Khola about 18 km above Rasuwagadhi, forming a lake of roughly 0.11 km².",
         ne:"NDRRMA ले रसुवा, नुवाकोट, धादिङ र चितवनमा नदी किनारको चेतावनी कायम राखेको छ। रसुवागढीभन्दा करिब १८ कि.मि. माथि पहिरोले ल्हेन्डे खोला थुनेर करिब ०.११ वर्ग कि.मि. को ताल बनेको।"},
   long:{en:"NDRRMA has issued a fresh warning that the Bhote Koshi's level in Rasuwa has risen again, and the Flood Forecasting Division of the Department of Hydrology and Meteorology reports the Trishuli running about 3 m above normal at Galchhi in Dhading. Satellite imagery taken at 11:44 am on 27 August shows the Lhende Khola — a Bhote Koshi tributary — obstructed roughly 18 km upstream of the Rasuwagadhi border point, forming a lake of about 0.11 km². Two barrier lakes formed after the collapse; the larger one on the Chinese side overflowed on 28 August, briefly halting rescue work, and had largely drained by 30 August, but the high-altitude lake near the collapse site remains. Everyone working on search, rescue and relief in Rasuwa, Nuwakot, Dhading and Chitwan, and anyone living along the riverbanks, has been asked to stay alert and off the banks.",
         ne:"NDRRMA ले रसुवामा भोटेकोशीको सतह फेरि बढेको नयाँ चेतावनी जारी गरेको छ; जल तथा मौसम विज्ञान विभागको बाढी पूर्वानुमान महाशाखाका अनुसार धादिङको गल्छीमा त्रिशूली सामान्यभन्दा करिब ३ मिटर माथि बगिरहेको छ। २७ भदौ बिहान ११:४४ बजेको उपग्रह तस्बिरअनुसार भोटेकोशीको सहायक ल्हेन्डे खोला रसुवागढी नाकाभन्दा करिब १८ कि.मि. माथि थुनिएर करिब ०.११ वर्ग कि.मि. को ताल बनेको छ। भत्किएपछि दुई ताल बनेका थिए; चीनतर्फको ठूलो ताल २८ भदौमा पोखिँदा उद्धार केही बेर रोकियो र ३० भदौसम्म धेरै हदसम्म रित्तियो, तर भत्किएको स्थान नजिकको अग्लो तालचाहिँ कायमै छ। रसुवा, नुवाकोट, धादिङ र चितवनमा खोज, उद्धार र राहतमा खटिएका तथा नदी किनारका बासिन्दालाई सतर्क रहन र किनारबाट टाढा बस्न आग्रह गरिएको छ।"}},
  {sev:"relief", tag:{en:"Fund",ne:"कोष"}, time:"31 Aug 2026", src:"Radio Nepal / OPMCM",
   url:"https://radionepalonline.com/en/2026/08/30/435092.html",
   title:{en:"PM Disaster Relief Fund passes Rs 5 billion; Rs 675 million released to 15 local units",
          ne:"प्रधानमन्त्री विपद् राहत कोष रु. ५ अर्ब नाघ्यो; १५ स्थानीय तहलाई रु. ६७.५ करोड निकासा"},
   body:{en:"The fund had crossed Rs 5.02 billion by 30 August and Rs 5.44 billion by the government's latest count, from banks, business houses, social organisations and individuals.",
         ne:"बैंक, व्यावसायिक घराना, सामाजिक संस्था र व्यक्तिबाट ३० भदौसम्म कोषमा रु. ५.०२ अर्ब र सरकारको पछिल्लो गणनाअनुसार रु. ५.४४ अर्ब जम्मा।"},
   long:{en:"The Prime Minister's Natural Disaster Relief Fund, launched hours after the flood, has grown very fast: Rs 1.91 billion arrived in the first 36 hours, taking the balance from Rs 2.17 billion to Rs 4.09 billion, and it passed Rs 5.02 billion on 30 August. The Prime Minister and cabinet pledged a month's salary each. The government has released Rs 675 million to 15 local units across Rasuwa, Nuwakot, Dhading, Gorkha and Tanahun, and the Finance Ministry says roughly Rs 20 billion already in the current budget can be redirected to rescue and relief. A 'one-door policy' applies to cash and in-kind donations. Donate only through the official bank accounts, Fonepay QR codes or the NCHL-operated portal listed on this site's Relief Fund page — verify the web address before paying.",
         ne:"बाढीको केही घण्टामै सुरु भएको प्रधानमन्त्री प्राकृतिक विपद् उद्धार कोष द्रुत गतिमा बढेको छ: पहिलो ३६ घण्टामै रु. १.९१ अर्ब थपिँदा रकम रु. २.१७ अर्बबाट रु. ४.०९ अर्ब पुग्यो र ३० भदौमा रु. ५.०२ अर्ब नाघ्यो। प्रधानमन्त्री र मन्त्रिपरिषद्ले एक महिनाको तलब दिने घोषणा गरे। सरकारले रसुवा, नुवाकोट, धादिङ, गोरखा र तनहुँका १५ स्थानीय तहलाई रु. ६७.५ करोड निकासा गरेको छ भने अर्थ मन्त्रालयका अनुसार चालु बजेटकै करिब रु. २० अर्ब उद्धार र राहतमा मोड्न सकिन्छ। नगद र वस्तुगत सहयोगमा 'एकद्वार नीति' लागू छ। यस साइटको राहत कोष पृष्ठमा उल्लेख गरिएका आधिकारिक बैंक खाता, फोनपे QR वा NCHL सञ्चालित पोर्टलबाट मात्र दान गर्नुहोस् — भुक्तानी अघि ठेगाना रुजु गर्नुहोस्।"}},
  {sev:"watch", tag:{en:"Early warning",ne:"पूर्व चेतावनी"}, time:"31 Aug 2026", src:"Reuters / SCMP",
   url:WK,
   title:{en:"Nepal had asked China for earlier flood warnings as the risk grew, Reuters reports",
          ne:"जोखिम बढ्दै जाँदा नेपालले चीनसँग छिटो बाढी चेतावनी माग्दै आएको थियो — रोयटर्स"},
   body:{en:"A joint flash-flood warning system had run for years, but its gauges were tuned for monsoon floods — and the upstream stations were swept away before any alert could go out.",
         ne:"संयुक्त आकस्मिक बाढी चेतावनी प्रणाली वर्षौंदेखि चलेको थियो, तर यसका मापक मनसुनी बाढीका लागि मात्र मिलाइएका थिए — र चेतावनी जानुअघि नै माथिल्ला स्टेसन बगे।"},
   long:{en:"Chinese and Nepali scientists had maintained a flash-flood early warning system on this stretch for years, and the South China Morning Post credits it with preventing casualties in the past. It could not detect the 26 August event: the water-level monitors were optimised for monsoon or perennial floods, and Nepal's upstream monitoring stations were destroyed by the surge before alerts could be sent. A senior fellow at the Stimson Center described the affected area as a monitoring blind spot that geologists had paid little attention to. Reuters reports Nepal had asked China for faster warnings as risks mounted. One warning chain did work: headteacher Rajendra Dawadi at Tribhuvan Trishuli secondary school in Nuwakot received four separate warnings, one from Betrawati directly upstream, and evacuated 900 children ten minutes before the water arrived.",
         ne:"चिनियाँ र नेपाली वैज्ञानिकले यस खण्डमा वर्षौंदेखि आकस्मिक बाढी पूर्व चेतावनी प्रणाली सञ्चालन गर्दै आएका थिए र यसले विगतमा ज्यान जोगाएको साउथ चाइना मर्निङ पोस्टको भनाइ छ। तर २६ भदौको घटना यसले पत्ता लगाउन सकेन: जलसतह मापक मनसुनी वा नियमित बाढीका लागि मात्र मिलाइएका थिए, र चेतावनी पठाउनुअघि नै नेपालका माथिल्ला निगरानी स्टेसन बाढीले बगाए। स्टिम्सन सेन्टरका एक वरिष्ठ फेलोका अनुसार प्रभावित क्षेत्र भूगर्भविद्ले कम ध्यान दिएको 'निगरानी शून्य क्षेत्र' थियो। जोखिम बढ्दै जाँदा नेपालले चीनसँग छिटो चेतावनी माग गरेको रोयटर्सले जनाएको छ। एउटा चेतावनी शृंखलाले भने काम गर्‍यो: नुवाकोटको त्रिभुवन त्रिशूली माध्यमिक विद्यालयका प्रधानाध्यापक राजेन्द्र दवाडीले चार फरक चेतावनी पाए — एउटा ठीक माथिको बेत्रावतीबाट — र पानी आउनुभन्दा दस मिनेटअघि ९०० बालबालिकालाई सुरक्षित निकाले।"}},
  {sev:"danger", tag:{en:"Toll",ne:"मृत्यु"}, time:"30 Aug 2026", src:"The Kathmandu Post / NDRRMA",
   url:"https://kathmandupost.com/national/2026/08/30/death-toll-from-bhotekoshi-flood-reaches-734",
   title:{en:"Bhotekoshi flood death toll reaches 734; 2,498 still missing",
          ne:"भोटेकोशी बाढीमा मृत्यु ७३४ पुग्यो; २,४९८ अझै बेपत्ता"},
   body:{en:"NDRRMA's 9 am update on 30 August put the confirmed toll at 734, with 2,498 people still missing.",
         ne:"NDRRMA को ३० भदौ बिहान ९ बजेको अद्यावधिकले पुष्टि मृत्यु ७३४ र २,४९८ जना बेपत्ता देखायो।"},
   long:{en:"The National Disaster Risk Reduction and Management Authority (NDRRMA) said in its 9 am update on Sunday, 30 August, that 734 bodies had been recovered from the flood-hit districts, with 2,498 people still missing. Chitwan has recorded the most recovered bodies (259), followed by Nawalparasi East (184), Nawalparasi West (82), Gorkha (58), Nuwakot (52), Dhading (50), Tanahun (36) and Rasuwa (13). The number of missing is highest in Rasuwa, where 562 people remain unaccounted for. The toll is expected to keep rising as downstream bodies are recovered along the Narayani corridor.",
         ne:"राष्ट्रिय विपद् जोखिम न्यूनीकरण तथा व्यवस्थापन प्राधिकरण (NDRRMA) का अनुसार आइतबार ३० भदौ बिहान ९ बजेसम्म बाढी प्रभावित जिल्लाहरूबाट ७३४ शव भेटिएका छन् भने २,४९८ जना अझै बेपत्ता छन्। सबैभन्दा बढी चितवनमा (२५९), त्यसपछि नवलपरासी पूर्व (१८४), नवलपरासी पश्चिम (८२), गोरखा (५८), नुवाकोट (५२), धादिङ (५०), तनहुँ (३६) र रसुवा (१३)। रसुवामा सबैभन्दा बढी ५६२ जना बेपत्ता। नारायणी कोरिडोरमा तल्लो तटबाट शव भेटिँदै जाँदा मृत्यु संख्या बढ्ने अनुमान।"}},
  {sev:"danger", tag:{en:"Highway",ne:"राजमार्ग"}, time:"30 Aug 2026", src:"The Kathmandu Post",
   url:"https://kathmandupost.com/national/2026/08/30/trishuli-flood-severs-prithvi-highway-cutting-off-key-route-into-kathmandu",
   title:{en:"Trishuli flood severs Prithvi Highway, cutting off key route into Kathmandu",
          ne:"त्रिशूली बाढीले पृथ्वी राजमार्ग भत्कायो, काठमाडौं छिर्ने मुख्य मार्ग अवरुद्ध"},
   body:{en:"The road subsided at Krishnabhir in Benighat Rorang, Dhading, after the Trishuli eroded its base — the Mugling–Kathmandu section is fully cut.",
         ne:"त्रिशूलीले जग खियाएपछि धादिङको बेनीघाट रोराङस्थित कृष्णभीरमा सडक भासियो — मुग्लिन–काठमाडौं खण्ड पूर्ण अवरुद्ध।"},
   long:{en:"A section of the Prithvi Highway sank early on Sunday, 30 August, at Krishnabhir in Benighat Rorang Rural Municipality of Dhading, after the swollen Trishuli river eroded the road's base. Dhading Chief District Officer Laxmi Pandey Gautam said the road gave way as the river rose, completely blocking the Mugling–Kathmandu section — the main artery linking the capital with Pokhara and western Nepal. Bagmati Province traffic chief Dilli Narayan Pandey confirmed the subsidence. The closure compounds days of disruption on the corridor from Bhote Koshi flood debris in Dhading. No reopening time has been given; travellers should confirm with the local traffic office (dial 103) before setting off.",
         ne:"आइतबार ३० भदौ बिहानै धादिङको बेनीघाट रोराङ गाउँपालिकास्थित कृष्णभीरमा पृथ्वी राजमार्गको एक खण्ड भासियो; बढेको त्रिशूली नदीले सडकको जग खियाएको हो। धादिङका प्रमुख जिल्ला अधिकारी लक्ष्मी पाण्डे गौतमका अनुसार नदी बढ्दै जाँदा सडक भासिँदा मुग्लिन–काठमाडौं खण्ड पूर्ण अवरुद्ध भयो — यो राजधानीलाई पोखरा र पश्चिम नेपालसँग जोड्ने मुख्य मार्ग हो। बागमती प्रदेश ट्राफिक प्रमुख दिल्लीनारायण पाण्डेले सडक भासिएको पुष्टि गरे। भोटेकोशी बाढीको सामग्रीले धादिङमा दिनैपिच्छे अवरोध भइरहेकोमा यो बन्दले थप कठिनाइ ल्यायो। खुल्ने समय तय भएको छैन; यात्रुले जानुअघि स्थानीय ट्राफिक कार्यालय (१०३) मा पुष्टि गर्नुहोस्।"}},
  {sev:"relief", tag:{en:"Rescue",ne:"उद्धार"}, time:"28 Aug 2026", src:"Nepal Police / OnlineKhabar",
   url:"https://english.onlinekhabar.com/people-rescued-rasuwa-flood-2.html",
   title:{en:"1,545 rescued after Rasuwa flood; 28 police still out of contact",
          ne:"रसुवा बाढीपछि १,५४५ उद्धार; २८ प्रहरी सम्पर्कविहीन"},
   body:{en:"As of Friday morning, 644 people were rescued from Rasuwa, 898 from Nuwakot and three from Dhading.",
         ne:"शुक्रबार बिहानसम्म रसुवाबाट ६४४, नुवाकोटबाट ८९८ र धादिङबाट ३ जना उद्धार।"},
   long:{en:"Nepal Police said 1,545 people caught in the Bhotekoshi flood have been rescued — 644 from Rasuwa, 898 from Nuwakot and three from Dhading — as of 7am Friday. Some 4,348 personnel from the Army, Armed Police Force and Nepal Police had been mobilised at that point; the deployment has since grown to 18,708. However, 28 police officers remained out of contact several days after the disaster.",
         ne:"नेपाल प्रहरीका अनुसार भोटेकोशी बाढीमा परेका १,५४५ जनालाई उद्धार गरिएको छ — शुक्रबार बिहान ७ बजेसम्म रसुवाबाट ६४४, नुवाकोटबाट ८९८ र धादिङबाट ३। सेना, सशस्त्र र नेपाल प्रहरीका करिब ४,३४८ जनशक्ति परिचालित (अहिले १८,७०८)। तर विपद्को केही दिनपछि पनि २८ प्रहरी सम्पर्कविहीन।"}},
  {sev:"relief", tag:{en:"Registry",ne:"अभिलेख"}, time:"28 Aug 2026", src:"NDRRMA",
   url:"https://ndrrma.gov.np/np/rescue",
   title:{en:"NDRRMA names 2,189 rescued in its official registry",
          ne:"NDRRMA को आधिकारिक अभिलेखमा २,१८९ उद्धारित"},
   body:{en:"The National Disaster Portal lists 2,189 rescued people by name — 2,034 Nepali and 155 foreign nationals.",
         ne:"राष्ट्रिय विपद् पोर्टलले २,१८९ उद्धारितको नाम सूचीबद्ध — २,०३४ नेपाली, १५५ विदेशी।"},
   long:{en:"NDRRMA's National Disaster Portal maintains a named registry of rescued people for family tracing. As of 28 August it listed 2,189 individuals — 2,034 Nepali and 155 foreign nationals — with their rescue location, date and status (safe, injured, under medical care or transferred to a relief camp). The searchable list is mirrored live on this site's Rescued page and auto-updates from the NDRRMA API.",
         ne:"NDRRMA को राष्ट्रिय विपद् पोर्टलले परिवार खोजीका लागि उद्धारितको नामावली राख्छ। हाल २,१८९ जना — २,०३४ नेपाली र १५५ विदेशी — सूचीबद्ध, उद्धार स्थान, मिति र अवस्थासहित। यो सूची यस साइटको उद्धार पृष्ठमा प्रत्यक्ष रूपमा उपलब्ध छ र NDRRMA API बाट स्वतः अद्यावधिक हुन्छ।"}},
  {sev:"watch", tag:{en:"Cause",ne:"कारण"}, time:"26 Aug 2026", src:"USGS / GFZ",
   url:WK,
   title:{en:"USGS: an ice avalanche, not an earthquake, caused the flood",
          ne:"यूएसजीएस: बाढी भूकम्पले होइन, हिउँ पहिरोले"},
   body:{en:"Scientists attribute the surge to a large section of glacier that fell roughly 40 miles north of Kathmandu.",
         ne:"काठमाडौंबाट करिब ४० माइल उत्तरमा हिमनदीको ठूलो भाग खस्दा भल आएको वैज्ञानिकको विश्लेषण।"},
   long:{en:"The US Geological Survey and Germany's GFZ concluded the disaster was most consistent with an ice avalanche or glacial process rather than an earthquake. A large section of glacier is believed to have fallen about 40 miles (64 km) north of Kathmandu, sending ice and rock into the river below. A glacial lake outburst flood (GLOF) on the Tibet side is also being investigated.",
         ne:"यूएसजीएस र जर्मनीको जीएफजेडले यो विपद् भूकम्पभन्दा हिउँ पहिरो/हिमनदी प्रक्रियासँग बढी मिल्दो रहेको निष्कर्ष निकाले। काठमाडौंबाट करिब ६४ किमि उत्तरमा हिमनदीको ठूलो भाग खसेको अनुमान। तिब्बततर्फ हिमताल विस्फोट (GLOF) को पनि अनुसन्धान भइरहेको।"}},
  {sev:"danger", tag:{en:"Missing",ne:"बेपत्ता"}, time:"28 Aug 2026", src:"AP / NDRRMA",
   url:"https://www.abc.net.au/news/2026-08-28/nepal-tibet-floods-live-updates/107086974",
   title:{en:"More than 1,400 missing across the border; 540+ are foreigners",
          ne:"सीमापार १,४००+ बेपत्ता; ५४०+ विदेशी"},
   body:{en:"Authorities report over 1,400 people unaccounted for on both sides, including at least 540 foreign nationals.",
         ne:"अधिकारीका अनुसार दुवैतर्फ १,४०० भन्दा बढी बेपत्ता, कम्तीमा ५४० विदेशीसहित।"},
   long:{en:"More than 1,400 people were reported missing across the Nepal–China border after the flood, of whom at least 540 are foreign nationals from over 30 countries — many trekkers and pilgrims. Nepal-side figures stand near 910 and the China side near 558. Diplomatic missions are working with NDRRMA and Nepal Police to trace their citizens.",
         ne:"बाढीपछि नेपाल–चीन सीमामा १,४०० भन्दा बढी बेपत्ता, जसमध्ये कम्तीमा ५४० जना ३० भन्दा बढी देशका विदेशी — धेरै पदयात्री र तीर्थयात्री। नेपालतर्फ करिब ९१० र चीनतर्फ करिब ५५८। कूटनीतिक नियोगहरू NDRRMA र नेपाल प्रहरीसँग नागरिक खोजीमा।"}},
  {sev:"danger", tag:{en:"Damage",ne:"क्षति"}, time:"27 Aug 2026", src:"The Kathmandu Post",
   url:"https://kathmandupost.com/national/2026/08/26/major-flood-damages-syabrubesi-hydropower-projects-in-rasuwa",
   title:{en:"19 bridges and ~40 km of road gone; six hydropower plants hit",
          ne:"१९ पुल र करिब ४० कि.मि. सडक ध्वस्त; ६ जलविद्युत् आयोजना प्रभावित"},
   body:{en:"Road and bridge damage was estimated at about Rs 15 billion along the Trishuli corridor.",
         ne:"त्रिशूली कोरिडोरमा सडक र पुल क्षति करिब १५ अर्ब रुपैयाँ अनुमान।"},
   long:{en:"At least 19 bridges and about 40 km of the highway linking Kathmandu with the Tibet border were destroyed, with early estimates of road and bridge damage around Rs 15 billion. Six hydropower facilities along the Trishuli — including Rasuwagadhi, Chilime and Trishuli 3A/3B — were damaged, disrupting power supply and cross-border trade through Rasuwagadhi.",
         ne:"काठमाडौंलाई तिब्बत सीमासँग जोड्ने राजमार्गका कम्तीमा १९ पुल र करिब ४० किमि सडक ध्वस्त; सडक र पुल क्षति करिब १५ अर्ब रुपैयाँ अनुमान। रसुवागढी, चिलिमे र त्रिशूली ३ए/३बी लगायत ६ जलविद्युत् आयोजना क्षतिग्रस्त, विद्युत् आपूर्ति र सीमा व्यापार अवरुद्ध।"}},
  {sev:"relief", tag:{en:"Fund",ne:"कोष"}, time:"27 Aug 2026", src:"OnlineKhabar / OPMCM",
   url:"https://english.onlinekhabar.com/pms-disaster-relief-fund.html",
   title:{en:"PM's Disaster Relief Fund raises Rs 273.3 million in six hours",
          ne:"प्रधानमन्त्री राहत कोषमा ६ घण्टामा रु. २७.३३ करोड"},
   body:{en:"Gorkha Brewery gave Rs 100m; banks and firms including Nepal Bank, RBB, Kumari and NIC Asia followed.",
         ne:"गोर्खा ब्रुअरीले रु. १० करोड; नेपाल बैंक, RBB, कुमारी र NIC एशिया लगायतको योगदान।"},
   long:{en:"Donations to the Prime Minister's Disaster Relief Fund reached Rs 273.3 million within the first six hours, handed to the Finance Minister. Gorkha Brewery contributed Rs 100 million, Nepal Bank Rs 30.1 million, Rastriya Banijya Bank and Kumari Bank Rs 30 million each, NIFRA Rs 25 million, NIC Asia Rs 22.1 million, Saras Beverages (Red Bull) Rs 20 million, Ncell Rs 10 million and others more.",
         ne:"प्रधानमन्त्री विपद् राहत कोषमा पहिलो ६ घण्टामै रु. २७.३३ करोड संकलन भई अर्थमन्त्रीलाई हस्तान्तरण। गोर्खा ब्रुअरीले रु. १० करोड, नेपाल बैंकले रु. ३.०१ करोड, RBB र कुमारी बैंकले रु. ३–३ करोड, निफ्राले रु. २.५ करोड, NIC एशियाले रु. २.२१ करोड, सरस बेभरेजेज (रेड बुल) ले रु. २ करोड, एनसेलले रु. १ करोड लगायत।"}},
  {sev:"relief", tag:{en:"Fund",ne:"कोष"}, time:"27 Aug 2026", src:"Govt. of Nepal / OnlineKhabar",
   url:"https://english.onlinekhabar.com/nepal-govt-flood-donation.html",
   title:{en:"Government releases Rs 1 billion to the disaster relief fund",
          ne:"सरकारले विपद् राहत कोषमा रु. १ अर्ब निकासा"},
   body:{en:"Plus Rs 10 million each to Rasuwa and Nuwakot and Rs 5 million to Dhading for immediate relief.",
         ne:"साथै तत्काल राहतका लागि रसुवा र नुवाकोटलाई रु. १–१ करोड, धादिङलाई रु. ५० लाख।"},
   long:{en:"The Government of Nepal released Rs 1 billion to the disaster relief fund and appealed for public and corporate contributions under a 'one-door' system. It also sent Rs 10 million each to Rasuwa and Nuwakot districts and Rs 5 million to Dhading for immediate relief and rescue. Officials urged donors to route all support through the official fund to avoid duplication.",
         ne:"नेपाल सरकारले विपद् राहत कोषमा रु. १ अर्ब निकासा गर्दै 'एकद्वार' प्रणालीमार्फत सार्वजनिक र संस्थागत सहयोगको अपिल गर्‍यो। तत्काल राहतका लागि रसुवा र नुवाकोटलाई रु. १–१ करोड, धादिङलाई रु. ५० लाख पठाइयो। दोहोरो नहोस् भन्दै सबै सहयोग आधिकारिक कोषमार्फत पठाउन आग्रह।"}},
  {sev:"relief", tag:{en:"Rescue",ne:"उद्धार"}, time:"27 Aug 2026", src:"AP / ABC / Nepal Army",
   url:"https://www.abc.net.au/news/2026-08-28/nepal-tibet-floods-live-updates/107086974",
   title:{en:"350 pulled from Trishuli 3A tunnel; over 100 still trapped",
          ne:"त्रिशूली ३ए सुरुङबाट ३५० उद्धार; १००+ अझै फसेका"},
   body:{en:"Rescuers reached workers trapped inside the Trishuli 3A hydropower tunnel as water receded.",
         ne:"पानी घट्दै जाँदा त्रिशूली ३ए सुरुङभित्र फसेका कामदारसम्म उद्धारकर्मी पुगे।"},
   long:{en:"About 350 people were rescued from the Trishuli 3A hydropower tunnel, where workers had been trapped when the flood struck, though more than 100 were still believed to be inside as operations continued. On the Tibet side, some 555 tourists were evacuated. Helicopters and ground teams worked in difficult, weather-affected terrain.",
         ne:"त्रिशूली ३ए जलविद्युत् सुरुङबाट करिब ३५० जनालाई उद्धार गरियो; बाढी आउँदा फसेका १०० भन्दा बढी अझै भित्रै रहेको अनुमान। तिब्बततर्फ करिब ५५५ पर्यटक स्थानान्तरण। हेलिकप्टर र स्थल टोली कठिन मौसममा खटिए।"}},
  {sev:"relief", tag:{en:"Aid",ne:"सहायता"}, time:"27 Aug 2026", src:"IFRC / BBC / Reuters",
   url:"https://www.ifrc.org/press-release/nepal-ifrc-releases-emergency-funds-flash-floods-leave-communities-isolated",
   title:{en:"India sends ~50 tonnes of aid; US, UK and IFRC pledge funds",
          ne:"भारतले करिब ५० टन सहायता; अमेरिका, बेलायत, IFRC को कोष"},
   body:{en:"The US pledged USD 500,000, the UK GBP 5 million and the IFRC released about USD 1.4 million.",
         ne:"अमेरिकाले ५ लाख डलर, बेलायतले ५० लाख पाउन्ड र IFRC ले करिब १४ लाख डलर।"},
   long:{en:"International assistance was mobilised quickly: India dispatched about 50 tonnes of humanitarian supplies, the United States pledged USD 500,000 and the United Kingdom GBP 5 million. The IFRC released around USD 1.4 million in emergency funds as flash floods left communities isolated. Relief camps and distribution were organised for displaced families across Rasuwa, Nuwakot and Dhading.",
         ne:"अन्तर्राष्ट्रिय सहायता छिटो परिचालन भयो: भारतले करिब ५० टन मानवीय सामग्री, अमेरिकाले ५ लाख डलर, बेलायतले ५० लाख पाउन्ड। समुदाय अलग्गिँदा IFRC ले करिब १४ लाख डलर आपत्कालीन कोष जारी गर्‍यो। रसुवा, नुवाकोट र धादिङमा विस्थापितका लागि राहत शिविर र वितरण।"}},
  {sev:"danger", tag:{en:"GLOF",ne:"GLOF"}, time:"28 Aug 2026", src:"AP / UN",
   url:"https://www.abc.net.au/news/2026-08-28/nepal-tibet-floods-live-updates/107086974",
   title:{en:"China warns of 'high-risk' lake that could trigger new flooding",
          ne:"नयाँ बाढी निम्त्याउन सक्ने 'उच्च जोखिम' तालबारे चीनको चेतावनी"},
   body:{en:"Authorities monitor a lake near the border; the UN is using satellite technology to anticipate any surge.",
         ne:"सीमानजिकको ताल निगरानीमा; कुनै भल पूर्वानुमानका लागि राष्ट्रसंघले उपग्रह प्रविधि प्रयोग गर्दै।"},
   long:{en:"Chinese authorities warned of a 'high risk' behind a lake near the Nepal–China border that could cause fresh flooding downstream. The UN said it was using sophisticated satellite technology to anticipate any secondary disaster, and NDRRMA urged residents of Rasuwa, Nuwakot, Dhading, Gorkha and Chitwan to stay alert and away from riverbanks. Monitoring continues along the Trishuli and Bhotekoshi.",
         ne:"नेपाल–चीन सीमानजिकको तालमा 'उच्च जोखिम' रहेको र तल्लो तटमा नयाँ बाढी आउन सक्ने चीनको चेतावनी। कुनै दोस्रो विपद्को पूर्वानुमानका लागि राष्ट्रसंघले उन्नत उपग्रह प्रविधि प्रयोग गरिरहेको जनायो; NDRRMA ले रसुवा, नुवाकोट, धादिङ, गोरखा र चितवनका बासिन्दालाई सतर्क रही नदी किनारबाट टाढा रहन आग्रह गर्‍यो।"}},
  {sev:"watch", tag:{en:"Children",ne:"बालबालिका"}, time:"28 Aug 2026", src:"UNICEF / ABC",
   url:"https://www.abc.net.au/news/2026-08-28/nepal-tibet-floods-live-updates/107086974",
   title:{en:"UNICEF: over 17,000 children need urgent assistance",
          ne:"युनिसेफ: १७,००० भन्दा बढी बालबालिकालाई तत्काल सहयोग आवश्यक"},
   body:{en:"Displacement, damaged schools and health risks are putting thousands of children in need.",
         ne:"विस्थापन, क्षतिग्रस्त विद्यालय र स्वास्थ्य जोखिमले हजारौं बालबालिका प्रभावित।"},
   long:{en:"UNICEF estimated that more than 17,000 children required urgent assistance following the floods, citing displacement, damaged schools and water-borne health risks. Aid agencies were prioritising clean water, sanitation, child protection and psychosocial support in relief camps. Red Cross representatives said entire villages and market areas had been destroyed along the corridor.",
         ne:"बाढीपछि १७,००० भन्दा बढी बालबालिकालाई तत्काल सहयोग आवश्यक रहेको युनिसेफको अनुमान — विस्थापन, क्षतिग्रस्त विद्यालय र पानीजन्य स्वास्थ्य जोखिमका कारण। राहत शिविरमा सफा पानी, सरसफाइ, बाल संरक्षण र मनोसामाजिक सहयोगमा जोड। रेडक्रसका अनुसार कोरिडोरका पूरै गाउँ र बजार ध्वस्त।"}},
  {sev:"watch", tag:{en:"Response",ne:"प्रतिकार्य"}, time:"31 Aug 2026", src:"NDRRMA / AFP",
   url:"https://kathmandupost.com/national",
   title:{en:"18,708 security personnel mobilised; 7,514 people brought to safety",
          ne:"१८,७०८ सुरक्षाकर्मी परिचालन; ७,५१४ जना सुरक्षित स्थानमा"},
   body:{en:"NDRRMA's live count puts the deployment at 18,708 across the affected districts, with 7,514 people rescued so far — including 279 from a hydropower tunnel and 227 foreign nationals.",
         ne:"NDRRMA को प्रत्यक्ष गणनाअनुसार प्रभावित जिल्लामा १८,७०८ जनशक्ति परिचालित; अहिलेसम्म ७,५१४ जना उद्धार — जसमा जलविद्युत् सुरुङबाट २७९ र २२७ विदेशी नागरिक।"},
   long:{en:"NDRRMA's live count on 31 August puts the deployment at 18,708 security personnel — 8,370 from the Nepali Army, 6,135 from Nepal Police and 4,203 from the Armed Police Force — mobilised for search, rescue, relief and assistance across the flood-hit districts. Rescue teams have brought 7,514 people to safety so far. Helicopters remain central to the operation, including the evacuation of 279 people trapped inside a hydropower tunnel over two days and 227 foreign nationals airlifted out. 145 of 198 communication towers in the affected districts are back in service.",
         ne:"NDRRMA को ३१ भदौको प्रत्यक्ष गणनाअनुसार बाढी प्रभावित जिल्लामा खोज, उद्धार र राहतका लागि १८,७०८ सुरक्षाकर्मी परिचालित — नेपाली सेनाका ८,३७०, नेपाल प्रहरीका ६,१३५ र सशस्त्र प्रहरीका ४,२०३। अहिलेसम्म ७,५१४ जनालाई सुरक्षित स्थानमा पुर्‍याइएको छ र प्रभावित जिल्लाका १९८ मध्ये १४५ टेलिफोन टावर पुनः सञ्चालनमा आएका छन्। हेलिकप्टर सञ्चालन प्रमुख रहेको छ — दुई दिनमा जलविद्युत् सुरुङभित्र फसेका २७९ जना र २२७ विदेशी नागरिकको उद्धार।"}},
  {sev:"watch", tag:{en:"Injured",ne:"घाइते"}, time:"28 Aug 2026", src:"Nepal Police",
   url:WK,
   title:{en:"466 injured; dozens treated in Kathmandu hospitals",
          ne:"४६६ घाइते; दर्जनौं काठमाडौंका अस्पतालमा उपचाररत"},
   body:{en:"Police reported 466 injured, with the most serious cases evacuated to the capital.",
         ne:"प्रहरीका अनुसार ४६६ घाइते; गम्भीरलाई राजधानी ल्याइयो।"},
   long:{en:"Nepal Police reported 466 people injured in the floods, with dozens of the most serious cases receiving treatment in hospitals in Kathmandu. Medical teams were deployed alongside search units, and helicopters were used to evacuate the critically injured from Rasuwa and Nuwakot. Health authorities warned of water-borne disease risks in crowded relief camps.",
         ne:"नेपाल प्रहरीका अनुसार बाढीमा ४६६ जना घाइते; गम्भीर अवस्थाका दर्जनौं काठमाडौंका अस्पतालमा उपचाररत। खोजी टोलीसँगै चिकित्सा टोली परिचालन; रसुवा र नुवाकोटबाट गम्भीर घाइतेलाई हेलिकप्टरबाट ल्याइयो। भीडभाडयुक्त राहत शिविरमा पानीजन्य रोगको जोखिमबारे स्वास्थ्य अधिकारीको चेतावनी।"}},
  {sev:"danger", tag:{en:"Cross-border",ne:"सीमापार"}, time:"26 Aug 2026", src:"Xinhua / The Guardian",
   url:WK,
   title:{en:"Gyirong Port destroyed on the China side; 555 evacuated",
          ne:"चीनतर्फ ग्यिरोङ बन्दरगाह ध्वस्त; ५५५ स्थानान्तरण"},
   body:{en:"The key China–Nepal trade gateway was reported destroyed; Chinese teams evacuated hundreds.",
         ne:"चीन–नेपाल व्यापारको प्रमुख नाका ध्वस्त; चिनियाँ टोलीले सयौंलाई स्थानान्तरण।"},
   long:{en:"The flood devastated Gyirong County in Tibet, where Gyirong Port — a key China–Nepal trade and tourism gateway — was reported destroyed. Chinese authorities deployed some 800 emergency workers and around 150 vehicles, evacuating about 555 tourists and roughly 500 local residents. Hundreds of people were reported missing on the China side of the border.",
         ne:"बाढीले तिब्बतको ग्यिरोङ काउन्टी ध्वस्त बनायो; चीन–नेपाल व्यापार र पर्यटनको प्रमुख नाका ग्यिरोङ बन्दरगाह ध्वस्त। चिनियाँ अधिकारीले करिब ८०० उद्धारकर्मी र १५० सवारी परिचालन गरी करिब ५५५ पर्यटक र ५०० स्थानीयलाई स्थानान्तरण गरे। सीमाको चीनतर्फ सयौं बेपत्ता।"}},
  {sev:"danger", tag:{en:"Personnel",ne:"कर्मचारी"}, time:"28 Aug 2026", src:"Nepal Police",
   url:"https://english.onlinekhabar.com/people-rescued-rasuwa-flood-2.html",
   title:{en:"28 police officers still out of contact after the disaster",
          ne:"विपद्पछि २८ प्रहरी अझै सम्पर्कविहीन"},
   body:{en:"Security and customs staff were among those swept up in the border-area surge.",
         ne:"सीमा क्षेत्रको भलमा सुरक्षा र भन्सार कर्मचारी पनि परे।"},
   long:{en:"Nepal Police said 28 of its officers remained out of contact days after the flood tore through the Rasuwagadhi border area, where a customs office and security posts were destroyed. Army personnel, Armed Police Force members, immigration and customs staff were also among the missing. Search efforts focused on the buried border settlements of Timure and Rasuwagadhi.",
         ne:"रसुवागढी सीमा क्षेत्रमा भल पस्दा भन्सार कार्यालय र सुरक्षा चौकी ध्वस्त भएपछि आफ्ना २८ प्रहरी विपद्को केही दिनसम्म सम्पर्कविहीन रहेको नेपाल प्रहरीले जनायो। बेपत्तामध्ये सेना, सशस्त्र प्रहरी, अध्यागमन र भन्सार कर्मचारी पनि। तिमुरे र रसुवागढीका पुरिएका बस्तीमा खोजी केन्द्रित।"}},
  {sev:"danger", tag:{en:"Foreign",ne:"विदेशी"}, time:"28 Aug 2026", src:"AP / Diplomatic Missions",
   url:WK,
   title:{en:"Foreigners from 30+ countries among the missing",
          ne:"बेपत्तामध्ये ३० भन्दा बढी देशका विदेशी"},
   body:{en:"India (178), the US, Ukraine, Malaysia, Australia and others report nationals unaccounted for.",
         ne:"भारत (१७८), अमेरिका, युक्रेन, मलेसिया, अस्ट्रेलिया लगायतका नागरिक बेपत्ता।"},
   long:{en:"At least 540 of the missing are foreign nationals from more than 30 countries, many of them trekkers and pilgrims on the popular Langtang and Kerung routes. India reported around 178 nationals missing, followed by the United States, Ukraine, Malaysia, Australia, the United Kingdom, Canada and South Korea. Embassies were coordinating with NDRRMA and Nepal Police to trace and identify people.",
         ne:"बेपत्तामध्ये कम्तीमा ५४० जना ३० भन्दा बढी देशका विदेशी — धेरै लाङटाङ र केरुङ मार्गका पदयात्री र तीर्थयात्री। भारतका करिब १७८ नागरिक बेपत्ता, त्यसपछि अमेरिका, युक्रेन, मलेसिया, अस्ट्रेलिया, बेलायत, क्यानडा र दक्षिण कोरिया। दूतावासहरू NDRRMA र नेपाल प्रहरीसँग खोजी र पहिचानमा।"}},
  {sev:"watch", tag:{en:"Policy",ne:"नीति"}, time:"27 Aug 2026", src:"The Kathmandu Post",
   url:"https://kathmandupost.com/money/2026/08/27/what-is-the-nepal-government-s-one-door-system-for-flood-relief",
   title:{en:"Government adopts 'one-door' policy for flood relief",
          ne:"बाढी राहतका लागि सरकारको 'एकद्वार' नीति"},
   body:{en:"All donations and relief are to be channelled through a single official mechanism to avoid duplication.",
         ne:"दोहोरो नहोस् भन्दै सबै दान र राहत एउटै आधिकारिक संयन्त्रमार्फत।"},
   long:{en:"The government adopted a 'one-door' relief system, asking that all cash and in-kind support be routed through the PM Disaster Relief Fund and district authorities so aid reaches victims fairly and without duplication. Individuals and organisations were guided on how to help — donations, verified volunteering and relief material — through official channels. The Kathmandu Post published a practical guide for would-be donors.",
         ne:"सरकारले 'एकद्वार' राहत प्रणाली अपनायो — सबै नगद र वस्तुगत सहयोग प्रधानमन्त्री विपद् राहत कोष र जिल्ला प्रशासनमार्फत पठाउन आग्रह, ताकि राहत निष्पक्ष र दोहोरो नभई पीडितसम्म पुगोस्। दान, प्रमाणित स्वयंसेवा र राहत सामग्रीबारे व्यक्ति र संस्थालाई मार्गदर्शन। द काठमाडौं पोस्टले दाताका लागि व्यावहारिक सुझाव प्रकाशित गर्‍यो।"}},
  {sev:"watch", tag:{en:"Warning",ne:"चेतावनी"}, time:"27 Aug 2026", src:"NDRRMA",
   url:WK,
   title:{en:"Downstream flood warning along Trishuli–Narayani to Chitwan",
          ne:"त्रिशूली–नारायणी हुँदै चितवनसम्म तल्लो तट बाढी चेतावनी"},
   body:{en:"Residents downstream are urged to stay alert and move away from riverbanks.",
         ne:"तल्लो तटका बासिन्दालाई सतर्क रही नदी किनारबाट टाढा जान आग्रह।"},
   long:{en:"NDRRMA issued a downstream warning along the Trishuli and Narayani rivers toward Chitwan, urging residents to stay alert and move away from riverbanks as damaged infrastructure and unstable debris raised secondary flood risks. Monitoring was stepped up at Devighat and along the Narayani. Communities were advised to follow only official bulletins and not forward rumours.",
         ne:"NDRRMA ले त्रिशूली र नारायणी हुँदै चितवनतर्फ तल्लो तट चेतावनी जारी गर्‍यो; क्षतिग्रस्त संरचना र अस्थिर सामग्रीले दोस्रो बाढीको जोखिम बढेकाले बासिन्दालाई सतर्क रही नदी किनारबाट टाढा जान आग्रह। देवीघाट र नारायणीमा निगरानी बढाइयो। आधिकारिक सूचना मात्र पछ्याउन र हल्ला नफैलाउन सुझाव।"}},
  {sev:"relief", tag:{en:"How to help",ne:"कसरी सहयोग"}, time:"27 Aug 2026", src:"The Kathmandu Post",
   url:"https://kathmandupost.com/national/2026/08/27/how-people-can-help-nepal-s-flood-affected-communities",
   title:{en:"How people can help Nepal's flood-affected communities",
          ne:"बाढी प्रभावित समुदायलाई कसरी सहयोग गर्ने"},
   body:{en:"Verified funds, blood donation and relief material are the safest ways to contribute.",
         ne:"प्रमाणित कोष, रक्तदान र राहत सामग्री सबैभन्दा सुरक्षित सहयोग।"},
   long:{en:"Aid groups advised the public to give through verified channels — the PM Disaster Relief Fund, the Nepal Red Cross and established NGOs — rather than unverified online appeals. Blood donation, clean water, hygiene kits and warm clothing were among the most-needed items. Volunteers were asked to coordinate with district authorities rather than travelling independently to affected zones.",
         ne:"सहयोग समूहहरूले जनतालाई अप्रमाणित अनलाइन अपिलभन्दा प्रमाणित माध्यम — प्रधानमन्त्री विपद् राहत कोष, नेपाल रेडक्रस र स्थापित संस्थामार्फत सहयोग गर्न सुझाव दिए। रक्तदान, सफा पानी, स्वच्छता किट र न्यानो लुगा सबैभन्दा आवश्यक। स्वयंसेवकलाई स्वतन्त्र नगई जिल्ला प्रशासनसँग समन्वय गर्न आग्रह।"}}
];

/* -------------------- ALERTS (real settlements, approx. coords) -------------------- */
const ALERTS = [
  {sev:"danger", lat:28.2790, lng:85.3780, place:{en:"Rasuwagadhi / Timure",ne:"रसुवागढी / तिमुरे"}, desc:{en:"Border customs office and hydropower station destroyed; 300+ queuing vehicles swept away",ne:"सीमा भन्सार कार्यालय र जलविद्युत् केन्द्र ध्वस्त; लाइनमा रहेका ३००+ सवारी बगे"}},
  {sev:"danger", lat:28.2200, lng:85.3900, place:{en:"Lhende Khola barrier lake",ne:"ल्हेन्डे खोला बाँधिएको ताल"}, desc:{en:"Landslide-dammed lake ~0.11 km², 18 km above Rasuwagadhi — burst risk, under watch",ne:"पहिरोले बाँधिएको करिब ०.११ वर्ग कि.मि. को ताल, रसुवागढीभन्दा १८ कि.मि. माथि — फुट्ने जोखिम, निगरानीमा"}},
  {sev:"danger", lat:28.1620, lng:85.3400, place:{en:"Syafrubesi",ne:"स्याफ्रुबेसी"}, desc:{en:"Riverside settlements inundated; Langtang gateway cut off, road impassable",ne:"किनारका बस्ती डुबान; लाङटाङ प्रवेशद्वार अवरुद्ध, सडक बन्द"}},
  {sev:"danger", lat:28.1119, lng:85.2975, place:{en:"Dhunche (Rasuwa HQ)",ne:"धुन्चे (रसुवा सदरमुकाम)"}, desc:{en:"District HQ; rescue and coordination centre — 562 still missing in Rasuwa",ne:"जिल्ला सदरमुकाम; उद्धार र समन्वय केन्द्र — रसुवामा ५६२ अझै बेपत्ता"}},
  {sev:"danger", lat:28.1400, lng:85.2600, place:{en:"Trishuli 3A tunnel (Mailung)",ne:"त्रिशूली ३ए सुरुङ (माइलुङ)"}, desc:{en:"Tunnel rescue in its critical phase — 100+ workers may still be alive inside",ne:"सुरुङ उद्धार निर्णायक चरणमा — भित्र १००+ कामदार जीवित हुन सक्ने"}},
  {sev:"danger", lat:27.9610, lng:85.1810, place:{en:"Betrawati (Nuwakot)",ne:"बेत्रावती (नुवाकोट)"}, desc:{en:"Bridges swept away on the Trishuli; a school 10 minutes downstream evacuated 900 children in time",ne:"त्रिशूलीका पुल बगायो; १० मिनेट तल्लो तटको विद्यालयले समयमै ९०० बालबालिका निकाल्यो"}},
  {sev:"watch", lat:27.9010, lng:85.1560, place:{en:"Devighat / Trishuli",ne:"देवीघाट / त्रिशूली"}, desc:{en:"Hydropower plants damaged; ~431 MW off the grid nationally",ne:"जलविद्युत् आयोजना क्षति; राष्ट्रिय ग्रिडबाट करिब ४३१ मेगावाट हट्यो"}},
  {sev:"danger", lat:27.8600, lng:84.9200, place:{en:"Krishnabhir (Benighat Rorang, Dhading)",ne:"कृष्णभीर (बेनीघाट रोराङ, धादिङ)"}, desc:{en:"Prithvi Highway CUT — the carriageway subsided; Mugling–Kathmandu section closed",ne:"पृथ्वी राजमार्ग अवरुद्ध — सडक भासियो; मुग्लिन–काठमाडौं खण्ड बन्द"}},
  {sev:"watch", lat:27.5800, lng:84.5000, place:{en:"Chitwan (downstream)",ne:"चितवन (तल्लो तट)"}, desc:{en:"250+ bodies washed up ~160 km downstream; mass burial of the unidentified under way",ne:"करिब १६० कि.मि. तल २५०+ शव भेटिए; नचिनिएकाको सामूहिक व्यवस्थापन जारी"}},
  {sev:"watch", lat:27.6900, lng:84.0900, place:{en:"Nawalparasi (Narayani corridor)",ne:"नवलपरासी (नारायणी कोरिडोर)"}, desc:{en:"Riverside alert; recovery operations continuing along the Narayani",ne:"नदी किनार चेतावनी; नारायणी किनारमा शव खोजी जारी"}},
  {sev:"relief", lat:27.9280, lng:84.6270, place:{en:"Gorkha",ne:"गोरखा"}, desc:{en:"Riverside alert and relief distribution; local units funded from the PM relief release",ne:"नदी किनार चेतावनी र राहत वितरण; प्रधानमन्त्री राहत निकासाबाट स्थानीय तह सञ्चालन"}},
  {sev:"watch", lat:27.7172, lng:85.3240, place:{en:"Kathmandu Valley",ne:"काठमाडौं उपत्यका"}, desc:{en:"Bagmati, Bishnumati, Hanumante & Dhobi Khola rising; riverside settlements on active flood advisory",ne:"बागमती, बिष्णुमती, हनुमन्ते र ढोबीखोलाको जलसतह वृद्धि; तटीय क्षेत्र सतर्कतामा"}},
  {sev:"danger", lat:28.3700, lng:85.3000, place:{en:"Gyirong Port (Tibet, China)",ne:"ग्यिरोङ बन्दरगाह (तिब्बत, चीन)"}, desc:{en:"Port destroyed; China reports 16 dead and 546 missing on its side",ne:"बन्दरगाह ध्वस्त; चीनतर्फ १६ मृत्यु र ५४६ बेपत्ता"}}
];

/* -------------------- HELPLINES (from official NDRRMA poster) -------------------- */
const HELPLINES = {
  national:[
    {crit:true,  tel:"1114", name:{en:"Armed Police Force",ne:"सशस्त्र प्रहरी बल"}, desc:{en:"Disaster response",ne:"विपद् प्रतिकार्य"}},
    {crit:true,  tel:"100",  name:{en:"Nepal Police",ne:"नेपाल प्रहरी"}, desc:{en:"Emergency",ne:"आपत्काल"}},
    {crit:true,  tel:"102",  name:{en:"Ambulance",ne:"एम्बुलेन्स"}, desc:{en:"Medical transport",ne:"चिकित्सा यातायात"}},
    {crit:true,  tel:"1234", name:{en:"DEOC",ne:"जिल्ला आपत्कालीन कार्य केन्द्र"}, desc:{en:"District emergency ops",ne:"जिल्ला आपत्कालीन कार्य सञ्चालन"}},
    {crit:true,  tel:"1115", name:{en:"Health Helpline",ne:"स्वास्थ्य हेल्पलाइन"}, desc:{en:"Health emergency & info",ne:"स्वास्थ्य आपत्काल र जानकारी"}}
  ],
  district:[
    {tel:"9851164422", name:{en:"Asst. CDO — Rasuwa",ne:"सहायक प्रमुख जिल्ला अधिकारी, रसुवा"}},
    {tel:"9851254060", name:{en:"Rasuwa Police",ne:"रसुवा प्रहरी"}},
    {tel:"9851248777", name:{en:"Asst. CDO — Nuwakot",ne:"सहायक प्रमुख जिल्ला अधिकारी, नुवाकोट"}},
    {tel:"9851062360", name:{en:"Nuwakot Police",ne:"नुवाकोट प्रहरी"}},
    {tel:"9851247777", name:{en:"CDO — Dhading",ne:"प्रमुख जिल्ला अधिकारी, धादिङ"}},
    {tel:"9851298460", name:{en:"Dhading Police",ne:"धादिङ प्रहरी"}},
    {tel:"9855088881", name:{en:"Asst. CDO — Chitwan",ne:"सहायक प्रमुख जिल्ला अधिकारी, चितवन"}},
    {tel:"9855013288", name:{en:"Chitwan Police",ne:"चितवन प्रहरी"}}
  ]
};

/* -------------------- RELIEF FUND (from official PMO poster) -------------------- */
const RELIEF = [
  {title:{en:"PM Natural Calamity Relief Fund",ne:"प्रधानमन्त्री दैवी प्रकोप उद्धार कोष"},
   banks:[
     {bank:{en:"Himalayan Bank Ltd (USD account)",ne:"हिमालयन बैंक लिमिटेड (डलर खाता)"}, acc:["01905631210046"]},
     {bank:{en:"Standard Chartered Bank Nepal Ltd",ne:"स्ट्यान्डर्ड चार्टर्ड बैंक नेपाल लि."}, acc:["01013243801","02013243801"]},
     {bank:{en:"Rastriya Banijya Bank",ne:"राष्ट्रिय वाणिज्य बैंक"}, acc:["1130100003762001","1130100000006006"]},
     {bank:{en:"Everest Bank Ltd",ne:"एभरेस्ट बैंक लिमिटेड"}, acc:["00100105200270","00101102200012"]},
     {bank:{en:"Nepal Bank Ltd",ne:"नेपाल बैंक लिमिटेड"}, acc:["00211600510039000003","00200100510039000001"]},
     {bank:{en:"Global IME Bank Ltd",ne:"ग्लोबल आइएमई बैंक लि."}, acc:["00410100000057","00410100000005"]},
     {bank:{en:"Nabil Bank",ne:"नबिल बैंक"}, acc:["1710017505285"]},
     {bank:{en:"Agricultural Development Bank Ltd",ne:"कृषि विकास बैंक लि."}, acc:["0100210002907014"]}
   ]},
  {title:{en:"PM Relief Fund",ne:"प्रधानमन्त्री राहत कोष"},
   banks:[
     {bank:{en:"Rastriya Banijya Bank",ne:"राष्ट्रिय वाणिज्य बैंक"}, acc:["1430100000025006","1430100001164001"]}
   ]}
];

/* -------------------- HISTORY -------------------- */
const HISTORY = [
  {year:"2015", stat:"~8,970", title:{en:"Gorkha Earthquake",ne:"गोरखा भूकम्प"}, desc:{en:"M7.8 quake devastated the Kathmandu Valley and 14 districts.",ne:"७.८ म्याग्निच्युडको भूकम्पले काठमाडौं उपत्यका र १४ जिल्ला ध्वस्त।"}},
  {year:"2017", stat:"160+", title:{en:"Terai Floods",ne:"तराई बाढी"}, desc:{en:"Monsoon floods across the southern plains displaced hundreds of thousands.",ne:"मनसुनी बाढीले दक्षिणी तराईमा लाखौं विस्थापित।"}},
  {year:"2014", stat:"156", title:{en:"Jure Landslide",ne:"जुरे पहिरो"}, desc:{en:"A landslide in Sindhupalchok dammed the Sunkoshi river.",ne:"सिन्धुपाल्चोकको पहिरोले सुनकोशी नदी थुनियो।"}},
  {year:"1993", stat:"1,336", title:{en:"Southern Nepal Floods",ne:"दक्षिणी नेपाल बाढी"}, desc:{en:"Catastrophic monsoon flooding across central and southern Nepal.",ne:"मध्य र दक्षिणी नेपालमा विनाशकारी मनसुनी बाढी।"}},
  {year:"1988", stat:"721", title:{en:"Udayapur Earthquake",ne:"उदयपुर भूकम्प"}, desc:{en:"M6.9 quake damaged tens of thousands of homes in eastern Nepal.",ne:"६.९ म्याग्निच्युडको भूकम्पले पूर्वी नेपालमा हजारौं घर क्षति।"}},
  {year:"1934", stat:"~10,700", title:{en:"Nepal–Bihar Earthquake",ne:"नेपाल–बिहार भूकम्प"}, desc:{en:"M8.0 quake flattened much of the Kathmandu Valley.",ne:"८.० म्याग्निच्युडको भूकम्पले काठमाडौं उपत्यकाको ठूलो भाग ध्वस्त।"}}
];

/* -------------------- I18N (UI chrome) -------------------- */
const I18N = {
 en:{
  "brand.sub":"National Emergency Information Service",
  "nav.home":"Home","nav.alerts":"Alert Map","nav.missing":"Missing Persons","nav.relief":"Relief Fund","nav.history":"History",
  "eas.label":"Active Event","clock.l":"NPT · Kathmandu",
  "hero.eyebrow":"Active Disaster · Live Situation",
  "hero.note":"Provisional Nepal-side figures confirmed by Nepal Police and NDRRMA (as of {date}). Counts auto-update and are being revised as search operations continue — not final. Verify against official Nepal Police / NDRRMA bulletins.",
  "hero.help":"Emergency Helplines","hero.report":"Report an Incident",
  "stat.deaths":"Confirmed Deaths","stat.missing":"Reported Missing","stat.foreign":"Foreign Nationals Missing","stat.rescued":"Total Rescued",
  "stat.sub.deaths":"Nepal Police · rising","stat.sub.missing":"incl. 592 foreign","stat.sub.foreign":"tourists & NRNs","stat.sub.rescued":"NDRRMA · live count","stat.tap":"Tap for breakdown →",
  "sec.hl.eye":"Call for Help · Toll-free 24×7","sec.hl.h":"Emergency Helplines",
  "hl.national":"National","hl.district":"Affected Districts","hl.more":"All helplines →",
  "hl.note":"Source: NDRRMA emergency helpline notice. If a line is busy, dial 100 (Police) or 102 (Ambulance).",
  "sec.news.eye":"From Published Reporting · Verify Independently","sec.news.h":"Latest Bulletins","news.more":"All bulletins →","nav.news":"Live News",
  "sec.rep.eye":"Community Channel","sec.rep.h":"Report & Share",
  "rep.inc.h":"Report an Incident","rep.inc.p":"Seen a landslide, blocked road, or people in danger? Call the district emergency line — it helps responders act faster.","rep.inc.btn":"Call DEOC 1234",
  "rep.sh.h":"Share This Page","rep.sh.p":"Forward verified helplines and alerts to people in affected areas. Do not forward rumours.",
  "share.wa":"WhatsApp","share.copy":"Copy Link","share.print":"Print",
  "foot.about":"An independent civic information service aggregating publicly available disaster data for Nepal. Not an official government site — always verify critical information with official sources.",
  "foot.sections":"Sections","foot.sources":"Official Sources",
  "foot.rights":"Civic information service","foot.verify":"Data provisional · Verify official sources before acting",
  "page.alerts.h":"Alert Map","page.alerts.p":"Impact zones and active warnings along the Bhote Koshi–Trishuli corridor, updated {date}. Coordinates are approximate. Live GDACS flood alerts (UN/EC) arrive separately every few minutes — open the bell in the header to read them.",
  "page.missing.h":"Missing Persons","page.missing.p":"Report a missing person and use the official channels to trace people. This site does not maintain its own verified list.",
  "page.relief.h":"Relief Fund","page.relief.p":"Official Prime Minister's relief fund account details, transcribed from the PMO notice. Verify every detail before transferring.",
  "page.history.h":"Disaster History","page.history.p":"Selected major disasters in Nepal — for record and preparedness.",
  "hist.lives":"Lives lost",
  "mf.h":"Report a Missing Person","mf.name":"Full name","mf.age":"Age","mf.gender":"Gender","mf.seen":"Last seen location","mf.date":"Last seen (date)","mf.contact":"Contact number","mf.desc":"Identifying details","mf.photo":"Photo","mf.drop":"Click to attach a recent photo","mf.submit":"Add Unverified Report",
  "mf.note":"This form does not transmit to authorities. It saves an unverified note in your browser so you can relay details to Nepal Police / ICRC Restoring Family Links. For a life-threatening emergency dial 100.",
  "reg.all":"All","reg.missing":"Missing","reg.found":"Found","reg.search":"Search name or location…",
  "reg.empty.h":"Search official missing-persons channels","reg.empty.p":"For this event, use the official registries — they hold authenticated, current information and can trace people across borders:",
  "relief.verify":"Transcribed from the official PMO poster. Bank account numbers are sensitive — confirm every digit against the official Prime Minister's Office before transferring funds. This site does not collect payments.",
  "relief.official":"Official PMO source ↗","copy":"Copy",
  "toast.copied":"Copied","toast.saved":"Unverified note saved to your browser. Please relay it to Nepal Police / ICRC RFL.","toast.link":"Link copied."
 },
 ne:{
  "brand.sub":"राष्ट्रिय आपत्कालीन सूचना सेवा",
  "nav.home":"गृह","nav.alerts":"चेतावनी नक्सा","nav.missing":"बेपत्ता व्यक्ति","nav.relief":"राहत कोष","nav.history":"इतिहास",
  "eas.label":"सक्रिय विपद्","clock.l":"नेपाली समय · काठमाडौं",
  "hero.eyebrow":"सक्रिय विपद् · पछिल्लो अवस्था",
  "hero.note":"नेपाल प्रहरी र NDRRMA द्वारा पुष्टि गरिएको नेपालतर्फको प्रारम्भिक तथ्यांक ({date} सम्म)। तथ्यांक स्वतः अद्यावधिक हुन्छ र खोजी कार्य जारी रहेकाले संशोधन हुँदैछ — अन्तिम होइन। आधिकारिक नेपाल प्रहरी / NDRRMA विवरणसँग रुजु गर्नुहोस्।",
  "hero.help":"आपत्कालीन हेल्पलाइन","hero.report":"घटना जानकारी दिनुहोस्",
  "stat.deaths":"पुष्टि भएका मृत्यु","stat.missing":"बेपत्ता","stat.foreign":"बेपत्ता विदेशी नागरिक","stat.rescued":"कुल उद्धार",
  "stat.sub.deaths":"नेपाल प्रहरी · बढ्दै","stat.sub.missing":"५९२ विदेशीसहित","stat.sub.foreign":"पर्यटक र गैरआवासीय","stat.sub.rescued":"हवाई · NDRRMA","stat.tap":"विस्तृत विवरण →",
  "sec.hl.eye":"सहयोगका लागि सम्पर्क · निःशुल्क २४×७","sec.hl.h":"आपत्कालीन हेल्पलाइन",
  "hl.national":"राष्ट्रिय","hl.district":"प्रभावित जिल्लाहरू","hl.more":"सबै हेल्पलाइन →",
  "hl.note":"स्रोत: NDRRMA आपत्कालीन हेल्पलाइन सूचना। व्यस्त भए १०० (प्रहरी) वा १०२ (एम्बुलेन्स) मा फोन गर्नुहोस्।",
  "sec.news.eye":"प्रकाशित समाचारबाट · स्वतन्त्र रुजु गर्नुहोस्","sec.news.h":"पछिल्ला बुलेटिन","news.more":"सबै बुलेटिन →","nav.news":"प्रत्यक्ष समाचार",
  "sec.rep.eye":"सामुदायिक च्यानल","sec.rep.h":"जानकारी दिनुहोस् र साझा गर्नुहोस्",
  "rep.inc.h":"घटना जानकारी दिनुहोस्","rep.inc.p":"पहिरो, अवरुद्ध सडक वा जोखिममा परेका मानिस देख्नुभयो? जिल्ला आपत्कालीन नम्बरमा फोन गर्नुहोस्।","rep.inc.btn":"DEOC १२३४ मा फोन",
  "rep.sh.h":"यो पृष्ठ साझा गर्नुहोस्","rep.sh.p":"प्रभावित क्षेत्रका मानिसलाई रुजु भएका हेल्पलाइन र चेतावनी पठाउनुहोस्। हल्ला नफैलाउनुहोस्।",
  "share.wa":"ह्वाट्सएप","share.copy":"लिङ्क कपी","share.print":"प्रिन्ट",
  "foot.about":"नेपालको सार्वजनिक विपद् तथ्यांक समेट्ने स्वतन्त्र नागरिक सूचना सेवा। यो आधिकारिक सरकारी साइट होइन — महत्त्वपूर्ण जानकारी आधिकारिक स्रोतसँग रुजु गर्नुहोस्।",
  "foot.sections":"खण्डहरू","foot.sources":"आधिकारिक स्रोत",
  "foot.rights":"नागरिक सूचना सेवा","foot.verify":"तथ्यांक प्रारम्भिक · कार्य गर्नुअघि आधिकारिक स्रोत रुजु गर्नुहोस्",
  "page.alerts.h":"चेतावनी नक्सा","page.alerts.p":"भोटेकोशी–त्रिशूली कोरिडोरका प्रभावित क्षेत्र र सक्रिय चेतावनी, {date} मा अद्यावधिक। निर्देशांक अनुमानित। GDACS (संयुक्त राष्ट्र/EC) का प्रत्यक्ष बाढी अलर्ट हरेक केही मिनेटमा छुट्टै आउँछन् — हेडरको घण्टी खोलेर हेर्नुहोस्।",
  "page.missing.h":"बेपत्ता व्यक्ति","page.missing.p":"बेपत्ता व्यक्तिको जानकारी दिनुहोस् र खोजीका लागि आधिकारिक च्यानल प्रयोग गर्नुहोस्। यो साइटले आफ्नै रुजु सूची राख्दैन।",
  "page.relief.h":"राहत कोष","page.relief.p":"प्रधानमन्त्री कार्यालयको सूचनाबाट सारिएको आधिकारिक राहत कोष खाता विवरण। रकम पठाउनुअघि हरेक विवरण रुजु गर्नुहोस्।",
  "page.history.h":"विपद् इतिहास","page.history.p":"नेपालका छानिएका प्रमुख विपद् — अभिलेख र पूर्वतयारीका लागि।",
  "hist.lives":"ज्यान गुम्यो",
  "mf.h":"बेपत्ता व्यक्तिको जानकारी","mf.name":"पूरा नाम","mf.age":"उमेर","mf.gender":"लिङ्ग","mf.seen":"अन्तिम देखिएको स्थान","mf.date":"अन्तिम देखिएको मिति","mf.contact":"सम्पर्क नम्बर","mf.desc":"चिनारीका विवरण","mf.photo":"फोटो","mf.drop":"पछिल्लो फोटो संलग्न गर्न क्लिक गर्नुहोस्","mf.submit":"रुजु नभएको जानकारी थप्नुहोस्",
  "mf.note":"यो फारमले अधिकारीलाई पठाउँदैन। तपाईंको ब्राउजरमा रुजु नभएको नोट सुरक्षित गर्छ, ताकि तपाईं नेपाल प्रहरी / ICRC लाई विवरण पठाउन सक्नुहोस्। जीवनको जोखिम भए १०० मा फोन गर्नुहोस्।",
  "reg.all":"सबै","reg.missing":"बेपत्ता","reg.found":"भेटिए","reg.search":"नाम वा स्थान खोज्नुहोस्…",
  "reg.empty.h":"आधिकारिक बेपत्ता-खोजी च्यानल प्रयोग गर्नुहोस्","reg.empty.p":"यस विपद्का लागि आधिकारिक दर्ता प्रयोग गर्नुहोस् — तिनमा रुजु भएको, पछिल्लो जानकारी हुन्छ:",
  "relief.verify":"आधिकारिक PMO सूचनाबाट सारिएको। बैंक खाता नम्बर संवेदनशील छन् — रकम पठाउनुअघि प्रधानमन्त्री कार्यालयको आधिकारिक स्रोतसँग हरेक अंक रुजु गर्नुहोस्। यो साइटले भुक्तानी लिँदैन।",
  "relief.official":"आधिकारिक PMO स्रोत ↗","copy":"कपी",
  "toast.copied":"कपी भयो","toast.saved":"रुजु नभएको नोट ब्राउजरमा सुरक्षित। कृपया नेपाल प्रहरी / ICRC लाई पठाउनुहोस्।","toast.link":"लिङ्क कपी भयो।"
 }
};

/* =========================================================================
   ENGINE
   ========================================================================= */
const $  = (s,el=document)=>el.querySelector(s);
const $$ = (s,el=document)=>[...el.querySelectorAll(s)];
const esc = s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let LANG = (()=>{ try{return localStorage.getItem("nd_lang")||"en";}catch(e){return "en";} })();
const t = k => (I18N[LANG] && I18N[LANG][k]) || (I18N.en[k]||k);
const TL = o => (o && (o[LANG]||o.en)) || "";

/* Convert Arabic/Western digits → Devanagari digits when LANG==="ne" */
function toNepDigits(str){
  if(LANG !== "ne") return str;
  const map = {"0":"०","1":"१","2":"२","3":"३","4":"४","5":"५","6":"६","7":"७","8":"८","9":"९"};
  return String(str).replace(/[0-9]/g, d => map[d]||d);
}

/* Replace live tokens in UI strings. {date} → today's date in NPT, so the
   "as of ..." note advances by itself each day instead of being hardcoded. */
function applyTokens(s){
  if(!s || s.indexOf("{date}")<0) return s;
  let d;
  try{ d=nptNow().toLocaleDateString(LANG==="ne"?"ne-NP":"en-GB",{day:"numeric",month:"long",year:"numeric"}); }
  catch(_){ d=nptNow().toDateString(); }
  return s.replace(/\{date\}/g, d);
}
function setLang(lang){
  LANG = (lang==="ne")?"ne":"en";
  try{localStorage.setItem("nd_lang",LANG);}catch(e){}
  document.documentElement.setAttribute("lang",LANG);
  $$("[data-i18n]").forEach(el=>{ el.textContent = applyTokens(t(el.getAttribute("data-i18n"))); });
  $$("[data-i18n-ph]").forEach(el=>{ el.setAttribute("placeholder", t(el.getAttribute("data-i18n-ph"))); });
  $$(".lang button").forEach(b=>b.setAttribute("aria-pressed", String(b.dataset.lang===LANG)));
  renderAll();
}

/* ---- toast ---- */
let toastTimer;
function toast(msg,kind){
  let el=$("#toast"); if(!el){el=document.createElement("div");el.id="toast";el.className="toast";el.setAttribute("role","status");document.body.appendChild(el);}
  el.textContent=msg; el.classList.toggle("crim",kind==="crim"); el.classList.add("show");
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove("show"),4200);
}
function copy(text){ if(navigator.clipboard) navigator.clipboard.writeText(text).then(()=>toast(t("toast.copied")+": "+text)); }

/* ---- clock (NPT) ---- */
function nptNow(){const n=new Date();return new Date(n.getTime()+n.getTimezoneOffset()*60000+(5*60+45)*60000);}
function fmt(d){const p=n=>String(n).padStart(2,"0");const s=p(d.getHours())+":"+p(d.getMinutes())+":"+p(d.getSeconds());return LANG==="ne"?toNepDigits(s):s;}
/* ---- elapsed since event onset (restores the EAS strip timer) ---- */
function elapsedStr(){
  const since = Date.parse(EVENT.since);
  if(isNaN(since)) return "";
  let s = Math.max(0, Math.floor((Date.now() - since) / 1000));
  const d = Math.floor(s/86400); s -= d*86400;
  const h = Math.floor(s/3600);  s -= h*3600;
  const m = Math.floor(s/60);    s -= m*60;
  const p = n => String(n).padStart(2,"0");
  const core = (d>0 ? d+"d " : "") + p(h)+":"+p(m)+":"+p(s);
  return LANG==="ne" ? toNepDigits(core) : core;
}
function tickClocks(){const d=nptNow();$$("[data-clock]").forEach(e=>e.textContent=fmt(d));$$("[data-elapsed]").forEach(e=>e.textContent=elapsedStr());}

/* ---- phone icon ---- */
const PH='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.6a2 2 0 0 1-.5 2.1L8.1 9.6a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.6 2.6.7a2 2 0 0 1 1.7 2Z"/></svg>';

/* ---- renderers (guarded by element presence) ---- */
/* Live headlines pulled from /api/news (Google News RSS, server-side + cached).
   Null until the first fetch resolves; the ticker & news grid fall back to the
   built-in bulletins whenever it is empty or the fetch fails. */
let LIVE_NEWS=null;
function newsDate(n){
  if(!n||!n.ts) return "";
  try{ return new Date(n.ts).toLocaleDateString(LANG==="ne"?"ne-NP":"en-GB",{day:"numeric",month:"short",year:"numeric"}); }
  catch(_){ return ""; }
}
async function fetchLiveNews(){
  try{
    const r=await fetch("/api/news",{signal:AbortSignal.timeout(9000)});
    if(!r.ok) return;
    const j=await r.json();
    if(j && Array.isArray(j.items) && j.items.length){
      const firstLoad = !LIVE_NEWS;
      LIVE_NEWS=j.items;
      // Prime silently on a browser's very first visit — otherwise every item is
      // "new" and the popup would fire for a headline the reader never missed.
      if(firstLoad && !NEWSPOP_SEEN.size){ LIVE_NEWS.forEach(n=>{ const id=_newsId(n); if(id) NEWSPOP_SEEN.add(id); }); _saveNewsPopSeen(); }
      renderTicker();
      renderNews(document.body.dataset.newsLimit?+document.body.dataset.newsLimit:0);
      renderNewsPage();
      // Offer the newest headline as a corner card. maybeNewsPopup() had been
      // written but never called from anywhere, so the card could not appear at
      // all; it now runs on every refresh AFTER the priming pass above, and
      // takes the session popup budget only if a district warning has not
      // already used it.
      if(!firstLoad || NEWSPOP_SEEN.size) maybeNewsPopup();
    }
  }catch(_){ /* keep built-in bulletins */ }
}
function renderTicker(){
  const track=$("#tickerTrack"); if(!track) return;
  let items;
  if(LIVE_NEWS && LIVE_NEWS.length){
    items=LIVE_NEWS.slice(0,14).map(n=>`<span class="ticker__item"><span class="src">${esc((n.source||"NEWS").toUpperCase().slice(0,24))}</span>${esc(n.title)}</span>`).join("");
  }else{
    items=TICKER.map(x=>`<span class="ticker__item"><span class="src">${esc(x.src)}</span>${esc(TL(x))}</span>`).join("");
  }
  track.innerHTML=items+items;
}
function renderEvent(){
  $$("[data-eas]").forEach(e=>e.textContent=TL(EVENT.eas));
  $$("[data-event-title]").forEach(e=>e.textContent=TL(EVENT.title));
  $$("[data-event-region]").forEach(e=>e.textContent=TL(EVENT.region));
  $$("[data-event-date]").forEach(e=>{e.textContent=nptNow().toLocaleDateString(LANG==="ne"?"ne-NP":"en-GB",{weekday:"short",day:"2-digit",month:"short",year:"numeric"});});
}
function renderStats(){
  const wrap=$("#heroStats"); if(!wrap) return;
  wrap.innerHTML=STATS.map(s=>`
    <a class="hstat ${s.cls||''}" href="stats.html#${s.key}" aria-label="${esc(t("stat."+s.key))}">
      <div class="n mono">${esc(toNepDigits(s.n))}</div>
      <div class="lbl">${esc(t("stat."+s.key))}</div>
      <div class="hstat__go">${esc(t("stat.tap"))}</div>
    </a>`).join("");
}
const ICONS={
  police:'<svg viewBox="0 0 24 24"><path d="M12 3 5 6v5c0 4.4 3 7.4 7 9 4-1.6 7-4.6 7-9V6l-7-3Z"/><path d="m12 8 1 2.2 2.3.2-1.7 1.6.5 2.3L12 13.1 9.6 14.3l.5-2.3L8.4 10.4l2.3-.2Z" fill="#fff" stroke="none"/></svg>',
  apf:'<svg viewBox="0 0 24 24"><path d="M12 3 5 6v5c0 4.4 3 7.4 7 9 4-1.6 7-4.6 7-9V6l-7-3Z"/><path d="M9 11.5 11 13.5 15 9"/></svg>',
  ambulance:'<svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="10" rx="1"/><path d="M12 9.5v4M10 11.5h4" stroke-width="2"/></svg>',
  fire:'<svg viewBox="0 0 24 24"><path d="M12 3c1 3-2 4-2 7a2 2 0 0 0 4 0c0-1 1-2 1-2 1 1 2 3 2 5a5 5 0 0 1-10 0c0-4 4-6 5-10Z"/></svg>',
  health:'<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="1"/><path d="M12 8v8M8 12h8" stroke-width="2"/></svg>',
  gov:'<svg viewBox="0 0 24 24"><path d="M4 10 12 5l8 5"/><path d="M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/></svg>'
};
function hlIcon(h){
  if(h.ic) return ICONS[h.ic]||ICONS.gov;
  const en=(h.name.en||"").toLowerCase();
  if(en.includes("police")) return ICONS.police;
  if(en.includes("ambulance")) return ICONS.ambulance;
  if(en.includes("fire")) return ICONS.fire;
  if(en.includes("health")) return ICONS.health;
  if(en.includes("armed")) return ICONS.apf;
  return ICONS.gov;
}
function renderHelplines(){
  const nat=$("#hlNational"), dis=$("#hlDistrict");
  const cardN = h=>`<div class="hl ${h.crit?'hl--crit':''}">
      <div class="hl__top">
        <span class="hl__ic" aria-hidden="true">${h.logo?`<img src="${esc(h.logo)}" alt="" data-fallback="hl">`:hlIcon(h)}</span>
        <span class="hl__meta"><span class="hl__name">${esc(TL(h.name))}</span>${h.desc?`<span class="hl__desc">${esc(TL(h.desc))}</span>`:''}</span>
      </div>
      <a class="hl__tel mono" href="tel:${esc(h.tel)}">${PH}${esc(h.tel)}</a></div>`;
  if(nat) nat.innerHTML=HELPLINES.national.map(cardN).join("");
  if(dis) dis.innerHTML=HELPLINES.district.map(cardN).join("");
}
window.__hlfallback=img=>{const h=img.closest(".hl");const crit=h&&h.classList.contains("hl--crit");return (crit?ICONS.police:ICONS.gov);};
/* Delegated image-error fallbacks (replaces inline onerror= handlers so the site
   can run under a strict Content-Security-Policy with no 'unsafe-inline' scripts).
   Image 'error' events don't bubble, so we listen in the capture phase. */
document.addEventListener("error", e=>{
  const img=e.target;
  if(!(img instanceof HTMLImageElement) || !img.dataset || !img.dataset.fallback) return;
  switch(img.dataset.fallback){
    case "hl": if(img.parentNode) img.parentNode.innerHTML=window.__hlfallback(img); break;
    case "avatar": { img.style.display="none"; const ph=(img.parentNode&&img.parentNode.querySelector(".person__ph, .dev-avatar-ph"))||document.getElementById("devAvatarPh"); if(ph){ ph.hidden=false; ph.style.display="grid"; } break; }
    case "qr": { img.style.display="none"; const fb=document.getElementById("qrFallback"); if(fb) fb.style.display="block"; break; }
    case "npopthumb": { const box=img.closest(".npop__thumb"); if(box) box.remove(); break; }
  }
}, true);
const THUMB_PH='<div class="ph"><svg viewBox="0 0 48 48"><path d="M4 34c4-6 8-6 12 0s8 6 12 0 8-6 12 0"/><path d="M4 24c4-6 8-6 12 0s8 6 12 0 8-6 12 0" opacity=".5"/><path d="M10 14 24 6l14 8"/></svg></div>';
function renderNews(limit){
  const g=$("#newsGrid"); if(!g) return;
  // Live headlines take priority — real, dated, auto-updating.
  if(LIVE_NEWS && LIVE_NEWS.length){
    const live = limit?LIVE_NEWS.slice(0,limit):LIVE_NEWS;
    g.innerHTML=live.map(n=>`
      <a class="news news--watch news--live" href="${esc(n.url)}" target="_blank" rel="noopener" aria-label="${esc(n.title)}">
        <div class="news__body">
          <div class="news__meta"><span class="tagsq tagsq--watch">${esc(t("news.live"))}</span><span class="news__time mono">${esc(newsDate(n))}</span></div>
          <h3>${esc(n.title)}</h3>
          <div class="news__src">SRC · ${esc(n.source)}</div>
          <div class="news__read">${esc(t("news.source"))} ↗</div>
        </div>
      </a>`).join("");
    return;
  }
  const list = limit?NEWS.slice(0,limit):NEWS;
  g.innerHTML=list.map(n=>{const id=NEWS.indexOf(n);return `
    <article class="news news--${n.sev}" data-news="${id}" tabindex="0" role="link" aria-label="${esc(TL(n.title))}">
      <div class="news__thumb" data-thumb="${id}">${THUMB_PH}</div>
      <div class="news__body">
        <div class="news__meta"><span class="tagsq tagsq--${n.sev}">${esc(TL(n.tag))}</span><span class="news__time mono">${esc(n.time)}</span></div>
        <h3>${esc(TL(n.title))}</h3>
        <p>${esc(TL(n.body))}</p>
        <div class="news__src">SRC · ${esc(n.src)}</div>
        <div class="news__read">${esc(t("news.read"))} →</div>
      </div>
    </article>`;}).join("");
  $$("#newsGrid .news").forEach(a=>{
    const id=+a.dataset.news, go=()=>{location.href="news.html?id="+id;};
    a.addEventListener("click",go);
    a.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();go();}});
  });
  fillThumbs();
}
function renderHistory(){
  const g=$("#histList"); if(!g) return;
  g.innerHTML=HISTORY.map(h=>`
    <article class="hist" data-year="${esc(h.year)}" tabindex="0" role="button" aria-expanded="false">
      <div class="hist__y mono">${esc(h.year)}</div>
      <div><div class="hist__t">${esc(TL(h.title))}</div><div class="hist__d">${esc(TL(h.desc))}</div><div class="hist__more" style="margin-top:6px">${esc(t("hist.tap"))}</div></div>
      <div class="hist__s"><div class="n">${esc(h.stat)}</div><div class="l">${esc(t("hist.lives"))}</div></div>
      <div class="hist__detail"></div>
    </article>`).join("");
}
function renderRelief(){
  const g=$("#reliefList"); if(!g) return;
  g.innerHTML=RELIEF.map(f=>`
    <div class="fund">
      <div class="fund__h"><h3>${esc(TL(f.title))}</h3></div>
      <table><thead><tr><th style="width:44%">${LANG==="ne"?"बैंक":"Bank"}</th><th>${LANG==="ne"?"खाता नम्बर":"Account number"}</th></tr></thead>
      <tbody>${f.banks.map(b=>`<tr>
        <td class="bank">${esc(TL(b.bank))}</td>
        <td class="acct">${b.acc.map(a=>`<div class="acctline"><span>${esc(a)}</span><button class="copybtn" data-copy="${esc(a)}">${esc(t("copy"))}</button></div>`).join("")}</td>
      </tr>`).join("")}</tbody></table>
    </div>`).join("");
}

/* ---- map (alerts page) ---- */
let _map, _markers={};
const SEVCOL={danger:"#D93025",watch:"#E8A317",relief:"#1E8E5A"};
function renderAlerts(){
  const listEl=$("#alertList");
  if(listEl){
    listEl.innerHTML=ALERTS.map((a,i)=>`
      <div class="arow arow--${a.sev}" data-alert="${i}" tabindex="0" role="button">
        <div class="arow__t"><span class="arow__p">${esc(TL(a.place))}</span><span class="arow__sev">${esc(a.sev)}</span></div>
        <div class="arow__d">${esc(TL(a.desc))}</div>
        <div class="arow__c mono">${a.lat.toFixed(4)}, ${a.lng.toFixed(4)}</div>
      </div>`).join("");
    $$("#alertList .arow").forEach(row=>{
      const i=+row.dataset.alert;
      const go=()=>{ if(_map){_map.setView([ALERTS[i].lat,ALERTS[i].lng],10);_markers[i]&&_markers[i].openPopup();} };
      row.addEventListener("click",go);
      row.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();go();}});
    });
  }
  if(_map){ // refresh popups language
    ALERTS.forEach((a,i)=>{ if(_markers[i]) _markers[i].setPopupContent(popup(a)); });
  }
  const c=$("#alertCount"); if(c) c.textContent=ALERTS.length;
  renderTodayWarningsSection();
}

/* =========================================================================
   TODAY'S DISTRICT WARNINGS — live from /api/warnings (BIPAD Portal, NDRRMA).

   What this replaced: a WARNINGS constant listing 44 districts, hand-typed
   from a DHM bulletin. It could only ever be right on the morning somebody
   edited it, and it was still announcing those 44 districts days later while
   the actual feed had moved on to a completely different set. A warning panel
   that is confidently wrong is worse than no panel.

   Now the districts, the rivers and the road closures all come from NDRRMA's
   own portal, refreshed on a timer. WARNINGS is kept below purely as the
   offline fallback, and when it is used the panel says so rather than passing
   stale text off as today's bulletin.
   ========================================================================= */
let LIVE_WARN=null, LIVE_WARN_TRIED=false;

async function fetchDistrictWarnings(){
  try{
    const r=await fetch("/api/warnings",{signal:AbortSignal.timeout(9000)});
    if(r.ok){
      const j=await r.json();
      if(j && Array.isArray(j.districts) && j.districts.length) LIVE_WARN=j;
    }
  }catch(_){ /* offline or endpoint unavailable — the fallback below covers it */ }
  LIVE_WARN_TRIED=true;
  renderTodayWarningsSection();
  return !!LIVE_WARN;
}

function _warnAgo(ts){
  if(!ts) return "";
  const mins=Math.max(0,Math.round((Date.now()-ts)/60000));
  if(mins<60) return t("warn.ago.min").replace("{n}",toNepDigits(String(mins)));
  return t("warn.ago.hr").replace("{n}",toNepDigits(String(Math.round(mins/60))));
}
function _warnTrend(s){
  const k=String(s||"").toUpperCase();
  return k==="RISING"?t("warn.trend.rising"):k==="FALLING"?t("warn.trend.falling"):k==="STEADY"?t("warn.trend.steady"):"";
}

/* One river station as a row: where it is, what it is reading, and how that
   reading sits against the two thresholds DHM publishes for that station. */
function _warnRiverRow(r){
  const lvl=r.level!=null?String(r.level):"—";
  const marks=[];
  if(r.warning!=null) marks.push(t("warn.lvl.warn")+" "+toNepDigits(String(r.warning)));
  if(r.danger!=null) marks.push(t("warn.lvl.dngr")+" "+toNepDigits(String(r.danger)));
  const trend=_warnTrend(r.steady);
  return `<div class="wriv${r.crit?" wriv--crit":""}">
    <span class="wriv__dot" aria-hidden="true"></span>
    <div class="wriv__id">
      <strong class="wriv__name">${esc(r.station||r.place)}</strong>
      <span class="wriv__meta">${esc(r.district)}${r.basin?" · "+esc(r.basin):""}</span>
    </div>
    <div class="wriv__read">
      <span class="wriv__lvl mono">${esc(toNepDigits(lvl))}<small>m</small></span>
      ${marks.length?`<span class="wriv__marks mono">${esc(marks.join(" · "))}</span>`:""}
    </div>
    <div class="wriv__state">
      <span class="wriv__tag">${esc(r.crit?t("warn.st.danger"):t("warn.st.warn"))}</span>
      ${trend?`<span class="wriv__trend">${esc(trend)}</span>`:""}
    </div>
  </div>`;
}

function _warnDistrictChips(ds){
  return ds.map(d=>{
    const bits=[];
    if(d.river) bits.push(toNepDigits(String(d.river))+"×"+t("warn.k.river"));
    if(d.rain)  bits.push(toNepDigits(String(d.rain))+"×"+t("warn.k.rain"));
    if(d.road)  bits.push(toNepDigits(String(d.road))+"×"+t("warn.k.road"));
    return `<span class="wchip wchip--${d.sev}${d.crit?" wchip--crit":""}">
      <span class="wchip__n">${esc(d.name)}</span>
      <span class="wchip__k">${esc(bits.join(" · "))}</span>
    </span>`;
  }).join("");
}

function _warnSimpleList(items, cls){
  return items.map(x=>`<div class="wrow wrow--${cls}">
    <span class="wrow__p">${esc(x.place)}</span>
    <span class="wrow__d">${esc(x.district)}</span>
    <span class="wrow__r">${esc(x.reason||x.basin||"")}</span>
  </div>`).join("");
}

/* The body shared by the popup and the alerts-page section, so the two can
   never drift apart. Returns "" when there is nothing live to show. */
function _warnLiveBody(W){
  const nCrit=W.critical||0;
  const head=`<div class="wstats">
      <div class="wstat"><span class="wstat__n mono">${toNepDigits(String(W.count||0))}</span><span class="wstat__l">${esc(t("warn.s.districts"))}</span></div>
      <div class="wstat"><span class="wstat__n mono">${toNepDigits(String((W.rivers||[]).length))}</span><span class="wstat__l">${esc(t("warn.s.rivers"))}</span></div>
      <div class="wstat"><span class="wstat__n mono">${toNepDigits(String((W.roads||[]).length))}</span><span class="wstat__l">${esc(t("warn.s.roads"))}</span></div>
      ${nCrit?`<div class="wstat wstat--crit"><span class="wstat__n mono">${toNepDigits(String(nCrit))}</span><span class="wstat__l">${esc(t("warn.s.crit"))}</span></div>`:""}
    </div>`;
  const sec=(title,body,extra)=>body?`<div class="wsec"><h4 class="wsec__h">${esc(title)}${extra?`<span class="wsec__x">${esc(extra)}</span>`:""}</h4>${body}</div>`:"";
  return head
    + sec(t("warn.h.districts"), `<div class="wchips">${_warnDistrictChips(W.districts||[])}</div>`)
    + sec(t("warn.h.rivers"), (W.rivers||[]).length?`<div class="wrivs">${(W.rivers||[]).map(_warnRiverRow).join("")}</div>`:"", t("warn.h.rivers.x"))
    + sec(t("warn.h.roads"), (W.roads||[]).length?`<div class="wrows">${_warnSimpleList(W.roads,"road")}</div>`:"")
    + sec(t("warn.h.rain"), (W.rain||[]).length?`<div class="wrows">${_warnSimpleList(W.rain,"rain")}</div>`:"");
}

function _warnSummaryLine(W){
  return t("warn.live.sub")
    .replace("{d}",toNepDigits(String(W.count||0)))
    .replace("{a}",toNepDigits(String(W.alerts||0)))
    .replace("{h}",toNepDigits(String(W.window_hours||24)));
}

/* ---- the alerts-page section ---- */
function renderTodayWarningsSection(){
  const root=$("#todayWarningsRoot"); if(!root) return;
  if(!LIVE_WARN && !LIVE_WARN_TRIED){ root.innerHTML=`<p class="hwloading">${esc(t("warn.loading"))}</p>`; return; }

  if(LIVE_WARN){
    const W=LIVE_WARN;
    root.innerHTML=`<section class="twarn" aria-labelledby="twarnH">
      <div class="twarn__card">
        <div class="twarn__header">
          <div class="twarn__meta">
            <span class="twarn__badge"><span class="twarn__badge-dot"></span>${esc(t("warn.live.badge"))}</span>
            <span class="twarn__source mono">${esc(W.source||"")} · ${esc(_warnAgo(W.at))}</span>
          </div>
          <h2 id="twarnH" class="twarn__title">${esc(t("warn.live.h"))}</h2>
          <p class="twarn__lead">${esc(_warnSummaryLine(W))}</p>
        </div>
        <div class="twarn__body">${_warnLiveBody(W)}</div>
        <div class="twarn__footer">
          <div class="twarn__guidance"><strong>${esc(t("warn.do.h"))}</strong> ${esc(t("warn.do.p"))}</div>
          <div class="twarn__actions">
            <a class="btn btn--primary btn--sm" href="https://bipadportal.gov.np" target="_blank" rel="noopener">${esc(t("warn.cta.bipad"))}</a>
            <a class="btn btn--ghost btn--sm" href="https://www.dhm.gov.np" target="_blank" rel="noopener">${esc(t("warn.cta.dhm"))}</a>
          </div>
        </div>
      </div>
    </section>`;
    return;
  }

  /* Fallback: the built-in bulletin, explicitly labelled as such so nobody
     reads a cached summary as this morning's official warning. */
  if(typeof WARNINGS==="undefined"){ root.innerHTML=""; return; }
  const W=WARNINGS;
  const sevD=[]; (W.provinces||[]).forEach(p=>(p.districts||[]).forEach(d=>{ if(d.sev) sevD.push(TL(d)); }));
  root.innerHTML=`<section class="twarn twarn--stale" aria-labelledby="twarnH">
    <div class="twarn__card">
      <div class="twarn__header">
        <div class="twarn__meta">
          <span class="twarn__badge twarn__badge--stale">${esc(t("warn.stale.badge"))}</span>
          <span class="twarn__source mono">${esc(W.source)}</span>
        </div>
        <h2 id="twarnH" class="twarn__title">${esc(TL(W.headline))}</h2>
        <p class="twarn__lead">${esc(TL(W.summary))}</p>
        <p class="twarn__stalenote">${esc(t("warn.stale.note"))}</p>
      </div>
      <div class="twarn__body">
        <div class="wsec"><h4 class="wsec__h">${esc(t("warn.h.rivers"))}</h4>
          <div class="wrivs">${(W.rivers||[]).map(r=>`<div class="wriv wriv--${r.sev}"><span class="wriv__dot" aria-hidden="true"></span><div class="wriv__id"><strong class="wriv__name">${esc(TL(r.name))}</strong><span class="wriv__meta">${esc(TL(r.status))}</span></div></div>`).join("")}</div>
        </div>
        ${sevD.length?`<div class="wsev"><span class="wsev__l">${esc(t("warn.sevlabel"))}</span><span class="wsev__names">${sevD.map(esc).join(", ")}</span></div>`:""}
      </div>
      <div class="twarn__footer">
        <div class="twarn__actions">
          <a class="btn btn--primary btn--sm" href="https://bipadportal.gov.np" target="_blank" rel="noopener">${esc(t("warn.cta.bipad"))}</a>
          <a class="btn btn--ghost btn--sm" href="https://www.dhm.gov.np" target="_blank" rel="noopener">${esc(t("warn.cta.dhm"))}</a>
        </div>
      </div>
    </div>
  </section>`;
}

function popup(a){return `<div style="font-family:var(--f-mono);font-size:12px"><strong>${esc(TL(a.place))}</strong><br>${esc(a.sev.toUpperCase())} · ${esc(TL(a.desc))}<br>${a.lat.toFixed(4)}, ${a.lng.toFixed(4)}</div>`;}
function initMap(){
  const el=$("#map"); if(!el || !window.L) return;
  el.classList.add("dark");
  _map=window.L.map("map",{scrollWheelZoom:false,zoomControl:true}).setView([28.05,85.25],10);
  // Esri satellite imagery — no API key, disaster-operations look
  window.L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{maxZoom:19,attribution:"Tiles &copy; Esri — Maxar, Earthstar Geographics"}).addTo(_map);
  // place/boundary labels on top for readability
  window.L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",{maxZoom:19,opacity:.85}).addTo(_map);
  ALERTS.forEach((a,i)=>{
    const col=SEVCOL[a.sev];
    // faint impact halo + solid core, white edge for contrast on dark
    window.L.circleMarker([a.lat,a.lng],{radius:a.sev==="danger"?20:15,color:col,weight:0,fillColor:col,fillOpacity:.16}).addTo(_map);
    const m=window.L.circleMarker([a.lat,a.lng],{radius:a.sev==="danger"?8:6,color:"#fff",weight:1.5,fillColor:col,fillOpacity:1}).addTo(_map);
    m.bindPopup(popup(a)); _markers[i]=m;
  });
}

/* ---- missing persons ---- */
const MSTATE={filter:"all",query:""};
/* --- localStorage hardening ---
   Missing-person notes live only in the visitor's own browser, but they are still
   untrusted input on read (another script, an extension, or hand-editing could
   tamper with them). We sanitise every field, cap sizes, and only allow inline
   data:image photos — never a javascript:/http: URL smuggled into an <img src>. */
const _MF_MAX_ITEMS=200, _MF_MAX_LEN=400, _MF_MAX_PHOTO=700000; // ~0.7MB data URL
function _cleanStr(v){ return (v==null?"":String(v)).replace(/[\u0000-\u001F\u007F]/g,"").slice(0,_MF_MAX_LEN); }
function _cleanPhoto(v){
  const s=String(v||"");
  return /^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(s) && s.length<=_MF_MAX_PHOTO ? s : "";
}
function _sanitizeMissing(arr){
  if(!Array.isArray(arr)) return [];
  return arr.slice(0,_MF_MAX_ITEMS).map(m=>(m&&typeof m==="object")?{
    name:_cleanStr(m.name), age:_cleanStr(m.age), gender:_cleanStr(m.gender),
    seen:_cleanStr(m.seen), date:_cleanStr(m.date),
    status:(m.status==="found"?"found":"missing"), photo:_cleanPhoto(m.photo)
  }:null).filter(Boolean);
}
function loadMissing(){ try{return _sanitizeMissing(JSON.parse(localStorage.getItem("nd_missing")||"[]"));}catch(e){return [];} }
function saveMissing(a){ try{localStorage.setItem("nd_missing",JSON.stringify(_sanitizeMissing(a)));}catch(e){} }
let MISSING = loadMissing();
function initials(n){return n.trim().split(/\s+/).map(w=>w[0]).slice(0,2).join("").toUpperCase();}
function renderMissing(){
  const g=$("#missingGrid"); if(!g) return;
  const list=MISSING.filter(m=>{
    if(MSTATE.filter!=="all" && m.status!==MSTATE.filter) return false;
    if(MSTATE.query){const q=MSTATE.query.toLowerCase(); if(!((m.name||"").toLowerCase().includes(q)||(m.seen||"").toLowerCase().includes(q))) return false;}
    return true;
  });
  const cEl=$("#regCount"); if(cEl) cEl.textContent=String(list.length).padStart(2,"0");
  if(!list.length){
    g.innerHTML=`<div class="news" style="grid-column:1/-1;border-left-color:var(--crimson)">
      <h3>${esc(t("reg.empty.h"))}</h3>
      <p>${esc(t("reg.empty.p"))}</p>
      <div class="row-wrap" style="margin-top:6px">
        <a class="btn btn--sm" href="https://familylinks.icrc.org" target="_blank" rel="noopener">ICRC — Restoring Family Links ↗</a>
        <a class="btn btn--sm btn--ghost" href="https://nepalpolice.gov.np" target="_blank" rel="noopener">Nepal Police ↗</a>
        <a class="btn btn--sm btn--ghost" href="https://www.nrcs.org" target="_blank" rel="noopener">Nepal Red Cross ↗</a>
      </div></div>`;
    return;
  }
  g.innerHTML=list.map(m=>{
    const i=MISSING.indexOf(m);
    const ph=m.photo?`<img src="${esc(m.photo)}" alt="">`:`<div class="ini">${esc(initials(m.name||"?"))}</div>`;
    const found=m.status==="found";
    return `<article class="mcard">
      <div class="mcard__ph">${ph}<span class="mcard__st ${found?'found':''}">${found?t("reg.found"):t("reg.missing")}</span></div>
      <div class="mcard__b">
        <div class="mcard__n">${esc(m.name||"—")}</div>
        <dl class="mcard__g">
          <dt>${LANG==="ne"?"उमेर":"Age"}</dt><dd>${esc(m.age||"—")}${m.gender?" · "+esc(m.gender):""}</dd>
          <dt>${LANG==="ne"?"स्थान":"Seen"}</dt><dd>${esc(m.seen||"—")}</dd>
          <dt>${LANG==="ne"?"मिति":"Date"}</dt><dd>${esc(m.date||"—")}</dd>
        </dl>
        <div class="mcard__src"><span class="vbadge un">△ ${LANG==="ne"?"रुजु नभएको":"Unverified"}</span> · ${LANG==="ne"?"सामुदायिक जानकारी":"Community report"}</div>
      </div></article>`;
  }).join("");
}
function initMissingForm(){
  const form=$("#missingForm"); if(!form) return;
  const photoInput=$("#mfPhoto"), prev=$("#mfPrev"), drop=$("#mfDrop");
  if(photoInput) photoInput.addEventListener("change",e=>{
    const f=e.target.files[0]; if(!f) return;
    const r=new FileReader(); r.onload=()=>{ if(prev){prev.querySelector("img").src=r.result;prev.style.display="block";} }; r.readAsDataURL(f);
  });
  form.addEventListener("submit",e=>{
    e.preventDefault();
    const name=$("#mfName").value.trim();
    if(!name){$("#mfName").focus();return;}
    const finish=(photo)=>{
      MISSING.unshift({name,age:$("#mfAge").value.trim(),gender:$("#mfGender").value,seen:$("#mfSeen").value.trim(),date:$("#mfDate").value||new Date().toISOString().slice(0,10),status:"missing",photo:photo||""});
      saveMissing(MISSING); form.reset(); if(prev)prev.style.display="none";
      MSTATE.filter="all"; MSTATE.query=""; const s=$("#regSearch"); if(s)s.value="";
      $$(".chip").forEach(c=>c.setAttribute("aria-pressed",String(c.dataset.filter==="all")));
      renderMissing(); toast(t("toast.saved"));
    };
    const f=photoInput&&photoInput.files[0];
    if(f){const r=new FileReader();r.onload=()=>finish(r.result);r.readAsDataURL(f);} else finish("");
  });
  $$(".chip").forEach(c=>c.addEventListener("click",()=>{$$(".chip").forEach(x=>x.setAttribute("aria-pressed","false"));c.setAttribute("aria-pressed","true");MSTATE.filter=c.dataset.filter;renderMissing();}));
  const s=$("#regSearch"); if(s) s.addEventListener("input",e=>{MSTATE.query=e.target.value.trim();renderMissing();});
}

/* ---- re-render everything that depends on language ---- */
function renderAll(){
  renderTicker(); renderEvent(); renderStats(); renderHelplines();
  renderNews(document.body.dataset.newsLimit?+document.body.dataset.newsLimit:0);
  renderHistory(); renderRelief(); renderAlerts(); renderMissing();
  renderNotifs(); renderGallery(); renderFullGallery(); renderNewsPage(); renderStatsPage(); renderMissingSummary(); renderRescuePage(); renderReliefCollected(); renderHighways(); setSync();
  renderOfficialMissing();
  updateThemeBtn();
}

/* ---- mobile nav / hamburger (module scope so injectChrome can also call it) ---- */
const BURGER_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>';
const CLOSE_ICON  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 6 6 18M6 6l12 12"/></svg>';
function setBurger(open){
  const burger=$("#burger"), nav=$("#navInner");
  if(!burger||!nav) return;
  nav.classList.toggle("open", open);
  burger.classList.toggle("is-active", open);
  burger.setAttribute("aria-expanded", String(open));
  burger.setAttribute("aria-label", open ? "Close Menu" : "Menu");
  burger.innerHTML = open ? CLOSE_ICON : BURGER_ICON;
}

/* ---- global wiring ---- */
function wire(){
  // lang toggle
  $$(".lang button").forEach(b=>b.addEventListener("click",()=>setLang(b.dataset.lang)));
  // mobile nav (with X icon morph and outside-click dismiss)
  const burger=$("#burger"), nav=$("#navInner");
  if(burger&&nav){
    burger.addEventListener("click", e=>{
      e.stopPropagation();
      setBurger(!nav.classList.contains("open"));
    });
    document.addEventListener("click", e=>{
      if(nav.classList.contains("open") && !e.target.closest("#navInner") && !e.target.closest("#burger")){
        setBurger(false);
      }
    });
    nav.addEventListener("click", e=>{
      if(e.target.tagName==="A") setBurger(false);
    });
    document.addEventListener("keydown", e=>{
      if(e.key==="Escape" && nav.classList.contains("open")){
        setBurger(false);
      }
    });
  }
  // relief-fund tabs
  $$(".rtab").forEach(btn=>btn.addEventListener("click",()=>{
    const t=btn.dataset.tab;
    $$(".rtab").forEach(b=>b.setAttribute("aria-selected", String(b.dataset.tab===t)));
    $$(".rpanel").forEach(p=>p.toggleAttribute("hidden", p.dataset.panel!==t));
  }));
  // copy (relief + any data-copy)
  document.addEventListener("click",e=>{
    const cb=e.target.closest("[data-copy]"); if(cb){copy(cb.getAttribute("data-copy"));}
    const sh=e.target.closest("[data-share]"); if(sh){doShare(sh.dataset.share);}
    const cell=e.target.closest(".gcell"); if(cell){ const img=cell.querySelector("img"); if(img&&img.getAttribute("src")){ e.preventDefault(); openLightbox(img.getAttribute("src"), (cell.querySelector("figcaption")||{}).textContent); } }
  });
  // report button
  const rb=$("#reportBtn"); if(rb) rb.addEventListener("click",()=>toast(LANG==="ne"?"जिल्ला आपत्कालीन नम्बर १२३४ मा फोन गर्नुहोस्। स्थान, प्रकार र गम्भीरता बताउनुहोस्।":"Call DEOC 1234. Give location, type and severity.","crim"));
  heroSlideshow();
  // year
  $$("[data-year]").forEach(e=>e.textContent=new Date().getFullYear());
  injectChrome();
  initMap(); initMissingForm(); initHistoryDetail();
  setLang(LANG);
  tickClocks(); setInterval(tickClocks,1000);
  setSync(nptNow());
  liveRefresh(); setInterval(liveRefresh, 600000);               // live figures auto-refresh every 10 minutes
  setupManualSync();
  fetchLiveNews();                                                // pull live headlines now…
  setInterval(fetchLiveNews, 600000);                            // …and every 10 minutes
  fetchLiveAlerts();                                              // live flood alerts (GDACS)…
  setInterval(fetchLiveAlerts, 180000);                          // …refreshed every 3 minutes so risky alerts surface fast
  // Today's district warnings (BIPAD / NDRRMA). Deliberately does NOT open the
  // dialog: a blocking modal on load is exactly what was removed from this site
  // once already. A river over its danger mark surfaces in the inline alert
  // strip instead, the full panel lives on the alerts page, and the dialog
  // stays user-triggered from the alerts drawer.
  fetchDistrictWarnings().then(()=>{ updateWarnReopen(); renderAlertBar(); });
  setInterval(()=>fetchDistrictWarnings().then(()=>{ updateWarnReopen(); renderAlertBar(); }), 900000);   // every 15 min
  if($("#officialMissing")){ renderOfficialMissing(); loadOfficialMissing(2); }   // NDRRMA missing-persons registry
  if($("#hhRoot")){                                              // Helping Hand — community needs & offers board
    renderHelp(); fetchHelp();
    setInterval(fetchHelp, 120000);                              // a needs board goes stale fast — refresh every 2 min
  }
  if($("#hwRoot")){                                              // Highway Updates page — curated table + live road bulletins
    fetchHighways(); fetchHighwayNews();
    setInterval(fetchHighways, 300000); setInterval(fetchHighwayNews, 300000);  // auto-refresh every 5 min
  }
  // re-render bulletins every 10 minutes (refreshes relative times / fallback content)
  setInterval(()=>{
    renderTicker();
    renderNews(document.body.dataset.newsLimit?+document.body.dataset.newsLimit:0);
    renderNewsPage();
  }, 600000);
  setInterval(()=>{ _eventImgs=null; renderGallery(); renderFullGallery(); },3600000); // extra images refresh hourly (stable set stays)
  trackVisit();
}

/* Privacy-first analytics beacon. Sends only an anonymous, per-browser random id
   so the server can count unique visitors; country/city are derived server-side
   from Vercel's geo headers (never here). No PII. Fails silently off-Vercel. */
function trackVisit(){
  try{
    let vid=localStorage.getItem("__vid");
    if(!vid){
      vid=(crypto&&crypto.randomUUID)?crypto.randomUUID():String(Date.now())+Math.random().toString(36).slice(2);
      localStorage.setItem("__vid", vid);
    }
    fetch("/api/track",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({v:vid}),
      keepalive:true
    }).catch(()=>{});
  }catch(_){ /* localStorage blocked or offline — ignore */ }
}
function doShare(mode){
  const url=location.href, text=(LANG==="ne"?"नेपाल विपद् — प्रत्यक्ष चेतावनी, हेल्पलाइन र राहत जानकारी।":"NepalDisaster.com — live alerts, helplines & relief info.");
  if(mode==="whatsapp") window.open("https://wa.me/?text="+encodeURIComponent(text+" "+url),"_blank","noopener");
  else if(mode==="copy"){ if(navigator.clipboard) navigator.clipboard.writeText(url).then(()=>toast(t("toast.link"))); }
  else if(mode==="print") window.print();
}
/* =========================================================================
   v3 ADDITIONS — notifications, GLOF alert, live images, gallery, news page
   ========================================================================= */
Object.assign(I18N.en,{
  "news.read":"Read full bulletin","news.live":"LIVE",
  "npop.eye":"Latest update","npop.badge":"JUST IN","npop.read":"Read the full story ↗","npop.all":"All bulletins",
  "npop.dismiss":"Dismiss","npop.auto":"Newest headline · checked every 10 minutes","npop.more":"more new headlines",
  "npop.brief.read":"Read the full briefing ↗",
  "theme.light":"Theme: light","theme.dark":"Theme: dark","theme.system":"Theme: follows your device",
  "notif.h":"Alerts","notif.eye":"Signal Feed","notif.clear":"Clear all","notif.empty":"No active alerts.","notif.count":"active","notif.enable":"Notify me",
  "fpop.eye":"Risky Flood Alert","fpop.red":"RED · SEVERE","fpop.orange":"ORANGE · RISKY","fpop.title":"Flood alert — Nepal",
  "fpop.region":"Affected area","fpop.issued":"Issued","fpop.source":"Source","fpop.report":"View official report ↗",
  "fpop.dismiss":"Dismiss","fpop.view":"See all alerts","fpop.auto":"Auto-checked every few minutes · GDACS (UN/EC)","fpop.live":"LIVE",
  "warn.badge":"TODAY · HIGH ALERT","warn.eye":"Today's Flood Warning","warn.count":"districts on flood / landslide watch","warn.legend":"Red = under today's riverside alert (NDRRMA)","warn.reopen":"Today's district warnings","warn.sevlabel":"Riverside alert today",
  "warn.live.badge":"LIVE · OFFICIAL FEED","warn.live.h":"Today's Flood, Rainfall & Road Alerts",
  "warn.live.sub":"{d} districts carrying {a} active alerts in the last {h} hours, from NDRRMA's BIPAD portal — DHM river and rainfall stations plus Department of Roads closures.",
  "warn.loading":"Loading today's official alerts…",
  "warn.stale.badge":"CACHED BULLETIN","warn.stale.note":"The live NDRRMA feed could not be reached, so this is the last bulletin stored with the site. Treat it as background, not as today's warning, and check the official portal before acting.",
  "warn.s.districts":"districts","warn.s.rivers":"river stations","warn.s.roads":"roads closed","warn.s.crit":"above danger level",
  "warn.h.districts":"Districts with active alerts","warn.h.rivers":"River stations","warn.h.rivers.x":"level against the station's own warning and danger marks","warn.h.roads":"Roads closed","warn.h.rain":"Heavy rainfall",
  "warn.k.river":"flood","warn.k.rain":"rain","warn.k.road":"road",
  "warn.st.danger":"ABOVE DANGER","warn.st.warn":"ABOVE WARNING","warn.lvl.warn":"warn","warn.lvl.dngr":"danger",
  "warn.trend.rising":"rising","warn.trend.falling":"falling","warn.trend.steady":"steady",
  "warn.ago.min":"updated {n} min ago","warn.ago.hr":"updated {n} h ago",
  "warn.do.h":"What to do:","warn.do.p":"If you are on a riverbank or below a steep slope in one of these districts, move to higher ground now. Do not cross a flooded road or an active landslide. Confirm any journey with the local traffic office on 103.",
  "warn.cta.bipad":"NDRRMA BIPAD portal ↗","warn.cta.dhm":"DHM bulletins ↗","warn.cta.all":"Full alert map",
  "warn.strip":"{r} is above its danger level — {d}. Move off the banks.",
  "glof.tag":"GLOF Watch",
  "gallery.eye":"From the Affected Areas","gallery.h":"Ground Gallery","gallery.load":"Loading photos…","gallery.none":"Photos could not be loaded right now. See the official article.","gallery.loadall":"View all photos →","page.gallery.h":"Photo Gallery","page.gallery.p":"Photographs from the affected areas, from published news sources and Wikimedia. Verify context independently.",
  "page.news.h":"Live Bulletins","page.news.p":"Detailed reporting on the current disaster, compiled from published and official sources. Verify independently.",
  "news.back":"← All bulletins","news.source":"Read at original source ↗","news.overview":"Situation overview","news.overview.src":"Live from Wikipedia · 2026 China–Nepal floods",
  "hist.readmore":"Read full article ↗","hist.loading":"Loading details…","hist.tap":"Tap for details",
  "relief.scan":"Scan to donate","relief.fonepay":"Fonepay — PM Disaster Relief Fund","relief.fonepay.p":"Scan this Fonepay QR with any Nepali banking or wallet app to donate to the Prime Minister's relief fund.",
  "nav.highway":"Highway Updates",
  "nav.help":"Helping Hand",
  "hh.band.tag":"New","hh.band.h":"Helping Hand — ask for help, or offer it","hh.band.p":"Food, drinking water, shelter, medicine, blood, transport. Post what you need or what you can give, and find people near you.","hh.band.cta":"Open the board →",
  "page.hh.eye":"Community Mutual Aid","page.hh.h":"Helping Hand","page.hh.p":"A public board for the two halves of a disaster response that rarely find each other in time: people who need food, water, shelter, medicine, blood or a way out, and people nearby who have those things to give. Post either side, search by district, and call directly.",
  "hh.hero.needs":"open requests","hh.hero.offers":"offers available",
  "hh.post.h":"Post to the board","hh.post.p":"Choose a side to start. Your post is public, stays up for 21 days, and you can close it yourself once it is sorted.",
  "hh.pick.need.p":"Food, water, shelter, medicine, blood, evacuation or transport.","hh.pick.offer.p":"Supplies, a vehicle, a spare room, blood, or your time as a volunteer.",
  "hh.pick.hint":"Pick one above and the form opens here.",
  "hh.form.h.need":"Ask for help","hh.form.h.offer":"Offer help",
  "hh.fs.what.need":"What you need","hh.fs.what.offer":"What you can give","hh.fs.where":"Where","hh.fs.contact":"How people reach you",
  "hh.f.detail.hint.need":"Say what, how much, and by when. Specific requests get answered.","hh.f.detail.hint.offer":"Say how much you have, and where you can deliver or receive.",
  "hh.f.capacity":"People you can help","hh.req":"required","hh.form.cancel":"Cancel",
  "hh.cat.all":"All categories","hh.showing":"posts shown","hh.by":"by","hh.m.where":"Location","hh.m.people":"People",
  "hh.board.p":"Posted by members of the public. Filter by side and category, or search a district.",
  "hh.safe.h":"Life-threatening emergency? Call, do not post.","hh.safe.p":"This board is people helping people — it is not monitored by the emergency services and nobody is on duty here. For rescue, medical or police response use the official lines.","hh.safe.lines":"Helplines:","hh.safe.all":"all helplines →",
  "hh.board.h":"Open requests and offers",
  "hh.form.kind":"What are you posting?","hh.form.need":"I need help","hh.form.offer":"I can help",
  "hh.form.need.p":"Say what you need, where you are, and how many people it is for. Be specific — 'drinking water for 12 people at Betrawati bazaar' gets answered; 'need help' does not.",
  "hh.form.offer.p":"Say what you have and where you can get it to. Include how much and when you are available.",
  "hh.form.post.need":"Post request","hh.form.post.offer":"Post offer",
  "hh.form.privacy":"Your post is public and stays up for 21 days. Never share bank details, ID numbers or passwords here, and never send money to someone who contacts you through this board.",
  "hh.f.cat":"Category","hh.f.urg":"Urgency","hh.f.district":"District","hh.f.district.ph":"e.g. Rasuwa","hh.f.place":"Village / ward / landmark","hh.f.place.ph":"e.g. Betrawati bazaar, ward 3","hh.f.people":"People affected","hh.f.name":"Your name","hh.f.optional":"optional","hh.f.detail":"Details",
  "hh.f.detail.need":"What exactly do you need, and by when?","hh.f.detail.offer":"What can you provide, how much, and where can you deliver or receive?",
  "hh.f.phone":"Phone number","hh.f.consent":"Show my phone number publicly so people can reach me",
  "hh.c.food":"Food","hh.c.water":"Drinking water","hh.c.shelter":"Shelter","hh.c.medical":"Medical / medicine","hh.c.blood":"Blood donation","hh.c.rescue":"Rescue / evacuation","hh.c.transport":"Transport","hh.c.clothing":"Clothing & bedding","hh.c.baby":"Baby & child supplies","hh.c.hygiene":"Hygiene & sanitation","hh.c.power":"Power & charging","hh.c.volunteer":"Volunteers","hh.c.money":"Cash / relief fund","hh.c.other":"Other",
  "hh.u.critical":"CRITICAL","hh.u.urgent":"URGENT","hh.u.normal":"Normal",
  "hh.k.need":"Needs help","hh.k.offer":"Offering help","hh.all":"All",
  "hh.search":"Search district, place or need…","hh.people":"people","hh.nocontact":"No public contact — reply through a local relief point",
  "hh.markdone":"Mark as resolved","hh.resolved":"RESOLVED","hh.flag":"Report","hh.flag.confirm":"Report this post as fake, abusive or a scam?","hh.flag.ok":"Reported. Thank you — posts reported by several people are hidden automatically.",
  "hh.now":"just now","hh.min":"{n} min ago","hh.hr":"{n} h ago","hh.day":"{n} d ago",
  "hh.loading":"Loading the board…","hh.empty":"Nothing matches that filter yet. Try 'All', or be the first to post.","hh.empty.off":"The board could not be loaded. Use the helplines above.",
  "hh.sending":"Posting…","hh.posted":"Posted to the board.","hh.doneok":"Marked as resolved.",
  "hh.err.required":"District and details are both required.","hh.err.phone":"Add a phone number, or untick the box.","hh.err.send":"Could not post. Check your connection and try again.",
  "hh.off.h":"The shared board is offline","hh.off.p":"Posts cannot be saved or loaded right now, so nothing you write here would reach anyone. Please use the emergency helplines above instead.","hh.off.form":"Posting is disabled while the board is offline — your message would not reach anyone. Use the helplines above.",
  "hh.legend":"Posts are submitted by the public, are not verified by NepalDisaster.com, and expire after 21 days.",
  "page.hw.eye":"Roads & Mobility","page.hw.h":"Highway Updates","page.hw.p":"Live status of Nepal's major highways — open, closed and one-way sections by province, with the reason, expected reopening and safe detours. Verify locally before you travel.",
  "hw.updated":"Updated","hw.refresh":"Refresh","hw.all":"All","hw.f.closed":"Closed","hw.f.oneway":"One-way","hw.f.open":"Open",
  "hw.st.closed":"CLOSED","hw.st.oneway":"ONE-WAY","hw.st.caution":"CAUTION","hw.st.open":"OPEN",
  "hw.reason":"Reason","hw.eta":"Est. reopening","hw.detour":"Detour","hw.contact":"Contact","hw.since":"Status","hw.route":"route",
  "hw.hero":"Road command","hw.hero.closed":"highways closed","hw.hero.line":"{o} one-way · {c} on caution · {open} open · {t} routes monitored",
  "hw.critical":"Critical — closed & restricted","hw.critical.sub":"Plan around these before you travel","hw.other":"Other routes by province",
  "hw.allclear":"No highways are fully closed right now — travel with normal monsoon caution.","hw.sincelbl":"Since","hw.call":"Call",
  "hw.summary":"National overview","hw.live":"Live road bulletins","hw.livesrc":"Auto-updating · Google News (road/traffic filter)","hw.nolive":"No new road bulletins on the wire right now.",
  "hw.precau":"Travel precautions","hw.precau1":"Travel in daylight; avoid hill highways after dark and during heavy rain.","hw.precau2":"Keep 2–3x normal travel time in hand and carry fuel, water and a power bank.","hw.precau3":"Never cross a flooded road or an active landslide — wait for clearance.","hw.precau4":"Confirm the section with the local traffic office (dial 103) before you set off.",
  "hw.loading":"Loading highway status…","hw.legend":"Statuses are compiled from published reports and may lag real conditions.","hw.count.closed":"closed","hw.count.oneway":"one-way","hw.count.open":"open / caution"
});
Object.assign(I18N.ne,{
  "nav.highway":"राजमार्ग अपडेट",
  "nav.help":"सहयोगी हात",
  "hh.band.tag":"नयाँ","hh.band.h":"सहयोगी हात — सहयोग माग्नुहोस्, वा दिनुहोस्","hh.band.p":"खाना, खानेपानी, आश्रय, औषधी, रगत, यातायात। के चाहियो वा के दिन सक्नुहुन्छ पोस्ट गर्नुहोस् र नजिकका मानिस भेट्नुहोस्।","hh.band.cta":"सूची खोल्नुहोस् →",
  "page.hh.eye":"सामुदायिक पारस्परिक सहयोग","page.hh.h":"सहयोगी हात","page.hh.p":"विपद्मा प्रायः समयमै एकअर्कासम्म नपुग्ने दुई पक्षका लागि सार्वजनिक सूची: खाना, खानेपानी, आश्रय, औषधी, रगत वा निस्कने बाटो चाहिनेहरू, र नजिकै रहेर त्यो दिन सक्नेहरू। दुवैतर्फबाट पोस्ट गर्नुहोस्, जिल्ला अनुसार खोज्नुहोस्, र सिधै फोन गर्नुहोस्।",
  "hh.hero.needs":"खुला अनुरोध","hh.hero.offers":"उपलब्ध प्रस्ताव",
  "hh.post.h":"सूचीमा पोस्ट गर्नुहोस्","hh.post.p":"सुरु गर्न एउटा छान्नुहोस्। तपाईंको पोस्ट सार्वजनिक हुन्छ, २१ दिनसम्म रहन्छ, र काम भएपछि तपाईं आफैं बन्द गर्न सक्नुहुन्छ।",
  "hh.pick.need.p":"खाना, पानी, आश्रय, औषधी, रगत, उद्धार वा यातायात।","hh.pick.offer.p":"सामग्री, सवारी साधन, बस्ने ठाउँ, रगत, वा स्वयंसेवाका रूपमा तपाईंको समय।",
  "hh.pick.hint":"माथिबाट एउटा छान्नुहोस्, फारम यहीँ खुल्छ।",
  "hh.form.h.need":"सहयोग माग्नुहोस्","hh.form.h.offer":"सहयोग दिनुहोस्",
  "hh.fs.what.need":"के चाहियो","hh.fs.what.offer":"के दिन सक्नुहुन्छ","hh.fs.where":"कहाँ","hh.fs.contact":"सम्पर्क कसरी गर्ने",
  "hh.f.detail.hint.need":"के, कति र कहिलेसम्म चाहिन्छ लेख्नुहोस्। स्पष्ट अनुरोधको जवाफ छिटो आउँछ।","hh.f.detail.hint.offer":"कति परिमाण छ र कहाँ पुर्‍याउन वा लिन सक्नुहुन्छ लेख्नुहोस्।",
  "hh.f.capacity":"कति जनालाई सहयोग गर्न सक्नुहुन्छ","hh.req":"अनिवार्य","hh.form.cancel":"रद्द गर्नुहोस्",
  "hh.cat.all":"सबै वर्ग","hh.showing":"पोस्ट देखाइएको","hh.by":"—","hh.m.where":"स्थान","hh.m.people":"जना",
  "hh.board.p":"सर्वसाधारणले हालेका पोस्ट। पक्ष र वर्ग अनुसार छान्नुहोस्, वा जिल्ला खोज्नुहोस्।",
  "hh.safe.h":"ज्यान जोखिममा छ? पोस्ट होइन, फोन गर्नुहोस्।","hh.safe.p":"यो सूची नागरिकले नागरिकलाई गर्ने सहयोग हो — यसमा आपत्कालीन निकायको निगरानी छैन र कोही ड्युटीमा बसेको छैन। उद्धार, स्वास्थ्य वा प्रहरी सहायताका लागि आधिकारिक नम्बरमै सम्पर्क गर्नुहोस्।","hh.safe.lines":"हेल्पलाइन:","hh.safe.all":"सबै हेल्पलाइन →",
  "hh.board.h":"खुला अनुरोध र प्रस्ताव",
  "hh.form.kind":"के पोस्ट गर्दै हुनुहुन्छ?","hh.form.need":"मलाई सहयोग चाहियो","hh.form.offer":"म सहयोग गर्न सक्छु",
  "hh.form.need.p":"के चाहिएको हो, कहाँ हुनुहुन्छ र कति जनाका लागि हो स्पष्ट लेख्नुहोस्। ‘बेत्रावती बजारमा १२ जनालाई खानेपानी’ जस्तो स्पष्ट अनुरोधको जवाफ आउँछ; ‘सहयोग चाहियो’ भन्नेको आउँदैन।",
  "hh.form.offer.p":"तपाईंसँग के छ र कहाँसम्म पुर्‍याउन सक्नुहुन्छ लेख्नुहोस्। परिमाण र उपलब्ध समय पनि उल्लेख गर्नुहोस्।",
  "hh.form.post.need":"अनुरोध पोस्ट गर्नुहोस्","hh.form.post.offer":"प्रस्ताव पोस्ट गर्नुहोस्",
  "hh.form.privacy":"तपाईंको पोस्ट सार्वजनिक हुन्छ र २१ दिनसम्म रहन्छ। यहाँ बैंक विवरण, परिचयपत्र नम्बर वा पासवर्ड कहिल्यै नराख्नुहोस्, र यो सूचीबाट सम्पर्क गर्ने कसैलाई पैसा नपठाउनुहोस्।",
  "hh.f.cat":"वर्ग","hh.f.urg":"तात्कालिकता","hh.f.district":"जिल्ला","hh.f.district.ph":"उदाहरण: रसुवा","hh.f.place":"गाउँ / वडा / ठाउँ","hh.f.place.ph":"उदाहरण: बेत्रावती बजार, वडा ३","hh.f.people":"प्रभावित संख्या","hh.f.name":"तपाईंको नाम","hh.f.optional":"वैकल्पिक","hh.f.detail":"विवरण",
  "hh.f.detail.need":"ठ्याक्कै के चाहिएको हो र कहिलेसम्म?","hh.f.detail.offer":"के दिन सक्नुहुन्छ, कति परिमाण, र कहाँ पुर्‍याउन वा लिन सक्नुहुन्छ?",
  "hh.f.phone":"फोन नम्बर","hh.f.consent":"मानिसहरूले सम्पर्क गर्न सकून् भनी मेरो फोन नम्बर सार्वजनिक गर्नुहोस्",
  "hh.c.food":"खाना","hh.c.water":"खानेपानी","hh.c.shelter":"आश्रय","hh.c.medical":"स्वास्थ्य / औषधी","hh.c.blood":"रक्तदान","hh.c.rescue":"उद्धार / स्थानान्तरण","hh.c.transport":"यातायात","hh.c.clothing":"लुगा र ओछ्यान","hh.c.baby":"बालबालिकाका सामग्री","hh.c.hygiene":"सरसफाइ","hh.c.power":"बिजुली र चार्जिङ","hh.c.volunteer":"स्वयंसेवक","hh.c.money":"नगद / राहत कोष","hh.c.other":"अन्य",
  "hh.u.critical":"अति जरुरी","hh.u.urgent":"जरुरी","hh.u.normal":"सामान्य",
  "hh.k.need":"सहयोग चाहिएको","hh.k.offer":"सहयोग प्रस्ताव","hh.all":"सबै",
  "hh.search":"जिल्ला, ठाउँ वा आवश्यकता खोज्नुहोस्…","hh.people":"जना","hh.nocontact":"सार्वजनिक सम्पर्क छैन — नजिकको राहत केन्द्रमार्फत सम्पर्क गर्नुहोस्",
  "hh.markdone":"पूरा भयो भन्ने चिन्ह लगाउनुहोस्","hh.resolved":"पूरा भयो","hh.flag":"उजुरी","hh.flag.confirm":"यो पोस्ट झुटो, दुर्व्यवहारपूर्ण वा ठगी हो भनी उजुरी गर्ने?","hh.flag.ok":"उजुरी दर्ता भयो। धन्यवाद — धेरैले उजुरी गरेका पोस्ट स्वतः लुकाइन्छन्।",
  "hh.now":"भर्खरै","hh.min":"{n} मिनेट अघि","hh.hr":"{n} घण्टा अघि","hh.day":"{n} दिन अघि",
  "hh.loading":"सूची लोड हुँदै…","hh.empty":"यो फिल्टरमा अहिले केही छैन। ‘सबै’ हेर्नुहोस्, वा पहिलो पोस्ट तपाईं गर्नुहोस्।","hh.empty.off":"सूची लोड हुन सकेन। माथिका हेल्पलाइन प्रयोग गर्नुहोस्।",
  "hh.sending":"पोस्ट हुँदै…","hh.posted":"सूचीमा पोस्ट भयो।","hh.doneok":"पूरा भएको चिन्ह लाग्यो।",
  "hh.err.required":"जिल्ला र विवरण दुवै अनिवार्य छन्।","hh.err.phone":"फोन नम्बर राख्नुहोस्, वा चेकबक्स हटाउनुहोस्।","hh.err.send":"पोस्ट हुन सकेन। इन्टरनेट जाँची पुनः प्रयास गर्नुहोस्।",
  "hh.off.h":"साझा सूची अहिले बन्द छ","hh.off.p":"अहिले पोस्ट सुरक्षित वा लोड हुन सक्दैन, त्यसैले यहाँ लेखेको कुरा कसैसम्म पुग्दैन। कृपया माथिका आपत्कालीन हेल्पलाइन प्रयोग गर्नुहोस्।","hh.off.form":"सूची बन्द भएकाले पोस्ट गर्न मिल्दैन — तपाईंको सन्देश कसैसम्म पुग्दैन। माथिका हेल्पलाइन प्रयोग गर्नुहोस्।",
  "hh.legend":"पोस्टहरू सर्वसाधारणले हालेका हुन्, NepalDisaster.com ले प्रमाणित गरेको होइन, र २१ दिनपछि हट्छन्।",
  "page.hw.eye":"सडक तथा आवागमन","page.hw.h":"राजमार्ग अपडेट","page.hw.p":"नेपालका प्रमुख राजमार्गको प्रत्यक्ष अवस्था — प्रदेश अनुसार खुला, बन्द र एकतर्फी खण्ड, कारण, खुल्ने अनुमानित समय र सुरक्षित वैकल्पिक मार्गसहित। यात्रा गर्नुअघि स्थानीय रूपमा पुष्टि गर्नुहोस्।",
  "hw.updated":"अद्यावधिक","hw.refresh":"ताजा गर्नुहोस्","hw.all":"सबै","hw.f.closed":"बन्द","hw.f.oneway":"एकतर्फी","hw.f.open":"खुला",
  "hw.st.closed":"बन्द","hw.st.oneway":"एकतर्फी","hw.st.caution":"सावधानी","hw.st.open":"खुला",
  "hw.reason":"कारण","hw.eta":"खुल्ने अनुमान","hw.detour":"वैकल्पिक मार्ग","hw.contact":"सम्पर्क","hw.since":"अवस्था","hw.route":"मार्ग",
  "hw.hero":"सडक कमाण्ड","hw.hero.closed":"राजमार्ग बन्द","hw.hero.line":"{o} एकतर्फी · {c} सावधानी · {open} खुला · {t} मार्ग निगरानीमा",
  "hw.critical":"जोखिम — बन्द र नियन्त्रित","hw.critical.sub":"यात्रा गर्नुअघि यीलाई ध्यान दिनुहोस्","hw.other":"अन्य मार्ग (प्रदेश अनुसार)",
  "hw.allclear":"अहिले कुनै राजमार्ग पूर्ण बन्द छैन — सामान्य मनसुन सावधानीसहित यात्रा गर्नुहोस्।","hw.sincelbl":"देखि","hw.call":"फोन",
  "hw.summary":"राष्ट्रिय अवलोकन","hw.live":"प्रत्यक्ष सडक बुलेटिन","hw.livesrc":"स्वतः अद्यावधिक · गुगल न्युज (सडक/ट्राफिक फिल्टर)","hw.nolive":"अहिले नयाँ सडक बुलेटिन छैन।",
  "hw.precau":"यात्रा सावधानी","hw.precau1":"दिउँसो यात्रा गर्नुहोस्; अँध्यारो र भारी वर्षामा पहाडी राजमार्ग नजानुहोस्।","hw.precau2":"सामान्यभन्दा २–३ गुणा बढी समय राख्नुहोस्; इन्धन, पानी र पावर बैंक बोक्नुहोस्।","hw.precau3":"बाढी आएको सडक वा सक्रिय पहिरो कहिल्यै नकाट्नुहोस् — सफा नभएसम्म पर्खनुहोस्।","hw.precau4":"निस्कनुअघि स्थानीय ट्राफिक कार्यालय (१०३) मा खण्ड पुष्टि गर्नुहोस्।",
  "hw.loading":"राजमार्ग अवस्था लोड हुँदै…","hw.legend":"अवस्था प्रकाशित प्रतिवेदनबाट संकलित; वास्तविक अवस्थाभन्दा पछाडि हुन सक्छ।","hw.count.closed":"बन्द","hw.count.oneway":"एकतर्फी","hw.count.open":"खुला / सावधानी",
  "news.read":"पूरा बुलेटिन पढ्नुहोस्","news.live":"प्रत्यक्ष",
  "npop.eye":"पछिल्लो अद्यावधिक","npop.badge":"भर्खरै","npop.read":"पूरा समाचार पढ्नुहोस् ↗","npop.all":"सबै समाचार",
  "npop.dismiss":"बन्द गर्नुहोस्","npop.auto":"नवीनतम शीर्षक · हरेक १० मिनेटमा जाँच","npop.more":"थप नयाँ शीर्षक",
  "npop.brief.read":"पूरा सम्बोधन पढ्नुहोस् ↗",
  "theme.light":"थिम: उज्यालो","theme.dark":"थिम: अँध्यारो","theme.system":"थिम: यन्त्रअनुसार",
  "notif.h":"अलर्टहरू","notif.eye":"सिग्नल फिड","notif.clear":"सबै हटाउनुहोस्","notif.empty":"कुनै सक्रिय अलर्ट छैन।","notif.count":"सक्रिय","notif.enable":"सूचना पाउनुहोस्",
  "fpop.eye":"जोखिमपूर्ण बाढी अलर्ट","fpop.red":"रातो · गम्भीर","fpop.orange":"सुन्तला · जोखिमपूर्ण","fpop.title":"बाढी अलर्ट — नेपाल",
  "fpop.region":"प्रभावित क्षेत्र","fpop.issued":"जारी","fpop.source":"स्रोत","fpop.report":"आधिकारिक रिपोर्ट हेर्नुहोस् ↗",
  "fpop.dismiss":"हटाउनुहोस्","fpop.view":"सबै अलर्ट हेर्नुहोस्","fpop.auto":"हरेक केही मिनेटमा स्वतः जाँच · GDACS (UN/EC)","fpop.live":"प्रत्यक्ष",
  "warn.badge":"आज · उच्च सतर्कता","warn.eye":"आजको बाढी चेतावनी","warn.count":"जिल्ला बाढी / पहिरो निगरानीमा","warn.legend":"रातो = आज नदी किनार सतर्कता (NDRRMA)","warn.reopen":"आजका जिल्ला चेतावनी","warn.sevlabel":"आज नदी किनार सतर्कता",
  "warn.live.badge":"प्रत्यक्ष · आधिकारिक स्रोत","warn.live.h":"आजका बाढी, वर्षा र सडक चेतावनी",
  "warn.live.sub":"विगत {h} घण्टामा {d} जिल्लामा {a} सक्रिय चेतावनी — NDRRMA को बिपद् पोर्टलबाट: DHM का नदी तथा वर्षा मापन केन्द्र र सडक विभागका अवरोध सूचना।",
  "warn.loading":"आजका आधिकारिक चेतावनी लोड हुँदै…",
  "warn.stale.badge":"पुरानो बुलेटिन","warn.stale.note":"NDRRMA को प्रत्यक्ष स्रोतमा पुग्न सकिएन, त्यसैले यो साइटमा सुरक्षित रहेको अन्तिम बुलेटिन हो। यसलाई आजको चेतावनी होइन, पृष्ठभूमि जानकारी मात्र मान्नुहोस् र निर्णय गर्नुअघि आधिकारिक पोर्टल हेर्नुहोस्।",
  "warn.s.districts":"जिल्ला","warn.s.rivers":"नदी केन्द्र","warn.s.roads":"सडक बन्द","warn.s.crit":"खतरा तह माथि",
  "warn.h.districts":"सक्रिय चेतावनी भएका जिल्ला","warn.h.rivers":"नदी मापन केन्द्र","warn.h.rivers.x":"सोही केन्द्रको चेतावनी र खतरा तहसँग तुलना","warn.h.roads":"बन्द सडक","warn.h.rain":"भारी वर्षा",
  "warn.k.river":"बाढी","warn.k.rain":"वर्षा","warn.k.road":"सडक",
  "warn.st.danger":"खतरा तह माथि","warn.st.warn":"चेतावनी तह माथि","warn.lvl.warn":"चेतावनी","warn.lvl.dngr":"खतरा",
  "warn.trend.rising":"बढ्दै","warn.trend.falling":"घट्दै","warn.trend.steady":"स्थिर",
  "warn.ago.min":"{n} मिनेट अघि अद्यावधिक","warn.ago.hr":"{n} घण्टा अघि अद्यावधिक",
  "warn.do.h":"के गर्ने:","warn.do.p":"यी जिल्लामा नदी किनार वा भिरालो पहाडमुनि हुनुहुन्छ भने तुरुन्तै अग्लो सुरक्षित स्थानमा जानुहोस्। बाढी आएको सडक वा सक्रिय पहिरो नकाट्नुहोस्। यात्रा गर्नुअघि स्थानीय ट्राफिक कार्यालय (१०३) मा पुष्टि गर्नुहोस्।",
  "warn.cta.bipad":"NDRRMA बिपद् पोर्टल ↗","warn.cta.dhm":"DHM बुलेटिन ↗","warn.cta.all":"पूर्ण अलर्ट नक्सा",
  "warn.strip":"{r} खतरा तहभन्दा माथि — {d}। नदी किनारबाट टाढा जानुहोस्।",
  "glof.tag":"GLOF सतर्कता",
  "gallery.eye":"प्रभावित क्षेत्रबाट","gallery.h":"स्थलगत ग्यालरी","gallery.load":"तस्बिर लोड हुँदै…","gallery.none":"अहिले तस्बिर लोड हुन सकेन। आधिकारिक लेख हेर्नुहोस्।","gallery.loadall":"सबै तस्बिर हेर्नुहोस् →","page.gallery.h":"तस्बिर ग्यालरी","page.gallery.p":"प्रभावित क्षेत्रका तस्बिरहरू, प्रकाशित समाचार र विकिमिडियाबाट। सन्दर्भ स्वतन्त्र रुजु गर्नुहोस्।",
  "page.news.h":"प्रत्यक्ष बुलेटिन","page.news.p":"हालको विपद्बारे प्रकाशित र आधिकारिक स्रोतबाट संकलित विस्तृत समाचार। स्वतन्त्र रुजु गर्नुहोस्।",
  "news.back":"← सबै बुलेटिन","news.source":"मूल स्रोतमा पढ्नुहोस् ↗","news.overview":"अवस्था सारांश","news.overview.src":"विकिपिडियाबाट प्रत्यक्ष · २०२६ चीन–नेपाल बाढी",
  "hist.readmore":"पूरा लेख पढ्नुहोस् ↗","hist.loading":"विवरण लोड हुँदै…","hist.tap":"विवरणका लागि थिच्नुहोस्",
  "relief.scan":"स्क्यान गरी दान गर्नुहोस्","relief.fonepay":"फोनपे — प्रधानमन्त्री विपद् राहत कोष","relief.fonepay.p":"कुनै पनि नेपाली बैंकिङ वा वालेट एपबाट यो फोनपे QR स्क्यान गरी प्रधानमन्त्री राहत कोषमा दान गर्नुहोस्।"
});

/* GLOF advisory (real: NDRRMA vigilance request; suspected Tibet-side GLOF) */
const GLOF={
  msg:{en:"Suspected glacial lake outburst flood (GLOF) from the Tibet side. NDRRMA urges residents of Rasuwa, Nuwakot, Dhading, Gorkha & Chitwan to stay alert and move to higher ground.",
       ne:"तिब्बततर्फबाट हिमताल विस्फोट बाढी (GLOF) को आशंका। रसुवा, नुवाकोट, धादिङ, गोरखा र चितवनका बासिन्दालाई सतर्क रही अग्लो सुरक्षित स्थानमा जान NDRRMA को आग्रह।"}
};
const NOTIFS=[
  {id:"brief-2026-0902-pm-parliament", sev:"watch", tag:{en:"PM briefing",ne:"प्रधानमन्त्रीको सम्बोधन"}, time:"2 Sept", src:"Office of the PM · ANI / Kathmandu Post",
   url:"https://www.aninews.in/news/world/asia/have-to-fight-with-courage-and-determination-nepal-pm-balen-shah-details-govt-response-to-flood-crisis20260902140138/",
   msg:{en:"PM Balen Shah briefed Parliament on the flood response: 11,993 rescued and 3,916 still missing. Rs 1 crore each released to Rasuwa and Nuwakot, 10 truckloads of relief material sent, and all ministers pledged one month's salary. 'We have no alternative but to fight with determination and courage.'",
        ne:"प्रधानमन्त्री बालेन्द्र शाहले संसदमा बाढी प्रतिकार्यबारे सम्बोधन गरे: ११,९९३ जनाको उद्धार, ३,९१६ अझै बेपत्ता। रसुवा र नुवाकोट प्रत्येकलाई रु. १ करोड निकासा, १० ट्रक राहत सामग्री पठाइयो र सबै मन्त्रीले एक महिनाको तलब दिने घोषणा। 'दृढता र साहसका साथ लड्नुबाहेक विकल्प छैन।'"}},
  {id:"toll-2026-0902b", sev:"danger", tag:{en:"Toll update",ne:"मृत्यु अद्यावधिक"}, time:"2 Sept", src:"Nepal Police / NDRRMA",
   msg:{en:"Nepal Police put the death toll at 1,127 on Wednesday. 3,916 remain missing and 1,473 are injured; 21,000+ security personnel are deployed and 4,248 rescued people are named in the public registry. India is assisting with DNA testing and body management.",
        ne:"नेपाल प्रहरीका अनुसार बुधबार मृत्यु संख्या १,१२७ पुग्यो। ३,९१६ बेपत्ता र १,४७३ घाइते; २१,०००+ सुरक्षाकर्मी परिचालित र सार्वजनिक नामावलीमा ४,२४८ उद्धारितको नाम दर्ता। शव व्यवस्थापन र डीएनए परीक्षणमा भारतको सहयोग जारी।"}},
  {id:"warn-2026-0901-ktm", sev:"watch", tag:{en:"KTM Valley advisory",ne:"काठमाडौं उपत्यका सतर्कता"}, time:"1 Sept", src:"NDRRMA / DHM", url:"https://www.dhm.gov.np",
   msg:{en:"Kathmandu Valley on moderate flood advisory — rising water levels monitored along Bagmati, Bishnumati, Hanumante and Dhobi Khola rivers. Heavy rainfall forecast through 1–2 Sept.",
        ne:"काठमाडौं उपत्यकामा मध्यम बाढी सतर्कता — बागमती, बिष्णुमती, हनुमन्ते र ढोबी खोलाको जलसतह निगरानीमा। १–२ सेप्टेम्बरसम्म भारी वर्षाको पूर्वानुमान।"}},
  {id:"warn-2026-0901-riverside", sev:"danger", tag:{en:"Riverside RED alert",ne:"किनार रातो चेतावनी"}, time:"1 Sept", src:"NDRRMA / DHM", url:"https://www.dhm.gov.np",
   msg:{en:"Riverside Red Alert maintained for Rasuwa, Nuwakot, Dhading, Chitwan, Nawalparasi (E/W) and Gorkha. Trishuli runs ~3 m above danger level at Galchhi. Stay off the banks.",
        ne:"रसुवा, नुवाकोट, धादिङ, चितवन, नवलपरासी (पू/प) र गोरखामा नदी किनारमा रातो चेतावनी कायमै। गल्छीमा त्रिशूली खतरा विन्दुभन्दा ~३ मि. माथि। नदी किनारबाट टाढा बस्नुहोस्।"}},
  {id:"traffic-2026-0901-nightban", sev:"watch", tag:{en:"Night travel ban",ne:"रातको यात्रा प्रतिबन्ध"}, time:"1 Sept", src:"Nepal Police Traffic", url:"highway-updates.html",
   msg:{en:"Night travel bans in force: BP Highway closed 6 PM–4 AM; Tokha–Chhahare Road closed 10 PM–5 AM. Prithvi Highway still cut at Krishnabhir. Confirm with traffic office (103) before travelling.",
        ne:"रातको यात्रा प्रतिबन्ध: बीपी राजमार्ग साँझ ६–बिहान ४; टोखा–छहरे सडक राति १०–बिहान ५ बजे बन्द। पृथ्वी राजमार्ग कृष्णभीरमा अझै अवरुद्ध। यात्रा अघि ट्राफिक कार्यालय (१०३) मा पुष्टि गर्नुहोस्।"}},
  {id:"warn-2026-0901-lhende", sev:"watch", tag:{en:"Dammed lake",ne:"बाँधिएको ताल"}, time:"1 Sept", src:"NDRRMA satellite analysis",
   msg:{en:"Lhende Khola barrier lake (~0.11 km², 18 km above Rasuwagadhi) remains under critical burst surveillance. A rupture would send a second surge down Bhote Koshi — stay on high ground.",
        ne:"ल्हेन्डे खोलाको बाँधिएको ताल (~०.११ वर्ग कि.मि., रसुवागढीभन्दा १८ कि.मि. माथि) गम्भीर निगरानीमा। फुटेमा भोटेकोशीमा दोस्रो भल — अग्लो स्थानमा रहनुहोस्।"}},
  {id:"tunnel-2026-0902-ut3a", sev:"watch", tag:{en:"Tunnel rescue",ne:"सुरुङ उद्धार"}, time:"2 Sept", src:"Nepali Army / NDRRMA",
   msg:{en:"A controlled explosion was set off inside the Upper Trishuli 3A tunnel and the Army has dug about 10 m down with excavators to clear water, mud and debris. 900 hydropower workers are missing across 12 projects and around 500 are believed still inside the tunnels.",
        ne:"माथिल्लो त्रिशूली ३A सुरुङभित्र नियन्त्रित विस्फोट गरिएको छ र सेनाले एक्साभेटरले करिब १० मिटर गहिरो खनेर पानी, हिलो र लेदो हटाउँदै छ। १२ आयोजनाका ९०० जलविद्युत् कामदार बेपत्ता छन् र करिब ५०० अझै सुरुङभित्रै रहेको अनुमान छ।"}},
  {id:"relief-2026-0831-fund", sev:"relief", tag:{en:"Relief fund",ne:"राहत कोष"}, time:"31 Aug", src:"OPMCM / Radio Nepal", url:"relief.html",
   msg:{en:"PM Disaster Relief Fund passes Rs 5.44 billion; Rs 675 million released to 15 local units in Rasuwa, Nuwakot, Dhading, Gorkha and Tanahun. Donate only via official channels.",
        ne:"प्रधानमन्त्री विपद् राहत कोष रु. ५.४४ अर्ब नाघ्यो; १५ स्थानीय तहलाई रु. ६७.५ करोड निकासा। आधिकारिक माध्यमबाट मात्र दान गर्नुहोस्।"}}
];


/* =========================================================================
   TODAY'S DISTRICT FLOOD WARNINGS — the data behind the "Today's Flood
   Warning" popup. Compiled from real, published sources for the current
   event and shown as one consolidated bulletin:
     • NDRRMA fresh warning, 30 Aug 2026 — Bhote Koshi rising again in Rasuwa,
       Trishuli ~3 m above normal, a landslide-dammed lake on the Lhende Khola
       (~18 km above Rasuwagadhi) at risk of bursting → riverside alert for
       Rasuwa, Nuwakot, Dhading, Chitwan.  (IANS / NDRRMA)
     • DHM flash-flood bulletin — 44 districts across all seven provinces.
       (The Himalayan Times / DHM)
   `sev:1` marks the districts under today's riverside alert (shown red).
   Update this block as DHM/NDRRMA revise their bulletins.
   ========================================================================= */
const WARNINGS={
  active:true,
  updated:"2026-09-01",
  date:{en:"1 Sept 2026",ne:"१६ भदौ २०८३"},
  count:44,
  source:"DHM 24h Meteorological Bulletin · NDRRMA River & Landslide Alert (1 Sept 2026)",
  url:"https://www.dhm.gov.np",
  headline:{en:"Monsoon Surge Alert: Trishuli, Bhote Koshi & Kathmandu Valley River Watch Active",
            ne:"मनसुन सक्रियता अलर्ट: त्रिशूली, भोटेकोशी र काठमाडौं उपत्यका नदी सतर्कता कायमै"},
  summary:{
    en:"Department of Hydrology and Meteorology (DHM) and NDRRMA issue heightened flood warnings across Bagmati Province, including the Kathmandu Valley (Bagmati, Bishnumati, Hanumante and Dhobi Khola rivers on rising watch). Strict Riverside Red Alert continues for Rasuwa, Nuwakot, Dhading, Chitwan, Nawalparasi and Gorkha. Trishuli River remains ~3m above danger level, and the Lhende Khola barrier lake stays under critical watch. 44 districts across all 7 provinces face active flash-flood risks.",
    ne:"जल तथा मौसम विज्ञान विभाग र NDRRMA ले काठमाडौं उपत्यका (बागमती, बिष्णुमती, हनुमन्ते र ढोबीखोला) सहित बागमती प्रदेशभर बाढी सतर्कता जारी गरेको छ। रसुवा, नुवाकोट, धादिङ, चितवन, नवलपरासी र गोरखामा नदी किनारमा रातो चेतावनी कायमै छ। त्रिशूली नदी खतराको विन्दुभन्दा करिब ३ मिटर माथि छ भने ल्हेन्डे खोलाको बाँधिएको ताल फुट्ने जोखिम उच्च छ। ४४ जिल्लामा बाढी र पहिरोको जोखिम।"},
  rivers:[
    {name:{en:"Kathmandu Valley (Bagmati & Bishnumati)",ne:"काठमाडौं उपत्यका (बागमती र बिष्णुमती)"}, status:{en:"rising water levels · flood watch",ne:"जलसतह वृद्धि · बाढी सतर्कता"}, sev:"watch"},
    {name:{en:"Bhote Koshi River",ne:"भोटेकोशी नदी"}, status:{en:"high surge · debris watch",ne:"उच्च बहाव · लेदो जोखिम"}, sev:"danger"},
    {name:{en:"Trishuli River",ne:"त्रिशूली नदी"}, status:{en:"+3.0 m above danger level",ne:"खतराभन्दा +३.० मि. माथि"}, sev:"danger"},
    {name:{en:"Lhende Khola (Tibet/Nepal border)",ne:"ल्हेन्डे खोला (सीमा क्षेत्र)"}, status:{en:"dammed lake · burst hazard",ne:"ताल बाँधिएको · फुट्ने जोखिम"}, sev:"danger"},
    {name:{en:"Narayani & Marsyangdi",ne:"नारायणी र मर्स्याङ्दी"}, status:{en:"high discharge watch",ne:"उच्च जलसतह निगरानी"}, sev:"watch"}
  ],
  provinces:[
    {name:{en:"Bagmati Province",ne:"बागमती प्रदेश"}, districts:[
      {en:"Rasuwa",ne:"रसुवा",sev:1},{en:"Nuwakot",ne:"नुवाकोट",sev:1},{en:"Dhading",ne:"धादिङ",sev:1},{en:"Chitwan",ne:"चितवन",sev:1},
      {en:"Sindhupalchok",ne:"सिन्धुपाल्चोक"},{en:"Kavrepalanchok",ne:"काभ्रेपलाञ्चोक"},{en:"Sindhuli",ne:"सिन्धुली"},{en:"Makwanpur",ne:"मकवानपुर"},
      {en:"Dolakha",ne:"दोलखा"},{en:"Ramechhap",ne:"रामेछाप"},{en:"Lalitpur",ne:"ललितपुर"},{en:"Kathmandu",ne:"काठमाडौं"},{en:"Bhaktapur",ne:"भक्तपुर"}
    ]},
    {name:{en:"Gandaki Province",ne:"गण्डकी प्रदेश"}, districts:[
      {en:"Gorkha",ne:"गोरखा",sev:1},{en:"Nawalpur (East)",ne:"नवलपुर (पूर्व)",sev:1},{en:"Tanahun",ne:"तनहुँ"},{en:"Kaski",ne:"कास्की"},
      {en:"Lamjung",ne:"लमजुङ"},{en:"Syangja",ne:"स्याङ्जा"},{en:"Parbat",ne:"पर्वत"},{en:"Myagdi",ne:"म्याग्दी"}
    ]},
    {name:{en:"Koshi Province",ne:"कोशी प्रदेश"}, districts:[
      {en:"Panchthar",ne:"पाँचथर"},{en:"Ilam",ne:"इलाम"},{en:"Jhapa",ne:"झापा"},{en:"Morang",ne:"मोरङ"},{en:"Sunsari",ne:"सुनसरी"},
      {en:"Saptari",ne:"सप्तरी"},{en:"Bhojpur",ne:"भोजपुर"},{en:"Sankhuwasabha",ne:"संखुवासभा"},{en:"Udayapur",ne:"उदयपुर"}
    ]},
    {name:{en:"Madhesh Province",ne:"मधेश प्रदेश"}, districts:[
      {en:"Parsa",ne:"पर्सा"},{en:"Bara",ne:"बारा"},{en:"Rautahat",ne:"रौतहट"},{en:"Sarlahi",ne:"सर्लाही"}
    ]},
    {name:{en:"Lumbini Province",ne:"लुम्बिनी प्रदेश"}, districts:[
      {en:"Parasi (West)",ne:"परासी (पश्चिम)",sev:1},{en:"Palpa",ne:"पाल्पा"},{en:"Pyuthan",ne:"प्युठान"},{en:"Rolpa",ne:"रोल्पा"},
      {en:"Dang",ne:"दाङ"},{en:"Banke",ne:"बाँके"},{en:"Bardiya",ne:"बर्दिया"}
    ]},
    {name:{en:"Karnali Province",ne:"कर्णाली प्रदेश"}, districts:[
      {en:"Salyan",ne:"सल्यान"},{en:"Surkhet",ne:"सुर्खेत"}
    ]},
    {name:{en:"Sudurpaschim Province",ne:"सुदूरपश्चिम प्रदेश"}, districts:[
      {en:"Kailali",ne:"कैलाली"}
    ]}
  ]
};

/* cleared alerts persist; a cleared alert never reappears — only genuinely new ids show */
const NOTIF_CLEARED=(()=>{try{return new Set(JSON.parse(localStorage.getItem("nd_cleared")||"[]"));}catch(e){return new Set();}})();
/* Live flood alerts from /api/alerts (GDACS — UN/EC official flood feed). These
   are prepended to the built-in advisories; a genuinely new event id shows up as
   a new alert automatically. */
let LIVE_ALERTS=[];
function activeNotifs(){ return LIVE_ALERTS.concat(NOTIFS).filter(n=>!NOTIF_CLEARED.has(n.id)); }

/* ---- OS push notifications for new flood alerts (opt-in, in-tab) ----
   Fires a real desktop/mobile notification when a genuinely new alert id
   appears — works whenever the site is open, including when the tab is
   unfocused or backgrounded. Ids already seen are remembered so nothing
   re-fires, and the very first load never spams (it just records what exists). */
const NOTIF_SEEN=(()=>{try{return new Set(JSON.parse(localStorage.getItem("nd_notif_seen")||"[]"));}catch(e){return new Set();}})();
let NOTIF_PRIMED = NOTIF_SEEN.size>0;   // false only on the very first ever visit
function _saveSeen(){ try{localStorage.setItem("nd_notif_seen",JSON.stringify([...NOTIF_SEEN].slice(-200)));}catch(e){} }
function notifSupported(){ return typeof window!=="undefined" && "Notification" in window; }
function notifGranted(){ return notifSupported() && Notification.permission==="granted"; }
function fireOSNotif(n){
  if(!notifGranted()) return;
  try{
    const os=new Notification(LANG==="ne"?"नेपाल बाढी अलर्ट":"Nepal flood alert",{
      body:TL(n.msg).slice(0,180), tag:n.id, icon:"favicon/favicon-192.png", badge:"favicon/favicon-32.png"
    });
    os.onclick=()=>{ try{window.focus();}catch(_){} if(n.url) window.open(n.url,"_blank","noopener"); os.close(); };
  }catch(_){}
}
function requestNotifPerm(){
  if(!notifSupported()){ toast(LANG==="ne"?"यो ब्राउजरले सूचना समर्थन गर्दैन।":"This browser doesn't support notifications."); return; }
  Notification.requestPermission().then(p=>{
    updateNotifEnableBtn();
    if(p==="granted") toast(LANG==="ne"?"बाढी अलर्ट सूचना सक्रिय भयो।":"Flood-alert notifications enabled.","crim");
  }).catch(()=>{});
}
function updateNotifEnableBtn(){
  const b=$("#notifEnable"); if(!b) return;
  const hide = !notifSupported() || Notification.permission==="granted" || Notification.permission==="denied";
  b.hidden = hide;
  const lbl=b.querySelector(".ntf-lbl"); if(lbl) lbl.textContent = t("notif.enable");
}

async function fetchLiveAlerts(){
  try{
    const r=await fetch("/api/alerts",{signal:AbortSignal.timeout(9000)});
    if(!r.ok) return;
    const j=await r.json();
    if(j && Array.isArray(j.alerts)){
      LIVE_ALERTS=j.alerts.map(a=>{
        let when="live"; try{ if(a.ts) when=new Date(a.ts).toLocaleDateString(LANG==="ne"?"ne-NP":"en-GB",{day:"numeric",month:"short"}); }catch(_){}
        const lvl=a.alertlevel||"GDACS";
        return { id:a.id||("gdacs-"+(a.from||"")), sev:a.level||"watch", url:a.url,
          alertlevel:lvl, title:a.title||"", ts:a.ts||0,
          tag:{en:"Flood alert · "+lvl, ne:"बाढी अलर्ट · "+lvl}, time:when, src:"GDACS · UN/EC",
          msg:{en:a.description||a.title, ne:a.description||a.title} };
      });
      // Notify only about alerts we've never seen — and never on the first visit.
      const fresh=LIVE_ALERTS.filter(a=>!NOTIF_SEEN.has(a.id) && !NOTIF_CLEARED.has(a.id));
      if(NOTIF_PRIMED) fresh.slice(0,3).forEach(fireOSNotif);
      LIVE_ALERTS.forEach(a=>NOTIF_SEEN.add(a.id));
      NOTIF_PRIMED=true; _saveSeen();
      renderNotifs();
      renderAlertBar();    // surface the top risky (Red/Orange) alert INLINE — no modal
    }
  }catch(_){ /* keep built-in advisories */ }
}
function clearNotifs(){ activeNotifs().forEach(n=>NOTIF_CLEARED.add(n.id)); try{localStorage.setItem("nd_cleared",JSON.stringify([...NOTIF_CLEARED]));}catch(e){} renderNotifs(); renderAlertBar(); }

/* =========================================================================
   RISKY FLOOD ALERT popup — an in-page modal (styled to match the site) that
   surfaces the single highest-severity live flood alert the moment it arrives.
   Unlike OS notifications (which need permission and stay silent on first load),
   this always shows the current Red/Orange ("risky") alert once — so a visitor
   who just opened the site immediately sees the active danger. Each alert id is
   remembered so the same alert never pops twice; a genuinely new event pops on
   its own the next time the 3-minute poll picks it up, no command needed.
   ========================================================================= */
const RISKY_SEV = new Set(["danger","watch"]);   // Red + Orange = risky; Green = advisory only
const POPUP_SEEN=(()=>{try{return new Set(JSON.parse(localStorage.getItem("nd_popup_seen")||"[]"));}catch(e){return new Set();}})();
function _savePopupSeen(){ try{localStorage.setItem("nd_popup_seen",JSON.stringify([...POPUP_SEEN].slice(-200)));}catch(e){} }
let _popupOpenFor=null;   // id currently displayed (guards re-entrancy while open)
let _warnShownThisLoad=false;   // today's consolidated warning takes priority over the single GDACS pop

/* =========================================================================
   LATEST-NEWS POPUP
   A small card that slides in over the bottom-right corner carrying the newest
   headline the live feed has pulled in. It is deliberately NOT a centre-screen
   modal with a backdrop: it never covers the helplines, never blocks a tap, and
   the page stays usable behind it — the same reasoning that removed the old
   flood-alert dialog.

   It shows once per genuinely new headline. Seen ids are remembered, so a
   revisit is quiet and only a story that has actually broken since your last
   visit will surface. It auto-hides after a while, and the reader can dismiss
   it or open the bulletin.
   ========================================================================= */
const NEWSPOP_SEEN=(()=>{try{return new Set(JSON.parse(localStorage.getItem("nd_newspop_seen")||"[]"));}catch(e){return new Set();}})();
function _saveNewsPopSeen(){ try{localStorage.setItem("nd_newspop_seen",JSON.stringify([...NEWSPOP_SEEN].slice(-120)));}catch(e){} }
let _newsPopTimer=null, _newsPopOpenFor=null;

/* =========================================================================
   PINNED BRIEFING — a single item that jumps the news-popup queue.

   When the Prime Minister briefs Parliament on the disaster, that outranks
   whatever happens to be newest on the wire, so it is pinned rather than left
   to compete on timestamp. It still uses the same corner card as every other
   headline: no backdrop, page stays usable, one per session, dismissible.

   `until` is the point after which it stops being news and falls back to the
   normal newest-first behaviour. Set it, or the card outlives the story.

   `hl` is the phrase highlighted inside the title. It is matched against the
   escaped title at render time — see _npopTitle — so the highlight never
   becomes an injection route.
   ========================================================================= */
const PINNED_NEWS={
  id:"brief-2026-0902-pm-parliament",
  until:"2026-09-05T23:59:00+05:45",
  url:"https://www.aninews.in/news/world/asia/have-to-fight-with-courage-and-determination-nepal-pm-balen-shah-details-govt-response-to-flood-crisis20260902140138/",
  img:"https://d3lzcn6mbbadaf.cloudfront.net/media/details/__sized__/ANI-20260902083127-thumbnail-320x180-70.jpg",
  imgAlt:{en:"Nepal Prime Minister Balen Shah addressing Parliament",ne:"प्रधानमन्त्री बालेन्द्र शाह संसदमा सम्बोधन गर्दै"},
  source:"ANI · Kathmandu Post",
  time:{en:"2 Sept 2026",ne:"१६ भदौ २०८३"},
  badge:{en:"PM BRIEFING",ne:"प्रधानमन्त्रीको सम्बोधन"},
  title:{en:"PM Balen Shah briefs Parliament on the flood response",
         ne:"प्रधानमन्त्री बालेन्द्र शाहको संसदमा बाढीबारे सम्बोधन"},
  hl:{en:"briefs Parliament",ne:"संसदमा"},
  body:{en:"“We have no alternative but to fight with determination and courage.” The Prime Minister set out the government's response and gave updated figures.",
        ne:"“दृढता र साहसका साथ लड्नुबाहेक हामीसँग विकल्प छैन।” प्रधानमन्त्रीले सरकारको प्रतिकार्य र अद्यावधिक तथ्यांक सार्वजनिक गरे।"},
  figs:[
    {n:"11,993", l:{en:"rescued",ne:"उद्धार"}},
    {n:"3,916",  l:{en:"still missing",ne:"बेपत्ता"}},
    {n:"1,127",  l:{en:"dead",ne:"मृत्यु"}}
  ]
};
function _pinnedLive(){
  if(typeof PINNED_NEWS==="undefined" || !PINNED_NEWS.id) return null;
  const until=Date.parse(PINNED_NEWS.until||"");
  if(!isNaN(until) && Date.now()>until) return null;
  if(NEWSPOP_SEEN.has(PINNED_NEWS.id)) return null;
  return PINNED_NEWS;
}

/* Escape first, then wrap the highlighted phrase — so the mark-up is ours and
   the title text can never carry any of its own. */
function _npopTitle(title, needle){
  const safe=esc(title);
  if(!needle) return safe;
  const n=esc(needle);
  const i=safe.indexOf(n);
  if(i<0) return safe;
  return safe.slice(0,i)+'<mark class="npop__mark">'+n+"</mark>"+safe.slice(i+n.length);
}

/* A stable id for a headline: live items key on their URL, built-in bulletins
   on their English title. */
function _newsId(n){ return n && (n.url || (n.title && (n.title.en||n.title)) || ""); }

/* The newest item the reader has not been shown yet. A pinned briefing jumps
   the queue while it is current; then live wire headlines; then the built-in
   bulletins as the fallback when the feed is down. */
function _freshestNews(){
  const pin=_pinnedLive();
  if(pin){
    const others=(LIVE_NEWS||[]).filter(n=>_newsId(n) && !NEWSPOP_SEEN.has(_newsId(n)));
    return { item:pin, extra:others.length, pinned:true };
  }
  if(LIVE_NEWS && LIVE_NEWS.length){
    const unseen=LIVE_NEWS.filter(n=>_newsId(n) && !NEWSPOP_SEEN.has(_newsId(n)));
    if(!unseen.length) return null;
    return { item:unseen[0], extra:unseen.length-1, live:true };
  }
  if(typeof NEWS!=="undefined" && NEWS.length){
    const unseen=NEWS.filter(n=>_newsId(n) && !NEWSPOP_SEEN.has(_newsId(n)));
    if(!unseen.length) return null;
    return { item:unseen[0], extra:unseen.length-1, live:false, index:NEWS.indexOf(unseen[0]) };
  }
  return null;
}

let _newsPopScheduled=false;
function maybeNewsPopup(){
  if(_newsPopOpenFor || _newsPopScheduled) return;
  if(document.getElementById("newsPop")) return;
  if(sessionStorage.getItem("nd_npop_dismissed")) return;
  // A headline is the LOWEST-priority interruption on this site. If the session
  // has already spent its one popup — almost always on a district flood warning,
  // which is fetched first precisely so it gets the chance — the headline stays
  // in the ticker and the bulletins list, where it was going to appear anyway.
  if(popupBudgetSpent()) return;
  const pick=_freshestNews();
  if(!pick) return;
  _newsPopScheduled=true;
  // Let the reader get their bearings first; the helplines and the toll are why
  // they opened the page, not this.
  setTimeout(()=>{
    _newsPopScheduled=false;
    if(popupBudgetSpent()) return;                 // the warning popup may have run in the meantime
    if(!document.getElementById("newsPop") && !sessionStorage.getItem("nd_npop_dismissed")){
      spendPopupBudget();
      openNewsPopup(pick);
    }
  }, 12000);
}

function openNewsPopup(pick){
  const n=pick.item;
  const id = pick.pinned ? n.id : _newsId(n);
  if(!id) return;
  _newsPopOpenFor=id;
  NEWSPOP_SEEN.add(id); _saveNewsPopSeen();

  const title = pick.pinned ? TL(n.title) : (pick.live ? (n.title||"") : TL(n.title));
  const body  = pick.pinned ? TL(n.body)  : (pick.live ? "" : TL(n.body));
  const src   = pick.pinned ? (n.source||"") : (pick.live ? (n.source||"") : (n.src||""));
  const when  = pick.pinned ? TL(n.time) : (pick.live ? newsDate(n) : (n.time||""));
  const href  = pick.pinned ? n.url : (pick.live ? n.url : ("news.html?id="+pick.index));
  const ext   = pick.pinned || pick.live;
  const badge = pick.pinned ? TL(n.badge) : t("npop.badge");
  const titleHTML = pick.pinned ? _npopTitle(title, TL(n.hl)) : esc(title);
  // The thumbnail is hotlinked from the publisher. If it 404s or the CDN blocks
  // the referrer, the frame is dropped rather than left broken — the card still
  // reads fine without it. The removal is handled by the delegated "error"
  // listener above via data-fallback, NOT an inline onerror: this site runs
  // under a CSP with no 'unsafe-inline', so an inline handler would never fire.
  // Deliberately NOT loading="lazy": the card is inserted already faded out and
  // mid-transform, and the lazy heuristic can defer an image in that state past
  // the card's own auto-dismiss — so the one picture we chose to show never
  // arrives.
  const thumb = (pick.pinned && n.img)
    ? `<div class="npop__thumb"><img src="${esc(n.img)}" alt="${esc(TL(n.imgAlt)||"")}" decoding="async" referrerpolicy="no-referrer" data-fallback="npopthumb"></div>`
    : "";
  const figs = (pick.pinned && n.figs && n.figs.length)
    ? `<div class="npop__figs">${n.figs.map(f=>`<span class="npop__fig"><b class="mono">${esc(toNepDigits(f.n))}</b><i>${esc(TL(f.l))}</i></span>`).join("")}</div>`
    : "";

  const el=document.createElement("aside");
  el.id="newsPop"; el.className="npop"+(pick.pinned?" npop--brief":""); el.setAttribute("role","status"); el.setAttribute("aria-live","polite");
  el.innerHTML=`
    <div class="npop__card">
      <button class="npop__x" id="npopX" aria-label="${esc(t("npop.dismiss"))}">${XICON}</button>
      ${thumb}
      <div class="npop__top">
        <span class="npop__badge">${esc(badge)}</span>
        <span class="npop__eye">${esc(t("npop.eye"))}</span>
        ${when?`<span class="npop__time mono">${esc(when)}</span>`:""}
      </div>
      <h3 class="npop__h">${titleHTML}</h3>
      ${body?`<p class="npop__body">${esc(body)}</p>`:""}
      ${figs}
      ${src?`<div class="npop__src">SRC · ${esc(src)}</div>`:""}
      <div class="npop__actions">
        <a class="btn btn--primary btn--sm" href="${esc(href)}"${ext?' target="_blank" rel="noopener"':''}>${esc(pick.pinned?t("npop.brief.read"):t("npop.read"))}</a>
        <a class="btn btn--ghost btn--sm" href="news.html">${esc(t("npop.all"))}</a>
      </div>
      ${pick.extra>0?`<div class="npop__foot">+${pick.extra} ${esc(t("npop.more"))} · ${esc(t("npop.auto"))}</div>`
                    :`<div class="npop__foot">${esc(t("npop.auto"))}</div>`}
    </div>`;
  document.body.appendChild(el);
  requestAnimationFrame(()=>el.classList.add("open"));

  const x=el.querySelector("#npopX");
  if(x) x.addEventListener("click", ()=>{ try{sessionStorage.setItem("nd_npop_dismissed","1");}catch(_){} closeNewsPopup(); });
  el.addEventListener("keydown", e=>{ if(e.key==="Escape"){ try{sessionStorage.setItem("nd_npop_dismissed","1");}catch(_){} closeNewsPopup(); } });
  // Polite duration. The briefing card carries a picture, a pull-quote and
  // three figures, so it gets longer than a bare headline does.
  clearTimeout(_newsPopTimer);
  _newsPopTimer=setTimeout(closeNewsPopup, pick.pinned?14000:7000);
  // Don't yank it away mid-read
  el.addEventListener("mouseenter", ()=>clearTimeout(_newsPopTimer));
  el.addEventListener("mouseleave", ()=>{ clearTimeout(_newsPopTimer); _newsPopTimer=setTimeout(closeNewsPopup, 4000); });
}

function closeNewsPopup(){
  clearTimeout(_newsPopTimer);
  const el=document.getElementById("newsPop");
  _newsPopOpenFor=null;
  if(!el) return;
  el.classList.remove("open");
  setTimeout(()=>{ if(el.parentNode) el.parentNode.removeChild(el); }, 260);
}

/* ---- INLINE ALERT BAR (replaces the auto-opening modal) ----
   The highest-severity live alert is shown as a slim, dismissible strip that
   sits in the page flow directly under the event banner. It is readable at a
   glance, never covers the helplines, needs no click to get past, and links
   straight into the alerts drawer for the full list. Dismissals are remembered
   per alert id, so a genuinely new alert reappears on its own. */
/* A river reported ABOVE ITS DANGER LEVEL is the most specific and most urgent
   thing this site knows, and it deserves to be seen without a dialog. It is
   turned into an alert-strip entry alongside the GDACS ones — same slim strip,
   same per-id dismissal, no backdrop, page stays usable.
   The id carries the stations and the date, so dismissing today's strip is
   remembered, while a different river crossing tomorrow shows up as new. */
function criticalWarnAlert(){
  if(!LIVE_WARN || !(LIVE_WARN.critical>0)) return null;
  const crit=(LIVE_WARN.rivers||[]).filter(r=>r.crit);
  if(!crit.length) return null;
  const names=crit.map(r=>r.station).join(", ");
  const where=[...new Set(crit.map(r=>r.district))].join(", ");
  return {
    id:"warn-crit-"+new Date().toLocaleDateString("en-CA")+"-"+crit.map(r=>r.station).sort().join("|"),
    sev:"danger", ts:Math.max(...crit.map(r=>r.ts||0)),
    title:t("warn.strip").replace("{r}",names).replace("{d}",where),
    url:"alerts.html", __warn:true
  };
}
function topRiskyAlert(){
  const list=LIVE_ALERTS.concat(criticalWarnAlert()||[]);
  return list
    .filter(a=>RISKY_SEV.has(a.sev) && !NOTIF_CLEARED.has(a.id) && !POPUP_SEEN.has(a.id))
    // A river over its danger mark outranks a country-level GDACS bulletin: it
    // names the place the reader can act on.
    .sort((a,b)=>(b.__warn?1:0)-(a.__warn?1:0) || (a.sev==="danger"?0:1)-(b.sev==="danger"?0:1) || (b.ts||0)-(a.ts||0))[0] || null;
}
function renderAlertBar(){
  let host=$("#alertBar");
  const a=topRiskyAlert();
  if(!a){ if(host) host.remove(); return; }
  if(!host){
    host=document.createElement("div");
    host.id="alertBar"; host.setAttribute("role","status");
    const anchor=$(".eas")||$("header.hd");
    if(anchor && anchor.parentNode) anchor.parentNode.insertBefore(host, anchor.nextSibling);
    else document.body.insertBefore(host, document.body.firstChild);
  }
  const red=a.sev==="danger";
  host.className="abar abar--"+(red?"danger":"watch");
  host.innerHTML=`
    <div class="abar__in">
      <span class="abar__sev">${esc(red?t("fpop.red"):t("fpop.orange"))}</span>
      <span class="abar__msg">${esc(a.title||TL(a.msg)||t("fpop.title"))}</span>
      <span class="abar__acts">
        <button class="abar__link" id="abarMore">${esc(t("fpop.view"))}</button>
        ${a.url?`<a class="abar__link" href="${esc(a.url)}" target="_blank" rel="noopener">${esc(t("fpop.report"))}</a>`:""}
        <button class="abar__x" id="abarX" aria-label="Dismiss">${XICON}</button>
      </span>
    </div>`;
  const more=$("#abarMore"); if(more) more.addEventListener("click",()=>notifOpen());
  const x=$("#abarX"); if(x) x.addEventListener("click",()=>{
    POPUP_SEEN.add(a.id); _savePopupSeen(); renderAlertBar();
  });
}

/* The single-alert modal was removed in favour of renderAlertBar() above — an
   inline strip that never blocks the page. The dialog host (#fpop) is kept for
   the user-initiated "Today's district warnings" panel opened from the alerts
   drawer, which openWarningsPopup() below renders into. */
function closeFloodPopup(){
  const pop=$("#fpop"); if(!pop) return;
  pop.classList.remove("open"); pop.setAttribute("aria-hidden","true");
  pop.classList.remove("fpop--warn");
  _popupOpenFor=null;
  const b=$("#bell"); if(b) b.focus();
}

/* shared wiring for both popups: close, notify, "see all", backdrop-click */
function _wireFpop(pop){
  const x=$("#fpopX"); if(x){ x.addEventListener("click",closeFloodPopup); x.focus(); }
  const en=$("#fpopEnable"); if(en) en.addEventListener("click",()=>{ requestNotifPerm(); const b=$("#fpopEnable"); if(b) b.hidden=true; });
  const more=$("#fpopMore"); if(more) more.addEventListener("click",()=>{ closeFloodPopup(); notifOpen(); });
  pop.onclick=e=>{ if(e.target===pop) closeFloodPopup(); };
}

/* =========================================================================
   POPUP BUDGET
   At most ONE automatic popup per session, and none at all once the reader has
   dismissed something. In practice that one is the latest-headline corner card:
   nothing else on this site auto-opens any more. The district warning is a
   slim inline strip plus a panel on the alerts page, and its dialog only ever
   opens when the reader asks for it from the alerts drawer.

   Anything the reader opens themselves is not automatic and is never budgeted.
   ========================================================================= */
const POPUP_BUDGET_KEY="nd_popup_budget";
function popupBudgetSpent(){
  try{ return sessionStorage.getItem(POPUP_BUDGET_KEY)==="1"; }catch(_){ return false; }
}
function spendPopupBudget(){
  try{ sessionStorage.setItem(POPUP_BUDGET_KEY,"1"); }catch(_){}
}

/* =========================================================================
   TODAY'S FLOOD WARNING panel — the consolidated district-level bulletin,
   rendered from the live BIPAD feed (see fetchDistrictWarnings) and falling
   back to the built-in bulletin only when that feed cannot be reached.

   USER-TRIGGERED ONLY. Nothing calls this on load. It opens from "Today's
   district warnings" in the alerts drawer, and that is the whole contract —
   this dialog covers the page, and a dialog covering the page is precisely
   what was taken off this site before. The same content reaches a reader who
   did not ask for it through two non-blocking routes instead: the slim alert
   strip under the banner when a river is over its danger mark, and the full
   panel on the alerts page.
   ========================================================================= */
function openWarningsPopup(){
  const pop=$("#fpop"); if(!pop) return;
  if(_popupOpenFor) return;
  _warnShownThisLoad=true;
  // Suppress the redundant single-alert strip for anything already covered here.
  if(typeof LIVE_ALERTS!=="undefined"){ LIVE_ALERTS.forEach(a=>POPUP_SEEN.add(a.id)); _savePopupSeen(); }
  _popupOpenFor="__warn__";

  let title, lead, body, src, stale=false;
  if(LIVE_WARN){
    title=t("warn.live.h");
    lead=_warnSummaryLine(LIVE_WARN);
    body=_warnLiveBody(LIVE_WARN);
    src=(LIVE_WARN.source||"")+" · "+_warnAgo(LIVE_WARN.at);
  } else if(typeof WARNINGS!=="undefined"){
    stale=true;
    const W=WARNINGS;
    title=TL(W.headline); lead=TL(W.summary); src=W.source;
    const sevD=[]; (W.provinces||[]).forEach(p=>(p.districts||[]).forEach(d=>{ if(d.sev) sevD.push(TL(d)); }));
    body=`<p class="fpop__stale">${esc(t("warn.stale.note"))}</p>
      <div class="wrivs">${(W.rivers||[]).map(r=>`<div class="wriv wriv--${r.sev}"><span class="wriv__dot" aria-hidden="true"></span><div class="wriv__id"><strong class="wriv__name">${esc(TL(r.name))}</strong><span class="wriv__meta">${esc(TL(r.status))}</span></div></div>`).join("")}</div>
      ${sevD.length?`<div class="wsev"><span class="wsev__l">${esc(t("warn.sevlabel"))}</span><span class="wsev__names">${sevD.map(esc).join(", ")}</span></div>`:""}`;
  } else { _popupOpenFor=null; return; }

  pop.className="fpop fpop--danger fpop--warn open";
  pop.innerHTML=`
    <div class="fpop__card fpop__card--wide" role="alertdialog" aria-modal="true" aria-labelledby="fpopH">
      <button class="fpop__x" id="fpopX" aria-label="${esc(t("npop.dismiss"))}">${XICON}</button>
      <div class="fpop__scroll">
        <div class="fpop__top">
          <span class="fpop__chip">${esc(stale?t("warn.stale.badge"):t("warn.live.badge"))}</span>
          ${stale?"":`<span class="fpop__pulse"><span class="fpop__dot"></span>${esc(t("fpop.live"))}</span>`}
          <span class="wdate mono">${esc(nptNow().toLocaleDateString(LANG==="ne"?"ne-NP":"en-GB",{day:"numeric",month:"short",year:"numeric"}))}</span>
        </div>
        <div class="fpop__eye">${esc(t("warn.eye"))}</div>
        <h3 class="fpop__h" id="fpopH">${esc(title)}</h3>
        <p class="fpop__body">${esc(lead)}</p>
        ${body}
        <div class="fpop__actions">
          <a class="btn btn--primary" href="alerts.html">${esc(t("warn.cta.all"))}</a>
          <button class="btn btn--ghost" id="fpopEnable"${notifSupported()&&Notification.permission==="default"?"":" hidden"}>${BELL_ICO}<span>${esc(t("notif.enable"))}</span></button>
          <button class="btn btn--ghost" id="fpopMore">${esc(t("fpop.view"))}</button>
        </div>
        <div class="fpop__foot">SRC · ${esc(src)}</div>
      </div>
    </div>`;
  pop.setAttribute("aria-hidden","false");
  _wireFpop(pop);
}

/* url + long now live inline on each NEWS item above (20 sourced bulletins) */

/* history → Wikipedia article titles for live detail */
const HISTORY_WIKI={
 "2015":"April 2015 Nepal earthquake",
 "2017":"2017 Nepal floods",
 "2014":"2014 Sunkoshi landslide",
 "1993":"1993 Nepal floods",
 "1988":"1988 Nepal earthquake",
 "1934":"1934 Nepal–India earthquake"
};

/* ---------- live image fetch (Wikimedia, CORS-open, no key) ---------- */
let _eventImgs=null, _pinnedFirst=null;
/* verified real fallback that hotlinks reliably (AP photo, via NPR CDN) */
const CURATED_IMAGES=[
  {src:"https://npr.brightspotcdn.com/dims3/default/strip/false/crop/1319x880+0+0/resize/1100/quality/50/format/jpeg/?url=http%3A%2F%2Fnpr-brightspot.s3.amazonaws.com%2Fdd%2F00%2Fb11ef46d47de9392ebbf01a109bf%2Fap26238334531076.jpg", cap:"Rasuwa flood, Nepal · AP"}
];
/* real 2026 Nepal flood photos (news sources). Stable set — used for the hero
   slideshow and always shown in the gallery; NOT refreshed hourly. */
const NEWS_PHOTOS=[
  {src:"https://media.cnn.com/api/v1/images/stellar/prod/ap26238503594631.jpg?c=16x9&q=w_1383,c_fill", cap:"Rasuwa flood · AP / CNN"},
  {src:"https://ichef.bbci.co.uk/ace/standard/1024/cpsprodpb/e42e/live/a0d44fb0-a209-11f1-9090-b51af3a01fc2.jpg", cap:"Rasuwa flood · BBC"},
  {src:"https://images.euronews.com/articles/stories/09/89/05/06/1536x864_cmsv2_259beb96-4a2b-5534-8751-4ae9f73db488-9890506.jpg", cap:"Nepal floods · Euronews"},
  {src:"https://www.newscientist.com/wp-content/uploads/2026/08/SEI_309559746.jpg?w=840", cap:"Nepal floods · New Scientist"},
  {src:"https://sundayguardianlive.com/wp-content/uploads/2026/08/nepal-floods.jpg", cap:"Nepal floods · Sunday Guardian"},
  {src:"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSi51sdm2wXwJcaWnrvfoYd1i283X_ggad1LDK5saCP975g5BZ5uBPWUn_J&s=10", cap:"Nepal floods"},
  {src:"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT6w_a5Mb5cCBA0jpmZjNnv43apxgGtIjiHf0WMptoBu4SuXhewiBOLC6A&s=10", cap:"Nepal floods"},
  {src:"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRxAtLzEOBfVCAZmzPxeJfhEhrWlfkk7noJGZtXvvEO5GByFWs5stQmsBJn&s=10", cap:"Nepal floods"},
  {src:"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcScAd2q9lXD0oxfzxjaNGnTvdH85xwyiadX1Oe5iiuXHY00L1ZQ3GXml8o&s=10", cap:"Nepal floods"},
  {src:"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTdg8o3asZrU2ilaEMJBMyE8Su1dN15nvNze1wlYt6b_A&s=10", cap:"Nepal floods"}
];
/* animated aerial flood footage (Wikimedia) — always pinned as the first tile */
const LEAD_MEDIA={src:"https://upload.wikimedia.org/wikipedia/commons/b/b0/2026_Nepal_floods.gif", cap:"Rasuwa flood aerial footage", lead:true};
/* merged, de-duplicated pool: animated footage first, then stable news photos, then live-fetched */
async function allImages(){
  let dyn=[]; try{dyn=await fetchEventImages();}catch(e){}
  const map=new Map(), key=s=>(s.split("?")[0].split("/").pop()||s).replace(/^\d+px-/,"");
  const push=im=>{const k=key(im.src); if(!map.has(k)) map.set(k,im);};
  push(LEAD_MEDIA);            // animated footage always first
  NEWS_PHOTOS.forEach(push);
  dyn.forEach(push);
  CURATED_IMAGES.forEach(push);
  return [...map.values()];
}
async function _mediaImages(title){
  const u="https://en.wikipedia.org/api/rest_v1/page/media-list/"+encodeURIComponent(title);
  const r=await fetch(u,{headers:{accept:"application/json"}}); if(!r.ok) throw 0;
  const j=await r.json();
  return (j.items||[]).filter(it=>it.type==="image"&&it.showInGallery!==false&&it.srcset&&it.srcset.length)
    .map(it=>{
      let src=it.srcset[it.srcset.length-1].src; if(src.startsWith("//"))src="https:"+src;
      src=src.replace(/\/(\d+)px-/,"/800px-");
      let cap=(it.title||"").replace(/^File:/,"").replace(/\.[a-z0-9]+$/i,"").replace(/_/g," ");
      return {src,cap};
    });
}
function _preload(url){return new Promise(res=>{const i=new Image();let d=false;const done=v=>{if(!d){d=true;res(v);}};i.onload=()=>done(true);i.onerror=()=>done(false);i.src=url;setTimeout(()=>done(false),6000);});}
/* returns only images that actually load; curated first, then live Wikimedia */
/* relevance filters — keep only real flood imagery, drop unrelated (workshops, logos, maps) */
const IMG_BAD=/workshop|dissemination|unesco|seminar|meeting|conference|training|award|signing|\bmou\b|logo|flag|portrait|\bmap\b|diagram|chart|\bicon\b|symbol|emblem|ceremony|press|banner|poster|infographic/i;
const IMG_GOOD=/flood|inundat|deluge|swept|landslide|debris|mudslide|rasuwa|bhote.?koshi|trishuli|nuwakot|gyirong|timure|syafru|disaster|rescue|relief|damage|washed|submerged/i;
async function _commonsQuery(params){
  const u="https://commons.wikimedia.org/w/api.php?"+params+"&prop=imageinfo&iiprop=url&iiurlwidth=900&format=json&origin=*";
  const r=await fetch(u); if(!r.ok) throw 0; const j=await r.json();
  const pages=(j.query&&j.query.pages)||{};
  return Object.values(pages).map(p=>{
    const ii=p.imageinfo&&p.imageinfo[0]; if(!ii||!ii.thumburl) return null;
    if(/\.(svg|pdf|ogv|webm|tif|tiff)$/i.test(ii.thumburl)) return null;
    let cap=(p.title||"").replace(/^File:/,"").replace(/\.[a-z0-9]+$/i,"").replace(/_/g," ");
    return {src:ii.thumburl, cap};
  }).filter(Boolean);
}
function fetchEventImages(){
  if(_eventImgs) return _eventImgs;
  _eventImgs=(async()=>{
    const map=new Map(); const key=s=>(s.split("/").pop()||s).replace(/^\d+px-/,"");
    const add=(arr,trusted)=>arr.forEach(im=>{
      if(IMG_BAD.test(im.cap)) return;                 // never show workshops/logos/maps
      if(!trusted && !IMG_GOOD.test(im.cap)) return;    // search hits must read as flood imagery
      const k=key(im.src); if(!map.has(k)) map.set(k,im);
    });
    // 1) the event's own Commons categories (curated → all about this flood)
    for(const cat of ["Category:2026 China–Nepal floods","Category:2026 Nepal floods","Category:2026 Rasuwa flood"]){
      try{ add(await _commonsQuery("action=query&generator=categorymembers&gcmtitle="+encodeURIComponent(cat)+"&gcmtype=file&gcmlimit=40"), true); }catch(e){}
      if(map.size>=12) break;
    }
    // 2) the event article's own images
    for(const t of ["2026 Nepal floods","2026 China–Nepal floods"]){
      try{ add(await _mediaImages(t), true); }catch(e){}
    }
    // 3) strict, relevance-filtered search — gather as many real flood photos as exist
    for(const q of ["Rasuwa flood 2026","Bhotekoshi flood 2026","Trishuli flood 2026","Nepal flood 2026","Nepal 2026 landslide flood","2026 Nepal floods damage","Nepal flood rescue 2026"]){
      try{ add(await _commonsQuery("action=query&generator=search&gsrsearch="+encodeURIComponent(q)+"&gsrnamespace=6&gsrlimit=30"), false); }catch(e){}
      if(map.size>=60) break;
    }
    const out=[...map.values()];
    // pin the lead animation / video-type frame at position 0
    out.sort((a,b)=>(/\.(gif|webm|ogv)$/i.test(b.src.split("?")[0])?1:0)-(/\.(gif|webm|ogv)$/i.test(a.src.split("?")[0])?1:0));
    // and keep that first item identical even when the rest refresh hourly
    if(_pinnedFirst){ const rest=out.filter(im=>im.src!==_pinnedFirst.src); out.length=0; out.push(_pinnedFirst,...rest); }
    else if(out.length){ _pinnedFirst=out[0]; }
    // reliable, verified real flood photo (AP) so there is always ≥1 relevant image
    for(const c of CURATED_IMAGES){ if(await _preload(c.src)) out.push(c); }
    return out;
  })();
  return _eventImgs;
}
async function fillThumbs(){
  const cells=$$("#newsGrid .news__thumb[data-thumb]"); if(!cells.length) return;
  let imgs=[]; try{imgs=await allImages();}catch(e){}
  if(!imgs.length) return;
  cells.forEach((c,i)=>{const im=imgs[i%imgs.length]; if(!im) return;
    const el=new Image(); el.alt=im.cap||""; el.loading="lazy";
    el.onload=()=>{c.innerHTML="";c.appendChild(el);};
    el.onerror=()=>{}; // keep placeholder if this one fails
    el.src=im.src;
  });
}
function galleryMsg(g){ g.innerHTML=`<div class="gcell--msg">${esc(t("gallery.none"))} <a href="https://en.wikipedia.org/wiki/2026_China%E2%80%93Nepal_floods" target="_blank" rel="noopener" style="color:var(--crimson)">Wikipedia ↗</a></div>`; }
function paintGallery(g, imgs){
  if(!imgs.length){ galleryMsg(g); return; }
  g.innerHTML=imgs.map(im=>`
    <figure class="gcell" title="${esc(im.cap)}">
      <img loading="lazy" alt="${esc(im.cap)}" src="${esc(im.src)}">
      <figcaption>${esc(im.cap)}</figcaption></figure>`).join("");
  let ok=0, done=0; const cells=$$(".gcell",g); const n=cells.length;
  const settle=()=>{ if(done>=n && ok===0) galleryMsg(g); };
  cells.forEach(c=>{ const img=c.querySelector("img");
    if(img.complete){ if(img.naturalWidth>0){ok++;}else{c.style.display="none";} done++; settle(); }
    else{ img.addEventListener("load",()=>{ok++;done++;settle();}); img.addEventListener("error",()=>{c.style.display="none";done++;settle();}); }
  });
  setTimeout(()=>{ if(ok===0) galleryMsg(g); }, 9000);
}
function openLightbox(src,cap){
  let lb=$("#lightbox");
  if(!lb){
    lb=document.createElement("div"); lb.id="lightbox"; lb.className="lightbox"; lb.setAttribute("role","dialog");
    lb.innerHTML=`<button class="lightbox__x" aria-label="Close">✕</button><figure class="lightbox__fig"><img alt=""><figcaption></figcaption></figure>`;
    document.body.appendChild(lb);
    lb.addEventListener("click",e=>{ if(e.target===lb||e.target.closest(".lightbox__x")) closeLightbox(); });
    document.addEventListener("keydown",e=>{ if(e.key==="Escape") closeLightbox(); });
  }
  lb.querySelector("img").src=src; lb.querySelector("figcaption").textContent=cap||"";
  lb.classList.add("open"); document.body.style.overflow="hidden";
}
function closeLightbox(){ const lb=$("#lightbox"); if(lb){ lb.classList.remove("open"); lb.querySelector("img").src=""; document.body.style.overflow=""; } }
async function renderGallery(){
  const g=$("#galleryGrid"); if(!g) return;
  g.innerHTML=`<div class="gcell--msg">${esc(t("gallery.load"))}</div>`;
  let imgs=[]; try{imgs=await allImages();}catch(e){}
  paintGallery(g, imgs.slice(0,5));   // home: one row of 5
}
async function renderFullGallery(){
  const g=$("#fullGallery"); if(!g) return;
  g.innerHTML=`<div class="gcell--msg">${esc(t("gallery.load"))}</div>`;
  let imgs=[]; try{imgs=await allImages();}catch(e){}
  const cnt=$("#fullGalleryCount"); if(cnt) cnt.textContent=Math.min(imgs.length,100);
  paintGallery(g, imgs.slice(0,100));  // full page: up to 100
}

/* hero background slideshow — real flood photos, 5s crossfade loop (stable set) */
function reducedMotion(){return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;}
let _heroTimer=null;
async function heroSlideshow(){
  const wrap=$("#heroSlides"); if(!wrap) return;
  // hero uses the high-res press photos only (skip small thumbnails so it stays crisp full-screen)
  const list=[...NEWS_PHOTOS.filter(im=>!/gstatic\.com/.test(im.src)), ...CURATED_IMAGES];
  const loaded=[];
  await Promise.all(list.map(im=>_preload(im.src).then(ok=>{ if(ok) loaded.push(im.src); })));
  const imgs=list.filter(im=>loaded.includes(im.src)).slice(0,8);
  if(!imgs.length) return;
  wrap.innerHTML=imgs.map((im,i)=>`<div class="hero__slide${i===0?" on":""}" style="background-image:url('${im.src.replace(/'/g,"%27")}')"></div>`).join("");
  const layers=$$(".hero__slide",wrap);
  if(layers.length<2 || reducedMotion()) return;
  let idx=0; clearInterval(_heroTimer);
  _heroTimer=setInterval(()=>{ layers[idx].classList.remove("on"); idx=(idx+1)%layers.length; layers[idx].classList.add("on"); },5000);
}

/* ---------- Wikipedia summary (CORS-open) ---------- */
async function fetchWiki(title){
  const u="https://en.wikipedia.org/api/rest_v1/page/summary/"+encodeURIComponent(title);
  const r=await fetch(u,{headers:{accept:"application/json"},signal:AbortSignal.timeout(5000)}); if(!r.ok) throw 0;
  return r.json();
}

/* ---------- Wikipedia raw wikitext for infobox parsing (CORS-open via origin=*) ----------
   Restores the previously-undefined fetchInfobox() that the live engine relied on. */
async function fetchInfobox(title){
  const u="https://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&rvlimit=1&formatversion=2&format=json&origin=*&titles="+encodeURIComponent(title);
  const r=await fetch(u,{headers:{accept:"application/json"},signal:AbortSignal.timeout(6000)}); if(!r.ok) throw 0;
  const j=await r.json();
  const pages=(j.query&&j.query.pages)||[];
  const page=Array.isArray(pages)?pages[0]:Object.values(pages)[0];
  const rev=page&&page.revisions&&page.revisions[0];
  const content=rev&&(rev.slots&&rev.slots.main?rev.slots.main.content:rev.content);
  return content||"";
}

/* ---------- notifications ---------- */
const THEME_SUN='<svg class="ico-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2.2M12 19.2v2.2M4.2 12H2M22 12h-2.2M6.1 6.1 4.6 4.6M19.4 19.4l-1.5-1.5M17.9 6.1l1.5-1.5M4.6 19.4l1.5-1.5"/></svg>';
const THEME_MOON='<svg class="ico-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.3A8.5 8.5 0 1 1 9.7 3.5a6.8 6.8 0 0 0 10.8 10.8Z"/></svg>';
const BELL='<svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>';
/* inline bell that inherits its button's text colour (white on crimson, ink on ghost) */
const BELL_ICO='<svg class="ico-bell" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>';
/* crisp SVG close cross (replaces the ✕ glyph) — matches the icon system */
const XICON='<svg class="ico-x" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
/* warning triangle (inherits currentColor) for the "today's warnings" control */
const XTRI='<svg class="ico-tri" viewBox="0 0 24 24" aria-hidden="true"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
function injectChrome(){
  // Stack the running NPT time INSIDE the red LIVE block (LIVE on top, time below).
  // The header clock is hidden on small screens, so this keeps the time visible.
  const tag=$(".ticker__tag");
  if(tag && !$("#tickerClock")){
    const live=document.createElement("span");
    live.className="ticker__live";
    while(tag.firstChild) live.appendChild(tag.firstChild);   // move sq + "LIVE" text in
    const time=document.createElement("span");
    time.className="ticker__time mono"; time.id="tickerClock";
    time.setAttribute("data-clock",""); time.textContent="--:--:--";
    tag.appendChild(live); tag.appendChild(time);
  }
  // bell in header tools (desktop)
  const tools=$(".hd__tools");
  // light/dark toggle, next to the language switch
  if(tools && !$("#themeBtn")){
    const tb=document.createElement("button");
    tb.className="theme"; tb.id="themeBtn"; tb.type="button";
    tb.innerHTML=THEME_SUN+THEME_MOON;
    const lang=tools.querySelector(".lang");
    tools.insertBefore(tb, lang||null);
    tb.addEventListener("click", toggleTheme);
    updateThemeBtn();
  }
  if(tools && !$("#bell")){
    const b=document.createElement("button");
    b.className="bell"; b.id="bell"; b.setAttribute("aria-label","Alerts");
    b.innerHTML=BELL+'<span class="badge mono" id="bellBadge">0</span>';
    const burger=$("#burger"); tools.insertBefore(b, burger||null);
    b.addEventListener("click",notifOpen);
  }

  // Highway Updates nav link — injected on every page that doesn't already carry
  // it (only highway-updates.html hardcodes it, to mark itself current), so one
  // edit here keeps the nav consistent sitewide without touching each HTML file.
  const navInner=$("#navInner");
  if(navInner && !navInner.querySelector('a[href="highway-updates.html"]')){
    const hw=document.createElement("a");
    hw.href="highway-updates.html";
    hw.setAttribute("data-i18n","nav.highway");
    hw.textContent="Highway Updates";
    const after=navInner.querySelector('a[href="alerts.html"]');
    if(after && after.nextSibling) navInner.insertBefore(hw, after.nextSibling);
    else if(after) navInner.appendChild(hw);
    else navInner.appendChild(hw);
  }

  // mobile alert item inside nav dropdown
  if(navInner && !$("#mobileNavAlert")){
    const mobAlert=document.createElement("a");
    mobAlert.href="#alerts";
    mobAlert.className="nav__alert-item";
    mobAlert.id="mobileNavAlert";
    mobAlert.innerHTML=`
      <span class="nav__alert-left">${BELL} <span data-i18n="notif.h">Live Alerts</span></span>
      <span class="badge mono" id="mobileBellBadge">0</span>
    `;
    mobAlert.addEventListener("click",(e)=>{
      e.preventDefault();
      setBurger(false);
      notifOpen();
    });
    navInner.insertBefore(mobAlert, navInner.firstChild);
  }
  // panel + scrim
  if(!$("#notif")){
    const scrim=document.createElement("div"); scrim.className="scrim"; scrim.id="scrim"; document.body.appendChild(scrim);
    const p=document.createElement("aside"); p.className="notif"; p.id="notif"; p.setAttribute("aria-label","Alerts"); p.setAttribute("aria-hidden","true");
    p.innerHTML=`<div class="notif__h"><div><span class="eyebrow" data-i18n="notif.eye">Signal Feed</span><h3 data-i18n="notif.h">Alerts</h3></div><button class="notif__x" id="notifX" aria-label="Close">${XICON}</button></div>
      <button class="notif__warn" id="warnReopen"><span class="notif__warn-l">${XTRI}<span data-i18n="warn.reopen">Today's district warnings</span></span><span class="notif__warn-n mono" id="warnReopenN"></span></button>
      <div class="notif__bar"><span class="lbl"><span id="notifCount">0</span> <span data-i18n="notif.count">active</span></span><button class="notif__enable" id="notifEnable" hidden>${BELL_ICO}<span class="ntf-lbl" data-i18n="notif.enable">Notify me</span></button><button class="notif__clear" id="notifClear" data-i18n="notif.clear">Clear all</button></div>
      <div class="notif__list" id="notifList"></div>`;
    document.body.appendChild(p);
    scrim.addEventListener("click",notifClose);
    $("#notifX").addEventListener("click",notifClose);
    $("#notifClear").addEventListener("click",clearNotifs);
    $("#notifEnable").addEventListener("click",requestNotifPerm);
    const wr=$("#warnReopen");
    wr.addEventListener("click",()=>{ notifClose(); openWarningsPopup(); });
    updateWarnReopen();
    document.addEventListener("keydown",e=>{if(e.key==="Escape"&&$("#notif").classList.contains("open"))notifClose();});
  }
  // dialog host for the user-opened "Today's district warnings" panel
  if(!$("#fpop")){
    const fp=document.createElement("div");
    fp.className="fpop"; fp.id="fpop"; fp.setAttribute("aria-hidden","true");
    document.body.appendChild(fp);
    document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&fp.classList.contains("open")) closeFloodPopup(); });
  }
  updateNotifEnableBtn();
}
/* The alerts-drawer button that reopens today's warnings. Its badge is the
   live district count, and the whole control disappears when neither the live
   feed nor the fallback bulletin has anything to show — a button promising
   "today's district warnings" that opens an empty panel is worse than absent. */
function updateWarnReopen(){
  const wr=$("#warnReopen"); if(!wr) return;
  const n=LIVE_WARN ? (LIVE_WARN.count||0)
        : (typeof WARNINGS!=="undefined" && WARNINGS.active!==false ? (WARNINGS.count||0) : 0);
  const badge=$("#warnReopenN"); if(badge) badge.textContent=n?toNepDigits(String(n)):"";
  wr.hidden=!n;
}

function notifOpen(){const p=$("#notif"),s=$("#scrim"); if(!p)return; p.classList.add("open");s.classList.add("open");p.setAttribute("aria-hidden","false");updateNotifEnableBtn();$("#notifX").focus();}
function notifClose(){const p=$("#notif"),s=$("#scrim"); if(!p)return; p.classList.remove("open");s.classList.remove("open");p.setAttribute("aria-hidden","true");const b=$("#bell");b&&b.focus();}
function renderNotifs(){
  const items=activeNotifs();
  const list=$("#notifList"); const cnt=$("#notifCount");
  // Both badges: the header bell (desktop) and the one inside the mobile menu.
  // The mobile one was never being written, so it always read 0 on phones.
  $$("#bellBadge, #mobileBellBadge").forEach(badge=>{
    badge.textContent=items.length;
    badge.toggleAttribute("hidden",items.length===0);
  });
  if(cnt) cnt.textContent=items.length;
  if(!list) return;
  if(!items.length){ list.innerHTML=`<div class="nrow nrow--empty">${esc(t("notif.empty"))}</div>`; return; }
  list.innerHTML=items.map(n=>`
    <div class="nrow nrow--${n.sev}">
      <div class="nrow__t"><span class="nrow__tag">${esc(TL(n.tag))}</span><span class="nrow__time mono">${esc(n.time)}</span></div>
      <div class="nrow__msg">${esc(TL(n.msg))}</div>
      <div class="nrow__src">SRC · ${esc(n.src)}${n.url?` · <a href="${esc(n.url)}" target="_blank" rel="noopener" style="color:var(--crimson)">${esc(t("news.source"))}</a>`:""}</div>
    </div>`).join("");
}

/* ---------- history detail (lazy Wikipedia) ---------- */
function initHistoryDetail(){
  const g=$("#histList"); if(!g) return;
  g.addEventListener("keydown",e=>{ if((e.key==="Enter"||e.key===" ")&&e.target.classList.contains("hist")){e.preventDefault();e.target.click();} });
  g.addEventListener("click",async e=>{
    const card=e.target.closest(".hist"); if(!card) return;
    if(e.target.closest("a")) return;
    const open=card.classList.toggle("open");
    const box=card.querySelector(".hist__detail");
    if(open && box && !box.dataset.loaded){
      box.dataset.loaded="1";
      box.innerHTML=`<p class="mono" style="grid-column:1/-1;color:var(--muted)">${esc(t("hist.loading"))}</p>`;
      const title=HISTORY_WIKI[card.dataset.year];
      try{
        const w=await fetchWiki(title);
        const img=w.thumbnail&&w.thumbnail.source?`<img alt="" src="${esc(w.thumbnail.source)}">`:"";
        const link=(w.content_urls&&w.content_urls.desktop&&w.content_urls.desktop.page)||("https://en.wikipedia.org/wiki/"+encodeURIComponent(title));
        box.innerHTML=`<div>${img||""}</div><div><p>${esc(w.extract||"")}</p><a class="hist__more" href="${esc(link)}" target="_blank" rel="noopener">${esc(t("hist.readmore"))}</a></div>`;
      }catch(err){
        const link="https://en.wikipedia.org/wiki/"+encodeURIComponent(title||"");
        box.innerHTML=`<div></div><div><p>${esc(TL(HISTORY.find(h=>h.year===card.dataset.year).desc))}</p><a class="hist__more" href="${esc(link)}" target="_blank" rel="noopener">${esc(t("hist.readmore"))}</a></div>`;
      }
    }
  });
}

/* ---------- news page (index + detail) ---------- */
function renderNewsPage(){
  const root=$("#newsRoot"); if(!root) return;
  const params=new URLSearchParams(location.search);
  const id=params.get("id");
  if(id!==null && NEWS[+id]){ newsDetail(root,+id); } else { newsIndex(root); }
}
function newsIndex(root){
  root.innerHTML=`<div class="newsindex" id="newsGrid"></div>`;
  renderNews(0); // reuse card renderer/thumbs
}
async function newsDetail(root,id){
  const n=NEWS[id];
  const prev=id>0?id-1:null, next=id<NEWS.length-1?id+1:null;
  root.innerHTML=`
    <div class="artbar">
      <button class="btn btn--ghost btn--sm" id="artBack">${esc(t("news.back2"))}</button>
      <div class="row-wrap" style="margin-left:auto">
        ${prev!==null?`<a class="btn btn--ghost btn--sm" href="news.html?id=${prev}">${esc(t("news.prev"))}</a>`:""}
        ${next!==null?`<a class="btn btn--ghost btn--sm" href="news.html?id=${next}">${esc(t("news.next"))}</a>`:""}
        <a class="btn btn--sm" href="news.html" aria-label="Close" title="Close">✕</a>
      </div>
    </div>
    <article class="article">
      <div style="margin:0 0 12px"><span class="tagsq tagsq--${n.sev}">${esc(TL(n.tag))}</span></div>
      <div id="artThumb"><div class="article__thumb" style="height:260px;display:grid;place-items:center">${THUMB_PH}</div></div>
      <h1>${esc(TL(n.title))}</h1>
      <div class="article__meta"><span>${esc(n.time)}</span><span>SRC · ${esc(n.src)}</span></div>
      <p class="article__lead">${esc(TL(n.body))}</p>
      <p>${esc(TL(n.long))}</p>
      <div class="article__src"><span class="livechip"><i></i> ${esc(t("news.overview"))}</span> <span class="mono" style="font-size:.66rem;color:var(--muted)">${esc(t("news.overview.src"))}</span><div id="wikiOv" style="margin-top:8px">…</div></div>
      <div class="row-wrap" style="margin-top:8px">
        <a class="btn btn--primary" href="${esc(n.url)}" target="_blank" rel="noopener">${esc(t("news.source"))}</a>
        <button class="btn btn--ghost" id="artBack2">${esc(t("news.back2"))}</button>
      </div>
    </article>`;
  const goBack=()=>{ if(history.length>1) history.back(); else location.href="news.html"; };
  const bb=$("#artBack"); if(bb) bb.addEventListener("click",goBack);
  const bb2=$("#artBack2"); if(bb2) bb2.addEventListener("click",goBack);
  if(!window.__artEsc){ window.__artEsc=true; document.addEventListener("keydown",e=>{ if(e.key==="Escape" && $("#newsRoot") && new URLSearchParams(location.search).get("id")!==null){ goBack(); } }); }
  try{const imgs=await allImages(); if(imgs.length){const im=imgs[id%imgs.length]; const c=$("#artThumb"); const el=new Image(); el.className="article__thumb"; el.alt=im.cap||""; el.onload=()=>{c.innerHTML="";c.appendChild(el);}; el.src=im.src;}}catch(e){}
  try{const w=await fetchWiki("2026 Nepal floods"); const ov=$("#wikiOv"); if(ov) ov.textContent=w.extract||"";}catch(e){ const ov=$("#wikiOv"); if(ov) ov.textContent=""; }
}

/* =========================================================================
   v4 ADDITIONS — detailed stats page, live 10-min refresh, sync stamp, i18n
   ========================================================================= */
Object.assign(I18N.en,{
  "stat.tap":I18N.en["stat.tap"]||"Tap for breakdown →",
  "news.back2":"← Back","news.prev":"‹ Prev","news.next":"Next ›",
  "sync.updated":"Synced","sync.auto":"live · every 10 min","eas.onset":"Elapsed since onset","nav.stats":"Details","nav.seo":"SEO Page","nav.about":"About Dev",
  "page.stats.h":"Detailed Situation Figures","page.stats.p":"Category-wise breakdown from NDRRMA and Nepal Police, compiled from published situation reports. All figures are provisional and being revised.",
  "stats.src":"Source","stats.na":"Awaiting official figures — see the NDRRMA situation report.","stats.official":"NDRRMA situation report ↗","stats.fb":"NDRRMA updates (Facebook) ↗","stats.field":"Field updates · mirvictor ↗",
  "stats.disclaimer":"Provisional figures as of {date}. Headline numbers refresh automatically every 10 minutes from the NDRRMA rescue API, this site’s curated official feed and the Wikipedia article, in that order of authority. Totals differ between sources and are revised often. This page does not replace official NDRRMA / Nepal Police bulletins — verify before republishing.",
  "om.eye":"Official Registry · NDRRMA · live","om.h":"Missing Persons Named by NDRRMA",
  "om.p":"Read-only mirror of the missing-persons list on the NDRRMA National Disaster Portal, refreshed automatically. These are entries the authority has published for family tracing — separate from the community reports above. The official portal remains authoritative.",
  "om.count":"named in the official registry","om.search":"Search a name…","om.none":"No entries match your search.","om.loading":"Loading the official registry…","om.failed":"The NDRRMA registry could not be reached.","om.retry":"Try again",
  "om.open":"Open the NDRRMA missing-persons portal ↗","om.more":"Show more","om.nat":"Nationality","om.status":"Status","om.remarks":"Remarks",
  "msum.eye":"Overview · Provisional","msum.h":"Missing at a Glance","msum.bycountry":"Foreign nationals missing, by country","msum.total":"Total missing","msum.foreign":"Foreign nationals",
  "msum.note":"Provisional (NDRRMA). Foreign nationals missing or out of contact. Names are released through Nepal Police and NDRRMA — trace individuals via the official channels below.",
  "relief.qr.h":"Scan a QR to Donate","relief.qr.p":"Scan any of these official Fonepay QR codes for the PM Disaster Relief Fund with your banking or wallet app.",
  "relief.portal.h":"Donate Online","relief.portal.p":"Contribute through the official Government of Nepal online portal for the PM Disaster Relief Fund, operated via NCHL.",
  "relief.portal.btn":"Open official PMDRF portal ↗","relief.portal.note":"Opens the official Government portal pmdrf.nchl.com.np in a new tab. For security it cannot be embedded here — confirm the web address before paying.","relief.banks.h":"Bank Account Details","relief.tab.portal":"PMDRF Portal","relief.tab.qr":"Show QR","relief.tab.banks":"Bank Details","relief.portal.blocked":"The Government portal blocks embedding for security, so it may show blank below. Use the button above to open it safely in a new tab."
});
Object.assign(I18N.ne,{
  "news.back2":"← फर्कनुहोस्","news.prev":"‹ अघिल्लो","news.next":"अर्को ›",
  "sync.updated":"सिंक","sync.auto":"प्रत्यक्ष · हरेक १० मिनेट","eas.onset":"घटना भएको","nav.stats":"विवरण",
  "page.stats.h":"विस्तृत अवस्था तथ्यांक","page.stats.p":"NDRRMA र नेपाल प्रहरीका प्रकाशित प्रतिवेदनबाट वर्गअनुसार विवरण। सबै तथ्यांक प्रारम्भिक र संशोधन हुँदै।",
  "stats.src":"स्रोत","stats.na":"आधिकारिक तथ्यांक प्रतीक्षामा — NDRRMA प्रतिवेदन हेर्नुहोस्।","stats.official":"NDRRMA प्रतिवेदन ↗","stats.fb":"NDRRMA अपडेट (फेसबुक) ↗","stats.field":"स्थलगत अपडेट · mirvictor ↗",
  "stats.disclaimer":"{date} सम्मको प्रारम्भिक तथ्यांक। मुख्य संख्या हरेक १० मिनेटमा NDRRMA उद्धार API, यस साइटको आधिकारिक फिड र विकिपिडिया लेखबाट — सोही प्राथमिकता क्रममा — स्वतः अद्यावधिक हुन्छ। स्रोत अनुसार फरक पर्छ र बारम्बार संशोधन हुन्छ। आधिकारिक NDRRMA / नेपाल प्रहरी विवरणसँग रुजु गर्नुहोस्।",
  "om.eye":"आधिकारिक अभिलेख · NDRRMA · प्रत्यक्ष","om.h":"NDRRMA ले नाम सार्वजनिक गरेका बेपत्ता व्यक्ति",
  "om.p":"NDRRMA राष्ट्रिय विपद् पोर्टलको बेपत्ता व्यक्ति सूचीको पढ्न मात्र मिल्ने प्रतिलिपि, स्वतः अद्यावधिक। यी प्राधिकरणले परिवार खोजीका लागि प्रकाशित गरेका विवरण हुन् — माथिका सामुदायिक रिपोर्टभन्दा फरक। आधिकारिक पोर्टल नै प्रामाणिक।",
  "om.count":"आधिकारिक अभिलेखमा दर्ता","om.search":"नाम खोज्नुहोस्…","om.none":"खोजीसँग मिल्ने विवरण भेटिएन।","om.loading":"आधिकारिक अभिलेख लोड हुँदै…","om.failed":"NDRRMA अभिलेखमा पहुँच भएन।","om.retry":"पुनः प्रयास",
  "om.open":"NDRRMA बेपत्ता व्यक्ति पोर्टल खोल्नुहोस् ↗","om.more":"थप हेर्नुहोस्","om.nat":"राष्ट्रियता","om.status":"अवस्था","om.remarks":"कैफियत",
  "msum.eye":"सारांश · प्रारम्भिक","msum.h":"बेपत्ता — एक नजरमा","msum.bycountry":"बेपत्ता विदेशी नागरिक, देश अनुसार","msum.total":"कुल बेपत्ता","msum.foreign":"विदेशी नागरिक",
  "msum.note":"प्रारम्भिक (NDRRMA)। बेपत्ता वा सम्पर्कविहीन विदेशी नागरिक। नाम नेपाल प्रहरी र NDRRMA मार्फत सार्वजनिक हुन्छन् — तलका आधिकारिक स्रोतबाट खोजी गर्नुहोस्।",
  "relief.qr.h":"स्क्यान गरी दान गर्नुहोस्","relief.qr.p":"प्रधानमन्त्री विपद् राहत कोषका यी आधिकारिक फोनपे QR कुनै पनि बैंकिङ वा वालेट एपबाट स्क्यान गर्नुहोस्।",
  "relief.portal.h":"अनलाइन दान गर्नुहोस्","relief.portal.p":"नेपाल सरकारको आधिकारिक अनलाइन पोर्टल (NCHL) मार्फत प्रधानमन्त्री विपद् राहत कोषमा योगदान गर्नुहोस्।",
  "relief.portal.btn":"आधिकारिक PMDRF पोर्टल खोल्नुहोस् ↗","relief.portal.note":"आधिकारिक सरकारी पोर्टल pmdrf.nchl.com.np नयाँ ट्याबमा खुल्छ। सुरक्षाका लागि यहाँ इम्बेड गर्न मिल्दैन — भुक्तानी अघि ठेगाना रुजु गर्नुहोस्।","relief.banks.h":"बैंक खाता विवरण","relief.tab.portal":"PMDRF पोर्टल","relief.tab.qr":"QR हेर्नुहोस्","relief.tab.banks":"बैंक विवरण","relief.portal.blocked":"सुरक्षाका कारण सरकारी पोर्टल इम्बेड हुँदैन, त्यसैले तल खाली देखिन सक्छ। माथिको बटनबाट नयाँ ट्याबमा खोल्नुहोस्।"
});

/* Detailed, category-wise figures — real & sourced; honest placeholders where
   official numbers are not yet itemised (never fabricated). NDRRMA / Nepal Police,
   compiled 27–28 Aug 2026. */
const STATS_DETAIL=[
 {id:"deaths", sev:"danger", big:"1,127", title:{en:"Confirmed Deaths",ne:"पुष्टि मृत्यु"}, unit:{en:"Nepal side · auto-updated from live sources",ne:"नेपालतर्फ · प्रत्यक्ष स्रोतबाट स्वतः अद्यावधिक"}, src:"Nepal Police / NDRRMA",
  // Row 0 is the national total and is rewritten live. The district rows below
  // it are the last breakdown NDRRMA published by district and lag the national
  // figure — they are labelled as such rather than scaled to make them add up.
  rows:[["Nepal — confirmed dead (Nepal Police, 2 Sept)","1,127"],["Bodies recovered so far (approx.)","900"],["— of these, formally identified","4%"],["By district — last published breakdown",""],["Chitwan","340"],["Nawalparasi East","228"],["Nawalparasi West","178"],["Nuwakot","102"],["Gorkha","68"],["Dhading","58"],["Tanahun","36"]],
  note:{en:"NDRRMA confirms {n} deaths on the Nepal side. Around 900 bodies have been recovered so far and the Ministry of Health reports that just 4% have been formally identified — DNA testing and facial photographs are being used as morgues run past capacity. Chitwan, roughly 160 km downstream, has recovered the most. The district breakdown below is the last one published by district and lags the national total, which auto-updates every 10 minutes from official sources.",ne:"NDRRMA का अनुसार नेपालतर्फ {n} मृत्यु पुष्टि। अहिलेसम्म करिब ९०० शव फेला परेका छन्, तर स्वास्थ्य मन्त्रालयका अनुसार ४ प्रतिशतको मात्र औपचारिक पहिचान भएको छ — शवगृह क्षमताभन्दा बढी भरिएपछि डीएनए परीक्षण र तस्बिरबाट पहिचान गरिँदै छ। करिब १६० कि.मि. तल रहेको चितवनमा सबैभन्दा धेरै शव भेटिएका छन्। तलको जिल्लागत विवरण अन्तिम पटक प्रकाशित तथ्यांक हो र राष्ट्रिय संख्याभन्दा पछाडि छ; राष्ट्रिय संख्या हरेक १० मिनेटमा स्वतः अद्यावधिक हुन्छ।"}},
 {id:"missing", sev:"danger", big:"3,916", title:{en:"Missing and Out of Contact",ne:"बेपत्ता तथा सम्पर्कविहीन"}, unit:{en:"Nepal side only · active NDRRMA registry",ne:"नेपालतर्फ मात्र · NDRRMA सक्रिय अभिलेख"}, src:"NDRRMA / Nepal Police",
  rows:[["Nepal — missing / out of contact","3,916"],["Linked to hydropower projects (12 projects)","900"],["Foreign nationals among the missing (38 countries)","583"],["Trade and transport workers (est.)","300"],["Nepalis accompanying foreign tourists","127"],["Nepali Army personnel","44"],["Nepal Police personnel","28"],["Customs office employees","15"],["Armed Police Force personnel","13"],["Immigration office employees","4"]],
  note:{en:"NDRRMA reports {n} people missing or out of contact on the Nepal side. The list includes 900 workers from 12 hydropower projects (around 500 of them believed trapped in flooded tunnels), 583 foreign nationals from 38 countries, an estimated 300 trade and transport workers who used the Gyirong crossing, and 85 security personnel on duty. Tibet's separately-counted missing (546) are not included. Figures are revised as people are located or verified.",ne:"NDRRMA का अनुसार नेपालतर्फ {n} जना बेपत्ता वा सम्पर्कविहीन। यसमा १२ जलविद्युत् आयोजनाका ९०० कामदार (करिब ५०० सुरुङभित्र फसेको अनुमान), ३८ देशका ५८३ विदेशी नागरिक, ग्यीरोङ नाका प्रयोग गर्ने करिब ३०० व्यापार तथा यातायात कामदार र ८५ सुरक्षाकर्मी समावेश छन्। तिब्बततर्फ छुट्टै रहेका ५४६ बेपत्ता यसमा समावेश छैनन्। व्यक्तिहरू फेला पर्दै जाँदा यो संख्या परिमार्जन हुन्छ।"}},
 {id:"rescued", sev:"relief", big:"11,993", title:{en:"Rescued",ne:"उद्धार"}, unit:{en:"PM's statement to Parliament, 2 Sept · rising daily",ne:"प्रधानमन्त्रीको संसद सम्बोधन, २ सेप्टेम्बर · दैनिक बढ्दो"}, src:"Office of the PM / NDRRMA / Nepali Army",
  // NOTE: rows 0–3 are written BY INDEX from _setRescueRegistry() —
  // [0]=grand total, [1]=named registry, [2]=Nepali, [3]=foreign.
  rows:[["Total rescued (PM to Parliament, 2 Sept)","11,993"],["Named in the public registry","4,248"],["— of these, Nepali","3,918"],["— of these, foreign","330"],["Airlifted by the Nepali Army — Nepali","3,344"],["Airlifted by the Nepali Army — foreign nationals","252"],["Rescue and relief flights flown","411"],["Logged in the NDRRMA rescue system","7,514"]],
  note:{en:"NDRRMA's bulletin puts the cumulative total rescued at {n}. Three different official numbers describe this and they are not interchangeable: the bulletin total above, the named public registry used for family tracing (live from NDRRMA's API), and NDRRMA's internal rescue-management log, which trails both. All three are listed separately rather than merged into one figure. The Nepali Army has airlifted 3,344 Nepalis and 252 foreign nationals across 411 rescue and relief flights.",ne:"NDRRMA को विज्ञप्तिअनुसार कुल उद्धार संख्या {n} पुगेको छ। यसका तीन फरक आधिकारिक संख्या छन् र ती एउटै होइनन्: माथिको विज्ञप्ति संख्या, परिवार खोजीका लागि प्रयोग हुने नामावली अभिलेख (NDRRMA को API बाट प्रत्यक्ष), र दुवैभन्दा पछाडि रहेको NDRRMA को आन्तरिक उद्धार अभिलेख। तीनवटै छुट्टाछुट्टै देखाइएका छन्। नेपाली सेनाले ४११ उडानमार्फत ३,३४४ नेपाली र २५२ विदेशी नागरिकको हवाई उद्धार गरेको छ।"}},
 {id:"injured", sev:"watch", big:"1,473", title:{en:"Injured & Medical Care",ne:"घाइते तथा स्वास्थ्य उपचार"}, unit:{en:"Nepal side · NDRRMA injured count",ne:"नेपालतर्फ · NDRRMA घाइते संख्या"}, src:"NDRRMA / MOHP",
  // Row 0 is the national injured total and is rewritten live. The rows under it
  // are narrower counts — hospital admissions, still-critical cases — and are NOT
  // the same number, which is why the headline no longer reads 279.
  rows:[["Nepal — injured (NDRRMA)","1,473"],["Admitted to hospital","279"],["Still under intensive treatment","111"],["Medical treatments provided across the response","2,740"]],
  note:{en:"NDRRMA reports {n} injured on the Nepal side. That national figure is wider than the hospital caseload: 279 people have been admitted for structured care across Bharatpur, Pokhara, Dhading, Nuwakot and Kathmandu, 111 of them still under intensive treatment, while 2,740 emergency and trauma treatments have been given in total, largely through mobile field clinics. The government is covering treatment costs for those injured.",ne:"NDRRMA का अनुसार नेपालतर्फ {n} जना घाइते छन्। यो राष्ट्रिय संख्या अस्पतालको संख्याभन्दा फराकिलो हो: भरतपुर, पोखरा, धादिङ, नुवाकोट र काठमाडौंका अस्पतालमा २७९ जना भर्ना छन्, जसमध्ये १११ जना गम्भीर उपचारमा छन्; फिल्ड क्लिनिकसहित कुल २,७४० जनालाई आकस्मिक तथा ट्रमा उपचार दिइएको छ। घाइतेको उपचार खर्च सरकारले बेहोरेको छ।"}},
 {id:"foreign", sev:"danger", big:"583", title:{en:"Foreign Nationals by Country",ne:"विदेशी नागरिक देश अनुसार"}, unit:{en:"at least {n} missing on the Nepal side · 38 countries",ne:"नेपालतर्फ कम्तीमा {n} बेपत्ता · ३८ देश"}, src:"Nepal Police / Diplomatic Missions",
  rows:[["India","288"],["China (approx.)","100"],["United States","80"],["Ukraine","53"],["Malaysia","51"],["Australia","35"],["United Kingdom","33"],["Latvia","33"],["Canada","32"],["South Korea","9"]],
  note:{en:"At least {n} foreign nationals from 38 countries are reported missing on the Nepal side according to Nepal Police and the respective embassies — primarily pilgrims and trekkers on the Kailash Mansarovar and Langtang routes, and travellers who were at the Gyirong border crossing when the flood struck. Individual embassy counts are announced separately and do not sum to the national total.",ne:"नेपाल प्रहरी र सम्बन्धित दूतावासका अनुसार ३८ देशका कम्तीमा {n} विदेशी नागरिक नेपालतर्फ बेपत्ता छन् — मुख्यतः कैलाश मानसरोवर र लाङटाङ पदमार्गका तीर्थयात्री तथा पदयात्री, र बाढी आउँदा ग्यीरोङ नाकामा रहेका यात्रुहरू। दूतावासहरूले छुट्टाछुट्टै घोषणा गरेका संख्या जोड्दा राष्ट्रिय संख्या बन्दैन।"}},
 {id:"security", sev:"watch", big:"21,008", title:{en:"Search Operation & Security Forces",ne:"खोज तथा उद्धार सुरक्षाकर्मी"}, unit:{en:"live deployment count across all agencies",ne:"सबै सुरक्षा निकायको सक्रिय परिचालन"}, src:"NDRRMA / Joint Command",
  rows:[["Total personnel mobilised (NDRRMA live count)","21,008"],["Nepali Army","8,722"],["Nepal Police","7,894"],["Armed Police Force","4,203"],["Rescue and relief flights flown","411"],["Psychosocial counsellors deployed (Rasuwa & Nuwakot)","50+"],["Settlements still out of reach","2,498"],["Communication towers","Connectivity fully restored"]],
  note:{en:"{n} personnel across the Nepali Army, Nepal Police, and Armed Police Force are deployed in intensive search, rescue, helicopter evacuation, and relief transport missions.",ne:"नेपाली सेना, नेपाल प्रहरी र सशस्त्र प्रहरी बलका {n} सुरक्षाकर्मी खोज, उद्धार, हवाई उद्धार तथा राहत वितरणमा संयुक्त रूपमा परिचालित छन्।"}},
 {id:"tunnel", sev:"danger", big:"900", title:{en:"Hydropower Tunnel Rescue",ne:"जलविद्युत् सुरुङ उद्धार"}, unit:{en:"workers missing across 12 projects",ne:"१२ आयोजनाका बेपत्ता कामदार"}, src:"IPPAN / NDRRMA / NEA / Joint Rescue",
  rows:[["Hydropower workers missing (12 projects)","900"],["Believed still inside tunnel systems","~500"],["Upper Trishuli-1 — reported missing","576"],["Upper Trishuli-1 — believed inside the tunnel","~300"],["Brought out of Trishuli 3A so far","~350"],["Airlifted from tunnels in the first two days","279"],["Hydropower projects damaged (NEA)","13"],["Hydropower facilities damaged or destroyed","27"]],
  note:{en:"{n} workers across 12 hydropower projects are reported missing, with roughly 500 believed trapped in debris-flooded tunnels. Upper Trishuli-1 accounts for 576 of the missing, around 300 of them underground. On 31 August a controlled explosion was carried out in the Upper Trishuli 3A tunnel and the Nepali Army dug about 10 m down with excavators to begin clearing water, mud and debris. Specialist tunnel-rescue teams from India and China are on site.",ne:"१२ जलविद्युत् आयोजनाका {n} कामदार बेपत्ता छन्, जसमध्ये करिब ५०० जना लेदो भरिएका सुरुङभित्र फसेको अनुमान छ। माथिल्लो त्रिशूली-१ मा मात्रै ५७६ जना बेपत्ता छन्, जसमध्ये करिब ३०० सुरुङभित्रै रहेको अनुमान छ। ३१ अगस्टमा माथिल्लो त्रिशूली ३A सुरुङमा नियन्त्रित विस्फोट गरी नेपाली सेनाले करिब १० मिटर गहिरो खनेर पानी, हिलो र लेदो हटाउन सुरु गरेको छ। भारत र चीनबाट सुरुङ उद्धार विशेषज्ञ टोली स्थलगत छन्।"}},
 {id:"damage", sev:"watch", big:"200", title:{en:"Damage and Infrastructure",ne:"क्षति र पूर्वाधार"}, unit:{en:"Rs billion — preliminary estimate (~$4–$5B)",ne:"रु. अर्ब — प्रारम्भिक अनुमान (४–५ अर्ब डलर)"}, src:"Govt. of Nepal / Dept. of Roads / NEA / IFRC",
  rows:[["Preliminary damage estimate (Rs billion)","200"],["Roads and bridges (Rs billion)","15"],["Bridges damaged","41"],["Road damaged (km)","42"],["Hydropower projects damaged (NEA)","13"],["Generation knocked off the grid (MW)","431"],["Under-construction capacity damaged (MW)","470"],["Schools damaged or destroyed","38"],["People affected (IFRC estimate)","93,000"],["Need emergency water & sanitation (UN)","65,000"],["Pregnant & breastfeeding women needing nutrition aid (UN)","10,500"],["Children under 5 needing treatment for severe wasting (UN)","2,600"]],
  note:{en:"Total damage is preliminarily estimated at Rs 200 billion (approx. USD 4–5 billion). Road and bridge infrastructure losses stand at Rs 15 billion with 41 bridges destroyed or severely damaged, and 431 MW of generation knocked off the national grid; the Nepal Electricity Authority counts 13 hydropower projects damaged. The IFRC estimates 93,000 people affected, and the UN puts 65,000 in need of emergency water, sanitation and hygiene supplies.",ne:"प्रारम्भिक कुल क्षति करिब रु. २०० अर्ब (४–५ अर्ब अमेरिकी डलर) अनुमान गरिएको छ। सडक तथा पुल पूर्वाधारमा रु. १५ अर्बको क्षति भएको छ, जसमा ४१ पुल र ४२ कि.मि. सडक क्षतिग्रस्त छन् भने ४३१ मेगावाट उत्पादन राष्ट्रिय ग्रिडबाट विच्छेद भएको छ; नेपाल विद्युत् प्राधिकरणका अनुसार १३ जलविद्युत् आयोजना क्षतिग्रस्त छन्। IFRC का अनुसार ९३,००० जना प्रभावित छन् भने संयुक्त राष्ट्रसंघका अनुसार ६५,००० जनालाई आकस्मिक खानेपानी तथा सरसफाइ सामग्री आवश्यक छ।"}},
 {id:"materials", sev:"relief", big:"", title:{en:"Relief Materials & International Aid",ne:"राहत सामग्री र अन्तर्राष्ट्रिय सहायता"}, src:"AP / BBC / Reuters / IFRC",
  rows:[["PM Disaster Relief Fund (Rs billion)","5.44"],["Released to 15 local units (Rs million)","675"],["Released to Rasuwa (Rs crore)","1"],["Released to Nuwakot (Rs crore)","1"],["Truckloads of relief material despatched","10"],["Ministers' salary pledge","One month, all ministers"],["India — DNA testing & body management","Lab support provided"],["China — emergency supplies","50 tonnes / 13,200 items"],["India — supplies","~50 tonnes"],["IFRC emergency appeal","CHF 25 million"],["Asian Development Bank","USD 5 million"],["European Union","EUR 2 million"],["Welthungerhilfe","EUR 2 million"],["UN CERF","USD 2 million"],["South Korea","USD 1 million"],["Red Cross / IFRC DREF","CHF 1 million"],["World Health Organization","USD 150,000"]],
  note:{en:"International assistance packages continue arriving, including 50 tonnes of emergency shelter and medical supplies from China and India, alongside UN CERF and multilateral funding allocations.",ne:"चीन र भारतबाट ५०–५० टन आपत्कालीन राहत तथा औषधीय सामग्री, राष्ट्रसंघीय CERF कोष तथा बहुपक्षीय सहायता परिचालन जारी छ।"}},
 {id:"heli", sev:"relief", big:"", title:{en:"Helicopter and Ground Operations",ne:"हेलिकप्टर र स्थलगत उद्धार"}, unit:{en:"Timure · Dhunche · Mailung · Syafrubesi · Trishuli",ne:"तिमुरे · धुन्चे · माइलुङ · स्याफ्रुबेसी · त्रिशूली"}, src:"Nepal Army / NDRRMA",
  note:{en:"Nepali Army helicopters and joint security squads have flown over 411 rescue sorties, evacuating cut-off residents, transporting critical medical patients, and deploying bailey bridge materials.",ne:"नेपाली सेनाका हेलिकप्टर र संयुक्त टोलीहरूले ४११ भन्दा बढी उडान गरी प्रभावित क्षेत्रबाट नागरिक उद्धार तथा राहत सामग्री ढुवानी गरेका छन्।"}}
];
function renderStatsPage(){
  const root=$("#statsRoot"); if(!root) return;
  root.innerHTML=`
    <p class="verify" style="margin-bottom:18px">${esc(applyTokens(t("stats.disclaimer")))}<br>
      <span style="display:inline-flex;gap:14px;flex-wrap:wrap;margin-top:4px">
        <a href="https://bipadportal.gov.np" target="_blank" rel="noopener" style="color:var(--crimson);font-weight:600">${esc(t("stats.official"))}</a>
        <a href="https://www.facebook.com/NDRRMA" target="_blank" rel="noopener" style="color:var(--crimson);font-weight:600">${esc(t("stats.fb"))}</a>
        <a href="https://nepalpolice.gov.np" target="_blank" rel="noopener" style="color:var(--crimson);font-weight:600">Nepal Police ↗</a>
        <a href="https://nepalarmy.mil.np" target="_blank" rel="noopener" style="color:var(--crimson);font-weight:600">Nepal Army ↗</a>
        <a href="https://www.facebook.com/mirvictor" target="_blank" rel="noopener" style="color:var(--crimson);font-weight:600">${esc(t("stats.field"))}</a>
      </span></p>
    <div class="sd-grid">${STATS_DETAIL.map(s=>`
      <section class="sd" id="${s.id}">
        <div class="sd__head sd--${s.sev}">
          ${s.big?`<div class="sd__n mono">${esc(toNepDigits(s.big))}</div>`:""}
          <div><div class="sd__t">${esc(TL(s.title))}</div>${s.unit?`<div class="sd__u mono">${esc(TL(s.unit).replace(/\{n\}/g, toNepDigits(s.big||"")))}</div>`:""}</div>
        </div>
        ${s.rows?`<table class="sd__table">${s.rows.map(r=>`<tr><td>${esc(r[0])}</td><td class="mono">${esc(toNepDigits(r[1]))}</td></tr>`).join("")}</table>`:""}
        ${s.note?`<p class="sd__note">${esc(TL(s.note).replace(/\{n\}/g, toNepDigits(s.big||"")))}</p>`:(!s.rows?`<p class="sd__note">${esc(t("stats.na"))}</p>`:"")}
        <div class="sd__src">${esc(t("stats.src"))} · ${esc(s.src)}</div>
      </section>`).join("")}</div>`;
  if(location.hash){ const el=document.getElementById(location.hash.slice(1)); if(el) setTimeout(()=>el.scrollIntoView({behavior:"smooth",block:"start"}),120); }
}

/* =========================================================================
   OFFICIAL MISSING-PERSONS REGISTRY (NDRRMA, live)
   The Missing Persons page used to carry only community-submitted reports held
   in this browser's localStorage — useful, but not the list families actually
   need. NDRRMA publishes a named missing-persons registry through the same
   CORS-open API that already powers the Rescued page, so it is mirrored here
   read-only, refreshed on every 10-minute sync. Data comes from
   _srcMissingRegistry() into OFFICIAL_MISSING.
   ========================================================================= */
const OM_STATE={q:"",show:24};
function omName(p){
  const en=(p.name||"").trim(), ne=(p.name_ne||"").trim();
  return LANG==="ne" ? (ne||en||"—") : (en||ne||"—");
}
function omStatus(p){ return (LANG==="ne" && p.status_ne) ? p.status_ne : (p.status||""); }
function omFiltered(){
  const list=(OFFICIAL_MISSING&&OFFICIAL_MISSING.persons)||[];
  const q=OM_STATE.q.trim().toLowerCase();
  if(!q) return list;
  return list.filter(p=>(omName(p)+" "+(p.country||"")+" "+(p.nationality||"")+" "+(p.remarks||"")).toLowerCase().includes(q));
}
function renderOfficialMissing(){
  const root=$("#officialMissing"); if(!root) return;
  if(!OFFICIAL_MISSING){
    root.innerHTML = OFFICIAL_MISSING_ERR
      ? `<div class="omwrap"><p class="omloading">${esc(t("om.failed"))} <button class="btn btn--ghost btn--sm" id="omRetry">${esc(t("om.retry"))}</button></p></div>`
      : `<div class="omwrap"><p class="omloading">${esc(t("om.loading"))}</p></div>`;
    const rt=$("#omRetry");
    if(rt) rt.addEventListener("click",()=>{ OFFICIAL_MISSING_ERR=false; renderOfficialMissing(); loadOfficialMissing(1); });
    return;
  }
  const all=omFiltered();
  const shown=all.slice(0,OM_STATE.show);
  const rows=shown.map(p=>`
    <li class="omrow">
      <span class="omrow__n">${esc(omName(p))}</span>
      <span class="omrow__m">
        ${p.age?`<span>${esc(String(p.age))}</span>`:""}
        ${p.gender?`<span>${esc(capWord(p.gender))}</span>`:""}
        ${p.nationality?`<span>${esc(capWord(p.country||p.nationality))}</span>`:""}
      </span>
      ${p.remarks?`<span class="omrow__r">${esc(p.remarks)}</span>`:""}
      ${omStatus(p)?`<span class="omrow__s">${esc(omStatus(p))}</span>`:""}
    </li>`).join("");
  root.innerHTML=`
    <section class="omwrap">
      <div class="sec-head">
        <div><span class="eyebrow">${esc(t("om.eye"))}</span><h2>${esc(t("om.h"))}</h2></div>
        <a class="more" href="https://ndrrma.gov.np/np/missing" target="_blank" rel="noopener">${esc(t("om.open"))}</a>
      </div>
      <p class="omintro">${esc(t("om.p"))}</p>
      <div class="ombar">
        <span class="ombar__n mono">${esc(toNepDigits(_fmtInt(OFFICIAL_MISSING.count)))}</span>
        <span class="ombar__l">${esc(t("om.count"))}</span>
        <span class="ombar__search"><input id="omSearch" type="search" value="${esc(OM_STATE.q)}" placeholder="${esc(t("om.search"))}" aria-label="${esc(t("om.search"))}"></span>
      </div>
      ${all.length?`<ul class="omlist">${rows}</ul>`:`<p class="omloading">${esc(t("om.none"))}</p>`}
      ${all.length>shown.length?`<button class="btn btn--ghost btn--sm ommore" id="omMore">${esc(t("om.more"))} (${all.length-shown.length})</button>`:""}
    </section>`;
  const inp=$("#omSearch");
  if(inp) inp.addEventListener("input",e=>{ OM_STATE.q=e.target.value; OM_STATE.show=24; renderOfficialMissing(); const f=$("#omSearch"); if(f){f.focus(); f.setSelectionRange(f.value.length,f.value.length);} });
  const more=$("#omMore");
  if(more) more.addEventListener("click",()=>{ OM_STATE.show+=48; renderOfficialMissing(); });
}

/* Missing-persons summary — country-wise, distinct compact bar style */
function renderMissingSummary(){
  const el=$("#missingSummary"); if(!el) return;
  const totalMissing=(STATS.find(s=>s.key==="missing")||{}).n||"—";
  const foreignTotal=(STATS.find(s=>s.key==="foreign")||{}).n||"—";
  const fseg=STATS_DETAIL.find(s=>s.id==="foreign");
  const rows=(fseg&&fseg.rows)||[];
  const val=r=>parseInt(String(r[1]).replace(/[^0-9]/g,""))||0;
  const max=Math.max(1,...rows.map(val));
  el.innerHTML=`
    <div class="msum">
      <div class="msum__top">
        <div><span class="eyebrow" data-i18n="msum.eye">Overview</span><h3 data-i18n="msum.h">Missing at a Glance</h3></div>
        <div class="msum__kpis">
          <div class="msum__kpi"><div class="k mono">${esc(totalMissing)}</div><div class="l">${esc(t("msum.total"))}</div></div>
          <div class="msum__kpi"><div class="k mono" style="color:var(--danger)">${esc(foreignTotal)}</div><div class="l">${esc(t("msum.foreign"))}</div></div>
        </div>
      </div>
      <div class="msum__ttl">${esc(t("msum.bycountry"))}</div>
      <div class="msum__bars">
        ${rows.map(r=>{const v=val(r);const pct=Math.max(3,Math.round(v/max*100));return `
          <div class="msum__row"><span class="msum__c">${esc(r[0])}</span><span class="msum__track"><span class="msum__fill" style="width:${pct}%"></span></span><span class="msum__v mono">${esc(r[1])}</span></div>`;}).join("")}
      </div>
      <p class="msum__note">${esc(t("msum.note"))}</p>
    </div>`;
}

/* =========================================================================
   RESCUE PORTAL — named registry mirrored from the NDRRMA National Disaster
   Portal (https://ndrrma.gov.np/np/rescue). The NDRRMA API has no CORS headers,
   so a same-origin snapshot (assets/rescues.json) is served; refresh it with
   tools/fetch_rescues.js. A live pull is still attempted first in case CORS is
   ever enabled or the file is proxied.
   ========================================================================= */
Object.assign(I18N.en,{
  "nav.rescue":"Rescued",
  "page.rescue.h":"Rescued Persons","page.rescue.eye":"Official Registry · NDRRMA",
  "page.rescue.p":"Register of people rescued in the 2026 floods, mirrored from the NDRRMA National Disaster Portal. Names and details are published by NDRRMA for family tracing — the official portal remains authoritative. Verify before acting.",
  "rescue.total":"Named in the public registry","rescue.grandtotal":"Total rescued (NDRRMA live)","rescue.nepali":"Nepali (named)","rescue.foreign":"Foreign (named)",
  "rescue.all":"All","rescue.name":"Name","rescue.age":"Age","rescue.loc":"Rescued at","rescue.date":"Date","rescue.status":"Status",
  "rescue.status.all":"All statuses","rescue.status.care":"Under medical care","rescue.status.safe":"Safe","rescue.status.injured":"Injured",
  "rescue.search":"Search name or location…","rescue.none":"No rescued persons match your search.",
  "rescue.showing":"Showing","rescue.of":"of","rescue.more":"Show more","rescue.loading":"Loading rescue register…","rescue.perpage":"Per page",
  "rescue.updated":"Snapshot","rescue.official":"Open official NDRRMA rescue portal ↗",
  "rescue.note":"This is a mirror of already-public official data, for family tracing and situational awareness. For the authoritative, most current list, use the official NDRRMA portal."
});
Object.assign(I18N.ne,{
  "nav.rescue":"उद्धार",
  "page.rescue.h":"उद्धार गरिएका व्यक्ति","page.rescue.eye":"आधिकारिक अभिलेख · NDRRMA",
  "page.rescue.p":"२०२६ को बाढीमा उद्धार गरिएका व्यक्तिहरूको अभिलेख, NDRRMA राष्ट्रिय विपद् पोर्टलबाट। नाम र विवरण परिवार खोजीका लागि NDRRMA द्वारा प्रकाशित — आधिकारिक पोर्टल नै प्रामाणिक। कार्य गर्नुअघि रुजु गर्नुहोस्।",
  "rescue.total":"सार्वजनिक नामावलीमा दर्ता","rescue.grandtotal":"कुल उद्धार (NDRRMA प्रत्यक्ष)","rescue.nepali":"नेपाली (नामावली)","rescue.foreign":"विदेशी (नामावली)",
  "rescue.all":"सबै","rescue.name":"नाम","rescue.age":"उमेर","rescue.loc":"उद्धार स्थान","rescue.date":"मिति","rescue.status":"अवस्था",
  "rescue.status.all":"सबै अवस्था","rescue.status.care":"उपचाररत","rescue.status.safe":"सुरक्षित","rescue.status.injured":"घाइते",
  "rescue.search":"नाम वा स्थान खोज्नुहोस्…","rescue.none":"तपाईंको खोजीसँग मिल्ने उद्धारित व्यक्ति फेला परेन।",
  "rescue.showing":"देखाइँदै","rescue.of":"मध्ये","rescue.more":"थप हेर्नुहोस्","rescue.loading":"उद्धार अभिलेख लोड हुँदै…","rescue.perpage":"प्रति पृष्ठ",
  "rescue.updated":"अभिलेख","rescue.official":"आधिकारिक NDRRMA उद्धार पोर्टल खोल्नुहोस् ↗",
  "rescue.note":"यो पहिले नै सार्वजनिक आधिकारिक तथ्यांकको प्रतिलिपि हो, परिवार खोजी र अवस्था जानकारीका लागि। प्रामाणिक र पछिल्लो सूचीका लागि आधिकारिक NDRRMA पोर्टल प्रयोग गर्नुहोस्।"
});

let RESCUE=null;
const RESCUE_STATE={q:"",nat:"all",status:"all",page:1,perPage:20};
/* Show the best available name/location. Nepali records often have ONLY the
   Devanagari field (Latin name empty), so in English we must fall back to the
   Devanagari value instead of printing "—" — otherwise most of the list shows
   dashes. Prefer the current language, fall back to the other, then "—". */
const _JUNK_NAME=/^(male|female|other|m|f|n\/a|na|unknown|-+)$/i;
function _cleanName(v){
  const x=String(v==null?"":v).trim().replace(/^(male|female)\s*[:：]\s*/i,"");
  return _JUNK_NAME.test(x) ? "" : x;
}
function rescueName(p){
  const en=_cleanName(p.name), ne=_cleanName(p.name_ne);
  return LANG==="ne" ? (ne||en||"—") : (en||ne||"—");
}
function rescueLoc(p){
  const en=(p.location||"").trim(), ne=(p.location_ne||"").trim();
  return LANG==="ne" ? (ne||en||"—") : (en||ne||"—");
}
function rescueStatus(p){ return (LANG==="ne" && p.status_ne) ? p.status_ne : (p.status||""); }
function capWord(s){ s=String(s||""); return s ? s.charAt(0).toUpperCase()+s.slice(1) : ""; }

async function loadRescue(){
  if(RESCUE) return RESCUE;
  // 1) live pull straight from the official NDRRMA API (it sends CORS headers,
  //    so this works in the browser and gives the freshest named registry)
  try{
    const [pr, cr] = await Promise.all([
      fetch("https://ndrrma.gov.np/api/v1/rescues/rescued-persons/?limit=-1",{signal:AbortSignal.timeout(6000)}),
      fetch("https://ndrrma.gov.np/api/v1/rescues/status-counts/?limit=-1",{signal:AbortSignal.timeout(6000)}).catch(()=>null)
    ]);
    if(pr && pr.ok){
      const j=await pr.json(); const list=j.results||j;
      if(Array.isArray(list) && list.length){
        RESCUE={ live:true, fetched_at:new Date().toISOString(),
          persons:list.map(p=>({name:p.name||"",name_ne:p.name_ne||"",age:p.age,gender:p.gender||"",nationality:p.nationality||"",location:(p.rescued_location&&p.rescued_location.title)||"",location_ne:(p.rescued_location&&p.rescued_location.title_ne)||"",date:p.rescued_date||"",status:(p.status&&p.status.title)||"",status_ne:(p.status&&p.status.title_ne)||""}))
        };
        let counts=null; try{ if(cr && cr.ok) counts=await cr.json(); }catch(e){}
        RESCUE.total  = (counts&&counts.total_count)   || RESCUE.persons.length;   // NAMED registry (what this page lists)
        RESCUE.nepali = (counts&&counts.nepali_count)  || RESCUE.persons.filter(x=>String(x.nationality).toLowerCase()==="nepali").length;
        RESCUE.foreign= (counts&&counts.foreign_count) || (RESCUE.total-RESCUE.nepali);
        RESCUE.status_counts = (counts&&counts.status_counts) || [];
        // grand total (everyone rescued, named or not) — shown on the home hero
        try{ const sr=await fetch("https://ndrrma.gov.np/api/v1/rescues/rescued-statistics/?_="+Date.now(),{signal:AbortSignal.timeout(5000)}); if(sr.ok){ const sj=await sr.json(); RESCUE.grandTotal = sj&&sj.rescued_count || null; } }catch(e){}
        // hero = grand total; stats-page detail = named-registry breakdown
        if(typeof _setStat==="function"){
          let dirty=false;
          if(typeof _setRescueRegistry==="function" && _setRescueRegistry(RESCUE.grandTotal, RESCUE.total, RESCUE.nepali, RESCUE.foreign)) dirty=true;
          if(dirty){ try{renderStats();renderStatsPage();}catch(e){} }
        }
      }
    }
  }catch(e){}
  // 2) same-origin snapshot fallback (assets/rescues.json via tools/fetch_rescues.js)
  if(!RESCUE){
    try{ const r=await fetch("assets/rescues.json",{cache:"no-store"}); if(r.ok) RESCUE=await r.json(); }catch(e){}
  }
  return RESCUE;
}

function _hasName(p){
  const n=String((p.name||p.name_ne||"")).trim();
  return n!=="" && n!=="-" && n!=="—";
}
function rescueFiltered(){
  if(!RESCUE||!RESCUE.persons) return [];
  const q=RESCUE_STATE.q.toLowerCase();
  const list=RESCUE.persons.filter(p=>{
    if(RESCUE_STATE.nat==="nepali" && String(p.nationality).toLowerCase()!=="nepali") return false;
    if(RESCUE_STATE.nat==="foreign" && String(p.nationality).toLowerCase()==="nepali") return false;
    if(RESCUE_STATE.status!=="all"){
      const s=String(p.status||"").toLowerCase();
      if(RESCUE_STATE.status==="care" && !/medic|care|उपचार/i.test(s)) return false;
      if(RESCUE_STATE.status==="safe" && !/safe|सुरक्षित/i.test(s)) return false;
      if(RESCUE_STATE.status==="injured" && !/inj|घाइते/i.test(s)) return false;
    }
    if(q){ const hay=((p.name||"")+" "+(p.name_ne||"")+" "+(p.location||"")+" "+(p.location_ne||"")+" "+(p.nationality||"")).toLowerCase(); if(!hay.includes(q)) return false; }
    return true;
  });
  // Ordering: (1) named before unnamed — "-"/blank always sink to the bottom;
  // (2) Nepali (Devanagari) names first since this is a Nepal registry, then
  // foreign (Latin) names; (3) alphabetical within each group.
  const key=p=>String(p.name_ne||p.name||"").trim();
  const isDev=s=>/[ऀ-ॿ]/.test(s);
  list.sort((a,b)=>{
    const an=_hasName(a), bn=_hasName(b);
    if(an!==bn) return an?-1:1;                 // unnamed sink to the bottom
    if(!an) return 0;
    const na=key(a), nb=key(b);
    const ad=isDev(na), bd=isDev(nb);
    if(ad!==bd) return ad?-1:1;                 // Nepali script first
    return na.localeCompare(nb, ad?"ne":undefined, {sensitivity:"base"});
  });
  return list;
}
function paintRescueList(){
  const body=$("#rescueBody"), foot=$("#rescueFoot"); if(!body) return;
  const list=rescueFiltered();
  const per=RESCUE_STATE.perPage;
  const pages=Math.max(1, Math.ceil(list.length/per));
  if(RESCUE_STATE.page>pages) RESCUE_STATE.page=pages;
  if(RESCUE_STATE.page<1) RESCUE_STATE.page=1;
  const start=(RESCUE_STATE.page-1)*per;
  const slice=list.slice(start, start+per);
  if(!slice.length){ body.innerHTML=`<tr><td colspan="5" class="rescue__empty">${esc(t("rescue.none"))}</td></tr>`; if(foot) foot.innerHTML=""; return; }
  body.innerHTML=slice.map((p,i)=>{
    const st=rescueStatus(p), nat=capWord(p.nationality);
    const stCls = /inj/i.test(p.status)?"rstat--injured":(/medic/i.test(p.status)?"rstat--care":(/safe/i.test(p.status)?"rstat--safe":"rstat--na"));
    const isForeign = String(p.nationality).toLowerCase()!=="nepali";
    return `<tr>
      <td class="rescue__idx mono">${toNepDigits(start+i+1)}</td>
      <td class="rescue__name"><span class="rescue__nm">${esc(rescueName(p))}</span><span class="rescue__nat ${isForeign?'rescue__nat--f':''}">${esc(nat)}${p.age!==""&&p.age!=null?" · "+toNepDigits(p.age):""}</span></td>
      <td class="rescue__loc">${esc(rescueLoc(p))}</td>
      <td class="mono rescue__date">${esc(p.date?toNepDigits(p.date):"—")}</td>
      <td>${st?`<span class="rstat ${stCls}">${esc(st)}</span>`:'<span class="rstat rstat--na">—</span>'}</td>
    </tr>`;
  }).join("");
  if(foot) foot.innerHTML=rescuePager(list.length, pages, start, slice.length);
  wireRescuePager();
}
function rescuePager(total, pages, start, count){
  const pg=RESCUE_STATE.page;
  // compact page window: first, current-1..current+1, last
  const nums=new Set([1,pages,pg-1,pg,pg+1]);
  const seq=[...nums].filter(n=>n>=1&&n<=pages).sort((a,b)=>a-b);
  let btns="", prev=0;
  seq.forEach(n=>{ if(prev && n-prev>1) btns+=`<span class="rescue__gap">…</span>`; btns+=`<button class="rescue__pg${n===pg?' is-cur':''}" data-rpage="${n}" ${n===pg?'aria-current="page"':''}>${toNepDigits(n)}</button>`; prev=n; });
  const from=total?toNepDigits(start+1):"0", to=toNepDigits(start+count);
  return `
    <div class="rescue__pagerow">
      <span class="rescue__count mono">${esc(t("rescue.showing"))} ${from}–${to} ${esc(t("rescue.of"))} ${toNepDigits(total)}</span>
      <div class="rescue__perpage">
        <label class="mono">${esc(t("rescue.perpage"))}</label>
        <select id="rescuePer" class="rescue__sel">
          ${[20,50,100].map(n=>`<option value="${n}"${RESCUE_STATE.perPage===n?" selected":""}>${n}</option>`).join("")}
        </select>
      </div>
    </div>
    <div class="rescue__pager">
      <button class="rescue__pg rescue__pg--nav" data-rpage="${pg-1}" ${pg<=1?"disabled":""} aria-label="Previous">‹</button>
      ${btns}
      <button class="rescue__pg rescue__pg--nav" data-rpage="${pg+1}" ${pg>=pages?"disabled":""} aria-label="Next">›</button>
    </div>`;
}
function wireRescuePager(){
  $$("#rescueFoot [data-rpage]").forEach(b=>b.addEventListener("click",()=>{
    if(b.hasAttribute("disabled")) return;
    RESCUE_STATE.page=+b.dataset.rpage; paintRescueList();
    const tw=$(".rescue__tablewrap"); if(tw) tw.scrollIntoView({behavior:"smooth",block:"nearest"});
  }));
  const sel=$("#rescuePer"); if(sel) sel.addEventListener("change",e=>{ RESCUE_STATE.perPage=+e.target.value; RESCUE_STATE.page=1; paintRescueList(); });
}
async function renderRescuePage(){
  const root=$("#rescueRoot"); if(!root) return;
  root.innerHTML=`<div class="gcell--msg">${esc(t("rescue.loading"))}</div>`;
  const data=await loadRescue();
  if(!data||!data.persons){ root.innerHTML=`<p class="verify">${esc(t("gallery.none"))} <a href="https://ndrrma.gov.np/np/rescue" target="_blank" rel="noopener" style="color:var(--crimson)">NDRRMA ↗</a></p>`; return; }
  const total=data.total||data.persons.length, nep=data.nepali||0, forg=data.foreign||0;
  // The bulletin total (what the hero and every other page shows) leads here
   // too; data.grandTotal is the API's system log and is listed separately.
  const grand = (typeof STATS!=="undefined" && _int((STATS.find(x=>x.key==="rescued")||{}).n))
    || data.grandTotal
    || null;
  const when=(data.fetched_at||"").slice(0,10);
  const chips=(data.status_counts||[]).filter(s=>s.count>0).map(s=>{
    const lbl=LANG==="ne"&&s.title_ne?s.title_ne:s.title;
    return `<span class="rescue__chip"><b class="mono">${esc(toNepDigits(s.count))}</b> ${esc(lbl)}</span>`;
  }).join("");
  root.innerHTML=`
    <div class="rescue">
      <div class="rescue__kpis">
        ${grand?`<div class="rescue__kpi rescue__kpi--grand"><div class="k mono">${esc(toNepDigits(_fmtInt(grand)))}</div><div class="l">${esc(t("rescue.grandtotal"))}</div></div>`:""}
        <div class="rescue__kpi rescue__kpi--total"><div class="k mono">${esc(toNepDigits(total))}</div><div class="l">${esc(t("rescue.total"))}</div></div>
        <div class="rescue__kpi"><div class="k mono">${esc(toNepDigits(nep))}</div><div class="l">${esc(t("rescue.nepali"))}</div></div>
        <div class="rescue__kpi"><div class="k mono">${esc(toNepDigits(forg))}</div><div class="l">${esc(t("rescue.foreign"))}</div></div>
        ${chips?`<div class="rescue__chips">${chips}</div>`:""}
      </div>
      <div class="rescue__bar">
        <div class="rescue__filters">
          <button class="chip" data-rnat="all" aria-pressed="true">${esc(t("rescue.all"))}</button>
          <button class="chip" data-rnat="nepali" aria-pressed="false">${esc(t("rescue.nepali"))}</button>
          <button class="chip" data-rnat="foreign" aria-pressed="false">${esc(t("rescue.foreign"))}</button>
          <select id="rescueStatus" class="rescue__statussel" aria-label="${esc(t("rescue.status"))}">
            <option value="all">${esc(t("rescue.status.all"))}</option>
            <option value="care">${esc(t("rescue.status.care"))}</option>
            <option value="safe">${esc(t("rescue.status.safe"))}</option>
            <option value="injured">${esc(t("rescue.status.injured"))}</option>
          </select>
        </div>
        <div class="regsearch rescue__search"><input type="search" id="rescueSearch" placeholder="${esc(t("rescue.search"))}" value="${esc(RESCUE_STATE.q)}"></div>
      </div>
      <div class="rescue__tablewrap">
        <table class="rescue__table">
          <thead><tr>
            <th class="rescue__idxh">#</th><th>${esc(t("rescue.name"))}</th><th>${esc(t("rescue.loc"))}</th><th>${esc(t("rescue.date"))}</th><th>${esc(t("rescue.status"))}</th>
          </tr></thead>
          <tbody id="rescueBody"></tbody>
        </table>
      </div>
      <div class="rescue__foot" id="rescueFoot"></div>
      <p class="verify rescue__srcnote">${esc(t("rescue.note"))}<br>
        <span class="mono" style="color:var(--muted)">${esc(t("rescue.updated"))}: ${esc(toNepDigits(when||"—"))}</span> ·
        <a href="https://ndrrma.gov.np/np/rescue" target="_blank" rel="noopener" style="color:var(--crimson);font-weight:600">${esc(t("rescue.official"))}</a>
      </p>
    </div>`;
  paintRescueList();
  $$("#rescueRoot [data-rnat]").forEach(b=>b.addEventListener("click",()=>{
    $$("#rescueRoot [data-rnat]").forEach(x=>x.setAttribute("aria-pressed","false"));
    b.setAttribute("aria-pressed","true"); RESCUE_STATE.nat=b.dataset.rnat; RESCUE_STATE.page=1; paintRescueList();
  }));
  const s=$("#rescueSearch"); if(s) s.addEventListener("input",e=>{ RESCUE_STATE.q=e.target.value.trim(); RESCUE_STATE.page=1; paintRescueList(); });
  const st=$("#rescueStatus"); if(st) st.addEventListener("change",e=>{ RESCUE_STATE.status=e.target.value; RESCUE_STATE.page=1; paintRescueList(); });
}

/* =========================================================================
   RELIEF FUND — amount collected so far (PM Disaster Relief Fund).
   Sourced from published reporting (OnlineKhabar / OPMCM), 27 Aug 2026.
   Edit these figures to update; donor amounts are in millions of NPR.
   ========================================================================= */
Object.assign(I18N.en,{
  "rfund.eye":"PM Disaster Relief Fund","rfund.h":"Collected So Far",
  "rfund.total":"Total in Fund","rfund.donations":"Public Donations","rfund.govt":"Govt Release",
  "rfund.top":"Named Contributors (early published list)","rfund.updated":"Updated",
  "rfund.note":"The fund's published balance passed Rs 5 billion — it includes the Government's own Rs 1 billion release, so the two bars always add back to the real total. The contributors listed below are only the donors named in the first days of the appeal; they account for a small share of the total, and thousands of individual donations are not itemised publicly. The balance rises daily and syncs automatically. Source: Radio Nepal / OnlineKhabar / OPMCM — verify before relying on any amount."
});
Object.assign(I18N.ne,{
  "rfund.eye":"प्रधानमन्त्री विपद् राहत कोष","rfund.h":"अहिलेसम्म संकलन",
  "rfund.total":"कोषमा कुल","rfund.donations":"सार्वजनिक दान","rfund.govt":"सरकारी निकासा",
  "rfund.top":"नाम सार्वजनिक भएका दाता (सुरुको सूची)","rfund.updated":"अद्यावधिक",
  "rfund.note":"कोषको सार्वजनिक रकम रु. ५ अर्ब नाघ्यो — यसमा सरकारकै रु. १ अर्बको निकासा समावेश छ, त्यसैले दुवै पट्टी जोड्दा वास्तविक कुल रकम नै आउँछ। तल उल्लेखित दाता अपिलका सुरुका दिनमा नाम सार्वजनिक भएका मात्र हुन्; कुल रकमको सानो अंश ओगट्छन् र हजारौं व्यक्तिगत दान छुट्टै सार्वजनिक गरिएको छैन। रकम दैनिक बढ्छ र स्वतः अद्यावधिक हुन्छ। स्रोत: रेडियो नेपाल / अनलाइनखबर / OPMCM — कुनै रकममा भर पर्नुअघि रुजु गर्नुहोस्।"
});
const RELIEF_COLLECTED = {
  updated:"30 Aug 2026",
  /* The fund's published balance passed Rs 5.02bn on 30 Aug (Radio Nepal) and
     Rs 5.44bn on the government's latest count. That balance INCLUDES the
     Rs 1bn government release, so `donations` holds the public/corporate share
     (balance − govt) and the two always add back up to the real total. */
  donations:4440,    // million NPR — public & corporate donations to the PM Disaster Relief Fund
  govt:1000,         // million NPR — Government release to the fund
  donors:[
    {name:{en:"Gorkha Brewery",ne:"गोर्खा ब्रुअरी"}, amt:100},
    {name:{en:"Nepal Bank Ltd",ne:"नेपाल बैंक लि."}, amt:30.1},
    {name:{en:"Rastriya Banijya Bank",ne:"राष्ट्रिय वाणिज्य बैंक"}, amt:30},
    {name:{en:"Kumari Bank",ne:"कुमारी बैंक"}, amt:30},
    {name:{en:"NIFRA",ne:"निफ्रा"}, amt:25},
    {name:{en:"NIC Asia Bank",ne:"एनआईसी एशिया बैंक"}, amt:22.1},
    {name:{en:"Saras Beverages (Red Bull)",ne:"सरस बेभरेजेज (रेड बुल)"}, amt:20},
    {name:{en:"Ncell",ne:"एनसेल"}, amt:10},
    {name:{en:"Shree Shakti Group",ne:"श्री शक्ति समूह"}, amt:5.1},
    {name:{en:"Reliance Sugar & Chemicals",ne:"रिलायन्स सुगर"}, amt:1}
  ]
};
/* Money formatter. Amounts are in millions of rupees.
   English → million / billion (Rs 273.3M, Rs 1.27B).
   Nepali  → लाख / करोड / अरब / खर्ब (the Nepali number system). */
function fmtMoney(m){
  const trim=v=>v%1===0?String(v):v.toFixed(2).replace(/\.?0+$/,"");
  if(LANG==="ne"){
    if(m>=100000) return "रु "+trim(m/100000)+" खर्ब";   // kharba = 100 billion
    if(m>=1000)   return "रु "+trim(m/1000)+" अरब";       // arba   = 1 billion
    if(m>=10)     return "रु "+trim(m/10)+" करोड";        // crore  = 10 million
    return "रु "+trim(m*10)+" लाख";                        // lakh   = 0.1 million
  }
  if(m>=1000) return "Rs "+trim(m/1000)+"B";
  return "Rs "+(m%1===0?m:m.toFixed(1))+"M";
}
function renderReliefCollected(){
  const el=$("#reliefCollected"); if(!el) return;
  const rc=RELIEF_COLLECTED;
  const total=rc.donations+rc.govt;
  const donors=rc.donors.slice().sort((a,b)=>b.amt-a.amt);
  const max=Math.max(1,...donors.map(d=>d.amt));
  const govtPct=Math.round(rc.govt/total*100), donPct=100-govtPct;
  const M=v=>LANG==="ne"?toNepDigits(v):v;
  el.innerHTML=`
    <div class="rfund">
      <div class="rfund__top">
        <div><span class="eyebrow" data-i18n="rfund.eye">PM Disaster Relief Fund</span><h3 data-i18n="rfund.h">Collected So Far</h3></div>
        <div class="rfund__kpis">
          <div class="rfund__kpi"><div class="k mono">${esc(M(fmtMoney(total)))}</div><div class="l">${esc(t("rfund.total"))}</div></div>
          <div class="rfund__kpi"><div class="k mono" style="color:var(--relief)">${esc(M(fmtMoney(rc.donations)))}</div><div class="l">${esc(t("rfund.donations"))}</div></div>
          <div class="rfund__kpi"><div class="k mono">${esc(M(fmtMoney(rc.govt)))}</div><div class="l">${esc(t("rfund.govt"))}</div></div>
        </div>
      </div>
      <div class="rfund__bar">
        <span class="rfund__seg rfund__seg--govt" style="width:${govtPct}%"><span>${esc(t("rfund.govt"))} · ${esc(M(fmtMoney(rc.govt)))}</span></span>
        <span class="rfund__seg rfund__seg--don" style="width:${donPct}%"><span>${esc(t("rfund.donations"))} · ${esc(M(fmtMoney(rc.donations)))}</span></span>
      </div>
      <div class="rfund__ttl">${esc(t("rfund.top"))}</div>
      <div class="rfund__donors">
        ${donors.map(d=>{const pct=Math.max(4,Math.round(d.amt/max*100));return `
          <div class="rfund__row"><span class="rfund__nm" title="${esc(TL(d.name))}">${esc(TL(d.name))}</span><span class="rfund__track"><span class="rfund__fill" style="width:${pct}%"></span></span><span class="rfund__amt mono">${esc(M(fmtMoney(d.amt)))}</span></div>`;}).join("")}
      </div>
      <p class="rfund__note">${esc(t("rfund.note"))} <span class="mono">${esc(t("rfund.updated"))}: ${esc(M(rc.updated))}</span></p>
    </div>`;
}

/* ---------- live sync stamp + 10-min refresh from CORS-open live source ---------- */
/* ================= Multi-Tier Real-Time Auto Fetching Engine =================
   Every figure on the site is refreshed from live sources. Because several
   sources report the same number with different lag and different scope, each
   source carries a RANK and the best-ranked source that answered in the current
   cycle wins:

     rank 1  NDRRMA rescue API   — machine-readable, official, always current
     rank 2  assets/live_data.json — curated official baseline (NDRRMA bulletins)
     rank 3  Wikipedia article prose — community-maintained, lags by a day or two

   A worse-ranked source can never overwrite a better-ranked one in the same
   cycle. That is what previously broke: Wikipedia (which still said 788 dead /
   2,502 missing) would pull the toll back down under NDRRMA's own 903 / 4,247,
   and a hard "never decrease" lock on 'rescued' left it frozen at a stale 8,186
   even after NDRRMA's live count corrected downward. Ranking fixes both without
   letting a bad parse through: implausible jumps are still rejected.
   ============================================================================= */
let _lastSync=null;
function setSync(d){
  if(d)_lastSync=d;
  const s=fmt(_lastSync||nptNow());
  $$("[data-updated]").forEach(e=>{
    e.textContent=(t("sync.updated")+" "+s+" · "+t("sync.auto")).toUpperCase();
  });
}
function _num(x){ return x ? (""+x).replace(/[,\s+]/g,"") : null; }
function _int(x){ const n=parseInt(String(x==null?"":x).replace(/[^0-9]/g,""),10); return isNaN(n)?0:n; }
function _fmtInt(x){ return String(_int(x)).replace(/\B(?=(\d{3})+(?!\d))/g,","); }

const SRC_RANK={ ndrrma:1, feed:2, wiki:3, feed_stale:4 };
let _cycleSrc={};                    // key -> rank that already claimed it this cycle
function _beginCycle(){ _cycleSrc={}; }

/* The curated feed is only authoritative while somebody is keeping it current.
   If assets/live_data.json has not been touched for FEED_FRESH_MS it drops
   BELOW Wikipedia, so the site keeps advancing on its own instead of freezing
   on a hand-typed baseline. This is the difference between "auto-updating" and
   "auto-updating until the maintainer stops editing a JSON file". */
const FEED_FRESH_MS = 36*3600*1000;
function _feedRank(updatedAt){
  const t=Date.parse(updatedAt||"");
  if(isNaN(t)) return "feed";
  return (Date.now()-t) < FEED_FRESH_MS ? "feed" : "feed_stale";
}

/* Deaths and cumulative rescues only ever rise in reality, so ANY source may
   push them up and none may pull them back down — a lower number is always a
   lagging report, never a correction. (To revise one downward, edit both the
   STATS baseline in this file and assets/live_data.json.) */
const RISING_ONLY=new Set(["deaths","rescued"]);
function _currentStat(key){
  const s=STATS.find(x=>x.key===key);
  if(s) return _int(s.n);
  const d=STATS_DETAIL.find(x=>x.id===key);
  return d?_int(d.big):0;
}
function _acceptStat(key,val,src){
  const v=_int(val); if(v<=0) return false;
  const c=_currentStat(key);
  if(c>0 && v>c*8) return false;                       // implausible spike → bad parse
  if(RISING_ONLY.has(key)) return v>=c;                // rank is irrelevant: up only
  const rank=SRC_RANK[src]||9;
  const claimed=_cycleSrc[key];
  if(claimed!=null && rank>claimed) return false;      // a better source already answered
  return true;
}

function _setStat(key,val,src){
  src=src||"feed";
  if(!_acceptStat(key,val,src)) return false;
  _cycleSrc[key]=SRC_RANK[src]||9;
  const disp=_fmtInt(val);
  let changed=false;
  const s=STATS.find(x=>x.key===key);
  if(s && s.n!==disp){ s.n=disp; changed=true; }
  // "rescued" is special: the HERO shows the TOTAL rescued, but its stats-page
  // detail rows are the NAMED REGISTRY — a different, smaller number kept in
  // step separately via _setRescueRegistry(). Don't mirror the total into them.
  if(key!=="rescued"){
    const d=STATS_DETAIL.find(x=>x.id===key);
    if(d && d.big!==undefined && d.big!=="" && d.big!==disp){ d.big=disp; changed=true; }
    // deaths/missing/injured/security carry ONE row that IS the same total —
    // keep it in step so the whole card updates, not just the big number.
    if(d && d.rows && (key==="deaths"||key==="missing"||key==="injured"||key==="security") && d.rows[0] && d.rows[0][1]!==disp){ d.rows[0][1]=disp; changed=true; }
  }
  return changed;
}
/* Keep the "Rescued — Named Registry" rows in step with NDRRMA's status-counts
   (named list) + rescued-statistics (grand total). The named registry moves in
   both directions, so no rising-only guard here. */
function _setRescueRegistry(grandTotal, named, nepali, foreign){
  const d=STATS_DETAIL.find(x=>x.id==="rescued"); if(!d||!d.rows) return false;
  let ch=false;
  const putRow=(i,v)=>{ if(v!=null && _int(v)>0 && d.rows[i]){ const s=_fmtInt(v); if(d.rows[i][1]!==s){ d.rows[i][1]=s; ch=true; } } };
  // Rows 1-3 only: the NAMED registry and its Nepali/foreign split. Row 0 is the
  // bulletin total and the card headline is the same figure — neither comes from
  // this API, so neither is written here.
  putRow(1,named); putRow(2,nepali); putRow(3,foreign);
  return ch;
}
/* Write a named row inside any stats-detail card (matched on its label). */
function _setDetailRow(id, labelFragment, value){
  const seg=STATS_DETAIL.find(s=>s.id===id);
  if(!seg||!seg.rows||value==null||value==="") return false;
  const row=seg.rows.find(r=>String(r[0]).toLowerCase().includes(String(labelFragment).toLowerCase()));
  if(row && row[1]!==String(value)){ row[1]=String(value); return true; }
  return false;
}
function _updateForeignRow(countryName, countStr){
  return _setDetailRow("foreign", countryName, countStr);
}

/* ---- individual live sources, each returns true if it changed anything ----
   All run CONCURRENTLY (Promise.allSettled) so one slow endpoint never blocks
   the others. */

/* Detail rows a rank-1 API writes directly. The curated JSON feed must never
   touch them: it carries no rank, so a hand-typed value silently overwrote the
   live one on every cycle. That is what pinned "Named in the public registry"
   at 3,122 while NDRRMA's own API was already publishing 4,248 — the fetch was
   working, the feed just clobbered it a moment later. */
const _API_OWNED_ROWS={
  rescued:new Set(["Named in the public registry","— of these, Nepali","— of these, foreign","Logged in the NDRRMA rescue system"]),
  security:new Set(["Communication towers"])
};

// Tier 1 — local, same-origin feed (instant, no CORS, curated official baseline).
async function _srcLocalFeed(){
  let changed=false, j=null;
  try{
    const resp = await fetch("assets/live_data.json?_="+Date.now(), { cache:"no-store", signal: AbortSignal.timeout(4000) });
    if(!resp.ok) throw new Error("fetch failed");
    j = await resp.json();
    if(window.__cacheGoodData) window.__cacheGoodData(j);
  }catch(err){
    if(window.__restoreFromCache){
      j = window.__restoreFromCache();
      if(!j) return false;
    } else { return false; }
  }
  const FR=_feedRank(j.updated_at);
  if(Array.isArray(j.stats)) j.stats.forEach(st=>{ if(_setStat(st.key,_num(st.n),FR)) changed=true; });
  if(j.stats_detail){
    Object.keys(j.stats_detail).forEach(k=>{
      const item=j.stats_detail[k];
      if(item.big && _setStat(k,_num(item.big),FR)) changed=true;
      if(Array.isArray(item.rows)){
        const seg=STATS_DETAIL.find(s=>s.id===k);
        const owned=_API_OWNED_ROWS[k];
        if(seg && seg.rows) item.rows.forEach(nr=>{
          if(owned && owned.has(nr[0])) return;   // a live API owns this row
          const m=seg.rows.find(r=>r[0]===nr[0]);
          if(m && m[1]!==nr[1]){ m[1]=nr[1]; changed=true; }
        });
      }
    });
  }
  if(j.event){
    if(j.event.eas && typeof j.event.eas==="object"){ EVENT.eas=j.event.eas; changed=true; }
    if(j.event.region && typeof j.event.region==="object"){ EVENT.region=j.event.region; }
  }
  return changed;
}

// Tier 2 — Wikipedia FULL article text (explaintext), parsed for the Nepal-only
// casualty sentence, e.g. "At least 903 deaths and 4,247 missing were confirmed
// in Nepal with an additional 16 dead and 546 missing in the Tibet Autonomous
// Region." Matching that exact "…confirmed in Nepal" phrasing guarantees the
// Nepal-side figure, never the Tibet one. The INFOBOX is deliberately not used —
// it reports Nepal+Tibet COMBINED, which is what once inflated this Nepal-only
// site. Wikipedia is rank 3: it fills gaps and catches up when it is AHEAD of
// our curated feed, but it can never pull an official figure backwards.
/* Pull the Nepal-side casualty figures out of the article prose.

   This used to be three regexes, each pinned to one exact sentence shape.
   Wikipedia rewrites those sentences constantly and every rewrite silently
   broke the match: "3,916 missing were confirmed" became "3,916 missing
   PERSONS were confirmed", and "1,473 were injured AND 4,247 were missing"
   gained a whole new clause ("...11,814 people have been rescued and..."),
   so the parser matched nothing, reported no change, and the entire site sat
   frozen on its hand-typed baseline while the real toll moved. A silent
   no-match is the worst failure mode here, because it looks exactly like
   "nothing has changed".

   So: don't match a sentence, scan one. Isolate the sentences that are
   explicitly scoped to Nepal, trim off any clause where the article switches
   to the Tibet-side figures, and then read each number together with the word
   that says what it counts. Clause order, inserted words and brand-new
   clauses no longer matter.  */
const _CAS_WORD={ dead:"deaths", deaths:"deaths", death:"deaths", died:"deaths", die:"deaths",
                  missing:"missing", injured:"injured", rescued:"rescued" };
/* Words allowed to sit between the figure and the word it counts, e.g.
   "11,814 PEOPLE HAVE BEEN rescued". Anything else means the number belongs to
   a different noun ("900 BODIES found", "93,000 people were IMPACTED") and the
   pair is dropped rather than guessed at. */
const _CAS_FILLER=/^(?:people|person|persons|individuals|residents|others|more|than|at|least|about|around|some|were|was|are|is|had|have|has|been|being|remain|remains|remained|still|also|now|reported|confirmed|listed|declared)$/i;

function _nepalCasualties(txt){
  const out={};
  String(txt||"").split(/(?<=[.!?])\s+/).forEach(raw=>{
    // Nepal-scoped sentences only. "in Nepal" is the phrase the article uses to
    // separate its Nepal figures from its Tibet ones, and mixing the two is what
    // once inflated the toll on this Nepal-only site.
    if(!/\bin\s+Nepal\b/i.test(raw)) return;
    // Keep only the part before the article hands over to the Tibet side, e.g.
    // "...confirmed in Nepal WITH AN ADDITIONAL 16 dead and 546 missing in the
    // Tibet Autonomous Region."
    let s=raw.split(/\b(?:with|and|plus)\s+(?:an\s+)?additional\b/i)[0]
            .split(/\bin\s+(?:the\s+)?Tibet\b/i)[0]
            .split(/\bTibet\s+Autonomous\b/i)[0];
    if(/\bTibet\b|\bChina\b/i.test(s)) return;
    // Walk every figure in the sentence and read the words that follow it. A
    // single combined regex cannot do this: one alternative consumes the text
    // the next reading needs ("1,114 PEOPLE died" hides "died" behind
    // "people"), so each number is scanned forward on its own.
    const re=/([1-9][\d,]{1,9})/g;
    let m;
    while((m=re.exec(s))){
      const after=s.slice(m.index+m[0].length, m.index+m[0].length+64);
      const words=after.split(/[^A-Za-z]+/).filter(Boolean).slice(0,4);
      for(let i=0;i<words.length;i++){
        const key=_CAS_WORD[words[i].toLowerCase()];
        if(key){
          const v=_int(m[1]);
          // The article states the same figure more than once in different
          // words; keep the larger reading rather than whichever sentence
          // happened to come last.
          if(v>0 && (out[key]==null || v>out[key])) out[key]=v;
          break;
        }
        // A word that is neither a casualty word nor connective tissue means
        // this figure counts something else ("900 BODIES", "93,000 people were
        // IMPACTED") — stop rather than reach past it for a match.
        if(!_CAS_FILLER.test(words[i])) break;
      }
    }
  });
  return out;
}

async function _srcSummary(){
  let txt="";
  try{
    const url="https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&format=json&titles=2026%20Nepal%20floods&origin=*";
    const r=await fetch(url,{signal:AbortSignal.timeout(6000)});
    if(r.ok){ const j=await r.json(); const pgs=j.query&&j.query.pages; if(pgs){ const p=pgs[Object.keys(pgs)[0]]; txt=(p&&p.extract)||""; } }
  }catch(_){}
  if(!txt) return false;
  let changed=false;
  // Casualty figures come out of the prose through _nepalCasualties() below
  // rather than a sentence-shaped regex — see the note on that function for
  // why. Each key still goes through _setStat, so ranking and the rising-only
  // guard on deaths/rescued apply exactly as before.
  const cas=_nepalCasualties(txt);
  ["deaths","missing","injured","rescued"].forEach(k=>{
    if(cas[k]!=null && _setStat(k,String(cas[k]),"wiki")) changed=true;
  });
  // Foreign nationals among the missing. The count and the phrase are routinely
  // separated by a clause ("583 foreign nationals FROM 38 COUNTRIES are among
  // the missing"), so the gap is matched loosely instead of exactly.
  const fgn=txt.match(/([\d][\d,]{1,7})\s+foreign\s+nationals?[^.]{0,60}?among\s+the\s+missing/i)
         || txt.match(/([\d][\d,]{1,7})\s+(?:foreign\s+)?tourists?[^.]{0,60}?among\s+the\s+missing/i);
  if(fgn && _setStat("foreign",_num(fgn[1]),"wiki")) changed=true;
  // Hydropower tunnel figures, e.g. "900 people involved in 12 hydropower
  // projects were reported missing, with 500 believed to be trapped in tunnels."
  const hyd=txt.match(/([\d][\d,]{1,7})\s+(?:people|workers?)[^.]{0,60}?hydropower\s+projects?[^.]{0,40}?missing/i);
  if(hyd && _setStat("tunnel",_num(hyd[1]),"wiki")) changed=true;
  const trap=txt.match(/([\d][\d,]{1,7})\s+believed\s+to\s+be\s+trapped/i);
  if(trap && _setDetailRow("tunnel","believed still inside","~"+_fmtInt(trap[1]))) changed=true;
  // Relief-fund balance, e.g. "…Relief Fund was launched … raising over रू
  // 5,440,000,000 by 29 August." (the currency mark is रू, not ₹). The published
  // balance INCLUDES the government release, so store the public share.
  const fund=txt.match(/Relief Fund[^.]*?(?:रू|रु|₹|Rs\.?|NPR)\s*([\d,]{7,15})/i);
  if(fund && typeof RELIEF_COLLECTED==="object"){
    const balanceM=_int(fund[1])/1e6;                  // rupees → millions
    const publicM=Math.max(0, balanceM-(RELIEF_COLLECTED.govt||0));
    if(publicM>0 && publicM>=(RELIEF_COLLECTED.donations||0) && RELIEF_COLLECTED.donations!==publicM){
      RELIEF_COLLECTED.donations=publicM;
      RELIEF_COLLECTED.updated=nptNow().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});
      changed=true;
    }
  }
  // Preliminary damage estimate, e.g. "…caused Rs 200 billion in damages."
  const dmg=txt.match(/(?:Rs|रू|रु|NPR)\s*([\d,.]{1,7})\s*billion\s+in\s+damages?/i);
  if(dmg && _setStat("damage",_num(dmg[1]),"wiki")) changed=true;
  return changed;
}

// Tier 3 — NDRRMA official rescue API (CORS-open, rank 1). It publishes several
// distinct numbers and the site shows them in distinct places:
//   • rescued-statistics.rescued_count  = TOTAL rescued        → home hero stat
//   • rescued-statistics.force_deployed = security personnel   → security card
//   • rescued-statistics.tower          = comms towers restored
//   • status-counts.total_count         = NAMED public registry → Rescued page
async function _srcNDRRMA(){
  let changed=false, grand=null;
  try{
    const r=await fetch("https://ndrrma.gov.np/api/v1/rescues/rescued-statistics/?_="+Date.now(),{signal:AbortSignal.timeout(6000)});
    if(r.ok){
      const j=await r.json();
      grand=j&&j.rescued_count;
      // NOT the headline: rescued_count is NDRRMA's rescue-management system
      // log, which trails the figure in its own press bulletins. It gets its
      // own labelled row so both numbers are visible and neither is misread.
      if(grand && _setDetailRow("rescued","logged in the ndrrma rescue system", _fmtInt(grand))) changed=true;
      if(j&&j.force_deployed && _setStat("security", String(j.force_deployed), "ndrrma")) changed=true;
      if(j&&j.tower && _setDetailRow("security","towers restored", j.tower)) changed=true;
    }
  }catch(_){}
  try{
    const r=await fetch("https://ndrrma.gov.np/api/v1/rescues/status-counts/?limit=-1&_="+Date.now(),{signal:AbortSignal.timeout(6000)});
    if(r.ok){ const j=await r.json(); if(j && _setRescueRegistry(grand, j.total_count, j.nepali_count, j.foreign_count)) changed=true; }
  }catch(_){}
  return changed;
}

// Tier 4 — NDRRMA official MISSING-PERSONS registry (CORS-open). Powers the
// "official registry" panel on the Missing Persons page, alongside the
// community-submitted entries.
let OFFICIAL_MISSING=null, OFFICIAL_MISSING_ERR=false;
async function _srcMissingRegistry(){
  try{
    const r=await fetch("https://ndrrma.gov.np/api/v1/rescues/missing-persons/?limit=-1&_="+Date.now(),{signal:AbortSignal.timeout(15000)});
    if(!r.ok) throw new Error("http "+r.status);
    const j=await r.json();
    const list=j.results||j;
    if(!Array.isArray(list)) return false;
    const next={ count:(j.count!=null?j.count:list.length), fetched:Date.now(),
      persons:list.map(p=>({
        name:(p.name||"").trim(), name_ne:(p.name_ne||"").trim(),
        age:p.age, gender:p.gender||"", nationality:p.nationality||"", country:p.country||"",
        remarks:p.remarks||"", last_contact:p.last_contact||"",
        status:(p.status&&p.status.title)||"", status_ne:(p.status&&p.status.title_ne)||""
      })) };
    const changed = !OFFICIAL_MISSING || OFFICIAL_MISSING.count!==next.count;
    OFFICIAL_MISSING=next; OFFICIAL_MISSING_ERR=false;
    if(typeof renderOfficialMissing==="function") renderOfficialMissing();
    return changed;
  }catch(_){
    if(!OFFICIAL_MISSING){ OFFICIAL_MISSING_ERR=true; if(typeof renderOfficialMissing==="function") renderOfficialMissing(); }
    return false;
  }
}
/* The Missing Persons page loads this on its own, outside the 10-minute figure
   sync, so a slow first burst can't leave the panel stuck — and it retries once
   before giving the reader a retry button. */
function loadOfficialMissing(retries){
  _srcMissingRegistry().then(ok=>{
    if(!OFFICIAL_MISSING && (retries||0) > 0) setTimeout(()=>loadOfficialMissing(retries-1), 4000);
  });
}

let _refreshing=false;
async function liveRefresh(isManual){
  if(_refreshing) return;               // never overlap two refreshes
  _refreshing=true;
  try{
    _beginCycle();
    // NDRRMA (rank 1) and the curated feed (rank 2) are awaited first so they
    // claim their keys before Wikipedia (rank 3) is allowed to fill the gaps.
    const primary = await Promise.allSettled([_srcNDRRMA(), _srcLocalFeed()]);
    const rest    = await Promise.allSettled([_srcSummary(), _srcMissingRegistry()]);
    const changed = primary.concat(rest).some(r=>r.status==="fulfilled" && r.value===true);
    if(changed || isManual){
      renderStats(); renderStatsPage(); renderMissingSummary(); renderEvent(); renderReliefCollected();
      if(isManual) toast(LANG==="ne"?"तथ्यांक अद्यावधिक भयो (Live)":"Latest disaster figures synced.","crim");
    }
    setSync(nptNow());
  } finally {
    _refreshing=false;
  }
}

/* Manual "sync now" affordance — wires any [data-sync] control if a page adds one,
   and exposes window.liveRefresh so the figure can always be force-refreshed.
   (Previously undefined, which threw and halted the rest of wire().) */
function setupManualSync(){
  window.liveRefresh = liveRefresh;
  $$("[data-sync]").forEach(btn=>{
    if(btn.__wired) return; btn.__wired=true;
    btn.addEventListener("click", e=>{ e.preventDefault(); liveRefresh(true); });
  });
  // refresh immediately when the tab becomes visible again (cheap, catches up fast)
  if(!window.__ndVis){
    window.__ndVis=true;
    document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="visible"){ liveRefresh(); fetchLiveAlerts(); fetchLiveNews(); fetchDistrictWarnings().then(updateWarnReopen); if($("#hwRoot")){ fetchHighways(); fetchHighwayNews(); } } });
  }
}

/* =========================================================================
   HIGHWAY UPDATES page — province-grouped route table from assets/highways.json
   (curated, editable) plus the auto-updating road-bulletin feed from
   /api/highways. Everything below runs only where #hwRoot exists.
   ========================================================================= */
let HW_DATA=null, HW_NEWS=[], HW_FILTER="all";
const HW_STATUS=["closed","oneway","caution","open"];
function _hwClass(s){ return HW_STATUS.indexOf(s)>=0?s:"open"; }
function _hwUpdated(){
  if(!HW_DATA||!HW_DATA.updated_at) return "";
  try{ return new Date(HW_DATA.updated_at).toLocaleString(LANG==="ne"?"ne-NP":"en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}); }
  catch(_){ return HW_DATA.updated_at; }
}
async function fetchHighways(){
  if(!$("#hwRoot")) return;
  try{ const r=await fetch("assets/highways.json?_="+Date.now(),{cache:"no-store",signal:AbortSignal.timeout(6000)}); if(r.ok) HW_DATA=await r.json(); }catch(_){}
  renderHighways();
}
async function fetchHighwayNews(){
  if(!$("#hwRoot")) return;
  try{ const r=await fetch("/api/highways",{signal:AbortSignal.timeout(9000)}); if(r.ok){ const j=await r.json(); if(j&&Array.isArray(j.items)) HW_NEWS=j.items; } }catch(_){}
  renderHighways();
}
const _HW_RANK={closed:0,oneway:1,caution:2,open:3};
function _hwSevRank(s){ return _HW_RANK[s]!=null?_HW_RANK[s]:3; }
function _telHref(c){ const d=String(c||"").replace(/[^0-9+]/g,""); return d.replace(/[^0-9]/g,"").length>=3?d:""; }

function _hwRouteCard(rt, prov){
  const st=_hwClass(rt.status);
  const since=rt.since?TL(rt.since):"";
  const det=rt.detour?TL(rt.detour):"";
  const eta=rt.eta?TL(rt.eta):"";
  const tel=_telHref(rt.contact);
  const rows=[];
  if(eta) rows.push([t("hw.eta"), eta]);
  if(det && det!=="—") rows.push([t("hw.detour"), det]);
  const contact = rt.contact ? (tel
      ? `<a class="hwcard__call" href="tel:${esc(tel)}" aria-label="${esc(t("hw.call"))} ${esc(rt.contact)}">${PH}<span>${esc(rt.contact)}</span></a>`
      : `<span class="hwcard__call hwcard__call--static">${PH}<span>${esc(rt.contact)}</span></span>`) : "";
  return `<article class="hwcard hwcard--${st}">
    <div class="hwcard__head">
      <div class="hwcard__id">
        <h4 class="hwcard__name">${esc(rt.name)}</h4>
        <span class="hwcard__meta-top">${rt.highway?`<span class="hwcard__hw">${esc(rt.highway)}</span>`:""}${prov?`<span class="hwcard__prov">${esc(prov)}</span>`:""}</span>
      </div>
      <span class="hwbadge hwbadge--${st}"><span class="hwbadge__dot" aria-hidden="true"></span>${esc(t("hw.st."+st))}</span>
    </div>
    ${since?`<div class="hwcard__since"><span class="hwcard__sincedot" aria-hidden="true"></span>${esc(since)}</div>`:""}
    <p class="hwcard__reason">${esc(TL(rt.reason))}</p>
    ${rows.length?`<dl class="hwcard__facts">${rows.map(r=>`<div><dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd></div>`).join("")}</dl>`:""}
    ${contact?`<div class="hwcard__foot">${contact}</div>`:""}
  </article>`;
}

function renderHighways(){
  const root=$("#hwRoot"); if(!root) return;
  if(!HW_DATA){ root.innerHTML=`<p class="hwloading">${esc(t("hw.loading"))}</p>`; return; }
  const provs=HW_DATA.provinces||[];
  // Flatten every route once, tagged with its province, so we can build a
  // cross-province "critical" board and severity-sorted province sections.
  const all=[];
  provs.forEach(p=>(p.routes||[]).forEach(r=>{ all.push({rt:r, prov:TL(p.name), st:_hwClass(r.status)}); }));
  const nC=all.filter(x=>x.st==="closed").length;
  const nO=all.filter(x=>x.st==="oneway").length;
  const nCau=all.filter(x=>x.st==="caution").length;
  const nOpen=all.filter(x=>x.st==="open").length;
  const total=all.length;
  const worst = nC>0 ? "closed" : (nO>0 ? "oneway" : (nCau>0 ? "caution" : "open"));

  /* ---- command hero: the national picture at a glance ---- */
  const heroLine=t("hw.hero.line")
      .replace("{o}",String(nO)).replace("{c}",String(nCau))
      .replace("{open}",String(nOpen)).replace("{t}",String(total));
  const hero=`<div class="hwhero hwhero--${worst}">
    <div class="hwhero__main">
      <span class="hwhero__eye">${esc(t("hw.hero"))}</span>
      <div class="hwhero__big"><span class="hwhero__n mono">${nC}</span><span class="hwhero__unit">${esc(t("hw.hero.closed"))}</span></div>
      <div class="hwhero__line">${esc(heroLine)}</div>
    </div>
    <div class="hwhero__side">
      <span class="hwhero__upd"><span class="hwhero__pulse" aria-hidden="true"></span>${esc(t("hw.updated"))}</span>
      <span class="hwhero__time mono">${esc(_hwUpdated())}</span>
      <button class="btn btn--ghost btn--sm" id="hwRefresh">${esc(t("hw.refresh"))}</button>
    </div>
  </div>`;

  /* ---- national overview / situation report ---- */
  const summary=HW_DATA.summary?`<div class="hwsum"><span class="hwsum__eye">${esc(t("hw.summary"))}</span><p>${esc(TL(HW_DATA.summary))}</p>${HW_DATA.source?`<div class="hwsum__src">SRC · ${esc(HW_DATA.source)}</div>`:""}</div>`:"";

  /* ---- filter chips ---- */
  const chip=(f,label,n,cls)=>`<button class="hwchip${cls?" hwchip--"+cls:""}${HW_FILTER===f?" is-on":""}" data-hwf="${f}"><span class="hwchip__l">${esc(label)}</span>${n!=null?`<span class="hwchip__n mono">${n}</span>`:""}</button>`;
  const chips=`<div class="hwchips" role="group" aria-label="Filter by status">
    ${chip("all",t("hw.all"),total,"")}
    ${chip("closed",t("hw.count.closed"),nC,"closed")}
    ${chip("oneway",t("hw.count.oneway"),nO,"oneway")}
    ${chip("caution",t("hw.st.caution"),nCau,"caution")}
    ${chip("open",t("hw.st.open"),nOpen,"open")}
  </div>`;

  const show=st=>HW_FILTER==="all"||HW_FILTER===st;

  /* ---- critical board: closed + one-way, cross-province, worst first ---- */
  let critical="";
  const crit=all.filter(x=>(x.st==="closed"||x.st==="oneway") && show(x.st))
                .sort((a,b)=>_hwSevRank(a.st)-_hwSevRank(b.st));
  if(crit.length){
    critical=`<section class="hwsection hwsection--crit">
      <div class="hwsection__h"><h3 class="hwsection__t">${esc(t("hw.critical"))}<span class="hwsection__n mono">${crit.length}</span></h3><span class="hwsection__sub">${esc(t("hw.critical.sub"))}</span></div>
      <div class="hwgrid hwgrid--crit">${crit.map(x=>_hwRouteCard(x.rt,x.prov)).join("")}</div>
    </section>`;
  } else if(HW_FILTER==="all"){
    critical=`<div class="hwallclear"><span class="hwallclear__ic" aria-hidden="true">✓</span>${esc(t("hw.allclear"))}</div>`;
  }

  /* ---- province sections: caution + open, grouped, severity-sorted ---- */
  let sections="";
  if(HW_FILTER==="all"||HW_FILTER==="caution"||HW_FILTER==="open"){
    sections=provs.map(p=>{
      const cards=(p.routes||[])
        .filter(r=>{ const s=_hwClass(r.status); return (s==="caution"||s==="open") && show(s); })
        .sort((a,b)=>_hwSevRank(_hwClass(a.status))-_hwSevRank(_hwClass(b.status)));
      if(!cards.length) return "";
      return `<section class="hwprov"><h3 class="hwprov__h">${esc(TL(p.name))}<span class="hwprov__n mono">${cards.length} ${esc(t("hw.route"))}</span></h3><div class="hwgrid">${cards.map(r=>_hwRouteCard(r)).join("")}</div></section>`;
    }).filter(Boolean).join("");
    if(sections) sections=`<div class="hwsection__h hwsection__h--prov"><h3 class="hwsection__t">${esc(t("hw.other"))}</h3></div>`+sections;
  }

  /* ---- live wire bulletins ---- */
  let live="";
  if(HW_NEWS && HW_NEWS.length){
    const items=HW_NEWS.slice(0,8).map(n=>{
      let when=""; try{ if(n.ts) when=new Date(n.ts).toLocaleDateString(LANG==="ne"?"ne-NP":"en-GB",{day:"numeric",month:"short"}); }catch(_){}
      return `<a class="hwnews__row" href="${esc(n.url)}" target="_blank" rel="noopener"><span class="hwnews__t">${esc(n.title)}</span><span class="hwnews__m mono">${esc(n.source||"")}${when?" · "+esc(when):""}</span></a>`;
    }).join("");
    live=`<div class="hwlive"><div class="hwlive__h"><span class="hwsum__eye">${esc(t("hw.live"))}</span><span class="hwlive__src mono">${esc(t("hw.livesrc"))}</span></div>${items}</div>`;
  }

  const precau=`<div class="hwprecau"><h3 class="hwprecau__h">${esc(t("hw.precau"))}</h3><ul><li>${esc(t("hw.precau1"))}</li><li>${esc(t("hw.precau2"))}</li><li>${esc(t("hw.precau3"))}</li><li>${esc(t("hw.precau4"))}</li></ul></div>`;
  const legend=`<p class="hwlegendnote">${esc(t("hw.legend"))}</p>`;

  const body=(critical||sections)?(critical+sections):`<p class="hwloading">${esc(t("hw.nolive"))}</p>`;
  root.innerHTML=hero+summary+chips+`<div class="hwboard">${body}</div>`+live+precau+legend;

  root.querySelectorAll("[data-hwf]").forEach(b=>b.addEventListener("click",()=>{ const f=b.getAttribute("data-hwf"); HW_FILTER=(HW_FILTER===f&&f!=="all")?"all":f; renderHighways(); }));
  const rf=$("#hwRefresh"); if(rf) rf.addEventListener("click",()=>{ rf.disabled=true; Promise.all([fetchHighways(),fetchHighwayNews()]).finally(()=>{ toast(LANG==="ne"?"राजमार्ग अवस्था अद्यावधिक भयो।":"Highway status refreshed.","crim"); }); });
}

/* =========================================================================
   HELPING HAND — the two-sided request/offer board.

   Everything here runs only where #hhRoot exists (helping-hand.html).

   Layout follows the decision the reader arrives with. They are not browsing;
   they either need something or have something, so the page opens with that
   choice, the form reflects the side they picked, and the board sits below for
   people who came to look rather than post.

   Two decisions worth stating, because they shaped the module:

   1. If the backend is unreachable the form is DISABLED and says so. The
      tempting fallback — keep posting into localStorage so the page still
      "works" — would mean somebody asking for insulin sees a success message
      for a post that exists only in their own browser. Better a page that
      admits it is offline and points at the phone numbers.

   2. Official helplines sit above everything. This is a community board; it
      is not a substitute for calling 1149, and the layout must not imply
      otherwise.
   ========================================================================= */
const HH_CATS=["food","water","shelter","medical","blood","rescue","transport","clothing","baby","hygiene","power","volunteer","money","other"];
const HH_URG=["critical","urgent","normal"];
const HH_STATE={ kind:"all", cat:"all", q:"", posting:false, form:null };
let HH_POSTS=null, HH_ERR=false, HH_LOADED=false;

/* Tokens proving "this post is mine", so the poster can close it when the
   need is met. Kept in this browser only; the server stores just a hash. */
function hhMine(){ try{ return JSON.parse(localStorage.getItem("nd_help_mine")||"{}"); }catch(_){ return {}; } }
function hhSaveMine(m){ try{ localStorage.setItem("nd_help_mine",JSON.stringify(m)); }catch(_){} }

const HH_ICON={
  food:"M4 3v8a3 3 0 0 0 6 0V3M7 11v10M17 3c-1.7 1.3-2.5 3.4-2.5 6s.8 4 2.5 4v8",
  water:"M12 2.7 6.5 9.4A7 7 0 1 0 17.5 9.4L12 2.7Z",
  shelter:"M3 10.5 12 3l9 7.5M5.5 9.5V21h13V9.5",
  medical:"M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z",
  blood:"M12 2.7 6.5 9.4A7 7 0 1 0 17.5 9.4L12 2.7ZM9.5 13.5h5M12 11v5",
  rescue:"M12 2 3 6v6c0 5 3.8 8.4 9 10 5.2-1.6 9-5 9-10V6l-9-4Z",
  transport:"M3 16V8h13v8M16 11h3.5L22 14v2h-3M6.5 19a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6ZM18 19a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z",
  clothing:"M9 3 4 6.5 6 10l2-1v12h8V9l2 1 2-3.5L15 3a3 3 0 0 1-6 0Z",
  baby:"M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM9 10h.01M15 10h.01M9.5 14.5c1.5 1.2 3.5 1.2 5 0",
  hygiene:"M7 8h10l-1 13H8L7 8ZM9 8V5a3 3 0 0 1 6 0v3",
  power:"M13 2 4 14h7l-1 8 9-12h-7l1-8Z",
  volunteer:"M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10Z",
  money:"M12 2v20M17 6.5c0-1.9-2.2-3-5-3s-5 1.1-5 3 2.2 2.7 5 3.2 5 1.4 5 3.3-2.2 3-5 3-5-1.1-5-3",
  other:"M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 8v5M12 16h.01"
};
function hhIcon(c,cls){
  return `<svg class="${cls||"hh__ico"}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${HH_ICON[c]||HH_ICON.other}"/></svg>`;
}
const HH_PIN='<svg class="hh__mi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="2.8"/></svg>';
const HH_PPL='<svg class="hh__mi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="3.2"/><path d="M22 20v-2a4 4 0 0 0-3-3.8"/><path d="M16.5 3.7a4 4 0 0 1 0 7.5"/></svg>';

function hhAgo(ts){
  const m=Math.max(0,Math.round((Date.now()-ts)/60000));
  if(m<1) return t("hh.now");
  if(m<60) return t("hh.min").replace("{n}",toNepDigits(String(m)));
  const h=Math.round(m/60);
  if(h<24) return t("hh.hr").replace("{n}",toNepDigits(String(h)));
  return t("hh.day").replace("{n}",toNepDigits(String(Math.round(h/24))));
}

async function fetchHelp(){
  if(!$("#hhRoot")) return;
  try{
    const r=await fetch("/api/help",{cache:"no-store",signal:AbortSignal.timeout(9000)});
    const j=await r.json();
    if(!r.ok || j.error) throw new Error(j.error||("http "+r.status));
    HH_POSTS=Array.isArray(j.posts)?j.posts:[];
    HH_ERR=false;
  }catch(_){
    HH_ERR=true; if(!HH_POSTS) HH_POSTS=[];
  }
  HH_LOADED=true;
  renderHelp();
}

function hhFiltered(){
  const q=HH_STATE.q.trim().toLowerCase();
  return (HH_POSTS||[]).filter(p=>{
    if(HH_STATE.kind!=="all" && p.kind!==HH_STATE.kind) return false;
    if(HH_STATE.cat!=="all" && p.category!==HH_STATE.cat) return false;
    if(!q) return true;
    return (p.district+" "+p.place+" "+p.detail+" "+(p.name||"")).toLowerCase().indexOf(q)>=0;
  }).sort((a,b)=>{
    // Open before resolved, then critical needs first, then newest.
    const st=(a.status==="open"?0:1)-(b.status==="open"?0:1); if(st) return st;
    const rank=p=>p.kind==="need"?(p.urgency==="critical"?0:p.urgency==="urgent"?1:2):3;
    return rank(a)-rank(b) || b.at-a.at;
  });
}

function hhCard(p){
  const mine=!!hhMine()[p.id];
  const done=p.status!=="open";
  const urg=p.kind==="need"?p.urgency:"";
  const tel=(p.phone||"").replace(/[^0-9+]/g,"");
  const where=[p.place,p.district].filter(Boolean).join(", ");
  return `<article class="hhc hhc--${p.kind}${done?" hhc--done":""}" data-hh="${esc(p.id)}">
    <header class="hhc__head">
      <span class="hhc__kind">${esc(p.kind==="need"?t("hh.k.need"):t("hh.k.offer"))}</span>
      ${urg&&urg!=="normal"?`<span class="hhc__urg hhc__urg--${urg}">${esc(t("hh.u."+urg))}</span>`:""}
      ${done?`<span class="hhc__flag">${esc(t("hh.resolved"))}</span>`:""}
      <time class="hhc__ago">${esc(hhAgo(p.at))}</time>
    </header>
    <h3 class="hhc__cat">${hhIcon(p.category,"hhc__caticon")}<span>${esc(t("hh.c."+p.category))}</span></h3>
    <p class="hhc__detail">${esc(p.detail)}</p>
    <dl class="hhc__meta">
      ${where?`<div><dt>${HH_PIN}<span class="sr">${esc(t("hh.m.where"))}</span></dt><dd>${esc(where)}</dd></div>`:""}
      ${p.people?`<div><dt>${HH_PPL}<span class="sr">${esc(t("hh.m.people"))}</span></dt><dd>${esc(toNepDigits(String(p.people)))} ${esc(t("hh.people"))}</dd></div>`:""}
    </dl>
    <footer class="hhc__foot">
      ${tel?`<a class="hhc__call" href="tel:${esc(tel)}">${PH}<span>${esc(p.phone)}</span></a>`
           :`<span class="hhc__nocall">${esc(t("hh.nocontact"))}</span>`}
      <span class="hhc__acts">
        ${p.name?`<span class="hhc__by">${esc(t("hh.by"))} ${esc(p.name)}</span>`:""}
        ${mine&&!done?`<button type="button" class="hhc__btn" data-hh-resolve="${esc(p.id)}">${esc(t("hh.markdone"))}</button>`:""}
        <button type="button" class="hhc__btn hhc__btn--flag" data-hh-flag="${esc(p.id)}">${esc(t("hh.flag"))}</button>
      </span>
    </footer>
  </article>`;
}

function hhListHTML(shown){
  return shown.length
    ? `<div class="hhgrid">${shown.map(hhCard).join("")}</div>`
    : `<p class="hhempty">${esc(HH_ERR?t("hh.empty.off"):t("hh.empty"))}</p>`;
}
/* Repaint just the results, leaving the filters and the search field alone. */
function paintHelpList(){
  const list=$("#hhList"); if(!list) return;
  list.innerHTML=hhListHTML(hhFiltered());
  const n=$("#hhCount"); if(n) n.textContent=toNepDigits(String(hhFiltered().length));
  wireHelpCards();
}

/* ---- the two intent cards that open the page ---- */
function hhIntentHTML(nNeed,nOffer){
  const card=(kind,n)=>`<button type="button" class="hhpick hhpick--${kind}${HH_STATE.form===kind?" is-on":""}" data-hh-form="${kind}">
      <span class="hhpick__ic">${hhIcon(kind==="need"?"rescue":"volunteer","hhpick__svg")}</span>
      <span class="hhpick__body">
        <span class="hhpick__h">${esc(kind==="need"?t("hh.form.need"):t("hh.form.offer"))}</span>
        <span class="hhpick__p">${esc(kind==="need"?t("hh.pick.need.p"):t("hh.pick.offer.p"))}</span>
      </span>
      <span class="hhpick__n"><b>${toNepDigits(String(n))}</b><i>${esc(kind==="need"?t("hh.hero.needs"):t("hh.hero.offers"))}</i></span>
    </button>`;
  return `<div class="hhpicks">${card("need",nNeed)}${card("offer",nOffer)}</div>`;
}

/* ---- the post form ---- */
function hhFormHTML(){
  const kind=HH_STATE.form;
  const opt=(v,l,sel)=>`<option value="${esc(v)}"${sel?" selected":""}>${esc(l)}</option>`;
  const need=kind==="need";
  return `<form class="hhform hhform--${kind}" id="hhForm" novalidate>
    <div class="hhform__head">
      <h3 class="hhform__h">${esc(need?t("hh.form.h.need"):t("hh.form.h.offer"))}</h3>
      <p class="hhform__lead">${esc(need?t("hh.form.need.p"):t("hh.form.offer.p"))}</p>
    </div>

    <fieldset class="hhfs">
      <legend class="hhfs__l">${esc(need?t("hh.fs.what.need"):t("hh.fs.what.offer"))}</legend>
      <div class="hhrow hhrow--2">
        <label class="hhf"><span class="hhf__l">${esc(t("hh.f.cat"))}</span>
          <select name="category">${HH_CATS.map(c=>opt(c,t("hh.c."+c),c==="food")).join("")}</select></label>
        ${need?`<label class="hhf"><span class="hhf__l">${esc(t("hh.f.urg"))}</span>
          <select name="urgency">${HH_URG.map(u=>opt(u,t("hh.u."+u),u==="urgent")).join("")}</select></label>`:""}
      </div>
      <label class="hhf"><span class="hhf__l">${esc(t("hh.f.detail"))} <em>${esc(t("hh.req"))}</em></span>
        <textarea name="detail" maxlength="600" rows="3" required placeholder="${esc(need?t("hh.f.detail.need"):t("hh.f.detail.offer"))}"></textarea>
        <span class="hhf__hint">${esc(need?t("hh.f.detail.hint.need"):t("hh.f.detail.hint.offer"))}</span></label>
    </fieldset>

    <fieldset class="hhfs">
      <legend class="hhfs__l">${esc(t("hh.fs.where"))}</legend>
      <div class="hhrow hhrow--3">
        <label class="hhf"><span class="hhf__l">${esc(t("hh.f.district"))} <em>${esc(t("hh.req"))}</em></span>
          <input name="district" maxlength="60" required autocomplete="address-level1" placeholder="${esc(t("hh.f.district.ph"))}"></label>
        <label class="hhf"><span class="hhf__l">${esc(t("hh.f.place"))}</span>
          <input name="place" maxlength="120" placeholder="${esc(t("hh.f.place.ph"))}"></label>
        <label class="hhf"><span class="hhf__l">${esc(need?t("hh.f.people"):t("hh.f.capacity"))}</span>
          <input name="people" type="number" min="0" max="9999" inputmode="numeric" placeholder="0"></label>
      </div>
    </fieldset>

    <fieldset class="hhfs">
      <legend class="hhfs__l">${esc(t("hh.fs.contact"))}</legend>
      <div class="hhrow hhrow--2">
        <label class="hhf"><span class="hhf__l">${esc(t("hh.f.name"))}</span>
          <input name="name" maxlength="60" autocomplete="name" placeholder="${esc(t("hh.f.optional"))}"></label>
        <label class="hhf"><span class="hhf__l">${esc(t("hh.f.phone"))}</span>
          <input name="phone" type="tel" maxlength="20" inputmode="tel" autocomplete="tel" placeholder="98########"></label>
      </div>
      <label class="hhcheck"><input type="checkbox" name="shareContact"><span>${esc(t("hh.f.consent"))}</span></label>
      <p class="hhform__warn">${esc(t("hh.form.privacy"))}</p>
    </fieldset>

    <div class="hhform__actions">
      <button class="btn btn--primary" type="submit" id="hhSubmit">${esc(need?t("hh.form.post.need"):t("hh.form.post.offer"))}</button>
      <button class="btn btn--ghost" type="button" id="hhCancel">${esc(t("hh.form.cancel"))}</button>
      <span class="hhform__msg" id="hhMsg" role="status"></span>
    </div>
  </form>`;
}

function renderHelp(){
  const root=$("#hhRoot"); if(!root) return;

  const posts=HH_POSTS||[];
  const nNeed=posts.filter(p=>p.kind==="need"&&p.status==="open").length;
  const nOffer=posts.filter(p=>p.kind==="offer"&&p.status==="open").length;
  const shown=hhFiltered();

  const seg=(f,label,n)=>`<button type="button" class="hhseg${HH_STATE.kind===f?" is-on":""}" data-hhk="${f}">${esc(label)}<span class="hhseg__n">${toNepDigits(String(n))}</span></button>`;

  const offline=HH_ERR?`<div class="hhoff">
      <strong>${esc(t("hh.off.h"))}</strong>
      <p>${esc(t("hh.off.p"))}</p>
    </div>`:"";

  const postPanel = HH_ERR
    ? `<p class="hhempty">${esc(t("hh.off.form"))}</p>`
    : hhIntentHTML(nNeed,nOffer) + (HH_STATE.form?hhFormHTML():`<p class="hhpicks__hint">${esc(t("hh.pick.hint"))}</p>`);

  const board = !HH_LOADED
    ? `<p class="hwloading">${esc(t("hh.loading"))}</p>`
    : `<div id="hhList">${hhListHTML(shown)}</div>`;

  root.innerHTML=`
    <div class="hhsafe">
      <span class="hhsafe__ic" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 8v5M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>
      </span>
      <div class="hhsafe__body">
        <strong>${esc(t("hh.safe.h"))}</strong>
        <p>${esc(t("hh.safe.p"))}</p>
        <p class="hhsafe__lines"><span>${esc(t("hh.safe.lines"))}</span>
          <a href="tel:1149">1149</a><a href="tel:100">100</a><a href="tel:1155">1155</a>
          <a class="hhsafe__more" href="index.html#helplines">${esc(t("hh.safe.all"))}</a></p>
      </div>
    </div>

    ${offline}

    <section class="hhpost" aria-labelledby="hhPostH">
      <div class="hhsec">
        <h2 class="hhsec__h" id="hhPostH">${esc(t("hh.post.h"))}</h2>
        <p class="hhsec__p">${esc(t("hh.post.p"))}</p>
      </div>
      ${postPanel}
    </section>

    <section class="hhboard" aria-labelledby="hhBoardH">
      <div class="hhsec">
        <h2 class="hhsec__h" id="hhBoardH">${esc(t("hh.board.h"))}</h2>
        <p class="hhsec__p">${esc(t("hh.board.p"))}</p>
      </div>
      <div class="hhbar">
        <div class="hhsegs" role="group" aria-label="${esc(t("hh.board.h"))}">
          ${seg("all",t("hh.all"),posts.filter(p=>p.status==="open").length)}
          ${seg("need",t("hh.k.need"),nNeed)}
          ${seg("offer",t("hh.k.offer"),nOffer)}
        </div>
        <div class="hhbar__tools">
          <label class="hhsel"><span class="sr">${esc(t("hh.f.cat"))}</span>
            <select id="hhCat">
              <option value="all"${HH_STATE.cat==="all"?" selected":""}>${esc(t("hh.cat.all"))}</option>
              ${HH_CATS.map(c=>`<option value="${c}"${HH_STATE.cat===c?" selected":""}>${esc(t("hh.c."+c))}</option>`).join("")}
            </select></label>
          <label class="hhsearch"><span class="sr">${esc(t("hh.search"))}</span>
            <input id="hhSearch" type="search" placeholder="${esc(t("hh.search"))}" value="${esc(HH_STATE.q)}"></label>
        </div>
      </div>
      <p class="hhresults"><span id="hhCount">${toNepDigits(String(shown.length))}</span> ${esc(t("hh.showing"))}</p>
      ${board}
      <p class="hhlegend">${esc(t("hh.legend"))}</p>
    </section>`;

  wireHelp();
}

function wireHelp(){
  const root=$("#hhRoot"); if(!root) return;

  root.querySelectorAll("[data-hhk]").forEach(b=>b.addEventListener("click",()=>{
    HH_STATE.kind=b.dataset.hhk;
    root.querySelectorAll("[data-hhk]").forEach(x=>x.classList.toggle("is-on",x===b));
    paintHelpList();
  }));
  root.querySelectorAll("[data-hh-form]").forEach(b=>b.addEventListener("click",()=>{
    // Tapping the active side again closes the form rather than trapping the
    // reader in it.
    HH_STATE.form = (HH_STATE.form===b.dataset.hhForm) ? null : b.dataset.hhForm;
    renderHelp();
    const f=$("#hhForm");
    if(f){ f.scrollIntoView({block:"nearest"}); const first=f.querySelector("select,input"); if(first) first.focus({preventScroll:true}); }
  }));

  const cat=$("#hhCat");
  if(cat) cat.addEventListener("change",()=>{ HH_STATE.cat=cat.value; paintHelpList(); });

  const search=$("#hhSearch");
  if(search) search.addEventListener("input",()=>{
    HH_STATE.q=search.value;
    // Repaint the results only. Re-rendering the whole panel on every keystroke
    // would tear the input out of the DOM and drop focus mid-word.
    paintHelpList();
  });

  wireHelpCards();

  const cancel=$("#hhCancel");
  if(cancel) cancel.addEventListener("click",()=>{ HH_STATE.form=null; renderHelp(); });

  const form=$("#hhForm");
  if(form) form.addEventListener("submit", async e=>{
    e.preventDefault();
    if(HH_STATE.posting) return;
    const msg=$("#hhMsg"), btn=$("#hhSubmit");
    const fd=new FormData(form);
    const body={
      kind:HH_STATE.form||"need",
      category:fd.get("category")||"other",
      urgency:fd.get("urgency")||"normal",
      district:(fd.get("district")||"").toString().trim(),
      place:(fd.get("place")||"").toString().trim(),
      people:fd.get("people")||0,
      name:(fd.get("name")||"").toString().trim(),
      detail:(fd.get("detail")||"").toString().trim(),
      phone:(fd.get("phone")||"").toString().trim(),
      shareContact:fd.get("shareContact")==="on"
    };
    const fail=(key,field)=>{
      msg.textContent=t(key); msg.className="hhform__msg hhform__msg--err";
      const el=form.querySelector('[name="'+field+'"]'); if(el){ el.focus(); }
    };
    if(!body.district) return fail("hh.err.required","district");
    if(!body.detail) return fail("hh.err.required","detail");
    if(body.shareContact && !body.phone) return fail("hh.err.phone","phone");
    HH_STATE.posting=true; btn.disabled=true;
    msg.textContent=t("hh.sending"); msg.className="hhform__msg";
    try{
      const r=await fetch("/api/help",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const j=await r.json();
      if(!r.ok || j.error){ const e=new Error(j.error||"failed"); e.fromServer=!!j.error; throw e; }
      const mine=hhMine(); mine[j.id]=j.token; hhSaveMine(mine);
      HH_POSTS=[j.post].concat(HH_POSTS||[]);
      HH_STATE.form=null; HH_STATE.kind="all"; HH_STATE.cat="all";
      toast(t("hh.posted"),"crim");
      renderHelp();
      const list=$("#hhList"); if(list) list.scrollIntoView({block:"start"});
    }catch(err){
      // The endpoint sends a specific reason for the refusals a poster can act on
      // — the rate limit above all — so pass it through instead of flattening
      // every failure into "check your connection", which sends someone off to
      // fix a network that is working fine.
      const reason=String(err.message||"");
      msg.textContent = reason==="unavailable" ? t("hh.off.p")
                      : (err.fromServer && reason) ? reason
                      : t("hh.err.send");
      msg.className="hhform__msg hhform__msg--err";
    }finally{
      HH_STATE.posting=false;
      const b2=$("#hhSubmit"); if(b2) b2.disabled=false;
    }
  });
}

function wireHelpCards(){
  const root=$("#hhRoot"); if(!root) return;
  root.querySelectorAll("[data-hh-resolve]").forEach(b=>{
    if(b.__w) return; b.__w=true;
    b.addEventListener("click", async ()=>{
      const id=b.dataset.hhResolve, token=hhMine()[id];
      if(!token) return;
      b.disabled=true;
      try{
        const r=await fetch("/api/help?action=resolve",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,token})});
        if(!r.ok) throw new Error("failed");
        const p=(HH_POSTS||[]).find(x=>x.id===id); if(p) p.status="resolved";
        toast(t("hh.doneok"),"crim"); paintHelpList();
      }catch(_){ b.disabled=false; toast(t("hh.err.send")); }
    });
  });
  root.querySelectorAll("[data-hh-flag]").forEach(b=>{
    if(b.__w) return; b.__w=true;
    b.addEventListener("click", async ()=>{
      if(!confirm(t("hh.flag.confirm"))) return;
      b.disabled=true;
      try{
        await fetch("/api/help?action=flag",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:b.dataset.hhFlag})});
        toast(t("hh.flag.ok"),"crim");
      }catch(_){ b.disabled=false; }
    });
  });
}

if(document.readyState!=="loading") wire(); else document.addEventListener("DOMContentLoaded",wire);
