export interface ReleaseHighlights {
  version: string;
  title: string;
  summary: string;
  highlights: string[];
}

export function getReleaseHighlights(version: string): ReleaseHighlights {
  return {
    version,
    title: 'Professional Release Update',
    summary:
      'The app now presents stronger engineering structure, clearer onboarding, and more polished operational features for a final-year project standard.',
    highlights: [
      'Improved app architecture with modular services and clearer project structure.',
      'Added professional documentation, changelog tracking, and release notes.',
      'Strengthened authentication and user experience flow across login and profile screens.',
      'Expanded analytics, export, and notification flows for a more complete product experience.',
      'Prepared automated test coverage and CI/CD-ready project structure.',
    ],
  };
}
