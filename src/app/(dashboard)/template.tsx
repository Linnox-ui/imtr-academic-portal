export default function DashboardTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // This wrapper ensures every new page slides up and fades in smoothly
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both ease-out">
      {children}
    </div>
  );
}
