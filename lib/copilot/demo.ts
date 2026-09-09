import type { Scenario, Profile, Language } from './types';
export const categories = [
  'Government schemes',
  'Finance & banking',
  'GST & compliance',
  'Business expansion',
  'Exports',
  'Digital marketing',
];
export const demoPeople = [
  ['Aditya Deshmukh', 'Government schemes', 'English, Marathi, Hindi'],
  ['Neha Kulkarni', 'Finance & banking', 'English, Hindi'],
  ['Vikram Shah', 'GST & compliance', 'English, Marathi'],
  ['Priya Joshi', 'Exports', 'English, Hindi'],
  ['Sameer Patil', 'Business expansion', 'English, Marathi'],
];
export const demoCompanies = [
  ['Pragati Precision Pvt. Ltd.', 'Manufacturing', 'Pune', 'Rahul Patil'],
  ['GreenLeaf Foods', 'Food processing', 'Nashik', 'Sneha Kulkarni'],
  ['Shah Engineering Works', 'Engineering', 'Pune', 'Amit Shah'],
  ['Sahyadri Textiles', 'Textiles', 'Kolhapur', 'Meera Joshi'],
  ['Nirmiti Digital', 'IT services', 'Mumbai', 'Rohan Kale'],
  ['Aarambh Retail', 'Retail', 'Nagpur', 'Pooja Mehta'],
  ['Deccan Agro', 'Agriculture', 'Satara', 'Kiran Pawar'],
  ['Spark Components', 'Electronics', 'Aurangabad', 'Nitin More'],
  ['BlueRiver Packaging', 'Packaging', 'Thane', 'Anjali Rao'],
  ['Swaraj Tools', 'Manufacturing', 'Pimpri-Chinchwad', 'Sanjay Jadhav'],
];
export const guidance: Record<
  Scenario,
  {
    title: string;
    category: string;
    keywords: string;
    en: string[];
    hi: string[];
    mr: string[];
    check: string[];
    followups: string[];
  }
> = {
  schemes: {
    title: 'Scheme enquiry — consultant discovery checklist',
    category: categories[0],
    keywords:
      'scheme subsidy government manufacturing MSME Udyam PMEGP योजना सब्सिडी अनुदान subsidy',
    en: [
      'Confirm the unit’s location, business activity and Udyam registration.',
      'Record current investment, turnover and the proposed project cost.',
      'Check a current, approved scheme document before advising on eligibility or subsidy amounts.',
    ],
    hi: [
      'इकाई का स्थान, व्यवसाय और उद्यम पंजीकरण की पुष्टि करें।',
      'निवेश, वार्षिक टर्नओवर और प्रस्तावित परियोजना की लागत दर्ज करें।',
      'पात्रता या अनुदान की राशि बताने से पहले स्वीकृत योजना दस्तावेज़ की जाँच करें।',
    ],
    mr: [
      'उद्योगाचे ठिकाण, व्यवसाय आणि उद्यम नोंदणीची खात्री करा.',
      'गुंतवणूक, वार्षिक उलाढाल आणि प्रस्तावित प्रकल्पाचा खर्च नोंदवा.',
      'पात्रता किंवा अनुदानाची रक्कम सांगण्यापूर्वी मंजूर योजनेचे अद्ययावत दस्तऐवज तपासा.',
    ],
    check: [
      'Location and industry',
      'Investment and annual turnover',
      'Udyam registration',
      'Current approved scheme terms',
    ],
    followups: [
      'What is your current annual turnover?',
      'How much do you plan to invest?',
      'Which district is the unit located in?',
      'Do you have Udyam registration?',
    ],
  },
  loans: {
    title: 'Business finance — preparation checklist',
    category: categories[1],
    keywords: 'loan bank finance funding collateral credit पैसा कर्ज लोन बैंक',
    en: [
      'Ask about the funding purpose, amount and expected repayment capacity.',
      'Review available financial statements, tax filings and banking history.',
      'Record existing obligations and discuss options with an authorized lender; approval is not guaranteed.',
    ],
    hi: [
      'ऋण का उद्देश्य, राशि और भुगतान क्षमता पूछें।',
      'वित्तीय विवरण, कर रिटर्न और बैंकिंग इतिहास देखें।',
      'मौजूदा ऋण दर्ज करें और अधिकृत ऋणदाता से विकल्प जाँचें; मंजूरी निश्चित नहीं है।',
    ],
    mr: [
      'कर्जाचा उद्देश, रक्कम आणि परतफेडीची क्षमता विचारा.',
      'आर्थिक विवरणपत्रे, कर विवरणपत्रे आणि बँकिंग इतिहास तपासा.',
      'सध्याची कर्जे नोंदवा आणि अधिकृत कर्जदात्याकडून पर्याय तपासा; मंजुरीची हमी नाही.',
    ],
    check: [
      'Funding purpose and amount',
      'Financial and banking records',
      'Existing loan obligations',
    ],
    followups: [
      'How much funding do you need?',
      'What will the funds be used for?',
      'Do you have recent financial statements?',
      'Are there existing business loans?',
    ],
  },
  gst: {
    title: 'Compliance enquiry — document review checklist',
    category: categories[2],
    keywords: 'gst compliance tax return filing invoice कर जीएसटी रिटर्न',
    en: [
      'Clarify the transaction, reporting period and exact compliance concern.',
      'Gather registration details, relevant invoices and previously filed returns.',
      'Refer deadlines, rates and legal interpretations to a verified current source or qualified tax professional.',
    ],
    hi: [
      'लेनदेन, अवधि और अनुपालन की समस्या स्पष्ट करें।',
      'पंजीकरण विवरण, चालान और दाखिल रिटर्न एकत्र करें।',
      'समय-सीमा और दरें वर्तमान प्रमाणित स्रोत या कर विशेषज्ञ से सत्यापित करें।',
    ],
    mr: [
      'व्यवहार, कालावधी आणि अनुपालनाची समस्या स्पष्ट करा.',
      'नोंदणी, संबंधित पावत्या आणि भरलेली विवरणपत्रे गोळा करा.',
      'मुदती आणि दर अद्ययावत स्रोत किंवा कर तज्ज्ञाकडून तपासा.',
    ],
    check: ['Relevant period', 'Registration status', 'Invoices and returns'],
    followups: [
      'Which reporting period is affected?',
      'Is the business GST registered?',
      'What records are currently available?',
    ],
  },
  expansion: {
    title: 'Factory expansion — discovery checklist',
    category: categories[3],
    keywords:
      'expand expansion factory machinery investment विस्तार गुंतवणूक कारखाना',
    en: [
      'Establish the proposed location, investment and expansion timeline.',
      'Separate land, building, machinery and working-capital requirements.',
      'Confirm financing needs and permissions with qualified local specialists.',
    ],
    hi: [
      'स्थान, निवेश और विस्तार की समयरेखा तय करें।',
      'भूमि, भवन, मशीनरी और कार्यशील पूंजी की जरूरतें अलग दर्ज करें।',
      'वित्त और अनुमतियों की जरूरत विशेषज्ञ से जाँचें।',
    ],
    mr: [
      'प्रस्तावित ठिकाण, गुंतवणूक आणि विस्ताराची वेळ ठरवा.',
      'जमीन, इमारत, यंत्रसामग्री आणि खेळत्या भांडवलाच्या गरजा स्वतंत्र नोंदवा.',
      'वित्तपुरवठा आणि परवानग्यांसाठी स्थानिक तज्ज्ञांचा सल्ला घ्या.',
    ],
    check: [
      'Project cost',
      'Location',
      'New employees',
      'Machinery and funding',
    ],
    followups: [
      'What is the proposed investment?',
      'Where will the expansion take place?',
      'How many new employees are planned?',
      'What financing will you need?',
    ],
  },
  exports: {
    title: 'First export — discovery checklist',
    category: categories[4],
    keywords: 'export overseas international buyer निर्यात एक्सपोर्ट विदेश',
    en: [
      'Identify the product, destination market and prospective buyer.',
      'Check current registration, product standards and shipping requirements against official sources.',
      'Create a document checklist with an export advisor before committing to a shipment.',
    ],
    hi: [
      'उत्पाद, देश और संभावित ग्राहक की पहचान करें।',
      'पंजीकरण, मानक और शिपिंग आवश्यकताएँ आधिकारिक स्रोतों से जाँचें।',
      'शिपमेंट से पहले निर्यात सलाहकार के साथ दस्तावेज़ सूची बनाएँ।',
    ],
    mr: [
      'उत्पादन, देश आणि संभाव्य खरेदीदार ओळखा.',
      'नोंदणी, मानके आणि वाहतुकीच्या अटी अधिकृत स्रोतांकडून तपासा.',
      'माल पाठवण्यापूर्वी निर्यात सल्लागारासोबत कागदपत्रांची यादी तयार करा.',
    ],
    check: [
      'Product and destination',
      'Registration',
      'Buyer and payment terms',
    ],
    followups: [
      'What product would you like to export?',
      'Which market are you considering?',
      'Have you already identified a buyer?',
    ],
  },
  marketing: {
    title: 'Digital marketing — business discovery checklist',
    category: categories[5],
    keywords:
      'marketing digital leads online website customers सोशल ग्राहक डिजिटल',
    en: [
      'Clarify the target customer, offer and monthly marketing budget.',
      'Review current channels and how enquiries are tracked.',
      'Start with a measurable small experiment and compare qualified enquiries with cost.',
    ],
    hi: [
      'लक्षित ग्राहक, प्रस्ताव और मासिक बजट स्पष्ट करें।',
      'मौजूदा चैनल और पूछताछ की ट्रैकिंग जाँचें।',
      'छोटे प्रयोग से शुरुआत करें और योग्य पूछताछ की लागत मापें।',
    ],
    mr: [
      'लक्ष्य ग्राहक, प्रस्ताव आणि मासिक बजेट स्पष्ट करा.',
      'सध्याचे माध्यम आणि चौकशी कशी नोंदवली जाते ते तपासा.',
      'छोटा प्रयोग सुरू करा आणि पात्र चौकशीच्या तुलनेत खर्च मोजा.',
    ],
    check: ['Target customer', 'Budget', 'Current channels', 'Measurement'],
    followups: [
      'Who is your ideal customer?',
      'What is your monthly marketing budget?',
      'Where do your enquiries come from today?',
    ],
  },
};
export const conversations: Record<
  Scenario,
  {
    speaker: 'Client' | 'Consultant';
    text: string;
    language: string;
    profile?: Profile;
  }[]
> = {
  schemes: [
    {
      speaker: 'Client',
      text: 'नमस्कार, माझ्या manufacturing business साठी government subsidy मिळू शकते का?',
      language: 'Marathi + English',
    },
    {
      speaker: 'Consultant',
      text: 'नक्की. तुमची कंपनी कुठे आहे आणि काय उत्पादन करता?',
      language: 'Marathi',
    },
    {
      speaker: 'Client',
      text: 'आमची Pragati Precision कंपनी पुण्यात आहे. आम्ही automotive components बनवतो. Turnover ₹4.2 Cr आहे आणि 35 employees आहेत.',
      language: 'Marathi + English',
      profile: {
        company: 'Pragati Precision Pvt. Ltd.',
        industry: 'Manufacturing',
        location: 'Pune',
        turnover: '₹4.2 Cr',
        employees: '35',
      },
    },
    {
      speaker: 'Consultant',
      text: 'तुमच्याकडे Udyam registration आहे का? नवीन प्रकल्पासाठी किती गुंतवणूक करणार आहात?',
      language: 'Marathi + English',
    },
    {
      speaker: 'Client',
      text: 'हो, Udyam registered आहे. आम्हाला नवीन machinery साठी ₹75 Lakh funding पाहिजे. कुठली documents लागतील?',
      language: 'Marathi + English',
      profile: { udyam: 'Registered', funding: '₹75 Lakh', stage: 'Expansion' },
    },
  ],
  loans: [
    {
      speaker: 'Client',
      text: 'हमारा food business बढ़ रहा है, लेकिन bank loan मिलने में difficulty है।',
      language: 'Hindi + English',
    },
    {
      speaker: 'Consultant',
      text: 'How much funding do you need, and what will it be used for?',
      language: 'English',
    },
    {
      speaker: 'Client',
      text: 'हमें ₹25 Lakh working capital चाहिए। हमारी कंपनी Nashik में है और GST registered है।',
      language: 'Hindi + English',
      profile: {
        industry: 'Food processing',
        location: 'Nashik',
        funding: '₹25 Lakh',
        gst: 'Registered',
      },
    },
    {
      speaker: 'Client',
      text: 'Loan application के लिए कौन से documents तैयार रखने चाहिए?',
      language: 'Hindi + English',
    },
  ],
  gst: [
    {
      speaker: 'Client',
      text: 'We are GST registered, but some invoices are missing from our records. What should we do?',
      language: 'English',
      profile: { gst: 'Registered', problem: 'Missing invoices' },
    },
    {
      speaker: 'Consultant',
      text: 'Which reporting period is affected, and have any returns already been filed?',
      language: 'English',
    },
    {
      speaker: 'Client',
      text: 'It concerns last month. Can you help us prepare a checklist for our accountant?',
      language: 'English',
    },
  ],
  expansion: [
    {
      speaker: 'Client',
      text: 'आम्हाला आमच्या factory चा विस्तार करायचा आहे.',
      language: 'Marathi + English',
    },
    {
      speaker: 'Consultant',
      text: 'What is the proposed investment, and where will the new unit be?',
      language: 'English',
    },
    {
      speaker: 'Client',
      text: 'Pune मध्ये ₹1.5 Cr investment आहे. आणखी 20 employees लागतील. Financing options काय आहेत?',
      language: 'Marathi + English',
      profile: {
        location: 'Pune',
        investment: '₹1.5 Cr',
        employees: '20 new',
        stage: 'Expansion',
        funding: 'To be confirmed',
      },
    },
  ],
  exports: [
    {
      speaker: 'Client',
      text: 'We manufacture textiles and want to export to a new overseas buyer. Where should we start?',
      language: 'English',
      profile: { industry: 'Textiles', stage: 'First export' },
    },
    {
      speaker: 'Consultant',
      text: 'Which product and destination country are you considering?',
      language: 'English',
    },
    {
      speaker: 'Client',
      text: 'Cotton fabric for a buyer in the UAE. What should we verify before the first shipment?',
      language: 'English',
      profile: { requirements: 'First shipment checklist; UAE market' },
    },
  ],
  marketing: [
    {
      speaker: 'Client',
      text: 'हमारे online store पर enquiries कम हैं। Digital marketing कैसे improve करें?',
      language: 'Hindi + English',
      profile: { industry: 'Retail', problem: 'Low online enquiries' },
    },
    {
      speaker: 'Consultant',
      text: 'Who is your target customer, and what is your monthly marketing budget?',
      language: 'English',
    },
    {
      speaker: 'Client',
      text: 'Local customers target हैं। Budget ₹20,000 monthly है। कौन से channels try करें?',
      language: 'Hindi + English',
      profile: {
        requirements: 'Local customer acquisition; ₹20,000 monthly budget',
      },
    },
  ],
};
export function demoPoints(scenario: Scenario, language: Language) {
  const g = guidance[scenario];
  return language === 'Hindi' ? g.hi : language === 'Marathi' ? g.mr : g.en;
}
