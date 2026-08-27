export interface EducationTopic {
  slug: string;
  icon: string;
  title_en: string;
  title_bn: string;
  summary_en: string;
  summary_bn: string;
  sections: {
    heading_en: string;
    heading_bn: string;
    points: { en: string; bn: string }[];
  }[];
}

export const EDUCATION_TOPICS: EducationTopic[] = [
  {
    slug: "traffic-rules",
    icon: "book-open",
    title_en: "Bangladesh Traffic Rules",
    title_bn: "বাংলাদেশের ট্রাফিক আইন",
    summary_en: "The core rules every road user in Bangladesh is expected to follow, under the Bangladesh Road Transport Act 2018.",
    summary_bn: "বাংলাদেশ সড়ক পরিবহন আইন ২০১৮ অনুযায়ী প্রতিটি সড়ক ব্যবহারকারীর জন্য প্রযোজ্য মূল নিয়মাবলী।",
    sections: [
      {
        heading_en: "Basic obligations",
        heading_bn: "মৌলিক দায়িত্ব",
        points: [
          { en: "Drive only with a valid license for the vehicle class you're operating.", bn: "যে শ্রেণীর গাড়ি চালাচ্ছেন তার জন্য বৈধ লাইসেন্স থাকা আবশ্যক।" },
          { en: "Keep vehicle registration, fitness certificate, tax token, and insurance current.", bn: "গাড়ির নিবন্ধন, ফিটনেস সার্টিফিকেট, ট্যাক্স টোকেন এবং বীমা হালনাগাদ রাখুন।" },
          { en: "Follow posted speed limits — lower in residential and school zones.", bn: "নির্ধারিত গতিসীমা মেনে চলুন — আবাসিক ও স্কুল এলাকায় গতিসীমা কম থাকে।" },
          { en: "Never drive under the influence of alcohol or drugs.", bn: "মদ্যপ বা মাদকাসক্ত অবস্থায় কখনো গাড়ি চালাবেন না।" },
        ],
      },
      {
        heading_en: "Documents to always carry",
        heading_bn: "সাথে রাখার কাগজপত্র",
        points: [
          { en: "Driving license (original or digital copy where accepted).", bn: "ড্রাইভিং লাইসেন্স (মূল বা ডিজিটাল কপি, যেখানে গ্রহণযোগ্য)।" },
          { en: "Vehicle registration certificate.", bn: "গাড়ির নিবন্ধন সনদ।" },
          { en: "Valid fitness certificate and tax token.", bn: "বৈধ ফিটনেস সার্টিফিকেট এবং ট্যাক্স টোকেন।" },
        ],
      },
    ],
  },
  {
    slug: "road-signs",
    icon: "octagon-alert",
    title_en: "Road Signs",
    title_bn: "সড়ক চিহ্ন",
    summary_en: "Road signs are grouped into three families by shape and color — learning the family tells you how to react before you can even read the text.",
    summary_bn: "সড়ক চিহ্নগুলো আকৃতি ও রঙ অনুযায়ী তিনটি শ্রেণীতে বিভক্ত — শ্রেণী চিনলে লেখা পড়ার আগেই বুঝতে পারবেন কীভাবে প্রতিক্রিয়া জানাতে হবে।",
    sections: [
      {
        heading_en: "Regulatory signs (circular, red border)",
        heading_bn: "নিয়ন্ত্রণমূলক চিহ্ন (গোলাকার, লাল সীমানা)",
        points: [
          { en: "Tell you what you must or must not do — no entry, no parking, speed limit.", bn: "কী করতে হবে বা করা যাবে না তা নির্দেশ করে — প্রবেশ নিষেধ, পার্কিং নিষেধ, গতিসীমা।" },
          { en: "A red circle with a diagonal bar always means prohibition.", bn: "লাল বৃত্তে তির্যক দাগ থাকলে তা সর্বদা নিষেধাজ্ঞা বোঝায়।" },
        ],
      },
      {
        heading_en: "Warning signs (triangular, yellow)",
        heading_bn: "সতর্কতামূলক চিহ্ন (ত্রিভুজাকার, হলুদ)",
        points: [
          { en: "Alert you to hazards ahead — sharp curve, school zone, narrow bridge.", bn: "সামনে বিপদের বিষয়ে সতর্ক করে — তীক্ষ্ণ বাঁক, স্কুল এলাকা, সরু সেতু।" },
          { en: "Slow down and be ready to react, even if the road looks clear.", bn: "রাস্তা পরিষ্কার মনে হলেও গতি কমিয়ে প্রস্তুত থাকুন।" },
        ],
      },
      {
        heading_en: "Informatory signs (rectangular, blue/green)",
        heading_bn: "তথ্যমূলক চিহ্ন (আয়তক্ষেত্রাকার, নীল/সবুজ)",
        points: [
          { en: "Give directions, distances, and facility locations — hospitals, fuel stations, parking.", bn: "দিকনির্দেশনা, দূরত্ব এবং সুবিধার অবস্থান জানায় — হাসপাতাল, জ্বালানি স্টেশন, পার্কিং।" },
        ],
      },
    ],
  },
  {
    slug: "traffic-signals",
    icon: "traffic-cone",
    title_en: "Traffic Signals",
    title_bn: "ট্রাফিক সিগন্যাল",
    summary_en: "The three-light signal is the same everywhere in Bangladesh — what changes is how strictly it's enforced and how quickly drivers anticipate the change.",
    summary_bn: "তিন রঙের সিগন্যাল বাংলাদেশের সর্বত্র একই — যা পরিবর্তিত হয় তা হলো এটি কতটা কঠোরভাবে প্রয়োগ করা হয় এবং চালকরা কত দ্রুত পরিবর্তন আঁচ করতে পারেন।",
    sections: [
      {
        heading_en: "What each light means",
        heading_bn: "প্রতিটি বাতির অর্থ",
        points: [
          { en: "Red — stop completely behind the stop line; never enter the intersection.", bn: "লাল — স্টপ লাইনের পেছনে সম্পূর্ণভাবে থামুন; চৌরাস্তায় প্রবেশ করবেন না।" },
          { en: "Yellow (after green) — clear the intersection if you're already in it; otherwise stop.", bn: "হলুদ (সবুজের পর) — ইতোমধ্যে চৌরাস্তায় থাকলে অতিক্রম করুন; নয়তো থামুন।" },
          { en: "Green — proceed only if the way is clear, yielding to pedestrians already crossing.", bn: "সবুজ — পথ পরিষ্কার থাকলে অগ্রসর হন, ইতোমধ্যে পারাপাররত পথচারীদের অগ্রাধিকার দিন।" },
        ],
      },
      {
        heading_en: "At a signal with a traffic officer present",
        heading_bn: "ট্রাফিক পুলিশ উপস্থিত থাকলে",
        points: [
          { en: "The officer's hand signals override the light signal.", bn: "পুলিশের হাতের সংকেত বাতির সংকেতের চেয়ে অগ্রাধিকার পায়।" },
        ],
      },
    ],
  },
  {
    slug: "lane-discipline",
    icon: "move-horizontal",
    title_en: "Lane Discipline",
    title_bn: "লেন শৃঙ্খলা",
    summary_en: "Most of Dhaka's worst congestion isn't caused by too many vehicles — it's caused by lane-weaving that turns three lanes' worth of capacity into one.",
    summary_bn: "ঢাকার অধিকাংশ যানজটের কারণ অতিরিক্ত গাড়ি নয় — বরং লেন পরিবর্তনের ফলে তিন লেনের ধারণক্ষমতা এক লেনে পরিণত হওয়া।",
    sections: [
      {
        heading_en: "Core rules",
        heading_bn: "মূল নিয়ম",
        points: [
          { en: "Stay within a single lane; change lanes only with a clear gap and a signal.", bn: "একটি লেনের মধ্যে থাকুন; শুধুমাত্র পর্যাপ্ত ফাঁক ও সিগন্যাল দিয়ে লেন পরিবর্তন করুন।" },
          { en: "Slower traffic keeps to the left; overtake from the right where permitted.", bn: "ধীরগতির যান বামে থাকবে; অনুমতি থাকলে ডান দিক থেকে ওভারটেক করুন।" },
          { en: "Never straddle two lanes to block others from overtaking.", bn: "অন্যদের ওভারটেক করা থেকে আটকাতে দুই লেন জুড়ে গাড়ি চালাবেন না।" },
          { en: "Motorcycles and CNGs must keep to their designated lane where one is marked.", bn: "মোটরসাইকেল ও সিএনজি চিহ্নিত লেনে চলাচল করবে যদি তা নির্ধারিত থাকে।" },
        ],
      },
    ],
  },
  {
    slug: "bus-stopping-rules",
    icon: "bus",
    title_en: "Bus Stopping Rules",
    title_bn: "বাস থামানোর নিয়ম",
    summary_en: "Illegal mid-road stoppage to pick up or drop off passengers is one of the most-reported violations on this platform — here's what's actually required.",
    summary_bn: "যাত্রী ওঠানো-নামানোর জন্য রাস্তার মাঝে অবৈধভাবে বাস থামানো এই প্ল্যাটফর্মে সবচেয়ে বেশি রিপোর্ট হওয়া লঙ্ঘনগুলোর একটি — প্রকৃত নিয়ম এখানে জানুন।",
    sections: [
      {
        heading_en: "Where buses may stop",
        heading_bn: "যেখানে বাস থামতে পারে",
        points: [
          { en: "Only at a designated bus stop or bay, pulled fully to the roadside.", bn: "শুধুমাত্র নির্ধারিত বাস স্টপ বা বেতে, রাস্তার পাশে সম্পূর্ণভাবে টেনে।" },
          { en: "Never in a live traffic lane, on a bridge, or at an intersection.", bn: "চলমান ট্রাফিক লেনে, সেতুতে বা চৌরাস্তায় কখনো নয়।" },
          { en: "Stops should be brief — enough time to board/alight safely, not to wait for more passengers.", bn: "থামা সংক্ষিপ্ত হওয়া উচিত — নিরাপদে ওঠা-নামার জন্য যথেষ্ট, আরও যাত্রীর জন্য অপেক্ষা করার জন্য নয়।" },
        ],
      },
      {
        heading_en: "Why it matters",
        heading_bn: "কেন এটি গুরুত্বপূর্ণ",
        points: [
          { en: "A bus stopped mid-lane forces following traffic to swerve suddenly, a major cause of side-impact collisions.", bn: "লেনের মাঝে থামা বাস পেছনের যানবাহনকে হঠাৎ মোড় নিতে বাধ্য করে, যা পার্শ্ব সংঘর্ষের একটি প্রধান কারণ।" },
          { en: "Passengers boarding from a traffic lane (instead of the roadside) are exposed to moving vehicles.", bn: "রাস্তার পাশের বদলে ট্রাফিক লেন থেকে ওঠা যাত্রীরা চলমান যানবাহনের ঝুঁকিতে পড়েন।" },
        ],
      },
    ],
  },
  {
    slug: "parking-rules",
    icon: "parking-circle-off",
    title_en: "Parking Rules",
    title_bn: "পার্কিং নিয়ম",
    summary_en: "Parking is legal almost nowhere it's convenient — knowing the no-parking defaults avoids most accidental violations.",
    summary_bn: "সুবিধাজনক প্রায় কোথাও পার্কিং বৈধ নয় — নো-পার্কিং ডিফল্ট নিয়মগুলো জানলে অধিকাংশ অনিচ্ছাকৃত লঙ্ঘন এড়ানো যায়।",
    sections: [
      {
        heading_en: "Never park",
        heading_bn: "কখনো পার্ক করবেন না",
        points: [
          { en: "Within an intersection or within a set distance of one.", bn: "চৌরাস্তার ভেতরে বা তার নির্ধারিত দূরত্বের মধ্যে।" },
          { en: "On a footpath, blocking pedestrian access.", bn: "ফুটপাতে, পথচারীদের চলাচল বন্ধ করে।" },
          { en: "In front of a fire hydrant, hospital gate, or emergency exit.", bn: "ফায়ার হাইড্রেন্ট, হাসপাতালের গেট বা জরুরি প্রস্থানের সামনে।" },
          { en: "Double-parked next to another parked vehicle, blocking a lane.", bn: "অন্য পার্ক করা গাড়ির পাশে ডাবল পার্কিং করে লেন বন্ধ করে।" },
        ],
      },
    ],
  },
  {
    slug: "pedestrian-safety",
    icon: "footprints",
    title_en: "Pedestrian Safety",
    title_bn: "পথচারী নিরাপত্তা",
    summary_en: "Pedestrians have the right of way at marked crossings — but visibility and predictability matter just as much as the rule itself.",
    summary_bn: "চিহ্নিত ক্রসিংয়ে পথচারীদের অগ্রাধিকার রয়েছে — তবে দৃশ্যমানতা ও পূর্বানুমানযোগ্যতাও নিয়মের মতোই গুরুত্বপূর্ণ।",
    sections: [
      {
        heading_en: "For pedestrians",
        heading_bn: "পথচারীদের জন্য",
        points: [
          { en: "Use a footbridge, underpass, or zebra crossing whenever one is available.", bn: "উপলব্ধ থাকলে ফুট-ওভারব্রিজ, আন্ডারপাস বা জেব্রা ক্রসিং ব্যবহার করুন।" },
          { en: "Make eye contact with drivers before crossing where there's no signal.", bn: "সিগন্যাল না থাকলে পার হওয়ার আগে চালকদের সাথে চোখাচোখি করুন।" },
          { en: "Never cross diagonally between moving lanes of traffic.", bn: "চলমান ট্রাফিক লেনের মধ্য দিয়ে তির্যকভাবে পার হবেন না।" },
        ],
      },
      {
        heading_en: "For drivers",
        heading_bn: "চালকদের জন্য",
        points: [
          { en: "Always yield to pedestrians already on a marked crossing.", bn: "চিহ্নিত ক্রসিংয়ে ইতোমধ্যে থাকা পথচারীদের সর্বদা অগ্রাধিকার দিন।" },
          { en: "Slow down near schools, markets, and bus stops even without a posted sign.", bn: "স্কুল, বাজার ও বাস স্টপের কাছে চিহ্ন না থাকলেও গতি কমান।" },
        ],
      },
    ],
  },
  {
    slug: "motorcycle-safety",
    icon: "zap",
    title_en: "Motorcycle Safety",
    title_bn: "মোটরসাইকেল নিরাপত্তা",
    summary_en: "Motorcycles make up a disproportionate share of serious road injuries in Bangladesh — a handful of habits account for most of the difference.",
    summary_bn: "বাংলাদেশে গুরুতর সড়ক দুর্ঘটনার একটি বড় অংশ মোটরসাইকেলের সাথে জড়িত — কয়েকটি অভ্যাসই এই পার্থক্যের বড় কারণ।",
    sections: [
      {
        heading_en: "Non-negotiables",
        heading_bn: "অবশ্যপালনীয়",
        points: [
          { en: "Both rider and pillion must wear a properly fastened helmet, every ride.", bn: "চালক ও যাত্রী উভয়কেই প্রতিবার যথাযথভাবে বাঁধা হেলমেট পরতে হবে।" },
          { en: "Never carry more than one pillion passenger.", bn: "কখনো একজনের বেশি যাত্রী বহন করবেন না।" },
          { en: "Use headlights during the day in low-visibility conditions, not just at night.", bn: "শুধু রাতে নয়, কম দৃশ্যমানতার সময় দিনেও হেডলাইট ব্যবহার করুন।" },
          { en: "Avoid weaving between lanes in heavy traffic — it's the leading cause of side-impact motorcycle crashes.", bn: "যানজটে লেনের মধ্যে আঁকাবাঁকা চলাচল এড়িয়ে চলুন — এটি পার্শ্ব সংঘর্ষের প্রধান কারণ।" },
        ],
      },
    ],
  },
  {
    slug: "helmet-seatbelt",
    icon: "shield-check",
    title_en: "Helmet & Seatbelt Education",
    title_bn: "হেলমেট ও সিটবেল্ট শিক্ষা",
    summary_en: "The single most effective thing any road user can do to survive a crash is already sitting in the vehicle with them.",
    summary_bn: "দুর্ঘটনায় বেঁচে থাকার জন্য সবচেয়ে কার্যকর জিনিসটি প্রতিটি সড়ক ব্যবহারকারীর কাছে ইতোমধ্যেই আছে।",
    sections: [
      {
        heading_en: "Helmets",
        heading_bn: "হেলমেট",
        points: [
          { en: "A helmet must be fastened, not just worn loosely — an unfastened helmet can come off on impact.", bn: "হেলমেট শুধু পরাই নয়, বাঁধতেও হবে — না বাঁধা হেলমেট আঘাতের সময় খুলে যেতে পারে।" },
          { en: "Replace a helmet after any significant impact, even without visible damage.", bn: "উল্লেখযোগ্য আঘাতের পর দৃশ্যমান ক্ষতি না থাকলেও হেলমেট পরিবর্তন করুন।" },
        ],
      },
      {
        heading_en: "Seatbelts",
        heading_bn: "সিটবেল্ট",
        points: [
          { en: "Every seat, every trip — including rear seats and short trips.", bn: "প্রতিটি আসনে, প্রতিটি যাত্রায় — পেছনের আসন ও ছোট যাত্রাসহ।" },
          { en: "A seatbelt roughly halves the risk of fatal injury in a front-seat crash.", bn: "সামনের আসনে দুর্ঘটনায় প্রাণঘাতী আঘাতের ঝুঁকি সিটবেল্ট প্রায় অর্ধেক কমিয়ে দেয়।" },
        ],
      },
    ],
  },
];
