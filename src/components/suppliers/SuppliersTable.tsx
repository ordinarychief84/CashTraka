'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  TriangleAlert,
  Info,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type SupplierRow = {
  id: string;
  name: string;
  address: string | null;
  email: string | null;
  phone: string | null;
  contactPerson: string | null;
  notes: string | null;
  status: string; // 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED'
  createdAt: string;
  updatedAt: string;
};

type SortKey = 'name' | 'createdAt' | 'updatedAt';
type SortDir = 'asc' | 'desc';

const PAGE_SIZES = [10, 20, 30, 50];

function fmt(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const sec = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${sec}`;
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey)
    return <ChevronsUpDown size={10} className="ml-0.5 inline text-slate-400" />;
  return sortDir === 'asc' ? (
    <ChevronUp size={10} className="ml-0.5 inline text-slate-700" />
  ) : (
    <ChevronDown size={10} className="ml-0.5 inline text-slate-700" />
  );
}

const TH = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <th
    className={cn(
      'border-b border-r border-slate-200 bg-slate-50 px-2.5 py-2',
      'text-[11px] font-bold uppercase tracking-wide text-slate-600 whitespace-nowrap text-left',
      className,
    )}
  >
    {children}
  </th>
);

const TD = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <td
    className={cn(
      'border-r border-slate-100 px-2.5 py-1.5 text-[12px] text-slate-700 whitespace-nowrap',
      className,
    )}
  >
    {children}
  </td>
);

const SearchInput = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <input
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder="Search"
    className="w-full rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-300"
  />
);

const ChooseSelect = ({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="w-full rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-300"
  >
    <option value="">Choose</option>
    {options.map((o) => (
      <option key={o} value={o}>
        {o}
      </option>
    ))}
  </select>
);

export function SuppliersTable({
  rows,
  createdByName,
}: {
  rows: SupplierRow[];
  createdByName: string;
}) {
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showInactive, setShowInactive] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [qName, setQName] = useState('');
  const [qStreet, setQStreet] = useState('');
  const [qEmail, setQEmail] = useState('');
  const [qPhone, setQPhone] = useState('');
  const [qContact, setQContact] = useState('');
  const [filterCreatedAt, setFilterCreatedAt] = useState('');
  const [filterUpdatedAt, setFilterUpdatedAt] = useState('');

  const uniqueDates = useMemo(
    () => [...new Set(rows.map((r) => fmt(r.createdAt).slice(0, 10)))].sort(),
    [rows],
  );
  const uniqueUpdateDates = useMemo(
    () => [...new Set(rows.map((r) => fmt(r.updatedAt).slice(0, 10)))].sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    let out = [...rows];
    if (!showInactive) out = out.filter((r) => r.status === 'ACTIVE');
    if (filterStatus) out = out.filter((r) => r.status === filterStatus);
    if (qName) out = out.filter((r) => r.name.toLowerCase().includes(qName.toLowerCase()));
    if (qStreet)
      out = out.filter((r) => (r.address ?? '').toLowerCase().includes(qStreet.toLowerCase()));
    if (qEmail)
      out = out.filter((r) => (r.email ?? '').toLowerCase().includes(qEmail.toLowerCase()));
    if (qPhone) out = out.filter((r) => (r.phone ?? '').includes(qPhone));
    if (qContact)
      out = out.filter((r) =>
        (r.contactPerson ?? '').toLowerCase().includes(qContact.toLowerCase()),
      );
    if (filterCreatedAt)
      out = out.filter((r) => fmt(r.createdAt).slice(0, 10) === filterCreatedAt);
    if (filterUpdatedAt)
      out = out.filter((r) => fmt(r.updatedAt).slice(0, 10) === filterUpdatedAt);

    out.sort((a, b) => {
      const av =
        sortKey === 'name' ? a.name : sortKey === 'createdAt' ? a.createdAt : a.updatedAt;
      const bv =
        sortKey === 'name' ? b.name : sortKey === 'createdAt' ? b.createdAt : b.updatedAt;
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return out;
  }, [
    rows,
    showInactive,
    filterStatus,
    qName,
    qStreet,
    qEmail,
    qPhone,
    qContact,
    filterCreatedAt,
    filterUpdatedAt,
    sortKey,
    sortDir,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const xStart = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const xEnd = Math.min(safePage * pageSize, filtered.length);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <div className="flex items-center gap-2 text-[11px] text-slate-600">
          <span className="font-medium">Export:</span>
          <button className="font-semibold text-orange-500 hover:underline">CSV</button>
          <button className="font-semibold text-orange-500 hover:underline">XLSX</button>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-600">
          <button
            onClick={() => {
              setShowInactive((v) => !v);
              setPage(1);
            }}
            className={cn(
              'rounded-full px-3 py-1 text-[11px] font-semibold transition',
              showInactive
                ? 'bg-slate-700 text-white'
                : 'bg-slate-200 text-slate-600 hover:bg-slate-300',
            )}
          >
            Show Inactive
          </button>
          <span>Records per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] focus:outline-none"
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <span className="text-slate-500">
            {xStart} – {xEnd} of {filtered.length}
          </span>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="rounded p-0.5 hover:bg-slate-200 disabled:opacity-30"
          >
            <ChevronLeft size={13} />
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="rounded p-0.5 hover:bg-slate-200 disabled:opacity-30"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-[1700px] border-collapse text-left">
          <thead>
            <tr>
              <TH>Active</TH>
              <TH>
                <button
                  onClick={() => toggleSort('name')}
                  className="flex items-center gap-0.5"
                >
                  Name <SortIcon col="name" sortKey={sortKey} sortDir={sortDir} />
                </button>
              </TH>
              <TH>Street</TH>
              <TH>Post code</TH>
              <TH>City</TH>
              <TH>Country</TH>
              <TH>E-mail</TH>
              <TH>Phone</TH>
              <TH>Tax identification number</TH>
              <TH>Contact person</TH>
              <TH>Notes hidden</TH>
              <TH>Comments</TH>
              <TH>Non-standard conditions entered on the order</TH>
              <TH>
                <button
                  onClick={() => toggleSort('createdAt')}
                  className="flex items-center gap-0.5"
                >
                  Date of creation{' '}
                  <SortIcon col="createdAt" sortKey={sortKey} sortDir={sortDir} />
                </button>
              </TH>
              <TH>Created by</TH>
              <TH>
                <button
                  onClick={() => toggleSort('updatedAt')}
                  className="flex items-center gap-0.5"
                >
                  Updated at <SortIcon col="updatedAt" sortKey={sortKey} sortDir={sortDir} />
                </button>
              </TH>
              <TH>Updated by</TH>
              <th className="border-b border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-600">
                Actions
              </th>
            </tr>

            {/* Per-column filter row */}
            <tr className="bg-white">
              {/* Active */}
              <td className="border-b border-r border-slate-100 px-2 py-1">
                <ChooseSelect
                  value={filterStatus}
                  onChange={(v) => {
                    setFilterStatus(v);
                    setPage(1);
                  }}
                  options={['ACTIVE', 'INACTIVE', 'BLACKLISTED']}
                />
              </td>
              {/* Name */}
              <td className="border-b border-r border-slate-100 px-2 py-1">
                <SearchInput
                  value={qName}
                  onChange={(v) => {
                    setQName(v);
                    setPage(1);
                  }}
                />
              </td>
              {/* Street */}
              <td className="border-b border-r border-slate-100 px-2 py-1">
                <SearchInput
                  value={qStreet}
                  onChange={(v) => {
                    setQStreet(v);
                    setPage(1);
                  }}
                />
              </td>
              {/* Post code */}
              <td className="border-b border-r border-slate-100 px-2 py-1">
                <SearchInput value="" onChange={() => {}} />
              </td>
              {/* City */}
              <td className="border-b border-r border-slate-100 px-2 py-1">
                <SearchInput value="" onChange={() => {}} />
              </td>
              {/* Country */}
              <td className="border-b border-r border-slate-100 px-2 py-1">
                <SearchInput value="" onChange={() => {}} />
              </td>
              {/* Email */}
              <td className="border-b border-r border-slate-100 px-2 py-1">
                <SearchInput
                  value={qEmail}
                  onChange={(v) => {
                    setQEmail(v);
                    setPage(1);
                  }}
                />
              </td>
              {/* Phone */}
              <td className="border-b border-r border-slate-100 px-2 py-1">
                <SearchInput
                  value={qPhone}
                  onChange={(v) => {
                    setQPhone(v);
                    setPage(1);
                  }}
                />
              </td>
              {/* Tax ID */}
              <td className="border-b border-r border-slate-100 px-2 py-1">
                <SearchInput value="" onChange={() => {}} />
              </td>
              {/* Contact person */}
              <td className="border-b border-r border-slate-100 px-2 py-1">
                <SearchInput
                  value={qContact}
                  onChange={(v) => {
                    setQContact(v);
                    setPage(1);
                  }}
                />
              </td>
              {/* Notes hidden */}
              <td className="border-b border-r border-slate-100 px-2 py-1">
                <SearchInput value="" onChange={() => {}} />
              </td>
              {/* Comments */}
              <td className="border-b border-r border-slate-100 px-2 py-1">
                <SearchInput value="" onChange={() => {}} />
              </td>
              {/* Non-standard */}
              <td className="border-b border-r border-slate-100 px-2 py-1">
                <SearchInput value="" onChange={() => {}} />
              </td>
              {/* Date of creation */}
              <td className="border-b border-r border-slate-100 px-2 py-1">
                <ChooseSelect
                  value={filterCreatedAt}
                  onChange={(v) => {
                    setFilterCreatedAt(v);
                    setPage(1);
                  }}
                  options={uniqueDates}
                />
              </td>
              {/* Created by */}
              <td className="border-b border-r border-slate-100 px-2 py-1">
                <div className="flex items-center gap-1">
                  <ChooseSelect value="" onChange={() => {}} options={[createdByName]} />
                  <Info size={10} className="shrink-0 text-orange-400" />
                </div>
              </td>
              {/* Updated at */}
              <td className="border-b border-r border-slate-100 px-2 py-1">
                <ChooseSelect
                  value={filterUpdatedAt}
                  onChange={(v) => {
                    setFilterUpdatedAt(v);
                    setPage(1);
                  }}
                  options={uniqueUpdateDates}
                />
              </td>
              {/* Updated by */}
              <td className="border-b border-r border-slate-100 px-2 py-1">
                <div className="flex items-center gap-1">
                  <ChooseSelect value="" onChange={() => {}} options={[createdByName]} />
                  <Info size={10} className="shrink-0 text-orange-400" />
                </div>
              </td>
              {/* Actions */}
              <td className="border-b border-slate-100 px-2 py-1" />
            </tr>
          </thead>

          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={18} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <TriangleAlert size={28} className="text-slate-300" />
                    <span className="text-sm font-medium">No data found</span>
                  </div>
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                  {/* Active */}
                  <TD className="text-center">
                    {row.status === 'ACTIVE' ? (
                      <CheckCircle2 size={16} className="mx-auto text-emerald-500" />
                    ) : (
                      <XCircle size={16} className="mx-auto text-slate-300" />
                    )}
                  </TD>
                  {/* Name */}
                  <TD>
                    <Link
                      href={`/suppliers/${row.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {row.name}
                    </Link>
                  </TD>
                  {/* Street */}
                  <TD>{row.address ?? ''}</TD>
                  {/* Post code */}
                  <TD>{''}</TD>
                  {/* City */}
                  <TD>{''}</TD>
                  {/* Country */}
                  <TD>{''}</TD>
                  {/* Email */}
                  <TD>{row.email ?? ''}</TD>
                  {/* Phone */}
                  <TD>{row.phone ?? ''}</TD>
                  {/* Tax ID */}
                  <TD>{''}</TD>
                  {/* Contact person */}
                  <TD>{row.contactPerson ?? ''}</TD>
                  {/* Notes hidden */}
                  <TD className="italic text-slate-400">
                    {row.notes
                      ? row.notes.slice(0, 20) + (row.notes.length > 20 ? '…' : '')
                      : ''}
                  </TD>
                  {/* Comments */}
                  <TD>{''}</TD>
                  {/* Non-standard */}
                  <TD>{''}</TD>
                  {/* Date of creation */}
                  <TD>{fmt(row.createdAt)}</TD>
                  {/* Created by */}
                  <TD>{createdByName}</TD>
                  {/* Updated at */}
                  <TD>{fmt(row.updatedAt)}</TD>
                  {/* Updated by */}
                  <TD>{createdByName}</TD>
                  {/* Actions */}
                  <td className="px-2.5 py-1.5 text-[12px]">
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/suppliers/${row.id}`}
                        className="flex h-6 w-6 items-center justify-center rounded hover:bg-orange-50"
                        title="Edit"
                      >
                        <Pencil size={13} className="text-orange-400 hover:text-orange-600" />
                      </Link>
                      <button
                        className="flex h-6 w-6 items-center justify-center rounded hover:bg-rose-50"
                        title="Delete"
                      >
                        <Trash2 size={13} className="text-rose-400 hover:text-rose-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
