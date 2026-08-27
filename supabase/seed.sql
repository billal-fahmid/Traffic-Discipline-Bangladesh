-- =====================================================================
-- Demo data — safe to re-run (uses upsert on natural keys)
-- Run after schema.sql + rls.sql
-- =====================================================================

insert into public.violation_categories
  (slug, name_en, name_bn, description_en, description_bn, icon, severity, is_special, sort_order)
values
  ('illegal-parking', 'Illegal Parking', 'অবৈধ পার্কিং',
   'Vehicle parked in a no-parking zone, blocking traffic or footpaths.',
   'নো-পার্কিং জোনে গাড়ি পার্ক করা, যা যান চলাচল বা ফুটপাত বন্ধ করে দেয়।',
   'parking-circle-off', 1, false, 1),

  ('wrong-side-driving', 'Wrong-Side Driving', 'ভুল পাশে গাড়ি চালানো',
   'Driving against the flow of traffic.',
   'যানবাহনের প্রবাহের বিপরীতে গাড়ি চালানো।',
   'move-left', 3, false, 2),

  ('signal-violation', 'Traffic Signal Violation', 'সিগন্যাল অমান্য',
   'Running a red light or ignoring traffic signals.',
   'লাল বাতি অমান্য করা বা ট্রাফিক সিগন্যাল উপেক্ষা করা।',
   'traffic-cone', 2, false, 3),

  ('reckless-driving', 'Reckless / Dangerous Driving', 'বেপরোয়া গাড়ি চালানো',
   'Speeding, weaving through traffic, or otherwise dangerous driving.',
   'অতিরিক্ত গতি, বিপজ্জনকভাবে লেন পরিবর্তন করা ইত্যাদি।',
   'zap', 3, false, 4),

  ('no-helmet', 'No Helmet', 'হেলমেট ছাড়া',
   'Motorcycle rider or pillion riding without a helmet.',
   'হেলমেট ছাড়া মোটরসাইকেল চালানো বা যাত্রী হওয়া।',
   'shield-alert', 2, false, 5),

  ('overloading', 'Vehicle Overloading', 'ওভারলোডিং',
   'Carrying passengers or cargo beyond safe/legal limits.',
   'নিরাপদ বা আইনি সীমার বাইরে যাত্রী বা মালামাল বহন করা।',
   'package-plus', 2, false, 6),

  ('illegal-bus-stoppage', 'Illegal Bus/Passenger Pickup-Drop', 'অবৈধ স্থানে বাস থামানো',
   'Bus or vehicle stopping outside a designated stand to pick up or drop off passengers, blocking a lane or causing congestion.',
   'নির্ধারিত স্ট্যান্ডের বাইরে যাত্রী ওঠানো-নামানোর জন্য বাস থামানো, যা লেন ব্লক করে বা যানজট সৃষ্টি করে।',
   'bus', 2, true, 7),

  ('fake-fitness-registration', 'Fake/Expired Fitness or Registration', 'ভুয়া/মেয়াদোত্তীর্ণ ফিটনেস বা নিবন্ধন',
   'Vehicle operating with expired or fraudulent fitness/registration papers.',
   'মেয়াদোত্তীর্ণ বা জাল ফিটনেস/নিবন্ধন কাগজপত্র নিয়ে গাড়ি চালানো।',
   'file-x', 2, false, 8),

  ('unauthorized-modification', 'Unauthorized Vehicle Modification', 'অননুমোদিত পরিবর্তন',
   'Illegal hydraulic horns, modified silencers, unauthorized structural changes.',
   'অবৈধ হাইড্রোলিক হর্ন, পরিবর্তিত সাইলেন্সার, অননুমোদিত কাঠামোগত পরিবর্তন।',
   'wrench', 1, false, 9),

  ('other', 'Other Violation', 'অন্যান্য লঙ্ঘন',
   'Any other traffic violation not listed above.',
   'উপরে তালিকাভুক্ত নয় এমন যেকোনো ট্রাফিক লঙ্ঘন।',
   'more-horizontal', 1, false, 10)
on conflict (slug) do update set
  name_en = excluded.name_en,
  name_bn = excluded.name_bn,
  description_en = excluded.description_en,
  description_bn = excluded.description_bn,
  icon = excluded.icon,
  severity = excluded.severity,
  is_special = excluded.is_special,
  sort_order = excluded.sort_order;

-- ─────────────────────────────────────────────────────────────────────
-- Demo reports (anonymous). Reuses generate_report_code()/token() so
-- these look exactly like real submissions.
-- ─────────────────────────────────────────────────────────────────────

do $$
declare
  cat_parking uuid;
  cat_signal uuid;
  cat_bus uuid;
  cat_helmet uuid;
begin
  select id into cat_parking from public.violation_categories where slug = 'illegal-parking';
  select id into cat_signal from public.violation_categories where slug = 'signal-violation';
  select id into cat_bus from public.violation_categories where slug = 'illegal-bus-stoppage';
  select id into cat_helmet from public.violation_categories where slug = 'no-helmet';

  insert into public.reports
    (report_code, tracking_token, mode, status, category_id, vehicle_type, vehicle_registration,
     vehicle_color, latitude, longitude, location_label, district, thana, description, created_at)
  values
    (public.generate_report_code(), public.generate_tracking_token(), 'anonymous', 'submitted', cat_parking,
     'Private Car', 'DHAKA METRO GA 12-3456', 'White', 23.7509, 90.3935,
     'In front of Gulshan 1 DCC Market, no-parking zone', 'Dhaka', 'Gulshan',
     'Car parked directly on the crossing, forcing pedestrians onto the road.', now() - interval '2 days'),

    (public.generate_report_code(), public.generate_tracking_token(), 'anonymous', 'under_review', cat_signal,
     'Motorcycle', 'DHAKA METRO HA 88-1122', 'Black', 23.7808, 90.4197,
     'Banani Rd 11 signal', 'Dhaka', 'Banani',
     'Rider went through a red signal at high speed, nearly hit a pedestrian.', now() - interval '5 days'),

    (public.generate_report_code(), public.generate_tracking_token(), 'anonymous', 'action_taken', cat_bus,
     'Bus', 'DHAKA METRO KHA 55-7788', 'Green/Yellow', 23.7461, 90.3742,
     'Farmgate, outside designated bus bay', 'Dhaka', 'Tejgaon',
     'Bus stopped in the middle lane for ~7 minutes picking up passengers, causing a 15-vehicle backup.', now() - interval '10 days'),

    (public.generate_report_code(), public.generate_tracking_token(), 'anonymous', 'verified', cat_helmet,
     'Motorcycle', null, 'Red', 23.8759, 90.3795,
     'Uttara Sector 7 main road', 'Dhaka', 'Uttara',
     'Two riders, neither wearing a helmet, riding at speed with a child between them.', now() - interval '1 day');
end $$;
