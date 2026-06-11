export function generateStaticParams() {
  return [
    { id: "alex" },
    { id: "maya" },
    { id: "leo" },
    { id: "kai" },
  ];
}

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
