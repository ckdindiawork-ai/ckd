#!/usr/bin/env python3
"""
India Geo Dataset Generator — CKD Kranti Dal

Produces 3 JSON files consumed by GeoPickerSheet:
  src/data/geo/states.json     — 28 states + 8 UTs (with ISO codes + Hindi)
  src/data/geo/districts.json  — ~720 districts grouped by state code
  src/data/geo/cities.json     — top ~500 cities for searchable city input

Data source: Government of India Local Government Directory (LGD) and Census
2011 — both public-domain / CC-BY datasets. Hindi names transliterated
following central-govt official Devanagari conventions.

Run: python3 scripts/build-geo.py
"""
import json
import os

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "src", "data", "geo")
os.makedirs(OUT_DIR, exist_ok=True)

# ============================================================================
# STATES + UNION TERRITORIES (36 total — ISO 3166-2:IN codes)
# ============================================================================
STATES = [
    # 28 States
    {"code": "AN", "name_en": "Andaman and Nicobar Islands", "name_hi": "अंडमान और निकोबार द्वीप समूह", "type": "UT"},
    {"code": "AP", "name_en": "Andhra Pradesh", "name_hi": "आंध्र प्रदेश", "type": "S"},
    {"code": "AR", "name_en": "Arunachal Pradesh", "name_hi": "अरुणाचल प्रदेश", "type": "S"},
    {"code": "AS", "name_en": "Assam", "name_hi": "असम", "type": "S"},
    {"code": "BR", "name_en": "Bihar", "name_hi": "बिहार", "type": "S"},
    {"code": "CH", "name_en": "Chandigarh", "name_hi": "चंडीगढ़", "type": "UT"},
    {"code": "CT", "name_en": "Chhattisgarh", "name_hi": "छत्तीसगढ़", "type": "S"},
    {"code": "DN", "name_en": "Dadra and Nagar Haveli and Daman and Diu", "name_hi": "दादरा और नगर हवेली और दमन और दीव", "type": "UT"},
    {"code": "DL", "name_en": "Delhi", "name_hi": "दिल्ली", "type": "UT"},
    {"code": "GA", "name_en": "Goa", "name_hi": "गोवा", "type": "S"},
    {"code": "GJ", "name_en": "Gujarat", "name_hi": "गुजरात", "type": "S"},
    {"code": "HR", "name_en": "Haryana", "name_hi": "हरियाणा", "type": "S"},
    {"code": "HP", "name_en": "Himachal Pradesh", "name_hi": "हिमाचल प्रदेश", "type": "S"},
    {"code": "JK", "name_en": "Jammu and Kashmir", "name_hi": "जम्मू और कश्मीर", "type": "UT"},
    {"code": "JH", "name_en": "Jharkhand", "name_hi": "झारखंड", "type": "S"},
    {"code": "KA", "name_en": "Karnataka", "name_hi": "कर्नाटक", "type": "S"},
    {"code": "KL", "name_en": "Kerala", "name_hi": "केरल", "type": "S"},
    {"code": "LA", "name_en": "Ladakh", "name_hi": "लद्दाख", "type": "UT"},
    {"code": "LD", "name_en": "Lakshadweep", "name_hi": "लक्षद्वीप", "type": "UT"},
    {"code": "MP", "name_en": "Madhya Pradesh", "name_hi": "मध्य प्रदेश", "type": "S"},
    {"code": "MH", "name_en": "Maharashtra", "name_hi": "महाराष्ट्र", "type": "S"},
    {"code": "MN", "name_en": "Manipur", "name_hi": "मणिपुर", "type": "S"},
    {"code": "ML", "name_en": "Meghalaya", "name_hi": "मेघालय", "type": "S"},
    {"code": "MZ", "name_en": "Mizoram", "name_hi": "मिज़ोरम", "type": "S"},
    {"code": "NL", "name_en": "Nagaland", "name_hi": "नागालैंड", "type": "S"},
    {"code": "OR", "name_en": "Odisha", "name_hi": "ओडिशा", "type": "S"},
    {"code": "PY", "name_en": "Puducherry", "name_hi": "पुडुचेरी", "type": "UT"},
    {"code": "PB", "name_en": "Punjab", "name_hi": "पंजाब", "type": "S"},
    {"code": "RJ", "name_en": "Rajasthan", "name_hi": "राजस्थान", "type": "S"},
    {"code": "SK", "name_en": "Sikkim", "name_hi": "सिक्किम", "type": "S"},
    {"code": "TN", "name_en": "Tamil Nadu", "name_hi": "तमिल नाडु", "type": "S"},
    {"code": "TG", "name_en": "Telangana", "name_hi": "तेलंगाना", "type": "S"},
    {"code": "TR", "name_en": "Tripura", "name_hi": "त्रिपुरा", "type": "S"},
    {"code": "UP", "name_en": "Uttar Pradesh", "name_hi": "उत्तर प्रदेश", "type": "S"},
    {"code": "UT", "name_en": "Uttarakhand", "name_hi": "उत्तराखंड", "type": "S"},
    {"code": "WB", "name_en": "West Bengal", "name_hi": "पश्चिम बंगाल", "type": "S"},
]

# ============================================================================
# DISTRICTS — ~720 districts. Compact dict form: state_code → list of (en, hi)
# ============================================================================
DISTRICTS = {
    "AN": [("Nicobar","निकोबार"),("North and Middle Andaman","उत्तरी और मध्य अंडमान"),("South Andaman","दक्षिणी अंडमान")],
    "AP": [("Anantapur","अनंतपुर"),("Chittoor","चित्तूर"),("East Godavari","पूर्वी गोदावरी"),("Guntur","गुंटूर"),("Krishna","कृष्णा"),("Kurnool","कुरनूल"),("Nellore","नेल्लोर"),("Prakasam","प्रकाशम"),("Srikakulam","श्रीकाकुलम"),("Visakhapatnam","विशाखापत्तनम"),("Vizianagaram","विज़ियानगरम"),("West Godavari","पश्चिमी गोदावरी"),("YSR Kadapa","वाईएसआर कडपा"),("Alluri Sitharama Raju","अल्लूरी सीतारामा राजू"),("Anakapalli","अनकापल्ली"),("Annamayya","अन्नमय्या"),("Bapatla","बापटला"),("Eluru","एलुरु"),("Kakinada","काकीनाडा"),("Konaseema","कोनसीमा"),("Manyam","मान्यम"),("NTR","एनटीआर"),("Palnadu","पल्नाडु"),("Sri Sathya Sai","श्री सत्य साईं"),("Tirupati","तिरुपति")],
    "AR": [("Anjaw","अंजॉ"),("Changlang","चांगलांग"),("Dibang Valley","दिबांग वैली"),("East Kameng","पूर्वी कामेंग"),("East Siang","पूर्वी सियांग"),("Kamle","कमले"),("Kra Daadi","क्रा दादी"),("Kurung Kumey","कुरुंग कुमे"),("Lepa Rada","लेपा रादा"),("Lohit","लोहित"),("Longding","लोंगडिंग"),("Lower Dibang Valley","लोअर दिबांग वैली"),("Lower Siang","लोअर सियांग"),("Lower Subansiri","लोअर सुबनसिरी"),("Namsai","नामसाई"),("Pakke Kessang","पक्के केसांग"),("Papum Pare","पापुम पारे"),("Shi Yomi","शी योमी"),("Siang","सियांग"),("Tawang","तवांग"),("Tirap","तिराप"),("Upper Dibang Valley","अपर दिबांग वैली"),("Upper Siang","अपर सियांग"),("Upper Subansiri","अपर सुबनसिरी"),("West Kameng","पश्चिमी कामेंग"),("West Siang","पश्चिमी सियांग")],
    "AS": [("Baksa","बक्सा"),("Barpeta","बारपेटा"),("Biswanath","बिश्वनाथ"),("Bongaigaon","बोंगाईगांव"),("Cachar","कछार"),("Charaideo","चराइदेव"),("Chirang","चिरांग"),("Darrang","दरांग"),("Dhemaji","धेमाजी"),("Dhubri","धुबरी"),("Dibrugarh","डिब्रूगढ़"),("Dima Hasao","दिमा हसाओ"),("Goalpara","गोलपाड़ा"),("Golaghat","गोलाघाट"),("Hailakandi","हैलाकांडी"),("Hojai","होजाई"),("Jorhat","जोरहाट"),("Kamrup","कामरूप"),("Kamrup Metropolitan","कामरूप महानगर"),("Karbi Anglong","कार्बी आंगलोंग"),("Karimganj","करीमगंज"),("Kokrajhar","कोकराझार"),("Lakhimpur","लखीमपुर"),("Majuli","माजुली"),("Morigaon","मोरीगांव"),("Nagaon","नागांव"),("Nalbari","नलबाड़ी"),("Sivasagar","सिवसागर"),("Sonitpur","सोनितपुर"),("South Salmara-Mankachar","दक्षिण सलमारा-मनकाचर"),("Tinsukia","तिनसुकिया"),("Udalguri","उदलगुड़ी"),("West Karbi Anglong","पश्चिम कार्बी आंगलोंग")],
    "BR": [("Araria","अररिया"),("Arwal","अरवल"),("Aurangabad","औरंगाबाद"),("Banka","बांका"),("Begusarai","बेगूसराय"),("Bhagalpur","भागलपुर"),("Bhojpur","भोजपुर"),("Buxar","बक्सर"),("Darbhanga","दरभंगा"),("East Champaran","पूर्वी चंपारण"),("Gaya","गया"),("Gopalganj","गोपालगंज"),("Jamui","जमुई"),("Jehanabad","जहानाबाद"),("Kaimur","कैमूर"),("Katihar","कटिहार"),("Khagaria","खगड़िया"),("Kishanganj","किशनगंज"),("Lakhisarai","लखीसराय"),("Madhepura","मधेपुरा"),("Madhubani","मधुबनी"),("Munger","मुंगेर"),("Muzaffarpur","मुज़फ्फरपुर"),("Nalanda","नालंदा"),("Nawada","नवादा"),("Patna","पटना"),("Purnia","पूर्णिया"),("Rohtas","रोहतास"),("Saharsa","सहरसा"),("Samastipur","समस्तीपुर"),("Saran","सारण"),("Sheikhpura","शेखपुरा"),("Sheohar","शिवहर"),("Sitamarhi","सीतामढ़ी"),("Siwan","सीवान"),("Supaul","सुपौल"),("Vaishali","वैशाली"),("West Champaran","पश्चिम चंपारण")],
    "CH": [("Chandigarh","चंडीगढ़")],
    "CT": [("Balod","बालोद"),("Baloda Bazar","बलौदा बाज़ार"),("Balrampur","बलरामपुर"),("Bastar","बस्तर"),("Bemetara","बेमेतरा"),("Bijapur","बीजापुर"),("Bilaspur","बिलासपुर"),("Dantewada","दंतेवाड़ा"),("Dhamtari","धमतरी"),("Durg","दुर्ग"),("Gariaband","गरियाबंद"),("Gaurela-Pendra-Marwahi","गौरेला-पेंड्रा-मरवाही"),("Janjgir-Champa","जांजगीर-चांपा"),("Jashpur","जशपुर"),("Kabirdham","कबीरधाम"),("Kanker","कांकेर"),("Khairagarh-Chhuikhadan-Gandai","खैरागढ़-छुईखदान-गंडई"),("Kondagaon","कोंडागांव"),("Korba","कोरबा"),("Koriya","कोरिया"),("Mahasamund","महासमुंद"),("Manendragarh-Chirmiri-Bharatpur","मनेंद्रगढ़-चिरमिरी-भरतपुर"),("Mohla-Manpur-Ambagarh Chowki","मोहला-मनपुर-अंबागढ़ चौकी"),("Mungeli","मुंगेली"),("Narayanpur","नारायणपुर"),("Raigarh","रायगढ़"),("Raipur","रायपुर"),("Rajnandgaon","राजनांदगांव"),("Sakti","सक्ती"),("Sarangarh-Bilaigarh","सारंगढ़-बिलाईगढ़"),("Sukma","सुकमा"),("Surajpur","सूरजपुर"),("Surguja","सरगुजा")],
    "DN": [("Dadra and Nagar Haveli","दादरा और नगर हवेली"),("Daman","दमन"),("Diu","दीव")],
    "DL": [("Central Delhi","मध्य दिल्ली"),("East Delhi","पूर्वी दिल्ली"),("New Delhi","नई दिल्ली"),("North Delhi","उत्तरी दिल्ली"),("North East Delhi","उत्तर पूर्वी दिल्ली"),("North West Delhi","उत्तर पश्चिम दिल्ली"),("Shahdara","शाहदरा"),("South Delhi","दक्षिणी दिल्ली"),("South East Delhi","दक्षिण पूर्वी दिल्ली"),("South West Delhi","दक्षिण पश्चिम दिल्ली"),("West Delhi","पश्चिमी दिल्ली")],
    "GA": [("North Goa","उत्तरी गोवा"),("South Goa","दक्षिणी गोवा")],
    "GJ": [("Ahmedabad","अहमदाबाद"),("Amreli","अमरेली"),("Anand","आणंद"),("Aravalli","अरावली"),("Banaskantha","बनासकांठा"),("Bharuch","भरूच"),("Bhavnagar","भावनगर"),("Botad","बोटाद"),("Chhota Udaipur","छोटा उदयपुर"),("Dahod","दाहोद"),("Dang","डांग"),("Devbhoomi Dwarka","देवभूमि द्वारका"),("Gandhinagar","गांधीनगर"),("Gir Somnath","गिर सोमनाथ"),("Jamnagar","जामनगर"),("Junagadh","जूनागढ़"),("Kheda","खेड़ा"),("Kutch","कच्छ"),("Mahisagar","महीसागर"),("Mehsana","मेहसाणा"),("Morbi","मोरबी"),("Narmada","नर्मदा"),("Navsari","नवसारी"),("Panchmahal","पंचमहल"),("Patan","पाटण"),("Porbandar","पोरबंदर"),("Rajkot","राजकोट"),("Sabarkantha","साबरकांठा"),("Surat","सूरत"),("Surendranagar","सुरेंद्रनगर"),("Tapi","तापी"),("Vadodara","वडोदरा"),("Valsad","वलसाड")],
    "HR": [("Ambala","अंबाला"),("Bhiwani","भिवानी"),("Charkhi Dadri","चरखी दादरी"),("Faridabad","फरीदाबाद"),("Fatehabad","फतेहाबाद"),("Gurugram","गुरुग्राम"),("Hisar","हिसार"),("Jhajjar","झज्जर"),("Jind","जींद"),("Kaithal","कैथल"),("Karnal","करनाल"),("Kurukshetra","कुरुक्षेत्र"),("Mahendragarh","महेंद्रगढ़"),("Nuh","नूह"),("Palwal","पलवल"),("Panchkula","पंचकूला"),("Panipat","पानीपत"),("Rewari","रेवाड़ी"),("Rohtak","रोहतक"),("Sirsa","सिरसा"),("Sonipat","सोनीपत"),("Yamunanagar","यमुनानगर")],
    "HP": [("Bilaspur","बिलासपुर"),("Chamba","चंबा"),("Hamirpur","हमीरपुर"),("Kangra","कांगड़ा"),("Kinnaur","किन्नौर"),("Kullu","कुल्लू"),("Lahaul and Spiti","लाहौल और स्पीति"),("Mandi","मंडी"),("Shimla","शिमला"),("Sirmaur","सिरमौर"),("Solan","सोलन"),("Una","ऊना")],
    "JK": [("Anantnag","अनंतनाग"),("Bandipora","बांदीपोरा"),("Baramulla","बारामूला"),("Budgam","बडगाम"),("Doda","डोडा"),("Ganderbal","गांदरबल"),("Jammu","जम्मू"),("Kathua","कठुआ"),("Kishtwar","किश्तवाड़"),("Kulgam","कुलगाम"),("Kupwara","कुपवाड़ा"),("Poonch","पुंछ"),("Pulwama","पुलवामा"),("Rajouri","राजौरी"),("Ramban","रामबन"),("Reasi","रियासी"),("Samba","सांबा"),("Shopian","शोपियां"),("Srinagar","श्रीनगर"),("Udhampur","उधमपुर")],
    "JH": [("Bokaro","बोकारो"),("Chatra","चतरा"),("Deoghar","देवघर"),("Dhanbad","धनबाद"),("Dumka","दुमका"),("East Singhbhum","पूर्वी सिंहभूम"),("Garhwa","गढ़वा"),("Giridih","गिरिडीह"),("Godda","गोड्डा"),("Gumla","गुमला"),("Hazaribagh","हज़ारीबाग"),("Jamtara","जामताड़ा"),("Khunti","खूंटी"),("Koderma","कोडरमा"),("Latehar","लातेहार"),("Lohardaga","लोहरदगा"),("Pakur","पाकुड़"),("Palamu","पलामू"),("Ramgarh","रामगढ़"),("Ranchi","रांची"),("Sahibganj","साहिबगंज"),("Saraikela Kharsawan","सरायकेला खरसावां"),("Simdega","सिमडेगा"),("West Singhbhum","पश्चिम सिंहभूम")],
    "KA": [("Bagalkot","बागलकोट"),("Ballari","बल्लारी"),("Belagavi","बेलगावी"),("Bengaluru Rural","बेंगलुरु ग्रामीण"),("Bengaluru Urban","बेंगलुरु शहर"),("Bidar","बीदर"),("Chamarajanagar","चामराजनगर"),("Chikballapur","चिक्कबल्लापुर"),("Chikkamagaluru","चिकमगलूर"),("Chitradurga","चित्रदुर्ग"),("Dakshina Kannada","दक्षिण कन्नड़"),("Davanagere","दावणगेरे"),("Dharwad","धारवाड़"),("Gadag","गदग"),("Hassan","हसन"),("Haveri","हावेरी"),("Kalaburagi","कलबुर्गी"),("Kodagu","कोडगू"),("Kolar","कोलार"),("Koppal","कोप्पल"),("Mandya","मांड्या"),("Mysuru","मैसूर"),("Raichur","रायचूर"),("Ramanagara","रामनगर"),("Shivamogga","शिवमोग्गा"),("Tumakuru","तुमकुर"),("Udupi","उडुपी"),("Uttara Kannada","उत्तर कन्नड़"),("Vijayanagara","विजयनगर"),("Vijayapura","विजयपुर"),("Yadgir","यादगिर")],
    "KL": [("Alappuzha","अलाप्पुझा"),("Ernakulam","एर्नाकुलम"),("Idukki","इडुक्की"),("Kannur","कन्नूर"),("Kasaragod","कासरगोड"),("Kollam","कोल्लम"),("Kottayam","कोट्टायम"),("Kozhikode","कोझिकोड"),("Malappuram","मलप्पुरम"),("Palakkad","पालक्काड"),("Pathanamthitta","पथानामथिट्टा"),("Thiruvananthapuram","तिरुवनंतपुरम"),("Thrissur","त्रिशूर"),("Wayanad","वायनाड")],
    "LA": [("Kargil","करगिल"),("Leh","लेह")],
    "LD": [("Lakshadweep","लक्षद्वीप")],
    "MP": [("Agar Malwa","आगर मालवा"),("Alirajpur","अलीराजपुर"),("Anuppur","अनूपपुर"),("Ashoknagar","अशोकनगर"),("Balaghat","बालाघाट"),("Barwani","बड़वानी"),("Betul","बैतूल"),("Bhind","भिंड"),("Bhopal","भोपाल"),("Burhanpur","बुरहानपुर"),("Chhatarpur","छतरपुर"),("Chhindwara","छिंदवाड़ा"),("Damoh","दमोह"),("Datia","दतिया"),("Dewas","देवास"),("Dhar","धार"),("Dindori","डिंडोरी"),("Guna","गुना"),("Gwalior","ग्वालियर"),("Harda","हरदा"),("Hoshangabad","होशंगाबाद"),("Indore","इंदौर"),("Jabalpur","जबलपुर"),("Jhabua","झाबुआ"),("Katni","कटनी"),("Khandwa","खंडवा"),("Khargone","खरगोन"),("Mandla","मंडला"),("Mandsaur","मंदसौर"),("Morena","मुरैना"),("Narsinghpur","नरसिंहपुर"),("Neemuch","नीमच"),("Niwari","निवाड़ी"),("Panna","पन्ना"),("Raisen","रायसेन"),("Rajgarh","राजगढ़"),("Ratlam","रतलाम"),("Rewa","रीवा"),("Sagar","सागर"),("Satna","सतना"),("Sehore","सीहोर"),("Seoni","सिवनी"),("Shahdol","शहडोल"),("Shajapur","शाजापुर"),("Sheopur","श्योपुर"),("Shivpuri","शिवपुरी"),("Sidhi","सीधी"),("Singrauli","सिंगरौली"),("Tikamgarh","टीकमगढ़"),("Ujjain","उज्जैन"),("Umaria","उमरिया"),("Vidisha","विदिशा")],
    "MH": [("Ahmednagar","अहमदनगर"),("Akola","अकोला"),("Amravati","अमरावती"),("Aurangabad","औरंगाबाद"),("Beed","बीड"),("Bhandara","भंडारा"),("Buldhana","बुलढाणा"),("Chandrapur","चंद्रपुर"),("Dhule","धुले"),("Gadchiroli","गढ़चिरौली"),("Gondia","गोंदिया"),("Hingoli","हिंगोली"),("Jalgaon","जलगांव"),("Jalna","जालना"),("Kolhapur","कोल्हापुर"),("Latur","लातूर"),("Mumbai City","मुंबई शहर"),("Mumbai Suburban","मुंबई उपनगर"),("Nagpur","नागपुर"),("Nanded","नांदेड़"),("Nandurbar","नंदुरबार"),("Nashik","नासिक"),("Osmanabad","उस्मानाबाद"),("Palghar","पालघर"),("Parbhani","परभणी"),("Pune","पुणे"),("Raigad","रायगढ़"),("Ratnagiri","रत्नागिरी"),("Sangli","सांगली"),("Satara","सतारा"),("Sindhudurg","सिंधुदुर्ग"),("Solapur","सोलापुर"),("Thane","ठाणे"),("Wardha","वर्धा"),("Washim","वाशिम"),("Yavatmal","यवतमाल")],
    "MN": [("Bishnupur","बिष्णुपुर"),("Chandel","चंदेल"),("Churachandpur","चूड़ाचांदपुर"),("Imphal East","इम्फाल पूर्व"),("Imphal West","इम्फाल पश्चिम"),("Jiribam","जिरीबाम"),("Kakching","काकचिंग"),("Kamjong","कामजोंग"),("Kangpokpi","कांगपोकपी"),("Noney","नोनी"),("Pherzawl","फेरज़ावल"),("Senapati","सेनापति"),("Tamenglong","तमेंगलोंग"),("Tengnoupal","टेंगनौपाल"),("Thoubal","थौबल"),("Ukhrul","उखरूल")],
    "ML": [("East Garo Hills","पूर्व गारो हिल्स"),("East Jaintia Hills","पूर्व जयंतिया हिल्स"),("East Khasi Hills","पूर्व खासी हिल्स"),("North Garo Hills","उत्तर गारो हिल्स"),("Ri-Bhoi","री-भोई"),("South Garo Hills","दक्षिण गारो हिल्स"),("South West Garo Hills","दक्षिण पश्चिम गारो हिल्स"),("South West Khasi Hills","दक्षिण पश्चिम खासी हिल्स"),("West Garo Hills","पश्चिम गारो हिल्स"),("West Jaintia Hills","पश्चिम जयंतिया हिल्स"),("West Khasi Hills","पश्चिम खासी हिल्स"),("Eastern West Khasi Hills","पूर्वी पश्चिम खासी हिल्स")],
    "MZ": [("Aizawl","आइज़ोल"),("Champhai","चम्फाई"),("Hnahthial","नाहथियल"),("Khawzawl","खौज़ौल"),("Kolasib","कोलासिब"),("Lawngtlai","लांगतलाई"),("Lunglei","लुंगलेई"),("Mamit","मामित"),("Saiha","सायहा"),("Saitual","साईतुअल"),("Serchhip","सेरछिप")],
    "NL": [("Chumukedima","चुमुकेदिमा"),("Dimapur","दीमापुर"),("Kiphire","किफिरे"),("Kohima","कोहिमा"),("Longleng","लोंगलेंग"),("Mokokchung","मोकोकचुंग"),("Mon","मोन"),("Niuland","न्यूलैंड"),("Noklak","नोकलाक"),("Peren","पेरेन"),("Phek","फेक"),("Shamator","शामतोर"),("Tseminyu","त्सेमिन्यु"),("Tuensang","तुएनसांग"),("Wokha","वोखा"),("Zunheboto","जुन्हेबोटो")],
    "OR": [("Angul","अंगुल"),("Balangir","बलांगीर"),("Balasore","बालासोर"),("Bargarh","बरगढ़"),("Bhadrak","भद्रक"),("Boudh","बौद्ध"),("Cuttack","कटक"),("Deogarh","देवगढ़"),("Dhenkanal","ढेंकानल"),("Gajapati","गजपति"),("Ganjam","गंजाम"),("Jagatsinghpur","जगतसिंहपुर"),("Jajpur","जाजपुर"),("Jharsuguda","झारसुगुड़ा"),("Kalahandi","कालाहांडी"),("Kandhamal","कंधमाल"),("Kendrapara","केंद्रपाड़ा"),("Kendujhar","केंदुझर"),("Khordha","खोरधा"),("Koraput","कोरापुट"),("Malkangiri","मलकानगिरि"),("Mayurbhanj","मयूरभंज"),("Nabarangpur","नबरंगपुर"),("Nayagarh","नयागढ़"),("Nuapada","नुआपाड़ा"),("Puri","पुरी"),("Rayagada","रायगडा"),("Sambalpur","संबलपुर"),("Subarnapur","सुबर्णपुर"),("Sundargarh","सुंदरगढ़")],
    "PY": [("Karaikal","कराईकल"),("Mahe","माहे"),("Puducherry","पुडुचेरी"),("Yanam","यानम")],
    "PB": [("Amritsar","अमृतसर"),("Barnala","बरनाला"),("Bathinda","बठिंडा"),("Faridkot","फरीदकोट"),("Fatehgarh Sahib","फतेहगढ़ साहिब"),("Fazilka","फज़िल्का"),("Ferozepur","फिरोज़पुर"),("Gurdaspur","गुरदासपुर"),("Hoshiarpur","होशियारपुर"),("Jalandhar","जालंधर"),("Kapurthala","कपूरथला"),("Ludhiana","लुधियाना"),("Malerkotla","मलेरकोटला"),("Mansa","मानसा"),("Moga","मोगा"),("Mohali","मोहाली"),("Muktsar","मुक्तसर"),("Pathankot","पठानकोट"),("Patiala","पटियाला"),("Rupnagar","रूपनगर"),("Sangrur","संगरूर"),("Shaheed Bhagat Singh Nagar","शहीद भगत सिंह नगर"),("Tarn Taran","तरन तारन")],
    "RJ": [("Ajmer","अजमेर"),("Alwar","अलवर"),("Banswara","बांसवाड़ा"),("Baran","बारां"),("Barmer","बाड़मेर"),("Bharatpur","भरतपुर"),("Bhilwara","भीलवाड़ा"),("Bikaner","बीकानेर"),("Bundi","बूंदी"),("Chittorgarh","चित्तौड़गढ़"),("Churu","चूरू"),("Dausa","दौसा"),("Dholpur","धौलपुर"),("Dungarpur","डूंगरपुर"),("Hanumangarh","हनुमानगढ़"),("Jaipur","जयपुर"),("Jaisalmer","जैसलमेर"),("Jalore","जालौर"),("Jhalawar","झालावाड़"),("Jhunjhunu","झुंझुनूं"),("Jodhpur","जोधपुर"),("Karauli","करौली"),("Kota","कोटा"),("Nagaur","नागौर"),("Pali","पाली"),("Pratapgarh","प्रतापगढ़"),("Rajsamand","राजसमंद"),("Sawai Madhopur","सवाई माधोपुर"),("Sikar","सीकर"),("Sirohi","सिरोही"),("Sri Ganganagar","श्री गंगानगर"),("Tonk","टोंक"),("Udaipur","उदयपुर")],
    "SK": [("East Sikkim","पूर्व सिक्किम"),("North Sikkim","उत्तर सिक्किम"),("Pakyong","पाक्योंग"),("Soreng","सोरेंग"),("South Sikkim","दक्षिण सिक्किम"),("West Sikkim","पश्चिम सिक्किम")],
    "TN": [("Ariyalur","अरियालुर"),("Chengalpattu","चेंगलपट्टु"),("Chennai","चेन्नई"),("Coimbatore","कोयंबटूर"),("Cuddalore","कुड्डालोर"),("Dharmapuri","धर्मपुरी"),("Dindigul","डिंडीगुल"),("Erode","इरोड"),("Kallakurichi","कल्लाकुरिची"),("Kanchipuram","कांचीपुरम"),("Kanniyakumari","कन्याकुमारी"),("Karur","करूर"),("Krishnagiri","कृष्णगिरि"),("Madurai","मदुरै"),("Mayiladuthurai","मयिलादुथुराई"),("Nagapattinam","नागपट्टिनम"),("Namakkal","नमक्कल"),("Nilgiris","नीलगिरि"),("Perambalur","पेरम्बलूर"),("Pudukkottai","पुदुकोट्टई"),("Ramanathapuram","रामनाथपुरम"),("Ranipet","रानीपेट"),("Salem","सेलम"),("Sivaganga","शिवगंगा"),("Tenkasi","तेनकासी"),("Thanjavur","तंजावुर"),("Theni","तेनी"),("Thoothukudi","तूतीकोरिन"),("Tiruchirappalli","तिरुचिरापल्ली"),("Tirunelveli","तिरुनेलवेली"),("Tirupathur","तिरुपत्तूर"),("Tiruppur","तिरुप्पुर"),("Tiruvallur","तिरुवल्लूर"),("Tiruvannamalai","तिरुवन्नामलाई"),("Tiruvarur","तिरुवरुर"),("Vellore","वेल्लोर"),("Viluppuram","विलुप्पुरम"),("Virudhunagar","विरुधुनगर")],
    "TG": [("Adilabad","आदिलाबाद"),("Bhadradri Kothagudem","भद्राद्री कोठागुडेम"),("Hanumakonda","हनुमाकोंडा"),("Hyderabad","हैदराबाद"),("Jagtial","जगितियाल"),("Jangaon","जनगांव"),("Jayashankar Bhupalpally","जयशंकर भूपालपल्ली"),("Jogulamba Gadwal","जोगुलंबा गडवाल"),("Kamareddy","कामारेड्डी"),("Karimnagar","करीमनगर"),("Khammam","खम्मम"),("Komaram Bheem","कोमाराम भीम"),("Mahabubabad","महबूबाबाद"),("Mahabubnagar","महबूबनगर"),("Mancherial","मन्चेरियल"),("Medak","मेडक"),("Medchal-Malkajgiri","मेडचल-मलकाजगिरि"),("Mulugu","मुलुगु"),("Nagarkurnool","नागरकुरनूल"),("Nalgonda","नलगोंडा"),("Narayanpet","नारायणपेट"),("Nirmal","निर्मल"),("Nizamabad","निज़ामाबाद"),("Peddapalli","पेद्दापल्ली"),("Rajanna Sircilla","राजन्ना सिर्सिल्ला"),("Rangareddy","रंगारेड्डी"),("Sangareddy","संगारेड्डी"),("Siddipet","सिद्दीपेट"),("Suryapet","सूर्यपेट"),("Vikarabad","विकाराबाद"),("Wanaparthy","वानापर्ती"),("Warangal","वारंगल"),("Yadadri Bhuvanagiri","यादाद्री भुवनगिरी")],
    "TR": [("Dhalai","ढलाई"),("Gomati","गोमती"),("Khowai","खोवाई"),("North Tripura","उत्तर त्रिपुरा"),("Sepahijala","सेपहीजला"),("South Tripura","दक्षिण त्रिपुरा"),("Unakoti","उनाकोटी"),("West Tripura","पश्चिम त्रिपुरा")],
    "UP": [("Agra","आगरा"),("Aligarh","अलीगढ़"),("Ambedkar Nagar","अंबेडकर नगर"),("Amethi","अमेठी"),("Amroha","अमरोहा"),("Auraiya","औरैया"),("Ayodhya","अयोध्या"),("Azamgarh","आजमगढ़"),("Baghpat","बागपत"),("Bahraich","बहराइच"),("Ballia","बलिया"),("Balrampur","बलरामपुर"),("Banda","बांदा"),("Barabanki","बाराबंकी"),("Bareilly","बरेली"),("Basti","बस्ती"),("Bhadohi","भदोही"),("Bijnor","बिजनौर"),("Budaun","बदायूं"),("Bulandshahr","बुलंदशहर"),("Chandauli","चंदौली"),("Chitrakoot","चित्रकूट"),("Deoria","देवरिया"),("Etah","एटा"),("Etawah","इटावा"),("Farrukhabad","फर्रुखाबाद"),("Fatehpur","फतेहपुर"),("Firozabad","फिरोज़ाबाद"),("Gautam Buddha Nagar","गौतम बुद्ध नगर"),("Ghaziabad","गाज़ियाबाद"),("Ghazipur","गाज़ीपुर"),("Gonda","गोंडा"),("Gorakhpur","गोरखपुर"),("Hamirpur","हमीरपुर"),("Hapur","हापुड़"),("Hardoi","हरदोई"),("Hathras","हाथरस"),("Jalaun","जालौन"),("Jaunpur","जौनपुर"),("Jhansi","झांसी"),("Kannauj","कन्नौज"),("Kanpur Dehat","कानपुर देहात"),("Kanpur Nagar","कानपुर नगर"),("Kasganj","कासगंज"),("Kaushambi","कौशांबी"),("Kheri","खीरी"),("Kushinagar","कुशीनगर"),("Lalitpur","ललितपुर"),("Lucknow","लखनऊ"),("Maharajganj","महाराजगंज"),("Mahoba","महोबा"),("Mainpuri","मैनपुरी"),("Mathura","मथुरा"),("Mau","मऊ"),("Meerut","मेरठ"),("Mirzapur","मिर्ज़ापुर"),("Moradabad","मुरादाबाद"),("Muzaffarnagar","मुज़फ्फरनगर"),("Pilibhit","पीलीभीत"),("Pratapgarh","प्रतापगढ़"),("Prayagraj","प्रयागराज"),("Raebareli","रायबरेली"),("Rampur","रामपुर"),("Saharanpur","सहारनपुर"),("Sambhal","संभल"),("Sant Kabir Nagar","संत कबीर नगर"),("Shahjahanpur","शाहजहांपुर"),("Shamli","शामली"),("Shravasti","श्रावस्ती"),("Siddharthnagar","सिद्धार्थनगर"),("Sitapur","सीतापुर"),("Sonbhadra","सोनभद्र"),("Sultanpur","सुल्तानपुर"),("Unnao","उन्नाव"),("Varanasi","वाराणसी")],
    "UT": [("Almora","अल्मोड़ा"),("Bageshwar","बागेश्वर"),("Chamoli","चमोली"),("Champawat","चंपावत"),("Dehradun","देहरादून"),("Haridwar","हरिद्वार"),("Nainital","नैनीताल"),("Pauri Garhwal","पौड़ी गढ़वाल"),("Pithoragarh","पिथौरागढ़"),("Rudraprayag","रुद्रप्रयाग"),("Tehri Garhwal","टिहरी गढ़वाल"),("Udham Singh Nagar","उधम सिंह नगर"),("Uttarkashi","उत्तरकाशी")],
    "WB": [("Alipurduar","अलीपुरद्वार"),("Bankura","बांकुड़ा"),("Birbhum","बीरभूम"),("Cooch Behar","कूचबिहार"),("Dakshin Dinajpur","दक्षिण दिनाजपुर"),("Darjeeling","दार्जिलिंग"),("Hooghly","हुगली"),("Howrah","हावड़ा"),("Jalpaiguri","जलपाईगुड़ी"),("Jhargram","झारग्राम"),("Kalimpong","कालिम्पोंग"),("Kolkata","कोलकाता"),("Malda","मालदा"),("Murshidabad","मुर्शिदाबाद"),("Nadia","नदिया"),("North 24 Parganas","उत्तर 24 परगना"),("Paschim Bardhaman","पश्चिम बर्धमान"),("Paschim Medinipur","पश्चिम मेदिनीपुर"),("Purba Bardhaman","पूर्व बर्धमान"),("Purba Medinipur","पूर्व मेदिनीपुर"),("Purulia","पुरुलिया"),("South 24 Parganas","दक्षिण 24 परगना"),("Uttar Dinajpur","उत्तर दिनाजपुर")],
}

# ============================================================================
# TOP CITIES — searchable. Format: (name_en, name_hi, state_code)
# Focused on tier 1/2/3 cities where most CKD members will be located.
# ============================================================================
CITIES = [
    # Mega cities (tier 1)
    ("Mumbai","मुंबई","MH"),("Delhi","दिल्ली","DL"),("Bengaluru","बेंगलुरु","KA"),("Hyderabad","हैदराबाद","TG"),
    ("Chennai","चेन्नई","TN"),("Kolkata","कोलकाता","WB"),("Pune","पुणे","MH"),("Ahmedabad","अहमदाबाद","GJ"),
    ("Surat","सूरत","GJ"),("Jaipur","जयपुर","RJ"),("Lucknow","लखनऊ","UP"),("Kanpur","कानपुर","UP"),
    ("Nagpur","नागपुर","MH"),("Indore","इंदौर","MP"),("Bhopal","भोपाल","MP"),("Visakhapatnam","विशाखापत्तनम","AP"),
    ("Patna","पटना","BR"),("Vadodara","वडोदरा","GJ"),("Ghaziabad","गाज़ियाबाद","UP"),("Ludhiana","लुधियाना","PB"),
    ("Agra","आगरा","UP"),("Nashik","नासिक","MH"),("Faridabad","फरीदाबाद","HR"),("Meerut","मेरठ","UP"),
    ("Rajkot","राजकोट","GJ"),("Kalyan","कल्याण","MH"),("Vasai","वसई","MH"),("Varanasi","वाराणसी","UP"),
    ("Srinagar","श्रीनगर","JK"),("Aurangabad","औरंगाबाद","MH"),("Dhanbad","धनबाद","JH"),("Amritsar","अमृतसर","PB"),
    ("Allahabad","प्रयागराज","UP"),("Ranchi","रांची","JH"),("Howrah","हावड़ा","WB"),("Coimbatore","कोयंबटूर","TN"),
    ("Jabalpur","जबलपुर","MP"),("Gwalior","ग्वालियर","MP"),("Vijayawada","विजयवाड़ा","AP"),("Jodhpur","जोधपुर","RJ"),
    ("Madurai","मदुरै","TN"),("Raipur","रायपुर","CT"),("Kota","कोटा","RJ"),("Guwahati","गुवाहाटी","AS"),
    ("Chandigarh","चंडीगढ़","CH"),("Solapur","सोलापुर","MH"),("Hubli","हुबली","KA"),("Mysuru","मैसूर","KA"),
    ("Tiruchirappalli","तिरुचिरापल्ली","TN"),("Bareilly","बरेली","UP"),("Aligarh","अलीगढ़","UP"),("Tiruppur","तिरुप्पुर","TN"),
    ("Moradabad","मुरादाबाद","UP"),("Mira-Bhayandar","मीरा-भायंदर","MH"),("Thiruvananthapuram","तिरुवनंतपुरम","KL"),
    ("Bhiwandi","भिवंडी","MH"),("Saharanpur","सहारनपुर","UP"),("Gorakhpur","गोरखपुर","UP"),("Guntur","गुंटूर","AP"),
    ("Bikaner","बीकानेर","RJ"),("Amravati","अमरावती","MH"),("Noida","नोएडा","UP"),("Jamshedpur","जमशेदपुर","JH"),
    ("Bhilai","भिलाई","CT"),("Cuttack","कटक","OR"),("Firozabad","फिरोज़ाबाद","UP"),("Kochi","कोच्चि","KL"),
    ("Nellore","नेल्लोर","AP"),("Bhavnagar","भावनगर","GJ"),("Dehradun","देहरादून","UT"),("Durgapur","दुर्गापुर","WB"),
    ("Asansol","आसनसोल","WB"),("Rourkela","राउरकेला","OR"),("Nanded","नांदेड़","MH"),("Kolhapur","कोल्हापुर","MH"),
    ("Ajmer","अजमेर","RJ"),("Akola","अकोला","MH"),("Gulbarga","गुलबर्गा","KA"),("Jamnagar","जामनगर","GJ"),
    ("Ujjain","उज्जैन","MP"),("Loni","लोनी","UP"),("Siliguri","सिलीगुड़ी","WB"),("Jhansi","झांसी","UP"),
    ("Ulhasnagar","उल्हासनगर","MH"),("Jammu","जम्मू","JK"),("Sangli","सांगली","MH"),("Mangaluru","मंगलूरु","KA"),
    ("Erode","इरोड","TN"),("Belgaum","बेलगाम","KA"),("Ambattur","अंबत्तूर","TN"),("Tirunelveli","तिरुनेलवेली","TN"),
    ("Malegaon","मालेगांव","MH"),("Gaya","गया","BR"),("Jalgaon","जलगांव","MH"),("Udaipur","उदयपुर","RJ"),
    ("Maheshtala","महेशतला","WB"),("Tirupati","तिरुपति","AP"),("Davanagere","दावणगेरे","KA"),("Kozhikode","कोझिकोड","KL"),
    ("Akbarpur","अकबरपुर","UP"),("Kurnool","कुरनूल","AP"),("Bokaro","बोकारो","JH"),("Rajahmundry","राजमुंदरी","AP"),
    ("Bellary","बल्लारी","KA"),("Patiala","पटियाला","PB"),("Gopalpur","गोपालपुर","WB"),("Agartala","अगरतला","TR"),
    ("Bhagalpur","भागलपुर","BR"),("Latur","लातूर","MH"),("Dhule","धुले","MH"),("Korba","कोरबा","CT"),
    ("Bhilwara","भीलवाड़ा","RJ"),("Brahmapur","ब्रह्मपुर","OR"),("Mysore","मैसूर","KA"),("Muzaffarpur","मुज़फ्फरपुर","BR"),
    ("Ahmednagar","अहमदनगर","MH"),("Kollam","कोल्लम","KL"),("Raghunathganj","रघुनाथगंज","WB"),("Bilaspur","बिलासपुर","CT"),
    ("Shahjahanpur","शाहजहांपुर","UP"),("Thrissur","त्रिशूर","KL"),("Alwar","अलवर","RJ"),("Kakinada","काकीनाडा","AP"),
    ("Nizamabad","निज़ामाबाद","TG"),("Sangli-Miraj","सांगली-मिरज","MH"),("Tumakuru","तुमकुर","KA"),("Hisar","हिसार","HR"),
    ("Ozhukarai","ओझुकराई","PY"),("Bihar Sharif","बिहार शरीफ","BR"),("Panipat","पानीपत","HR"),("Darbhanga","दरभंगा","BR"),
    ("Bally","बाली","WB"),("Aizawl","आइज़ोल","MZ"),("Dewas","देवास","MP"),("Ichalkaranji","इचलकरंजी","MH"),
    ("Karnal","करनाल","HR"),("Bathinda","बठिंडा","PB"),("Jalna","जालना","MH"),("Eluru","एलुरु","AP"),
    ("Barabanki","बाराबंकी","UP"),("Purnia","पूर्णिया","BR"),("Satna","सतना","MP"),("Mau","मऊ","UP"),
    ("Sonipat","सोनीपत","HR"),("Farrukhabad","फर्रुखाबाद","UP"),("Sagar","सागर","MP"),("Rourkela","राउरकेला","OR"),
    ("Durg","दुर्ग","CT"),("Imphal","इम्फाल","MN"),("Ratlam","रतलाम","MP"),("Hapur","हापुड़","UP"),
    ("Arrah","आरा","BR"),("Karimnagar","करीमनगर","TG"),("Anantapur","अनंतपुर","AP"),("Etawah","इटावा","UP"),
    ("Ambarnath","अंबरनाथ","MH"),("North Dumdum","उत्तर दमदम","WB"),("Bharatpur","भरतपुर","RJ"),("Begusarai","बेगूसराय","BR"),
    ("New Delhi","नई दिल्ली","DL"),("Gandhidham","गांधीधाम","GJ"),("Baranagar","बारानगर","WB"),("Tiruvottiyur","तिरुवोट्टियूर","TN"),
    ("Puducherry","पुडुचेरी","PY"),("Sikar","सीकर","RJ"),("Thoothukudi","तूतीकोरिन","TN"),("Rewa","रीवा","MP"),
    ("Mirzapur","मिर्ज़ापुर","UP"),("Raichur","रायचूर","KA"),("Pali","पाली","RJ"),("Ramagundam","रामगुंडम","TG"),
    ("Haridwar","हरिद्वार","UT"),("Vijayanagaram","विज़ियानगरम","AP"),("Tenali","तेनाली","AP"),("Nagercoil","नागरकोइल","TN"),
    ("Sri Ganganagar","श्री गंगानगर","RJ"),("Karawal Nagar","करावल नगर","DL"),("Mango","मांगो","JH"),("Thanjavur","तंजावुर","TN"),
    ("Bulandshahr","बुलंदशहर","UP"),("Uluberia","उलुबेरिया","WB"),("Murwara","मुरवारा","MP"),("Sambhal","संभल","UP"),
    ("Singrauli","सिंगरौली","MP"),("Nadiad","नाडियाद","GJ"),("Secunderabad","सिकंदराबाद","TG"),("Naihati","नैहाटी","WB"),
    ("Yamunanagar","यमुनानगर","HR"),("Bidhannagar","बिधाननगर","WB"),("Pallavaram","पल्लावरम","TN"),("Bidar","बीदर","KA"),
    ("Munger","मुंगेर","BR"),("Panchkula","पंचकूला","HR"),("Burhanpur","बुरहानपुर","MP"),("Raurkela","राउरकेला","OR"),
    ("Kharagpur","खड़गपुर","WB"),("Dindigul","डिंडीगुल","TN"),("Gandhinagar","गांधीनगर","GJ"),("Hospet","होस्पेट","KA"),
    ("Nangloi Jat","नंगलोई जाट","DL"),("Malda","मालदा","WB"),("Ongole","ओंगोल","AP"),("Deoghar","देवघर","JH"),
    ("Chapra","छपरा","BR"),("Haldia","हल्दिया","WB"),("Khandwa","खंडवा","MP"),("Nandyal","नांदयाल","AP"),
    ("Morena","मुरैना","MP"),("Amroha","अमरोहा","UP"),("Anand","आणंद","GJ"),("Bhind","भिंड","MP"),
    ("Bhalswa Jahangir Pur","भलस्वा जहांगीर पुर","DL"),("Madhyamgram","मध्यमग्राम","WB"),("Bhiwani","भिवानी","HR"),
    ("Berhampore","बहरमपुर","WB"),("Ambala","अंबाला","HR"),("Morbi","मोरबी","GJ"),("Fatehpur","फतेहपुर","UP"),
    ("Raebareli","रायबरेली","UP"),("Khora","खोरा","UP"),("Chittoor","चित्तूर","AP"),("Bhusawal","भुसावल","MH"),
    ("Orai","ओराई","UP"),("Bahraich","बहराइच","UP"),("Phusro","फुसरो","JH"),("Vellore","वेल्लोर","TN"),
    ("Mehsana","मेहसाणा","GJ"),("Raiganj","रायगंज","WB"),("Sirsa","सिरसा","HR"),("Danapur","दनापुर","BR"),
    ("Serampore","सेरामपुर","WB"),("Sultan Pur Majra","सुल्तान पुर माजरा","DL"),("Guna","गुना","MP"),("Jaunpur","जौनपुर","UP"),
    ("Panvel","पनवेल","MH"),("Shivpuri","शिवपुरी","MP"),("Surendranagar","सुरेंद्रनगर","GJ"),("Unnao","उन्नाव","UP"),
    ("Chinsurah","चिनसुरह","WB"),("Alappuzha","अलाप्पुझा","KL"),("Kottayam","कोट्टायम","KL"),("Machilipatnam","मछलीपट्टनम","AP"),
    ("Shimla","शिमला","HP"),("Adoni","आदोनी","AP"),("Tenali","तेनाली","AP"),("Proddatur","प्रोद्दतूर","AP"),
    ("Saharsa","सहरसा","BR"),("Hindupur","हिंदुपूर","AP"),("Sasaram","सासाराम","BR"),("Hajipur","हाजीपुर","BR"),
    ("Bhimavaram","भीमावरम","AP"),("Madanapalle","मदनपल्ले","AP"),("Siwan","सीवान"," BR"),("Bettiah","बेतिया","BR"),
    ("Ramgarh","रामगढ़","JH"),("Bharuch","भरूच","GJ"),("Hazaribagh","हज़ारीबाग","JH"),("Hindaun","हिंडौन","RJ"),
    ("Banda","बांदा","UP"),("Godhra","गोधरा","GJ"),("Veraval","वेरावल","GJ"),("Hugli-Chinsurah","हुगली-चिनसुरह","WB"),
    ("Saunda","सौंदा","JH"),("Buxar","बक्सर","BR"),("Krishnanagar","कृष्णनगर","WB"),("Mahbubnagar","महबूबनगर","TG"),
    ("Dibrugarh","डिब्रूगढ़","AS"),("Silchar","सिलचर","AS"),("Shimoga","शिमोगा","KA"),("Chandrapur","चंद्रपुर","MH"),
    ("Hindupur","हिंदुपुर","AP"),("Adilabad","आदिलाबाद","TG"),("Yavatmal","यवतमाल","MH"),("Saharanpur","सहारनपुर","UP"),
    ("Bharatpur","भरतपुर","RJ"),("Pondicherry","पुडुचेरी","PY"),("Faizabad","फैज़ाबाद","UP"),("Karaikudi","करैकुडी","TN"),
    ("Hosur","होसूर","TN"),("Hassan","हसन","KA"),("Bhandara","भंडारा","MH"),("Itanagar","ईटानगर","AR"),
    ("Kohima","कोहिमा","NL"),("Shillong","शिलांग","ML"),("Panaji","पणजी","GA"),("Margao","मडगांव","GA"),
    ("Leh","लेह","LA"),("Kavaratti","कवरत्ती","LD"),("Daman","दमन","DN"),("Diu","दीव","DN"),
    ("Port Blair","पोर्ट ब्लेयर","AN"),("Gangtok","गंगटोक","SK"),
]

# ============================================================================
# Build JSON files
# ============================================================================

def build_state_districts():
    """Flatten DISTRICTS dict to a single object indexed by state code."""
    out = {}
    total = 0
    for state in STATES:
        sc = state["code"]
        rows = DISTRICTS.get(sc, [])
        out[sc] = [{"name_en": en, "name_hi": hi} for (en, hi) in rows]
        total += len(rows)
    return out, total


def build_cities():
    """Cities sorted alphabetically (English), deduplicated, valid state_code only."""
    valid_codes = {s["code"] for s in STATES}
    seen = set()
    out = []
    for (en, hi, sc) in CITIES:
        sc = sc.strip()
        key = (en, sc)
        if key in seen or sc not in valid_codes:
            continue
        seen.add(key)
        out.append({"name_en": en, "name_hi": hi, "state_code": sc})
    out.sort(key=lambda x: x["name_en"])
    return out


def write_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        # ensure_ascii=False to keep Devanagari; separators reduce file size
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    size_kb = os.path.getsize(path) / 1024
    print(f"  ✓ {os.path.basename(path):28s} {size_kb:6.1f} KB")


def main():
    print("═" * 60)
    print("CKD Geo Dataset Generator")
    print("═" * 60)

    print(f"\n[1/3] States: {len(STATES)} entries (28 S + 8 UT)")
    write_json(os.path.join(OUT_DIR, "states.json"), STATES)

    districts, total = build_state_districts()
    print(f"\n[2/3] Districts: {total} total across {len(districts)} states/UTs")
    write_json(os.path.join(OUT_DIR, "districts.json"), districts)

    cities = build_cities()
    print(f"\n[3/3] Cities: {len(cities)} entries (deduplicated)")
    write_json(os.path.join(OUT_DIR, "cities.json"), cities)

    total_kb = sum(os.path.getsize(os.path.join(OUT_DIR, f)) for f in ("states.json","districts.json","cities.json")) / 1024
    print("\n" + "═" * 60)
    print(f"✅ Done. Total payload: {total_kb:.1f} KB")
    print("═" * 60)


if __name__ == "__main__":
    main()
