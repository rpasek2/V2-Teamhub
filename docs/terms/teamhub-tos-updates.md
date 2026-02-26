# TeamHub Terms of Service — Pending Updates

These sections need to be added to `teamhub-terms.html` before launching paid accounts.
Live ToS location: `C:\Users\Roger\Desktop\Two Trees Software\Twotreesapps.com\public\teamhub-terms.html`
Status: DRAFT — not yet live.

---

## Section 15: Paid Subscriptions and Billing

> Insert after current Section 14 (Contact Information), renumber Section 13 (Entire Agreement) to Section 16.

### 15.1 Subscription Plans

The Service offers paid subscription plans ("Plans") that enable Hub creation and access to additional features. Current Plan details, pricing, and feature inclusions are available on our website. We reserve the right to modify Plan pricing or features with thirty (30) days' prior notice to active subscribers.

The mobile application provides access to Hubs as a member but does not offer Hub creation or subscription purchases. All subscriptions are managed through the web platform.

### 15.2 Billing and Payment

Subscriptions are billed on a monthly basis. Your billing cycle begins on the date you subscribe and renews on the same date each subsequent month. All payments are processed through Stripe, Inc. ("Stripe"), a third-party payment processor. By subscribing, you agree to Stripe's [Terms of Service](https://stripe.com/legal) and authorize recurring monthly charges to your designated payment method.

You are responsible for keeping your payment information current. If a payment fails, we may suspend access to paid features until payment is successfully processed.

**[PLACEHOLDER: Insert specific pricing tiers and feature breakdowns once finalized. Consider whether to list prices in ToS or reference a separate pricing page that can be updated without a ToS revision.]**

### 15.3 Feature Access and Add-Ons

Certain features within the Service may be available only with specific subscription tiers or as purchasable add-ons. The features included in each tier are described on our pricing page. We reserve the right to move features between tiers or add new features at any time, provided that material reductions to your current Plan's features will not take effect until your next billing cycle.

**[PLACEHOLDER: Define specific tier names and which tabs/features are gated per tier once the tier structure is finalized.]**

### 15.4 Cancellation

You may cancel your subscription at any time through your account settings on the web platform. Upon cancellation:

- Your subscription remains active through the end of your current billing period.
- After your billing period ends, your Hub will enter a **read-only period of thirty (30) days** during which Hub members may view existing data but may not create, edit, or delete content.
- After the read-only period, access to the Hub will be suspended. Your data will be retained for **six (6) months** from the date of suspension.
- If you resubscribe within the six-month retention period, your Hub and its data will be restored.
- After six (6) months, your Hub data will be permanently deleted in accordance with our Privacy Policy.

### 15.5 Refunds

New subscribers may request a full refund within thirty (30) days of their initial subscription purchase by contacting support@twotreesapps.com. This refund policy applies only to the first billing cycle of a new subscription.

Subsequent monthly charges are non-refundable. No prorated refunds are issued for partial billing periods or mid-cycle cancellations. Your access continues through the end of the paid billing period.

### 15.6 Price Changes

We may change subscription pricing at any time. Price changes will take effect at the start of the next billing cycle following thirty (30) days' notice. If you do not agree to the new pricing, you may cancel your subscription before the price change takes effect.

### 15.7 Taxes

Subscription fees are exclusive of applicable taxes. You are responsible for any sales tax, use tax, VAT, or similar taxes imposed by your jurisdiction. Applicable taxes will be calculated and added at checkout based on your billing address.

---

## Section 12: App Store Terms (Updated)

> Replace current Section 12 (Google Play Store Terms) with this expanded version covering both stores.

### 12.1 Google Play Store

If you access the Service via Google Play, you agree to comply with Google Play's Terms of Service, available at https://play.google.com/about/play-terms/.

### 12.2 Apple App Store

If you access the Service via the Apple App Store, the following additional terms apply:

- These Terms are between you and Two Trees Software LLC, not Apple Inc. ("Apple"). Apple is not responsible for the Service or its content.
- Apple has no obligation to provide maintenance or support for the Service.
- In the event of any failure of the Service to conform to any applicable warranty, you may notify Apple and Apple will refund the purchase price (if any) for the app. To the maximum extent permitted by applicable law, Apple has no other warranty obligation with respect to the Service.
- Apple is not responsible for addressing any claims relating to the Service, including product liability claims, consumer protection claims, intellectual property claims, or any claim that the Service fails to conform to applicable legal or regulatory requirements.
- In the event of any third-party claim that the Service or your use of it infringes a third party's intellectual property rights, Two Trees Software LLC, not Apple, will be solely responsible for the investigation, defense, settlement, and discharge of such claim.
- Apple and its subsidiaries are third-party beneficiaries of these Terms. Upon your acceptance of these Terms, Apple will have the right to enforce these Terms against you as a third-party beneficiary.
- You represent and warrant that you are not located in a country subject to a U.S. Government embargo or designated as a "terrorist supporting" country, and you are not listed on any U.S. Government list of prohibited or restricted parties.

---

## Section 7: Third-Party Services (Updated)

> Replace current Section 7 to include Stripe.

The Service integrates with third-party services, including Supabase for data storage and authentication, Firebase for web hosting, Stripe for payment processing, and Expo/Firebase Cloud Messaging for push notifications. Your use of these third-party services is subject to their respective terms of service and privacy policies. We are not responsible for the practices or content of third-party services.

---

## Section 3: Organizations and Roles (Updated)

> Replace current Section 3 to reflect paid Hub creation and free member access.

### 3.1 Hubs

The Service is organized around organizations called "Hubs." Creating a Hub requires an active paid subscription through the web platform (see Section 15). Hub creators ("Hub Owners") are responsible for managing membership, permissions, and content within their Hub.

### 3.2 Joining a Hub

Any registered user may join an existing Hub at no cost by using an invite code provided by the Hub Owner or an authorized member. By joining a Hub, you agree to abide by any rules set by the Hub Owner in addition to these Terms.

### 3.3 Roles and Permissions

Hub Owners may assign roles to Hub members (such as staff, coach, or member) that determine access to features and content within the Hub. Role-based permissions are managed by the Hub Owner through the web platform.

### 3.4 Responsibility for Minor Data

Hub Owners are responsible for ensuring they have appropriate consent to store personal information about minors (such as athlete profiles) and for managing access permissions within their organization.

### 3.5 Platform Differences

Hub creation and subscription management are available only on the web platform. The mobile application allows users to join and access Hubs as members but does not support Hub creation or subscription purchases.

---

## Decision Log

| Decision | Choice | Notes |
|----------|--------|-------|
| Payment processor | Stripe | Web-only billing, no Apple/Google IAP |
| Billing cycle | Monthly | No annual option initially |
| Trial period | None | May revisit later |
| Hub creation | Paid only | Mobile is join-only, web is create+manage |
| Feature gating | Tier-based + add-ons | Specific tiers TBD |
| Cancellation grace | 30 days read-only | Then suspended, data kept 6 months |
| Data retention post-cancel | 6 months | Then permanent deletion |
| New account refund | 30 days full refund | First billing cycle only |
| Recurring refund | None | Non-refundable after first cycle |
| Price change notice | 30 days | Before new price takes effect |
