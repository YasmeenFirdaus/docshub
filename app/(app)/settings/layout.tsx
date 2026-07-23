import Link from "next/link";
import { headers } from "next/headers";
import { SettingsTabs } from "./SettingsTabs";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 bg-white px-5 pt-3 lg:px-8">
        <SettingsTabs />
      </div>
      <div className="flex-1 overflow-y-auto bg-slate-50/50">
        {children}
      </div>
    </div>
  );
}
