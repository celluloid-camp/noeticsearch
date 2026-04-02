export default function LibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container mx-auto h-full min-h-0 overflow-y-auto">
      {children}
    </div>
  );
}
