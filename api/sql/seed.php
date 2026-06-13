<?php
// Idempotent seed for lovebag_db. Run: php sql/seed.php
require_once __DIR__ . '/../core/Database.php';
$pdo = Database::pdo();

function upsertSetting($g, $k, $v, $t = 'string') {
    Database::run(
        "INSERT INTO settings (group_key,item_key,item_value,value_type) VALUES (?,?,?,?)
         ON DUPLICATE KEY UPDATE item_value=VALUES(item_value), value_type=VALUES(value_type)",
        [$g, $k, $v, $t]
    );
}

echo "Seeding...\n";

// ---- Admin ----
$adminEmail = 'admin@lovebag.com';
$exists = Database::one("SELECT id FROM admins WHERE email=?", [$adminEmail]);
if (!$exists) {
    Database::run(
        "INSERT INTO admins (name,email,password_hash,role) VALUES (?,?,?,?)",
        ['Lovebag Admin', $adminEmail, password_hash('admin123', PASSWORD_BCRYPT), 'owner']
    );
    echo "  admin created: $adminEmail / admin123\n";
} else {
    echo "  admin exists\n";
}

// ---- Theme + site settings ----
$theme = [
    ['primary_color', '#EAFE79', 'color'],
    ['secondary_color', '#161616', 'color'],
    ['text_color', '#545454', 'color'],
    ['bg_cream', '#EEEAE3', 'color'],
    ['bg_paper', '#F4F1EB', 'color'],
    ['bg_dark', '#111111', 'color'],
    ['font_sans', 'Inter Tight', 'string'],
    ['font_serif', 'Instrument Serif', 'string'],
    ['radius', '14', 'number'],
];
foreach ($theme as [$k, $v, $t]) upsertSetting('theme', $k, $v, $t);

$site = [
    ['site_name', 'Lovebag', 'string'],
    ['tagline', 'Bags crafted to move with your story', 'string'],
    ['currency', 'EUR', 'string'],
    ['free_ship_threshold', '100', 'number'],
    ['support_email', 'care@lovebag.com', 'string'],
    ['announcement', 'Join Lovebag Circle — earn points on every order', 'string'],
    ['announcement_enabled', '1', 'bool'],
];
foreach ($site as [$k, $v, $t]) upsertSetting('site', $k, $v, $t);

$seo = [
    ['meta_title', 'Lovebag — Bags crafted to move with your story', 'string'],
    ['meta_description', 'Crafted with care and designed to follow you from day to night. Discover the new collection of leather bags from Lovebag.', 'string'],
    ['og_image', 'https://qclay.design/lovable/bags/baggy-1.png', 'string'],
];
foreach ($seo as [$k, $v, $t]) upsertSetting('seo', $k, $v, $t);

// ---- Loyalty tiers ----
Database::run("DELETE FROM loyalty_tiers");
$tiers = [
    ['bloom', 'Bloom', 0, 1, 100, ['1 Glow Point per €1 spent','Free shipping over €100','A birthday reward','Member-only sales'], 0],
    ['bouquet', 'Bouquet', 500, 1.25, 75, ['1.25 Glow Points per €1 spent','Free shipping over €75','Early access to new drops','Double birthday reward'], 1],
    ['atelier', 'Atelier', 1500, 1.5, 0, ['1.5 Glow Points per €1 spent','Always free shipping','First access to new collections','Complimentary gift wrapping','Priority concierge'], 2],
];
foreach ($tiers as [$key, $name, $min, $rate, $ship, $perks, $pos]) {
    Database::run(
        "INSERT INTO loyalty_tiers (tier_key,name,min_spend,earn_rate,free_ship_threshold,perks,position) VALUES (?,?,?,?,?,?,?)",
        [$key, $name, $min, $rate, $ship, json_encode($perks), $pos]
    );
}

// ---- Reward catalog ----
Database::run("DELETE FROM reward_catalog");
$rewards = [
    ['ship', 'Free express shipping', 'On your next order', 600, 'shipping', null, 0],
    ['off10', '€10 off', 'A €10 credit toward any order', 1000, 'discount', 10, 1],
    ['giftwrap', 'Signature gift wrapping', 'Hand-tied, on us', 400, 'giftwrap', null, 2],
    ['off25', '€25 off', 'A €25 credit toward any order', 2500, 'discount', 25, 3],
    ['early', '48h early access', 'Shop new drops first', 800, 'early', null, 4],
];
foreach ($rewards as [$key, $label, $desc, $cost, $kind, $val, $pos]) {
    Database::run(
        "INSERT INTO reward_catalog (reward_key,label,description,cost_points,kind,value,position) VALUES (?,?,?,?,?,?,?)",
        [$key, $label, $desc, $cost, $kind, $val, $pos]
    );
}

// ---- Brand ----
Database::run("INSERT IGNORE INTO brands (name,slug,description,status) VALUES ('Lovebag','lovebag','House label',  'active')");
$brandId = (int) (Database::one("SELECT id FROM brands WHERE slug='lovebag'")['id'] ?? 0);

// ---- Categories: top "Bags" + the 6 product categories as children ----
Database::run("DELETE FROM categories");
Database::run("INSERT INTO categories (parent_id,name,slug,position,status) VALUES (NULL,'Bags','bags',0,'active')");
$bagsId = Database::lastId();
$catNames = ['Everyday tote','Evening clutch','City shoulder','Structured carry','Soft hobo','Mini crossbody'];
$catIds = [];
foreach ($catNames as $i => $cn) {
    $slug = strtolower(str_replace(' ', '-', $cn));
    Database::run("INSERT INTO categories (parent_id,name,slug,position,status) VALUES (?,?,?,?,'active')", [$bagsId, $cn, $slug, $i]);
    $catIds[$cn] = Database::lastId();
}

// ---- Color attribute + options ----
Database::run("DELETE FROM variant_attributes");
Database::run("INSERT INTO variant_attributes (name,slug,position) VALUES ('Color','color',0)");
$colorAttr = Database::lastId();
$allColors = [
    'Cognac' => '#9c5a2d', 'Black' => '#1a1a1a', 'Sand' => '#d8c7a8', 'Blush' => '#e7c4c0',
    'Noir' => '#1a1a1a', 'Ivory' => '#efe9dd', 'Olive' => '#5f6149', 'Cream' => '#e8e2d2',
    'Bordeaux' => '#6e2230', 'Tan' => '#b07a47', 'Caramel' => '#b07a47', 'Slate' => '#5a5f66',
];
$optId = [];
$cpos = 0;
foreach ($allColors as $cn => $hex) {
    if (isset($optId[$cn])) continue;
    Database::run("INSERT INTO variant_options (attribute_id,value,meta,position) VALUES (?,?,?,?)", [$colorAttr, $cn, $hex, $cpos++]);
    $optId[$cn] = Database::lastId();
}

// ---- Products ----
foreach (['product_seo','product_images','product_variant_options','product_variants','product_categories','product_tags','reviews','products'] as $t) {
    // children first (FK), products last
    Database::run("DELETE FROM $t");
}

$ASSET = 'https://qclay.design/lovable/bags';
$products = [
    ['terra','Terra',129.9,'Everyday tote','#E8E0D2',['Cognac','Black','Sand'],'Bestseller',24,4.7,128,
     'A roomy, unstructured tote that softens with every wear. Made to carry the whole day — laptop, lunch, the unexpected.',
     'Open top with magnetic closure. Internal zip pocket and two slip pockets. Handheld or shoulder carry.',
     'Full-grain Italian leather, cotton twill lining, brass hardware.',
     'Wipe with a soft dry cloth. Store stuffed in the dust bag, away from direct sunlight.',
     '38 × 30 × 13 cm','0.9 kg','Fits a 14" laptop, A4 documents and the everyday essentials.'],
    ['love-bag','Love Bag',149.9,'Evening clutch','#ECE7DE',['Blush','Noir','Ivory'],'New',12,4.9,86,
     'Our signature piece. A sculptural little bag that holds the essentials and turns every evening into an occasion.',
     'Framed clasp closure. Detachable chain strap. Fits phone, cards and a lipstick.',
     'Nappa leather, suede lining, gold-tone hardware.',
     'Spot clean with a damp cloth. Avoid contact with perfume and oils.',
     '20 × 12 × 6 cm','0.4 kg','Holds a phone, cards and a lipstick. Detachable chain strap.'],
    ['amelie','Amélie',139.9,'City shoulder','#E2E4E1',['Black','Olive','Cream'],'',18,4.6,64,
     'Clean lines, structured body, an everyday shoulder bag that reads quietly expensive from across the room.',
     'Top zip closure. Adjustable shoulder strap. Two internal compartments.',
     'Saffiano leather, microfibre lining, matte hardware.',
     'Wipe clean with a soft cloth. Condition lightly twice a year.',
     '28 × 20 × 10 cm','0.7 kg','Roomy enough for a tablet, wallet and daily carry.'],
    ['belle','Belle',159.9,'Structured carry','#E7DEDE',['Bordeaux','Black','Tan'],'Limited',3,4.8,51,
     'A confident, structured carry with a defined silhouette. The one you reach for when it matters.',
     'Twist-lock closure. Short top handle plus optional crossbody strap. Suede-lined interior.',
     'Box calf leather, suede lining, polished hardware.',
     'Box calf — buff gently with a dry cloth to restore shine.',
     '26 × 18 × 11 cm','0.8 kg','Structured carry for the essentials. Optional crossbody strap.'],
    ['mira','Mira',124.9,'Soft hobo','#EFEBE2',['Cream','Caramel','Slate'],'',0,4.8,73,
     'Slouchy, soft and effortless. A gathered hobo that moulds to you and never feels like a statement you didn\'t mean.',
     'Magnetic top closure. Single shoulder strap. Roomy single compartment with slip pocket.',
     'Washed lambskin, cotton lining, antique hardware.',
     'Washed lambskin — handle with clean hands; natural creasing is part of its character.',
     '34 × 26 × 12 cm','0.6 kg','Soft, slouchy single compartment with a slip pocket.'],
    ['adele','Adele',134.9,'Mini crossbody','#E9E2D7',['Cognac','Black','Blush'],'',31,4.5,42,
     'Small but mighty. A mini crossbody for the days you want your hands free and your essentials close.',
     'Flap closure with magnetic snap. Adjustable crossbody strap. Card slots inside.',
     'Pebbled leather, microfibre lining, gold-tone hardware.',
     'Pebbled leather — wipe with a soft dry cloth.',
     '18 × 13 × 6 cm','0.35 kg','Mini crossbody for phone, cards and keys.'],
];

$reviewSeed = [
    'terra' => [[5,'My everyday everything','Holds my laptop, lunch and life.','Camille R.'],[4,'Roomy and elegant','Bigger than expected in the best way.','Nadia K.']],
    'love-bag' => [[5,'The one','Took it from dinner to dancing.','Priya S.']],
    'amelie' => [[4,'Clean lines','Structured and smart for the office.','Hana T.']],
    'belle' => [[5,'Confidence in a bag','The bordeaux is rich and deep.','Sofia L.']],
    'mira' => [[5,'So soft','Slouchy and effortless — moulds to me.','Aiko N.']],
    'adele' => [[5,'Hands free, always','Perfect mini for errands and travel.','Tess B.']],
];

foreach ($products as $i => $p) {
    [$slug,$name,$price,$cat,$panel,$colors,$badge,$stock,$rating,$rc,$desc,$details,$materials,$care,$dims,$weight,$fit] = $p;
    $n = $i + 1;
    Database::run(
        "INSERT INTO products (name,slug,sku,brand_id,short_description,description,details,materials,care,dimensions,weight,fit,price,panel_hex,badge,status,is_featured,stock,rating,review_count,position)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'active', ?, ?, ?, ?, ?)",
        [$name,$slug,strtoupper($slug),$brandId,$desc,$desc,$details,$materials,$care,$dims,$weight,$fit,$price,$panel,$badge, ($i<2?1:0), $stock,$rating,$rc,$i]
    );
    $pid = Database::lastId();

    // category link
    if (isset($catIds[$cat])) {
        Database::run("INSERT INTO product_categories (product_id,category_id) VALUES (?,?)", [$pid, $catIds[$cat]]);
    }

    // images: studio + 3 lifestyle (gallery)
    $a = ($n % 6) + 1; $b = (($n + 2) % 6) + 1;
    $imgs = ["baggy-$n.png" => 1, "photo-$n.png" => 0, "photo-$a.png" => 0, "photo-$b.png" => 0];
    $ip = 0;
    foreach ($imgs as $file => $primary) {
        Database::run("INSERT INTO product_images (product_id,url,position,is_primary) VALUES (?,?,?,?)", [$pid, "$ASSET/$file", $ip++, $primary]);
    }

    // variants (colors)
    $vp = 0;
    foreach ($colors as $cn) {
        $hex = $allColors[$cn] ?? null;
        Database::run("INSERT INTO product_variants (product_id,sku,name,color_hex,stock,position) VALUES (?,?,?,?,?,?)", [$pid, strtoupper($slug).'-'.strtoupper(substr($cn,0,3)), $cn, $hex, max(0,(int)($stock/max(1,count($colors)))), $vp++]);
        $vid = Database::lastId();
        if (isset($optId[$cn])) {
            Database::run("INSERT INTO product_variant_options (variant_id,option_id) VALUES (?,?)", [$vid, $optId[$cn]]);
        }
    }

    // seo
    Database::run("INSERT INTO product_seo (product_id,meta_title,meta_description,og_image_url) VALUES (?,?,?,?)",
        [$pid, "$name — €".number_format($price,2)." | Lovebag", $desc, "$ASSET/baggy-$n.png"]);

    // reviews
    foreach (($reviewSeed[$slug] ?? []) as [$r,$t,$bd,$au]) {
        Database::run("INSERT INTO reviews (product_id,author,rating,title,body,status) VALUES (?,?,?,?,?, 'approved')", [$pid,$au,$r,$t,$bd]);
    }
}

// ---- Tags ----
Database::run("DELETE FROM product_tags");
Database::run("DELETE FROM tags");
foreach (['leather','everyday','evening','crossbody','new-in','bestseller'] as $tg) {
    Database::run("INSERT INTO tags (name,slug) VALUES (?,?)", [ucfirst($tg), $tg]);
}

// ---- Homepage sections (content mirrors the current frontend copy) ----
Database::run("DELETE FROM homepage_sections");
$sections = [
    ['hero', 'Hero', 0, ['line1'=>'Bags crafted','line2'=>'to move with','accent'=>'your','tail'=>'story','loveBag'=>'Crafted with care and designed to follow you from day to night, it holds not only your essentials, but your stories']],
    ['collection', 'New Collection', 1, ['lead'=>'Our','accent'=>'new','title'=>'Collection','body'=>'Crafted with care and designed to follow you from day to night, it holds not only your essentials, but your stories']],
    ['perfectmatch', 'Perfect Match', 2, ['eyebrowTop'=>'DESIGNED WITH PURPOSE.','eyebrowBottom'=>'WORN WITH CONFIDENCE.','lead'=>'Find your','accent'=>'match','body'=>"We believe a bag is more than an accessory — It's a companion to your every moment."]],
    ['story', 'Story', 3, ['eyebrow'=>'OUR CRAFT','lead'=>'Made by','accent'=>'hand','body'=>'Every bag begins as a single hide, cut by hand and stitched over days, not minutes — leather chosen to age into something softer, richer, unmistakably yours.']],
    ['lookbook', 'Lookbook', 4, ['lead'=>'The','accent'=>'lookbook']],
    ['bento', 'Bento Grid', 5, ['eyebrow'=>'THE FULL RANGE','lead'=>'One for every','accent'=>'mood']],
    ['footer', 'Footer', 6, ['headlineLead'=>'Carry your','accent'=>'story','body'=>"Pieces made to be lived in — from the morning rush to the last light of the day.",'marquee'=>['CRAFTED','ENDURING','EFFORTLESS','DISTINCTLY YOURS']]],
];
foreach ($sections as [$key,$title,$pos,$data]) {
    Database::run("INSERT INTO homepage_sections (section_key,title,enabled,position,data) VALUES (?,?,1,?,?)", [$key,$title,$pos,json_encode($data)]);
}

// ---- Banner / announcement ----
Database::run("DELETE FROM banners");
Database::run("INSERT INTO banners (title,link_url,link_label,placement,position,status) VALUES ('Join Lovebag Circle — earn points on every order','/rewards','Join now','announcement',0,'active')");

// ---- Content pages ----
Database::run("INSERT IGNORE INTO pages (slug,title,content,status) VALUES
 ('about','About Lovebag','<p>Lovebag crafts leather bags made to move with your story.</p>','published'),
 ('faq','Frequently asked questions','<p>Shipping, returns, materials and care.</p>','published'),
 ('shipping-returns','Shipping & Returns','<p>Free carbon-neutral shipping over €100. 30-day returns.</p>','published')");

echo "Done.\n";
echo "Products: " . (Database::one("SELECT COUNT(*) c FROM products")['c']) . "\n";
echo "Variants: " . (Database::one("SELECT COUNT(*) c FROM product_variants")['c']) . "\n";
echo "Images: " . (Database::one("SELECT COUNT(*) c FROM product_images")['c']) . "\n";
