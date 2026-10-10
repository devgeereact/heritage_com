# Integrations

This file owns every external service HeritOS can call, its boundary and its failure path. Setting names are in [DEPLOYMENT.md](../07-operations/DEPLOYMENT.md#server-configuration); credentials never appear in this repository. Email behaviour is detailed in [EMAIL-SPEC.md](../07-operations/EMAIL-SPEC.md) and message events in [NOTIFICATIONS-SPEC.md](../07-operations/NOTIFICATIONS-SPEC.md). Whether each service is configured on the live server is Unknown (A20); local staging configures none of them except Open-Meteo.

| Service | Purpose | Data exchanged | Credential owner | Cost or limit | Failure path | Replacement risk | Status |
|---|---|---|---|---|---|---|---|
| OpenRouter text AI (`ai.php`) | Optional public draft copy | Staff prompts only. No private client content, measurements or records by default | Owner, `OPENROUTER_KEY` and `OR_MODEL` in server config.php | Per token, Unknown | Returns "not configured" when the key is blank | Low; optional feature | Optional, no launch dependency |
| Image AI (`ai_image.php`) | Optional image drafts | Staff prompts only | Owner, `IMAGE_PROVIDER` and provider keys | Per image, Unknown | Same as above | Low | Optional. AI-made garments are never presented as delivered work |
| Outgoing mail (`mail.php`) | Staff-sent email | Recipient, subject, body | Owner, `SMTP_*` | Hosting mail limits, Unknown | Blank `SMTP_HOST` falls back to PHP `mail()`; failure returns 502 (`mail.php:64`) | Low | Built; live config Unknown |
| Incoming mail (`inbox.php`) | Read the business mailbox | Mailbox messages | Owner, `IMAP_*` | None | Clean 501 when `IMAP_HOST` is blank | Low | Built; live config Unknown |
| WhatsApp (`whatsapp.php`, `_lib.php` `wa_dispatch()`) | Order and job messages | Phone number, message text | Owner, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_VERIFY_TOKEN` | Meta pricing, Unknown | Without a token every send is logged and offered as a wa.me link | Medium; Meta policy changes | Built. No promise of syncing personal WhatsApp |
| Payment gateways | Optional hosted card payments | Order reference, amount | Owner, `PAYMENT_PROVIDER` (Paystack or Flutterwave) and Stripe keys | Provider fees | Manual mode when unconfigured | Medium | Approved direction: manual verified transfer and cash first; at most one hosted gateway later; never handle card details (BR-25) |
| Weather (`weather.php`, Open-Meteo) | Lagos forecast | None (no key) | None | Free | Endpoint error | Low | Built; hidden from the daily app in the target design. `OPENWEATHER_API_KEY` in config.sample.php is unused |
| Social profiles | Links from website and app | Public URLs only | Owner (accounts) | None | Unconfigured links hidden (target; A12) | None | A saved link grants no publishing authority; no automatic posting |
| GitHub Actions and FTP | CI and deploy | Build output and nine PHP files | Owner, repository secrets `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD` | Free tier | Deploy job fails before upload | Low | Built ([DEPLOYMENT.md](../07-operations/DEPLOYMENT.md#ci-and-deploy)) |
| Cloudflare DNS | DNS only (grey cloud) | DNS records | Owner | Free | Orange cloud breaks AutoSSL | Low | Built |

Confirm current availability and terms through the provider's official source before enabling any service. A useful manual step beats an unreliable integration.
