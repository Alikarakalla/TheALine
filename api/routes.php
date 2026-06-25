<?php
// Resource route registration.
require_once __DIR__ . '/core/Util.php';
require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/SettingsController.php';
require_once __DIR__ . '/controllers/ProductsController.php';
require_once __DIR__ . '/controllers/CategoriesController.php';
require_once __DIR__ . '/controllers/CollectionsController.php';
require_once __DIR__ . '/controllers/OrdersController.php';
require_once __DIR__ . '/controllers/CustomersController.php';
require_once __DIR__ . '/controllers/BrandsController.php';
require_once __DIR__ . '/controllers/TagsController.php';
require_once __DIR__ . '/controllers/InventoryController.php';
require_once __DIR__ . '/controllers/LoyaltyController.php';
require_once __DIR__ . '/controllers/HomepageController.php';
require_once __DIR__ . '/controllers/BannersController.php';
require_once __DIR__ . '/controllers/SeoController.php';
require_once __DIR__ . '/controllers/MediaController.php';
require_once __DIR__ . '/controllers/VariantsController.php';
require_once __DIR__ . '/controllers/CustomerAuthController.php';
require_once __DIR__ . '/controllers/AddressesController.php';
require_once __DIR__ . '/controllers/PaymentMethodsController.php';
require_once __DIR__ . '/controllers/FavoritesController.php';
require_once __DIR__ . '/controllers/ReviewsController.php';
require_once __DIR__ . '/controllers/DashboardController.php';

function registerRoutes(Router $router): void
{
    // ---- Auth ----
    $router->post('auth/login', fn() => AuthController::login());
    $router->get('auth/me', fn() => AuthController::me());

    // ---- Admin dashboard ----
    $router->get('admin/dashboard', fn() => DashboardController::index());

    // ---- Settings / theme ----
    $router->get('settings', fn() => SettingsController::publicGet());
    $router->get('admin/settings', fn() => SettingsController::adminGet());
    $router->put('admin/settings', fn() => SettingsController::update());

    // ---- Products ----
    $router->get('products', fn() => ProductsController::index());
    $router->get('products/{id}', fn($p) => ProductsController::show($p));
    $router->get('admin/products', fn() => ProductsController::adminIndex());
    $router->get('admin/products/{id}', fn($p) => ProductsController::adminShow($p));
    $router->post('admin/products', fn() => ProductsController::create());
    $router->put('admin/products/{id}', fn($p) => ProductsController::update($p));
    $router->delete('admin/products/{id}', fn($p) => ProductsController::destroy($p));

    // ---- Categories ----
    $router->get('categories', fn() => CategoriesController::index());
    $router->get('admin/categories', fn() => CategoriesController::adminIndex());
    $router->post('admin/categories', fn() => CategoriesController::create());
    $router->put('admin/categories/{id}', fn($p) => CategoriesController::update($p));
    $router->delete('admin/categories/{id}', fn($p) => CategoriesController::destroy($p));

    // ---- Collections (manual + smart) ----
    $router->get('collections', fn() => CollectionsController::index());
    $router->get('collections/{slug}', fn($p) => CollectionsController::show($p));
    $router->get('admin/collections', fn() => CollectionsController::adminIndex());
    $router->post('admin/collections', fn() => CollectionsController::create());
    $router->put('admin/collections/{id}', fn($p) => CollectionsController::update($p));
    $router->delete('admin/collections/{id}', fn($p) => CollectionsController::destroy($p));

    // ---- Customer accounts (storefront) ----
    $router->post('auth/customer/register', fn() => CustomerAuthController::register());
    $router->post('auth/customer/login', fn() => CustomerAuthController::login());
    $router->get('auth/customer/me', fn() => CustomerAuthController::me());
    $router->post('auth/customer/forgot-password', fn() => CustomerAuthController::forgotPassword());
    $router->post('auth/customer/reset-password', fn() => CustomerAuthController::resetPassword());
    $router->put('auth/customer/profile', fn() => CustomerAuthController::updateProfile());
    $router->put('auth/customer/preferences', fn() => CustomerAuthController::updatePreferences());
    $router->put('auth/customer/password', fn() => CustomerAuthController::updatePassword());
    $router->delete('auth/customer', fn() => CustomerAuthController::deleteAccount());

    // ---- Addresses ----
    $router->get('addresses', fn() => AddressesController::index());
    $router->post('addresses', fn() => AddressesController::create());
    $router->put('addresses/{id}', fn($p) => AddressesController::update($p));
    $router->delete('addresses/{id}', fn($p) => AddressesController::destroy($p));

    // ---- Payment methods ----
    $router->get('payment-methods', fn() => PaymentMethodsController::index());
    $router->post('payment-methods', fn() => PaymentMethodsController::create());
    $router->put('payment-methods/{id}', fn($p) => PaymentMethodsController::update($p));
    $router->delete('payment-methods/{id}', fn($p) => PaymentMethodsController::destroy($p));

    // ---- Favorites ----
    $router->get('favorites', fn() => FavoritesController::index());
    $router->post('favorites', fn() => FavoritesController::add());
    $router->delete('favorites/{id}', fn($p) => FavoritesController::remove($p));

    // ---- Reviews ----
    $router->get('products/{id}/reviews', fn($p) => ReviewsController::index($p));
    $router->post('products/{id}/reviews', fn($p) => ReviewsController::create($p));

    // ---- Orders ----
    $router->post('orders', fn() => OrdersController::create());
    $router->get('orders', fn() => OrdersController::customerIndex());
    $router->get('orders/{number}', fn($p) => OrdersController::customerShow($p));
    $router->get('admin/orders', fn() => OrdersController::adminIndex());
    $router->get('admin/orders/{id}', fn($p) => OrdersController::adminShow($p));
    $router->put('admin/orders/{id}/status', fn($p) => OrdersController::updateStatus($p));

    // ---- Customers ----
    $router->get('admin/customers', fn() => CustomersController::adminIndex());
    $router->get('admin/customers/{id}', fn($p) => CustomersController::adminShow($p));
    $router->put('admin/customers/{id}/status', fn($p) => CustomersController::updateStatus($p));

    // ---- Brands ----
    $router->get('brands', fn() => BrandsController::index());
    $router->get('admin/brands', fn() => BrandsController::adminIndex());
    $router->post('admin/brands', fn() => BrandsController::create());
    $router->put('admin/brands/{id}', fn($p) => BrandsController::update($p));
    $router->delete('admin/brands/{id}', fn($p) => BrandsController::destroy($p));

    // ---- Tags ----
    $router->get('admin/tags', fn() => TagsController::adminIndex());
    $router->post('admin/tags', fn() => TagsController::create());
    $router->put('admin/tags/{id}', fn($p) => TagsController::update($p));
    $router->delete('admin/tags/{id}', fn($p) => TagsController::destroy($p));

    // ---- Inventory ----
    $router->get('admin/inventory', fn() => InventoryController::adminIndex());
    $router->put('admin/inventory/{id}', fn($p) => InventoryController::adjust($p));
    $router->get('admin/inventory/{id}/movements', fn($p) => InventoryController::movements($p));

    // ---- Loyalty ----
    $router->get('loyalty/config', fn() => LoyaltyController::publicConfig());
    $router->get('loyalty/account', fn() => LoyaltyController::account());
    $router->post('loyalty/redeem', fn() => LoyaltyController::redeem());
    $router->get('admin/loyalty/tiers', fn() => LoyaltyController::tiers());
    $router->put('admin/loyalty/tiers/{id}', fn($p) => LoyaltyController::updateTier($p));
    $router->get('admin/loyalty/rewards', fn() => LoyaltyController::rewards());
    $router->post('admin/loyalty/rewards', fn() => LoyaltyController::createReward());
    $router->put('admin/loyalty/rewards/{id}', fn($p) => LoyaltyController::updateReward($p));
    $router->delete('admin/loyalty/rewards/{id}', fn($p) => LoyaltyController::deleteReward($p));
    $router->get('admin/loyalty/accounts', fn() => LoyaltyController::accounts());

    // ---- Homepage content ----
    $router->get('homepage', fn() => HomepageController::index());
    $router->get('admin/homepage', fn() => HomepageController::adminIndex());
    $router->put('admin/homepage/{id}', fn($p) => HomepageController::update($p));

    // ---- Banners ----
    $router->get('banners', fn() => BannersController::index());
    $router->get('admin/banners', fn() => BannersController::adminIndex());
    $router->post('admin/banners', fn() => BannersController::create());
    $router->put('admin/banners/{id}', fn($p) => BannersController::update($p));
    $router->delete('admin/banners/{id}', fn($p) => BannersController::destroy($p));

    // ---- SEO ----
    $router->get('admin/seo', fn() => SeoController::adminGet());
    $router->put('admin/seo', fn() => SeoController::update());
    $router->post('admin/seo/redirects', fn() => SeoController::createRedirect());
    $router->delete('admin/seo/redirects/{id}', fn($p) => SeoController::deleteRedirect());
    $router->put('admin/pages/{id}', fn($p) => SeoController::updatePage($p));

    // ---- Media / uploads ----
    $router->post('admin/media/upload', fn() => MediaController::upload());
    $router->get('admin/media', fn() => MediaController::index());

    // ---- Variants (attributes + options) ----
    $router->get('admin/variants', fn() => VariantsController::adminIndex());
    $router->post('admin/variants', fn() => VariantsController::createAttribute());
    $router->put('admin/variants/{id}', fn($p) => VariantsController::updateAttribute($p));
    $router->delete('admin/variants/{id}', fn($p) => VariantsController::deleteAttribute($p));
    $router->post('admin/variants/{id}/options', fn($p) => VariantsController::createOption($p));
    $router->put('admin/variants/options/{oid}', fn($p) => VariantsController::updateOption($p));
    $router->delete('admin/variants/options/{oid}', fn($p) => VariantsController::deleteOption($p));
}
