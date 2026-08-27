-- =====================================================================
-- Milestone 2 demo data — traffic rule reference library.
-- Run after 002_case_management.sql + 002_case_management_rls.sql.
-- =====================================================================

do $$
declare
  cat_parking uuid; cat_signal uuid; cat_bus uuid; cat_helmet uuid;
  cat_wrongside uuid; cat_reckless uuid; cat_overload uuid; cat_fitness uuid;
begin
  select id into cat_parking from public.violation_categories where slug = 'illegal-parking';
  select id into cat_signal from public.violation_categories where slug = 'signal-violation';
  select id into cat_bus from public.violation_categories where slug = 'illegal-bus-stoppage';
  select id into cat_helmet from public.violation_categories where slug = 'no-helmet';
  select id into cat_wrongside from public.violation_categories where slug = 'wrong-side-driving';
  select id into cat_reckless from public.violation_categories where slug = 'reckless-driving';
  select id into cat_overload from public.violation_categories where slug = 'overloading';
  select id into cat_fitness from public.violation_categories where slug = 'fake-fitness-registration';

  insert into public.traffic_rules
    (rule_code, title_en, title_bn, description_en, description_bn, category_id, fine_amount_bdt, legal_reference)
  values
    ('MVA-140-PARK', 'No-Parking Zone Violation', 'নো-পার্কিং জোন লঙ্ঘন',
     'Parking a vehicle in a marked no-parking zone or in a way that obstructs traffic flow.',
     'চিহ্নিত নো-পার্কিং জোনে বা যান চলাচলে বাধা সৃষ্টি করে গাড়ি পার্ক করা।',
     cat_parking, 500, 'Bangladesh Road Transport Act 2018, Section 140'),

    ('MVA-152-SIGNAL', 'Traffic Signal Non-Compliance', 'সিগন্যাল অমান্য করা',
     'Failing to stop at a red traffic signal or disregarding a traffic controller''s signal.',
     'লাল সিগন্যালে না থামা বা ট্রাফিক নিয়ন্ত্রকের সংকেত অমান্য করা।',
     cat_signal, 1000, 'Bangladesh Road Transport Act 2018, Section 152'),

    ('MVA-148-STOP', 'Unauthorized Passenger Stoppage', 'অননুমোদিত যাত্রী স্টপেজ',
     'Stopping a public transport vehicle outside a designated stand to pick up or drop off passengers.',
     'নির্ধারিত স্ট্যান্ডের বাইরে যাত্রী তোলা বা নামানোর জন্য গণপরিবহন থামানো।',
     cat_bus, 2000, 'Bangladesh Road Transport Act 2018, Section 148'),

    ('MVA-89-HELMET', 'Riding Without a Helmet', 'হেলমেট ছাড়া চালানো',
     'Operating or riding pillion on a motorcycle without a properly fastened protective helmet.',
     'সঠিকভাবে বাঁধা প্রতিরক্ষামূলক হেলমেট ছাড়া মোটরসাইকেল চালানো বা যাত্রী হওয়া।',
     cat_helmet, 500, 'Bangladesh Road Transport Act 2018, Section 89'),

    ('MVA-105-WRONGSIDE', 'Driving Against Traffic Flow', 'বিপরীত দিকে গাড়ি চালানো',
     'Operating a vehicle against the designated direction of traffic on a one-way or divided road.',
     'একমুখী বা বিভক্ত সড়কে নির্ধারিত দিকের বিপরীতে যানবাহন চালানো।',
     cat_wrongside, 3000, 'Bangladesh Road Transport Act 2018, Section 105'),

    ('MVA-98-RECKLESS', 'Reckless or Dangerous Driving', 'বেপরোয়া বা বিপজ্জনক চালনা',
     'Driving in a manner that endangers life, property, or other road users.',
     'জীবন, সম্পত্তি বা অন্যান্য সড়ক ব্যবহারকারীদের বিপন্ন করে এমনভাবে গাড়ি চালানো।',
     cat_reckless, 5000, 'Bangladesh Road Transport Act 2018, Section 98'),

    ('MVA-131-OVERLOAD', 'Overloading Beyond Rated Capacity', 'রেটেড ক্ষমতার বেশি বোঝাই',
     'Carrying passengers or goods in excess of the vehicle''s certified capacity.',
     'যানবাহনের সার্টিফাইড ক্ষমতার বেশি যাত্রী বা মালামাল বহন করা।',
     cat_overload, 3000, 'Bangladesh Road Transport Act 2018, Section 131'),

    ('MVA-66-FITNESS', 'Operating Without Valid Fitness Certificate', 'বৈধ ফিটনেস সার্টিফিকেট ছাড়া চালনা',
     'Operating a motor vehicle with an expired, forged, or missing fitness certificate.',
     'মেয়াদোত্তীর্ণ, জাল বা অনুপস্থিত ফিটনেস সার্টিফিকেট নিয়ে মোটরযান চালানো।',
     cat_fitness, 5000, 'Bangladesh Road Transport Act 2018, Section 66')
  on conflict (rule_code) do update set
    title_en = excluded.title_en, title_bn = excluded.title_bn,
    description_en = excluded.description_en, description_bn = excluded.description_bn,
    fine_amount_bdt = excluded.fine_amount_bdt, legal_reference = excluded.legal_reference;
end $$;
