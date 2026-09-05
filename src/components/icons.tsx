// Small inline SVG icon set (24×24 stroke icons, lucide-style). No dependency —
// stroke follows currentColor so icons tint via text color classes.

function I({ paths, className }: { paths: string[]; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? 'h-5 w-5'}
      aria-hidden="true"
    >
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

export const IconHome = ({ className }: { className?: string }) => (
  <I className={className} paths={['M3 10.5 12 3l9 7.5', 'M5 9.5V21h14V9.5', 'M9 21v-6h6v6']} />
);

export const IconCalendar = ({ className }: { className?: string }) => (
  <I
    className={className}
    paths={['M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M16 2v4', 'M8 2v4', 'M3 10h18']}
  />
);

export const IconBank = ({ className }: { className?: string }) => (
  <I
    className={className}
    paths={['M3 21h18', 'M5 21v-8', 'M9.5 21v-8', 'M14.5 21v-8', 'M19 21v-8', 'M2 10 12 3l10 7z']}
  />
);

export const IconBook = ({ className }: { className?: string }) => (
  <I
    className={className}
    paths={[
      'M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z',
      'M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z',
    ]}
  />
);

export const IconSettings = ({ className }: { className?: string }) => (
  <I
    className={className}
    paths={['M4 21v-6', 'M4 11V3', 'M12 21v-9', 'M12 8V3', 'M20 21v-4', 'M20 13V3', 'M2 15h4', 'M10 8h4', 'M18 17h4']}
  />
);

export const IconBell = ({ className }: { className?: string }) => (
  <I
    className={className}
    paths={['M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9', 'M13.7 21a2 2 0 0 1-3.4 0']}
  />
);

export const IconSunrise = ({ className }: { className?: string }) => (
  <I
    className={className}
    paths={['M12 2v6', 'm8 6 4-4 4 4', 'M4 18a8 8 0 0 1 16 0', 'M2 22h20', 'M2 18h1', 'M21 18h1']}
  />
);

export const IconSchool = ({ className }: { className?: string }) => (
  <I className={className} paths={['M22 9 12 4 2 9l10 5z', 'M6 11.5V17c3.5 3 8.5 3 12 0v-5.5', 'M22 9v5']} />
);

export const IconStar = ({ className }: { className?: string }) => (
  <I
    className={className}
    paths={['m12 3 2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L3.3 9.4l6-.9z']}
  />
);

export const IconClock = ({ className }: { className?: string }) => (
  <I className={className} paths={['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 7v5l3.5 2']} />
);

export const IconPencil = ({ className }: { className?: string }) => (
  <I
    className={className}
    paths={['M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z']}
  />
);

export const IconSparkles = ({ className }: { className?: string }) => (
  <I
    className={className}
    paths={[
      'M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z',
      'M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z',
    ]}
  />
);
