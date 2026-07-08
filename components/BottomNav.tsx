"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/home", label: "Home" },
  { href: "/add-entry", label: "Add" },
  { href: "/inventory", label: "Inventory" },
  { href: "/shopping-list", label: "Shop list" },
  { href: "/more", label: "More" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-line bg-white">
      {NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 py-2 text-center text-[11px] ${
              isActive ? "font-medium text-brand" : "text-ink/60"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
