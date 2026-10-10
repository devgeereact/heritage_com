import { lazy } from 'react';
import RedirectWithParams from './RedirectWithParams';

// Daily records (Phase 2)
const Today = lazy(() => import('@/app/(admin)/today/page'));
const Payments = lazy(() => import('@/app/(admin)/payments/page'));
const Appointments = lazy(() => import('@/app/(admin)/appointments/page'));
const PrintDoc = lazy(() => import('@/app/(admin)/print/page'));
const EnquiryDetail = lazy(() => import('@/app/(admin)/enquiries/[id]/page'));
const EnquiryConvert = lazy(() => import('@/app/(admin)/enquiries/[id]/convert/page'));
const NewMeasurements = lazy(() => import('@/app/(admin)/crm/[id]/measurements/new/page'));

// The old dashboard lives on as Reports
const Dashboard = lazy(() => import('@/app/(admin)/dashboard/page'));

// Apps Routes

const Calendar = lazy(() => import('@/app/(admin)/apps/calendar/page'));

// Pages Routes
const NotFound = lazy(() => import('@/app/(other)/pages-404/page'));
const Settings = lazy(() => import('@/app/(admin)/settings/page'));
const Profile = lazy(() => import('@/app/(admin)/profile/page'));
const Permissions = lazy(() => import('@/app/(admin)/permissions/page'));

// Public site — multi-page marketing storefront (no auth, OtherLayout)
const Home = lazy(() => import('@/app/(public)/site/HomePage'));
const About = lazy(() => import('@/app/(public)/site/AboutPage'));
const Shop = lazy(() => import('@/app/(public)/site/ShopPage'));
const Product = lazy(() => import('@/app/(public)/site/ProductPage'));
const Cart = lazy(() => import('@/app/(public)/site/CartPage'));
const Checkout = lazy(() => import('@/app/(public)/site/CheckoutPage'));
const Gifting = lazy(() => import('@/app/(public)/site/GiftingPage'));
const Contact = lazy(() => import('@/app/(public)/site/ContactPage'));
const Track = lazy(() => import('@/app/(public)/site/TrackPage'));
const Account = lazy(() => import('@/app/(public)/site/AccountPage'));
const Blog = lazy(() => import('@/app/(public)/site/BlogPage'));
const BlogPost = lazy(() => import('@/app/(public)/site/BlogPostPage'));

// Tailoring & Production (HeritOS core module)
const Tailoring = lazy(() => import('@/app/(admin)/tailoring/page'));
const TailoringGroups = lazy(() => import('@/app/(admin)/tailoring/groups/page'));
const TailoringDetail = lazy(() => import('@/app/(admin)/tailoring/[id]/page'));

// Products & Variants (catalogue, real PHP)
const Catalogue = lazy(() => import('@/app/(admin)/catalogue/page'));
const CatalogueDetail = lazy(() => import('@/app/(admin)/catalogue/[id]/page'));

// Inventory & Stock (real PHP)
const Stock = lazy(() => import('@/app/(admin)/stock/page'));

// Remaining HeritOS modules (real PHP)
const Suppliers = lazy(() => import('@/app/(admin)/suppliers/page'));
const Finance = lazy(() => import('@/app/(admin)/finance/page'));
const Analytics = lazy(() => import('@/app/(admin)/analytics/page'));
const Marketing = lazy(() => import('@/app/(admin)/marketing/page'));
const Pos = lazy(() => import('@/app/(admin)/pos/page'));
const Studio = lazy(() => import('@/app/(admin)/studio/page'));
const Content = lazy(() => import('@/app/(admin)/content/page'));
const Channels = lazy(() => import('@/app/(admin)/channels/page'));
const Weather = lazy(() => import('@/app/(admin)/weather/page'));
const Team = lazy(() => import('@/app/(admin)/team/page'));
const Inbox = lazy(() => import('@/app/(admin)/inbox/page'));
const WhatsApp = lazy(() => import('@/app/(admin)/whatsapp/page'));
const Coupons = lazy(() => import('@/app/(admin)/coupons/page'));
const Loyalty = lazy(() => import('@/app/(admin)/loyalty/page'));
const Engage = lazy(() => import('@/app/(admin)/engage/page'));
const Reviews = lazy(() => import('@/app/(admin)/reviews/page'));

// Enquiries (public contact form inbox)
const Enquiries = lazy(() => import('@/app/(admin)/enquiries/page'));

// Customers / CRM
const Crm = lazy(() => import('@/app/(admin)/crm/page'));
const CrmDetail = lazy(() => import('@/app/(admin)/crm/[id]/page'));

// Sales / Orders (ready-to-wear)
const Sales = lazy(() => import('@/app/(admin)/sales/page'));
const SalesDetail = lazy(() => import('@/app/(admin)/sales/[id]/page'));

// Auth Routes
const SignIn = lazy(() => import('@/app/(other)/auth/sign-in/page'));
const SignUp = lazy(() => import('@/app/(other)/auth/sign-up/page'));
const ResetPassword = lazy(() => import('@/app/(other)/auth/reset-pass/page'));
const LockScreen = lazy(() => import('@/app/(other)/auth/lock-screen/page'));

// Public routes — no auth, rendered in OtherLayout (no admin chrome).
export const publicRoutes = [{
  path: '/',
  name: 'Home',
  element: <Home />
}, {
  path: '/about',
  name: 'About',
  element: <About />
}, {
  path: '/shop',
  name: 'Shop',
  element: <Shop />
}, {
  path: '/shop/:slug',
  name: 'Product',
  element: <Product />
}, {
  path: '/cart',
  name: 'Cart',
  element: <Cart />
}, {
  path: '/checkout',
  name: 'Checkout',
  element: <Checkout />
}, {
  path: '/gifting',
  name: 'Gifting',
  element: <Gifting />
}, {
  path: '/contact',
  name: 'Contact',
  element: <Contact />
}, {
  path: '/journal',
  name: 'Journal',
  element: <Blog />
}, {
  path: '/journal/:slug',
  name: 'Journal Post',
  element: <BlogPost />
}, {
  path: '/track',
  name: 'Track order',
  element: <Track />
}, {
  path: '/account',
  name: 'Account',
  element: <Account />
}];
// Old URLs keep working (bookmarks, links in messages). Rendered before the app
// routes and outside the layout; the target applies sign-in and role checks.
export const redirectRoutes = [
  { path: '/dashboard', to: '/today' },
  { path: '/tailoring', to: '/jobs' },
  { path: '/tailoring/groups', to: '/jobs/groups' },
  { path: '/tailoring/:id', to: '/jobs/:id' },
  { path: '/crm', to: '/clients' },
  { path: '/crm/:id', to: '/clients/:id' },
].map((r) => ({ ...r, name: `Redirect ${r.path}`, element: <RedirectWithParams to={r.to} /> }));

const generalRoutes = [{
  path: '/today',
  name: 'Today',
  element: <Today />
}, {
  path: '/jobs',
  name: 'Jobs',
  element: <Tailoring />
}, {
  path: '/jobs/groups',
  name: 'Groups',
  element: <TailoringGroups />
}, {
  path: '/jobs/:id',
  name: 'Job',
  element: <TailoringDetail />
}, {
  path: '/clients',
  name: 'Clients',
  element: <Crm />
}, {
  path: '/clients/:id',
  name: 'Client',
  element: <CrmDetail />
}, {
  path: '/clients/:id/measurements/new',
  name: 'Add measurements',
  element: <NewMeasurements />
}, {
  path: '/enquiries/:id',
  name: 'Enquiry',
  element: <EnquiryDetail />
}, {
  path: '/enquiries/:id/convert',
  name: 'Convert enquiry',
  element: <EnquiryConvert />
}, {
  path: '/payments',
  name: 'Payments',
  element: <Payments />
}, {
  path: '/appointments',
  name: 'Appointments',
  element: <Appointments />
}, {
  path: '/print/:doc/:id',
  name: 'Print',
  element: <PrintDoc />
}, {
  path: '/reports',
  name: 'Reports',
  element: <Dashboard />
}, {
  path: '/catalogue',
  name: 'Catalogue',
  element: <Catalogue />
}, {
  path: '/catalogue/:id',
  name: 'Catalogue Detail',
  element: <CatalogueDetail />
}, {
  path: '/stock',
  name: 'Inventory',
  element: <Stock />
}, {
  path: '/suppliers',
  name: 'Suppliers',
  element: <Suppliers />
}, {
  path: '/finance',
  name: 'Finance',
  element: <Finance />
}, {
  path: '/analytics',
  name: 'Analytics',
  element: <Analytics />
}, {
  path: '/marketing',
  name: 'Marketing',
  element: <Marketing />
}, {
  path: '/pos',
  name: 'Market Sales',
  element: <Pos />
}, {
  path: '/studio',
  name: 'Brand Studio',
  element: <Studio />
}, {
  path: '/content',
  name: 'Content',
  element: <Content />
}, {
  path: '/channels',
  name: 'Store & Channels',
  element: <Channels />
}, {
  path: '/team',
  name: 'Team & Access',
  element: <Team />
}, {
  path: '/inbox',
  name: 'Inbox',
  element: <Inbox />
}, {
  path: '/whatsapp',
  name: 'WhatsApp',
  element: <WhatsApp />
}, {
  path: '/coupons',
  name: 'Coupons',
  element: <Coupons />
}, {
  path: '/loyalty',
  name: 'Loyalty',
  element: <Loyalty />
}, {
  path: '/engage',
  name: 'Re-engagement',
  element: <Engage />
}, {
  path: '/reviews',
  name: 'Reviews',
  element: <Reviews />
}, {
  path: '/weather',
  name: 'Weather & Ops',
  element: <Weather />
}, {
  path: '/enquiries',
  name: 'Enquiries',
  element: <Enquiries />
}, {
  path: '/sales',
  name: 'Orders',
  element: <Sales />
}, {
  path: '/sales/:id',
  name: 'Order Detail',
  element: <SalesDetail />
}];
const appsRoutes = [{
  name: 'Calendar',
  path: '/apps/calendar',
  element: <Calendar />
}];
const customRoutes = [{
  name: 'Settings',
  path: '/settings',
  element: <Settings />
}, {
  name: 'Profile',
  path: '/profile',
  element: <Profile />
}, {
  name: 'Permissions',
  path: '/permissions',
  element: <Permissions />
}];
export const authRoutes = [{
  name: 'Sign In',
  path: '/auth/sign-in',
  element: <SignIn />
}, {
  name: 'Sign Up',
  path: '/auth/sign-up',
  element: <SignUp />
}, {
  name: 'Reset Password',
  path: '/auth/reset-pass',
  element: <ResetPassword />
}, {
  name: 'Lock Screen',
  path: '/auth/lock-screen',
  element: <LockScreen />
}, {
  name: '404 Error',
  path: '/pages-404',
  element: <NotFound />
}];
export const appRoutes = [...generalRoutes, ...appsRoutes, ...customRoutes];