# Changelog

## [1.1.0] - 2026-08-07

### Added
- Professional release notes and upgrade tracking for the project.
- Structured project documentation to better reflect a final-year engineering build.
- Additional test coverage around release notes and analytics flow.

### Improved
- Authentication and profile experience were refined for a more polished user journey.
- Google sign-in now supports both Expo proxy and native redirect URI flows, with improved callback handling in login and signup screens.
- OAuth redirect parsing was hardened in `lib/supabase.ts` to support token extraction from hash fragments, query params, and nested redirect payloads.
- Proxy-based OAuth flows now route correctly during development, making Google sign-in more reliable across Expo environments.
- Live currency prices were integrated into the app to keep USD/currency amounts current and aligned with global exchange rates.
- UI improvements were applied across dashboard and savings screens to enhance readability, dark-mode contrast, and card layouts.
- UX updates include clearer empty-state messaging, default action prompts for empty subscription radar and savings goal lists, and improved onboarding flow hints.
- The dashboard subscription radar now shows a default prompt telling users to add subscriptions when none exist, rather than an empty blank state.
- Savings goals also include a stronger default state for first-time users, guiding them to create their first goal with clear messaging.
- App code quality and structure were improved with more consistent module separation, reusable auth/service utilities, and cleaner component organization.
- Notification, insights, and export flows were organized around clearer service modules.
- The app now presents a more complete and professional feature set.
 