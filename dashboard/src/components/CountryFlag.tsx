import { getFlagUrl } from '@/lib/flags';

interface CountryFlagProps {
  iso3: string;
  className?: string;
}

export function CountryFlag({ iso3, className = 'h-4 w-6 rounded-sm object-cover' }: CountryFlagProps) {
  const url = getFlagUrl(iso3);
  if (!url) return null;

  return (
    <img
      src={url}
      alt=""
      className={className}
      loading="lazy"
    />
  );
}
