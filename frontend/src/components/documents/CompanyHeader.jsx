import React from 'react';
import { Building2, Phone, Mail, Globe, MapPin } from 'lucide-react';

// Default company data - Sunvora Energy
const DEFAULT_COMPANY = {
  name: 'Sunvora Energy Pvt. Ltd.',
  logo: '/logo.png',
  tagline: 'Best Value & Quality Solar Solution',
  address: '104 to 1117, 11th Floor, Millennium Business Hub-1',
  city: 'Opp. Sarthana Nature Park, Surat - 395006, Gujarat - India',
  phone: '+91 96380 00461',
  phone2: '+91 96380 00462',
  tollfree: '1800 123 1232',
  email: 'info@sunvoraenergy.com',
  website: 'www.sunvoraenergy.com',
  gstin: '24AABCU9603R1ZX',
  manufacturing: {
    name: 'Sunvora Solar Pvt. Ltd.',
    address: 'Block No. 105, B/H Aron Pipes B/H Hariya Talav, Karanj Kim - Mandavi Road',
    city: 'Gujarat 394110',
    email: 'contact@sunvoraenergies.com',
    website: 'www.sunvorasolar.com'
  }
};

/**
 * CompanyHeader - Reusable company branding component for documents
 * Used in Estimates, Proposals, Quotations, Contracts, Invoices
 */
export const CompanyHeader = ({
  company = DEFAULT_COMPANY,
  showLogo = true,
  showContact = true,
  size = 'default', // 'small' | 'default' | 'large'
  className = ''
}) => {
  const sizeClasses = {
    small: { name: 'text-sm', address: 'text-[10px]', icon: 12 },
    default: { name: 'text-lg', address: 'text-xs', icon: 14 },
    large: { name: 'text-xl', address: 'text-sm', icon: 16 }
  };

  const s = sizeClasses[size];

  return (
    <div className={`flex items-start gap-4 ${className}`}>
      {showLogo && (
        <div className="shrink-0">
          {company.logo ? (
            <img
              src={company.logo}
              alt={company.name}
              className={`object-contain ${size === 'small' ? 'w-12 h-12' : size === 'large' ? 'w-20 h-20' : 'w-16 h-16'}`}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div
            className={`bg-[var(--primary)]/10 rounded-lg items-center justify-center ${company.logo ? 'hidden' : 'flex'} ${size === 'small' ? 'w-12 h-12' : size === 'large' ? 'w-20 h-20' : 'w-16 h-16'}`}
          >
            <Building2 size={size === 'small' ? 20 : size === 'large' ? 32 : 24} className="text-[var(--primary)]" />
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <h2 className={`font-bold text-[var(--text-primary)] ${s.name}`}>
          {company.name || DEFAULT_COMPANY.name}
        </h2>
        {company.tagline && (
          <p className="text-xs text-[var(--text-muted)] italic">{company.tagline}</p>
        )}

        {showContact && (
          <div className={`mt-1 space-y-0.5 text-[var(--text-muted)] ${s.address}`}>
            <div className="flex items-center gap-1">
              <MapPin size={s.icon} />
              <span>{company.address || DEFAULT_COMPANY.address}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>{company.city || DEFAULT_COMPANY.city}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
              {company.tollfree && (
                <div className="flex items-center gap-1">
                  <Phone size={s.icon} />
                  <span>Tollfree: {company.tollfree}</span>
                </div>
              )}
              {company.phone && (
                <div className="flex items-center gap-1">
                  <Phone size={s.icon} />
                  <span>{company.phone} / {company.phone2 || company.phone}</span>
                </div>
              )}
              {company.email && (
                <div className="flex items-center gap-1">
                  <Mail size={s.icon} />
                  <span>{company.email}</span>
                </div>
              )}
              {company.website && (
                <div className="flex items-center gap-1">
                  <Globe size={s.icon} />
                  <span>{company.website}</span>
                </div>
              )}
            </div>
            {company.gstin && (
              <div className="mt-1 text-[10px] opacity-75">
                GSTIN: {company.gstin}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * CompanyHeaderCompact - Compact version for cards and lists
 */
export const CompanyHeaderCompact = ({ company = DEFAULT_COMPANY }) => (
  <div className="flex items-center gap-2">
    <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
      {company.logo ? (
        <img src={company.logo} alt="" className="w-6 h-6 object-contain" />
      ) : (
        <Building2 size={16} className="text-[var(--primary)]" />
      )}
    </div>
    <div className="min-w-0">
      <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
        {company.name || DEFAULT_COMPANY.name}
      </p>
      <p className="text-[10px] text-[var(--text-muted)] truncate">
        {company.phone || DEFAULT_COMPANY.phone}
      </p>
    </div>
  </div>
);

/**
 * DocumentHeader - Full document header with company info and document details
 */
export const DocumentHeader = ({
  company = DEFAULT_COMPANY,
  documentType = 'Estimate',
  documentNumber,
  date,
  validUntil,
  customerName,
  customerAddress,
  projectLocation
}) => (
  <div className="space-y-4">
    {/* Company & Document Info Row */}
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
      <CompanyHeader company={company} size="large" />

      <div className="text-right shrink-0">
        <h1 className="text-xl font-bold text-[var(--primary)]">{documentType}</h1>
        {documentNumber && (
          <p className="text-sm font-mono text-[var(--text-muted)] mt-1">
            #{documentNumber}
          </p>
        )}
        {date && (
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Date: {new Date(date).toLocaleDateString('en-IN')}
          </p>
        )}
        {validUntil && (
          <p className="text-xs text-[var(--text-muted)]">
            Valid Until: {new Date(validUntil).toLocaleDateString('en-IN')}
          </p>
        )}
      </div>
    </div>

    {/* Customer Info */}
    {(customerName || customerAddress || projectLocation) && (
      <div className="border-t border-[var(--border-base)] pt-4">
        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-2">To</p>
        <div className="space-y-1">
          {customerName && (
            <p className="font-semibold text-[var(--text-primary)]">{customerName}</p>
          )}
          {customerAddress && (
            <p className="text-sm text-[var(--text-muted)]">{customerAddress}</p>
          )}
          {projectLocation && (
            <p className="text-sm text-[var(--text-muted)] flex items-center gap-1">
              <MapPin size={14} />
              {projectLocation}
            </p>
          )}
        </div>
      </div>
    )}
  </div>
);

export default CompanyHeader;
