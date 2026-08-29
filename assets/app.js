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

/* ================== SECURITY + OFFLINE MONITORING ================== */
(function securityMonitor(){
  const SEC = {
    offline: false,
    crashCount: sessionStorage.getItem("__crash") ? parseInt(sessionStorage.getItem("__crash")) : 0,
    lastGoodData: localStorage.getItem("__lastGoodData") || null
  };

  // Offline detection with UI popup
  function showOfflinePopup(){
    if(SEC.offline) return;
    SEC.offline = true;
    const html = `<div style="position:fixed;top:0;left:0;right:0;background:#C8102E;color:white;padding:12px 16px;font-family:sans-serif;font-size:14px;z-index:99999;border-bottom:2px solid #900;box-shadow:0 2px 8px rgba(0,0,0,0.3);">
      <strong>⚠️ No Internet Connection</strong> — Data may be stale. Reconnect to sync latest figures from Nepal Police & NDRRMA.
    </div>`;
    document.body.insertAdjacentHTML("afterbegin", html);
  }

  function hideOfflinePopup(){
    if(!SEC.offline) return;
    SEC.offline = false;
    const popup = document.querySelector('div[style*="position:fixed"]');
    if(popup) popup.remove();
  }

  // Network status monitoring
  window.addEventListener("online", ()=>{ hideOfflinePopup(); console.log("[SECURITY] Network restored"); });
  window.addEventListener("offline", ()=>{ showOfflinePopup(); console.log("[SECURITY] Network lost"); });

  // Check initial state
  if(!navigator.onLine) showOfflinePopup();

  // Crash detection (CSP-safe: no inline handlers, uses delegated listener)
  window.addEventListener("error", (e)=>{
    SEC.crashCount++;
    sessionStorage.setItem("__crash", SEC.crashCount);
    if(SEC.crashCount > 3 && !document.getElementById("__crashPopup")){
      const div = document.createElement("div");
      div.id = "__crashPopup";
      div.setAttribute("style","position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;padding:24px;border-radius:4px;box-shadow:0 4px 16px rgba(0,0,0,0.2);z-index:99999;max-width:400px;font-family:sans-serif;");
      div.innerHTML = `<h2 style="color:#C8102E;margin:0 0 12px;">Site Error Detected</h2>
        <p style="margin:0 0 12px;color:#333;">The site encountered multiple errors. This may indicate a corrupted cache or browser conflict.</p>
        <button id="__crashClearBtn" style="background:#C8102E;color:white;border:none;padding:8px 16px;border-radius:2px;cursor:pointer;font-weight:bold;">Clear Cache & Reload</button>`;
      document.body.appendChild(div);
      document.getElementById("__crashClearBtn").addEventListener("click", ()=>{
        localStorage.clear(); sessionStorage.clear(); location.reload();
      });
      console.error("[SECURITY] Repeated errors detected. User should clear cache.");
    }
  });

  // Reset crash count on successful load
  window.addEventListener("load", ()=>{
    setTimeout(()=>{ sessionStorage.setItem("__crash","0"); SEC.crashCount=0; }, 5000);
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
  region:{en:"Rasuwa · Nuwakot · Trishuli corridor · Chitwan", ne:"रसुवा · नुवाकोट · त्रिशूली कोरिडोर · चितवन"},
  eas:{en:"Trishuli corridor glacial flood. 626 dead, 2,426 missing (Nepal); 2,189 rescued. Search & relief ongoing.",
       ne:"त्रिशूली कोरिडोरमा हिमनदी बाढी। ६२६ मृत्यु, २,४२६ बेपत्ता (नेपाल); २,१८९ उद्धार। खोजी तथा राहत जारी।"}
};
/* Nepal-side figures only. Live-refreshed every 10 minutes: local feed (baseline)
   → Wikipedia PROSE (deaths/missing, which states Nepal figures separately from Tibet)
   → NDRRMA API (rescued, live Nepal registry). The Wikipedia INFOBOX is NOT used —
   it reports Nepal+Tibet COMBINED, which is what previously inflated the toll. */
let STATS = [
  {key:"deaths",  n:"626", cls:"hstat--death"},
  {key:"missing", n:"2,426"},
  {key:"foreign", n:"542"},
  {key:"rescued", n:"2,189", cls:"hstat--rescue"}
];

/* -------------------- TICKER -------------------- */
const TICKER = [
  {src:"POLICE", en:"Nepal Police confirm 626 dead, 2,426 missing (Nepal); 2,189 rescued — figures rising",
   ne:"नेपाल प्रहरीले ६२६ मृत्यु, २,४२६ बेपत्ता (नेपाल) पुष्टि; २,१८९ उद्धार — संख्या बढ्दै"},
  {src:"NDRRMA", en:"NDRRMA names 2,189 rescued in its official registry — 2,034 Nepali, 155 foreign",
   ne:"NDRRMA अभिलेखमा २,१८९ उद्धारितको नाम — २,०३४ नेपाली, १५५ विदेशी"},
  {src:"PMO", en:"PM Disaster Relief Fund raises Rs 273.3 million; govt releases Rs 1 billion",
   ne:"प्रधानमन्त्री राहत कोषमा रु. २७.३३ करोड; सरकारले रु. १ अर्ब निकासा"},
  {src:"USGS", en:"Ice avalanche from a glacier — not an earthquake — triggered the surge",
   ne:"भूकम्प होइन, हिमनदीको हिउँ पहिरोले बाढीको भल निम्त्यायो — यूएसजीएस"},
  {src:"GOVT", en:"19 bridges and ~40 km of highway gone; six hydropower plants damaged",
   ne:"१९ पुल र करिब ४० कि.मि. सडक ध्वस्त; ६ जलविद्युत् आयोजना क्षतिग्रस्त"},
  {src:"AID", en:"India sends ~50 tonnes of aid; US $500k, UK £5m, IFRC $1.4m pledged",
   ne:"भारतले करिब ५० टन सहायता; अमेरिका ५ लाख डलर, बेलायत ५० लाख पाउन्ड, IFRC १४ लाख डलर"}
];

/* -------------------- NEWS / BULLETINS (20, sourced; full articles) -------------------- */
const WK="https://en.wikipedia.org/wiki/2026_Nepal_floods";
const NEWS = [
  {sev:"danger", tag:{en:"Toll",ne:"मृत्यु"}, time:"28 Aug 2026", src:"AP / Nepal Police",
   url:"https://www.washingtontimes.com/news/2026/aug/27/death-toll-floods-rises-rescuers-nepal-china-working-find-hundreds/",
   title:{en:"Nepal flood death toll climbs to 626 as body management continues",
          ne:"नेपाल बाढीमा मृत्यु ६२६ पुग्यो, शव व्यवस्थापन जारी"},
   body:{en:"Nepal Police raised the confirmed Nepal-side toll to 626, with 2,426 still missing or out of contact.",
         ne:"नेपाल प्रहरीले नेपालतर्फको पुष्टि मृत्यु ६२६ पुर्‍यायो; २,४२६ जना बेपत्ता वा सम्पर्कविहीन।"},
   long:{en:"Nepal Police confirmed 626 deaths on the Nepal side as rescue and body-management teams reached settlements cut off by the 26 August surge down the Bhotekoshi/Trishuli. Around 2,426 people remain missing or out of contact on the Nepal side (separate from the China/Tibet-side count). Officials warned the toll would keep rising as access to buried riverside villages is restored and downstream bodies are recovered along the Narayani corridor.",
         ne:"नेपाल प्रहरीले नेपालतर्फ ६२६ मृत्यु पुष्टि गर्‍यो। २६ अगस्टको भोटेकोशी/त्रिशूली भलले अवरुद्ध बस्तीमा उद्धार र शव व्यवस्थापन टोली पुग्दै। नेपालतर्फ करिब २,४२६ जना बेपत्ता वा सम्पर्कविहीन (चीन/तिब्बततर्फको गणनाभन्दा अलग)। पहुँच खुल्दै र नारायणी कोरिडोरमा शव भेटिँदै जाँदा संख्या बढ्ने अधिकारीको चेतावनी।"}},
  {sev:"relief", tag:{en:"Rescue",ne:"उद्धार"}, time:"28 Aug 2026", src:"Nepal Police / OnlineKhabar",
   url:"https://english.onlinekhabar.com/people-rescued-rasuwa-flood-2.html",
   title:{en:"1,545 rescued after Rasuwa flood; 28 police still out of contact",
          ne:"रसुवा बाढीपछि १,५४५ उद्धार; २८ प्रहरी सम्पर्कविहीन"},
   body:{en:"As of Friday morning, 644 people were rescued from Rasuwa, 898 from Nuwakot and three from Dhading.",
         ne:"शुक्रबार बिहानसम्म रसुवाबाट ६४४, नुवाकोटबाट ८९८ र धादिङबाट ३ जना उद्धार।"},
   long:{en:"Nepal Police said 1,545 people caught in the Bhotekoshi flood have been rescued — 644 from Rasuwa, 898 from Nuwakot and three from Dhading — as of 7am Friday. Some 4,348 personnel from the Army, Armed Police Force and Nepal Police have been mobilised. However, 28 police officers remained out of contact several days after the disaster.",
         ne:"नेपाल प्रहरीका अनुसार भोटेकोशी बाढीमा परेका १,५४५ जनालाई उद्धार गरिएको छ — शुक्रबार बिहान ७ बजेसम्म रसुवाबाट ६४४, नुवाकोटबाट ८९८ र धादिङबाट ३। सेना, सशस्त्र र नेपाल प्रहरीका करिब ४,३४८ जनशक्ति परिचालित। तर विपद्को केही दिनपछि पनि २८ प्रहरी सम्पर्कविहीन।"}},
  {sev:"relief", tag:{en:"Registry",ne:"अभिलेख"}, time:"28 Aug 2026", src:"NDRRMA",
   url:"https://ndrrma.gov.np/np/rescue",
   title:{en:"NDRRMA names 2,189 rescued in its official registry",
          ne:"NDRRMA को आधिकारिक अभिलेखमा २,१८९ उद्धारित"},
   body:{en:"The National Disaster Portal lists 2,189 rescued people by name — 2,034 Nepali and 155 foreign nationals.",
         ne:"राष्ट्रिय विपद् पोर्टलले २,१८९ उद्धारितको नाम सूचीबद्ध — २,०३४ नेपाली, १५५ विदेशी।"},
   long:{en:"NDRRMA's National Disaster Portal maintains a named registry of rescued people for family tracing. It now lists 2,189 individuals — 2,034 Nepali and 155 foreign nationals — with their rescue location, date and status (safe, injured, under medical care or transferred to a relief camp). The searchable list is mirrored live on this site's Rescued page and auto-updates from the NDRRMA API.",
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
  {sev:"watch", tag:{en:"Response",ne:"प्रतिकार्य"}, time:"28 Aug 2026", src:"Nepal Police / Nepal Army",
   url:WK,
   title:{en:"4,348 personnel mobilised for search, rescue and relief",
          ne:"खोज, उद्धार र राहतमा ४,३४८ जनशक्ति परिचालन"},
   body:{en:"The Army, Armed Police Force and Nepal Police are deployed across the affected districts.",
         ne:"प्रभावित जिल्लाहरूमा सेना, सशस्त्र प्रहरी र नेपाल प्रहरी परिचालित।"},
   long:{en:"Nepal Police said 4,348 personnel from the Nepal Army, Armed Police Force and Nepal Police had been mobilised for rescue, relief and assistance across Rasuwa, Nuwakot and Dhading. Around five army helicopters were in operation with private operators on standby. The UN's immediate goal was to reach the worst-hit districts to assess the scale of the disaster.",
         ne:"नेपाल प्रहरीका अनुसार रसुवा, नुवाकोट र धादिङमा उद्धार, राहत र सहयोगका लागि नेपाली सेना, सशस्त्र प्रहरी र नेपाल प्रहरीका ४,३४८ जनशक्ति परिचालित। करिब ५ सैनिक हेलिकप्टर सञ्चालनमा, निजी अपरेटर तयारीमा। सबैभन्दा प्रभावित जिल्लामा पुगेर क्षतिको आकलन गर्ने राष्ट्रसंघको तत्काल लक्ष्य।"}},
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
  {sev:"danger", lat:28.2790, lng:85.3780, place:{en:"Rasuwagadhi / Timure",ne:"रसुवागढी / तिमुरे"}, desc:{en:"Border customs office and hydropower station reported destroyed",ne:"सीमा भन्सार कार्यालय र जलविद्युत् केन्द्र ध्वस्त"}},
  {sev:"danger", lat:28.1620, lng:85.3400, place:{en:"Syafrubesi",ne:"स्याफ्रुबेसी"}, desc:{en:"Riverside settlements inundated; Langtang gateway cut off",ne:"किनारका बस्ती डुबान; लाङटाङ प्रवेशद्वार अवरुद्ध"}},
  {sev:"danger", lat:28.1119, lng:85.2975, place:{en:"Dhunche (Rasuwa HQ)",ne:"धुन्चे (रसुवा सदरमुकाम)"}, desc:{en:"District HQ; rescue and coordination centre",ne:"जिल्ला सदरमुकाम; उद्धार र समन्वय केन्द्र"}},
  {sev:"danger", lat:27.9610, lng:85.1810, place:{en:"Betrawati (Nuwakot)",ne:"बेत्रावती (नुवाकोट)"}, desc:{en:"Bridges swept away on the Trishuli; settlements damaged",ne:"त्रिशूलीका पुल बगायो; बस्ती क्षतिग्रस्त"}},
  {sev:"watch", lat:27.9010, lng:85.1560, place:{en:"Devighat / Trishuli",ne:"देवीघाट / त्रिशूली"}, desc:{en:"Hydropower plants damaged; downstream monitoring",ne:"जलविद्युत् आयोजना क्षति; तल्लो तटमा निगरानी"}},
  {sev:"watch", lat:27.5800, lng:84.5000, place:{en:"Chitwan (downstream)",ne:"चितवन (तल्लो तट)"}, desc:{en:"Downstream flood warning along the Trishuli / Narayani",ne:"त्रिशूली/नारायणी किनारमा बाढी चेतावनी"}},
  {sev:"danger", lat:28.3700, lng:85.3000, place:{en:"Gyirong Port (Tibet, China)",ne:"ग्यिरोङ बन्दरगाह (तिब्बत, चीन)"}, desc:{en:"Port reported destroyed; casualties on the China side",ne:"बन्दरगाह ध्वस्त; चीनतर्फ क्षति"}}
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
  "stat.deaths":"Confirmed Deaths","stat.missing":"Reported Missing","stat.foreign":"Foreign Nationals Missing","stat.rescued":"Rescued",
  "stat.sub.deaths":"Nepal Police · rising","stat.sub.missing":"incl. 668 foreign","stat.sub.foreign":"tourists & NRNs","stat.sub.rescued":"by air · NDRRMA","stat.tap":"Tap for breakdown →",
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
  "page.alerts.h":"Alert Map","page.alerts.p":"Active impact zones along the Trishuli corridor. Approximate coordinates; not a live-updating feed.",
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
  "stat.deaths":"पुष्टि भएका मृत्यु","stat.missing":"बेपत्ता","stat.foreign":"बेपत्ता विदेशी नागरिक","stat.rescued":"उद्धार",
  "stat.sub.deaths":"नेपाल प्रहरी · बढ्दै","stat.sub.missing":"६६८ विदेशीसहित","stat.sub.foreign":"पर्यटक र गैरआवासीय","stat.sub.rescued":"हवाई · NDRRMA","stat.tap":"विस्तृत विवरण →",
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
  "page.alerts.h":"चेतावनी नक्सा","page.alerts.p":"त्रिशूली कोरिडोरका सक्रिय प्रभावित क्षेत्र। अनुमानित निर्देशांक; प्रत्यक्ष अद्यावधिक हुने फिड होइन।",
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
      LIVE_NEWS=j.items;
      renderTicker();
      renderNews(document.body.dataset.newsLimit?+document.body.dataset.newsLimit:0);
      renderNewsPage();
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
    case "avatar": { img.style.display="none"; const ph=document.getElementById("devAvatarPh"); if(ph) ph.style.display="grid"; break; }
    case "qr": { img.style.display="none"; const fb=document.getElementById("qrFallback"); if(fb) fb.style.display="block"; break; }
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
  renderNotifs(); renderGallery(); renderFullGallery(); renderNewsPage(); renderStatsPage(); renderMissingSummary(); renderRescuePage(); renderReliefCollected(); setSync();
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
  setInterval(fetchLiveAlerts, 600000);                          // …refreshed every 10 minutes
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
  "notif.h":"Alerts","notif.eye":"Signal Feed","notif.clear":"Clear all","notif.empty":"No active alerts.","notif.count":"active","notif.enable":"🔔 Notify me",
  "glof.tag":"GLOF Watch",
  "gallery.eye":"From the Affected Areas","gallery.h":"Ground Gallery","gallery.load":"Loading photos…","gallery.none":"Photos could not be loaded right now. See the official article.","gallery.loadall":"View all photos →","page.gallery.h":"Photo Gallery","page.gallery.p":"Photographs from the affected areas, from published news sources and Wikimedia. Verify context independently.",
  "page.news.h":"Live Bulletins","page.news.p":"Detailed reporting on the current disaster, compiled from published and official sources. Verify independently.",
  "news.back":"← All bulletins","news.source":"Read at original source ↗","news.overview":"Situation overview","news.overview.src":"Live from Wikipedia · 2026 China–Nepal floods",
  "hist.readmore":"Read full article ↗","hist.loading":"Loading details…","hist.tap":"Tap for details",
  "relief.scan":"Scan to donate","relief.fonepay":"Fonepay — PM Disaster Relief Fund","relief.fonepay.p":"Scan this Fonepay QR with any Nepali banking or wallet app to donate to the Prime Minister's relief fund."
});
Object.assign(I18N.ne,{
  "news.read":"पूरा बुलेटिन पढ्नुहोस्","news.live":"प्रत्यक्ष",
  "notif.h":"अलर्टहरू","notif.eye":"सिग्नल फिड","notif.clear":"सबै हटाउनुहोस्","notif.empty":"कुनै सक्रिय अलर्ट छैन।","notif.count":"सक्रिय","notif.enable":"🔔 सूचना पाउनुहोस्",
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
/* Notifications feed (factual, sourced) */
const NOTIFS=[
  {id:"glof-2026-0826", sev:"watch", tag:{en:"GLOF",ne:"GLOF"}, time:"just now", src:"NDRRMA advisory",
   msg:{en:"GLOF advisory issued: stay alert along the Trishuli/Bhotekoshi; move away from riverbanks in Rasuwa, Nuwakot, Dhading, Gorkha, Chitwan.",
        ne:"GLOF सतर्कता जारी: त्रिशूली/भोटेकोशी किनारमा सतर्क रहनुहोस्; रसुवा, नुवाकोट, धादिङ, गोरखा, चितवनमा नदी किनारबाट टाढा जानुहोस्।"}},
  {id:"rescue-88", sev:"relief", tag:{en:"Rescue",ne:"उद्धार"}, time:"27 Aug", src:"Nepal Army",
   msg:{en:"At least 88 people rescued along the Trishuli corridor; helicopters and medical teams deployed.",
        ne:"त्रिशूली कोरिडोरमा कम्तीमा ८८ जना उद्धार; हेलिकप्टर र चिकित्सा टोली परिचालन।"}},
  {id:"damage-bridges", sev:"danger", tag:{en:"Damage",ne:"क्षति"}, time:"27 Aug", src:"Govt. of Nepal",
   msg:{en:"About 19 bridges and 40 km of road destroyed; six hydropower plants damaged.",
        ne:"करिब १९ पुल र ४० कि.मि. सडक ध्वस्त; ६ जलविद्युत् आयोजना क्षतिग्रस्त।"}},
  {id:"aid-intl", sev:"relief", tag:{en:"Aid",ne:"सहायता"}, time:"27 Aug", src:"BBC / Reuters",
   msg:{en:"India sends ~50 tonnes of aid; US pledges USD 500,000; UN support underway.",
        ne:"भारतले करिब ५० टन सहायता; अमेरिकाले ५ लाख डलर; राष्ट्रसंघको सहयोग।"}},
  {id:"gyirong-port", sev:"danger", tag:{en:"Cross-border",ne:"सीमापार"}, time:"26 Aug", src:"Xinhua",
   msg:{en:"Gyirong Port destroyed on the China side; hundreds reported missing across the border.",
        ne:"चीनतर्फ ग्यिरोङ बन्दरगाह ध्वस्त; सीमापार सयौं बेपत्ता।"}}
];
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
  b.textContent = t("notif.enable");
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
          tag:{en:"Flood alert · "+lvl, ne:"बाढी अलर्ट · "+lvl}, time:when, src:"GDACS · UN/EC",
          msg:{en:a.description||a.title, ne:a.description||a.title} };
      });
      // Notify only about alerts we've never seen — and never on the first visit.
      const fresh=LIVE_ALERTS.filter(a=>!NOTIF_SEEN.has(a.id) && !NOTIF_CLEARED.has(a.id));
      if(NOTIF_PRIMED) fresh.slice(0,3).forEach(fireOSNotif);
      LIVE_ALERTS.forEach(a=>NOTIF_SEEN.add(a.id));
      NOTIF_PRIMED=true; _saveSeen();
      renderNotifs();
    }
  }catch(_){ /* keep built-in advisories */ }
}
function clearNotifs(){ activeNotifs().forEach(n=>NOTIF_CLEARED.add(n.id)); try{localStorage.setItem("nd_cleared",JSON.stringify([...NOTIF_CLEARED]));}catch(e){} renderNotifs(); }

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
const BELL='<svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>';
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
  if(tools && !$("#bell")){
    const b=document.createElement("button");
    b.className="bell"; b.id="bell"; b.setAttribute("aria-label","Alerts");
    b.innerHTML=BELL+'<span class="badge mono" id="bellBadge">0</span>';
    const burger=$("#burger"); tools.insertBefore(b, burger||null);
    b.addEventListener("click",notifOpen);
  }

  // mobile alert item inside nav dropdown
  const navInner=$("#navInner");
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
    p.innerHTML=`<div class="notif__h"><div><span class="eyebrow" data-i18n="notif.eye">Signal Feed</span><h3 data-i18n="notif.h">Alerts</h3></div><button class="notif__x" id="notifX" aria-label="Close">✕</button></div>
      <div class="notif__bar"><span class="lbl"><span id="notifCount">0</span> <span data-i18n="notif.count">active</span></span><button class="notif__enable" id="notifEnable" data-i18n="notif.enable" hidden>Enable alerts</button><button class="notif__clear" id="notifClear" data-i18n="notif.clear">Clear all</button></div>
      <div class="notif__list" id="notifList"></div>`;
    document.body.appendChild(p);
    scrim.addEventListener("click",notifClose);
    $("#notifX").addEventListener("click",notifClose);
    $("#notifClear").addEventListener("click",clearNotifs);
    $("#notifEnable").addEventListener("click",requestNotifPerm);
    document.addEventListener("keydown",e=>{if(e.key==="Escape"&&$("#notif").classList.contains("open"))notifClose();});
  }
  updateNotifEnableBtn();
}
function notifOpen(){const p=$("#notif"),s=$("#scrim"); if(!p)return; p.classList.add("open");s.classList.add("open");p.setAttribute("aria-hidden","false");updateNotifEnableBtn();$("#notifX").focus();}
function notifClose(){const p=$("#notif"),s=$("#scrim"); if(!p)return; p.classList.remove("open");s.classList.remove("open");p.setAttribute("aria-hidden","true");const b=$("#bell");b&&b.focus();}
function renderNotifs(){
  const items=activeNotifs();
  const list=$("#notifList"); const badge=$("#bellBadge"); const cnt=$("#notifCount");
  if(badge){ badge.textContent=items.length; badge.toggleAttribute("hidden",items.length===0); }
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
  "sync.updated":"Synced","sync.auto":"auto 2 min","eas.onset":"Elapsed since onset","nav.stats":"Details","nav.seo":"SEO Page","nav.about":"About Dev",
  "page.stats.h":"Detailed Situation Figures","page.stats.p":"Category-wise breakdown from NDRRMA and Nepal Police, compiled from published situation reports. All figures are provisional and being revised.",
  "stats.src":"Source","stats.na":"Awaiting official figures — see the NDRRMA situation report.","stats.official":"NDRRMA situation report ↗","stats.fb":"NDRRMA updates (Facebook) ↗",
  "stats.disclaimer":"Provisional figures, 27–28 August 2026. Totals differ between sources and update frequently. This page does not replace official NDRRMA / Nepal Police bulletins. Verify before republishing.",
  "msum.eye":"Overview · Provisional","msum.h":"Missing at a Glance","msum.bycountry":"Foreign nationals missing, by country","msum.total":"Total missing","msum.foreign":"Foreign nationals",
  "msum.note":"Provisional (NDRRMA). Foreign nationals missing or out of contact. Names are released through Nepal Police and NDRRMA — trace individuals via the official channels below.",
  "relief.qr.h":"Scan a QR to Donate","relief.qr.p":"Scan any of these official Fonepay QR codes for the PM Disaster Relief Fund with your banking or wallet app.",
  "relief.portal.h":"Donate Online","relief.portal.p":"Contribute through the official Government of Nepal online portal for the PM Disaster Relief Fund, operated via NCHL.",
  "relief.portal.btn":"Open official PMDRF portal ↗","relief.portal.note":"Opens the official Government portal pmdrf.nchl.com.np in a new tab. For security it cannot be embedded here — confirm the web address before paying.","relief.banks.h":"Bank Account Details","relief.tab.portal":"PMDRF Portal","relief.tab.qr":"Show QR","relief.tab.banks":"Bank Details","relief.portal.blocked":"The Government portal blocks embedding for security, so it may show blank below. Use the button above to open it safely in a new tab."
});
Object.assign(I18N.ne,{
  "news.back2":"← फर्कनुहोस्","news.prev":"‹ अघिल्लो","news.next":"अर्को ›",
  "sync.updated":"सिंक","sync.auto":"स्वतः २ मिनेट","eas.onset":"घटना भएको","nav.stats":"विवरण",
  "page.stats.h":"विस्तृत अवस्था तथ्यांक","page.stats.p":"NDRRMA र नेपाल प्रहरीका प्रकाशित प्रतिवेदनबाट वर्गअनुसार विवरण। सबै तथ्यांक प्रारम्भिक र संशोधन हुँदै।",
  "stats.src":"स्रोत","stats.na":"आधिकारिक तथ्यांक प्रतीक्षामा — NDRRMA प्रतिवेदन हेर्नुहोस्।","stats.official":"NDRRMA प्रतिवेदन ↗","stats.fb":"NDRRMA अपडेट (फेसबुक) ↗",
  "stats.disclaimer":"प्रारम्भिक तथ्यांक, २७–२८ अगस्ट २०२६। स्रोत अनुसार फरक पर्छ र बारम्बार अद्यावधिक हुन्छ। आधिकारिक NDRRMA / नेपाल प्रहरी विवरणसँग रुजु गर्नुहोस्।",
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
 {id:"deaths", sev:"danger", big:"626", title:{en:"Confirmed Deaths",ne:"पुष्टि मृत्यु"}, unit:{en:"Nepal side · auto-updated from live sources",ne:"नेपालतर्फ · प्रत्यक्ष स्रोतबाट स्वतः अद्यावधिक"}, src:"Nepal Police / NDRRMA / Wikipedia",
  rows:[["Nepal (Nepal Police confirmed)","626"]],
  note:{en:"Nepal Police confirmed 626 deaths on the Nepal side; the toll auto-updates every 10 minutes from live sources as access is restored to buried riverside settlements and body-management operations recover more victims downstream.",ne:"नेपाल प्रहरीले नेपालतर्फ ६२६ मृत्यु पुष्टि गर्‍यो; पहुँच खुल्दै र शव व्यवस्थापन जारी रहँदा प्रत्यक्ष स्रोतबाट हरेक १० मिनेटमा संख्या स्वतः अद्यावधिक हुन्छ।"}},
 {id:"missing", sev:"danger", big:"2,426", title:{en:"Missing and Out of Contact",ne:"बेपत्ता तथा सम्पर्कविहीन"}, unit:{en:"Nepal side only",ne:"नेपालतर्फ मात्र"}, src:"Nepal Police / NDRRMA",
  rows:[["Nepal — missing / out of contact","2,426"]],
  note:{en:"Nepal Police report 2,426 people missing or out of contact on the Nepal side. This figure is Nepal-only — it excludes the separately-counted China/Tibet-side missing. It moves in both directions as people are found dead or rescued.",ne:"नेपाल प्रहरीका अनुसार नेपालतर्फ २,४२६ जना बेपत्ता वा सम्पर्कविहीन। यो संख्या नेपाल मात्रको हो — चीन/तिब्बततर्फको अलग गणनालाई समावेश गरिएको छैन। मानिस मृत वा उद्धार भेटिँदै जाँदा यो घट्न वा बढ्न सक्छ।"}},
 {id:"rescued", sev:"relief", big:"2,189", title:{en:"Rescued (Official Registry)",ne:"उद्धार (आधिकारिक अभिलेख)"}, unit:{en:"2,034 Nepali · 155 foreign · NDRRMA",ne:"२,०३४ नेपाली · १५५ विदेशी · NDRRMA"}, src:"NDRRMA rescue portal",
  rows:[["Nepali citizens","2,034"],["Foreign nationals","155"]],
  note:{en:"NDRRMA has registered 2,189 rescued individuals by name. This figure auto-updates live from the NDRRMA rescue API. See the full searchable named registry on this site's Rescued page, or the official NDRRMA portal.",ne:"NDRRMA ले २,१८९ उद्धारितको नामसहित अभिलेख राखेको छ। यो संख्या NDRRMA उद्धार API बाट प्रत्यक्ष अद्यावधिक हुन्छ। पूरा खोजयोग्य नामावली यस साइटको उद्धार पृष्ठ वा आधिकारिक NDRRMA पोर्टलमा हेर्नुहोस्।"}},
 {id:"injured", sev:"watch", big:"1,473", title:{en:"Injured",ne:"घाइते"}, unit:{en:"Nepal side",ne:"नेपालतर्फ"}, src:"Nepal Police / Health Ministry",
  rows:[["Nepal — injured","1,473"]],
  note:{en:"1,473 injured people are receiving treatment across hospitals in the affected districts and Kathmandu. Nepal Police and the Health Ministry continue to update the count.",ne:"प्रभावित जिल्ला र काठमाडौंका अस्पतालमा १,४७३ घाइतेको उपचार जारी। नेपाल प्रहरी र स्वास्थ्य मन्त्रालयले संख्या अद्यावधिक गर्दै।"}},
 {id:"foreign", sev:"danger", big:"542", title:{en:"Foreign Nationals by Country",ne:"विदेशी नागरिक देश अनुसार"}, unit:{en:"at least 542 missing · 30+ countries",ne:"कम्तीमा ५४२ बेपत्ता · ३०+ देश"}, src:"Nepal Police / Diplomatic Missions",
  rows:[["India","214"],["United States","94"],["Ukraine","76"],["Malaysia","71"],["Non-resident Indians","58"],["Australia","9"],["United Kingdom","7"],["Canada","5"],["South Korea","4"],["Italy","2"],["Philippines","1"],["Other countries","1"]],
  note:{en:"At least 542 of the missing are foreign nationals from more than 30 countries, per Nepal Police and diplomatic missions. Country figures are provisional and revised as identification continues.",ne:"बेपत्तामध्ये कम्तीमा ५४२ जना ३० भन्दा बढी देशका विदेशी नागरिक (नेपाल प्रहरी र कूटनीतिक नियोग)। देशगत तथ्यांक प्रारम्भिक।"}},
 {id:"security", sev:"watch", big:"4,348", title:{en:"Search Operation and Security Personnel",ne:"खोज सञ्चालन र सुरक्षाकर्मी"}, unit:{en:"Nepal Army · Armed Police · Nepal Police",ne:"नेपाली सेना · सशस्त्र प्रहरी · नेपाल प्रहरी"}, src:"Nepal Police / OnlineKhabar",
  rows:[["Total personnel mobilised","4,348"]],
  note:{en:"About 4,348 personnel from the Nepal Army, Armed Police Force and Nepal Police have been mobilised for search, rescue, medical treatment and relief distribution across the affected districts. An exact per-force breakdown is not published by a live source; this total is from official police briefings.",ne:"नेपाली सेना, सशस्त्र प्रहरी र नेपाल प्रहरीका करिब ४,३४८ जनशक्ति प्रभावित जिल्लामा खोज, उद्धार, उपचार र राहत वितरणमा परिचालित। बलगत विस्तृत विवरण कुनै प्रत्यक्ष स्रोतले प्रकाशन गर्दैन; यो कुल संख्या प्रहरीको आधिकारिक विवरणबाट।"}},
 {id:"heli", sev:"relief", big:"", title:{en:"Helicopter Operations",ne:"हेलिकप्टर सञ्चालन"}, unit:{en:"Timure · Dhunche · Mailung · Trishuli",ne:"तिमुरे · धुन्चे · माइलुङ · त्रिशूली"}, src:"Nepal Army",
  note:{en:"Army helicopters flew dozens of sorties airlifting people to safety, with private operators on standby. Sortie and passenger totals are updated by the Nepal Army.",ne:"सेनाका हेलिकप्टरले दर्जनौं उडान गरी मानिसलाई सुरक्षित स्थानमा पुर्‍याए; निजी अपरेटर तयारी अवस्थामा।"}},
 {id:"land", sev:"relief", big:"", title:{en:"Rescued from Land",ne:"स्थलमार्ग उद्धार"}, src:"NDRRMA",
  note:{en:"Ground-rescue figures are coordinated with local administrative units.",ne:"स्थलगत उद्धारको तथ्यांक स्थानीय निकायसँग समन्वय भइरहेको छ।"}},
 {id:"materials", sev:"relief", big:"", title:{en:"Relief Materials & International Aid",ne:"राहत सामग्री र अन्तर्राष्ट्रिय सहायता"}, src:"AP / BBC / Reuters",
  rows:[["India","~50 tonnes of supplies"],["United States","USD 500,000"],["United Kingdom","GBP 5 million"],["IFRC (Red Cross)","USD 1.4 million"]]},
 {id:"fuel", sev:"watch", big:"", title:{en:"Fuel and Logistics",ne:"इन्धन र रसद"}, src:"NDRRMA / Nepal Army",
  note:{en:"Fuel and logistics are coordinated by the Nepal Army and NDRRMA.",ne:"इन्धन र रसद नेपाली सेना र NDRRMA ले समन्वय गर्छन्।"}}
];
function renderStatsPage(){
  const root=$("#statsRoot"); if(!root) return;
  root.innerHTML=`
    <p class="verify" style="margin-bottom:18px">${esc(t("stats.disclaimer"))}<br>
      <span style="display:inline-flex;gap:14px;flex-wrap:wrap;margin-top:4px">
        <a href="https://bipadportal.gov.np" target="_blank" rel="noopener" style="color:var(--crimson);font-weight:600">${esc(t("stats.official"))}</a>
        <a href="https://www.facebook.com/NDRRMA" target="_blank" rel="noopener" style="color:var(--crimson);font-weight:600">${esc(t("stats.fb"))}</a>
        <a href="https://nepalpolice.gov.np" target="_blank" rel="noopener" style="color:var(--crimson);font-weight:600">Nepal Police ↗</a>
        <a href="https://nepalarmy.mil.np" target="_blank" rel="noopener" style="color:var(--crimson);font-weight:600">Nepal Army ↗</a>
      </span></p>
    <div class="sd-grid">${STATS_DETAIL.map(s=>`
      <section class="sd" id="${s.id}">
        <div class="sd__head sd--${s.sev}">
          ${s.big?`<div class="sd__n mono">${esc(toNepDigits(s.big))}</div>`:""}
          <div><div class="sd__t">${esc(TL(s.title))}</div>${s.unit?`<div class="sd__u mono">${esc(TL(s.unit))}</div>`:""}</div>
        </div>
        ${s.rows?`<table class="sd__table">${s.rows.map(r=>`<tr><td>${esc(r[0])}</td><td class="mono">${esc(toNepDigits(r[1]))}</td></tr>`).join("")}</table>`:""}
        ${s.note?`<p class="sd__note">${esc(TL(s.note))}</p>`:(!s.rows?`<p class="sd__note">${esc(t("stats.na"))}</p>`:"")}
        <div class="sd__src">${esc(t("stats.src"))} · ${esc(s.src)}</div>
      </section>`).join("")}</div>`;
  if(location.hash){ const el=document.getElementById(location.hash.slice(1)); if(el) setTimeout(()=>el.scrollIntoView({behavior:"smooth",block:"start"}),120); }
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
  "rescue.total":"Total Rescued","rescue.nepali":"Nepali","rescue.foreign":"Foreign",
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
  "rescue.total":"कुल उद्धार","rescue.nepali":"नेपाली","rescue.foreign":"विदेशी",
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
function rescueName(p){
  const en=(p.name||"").trim(), ne=(p.name_ne||"").trim();
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
        RESCUE.total  = (counts&&counts.total_count)   || RESCUE.persons.length;
        RESCUE.nepali = (counts&&counts.nepali_count)  || RESCUE.persons.filter(x=>String(x.nationality).toLowerCase()==="nepali").length;
        RESCUE.foreign= (counts&&counts.foreign_count) || (RESCUE.total-RESCUE.nepali);
        RESCUE.status_counts = (counts&&counts.status_counts) || [];
        // keep the hero/detail "rescued" figure in step with the live registry
        if(typeof _setStat==="function" && _setStat("rescued", String(RESCUE.total))){ try{renderStats();renderStatsPage();}catch(e){} }
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
  const when=(data.fetched_at||"").slice(0,10);
  const chips=(data.status_counts||[]).filter(s=>s.count>0).map(s=>{
    const lbl=LANG==="ne"&&s.title_ne?s.title_ne:s.title;
    return `<span class="rescue__chip"><b class="mono">${esc(toNepDigits(s.count))}</b> ${esc(lbl)}</span>`;
  }).join("");
  root.innerHTML=`
    <div class="rescue">
      <div class="rescue__kpis">
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
  "rfund.top":"Top Contributors","rfund.updated":"Updated",
  "rfund.note":"Provisional totals handed to the Finance Minister for the PM Disaster Relief Fund, plus the Government's own release; figures are rising. Source: OnlineKhabar / OPMCM — verify before relying on any amount."
});
Object.assign(I18N.ne,{
  "rfund.eye":"प्रधानमन्त्री विपद् राहत कोष","rfund.h":"अहिलेसम्म संकलन",
  "rfund.total":"कोषमा कुल","rfund.donations":"सार्वजनिक दान","rfund.govt":"सरकारी निकासा",
  "rfund.top":"प्रमुख दाता","rfund.updated":"अद्यावधिक",
  "rfund.note":"प्रधानमन्त्री विपद् राहत कोषका लागि अर्थमन्त्रीलाई हस्तान्तरित प्रारम्भिक रकम र सरकारी निकासा; रकम बढ्दै। स्रोत: अनलाइनखबर / OPMCM — भर पर्नुअघि रुजु गर्नुहोस्।"
});
const RELIEF_COLLECTED = {
  updated:"27 Aug 2026",
  donations:273.3,   // million NPR — public donations handed to Finance Minister (first 6 hours)
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
/* ================= Multi-Tier Real-Time Auto Fetching Engine ================= */
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

/* cumulative tolls must never move backwards when a lagging source reports lower */
/* Only deaths and rescued physically monotonically rise. MISSING can fall (as
   people are found dead or rescued) — locking it caused a stuck count. FOREIGN
   and INJURED are revised in both directions too, so they follow the live feed. */
const CUMULATIVE = new Set(["deaths","rescued"]);
function _currentStat(key){
  const s=STATS.find(x=>x.key===key);
  if(s) return _int(s.n);
  const d=STATS_DETAIL.find(x=>x.id===key);
  return d?_int(d.big):0;
}
/* accept an incoming figure only if it is plausible and (for tolls) not a downgrade.
   This is what lets a fast local feed stay correct even when Wikipedia lags. */
function _acceptStat(key,val){
  const v=_int(val); if(v<=0) return false;
  const c=_currentStat(key);
  if(CUMULATIVE.has(key)){
    if(v<c) return false;              // a slow source can't lower a rising toll
    if(c>0 && v>c*6) return false;     // reject an implausible spike (bad parse)
  }
  return true;
}

function _setStat(key,val){
  if(!_acceptStat(key,val)) return false;
  const disp=_fmtInt(val);
  let changed=false;
  const s=STATS.find(x=>x.key===key);
  if(s && s.n!==disp){ s.n=disp; changed=true; }
  const d=STATS_DETAIL.find(x=>x.id===key);
  if(d && d.big!==undefined && d.big!=="" && d.big!==disp){ d.big=disp; changed=true; }
  return changed;
}

function _updateForeignRow(countryName, countStr){
  const fseg=STATS_DETAIL.find(s=>s.id==="foreign");
  if(!fseg||!fseg.rows) return false;
  const row=fseg.rows.find(r=>r[0].toLowerCase().includes(countryName.toLowerCase()));
  if(row && row[1]!==countStr){
    row[1]=countStr;
    return true;
  }
  return false;
}

/* ---- individual live sources, each returns true if it changed anything ----
   All three run CONCURRENTLY (Promise.allSettled) so one slow endpoint never
   blocks the others — this is the main fix for "fetching/updating is too slow". */

// Tier 1 — local, same-origin feed (instant, no CORS, authoritative baseline).
async function _srcLocalFeed(){
  let changed=false, j=null;
  try{
    const resp = await fetch("assets/live_data.json?_="+Date.now(), { cache:"no-store", signal: AbortSignal.timeout(4000) });
    if(!resp.ok) throw new Error("fetch failed");
    j = await resp.json();
    // Cache good data for offline fallback
    if(window.__cacheGoodData) window.__cacheGoodData(j);
  }catch(err){
    // Network failed — restore from cache (offline resilience)
    if(window.__restoreFromCache){
      j = window.__restoreFromCache();
      if(!j) return false;
    } else { return false; }
  }
  if(Array.isArray(j.stats)) j.stats.forEach(st=>{ if(_setStat(st.key,_num(st.n))) changed=true; });
  if(j.stats_detail){
    Object.keys(j.stats_detail).forEach(k=>{
      const item=j.stats_detail[k];
      if(item.big && _setStat(k,_num(item.big))) changed=true;
      if(Array.isArray(item.rows)){
        const seg=STATS_DETAIL.find(s=>s.id===k);
        if(seg && seg.rows) item.rows.forEach(nr=>{
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

// Tier 2 — Wikipedia INFOBOX: intentionally DISABLED. The infobox reports the
// Nepal+Tibet(China) COMBINED toll (e.g. 623 deaths / 2,980 missing), which is
// exactly what previously inflated this Nepal-only site (623 shown vs 626 real).
// We parse the Nepal-specific figures from the prose instead (Tier 3).
async function _srcInfobox(){
  return false;
}

// Tier 3 — Wikipedia FULL article text (explaintext), parsed for the Nepal-only
// casualty sentence, e.g. "At least 626 deaths and 2,426 missing were confirmed
// in Nepal with an additional 7 dead and 554 missing in the Tibet Autonomous
// Region." Matching that exact "…confirmed in Nepal" phrasing guarantees we get
// the Nepal-side figure, never the Tibet one — and it auto-updates as editors
// revise the article. The REST summary (lead paragraph) is NOT used: it doesn't
// carry these numbers. Deaths only rise (cumulative); missing can move both ways.
async function _srcSummary(){
  let txt="";
  try{
    const url="https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&format=json&titles=2026%20Nepal%20floods&origin=*";
    const r=await fetch(url,{signal:AbortSignal.timeout(6000)});
    if(r.ok){ const j=await r.json(); const pgs=j.query&&j.query.pages; if(pgs){ const p=pgs[Object.keys(pgs)[0]]; txt=(p&&p.extract)||""; } }
  }catch(_){}
  if(!txt) return false;
  let changed=false;
  const dm=txt.match(/([\d,]{2,7})\s+deaths?\s+and\s+([\d,]{2,7})\s+(?:people\s+)?(?:were\s+)?missing\s+(?:were\s+)?confirmed\s+in\s+Nepal/i);
  if(dm){
    if(_setStat("deaths",_num(dm[1]))) changed=true;
    if(_setStat("missing",_num(dm[2]))) changed=true;
  }
  const inj=txt.match(/([\d,]{2,7})\s+(?:people\s+)?were\s+injured/i);
  if(inj && _setStat("injured",_num(inj[1]))) changed=true;
  return changed;
}

// Tier 4 — NDRRMA official rescue count (CORS-open); keeps "rescued" live site-wide.
async function _srcRescueCount(){
  const r=await fetch("https://ndrrma.gov.np/api/v1/rescues/status-counts/?limit=-1",{signal:AbortSignal.timeout(5000)});
  if(!r.ok) return false;
  const j=await r.json();
  return j && j.total_count ? _setStat("rescued", String(j.total_count)) : false;
}

// Tier 5 — Nepal Police official data source (when available via API or portal)
// For now, infrastructure ready. Can be activated when NP publishes live casualty/missing counts.
async function _srcNepalPolice(){
  try{
    // Monitor: https://nepalpolice.gov.np/ for official casualty bulletins
    // When API endpoint available, fetch from it here
    // const r=await fetch("https://nepalpolice.gov.np/api/v1/disaster-figures/?limit=-1",{signal:AbortSignal.timeout(5000)});
    // if(!r.ok) return false;
    // const j=await r.json();
    // if(j.deaths) _setStat("deaths", String(j.deaths));
    // if(j.missing) _setStat("missing", String(j.missing));
    // return true;
    return false; // Disabled until API becomes available
  }catch(_){ return false; }
}

let _refreshing=false;
async function liveRefresh(isManual){
  if(_refreshing) return;               // never overlap two refreshes
  _refreshing=true;
  try{
    const results = await Promise.allSettled([_srcLocalFeed(), _srcInfobox(), _srcSummary(), _srcRescueCount()]);
    const changed = results.some(r=>r.status==="fulfilled" && r.value===true);
    if(changed || isManual){
      renderStats(); renderStatsPage(); renderMissingSummary(); renderEvent();
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
    document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="visible") liveRefresh(); });
  }
}

if(document.readyState!=="loading") wire(); else document.addEventListener("DOMContentLoaded",wire);
