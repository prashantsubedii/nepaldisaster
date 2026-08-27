/* =========================================================================
   NepalDisaster.com — shared data + i18n + rendering
   All figures are provisional and attributed. Helpline & relief-fund data are
   transcribed from official NDRRMA / PMO posters — verify before acting.
   ========================================================================= */
"use strict";

/* -------------------- EVENT + STATS (provisional, sourced) -------------------- */
const EVENT = {
  code:"FL-2026-0826",
  since:"2026-08-26T08:37:00+05:45",
  title:{en:"2026 Nepal Floods", ne:"२०२६ नेपाल बाढी"},
  region:{en:"Rasuwa · Nuwakot · Trishuli corridor", ne:"रसुवा · नुवाकोट · त्रिशूली कोरिडोर"},
  eas:{en:"Glacial flood on the Trishuli corridor. Search and relief ongoing.",
       ne:"त्रिशूली कोरिडोरमा हिमनदी बाढी। खोज तथा राहत जारी।"}
};
/* provisional, NDRRMA / Nepal Police via international agencies, 27–28 Aug 2026.
   Live-refreshed at runtime from the continuously-updated event article. */
let STATS = [
  {key:"deaths",  n:"388", cls:"hstat--death"},
  {key:"missing", n:"1,080"},
  {key:"foreign", n:"638"},
  {key:"rescued", n:"425", cls:"hstat--rescue"}
];

/* -------------------- TICKER -------------------- */
const TICKER = [
  {src:"USGS", en:"Ice avalanche from a glacier — not an earthquake — triggered the surge",
   ne:"भूकम्प होइन, हिमनदीको हिउँ पहिरोले बाढीको भल निम्त्यायो — यूएसजीएस"},
  {src:"GOVT", en:"About 19 bridges and 40 km of highway swept away on the Trishuli corridor",
   ne:"त्रिशूली कोरिडोरमा करिब १९ पुल र ४० कि.मि. सडक बगायो"},
  {src:"NEA", en:"Six hydropower plants damaged, incl. Rasuwagadhi, Chilime, Trishuli 3A/3B",
   ne:"रसुवागढी, चिलिमे, त्रिशूली ३ए/३बी लगायत ६ जलविद्युत् आयोजना क्षतिग्रस्त"},
  {src:"ARMY", en:"Nepal Army reports at least 88 people rescued so far",
   ne:"नेपाली सेनाले अहिलेसम्म कम्तीमा ८८ जनालाई उद्धार गरेको जनाएको"},
  {src:"AID", en:"India sends ~50 tonnes of aid; US pledges USD 500,000; UN support underway",
   ne:"भारतले करिब ५० टन सहायता पठायो; अमेरिकाले ५ लाख डलर; संयुक्त राष्ट्रसंघको सहयोग"}
];

/* -------------------- NEWS / BULLETINS -------------------- */
const NEWS = [
  {sev:"danger", tag:{en:"Flood",ne:"बाढी"}, time:"26–27 Aug 2026",
   title:{en:"Glacial collapse triggers deadly flash flood in Rasuwa; hundreds missing",
          ne:"रसुवामा हिमनदी भत्किँदा घातक बाढी; सयौं बेपत्ता"},
   body:{en:"A surge down the Lhende Khola / Trishuli hit Timure, Syafrubesi and Betrawati. Tolls are provisional and rising as access is restored.",
         ne:"ल्हेन्डे खोला/त्रिशूलीको भलले तिमुरे, स्याफ्रुबेसी र बेत्रावती प्रभावित। पहुँच खुल्दै जाँदा तथ्यांक बढ्दै।"},
   src:"AP / Reuters / The Kathmandu Post"},
  {sev:"watch", tag:{en:"Cause",ne:"कारण"}, time:"26 Aug 2026",
   title:{en:"USGS: an ice avalanche, not an earthquake, caused the flood",
          ne:"यूएसजीएस: बाढी भूकम्पले होइन, हिउँ पहिरोले"},
   body:{en:"US Geological Survey attributes the surge to a large section of glacier that fell roughly 40 miles north of Kathmandu.",
         ne:"काठमाडौंबाट करिब ४० माइल उत्तरमा हिमनदीको ठूलो भाग खस्दा भल आएको यूएसजीएसको विश्लेषण।"},
   src:"USGS / GFZ"},
  {sev:"danger", tag:{en:"Damage",ne:"क्षति"}, time:"27 Aug 2026",
   title:{en:"19 bridges and ~40 km of road gone; six hydropower plants hit",
          ne:"१९ पुल र करिब ४० कि.मि. सडक ध्वस्त; ६ जलविद्युत् आयोजना प्रभावित"},
   body:{en:"Road and bridge damage was estimated at about Rs 15 billion; several Trishuli-corridor plants were reported damaged.",
         ne:"सडक र पुल क्षति करिब १५ अर्ब रुपैयाँ अनुमान; त्रिशूली कोरिडोरका आयोजना क्षतिग्रस्त।"},
   src:"Govt. of Nepal / The Kathmandu Post"},
  {sev:"relief", tag:{en:"Rescue",ne:"उद्धार"}, time:"27 Aug 2026",
   title:{en:"Army, Armed Police and Police mount search along the Trishuli",
          ne:"सेना, सशस्त्र र नेपाल प्रहरीद्वारा त्रिशूली किनारमा खोजी"},
   body:{en:"Helicopters and medical teams were deployed; the Nepal Army reported at least 88 people rescued.",
         ne:"हेलिकप्टर र चिकित्सा टोली परिचालन; सेनाले कम्तीमा ८८ उद्धार गरेको।"},
   src:"Nepal Army / Nepal Police"},
  {sev:"relief", tag:{en:"Aid",ne:"सहायता"}, time:"27 Aug 2026",
   title:{en:"India, US and UN mobilise assistance",
          ne:"भारत, अमेरिका र संयुक्त राष्ट्रसंघको सहायता परिचालन"},
   body:{en:"India sent about 50 tonnes of humanitarian aid; the US pledged USD 500,000; the UN offered support.",
         ne:"भारतले करिब ५० टन सहायता; अमेरिकाले ५ लाख डलर; राष्ट्रसंघको सहयोगको प्रतिबद्धता।"},
   src:"BBC / Reuters"},
  {sev:"danger", tag:{en:"Cross-border",ne:"सीमापार"}, time:"26 Aug 2026",
   title:{en:"Gyirong Port destroyed on the China side; casualties reported",
          ne:"चीनतर्फ ग्यिरोङ बन्दरगाह ध्वस्त; क्षतिको विवरण"},
   body:{en:"The flood also hit Gyirong County, Tibet, where authorities deployed some 800 emergency workers.",
         ne:"बाढीले तिब्बतको ग्यिरोङ पनि प्रभावित; करिब ८०० उद्धारकर्मी परिचालन।"},
   src:"Xinhua / The Guardian"}
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
  "hero.note":"Provisional figures from Nepal and Chinese authorities via international agencies (26–27 Aug 2026). Counts vary by source and are being revised — not final. Verify against official NDRRMA / Nepal Police bulletins.",
  "hero.help":"Emergency Helplines","hero.report":"Report an Incident",
  "stat.deaths":"Confirmed Deaths","stat.missing":"Reported Missing","stat.foreign":"Foreign Nationals Missing","stat.rescued":"Rescued",
  "stat.sub.deaths":"Nepal · provisional","stat.sub.missing":"incl. 517 foreign","stat.sub.foreign":"tourists & NRNs","stat.sub.rescued":"by air · NDRRMA","stat.tap":"Tap for breakdown →",
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
  "hero.note":"नेपाल र चीनका अधिकारीहरूबाट अन्तर्राष्ट्रिय संस्थामार्फत प्राप्त प्रारम्भिक तथ्यांक (२६–२७ अगस्ट २०२६)। स्रोत अनुसार फरक पर्न सक्छ र संशोधन हुँदैछ — अन्तिम होइन। आधिकारिक विवरणसँग रुजु गर्नुहोस्।",
  "hero.help":"आपत्कालीन हेल्पलाइन","hero.report":"घटना जानकारी दिनुहोस्",
  "stat.deaths":"पुष्टि भएका मृत्यु","stat.missing":"बेपत्ता","stat.foreign":"बेपत्ता विदेशी नागरिक","stat.rescued":"उद्धार",
  "stat.sub.deaths":"नेपाल · प्रारम्भिक","stat.sub.missing":"५१७ विदेशीसहित","stat.sub.foreign":"पर्यटक र गैरआवासीय","stat.sub.rescued":"हवाई · NDRRMA","stat.tap":"विस्तृत विवरण →",
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

function setLang(lang){
  LANG = (lang==="ne")?"ne":"en";
  try{localStorage.setItem("nd_lang",LANG);}catch(e){}
  document.documentElement.setAttribute("lang",LANG);
  $$("[data-i18n]").forEach(el=>{ el.textContent = t(el.getAttribute("data-i18n")); });
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
function tickClocks(){const d=nptNow();$$("[data-clock]").forEach(e=>e.textContent=fmt(d));$$("[data-elapsed]").forEach(e=>e.textContent=elapsedStr());}

/* ---- phone icon ---- */
const PH='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.6a2 2 0 0 1-.5 2.1L8.1 9.6a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.6 2.6.7a2 2 0 0 1 1.7 2Z"/></svg>';

/* ---- renderers (guarded by element presence) ---- */
function renderTicker(){
  const track=$("#tickerTrack"); if(!track) return;
  const items=TICKER.map(x=>`<span class="ticker__item"><span class="src">${esc(x.src)}</span>${esc(TL(x))}</span>`).join("");
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
        <span class="hl__ic" aria-hidden="true">${h.logo?`<img src="${esc(h.logo)}" alt="" onerror="this.parentNode.innerHTML=window.__hlfallback(this)">`:hlIcon(h)}</span>
        <span class="hl__meta"><span class="hl__name">${esc(TL(h.name))}</span>${h.desc?`<span class="hl__desc">${esc(TL(h.desc))}</span>`:''}</span>
      </div>
      <a class="hl__tel mono" href="tel:${esc(h.tel)}">${PH}${esc(h.tel)}</a></div>`;
  if(nat) nat.innerHTML=HELPLINES.national.map(cardN).join("");
  if(dis) dis.innerHTML=HELPLINES.district.map(cardN).join("");
}
window.__hlfallback=img=>{const h=img.closest(".hl");const crit=h&&h.classList.contains("hl--crit");return (crit?ICONS.police:ICONS.gov);};
const THUMB_PH='<div class="ph"><svg viewBox="0 0 48 48"><path d="M4 34c4-6 8-6 12 0s8 6 12 0 8-6 12 0"/><path d="M4 24c4-6 8-6 12 0s8 6 12 0 8-6 12 0" opacity=".5"/><path d="M10 14 24 6l14 8"/></svg></div>';
function renderNews(limit){
  const g=$("#newsGrid"); if(!g) return;
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
function loadMissing(){ try{return JSON.parse(localStorage.getItem("nd_missing")||"[]");}catch(e){return [];} }
function saveMissing(a){ try{localStorage.setItem("nd_missing",JSON.stringify(a));}catch(e){} }
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
  renderNotifs(); renderGallery(); renderFullGallery(); renderNewsPage(); renderStatsPage(); renderMissingSummary(); setSync();
}

/* ---- global wiring ---- */
function wire(){
  // lang toggle
  $$(".lang button").forEach(b=>b.addEventListener("click",()=>setLang(b.dataset.lang)));
  // mobile nav (with X icon morph and outside-click dismiss)
  const burger=$("#burger"), nav=$("#navInner");
  function setBurger(open){
    if(!burger||!nav) return;
    nav.classList.toggle("open", open);
    burger.classList.toggle("is-active", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close Menu" : "Menu");
    burger.innerHTML = open
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 6 6 18M6 6l12 12"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>';
  }
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
  liveRefresh(); setInterval(liveRefresh, 30000);               // live auto-refresh every 60s
  setupManualSync();
  setInterval(()=>{ _eventImgs=null; renderGallery(); renderFullGallery(); },3600000); // extra images refresh hourly (stable set stays)
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
  "news.read":"Read full bulletin",
  "notif.h":"Alerts","notif.eye":"Signal Feed","notif.clear":"Clear all","notif.empty":"No active alerts.","notif.count":"active",
  "glof.tag":"GLOF Watch",
  "gallery.eye":"From the Affected Areas","gallery.h":"Ground Gallery","gallery.load":"Loading photos…","gallery.none":"Photos could not be loaded right now. See the official article.","gallery.loadall":"View all photos →","page.gallery.h":"Photo Gallery","page.gallery.p":"Photographs from the affected areas, from published news sources and Wikimedia. Verify context independently.",
  "page.news.h":"Live Bulletins","page.news.p":"Detailed reporting on the current disaster, compiled from published and official sources. Verify independently.",
  "news.back":"← All bulletins","news.source":"Read at original source ↗","news.overview":"Situation overview","news.overview.src":"Live from Wikipedia · 2026 China–Nepal floods",
  "hist.readmore":"Read full article ↗","hist.loading":"Loading details…","hist.tap":"Tap for details",
  "relief.scan":"Scan to donate","relief.fonepay":"Fonepay — PM Disaster Relief Fund","relief.fonepay.p":"Scan this Fonepay QR with any Nepali banking or wallet app to donate to the Prime Minister's relief fund."
});
Object.assign(I18N.ne,{
  "news.read":"पूरा बुलेटिन पढ्नुहोस्",
  "notif.h":"अलर्टहरू","notif.eye":"सिग्नल फिड","notif.clear":"सबै हटाउनुहोस्","notif.empty":"कुनै सक्रिय अलर्ट छैन।","notif.count":"सक्रिय",
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
function activeNotifs(){ return NOTIFS.filter(n=>!NOTIF_CLEARED.has(n.id)); }
function clearNotifs(){ activeNotifs().forEach(n=>NOTIF_CLEARED.add(n.id)); try{localStorage.setItem("nd_cleared",JSON.stringify([...NOTIF_CLEARED]));}catch(e){} renderNotifs(); }

/* real source links + fuller copy for the news detail page */
const NEWS_URLS=[
 "https://thehimalayantimes.com/environment/sudden-flood-from-china-hits-rasuwa-downstream-alert-issued",
 "https://www.theweek.in/news/world/2026/08/26/what-caused-the-nepal-flash-flood-deluge-washes-away-village-near-tibet-border-in-rasuwa.html",
 "https://www.spotlightnepal.com/2026/08/26/rasuwa-flood-transboundary-wake-call/",
 "https://en.wikipedia.org/wiki/2026_China%E2%80%93Nepal_floods",
 "https://en.wikipedia.org/wiki/2026_China%E2%80%93Nepal_floods",
 "https://www.borderlens.com/2026/08/26/massive-flash-flood-from-tibet-devastates-nepals-rasuwa-district-nepals-deepening-climate-challenge/"
];
const NEWS_LONG=[
 {en:"A wall of water surged down the Bhotekoshi/Lhende Khola into the Trishuli early on 26 August, sweeping away border settlements such as Timure and Syafrubesi before racing downstream. Search teams reached cut-off areas over the following days; casualty and missing figures remained provisional and were revised upward as access was restored.",
  ne:"२६ अगस्ट बिहान भोटेकोशी/ल्हेन्डे खोलाको भल त्रिशूलीमा पस्दा तिमुरे र स्याफ्रुबेसीजस्ता सीमावर्ती बस्ती बगायो। खोज टोली दिनहरूमा अवरुद्ध क्षेत्रमा पुगे; पहुँच खुल्दै जाँदा हताहती र बेपत्ताको संख्या बढ्दै गयो।"},
 {en:"Scientists at USGS and GFZ concluded the surge was most consistent with an ice avalanche/glacial process rather than an earthquake — a large section of glacier is believed to have fallen roughly 40 miles north of Kathmandu. Officials were also investigating a glacial lake outburst flood (GLOF) on the Tibet side.",
  ne:"यूएसजीएस र जीएफजेडका वैज्ञानिकहरूले यो भल भूकम्पभन्दा हिउँ पहिरो/हिमनदी प्रक्रियासँग बढी मिल्दो रहेको निष्कर्ष निकाले — काठमाडौंबाट करिब ४० माइल उत्तरमा हिमनदीको ठूलो भाग खसेको अनुमान। तिब्बततर्फ GLOF को पनि अनुसन्धान भइरहेको।"},
 {en:"Early estimates put damage to roads and bridges at around Rs 15 billion. At least 19 bridges and about 40 km of highway were destroyed, and six hydropower facilities along the Trishuli — including Rasuwagadhi, Chilime and Trishuli 3A/3B — were reported damaged, disrupting power and cross-border trade.",
  ne:"सुरुका अनुमानअनुसार सडक र पुलको क्षति करिब १५ अर्ब रुपैयाँ। कम्तीमा १९ पुल र करिब ४० कि.मि. राजमार्ग ध्वस्त; रसुवागढी, चिलिमे र त्रिशूली ३ए/३बी लगायत ६ जलविद्युत् आयोजना क्षतिग्रस्त।"},
 {en:"The Nepal Army, Armed Police Force and Nepal Police mounted a joint search-and-rescue operation, deploying helicopters and medical teams. The Army reported at least 88 people rescued as operations continued in difficult, weather-affected terrain.",
  ne:"नेपाली सेना, सशस्त्र प्रहरी बल र नेपाल प्रहरीले संयुक्त खोज तथा उद्धार सञ्चालन गरे; हेलिकप्टर र चिकित्सा टोली परिचालन। सेनाले कम्तीमा ८८ जना उद्धार गरेको जनायो।"},
 {en:"International assistance was mobilised: India dispatched about 50 tonnes of humanitarian aid, the United States pledged USD 500,000, and the United Nations offered support as relief camps and distribution were organised for displaced families.",
  ne:"अन्तर्राष्ट्रिय सहायता परिचालन भयो: भारतले करिब ५० टन मानवीय सहायता, अमेरिकाले ५ लाख डलर, र संयुक्त राष्ट्रसंघले सहयोगको प्रतिबद्धता जनायो।"},
 {en:"The flood also devastated Gyirong County in Tibet, where Gyirong Port — a key China–Nepal trade gateway — was reported destroyed. Chinese authorities deployed some 800 emergency workers, and hundreds of people were reported missing on the China side.",
  ne:"बाढीले तिब्बतको ग्यिरोङ काउन्टी पनि ध्वस्त बनायो; चीन–नेपाल व्यापारको प्रमुख नाका ग्यिरोङ बन्दरगाह ध्वस्त भएको जनाइयो। चिनियाँ अधिकारीले करिब ८०० उद्धारकर्मी परिचालन गरे।"}
];
NEWS.forEach((n,i)=>{n.url=NEWS_URLS[i]; n.long=NEWS_LONG[i];});

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
  const r=await fetch(u,{headers:{accept:"application/json"}}); if(!r.ok) throw 0;
  return r.json();
}

/* ---------- notifications ---------- */
const BELL='<svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>';
function injectChrome(){
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
      <div class="notif__bar"><span class="lbl"><span id="notifCount">0</span> <span data-i18n="notif.count">active</span></span><button class="notif__clear" id="notifClear" data-i18n="notif.clear">Clear all</button></div>
      <div class="notif__list" id="notifList"></div>`;
    document.body.appendChild(p);
    scrim.addEventListener("click",notifClose);
    $("#notifX").addEventListener("click",notifClose);
    $("#notifClear").addEventListener("click",clearNotifs);
    document.addEventListener("keydown",e=>{if(e.key==="Escape"&&$("#notif").classList.contains("open"))notifClose();});
  }
}
function notifOpen(){const p=$("#notif"),s=$("#scrim"); if(!p)return; p.classList.add("open");s.classList.add("open");p.setAttribute("aria-hidden","false");$("#notifX").focus();}
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
      <div class="nrow__src">SRC · ${esc(n.src)}</div>
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
 {id:"deaths", sev:"danger", big:"388", title:{en:"Confirmed Deaths",ne:"पुष्टि मृत्यु"}, unit:{en:"Nepal (provisional) · +3 China",ne:"नेपाल (प्रारम्भिक) · +३ चीन"}, src:"NDRRMA / Nepal Police",
  rows:[["Chitwan","122"],["Nawalparasi East","72"],["Dhading","32"],["Gorkha","25"],["Nawalparasi West","16"],["Tanahun","15"],["Nuwakot","14"],["Rasuwa","4"]],
  note:{en:"District-wise bodies recovered per NDRRMA situation reports. Identification ongoing downstream along Narayani corridor.",ne:"NDRRMA प्रतिवेदन अनुसार जिल्लागत उद्धारित शव। नारायणी कोरिडोरमा पहिचान कार्य जारी।"}},
 {id:"missing", sev:"danger", big:"1,080", title:{en:"Missing and Out of Contact",ne:"बेपत्ता तथा सम्पर्कविहीन"}, src:"NDRRMA",
  rows:[["Foreign nationals","638"],["Nepalis abroad (NRN) listed","138"],["Nepal Army personnel","44"],["Nepal Police personnel","28"],["Customs Office staff","15"],["Armed Police Force","13"],["Immigration staff","4"]]},
 {id:"rescued", sev:"relief", big:"425", title:{en:"Air & Ground Rescues",ne:"हवाई तथा स्थल उद्धार"}, unit:{en:"airlifted & evacuated from Timure · Dhunche · Mailung · Trishuli",ne:"तिमुरे · धुन्चे · माइलुङ · त्रिशूलीबाट उद्धार"}, src:"Nepal Army / NDRRMA",
  rows:[["Nepali citizens","362"],["Foreign nationals","63"]],
  note:{en:"Names of rescued and missing persons are released through NDRRMA and Nepal Police, not published here. Use the official registries below to trace a person.",ne:"उद्धार तथा बेपत्ता व्यक्तिका नाम NDRRMA र नेपाल प्रहरीमार्फत सार्वजनिक हुन्छन्, यहाँ होइन। खोजीका लागि तलका आधिकारिक स्रोत हेर्नुहोस्।"}},
 {id:"injured", sev:"watch", big:"94", title:{en:"Injured",ne:"घाइते"}, src:"NDRRMA",
  rows:[["Rasuwa","48"],["Dhading","6"],["Other districts","40"]]},
 {id:"foreign", sev:"danger", big:"638", title:{en:"Foreign Nationals by Country",ne:"विदेशी नागरिक देश अनुसार"}, unit:{en:"missing or out of contact (600+)",ne:"बेपत्ता वा सम्पर्कविहीन (६००+)"}, src:"NDRRMA / Diplomatic Missions",
  rows:[["India","174"],["United States","84"],["Ukraine","68"],["Malaysia","62"],["Non-resident Indians","49"],["Australia","46"],["United Kingdom","41"],["Canada","32"],["South Korea","16"],["Italy","8"],["Philippines","4"],["Japan · Netherlands · Germany · France","reported"]]},
 {id:"search", sev:"watch", big:"4,000", title:{en:"Search Operation and Security Personnel",ne:"खोज सञ्चालन र सुरक्षाकर्मी"}, unit:{en:"Nepal Army personnel mobilised",ne:"नेपाली सेना परिचालित"}, src:"Nepal Army / NDRRMA",
  rows:[["Nepal Army","~4,000"],["Armed Police Force","deployed"],["Nepal Police","deployed"],["Helicopters","~5 + private on standby"],["Tibet (China) side","~800 workers · 150 vehicles"]],
  note:{en:"Nepal Army mobilised about 4,000 personnel for search, rescue, medical treatment and relief distribution, alongside the Armed Police Force and Nepal Police.",ne:"नेपाली सेनाले करिब ४,००० जनशक्ति खोज, उद्धार, उपचार र राहत वितरणमा परिचालन गर्‍यो।"}},
 {id:"heli", sev:"relief", big:"425", title:{en:"Helicopter Rescue",ne:"हेलिकप्टर उद्धार"}, unit:{en:"airlifted to safety",ne:"सुरक्षित स्थानमा"}, src:"Nepal Army",
  rows:[["Nepali","362"],["Foreign","63"]],
  note:{en:"Army helicopters in active operation with private operators on standby; dozens of sorties flown.",ne:"सेनाका हेलिकप्टर सक्रिय परिचालनमा; निजी अपरेटर तयारी अवस्थामा।"}},
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

function _setStat(key,val){
  if(!val) return false;
  let changed=false;
  const s=STATS.find(x=>x.key===key);
  if(s && s.n!==val){ s.n=val; changed=true; }
  const d=STATS_DETAIL.find(x=>x.id===key);
  if(d && d.big && d.big!==val){ d.big=val; changed=true; }
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

async function liveRefresh(isManual){
  let changed=false;

  // 1. Primary Live Feed: assets/live_data.json
  try {
    const resp = await fetch("assets/live_data.json?_nocache=" + Date.now(), { signal: AbortSignal.timeout(3500) });
    if(resp.ok){
      const j = await resp.json();
      if(j.stats && Array.isArray(j.stats)){
        j.stats.forEach(st => {
          if(_setStat(st.key, _num(st.n))) changed=true;
        });
      }
      if(j.stats_detail){
        Object.keys(j.stats_detail).forEach(k=>{
          const item = j.stats_detail[k];
          if(item.big) { if(_setStat(k, _num(item.big))) changed=true; }
          if(item.rows && Array.isArray(item.rows)){
            const seg = STATS_DETAIL.find(s=>s.id===k);
            if(seg && seg.rows){
              item.rows.forEach(nr=>{
                const match = seg.rows.find(r=>r[0]===nr[0]);
                if(match && match[1]!==nr[1]){ match[1]=nr[1]; changed=true; }
              });
            }
          }
        });
      }
    }
  } catch(e) {}

  // 2. Secondary Live Source: Wikipedia infobox + regex parsing for quick updates
  try {
    const wt = await fetchInfobox("2026 Nepal floods");
    if(wt){
      const field = f => {
        const m = wt.match(new RegExp("\\|\\s*"+f+"\\s*=\\s*([^\\n]+)","i"));
        return m ? m[1] : "";
      };
      const parseNum = line => {
        const m = line.match(/([\d,]+)/);
        return m ? _num(m[1]) : null;
      };
      const dL = field("deaths")||field("fatalities");
      const mL = field("missing")||field("reported_missing");
      if(dL && _setStat("deaths", parseNum(dL))) changed=true;
      if(mL && _setStat("missing", parseNum(mL))) changed=true;
    }
  } catch(e) {}

  // 3. Extract foreign / Indian specifics if present in summary
  try {
    const w = await fetchWiki("2026 Nepal floods");
    const tExtract = (w && w.extract) || "";
    if(tExtract){
      const indM = tExtract.match(/([\d,]{2,4})\s*(?:Indian|Indians|from India)/i);
      if(indM && _updateForeignRow("India", indM[1])) changed=true;
      const forM = tExtract.match(/([\d,]{3,4})\s*(?:foreign|foreigners|tourists)/i);
      if(forM && _setStat("foreign", _num(forM[1]))) changed=true;
      const resM = tExtract.match(/([\d,]{2,4})\s*(?:rescued|airlifted)/i);
      if(resM && _setStat("rescued", _num(resM[1]))) changed=true;
    }
  } catch(e) {}

  if(changed || isManual){
    renderStats();
    renderStatsPage();
    renderMissingSummary();
    if(isManual){
      toast(LANG==="ne"?"तथ्यांक अद्यावधिक भयो (NDRRMA / Live)":"Latest disaster figures synced.", "crim");
    }
  }
  setSync(nptNow());
}

if(document.readyState!=="loading") wire(); else document.addEventListener("DOMContentLoaded",wire);
