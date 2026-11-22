// The real layout lives in app/[locale]/layout.tsx, which renders <html>.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return children;
}
